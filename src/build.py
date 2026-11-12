#!/usr/bin/env python3
"""Assemble the COMET page: comet.html (Claude artifact) and index.html (GitHub Pages)."""
import json, os, sys
D = os.path.dirname(os.path.abspath(__file__))
rd = lambda f: open(os.path.join(D, f), encoding="utf-8").read()
lib = rd("comet_models.lib")
open(os.path.join(D, "spice_models.js"), "w", encoding="utf-8").write("\n/* ---------- SPICE model library (generated from comet_models.lib) ---------- */\nconst MODELS_LIB = " + json.dumps(lib) + ";\n")
order = ["g0.js","g1.js","g2.js","g3.js","g4.js","g5.js","g6.js","g7.js","g8.js","g9.js","p6.js","p7.js","p8.js","dl.js",
         "s1.js","s2.js","s3.js","s4.js","s5.js","s6.js","s7.js","s8.js","spice_models.js","spice_cfg.js","spice_net.js"]
for opt in ["spice_asc.js", "spice_ui.js", "spice_pre.js"]:
    if os.path.exists(os.path.join(D, opt)): order.append(opt)
order += ["p10.js", "p9.js"]
js = "".join(rd(f) for f in order)
open(os.path.join(D, "all.js"), "w", encoding="utf-8").write(js)
p1, p2 = rd("p1.html"), rd("p2.html")
open(os.path.join(D, "comet.html"), "w", encoding="utf-8").write(p1 + p2 + "<script>\n" + js + "\n</script>\n")
fav = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%2316202a'/%3E%3Crect x='6' y='8' width='20' height='5' rx='1' fill='%23a191ff'/%3E%3Crect x='6' y='19' width='20' height='5' rx='1' fill='%23a191ff'/%3E%3Cpath d='M14 3L18 29' stroke='%23ff5c9d' stroke-width='2.4'/%3E%3C/svg%3E"
head = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="description" content="Interactive system schematic of COMET, a compact SiPM cosmic muon detector: signal chain, detail sheets, in-browser SPICE simulation and build guides. BAATCH, METU EE493-494.">\n'
        f'<link rel="icon" href="{fav}">\n'
        '<style>\n:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}\n'
        'body{margin:0;font:14px system-ui,-apple-system,"Segoe UI",sans-serif}\nimg{max-width:100%}\n[hidden]{display:none!important}\n</style>\n')
open(os.path.join(D, "..", "index.html") if os.path.exists(os.path.join(D, "..", "vendor")) else os.path.join(D, "index.html"), "w", encoding="utf-8").write(head + p1 + "\n</head>\n<body>\n" + p2 + "\n<script>\n" + js + "\n</script>\n</body>\n</html>\n")
print("built", len(js), "bytes of JS")
