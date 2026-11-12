
SHEETS.stand = {dwg:"COMET-MEC-01", title:"Mechanical stand · goniometer", sub:"Side and front views at θ = 0°, 1 px ≈ 1 mm. Dashed outline: the telescope tilted to 45°.", draw(){
  tx(60, 112, "SIDE VIEW (along the pivot axis)", "rf");
  const M = (x, y, w, h, c = "mech") => ee("rect", {x, y, width:w, height:h, rx:2, class:c});
  M(100, 640, 400, 20); M(292, 380, 16, 260);
  ee("path", {d:"M300 380L300 290A90 90 0 0 0 210 380Z", class:"mfill"});
  [0,15,30,45,60,75,90].forEach(a => { const r = a*Math.PI/180; ee("circle", {cx:300-78*Math.sin(r), cy:380-78*Math.cos(r), r:3, class:"cf"}); if (a % 30 === 0 || a === 45) tx(300-104*Math.sin(r), 384-104*Math.cos(r), a+"°", "pn", "middle"); });
  { const g = ee("g", {transform:"rotate(-45 311 380)", class:"ghost"}); M(306, 180, 10, 400, "gh"); M(330, 281, 130, 40, "gh"); M(330, 445, 130, 40, "gh"); }
  M(306, 180, 10, 400); for (let y = 190; y < 580; y += 10) WR(`M306 ${y}h${y % 50 === 0 ? 6 : 3}`);
  M(316, 288, 14, 26); M(316, 452, 14, 26);
  M(330, 281, 130, 40); M(338, 291, 114, 14, "slab2"); M(330, 445, 130, 40); M(338, 455, 114, 14, "slab2");
  M(345, 340, 100, 38, "hat2"); M(335, 378, 120, 8);
  M(440, 272, 16, 9, "cf");
  ee("circle", {cx:311, cy:380, r:10, class:"mech"}); ee("circle", {cx:311, cy:380, r:4, class:"cf"});
  DIM(100, 688, 500, 688, "400 mm"); DIM(540, 380, 540, 640, "300 mm", 34, 4); DIM(150, 180, 150, 580, "rail 400 mm", -10, -6);
  DIM(480, 305, 480, 455, "d = 150 mm", 52, 4);
  CALL(1, 120, 612, 160, 640); CALL(2, 262, 560, 292, 560); CALL(3, 236, 424, 304, 386); CALL(4, 345, 200, 316, 200);
  CALL(5, 345, 250, 323, 290); CALL(6, 510, 362, 455, 360); CALL(7, 196, 300, 246, 334); CALL(8, 480, 250, 450, 272);
  tx(620, 112, "FRONT VIEW", "rf");
  M(620, 640, 380, 20); M(722, 380, 16, 260); M(882, 380, 16, 260); M(805, 180, 10, 400, "gh");
  M(720, 376, 180, 8, "cf"); ee("circle", {cx:730, cy:380, r:9, class:"mech"}); ee("circle", {cx:890, cy:380, r:9, class:"mech"}); M(800, 365, 20, 30);
  M(750, 281, 120, 40); M(758, 291, 104, 14, "slab2"); M(750, 445, 120, 40); M(758, 455, 104, 14, "slab2");
  M(760, 340, 100, 38, "hat2"); M(755, 378, 110, 8);
  DIM(738, 610, 882, 610, "≥ 160 mm gap"); DIM(750, 258, 870, 258, "module ≈ 120 mm");
  NOTE(1030, 110, 230, ["1  Base: 2020 extrusion, 400 mm", "2  Upright fork: 2020, 300 mm", "3  Pivot: Ø8 shaft, 608 bearings", "4  Rail: 2020, 400 mm, mm scale", "5  Module clamp: PETG, M5 knob", "6  Absorber tray at the pivot", "7  Protractor: 15° holes, Ø4 pin", "8  ADXL345 tilt sensor (optional)"]);
  NOTE(1030, 290, 230, ["Move both clamps by the same", "amount when changing d, so the", "telescope stays balanced."]);
}};

SHEETS.absorber = {dwg:"COMET-MEC-02", title:"Absorber tray and run plan", sub:"Only the material changes between runs; angle, separation and thresholds stay fixed.", draw(){
  const M = (x, y, w, h, c = "mech") => ee("rect", {x, y, width:w, height:h, rx:2, class:c});
  M(200, 170, 240, 50); M(212, 183, 216, 24, "slab2"); tx(450, 200, "module A", "pn");
  M(220, 330, 200, 30, "hat2"); M(220, 360, 200, 30, "hat2"); M(220, 390, 200, 30, "hat2"); M(210, 420, 220, 10);
  M(200, 470, 240, 50); M(212, 483, 216, 24, "slab2"); tx(450, 500, "module B", "pn");
  WR("M300 120V560", "mu d"); tx(306, 132, "most muons pass", "pn");
  WR("M380 120V372", "mu d"); NC(380, 372); tx(388, 150, "low-energy muon stops", "pn");
  WR("M250 120L258 330L290 560", "mu d"); tx(160, 580, "scattered, misses B", "pn");
  DIM(170, 330, 170, 420, "t", -12, 4); DIM(470, 207, 470, 483, "d", 14, 4);
  NOTE(40, 610, 500, ["Keep d ≥ t + 30 mm so the stack fits between the modules.", "Choose d once for the whole series and do not change it."]);
  const cx = [630, 760, 880, 1000, 1120];
  ["Material","Density","Thickness","g/cm²","ΔE (MIP)"].forEach((h, i) => tx(cx[i], 130, h, "rf"));
  WR("M630 140H1240");
  [["Lead Pb","11.35","2.5 cm","28","≈ 32 MeV"],["Lead Pb","11.35","5 cm","57","≈ 64 MeV"],["Lead Pb","11.35","10 cm","114","≈ 127 MeV"],["Iron Fe","7.87","5 cm","39","≈ 57 MeV"],["Iron Fe","7.87","10 cm","79","≈ 114 MeV"],["Concrete","≈ 2.3","10 cm","23","≈ 40 MeV"]]
    .forEach((r, j) => { r.forEach((c, i) => tx(cx[i], 164 + j*26, c, "rv")); WR(`M630 ${172 + j*26}H1240`, "faint"); });
  tx(630, 352, "Mean muon energy ≈ 4 GeV, so even 10 cm of lead removes only a few percent.", "pn");
  tx(630, 420, "RUN PLAN (alternate empty and loaded)", "rf");
  ["E","Pb 2.5","E","Pb 5","E","Pb 10","E"].forEach((t, i) => { const x = 630 + i*88; BOX(x, 436, 70, 40, t, []); if (i < 6) ARW(`M${x+70} 456H${x+86}`); });
  tx(630, 500, "Each run ≈ 10 h, about 7,000 counts at 12 /min, for a 5 % effect at 3σ.", "pn");
  WR("M640 650H1000M640 650V540", ""); tx(640, 532, "R/R₀", "pn"); tx(1000, 666, "areal density (g/cm²)", "pn", "end");
  [[660,560,4],[720,566,5],[780,572,6],[900,588,7]].forEach(([x, y, e]) => { ee("circle", {cx:x, cy:y, r:4, class:"jd"}); WR(`M${x} ${y-e*2}V${y+e*2}`); });
  WR("M660 560C760 572 860 582 980 594", "d"); tx(860, 560, "expected trend (sketch)", "pn");
}};
