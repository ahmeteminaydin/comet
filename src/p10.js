
/* ---------- zoom from the system sheet into detail sheets ---------- */
const SCH = $("#sch"), ZS = {on:false, id:null};
const FULLVB = [0, 0, 1280, 760]; let VB = FULLVB.slice(), busyZoom = false;
const setVB = v => { VB = v; SCH.setAttribute("viewBox", v.map(n => n.toFixed(1)).join(" ")); };
function boxOf(node){ const r = node.getBoundingClientRect(), s = SCH.getBoundingClientRect(), k = 1280/s.width; return [(r.left - s.left)*k, (r.top - s.top)*k, r.width*k, r.height*k]; }
function fitBox([x, y, w, h]){
  const p = Math.max(w, h)*0.3 + 24, A = 1280/760; x -= p; y -= p; w += 2*p; h += 2*p;
  if (w/h > A){ const nh = w/A; y -= (nh - h)/2; h = nh; } else { const nw = h*A; x -= (nw - w)/2; w = nw; }
  return [x, y, w, h];
}
function animVB(to, ms){
  return new Promise(res => { if (RM()){ setVB(to); res(); return; }
    const from = VB.slice(), t0 = performance.now();
    (function f(now){ const u = Math.min(1, (now - t0)/ms), e = u < .5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2)/2;
      setVB(from.map((a, i) => a + (to[i] - a)*e)); if (u < 1) requestAnimationFrame(f); else res(); })(t0); });
}
function setBar(id){ $("#db-t").textContent = SHEETS[id].title; $("#db-d").textContent = `DWG ${SHEETS[id].dwg} · sheet ${ORDER.indexOf(id) + 1} of ${ORDER.length}`; }
async function enterSheet(id, src){
  if (!SHEETS[id] || busyZoom) return; busyZoom = true;
  $("#dbar").hidden = false; setBar(id);
  if (!ZS.on){
    ZS.on = true; ZS.id = id;
    if (src) await animVB(fitBox(boxOf(src)), 520);
    drawSheet(id); spiceShow(id); SCH.classList.add("gone"); DETS.classList.add("on");
  } else if (ZS.id !== id){
    ZS.id = id; DETS.classList.remove("on"); await wait(200); drawSheet(id); spiceShow(id); DETS.classList.add("on");
  }
  busyZoom = false;
}
async function leaveSheet(){
  if (!ZS.on) return; ZS.on = false; ZS.id = null; $("#dbar").hidden = true; hideTip(); spiceShow(null);
  DETS.classList.remove("on"); SCH.classList.remove("gone"); await animVB(FULLVB, 480);
}
function show(id, src){
  if (id === "overview" || !SHEETS[id]){ leaveSheet(); openGuide(id); return; }
  enterSheet(id, src); openGuide(id, false);
}
const _openGuide = openGuide;
openGuide = function(id, focus){ _openGuide(id, focus); if (ZS.on && id !== ZS.id){ if (SHEETS[id]) enterSheet(id); else leaveSheet(); } };
$("#d-back").addEventListener("click", leaveSheet);
$("#d-guide").addEventListener("click", () => { if (ZS.id) _openGuide(ZS.id); });

/* ports and boxes that link to other sheets */
function follow(go){ if (!SHEETS[go]) return; enterSheet(go); if (cur) _openGuide(go, false); }
DETS.addEventListener("click", e => { const p = e.target.closest("[data-go]"); if (p) follow(p.dataset.go); });
DETS.addEventListener("keydown", e => { const p = e.target.closest && e.target.closest("[data-go]");
  if (p && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); follow(p.dataset.go); } });

/* hover tooltips for parts */
const tipEl = $("#tip");
function hideTip(){ tipEl.hidden = true; }
DETS.addEventListener("pointermove", e => {
  const t = e.target.closest("[data-tip]"); if (!t){ hideTip(); return; }
  tipEl.textContent = t.getAttribute("data-tip"); tipEl.hidden = false;
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  tipEl.style.left = Math.max(8, Math.min(e.clientX + 14, innerWidth - w - 8)) + "px";
  tipEl.style.top = (e.clientY + 18 + h > innerHeight ? e.clientY - h - 10 : e.clientY + 18) + "px";
});
DETS.addEventListener("pointerleave", hideTip);

/* Escape: close the guide first, then leave the sheet */
let escGuide = false;
document.addEventListener("keydown", e => { if (e.key === "Escape") escGuide = !!cur; }, true);
document.addEventListener("keydown", e => { if (e.key === "Escape" && !escGuide && ZS.on) leaveSheet(); });
