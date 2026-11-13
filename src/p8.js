
/* ---------- build-guide drawer ---------- */
const dr = $("#drawer"); dr.inert = true; let cur = null;
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function specHtml(s){ const m = s.match(/^(.*?)\s*\((spec|extra feature)\)\s*$/);
  return m ? esc(m[1]) + `<span class="chip">${m[2] === "spec" ? "spec" : "extra"}</span>` : esc(s); }
const REV_KIND = {error:["Fixed error", "Fix"], sim:["Simulation fixed", "Fix"], note:["Open", "To do"]};
const revName = id => G[id] ? G[id].name.replace(/\s*\([^)]*\)|\s*×2|:.*$/g, "") : id;
function revCard(r, link){
  return `<div class="rvc rv-${r.kind}"><div class="rvh"><span class="rvk">${REV_KIND[r.kind][0]}</span>${link ? `<button type="button" class="rvs" data-open="${r.sheet}">${esc(revName(r.sheet))} →</button>` : ""}</div>`
    + `<b>${esc(r.title)}</b><p>${esc(r.text)}</p><p class="rvf"><span>${REV_KIND[r.kind][1]}:</span> ${esc(r.fix)}</p></div>`;
}
function openGuide(id, focus = true){
  const g = G[id]; if (!g) return; cur = id;
  dr.style.setProperty("--dc", `var(--c-${g.k})`);
  $("#d-eye").textContent = g.group; $("#d-title").textContent = g.name;
  const i = ORDER.indexOf(id);
  $("#d-pos").textContent = `${i+1} / ${ORDER.length} · level 2 (detailed)`;
  const tl = x => Array.isArray(x) ? `<b>${esc(x[0])}.</b> ${esc(x[1])}` : esc(x);
  let h = `<p class="lead">${esc(g.summary)}</p><div class="io"><div><span>In</span>${esc(g.io[0])}</div><div class="arr">→</div><div><span>Out</span>${esc(g.io[1])}</div></div>`;
  if (g.how) h += `<h4>How it works</h4><div class="how">${g.how.map(p => { const m = p.match(/^([^.]{3,60})\.\s([\s\S]*)$/); return m ? `<p><b>${esc(m[1])}.</b> ${esc(m[2])}</p>` : `<p>${esc(p)}</p>`; }).join("")}</div>`;
  if (g.conn) h += `<h4>Connections</h4><div class="conn">${g.conn.map(([x, y]) => `<div><span>${esc(x)}</span><p>${esc(y)}</p></div>`).join("")}</div>`;
  h += `<h4>Targets</h4><ul class="specs">${g.specs.map(s => `<li>${specHtml(s)}</li>`).join("")}</ul>`;
  if (g.tool) h += `<div class="tool" id="tool"></div>`;
  h += `<h4>How to build it</h4><ol class="steps">${g.steps.map(s => `<li><span>${tl(s)}</span></li>`).join("")}</ol>`;
  h += `<h4>Suggested parts</h4><div class="tw"><table class="parts"><tbody>${g.parts.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}<span class="n">${esc(r[2])}</span></td></tr>`).join("")}</tbody></table></div>`;
  h += `<h4>Verify it</h4><ul class="chk">${g.test.map(s => `<li>${tl(s)}</li>`).join("")}</ul>`;
  h += `<h4>Watch out for</h4><ul class="warn">${g.pitfalls.map(s => `<li>${tl(s)}</li>`).join("")}</ul>`;
  const rv = REVIEW.items.filter(r => r.sheet === id);
  if (rv.length) h += `<h4>Design review (${esc(REVIEW.date)})</h4><div class="rvd">${rv.map(r => revCard(r, false)).join("")}</div>`;
  if (g.terms) h += `<h4>Terms used here</h4><dl class="terms">${g.terms.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join("")}</dl>`;
  const body = $("#d-body"); body.innerHTML = h; body.scrollTop = 0;
  if (g.tool) TOOLS[g.tool]($("#tool"));
  dr.classList.add("open"); dr.setAttribute("aria-hidden", "false"); dr.inert = false; document.body.classList.add("drawer-open");
  document.querySelectorAll(".blk").forEach(b => b.classList.toggle("sel", b.dataset.id === id));
  $("#d-prev").disabled = i === 0; $("#d-next").disabled = i === ORDER.length - 1;
  if (location.hash !== "#"+id){ try { history.replaceState(null, "", "#"+id); } catch(e){} }
  if (focus) $("#d-x").focus({preventScroll:true});
}
function closeGuide(){
  dr.classList.remove("open"); dr.setAttribute("aria-hidden", "true"); dr.inert = true; document.body.classList.remove("drawer-open");
  document.querySelectorAll(".blk.sel").forEach(b => b.classList.remove("sel"));
  const back = cur && document.querySelector(`.blk[data-id="${cur}"]`); cur = null;
  try { history.replaceState(null, "", location.pathname + location.search); } catch(e){}
  if (back) back.focus({preventScroll:true});
}
$("#d-x").addEventListener("click", closeGuide);
$("#d-prev").addEventListener("click", () => { const i = ORDER.indexOf(cur); if (i > 0) openGuide(ORDER[i-1], false); });
$("#d-next").addEventListener("click", () => { const i = ORDER.indexOf(cur); if (i < ORDER.length-1) openGuide(ORDER[i+1], false); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && cur) closeGuide(); });
window.addEventListener("hashchange", () => { const id = location.hash.slice(1); if (G[id] && id !== cur) openGuide(id, false); });

/* ---------- calculators ---------- */
function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mcRate(a, d, thDeg){
  const r = rng(7), N = 30000, th = thDeg*Math.PI/180, st = Math.sin(th), ct = Math.cos(th); let s = 0;
  for (let i = 0; i < N; i++){
    const x = (r()-.5)*a, y = (r()-.5)*a, c = r(), dz = (r() < .5 ? 1 : -1)*c, sp = Math.sqrt(1 - c*c), ph = 2*Math.PI*r();
    const dx = sp*Math.cos(ph), dy = sp*Math.sin(ph), cw = dy*st + dz*ct;
    if (cw <= 0 || c < 1e-6) continue;
    const k = d/c, xb = x - k*dx, yb = y - k*dy;
    if (Math.abs(xb) > a/2 || Math.abs(yb) > a/2) continue;
    s += cw*cw*c;
  }
  return a*a*4*Math.PI*(s/N)*0.007*60*0.9;   // per minute; I0 = 70 m^-2 s^-1 sr^-1, 95 % eff. per module
}
const fmtT = m => m < 90 ? `${Math.round(m)} min` : `${(m/60).toFixed(1)} h`;
const TOOLS = {
 mc(box){
  box.innerHTML = `<h4>Rate estimator</h4><p class="note" style="margin:0 0 6px">Monte Carlo over the cos²θ muon flux for two identical square slabs on one axis.</p>
  <div class="row"><label for="mc-a">Slab side</label><input id="mc-a" type="range" min="5" max="30" step="1" value="10"><output id="mc-ao"></output></div>
  <div class="row"><label for="mc-d">Separation d</label><input id="mc-d" type="range" min="2" max="50" step="1" value="15"><output id="mc-do"></output></div>
  <div class="row"><label for="mc-t">Zenith tilt θ</label><input id="mc-t" type="range" min="0" max="90" step="5" value="0"><output id="mc-to"></output></div>
  <svg id="mc-svg" viewBox="0 0 260 170" width="260" height="170" aria-hidden="true"></svg>
  <div class="res"><div><span class="lab">Coincidences at θ</span><span class="big" id="mc-r"></span></div><div><span class="lab">Singles per slab</span><span class="big" id="mc-s" style="font-size:20px"></span></div></div>
  <p id="mc-ok" style="font-size:13px"></p>
  <div class="tw"><table class="mini"><thead><tr><th>θ</th><th>Estimate</th><th>R(0°)·cos²θ</th><th>400 counts</th></tr></thead><tbody id="mc-tb"></tbody></table></div>
  <p class="note">Assumes I₀ = 70 m⁻² s⁻¹ sr⁻¹ and 95 % efficiency per module, no building overhead. Wide acceptance smears the angle, so the curve is flatter than pure cos²θ; compare data with this estimate as well as with cos²θ.</p>`;
  const ia = $("#mc-a"), id = $("#mc-d"), it = $("#mc-t"); it.value = TH;
  const up = () => { const a = +ia.value, d = +id.value, t = +it.value;
    $("#mc-ao").textContent = a+" cm"; $("#mc-do").textContent = d+" cm"; $("#mc-to").textContent = t+"°";
    const R = mcRate(a, d, t), R0 = mcRate(a, d, 0), Sg = a*a*Math.PI/2*0.007*60*0.95;
    $("#mc-r").innerHTML = `${R.toFixed(1)} <small>/min</small>`; $("#mc-s").innerHTML = `${Sg.toFixed(0)} <small>/min</small>`;
    const ok = R0 >= 5 && R0 <= 20;
    $("#mc-ok").innerHTML = `Vertical rate R(0°) = ${R0.toFixed(1)} /min: <b class="${ok?"pass":"fail"}">${ok ? "inside" : "outside"} the 5–20 /min target</b>`;
    $("#mc-tb").innerHTML = [0,30,45,60,90].map(th => { const r = th === 0 ? R0 : mcRate(a, d, th), c2 = R0*Math.cos(th*Math.PI/180)**2;
      return `<tr><td>${th}°</td><td>${r.toFixed(2)}</td><td>${c2.toFixed(2)}</td><td>${r > 0 ? fmtT(400/r) : "–"}</td></tr>`; }).join("");
    const s = Math.min(5, 110/Math.max(a, d)), cx = 130, cy = 88, w = a*s, h2 = d*s/2;
    $("#mc-svg").innerHTML = `<path d="M${cx} 6V166" style="stroke:var(--muted);stroke-dasharray:3 3"/>
      <text x="${cx+5}" y="16" class="axl">zenith</text>
      <g transform="rotate(${t} ${cx} ${cy})"><path d="M${cx} ${cy-h2-14}V${cy+h2+8}" style="stroke:var(--c-mech);stroke-width:1.5"/>
      <rect x="${cx-w/2}" y="${cy-h2-6}" width="${w}" height="6" rx="1" style="fill:var(--c-opt)"/><rect x="${cx-w/2}" y="${cy+h2}" width="${w}" height="6" rx="1" style="fill:var(--c-opt)"/>
      <text x="${cx+w/2+4}" y="${cy-h2}" class="axl">A</text><text x="${cx+w/2+4}" y="${cy+h2+6}" class="axl">B</text></g>
      <circle cx="${cx}" cy="${cy}" r="3.5" style="fill:var(--c-mech)"/>
      <text x="8" y="164" class="axl">θ = ${t}° · d = ${d} cm · ${a}×${a} cm</text>`;
  };
  [ia, id, it].forEach(x => x.addEventListener("input", up)); it.addEventListener("input", () => setAngle(+it.value, "tool")); TOOLS.mcUp = up; up();
 },
 acc(box){
  box.innerHTML = `<h4>Accidental-rate calculator</h4>
  <div class="row"><label for="ac-ra">Singles A</label><input id="ac-ra" type="number" min="0" step="1" value="40"><span class="u">Hz</span></div>
  <div class="row"><label for="ac-rb">Singles B</label><input id="ac-rb" type="number" min="0" step="1" value="40"><span class="u">Hz</span></div>
  <div class="row"><label for="ac-wa">Width w_A</label><input id="ac-wa" type="number" min="1" step="1" value="50"><span class="u">ns</span></div>
  <div class="row"><label for="ac-wb">Width w_B</label><input id="ac-wb" type="number" min="1" step="1" value="50"><span class="u">ns</span></div>
  <div class="res"><div><span class="lab">Window w_A + w_B</span><span class="big" id="ac-w" style="font-size:20px"></span></div><div><span class="lab">Accidentals</span><span class="big" id="ac-r"></span></div></div>
  <p id="ac-m" style="font-size:13px"></p>
  <p class="note">R_acc ≈ (w_A + w_B) · R_A · R_B for uncorrelated singles. Use singles rates measured at the threshold you will run with.</p>`;
  const ids = ["ac-ra","ac-rb","ac-wa","ac-wb"].map(i => $("#"+i));
  const up = () => { const [ra, rb, wa, wb] = ids.map(x => Math.max(0, +x.value || 0)), w = wa + wb;
    const acc = w*1e-9*ra*rb*60, wOk = w <= 100, aOk = acc < 0.1, rmax = Math.sqrt(0.1/60/(Math.max(w,1)*1e-9));
    $("#ac-w").innerHTML = `<span class="${wOk?"pass":"fail"}">${w} ns</span>`;
    $("#ac-r").innerHTML = `<span class="${aOk?"pass":"fail"}">${acc < 0.01 ? acc.toExponential(1) : acc.toFixed(3)}</span> <small>/min</small>`;
    $("#ac-m").innerHTML = `${wOk ? "Window meets" : "Window breaks"} the ≤ 100 ns spec; accidentals ${aOk ? "meet" : "break"} the &lt; 0.1 /min spec. With equal channels, singles can rise to about <b>${Math.round(rmax)} Hz</b> each before accidentals reach 0.1 /min.`;
  };
  ids.forEach(x => x.addEventListener("input", up)); up();
 },
 temp(box){
  box.innerHTML = `<h4>Overvoltage drift</h4>
  <div class="row"><label for="tc-t">Temperature</label><input id="tc-t" type="range" min="10" max="40" step="0.5" value="30"><output id="tc-to"></output></div>
  <div class="row"><label for="tc-k">k (mV/°C)</label><input id="tc-k" type="range" min="10" max="60" step="0.5" value="21.5"><output id="tc-ko"></output></div>
  <div class="res"><div><span class="lab">Vbr(T)</span><span class="big" id="tc-vbr" style="font-size:20px"></span></div><div><span class="lab">Bias for Vov = 2.5 V</span><span class="big" id="tc-vb" style="font-size:20px"></span></div></div>
  <div style="font-size:13px;margin-top:6px">Fixed 26.95 V bias (set at 21 °C): Vov <b id="tc-f"></b>, gain <b id="tc-g"></b><div class="bar"><i id="tc-bf"></i></div></div>
  <div style="font-size:13px;margin-top:10px">Compensated: Vov 2.500 V, gain unchanged<div class="bar"><i style="width:71.4%"></i></div></div>
  <p class="note">Example values: Vbr(21 °C) = 24.45 V, Vov = 2.5 V (onsemi C-series range). Use your measured breakdown. Gain scales roughly with overvoltage and detection efficiency falls with it, so a fixed threshold sees the count rate move too.</p>`;
  const it = $("#tc-t"), ik = $("#tc-k");
  const up = () => { const T = +it.value, k = +ik.value/1000, vbr = 24.45 + k*(T-21), vov = 26.95 - vbr, dg = (vov/2.5 - 1)*100;
    $("#tc-to").textContent = T.toFixed(1)+" °C"; $("#tc-ko").textContent = (+ik.value).toFixed(1);
    $("#tc-vbr").textContent = vbr.toFixed(3)+" V"; $("#tc-vb").textContent = (vbr + 2.5).toFixed(3)+" V";
    $("#tc-f").textContent = vov.toFixed(3)+" V";
    $("#tc-g").innerHTML = `<span class="${Math.abs(dg) < 2 ? "pass" : "fail"}">${dg >= 0 ? "+" : ""}${dg.toFixed(1)} %</span>`;
    $("#tc-bf").style.width = Math.max(0, Math.min(100, vov/3.5*100)) + "%";
  };
  [it, ik].forEach(x => x.addEventListener("input", up)); up();
 }
};

/* ---------- legend, index, initial state ---------- */
$("#legend").innerHTML = DOMAINS.map(([k, n]) => `<span style="color:var(--c-${k})"><i></i><b>${n}</b></span>`).join("");
$("#index").innerHTML = GROUPS.map(([n, k, ids]) => `<div class="grp"><h3 style="color:var(--c-${k})"><i></i><span style="color:var(--muted)">${n}</span></h3><ul>${ids.map(id => `<li><button type="button" data-open="${id}">${esc(G[id].name)}</button></li>`).join("")}</ul></div>`).join("");
$("#rv-intro").textContent = `Last review ${REVIEW.date}. ${REVIEW.intro}`;
$("#rv-list").innerHTML = [["error", "Errors found and fixed"], ["sim", "Simulation problems fixed"], ["note", "Open considerations"]].map(([k, n]) => {
  const it = REVIEW.items.filter(r => r.kind === k);
  return `<div class="rvg"><h3 class="rv-${k}"><i></i>${n} <span>${it.length}</span></h3><div class="rvgrid">${it.map(r => revCard(r, true)).join("")}</div></div>`; }).join("");
$("#rv-list").addEventListener("click", e => { const b = e.target.closest("[data-open]"); if (b){ show(b.dataset.open); document.querySelector(".sheet").scrollIntoView({block:"start", behavior: RM() ? "auto" : "smooth"}); } });
$("#index").addEventListener("click", e => { const b = e.target.closest("[data-open]"); if (b){ show(b.dataset.open); document.querySelector(".sheet").scrollIntoView({block:"start", behavior: RM() ? "auto" : "smooth"}); } });
logLine("# EVT,seq,t_us,A,B,C,hA,hB,T_C,Vbias   STAT,t_us,counts   (simulated)", "c");
