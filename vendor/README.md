# Vendored simulator

`eecircuit-engine-1.9.0.js` is the unmodified `dist/eecircuit-engine.mjs` from the
[eecircuit-engine](https://github.com/eelab-dev/EEcircuit-engine) npm package, version 1.9.0
(MIT licence, see `LICENSE-eecircuit-engine.txt`). It is ngspice compiled to WebAssembly,
with the WebAssembly embedded in the file. It is renamed to `.js` so GitHub Pages serves it
with a JavaScript content type.

ngspice itself is distributed under the BSD-3-Clause ("modified BSD") licence:
https://ngspice.sourceforge.io

The page loads this file only when someone presses **Run simulation** (about 6 MB compressed).
