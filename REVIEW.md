# COMET design review (2026-11-13)

Every detail sheet and every simulation was checked against the datasheets and run part by part: each editable value was multiplied and divided by 3 to find parts the simulation ignored, and every part variant was also run in desktop ngspice to find edits that stall the solver. Errors are fixed in the drawings, models, simulations and guides; considerations are open points to settle on the bench or in firmware.

## Errors found and fixed (18)

### Analog front-end: The LMH6629 could not hold a 0.3 V baseline

On a single supply the LMH6629's output only gets to within about 0.8 V of its rails, so it could not sit at the 0.3 V baseline and the muon pulses were clipped. An ngspice run of the old circuit confirmed it.

**Fix:** U1 and U2 are now OPA356 op-amps (200 MHz, unity-gain stable, output within 0.1 V of the rails). The OPA355 that was drawn elsewhere had its enable pin left out; the OPA356 is the same op-amp without that pin.

### Analog front-end: Op-amps on 5 V could overdrive 3.3 V inputs

The AFE and peak-hold op-amps ran from 5 V, so a large pulse could drive TP2 above the supply of the 3.3 V comparator and the peak-hold output above the STM32 ADC's 3.3 V limit.

**Fix:** All op-amps run from +3V3_A, a ferrite-filtered branch of the 3.3 V regulator.

### Analog front-end: Baseline taken from the USB voltage

The 0.3 V baseline was divided from VBUS, which may be anywhere from about 4.75 to 5.25 V, so the baseline and every threshold moved with the USB supply.

**Fix:** R2 (10 kΩ) and R3 (1 kΩ) divide the regulated +3V3_A: VB = 0.300 V.

### Analog front-end: Shaper referenced to ground

The CR-RC shaper returned to ground, so its output idled at the op-amp's lower limit, lost the undershoot and gave only about 60 mV for a typical muon.

**Fix:** R7 returns to VB and U2 amplifies by 6.1 (R27, R28, C9 for unity DC gain): about 0.36 V for a typical muon, idling at 0.300 V.

### Pulse stretcher: The 74LVC1G123 cannot make 50 ns

TI specifies 170–200 ns for the smallest timing parts (Cext = 28 pF, Rext = 2 kΩ at 3.3 V), and Rext must be at least 1 kΩ, so the coincidence window would have grown far past the 100 ns limit.

**Fix:** The flip-flop one-shot (74LVC1G74 + R14/RV2/C13 + 74LVC1G14 Schmitt inverter) is now the circuit. Simulated width 51 ns, trimmable with RV2.

### Pulse stretcher: Floating PRE̅ on the flip-flop

U5's active-low preset input was not drawn. Left floating it can set the flip-flop at random.

**Fix:** PRE̅ and D are tied to +3V3.

### Comparator: TLV3501 SHDN pin not drawn

The comparator switches off when SHDN is near V+. A floating SHDN could disable it at random.

**Fix:** SHDN is tied to ground, and the comparator model now has the SHDN input.

### Bias supply: LT3482 drawn with the wrong pins

The converter was drawn without its CTRL, FSET, MONIN, APD, VOUT1 and PUMP pins, with an external diode that the LT3482 already contains, without a resistor on MON, and with the SiPMs supplied around the current monitor instead of through it.

**Fix:** Redrawn from the datasheet pinout and typical application: doubler capacitors C28, C21 and C29, VOUT2 into MONIN, SiPMs from the APD pin, R35 on MON, SHDN and FSET to +5V_A.

### Bias supply: Bias trim through the feedback pin

The DAC injected current into FB through a resistor. That gave only about ±1 V of range, too little to cover the current monitor's voltage drop, and with the DAC at 0 V after power-up the output went to the top of its range.

**Fix:** The DAC now drives the LT3482 CTRL pin through R22/R36: VOUT2 = 34.1 × V_CTRL. DAC code 0, the factory power-up value, keeps the SiPMs unbiased.

### Bias supply: Converter too lightly loaded

With microamp loads a boost converter skips pulses, which moves its ripple from 1.1 MHz down to kHz frequencies where the filter is much weaker.

**Fix:** R20/R21 (150 kΩ / 4.53 kΩ) draw about 0.2 mA so the converter keeps switching steadily; the AC simulation shows the filter at 10 kHz too.

### Peak-hold: Peak-hold reset fought the op-amp

PEAK_RST shorted C20 directly. U10 then drove its full output current through D1 into the switch and saturated, and when the switch opened it dumped extra charge into C20: the simulated ADC reading after a reset was 0.78 V instead of the 0.30 V baseline.

**Fix:** R18 (100 Ω) in series with SW1. C20 now drops to the baseline within about 50 ns while U10 supplies only about 3 mA, and the reading after a reset is 0.300 V.

### Coincidence logic: Self-test pulse was a fast spike

The test pulse was a 3.3 V edge through a small capacitor: a few-nanosecond spike far larger and faster than a muon pulse.

**Fix:** 18 pF in series with 12 kΩ per channel (C14/R33, C15/R34) injects about 59 pC with a 216 ns decay, about 14 mV at TP1 like a real muon. Hold TEST_PULSE high for at least 1 µs, because its falling edge injects an equal negative pulse.

### Microcontroller DAQ: Control lines undefined during reset

After a reset every MCU pin is an input, so LATCH_CLR, TEST_PULSE and PEAK_RST floated until the firmware configured them.

**Fix:** R37 (10 kΩ pull-up) keeps the latch armed, R38 and R39 (100 kΩ pull-downs) keep the test pulse and the peak-hold switch off.

### Microcontroller DAQ: Duplicate reference designators

C41 appeared twice.

**Fix:** The MCU decoupling capacitors are now C46, C47 and C48, and every sheet was checked for duplicates.

### USB-C power and data: Only one D+ and one D− pin used on USB-C

A USB-C receptacle has two D+ pins (A6, B6) and two D− pins (A7, B7), one of each per plug orientation. With only one of each connected, the board would enumerate in one orientation only.

**Fix:** The sheet and the guide now say to join each pair at the connector.

### USB-C power and data: Power budget left out the op-amps

The estimate of about 100 mA counted two AFE op-amps. The design has eight: per channel an amplifier, a shaper and two peak-hold op-amps, 8.3 mA each.

**Fix:** New estimate about 120 mA, 0.6 W, still well under the 3.5 W limit.

### Threshold DAC: Power-up state of the DAC not considered

The MCP4728 starts from codes in its EEPROM, which are 0 from the factory: thresholds at 0 V (comparators permanently on) and, with the CTRL scheme, bias off.

**Fix:** Documented on the sheets and in the guides; the firmware writes the thresholds at start-up and then ramps the bias up. Keep 0 stored for VOUTD.

### Threshold DAC: Wrong photoelectron numbers in the guides

The guides said one photoelectron is about 5 mV at the AFE output and that 120 mV is about 25 photoelectrons, and that single photons show up as a few millivolts on a 50 Ω scope input.

**Fix:** Simulation of the current design: 1.6 mV per photoelectron at TP2, so 120 mV is about 75 photoelectrons, about half of a typical 0.23 V muon pulse; at 50 Ω one photoelectron is only about 0.1 mV. All guides now describe the current design.

## Simulation problems fixed (8)

### Bias supply: Bias simulation ignored the divider resistors

The converter was a fixed 27 V source, so changing R20, R21 or R22 changed nothing and the sheet showed a pass for any values.

**Fix:** An ideal LT3482 model now regulates FB to CTRL (or to 1.235 V above 1.5 V), drops the monitor voltage and mirrors 20 % of the current to MON. The bias follows R20, R21, R22 and R36.

### Bias supply: Readbacks and channel B were not checked

VBIAS_MON (R25/R26), IBIAS_MON (R35) and channel B's filter (R24/C25) were in the netlist but no result depended on them.

**Fix:** Added the ADC-pin voltages with range targets, the readings the firmware would compute, the DC bias at SiPM B and the ripple at both SiPMs (time-averaged so ripple does not bias them).

### Coincidence logic: Channel B self-test path not checked

C15/R34 were simulated but no result used them.

**Fix:** The test pulse is now measured at both AFE inputs.

### Analog front-end: Op-amp model swung rail to rail

The op-amp model reached both rails, which hid the LMH6629's output-swing problem.

**Fix:** The model now has an output-swing limit, an input common-mode limit and input bias current, set from each datasheet.

### Comparator: Comparator model had no hysteresis

Without the TLV3501's built-in 6 mV, the simulation could not show what R10/R11 add, and the dark-count pulses were placed where they could never re-trigger the comparator anyway.

**Fix:** The model has 6 mV of internal hysteresis and SHDN. Two dark pulses now land just after the falling edge, the worst case: about 8 photoelectrons are needed to re-trigger with the internal hysteresis alone, more than 10 with R10/R11.

### Pulse stretcher: Monostable model gave ideal widths

The 74LVC1G123 model produced whatever width its formula gave, including widths the real part cannot make.

**Fix:** The stretcher is simulated gate by gate (flip-flop, RC, Schmitt inverter); the monostable model is kept only for reference and marked as not used.

### Analog front-end: Some edits froze the simulator

Changing R2, R3 or R9 on the AFE sheet made ngspice take minutes or hang: the ideal coax line set a breakpoint at every echo of its own rounding noise. In the browser this froze the page.

**Fix:** The 30 cm coax is now five LC sections (same 1.5 ns, 50 Ω). ngspice also runs in a Web Worker with a 30 s limit, so a run that never finishes is stopped instead of freezing the page. All 129 part variants now finish in well under a second in desktop ngspice.

### Whole system: Decoupling and pull resistors silently ignored

Supply decoupling capacitors, I²C pull-ups and reset-state pull resistors had no effect in the simulations, but nothing said so.

**Fix:** These parts are marked as not simulated, with the reason, and cannot be edited in the panel. Every other editable part changes at least one result when it is tripled or divided by 3, except C1, C2, C6 and C9, which only set DC levels and very low corner frequencies; the AFE sheet note says so.

## Open considerations (8)

### Bias supply: Monitor drop is not well specified

The datasheet gives a typical MONIN-to-APD drop of about 5 V at 1 mA, but not at the microamps the SiPMs draw.

**To do:** Regulate on VBIAS_MON, which is measured after the monitor, and measure the drop on the first board.

### Bias supply: Limit the bias DAC code in firmware

Code 4095 would give 34.9 V at VOUT2, well past the SiPMs' 5 V overvoltage limit.

**To do:** Store a maximum code with the calibration and refuse anything above it.

### Threshold DAC: Threshold, efficiency and accidentals

120 mV is about half of a typical muon pulse, but the light yield of 140 photoelectrons is an estimate. A threshold too high loses muons; one too low raises the singles rate and the accidentals, which grow with R_A × R_B.

**To do:** Choose the operating point from the threshold scan and check the accidental rate at the chosen singles rates.

### Peak-hold: Peak-detector stability

U10 drives a 470 pF capacitor through D1 with feedback taken from the capacitor, a loop that can ring with a real op-amp. The behavioural model does not show this.

**To do:** Check on the bench; if it rings, add 47–100 Ω in series with D1 or a small capacitor from U10's output to its − input.

### Peak-hold: Peak-hold input range

The OPA356's inputs work up to 1.8 V on a 3.3 V supply, so shaped pulses more than about 1.4 V above the baseline clip. Only the far end of the Landau tail is affected.

**To do:** Treat the top histogram bin as overflow; reduce R27 if more range is needed.

### USB-C power and data: LDO heat and inrush

The AP2112K drops 1.7 V at about 110 mA, about 0.2 W in a SOT-23-5. The rails behind VBUS also hold more than the 10 µF USB inrush limit.

**To do:** Give the LDO copper area. If a host trips at plug-in, add a soft-start load switch after the fuse.

### Microcontroller DAQ: Singles counter pins

The singles counters use TIM3 and TIM4 clocked from their CH1 pins (external clock mode 1). The ETR inputs work as well where CubeMX shows them free on the chosen package.

**To do:** Fix the pins in STM32CubeMX before the baseboard layout.

### Whole system: Simulator fallback without workers

If a browser blocks Web Workers, the simulator falls back to running on the page itself, where a run that never finishes cannot be stopped.

**To do:** Use a current desktop browser; the downloads give the same circuits for LTspice or desktop ngspice.
