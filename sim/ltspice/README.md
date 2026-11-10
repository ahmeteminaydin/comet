# COMET AFE, channel A: LTspice schematic

Same circuit and values as detail sheet COMET-ANA-01 (with the R9 fix).

## Open it
1. Install LTspice (free, from analog.com).
2. Keep all four files in the same folder:
   `COMET_AFE_A.asc`, `comet_opamp.asy`, `comet_cmp.asy`, `comet_models.lib`.
3. Open `COMET_AFE_A.asc` and press **Run**.
4. Click a wire to plot its voltage (`tp1`, `tp2`, `tp3`). Right-click a part to change its value.
   The `.meas` results (baseline, peak at TP2, comparator pulse length) are in **View → SPICE Error Log**.

Expected: TP1 about 39 mV, TP2 peak about 1.04 V (0.73 V above the 0.31 V baseline), TP3 high for about 163 ns.

## What is modelled
- **I1**: one muon on the SiPM, 67 pC with 1.5 ns rise and 80 ns decay (`EXP` source).
- **U1** (`COMET_OPAMP`): behavioural op-amp, gain 10,000, about 1 GHz bandwidth, 0 to 5 V output. Stand-in for the LMH6629.
- **U3** (`COMET_CMP`): behavioural comparator with a 3.3 V output. Stand-in for the TLV3501.
- Decoupling (C3, C4) and the CR-RC shaper are not included.

## Using the real op-amp
Download the LMH6629 PSpice model from ti.com, add it with `.lib LMH6629.lib`, and replace U1 with a
symbol whose pin order matches the model's `.subckt` line.
