# SPICE files for each circuit sheet

Generated from the COMET system schematic, so they always match the drawings on the site.

| Folder | Sheet | What the simulation shows |
|---|---|---|
| `sipm/` | SiPM carrier PCB | Muon pulse from the SiPM model through the coax into 50 Ω; bias droop |
| `bias/` | Bias supply | Bias set by the DAC through the LT3482 CTRL pin, monitor readbacks, ripple at both SiPMs (transient) and the filter response (AC) |
| `afe/` | Analog front-end | SiPM pulse → amplifier (TP2) → shaper |
| `peak/` | Peak-hold | Hold accuracy, reset through R18, linearity |
| `thr/` | Threshold DAC | DAC codes → thresholds at the comparator pins |
| `comp/` | Comparator | Threshold crossing, delay, dark pulses on the falling tail (re-trigger margin) |
| `stretch/` | Pulse stretcher | Flip-flop one-shot (74LVC1G74, RC delay, 74LVC1G14) set to 50 ns |
| `coinc/` | Coincidence logic | AND + latch, LATCH_CLR, self-test pulse into both channels, window |

Each folder has:

- `COMET_<SHEET>_LTspice.zip`: extract **all** files into one folder, then open the `.asc` in LTspice.
- `COMET_<SHEET>.cir`: a self-contained netlist (models included) for ngspice or LTspice.

The models are simplified behavioural stand-ins (see the top of `comet_models.lib`).
