
/* ---------- telescope angle ---------- */
let TH = 0;
const RT = [];                                   // coincidence rate per 5°, 10 × 10 cm slabs, 15 cm apart
for (let t = 0; t <= 90; t += 5) RT.push(mcRate(10, 15, t));
const RACC = 100e-9*40*40*60;                // accidentals per minute: (wA+wB)·RA·RB with 40 Hz singles
const rateAt = th => { const i = Math.min(17, Math.floor(th/5)), f = th/5 - i; return RT[i]*(1 - f) + RT[i+1]*f; };
const f1 = n => n.toFixed(1);
function rot(lx, ly){ const r = TH*Math.PI/180, c = Math.cos(r), s = Math.sin(r); return {x:180 + lx*c - ly*s, y:330 + lx*s + ly*c}; }
function dirv(lx, ly){ const r = TH*Math.PI/180, c = Math.cos(r), s = Math.sin(r); return {x:lx*c - ly*s, y:lx*s + ly*c}; }
function toLocal(p){ const r = TH*Math.PI/180, c = Math.cos(r), s = Math.sin(r), dx = p.x - 180, dy = p.y - 330; return {x:dx*c + dy*s, y:-dx*s + dy*c}; }
function clipLine(a, b){                         // Liang–Barsky against the physical side of the sheet
  let t0 = 0, t1 = 1; const dx = b.x - a.x, dy = b.y - a.y, P = [-dx, dx, -dy, dy], Q = [a.x - 6, 346 - a.x, a.y - 40, 600 - a.y];
  for (let i = 0; i < 4; i++){ if (P[i] === 0){ if (Q[i] < 0) return null; continue; }
    const r = Q[i]/P[i]; if (P[i] < 0){ if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; } }
  return [{x:a.x + t0*dx, y:a.y + t0*dy}, {x:a.x + t1*dx, y:a.y + t1*dy}];
}
function setAngle(th, from){
  TH = Math.max(0, Math.min(90, Math.round(th/5)*5));
  tel.setAttribute("transform", `rotate(${TH} 180 330)`);
  let p = rot(97, -105), d = dirv(1, 0);
  wireEl["w-sa"].setAttribute("d", `M${f1(p.x)} ${f1(p.y)} C${f1(p.x + 42*d.x)} ${f1(p.y + 42*d.y)} 350 210 398 210`);
  p = rot(97, 105);
  wireEl["w-sb"].setAttribute("d", `M${f1(p.x)} ${f1(p.y)} C${f1(p.x + 42*d.x)} ${f1(p.y + 42*d.y)} 350 450 398 450`);
  let q = rot(86, -94), e = dirv(0, 1);
  wireEl["w-ba"].setAttribute("d", `M400 318 C350 318 ${f1(q.x + 34*e.x)} ${f1(q.y + 34*e.y)} ${f1(q.x)} ${f1(q.y)}`);
  q = rot(86, 94); e = dirv(0, -1);
  wireEl["w-bb"].setAttribute("d", `M400 342 C350 342 ${f1(q.x + 34*e.x)} ${f1(q.y + 34*e.y)} ${f1(q.x)} ${f1(q.y)}`);
  p = rot(96, 71);
  wireEl["w-ts"].setAttribute("d", `M${f1(p.x)} ${f1(p.y)} C${f1(p.x + 40*d.x)} ${f1(p.y + 40*d.y)} 348 578 398 578`);
  setTrackPath();
  const r = TH*Math.PI/180;
  angArc.setAttribute("d", TH > 0 ? `M180 165 A165 165 0 0 1 ${f1(180 + 165*Math.sin(r))} ${f1(330 - 165*Math.cos(r))}` : "");
  angTxt.textContent = `θ = ${TH}°`;
  $("#ang").value = TH; $("#ang-o").textContent = TH + "°"; $("#ang-r").textContent = rateAt(TH).toFixed(1);
  $("#b-ff").textContent = `Simulate 10 min at ${TH}°`;
  document.querySelectorAll(".snaps button").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.a === TH)));
  if (from !== "tool" && $("#mc-t") && TOOLS.mcUp){ $("#mc-t").value = TH; TOOLS.mcUp(); }
  drawCharts();
}

/* muon track: local x where it crosses slab A (y = -105) and slab B (y = +105) */
let TRK = {a:-30, b:-30};
function setTrackPath(){
  const k = (TRK.b - TRK.a)/210, x = y => TRK.a + k*(y + 105), seg = clipLine(rot(x(-300), -300), rot(x(236), 236));
  if (seg) wireEl["w-mu"].setAttribute("d", `M${f1(seg[0].x)} ${f1(seg[0].y)} L${f1(seg[1].x)} ${f1(seg[1].y)}`);
}
function pickTrack(){ TRK = {a:(Math.random()*2 - 1)*60, b:(Math.random()*2 - 1)*60}; setTrackPath(); }

/* ---------- simulated runs ---------- */
const D = {t0:S.tus, bins:[], live:{}, cnt:{}};
const curMin = () => Math.floor((S.tus - D.t0)/60e6);
function ensureBins(){ const m = curMin(); while (D.bins.length <= m) D.bins.push({n:0, th:TH}); D.bins[m].th = TH; }
function advance(dt){ S.tus += dt; D.live[TH] = (D.live[TH] || 0) + dt; ensureBins(); }
function noteCoinc(){ ensureBins(); D.bins[curMin()].n++; D.cnt[TH] = (D.cnt[TH] || 0) + 1; }
function updCounters(){ const f = n => n.toLocaleString("en-US"); $("#n-a").textContent = f(S.nA); $("#n-b").textContent = f(S.nB); $("#n-c").textContent = f(S.nC); }
const gauss = () => Math.sqrt(-2*Math.log(1 - Math.random()))*Math.cos(2*Math.PI*Math.random());
function simulate(min){
  const end = S.tus + min*60e6; let n = 0;
  for (;;){ const dt = Math.round(-Math.log(1 - Math.random())*60e6/Math.max(rateAt(TH) + RACC, 0.05));
    if (S.tus + dt > end){ advance(end - S.tus); break; } advance(dt); noteCoinc(); n++; }
  const sg = 40*60*min;                          // ~40 Hz singles per channel (muons + gammas + dark counts above threshold)
  S.nA += Math.round(sg + Math.sqrt(sg)*gauss()); S.nB += Math.round(sg + Math.sqrt(sg)*gauss()); S.nC += n; S.seq += n;
  const T = tempNow();
  logLine(`# simulated ${min} min at θ=${TH}°: ${n} coincidences`, "c");
  logLine(`STAT,${S.tus},nA=${S.nA},nB=${S.nB},nC=${S.nC},T=${T.toFixed(2)},Vb=${vbias(T).toFixed(3)}`, "s");
  updCounters(); drawCharts();
}

/* ---------- charts ---------- */
const niceMax = v => [5,10,15,20,25,30,40,50,60,80,100].find(x => x >= v) || Math.ceil(v/50)*50;
function runPoints(){
  return Object.keys(D.live).map(Number).sort((a, b) => a - b).map(th => { const T = D.live[th]/60e6, n = D.cnt[th] || 0;
    return {th, T, n, rm:T > 0 ? n/T : 0, r:T > 0 ? n/T - RACC : 0, e:T > 0 ? Math.sqrt(Math.max(n, 1))/T : 0}; });
}
function drawPolar(pts){
  const O = {x:44, y:272}, R = 224, R0 = RT[0], good = pts.filter(p => p.T >= 0.5);
  const vmax = niceMax(Math.max(R0*1.15, ...good.map(p => p.r + p.e))), sc = R/vmax, step = vmax <= 15 ? 5 : vmax <= 30 ? 10 : 20;
  const P = (th, v) => { const a = th*Math.PI/180; return [O.x + v*sc*Math.sin(a), O.y - v*sc*Math.cos(a)]; };
  let h = "";
  for (let v = step; v <= vmax; v += step){ const r = v*sc;
    h += `<path class="ax" d="M${O.x} ${f1(O.y - r)} A${f1(r)} ${f1(r)} 0 0 1 ${f1(O.x + r)} ${O.y}"/><text class="axl" x="${O.x - 5}" y="${f1(O.y - r + 3)}" text-anchor="end">${v}</text>`; }
  h += `<text class="axl" x="${O.x - 5}" y="${O.y + 3}" text-anchor="end">0</text><text class="axl" x="4" y="${O.y + 20}">coincidences/min</text>`;
  [0,30,45,60,90].forEach(t => { const [x, y] = P(t, vmax), [lx, ly] = P(t, vmax*1.07);
    h += `<path class="ax" d="M${O.x} ${O.y}L${f1(x)} ${f1(y)}"/><text class="axl" x="${f1(lx)}" y="${f1(ly + 3)}" text-anchor="${t === 0 ? "middle" : "start"}">${t}°</text>`; });
  let c = ""; for (let t = 0; t <= 90; t += 2){ const [x, y] = P(t, R0*Math.cos(t*Math.PI/180)**2); c += `${f1(x)},${f1(y)} `; }
  let m = ""; RT.forEach((v, i) => { const [x, y] = P(i*5, v); m += `${f1(x)},${f1(y)} `; });
  h += `<polyline class="cv2" points="${c}"/><polyline class="cv1" points="${m}"/>`;
  const [cx, cy] = P(TH, vmax), [dx, dy] = P(TH, rateAt(TH));
  h += `<path class="cur" d="M${O.x} ${O.y}L${f1(cx)} ${f1(cy)}"/>`;
  good.forEach(p => { const [x1, y1] = P(p.th, Math.max(0, p.r - p.e)), [x2, y2] = P(p.th, p.r + p.e), [x, y] = P(p.th, p.r);
    h += `<path class="eb" d="M${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}"/><circle class="md" cx="${f1(x)}" cy="${f1(y)}" r="3.6"/>`; });
  h += `<circle class="curd" cx="${f1(dx)}" cy="${f1(dy)}" r="5"/><text class="axl halo2" x="${f1(dx + 8)}" y="${f1(dy - 6)}">θ=${TH}° · ${rateAt(TH).toFixed(1)}/min</text>`;
  $("#polar").innerHTML = h;
}
function drawHist(){
  const x0 = 40, x1 = 548, y0 = 24, y1 = 250, Wn = 60, bins = D.bins, cm = curMin(), start = Math.max(0, bins.length - Wn), bw = (x1 - x0)/Wn, vis = bins.slice(start);
  const ymax = niceMax(Math.max(RT[0]*1.6, ...vis.map(b => b.n))), step = ymax <= 15 ? 5 : ymax <= 30 ? 5 : 10;
  const X = mm => x0 + (mm - start)*bw, Y = v => y1 - v/ymax*(y1 - y0);
  let h = "";
  for (let v = 0; v <= ymax; v += step) h += `<path class="ax" d="M${x0} ${f1(Y(v))}H${x1}" style="opacity:${v ? .5 : 1}"/><text class="axl" x="${x0 - 5}" y="${f1(Y(v) + 3)}" text-anchor="end">${v}</text>`;
  h += `<text class="axl" x="${x0 - 5}" y="${y0 - 10}" text-anchor="end">/min</text>`;
  for (let mm = Math.ceil(start/10)*10; mm <= start + Wn; mm += 10) h += `<text class="axl" x="${f1(X(mm))}" y="${y1 + 14}" text-anchor="middle">${mm}</text>`;
  h += `<text class="axl" x="${x1}" y="${y1 + 28}" text-anchor="end">simulated minutes</text>`;
  let ex = "";
  vis.forEach((b, i) => { const mm = start + i, part = mm === cm, ev = rateAt(b.th);
    if (b.n) h += `<rect class="${part ? "hb0" : "hb1"}" x="${f1(X(mm) + 1)}" y="${f1(Y(b.n))}" width="${f1(Math.max(1, bw - 2))}" height="${f1(y1 - Y(b.n))}"/>`;
    ex += `${i === 0 || b.th !== vis[i-1].th ? "M" : "L"}${f1(X(mm))} ${f1(Y(ev))}H${f1(X(mm + 1))}`;
    if (i === 0 || b.th !== vis[i-1].th) h += `<path class="chg" d="M${f1(X(mm))} ${y0}V${y1}"/><text class="axl" x="${f1(X(mm) + 3)}" y="${y0 + 8}">θ=${b.th}°</text>`; });
  if (ex) h += `<path class="exl" d="${ex}"/>`;
  if (!vis.length) h += `<text class="axl" x="${(x0 + x1)/2}" y="${(y0 + y1)/2}" text-anchor="middle">No runs yet. Simulate a run or send muons.</text>`;
  $("#hist").innerHTML = h;
}
function drawRuns(pts){
  $("#runs").innerHTML = pts.filter(p => p.T >= 0.05).map(p => { const ex = rateAt(p.th);
    return `<tr class="${p.th === TH ? "on" : ""}"><td>${p.th}°</td><td>${p.T.toFixed(1)} min</td><td>${p.n}</td><td>${p.rm.toFixed(2)} ± ${p.e.toFixed(2)}</td><td>${RACC.toFixed(3)}</td><td>${p.r.toFixed(2)} ± ${p.e.toFixed(2)}</td><td>${ex.toFixed(2)}</td><td>${ex > 0 ? (p.r/ex).toFixed(2) : "–"}</td></tr>`; }).join("")
    || `<tr><td colspan="8">No runs yet.</td></tr>`;
}
function drawCharts(){ const pts = runPoints(); drawPolar(pts); drawHist(); drawRuns(pts); }

/* ---------- controls + initial state ---------- */
$("#ang").addEventListener("input", e => setAngle(+e.target.value));
document.querySelectorAll(".snaps button").forEach(b => b.addEventListener("click", () => setAngle(+b.dataset.a)));
document.querySelectorAll(".linkbtn[data-open]").forEach(b => b.addEventListener("click", () => show(b.dataset.open)));
$("#b-ff").addEventListener("click", () => { if (!S.busy) simulate(10); });
$("#b-clr").addEventListener("click", () => { D.t0 = S.tus; D.bins = []; D.live = {}; D.cnt = {}; logLine("# runs cleared", "c"); drawCharts(); });
setAngle(0); simulate(10); setAngle(30); simulate(10); setAngle(45); simulate(10);
["noise","coinc","coinc","noise","coinc"].forEach(k => fire(k, true));
{ const id = location.hash.slice(1); if (G[id]) show(id); }
