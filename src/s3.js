
SHEETS.thr = {dwg:"COMET-ANA-03", title:"Threshold DAC", sub:"One quad DAC sets both thresholds and the bias (through the LT3482 CTRL pin). The threshold filters sit on the comparator sheet.", draw(){
  IC(480, 200, 180, 200, "U9", "MCP4728", {l:["VDD","SCL","SDA","LDAC̅"], r:["VOUTA","VOUTB","VOUTC","VOUTD"], b:["VSS"]}, "U9 · MCP4728 · quad 12-bit DAC with internal 2.048 V reference and EEPROM");
  WR("M466 240H448V224"); PWR(448, 224, "+3V3");
  const a = PIN(30, 280, "from MCU · I2C1 SCL", "mcu"); WR(`M${a} 280H466`); J(300, 280);
  const b = PIN(30, 320, "from MCU · I2C1 SDA", "mcu"); WR(`M${b} 320H466`); J(360, 320);
  R(300, 230, "v", "R15", "4.7 kΩ", "R15 · I²C pull-up on SCL, one per bus"); WR("M300 250V280"); PWR(300, 210, "+3V3");
  R(360, 230, "v", "R16", "4.7 kΩ", "R16 · I²C pull-up on SDA"); WR("M360 250V320"); PWR(360, 210, "+3V3");
  WR("M466 360H440V370"); GND(440, 370); GND(570, 414);
  WR("M674 240H1060", "s"); POUT(1060, 240, "to Comparator A threshold", "comp");
  WR("M674 280H1060", "s"); POUT(1060, 280, "to Comparator B threshold", "comp");
  WR("M674 320H700"); NC(704, 320); tx(716, 324, "spare", "pn");
  WR("M674 360H1060", "p"); POUT(1060, 360, "to Bias CTRL divider (R22)", "bias");
  PWR(800, 470, "+3V3"); WR("M800 470V480"); J(800, 476); C(800, 500, "v", "C18", "100 nF"); GND(800, 520);
  WR("M800 476H870V480"); C(870, 500, "v", "C19", "1 µF"); GND(870, 520); tx(790, 552, "decoupling at U9 VDD", "pn");
  NOTE(40, 450, 570, ["Internal reference 2.048 V (±2 %), gain 1: 4096 steps of 0.5 mV.", "Code = (baseline + threshold) / 0.5 mV, e.g. (300 + 120) mV → 840.", "I²C address 0x60 by default. LDAC̅ is tied low, so outputs", "update as soon as a write finishes."]);
  NOTE(40, 560, 570, ["VOUTD sets the bias: R22/R36 halve it onto the LT3482 CTRL pin.", "Factory EEPROM codes are 0, so after power-up the thresholds sit at 0 V", "and the bias is off until the firmware writes them. Thresholds may be", "stored in the EEPROM, but keep VOUTD's stored code at 0 (bias off).", "The temperature loop rewrites VOUTD once per second."]);
}};

SHEETS.peak = {dwg:"COMET-ANA-02", title:"Peak-hold · channel A (extra)", sub:"Holds the maximum of each shaped pulse for the ADC. Channel B is identical (U110 …).", draw(){
  const a = PIN(30, 300, "from AFE A shaper (U2)", "afe"); WR(`M${a} 300H286`, "s");
  OPA(330, 312, "U10", "OPA356", "U10 · OPA356 · charges C20 through D1 so the hold node follows the rising pulse; on +3V3_A so nothing here can exceed the ADC's 3.3 V");
  WR("M330 284V264"); PWR(330, 264, "+3V3_A"); GND(330, 340);
  WR("M374 312H390", "s"); DI(410, 312, "r", "D1", "BAT54", "D1 · BAT54 Schottky · lets C20 charge up but not discharge back", true);
  WR("M430 312H716", "s"); J(470, 312); J(530, 312); J(590, 312);
  WR("M470 312V220H260V324H286");
  WR("M470 312V330"); C(470, 350, "v", "C20", "470 pF", "C20 · 470 pF C0G · hold capacitor"); GND(470, 370);
  WR("M530 312V330"); R(530, 350, "v", "R19", "43 kΩ", "R19 · 43 kΩ · bleed resistor, τ = R19·C20 ≈ 20 µs"); GND(530, 370);
  SWC(590, 341, "SW1", "TS5A3159", "SW1 · TS5A3159 analog switch (optional) · empties C20 through R18 after the ADC reading; power its V+ pin (not drawn) from +3V3 so the 3.3 V PEAK_RST line can drive it");
  WR("M590 370V380"); R(590, 400, "v", "R18", "100 Ω", "R18 · 100 Ω · limits the reset current: while PEAK_RST is high, U10 holds C20 at the input level and sources only ≈ 3 mA, so it never saturates and nothing overshoots when SW1 opens");
  GND(590, 420);
  WR("M598 350H660V470H1060", "d"); PRIN(1060, 470, "from MCU · PEAK_RST", "mcu");
  J(960, 470); WR("M960 470V480"); R(960, 500, "v", "R39", "100 kΩ", "R39 · 100 kΩ pull-down · keeps SW1 open while the MCU is in reset"); GND(960, 520);
  OPA(760, 324, "U11", "OPA356", "U11 · OPA356 unity-gain buffer, feeds the ADC without draining C20");
  WR("M760 296V276"); PWR(760, 276, "+3V3_A"); GND(760, 352);
  WR("M804 324H830V380H700V336H716"); J(830, 324); WR("M830 324H1060", "s");
  POUT(1060, 324, "to MCU · ADC peak A", "mcu");
  NOTE(40, 420, 520, ["U10 charges C20 through D1 while the input rises; D1 then", "blocks, so C20 keeps the peak. Feedback from the hold node", "(not from U10's output) removes the diode drop.", "R19 bleeds C20 with τ ≈ 20 µs, so old pulses are forgotten."]);
  NOTE(40, 530, 560, ["The MCU samples the held value 1 µs after the coincidence,", "always with the same delay, then raises PEAK_RST for ≥ 200 ns.", "SW1 drains C20 through R18 until U10 takes over at the 0.300 V", "baseline, so the ADC reads the baseline between events.", "Calibrate pulse height = a + b · reading."]);
  tx(840, 532, "input (shaped)", "pn"); tx(1080, 580, "held, τ ≈ 20 µs", "pn");
  DL("M840 640C870 640 880 560 900 560C930 560 960 640 1000 640H1220", "s");
  DL("M840 640C870 640 880 560 902 560C960 562 1080 575 1220 596");
  DL("M1000 540V650", "d"); tx(1004, 548, "ADC sample at 1 µs", "pn");
}};
