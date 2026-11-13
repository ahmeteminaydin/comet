
SHEETS.mcu = {dwg:"COMET-DAQ-01", title:"Microcontroller DAQ", sub:"STM32G431 pin functions. Physical pin numbers are assigned in STM32CubeMX.", draw(){
  const L7 = ["TIM2_CH1 ← COINC","TIM3_CH1 (ext. clock) ← SINGLES_A","TIM4_CH1 (ext. clock) ← SINGLES_B","ADC1 ← PEAK_A","ADC1 ← PEAK_B","ADC2 ← VBIAS_MON","ADC2 ← IBIAS_MON"];
  const R7 = ["LATCH_CLR → GPIO","PEAK_RST → GPIO","TEST_PULSE → GPIO","I2C1_SCL","I2C1_SDA","USB_DM (PA11)","USB_DP (PA12)"];
  const P = IC(450, 150, 380, 420, "U20", "STM32G431", {l:L7, r:R7, t:["VDD","VDDA"], b:["OSC_IN","OSC_OUT","NRST","SWDIO","SWCLK"]}, "U20 · STM32G431 · timers, ADC, I²C and USB device in one chip");
  [["from Coincidence · Q","coinc"],["from Stretcher A","stretch"],["from Stretcher B","stretch"],["from Peak-hold A","peak"],["from Peak-hold B","peak"],["from Bias · VBIAS_MON","bias"],["from Bias · IBIAS_MON","bias"]]
    .forEach(([t, go], i) => { const y = P[L7[i]][1], a = PIN(30, y, t, go); WR(`M${a} ${y}H436`, "s"); });
  [["to Coincidence · CLR̅","coinc"],["to Peak-hold · SW1","peak"],["to test-pulse caps","coinc"],["I²C SCL → DAC, sensors","thr"],["I²C SDA → DAC, sensors","thr"],["to USB-C · D−","usb"],["to USB-C · D+","usb"]]
    .forEach(([t, go], i) => { const y = P[R7[i]][1]; WR(`M844 ${y}H1060`, "s"); POUT(1060, y, t, go); });
  WR("M577 136V112"); PWR(577, 112, "+3V3"); WR("M703 136V112"); NET(703, 112, "+3V3 via ferrite", "middle");
  WR("M513 584V640"); WR("M577 584V640"); J(513, 620); J(577, 620); WR("M513 620H530"); WR("M560 620H577");
  { const g = grp("Y1 · 8 MHz crystal · load capacitors C46/C47 from the crystal datasheet");
    ee("path", {d:"M530 620h4M534 609v22M556 609v22M556 620h4", class:"cl"}, g); ee("rect", {x:538, y:612, width:14, height:16, class:"cb"}, g); tx(545, 602, "Y1 8 MHz", "rf", "middle", g); }
  C(513, 660, "v", "C46", "10 pF", "C46 · crystal load capacitor, value from the crystal datasheet"); GND(513, 680); C(577, 660, "v", "C47", "10 pF", "C47 · crystal load capacitor"); GND(577, 680);
  WR("M640 584V640"); C(640, 660, "v", "C48", "100 nF", "C48 · reset filter capacitor on NRST"); GND(640, 680);
  WR("M703 584V600H716"); NET(718, 600, "SWDIO"); WR("M767 584V600H780"); NET(782, 600, "SWCLK"); J(640, 600); WR("M640 600H652"); NET(654, 600, "NRST");
  IC(960, 556, 74, 106, "J5", "SWD 5-pin", {l:["3V3","SWDIO","SWCLK","NRST","GND"]}, "J5 · SWD programming header for ST-LINK; pins connect to the U20 pins of the same name", [997, 538]);
  WR("M946 574H930"); NET(926, 574, "+3V3", "end"); WR("M946 591H930"); NET(926, 591, "SWDIO", "end");
  WR("M946 609H930"); NET(926, 609, "SWCLK", "end"); WR("M946 627H930"); NET(926, 627, "NRST", "end"); WR("M946 644H934V650"); GND(934, 650);
  NOTE(40, 600, 450, ["TIM2 at 1 MHz: 32-bit µs timestamp, overflow count → 64-bit.", "TIM3/TIM4 clocked from their CH1 pins: hardware singles counters.", "ISR: capture → wait 1 µs → ADC peaks → clear latch → ring buffer.", "Main loop: EVT/STAT lines over USB CDC, temperature loop at 1 Hz."]);
  NOTE(860, 40, 400, ["Decoupling: 100 nF at every VDD pin + 4.7 µF bulk.", "VDDA through a ferrite bead with 1 µF.", "Unused inputs: pull-down, so they cannot count noise."]);
}};

SHEETS.usb = {dwg:"COMET-PWR-03", title:"USB-C power and data", sub:"One cable: 5 V in, event data out. Analog and digital supplies are split here.", draw(){
  IC(80, 220, 100, 180, "J6", "USB-C", {r:["VBUS","CC1","CC2","D+","D−"], b:["GND"]}, "J6 · USB-C receptacle, USB 2.0 data, device (sink) only", [115, 300]);
  GND(130, 414);
  WR("M194 250H210V140H240", "p"); FU(260, 140, "h", "F1", "500 mA PTC", "F1 · resettable fuse, protects the PC port");
  WR("M280 140H380", "p"); J(305, 140); J(335, 140); J(365, 140); WR("M305 140V160"); C(305, 180, "v", "C40", "10 µF", "C40 · keep ≤ 10 µF directly on VBUS (inrush limit)"); GND(305, 200);
  WR("M335 140V122"); NET(335, 122, "VBUS_F", "middle");
  FB(400, 140, "h", "FB4", "BLM18", "FB4 · ferrite bead: separates the analog 5 V rail from VBUS noise");
  WR("M420 140H1060", "p"); J(460, 140); WR("M460 140V160"); C(460, 180, "v", "C41", "10 µF"); GND(460, 200);
  POUT(1060, 140, "+5V_A → bias supply", "bias");
  WR("M365 140V237H546", "p");
  IC(560, 210, 120, 80, "U40", "AP2112K-3.3", {l:["VIN","EN"], r:["VOUT"], b:["GND"]}, "U40 · AP2112K-3.3 · low-noise 600 mA LDO for the digital 3.3 V rail");
  WR("M546 263H520V237"); J(520, 237); GND(620, 304);
  WR("M694 250H1060", "p"); J(740, 250); WR("M740 250V270"); C(740, 290, "v", "C44", "1 µF"); GND(740, 310);
  POUT(1060, 250, "+3V3 → MCU, logic, DAC", "mcu");
  J(820, 250); WR("M820 250V330H840"); FB(860, 330, "h", "FB5", "BLM18", "FB5 · ferrite bead: a quieter +3V3_A branch for the op-amps, away from the MCU's switching noise");
  WR("M880 330H1060", "p"); J(920, 330); C(920, 350, "v", "C45", "10 µF", "C45 · 10 µF · bulk decoupling of the analog rail"); GND(920, 370);
  POUT(1060, 330, "+3V3_A → op-amps", "afe");
  WR("M194 280H320V290"); R(320, 310, "v", "R40", "5.1 kΩ", "R40 · CC1 pull-down: tells a USB-C source to switch on 5 V"); GND(320, 330);
  WR("M194 310H245V320"); R(245, 340, "v", "R41", "5.1 kΩ", "R41 · CC2 pull-down (the cable can be plugged either way)"); GND(245, 360);
  WR("M194 340H222V440H1060", "s"); WR("M194 370H210V470H1060", "s");
  POUT(1060, 440, "to MCU · USB_DP (PA12)", "mcu"); POUT(1060, 470, "to MCU · USB_DM (PA11)", "mcu");
  IC(440, 520, 120, 70, "U41", "USBLC6-2SC6", {t:["I/O1","I/O2"], l:["VBUS"], b:["GND"]}, "U41 · USBLC6-2SC6 · clamps ESD spikes on D+ and D−");
  WR("M480 506V440"); J(480, 440); WR("M520 506V470"); J(520, 470); WR("M426 555H400"); NET(396, 555, "VBUS_F", "end"); GND(500, 604);
  NOTE(640, 520, 430, ["R40/R41 (5.1 kΩ on CC1/CC2) make a USB-C source", "switch on 5 V. The receptacle has two D+ pins (A6, B6) and", "two D− pins (A7, B7): join each pair so either plug", "orientation works. U41 clamps ESD spikes on D+/D−."]);
  NOTE(40, 630, 450, ["Budget: 8 × OPA356 ≈ 66 mA, MCU ≈ 35 mA, comparators + logic", "≈ 10 mA, bias ≈ 5 mA → ≈ 120 mA ≈ 0.6 W (limit 3.5 W).", "U40 then dissipates ≈ 0.2 W. Everything behind FB4 is more than", "the 10 µF USB inrush limit; add a soft-start load switch if a host trips."]);
}};
