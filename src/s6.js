
SHEETS.temp = {dwg:"COMET-PWR-02", title:"Temperature compensation loop", sub:"Closed loop: measure temperature, compute the bias, set the DAC, read the bias back. Boxes link to their sheets.", draw(){
  BOX(60, 140, 220, 90, "SiPM A + SiPM B", ["Vbr rises ≈ 21.5 mV/°C", "with temperature"], "sipm");
  BOX(60, 330, 220, 90, "TMP117 ×2 on carriers", ["0x48 (A), 0x49 (B)", "±0.1 °C over I²C"], "sipm");
  ARW("M170 230V326", "d"); tx(180, 282, "heat (same carrier)", "pn");
  BOX(400, 280, 420, 200, "MCU firmware · every 1 s", ["1  T = (T_A + T_B) / 2", "2  Vset = Vbr(T₀) + k·(T − T₀) + Vov", "3  code = (Vset − a) / b   (calibration, b > 0)", "4  limit the change to ≤ 10 mV per step", "5  write code → MCP4728 channel D", "6  read VBIAS_MON, correct if |error| > 5 mV", "7  log T and Vbias in every EVT/STAT line"], "mcu");
  ARW("M280 375H396"); tx(290, 366, "I²C read", "pn");
  BOX(940, 300, 260, 80, "MCP4728 · VOUTD", ["0–2.048 V in 0.5 mV steps"], "thr");
  ARW("M820 340H936"); tx(830, 331, "I²C write", "pn");
  BOX(940, 140, 260, 90, "Bias supply (LT3482)", ["VOUT2 = 34.1 × V_CTRL", "SiPM = VOUT2 − monitor drop"], "bias");
  ARW("M1070 300V234"); tx(1080, 270, "CTRL = VOUTD / 2", "pn");
  ARW("M940 185H284", "p"); tx(610, 176, "VBIAS (filtered, per-channel RC)", "pn", "middle");
  ARW("M980 230V258H760V276"); tx(770, 252, "ADC: VBIAS_MON = Vbias / 22.4", "pn");
  NOTE(60, 520, 520, ["Example: k = 21.5 mV/°C, Vbr(21 °C) = 24.45 V, Vov = 2.5 V.", "At 30 °C: Vset = 24.45 + 0.0215 × 9 + 2.5 = 27.14 V.", "Without compensation the overvoltage would fall to 2.31 V,", "which is about 8 % less gain."]);
  NOTE(640, 520, 460, ["Calibrate once: set about 5 DAC codes, measure the SiPM", "bias with a multimeter, fit Vbias = a + b·code (b ≈ 8.5 mV).", "Step 6 also removes the current monitor's voltage drop.", "Commands COMP 1 / COMP 0 switch the loop on and off."]);
}};

SHEETS.muon = {dwg:"COMET-PHY-01", title:"Cosmic muons: the input signal", sub:"Where the muons come from, why the rate depends on θ, and how one muon becomes a voltage pulse.", draw(){
  ee("rect", {x:40, y:90, width:520, height:110, class:"sky"}); tx(50, 110, "upper atmosphere · ≈ 15 km", "pn");
  ARW("M300 96V150", "s"); tx(310, 130, "primary proton", "pn");
  [[200,560],[250,560],[350,560],[400,560],[150,520],[450,520]].forEach(([x, y]) => WR(`M300 150L${x} ${y}`, "faint"));
  [[240,600],[300,600],[370,600]].forEach(([x, y]) => WR(`M300 150L${x} ${y}`, "mu"));
  tx(380, 300, "secondary shower", "pn"); tx(316, 470, "muons", "pn");
  ee("rect", {x:40, y:600, width:520, height:18, class:"hat2"}); WR("M40 600H560");
  WR("M480 600V200", "d"); WR("M480 600L272 240", "d");
  tx(486, 420, "h", "rf"); tx(330, 390, "L = h / cos θ", "rf");
  ee("path", {d:"M480 540A60 60 0 0 0 450 548", class:"dw s"}); tx(452, 530, "θ", "rf");
  { const g = ee("g", {transform:"rotate(-30 480 575)"}); ee("rect", {x:455, y:552, width:50, height:7, class:"cf2"}, g); ee("rect", {x:455, y:584, width:50, height:7, class:"cf2"}, g); }
  const rows = [["Muon crosses 1 cm of plastic","≈ 2 MeV deposited"],["× ≈ 10,000 photons per MeV","≈ 20,000 photons"],["× light collection ≈ 2 %","≈ 400 photons at the SiPM"],["× detection efficiency ≈ 35 %","≈ 140 photoelectrons"],["× gain 3 × 10⁶ × 1.6 × 10⁻¹⁹ C","≈ 67 pC of charge"],["SiPM 3.4 nF into 50 Ω","≈ 14 mV at TP1, ≈ 220 ns decay"]];
  rows.forEach(([f, r], i) => { const y = 96 + i*80; BOX(640, y, 300, 50, f, []); tx(960, y+30, r, "rf"); if (i < rows.length - 1) ARW(`M790 ${y+50}V${y+76}`); });
  tx(640, 612, "θ       0°    30°   45°   60°   90°", "rv"); tx(640, 632, "cos²θ  1.00  0.75  0.50  0.25  0.00", "rv");
  NOTE(40, 640, 520, ["Sea level: ≈ 1 muon per cm² per minute, mean energy ≈ 4 GeV.", "I(θ) ≈ I₀ cos²θ with I₀ ≈ 70 m⁻² s⁻¹ sr⁻¹ (E > 1 GeV)."]);
}};
