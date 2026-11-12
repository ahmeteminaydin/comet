
/* ---------- SPICE: per-sheet test benches ---------- */
const MS = {                                        // measurements on {t, v} arrays (SI units)
  at(d, t){ const T = d.t, V = d.v; if (t <= T[0]) return V[0]; for (let i = 1; i < T.length; i++) if (T[i] >= t) return V[i-1] + (V[i] - V[i-1])*(t - T[i-1])/((T[i] - T[i-1]) || 1); return V[V.length - 1]; },
  max(d, t0 = -Infinity, t1 = Infinity){ let m = -Infinity; d.t.forEach((t, i) => { if (t >= t0 && t <= t1 && d.v[i] > m) m = d.v[i]; }); return m; },
  tmax(d){ let m = -Infinity, tm = NaN; d.t.forEach((t, i) => { if (d.v[i] > m){ m = d.v[i]; tm = t; } }); return tm; },
  min(d, t0 = -Infinity, t1 = Infinity){ let m = Infinity; d.t.forEach((t, i) => { if (t >= t0 && t <= t1 && d.v[i] < m) m = d.v[i]; }); return m; },
  cross(d, lvl, dir = "rise", n = 1, t0 = -Infinity){ let k = 0; for (let i = 1; i < d.t.length; i++){ if (d.t[i] < t0) continue; const a = d.v[i-1], b = d.v[i];
      if ((dir === "rise" && a < lvl && b >= lvl) || (dir === "fall" && a > lvl && b <= lvl)){ if (++k === n) return d.t[i-1] + (lvl - a)*(d.t[i] - d.t[i-1])/((b - a) || 1); } } return NaN; },
  edges(d, lvl){ let k = 0; for (let i = 1; i < d.t.length; i++) if (d.v[i-1] < lvl && d.v[i] >= lvl) k++; return k; },
  pp(d, t0, t1){                                    // peak-to-peak after removing a linear trend
    const I = d.t.map((t, i) => i).filter(i => d.t[i] >= t0 && d.t[i] <= t1); if (I.length < 3) return NaN;
    let st = 0, sv = 0, stt = 0, stv = 0; I.forEach(i => { st += d.t[i]; sv += d.v[i]; stt += d.t[i]*d.t[i]; stv += d.t[i]*d.v[i]; });
    const n = I.length, b = (n*stv - st*sv)/((n*stt - st*st) || 1), a = (sv - b*st)/n;
    let lo = Infinity, hi = -Infinity; I.forEach(i => { const r = d.v[i] - (a + b*d.t[i]); if (r < lo) lo = r; if (r > hi) hi = r; }); return hi - lo; },
  integ(d, t0, t1){ let s = 0; for (let i = 1; i < d.t.length; i++){ const a = Math.max(d.t[i-1], t0), b = Math.min(d.t[i], t1); if (b > a) s += (d.v[i-1] + d.v[i])/2*(b - a); } return s; },
  db(d, f){ return MS.at({t:d.t, v:d.v}, f); },
};
const fmtN = (v, u, k = 1, dp = 1) => isFinite(v) ? `${(v*k).toFixed(dp)} ${u}` : "—";
const SIPM_PORT = (n, p) => [                      // the detector as seen through 30 cm of coax
  `V_SIPMBIAS sipm_vb 0 26.95`, `R_CARRIER sipm_vb sipm_k 1k`, `C_CARRIER sipm_k 0 100n`,
  `X_SIPM sipm_k sipm_a MICROFC60035_BEH NPE={NPE} T0=20n TEMP={TEMP}`, `T_COAX sipm_a 0 $N 0 Td=1.5n Z0=50`];
const NPE_P = {k:"NPE", label:"Photoelectrons per muon", def:140, unit:"p.e.", min:1, max:2000, step:10};
const TEMP_P = {k:"TEMP", label:"SiPM temperature", def:21, unit:"°C", min:-10, max:50, step:1};

const SIMCFG = {};

SIMCFG.sipm = {
  params: [NPE_P, TEMP_P, {k:"VBIAS", label:"Bias from the supply", def:26.95, unit:"V", min:24, max:30, step:0.05}],
  exclude: ["U31"], excludeWhy: "the temperature sensor has no effect on the pulse",
  ports: {"VBIAS_A · from Bias": "V_BIAS $N 0 {VBIAS}", "+3V3 · from USB/LDO": "V_3V3 $N 0 3.3",
          "coax to AFE A (R1, TP1)": ["T_COAX $N 0 tp1 0 Td=1.5n Z0=50", "R1_AFE tp1 0 50"]},
  analyses: [{id:"tran", label:"Muon pulse", cmd:".tran 0.1n 1u 0 0.2n",
    probes: [{name:"TP1 at the AFE (across R1)", at:"node:tp1"}, {name:"Cathode change", at:"pin:SiPM1.K", rel:true}],
    plots: [{title:"TP1 · pulse at the 50 Ω termination on the AFE", probes:["TP1 at the AFE (across R1)"], unit:"mV", k:1e3},
            {title:"SiPM cathode: bias droop while C30 supplies the pulse", probes:["Cathode change"], unit:"mV", k:1e3}],
    measures: [
      {label:"Peak at TP1", f:D => MS.max(D["TP1 at the AFE (across R1)"]), fmt:v => fmtN(v, "mV", 1e3)},
      {label:"Charge delivered", f:D => MS.integ(D["TP1 at the AFE (across R1)"], 0, 1e-6)/50, fmt:v => fmtN(v, "pC", 1e12)},
      {label:"Decay time (peak → 37 %)", f:D => { const d = D["TP1 at the AFE (across R1)"], m = MS.max(d), t = MS.tmax(d); return MS.cross(d, m/Math.E, "fall", 1, t) - t; }, fmt:v => fmtN(v, "ns", 1e9, 0)},
      {label:"Overvoltage", f:(D, P) => P.VBIAS - (24.45 + 0.0215*(P.TEMP - 21)), fmt:v => fmtN(v, "V", 1, 2), target:{text:"1–5 V (SiPM range)", ok:v => v >= 1 && v <= 5}},
      {label:"Cathode droop", f:D => -MS.min(D["Cathode change"]), fmt:v => fmtN(v, "mV", 1e3, 2)}]}],
  note: "The SiPM model lumps fired and passive microcells (≈3.4 nF in total). That capacitance discharging through the 50 Ω termination sets the slow decay. Parameters are approximate: compare with the real pulse in step 2 of the build order.",
};

const BIAS_SET = (P) => { const V = SIMV.bias.vals, r20 = siNum(V.R20), r21 = siNum(V.R21), r22 = siNum(V.R22);
  return 1.235*(1 + r20/r21 + r20/r22) - P.VDAC*r20/r22; };   // LT3482: FB regulates to 1.235 V
SIMCFG.bias = {
  params: [{k:"VDAC", label:"Trim DAC output (VOUTD)", def:1.024, unit:"V", min:0, max:2.048, step:0.01},
           {k:"VRIP", label:"Converter ripple at TP7", def:20, unit:"mVpp", min:0, max:500, step:5, spice:v => v*1e-3},
           {k:"FRIP", label:"Ripple frequency", def:1100, unit:"kHz", min:1, max:5000, step:10, spice:v => v*1e3}],
  exclude: ["U12", "L1", "D2", "C27"], excludeWhy: "the boost converter is replaced by an ideal regulator at TP7 that holds FB at 1.235 V, plus ripple",
  values: {FB3:"1u"}, suffix: {FB3:" (BLM18 bead)"},
  drive: {"tp:TP7": a => a === "ac" ? "V_CONV $N 0 DC 27 AC 1" : [
    "* ideal boost regulator: integrates (1.235 V - FB) with ~10 kHz loop bandwidth; cannot go below VIN or above 40 V",
    "B_ERR 0 conv_int I=1m*(1.235-V(@[pin:R21.1]))", "C_INT conv_int 0 0.72n", "R_INT conv_int 0 1G",
    "B_CONV $N 0 V=max(4.6,min(40,V(conv_int)))+{VRIP}/2*sin(6.2832*{FRIP}*time)*(1-exp(-time/2u))"]},
  ports: {"to SiPM A · VBIAS_A": "I_SIPMA $N 0 0.6u", "to SiPM B · VBIAS_B": "I_SIPMB $N 0 0.6u", "to MCU · ADC VBIAS_MON": "C_ADC $N 0 10p",
          "from DAC · VOUTD (trim)": "V_DAC $N 0 {VDAC}", "from USB · +5V_A": "V_USB $N 0 5"},
  analyses: [
    {id:"tran", label:"Bias and ripple (transient)", cmd:".tran 2n 40u",
     probes: [{name:"TP7 converter output", at:"tp:TP7", rel:true}, {name:"After FB3 + C22/C23", at:"pin:C22.1", rel:true}, {name:"VBIAS_A at SiPM A", at:"port:to SiPM A · VBIAS_A", rel:true},
              {name:"VBIAS_A (absolute)", at:"port:to SiPM A · VBIAS_A"}, {name:"FB node", at:"pin:R21.1"}],
     plots: [{title:"TP7 · converter output (ripple only, DC removed)", probes:["TP7 converter output"], unit:"mV", k:1e3},
             {title:"After the bead and C22/C23", probes:["After FB3 + C22/C23"], unit:"mV", k:1e3},
             {title:"VBIAS_A · ripple that SiPM A sees", probes:["VBIAS_A at SiPM A"], unit:"µV", k:1e6}],
     measures: [
       {label:"Set point from R20, R21, R22 and the DAC", f:(D, P) => BIAS_SET(P), fmt:v => fmtN(v, "V", 1, 2) + (v < 4.6 ? " (below VIN: a boost cannot go there)" : v > 40 ? " (above the 40 V parts)" : "")},
       {label:"DC bias at SiPM A", f:D => MS.at(D["VBIAS_A (absolute)"], 39e-6), fmt:v => fmtN(v, "V", 1, 2)},
       {label:"SiPM overvoltage at 21 °C", f:D => MS.at(D["VBIAS_A (absolute)"], 39e-6) - 24.45, fmt:v => fmtN(v, "V", 1, 2), target:{text:"1–5 V (SiPM operating range)", ok:v => v >= 1 && v <= 5}},
       {label:"Ripple at TP7", f:D => MS.pp(D["TP7 converter output"], 25e-6, 40e-6), fmt:v => fmtN(v, "mVpp", 1e3, 2)},
       {label:"Ripple after FB3 + C22/C23", f:D => MS.pp(D["After FB3 + C22/C23"], 25e-6, 40e-6), fmt:v => fmtN(v, "mVpp", 1e3, 3)},
       {label:"Ripple at SiPM A", f:D => MS.pp(D["VBIAS_A at SiPM A"], 25e-6, 40e-6), fmt:v => fmtN(v, "µVpp", 1e6, 2), target:{text:"< 5 mVpp (spec)", ok:v => v < 5e-3}}]},
    {id:"ac", label:"Filter response (AC)", cmd:".ac dec 40 1k 100Meg",
     probes: [{name:"After FB3 + C22/C23", at:"pin:C22.1"}, {name:"VBIAS_A", at:"port:to SiPM A · VBIAS_A"}],
     plots: [{title:"Attenuation from the converter output (TP7)", probes:["After FB3 + C22/C23", "VBIAS_A"], unit:"dB", ac:true}],
     measures: [
       {label:"At the ripple frequency, after FB3 + C22/C23", f:(D, P) => MS.db(D["After FB3 + C22/C23"], P.FRIP*1e3), fmt:v => fmtN(v, "dB", 1, 1)},
       {label:"At the ripple frequency, at SiPM A", f:(D, P) => MS.db(D["VBIAS_A"], P.FRIP*1e3), fmt:v => fmtN(v, "dB", 1, 1)}]}],
  note: "The converter's switching (U12, L1, D2, C27) is not simulated. TP7 is driven by an ideal regulator that holds the FB node at the LT3482's 1.235 V reference, so R20, R21, R22 and the DAC set the output exactly as on the real board, plus a sine ripple.",
};

SIMCFG.afe = {
  params: [NPE_P, TEMP_P],
  supplies: {"+5V_A": 5},
  ports: {"from SiPM A · coax": SIPM_PORT, "to Comparator A (+in)": "C_CMPIN $N 0 3p", "to Peak-hold A": ["R_PHIN $N 0 1Meg", "C_PHIN $N 0 3p"]},
  analyses: [{id:"tran", label:"Muon pulse", cmd:".tran 0.1n 1u 0 0.2n",
    probes: [{name:"TP1", at:"tp:TP1"}, {name:"TP2", at:"tp:TP2"}, {name:"Shaper out", at:"port:to Peak-hold A"}],
    plots: [{title:"TP1 · SiPM pulse across R1", probes:["TP1"], unit:"mV", k:1e3},
            {title:"TP2 · amplifier output (fast path to the comparator)", probes:["TP2"], unit:"V", lines:[{y:0.3125 + 0.12, label:"threshold"}]},
            {title:"Shaper output (to the peak-hold)", probes:["Shaper out"], unit:"V"}],
    measures: [
      {label:"Peak at TP1", f:D => MS.max(D.TP1), fmt:v => fmtN(v, "mV", 1e3)},
      {label:"TP2 baseline", f:D => MS.at(D.TP2, 15e-9), fmt:v => fmtN(v, "V", 1, 3)},
      {label:"TP2 pulse height", f:D => MS.max(D.TP2) - MS.at(D.TP2, 15e-9), fmt:v => fmtN(v, "V", 1, 3), target:{text:"≥ 0.24 V (2 × the 120 mV threshold)", ok:v => v >= 0.24}},
      {label:"Time above threshold at TP2", f:D => { const b = MS.at(D.TP2, 15e-9); return MS.cross(D.TP2, b + 0.12, "fall") - MS.cross(D.TP2, b + 0.12, "rise"); }, fmt:v => fmtN(v, "ns", 1e9, 0)},
      {label:"Shaper peak", f:D => MS.max(D["Shaper out"]), fmt:v => fmtN(v, "V", 1, 3)}]}],
  note: "The input is the SiPM model on its carrier, through 30 cm of 50 Ω coax. Change R4, R5 or C5 on the sheet to see gain and bandwidth move. The shaper output is only about 60 mV, because the slow SiPM pulse loses most of its height in the 100 ns CR-RC stage; if you build the pulse-height extra, give U2 a gain of about 10.",
};

SIMCFG.peak = {
  params: [{k:"AMP", label:"Input pulse height", def:0.06, unit:"V", min:0.01, max:4, step:0.01}],
  supplies: {"+5V_A": 5},
  ports: {"from AFE A shaper (U2)": "B_SHAPED $N 0 V={AMP}*max(time-200n,0)/100n*exp(1-max(time-200n,0)/100n)",
          "from MCU · PEAK_RST": "V_RST $N 0 PULSE(0 3.3 2.5u 5n 5n 200n 10u)", "to MCU · ADC peak A": "C_ADC $N 0 10p"},
  analyses: [{id:"tran", label:"One pulse", cmd:".tran 2n 3.5u",
    probes: [{name:"Input", at:"port:from AFE A shaper (U2)"}, {name:"Hold (C20)", at:"pin:C20.1"}, {name:"To ADC", at:"port:to MCU · ADC peak A"}, {name:"PEAK_RST", at:"port:from MCU · PEAK_RST"}],
    plots: [{title:"Input pulse and hold node", probes:["Input", "Hold (C20)"], unit:"V", lines:[{x:1.3e-6, label:"ADC sample"}]},
            {title:"To the ADC (buffered)", probes:["To ADC"], unit:"V"},
            {title:"PEAK_RST from the MCU", probes:["PEAK_RST"], unit:"V"}],
    measures: [
      {label:"Input peak", f:D => MS.max(D.Input), fmt:v => fmtN(v, "V", 1, 3)},
      {label:"Held value at the ADC sample (1.3 µs)", f:D => MS.at(D["To ADC"], 1.3e-6), fmt:v => fmtN(v, "V", 1, 3)},
      {label:"Hold error", f:D => MS.at(D["To ADC"], 1.3e-6)/MS.max(D.Input) - 1, fmt:v => fmtN(v, "%", 100, 1), target:{text:"constant, calibrate it out (within −10 %)", ok:v => v > -0.10 && v < 0.02}},
      {label:"After PEAK_RST", f:D => MS.at(D["To ADC"], 3.2e-6), fmt:v => fmtN(v, "V", 1, 3)}]}],
  sweeps: [{label:"Linearity sweep", param:"AMP", values:[0.03, 0.05, 0.1, 0.2, 0.3, 0.5, 1, 1.5, 2, 3], xlabel:"Input peak (V)", ylabel:"Held at ADC (V)",
    f:D => MS.at(D["To ADC"], 1.3e-6), ideal:true,
    summary:pts => { const r = pts.filter(p => isFinite(p[1])).map(p => p[1]/p[0]), lo = Math.min(...r), hi = Math.max(...r), m = (lo + hi)/2;
      return `Held ÷ input stays between ${lo.toFixed(3)} and ${hi.toFixed(3)} from ${pts[0][0]} V to ${pts[pts.length - 1][0]} V, so one calibration factor (about ${m.toFixed(3)}) is good to ±${(50*(hi - lo)/m).toFixed(1)} %.`; }}],
  note: "U10 drives C20 through D1 with feedback from the hold node, so the diode drop cancels. R19 bleeds C20 (τ ≈ 20 µs): the small constant error comes from that.",
};

SIMCFG.thr = {
  params: [{k:"CA", label:"Code, threshold A", def:865, unit:"", min:0, max:4095, step:1},
           {k:"CB", label:"Code, threshold B", def:861, unit:"", min:0, max:4095, step:1},
           {k:"CD", label:"Code, bias trim", def:2048, unit:"", min:0, max:4095, step:1}],
  supplies: {"+3V3": 3.3},
  ports: {"to Comparator A threshold": ["R_FILTA $N cmpa_pin 1k", "C_FILTA cmpa_pin 0 100n"],
          "to Comparator B threshold": ["R_FILTB $N cmpb_pin 1k", "C_FILTB cmpb_pin 0 100n"],
          "to Bias supply trim (R22)": ["R_TRIM $N fb_node 2Meg", "V_FB fb_node 0 1.235"]},
  analyses: [{id:"tran", label:"Power-up write", cmd:".tran 1u 700u",
    probes: [{name:"VOUTA", at:"port:to Comparator A threshold"}, {name:"Threshold A at the comparator pin", at:"node:cmpa_pin"}, {name:"VOUTB", at:"port:to Comparator B threshold"}, {name:"VOUTD (bias trim)", at:"port:to Bias supply trim (R22)"}],
    plots: [{title:"Threshold A: DAC output and the filtered voltage at the comparator", probes:["VOUTA", "Threshold A at the comparator pin"], unit:"mV", k:1e3},
            {title:"Threshold B and bias trim", probes:["VOUTB", "VOUTD (bias trim)"], unit:"V"}],
    measures: [
      {label:"Threshold A above the 312.5 mV baseline", f:D => MS.at(D.VOUTA, 690e-6) - 0.3125, fmt:v => fmtN(v, "mV", 1e3)},
      {label:"Threshold B above the baseline", f:D => MS.at(D.VOUTB, 690e-6) - 0.3125, fmt:v => fmtN(v, "mV", 1e3)},
      {label:"Settling at the comparator pin (to 1 %)", f:D => { const d = D["Threshold A at the comparator pin"], fin = MS.at(d, 699e-6); return MS.cross(d, 0.99*fin, "rise") - 10e-6; }, fmt:v => fmtN(v, "µs", 1e6, 0)},
      {label:"Bias trim output", f:D => MS.at(D["VOUTD (bias trim)"], 690e-6), fmt:v => fmtN(v, "V", 1, 3)}]}],
  note: "The DAC writes its codes at 10 µs (I²C itself is not simulated). 0.5 mV per code; the 1 kΩ / 100 nF filter on the comparator sheet slows the threshold to τ = 100 µs.",
};

SIMCFG.comp = {
  params: [{k:"AMP", label:"Pulse height at TP2", def:0.3, unit:"V", min:0.05, max:3, step:0.01},
           {k:"THR", label:"Threshold above baseline", def:120, unit:"mV", min:10, max:1000, step:5, spice:v => v*1e-3},
           {k:"NOISE", label:"Noise on TP2", def:3, unit:"mVpp", min:0, max:50, step:0.5, spice:v => v*1e-3}],
  supplies: {"+3V3": 3.3},
  fixed: {TRP:"8n", TFP:"230n"},
  ports: {"from AFE A (TP2)": "B_TP2 $N 0 V=0.3125+{AMP}*(exp(-max(time-20n,0)/{TFP})-exp(-max(time-20n,0)/{TRP}))/0.8552+{NOISE}/4*(sin(6.2832*37Meg*time)+sin(6.2832*61Meg*time+1))",
          "from Threshold DAC · VOUTA": "V_THR $N 0 {0.3125+THR}", "to Stretcher A (B input)": "C_STRIN $N 0 5p"},
  analyses: [{id:"tran", label:"Muon pulse with noise", cmd:".tran 0.05n 1u",
    probes: [{name:"TP2 (input)", at:"port:from AFE A (TP2)"}, {name:"Threshold (− input)", at:"pin:U3.inn"}, {name:"TP3", at:"tp:TP3"}],
    plots: [{title:"Comparator inputs", probes:["TP2 (input)", "Threshold (− input)"], unit:"V"},
            {title:"TP3 · comparator output", probes:["TP3"], unit:"V"}],
    measures: [
      {label:"Output pulses for one muon", f:D => MS.edges(D.TP3, 1.65), fmt:v => isFinite(v) ? String(v) : "—", target:{text:"exactly 1 (more = chatter)", ok:v => v === 1}},
      {label:"Delay, threshold crossing → TP3", f:(D, P) => MS.cross(D.TP3, 1.65, "rise") - MS.cross(D["TP2 (input)"], 0.3125 + P.THR*1e-3, "rise"), fmt:v => fmtN(v, "ns", 1e9, 1)},
      {label:"TP3 pulse width", f:D => MS.cross(D.TP3, 1.65, "fall") - MS.cross(D.TP3, 1.65, "rise"), fmt:v => fmtN(v, "ns", 1e9, 0)}]}],
  note: "TP2 is a muon-like pulse plus two sine tones standing in for noise. Raise the noise, or set R11 to 100 MΩ (no hysteresis), and watch TP3 chatter on the slow falling edge.",
};

SIMCFG.stretch = {
  params: [{k:"TW", label:"Comparator pulse width", def:250, unit:"ns", min:5, max:2000, step:5, spice:v => v*1e-9}],
  supplies: {"+3V3": 3.3},
  values: {},
  ports: {"from Comparator A (TP3)": "V_CMP $N 0 PULSE(0 3.3 20n 1n 1n {TW} 3u)", "to Coincidence AND (A)": "C_ANDIN $N 0 5p", "to MCU · singles A": "C_MCUIN $N 0 5p"},
  labels: {"from comparator": "V_CMP2 $N 0 PULSE(0 3.3 20n 1n 1n {TW} 3u)", "pulse out → AND and MCU": "C_FBOUT $N 0 5p"},
  analyses: [{id:"tran", label:"One comparator pulse", cmd:".tran 0.05n 600n",
    probes: [{name:"From comparator", at:"port:from Comparator A (TP3)"}, {name:"TP4", at:"tp:TP4"}, {name:"Rext/Cext (timing)", at:"pin:U4.Rext/Cext"},
             {name:"Fallback out", at:"label:pulse out → AND and MCU"}, {name:"C13 (delay)", at:"pin:C13.1"}],
    plots: [{title:"Input from the comparator", probes:["From comparator"], unit:"V"},
            {title:"TP4 · 74LVC1G123 output and its timing node", probes:["TP4", "Rext/Cext (timing)"], unit:"V"},
            {title:"Fallback one-shot (U5 + U6)", probes:["Fallback out", "C13 (delay)"], unit:"V"}],
    measures: [
      {label:"TP4 width (74LVC1G123)", f:D => MS.cross(D.TP4, 1.65, "fall") - MS.cross(D.TP4, 1.65, "rise"), fmt:v => fmtN(v, "ns", 1e9, 1), target:{text:"50 ± 5 ns", ok:v => Math.abs(v - 50e-9) <= 5e-9}},
      {label:"Fallback width (U5 + U6)", f:D => MS.cross(D["Fallback out"], 1.65, "fall") - MS.cross(D["Fallback out"], 1.65, "rise"), fmt:v => fmtN(v, "ns", 1e9, 1), target:{text:"50 ± 5 ns", ok:v => Math.abs(v - 50e-9) <= 5e-9}}]}],
  note: "The 74LVC1G123 model is ideal (width = Rext·Cext); at a few tens of pF the real part adds an offset, so trim RV1 on the bench. The fallback circuit is simulated gate by gate.",
};

SIMCFG.coinc = {
  params: [{k:"DT", label:"Δt, B after A", def:12, unit:"ns", min:-90, max:90, step:1, spice:v => v*1e-9}],
  supplies: {"+3V3": 3.3},
  ports: {"from Stretcher A (TP4)": "V_A $N 0 PULSE(0 3.3 100n 1n 1n 49n 3u)",
          "from Stretcher B (TP4)": "V_B $N 0 PULSE(0 3.3 {100n+DT} 1n 1n 49n 3u)",
          "from MCU · LATCH_CLR": "V_CLR $N 0 PULSE(3.3 0 400n 1n 1n 30n 3u)",
          "from MCU · TEST_PULSE": "V_TEST $N 0 PULSE(0 3.3 600n 1n 1n 100n 3u)",
          "to MCU · TIM2 capture": "C_CAP $N 0 5p"},
  labels: {"→ AFE A input (at R1)": "R_AFEA $N 0 50", "→ AFE B input (at R101)": "R_AFEB $N 0 50"},
  analyses: [{id:"tran", label:"One event", cmd:".tran 0.05n 800n",
    probes: [{name:"A", at:"port:from Stretcher A (TP4)"}, {name:"B", at:"port:from Stretcher B (TP4)"}, {name:"TP5 (AND)", at:"tp:TP5"},
             {name:"Q to MCU", at:"port:to MCU · TIM2 capture"}, {name:"LATCH_CLR", at:"port:from MCU · LATCH_CLR"}, {name:"Test pulse at AFE A", at:"label:→ AFE A input (at R1)"}],
    plots: [{title:"Stretched pulses A and B", probes:["A", "B"], unit:"V"}, {title:"TP5 · AND output", probes:["TP5 (AND)"], unit:"V"},
            {title:"Latch Q (to the MCU) and LATCH_CLR", probes:["Q to MCU", "LATCH_CLR"], unit:"V"},
            {title:"Self-test pulse injected into AFE A (across its 50 Ω)", probes:["Test pulse at AFE A"], unit:"mV", k:1e3}],
    measures: [
      {label:"Coincidence latched", f:D => MS.at(D["Q to MCU"], 350e-9) > 1.65 ? 1 : 0, fmt:v => v ? "yes" : "no", target:{text:"yes while |Δt| < 50 ns", ok:(v, P) => !!v === (Math.abs(P.DT) < 50)}},
      {label:"AND pulse width", f:D => { const r = MS.cross(D["TP5 (AND)"], 1.65, "rise"); return isFinite(r) ? MS.cross(D["TP5 (AND)"], 1.65, "fall") - r : 0; }, fmt:v => fmtN(v, "ns", 1e9, 1)},
      {label:"Latch cleared by LATCH_CLR", f:D => MS.at(D["Q to MCU"], 500e-9) < 0.5 ? 1 : 0, fmt:v => v ? "yes" : "no", target:{text:"yes", ok:v => !!v}},
      {label:"Test charge into AFE A", f:D => MS.integ(D["Test pulse at AFE A"], 590e-9, 690e-9)/50, fmt:v => fmtN(v, "pC", 1e12, 1)}]}],
  sweeps: [{label:"Window sweep", param:"DT", values:[-90,-80,-70,-60,-55,-50,-45,-40,-30,-20,-10,0,10,20,30,40,45,50,55,60,70,80,90], xlabel:"Δt, B after A (ns)", ylabel:"Latched (1 = yes)",
    f:D => MS.at(D["Q to MCU"], 350e-9) > 1.65 ? 1 : 0,
    summary:pts => { const on = pts.filter(p => p[1] === 1).map(p => p[0]); if (!on.length) return "No coincidence anywhere in the sweep.";
      const lo = Math.min(...on), hi = Math.max(...on), ol = Math.max(...pts.filter(p => p[0] < lo).map(p => p[0])), oh = Math.min(...pts.filter(p => p[0] > hi).map(p => p[0]));
      return `Latched for Δt from ${lo} to ${hi} ns but not at ${ol} or ${oh} ns, so the window is between ${hi - lo} and ${oh - ol} ns wide. The brief allows up to 100 ns.`; }}],
  note: "A and B are the 50 ns stretched pulses. Sweep Δt to measure the coincidence window: it should close at about ±50 ns, giving the 100 ns window from the brief.",
};
