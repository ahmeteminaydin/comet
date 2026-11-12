
SHEETS.scint = {dwg:"COMET-MEC-03", title:"Detector module · cross-section", sub:"Section through the middle of one module, 6 px ≈ 1 mm. Both modules are built the same way.", draw(){
  const M = (x, y, w, h, c) => ee("rect", {x, y, width:w, height:h, class:c});
  M(300, 220, 680, 210, "hous"); M(318, 238, 644, 174, "cav");
  WR("M300 330h9v8h9M962 330h9v8h9");
  M(330, 260, 620, 80, "tape"); M(334, 264, 612, 72, "ptfe"); M(340, 270, 600, 60, "slab2");
  M(622, 330, 36, 11, "cav"); M(625, 330, 30, 4, "grease"); M(625, 334, 30, 9, "cf");
  M(580, 343, 120, 6, "pcb"); M(640, 349, 14, 8, "cf"); M(668, 349, 30, 10, "cf"); M(585, 349, 50, 63, "hat2");
  WR("M647 357C700 357 780 384 962 384", "s"); WR("M683 359C740 362 800 392 962 392", "p");
  ee("rect", {x:956, y:374, width:30, height:26, rx:6, class:"mech"});
  WR("M986 384H1060", "s"); POUT(1060, 384, "coax → AFE A", "afe");
  WR("M986 394H1000V430H1060", "p"); POUT(1060, 430, "6-wire → bias, I²C", "bias");
  WR("M480 150V470", "mu d"); tx(486, 164, "muon", "pn");
  WR("M480 300L560 330L620 290L640 333", "opt"); WR("M480 300L400 270L360 318L470 271L560 330L600 300L632 333", "opt");
  DIM(340, 200, 940, 200, "100 mm"); ee("path", {d:"M272 270H338M272 330H338", class:"dim"}); DIM(280, 270, 280, 330, "10 mm", -30, 4);
  [[1,360,480,380,318],[2,420,480,440,335],[3,480,480,520,339],[6,540,480,600,400],[4,600,480,640,334],[5,660,480,690,346],[7,760,480,968,336],[8,900,480,968,390]].forEach(c => CALL(...c));
  NOTE(40, 520, 520, ["1  Plastic scintillator 100 × 100 × 10 mm (EJ-200 class)", "2  PTFE tape, 2–3 loose layers (diffuse reflector)", "3  Black tape or vinyl (light-tight layer)", "4  7 × 7 mm window with optical grease", "5  SiPM on the carrier PCB (0.8 mm FR-4)", "6  Foam pad presses the carrier against the slab", "7  Black PETG housing, ≥ 2 mm walls, stepped seam", "8  Grommet: coax and 6-wire cable out"]);
  tx(1050, 108, "TOP VIEW", "rf"); M(1050, 120, 160, 160, "slab2");
  ee("rect", {x:1124, y:194, width:12, height:12, class:"cl", "stroke-dasharray":"3 2"}); tx(1050, 300, "SiPM at the centre", "pn"); tx(1050, 314, "of the bottom face", "pn");
  NOTE(600, 560, 290, ["Light bounces inside the slab until", "it reaches the SiPM window; only", "about 1–5 % of it gets there."]);
}};

SHEETS.logger = {dwg:"COMET-SW-01", title:"PC data logger and analysis", sub:"Python program structure. Live path on top, offline analysis below.", draw(){
  const a = PIN(30, 170, "from MCU · USB CDC", "mcu"); ARW(`M${a} 170H236`);
  BOX(240, 130, 220, 80, "Serial reader thread", ["pyserial, line by line", "retries if unplugged"]);
  ARW("M460 170H516"); BOX(520, 130, 240, 80, "Parser and checks", ["field count, numbers", "seq + 1 → count gaps"]);
  ARW("M760 150H836"); BOX(840, 100, 220, 90, "File writer", ["events.csv, stat.csv", "run.json, errors.log", "flush every second"]);
  ARW("M760 190H836V250"); BOX(840, 250, 220, 70, "Queue → GUI", ["thread-safe, never blocks"], "gui");
  ARW("M1060 285H1116"); tx(1120, 289, "GUI", "rf");
  ARW("M950 352V324", "d"); tx(960, 346, "commands: START, STOP, THR …", "pn");
  ARW("M840 362H180V214", "d"); tx(520, 356, "commands are written back to the MCU", "pn", "middle");
  BOX(60, 420, 360, 170, "Run folder", ["runs/2026-11-20_1430_30deg_15cm_none/", "  events.csv   EVT lines", "  stat.csv     STAT lines", "  run.json     θ, d, absorber, thresholds,", "               firmware, start and stop", "  errors.log   rejected lines"]);
  ARW("M420 505H476");
  BOX(480, 400, 420, 210, "analyse.py (per run)", ["T  = t_last − t_first (from STAT, device clock)", "N  = number of EVT lines", "R  = N / T,   σ = √N / T", "R_A, R_B from Δ nA, Δ nB over T", "R_acc  = (w_A + w_B) · R_A · R_B", "R_true = R − R_acc", "fit R_true(θ) = R₀ cosⁿθ  (scipy curve_fit)", "→ table.csv, fit.png for the reports"]);
  NOTE(940, 420, 300, ["EVT,seq,t_us,A,B,C,hA,hB,T_C,Vbias", "STAT,t_us,nA=…,nB=…,nC=…,T=…,Vb=…", "All rates in counts per minute."]);
}};

SHEETS.gui = {dwg:"COMET-SW-02", title:"GUI dashboard · window layout", sub:"PySide6 window with pyqtgraph plots. Grey labels describe what each panel shows.", draw(){
  ee("rect", {x:60, y:100, width:1000, height:560, rx:8, class:"mech"}); ee("rect", {x:60, y:100, width:1000, height:30, rx:8, class:"tbar2"});
  tx(80, 120, "COMET Dashboard", "rf"); tx(1040, 120, "— □ ×", "rv", "end");
  ee("rect", {x:70, y:138, width:980, height:26, class:"cav"}); tx(80, 156, "COM3 · run 30deg_15cm · 00:42:10 · T 23.6 °C · Vbias 27.006 V · lost 0", "rv");
  [["Singles A","40.1 Hz"],["Singles B","39.6 Hz"],["Coincidences","9.3 /min"]].forEach(([n, v], i) => { const x = 70 + i*210; ee("rect", {x, y:174, width:200, height:64, rx:4, class:"cav"}); tx(x+10, 194, n, "pn"); tx(x+10, 226, v, "h1"); });
  const pane = (x, y, w, h, t) => { ee("rect", {x, y, width:w, height:h, rx:4, class:"cav"}); tx(x+10, y+18, t, "pn"); };
  pane(70, 248, 380, 196, "Count-rate history"); WR("M90 420H430M90 420V280"); WR("M90 380L130 372L170 384L210 368L250 378L290 400L330 394L370 404L410 398", "s");
  pane(460, 248, 260, 196, "Polar plot vs cos²θ"); WR("M480 424A160 160 0 0 1 640 264", "faint"); WR("M480 424V264M480 424H700"); WR("M480 284C560 290 620 340 650 424", "s");
  [[480,290],[530,302],[570,330],[610,370]].forEach(([x, y]) => ee("circle", {cx:x, cy:y, r:4, class:"jd"}));
  pane(70, 454, 380, 196, "Pulse height (Landau)"); [8,20,46,72,60,44,32,24,18,13,10,7,5,4,3].forEach((h, i) => ee("rect", {x:96 + i*22, y:630 - h*2, width:18, height:h*2, class:"bars"}));
  pane(460, 454, 260, 196, "Event display (illustrative)");
  { const g = ee("g", {transform:"rotate(-30 590 552)"}); ee("rect", {x:540, y:500, width:100, height:10, class:"slab2"}, g); ee("rect", {x:540, y:594, width:100, height:10, class:"slab2"}, g); }
  WR("M600 470L578 640", "mu"); WR("M560 476L548 640", "mu faint");
  ee("rect", {x:730, y:248, width:320, height:402, rx:4, class:"cav"}); tx(740, 266, "Run controls", "pn");
  ["Port  [COM3 ▾]","θ  [30]°    d  [15] cm","Absorber  [none ▾]","Threshold A  [120] mV","Threshold B  [118] mV","Temp. compensation  [on]"].forEach((t, i) => tx(745, 300 + i*30, t, "rv"));
  [["Start", 745], ["Stop", 835], ["Export", 925]].forEach(([t, x]) => { ee("rect", {x, y:500, width:80, height:30, rx:4, class:"ic"}); tx(x+40, 520, t, "rf", "middle"); });
  NOTE(1080, 110, 170, ["A QTimer every", "200 ms pulls new", "records from the", "logger queue and", "updates the plots."]);
  NOTE(1080, 230, 170, ["Event lines are", "drawn through a", "random point of", "each slab: one", "SiPM per slab has", "no position info."]);
}};
