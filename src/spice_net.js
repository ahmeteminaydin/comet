
/* ---------- SPICE: netlist extraction from the detail sheets ---------- */
const normPin = s => String(s).replace(/̅/g, "N").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const PARTS = {
  "LMH6629":      {sub:"LMH6629_BEH", pins:["INP","INN","OUT","VP","VN"]},
  "OPA355":       {sub:"OPA355_BEH", pins:["INP","INN","OUT","VP","VN"]},
  "TLV3501":      {sub:"TLV3501_BEH", pins:["INP","INN","OUT","VP","VN"]},
  "74LVC1G08":    {sub:"AND2_LVC_BEH", pins:["A","B","Y"]},
  "74LVC1G14":    {sub:"SCHMITT_INV_LVC_BEH", pins:["A","Y"]},
  "74LVC1G74":    {sub:"DFF_LVC_BEH", pins:["D","CLK","Q","QN","CLRN","PREN","VCC","GND"], tie:{QN:"nc", CLRN:"hi", PREN:"hi", VCC:"hi", GND:"0", D:"hi"}},
  "74LVC1G123":   {sub:"MONO123_LVC_BEH", pins:["AN","B","CLRN","Q","QN","VCC","CEXT","REXTCEXT","GND"], tie:{QN:"nc", CLRN:"hi", VCC:"hi", GND:"0", AN:"0"}},
  "MCP4728":      {sub:"MCP4728_BEH", pins:["VDD","SCL","SDA","LDACN","VOUTA","VOUTB","VOUTC","VOUTD","VSS"], params:"CA0=0 CA={CA} CB0=0 CB={CB} CC0=0 CC=0 CD0=0 CD={CD} TSTEP=10u"},
  "MicroFC-60035":{sub:"MICROFC60035_BEH", pins:["K","A"], params:"NPE={NPE} T0=20n TEMP={TEMP}"},
  "TS5A3159":     {sub:"TS5A3159_BEH", pins:["A","B","CTL"]},
};
const DIODES = {"BAT54":"BAT54"};
const SIMV = {};      // per sheet: {vals, def, pre, suf} part values (SPICE strings)
const SIMP = {};      // per sheet: stimulus parameter values (display units)

function netName(s){ let n = String(s).toLowerCase().replace(/^\+/, "p").replace(/\+/g, "p").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""); if (!n) n = "n"; if (/^\d/.test(n)) n = "n_" + n; return n; }

function spiceExtract(id){
  if (SIMCFG[id]) spiceValues(id);                 // defaults first: building them draws the sheet too
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"), keep = REC;
  REC = {parts:[], wires:[], gnd:[], pwr:[], labels:[], ports:[], tps:[], nc:[], links:[], notes:[]};
  try { drawSheet(id, svg); const r = REC; return r; } finally { REC = keep; }
}
function spiceValues(id){                          // part values for a sheet with a SPICE model (used while drawing)
  const cfg = SIMCFG[id]; if (!cfg) return null;
  if (!SIMV[id]){
    const rec = spiceExtract0(id), V = {vals:{}, def:{}, pre:{}, suf:{}};
    rec.parts.forEach(p => {
      if (!/^(R|C|L|FB)$/.test(p.kind) || (cfg.exclude || []).includes(p.ref)) return;
      const lv = labelVal(p.val), ov = (cfg.values || {})[p.ref];
      const v = ov != null ? siNum(ov) : lv ? lv.v : NaN;
      if (!isFinite(v)) return;
      V.vals[p.ref] = V.def[p.ref] = spiceNum(v); V.pre[p.ref] = lv && ov == null ? lv.pre : ""; V.suf[p.ref] = (cfg.suffix || {})[p.ref] != null ? cfg.suffix[p.ref] : lv && ov == null ? lv.suf : "";
    });
    SIMV[id] = V;
  }
  return SIMV[id];
}
function spiceExtract0(id){                        // extraction without part values (avoids recursion while building defaults)
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"), keep = SIMV[id], keepRec = REC;
  SIMV[id] = {vals:{}, def:{}, pre:{}, suf:{}};
  REC = {parts:[], wires:[], gnd:[], pwr:[], labels:[], ports:[], tps:[], nc:[], links:[], notes:[]};
  try { drawSheet(id, svg); const r = REC; return r; } finally { REC = keepRec; if (keep) SIMV[id] = keep; else delete SIMV[id]; }
}
function spiceParams(id){
  const cfg = SIMCFG[id];
  if (!SIMP[id]){ SIMP[id] = {}; (cfg.params || []).forEach(p => SIMP[id][p.k] = p.def); }
  return SIMP[id];
}

/* connectivity: wires join at shared points; a point lying inside a wire joins that wire (T-junction) */
function spiceConnect(rec){
  const K = p => p[0] + "," + p[1], par = new Map();
  const find = k => { if (!par.has(k)) par.set(k, k); let r = k; while (par.get(r) !== r) r = par.get(r); let c = k; while (par.get(c) !== r){ const nx = par.get(c); par.set(c, r); c = nx; } return r; };
  const uni = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) par.set(ra, rb); };
  const segs = rec.wires, ends = [];
  segs.forEach(s => { uni(K([s[0], s[1]]), K([s[2], s[3]])); ends.push([s[0], s[1]], [s[2], s[3]]); });
  rec.labels.forEach(l => {
    let best = null, bd = 1e9;
    ends.forEach(e => { const d = Math.hypot(e[0] - l.pt[0], e[1] - l.pt[1]); if (d < bd){ bd = d; best = e; } });
    l.at = bd <= 12 ? best : null;
  });
  const pts = [...ends];
  rec.parts.forEach(p => (Array.isArray(p.pins) ? p.pins : Object.values(p.pins)).forEach(q => pts.push(q)));
  rec.gnd.forEach(q => pts.push(q)); rec.pwr.forEach(q => pts.push(q.pt)); rec.ports.forEach(q => pts.push(q.pt)); rec.tps.forEach(q => pts.push(q.pt));
  rec.labels.forEach(l => l.at && pts.push(l.at));
  rec.links.forEach(([a, b]) => { pts.push(a, b); uni(K(a), K(b)); });
  const inside = (q, s) => {
    const [x1, y1, x2, y2] = s;
    if ((q[0] === x1 && q[1] === y1) || (q[0] === x2 && q[1] === y2)) return false;
    if (Math.abs((x2 - x1)*(q[1] - y1) - (y2 - y1)*(q[0] - x1)) > 1e-6) return false;
    return q[0] >= Math.min(x1, x2) && q[0] <= Math.max(x1, x2) && q[1] >= Math.min(y1, y2) && q[1] <= Math.max(y1, y2);
  };
  const uniq = [...new Map(pts.map(q => [K(q), q])).values()];
  uniq.forEach(q => { find(K(q)); segs.forEach(s => { if (inside(q, s)) uni(K(q), K([s[0], s[1]])); }); });
  return {K, find, inside, uniq};
}

/* build the netlist for one sheet. opt.target: "browser" (default), "cir" or "ltspice"; opt.analysis */
function spiceBuild(id, opt = {}){
  const cfg = SIMCFG[id], V = spiceValues(id), P = spiceParams(id), rec = spiceExtract(id), U = spiceConnect(rec);
  const ana = (cfg.analyses || [])[opt.analysis || 0] || cfg.analyses[0], target = opt.target || "browser";
  const excl = new Set(cfg.exclude || []), warn = [];
  const names = new Map(); let auto = 0;
  const setName = (q, nm, pri) => { const r = U.find(U.K(q)), c = names.get(r);
    if (!c || pri > c.pri) names.set(r, {nm, pri}); else if (c.pri === pri && c.nm !== nm && pri >= 8) warn.push(`net has two names: ${c.nm} / ${nm}`); };
  rec.gnd.forEach(q => setName(q, "0", 9));
  rec.pwr.forEach(p => setName(p.pt, netName(p.name), 8));
  rec.labels.forEach(l => { if (l.at && /^\+\d/.test(l.name)) setName(l.at, netName(l.name), 8); });
  rec.tps.forEach(t => setName(t.pt, netName(t.name), 6));
  rec.ports.forEach(p => setName(p.pt, netName((cfg.portNames || {})[p.label] || p.label), 5));
  rec.labels.forEach(l => { if (l.at) setName(l.at, netName(l.name), 4); else warn.push(`label "${l.name}" is not on a wire end`); });
  const net = q => { const r = U.find(U.K(q)); if (!names.has(r)) names.set(r, {nm:"n" + (++auto), pri:0}); return names.get(r).nm; };
  const count = new Map(), bump = n => { if (n !== "0") count.set(n, (count.get(n) || 0) + 1); };
  const pinsOf = p => Array.isArray(p.pins) ? p.pins : Object.values(p.pins);

  // look-ups for probes and stimuli
  const portNet = {}, labelNet = {}, tpNet = {};
  rec.ports.forEach(p => portNet[p.label] = net(p.pt));
  rec.labels.forEach(l => { if (l.at) labelNet[l.name] = net(l.at); });
  rec.tps.forEach(t => tpNet[t.name] = net(t.pt));
  const partByRef = {}; rec.parts.forEach(p => partByRef[p.ref] = p);
  const resolve = at => {
    const [k, v] = [at.slice(0, at.indexOf(":")), at.slice(at.indexOf(":") + 1)];
    if (k === "tp") return tpNet[v];
    if (k === "port") return portNet[v];
    if (k === "label") return labelNet[v];
    if (k === "node") return v;
    if (k === "pin"){ const [ref, pin] = v.split("."), p = partByRef[ref]; if (!p) return null;
      const q = Array.isArray(p.pins) ? p.pins[+pin - 1] : (p.pins[pin] || p.pins[Object.keys(p.pins).find(n => normPin(n) === normPin(pin))]); return q ? net(q) : null; }
    return null;
  };

  // circuit elements
  const el = [], wrappers = [], used = new Set();
  rec.parts.forEach(p => {
    if (excl.has(p.ref) || p.kind === "CONN") return;
    if (/^(R|C|L)$/.test(p.kind)){
      const v = V.vals[p.ref]; if (v == null){ warn.push(`${p.ref} has no value`); return; }
      const a = net(p.pins[0]), b = net(p.pins[1]); bump(a); bump(b); el.push(`${p.ref} ${a} ${b} ${v}`); return;
    }
    if (p.kind === "FB"){ const a = net(p.pins[0]), b = net(p.pins[1]); bump(a); bump(b); el.push(`X${p.ref} ${a} ${b} BEAD_BEH L=${V.vals[p.ref]}`); used.add("BEAD_BEH"); return; }
    if (p.kind === "D"){ const m = DIODES[p.val]; if (!m){ warn.push(`${p.ref}: no model for ${p.val}`); return; }
      const a = net(p.pins[0]), b = net(p.pins[1]); bump(a); bump(b); el.push(`${p.ref} ${a} ${b} ${m}`); return; }
    if (p.kind === "FU"){ const a = net(p.pins[0]), b = net(p.pins[1]); bump(a); bump(b); el.push(`R${p.ref} ${a} ${b} 0.5`); return; }
    const def = PARTS[p.part];
    if (!def){ warn.push(`${p.ref}: no SPICE model for ${p.part}`); return; }
    const drawn = {}; Object.keys(p.pins).forEach(n => drawn[normPin(n)] = p.pins[n]);
    const missing = def.pins.filter(n => !drawn[n]);
    const nodes = def.pins.filter(n => drawn[n]).map(n => { const x = net(drawn[n]); bump(x); return x; });
    const params = def.params ? " " + def.params : "";
    let sub = def.sub;
    if (missing.length){
      sub = `W_${p.ref}_${def.sub}`.toUpperCase();
      const inner = def.pins.map(n => drawn[n] ? n.toLowerCase() : def.tie[n] === "0" ? "0" : def.tie[n] === "hi" ? "tie_hi" : "nc_" + n.toLowerCase());
      wrappers.push(`* ${p.ref} (${p.part}) is drawn without ${missing.join(", ")}: tied off inside this wrapper`,
        `.subckt ${sub} ${def.pins.filter(n => drawn[n]).map(n => n.toLowerCase()).join(" ")}`,
        ...(inner.includes("tie_hi") ? ["Vtie tie_hi 0 3.3"] : []),
        ...inner.filter(n => n.startsWith("nc_")).map(n => `R${n} ${n} 0 1G`),
        `X1 ${inner.join(" ")} ${def.sub}${params}`, `.ends ${sub}`);
      el.push(`X${p.ref} ${nodes.join(" ")} ${sub}`);
    } else el.push(`X${p.ref} ${nodes.join(" ")} ${sub}${params}`);
  });

  // test bench: supplies, stimuli, loads
  const tb = [], sub$ = (s, n) => s.replace(/\$N/g, n).replace(/@\[([^\]]+)\]/g, (m, at) => resolve(at) || "0");
  const benchFor = (map, look, kind) => Object.entries(map || {}).forEach(([k, f]) => {
    const n = look(k); if (!n){ warn.push(`${kind} "${k}" not found on the sheet`); return; }
    const s = typeof f === "function" ? f(ana.id, P) : f; if (!s) return;
    (Array.isArray(s) ? s : [s]).forEach(line => tb.push(sub$(line, n)));
    bump(n);
  });
  const allNets = new Set([...names.values()].map(v => v.nm));
  Object.entries(cfg.supplies || {}).forEach(([k, v]) => { const n = netName(k); if (allNets.has(n)){ tb.push(`V_${n.toUpperCase()} ${n} 0 ${v}`); bump(n); } });
  benchFor(cfg.ports, k => portNet[k], "port");
  benchFor(cfg.labels, k => labelNet[k], "label");
  benchFor(cfg.drive, k => resolve(k), "node");

  // dangling nets get a 1 GOhm leak so the matrix stays solvable
  const leak = [...count.entries()].filter(([n, c]) => c <= 1).map(([n]) => `RLK_${n} ${n} 0 1G`);

  // parameters (stimulus values) in SPICE units
  const pv = v => typeof v === "number" ? spiceNum(v) : v;
  const prm = (cfg.params || []).map(p => `.param ${p.k}=${pv(p.spice ? p.spice(P[p.k]) : P[p.k])}`).concat(Object.entries(cfg.fixed || {}).map(([k, v]) => `.param ${k}=${v}`));

  const probes = (ana.probes || cfg.probes).map(pr => ({...pr, net: resolve(pr.at)}));
  probes.forEach(pr => { if (!pr.net) warn.push(`probe ${pr.name} (${pr.at}) not found`); });
  const head = [`* COMET · ${SHEETS[id].title} · DWG ${SHEETS[id].dwg}`,
    `* Netlist generated from the COMET system schematic (sheet ${ORDER.indexOf(id) + 1}). Analysis: ${ana.label}.`,
    `* Part values as shown on the sheet${Object.keys(V.vals).some(r => V.vals[r] !== V.def[r]) ? " (edited: " + Object.keys(V.vals).filter(r => V.vals[r] !== V.def[r]).map(r => r + "=" + V.vals[r]).join(", ") + ")" : ""}.`];
  if (excl.size) head.push(`* Not simulated: ${[...excl].join(", ")} (${cfg.excludeWhy || "no model"}).`);
  const out = [...head, ""];
  if (target === "ltspice") out.push(".lib comet_models.lib"); else out.push(MODELS_LIB.trim());
  if (wrappers.length) out.push("", "* ---- instance wrappers ----", ...wrappers);
  out.push("", "* ---- stimulus parameters ----", ...prm, "", "* ---- circuit (from the sheet) ----", ...el, "", "* ---- test bench ----", ...tb);
  if (leak.length) out.push("* unconnected nets", ...leak);
  out.push("", ana.cmd);
  if (target === "browser") out.push(`.save ${probes.filter(p => p.net && p.net !== "0").map(p => `v(${p.net})`).filter((v, i, a) => a.indexOf(v) === i).join(" ")}`);
  out.push(".end");
  return {text: ascii(out.join("\n")), probes, warn, rec, U, net, names, el, tb, leak, prm, wrappers, ana, portNet, labelNet, tpNet, resolve};
}
