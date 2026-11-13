
/* ---------- SPICE: in-browser simulation panel ---------- */
const SPS = {id:null, ana:{}, res:{}, sweep:{}, stale:{}, eng:null, loading:null, queue:Promise.resolve(), busy:false};
const ENGINE_VER = "1.9.0";
const SITE = "https://ahmeteminaydin.github.io/comet/";
const onSite = () => /github\.io$/.test(location.hostname) || location.protocol === "file:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const spBase = () => onSite() ? "" : SITE;
function engineUrls(){
  const local = new URL(`vendor/eecircuit-engine-${ENGINE_VER}.js`, location.href).href;
  return onSite() ? [local] : [local, `https://cdn.jsdelivr.net/npm/eecircuit-engine@${ENGINE_VER}/dist/eecircuit-engine.mjs`, `https://unpkg.com/eecircuit-engine@${ENGINE_VER}/dist/eecircuit-engine.mjs`];
}
/* ngspice runs in a Web Worker when the browser allows it, so a run that never finishes (an edited
   value can make the solver crawl) is stopped after SIM_TIMEOUT instead of freezing the page.
   If workers are blocked, it falls back to the page thread, where a stuck run cannot be stopped. */
const SIM_TIMEOUT = 30000, SIM_LOAD_TIMEOUT = 120000;
const SIM_WORKER_SRC = `let sim = null;
self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (!sim){
      let last = null;
      for (const u of m.urls){ try { const mod = await import(u); const s = new mod.Simulation(); await s.start(); sim = s; break; } catch(err){ last = err; } }
      if (!sim) throw last || new Error("simulator not available");
    }
    if (m.text == null){ self.postMessage({id: m.id, ok: true}); return; }
    sim.setNetList(m.text);
    const r = await sim.runSim();
    self.postMessage({id: m.id, ok: true, r, err: sim.getError ? sim.getError() : []});
  } catch(err){ self.postMessage({id: m.id, ok: false, msg: String(err && err.message || err)}); }
};`;
function spKillWorker(err){
  const w = SPS.worker; SPS.worker = null; if (w) w.terminate();
  if (SPS.eng && SPS.eng.worker){ SPS.eng = null; SPS.loading = null; }
  Object.values(SPS.pend || {}).forEach(p => { clearTimeout(p.timer); p.rej(err); }); SPS.pend = {};
}
function spAsk(text, ms){
  return new Promise((res, rej) => {
    const w = SPS.worker; if (!w){ rej(new Error("no simulator worker")); return; }
    const id = SPS.seq = (SPS.seq || 0) + 1;
    const timer = setTimeout(() => spKillWorker(Object.assign(new Error(text == null ? "the simulator took too long to load" :
      `the run did not finish within ${Math.round(ms/1000)} s, so it was stopped. The changed values probably make the solver take tiny time steps; undo the last change or press Reset values`), {timeout: true})), ms);
    SPS.pend[id] = {res, rej, timer};
    w.postMessage({id, urls: engineUrls(), text});
  });
}
async function spLoadWorker(){
  if (SPS.noWorker || typeof Worker === "undefined") return false;
  try {
    const w = new Worker(URL.createObjectURL(new Blob([SIM_WORKER_SRC], {type: "text/javascript"})), {type: "module"});
    SPS.worker = w; SPS.pend = {};
    w.onmessage = e => { const m = e.data, p = SPS.pend[m.id]; if (!p) return; delete SPS.pend[m.id]; clearTimeout(p.timer); m.ok ? p.res(m) : p.rej(new Error(m.msg)); };
    w.onerror = e => { e.preventDefault(); spKillWorker(new Error("the simulator worker stopped" + (e.message ? ": " + e.message : ""))); };
    await spAsk(null, SIM_LOAD_TIMEOUT);
    return true;
  } catch(e){ spKillWorker(e); SPS.noWorker = true; return false; }
}
async function spiceEngine(){
  if (SPS.eng) return SPS.eng;
  if (!SPS.loading) SPS.loading = (async () => {
    if (await spLoadWorker()){ SPS.eng = {worker: true}; return SPS.eng; }
    let last;
    for (const u of engineUrls()){
      try { const m = await import(u); const sim = new m.Simulation(); await sim.start(); SPS.eng = sim; return sim; }
      catch(e){ last = e; }
    }
    SPS.loading = null; throw last || new Error("simulator not available");
  })();
  return SPS.loading;
}
function spiceRun(text, ms = SIM_TIMEOUT){
  const job = SPS.queue.then(async () => {
    const sim = await spiceEngine();
    if (sim.worker){ const m = await spAsk(text, ms); return {r: m.r, err: m.err || []}; }
    sim.setNetList(text); const r = await sim.runSim(); return {r, err: sim.getError ? sim.getError() : []};
  });
  SPS.queue = job.catch(() => {});
  return job;
}
function spParse(r, b){                              // engine result -> {probe: {t, v}} in SI units
  const names = r.data.map(d => d.name.toLowerCase());
  const xi = names.findIndex(n => n === "time" || n === "frequency");
  const x = r.data[xi].values.map(v => typeof v === "number" ? v : v.real);
  const D = {};
  b.probes.forEach(p => {
    if (!p.net) return;
    if (p.net === "0"){ D[p.name] = {t:x, v:x.map(() => 0)}; return; }
    const i = names.indexOf(`v(${p.net})`) >= 0 ? names.indexOf(`v(${p.net})`) : names.indexOf(p.net);
    if (i < 0) return;
    let v = r.data[i].values;
    if (r.dataType === "complex") v = v.map(c => 20*Math.log10(Math.hypot(c.real, c.img) || 1e-30));
    else v = Array.from(v);
    if (p.rel) { const v0 = v[0]; v = v.map(y => y - v0); }
    D[p.name] = {t:x, v};
  });
  return D;
}

/* ---- plotting ---- */
const PALETTE = ["--c-ana", "--c-mu", "--c-dig", "--c-dat", "--c-opt", "--c-pwr"];
function niceStep(range, n){ const raw = range/Math.max(1, n), p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw/p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10)*p; }
function tUnit(tmax){ return tmax < 2e-6 ? [1e9, "ns"] : tmax < 2e-3 ? [1e6, "µs"] : [1e3, "ms"]; }
function fmtTick(v, step){ const dp = Math.max(0, Math.min(4, -Math.floor(Math.log10(step) + 1e-9))); return (Math.abs(v) < step/1e6 ? 0 : v).toFixed(dp); }
function decimate(t, v, x0, x1, px){
  if (t.length <= px*2) return t.map((tt, i) => [tt, v[i]]);
  const out = [], bw = (x1 - x0)/px; let b = -1, lo = null, hi = null;
  for (let i = 0; i < t.length; i++){
    const k = Math.floor((t[i] - x0)/bw);
    if (k !== b){ if (lo){ if (lo[0] < hi[0]) out.push(lo, hi); else out.push(hi, lo); } b = k; lo = hi = [t[i], v[i]]; }
    else { if (v[i] < lo[1]) lo = [t[i], v[i]]; if (v[i] > hi[1]) hi = [t[i], v[i]]; }
  }
  if (lo){ if (lo[0] < hi[0]) out.push(lo, hi); else out.push(hi, lo); }
  return out;
}
function spDrawPlots(el, D, plots, opt = {}){
  SPS.last = () => spDrawPlots(el, D, plots, opt);
  const W = Math.max(340, Math.round(el.clientWidth) || 1000), PH = 168, L = 70, Rm = 18, T = 30, B = 30, ac = plots.some(p => p.ac);
  const any = Object.values(D)[0]; if (!any){ el.innerHTML = `<p class="sp-empty">No data.</p>`; return; }
  const xs = any.t, x0 = ac ? Math.log10(xs[0]) : xs[0], x1 = ac ? Math.log10(xs[xs.length - 1]) : xs[xs.length - 1];
  const [tk, tu] = ac ? [1, "Hz"] : tUnit(x1);
  const X = x => L + ((ac ? Math.log10(x) : x) - x0)/((x1 - x0) || 1)*(W - L - Rm);
  let h = `<svg viewBox="0 0 ${W} ${plots.length*PH + 8}" class="sp-svg" role="img" aria-label="Simulation waveforms">`;
  const meta = [];
  plots.forEach((pl, pi) => {
    const y0p = pi*PH, k = pl.k || 1, ser = pl.probes.filter(n => D[n]);
    let lo = Infinity, hi = -Infinity;
    ser.forEach(n => D[n].v.forEach(v => { const y = v*k; if (y < lo) lo = y; if (y > hi) hi = y; }));
    (pl.lines || []).forEach(l => { if (l.y != null){ lo = Math.min(lo, l.y*k); hi = Math.max(hi, l.y*k); } });
    if (!isFinite(lo)){ lo = 0; hi = 1; }
    if (hi - lo < 1e-12){ const c = hi; lo = c - (Math.abs(c)*0.05 || 1); hi = c + (Math.abs(c)*0.05 || 1); }
    const pad = (hi - lo)*0.08; lo -= pad; hi += pad;
    const ya = y0p + T, yb = y0p + PH - B, Y = y => yb - (y - lo)/(hi - lo)*(yb - ya);
    const st = niceStep(hi - lo, 4);
    h += `<text class="sp-pt" x="${L}" y="${y0p + 18}">${esc(pl.title)}</text>`;
    let lx = W - Rm;
    if (W < 640) h += `<text class="sp-lt" x="${L}" y="${y0p + 30}">${ser.map(n => esc(n)).join(" · ")}</text>`;
    else ser.slice().reverse().forEach((n, j) => { const ci = ser.length - 1 - j, w = n.length*6.6 + 26; lx -= w;
      h += `<line x1="${lx}" y1="${y0p + 14}" x2="${lx + 16}" y2="${y0p + 14}" style="stroke:var(${PALETTE[ci % PALETTE.length]})" class="sp-lg"/><text class="sp-lt" x="${lx + 21}" y="${y0p + 18}">${esc(n)}</text>`; });
    for (let v = Math.ceil(lo/st)*st; v <= hi + 1e-12; v += st){ const y = Y(v);
      h += `<line class="sp-grid" x1="${L}" x2="${W - Rm}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/><text class="sp-ax" x="${L - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end">${fmtTick(v, st)}</text>`; }
    h += `<text class="sp-ax" x="${L - 6}" y="${(ya - 6).toFixed(1)}" text-anchor="end">${esc(pl.unit || "")}</text>`;
    if (ac){ for (let e = Math.ceil(x0); e <= Math.floor(x1); e++){ const x = X(Math.pow(10, e));
        h += `<line class="sp-grid" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${ya}" y2="${yb}"/>`;
        h += `<text class="sp-ax" x="${x.toFixed(1)}" y="${yb + 15}" text-anchor="middle">${["1","10","100"][((e % 3) + 3) % 3]}${["", "k", "M", "G"][Math.floor(e/3)] || ""}${e % 3 === 0 ? "" : ""}</text>`; } }
    else { const tst = niceStep((x1 - x0)*tk, 6);
      for (let v = Math.ceil(x0*tk/tst)*tst; v <= x1*tk + 1e-9; v += tst){ const x = X(v/tk);
        h += `<line class="sp-grid" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${ya}" y2="${yb}"/><text class="sp-ax" x="${x.toFixed(1)}" y="${yb + 15}" text-anchor="middle">${fmtTick(v, tst)}</text>`; } }
    h += `<text class="sp-ax" x="${W - Rm}" y="${yb + 27}" text-anchor="end">${ac ? "frequency (Hz)" : "time (" + tu + ")"}</text>`;
    h += `<rect class="sp-frame" x="${L}" y="${ya}" width="${W - L - Rm}" height="${yb - ya}"/>`;
    (pl.lines || []).forEach(l => {
      if (l.y != null){ const y = Y(l.y*k); h += `<line class="sp-ref" x1="${L}" x2="${W - Rm}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/><text class="sp-ax" x="${W - Rm - 4}" y="${(y - 4).toFixed(1)}" text-anchor="end">${esc(l.label)}</text>`; }
      if (l.x != null){ const x = X(l.x); h += `<line class="sp-ref" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${ya}" y2="${yb}"/><text class="sp-ax" x="${(x + 4).toFixed(1)}" y="${ya + 12}">${esc(l.label)}</text>`; }
    });
    ser.forEach((n, ci) => {
      const pts = decimate(D[n].t, D[n].v, xs[0], xs[xs.length - 1], 700);
      h += `<polyline class="sp-tr" style="stroke:var(${PALETTE[ci % PALETTE.length]})" points="${pts.map(([t, v]) => X(t).toFixed(1) + "," + Y(v*k).toFixed(1)).join(" ")}"/>`;
    });
    meta.push({ya, yb, Y, k, ser, unit:pl.unit || ""});
  });
  h += `<g class="sp-cur" visibility="hidden"><line class="sp-cl" y1="0" y2="${plots.length*PH}"/></g><rect class="sp-hit" x="${L}" y="0" width="${W - L - Rm}" height="${plots.length*PH}"/></svg>`;
  el.innerHTML = h;
  const svg = el.querySelector("svg"), cur = svg.querySelector(".sp-cur"), cl = cur.querySelector("line");
  const move = e => {
    const r = svg.getBoundingClientRect(), sx = (e.clientX - r.left)/r.width*W;
    if (sx < L || sx > W - Rm){ cur.setAttribute("visibility", "hidden"); return; }
    const xv = x0 + (sx - L)/(W - L - Rm)*(x1 - x0), t = ac ? Math.pow(10, xv) : xv;
    cl.setAttribute("x1", sx); cl.setAttribute("x2", sx);
    cur.querySelectorAll("g").forEach(g => g.remove());
    const right = sx > W*0.68;
    meta.forEach(m => {
      const g = document.createElementNS(NS, "g"); let line = 0;
      m.ser.forEach((n, ci) => { const v = MS.at(D[n], t)*m.k; if (!isFinite(v)) return;
        const c = document.createElementNS(NS, "circle"); c.setAttribute("cx", sx); c.setAttribute("cy", m.Y(v)); c.setAttribute("r", 3.5); c.setAttribute("class", "sp-dot"); c.style.fill = `var(${PALETTE[ci % PALETTE.length]})`; g.appendChild(c);
        const tx = document.createElementNS(NS, "text"); tx.setAttribute("x", right ? sx - 8 : sx + 8); tx.setAttribute("y", m.ya + 14 + line*14); tx.setAttribute("class", "sp-rd"); if (right) tx.setAttribute("text-anchor", "end");
        tx.textContent = `${+v.toPrecision(4)} ${m.unit}`; tx.style.fill = `var(${PALETTE[ci % PALETTE.length]})`; g.appendChild(tx); line++; });
      const tt = document.createElementNS(NS, "text"); tt.setAttribute("x", right ? sx - 8 : sx + 8); tt.setAttribute("y", m.yb - 6); tt.setAttribute("class", "sp-rd sp-rdt"); if (right) tt.setAttribute("text-anchor", "end");
      tt.textContent = ac ? engText(t, "Hz") : `${+(t*tk).toPrecision(4)} ${tu}`; g.appendChild(tt);
      cur.appendChild(g);
    });
    cur.setAttribute("visibility", "visible");
  };
  svg.addEventListener("pointermove", move); svg.addEventListener("pointerleave", () => cur.setAttribute("visibility", "hidden"));
}
function spDrawSweep(el, sw, pts){
  SPS.last = () => spDrawSweep(el, sw, pts);
  const W = Math.max(340, Math.round(el.clientWidth) || 1000), H = 320, L = 70, Rm = 18, T = 30, B = 40;
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]).filter(isFinite);
  let xlo = Math.min(...xs), xhi = Math.max(...xs), ylo = Math.min(0, ...ys), yhi = Math.max(...ys, sw.ideal ? xhi : 0);
  if (yhi - ylo < 1e-12) yhi = ylo + 1; const pad = (yhi - ylo)*0.08; ylo -= pad; yhi += pad;
  const X = x => L + (x - xlo)/((xhi - xlo) || 1)*(W - L - Rm), Y = y => H - B - (y - ylo)/(yhi - ylo)*(H - B - T);
  let h = `<svg viewBox="0 0 ${W} ${H}" class="sp-svg" role="img" aria-label="${esc(sw.label)}"><text class="sp-pt" x="${L}" y="18">${esc(sw.label)}: ${esc(sw.ylabel)} against ${esc(sw.xlabel)}</text>`;
  const ys2 = niceStep(yhi - ylo, 5), xs2 = niceStep(xhi - xlo, 8);
  for (let v = Math.ceil(ylo/ys2)*ys2; v <= yhi + 1e-12; v += ys2) h += `<line class="sp-grid" x1="${L}" x2="${W - Rm}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="sp-ax" x="${L - 6}" y="${(Y(v) + 3.5).toFixed(1)}" text-anchor="end">${fmtTick(v, ys2)}</text>`;
  for (let v = Math.ceil(xlo/xs2)*xs2; v <= xhi + 1e-12; v += xs2) h += `<line class="sp-grid" x1="${X(v).toFixed(1)}" x2="${X(v).toFixed(1)}" y1="${T}" y2="${H - B}"/><text class="sp-ax" x="${X(v).toFixed(1)}" y="${H - B + 15}" text-anchor="middle">${fmtTick(v, xs2)}</text>`;
  h += `<text class="sp-ax" x="${W - Rm}" y="${H - 8}" text-anchor="end">${esc(sw.xlabel)}</text><rect class="sp-frame" x="${L}" y="${T}" width="${W - L - Rm}" height="${H - B - T}"/>`;
  if (sw.ideal) h += `<line class="sp-ref" x1="${X(xlo)}" y1="${Y(xlo)}" x2="${X(xhi)}" y2="${Y(xhi)}"/><text class="sp-ax" x="${X(xhi) - 6}" y="${Y(xhi) + 16}" text-anchor="end">ideal (held = input)</text>`;
  const ok = pts.filter(p => isFinite(p[1]));
  h += `<polyline class="sp-tr" style="stroke:var(--c-mu)" points="${ok.map(p => X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1)).join(" ")}"/>`;
  ok.forEach(p => h += `<circle class="sp-dot" style="fill:var(--c-mu)" cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="4"><title>${p[0]} → ${+p[1].toPrecision(4)}</title></circle>`);
  el.innerHTML = h + "</svg>";
}

/* ---- panel ---- */
const sp$ = s => document.getElementById(s);
function spStatus(t, kind){ const e = sp$("sp-status"); e.textContent = t; e.className = "sp-status" + (kind ? " " + kind : ""); }
function spKey(id){ return JSON.stringify([SPS.ana[id] || 0, SIMV[id] && SIMV[id].vals, SIMP[id]]); }
function spIsDefault(id){ const V = SIMV[id], P = SIMP[id]; return Object.keys(V.vals).every(r => V.vals[r] === V.def[r]) && (SIMCFG[id].params || []).every(p => P[p.k] === p.def); }
function spiceShow(id){
  const has = id && SIMCFG[id];
  sp$("spice").hidden = !has; sp$("sp-none").hidden = !(id && !has); sp$("d-sim").hidden = !has;
  spClosePop();
  SPS.id = has ? id : null;
  if (!has) return;
  const cfg = SIMCFG[id]; spiceValues(id); spiceParams(id);
  sp$("sp-title").textContent = `Simulate: ${SHEETS[id].title}`;
  const up = id.toUpperCase(), base = spBase();
  const zip = sp$("sp-zip"), cir = sp$("sp-cir");
  zip.href = `${base}sim/${id}/COMET_${up}_LTspice.zip`; cir.href = `${base}sim/${id}/COMET_${up}.cir`;
  [zip, cir].forEach(a => { if (base){ a.target = "_blank"; a.rel = "noopener"; a.removeAttribute("download"); } else { a.removeAttribute("target"); a.setAttribute("download", ""); } });
  sp$("sp-note").textContent = cfg.note || "";
  spRenderTabs(); spRenderParams(); spShowNetlist(); spChanged();
  const k = spKey(id), r = SPS.res[id + ":" + (SPS.ana[id] || 0)];
  if (r && r.key === k) spRender(r);
  else if (SPS.eng) spRunCurrent();
  else if (spIsDefault(id) && typeof SPICE_PRE !== "undefined" && SPICE_PRE[id] && SPICE_PRE[id][cfg.analyses[SPS.ana[id] || 0].id]){
    const pre = SPICE_PRE[id][cfg.analyses[SPS.ana[id] || 0].id], D = {};
    Object.entries(pre.v).forEach(([n, v]) => D[n] = {t:pre.t, v});
    spRender({D, P:{...SIMP[id]}, pre:true});
    spStatus("Showing results computed with the design values. Press Run simulation to simulate in your browser (the first run loads a 6 MB simulator).");
  } else { sp$("sp-plot").innerHTML = `<p class="sp-empty">Press Run simulation. The first run loads the ngspice simulator (about 6 MB); after that each run takes well under a second.</p>`; sp$("sp-res").innerHTML = ""; spStatus(""); }
}
function spRenderTabs(){
  const id = SPS.id, cfg = SIMCFG[id], ai = SPS.ana[id] || 0;
  let h = cfg.analyses.length > 1 ? cfg.analyses.map((a, i) => `<button type="button" role="tab" class="sp-tab" aria-selected="${i === ai}" data-ana="${i}">${esc(a.label)}</button>`).join("") : `<span class="sp-tab1">${esc(cfg.analyses[0].label)}</span>`;
  (cfg.sweeps || []).forEach((s, i) => h += `<button type="button" class="btn sp-swb" data-sweep="${i}">Run ${esc(s.label.toLowerCase())}</button>`);
  sp$("sp-tabs").innerHTML = h;
}
function spRenderParams(){
  const id = SPS.id, cfg = SIMCFG[id], P = SIMP[id];
  sp$("sp-params").innerHTML = (cfg.params || []).map(p => `<label class="sp-prm"><span>${esc(p.label)}</span><span class="sp-pin"><input type="number" id="spp-${id}-${p.k}" data-k="${p.k}" value="${P[p.k]}" min="${p.min}" max="${p.max}" step="${p.step}"><em>${esc(p.unit)}</em></span></label>`).join("");
}
function spShowNetlist(){ try { sp$("sp-netlist").textContent = spiceBuild(SPS.id, {analysis: SPS.ana[SPS.id] || 0, target:"cir"}).text; } catch(e){ sp$("sp-netlist").textContent = String(e); } }
function spMarkStale(){ const id = SPS.id; if (!id) return; spShowNetlist();
  if (sp$("sp-plot").querySelector("svg")){ sp$("sp-plot").classList.add("stale"); spStatus("Values changed. Press Run simulation to update the results.", "warn"); } }
function spRender(r){
  const id = SPS.id, cfg = SIMCFG[id], ana = cfg.analyses[SPS.ana[id] || 0];
  sp$("sp-plot").classList.remove("stale");
  spDrawPlots(sp$("sp-plot"), r.D, ana.plots);
  let h = `<thead><tr><th>Quantity</th><th>Result</th><th>Target</th></tr></thead><tbody>`;
  (ana.measures || []).forEach(m => {
    let v; try { v = m.f(r.D, r.P); } catch(e){ v = NaN; }
    const t = m.target, ok = t && isFinite(v) ? t.ok(v, r.P) : null;
    h += `<tr><td>${esc(m.label)}</td><td class="num">${esc(m.fmt(v))}</td><td>${t ? `<span class="sp-badge ${ok ? "ok" : "bad"}">${ok ? "meets" : "misses"}</span> <span class="sp-tt">${esc(t.text)}</span>` : ""}</td></tr>`;
  });
  sp$("sp-res").innerHTML = h + "</tbody>";
}
async function spRunCurrent(){
  const id = SPS.id; if (!id || SPS.busy) return;
  const ai = SPS.ana[id] || 0, b = spiceBuild(id, {analysis: ai}), key = spKey(id);
  SPS.busy = true; sp$("sp-run").disabled = true;
  spStatus(SPS.eng ? "Simulating…" : "Loading the ngspice simulator (about 6 MB, first time only)…", "busy");
  try {
    const t0 = performance.now(); await spiceEngine(); const t1 = performance.now();
    if (!SPS.eng) throw new Error("no engine");
    spStatus("Simulating…", "busy");
    const {r, err} = await spiceRun(b.text), t2 = performance.now();
    if (!r || !r.data || !r.data.length) throw new Error((err || []).join(" ") || "the simulator returned no data");
    const res = {D: spParse(r, b), P:{...SIMP[id]}, key};
    SPS.res[id + ":" + ai] = res;
    if (SPS.id === id && (SPS.ana[id] || 0) === ai) spRender(res);
    const errs = (err || []).filter(Boolean);
    spStatus(`Simulated in ${((t2 - t1)/1000).toFixed(2)} s${t1 - t0 > 300 ? ` (simulator loaded in ${((t1 - t0)/1000).toFixed(1)} s)` : ""}.${errs.length ? " ngspice: " + errs.slice(0, 2).join(" ") : ""}`, errs.length ? "warn" : "ok");
  } catch(e){
    spStatus(e.timeout ? `Stopped: ${e.message}.` : SPS.eng || onSite() ? `The simulation failed: ${e.message || e}. Check the part values you changed.` : `The simulator could not load here. Open the GitHub site (${SITE}) to run simulations; the downloads work from either place.`, "bad");
  } finally { SPS.busy = false; sp$("sp-run").disabled = false; }
}
async function spRunSweep(i){
  const id = SPS.id, cfg = SIMCFG[id], sw = cfg.sweeps[i]; if (!id || SPS.busy) return;
  SPS.busy = true; sp$("sp-run").disabled = true;
  const keep = SIMP[id][sw.param], pts = [];
  try {
    if (!SPS.eng) spStatus("Loading the ngspice simulator (about 6 MB, first time only)…", "busy");
    await spiceEngine();
    for (let j = 0; j < sw.values.length; j++){
      spStatus(`${sw.label}: run ${j + 1} of ${sw.values.length}…`, "busy");
      SIMP[id][sw.param] = sw.values[j];
      const b = spiceBuild(id, {analysis: 0}), {r} = await spiceRun(b.text);
      let y = NaN; try { y = sw.f(spParse(r, b), SIMP[id]); } catch(e){}
      pts.push([sw.values[j], y]);
      if (SPS.id !== id) return;
    }
    SPS.sweep[id] = {i, pts};
    spDrawSweep(sp$("sp-plot"), sw, pts); sp$("sp-plot").classList.remove("stale");
    sp$("sp-res").innerHTML = `<caption class="sp-sum">${esc(sw.summary ? sw.summary(pts) : "")}</caption><tbody><tr><td colspan="3"><div class="sp-swgrid">` + pts.map(p => `<span><b>${p[0]}</b> → ${isFinite(p[1]) ? +p[1].toPrecision(4) : "—"}</span>`).join("") + `</div></td></tr></tbody>`;
    spStatus(`${sw.label} done: ${pts.length} simulations. Press Run simulation to return to the single run.`, "ok");
  } catch(e){ spStatus(e.timeout ? `Sweep stopped: ${e.message}.` : `The sweep failed: ${e.message || e}`, "bad"); }
  finally { SIMP[id][sw.param] = keep; SPS.busy = false; sp$("sp-run").disabled = false; }
}

/* ---- editing part values on the sheet ---- */
const refUnit = r => /^C/.test(r) ? "F" : /^(L|FB)/.test(r) ? "H" : "Ω";
function spChanged(){
  const id = SPS.id, V = id && SIMV[id]; if (!V){ sp$("sp-chg").textContent = ""; return; }
  const ch = Object.keys(V.vals).filter(r => V.vals[r] !== V.def[r]);
  sp$("sp-chg").textContent = ch.length ? "Changed from the design (shown in pink on the sheet): " + ch.map(r => `${r} = ${engText(siNum(V.vals[r]), refUnit(r))} (design ${engText(siNum(V.def[r]), refUnit(r))})`).join(", ") + "." : "";
}
let spEdit = null;
function spOpenPop(g, cx, cy){
  const id = SPS.id, ref = g.getAttribute("data-ref"); if (!id || !ref) return;
  const V = SIMV[id], tip = (g.getAttribute("data-tip") || "").replace(/ · click to change$/, "").replace(/ · now [^·]*\(design [^)]*\)/, "");
  spEdit = {ref, g};
  sp$("sp-pop-t").textContent = `${ref} · ${engText(siNum(V.vals[ref]), UNIT[ref[0] === "C" ? "C" : ref[0] === "L" ? "L" : ref.startsWith("FB") ? "FB" : "R"])}`;
  sp$("sp-pop-d").textContent = tip.replace(/^[^·]*·\s*[^·]*·\s*/, "");
  const inp = sp$("sp-in"); inp.value = V.vals[ref]; sp$("sp-err").textContent = "";
  sp$("sp-def").textContent = `Back to design value (${engText(siNum(V.def[ref]), UNIT[ref[0] === "C" ? "C" : ref[0] === "L" ? "L" : ref.startsWith("FB") ? "FB" : "R"])})`;
  const pop = sp$("sp-pop"); pop.hidden = false;
  const w = pop.offsetWidth, h = pop.offsetHeight;
  pop.style.left = Math.max(8, Math.min(cx - w/2, innerWidth - w - 8)) + "px";
  pop.style.top = (cy + 16 + h > innerHeight - 8 ? Math.max(8, cy - h - 16) : cy + 16) + "px";
  inp.focus(); inp.select();
}
function spClosePop(){ const p = sp$("sp-pop"); if (p) p.hidden = true; spEdit = null; }
function spApply(def){
  const id = SPS.id; if (!spEdit || !id) return;
  const V = SIMV[id], ref = spEdit.ref;
  let v = def ? siNum(V.def[ref]) : siNum(sp$("sp-in").value);
  if (!isFinite(v) || v <= 0){ sp$("sp-err").textContent = "Enter a positive value, for example 2.2k, 470n or 1.5p."; return; }
  if (v < 1e-15 || v > 1e12){ sp$("sp-err").textContent = "That value is outside 1 f to 1 T."; return; }
  V.vals[ref] = def ? V.def[ref] : spiceNum(v);
  spClosePop(); drawSheet(id); spMarkStale(); spChanged();
  const g = DETS.querySelector(`[data-ref="${ref}"]`); if (g) g.focus({preventScroll:true});
}
DETS.addEventListener("click", e => { const g = e.target.closest(".edp"); if (g && SPS.id){ e.stopPropagation(); spOpenPop(g, e.clientX, e.clientY); } });
DETS.addEventListener("keydown", e => { const g = e.target.closest && e.target.closest(".edp");
  if (g && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); const r = g.getBoundingClientRect(); spOpenPop(g, r.left + r.width/2, r.bottom); } });
sp$("sp-ok").addEventListener("click", () => spApply(false));
sp$("sp-def").addEventListener("click", () => spApply(true));
sp$("sp-in").addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); spApply(false); } if (e.key === "Escape"){ e.stopPropagation(); spClosePop(); } });
document.addEventListener("pointerdown", e => { const p = sp$("sp-pop"); if (!p.hidden && !p.contains(e.target) && !e.target.closest(".edp")) spClosePop(); });
sp$("sp-run").addEventListener("click", spRunCurrent);
sp$("sp-reset").addEventListener("click", () => { const id = SPS.id; if (!id) return; const V = SIMV[id]; Object.keys(V.vals).forEach(r => V.vals[r] = V.def[r]);
  (SIMCFG[id].params || []).forEach(p => SIMP[id][p.k] = p.def); drawSheet(id); spRenderParams(); spMarkStale(); spChanged(); });
sp$("sp-tabs").addEventListener("click", e => { const t = e.target.closest("[data-ana]"), s = e.target.closest("[data-sweep]");
  if (t){ SPS.ana[SPS.id] = +t.dataset.ana; spiceShow(SPS.id); } if (s) spRunSweep(+s.dataset.sweep); });
sp$("sp-params").addEventListener("change", e => { const i = e.target.closest("input[data-k]"); if (!i) return; const p = SIMCFG[SPS.id].params.find(q => q.k === i.dataset.k);
  let v = parseFloat(i.value); if (!isFinite(v)) v = p.def; v = Math.max(p.min, Math.min(p.max, v)); i.value = v; SIMP[SPS.id][p.k] = v; spMarkStale(); });
sp$("sp-params").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches("input[data-k]")){ e.target.dispatchEvent(new Event("change", {bubbles:true})); spRunCurrent(); } });
sp$("sp-copy").addEventListener("click", () => { const t = sp$("sp-netlist").textContent;
  const done = () => spStatus("Netlist copied.", "ok"), sel = () => { const r = document.createRange(); r.selectNodeContents(sp$("sp-netlist")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); spStatus("Netlist selected; press Ctrl+C to copy."); };
  try { navigator.clipboard.writeText(t).then(done, sel); } catch(e){ sel(); } });
if (window.ResizeObserver){ let lw = 0; new ResizeObserver(es => { const w = Math.round(es[0].contentRect.width); if (Math.abs(w - lw) > 8 && SPS.last && SPS.id){ lw = w; SPS.last(); } }).observe(sp$("sp-plot")); }
sp$("d-sim").addEventListener("click", () => sp$("spice").scrollIntoView({block:"start", behavior: RM() ? "auto" : "smooth"}));
