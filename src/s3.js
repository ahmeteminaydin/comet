
SHEETS.thr = {dwg:"COMET-ANA-03", title:"Threshold DAC", sub:"One quad DAC sets both thresholds and the bias trim. The threshold filters sit on the comparator sheet.", draw(){
  IC(480, 200, 180, 200, "U9", "MCP4728", {l:["VDD","SCL","SDA","LDAC̅"], r:["VOUTA","VOUTB","VOUTC","VOUTD"], b:["VSS"]}, "U9 · MCP4728 · quad 12-bit DAC with internal 2.048 V reference and EEPROM");
  WR("M466 240H440"); NET(436, 240, "+3V3", "end");
  const a = PIN(30, 280, "from MCU · I2C1 SCL", "mcu"); WR(`M${a} 280H466`); J(300, 280);
  const b = PIN(30, 320, "from MCU · I2C1 SDA", "mcu"); WR(`M${b} 320H466`); J(360, 320);
  R(300, 230, "v", "R15", "4.7 kΩ", "R15 · I²C pull-up on SCL, one per bus"); WR("M300 250V280"); PWR(300, 210, "+3V3");
  R(360, 230, "v", "R16", "4.7 kΩ", "R16 · I²C pull-up on SDA"); WR("M360 250V320"); PWR(360, 210, "+3V3");
  WR("M466 360H440V370"); GND(440, 370); GND(570, 414);
  WR("M674 240H1060", "s"); POUT(1060, 240, "to Comparator A threshold", "comp");
  WR("M674 280H1060", "s"); POUT(1060, 280, "to Comparator B threshold", "comp");
  WR("M674 320H700"); NC(704, 320); tx(716, 324, "spare", "pn");
  WR("M674 360H1060", "p"); POUT(1060, 360, "to Bias supply trim (R22)", "bias");
  PWR(800, 470, "+3V3"); WR("M800 470V480"); J(800, 476); C(800, 500, "v", "C18", "100 nF"); GND(800, 520);
  WR("M800 476H870V480"); C(870, 500, "v", "C19", "1 µF"); GND(870, 520); tx(790, 552, "decoupling at U9 VDD", "pn");
  NOTE(40, 450, 570, ["Internal reference 2.048 V, gain 1: 4096 steps of 0.5 mV.", "Code = (baseline + threshold) / 0.5 mV, e.g. (312.5 + 120) mV → 865.", "I²C address 0x60 by default. Settings can be stored in its EEPROM.", "LDAC̅ is tied low, so outputs update as soon as a write finishes."]);
  NOTE(40, 560, 570, ["VOUTD drives the bias trim resistor R22 on the bias supply sheet.", "The temperature loop rewrites VOUTD about once per second."]);
}};

SHEETS.peak = {dwg:"COMET-ANA-02", title:"Peak-hold · channel A (extra)", sub:"Holds the maximum of each shaped pulse for the ADC. Channel B is identical (U110 …).", draw(){
  const a = PIN(30, 300, "from AFE A shaper (U2)", "afe"); WR(`M${a} 300H286`, "s");
  OPA(330, 312, "U10", "OPA355", "U10 · OPA355 · charges C20 through D1 so the hold node follows the rising pulse");
  WR("M330 284V264"); PWR(330, 264, "+5V_A"); GND(330, 340);
  WR("M374 312H390", "s"); DI(410, 312, "r", "D1", "BAT54", "D1 · BAT54 Schottky · lets C20 charge up but not discharge back", true);
  WR("M430 312H716", "s"); J(470, 312); J(530, 312); J(590, 312);
  WR("M470 312V220H260V324H286");
  WR("M470 312V330"); C(470, 350, "v", "C20", "470 pF", "C20 · 470 pF C0G · hold capacitor"); GND(470, 370);
  WR("M530 312V330"); R(530, 350, "v", "R19", "43 kΩ", "R19 · 43 kΩ · bleed resistor, τ = R19·C20 ≈ 20 µs"); GND(530, 370);
  SWC(590, 341, "SW1", "TS5A3159", "SW1 · TS5A3159 analog switch (optional) · empties C20 after the ADC reading");
  GND(590, 370);
  WR("M598 350H660V470H1060", "d"); PRIN(1060, 470, "from MCU · PEAK_RST", "mcu");
  OPA(760, 324, "U11", "OPA355", "U11 · unity-gain buffer, feeds the ADC without draining C20");
  WR("M760 296V276"); PWR(760, 276, "+5V_A"); GND(760, 352);
  WR("M804 324H830V380H700V336H716"); J(830, 324); WR("M830 324H1060", "s");
  POUT(1060, 324, "to MCU · ADC peak A", "mcu");
  NOTE(40, 420, 520, ["U10 charges C20 through D1 while the input rises; D1 then", "blocks, so C20 keeps the peak. Feedback from the hold node", "(not from U10's output) removes the diode drop.", "R19 bleeds C20 with τ ≈ 20 µs, so old pulses are forgotten."]);
  NOTE(40, 530, 520, ["The MCU samples the held value 1 µs after the coincidence,", "always with the same delay, then pulses PEAK_RST (optional)."]);
  tx(840, 532, "input (shaped)", "pn"); tx(1080, 580, "held, τ ≈ 20 µs", "pn");
  DL("M840 640C870 640 880 560 900 560C930 560 960 640 1000 640H1220", "s");
  DL("M840 640C870 640 880 560 902 560C960 562 1080 575 1220 596");
  DL("M1000 540V650", "d"); tx(1004, 548, "ADC sample at 1 µs", "pn");
}};
