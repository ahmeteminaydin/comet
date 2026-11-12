
/* ---------- schematic ---------- */
const NS = "http://www.w3.org/2000/svg";
const $ = s => document.querySelector(s);
const svg = $("#sch");
const RM = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function el(tag, a, p, t){ const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (t != null) e.textContent = t; (p || svg).appendChild(e); return e; }

const defs = el("defs", {});
DOMAINS.forEach(([k]) => {
  const m = el("marker", {id:"ar-"+k, viewBox:"0 0 10 10", refX:"8.5", refY:"5", markerWidth:"9", markerHeight:"9", markerUnits:"userSpaceOnUse", orient:"auto-start-reverse"}, defs);
  el("path", {d:"M0 1L10 5L0 9z", style:"fill:var(--c-"+k+")"}, m);
});
const hp = el("pattern", {id:"hatch", width:"6", height:"6", patternUnits:"userSpaceOnUse", patternTransform:"rotate(45)"}, defs);
el("line", {x1:"0", y1:"0", x2:"0", y2:"6", style:"stroke:var(--c-mech);stroke-width:1.4"}, hp);

const LY = {frame:el("g",{}), wire:el("g",{}), blk:el("g",{}), tp:el("g",{}), fx:el("g",{class:"fx"})};

/* frames + title block */
el("rect", {x:350, y:90, width:840, height:542, rx:8, class:"frame"}, LY.frame);
el("text", {x:352, y:82, class:"tiny"}, LY.frame, "READOUT BASEBOARD · ONE PCB, TWO CHANNELS");
el("rect", {x:980, y:648, width:280, height:104, rx:6, class:"frame"}, LY.frame);
el("text", {x:1130, y:664, class:"tiny"}, LY.frame, "PC · DESKTOP APP");
const tbg = blk("overview","mu","System overview", LY.frame);
el("rect", {x:20, y:650, width:320, height:100, class:"tb"}, tbg);
["M20 676H340","M20 702H340","M20 727H340","M220 702V750"].forEach(d => el("path", {d, class:"tbl"}, tbg));
el("text", {x:30, y:668, class:"lb"}, tbg, "COMET · SYSTEM SCHEMATIC");
el("text", {x:30, y:693, class:"sl"}, tbg, "Compact Photonics-Enabled Cosmic Muon Detector");
el("text", {x:30, y:719, class:"sl"}, tbg, "DWG COMET-SYS-001 · REV A");
el("text", {x:230, y:719, class:"sl"}, tbg, "SHEET 1 / 1");
el("text", {x:30, y:743, class:"sl"}, tbg, "BAATCH · EE493–494");
el("text", {x:230, y:743, class:"sl"}, tbg, "2026-11-03");
el("text", {x:272, y:668, class:"tiny", style:"fill:var(--c-mu)"}, tbg, "OVERVIEW ›");
el("text", {x:400, y:172, class:"tiny"}, LY.frame, "CHANNEL A");
el("text", {x:400, y:412, class:"tiny"}, LY.frame, "CHANNEL B");

/* wires */
const W = [
 ["w-mu","M150 40 L215 566","mu",1,0],
 ["w-sa","M294 210 H398","ana",0,1],["w-sb","M294 450 H398","ana",0,1],
 ["w-aa","M520 210 H578","ana",0,1],["w-ab","M520 450 H578","ana",0,1],
 ["w-pa","M550 210 V126 H578","ana",1,1],["w-pb","M550 450 V522 H578","ana",1,1],
 ["w-ta","M640 300 V242","ana",0,1],["w-tb","M640 360 V418","ana",0,1],
 ["w-ca","M700 210 H758","dig",0,1],["w-cb","M700 450 H758","dig",0,1],
 ["w-xa","M880 210 H1038","dig",0,1],["w-xb","M880 450 H1038","dig",0,1],
 ["w-ga","M900 210 V316 H923","dig",0,1],["w-gb","M900 450 V344 H923","dig",0,1],
 ["w-gm","M987 330 H1038","dig",0,1],
 ["w-qa","M700 126 H1038","ana",1,1],["w-qb","M700 522 H1038","ana",1,1],
 ["w-mt","M1040 388 H740 V330 H702","dat",1,1],
 ["w-ba","M400 318 H330 V234 H282 V224","pwr",0,1],["w-bb","M400 342 H330 V428 H282 V436","pwr",0,1],
 ["w-ts","M294 499 H342 V578 H398","pwr",1,1],["w-tr","M400 598 H362 V352 H398","pwr",1,1],
 ["w-tm","M700 586 H1050 V534","dat",1,1],
 ["w-mu2","M1114 532 V554","dat",0,1],["w-up","M1114 604 V658 H1054 V670","dat",0,1],
 ["w-lg","M1113 703 H1126","dat",0,1]];
const wireEl = {};
W.forEach(([id,d,k,dash,arr]) => {
  const a = {id, d, class:"wire k-"+k+(dash?" dash":""), "data-k":k};
  if (arr) a["marker-end"] = "url(#ar-"+k+")";
  if (id === "w-mu") a.style = "opacity:.75";
  wireEl[id] = el("path", a, LY.wire);
});
[[550,210,"a"],[550,450,"a"],[900,210,""],[900,450,""]].forEach(([x,y,c]) => el("circle", {cx:x, cy:y, r:3.2, class:"jn "+c}, LY.wire));

/* blocks */
function blk(id, k, label, parent){
  const g = el("g", {class:"blk k-"+k, "data-id":id, tabindex:"0", role:"button", "aria-label":label+": open build guide"}, parent || LY.blk);
  return g;
}
function box(id, k, x, y, w, h, label, sub){
  const g = blk(id, k, label);
  el("rect", {x, y, width:w, height:h, rx:4, class:"bx"}, g);
  const tall = h >= 56;
  el("text", {x:x+10, y:y+(tall?25:20), class:"lb"}, g, label);
  if (sub) el("text", {x:x+10, y:y+(tall?42:36), class:"sl"}, g, sub);
  return g;
}
[
 ["afe","ana",400,180,120,60,"AFE A","LMH6629 · ×21"],["afe","ana",400,420,120,60,"AFE B","LMH6629 · ×21"],
 ["comp","dig",580,180,120,60,"COMPARATOR A","TLV3501 · 4.5 ns"],["comp","dig",580,420,120,60,"COMPARATOR B","TLV3501 · 4.5 ns"],
 ["stretch","dig",760,180,120,60,"STRETCHER A","one-shot · 50 ns"],["stretch","dig",760,420,120,60,"STRETCHER B","one-shot · 50 ns"],
 ["thr","ana",580,300,120,60,"THRESHOLD","MCP4728 · 12-bit"],["bias","pwr",400,300,120,60,"BIAS SUPPLY","5 V→27 V, <5 mVpp"],
 ["peak","ana",580,102,120,48,"PEAK-HOLD A","Landau · extra"],["peak","ana",580,498,120,48,"PEAK-HOLD B","Landau · extra"],
 ["temp","pwr",400,562,300,48,"TEMPERATURE COMPENSATION","Vbias = Vbr(T) + Vov · k ≈ 21.5 mV/°C"],
 ["usb","dat",1062,556,104,48,"USB-C","power + data"],
 ["logger","dat",995,672,118,62,"DATA LOGGER","CSV / SQLite"],["gui","dat",1128,672,118,62,"GUI DASHBOARD","PySide6+pyqtgraph"]
].forEach(b => box(...b));

/* MCU */
{ const g = blk("mcu","dat","Microcontroller");
  el("rect", {x:1040, y:110, width:130, height:422, rx:4, class:"bx"}, g);
  for (let y = 130; y <= 510; y += 20) el("path", {d:`M1170 ${y}H1178`, class:"pin"}, g);
  el("text", {x:1052, y:262, class:"lb"}, g, "MCU · DAQ");
  el("text", {x:1052, y:279, class:"sl"}, g, "STM32G4 class");
  el("text", {x:1052, y:294, class:"sl"}, g, "ring buffer → USB");
  [[122,"ADC ← peak A"],[206,"CNT ← A"],[326,"CAPTURE ← coinc"],[384,"DAC → threshold"],[446,"CNT ← B"],[518,"ADC ← peak B"]]
    .forEach(([y,t]) => el("text", {x:1046, y, class:"tiny"}, g, t));
}
/* coincidence gate */
{ const g = blk("coinc","dig","Coincidence logic");
  el("path", {d:"M925 298 H955 A32 32 0 0 1 955 362 H925 Z", class:"bx"}, g);
  el("text", {x:938, y:334, class:"sl"}, g, "&");
  el("text", {x:918, y:290, class:"lb"}, g, "COINCIDENCE");
  el("text", {x:926, y:378, class:"sl"}, g, "≤ 100 ns window");
}
const gateX = el("text", {x:926, y:406, class:"gate-x"}, LY.blk, "✕ no overlap");

/* sky */
{ const g = blk("muon","mu","Cosmic muons");
  el("rect", {x:20, y:14, width:330, height:62, rx:4, class:"bx"}, g);
  el("path", {d:"M150 16 L112 74 M150 16 L131 74 M150 16 L172 74 M150 16 L196 74", class:"wire k-mu", style:"stroke-width:1;opacity:.4"}, g);
  el("text", {x:206, y:38, class:"lb"}, g, "COSMIC RAYS");
  el("text", {x:206, y:56, class:"sl"}, g, "≈1 μ/cm²/min · I₀cos²θ");
}
/* stand: fixed base, upright and protractor */
{ const g = blk("stand","mech","Mechanical stand");
  el("rect", {x:24, y:566, width:300, height:14, rx:3, class:"bx"}, g);
  el("rect", {x:172, y:330, width:16, height:236, class:"bx"}, g);
  el("path", {d:"M180 84V318", class:"wire k-mech dash", style:"stroke-width:1;opacity:.6"}, g);
  el("text", {x:185, y:94, class:"tiny"}, g, "zenith");
  el("path", {d:"M180 165 A165 165 0 0 1 345 330", class:"wire k-mech", style:"stroke-width:1"}, g);
  for (let a = 0; a <= 90; a += 15){ const r = a*Math.PI/180, r2 = (a%30===0||a===45) ? 174 : 170;
    el("path", {d:`M${180+165*Math.sin(r)} ${330-165*Math.cos(r)} L${180+r2*Math.sin(r)} ${330-r2*Math.cos(r)}`, class:"wire k-mech", style:"stroke-width:1"}, g); }
  [[30,"30°"],[45,"45°"],[60,"60°"]].forEach(([a,t]) => { const r = a*Math.PI/180; el("text", {x:180+184*Math.sin(r)-8, y:330-184*Math.cos(r)+3, class:"tiny"}, g, t); });
  el("text", {x:326, y:346, class:"tiny"}, g, "90°");
  el("text", {x:24, y:600, class:"lb"}, g, "STAND · 0–90° TILT");
  el("text", {x:24, y:616, class:"sl"}, g, "rail + pivot + protractor, d = 5–40 cm");
}
/* telescope: everything on the rail rotates about the pivot (180,330) */
const tel = el("g", {id:"tel"}, LY.blk);
el("path", {d:"M180 168V492", class:"wire k-mech dash", style:"stroke-width:1;opacity:.5"}, tel);
{ const g = blk("stand","mech","Telescope rail", tel);
  el("rect", {x:85, y:200, width:8, height:260, class:"bx"}, g);
  for (let y = 210; y <= 450; y += 10) el("path", {d:`M86 ${y}H${y%50===0?92:89}`, style:"stroke:var(--c-mech);stroke-width:.8"}, g);
  el("rect", {x:93, y:214, width:12, height:22, class:"bx"}, g);
  el("rect", {x:93, y:424, width:12, height:22, class:"bx"}, g);
}
const slabs = {};
[["A",-105],["B",105]].forEach(([ch,c]) => {
  const yc = 330 + c, g = blk("scint","opt","Scintillator module "+ch, tel);
  el("rect", {x:105, y:yc-25, width:150, height:50, rx:3, class:"bx"}, g);
  slabs[ch] = el("rect", {x:112, y:yc-17, width:136, height:34, rx:2, class:"slab"}, g);
  el("text", {x:180, y:yc+4, class:"sl halo", "text-anchor":"middle"}, g, "plastic scint. slab");
  el("text", {x:105, y:yc-31, class:"lb"}, g, "MODULE "+ch);
  const s = blk("sipm","opt","SiPM "+ch, tel);
  el("rect", {x:255, y:yc-11, width:22, height:22, rx:2, class:"bx"}, s);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) el("rect", {x:258+i*6, y:yc-8+j*6, width:4, height:4, style:"fill:currentColor;opacity:.5"}, s);
  el("text", {x:255, y:ch==="A" ? yc-15 : yc+23, class:"sl"}, s, "SiPM");
});
{ const g = blk("absorber","mech","Absorber tray", tel);
  el("rect", {x:115, y:316, width:130, height:28, rx:2, class:"bx"}, g);
  el("rect", {x:115, y:316, width:130, height:28, rx:2, class:"hat"}, g);
  el("text", {x:117, y:362, class:"sl halo"}, g, "ABSORBER TRAY · Pb / Fe");
}
{ const g = blk("temp","pwr","Temperature sensor", tel);
  el("rect", {x:242, y:394, width:34, height:14, rx:2, class:"bx"}, g);
  el("text", {x:252, y:405, class:"tiny"}, g, "T°");
}
el("circle", {cx:180, cy:330, r:5, style:"fill:var(--c-mech);stroke:var(--panel);stroke-width:2"}, LY.fx);
const angArc = el("path", {d:"", fill:"none", style:"stroke:var(--c-mu);stroke-width:3;stroke-linecap:round"}, LY.fx);
const angTxt = el("text", {x:186, y:156, class:"lb halo", style:"fill:var(--c-mu)"}, LY.fx, "θ = 0°");
/* test points */
[["TP1",380,210],["TP2",566,210],["TP3",730,210],["TP4",888,210],["TP5",1012,330],["TP6",1114,544]].forEach(([n,x,y]) => {
  const g = el("g", {class:"tp"}, LY.tp);
  el("circle", {cx:x, cy:y, r:4}, g);
  const right = n === "TP6";
  el("text", {x:right?x+8:x-10, y:right?y+3:y-9, class:"halo"}, g, n);
});

document.querySelectorAll(".blk").forEach(b => {
  b.addEventListener("click", () => show(b.dataset.id, b));
  b.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(b.dataset.id, b); } });
});
