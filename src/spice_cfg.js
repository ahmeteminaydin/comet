
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
  avg(d, t0, t1){ return MS.integ(d, t0, t1)/(t1 - t0); },
  db(d, f){ return MS.at({t:d.t, v:d.v}, f); },
};
const fmtN = (v, u, k = 1, dp = 1) => isFinite(v) ? `${(v*k).toFixed(dp)} ${u}` : "—";
// 30 cm of 50 ohm coax (1.5 ns) as five LC sections with a little loss. A lossless T line would be
// exact, but ngspice puts a breakpoint at every echo of its own rounding noise and can stall for minutes.
const COAX = (a, b) => ["* 30 cm of 50 ohm coax, 1.5 ns: five LC sections (15 nH, 6 pF, 0.2 ohm each)"].concat(
  [1, 2, 3, 4, 5].flatMap(i => { const n0 = i === 1 ? a : `cx${i - 1}`, n1 = i === 5 ? b : `cx${i}`;
    return [`L_CX${i} ${n0} cxl${i} 15n`, `R_CX${i} cxl${i} ${n1} 0.2`, `C_CX${i} ${n1} 0 6p`]; }));
const SIPM_PORT = (n, p) => [                      // the detector as seen through 30 cm of coax
  `V_SIPMBIAS sipm_vb 0 27.0`, `R_CARRIER sipm_vb sipm_k 1k`, `C_CARRIER sipm_k 0 100n`,
  `X_SIPM sipm_k sipm_a MICROFC60035_BEH NPE={NPE} T0=20n TEMP={TEMP}`, ...COAX("sipm_a", "$N")];
const NPE_P = {k:"NPE", label:"Photoelectrons per muon", def:140, unit:"p.e.", min:1, max:2000, step:10};
const TEMP_P = {k:"TEMP", label:"SiPM temperature", def:21, unit:"°C", min:-10, max:50, step:1};

const SIMCFG = {};
const IDEAL_SUPPLY = "supply decoupling; the simulated supply is ideal, so it has no effect here";

SIMCFG.sipm = {
  params: [NPE_P, TEMP_P, {k:"VBIAS", label:"Bias from the supply", def:27.0, unit:"V", min:24, max:30, step:0.05}],
  exclude: ["U31"], excludeWhy: "the temperature sensor has no effect on the pulse",
  inert: {C31: "decoupling for the temperature sensor, which is not simulated"},
  ports: {"VBIAS_A · from Bias": "V_BIAS $N 0 {VBIAS}", "+3V3 · from USB/LDO": "V_3V3 $N 0 3.3",
          "coax to AFE A (R1, TP1)": [...COAX("$N", "tp1"), "R1_AFE tp1 0 50"]},
  analyses: [{id:"tran", label:"Muon pulse", cmd:".tran 0.1n 1u 0 0.2n",
    probes: [{name:"TP1 at the AFE (across R1)", at:"node:tp1"}, {name:"Cathode change", at:"pin:SiPM1.K", rel:true}],
    plots: [{title:"TP1 · pulse at the 50 Ω termination on the AFE", probes:["TP1 at the AFE (across R1)"], unit:"mV", k:1e3},
            {title:"SiPM cathode: bias droop while C30 supplies the pulse", probes:["Cathode change"], unit:"mV", k:1e3}],
    measures: [
      {label:"Peak at TP1", f:D => MS.max(D["TP1 at the AFE (across R1)"]), fmt:v => fmtN(v, "mV", 1e3)},
      {label:"One photoelectron at TP1", f:(D, P) => MS.max(D["TP1 at the AFE (across R1)"])/P.NPE, fmt:v => fmtN(v, "µV", 1e6, 0)},
      {label:"Charge delivered", f:D => MS.integ(D["TP1 at the AFE (across R1)"], 0, 1e-6)/50, fmt:v => fmtN(v, "pC", 1e12)},
      {label:"Decay time (peak → 37 %)", f:D => { const d = D["TP1 at the AFE (across R1)"], m = MS.max(d), t = MS.tmax(d); return MS.cross(d, m/Math.E, "fall", 1, t) - t; }, fmt:v => fmtN(v, "ns", 1e9, 0)},
      {label:"Overvoltage", f:(D, P) => P.VBIAS - (24.45 + 0.0215*(P.TEMP - 21)), fmt:v => fmtN(v, "V", 1, 2), target:{text:"1–5 V (SiPM range)", ok:v => v >= 1 && v <= 5}},
      {label:"Cathode droop", f:D => -MS.min(D["Cathode change"]), fmt:v => fmtN(v, "mV", 1e3, 2)}]}],
  note: "The SiPM model lumps fired and passive microcells (≈3.4 nF in total). That capacitance discharging through the 50 Ω termination sets the slow decay. A single photoelectron is only about 0.1 mV here, so look for single-photon steps after the AFE (TP2, about 1.6 mV each), not on a bare 50 Ω scope input. Parameters are approximate: compare with the real pulse in step 2 of the build order.",
};

const BV = r => siNum(SIMV.bias.vals[r]);
SIMCFG.bias = {
  params: [{k:"VDAC", label:"DAC output VOUTD", def:1.876, unit:"V", min:0, max:2.048, step:0.001},
           {k:"VDROP", label:"Monitor drop MONIN → APD", def:5, unit:"V", min:0, max:8, step:0.1},
           {k:"ISIPM", label:"Current per SiPM", def:1, unit:"µA", min:0, max:200, step:0.5, spice:v => v*1e-6},
           {k:"VRIP", label:"Converter ripple at VOUT2", def:20, unit:"mVpp", min:0, max:500, step:5, spice:v => v*1e-3},
           {k:"FRIP", label:"Ripple frequency", def:1100, unit:"kHz", min:1, max:5000, step:10, spice:v => v*1e3}],
  exclude: ["U12", "L1", "C27", "C28", "C29", "C21"],
  excludeWhy: "the LT3482's switching, doubler and monitor are replaced by ideal behaviour: VOUT2 is regulated so FB equals CTRL (or 1.235 V above 1.2 V), APD = MONIN minus the monitor drop, and MON sources 20 % of the APD current",
  values: {FB3:"1u"}, suffix: {FB3:" bead"},
  inert: {C26: "filters steps on CTRL; the simulated DAC holds a constant value", C33: "smooths the MON reading; the simulated SiPM current is constant",
          C34: "charge reservoir for the ADC's sampling switch; the ADC itself is not simulated"},
  supplies: {"+5V_A": 5},
  drive: {
    "pin:U12.VOUT2": a => a === "ac" ? "V_CONV $N 0 DC 32 AC 1" : [
      "* ideal LT3482 regulation: FB follows CTRL (below 1.2 V) or the internal 1.235 V reference",
      "B_ERR 0 conv_int I=1m*(min(V(@[pin:U12.CTRL]),1.235)-V(@[pin:U12.FB]))", "C_INT conv_int 0 0.72n", "R_INT conv_int 0 1G",
      "B_CONV $N 0 V=max(4.3,min(90,V(conv_int)))+{VRIP}/2*sin(6.2832*{FRIP}*time)*(1-exp(-time/2u))"],
    "pin:U12.APD": a => ["* APD current monitor: APD = MONIN - drop; MON sources 20 % of the APD current",
      "B_MDROP apd_int 0 V=V(@[pin:U12.MONIN])-{VDROP}", "V_APDSENSE apd_int $N 0"],
    "pin:U12.MON": a => "B_MON 0 $N I=0.2*I(V_APDSENSE)"},
  ports: {"to SiPM A · VBIAS_A": "I_SIPMA $N 0 {ISIPM}", "to SiPM B · VBIAS_B": "I_SIPMB $N 0 {ISIPM}",
          "to MCU · ADC VBIAS_MON": "C_ADC1 $N 0 10p", "to MCU · ADC IBIAS_MON": "C_ADC2 $N 0 10p", "from DAC · VOUTD": "V_DAC $N 0 {VDAC}"},
  analyses: [
    {id:"tran", label:"Bias and ripple (transient)", cmd:".tran 2n 40u",
     probes: [{name:"VOUT2", at:"tp:TP7"}, {name:"TP7 ripple", at:"tp:TP7", rel:true}, {name:"After FB3 + C22/C23", at:"pin:C22.1", rel:true},
              {name:"VBIAS_A ripple", at:"port:to SiPM A · VBIAS_A", rel:true}, {name:"VBIAS_B ripple", at:"port:to SiPM B · VBIAS_B", rel:true}, {name:"VBIAS_A", at:"port:to SiPM A · VBIAS_A"},
              {name:"VBIAS_B", at:"port:to SiPM B · VBIAS_B"}, {name:"VBIAS_MON", at:"port:to MCU · ADC VBIAS_MON"},
              {name:"IBIAS_MON", at:"port:to MCU · ADC IBIAS_MON"}, {name:"CTRL", at:"pin:U12.CTRL"}],
     plots: [{title:"TP7 · VOUT2 ripple (DC removed)", probes:["TP7 ripple"], unit:"mV", k:1e3},
             {title:"After the bead and C22/C23", probes:["After FB3 + C22/C23"], unit:"mV", k:1e3},
             {title:"VBIAS_A and VBIAS_B · ripple that the SiPMs see", probes:["VBIAS_A ripple", "VBIAS_B ripple"], unit:"µV", k:1e6},
             {title:"Readbacks for the firmware: VBIAS_MON and IBIAS_MON", probes:["VBIAS_MON", "IBIAS_MON"], unit:"V"}],
     measures: [
       {label:"CTRL pin (VOUTD ÷ 2)", f:D => MS.at(D.CTRL, 39e-6), fmt:v => fmtN(v, "V", 1, 3) + (v > 1.2 && v < 1.5 ? " (1.2–1.5 V is undefined in the datasheet)" : v >= 1.5 ? " (internal 1.235 V reference takes over)" : "")},
       {label:"VOUT2 = V_CTRL × (1 + R20/R21)", f:D => Math.min(MS.at(D.CTRL, 39e-6), 1.235)*(1 + BV("R20")/BV("R21")), fmt:v => fmtN(v, "V", 1, 2) + (v < 4.3 ? " (below VIN: the boost cannot go there)" : v > 48 ? " (above the 48 V switch rating of VOUT1)" : "")},
       {label:"DC bias at SiPM A", f:D => MS.avg(D.VBIAS_A, 25e-6, 40e-6), fmt:v => fmtN(v, "V", 1, 2)},
       {label:"SiPM A overvoltage at 21 °C", f:D => MS.avg(D.VBIAS_A, 25e-6, 40e-6) - 24.45, fmt:v => fmtN(v, "V", 1, 2), target:{text:"1–5 V (SiPM operating range)", ok:v => v >= 1 && v <= 5}},
       {label:"DC bias at SiPM B", f:D => MS.avg(D.VBIAS_B, 25e-6, 40e-6), fmt:v => fmtN(v, "V", 1, 2)},
       {label:"VBIAS_MON at the ADC pin", f:D => MS.avg(D.VBIAS_MON, 25e-6, 40e-6), fmt:v => fmtN(v, "V", 1, 3), target:{text:"0.5–3.0 V (inside the 3.3 V ADC range)", ok:v => v >= 0.5 && v <= 3.0}},
       {label:"Firmware reads VBIAS_MON as", f:D => MS.avg(D.VBIAS_MON, 25e-6, 40e-6)*(BV("R25") + BV("R26"))/BV("R26"), fmt:v => fmtN(v, "V", 1, 2)},
       {label:"IBIAS_MON at the ADC pin", f:D => MS.avg(D.IBIAS_MON, 25e-6, 40e-6), fmt:v => fmtN(v, "V", 1, 3), target:{text:"≤ 3.0 V (inside the ADC range)", ok:v => v <= 3.0}},
       {label:"Firmware reads IBIAS_MON as (SiPMs only)", f:D => MS.avg(D.IBIAS_MON, 25e-6, 40e-6)/(0.2*BV("R35")) - MS.avg(D.VBIAS_A, 25e-6, 40e-6)/(BV("R25") + BV("R26")), fmt:v => fmtN(v, "µA", 1e6, 2)},
       {label:"Ripple at TP7", f:D => MS.pp(D["TP7 ripple"], 25e-6, 40e-6), fmt:v => fmtN(v, "mVpp", 1e3, 2)},
       {label:"Ripple after FB3 + C22/C23", f:D => MS.pp(D["After FB3 + C22/C23"], 25e-6, 40e-6), fmt:v => fmtN(v, "mVpp", 1e3, 3)},
       {label:"Ripple at SiPM A", f:D => MS.pp(D["VBIAS_A ripple"], 25e-6, 40e-6), fmt:v => fmtN(v, "µVpp", 1e6, 2), target:{text:"< 5 mVpp (spec)", ok:v => v < 5e-3}},
       {label:"Ripple at SiPM B", f:D => MS.pp(D["VBIAS_B ripple"], 25e-6, 40e-6), fmt:v => fmtN(v, "µVpp", 1e6, 2), target:{text:"< 5 mVpp (spec)", ok:v => v < 5e-3}}]},
    {id:"ac", label:"Filter response (AC)", cmd:".ac dec 40 100 100Meg",
     probes: [{name:"After FB3 + C22/C23", at:"pin:C22.1"}, {name:"VBIAS_A", at:"port:to SiPM A · VBIAS_A"}, {name:"VBIAS_B", at:"port:to SiPM B · VBIAS_B"}],
     plots: [{title:"Attenuation from VOUT2 (TP7)", probes:["After FB3 + C22/C23", "VBIAS_A", "VBIAS_B"], unit:"dB", ac:true}],
     measures: [
       {label:"At the ripple frequency, after FB3 + C22/C23", f:(D, P) => MS.db(D["After FB3 + C22/C23"], P.FRIP*1e3), fmt:v => fmtN(v, "dB", 1, 1)},
       {label:"At the ripple frequency, at SiPM A", f:(D, P) => MS.db(D["VBIAS_A"], P.FRIP*1e3), fmt:v => fmtN(v, "dB", 1, 1)},
       {label:"At 10 kHz (pulse skipping), at SiPM A", f:D => MS.db(D["VBIAS_A"], 1e4), fmt:v => fmtN(v, "dB", 1, 1)},
       {label:"At 1 kHz, at SiPM A", f:D => MS.db(D["VBIAS_A"], 1e3), fmt:v => fmtN(v, "dB", 1, 1)},
       {label:"At the ripple frequency, at SiPM B", f:(D, P) => MS.db(D["VBIAS_B"], P.FRIP*1e3), fmt:v => fmtN(v, "dB", 1, 1)}]}],
  note: "The LT3482's switching is not simulated. VOUT2 is held so that FB equals CTRL (the datasheet's CTRL mode), the current monitor drops the voltage by the amount you set and mirrors 20 % of the current to MON. Try a smaller monitor drop or more SiPM current and watch the bias move; in the real system the firmware loop corrects it using VBIAS_MON. At very light loads a boost converter may skip pulses, so the ripple can move from 1.1 MHz down to kHz; the AC tab shows the filter there.",
};

SIMCFG.afe = {
  params: [NPE_P, TEMP_P],
  supplies: {"+3V3_A": 3.3},
  inert: {C3: IDEAL_SUPPLY, C4: IDEAL_SUPPLY},
  ports: {"from SiPM A · coax": SIPM_PORT, "to Comparator A (+in)": "C_CMPIN $N 0 3p", "to Peak-hold A": ["R_PHIN $N 0 1Meg", "C_PHIN $N 0 3p"]},
  analyses: [{id:"tran", label:"Muon pulse", cmd:".tran 0.1n 1u 0 0.2n",
    probes: [{name:"TP1", at:"tp:TP1"}, {name:"TP2", at:"tp:TP2"}, {name:"Shaper out", at:"port:to Peak-hold A"}],
    plots: [{title:"TP1 · SiPM pulse across R1", probes:["TP1"], unit:"mV", k:1e3},
            {title:"TP2 · amplifier output (fast path to the comparator)", probes:["TP2"], unit:"V", lines:[{y:0.300 + 0.12, label:"threshold"}]},
            {title:"Shaper output (to the peak-hold)", probes:["Shaper out"], unit:"V"}],
    measures: [
      {label:"Peak at TP1", f:D => MS.max(D.TP1), fmt:v => fmtN(v, "mV", 1e3)},
      {label:"TP2 baseline", f:D => MS.at(D.TP2, 15e-9), fmt:v => fmtN(v, "V", 1, 3), target:{text:"≥ 0.15 V (the OPA356 swings to 0.1 V)", ok:v => v >= 0.15}},
      {label:"TP2 pulse height", f:D => MS.max(D.TP2) - MS.at(D.TP2, 15e-9), fmt:v => fmtN(v, "V", 1, 3), target:{text:"≥ 0.18 V (1.5 × the 120 mV threshold)", ok:v => v >= 0.18}},
      {label:"One photoelectron at TP2", f:(D, P) => (MS.max(D.TP2) - MS.at(D.TP2, 15e-9))/P.NPE, fmt:v => fmtN(v, "mV", 1e3, 2)},
      {label:"Time above threshold at TP2", f:D => { const b = MS.at(D.TP2, 15e-9); return MS.cross(D.TP2, b + 0.12, "fall") - MS.cross(D.TP2, b + 0.12, "rise"); }, fmt:v => fmtN(v, "ns", 1e9, 0)},
      {label:"Shaper baseline", f:D => MS.at(D["Shaper out"], 15e-9), fmt:v => fmtN(v, "V", 1, 3), target:{text:"≥ 0.15 V (inside U2's swing)", ok:v => v >= 0.15}},
      {label:"Shaper pulse height", f:D => MS.max(D["Shaper out"]) - MS.at(D["Shaper out"], 15e-9), fmt:v => fmtN(v, "V", 1, 3)}]}],
  note: "The input is the SiPM model on its carrier, through 30 cm of 50 Ω coax. All op-amps run from +3V3_A, so TP2 can never drive the 3.3 V comparator past its supply. Change R4 or R5 to move the gain, or R27/R28 for the shaper gain. C1, C2, C6 and C9 only set DC levels and very low corner frequencies, so the pulses barely change unless you make them hundreds of times smaller; R2 and R3 move the baseline, which must stay above the op-amps' 0.1 V output limit.",
};

SIMCFG.peak = {
  params: [{k:"AMP", label:"Pulse height above the 0.3 V baseline", def:0.37, unit:"V", min:0.01, max:1.8, step:0.01}],
  supplies: {"+3V3_A": 3.3},
  inert: {R39: "pull-down for the MCU's reset state; the simulated PEAK_RST line is always driven"},
  ports: {"from AFE A shaper (U2)": "B_SHAPED $N 0 V=0.3+{AMP}*max(time-200n,0)/100n*exp(1-max(time-200n,0)/100n)",
          "from MCU · PEAK_RST": "V_RST $N 0 PULSE(0 3.3 2.5u 5n 5n 200n 10u)", "to MCU · ADC peak A": "C_ADC $N 0 10p"},
  analyses: [{id:"tran", label:"One pulse", cmd:".tran 2n 3.5u",
    probes: [{name:"Input", at:"port:from AFE A shaper (U2)"}, {name:"Hold (C20)", at:"pin:C20.1"}, {name:"To ADC", at:"port:to MCU · ADC peak A"}, {name:"PEAK_RST", at:"port:from MCU · PEAK_RST"}],
    plots: [{title:"Input pulse and hold node", probes:["Input", "Hold (C20)"], unit:"V", lines:[{x:1.3e-6, label:"ADC sample"}]},
            {title:"To the ADC (buffered)", probes:["To ADC"], unit:"V"},
            {title:"PEAK_RST from the MCU", probes:["PEAK_RST"], unit:"V"}],
    measures: [
      {label:"Reading between events (baseline)", f:D => MS.at(D["To ADC"], 150e-9), fmt:v => fmtN(v, "V", 1, 3)},
      {label:"Input peak", f:D => MS.max(D.Input), fmt:v => fmtN(v, "V", 1, 3)},
      {label:"Held value at the ADC sample (1.3 µs)", f:D => MS.at(D["To ADC"], 1.3e-6), fmt:v => fmtN(v, "V", 1, 3), target:{text:"≤ 3.3 V (STM32 ADC range)", ok:v => v <= 3.3}},
      {label:"Held ÷ input peak", f:D => MS.at(D["To ADC"], 1.3e-6)/MS.max(D.Input) - 1, fmt:v => fmtN(v, "%", 100, 1), target:{text:"constant, calibrate it out (within −10 %)", ok:v => v > -0.10 && v < 0.02}},
      {label:"U10 current while PEAK_RST is high", f:D => MS.at(D["Hold (C20)"], 2.65e-6)/(siNum(SIMV.peak.vals.R18) + 1), fmt:v => fmtN(v, "mA", 1e3, 1), target:{text:"≤ 20 mA (U10 stays in control)", ok:v => v <= 0.020}},
      {label:"After PEAK_RST", f:D => MS.at(D["To ADC"], 3.2e-6), fmt:v => fmtN(v, "V", 1, 3), target:{text:"back at the 0.300 V baseline (± 10 mV)", ok:v => Math.abs(v - 0.300) <= 0.010}}]}],
  sweeps: [{label:"Linearity sweep", param:"AMP", values:[0.03, 0.05, 0.1, 0.2, 0.4, 0.6, 0.9, 1.2, 1.5, 1.7], xlabel:"Pulse above baseline (V)", ylabel:"Reading − baseline (V)",
    f:D => MS.at(D["To ADC"], 1.3e-6) - MS.at(D["To ADC"], 150e-9), ideal:true,
    summary:pts => { const ok = pts.filter(p => isFinite(p[1]) && p[0] + 0.3 < 1.75);
      const n = ok.length, sx = ok.reduce((a, p) => a + p[0], 0), sy = ok.reduce((a, p) => a + p[1], 0), sxx = ok.reduce((a, p) => a + p[0]*p[0], 0), sxy = ok.reduce((a, p) => a + p[0]*p[1], 0);
      const b = (n*sxy - sx*sy)/(n*sxx - sx*sx), a = (sy - b*sx)/n, dev = Math.max(...ok.map(p => Math.abs(p[1] - (a + b*p[0]))));
      const top = pts[pts.length - 1], clip = top[1] < (a + b*top[0]) - 0.02;
      return `Reading − baseline = ${b.toFixed(3)} × pulse ${a < 0 ? "−" : "+"} ${Math.abs(a*1e3).toFixed(0)} mV, straight to within ${(dev*1e3).toFixed(1)} mV up to ${ok[ok.length - 1][0]} V, so a two-point calibration (gain and offset) is enough.${clip ? ` Above about 1.5 V the input passes the OPA356's common-mode limit (1.8 V on a 3.3 V supply) and clips.` : ""}`; }}],
  note: "U10 drives C20 through D1 with feedback from the hold node, so the diode drop cancels. R19 bleeds C20 (τ ≈ 20 µs), which makes the reading a few percent low but in a straight line. The input idles at the 0.3 V baseline, so the reading between events is the baseline. Set R18 to a very small value to see why it is there: SW1 then shorts C20, U10 drives its full output current into the switch and C20 overshoots when the switch opens.",
};

SIMCFG.thr = {
  params: [{k:"CA", label:"Code, threshold A", def:840, unit:"", min:0, max:4095, step:1},
           {k:"CB", label:"Code, threshold B", def:836, unit:"", min:0, max:4095, step:1},
           {k:"CD", label:"Code, bias (VOUTD)", def:3752, unit:"", min:0, max:4095, step:1}],
  supplies: {"+3V3": 3.3},
  inert: {R15: "I²C pull-up; the I²C bus is not simulated", R16: "I²C pull-up; the I²C bus is not simulated", C18: IDEAL_SUPPLY, C19: IDEAL_SUPPLY},
  ports: {"to Comparator A threshold": ["R_FILTA $N cmpa_pin 1k", "C_FILTA cmpa_pin 0 100n"],
          "to Comparator B threshold": ["R_FILTB $N cmpb_pin 1k", "C_FILTB cmpb_pin 0 100n"],
          "to Bias CTRL divider (R22)": ["R_CTRLTOP $N ctrl_pin 10k", "R_CTRLBOT ctrl_pin 0 10k"]},
  analyses: [{id:"tran", label:"Power-up write", cmd:".tran 1u 700u",
    probes: [{name:"VOUTA", at:"port:to Comparator A threshold"}, {name:"Threshold A at the comparator pin", at:"node:cmpa_pin"}, {name:"VOUTB", at:"port:to Comparator B threshold"},
             {name:"VOUTD", at:"port:to Bias CTRL divider (R22)"}, {name:"CTRL pin", at:"node:ctrl_pin"}],
    plots: [{title:"Threshold A: DAC output and the filtered voltage at the comparator", probes:["VOUTA", "Threshold A at the comparator pin"], unit:"mV", k:1e3},
            {title:"Threshold B, VOUTD and the LT3482 CTRL pin", probes:["VOUTB", "VOUTD", "CTRL pin"], unit:"V"}],
    measures: [
      {label:"Threshold A above the 300 mV baseline", f:D => MS.at(D.VOUTA, 690e-6) - 0.300, fmt:v => fmtN(v, "mV", 1e3)},
      {label:"Threshold B above the baseline", f:D => MS.at(D.VOUTB, 690e-6) - 0.300, fmt:v => fmtN(v, "mV", 1e3)},
      {label:"Settling at the comparator pin (to 1 %)", f:D => { const d = D["Threshold A at the comparator pin"], fin = MS.at(d, 699e-6); return MS.cross(d, 0.99*fin, "rise") - 10e-6; }, fmt:v => fmtN(v, "µs", 1e6, 0)},
      {label:"CTRL pin", f:D => MS.at(D["CTRL pin"], 690e-6), fmt:v => fmtN(v, "V", 1, 3), target:{text:"below 1.2 V (CTRL mode)", ok:v => v < 1.2}},
      {label:"VOUT2 this sets (× 34.1)", f:D => MS.at(D["CTRL pin"], 690e-6)*34.11, fmt:v => fmtN(v, "V", 1, 2)}]}],
  note: "The DAC writes its codes at 10 µs (I²C itself is not simulated). 0.5 mV per code; the 1 kΩ / 100 nF filter on the comparator sheet slows the threshold to τ = 100 µs. At power-up the factory EEPROM codes are 0, so the outputs start at 0 V until the firmware writes them.",
};

const BUMP = (t, a) => `${a}*(exp(-max(time-${t},0)/230n)-exp(-max(time-${t},0)/{TRP}))/0.8552`;
SIMCFG.comp = {
  params: [{k:"AMP", label:"Pulse height at TP2", def:0.23, unit:"V", min:0.05, max:2.8, step:0.01},
           {k:"THR", label:"Threshold above baseline", def:120, unit:"mV", min:10, max:1000, step:5, spice:v => v*1e-3},
           {k:"NOISE", label:"Noise on TP2", def:3, unit:"mVpp", min:0, max:50, step:0.5, spice:v => v*1e-3},
           {k:"DCPE", label:"Dark counts on the tail", def:3, unit:"p.e. each", min:0, max:20, step:1}],
  supplies: {"+3V3": 3.3},
  fixed: {TRP:"8n", TFP:"230n", MVPE:"1.6m"},
  inert: {R12: "threshold filter; its effect (slow, quiet threshold) is simulated on the Threshold DAC sheet", C11: "threshold filter; its effect is simulated on the Threshold DAC sheet", C10: IDEAL_SUPPLY},
  // two dark-count pulses placed just after the pulse falls back through the threshold: the worst case for re-triggering
  ports: {"from AFE A (TP2)": (a, P) => { const x = P.THR*1e-3*0.8552/P.AMP, tf = 20e-9 + (x < 1 ? -230e-9*Math.log(x) : 200e-9);
            return "B_TP2 $N 0 V=0.300+{AMP}*(exp(-max(time-20n,0)/{TFP})-exp(-max(time-20n,0)/{TRP}))/0.8552+{NOISE}/4*(sin(6.2832*37Meg*time)+sin(6.2832*61Meg*time+1))"
              + [tf + 4e-9, tf + 30e-9].map(t => "+" + BUMP(spiceNum(t), "{DCPE*MVPE}")).join(""); },
          "from Threshold DAC · VOUTA": "V_THR $N 0 {0.300+THR}", "to Stretcher A (B input)": "C_STRIN $N 0 5p"},
  analyses: [{id:"tran", label:"Muon pulse with noise", cmd:".tran 0.05n 1u",
    probes: [{name:"TP2 (input)", at:"port:from AFE A (TP2)"}, {name:"Threshold (− input)", at:"pin:U3.inn"}, {name:"TP3", at:"tp:TP3"}],
    plots: [{title:"Comparator inputs (dark counts ride on the falling tail)", probes:["TP2 (input)", "Threshold (− input)"], unit:"V"},
            {title:"TP3 · comparator output", probes:["TP3"], unit:"V"}],
    measures: [
      {label:"Output pulses for one muon", f:D => MS.edges(D.TP3, 1.65), fmt:v => isFinite(v) ? String(v) : "—", target:{text:"exactly 1 (more = double counting)", ok:v => v === 1}},
      {label:"Delay, threshold crossing → TP3", f:(D, P) => MS.cross(D.TP3, 1.65, "rise") - MS.cross(D["TP2 (input)"], 0.300 + P.THR*1e-3, "rise"), fmt:v => fmtN(v, "ns", 1e9, 1)},
      {label:"TP3 pulse width", f:D => MS.cross(D.TP3, 1.65, "fall") - MS.cross(D.TP3, 1.65, "rise"), fmt:v => fmtN(v, "ns", 1e9, 0)}]}],
  note: "TP2 is a muon-like pulse plus noise, with two dark-count pulses placed just after the pulse falls back through the threshold, the worst moment for re-triggering (≈1.6 mV per photoelectron, as simulated on the AFE sheet). With the TLV3501's own 6 mV of hysteresis (set R11 to 100 MΩ) it takes dark pulses of about 8 photoelectrons to make it fire again; with R10/R11's extra 3 mV it still gives one pulse at 10. Real dark counts are 1–2 photoelectrons, so both have margin; R10/R11 buy more for two resistors.",
};

SIMCFG.stretch = {
  params: [{k:"TW", label:"Comparator pulse width", def:220, unit:"ns", min:5, max:2000, step:5, spice:v => v*1e-9}],
  supplies: {"+3V3": 3.3},
  ports: {"from Comparator A (TP3)": "V_CMP $N 0 PULSE(0 3.3 20n 1n 1n {TW} 3u)", "to Coincidence AND (A)": "C_ANDIN $N 0 5p", "to MCU · singles A": "C_MCUIN $N 0 5p"},
  analyses: [{id:"tran", label:"One comparator pulse", cmd:".tran 0.05n 600n",
    probes: [{name:"From comparator", at:"port:from Comparator A (TP3)"}, {name:"TP4", at:"tp:TP4"}, {name:"C13 (delay)", at:"pin:C13.1"}, {name:"CLR̅ (U6 out)", at:"pin:U6.y"}],
    plots: [{title:"Input from the comparator", probes:["From comparator"], unit:"V"},
            {title:"TP4 · stretched pulse (U5 Q) and the delay node", probes:["TP4", "C13 (delay)"], unit:"V"},
            {title:"CLR̅ from U6", probes:["CLR̅ (U6 out)"], unit:"V"}],
    measures: [
      {label:"TP4 width", f:D => MS.cross(D.TP4, 1.65, "fall") - MS.cross(D.TP4, 1.65, "rise"), fmt:v => fmtN(v, "ns", 1e9, 1), target:{text:"50 ± 5 ns", ok:v => Math.abs(v - 50e-9) <= 5e-9}},
      {label:"Ready for the next edge after", f:D => MS.cross(D["CLR̅ (U6 out)"], 1.65, "rise") - MS.cross(D.TP4, 1.65, "rise"), fmt:v => fmtN(v, "ns", 1e9, 0)},
      {label:"Pulses for one comparator edge", f:D => MS.edges(D.TP4, 1.65), fmt:v => String(v), target:{text:"exactly 1", ok:v => v === 1}}]}],
  note: "The one-shot is simulated gate by gate. Its width depends on the Schmitt threshold of the real 74LVC1G14, which varies from part to part, so trim RV2 on the bench while watching TP4.",
};

SIMCFG.coinc = {
  params: [{k:"DT", label:"Δt, B after A", def:12, unit:"ns", min:-90, max:90, step:1, spice:v => v*1e-9}],
  supplies: {"+3V3": 3.3},
  inert: {R37: "pull-up for the MCU's reset state; the simulated LATCH_CLR line is always driven", R38: "pull-down for the MCU's reset state; the simulated TEST_PULSE line is always driven"},
  ports: {"from Stretcher A (TP4)": "V_A $N 0 PULSE(0 3.3 100n 1n 1n 49n 5u)",
          "from Stretcher B (TP4)": "V_B $N 0 PULSE(0 3.3 {100n+DT} 1n 1n 49n 5u)",
          "from MCU · LATCH_CLR": "V_CLR $N 0 PULSE(3.3 0 400n 1n 1n 30n 5u)",
          "from MCU · TEST_PULSE": "V_TEST $N 0 PULSE(0 3.3 600n 2n 2n 2u 5u)",
          "to MCU · TIM2 capture": "C_CAP $N 0 5p"},
  labels: {"→ AFE A input (at R1)": "R_AFEA $N 0 50", "→ AFE B input (at R101)": "R_AFEB $N 0 50"},
  analyses: [{id:"tran", label:"One event + self-test", cmd:".tran 0.05n 1.6u",
    probes: [{name:"A", at:"port:from Stretcher A (TP4)"}, {name:"B", at:"port:from Stretcher B (TP4)"}, {name:"TP5 (AND)", at:"tp:TP5"},
             {name:"Q to MCU", at:"port:to MCU · TIM2 capture"}, {name:"LATCH_CLR", at:"port:from MCU · LATCH_CLR"}, {name:"Test pulse at AFE A", at:"label:→ AFE A input (at R1)"},
             {name:"Test pulse at AFE B", at:"label:→ AFE B input (at R101)"}],
    plots: [{title:"Stretched pulses A and B", probes:["A", "B"], unit:"V"}, {title:"TP5 · AND output", probes:["TP5 (AND)"], unit:"V"},
            {title:"Latch Q (to the MCU) and LATCH_CLR", probes:["Q to MCU", "LATCH_CLR"], unit:"V"},
            {title:"Self-test pulses injected into AFE A and B (across their 50 Ω)", probes:["Test pulse at AFE A", "Test pulse at AFE B"], unit:"mV", k:1e3}],
    measures: [
      {label:"Coincidence latched", f:D => MS.at(D["Q to MCU"], 350e-9) > 1.65 ? 1 : 0, fmt:v => v ? "yes" : "no", target:{text:"yes while |Δt| < 50 ns", ok:(v, P) => !!v === (Math.abs(P.DT) < 50)}},
      {label:"AND pulse width", f:D => { const r = MS.cross(D["TP5 (AND)"], 1.65, "rise"); return isFinite(r) ? MS.cross(D["TP5 (AND)"], 1.65, "fall") - r : 0; }, fmt:v => fmtN(v, "ns", 1e9, 1)},
      {label:"Latch cleared by LATCH_CLR", f:D => MS.at(D["Q to MCU"], 500e-9) < 0.5 ? 1 : 0, fmt:v => v ? "yes" : "no", target:{text:"yes", ok:v => !!v}},
      {label:"Test pulse peak at AFE A", f:D => MS.max(D["Test pulse at AFE A"], 590e-9, 1.6e-6), fmt:v => fmtN(v, "mV", 1e3, 1), target:{text:"10–20 mV (a muon gives ≈ 14 mV)", ok:v => v >= 0.010 && v <= 0.020}},
      {label:"Test charge into AFE A", f:D => MS.integ(D["Test pulse at AFE A"], 590e-9, 1.6e-6)/50, fmt:v => fmtN(v, "pC", 1e12, 1)},
      {label:"Test pulse peak at AFE B", f:D => MS.max(D["Test pulse at AFE B"], 590e-9, 1.6e-6), fmt:v => fmtN(v, "mV", 1e3, 1), target:{text:"10–20 mV, same as A", ok:v => v >= 0.010 && v <= 0.020}}]}],
  sweeps: [{label:"Window sweep", param:"DT", values:[-90,-80,-70,-60,-55,-50,-45,-40,-30,-20,-10,0,10,20,30,40,45,50,55,60,70,80,90], xlabel:"Δt, B after A (ns)", ylabel:"Latched (1 = yes)",
    f:D => MS.at(D["Q to MCU"], 350e-9) > 1.65 ? 1 : 0,
    summary:pts => { const on = pts.filter(p => p[1] === 1).map(p => p[0]); if (!on.length) return "No coincidence anywhere in the sweep.";
      const lo = Math.min(...on), hi = Math.max(...on), ol = Math.max(...pts.filter(p => p[0] < lo).map(p => p[0])), oh = Math.min(...pts.filter(p => p[0] > hi).map(p => p[0]));
      return `Latched for Δt from ${lo} to ${hi} ns but not at ${ol} or ${oh} ns, so the window is between ${hi - lo} and ${oh - ol} ns wide. The brief allows up to 100 ns.`; }}],
  note: "A and B are the 50 ns stretched pulses. Sweep Δt to measure the coincidence window: it should close at about ±50 ns, giving the 100 ns window from the brief. The self-test pulse (R33 + C14) now looks like a muon at the AFE input: hold TEST_PULSE high for at least 1 µs, because its falling edge injects an equal negative pulse.",
};
