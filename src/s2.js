
SHEETS.stretch = {dwg:"COMET-DIG-02", title:"Pulse stretcher · channel A", sub:"Turns every comparator edge into a fixed 50 ns pulse. Channel B is identical (U104 …).", draw(){
  const P = IC(430, 230, 180, 140, "U4", "74LVC1G123", {l:["A̅","B","CLR̅"], r:["Q","Q̅"], t:["VCC","Cext","Rext/Cext"], b:["GND"]}, "U4 · 74LVC1G123 · monostable: a rising edge on B (with A̅ low) starts one pulse of fixed width", [520, 300]);
  const a = PIN(30, 300, "from Comparator A (TP3)", "comp"); WR(`M${a} 300H416`, "s");
  WR("M416 265H380V275"); GND(380, 275);
  WR("M416 335H370"); NET(366, 335, "+3V3", "end");
  WR("M475 216V196"); PWR(475, 196, "+3V3");
  C(542, 176, "h", "C12", "22 pF C0G", "C12 · timing capacitor Cext, C0G for stability; value from the datasheet tw graph");
  WR("M520 216V176H522"); WR("M562 176H565V216"); J(565, 196); WR("M565 196H640V176");
  R(640, 156, "v", "RV1", "1 kΩ (of 2 kΩ)", "RV1 · 2 kΩ trimmer, set to about 1 kΩ; adjust until TP4 is 50 ns wide"); ee("path", {d:"M628 170L652 142", class:"dw ar", "marker-end":"url(#dar)"});
  R(640, 116, "v", "R13", "1.2 kΩ", "R13 · fixed part of Rext"); PWR(640, 96, "+3V3");
  GND(520, 384);
  WR("M624 277H1060", "s"); J(700, 277); TP(770, 277, "TP4");
  POUT(1060, 277, "to Coincidence AND (A)", "coinc");
  WR("M700 277V420H1060", "s"); POUT(1060, 420, "to MCU · singles A", "mcu");
  WR("M624 323H640"); NC(644, 323);
  NOTE(40, 395, 370, ["Pulse width tw ≈ K · Rext · Cext (K and limits", "from the datasheet; K ≈ 1 in the model). Trim RV1", "until TP4 is 50 ns wide. Use a C0G capacitor."]);
  tx(40, 500, "FALLBACK · FLIP-FLOP + RC DELAY ONE-SHOT", "rf");
  IC(200, 530, 100, 90, "U5", "74LVC1G74", {l:["D","CLK"], r:["Q"], b:["CLR̅"]}, "U5 · 74LVC1G74 · D flip-flop: the comparator edge sets Q, the delayed copy clears it", [250, 575]);
  WR("M186 560H160"); NET(156, 560, "+3V3", "end"); WR("M186 590H160"); NET(156, 590, "from comparator", "end");
  WR("M314 575H560", "s"); J(360, 575); NET(566, 575, "pulse out → AND and MCU");
  WR("M360 575V650H380"); R(400, 650, "h", "R14", "1.8 kΩ", "R14 · sets the delay, and so the pulse width, with C13"); J(440, 650);
  WR("M420 650H466"); WR("M440 650V660"); C(440, 680, "v", "C13", "33 pF C0G"); GND(440, 700);
  INV(500, 650, "U6", "74LVC1G14", "U6 · Schmitt-trigger inverter: clears U5 once the RC voltage crosses its threshold");
  WR("M534 650H570V732H250V634");
  NOTE(620, 600, 260, ["Width ≈ 0.76·R14·C13 + about 7 ns of", "gate delays. Trim it by changing R14."]);
}};

SHEETS.coinc = {dwg:"COMET-DIG-03", title:"Coincidence logic", sub:"AND of the two stretched pulses, latched for the microcontroller, plus the self-test pulse path.", draw(){
  const a = PIN(30, 220, "from Stretcher A (TP4)", "stretch"); WR(`M${a} 220H400V288H436`, "s");
  const b = PIN(30, 380, "from Stretcher B (TP4)", "stretch"); WR(`M${b} 380H410V312H436`, "s");
  AND(480, 300, "U7", "74LVC1G08", "U7 · 74LVC1G08 · output high only while both 50 ns pulses overlap");
  WR("M518 300H560V333H586", "s"); TP(540, 300, "TP5");
  IC(600, 240, 140, 140, "U8", "74LVC1G74", {l:["D","CLK"], r:["Q","Q̅"], t:["PRE̅","VCC"], b:["CLR̅","GND"]}, "U8 · 74LVC1G74 · D flip-flop used as a latch: the AND edge sets Q, the MCU clears it");
  WR("M586 287H566"); NET(562, 287, "+3V3", "end");
  WR("M647 226V206"); NET(647, 206, "+3V3", "middle"); WR("M693 226V206"); PWR(693, 206, "+3V3");
  WR("M754 287H1060", "s"); POUT(1060, 287, "to MCU · TIM2 capture", "mcu");
  WR("M754 333H770"); NC(774, 333);
  WR("M647 394V440H1060"); PRIN(1060, 440, "from MCU · LATCH_CLR", "mcu"); GND(693, 394);
  NOTE(40, 440, 520, ["The AND output is high only while both 50 ns pulses", "overlap, which means |t_A − t_B| < 50 ns (100 ns window).", "U8 holds the result; the MCU reads the TIM2 capture", "and pulses LATCH_CLR, which re-arms the latch."]);
  const t = PIN(30, 640, "from MCU · TEST_PULSE", "mcu"); WR(`M${t} 640H260`); J(260, 640);
  WR("M260 640V600H300"); C(320, 600, "h", "C14", "15 pF", "C14 · 15 pF · a 3.3 V edge injects about 50 pC, similar to a muon"); WR("M340 600H380"); NET(386, 600, "→ AFE A input (at R1)");
  WR("M260 640V680H300"); C(320, 680, "h", "C15", "15 pF"); WR("M340 680H380"); NET(386, 680, "→ AFE B input (at R101)");
  tx(840, 470, "TIMING (4 px per ns)", "pn");
  DIM(900, 482, 1100, 482, "50 ns");
  [["A", 510, "M860 510H900V490H1100V510H1220"], ["B", 550, "M860 550H948V530H1148V550H1220"], ["AND", 590, "M860 590H948V570H1100V590H1220"], ["Q", 630, "M860 630H948V610H1220"]]
    .forEach(([n, y, d]) => { tx(850, y-4, n, "pn", "end"); DL(d, "s"); });
  tx(952, 568, "Δt = 12 ns", "pn"); tx(1000, 606, "held until LATCH_CLR", "pn");
}};
