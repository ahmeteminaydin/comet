# COMET System Schematic

Interactive system schematic for **COMET** (Compact Photonics-Enabled Cosmic Muon Detector), the BAATCH team's METU EE493–494 senior design project.

**Live site:** https://ahmeteminaydin.github.io/comet/

- One sheet shows the whole detector: muon, scintillator modules, SiPMs, bias supply and temperature compensation, analog front-end, comparators, pulse stretchers, coincidence logic, microcontroller, USB link, PC logger and GUI.
- Click any block to zoom into its detail sheet (component-level schematic or drawing) and open its build guide.
- The eight circuit sheets run **SPICE in the browser** (ngspice compiled to WebAssembly). Click a part value on the sheet to change it, then press Run simulation.
- Each circuit sheet has a downloadable **LTspice schematic** and **ngspice netlist** in [`sim/`](sim/), generated from the same drawing as the site.

## Layout

| Path | Contents |
|---|---|
| `index.html` | The site (built from `src/`) |
| `sim/` | LTspice schematics and netlists per circuit sheet |
| `vendor/` | The ngspice WebAssembly engine (MIT / BSD-3-Clause) |
| `src/` | Page sources; `python3 src/build.py` rebuilds `index.html` |
| `tools/` | Scripts that export `sim/` and check the LTspice files against the site netlists |

Signals, count rates and waveforms on the page are simulated. Part numbers and component values are a proposed baseline design, not a final bill of materials.
