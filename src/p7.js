
/* ---------- probe waveforms ---------- */
const THR = 120, DT = 0.5, NSMP = 401;
const shape = (x, tr, tf) => x < 0 ? 0 : (1 - Math.exp(-x/tr)) * Math.exp(-x/tf);
const pk = (tr, tf) => { let m = 0; for (let x = 0; x < 300; x += 0.1) m = Math.max(m, shape(x, tr, tf)); return m; };
const PK1 = pk(2.5, 40), PK2 = pk(9, 50);
function chan(t0, afePk){
  const s = [], a = [], c = [], w = []; let edge = -1;
  for (let i = 0; i < NSMP; i++){ const t = i*DT;
    s.push(afePk/20 * shape(t-t0, 2.5, 40) / PK1);
    const v = afePk * shape(t-t0, 9, 50) / PK2; a.push(v);
    if (edge < 0 && v > THR) edge = t; }
  for (let i = 0; i < NSMP; i++){ const j = Math.round((i*DT - 4.5)/DT); c.push(j >= 0 && a[j] > THR ? 3.3 : 0); }
  const on = edge + 7.5;
  for (let i = 0; i < NSMP; i++){ const t = i*DT; w.push(edge >= 0 && t >= on && t < on + 50 ? 3.3 : 0); }
  return {s, a, c, w};
}
const ZERO = (() => { const z = new Array(NSMP).fill(0); return {s:z, a:z, c:z, w:z}; })();
const TPS = [
 {n:"TP1", t:"SiPM output", p:"50 Ω load, before the AFE", k:"ana", y:40, yl:"40 mV", f:"s"},
 {n:"TP2", t:"AFE output", p:"×20 · dotted line = threshold", k:"ana", y:1000, yl:"1 V", f:"a"},
 {n:"TP3", t:"Comparator", p:"high while above threshold", k:"dig", y:3.6, yl:"3.3 V", f:"c"},
 {n:"TP4", t:"Stretched pulse", p:"fixed 50 ns width", k:"dig", y:3.6, yl:"3.3 V", f:"w"},
 {n:"TP5", t:"Coincidence", p:"A AND B, latched for the MCU", k:"dig", y:3.6, yl:"3.3 V", f:"and"},
 {n:"TP6", t:"Event record", p:"one EVT line over USB", k:"dat", f:"rec"}];
const probesEl = $("#probes");
const cards = TPS.map(tp => { const d = document.createElement("div"); d.className = "probe"; d.style.setProperty("--tpc", `var(--c-${tp.k})`);
  d.innerHTML = `<h3><span>${tp.t}</span><span class="tpn">${tp.n}</span></h3><p>${tp.p}</p><div class="pv"></div>`; probesEl.appendChild(d); return d; });
function plot(tp, A, B){
  const x0 = 30, x1 = 252, y0 = 8, y1 = 72, X = t => x0 + t/200*(x1-x0), Y = v => y1 - Math.min(v, tp.y)/tp.y*(y1-y0);
  const line = arr => { let p = ""; for (let i = 0; i < NSMP; i += 2) p += `${X(i*DT).toFixed(1)},${Y(arr[i]).toFixed(1)} `; return p; };
  let h = `<svg viewBox="0 0 260 90" aria-hidden="true"><path class="ax" d="M${x0} ${y0}V${y1}H${x1}"/>`;
  [0,50,100,150,200].forEach(t => h += `<path class="ax" d="M${X(t)} ${y1}v3"/>`);
  h += `<text class="axl" x="${x0}" y="86" text-anchor="middle">0</text><text class="axl" x="${X(100)}" y="86" text-anchor="middle">100</text><text class="axl" x="${x1}" y="86" text-anchor="end">200 ns</text>`;
  h += `<text class="axl" x="${x0-3}" y="${y0+6}" text-anchor="end">${tp.yl}</text>`;
  if (tp.f === "a") h += `<path class="thl" d="M${x0} ${Y(THR)}H${x1}"/>`;
  h += `<polyline class="trc b" points="${line(B)}"/><polyline class="trc" points="${line(A)}"/></svg>`;
  return h;
}
function renderProbes(ev){
  const A = ev.wf.A, B = ev.wf.B || ZERO;
  TPS.forEach((tp, i) => { const pv = cards[i].querySelector(".pv");
    if (tp.f === "rec"){
      if (ev.kind === "coinc"){ const r = ev.rec;
        pv.innerHTML = `<div class="rec"><div><span>seq</span>${r.seq}</div><div><span>t_us</span>${r.t}</div><div><span>A B C</span>1 1 1</div><div><span>hA</span>${r.hA}</div><div><span>hB</span>${r.hB}</div><div><span>T °C</span>${r.T.toFixed(2)}</div><div><span>Vbias</span>${r.V.toFixed(3)}</div></div>`;
      } else pv.innerHTML = `<p style="margin-top:10px;font-size:12px">No event record. Hardware singles counter A +1; the count shows up in the next STAT line.</p>`;
      return; }
    if (tp.f === "and"){ const and = A.w.map((v, j) => v && B.w[j] ? 3.3 : 0); pv.innerHTML = plot(tp, and, ZERO.s); return; }
    pv.innerHTML = plot(tp, A[tp.f], B[tp.f]);
  });
}
const setLive = i => cards[i] && cards[i].classList.add("live");
const clearLive = () => cards.forEach(c => c.classList.remove("live"));

/* ---------- event simulation ---------- */
const S = {seq:228, tus:184200000, nA:0, nB:0, nC:0, busy:false, auto:null};
const tempNow = () => 23.6 + 0.25*Math.sin(S.tus/6e8);
const vbias = T => 24.45 + 0.0215*(T-21) + 2.5;
const gumbel = () => { const u = Math.random()*0.998 + 0.001; return 470 - 85*Math.log(-Math.log(u)); };
const pad = (n, w) => String(n).padStart(w, "0");
function makeEvent(kind){
  advance(kind === "coinc" ? Math.round(-Math.log(1 - Math.random())*60e6/Math.max(rateAt(TH) + RACC, 0.05)) : Math.round(-Math.log(1 - Math.random())*25000));
  const T = tempNow(), V = vbias(T);
  if (kind === "coinc"){
    const hA = Math.min(4095, Math.round(gumbel())), hB = Math.min(4095, Math.round(gumbel()));
    S.seq++;
    return {kind, T, V, rec:{seq:S.seq, t:S.tus, hA, hB, T, V}, wf:{A:chan(20, hA*1.25), B:chan(22.5, hB*1.25)}};
  }
  return {kind, T, V, wf:{A:chan(20, 150 + Math.random()*60), B:null}};
}
const logEl = $("#log");
function logLine(txt, cls){ const d = document.createElement("div"); d.className = cls; d.textContent = txt; logEl.appendChild(d);
  while (logEl.childElementCount > 200) logEl.firstChild.remove(); logEl.scrollTop = logEl.scrollHeight; }
function commit(ev){
  if (ev.kind === "coinc"){ S.nA++; S.nB++; S.nC++; noteCoinc(); const r = ev.rec;
    logLine(`EVT,${pad(r.seq,4)},${r.t},1,1,1,${r.hA},${r.hB},${r.T.toFixed(2)},${r.V.toFixed(3)}`, "e");
  } else { S.nA++;
    logLine(`STAT,${S.tus},nA=${S.nA},nB=${S.nB},nC=${S.nC},T=${ev.T.toFixed(2)},Vb=${ev.V.toFixed(3)}`, "s"); }
  updCounters(); drawCharts();
}
const wait = ms => new Promise(r => setTimeout(r, RM() ? 0 : ms));
function travel(id, ms = 260, onp){
  return new Promise(res => { const p = wireEl[id]; if (!p){ res(); return; }
    p.classList.add("hot");
    if (RM()){ onp && onp(p.getPointAtLength(p.getTotalLength()), 1); setTimeout(() => { p.classList.remove("hot"); res(); }, 60); return; }
    const len = p.getTotalLength(), dot = el("circle", {r:4.2, style:`fill:var(--c-${p.dataset.k})`}, LY.fx), t0 = performance.now();
    (function f(now){ const u = Math.min(1, (now - t0)/ms), pt = p.getPointAtLength(u*len);
      dot.setAttribute("cx", pt.x); dot.setAttribute("cy", pt.y); onp && onp(pt, u);
      if (u < 1) requestAnimationFrame(f); else { dot.remove(); setTimeout(() => p.classList.remove("hot"), 200); res(); } })(t0);
  });
}
function photons(hx, c, n = 12){
  if (RM()) return;
  for (let i = 0; i < n; i++){
    const dot = el("circle", {r:1.9, style:"fill:var(--c-opt)"}, LY.fx);
    const mx = Math.max(-66, Math.min(66, hx + (Math.random()*2 - 1)*60)), my = c + (Math.random()*2 - 1)*14, t0 = performance.now(), dur = 380 + Math.random()*260;
    (function f(now){ const u = Math.min(1, (now - t0)/dur);
      const lx = u < .35 ? hx + (mx - hx)*u/.35 : mx + (86 - mx)*(u - .35)/.65, ly = u < .35 ? c + (my - c)*u/.35 : my + (c - my)*(u - .35)/.65, p = rot(lx, ly);
      dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y); dot.style.opacity = 1 - .4*u;
      if (u < 1) requestAnimationFrame(f); else dot.remove(); })(t0);
  }
}
function flash(ch){ slabs[ch].classList.add("flash"); setTimeout(() => slabs[ch].classList.remove("flash"), 450); }
async function chainRun(ch){
  const c = ch.toLowerCase();
  setLive(0); await travel("w-s"+c, 260);
  setLive(1); travel("w-p"+c, 280).then(() => travel("w-q"+c, 420));
  await travel("w-a"+c, 170);
  setLive(2); await travel("w-c"+c, 170);
  setLive(3); await Promise.all([travel("w-x"+c, 380), travel("w-g"+c, 260)]);
}
function setButtons(){ $("#b-mu").disabled = S.busy; $("#b-noise").disabled = S.busy; }
async function fire(kind, silent){
  if (S.busy && !silent) return;
  const ev = makeEvent(kind);
  if (silent){ commit(ev); renderProbes(ev); return; }
  S.busy = true; setButtons(); clearLive(); renderProbes(ev); gateX.classList.remove("on");
  if (kind === "coinc"){
    pickTrack(); let hA = false, hB = false;
    await travel("w-mu", 760, pt => { const lp = toLocal(pt);
      if (!hA && lp.y >= -105){ hA = true; flash("A"); photons(lp.x, -105); }
      if (!hB && lp.y >= 105){ hB = true; flash("B"); photons(lp.x, 105); } });
    await wait(250);
    await Promise.all([chainRun("A"), chainRun("B")]);
    setLive(4); await travel("w-gm", 220); await travel("w-mu2", 160);
    setLive(5); commit(ev); await travel("w-up", 320); await travel("w-lg", 160);
  } else {
    photons(80, -105, 6); await wait(220);
    await chainRun("A");
    gateX.classList.add("on"); setLive(4); setLive(5); commit(ev);
    setTimeout(() => gateX.classList.remove("on"), 1600);
  }
  S.busy = false; setButtons();
}
$("#b-mu").addEventListener("click", () => fire("coinc"));
$("#b-noise").addEventListener("click", () => fire("noise"));
$("#b-auto").addEventListener("click", e => {
  const on = !S.auto; e.currentTarget.setAttribute("aria-pressed", String(on));
  if (on){ S.auto = setInterval(() => { if (!S.busy) fire(Math.random() < .3 ? "noise" : "coinc"); }, 2600); if (!S.busy) fire("coinc"); }
  else { clearInterval(S.auto); S.auto = null; }
});
