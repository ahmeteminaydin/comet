"""Rebuild a netlist from an LTspice .asc using LTspice connection rules; compare with the site netlist in ngspice."""
import sys, os, re, subprocess, collections
import numpy as np
d = sys.argv[1]; asc = [f for f in os.listdir(d) if f.endswith(".asc")][0]; base = asc[:-4]
BUILTIN = {"res":("R", [(16,16),(16,96)]), "cap":("C", [(16,0),(16,64)]), "ind":("L", [(16,16),(16,96)])}
def asy(name):
    pins, attrs, cur = [], {}, None
    for ln in open(os.path.join(d, name + ".asy")).read().splitlines():
        m = re.match(r"PIN (-?\d+) (-?\d+)", ln)
        if m: cur = [int(m[1]), int(m[2]), None]; pins.append(cur)
        m = re.match(r"PINATTR SpiceOrder (\d+)", ln)
        if m: cur[2] = int(m[1])
        m = re.match(r"SYMATTR (\w+) (.*)", ln)
        if m: attrs[m[1]] = m[2]
    pins.sort(key=lambda p: p[2]); return attrs.get("Prefix", "X"), [(p[0], p[1]) for p in pins], attrs.get("Value", "")
def rot(x, y, r, px, py): return {"R0":(x+px, y+py), "R90":(x-py, y+px), "R180":(x-px, y-py), "R270":(x+py, y-px)}[r]
wires, flags, syms, dirs = [], [], [], []
for ln in open(os.path.join(d, asc)).read().splitlines():
    p = ln.split(" ")
    if p[0] == "WIRE": wires.append(tuple(map(int, p[1:5])))
    elif p[0] == "FLAG": flags.append((int(p[1]), int(p[2]), p[3]))
    elif p[0] == "SYMBOL": syms.append({"t":p[1], "x":int(p[2]), "y":int(p[3]), "r":p[4]})
    elif p[0] == "SYMATTR" and syms: syms[-1][p[1]] = ln.split(" ", 2)[2]
    elif p[0] == "TEXT" and len(p) > 5 and p[5].startswith("!"): dirs.append(ln.split(" ", 5)[5][1:])
par = {}
def find(a):
    par.setdefault(a, a)
    while par[a] != a: par[a] = par[par[a]]; a = par[a]
    return a
for x1, y1, x2, y2 in wires: par[find((x1, y1))] = find((x2, y2))
for s in syms:
    if s["t"] in BUILTIN: s["prefix"], pins = BUILTIN[s["t"]][0], BUILTIN[s["t"]][1]; s.setdefault("Value", "")
    else: pre, pins, val = asy(s["t"]); s["prefix"] = pre; s["Value"] = s.get("Value", val)
    s["pins"] = [rot(s["x"], s["y"], s["r"], *q) for q in pins]
    for q in s["pins"]: find(q)
for x, y, n in flags: find((x, y))
ends = collections.Counter(); [ends.update([(w[0], w[1]), (w[2], w[3])]) for w in wires]
problems = []
pts = set(ends) | {(f[0], f[1]) for f in flags} | {q for s in syms for q in s["pins"]}
for q in pts:
    for x1, y1, x2, y2 in wires:
        if (x1 == x2 == q[0] and min(y1, y2) < q[1] < max(y1, y2)) or (y1 == y2 == q[1] and min(x1, x2) < q[0] < max(x1, x2)): problems.append(f"{q} inside wire")
pinpts = collections.Counter(q for s in syms for q in s["pins"])
for s in syms:
    for q in s["pins"]:
        if ends[q] == 0 and not any((f[0], f[1]) == q for f in flags) and pinpts[q] < 2: problems.append(f"{s.get('InstName')} pin {q} unconnected")
names = {}
for x, y, n in flags:
    r = find((x, y))
    if r in names and names[r] != n: problems.append(f"two names on one net: {names[r]} / {n}")
    names[r] = n
k = [0]
def net(q):
    r = find(q)
    if r not in names: k[0] += 1; names[r] = f"N{k[0]:03d}"
    return names[r]
L = [f"* rebuilt from {asc}"]
for s in syms:
    inst = s["InstName"]; nm = inst if inst.upper().startswith(s["prefix"]) else s["prefix"] + inst
    L.append(f"{nm} {' '.join(net(q) for q in s['pins'])} {s['Value']}")
for t in dirs: L.append((".include " + os.path.abspath(os.path.join(d, t.split()[1]))) if t.startswith(".lib") else t)
sitetok = set(re.findall(r"[\w.]+", open(os.path.join(d, base + ".cir")).read().split(".subckt")[0] + open(os.path.join(d, base + ".cir")).read().split(".ends")[-1]))
flagnets = sorted({n for _, _, n in flags if n != "0" and not n.startswith("p3v3") and not n.startswith("p5v") and n in sitetok})
open(os.path.join(d, "_rebuilt.cir"), "w").write("\n".join(L + [".control", "set wr_singlescale", "set wr_vecnames", "run", "wrdata _a.dat " + " ".join(f"v({n})" for n in flagnets), ".endc", ".end"]))
cir = re.sub(r"\n\.end\s*$", lambda m: "\n.control\nset wr_singlescale\nset wr_vecnames\nrun\nwrdata _b.dat " + " ".join(f"v({n})" for n in flagnets) + "\n.endc\n.end\n", open(os.path.join(d, base + ".cir")).read())
open(os.path.join(d, "_site.cir"), "w").write(cir)
for f in ["_rebuilt.cir", "_site.cir"]: subprocess.run(["timeout", "120", "ngspice", "-b", f], cwd=d, capture_output=True)
def load(f):
    p = os.path.join(d, f)
    if not os.path.exists(p): return None, None
    with open(p) as fh: hdr = fh.readline().split()
    return hdr, np.loadtxt(p, skiprows=1)
ha, A = load("_a.dat"); hb, B = load("_b.dat")
if A is None or B is None: print(f"{base}: SIMULATION FAILED rebuilt={A is not None} site={B is not None}; problems={problems[:5]}"); sys.exit()
worst = 0; detail = []
for j, n in enumerate(ha[1:], 1):
    if n not in hb: continue
    i = hb.index(n); vb = np.interp(A[:, 0], B[:, 0], B[:, i]); span = max(np.ptp(B[:, i]), 1e-6); e = np.max(np.abs(A[:, j] - vb))/span
    worst = max(worst, e); detail.append(f"{n}:{e:.1e}")
print(f"{base}: {len(syms)} parts, {len(wires)} wires, {len(flags)} flags, problems={problems or 'none'}; compared {len(detail)} nets, worst deviation {worst:.2e} of span")
