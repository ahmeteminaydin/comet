
/* ---------- detail-sheet drawing library ---------- */
const DETS = $("#det");
const SHEETS = {};
let DS = null;
let REC = null;     // electrical record of the sheet being drawn (filled only while extracting a netlist)
let SV = null;      // part values of the sheet being drawn, when it has a SPICE model: {vals, def, pre, suf}
const ee = (tag, a, p, t) => el(tag, a, p || DS, t);

/* engineering values: SPICE strings <-> numbers <-> display text */
const SIP = {f:1e-15, p:1e-12, n:1e-9, u:1e-6, "µ":1e-6, m:1e-3, k:1e3, K:1e3, M:1e6, meg:1e6, G:1e9, T:1e12};
function siNum(s){                                   // user text -> number (M and Meg = mega, m = milli)
  if (s == null) return NaN;
  let t = String(s).trim().replace(/\s+/g, "").replace(/(ohms?|Ω|F|H|V|A)$/i, "");
  let m = t.match(/^(\d+)([kKMRrpnuµmG])(\d+)$/);    // 4k7 style
  if (m) t = m[1] + "." + m[3] + (/[Rr]/.test(m[2]) ? "" : m[2]);
  m = t.match(/^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)(meg|Meg|MEG|[fpnuµmkKMGT])?$/);
  if (!m) return NaN;
  return parseFloat(m[1]) * (m[2] ? SIP[m[2].length === 3 ? "meg" : m[2]] : 1);
}
function spiceNum(v){                                // number -> SPICE string ("2.2k", "1.5p", "1Meg")
  if (!isFinite(v) || v === 0) return String(v);
  const P = [[1e9,"G"],[1e6,"Meg"],[1e3,"k"],[1,""],[1e-3,"m"],[1e-6,"u"],[1e-9,"n"],[1e-12,"p"],[1e-15,"f"]];
  const a = Math.abs(v);
  for (const [k, s] of P) if (a >= k*0.9999) return +(v/k).toPrecision(4) + s;
  return v.toExponential(3);
}
function engText(v, unit){                           // number -> "2.2 kΩ", "1.5 pF", "1 MΩ"
  if (!isFinite(v)) return "?";
  const P = [[1e9,"G"],[1e6,"M"],[1e3,"k"],[1,""],[1e-3,"m"],[1e-6,"µ"],[1e-9,"n"],[1e-12,"p"],[1e-15,"f"]];
  const a = Math.abs(v);
  for (const [k, s] of P) if (a >= k*0.9999) return +(v/k).toPrecision(3) + " " + s + unit;
  return v.toExponential(2) + " " + unit;
}
function labelVal(lbl){                              // "≈ 47 kΩ *" -> {v:47e3, pre:"≈ ", suf:" *"}
  const m = String(lbl).match(/^(\D*?)(\d*\.?\d+)\s*([fpnuµmkMG]?)(Ω|F|H)(.*)$/);
  if (!m) return null;
  return {v: parseFloat(m[2]) * (m[3] ? SIP[m[3]] : 1), pre: m[1], suf: m[5]};
}
const UNIT = {R:"Ω", C:"F", L:"H", FB:"H"};

function rp(x, y, a, lx, ly){ const r = a*Math.PI/180, c = Math.round(Math.cos(r)), s = Math.round(Math.sin(r)); return [x + lx*c - ly*s, y + lx*s + ly*c]; }
function recPath(d){                                 // record the straight segments of an electrical wire
  const re = /([MHVL])([^MHVL]*)/g; let m, cur = null, pts = [];
  const flush = () => { for (let i = 1; i < pts.length; i++) if (pts[i][0] !== pts[i-1][0] || pts[i][1] !== pts[i-1][1]) REC.wires.push([pts[i-1][0], pts[i-1][1], pts[i][0], pts[i][1]]); pts = []; };
  while ((m = re.exec(d))){
    const n = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (m[1] === "M"){ flush(); cur = [n[0], n[1]]; pts.push(cur); }
    else if (m[1] === "H"){ cur = [n[0], cur[1]]; pts.push(cur); }
    else if (m[1] === "V"){ cur = [cur[0], n[0]]; pts.push(cur); }
    else { cur = [n[0], n[1]]; pts.push(cur); }
  }
  flush();
}
function grp(tip, cls){ const g = ee("g", cls ? {class:cls} : {}); if (tip) g.setAttribute("data-tip", tip); return g; }
function tx(x, y, t, cls = "rv", anc, p){ const a = {x, y, class:cls}; if (anc) a["text-anchor"] = anc; return ee("text", a, p, t); }
function WR(d, cls = ""){ if (REC && !/[CcAaQqSsTt]/.test(d)) recPath(d); return ee("path", {d, class:"dw " + cls}); }
function DL(d, cls = ""){ return ee("path", {d, class:"dw " + cls}); }          // drawn line that is never a wire (timing diagrams)
function J(x, y){ ee("circle", {cx:x, cy:y, r:3.3, class:"jd"}); }
function GND(x, y){ if (REC) REC.gnd.push([x, y]); ee("path", {d:`M${x} ${y}v9M${x-9} ${y+9}h18M${x-6} ${y+13}h12M${x-3} ${y+17}h6`, class:"cl"}); }
function PWR(x, y, n){ if (REC) REC.pwr.push({pt:[x, y], name:n}); ee("path", {d:`M${x} ${y}v-10M${x-8} ${y-10}h16`, class:"cl pw"}); tx(x, y-15, n, "rf pwt", "middle"); }
function NET(x, y, n, anc){ if (REC) REC.labels.push({pt:[x, y], name:n, anc}); tx(x, y-5, n, "pn halo", anc); }
function NC(x, y){ if (REC) REC.nc.push([x, y]); ee("path", {d:`M${x-4} ${y-4}l8 8m0-8l-8 8`, class:"cl"}); }
const ROT = {h:0, r:0, v:90, d:90, l:180, u:270};
function two(x, y, o, ref, val, tip, body, kind, extra){
  const a = ROT[o] || 0;
  let shown = val, vcls = "rv", t = tip || `${ref} · ${val}`, edit = false;
  if (SV && SV.vals[ref] != null){
    edit = true;
    const v = siNum(SV.vals[ref]), d = siNum(SV.def[ref]);
    const changed = Math.abs(v - d) > Math.abs(d)*1e-9;
    shown = changed ? engText(v, UNIT[kind] || "") : (SV.pre[ref] || "") + engText(v, UNIT[kind] || "") + (SV.suf[ref] || "");
    if (changed){ vcls = "rv edv"; t += ` · now ${engText(v, UNIT[kind] || "")} (design ${engText(d, UNIT[kind] || "")})`; }
    t += " · click to change";
  }
  if (REC) REC.parts.push(Object.assign({kind, ref, val, x, y, a, pins:[rp(x, y, a, -20, 0), rp(x, y, a, 20, 0)]}, extra || {}));
  const g = grp(t, edit ? "edp" : null), b = ee("g", a ? {transform:`rotate(${a} ${x} ${y})`} : {}, g);
  if (edit){ const vert = a % 180 !== 0; ee("rect", vert ? {x:x-14, y:y-24, width:84, height:48, rx:4, class:"hitp"} : {x:x-30, y:y-26, width:60, height:54, rx:4, class:"hitp"}, g); g.setAttribute("data-ref", ref); g.setAttribute("tabindex", "0"); g.setAttribute("role", "button"); g.setAttribute("aria-label", `${ref}, ${shown}. Change value`); }
  body(b, x, y);
  if (a === 90 || a === 270){ tx(x+13, y-3, ref, "rf", null, g); tx(x+13, y+12, shown, vcls, null, g); }
  else { tx(x, y-12, ref, "rf", "middle", g); tx(x, y+22, shown, vcls, "middle", g); }
  return g;
}
const R  = (x,y,o,ref,val,tip) => two(x,y,o,ref,val,tip,b => { ee("path",{d:`M${x-20} ${y}h8M${x+12} ${y}h8`,class:"cl"},b); ee("rect",{x:x-12,y:y-5,width:24,height:10,class:"cb"},b); }, "R");
const C  = (x,y,o,ref,val,tip) => two(x,y,o,ref,val,tip,b => ee("path",{d:`M${x-20} ${y}h17M${x+3} ${y}h17M${x-3} ${y-9}v18M${x+3} ${y-9}v18`,class:"cl"},b), "C");
const L  = (x,y,o,ref,val,tip) => two(x,y,o,ref,val,tip,b => ee("path",{d:`M${x-20} ${y}h4a4 4 0 0 1 8 0a4 4 0 0 1 8 0a4 4 0 0 1 8 0a4 4 0 0 1 8 0h4`,class:"cl"},b), "L");
const FB = (x,y,o,ref,val,tip) => two(x,y,o,ref,val,tip,b => { ee("path",{d:`M${x-20} ${y}h8M${x+12} ${y}h8`,class:"cl"},b); ee("rect",{x:x-12,y:y-5,width:24,height:10,class:"cf"},b); }, "FB");
const FU = (x,y,o,ref,val,tip) => two(x,y,o,ref,val,tip,b => { ee("path",{d:`M${x-20} ${y}h20`,class:"cl"},b); ee("rect",{x:x-12,y:y-5,width:24,height:10,class:"cb"},b); ee("path",{d:`M${x-20} ${y}h40`,class:"cl"},b); }, "FU");
function DI(x, y, o, ref, val, tip, sch){
  return two(x,y,o,ref,val,tip,b => { ee("path",{d:`M${x-20} ${y}h12M${x+6} ${y}h14`,class:"cl"},b); ee("path",{d:`M${x-8} ${y-8}L${x-8} ${y+8}L${x+6} ${y}Z`,class:"cf"},b);
    ee("path",{d: sch ? `M${x+2} ${y-11}h4v22h4` : `M${x+6} ${y-8}v16`,class:"cl"},b); }, "D", {sch:!!sch});
}
function SIPM(x, y, ref, part, tip){            // photodiode, cathode at top (y-20), anode at bottom (y+20)
  if (REC) REC.parts.push({kind:"SIPM", ref, part, x, y, pins:{K:[x, y-20], A:[x, y+20]}});
  const g = grp(tip || `${ref} · ${part}`), b = ee("g", {transform:`rotate(270 ${x} ${y})`}, g);
  ee("path",{d:`M${x-20} ${y}h12M${x+6} ${y}h14`,class:"cl"},b); ee("path",{d:`M${x-8} ${y-8}L${x-8} ${y+8}L${x+6} ${y}Z`,class:"cf"},b); ee("path",{d:`M${x+6} ${y-8}v16`,class:"cl"},b);
  ee("path",{d:`M${x+34} ${y-30}l-16 12m0 0l7-1m-7 1l3-6M${x+44} ${y-18}l-16 12m0 0l7-1m-7 1l3-6`,class:"cl ph"},g);
  tx(x+16, y+4, ref, "rf", null, g); tx(x+16, y+18, part, "rv", null, g);
}
function OPA(x, y, ref, part, tip, cmp){
  const P = {inp:[x-44,y-12], inn:[x-44,y+12], out:[x+44,y], vp:[x,y-28], vn:[x,y+28]};
  if (REC) REC.parts.push({kind:"OPA", ref, part, cmp:!!cmp, x, y, pins:P});
  const g = grp(tip || `${ref} · ${part}`);
  ee("path",{d:`M${x-30} ${y-30}L${x+30} ${y}L${x-30} ${y+30}Z`,class:"ic"},g);
  ee("path",{d:`M${x-44} ${y-12}h14M${x-44} ${y+12}h14M${x+30} ${y}h14M${x} ${y-15}v-13M${x} ${y+15}v13`,class:"cl"},g);
  tx(x-26, y-8, "+", "pn", null, g); tx(x-26, y+16, "−", "pn", null, g);
  if (cmp) ee("path",{d:`M${x-12} ${y+5}h7v-10h7`,class:"cl"},g);
  tx(x+10, y-24, ref, "rf", null, g); tx(x+10, y+40, part, "rv", null, g);
  return {p:P.inp, n:P.inn, o:P.out, vp:P.vp, vn:P.vn};
}
function AND(x, y, ref, part, tip){
  const P = {a:[x-44,y-12], b:[x-44,y+12], y:[x+38,y]};
  if (REC) REC.parts.push({kind:"AND", ref, part, x, y, pins:P});
  const g = grp(tip || `${ref} · ${part}`);
  ee("path",{d:`M${x-30} ${y-24}H${x}A24 24 0 0 1 ${x} ${y+24}H${x-30}Z`,class:"ic"},g);
  ee("path",{d:`M${x-44} ${y-12}h14M${x-44} ${y+12}h14M${x+24} ${y}h14`,class:"cl"},g);
  tx(x-26, y-32, ref, "rf", null, g); tx(x-26, y+40, part, "rv", null, g);
  return {a:P.a, b:P.b, o:P.y};
}
function INV(x, y, ref, part, tip){
  const P = {a:[x-34,y], y:[x+34,y]};
  if (REC) REC.parts.push({kind:"INV", ref, part, x, y, pins:P});
  const g = grp(tip || `${ref} · ${part}`);
  ee("path",{d:`M${x-20} ${y-16}L${x+12} ${y}L${x-20} ${y+16}Z`,class:"ic"},g); ee("circle",{cx:x+16,cy:y,r:4,class:"ic"},g);
  ee("path",{d:`M${x-34} ${y}h14M${x+20} ${y}h14`,class:"cl"},g); tx(x-20, y-22, ref, "rf", null, g); tx(x-20, y+32, part, "rv", null, g);
  return {i:P.a, o:P.y};
}
function IC(x, y, w, h, ref, part, pins, tip, lab){
  const g = grp(tip || `${ref} · ${part}`), P = {}, side = {};
  ee("rect", {x, y, width:w, height:h, rx:3, class:"ic"}, g);
  const lx = lab ? lab[0] : x + w/2, ly = lab ? lab[1] : y + h/2;
  tx(lx, ly, ref, "rf", "middle", g); tx(lx, ly + 15, part, "rv", "middle", g);
  (pins.l || []).forEach((n, i, a) => { const py = Math.round(y + h*(i+1)/(a.length+1)); ee("path",{d:`M${x-14} ${py}H${x}`,class:"cl"},g); tx(x+6, py+3.5, n, "pn", null, g); P[n] = [x-14, py]; side[n] = "l"; });
  (pins.r || []).forEach((n, i, a) => { const py = Math.round(y + h*(i+1)/(a.length+1)); ee("path",{d:`M${x+w} ${py}h14`,class:"cl"},g); tx(x+w-6, py+3.5, n, "pn", "end", g); P[n] = [x+w+14, py]; side[n] = "r";
    if (REC && pins.conn) REC.links.push([[x, py], [x+w+14, py]]); });
  (pins.t || []).forEach((n, i, a) => { const px = Math.round(x + w*(i+1)/(a.length+1)); ee("path",{d:`M${px} ${y}v-14`,class:"cl"},g); tx(px, y+14, n, "pn", "middle", g); P[n] = [px, y-14]; side[n] = "t"; });
  (pins.b || []).forEach((n, i, a) => { const px = Math.round(x + w*(i+1)/(a.length+1)); ee("path",{d:`M${px} ${y+h}v14`,class:"cl"},g); tx(px, y+h-7, n, "pn", "middle", g); P[n] = [px, y+h+14]; side[n] = "b"; });
  if (REC) REC.parts.push({kind: pins.conn ? "CONN" : "IC", ref, part, x, y, w, h, pins:P, side, lab:[lx, ly]});
  return P;
}
function SWC(x, y, ref, part, tip){             // analog switch: A at top, B at bottom, control on the right
  const P = {a:[x, y-29], b:[x, y+29], ctl:[x+8, y+9]};
  if (REC) REC.parts.push({kind:"SWC", ref, part, x, y, pins:P});
  const g = grp(tip || `${ref} · ${part}`);
  ee("path", {d:`M${x} ${y-29}V${y-7}M${x} ${y+21}V${y+29}M${x} ${y-4}L${x+13} ${y+19}`, class:"cl"}, g);
  ee("circle", {cx:x, cy:y-5, r:2.5, class:"ic"}, g); ee("circle", {cx:x, cy:y+21, r:2.5, class:"ic"}, g);
  tx(x+22, y+1, ref, "rf", null, g); tx(x+22, y+15, part, "rv", null, g);
  return P;
}
function CONN2(x, y, ref, label, tip){          // coax connector drawn as a circle, passes the signal straight through
  if (REC){ REC.links.push([[x-10, y], [x+10, y]]); REC.parts.push({kind:"CONN", ref, part:label, x, y, pins:{1:[x-10, y], 2:[x+10, y]}, side:{1:"l", 2:"r"}, w:20, h:20}); }
  const g = grp(tip || `${ref} · ${label}`);
  ee("circle", {cx:x, cy:y, r:10, class:"ic"}, g); ee("circle", {cx:x, cy:y, r:3, class:"cf"}, g); tx(x-10, y+26, `${ref} ${label}`, "rf", null, g);
}
function TP(x, y, n){ if (REC) REC.tps.push({pt:[x, y], name:n}); ee("circle", {cx:x, cy:y, r:5, class:"tpd"}); tx(x, y-10, n, "rf", "middle"); }
const fw = s => s.length*6.9 + 24;
function flag(x0, x1, y, pt, label, go, at, dir){
  if (REC) REC.ports.push({pt:[at, y], label, go, dir});
  const k = G[go] ? G[go].k : "dat", g = ee("g", {class:"port k-"+k, "data-go":go, role:"button", tabindex:"0", "aria-label":"Go to "+label});
  const d = pt === "r" ? `M${x0} ${y-10}H${x1-10}L${x1} ${y}L${x1-10} ${y+10}H${x0}Z` : `M${x0} ${y}L${x0+10} ${y-10}H${x1}V${y+10}H${x0+10}Z`;
  ee("path", {d}, g); tx((x0 + x1)/2 + (pt === "r" ? -4 : 4), y+4, label, "pt", "middle", g); return at;
}
const PIN  = (x, y, label, go) => flag(x, x + fw(label), y, "r", label, go, x + fw(label), "in");   // left edge, signal comes in
const POUT = (x, y, label, go) => flag(x, x + fw(label), y, "r", label, go, x, "out");               // right side, signal goes out
const PRIN = (x, y, label, go) => flag(x, x + fw(label), y, "l", label, go, x, "in");                // right side, signal comes in
function NOTE(x, y, w, lines){ if (REC) REC.notes.push({x, y, lines}); const g = ee("g", {class:"note"}); ee("rect", {x, y, width:w, height:14 + lines.length*16, rx:4, class:"nb"}, g);
  lines.forEach((t, i) => tx(x+10, y+20+i*16, t, "nt", null, g)); }
function BOX(x, y, w, h, title, lines, go){
  const g = ee("g", go ? {class:"fbox port k-"+(G[go] ? G[go].k : "dat"), "data-go":go, role:"button", tabindex:"0"} : {class:"fbox"});
  ee("rect", {x, y, width:w, height:h, rx:5, class:"ic"}, g); tx(x+12, y+22, title, "rf", null, g);
  (lines || []).forEach((t, i) => tx(x+12, y+42+i*16, t, "nt", null, g)); return g; }
function ARW(d, cls = ""){ return ee("path", {d, class:"dw ar " + cls, "marker-end":"url(#dar)"}); }
function DIM(x1, y1, x2, y2, label, dx = 0, dy = -6){ ee("path", {d:`M${x1} ${y1}L${x2} ${y2}`, class:"dim", "marker-start":"url(#ddm)", "marker-end":"url(#ddm)"}); tx((x1+x2)/2 + dx, (y1+y2)/2 + dy, label, "rv", "middle"); }
function CALL(n, x, y, x2, y2){ ee("path", {d:`M${x} ${y}L${x2} ${y2}`, class:"lead"}); ee("circle", {cx:x, cy:y, r:10, class:"cll"}); tx(x, y+4, String(n), "rf", "middle"); }
function heading(t, s){ tx(28, 46, t, "h1"); if (s) tx(28, 68, s, "h2"); }

function drawSheet(id, target){
  const sv = (typeof spiceValues === "function") ? spiceValues(id) : null;   // may draw the sheet off-screen first
  const sh = SHEETS[id], root = target || DETS, keepDS = DS, keepSV = SV; root.innerHTML = "";
  root.style.setProperty("--dk", `var(--c-${G[id].k})`);
  DS = root; SV = sv;
  const df = ee("defs", {});
  const m1 = ee("marker", {id:"dar", viewBox:"0 0 10 10", refX:"9", refY:"5", markerWidth:"8", markerHeight:"8", markerUnits:"userSpaceOnUse", orient:"auto"}, df); ee("path", {d:"M0 1L10 5L0 9z", class:"mk"}, m1);
  const m2 = ee("marker", {id:"ddm", viewBox:"0 0 10 10", refX:"5", refY:"5", markerWidth:"7", markerHeight:"7", markerUnits:"userSpaceOnUse", orient:"auto-start-reverse"}, df); ee("path", {d:"M0 1L10 5L0 9z", class:"mk2"}, m2);
  const hp = ee("pattern", {id:"dh", width:"7", height:"7", patternUnits:"userSpaceOnUse", patternTransform:"rotate(45)"}, df); ee("line", {x1:"0", y1:"0", x2:"0", y2:"7", class:"hl"}, hp);
  ee("rect", {x:8, y:8, width:1264, height:744, rx:4, class:"frm"});
  const n = ORDER.indexOf(id) + 1;
  ee("rect", {x:900, y:676, width:364, height:68, class:"tb"});
  ["M900 700H1264","M900 722H1264","M1120 700V744"].forEach(d => ee("path", {d, class:"tbl"}));
  tx(910, 693, sh.title.toUpperCase(), "rf"); tx(910, 716, `DWG ${sh.dwg} · REV A`, "rv"); tx(1130, 716, `SHEET ${n} / ${ORDER.length}`, "rv");
  tx(910, 738, "BAATCH · EE493–494", "rv"); tx(1130, 738, "2026-11-03", "rv");
  heading(sh.title, sh.sub);
  sh.draw();
  DS = keepDS; SV = keepSV;
}
