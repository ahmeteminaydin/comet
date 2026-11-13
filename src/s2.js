
SHEETS.stretch = {dwg:"COMET-DIG-02", title:"Pulse stretcher · channel A", sub:"Turns every comparator edge into a fixed 50 ns pulse with a flip-flop and an RC delay. Channel B is identical (U105, U106 …).", draw(){
  const a = PIN(30, 300, "from Comparator A (TP3)", "comp"); WR(`M${a} 300H386`, "s");
  IC(400, 210, 120, 120, "U5", "74LVC1G74", {l:["PRE̅","D","CLK"], r:["Q"], b:["CLR̅"]}, "U5 · 74LVC1G74 · D flip-flop: the comparator edge sets Q high, the delayed copy of Q clears it again", [460, 262]);
  WR("M386 270H360V240H386"); PWR(360, 240, "+3V3");
  WR("M534 270H1060", "s"); J(600, 270); TP(700, 270, "TP4"); J(1000, 270);
  POUT(1060, 270, "to Coincidence AND (A)", "coinc");
  WR("M1000 270V420H1060", "s"); POUT(1060, 420, "to MCU · singles A", "mcu");
  WR("M600 270V400H620"); R(640, 400, "h", "R14", "1.2 kΩ", "R14 · 1.2 kΩ · fixed part of the delay resistor");
  WR("M660 400H680"); R(700, 400, "h", "RV2", "600 Ω", "RV2 · 1 kΩ trimmer, set to about 600 Ω; adjust until TP4 is 50 ns wide");
  ee("path", {d:"M688 412L714 386", class:"dw ar", "marker-end":"url(#dar)"});
  WR("M720 400H766"); J(740, 400); WR("M740 400V410"); C(740, 430, "v", "C13", "33 pF C0G", "C13 · 33 pF C0G · delay capacitor; C0G keeps the width stable with temperature");
  GND(740, 450);
  INV(800, 400, "U6", "74LVC1G14", "U6 · Schmitt-trigger inverter: once C13 charges past its 1.75 V threshold it pulls CLR̅ low and ends the pulse");
  WR("M834 400H870V480H460V344");
  NOTE(40, 420, 400, ["The comparator edge clocks U5: Q goes high (TP4).", "C13 charges through R14 + RV2; when it passes U6's", "threshold, U6 clears U5 and the pulse ends.", "Width ≈ 0.76 · (R14 + RV2) · C13 + about 7 ns of gate", "delays ≈ 50 ns. Trim RV2 for 50 ns at TP4."]);
  NOTE(40, 540, 480, ["Why not a 74LVC1G123 one-shot? TI specifies 170–200 ns", "for Cext = 28 pF, Rext = 2 kΩ at 3.3 V, and Rext must be", "at least 1 kΩ, so it cannot make 50 ns pulses. The window", "would grow past the 100 ns limit in the brief."]);
  NOTE(600, 520, 280, ["After the pulse, C13 discharges and", "U6 releases CLR̅ about 35 ns later:", "edges in that gap are ignored."]);
}};

SHEETS.coinc = {dwg:"COMET-DIG-03", title:"Coincidence logic", sub:"AND of the two stretched pulses, latched for the microcontroller, plus the self-test pulse path.", draw(){
  const a = PIN(30, 220, "from Stretcher A (TP4)", "stretch"); WR(`M${a} 220H400V288H436`, "s");
  const b = PIN(30, 380, "from Stretcher B (TP4)", "stretch"); WR(`M${b} 380H410V312H436`, "s");
  AND(480, 300, "U7", "74LVC1G08", "U7 · 74LVC1G08 · output high only while both 50 ns pulses overlap");
  WR("M518 300H560V333H586", "s"); TP(540, 300, "TP5");
  IC(600, 240, 140, 140, "U8", "74LVC1G74", {l:["D","CLK"], r:["Q","Q̅"], t:["PRE̅","VCC"], b:["CLR̅","GND"]}, "U8 · 74LVC1G74 · D flip-flop used as a latch: the AND edge sets Q, the MCU clears it");
  WR("M586 287H570V262"); NET(570, 262, "+3V3", "middle");
  WR("M647 226V206"); NET(647, 206, "+3V3", "middle"); WR("M693 226V206"); PWR(693, 206, "+3V3");
  WR("M754 287H1060", "s"); POUT(1060, 287, "to MCU · TIM2 capture", "mcu");
  WR("M754 333H770"); NC(774, 333);
  WR("M647 394V440H1060"); PRIN(1060, 440, "from MCU · LATCH_CLR", "mcu"); GND(693, 394);
  J(800, 440); WR("M800 440V420"); R(800, 400, "v", "R37", "10 kΩ", "R37 · 10 kΩ pull-up · keeps CLR̅ high (latch armed) while the MCU pin is still an input after reset");
  PWR(800, 380, "+3V3");
  NOTE(40, 440, 520, ["The AND output is high only while both 50 ns pulses", "overlap, which means |t_A − t_B| < 50 ns (100 ns window).", "U8 holds the result; the MCU reads the TIM2 capture", "and pulses LATCH_CLR, which re-arms the latch."]);
  const t = PIN(30, 640, "from MCU · TEST_PULSE", "mcu"); WR(`M${t} 640H260`); J(260, 640); J(230, 640);
  WR("M230 640V712"); R(250, 712, "h", "R38", "100 kΩ", "R38 · 100 kΩ pull-down · keeps TEST_PULSE low while the MCU is in reset");
  WR("M270 712H284"); GND(284, 712);
  WR("M260 640V600H300"); C(320, 600, "h", "C14", "18 pF", "C14 · 18 pF · with R33 makes a muon-like test pulse: 3.3 V × 18 pF ≈ 59 pC, decaying with τ = 216 ns");
  WR("M340 600H360"); R(380, 600, "h", "R33", "12 kΩ", "R33 · 12 kΩ · limits the test current to 0.28 mA, so the pulse looks like a muon (≈ 14 mV at TP1) instead of a fast spike");
  WR("M400 600H420"); NET(426, 600, "→ AFE A input (at R1)");
  WR("M260 640V680H300"); C(320, 680, "h", "C15", "18 pF", "C15 · 18 pF · test pulse for channel B");
  WR("M340 680H360"); R(380, 680, "h", "R34", "12 kΩ", "R34 · 12 kΩ · test pulse for channel B");
  WR("M400 680H420"); NET(426, 680, "→ AFE B input (at R101)");
  tx(840, 470, "TIMING (4 px per ns)", "pn");
  DIM(900, 482, 1100, 482, "50 ns");
  [["A", 510, "M860 510H900V490H1100V510H1220"], ["B", 550, "M860 550H948V530H1148V550H1220"], ["AND", 590, "M860 590H948V570H1100V590H1220"], ["Q", 630, "M860 630H948V610H1220"]]
    .forEach(([n, y, d]) => { tx(850, y-4, n, "pn", "end"); DL(d, "s"); });
  tx(952, 568, "Δt = 12 ns", "pn"); tx(1000, 606, "held until LATCH_CLR", "pn");
}};
