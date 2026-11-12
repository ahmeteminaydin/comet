
/* ---------- SPICE: LTspice schematic export (.asc + generated symbols) ---------- */
function ascii(s){
  const map = {"·":"-", "Ω":"Ohm", "µ":"u", "→":"->", "≈":"~", "−":"-", "–":"-", "—":"-", "≥":">=", "≤":"<=", "×":"x", "°":"deg", "²":"2", "θ":"theta", "Δ":"d", "τ":"tau", "…":"...", "‘":"'", "’":"'", "“":'"', "”":'"', "₀":"0", "·":"-", "±":"+/-", "Σ":"sum"};
  return String(s).replace(/[̅]/g, "").replace(/[^\t\n\r\x20-\x7e]/g, c => map[c] != null ? map[c] : "");
}
function spiceAsc(id){
  const b = spiceBuild(id, {target:"ltspice", analysis:0}), rec = b.rec, U = b.U, cfg = SIMCFG[id], V = SIMV[id];
  const S = 2, sc = p => [Math.round(p[0]*S), Math.round(p[1]*S)], excl = new Set(cfg.exclude || []);
  const wires = [], syms = [], flags = [], texts = [], shapes = [], files = {}, conn = [];
  const addW = (a, c) => { if (a[0] !== c[0] || a[1] !== c[1]) wires.push([a[0], a[1], c[0], c[1]]); };
  rec.wires.forEach(w => addW(sc([w[0], w[1]]), sc([w[2], w[3]])));
  const symName = ref => `${id}_${ref}`.toLowerCase().replace(/[^a-z0-9_]/g, "");
  const rotL = (a, p) => { const r = a*Math.PI/180, c = Math.round(Math.cos(r)), s = Math.round(Math.sin(r)); return [p[0]*c - p[1]*s, p[0]*s + p[1]*c]; };
  const asy = (ref, prefix, value, desc, pins, prims, win) => {           // pins: [[name, x, y], ...] in SpiceOrder
    const L = ["Version 4", "SymbolType CELL", ...prims,
      `WINDOW 0 ${win[0][0]} ${win[0][1]} Left 2`, `WINDOW 3 ${win[1][0]} ${win[1][1]} Left 2`,
      `SYMATTR Prefix ${prefix}`, `SYMATTR Value ${ascii(value)}`, `SYMATTR Description ${ascii(desc)}`];
    pins.forEach(([n, x, y], i) => L.push(`PIN ${x} ${y} NONE 0`, `PINATTR PinName ${ascii(n)}`, `PINATTR SpiceOrder ${i + 1}`));
    files[symName(ref) + ".asy"] = L.join("\r\n") + "\r\n";
  };
  const line = (pts, a = 0) => { const out = []; for (let i = 1; i < pts.length; i++){ const p = rotL(a, pts[i-1]), q = rotL(a, pts[i]); out.push(`LINE Normal ${p[0]} ${p[1]} ${q[0]} ${q[1]}`); } return out; };
  const txt = (x, y, t, a = "Left", sz = 0) => `TEXT ${x} ${y} ${a} ${sz} ${ascii(t)}`;

  rec.parts.forEach(p => {
    if (excl.has(p.ref)){ const o = sc([p.x, p.y]); texts.push(`TEXT ${o[0] - 40} ${o[1]} Left 2 ;${ascii(p.ref + " " + (p.part || p.val) + " (not simulated)")}`); return; }
    if (p.kind === "CONN"){
      const o = sc([p.x, p.y]);
      if (p.w === 20){ shapes.push(`CIRCLE Normal ${o[0] - 20} ${o[1] - 20} ${o[0] + 20} ${o[1] + 20}`); addW(sc(p.pins[1]), sc(p.pins[2])); texts.push(`TEXT ${o[0] - 20} ${o[1] + 56} Left 2 ;${ascii(p.ref + " " + p.part)}`); }
      else { shapes.push(`RECTANGLE Normal ${o[0]} ${o[1]} ${o[0] + p.w*S} ${o[1] + p.h*S}`); texts.push(`TEXT ${o[0]} ${o[1] - 40} Left 2 ;${ascii(p.ref + " " + p.part)}`);
        Object.keys(p.pins).forEach(n => { const q = sc(p.pins[n]); addW([o[0], q[1]], q); texts.push(`TEXT ${o[0] + 8} ${q[1] - 8} Left 0 ;${ascii(n)}`); }); }
      return;
    }
    const v = V.vals[p.ref];
    if (p.kind === "R" || p.kind === "L" || p.kind === "FU"){
      const [a, c] = p.pins.map(sc), sym = p.kind === "L" ? "ind" : "res";
      if (a[0] === c[0]){ const top = Math.min(a[1], c[1]); syms.push([`SYMBOL ${sym} ${a[0] - 16} ${top - 16} R0`]); }
      else { const right = Math.max(a[0], c[0]); syms.push([`SYMBOL ${sym} ${right + 16} ${a[1] - 16} R90`, `WINDOW 0 0 56 VBottom 2`, `WINDOW 3 32 56 VTop 2`]); }
      syms[syms.length - 1].push(`SYMATTR InstName ${p.ref}`, `SYMATTR Value ${p.kind === "FU" ? "0.5" : v}`); return;
    }
    if (p.kind === "C"){
      const [a, c] = p.pins.map(sc);
      if (a[0] === c[0]){ const top = Math.min(a[1], c[1]); syms.push([`SYMBOL cap ${a[0] - 16} ${top + 8} R0`]); addW([a[0], top], [a[0], top + 8]); addW([a[0], top + 72], [a[0], top + 80]); }
      else { const right = Math.max(a[0], c[0]), left = Math.min(a[0], c[0]); syms.push([`SYMBOL cap ${right - 8} ${a[1] - 16} R90`, `WINDOW 0 0 32 VBottom 2`, `WINDOW 3 32 32 VTop 2`]); addW([right - 8, a[1]], [right, a[1]]); addW([left, a[1]], [left + 8, a[1]]); }
      syms[syms.length - 1].push(`SYMATTR InstName ${p.ref}`, `SYMATTR Value ${v}`); return;
    }
    const o = sc([p.x, p.y]), rel = q => { const s = sc(q); return [s[0] - o[0], s[1] - o[1]]; };
    let prefix = "X", value, pins, prims = [], win = [[16, -72], [16, 88]], desc = `${p.ref} ${p.part || p.val}`;
    if (p.kind === "FB" || p.kind === "D"){
      const a = p.a || 0;
      pins = [["A", ...rotL(a, [-40, 0])], ["B", ...rotL(a, [40, 0])]];
      if (p.kind === "FB"){ value = `BEAD_BEH L=${v}`; prims = [...line([[-40, 0], [-24, 0]], a), ...line([[24, 0], [40, 0]], a), ...line([[-24, -10], [24, -10], [24, 10], [-24, 10], [-24, -10]], a)]; desc = "Ferrite bead"; }
      else { prefix = "D"; value = DIODES[p.val] || p.val; prims = [...line([[-40, 0], [-16, 0]], a), ...line([[12, 0], [40, 0]], a), ...line([[-16, -16], [-16, 16], [12, 0], [-16, -16]], a), ...line(p.sch ? [[20, -22], [12, -22], [12, 22], [4, 22]] : [[12, -16], [12, 16]], a)]; desc = `Diode ${p.val}`; }
      win = a % 180 ? [[24, -16], [24, 16]] : [[-24, -40], [-24, 64]];
    } else if (p.kind === "SIPM"){
      value = "MICROFC60035_BEH NPE={NPE} T0=20n TEMP={TEMP}"; pins = [["K", ...rel(p.pins.K)], ["A", ...rel(p.pins.A)]];
      prims = [...line([[0, -40], [0, -12]]), ...line([[0, 16], [0, 40]]), ...line([[-16, 16], [16, 16], [0, -12], [-16, 16]]), ...line([[-16, -12], [16, -12]]),
               ...line([[60, -68], [24, -36]]), ...line([[24, -36], [38, -38]]), ...line([[24, -36], [28, -50]]), ...line([[84, -44], [48, -12]]), ...line([[48, -12], [62, -14]]), ...line([[48, -12], [52, -26]])];
      win = [[32, -8], [32, 24]]; desc = "SiPM onsemi MicroFC-60035 (model)";
    } else if (p.kind === "OPA"){
      const def = PARTS[p.part]; value = def ? def.sub : p.part;
      pins = ["inp", "inn", "out", "vp", "vn"].map(n => [n.toUpperCase(), ...rel(p.pins[n])]);
      prims = [...line([[-60, -60], [60, 0], [-60, 60], [-60, -60]]), ...line([[-88, -24], [-60, -24]]), ...line([[-88, 24], [-60, 24]]), ...line([[60, 0], [88, 0]]),
               ...line([[0, -30], [0, -56]]), ...line([[0, 30], [0, 56]]), txt(-52, -24, "+", "Left", 2), txt(-52, 24, "-", "Left", 2)];
      if (p.cmp) prims.push(...line([[-24, 10], [-10, 10], [-10, -10], [4, -10]]));
      win = [[20, -56], [20, 72]];
    } else if (p.kind === "AND"){
      value = PARTS[p.part].sub; pins = [["A", ...rel(p.pins.a)], ["B", ...rel(p.pins.b)], ["Y", ...rel(p.pins.y)]];
      const arc = []; for (let k = 0; k <= 8; k++){ const t = -Math.PI/2 + k*Math.PI/8; arc.push([Math.round(48*Math.cos(t)), Math.round(48*Math.sin(t))]); }
      prims = [...line([[0, 48], [-60, 48], [-60, -48], [0, -48]]), ...line(arc), ...line([[-88, -24], [-60, -24]]), ...line([[-88, 24], [-60, 24]]), ...line([[48, 0], [76, 0]])];
      win = [[-52, -72], [-52, 88]];
    } else if (p.kind === "INV"){
      value = PARTS[p.part].sub; pins = [["A", ...rel(p.pins.a)], ["Y", ...rel(p.pins.y)]];
      prims = [...line([[-40, -32], [24, 0], [-40, 32], [-40, -32]]), `CIRCLE Normal 24 -8 40 8`, ...line([[-68, 0], [-40, 0]]), ...line([[40, 0], [68, 0]])];
      win = [[-40, -56], [-40, 72]];
    } else if (p.kind === "SWC"){
      value = PARTS[p.part].sub; pins = [["A", ...rel(p.pins.a)], ["B", ...rel(p.pins.b)], ["CTL", ...rel(p.pins.ctl)]];
      prims = [...line([[0, -58], [0, -14]]), ...line([[0, 42], [0, 58]]), ...line([[0, -8], [26, 38]]), `CIRCLE Normal -5 -15 5 -5`, `CIRCLE Normal -5 37 5 47`];
      win = [[44, -8], [44, 24]];
    } else if (p.kind === "IC"){
      const def = PARTS[p.part]; if (!def) return;
      const drawn = {}; Object.keys(p.pins).forEach(n => drawn[normPin(n)] = n);
      const order = def.pins.filter(n => drawn[n]), missing = def.pins.length !== order.length;
      value = (missing ? `W_${p.ref}_${def.sub}`.toUpperCase() : def.sub) + (def.params && !missing ? " " + def.params : "");
      pins = order.map(n => [n, ...rel(p.pins[drawn[n]])]);
      prims = [`RECTANGLE Normal 0 0 ${p.w*S} ${p.h*S}`];
      order.forEach(n => { const nm = drawn[n], q = rel(p.pins[nm]), sd = p.side[nm];
        const e = sd === "l" ? [0, q[1]] : sd === "r" ? [p.w*S, q[1]] : sd === "t" ? [q[0], 0] : [q[0], p.h*S];
        prims.push(...line([q, e]), sd === "l" ? txt(e[0] + 6, e[1], nm) : sd === "r" ? txt(e[0] - 6, e[1], nm, "Right") : sd === "t" ? txt(e[0], e[1] + 14, nm, "Center") : txt(e[0], e[1] - 14, nm, "Center")); });
      const lab = rel(p.lab); win = [[lab[0] - 30, lab[1] - 10], [lab[0] - 30, lab[1] + 22]];
    } else return;
    asy(p.ref, prefix, value, desc, pins, prims, win);
    syms.push([`SYMBOL ${symName(p.ref)} ${o[0]} ${o[1]} R0`, `SYMATTR InstName ${p.ref}`, `SYMATTR Value ${ascii(value)}`]);
  });

  // naming points become LTspice net flags; every flag on a net carries the same canonical name
  const named = new Set(), addFlag = (q, nm) => { const s = sc(q); flags.push([s[0], s[1], nm]); named.add(nm); };
  rec.gnd.forEach(q => addFlag(q, "0"));
  rec.pwr.forEach(p => addFlag(p.pt, b.net(p.pt)));
  rec.labels.forEach(l => { if (l.at) addFlag(l.at, b.net(l.at)); });
  rec.tps.forEach(t => addFlag(t.pt, b.net(t.pt)));
  rec.ports.forEach(p => { addFlag(p.pt, b.net(p.pt)); const s = sc(p.pt);
    texts.push(`TEXT ${p.dir === "in" && s[0] < 900 ? s[0] - 16 : s[0] + 16} ${s[1] - 24} ${p.dir === "in" && s[0] < 900 ? "Right" : "Left"} 1 ;${ascii(p.label)}`); });
  // nets used by test-bench lines but not named on the sheet get a flag at one of their pins
  const needed = new Set(); [...b.tb, ...b.leak].forEach(l => { if (!l.startsWith("*")) l.split(/[^A-Za-z0-9_]+/).slice(1).forEach(t => needed.add(t)); });
  rec.parts.forEach(p => { if (excl.has(p.ref) || p.kind === "CONN") return; (Array.isArray(p.pins) ? p.pins : Object.values(p.pins)).forEach(q => { const nm = b.net(q); if (needed.has(nm) && !named.has(nm) && nm !== "0") addFlag(q, nm); }); });

  // split wires so every connection is at a wire end (LTspice connects ends only)
  const pts = new Map(); const addP = q => pts.set(q[0] + "," + q[1], q);
  wires.forEach(w => { addP([w[0], w[1]]); addP([w[2], w[3]]); }); flags.forEach(f => addP([f[0], f[1]]));
  rec.parts.forEach(p => { if (excl.has(p.ref)) return; (Array.isArray(p.pins) ? p.pins : Object.values(p.pins)).forEach(q => addP(sc(q))); });
  const split = [];
  wires.forEach(([x1, y1, x2, y2]) => {
    const on = [...pts.values()].filter(q => !((q[0] === x1 && q[1] === y1) || (q[0] === x2 && q[1] === y2)) && (x2 - x1)*(q[1] - y1) === (y2 - y1)*(q[0] - x1)
      && q[0] >= Math.min(x1, x2) && q[0] <= Math.max(x1, x2) && q[1] >= Math.min(y1, y2) && q[1] <= Math.max(y1, y2));
    on.sort((a, c) => Math.hypot(a[0] - x1, a[1] - y1) - Math.hypot(c[0] - x1, c[1] - y1));
    let s = [x1, y1]; on.forEach(q => { split.push([s[0], s[1], q[0], q[1]]); s = q; }); split.push([s[0], s[1], x2, y2]);
  });

  // text: title, notes, test bench and analysis as directives
  const T = [];
  T.push(`TEXT 48 64 Left 3 ;${ascii(`COMET - ${SHEETS[id].title} (DWG ${SHEETS[id].dwg})`)}`);
  T.push(`TEXT 48 112 Left 1 ;${ascii("Generated from the COMET system schematic. Same circuit and values as the site; click a wire to plot it, right-click a part to change it.")}`);
  rec.notes.forEach(n => n.lines.forEach((t, i) => T.push(`TEXT ${n.x*S} ${n.y*S + 32 + i*32} Left 1 ;${ascii(t)}`)));
  let y = 1600; const dir = s => { T.push(`TEXT 48 ${y} Left 2 !${ascii(s)}`); y += 36; };
  T.push(`TEXT 48 ${y - 48} Left 2 ;${ascii("Test bench (what drives the ports, as on the site):")}`);
  dir(".lib comet_models.lib");
  b.prm.forEach(dir); b.tb.forEach(dir); b.leak.forEach(dir); dir(b.ana.cmd);
  if (excl.size) T.push(`TEXT 1280 ${1600 - 48} Left 2 ;${ascii("Not simulated: " + [...excl].join(", ") + " - " + (cfg.excludeWhy || ""))}`);

  const asc = ["Version 4", "SHEET 1 2560 2100",
    ...split.map(w => `WIRE ${w[0]} ${w[1]} ${w[2]} ${w[3]}`),
    ...flags.map(f => `FLAG ${f[0]} ${f[1]} ${f[2]}`),
    ...syms.flat(), ...shapes, ...texts, ...T].join("\r\n") + "\r\n";
  const lib = MODELS_LIB + (b.wrappers.length ? "\n* ---- instance wrappers for this sheet ----\n" + b.wrappers.join("\n") + "\n" : "");
  return {asc, files, lib, cir: spiceBuild(id, {target:"cir", analysis:0}).text, probes: b.probes};
}
