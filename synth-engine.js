"use strict";

// ============================================================================
// HAL 9000 // 2D ANALYTICAL FUNCTION SYNTHESIZER & B-SOUND VIRTUAL DSP
// 16 Digitized Multi-Part Demos (./math-synth) + 8 B-Sound Virtual DSP Demos
// Pitch law: f(y) = 261.6256 * 2^y Hz (C4 = 0, 1 unit = 1 octave = 12 semitones)
// Sample-accurate continuous phase integration at native AudioContext sample rate
// ============================================================================

const F0 = 261.625565; // C4 (Hz at y = 0)
const X_MIN = -8.0;
const X_MAX = 8.0;
const Y_MIN = -3.1;
const Y_MAX = 3.1;

// Math helpers matching the video formula notation exactly
const fl = Math.floor;
const abs = Math.abs;
const sin = Math.sin;
const cos = Math.cos;
const exp = Math.exp;
const log2 = Math.log2;
const PI = Math.PI;
function mod(a, b) { return ((a % b) + b) % b; }
function frac(x) { return x - Math.floor(x); }
function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
function bit(mask, k) { return Math.floor(mask / Math.pow(2, k)) % 2 === 1; }
function digit(num, idxFromRight) { return Math.floor(num / Math.pow(10, idxFromRight)) % 10; }
function diat(d) { return Math.floor((12 * d + 2) / 7); }
function hz(f) { return log2(f / F0); }

// B-System Virtual DSP analytical helpers (MEDIA-SOUND.txt / Orchestra.html Eq. 10–14)
function bSoundSat(x, k = 25) {
  const deg = PI / 180;
  const maxV = ((3 + k) * 20 * deg) / (PI + k);
  return (((3 + k) * x * 20 * deg) / (PI + k * abs(x))) / maxV;
}
function shimKickY(t, pitch = 65, dur = 0.16) {
  return (t >= 0 && t < dur) ? hz(pitch * 2.2 * Math.pow(0.75 / 2.2, t / dur)) : NaN;
}
function shimWaddleY(t, pitch = 146.83, dur = 0.14) {
  return (t >= 0 && t < dur) ? hz(pitch * Math.pow(0.82, t / dur)) : NaN;
}
function shimFrogY(t, baseF = 125, dur = 0.19) {
  if (t < 0 || t >= dur) return NaN;
  if (frac(t / 0.031) > 0.74) return NaN; // 32 Hz AM pulse rasp train
  const p = t / dur;
  const mul = p < 0.75 ? 0.88 * Math.pow(1.25 / 0.88, p / 0.75) : 1.25 + (0.95 - 1.25) * ((p - 0.75) / 0.25);
  return hz(baseF * mul);
}
function shimIndKickY(t, dur = 0.22) {
  return (t >= 0 && t < dur) ? hz(160 * Math.pow(42 / 160, t / dur)) : NaN;
}
function shimGlitchY(t, baseF = 2400, dur = 0.08) {
  return (t >= 0 && t < dur) ? clamp(hz(baseF * 2.5 * Math.pow(80 / (baseF * 2.5), t / dur)), -3.0, 3.0) : NaN;
}
function evalEvents(t, evs) {
  for (let i = 0; i < evs.length; i++) {
    const e = evs[i];
    if (t >= e[0] && t < e[0] + e[2]) {
      const p = (t - e[0]) / e[2];
      const f = e[3] ? e[1] * Math.pow(e[3] / e[1], clamp(p / 0.75, 0, 1)) : e[1];
      return clamp(hz(f), -3.0, 3.0);
    }
  }
  return NaN;
}

// Voice palette (HAL 9000 high-contrast vector CRT colors)
const V_COLS = [
  "#e8a454", // amber
  "#7fd4cc", // cyan
  "#ff6b57", // hal coral
  "#9bc5ff", // ice blue
  "#d9e67a", // lime gold
  "#e394ff", // violet
  "#f4efe6", // paper white
  "#5ce09e", // emerald
  "#ffb870", // warm peach
  "#7aa2ff", // cobalt
  "#ff8fb1", // rose
  "#a3f7bf", // mint
];

// ============================================================================
// ALL 16 DIGITIZED DEMOS (Multi-part, exact analytical formulas)
// Each demo returns an array of voice values (number or NaN when silent)
// ============================================================================
const DEMOS = [
  // 01 — V02: Harmonic Series Fan (4 parts)
  {
    id: "01", name: "HARMONIC FAN", src: "10.09.28", speed: 1.6,
    parts: [
      { n: 2, f: "y = { H(1), H(2) }\nH(n) = s·log₂(n) − 2   if x < 7.6\ns = F(clamp((x+7)/6, 0, 1)) − F(clamp((x−3.5)/4, 0, 1)),   F(u) = u²(3 − 2u)" },
      { n: 4, f: "y = { H(1) … H(4) }\nH(n) = s·log₂(n) − 2   if x < 7.6\ns = F(clamp((x+7)/6, 0, 1)) − F(clamp((x−3.5)/4, 0, 1)),   F(u) = u²(3 − 2u)" },
      { n: 7, f: "y = { H(1) … H(7) }\nH(n) = s·log₂(n) − 2   if x < 7.6\ns = F(clamp((x+7)/6, 0, 1)) − F(clamp((x−3.5)/4, 0, 1)),   F(u) = u²(3 − 2u)" },
      { n: 10, f: "y = { H(1), H(2), H(3), H(4), H(5), H(6), H(7), H(8), H(9), H(10) }\nH(n) = s·log₂(n) − 2   if x < 7.6\ns = F(clamp((x+7)/6, 0, 1)) − F(clamp((x−3.5)/4, 0, 1)),   F(u) = u²(3 − 2u)" },
    ],
    eval(x, pi) {
      const N = this.parts[pi].n;
      const out = [];
      if (x >= 7.6) { for (let i = 0; i < N; i++) out.push(NaN); return out; }
      const F = (u) => u * u * (3 - 2 * u);
      const s = F(clamp((x + 7) / 6, 0, 1)) - F(clamp((x - 3.5) / 4, 0, 1));
      for (let n = 1; n <= N; n++) out.push(s * log2(n) - 2);
      return out;
    },
  },

  // 02 — V03: Burgundy Polyphonic Groove (6 parts)
  {
    id: "02", name: "BURGUNDY GROOVE", src: "10.11.07", speed: 2.0,
    parts: [
      { m: 1, f: "y = { kick, N(0) }\nkick = 1.3e^(−5g) − 2   if g < 0.8\nN(i) = (i + (G=10) − 2·clamp((g−1.5)/2, 0, 1))/12 − 1   if g < 3.5" },
      { m: 2, f: "y = { kick, N(0), N(7) }\ng = m + f − G,   G = {0 if m<5; 5 if m<10; 10 otherwise},   m = (⌊2x⌋ + 16) mod 16,   f = frac(2x)" },
      { m: 3, f: "y = { kick, N(0), N(7), N(12) }\nN(i) = (i + (G=10) − 2·clamp((g−1.5)/2, 0, 1))/12 − 1   if g < 3.5" },
      { m: 4, f: "y = { kick, tom, N(0), N(7), N(12) }\ntom = 0.6e^(−9f) − 1.2 + (m−13)(m>12.5)/8   if (m=3 or m=8 or m>12.5) and f < 0.6" },
      { m: 5, f: "y = { kick, tom, N(0), N(7), N(12), C(14) }\nC(i) = (i + x/4)/12   if x > 0 and x < 7.8" },
      { m: 6, f: "y = { kick, tom, N(0), N(7), N(12), C(14), C(15) }\nC(i) = (i + x/4)/12   if 0 < x < 7.8   ·   kick = 1.3e^(−5g) − 2   if g < 0.8\ntom = 0.6e^(−9f) − 1.2 + (m−13)(m>12.5)/8   ·   N(i) = (i + (G=10) − 2·clamp((g−1.5)/2,0,1))/12 − 1" },
    ],
    eval(x, pi) {
      const m = mod(fl(2 * x) + 16, 16);
      const f = frac(2 * x);
      const G = m < 5 ? 0 : (m < 10 ? 5 : 10);
      const g = m + f - G;
      const kick = g < 0.8 ? 1.3 * exp(-5 * g) - 2 : NaN;
      const tom = ((m === 3 || m === 8 || m > 12.5) && f < 0.6)
        ? 0.6 * exp(-9 * f) - 1.2 + ((m - 13) * (m > 12.5 ? 1 : 0)) / 8 : NaN;
      const N = (i) => g < 3.5 ? (i + (G === 10 ? 1 : 0) - 2 * clamp((g - 1.5) / 2, 0, 1)) / 12 - 1 : NaN;
      const C = (i) => (x > 0 && x < 7.8) ? (i + x / 4) / 12 : NaN;
      const mode = this.parts[pi].m;
      if (mode === 1) return [kick, N(0)];
      if (mode === 2) return [kick, N(0), N(7)];
      if (mode === 3) return [kick, N(0), N(7), N(12)];
      if (mode === 4) return [kick, tom, N(0), N(7), N(12)];
      if (mode === 5) return [kick, tom, N(0), N(7), N(12), C(14)];
      return [kick, tom, N(0), N(7), N(12), C(14), C(15)];
    },
  },

  // 03 — V04: Motor Chord Progression (4 parts)
  {
    id: "03", name: "MOTOR CHORD", src: "10.13.10", speed: 2.0,
    parts: [
      { m: 1, f: "y = { kick, motor }\nkick = 1.5e^(−9·frac(x/4)) − 2   if frac(x/4) < 0.5\nmotor = −1 + a/12   if frac(2x) < 0.55 + 0.3a,   a = (m∈{0,3,6}),   m = (⌊2x⌋+16) mod 8" },
      { m: 2, f: "y = { kick, motor, H(0) }\nH(i) = (i + R(c) + (R(c+1)−R(c))·clamp((q−0.85)/0.15, 0, 1))/12 − 1\nR(j) = {0, 1, 3, 4}[j mod 4],   q = frac(x/4),   c = ⌊x/4⌋ + 2" },
      { m: 3, f: "y = { kick, motor, H(0), H(7) }\nH(i) = (i + R(c) + (R(c+1)−R(c))·clamp((q−0.85)/0.15, 0, 1))/12 − 1\nR(j) = {0, 1, 3, 4}[j mod 4],   kick = 1.5e^(−9q) − 2" },
      { m: 4, f: "y = { kick, motor, H(0), H(7), H(12), H(16) }\nFull triad + fifth glide over R(j) = {0, 1, 3, 4}[j mod 4]" },
    ],
    eval(x, pi) {
      const q = frac(x / 4);
      const c = fl(x / 4) + 2;
      const m = mod(fl(2 * x) + 16, 8);
      const a = (m === 0 || m === 3 || m === 6) ? 1 : 0;
      const R = (j) => [0, 1, 3, 4][mod(j, 4)];
      const kick = q < 0.5 ? 1.5 * exp(-9 * q) - 2 : NaN;
      const motor = frac(2 * x) < 0.55 + 0.3 * a ? -1 + a / 12 : NaN;
      const glide = clamp((q - 0.85) / 0.15, 0, 1);
      const H = (i) => (i + R(c) + (R(c + 1) - R(c)) * glide) / 12 - 1;
      const mode = this.parts[pi].m;
      if (mode === 1) return [kick, motor];
      if (mode === 2) return [kick, motor, H(0)];
      if (mode === 3) return [kick, motor, H(0), H(7)];
      return [kick, motor, H(0), H(7), H(12), H(16)];
    },
  },

  // 04 — V05: Sub Swell Chord (3 parts)
  {
    id: "04", name: "SUB SWELL", src: "10.14.03", speed: 1.5,
    parts: [
      { m: 1, f: "y = { V(−12), V(1) }\nV(i) = i·s / 12,   s = sin²(π · frac(x/8))" },
      { m: 2, f: "y = { V(−12), V(−5), V(1), V(8) }\nV(i) = i·s / 12,   s = sin²(π · frac(x/8))" },
      { m: 3, f: "y = { V(−12), V(−5), V(1), V(8), sub }\nV(i) = i·s / 12,   sub = −2   if s > 0.5,   s = sin²(π · frac(x/8))" },
    ],
    eval(x, pi) {
      const s = Math.pow(sin(PI * frac(x / 8)), 2);
      const V = (i) => (i * s) / 12;
      const sub = s > 0.5 ? -2 : NaN;
      const m = this.parts[pi].m;
      if (m === 1) return [V(-12), V(1)];
      if (m === 2) return [V(-12), V(-5), V(1), V(8)];
      return [V(-12), V(-5), V(1), V(8), sub];
    },
  },

  // 05 — V06: Lime Breakbeat (5 parts)
  {
    id: "05", name: "LIME BREAKBEAT", src: "10.15.38", speed: 2.1,
    parts: [
      { m: 1, f: "y = outline(kick, sub)\nkick = 3.5e^(−5.5f) − 2   if ⌊68161601 / 2^s⌋ mod 2 = 1\nsub = {0, −2, 3, 1}/12 − 2 − 5·clamp((s+f−28)/4, 0, 1)²/12   if sg" },
      { m: 2, f: "y = outline(kick, sub, clap, hat)\nclap = 1.32 − 6((x+6) mod 4)   if (x+6) mod 4 < 0.15\nhat = 1.45 − 1.2·frac(hr·x)   if frac(hr·x) < 0.3,   hr = 2 + 2(7≤u<8) + 2(15≤u<15.5) + 6(u≥15.5)" },
      { m: 3, f: "y = outline(kick, sub, bell, clap, hat)\nbell = (⌊305010 / 10^(7 − k mod 8)⌋ mod 10)/12 + 0.05e^(−20·frac(2rx)) + 1   if frac(2rx) < 0.5" },
      { m: 4, f: "y = outline(kick, sub, bell, clap, hat, lead)\nlead = {−2B, −2, 0, 1, 3, 1, 2B−2}/12 + 2   ·   km = 68161601,   tune = 305010" },
    ],
    eval(x, pi) {
      const u = x + 8;
      const n = fl(4 * x) + 32;
      const f = frac(4 * x);
      const k = fl(2 * x) + 16;
      const s = mod(n, 32);
      const B = fl(n / 32);
      const km = 68161601;
      const kick = bit(km, s) ? 3.5 * exp(-5.5 * f) - 2 : NaN;
      const sg = (((s >= 0 && s < 16 && mod(s, 6) < 4) || s >= 20) && (s !== 31 || f < 0.8));
      const pSub = s < 20 ? (B === 0 ? 0 : -2) : (B === 0 ? 3 : 1);
      const sub = sg ? pSub / 12 - 2 - (5 * Math.pow(clamp((s + f - 28) / 4, 0, 1), 2)) / 12 : NaN;
      const r = 1 + 3 * (mod(k, 4) === 3 ? 1 : 0);
      const bell = frac(2 * r * x) < 0.5
        ? digit(305010, 7 - mod(k, 8)) / 12 + 0.05 * exp(-20 * frac(2 * r * x)) + 1 : NaN;
      const xm = mod(x + 6, 4);
      const clap = xm < 0.15 ? 1.32 - 6 * xm : NaN;
      const hr = 2 + 2 * (u >= 7 && u < 8 ? 1 : 0) + 2 * (u >= 15 && u < 15.5 ? 1 : 0) + 6 * (u >= 15.5 ? 1 : 0);
      const hat = frac(hr * x) < 0.3 ? 1.45 - 1.2 * frac(hr * x) : NaN;
      let leadVal = s < 20 ? -2 * B : s < 22 ? -2 : s < 24 ? 0 : s < 26 ? 1 : s < 28 ? 3 : s < 30 ? 1 : 2 * B - 2;
      const leadOn = s < 19 || (s === 19 && f < 0.8) || (s > 19 && frac((s + f) / 2) < 0.85);
      const lead = leadOn ? leadVal / 12 + 2 : NaN;
      const m = this.parts[pi].m;
      if (m === 1) return [kick, sub];
      if (m === 2) return [kick, sub, clap, hat];
      if (m === 3) return [kick, sub, bell, clap, hat];
      return [kick, sub, bell, clap, hat, lead];
    },
  },

  // 06 — V07: Cobalt Euclid (5 parts)
  {
    id: "06", name: "COBALT EUCLID", src: "10.17.47", speed: 2.0,
    parts: [
      { m: 1, f: "y = outline(kick, bass)\nkick = −2 + 2.5e^(−20b)   if b < 1/3\nbass = h(R+v)/12 − 2   if ⌊44718/2^k⌋ mod 2 = 1 and f < 0.8" },
      { m: 2, f: "y = outline(kick, bass, clap, hats)\nclap = 2.3 − 6b   if j mod 2 = 1 and b < 0.1\nhats = 2.4 − 2.5f − 0.25(k mod 4 ≠ 2)   if ⌊3229879364/2^(n mod 32)⌋ mod 2 = 1" },
      { m: 3, f: "y = outline(kick, bass, clap, hats, arp)\narp = h(T)/12 − 1,   T = W + (R + 3 + B(2x) − 2B(x)) mod 7,   B(u) = clamp(144·cos(πu), −1, 1)" },
      { m: 4, f: "y = outline(kick, bass, clap, hats, arp, harm)\nharm = h(T−2)/12 − 1,   h(d) = ⌊(12d+2)/7⌋ + (q=3)(d mod 7 = 6),   R = ⌊534/10^(3−q)⌋ mod 10" },
    ],
    eval(x, pi) {
      const j = fl(x), b = frac(x), n = fl(4 * x) + 32, k = mod(n, 16), f = frac(4 * x);
      const q = fl((x + 8) / 4);
      const B = (u) => clamp(144 * cos(PI * u), -1, 1);
      const h = (d) => diat(d) + (q === 3 && mod(d, 7) === 6 ? 1 : 0);
      const R = digit(534, clamp(3 - q, 0, 3));
      const W = (7 * (2 + B(x / 4) + B(x / 8))) / 2;
      const T = W + mod(R + 3 + B(2 * x) - 2 * B(x), 7);
      const p = mod(n, 4);
      const v = 4 * (p === 1 ? 1 : 0) + (7 - mod(j, 2)) * (p === 3 ? 1 : 0);
      const kick = b < 1 / 3 ? -2 + 2.5 * exp(-20 * b) : NaN;
      const bass = (bit(44718, k) && f < 0.8) ? h(R + v) / 12 - 2 : NaN;
      const clap = (mod(j, 2) === 1 && b < 0.1) ? 2.3 - 6 * b : NaN;
      const kNe2 = mod(k, 4) !== 2 ? 1 : 0;
      const hats = (f < 0.25 - 0.07 * kNe2 && bit(3229879364, mod(n, 32))) ? 2.4 - 2.5 * f - 0.25 * kNe2 : NaN;
      const arp = h(T) / 12 - 1;
      const harm = h(T - 2) / 12 - 1;
      const m = this.parts[pi].m;
      if (m === 1) return [kick, bass];
      if (m === 2) return [kick, bass, clap, hats];
      if (m === 3) return [kick, bass, clap, hats, arp];
      return [kick, bass, clap, hats, arp, harm];
    },
  },

  // 07 — V08: Crimson Acid (4 parts)
  {
    id: "07", name: "CRIMSON ACID", src: "10.18.45", speed: 2.05,
    parts: [
      { m: 1, f: "y = { kick, G }\nkick = −2 + 3e^(−20·frac(x))   if frac(x) < 1/4\nG = (R+a)/12 − 1 + 0.08e^(−12f)   if frac(3s/8) < 3/8   else R/12 − 1   if f < 0.35" },
      { m: 2, f: "y = { kick, G, G + 7/12, hats }\nhats = 2.25 − 2f − 0.3(k mod 4 ≠ 2)   if ⌊61132/2^k⌋ mod 2 = 1 or (b=3 and k≥12)" },
      { m: 3, f: "y = { G + 7/12, hats, acid }\nacid = (h(n(s)) − 12O + lift + slide)/12 + 0.3(s mod 3=0)e^(−14f)   if ⌊27995/2^k⌋ mod 2 = 1" },
      { m: 4, f: "y = { kick, G, G + 7/12, acid, hats }\nH(v) = {203043 if ⌊v/8⌋ even; 403210 odd},   R = ⌊12120807/100^(3−b)⌋ mod 100 − 12" },
    ],
    eval(x, pi) {
      const b = clamp(fl((x + 8) / 4), 0, 3);
      const s = fl(4 * x) + 32;
      const f = frac(4 * x);
      const k = mod(s, 16);
      const j = mod(fl((3 * s) / 8), 4);
      const D = (N) => digit(N, 3 - b);
      const R = (fl(12120807 / Math.pow(100, 3 - b)) % 100) - 12;
      const q = D(3325), p = D(5547);
      const a = q * (j === 1 ? 1 : 0) + p * (j === 2 ? 1 : 0) + 7 * (j === 3 ? 1 : 0);
      const kick = frac(x) < 0.25 ? -2 + 3 * exp(-20 * frac(x)) : NaN;
      const G = frac((3 * s) / 8) < 3 / 8 ? (R + a) / 12 - 1 + 0.08 * exp(-12 * f) : (f < 0.35 ? R / 12 - 1 : NaN);
      const kNe2 = mod(k, 4) !== 2 ? 1 : 0;
      const hats = (f < 0.25 - 0.07 * kNe2 && (bit(61132, k) || (b === 3 && k >= 12)))
        ? 2.25 - 2 * f - 0.3 * kNe2 : NaN;
      const h = (d) => fl((12 * d + 3) / 5);
      const H = (v) => mod(fl(v / 8), 2) === 0 ? 203043 : 403210;
      const u = (v) => digit(H(v), 7 - mod(v, 8));
      const nv = (v) => (u(v) > 0 ? mod(u(v) - 1, 4) + 1 : 0);
      const O = k === 6 ? 1 : 0;
      const z = (k === 3 || k === 13) ? 1 : 0;
      const lift = 2 * (k === 10 && mod(b, 2) === 1 ? 1 : 0) + 4 * (k === 14 && b >= 2 ? 1 : 0)
        + (k === 4 && b === 2 ? 1 : 0) + (k === 6 && b === 3 ? 1 : 0)
        + 2 * (k === 10 && b === 3 ? 1 : 0) + 12 * (k === 0 && b === 0 ? 1 : 0);
      const tgt = 4 * (k === 13 && b >= 2 ? 1 : 0) + (k === 3 && b === 2 ? 1 : 0);
      const acidOn = bit(27995, k) && (f < 0.8 || z === 1);
      const acid = acidOn
        ? (h(nv(s)) - 12 * O + lift + z * (h(nv(s + 1)) - h(nv(s)) - 12 * O + tgt) * clamp(2 * f - 1, 0, 1)) / 12
          + 0.3 * (mod(s, 3) === 0 ? 1 : 0) * exp(-14 * f)
        : NaN;
      const m = this.parts[pi].m;
      if (m === 1) return [kick, G];
      if (m === 2) return [kick, G, G + 7 / 12, hats];
      if (m === 3) return [G + 7 / 12, hats, acid];
      return [kick, G, G + 7 / 12, acid, hats];
    },
  },

  // 08 — V09/V10: Mint Swing (5 parts)
  {
    id: "08", name: "MINT SWING", src: "10.19.43", speed: 2.0,
    parts: [
      { m: 1, f: "y = outline(kick, bass)\nsw = (⌊2x⌋ + max(frac(2x)/1.16, (frac(2x)−0.16)/0.84))/2   [16% swing]\nkick = (fold(c(0))−15)/12 + 2.7e^(−26b)   if b < 0.18" },
      { m: 2, f: "y = outline(kick, bass, lead)\nlead = (c(4−w) + 9)/12   if s < 0.78 and hit(q) = 1\nroot(i) = ⌊332255473/10^(8−i)⌋ mod 10 − 5" },
      { m: 3, f: "y = outline(kick, snare, hats, bass, arp)\nsnare = 1.32 − 3.6((x−1) mod 2)   if (x−1) mod 2 < 0.16\narp = (c(3 − |n mod 6 − 3|) − 3)/12   if s < 0.8" },
      { m: 4, f: "y = outline(bass, arp, lead, kick, snare, hats, harmony)\nM = {8889996677744455, 7776665555333000, 4468889999777555, 3333332255577999}[m]\ntop = (v(u(q)+1)+9)/12,   harmony = (v(u(q)−1)+9)/12" },
    ],
    eval(x, pi) {
      const f2x = frac(2 * x);
      const sw = (fl(2 * x) + Math.max(f2x / 1.16, (f2x - 0.16) / 0.84)) / 2;
      const n = fl(4 * sw) + 32;
      const b = frac(sw), s = frac(4 * sw);
      const q = mod(n, 16), j = mod(n, 8);
      const k = clamp(fl(x / 2) + 4, 0, 8);
      const mBar = clamp(fl(x / 4) + 2, 0, 3);
      const mode = this.parts[pi].m;
      const rootNum = mode <= 2 ? 332255473 : 642584773;
      const aNum = mode <= 2 ? 1100220 : 226300020;
      const root = (i) => digit(rootNum, clamp(8 - i, 0, 8)) - 5;
      const r = root(k);
      const a = digit(aNum, clamp(8 - k, 0, 8));
      const v = (d) => diat(d) + (mod(a, 2) * (mod(d - r, 7) === 2 ? 1 : 0))
        - (mod(fl(a / 2), 2) * (mod(d, 7) === 1 ? 1 : 0))
        + (mod(fl(a / 4), 2) * (mod(d - r, 7) === 1 ? 1 : 0));
      const c = (i) => v(r + 2 * i);
      const fold = (z) => mod(z + 9, 12) - 9;

      const kick = b < 0.18 ? (fold(c(0)) - 15) / 12 + 2.7 * exp(-26 * b) : NaN;
      const snT = mod(x - 1, 2);
      const snare = snT < 0.16 ? 1.32 - 3.6 * snT : NaN;
      const hats = (s < 0.46 && mod(n, 4) >= 2) ? 1.94 - 0.24 * (mod(n, 4) === 3 ? 1 : 0) - 0.36 * s : NaN;
      const arp = s < 0.8 ? (c(3 - abs(mod(n, 6) - 3)) - 3) / 12 : NaN;

      if (mode <= 2) {
        const bass = (b >= 0.24 && mod(q, 4) !== 1 && s < 0.82)
          ? (fold(c(0)) + 7 * (mod(q, 8) === 6 ? 1 : 0) - 15) / 12 : NaN;
        const hit = (q === 0 || q === 3 || q === 6 || q === 10 || q === 13);
        const pz = (q >= 3 ? 1 : 0) + (q >= 6 ? 1 : 0) + (q >= 10 ? 1 : 0) + (q >= 13 ? 1 : 0);
        const w = mod(mBar + pz, 4);
        const lead = (s < 0.78 && hit) ? (c(4 - w) + 9) / 12 : NaN;
        return mode === 1 ? [kick, bass] : [kick, bass, lead];
      }

      const bassNum = (j === 7 && mod(k, 2) === 1)
        ? fold(diat(root(k + 1))) - 1
        : fold(c(mod(k, 2))) + 12 * (mod(j, 4) === 2 ? 1 : 0) + mod(c(2) - c(mod(k, 2)), 12) * (j === 5 ? 1 : 0);
      const bass = (b >= 0.25 && s < 0.8) ? (bassNum - 15) / 12 : NaN;
      if (mode === 3) return [kick, snare, hats, bass, arp];

      const M = ["8889996677744455", "7776665555333000", "4468889999777555", "3333332255577999"][mBar];
      const uq = (i) => (i < 16 ? parseInt(M[i], 10) : 0);
      const melOn = uq(q) > 0 && (s < 0.8 || uq(q + 1) === uq(q));
      const lead = melOn ? (v(uq(q) + 1) + 9) / 12 : NaN;
      const harm = melOn ? (v(uq(q) - 1) + 9) / 12 : NaN;
      return [bass, arp, lead, kick, snare, hats, harm];
    },
  },

  // 09 — V11: Emerald Acid (4 parts)
  {
    id: "09", name: "EMERALD ACID", src: "10.20.57", speed: 2.05,
    parts: [
      { m: 1, f: "y = outline(kick, bass)\nkick = c(0)/12 − 2 + 2.6e^(−26b)   if b < 0.3\nbass = (c(0) + (⌊2x⌋ odd)·((c(1)−c(0)+12) mod 12))/12 − 2 + 0.22e^(−14s)   if n mod 4 > 0 and s < 0.72" },
      { m: 2, f: "y = outline(bass, arp, kick)\narp = (c(⌊12031245 / 10^(7 − n mod 8)⌋ mod 10) mod 12 + 12(⌊n/8⌋ mod 2)) / 12" },
      { m: 3, f: "y = outline(bass, arp, kick, acid)\nacid = (c(⌊3(n mod 8)/8⌋) − 12)/12 + 0.3e^(−9s)   if frac(3(n mod 16)/8) < 3/8" },
      { m: 4, f: "y = outline(bass, arp, kick, acid, hats)\nhats = 12/5 − (n mod 4 ≠ 2)/4 − s/2   ·   c(i) = h(r+2i),   r = (3k+1) mod 7 − 3" },
    ],
    eval(x, pi) {
      const k = fl(x / 2), n = fl(4 * x) + 32, j = fl(x) + 8, b = frac(x), s = frac(4 * x);
      const r = mod(3 * k + 1, 7) - 3;
      const h = (d) => diat(d) + (mod(d, 7) === 6 ? 1 : 0);
      const c = (i) => h(r + 2 * i);
      const kick = b < 0.3 ? c(0) / 12 - 2 + 2.6 * exp(-26 * b) : NaN;
      const bass = (mod(n, 4) > 0 && s < 0.72)
        ? (c(0) + (mod(fl(2 * x), 2) === 1 ? mod(c(1) - c(0) + 12, 12) : 0)) / 12 - 2 + 0.22 * exp(-14 * s) : NaN;
      const arp = (mod(c(digit(12031245, 7 - mod(n, 8))), 12) + 12 * mod(fl(n / 8), 2)) / 12;
      const acid = frac((3 * mod(n, 16)) / 8) < 3 / 8
        ? (c(fl((3 * mod(n, 8)) / 8)) - 12) / 12 + 0.3 * exp(-9 * s) : NaN;
      const nm4 = mod(n, 4);
      const hatOn = s < 0.5 && ((nm4 === 2 && mod(j, 7) !== 6) || (nm4 === 3 && mod(j, 3) !== 1) || (nm4 === 1 && mod(j, 5) === 2));
      const hats = hatOn ? 12 / 5 - (nm4 !== 2 ? 0.25 : 0) - s * 0.5 : NaN;
      const m = this.parts[pi].m;
      if (m === 1) return [kick, bass];
      if (m === 2) return [bass, arp, kick];
      if (m === 3) return [bass, arp, kick, acid];
      return [bass, arp, kick, acid, hats];
    },
  },

  // 10 — V12: Violet Drift Ambient Chords (3 parts)
  {
    id: "10", name: "VIOLET DRIFT", src: "10.22.46", speed: 1.4,
    parts: [
      { n: 2, f: "y₁ = (−31 + 7c₁ + c₂ − 6c₃ + 7c₄) / 24,   y₂ = (−5 − 2c₁ + c₂ − 2c₄) / 24\ncₖ = cos(π · clamp(x/2 + {3, 1, −1, −3}[k], 0, 1))" },
      { n: 4, f: "4-Voice Smooth Cosine-Clamped Progression (y₁ … y₄)\ncₖ = cos(π · clamp(x/2 + {3, 1, −1, −3}[k], 0, 1))" },
      { n: 6, f: "y₁ = (−31+7c₁+c₂−6c₃+7c₄)/24  ·  y₂ = (−5−2c₁+c₂−2c₄)/24  ·  y₃ = (4−3c₁+2c₂−2c₃+c₄)/24\ny₄ = (14−2c₁+c₂+c₃−2c₄)/24   ·  y₅ = (29−c₁+c₂−2c₃−5c₄)/24 ·  y₆ = (39+c₁−c₂−4c₃−3c₄)/24" },
    ],
    eval(x, pi) {
      const c1 = cos(PI * clamp(x / 2 + 3, 0, 1));
      const c2 = cos(PI * clamp(x / 2 + 1, 0, 1));
      const c3 = cos(PI * clamp(x / 2 - 1, 0, 1));
      const c4 = cos(PI * clamp(x / 2 - 3, 0, 1));
      const all = [
        (-31 + 7 * c1 + c2 - 6 * c3 + 7 * c4) / 24,
        (-5 - 2 * c1 + c2 - 2 * c4) / 24,
        (4 - 3 * c1 + 2 * c2 - 2 * c3 + c4) / 24,
        (14 - 2 * c1 + c2 + c3 - 2 * c4) / 24,
        (29 - c1 + c2 - 2 * c3 - 5 * c4) / 24,
        (39 + c1 - c2 - 4 * c3 - 3 * c4) / 24,
      ];
      return all.slice(0, this.parts[pi].n);
    },
  },

  // 11 — V13: Bronze Dyadic Pulse (3 parts)
  {
    id: "11", name: "BRONZE PULSE", src: "10.23.53", speed: 1.9,
    parts: [
      { m: 1, f: "y = 2.1e^(−18(x mod 4)) − 1/2   if x mod 4 < 1" },
      { m: 2, f: "y₁ = 2.1e^(−18(x mod 4)) − 1/2   ·   y₂ = (13 − T(p)·gate − 18)/12 + max(0,x)/8   if frac(3⌊4x⌋/8) < 5/8" },
      { m: 3, f: "y₁ = 2.1e^(−18(x mod 4)) − 1/2  ·  y₂ = polymetric triangle bass + rise max(0,x)/8\ny₃ = 13/10 − 4·frac(2^(⌊x/4⌋+1)(x−1)) / 2^(⌊x/4⌋+1)   [dyadic accelerating pulse]" },
    ],
    eval(x, pi) {
      const m4 = mod(x, 4);
      const y1 = m4 < 1 ? 2.1 * exp(-18 * m4) - 0.5 : NaN;
      const n = fl(4 * x) + 32;
      const p = mod(2 * fl(x / 2) + fl(mod(n, 8) / 3) + 3, 5);
      const tri = (p * (p + 1)) / 2;
      const gate = (mod(n, 8) > 2 ? 1 : 0) * (1 - (p === 0 ? 1 : 0)) * (frac((3 * n) / 8) < 3 / 8 ? 1 : 0);
      const y2 = frac((3 * n) / 8) < 5 / 8
        ? (13 - tri * gate * exp(-5 * frac(4 * x)) - 18) / 12 + Math.max(0, x) / 8 : NaN;
      const pw = Math.pow(2, fl(x / 4) + 1);
      const fp = frac(pw * (x - 1));
      const y3 = (fp < 0.5 && fp / pw < 3 / 16) ? 1.3 - (4 * fp) / pw : NaN;
      const m = this.parts[pi].m;
      if (m === 1) return [y1];
      if (m === 2) return [y1, y2];
      return [y1, y2, y3];
    },
  },

  // 12 — V14/V15: Obsidian Polyphony (4 parts)
  {
    id: "12", name: "OBSIDIAN CANON", src: "10.24.54", speed: 1.85,
    parts: [
      { m: 1, f: "y₁ = (⌊(2 − 12(⌊x/4⌋+2))/7⌋ + 7(⌊2x⌋ mod 8 ≥ 3) + 5(⌊2x⌋ mod 8 ≥ 6))/12 − 1\ny₂ = ⌊(12(2(⌊2x⌋+1 mod 3) − ⌊x/4⌋ mod 7) + 2)/7⌋/12 + (x≥4)(⌊2x⌋+1 mod 3 = 0)/12" },
      { m: 2, f: "3-Voice Diatonic Canon (V14 1/7)\n+ y₃ = 1 + ⌊(12(2(2⌊4x⌋+4 mod 5) − ⌊x/4⌋−2 mod 7) + 2)/7⌋ / 12" },
      { m: 3, f: "4-Voice Diatonic Canon (V15 4/7)\ny₂ = ⌊(12(⌊x⌋ mod 4 mod 3 − ⌊x/4⌋) + 2)/7⌋/12 + (x≥4)(⌊x⌋ mod 3 = 1)/12\ny₄ = ⌊(12(6 − ⌊(x−½)/4⌋ − min(⌊x−½⌋ mod 4, 2)) + 2)/7⌋ / 12" },
    ],
    eval(x, pi) {
      const q = fl(x / 4);
      const m2 = mod(fl(2 * x), 8);
      const y1 = (fl((2 - 12 * (q + 2)) / 7) + 7 * (m2 >= 3 ? 1 : 0) + 5 * (m2 >= 6 ? 1 : 0)) / 12 - 1;
      const y3 = 1 + diat(2 * mod(2 * fl(4 * x) + 4, 5) - mod(q - 2, 7)) / 12;
      const mode = this.parts[pi].m;
      if (mode <= 2) {
        const t2 = mod(fl(2 * x) + 1, 3);
        const y2 = diat(2 * t2 - mod(q, 7)) / 12 + (x >= 4 && t2 === 0 ? 1 / 12 : 0);
        return mode === 1 ? [y1, y2] : [y1, y2, y3];
      }
      const y2b = diat(mod(mod(fl(x), 4), 3) - q) / 12 + (x >= 4 && mod(fl(x), 3) === 1 ? 1 / 12 : 0);
      const y4 = diat(6 - fl((x - 0.5) / 4) - Math.min(mod(fl(x - 0.5), 4), 2)) / 12;
      return [y1, y2b, y4, y3];
    },
  },

  // 13 — V16: Sage Funk (2 parts)
  {
    id: "13", name: "SAGE FUNK", src: "10.26.11", speed: 2.0,
    parts: [
      { m: 1, f: "y = −2 + ⌊(12(3⌊x/2⌋ + 5 mod 7) + 2)/7⌋/12 + 2.5e^(−22(x mod 2))" },
      { m: 2, f: "y = { lead + e^(−12·frac(4x))/6   if ⌊4x⌋ mod 8 > 2 and (⌊4x⌋ mod 8) mod 3 < 2 and frac(4x) < 0.8 − 0.4((⌊4x⌋ mod 8) mod 3)\n    { −2 + ⌊(12(3⌊x/2⌋ + 5 mod 7) + 2)/7⌋/12 + 2.5e^(−22(x mod 2))   otherwise" },
    ],
    eval(x, pi) {
      const bass = -2 + diat(mod(3 * fl(x / 2) + 5, 7)) / 12 + 2.5 * exp(-22 * mod(x, 2));
      if (this.parts[pi].m === 1) return [bass];
      const m8 = mod(fl(4 * x), 8);
      const m3 = mod(m8, 3);
      const f4 = frac(4 * x);
      if (m8 > 2 && m3 < 2 && f4 < 0.8 - 0.4 * m3) {
        const d = 10 - 4 * fl(m8 / 3) - fl((fl(x / 2) + 6 - fl(m8 / 3)) / 2);
        const lead = diat(d) / 12 + ((m8 > 5 ? 1 : 0) * Math.max(0, fl(x / 2) - 1)) / 12 + exp(-12 * f4) / 6;
        return [lead];
      }
      return [bass];
    },
  },

  // 14 — V17: Sapphire Arpeggio (3 parts)
  {
    id: "14", name: "SAPPHIRE ARP", src: "10.27.33", speed: 2.0,
    parts: [
      { m: 1, f: "y = −1.6 + 2.6e^(−24·frac(x+8))   if frac(x+8) < 0.22   else acid bass" },
      { m: 2, f: "y = { −1.6 + 2.6e^(−24·frac(x+8))   if frac(x+8) < 0.22\n    { −1.25 + (24 + root + chord[⌊16(x+8)⌋ mod 4])/12   if ⌊4(x+8)⌋ mod 16 ≥ 13\n    { −1.25 + (12 + root − 5 + d(30703570) + 12·d(100100))/12 + 0.3e^(−9·frac(4x))   otherwise" },
    ],
    eval(x, pi) {
      const u = x + 8;
      const q = fl(u / 4);
      const rOff = q === 2 ? -4 : (q === 3 ? -2 : 0);
      if (frac(u) < 0.22) return [-1.6 + 2.6 * exp(-24 * frac(u))];
      const s4 = fl(4 * u);
      const f4 = frac(4 * u);
      if (this.parts[pi].m === 2 && mod(s4, 16) >= 13 && (mod(s4, 8) === 3 || mod(s4, 8) === 6) && f4 < 0.9) {
        const c16 = mod(fl(16 * u), 4);
        const chord = c16 === 0 ? 0 : c16 === 1 ? 3 + (q >= 2 ? 1 : 0) : c16 === 2 ? 7 : 10 + (q === 2 ? 1 : 0);
        return [-1.25 + (24 + rOff + chord) / 12];
      }
      if (f4 < 0.8) {
        const half = mod(fl(u / 2), 2) === 0;
        const idx = 7 - mod(s4, 8);
        const note = digit(half ? 30703570 : 3077303, idx);
        const oct = digit(half ? 100100 : 10010010, idx);
        return [-1.25 + (12 + rOff - 5 + note + 12 * oct) / 12 + 0.3 * (mod(s4, 3) === 0 ? 1 : 0) * exp(-9 * f4) + 0.18 * (mod(s4, 8) === 5 ? 1 : 0) * f4];
      }
      return [NaN];
    },
  },

  // 15 — V18: Neon Pluck & Vibrato Arp (2 parts)
  {
    id: "15", name: "NEON PLUCK", src: "10.28.59", speed: 2.0,
    parts: [
      { m: 1, f: "y = { −1.4 − 1.8e^(−8(x mod 1))   if x mod 1 < 0.45\n    { 0.6 + 1.6e^(−10((x−0.45) mod 1))   otherwise   + 0.4·⌊(x mod 8)/6⌋" },
      { m: 2, f: "y = { 1.5e^(−18·frac(x)) − 1.65   if frac(x) < 0.2\n    { −1.35 + 0.55e^(−10·frac(4x))   if x mod 4 < 2.5\n    { (1 + 3(⌊8x⌋ mod 4) + 5(⌊2x⌋ mod 2))/12 + 0.22·sin(36x)   otherwise" },
    ],
    eval(x, pi) {
      if (this.parts[pi].m === 1) {
        const m1 = mod(x, 1);
        const base = m1 < 0.45 ? -1.4 - 1.8 * exp(-8 * m1) : 0.6 + 1.6 * exp(-10 * mod(x - 0.45, 1));
        return [base + 0.4 * fl(mod(x, 8) / 6)];
      }
      if (frac(x) < 0.2) return [1.5 * exp(-18 * frac(x)) - 1.65];
      if (mod(x, 4) < 2.5) return [-1.35 + 0.55 * exp(-10 * frac(4 * x))];
      return [(1 + 3 * mod(fl(8 * x), 4) + 5 * mod(fl(2 * x), 2)) / 12 + 0.22 * sin(36 * x)];
    },
  },

  // 16 — Analytical Etudes (18 parts: Broken Radio -> Hans Zimmer Symphony -> Aphex Twin -> Broken Radio Reborn)
  {
    id: "16", name: "ANALYTICAL ETUDES", src: "RADIO → SYMPHONY", speed: 1.75, reverb: 0.34,
    parts: [
      // Phase I: Original "Broken Radio / Searching" Analytical Etudes (1–4)
      {
        m: 1, modes: ["fm"],
        f: "Etude 01/18 [Broken Radio I] — Original Nested-Sine Signal Search\ny = 2.8 · sin(5 · sin(4 · sin(3 · sin(2 · sin(x)))))   [unquantized chaotic FM carrier]",
      },
      {
        m: 2, modes: ["tri", "fm", "hpf", "lpf"],
        f: "Etude 02/18 [Shortwave Beacon · Am9] — Melodic Radio Arpeggio & Carrier Floor\nConsonant Am→F→C→G beacon motif (TRI) + pure-fifth FM chimes + HPF pulse + LPF bass",
      },
      {
        m: 3, modes: ["pls", "tri", "lpf", "sine"],
        f: "Etude 03/18 [Chiptune Pulse · Em] — Playful 16th-Note Square Arpeggios (Em · C · G · D)\nCrisp staccato PLS arps + warm TRI harmony + bouncy LPF bass + high SINE counter-bell",
      },
      {
        m: 4, modes: ["sine", "pls", "lpf", "nse"],
        f: "Etude 04/18 [Minimalist Pulse · Am Pent] — Steve Reich Variable-Subdivision Groove\nVariable-duty subdivisions (1, 2, 3/beat) locked to A-minor pentatonic {A, C, D, E, G} + brush",
      },
      // Phase II: Signal Lock & Hans Zimmer Minimalist Ostinatos (5–8)
      {
        m: 5, modes: ["sine", "lpf", "tri", "fm", "rvb"],
        f: "Etude 05/18 [Cathedral Dawn · Am9] — Harmonic Overtone Bloom (A1 → E5)\nPure A1 organ pedal unfolding into ascending Am9 arpeggio (A2–E3–A3–B3–C4–E4–A4–B4–E5) + RVB",
      },
      {
        m: 6, modes: ["sine", "lfo", "lpf", "tri", "rvb"],
        f: "Etude 06/18 [Time · Ostinato] — Inception 4-Chord Piano Pulse (Am · Em · G · D)\nPiecewise e^(−6·frac(2x)) piano pulses + deep LPF cello pedal + warm LFO string fifths",
      },
      {
        m: 7, modes: ["sine", "tri", "fm", "lpf", "lfo", "rvb"],
        f: "Etude 07/18 [Cornfield Chase] — Full 3/4 Interstellar Organ & Celesta Cascade\n6-step rolling arpeggio (A4–E5 → B4–E5 → C5–E5 → D5–C5–B4) + F–G–Am–Em cathedral organ",
      },
      {
        m: 8, modes: ["sat", "lpf", "lfo", "sine", "rvb"],
        f: "Etude 08/18 [Dune / BR2049] — Low Brass Swell (BRAAM) & Exponential Sub-Heartbeat\nWaveShaper A1+E2 brass swell + damped e^(−8·frac) timpani pulse + cavernous RVB hall",
      },
      // Phase III: Piecewise Pure-Function Orchestration (9–12)
      {
        m: 9, modes: ["sine", "tri", "lfo", "lpf", "rvb"],
        f: "Etude 09/18 [S.T.A.Y.] — Music-Box Harmonics & Rising Cello/Violin Fifths\nHigh celesta ostinato (A5–E5–C5–E5) + slow rising LFO strings over warm LPF pedal",
      },
      {
        m: 10, modes: ["tri", "bpf", "lfo", "lpf", "rvb"],
        f: "Etude 10/18 [Gladiator · Dorian] — Logistic-Sigmoid Vocal Cantabile (D Dorian)\ny₁ = y_a + (y_b−y_a)/(1+e^(−14τ))  [human voice/cello portamento] + 1.8f BPF breath",
      },
      {
        m: 11, modes: ["fm", "sine", "pls", "lpf", "rvb"],
        f: "Etude 11/18 [No Time For Caution] — 3:4 Cathedral Organ Polyrhythm (Am · F · Dm · E7)\nInterlocking 3-against-4 pure-function arpeggios + cathedral FM organ & timpani pulse",
      },
      {
        m: 12, modes: ["lfo", "tri", "lpf", "sine", "rvb"],
        f: "Etude 12/18 [Sangreal · Canon] — Consonant D-Minor String Canon & Harp Arpeggio\nD4–F4–A4–G4–F4–E4–D4 violin theme answered in pure thirds/octaves over Dm–Bb–C–Am + harp",
      },
      // Phase IV: Grand Symphonic Synthesis, Aphex Twin & Broken Radio Reborn (13–18)
      {
        m: 13, modes: ["sat", "lpf", "lfo", "nse", "hpf"],
        f: "Etude 13/18 [Mombasa · Chase] — Ostinato Strings, Syncopated Sub-Kick & Brass Octaves\nDriving 16th string pulse + WaveShaper sub-kick + heroic LFO octave brass + NSE/HPF",
      },
      {
        m: 14, modes: ["hpf", "fm", "sine", "lpf", "lfo", "rvb"],
        f: "Etude 14/18 [Mountains · Pendulum] — Relativistic Clock Tick & Growing Cathedral Chord\nCrisp HPF pendulum tick + swelling 5-voice Am → Fmaj7 → C → G6 organ & RVB hall wash",
      },
      {
        m: 15, modes: ["sat", "lfo", "sine", "tri", "lpf", "rvb"],
        f: "Etude 15/18 [Flight · Fanfare] — Heroic D-Major Fifths & Triumphant Octave Brass\nNoble D2–A2–D3 fifths + soaring F#4→G4→A4→D5→E5→F#5 melody over pulsing piano",
      },
      {
        m: 16, modes: ["sine", "tri", "lfo", "fm", "lpf", "sat", "hpf", "rvb"],
        f: "Etude 16/18 [Grand Symphony] — 8-Voice Hans Zimmer Cathedral Climax (Am · F · C · G · Am)\nFull orchestra: Piano + Flute + Violin LFO + FM Bells + Cello LPF + Brass SAT + RVB Hall",
      },
      {
        m: 17, modes: ["sine", "tri", "lpf", "hpf", "rvb"],
        f: "Etude 17/18 [Aphex Twin · Bucephalus Bouncing Ball] — Harmonic Gravity Cascade (F#m9 · Dmaj9)\nn = ⌊ln(1 − τ/T) / ln(0.78)⌋ · Accelerating pentatonic bounce arps (SINE/TRI) + LPF bass + RVB pad",
      },
      {
        m: 18, modes: ["fm", "tri", "sine", "lpf", "rvb"],
        f: "Etude 18/18 [Hyperbolic & Exp Mosaic · Am9] — Braided Macro-Wave Sculpted from 1/x & Exp Pieces\nCascading 1/(t+c) FM hyperbolas & counter-arch e^(±kt) TRI pieces tracing grand waves over constant Am9·F·C·G lines",
      },
    ],
    eval(x, pi) {
      const u = x + 8; // 0..16
      const m = this.parts[pi].m;

      // --- PHASE I: ORIGINAL "BROKEN RADIO" (1–4) ---
      if (m === 1) return [2.8 * sin(5 * sin(4 * sin(3 * sin(2 * sin(x)))))];
      if (m === 2) {
        // Consonant Shortwave Beacon (Am -> F -> C -> G) + FM fifth chimes + HPF tick + LPF bass
        const bar = clamp(fl(u / 4), 0, 3);
        const st = fl(u * 2);
        const sf = frac(u * 2);
        const arps = [
          [440.0, 523.25, 659.25, 493.88], // Am9
          [349.23, 440.0, 523.25, 659.25], // Fmaj7
          [523.25, 659.25, 783.99, 659.25], // C
          [392.0, 493.88, 587.33, 659.25], // G6
        ];
        const mel = sf < 0.72 ? hz(arps[bar][mod(st, 4)]) : NaN;
        const beacon = frac(u * 0.5) < 0.45 ? hz([880.0, 698.46, 1046.5, 783.99][bar]) : NaN;
        const tick = (mod(st, 2) === 1 && sf < 0.14) ? 2.75 : NaN;
        const bass = hz([110.0, 87.31, 130.81, 98.0][bar]);
        return [mel, beacon, tick, bass];
      }
      if (m === 3) {
        // Playful 16th-Note Chiptune Pulse Etude (Em -> C -> G -> D)
        const bar = clamp(fl(u / 4), 0, 3);
        const st = fl(u * 3);
        const sf = frac(u * 3);
        const chords = [
          [329.63, 392.0, 493.88, 659.25, 493.88, 392.0], // Em
          [261.63, 329.63, 392.0, 523.25, 392.0, 329.63], // C
          [392.0, 493.88, 587.33, 783.99, 587.33, 493.88], // G
          [293.66, 369.99, 440.0, 587.33, 440.0, 369.99], // D
        ];
        const pls = sf < 0.70 ? hz(chords[bar][mod(st, 6)]) : NaN;
        const harm = hz(chords[bar][0] * 0.5);
        const bass = shimWaddleY(frac(u) * 0.4, [82.41, 65.41, 98.0, 73.42][bar], 0.28);
        const bell = (mod(st, 6) === 3 && sf < 0.60) ? clamp(hz(chords[bar][3] * 2.0), -3, 3) : NaN;
        return [pls, harm, bass, bell];
      }
      if (m === 4) {
        // Steve Reich Variable-Subdivision Minimalist Groove locked to A-minor Pentatonic
        const div = [2, 3, 4, 2][mod(fl(u), 4)];
        const st = fl(frac(u) * div);
        const sf = frac(frac(u) * div);
        const pent = [440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
        const idx = mod(fl(u) + st, pent.length);
        const lead = sf < 0.72 ? hz(pent[idx]) : NaN;
        const echo = sf < 0.55 ? hz(pent[mod(idx + 2, pent.length)] * 0.5) : NaN;
        const bass = hz([110.0, 110.0, 87.31, 98.0][clamp(fl(u / 4), 0, 3)]);
        const brush = (sf < 0.16 && mod(st, 2) === 0) ? 2.65 : NaN;
        return [lead, echo, bass, brush];
      }

      // --- PHASE II: CATHEDRAL DAWN & MINIMALIST OSTINATOS (5–8) ---
      if (m === 5) {
        // Pure A1 organ pedal unfolding into ascending Am9 cathedral arpeggio + FM fifth + RVB
        const arpSeq = [110.0, 164.81, 220.0, 246.94, 261.63, 329.63, 392.0, 440.0, 493.88, 523.25, 659.25, 880.0];
        const ai = clamp(fl(u * 1.5), 0, 23);
        const sf = frac(u * 1.5);
        const note = arpSeq[mod(ai, 12)];
        const mel = sf < 0.86 ? hz(note) : NaN;
        const ped = hz(u < 12 ? 55.0 : 49.0);
        const third = u > 2.0 ? hz(u < 8 ? 261.63 : 329.63) : NaN;
        const fmHalo = u > 4.0 ? hz(u < 10 ? 329.63 : 440.0) : NaN;
        const rvb = u > 3.0 ? hz(659.25) - 0.05 * frac(u / 4) : NaN;
        return [mel, ped, third, fmHalo, rvb];
      }
      if (m === 6) {
        // Inception "Time" (Am -> Em -> G -> D)
        const bar = clamp(fl(u / 4), 0, 3);
        const roots = [55.0, 82.41, 98.0, 73.42];
        const top = [
          [440.0, 523.25], [329.63, 493.88], [392.0, 493.88], [293.66, 440.0],
        ][bar];
        const st = fl(u * 2);
        const sf = frac(u * 2);
        const piano = sf < 0.78 ? hz(top[mod(st, 2)]) + 0.03 * exp(-8 * sf) : NaN;
        const vln = hz(top[1] * 2) + 0.02 * sin(2 * PI * 5.2 * u);
        const cello = hz(roots[bar]);
        const fifth = hz(roots[bar] * 3.0);
        const rvb = hz(top[0]) - 0.06 * (1 - exp(-2 * frac(u / 4)));
        return [piano, vln, cello, fifth, rvb];
      }
      if (m === 7) {
        // Upgraded Interstellar "Cornfield Chase" — 6-step rolling 3/4 cascade + octave shimmer + F–G–Am–Em organ
        const bar = clamp(fl(u / 4), 0, 3);
        const step = fl(u * 3);
        const sf = frac(u * 3);
        const pats = [
          [440.0, 659.25, 440.0, 659.25, 440.0, 659.25], // A4-E5
          [493.88, 659.25, 493.88, 659.25, 493.88, 659.25], // B4-E5
          [523.25, 659.25, 523.25, 659.25, 523.25, 659.25], // C5-E5
          [587.33, 659.25, 523.25, 659.25, 493.88, 659.25], // D5-C5-B4 cascade
        ];
        const cel = sf < 0.82 ? hz(pats[bar][mod(step, 6)]) : NaN;
        const hiCel = (u >= 6.0 && sf < 0.72) ? clamp(hz(pats[bar][mod(step, 6)] * 2.0), -3, 3) : NaN;
        const organ = hz([174.61, 196.0, 220.0, 164.81][bar]); // F3 - G3 - Am - Em
        const bass = hz([87.31, 98.0, 110.0, 82.41][bar]);
        const hiStr = hz([659.25, 783.99, 880.0, 987.77][bar]) + 0.022 * sin(2 * PI * 5.5 * u);
        const rvb = hz(659.25) - 0.08 * frac(u / 4);
        return [cel, hiCel, organ, bass, hiStr, rvb];
      }
      if (m === 8) {
        // Dune / Blade Runner Low Brass Swell (BRAAM) + Heartbeat Sub + RVB
        const bar = clamp(fl(u / 4), 0, 3);
        const bt = frac(u / 4);
        const r = [55.0, 55.0, 65.41, 49.0][bar];
        const swell = bt < 0.72 ? hz(r) : NaN;
        const brass5 = bt < 0.72 ? hz(r * 1.5) : NaN;
        const hiPad = hz(r * 4.0) + 0.025 * sin(2 * PI * 4.8 * u);
        const pulse = frac(u * 1.5) < 0.25 ? shimKickY(frac(u * 1.5) * 0.4, 55, 0.16) : NaN;
        const rvb = bt >= 0.55 ? hz(r * 3.0) - 0.25 * (bt - 0.55) : NaN;
        return [swell, brass5, hiPad, pulse, rvb];
      }

      // --- PHASE III: PIECEWISE PURE-FUNCTION ORCHESTRATION (9–12) ---
      if (m === 9) {
        // S.T.A.Y. — Music-box ostinato + slow rising LFO strings
        const box = [880.0, 659.25, 523.25, 659.25][mod(fl(u * 2), 4)];
        const mel = evalEvents(u, [
          [0, 220.0, 3.8], [4, 246.94, 3.8], [8, 261.63, 3.8], [12, 329.63, 3.8],
        ]);
        const vln = Number.isFinite(mel) ? mel + 1.0 + 0.022 * sin(2 * PI * 5.6 * u) : NaN;
        const ped = hz([110.0, 87.31, 65.41, 98.0][clamp(fl(u / 4), 0, 3)]);
        const rvb = hz(659.25) - 0.08 * frac(u / 4);
        return [frac(u * 2) < 0.76 ? hz(box) : NaN, mel, vln, ped, rvb];
      }
      if (m === 10) {
        // Gladiator D-Dorian Vocal Cantabile with smooth logistic-sigmoid portamento
        const notes = [293.66, 329.63, 349.23, 392.0, 440.0, 440.0, 392.0, 349.23, 329.63, 349.23, 392.0, 440.0, 523.25, 440.0, 392.0, 293.66];
        const i0 = clamp(fl(u), 0, 15);
        const i1 = Math.min(15, i0 + 1);
        const sig = 1 / (1 + exp(-14 * (frac(u) - 0.78)));
        const vocal = hz(notes[i0]) * (1 - sig) + hz(notes[i1]) * sig;
        const breath = clamp(vocal + log2(1.8), -3, 3);
        const str = hz([293.66, 261.63, 233.08, 220.0][clamp(fl(u / 4), 0, 3)]) + 0.02 * sin(2 * PI * 5.4 * u);
        const ped = hz([73.42, 65.41, 58.27, 73.42][clamp(fl(u / 4), 0, 3)]);
        const rvb = vocal - 0.05;
        return [vocal, breath, str, ped, rvb];
      }
      if (m === 11) {
        // No Time For Caution — 3-against-4 cathedral organ polyrhythm (Am · F · Dm · E7)
        const bar = clamp(fl(u / 4), 0, 3);
        const ch = [
          [220.0, 261.63, 329.63, 440.0],
          [174.61, 220.0, 261.63, 349.23],
          [146.83, 220.0, 293.66, 349.23],
          [164.81, 246.94, 329.63, 415.30],
        ][bar];
        const v3 = frac(u * 1.5) < 0.80 ? hz(ch[mod(fl(u * 1.5), 4)]) : NaN;
        const v4 = frac(u * 2.0) < 0.78 ? hz(ch[mod(fl(u * 2.0), 4)] * 2.0) : NaN;
        const pls = frac(u * 2.0) < 0.45 ? hz(ch[0] * 2.0) : NaN;
        const timp = shimKickY(frac(u) * 0.4, [55.0, 43.65, 73.42, 82.41][bar], 0.16);
        const rvb = hz(ch[3]) - 0.05 * frac(u / 4);
        return [v3, v4, pls, timp, rvb];
      }
      if (m === 12) {
        // Upgraded Chevaliers de Sangreal — Consonant D-Minor String Canon + Harp over Dm -> Bb -> C -> Am
        const bar = clamp(fl(u / 4), 0, 3);
        const vlnMel = [293.66, 349.23, 440.0, 392.0, 349.23, 392.0, 440.0, 523.25, 587.33, 523.25, 440.0, 392.0, 349.23, 329.63, 293.66, 440.0];
        const idx = clamp(fl(u), 0, 15);
        const v1 = hz(vlnMel[idx]) + 0.024 * sin(2 * PI * 5.6 * u);
        // Consonant third/octave canon answer
        const ansSeq = [220.0, 220.0, 293.66, 349.23, 233.08, 293.66, 349.23, 392.0, 261.63, 329.63, 392.0, 329.63, 220.0, 261.63, 220.0, 293.66];
        const v2 = u >= 1.0 ? hz(ansSeq[idx]) : NaN;
        const bass = hz([73.42, 58.27, 65.41, 55.0][bar]); // D2 - Bb1 - C2 - A1
        const harpCh = [
          [293.66, 349.23, 440.0, 587.33], [233.08, 293.66, 349.23, 466.16],
          [261.63, 329.63, 392.0, 523.25], [220.0, 261.63, 329.63, 440.0],
        ][bar];
        const harp = frac(u * 2) < 0.72 ? hz(harpCh[mod(fl(u * 2), 4)]) : NaN;
        const rvb = v1 + 1.0 - 0.10 * frac(u / 4);
        return [v1, v2, bass, harp, clamp(rvb, -3, 3)];
      }

      // --- PHASE IV: GRAND SYMPHONIC SYNTHESIS (13–16) ---
      if (m === 13) {
        // Mombasa — Ostinato Strings + Syncopated Sub-Kick + Heroic Brass Octaves
        const st = fl(u * 2);
        const sf = frac(u * 2);
        const ost = [220.0, 220.0, 261.63, 220.0, 293.66, 261.63, 220.0, 196.0][mod(st, 8)];
        const kick = (mod(st, 8) === 0 || mod(st, 8) === 3 || mod(st, 8) === 6) ? shimIndKickY(sf * 0.25, 0.18) : NaN;
        const brass = evalEvents(u, [
          [0, 440.0, 3.6], [4, 523.25, 3.6], [8, 587.33, 3.6], [12, 659.25, 3.8],
        ]);
        const perc = (mod(st, 4) === 2 && sf < 0.45) ? 2.25 - 1.4 * sf : NaN;
        const tick = (mod(st, 2) === 1 && sf < 0.22) ? 2.82 : NaN;
        return [sf < 0.78 ? hz(ost) : NaN, kick, brass, perc, tick];
      }
      if (m === 14) {
        // Mountains — Relativistic Clock Tick + Swelling 5-Voice Cathedral Chord (Am -> Fmaj7 -> C -> G6)
        const bar = clamp(fl(u / 4), 0, 3);
        const tick = frac(u * 1.25) < 0.12 ? 2.86 : NaN;
        const ch = [
          [110.0, 220.0, 329.63, 523.25],
          [87.31, 174.61, 329.63, 440.0],
          [130.81, 261.63, 392.0, 659.25],
          [98.0, 196.0, 329.63, 587.33],
        ][bar];
        const bt = frac(u / 4);
        return [
          tick,
          hz(ch[1]),
          bt > 0.15 ? hz(ch[2]) : NaN,
          hz(ch[0]),
          bt > 0.30 ? hz(ch[3]) + 0.02 * sin(2 * PI * 5.2 * u) : NaN,
          hz(ch[3]) - 0.18 * bt,
        ];
      }
      if (m === 15) {
        // Flight (Man of Steel) — Heroic D-Major Fifths & Triumphant Octave Fanfare
        const fanfare = evalEvents(u, [
          [0.0, 369.99, 1.8], [2.0, 392.0, 1.8], [4.0, 440.0, 3.6],
          [8.0, 587.33, 1.8], [10.0, 659.25, 1.8], [12.0, 739.99, 3.8],
        ]);
        const hiFan = Number.isFinite(fanfare) ? clamp(fanfare + 1.0, -3, 3) : NaN;
        const pArp = frac(u * 2) < 0.78 ? hz([293.66, 440.0, 587.33, 440.0][mod(fl(u * 2), 4)]) : NaN;
        const fifth = hz([146.83, 146.83, 196.0, 220.0][clamp(fl(u / 4), 0, 3)]);
        const sub = hz([73.42, 73.42, 98.0, 110.0][clamp(fl(u / 4), 0, 3)]);
        const rvb = Number.isFinite(hiFan) ? hiFan - 0.08 * frac(u / 4) : NaN;
        return [fanfare, hiFan, pArp, fifth, sub, rvb];
      }
      if (m === 16) {
        // Part 16: Grand 8-Voice Hans Zimmer Cathedral Symphony Finale (Am · F · C · G · Am)
        const q = clamp(fl(u / 4), 0, 3);
        const prog = [
          { r: 55.0, c: 220.0, m: 440.0, h: 659.25, a: [220, 329.63, 440, 523.25] }, // Am
          { r: 43.65, c: 174.61, m: 349.23, h: 698.46, a: [174.61, 261.63, 349.23, 440] }, // F
          { r: 65.41, c: 261.63, m: 523.25, h: 783.99, a: [261.63, 392.0, 523.25, 659.25] }, // C
          { r: 49.0, c: 196.0, m: 587.33, h: 880.0, a: [196.0, 293.66, 392.0, 587.33] }, // G -> Am
        ][q];
        const pArp = frac(u * 2) < 0.80 ? hz(prog.a[mod(fl(u * 2), 4)]) : NaN;
        const flute = hz(prog.h);
        const vln = hz(prog.h) + 0.025 * sin(2 * PI * 5.8 * u);
        const fmBell = hz(prog.m);
        const cello = hz(prog.c);
        const brass = hz(prog.r);
        const tick = (mod(fl(u * 2), 4) === 0 && frac(u * 2) < 0.25) ? hz(1760.0) : NaN;
        const rvb = hz(prog.h) - 0.14 * frac(u / 4);
        return [pArp, flute, vln, fmBell, cello, brass, tick, rvb];
      }

      // Part 17: Aphex Twin — Bucephalus Bouncing Ball (Musical F#m9 / Dmaj9 Geometric Gravity Cascade)
      if (m === 17) {
        const T_cyc = 8.05;
        const r = 0.78;
        const cyc = mod(u, 8.0);
        const halfIdx = fl(u / 8.0); // 0 -> F#m9, 1 -> Dmaj9
        const n = clamp(fl(Math.log(Math.max(1e-4, 1 - cyc / T_cyc)) / Math.log(r)), 0, 22);
        const t_n = T_cyc * (1 - Math.pow(r, n));
        const d_n = T_cyc * Math.pow(r, n) * (1 - r);
        const p = clamp((cyc - t_n) / Math.max(1e-4, d_n), 0, 1);

        // Consonant chord-tone pools: F#m9 {F#4, A4, C#5, E5, G#5} & Dmaj9 {D4, F#4, A4, C#5, E5}
        const scale = halfIdx === 0
          ? [369.99, 440.00, 554.37, 659.25, 830.61]
          : [293.66, 369.99, 440.00, 554.37, 659.25];
        // Descending energy level maps bounce index n onto consonant chord tones (high -> root)
        const deg = clamp(4 - fl(n / 3), 0, 4);
        const noteF = scale[mod(deg + (mod(n, 2) === 0 ? 0 : 1), 5)];
        // 1) Pure crystalline bouncing-ball strike (tight percussive marimba envelope, accelerating with r = 0.78!)
        const gate = Math.min(0.76, Math.max(0.28, 0.78 - n * 0.02));
        const ballNote = p < gate ? hz(noteF) + 0.025 * exp(-10 * p) : NaN;
        // 2) Harmonic fifth / octave shadow following the shrinking bounce energy
        const shadowF = scale[clamp(deg, 0, 4)] * 0.5;
        const ballShadow = p < gate * 0.85 ? hz(shadowF) : NaN;
        // 3) Deep warm Selected Ambient Works bass progression (F#1 -> A1 -> D2 -> E2)
        const bass = hz([46.25, 55.0, 73.42, 82.41][clamp(fl(u / 4), 0, 3)]);
        // 4) Subtle crisp hi-hat click on every 2nd bounce impact
        const bTick = (p < 0.09 && mod(n, 2) === 0) ? 2.82 : NaN;
        // 5) Serene floating ambient RVB pad (C#5 / E5)
        const pad = hz(halfIdx === 0 ? 554.37 : 659.25) - 0.03 * frac(u / 8);
        return [ballNote, ballShadow, bass, bTick, pad];
      }

      // Part 18: Braided Macro-Wave Mosaic of Short 1/x & exp(±kt) Pieces over Warm Constant Lines (Am9 · Fmaj7 · C · G)
      const bar = clamp(fl(u / 4), 0, 3);
      const seg = clamp(fl(u * 2), 0, 31);     // 32 eighth-note slots across x ∈ [-8, 8]
      const t = frac(u * 2);                   // local slot parameter t ∈ [0, 1)
      // Flowing 2- and 3-piece phrase clusters tracing two grand arches (with natural phrase breaths)
      const fmMask =  [1,1,0,1, 1,1,0,0,  1,1,1,0, 1,1,0,0,  1,1,0,1, 1,1,1,0,  1,1,0,1, 1,0,1,0];
      const expMask = [0,1,1,0, 0,1,1,1,  0,0,1,1, 0,1,1,0,  0,1,1,0, 0,1,1,1,  0,1,1,0, 1,1,0,1];
      // 1) FM 1/(t+c) Hyperbola Series tracing a sweeping two-peak macro arch across consonant octaves
      const fmRoots = [
        329.63, 440.00, 0, 523.25, 659.25, 880.00, 0, 0,       // Arch 1 rise: E4→A4→C5→E5→A5
        698.46, 523.25, 440.00, 0, 523.25, 698.46, 0, 0,       // Arch 1 glide: F5→C5→A4→C5→F5
        523.25, 659.25, 0, 783.99, 1046.5, 783.99, 659.25, 0,  // Arch 2 climax: C5→E5→G5→C6→G5→E5
        587.33, 493.88, 0, 587.33, 783.99, 0, 659.25, 0,       // Arch 2 resolve: D5→B4→D5→G5→E5
      ];
      const fmGate = mod(seg, 3) === 0 ? 0.48 : (mod(seg, 2) === 0 ? 0.40 : 0.34);
      const fmPiece = (fmMask[seg] && t < fmGate)
        ? clamp(hz(fmRoots[seg]) + 0.34 / (t + 0.30) - 0.48, -2.8, 2.8)
        : NaN;
      // 2) TRI exp(±kt) Counter-Arch Series weaving underneath & through the FM hyperbolas
      const expRoots = [
        0, 220.00, 261.63, 0, 0, 329.63, 440.00, 329.63,       // Counter-wave 1: A3→C4→E4→A4→E4
        0, 0, 261.63, 349.23, 0, 261.63, 220.00, 0,            // Dip & breath: C4→F4→C4→A3
        0, 261.63, 329.63, 0, 0, 392.00, 523.25, 392.00,       // Counter-wave 2: C4→E4→G4→C5→G4
        0, 293.66, 392.00, 0, 493.88, 392.00, 0, 329.63,       // Resolve: D4→G4→B4→G4→E4
      ];
      const expGate = mod(seg, 3) === 1 ? 0.46 : 0.36;
      const lt = clamp(t / expGate, 0, 1);
      // Rising exp arcs on upward slopes, falling exp arcs on downward slopes to mimic the macro curve!
      const rising = (seg < 6) || (seg >= 15 && seg < 22) || (seg >= 25 && seg < 29);
      const expCurve = rising
        ? 0.64 * (exp(2.3 * lt) - 1) / (exp(2.3) - 1)
        : 0.68 * exp(-4.6 * lt);
      const expPiece = (expMask[seg] && t < expGate)
        ? clamp(hz(expRoots[seg]) + expCurve, -2.8, 2.8)
        : NaN;
      // 3) SINE Constant Harmonic Mid-Line (steady warm chord guide tones: E4 -> C4 -> G4 -> D4)
      const constMid = hz([329.63, 261.63, 392.00, 293.66][bar]);
      // 4) LPF Constant Deep Bass Line (steady grounded roots: A1 -> F2 -> C2 -> G2)
      const constBass = hz([55.00, 87.31, 65.41, 98.00][bar]);
      // 5) RVB Constant Upper Halo Line (serene high chord tone: A4 -> A4 -> E5 -> B4)
      const constTop = hz([440.00, 440.00, 659.25, 493.88][bar]);
      return [fmPiece, expPiece, constMid, constBass, constTop];
    },
  },

  // ==========================================================================
  // B-SOUND SECTION — B-SYSTEM VIRTUAL DSP PROCESSOR (DEMOS 17–24)
  // Analytical models of MEDIA-SOUND.txt, MEDIA-SDK.txt, Orchestra.html & media.html
  // ==========================================================================

  // 17 — B-Sound Part I: Kinematic Mascot Shims (8 musical parts, 1:1 media.html Shims 1A–5 + Boing)
  {
    id: "17", name: "B-SOUND: KINEMATIC SHIMS", src: "B-SOUND §3", speed: 2.2, bsound: true,
    parts: [
      {
        m: 1, modes: ["tri", "lpf", "sine"],
        f: "Part 1/8 · shimWaddle [SHIM 2] — Bipedal Crystal Step & Low-Pass Walking Bass\ny(τ) = log₂(f₀ · 0.82^(τ/d) / F₀) · Triangle step + 180 Hz LPF body bass + step bounce",
      },
      {
        m: 2, modes: ["sine", "fm", "hpf"],
        f: "Part 2/8 · shimDing [SHIM 5] — High Crystal Chime, FM Shimmer & Starlight Ping\nPure sine {A6 1760, E6 1318.5, D6 1174.7, G5 784} + 2-Op FM halo + HPF crystal attack",
      },
      {
        m: 3, modes: ["pls", "sine", "sine", "sine", "sine", "sine"],
        f: "Part 3/8 · shimPulseSquash [SHIM 1A] — 6-Harmonic Singing Triad + Chiptune Pulse\n{C4 261.6, C5 523.3, E5 659.3, G5 784.0, C6 1046.5, E6 1318.5} · 0.97→1.00 scoop in 0.10 s",
      },
      {
        m: 4, modes: ["sine", "sine", "sine", "lfo", "lpf"],
        f: "Part 4/8 · shimFloat [SHIM 3] — Fender Rhodes Modal Chords + LFO Tine Shimmer\n{C5, E5, G5, C6} / Dm9 {F4, A4, C5, E5} · stagger 60 ms · 0.985→1 scoop + warm LPF bass",
      },
      {
        m: 5, modes: ["sine", "pls", "lpf"],
        f: "Part 5/8 · shimDance [SHIM 4] — Sparkling 5-Note Star Cascade & Chiptune Arp\n{D5 587.3, F#5 740.0, A5 880.0, D6 1174.7, F#6 1480.0} + PLS echo + bouncy LPF bass",
      },
      {
        m: 6, modes: ["am", "tri", "bpf"],
        f: "Part 6/8 · shimFrogCroak [SHIM 1A-Alt] — 32 Hz AM Cuíca Rasp + Throat Formant BPF\n125 Hz (190 ms) + 155 Hz (95 ms) · 2.45× triangle overtone + 2.2×f bandpass air-sac cavity",
      },
      {
        m: 7, modes: ["fm", "sine", "sine", "sine", "lfo"],
        f: "Part 7/8 · shimPulseBell [SHIM 1B / GM 98] — 2-Op FM Bell + Golden Chi Swell\nEq. 12: y(t) = A·sin(2πf_c t + 1.8·sin(2π·2.76 f_c t)) + {C3, G3, C4, G4, C5} LFO halo",
      },
      {
        m: 8, modes: ["lpf", "sine", "pls", "am", "fm", "tri"],
        f: "Part 8/8 · Full Mascot Audio-Visual Shim Suite + sfxLilCubeBoing (523→1175→784 Hz)\nWaddle(LPF) + Ding + Dance(PLS) + FrogCroak(AM) + PulseBell(FM) + Boing(TRI)",
      },
    ],
    eval(x, pi) {
      const u = x + 8; // 0..16
      const m = this.parts[pi].m;
      if (m === 1) {
        const bi = fl(u);
        const bt = frac(u) * 0.45;
        const pitches = [164.81, 246.94, 329.63, 392.00, 329.63, 246.94, 196.00, 164.81, 146.83, 220.0, 293.66, 329.63, 293.66, 220.0, 196.0, 164.81];
        const f = pitches[mod(bi, 16)];
        return [
          shimWaddleY(bt, f, 0.24),
          shimWaddleY(bt, f * 0.5, 0.30),
          (mod(bi, 2) === 0 && bt < 0.14) ? hz(f * 2.0) : NaN,
        ];
      }
      if (m === 2) {
        const st = fl(u * 2);
        const sf = frac(u * 2);
        const mel = [1760.0, 1318.51, 1174.66, 1318.51, 1567.98, 1318.51, 987.77, 1318.51];
        const f = mel[mod(st, 8)];
        return [
          sf < 0.78 ? hz(f) : NaN,
          hz([329.63, 293.66, 261.63, 246.94][clamp(fl(u / 4), 0, 3)]),
          (sf < 0.16 && mod(st, 2) === 0) ? clamp(hz(f * 1.5), -3.0, 3.0) : NaN,
        ];
      }
      if (m === 3) {
        const cyc = mod(u, 4) * 0.6;
        const freqs = [261.63, 523.25, 659.25, 783.99, 1046.50, 1318.51];
        const durs = [2.2, 2.4, 2.0, 2.1, 1.7, 1.4];
        const pitchMul = fl(u / 4) % 2 === 0 ? 1.0 : 1.122;
        return freqs.map((f, i) => {
          if (cyc >= durs[i]) return NaN;
          const scoop = 0.97 * Math.pow(1 / 0.97, clamp(cyc / 0.10, 0, 1));
          return hz(f * pitchMul * scoop);
        });
      }
      if (m === 4) {
        const cyc = mod(u, 4) * 0.25;
        const bar = clamp(fl(u / 4), 0, 3);
        const chords = [
          [523.25, 659.25, 783.99, 1046.50], // Cmaj7
          [349.23, 440.00, 523.25, 659.25],  // Dm9
          [349.23, 493.88, 659.25, 880.00],  // G13
          [392.00, 466.16, 587.33, 739.99],  // Ebmaj7#11
        ];
        const fltT = [0.00, 0.06, 0.12, 0.18];
        const fltD = [0.65, 0.60, 0.72, 0.78];
        const out = chords[bar].map((f, idx) => {
          const nt = cyc - fltT[idx];
          if (nt < 0 || nt >= fltD[idx]) return NaN;
          const scoop = 0.985 * Math.pow(1 / 0.985, clamp(nt / 0.04, 0, 1));
          return hz(f * scoop) + (idx === 3 ? 0.018 * sin(2 * PI * 5.2 * nt) : 0);
        });
        out.push(hz([130.81, 146.83, 98.00, 155.56][bar]));
        return out;
      }
      if (m === 5) {
        const cyc = mod(u, 4) * 0.22;
        const bar = clamp(fl(u / 4), 0, 3);
        const sc = [1.0, 0.89, 0.79, 1.0][bar];
        const dEv = [
          [0.00, 587.33 * sc, 0.20], [0.085, 739.99 * sc, 0.22], [0.170, 880.00 * sc, 0.25],
          [0.255, 1174.66 * sc, 0.32], [0.370, 1479.98 * sc, 0.45],
        ];
        const lead = evalEvents(cyc, dEv);
        const echo = evalEvents(cyc - 0.09, dEv);
        const bass = shimWaddleY(frac(u) * 0.4, [146.83, 130.81, 116.54, 146.83][bar], 0.25);
        return [lead, Number.isFinite(echo) ? echo - 1.0 : NaN, bass];
      }
      if (m === 6) {
        const cyc = mod(u, 4) * 0.16;
        const mul = [1.0, 0.90, 1.15, 0.95][clamp(fl(u / 4), 0, 3)];
        const f1 = shimFrogY(cyc - 0.04, 125 * mul, 0.19);
        const f2 = shimFrogY(cyc - 0.29, 155 * mul, 0.095);
        const frog1 = Number.isFinite(f1) ? f1 : f2;
        const frog2 = Number.isFinite(frog1) ? frog1 + log2(2.45) : NaN;
        const formant = Number.isFinite(frog1) ? hz(125 * 2.2 * mul) : NaN;
        return [frog1, frog2, formant];
      }
      if (m === 7) {
        const bellT = mod(u, 8) * 0.44;
        const bScoop = 0.985 * Math.pow(1 / 0.985, clamp(bellT / 0.14, 0, 1));
        const fmBell = bellT < 3.5 ? hz(130.81 * bScoop) + 0.05 * exp(-bellT * 1.4) * sin(2 * PI * 2.76 * bellT * 4) : NaN;
        return [
          fmBell,
          bellT < 3.2 ? hz(196.00 * bScoop) : NaN,
          bellT < 3.4 ? hz(261.63 * bScoop) : NaN,
          bellT < 3.0 ? hz(392.00 * bScoop) : NaN,
          bellT < 2.8 ? hz(523.25 * bScoop) + 0.02 * sin(2 * PI * 4.5 * bellT) : NaN,
        ];
      }
      // Part 8: Full Mascot Suite + sfxLilCubeBoing
      const bi = fl(u * 0.5);
      const bt = frac(u * 0.5) * 0.5;
      const waddle = shimWaddleY(bt, [164.81, 246.94, 329.63, 246.94][mod(bi, 4)], 0.20);
      const ding = mod(u, 4) < 0.7 ? hz(1760.0) : NaN;
      const dance = evalEvents(mod(u, 4) * 0.25, [
        [0.0, 587.33, 0.18], [0.1, 739.99, 0.18], [0.2, 880.0, 0.18], [0.3, 1174.66, 0.22], [0.42, 1479.98, 0.30],
      ]);
      const frog = shimFrogY(mod(u, 4) * 0.25 - 0.60, 125, 0.19);
      const bell = hz(130.81) + 0.03 * sin(2 * PI * 2.76 * u);
      const boingT = mod(u - 2.0, 4) * 0.25;
      const boing = (boingT >= 0 && boingT < 0.28)
        ? hz(boingT < 0.14 ? 523.25 * Math.pow(1174.66 / 523.25, boingT / 0.14) : 1174.66 * Math.pow(783.99 / 1174.66, (boingT - 0.14) / 0.14))
        : NaN;
      return [waddle, ding, dance, frog, bell, boing];
    },
  },

  // 18 — B-Sound Part II: Percussion & Membrane Shims (8 groovy parts, 1:1 media.html Shims 6, 7, 8, 19, 20, 23)
  {
    id: "18", name: "B-SOUND: PERCUSSION DSP", src: "B-SOUND §4", speed: 3.2, bsound: true,
    parts: [
      {
        m: 1, modes: ["sine", "sine", "noise"],
        f: "Part 1/8 · shimKick [SHIM 6 / GM 116] — Syncopated Sub-Drop Breakbeat\nf(τ) = 2.2·f₀ · (0.75/2.2)^(τ/0.16) · Tuned kicks {55, 65, 73.4, 82.4 Hz} + double-kick turnaround",
      },
      {
        m: 2, modes: ["tri", "tri", "sine", "noise"],
        f: "Part 2/8 · shimPianoHammer [SHIM 19] — 3:4 Prepared-Piano Polyrhythm\nFelt impact 120→40 Hz (35 ms) + high wood accent 180→60 Hz + syncopated kick & rim tick",
      },
      {
        m: 3, modes: ["tri", "noise", "sine", "noise"],
        f: "Part 3/8 · shimSnare [SHIM 7 / GM 117] — Funk Backbeat, Ghost Notes & 16th Snare Roll\nShell: tri 175→114 Hz (120 ms) + Wire: BP 2400 Hz (150 ms) + syncopated kick & accelerating fill",
      },
      {
        m: 4, modes: ["tri", "noise", "noise", "sine"],
        f: "Part 4/8 · shimSnare Rimshot (vel ≥ 110) — Tetsujiro Obara Jazz Swing & Triplet Fills\nRimshot: 220→143 Hz + BP 3200 Hz crack + swinging ride/hat + bar-end triplet snare burst",
      },
      {
        m: 5, modes: ["hpf", "sine", "sine", "tri"],
        f: "Part 5/8 · shimHiHat [SHIM 8 / GM 118] — 16th-Note Closed/Open Sizzle Matrix\nHP 7500 Hz + {8400 Hz closed 55 ms / 6200 Hz open 280 ms} + breakbeat kick & snare shell",
      },
      {
        m: 6, modes: ["sine", "sine", "lpf", "sine"],
        f: "Part 6/8 · shimTimpani [SHIM 23 / GM 47] — Concert Kettle Drum Fanfare & Crescendo Roll\nHead 1.55f→f (50 ms) + Mode (1,1) 1.48f + Mallet LP 260 Hz · E2–G2–A2–B2 roll → E3 climax",
      },
      {
        m: 7, modes: ["bpf", "sine", "sine", "hpf", "tri"],
        f: "Part 7/8 · shimPedalSwoosh [SHIM 20] — Resonant Damper Swells & Orchestral Percussion\nBP 450→280 Hz (Q = 3.5, 400 ms) weaving with open hi-hat sizzles, timpani booms & felt clicks",
      },
      {
        m: 8, modes: ["sine", "tri", "nse", "hpf", "sine", "lpf"],
        f: "Part 8/8 · Full B-Sound Breakbeat Showcase — Kick · Snare/Rim · HiHat · Timpani · Waddle Bass\n32-step syncopated funk/jazz groove with fills & walking bass · WCET 632 µs @ Q = 32 frames",
      },
    ],
    eval(x, pi) {
      const u = x + 8; // 0..16 -> 32 sixteenth-note steps (0.5 units/step, ~156 ms/step @ speed 3.2)
      const m = this.parts[pi].m;
      const step = clamp(fl(u * 2), 0, 31);
      const s16 = mod(step, 16);
      const sf = frac(u * 2) * 0.156; // 0..0.156s per 16th step

      if (m === 1) {
        // Syncopated 32-step tuned kick breakbeat + sub tail + offbeat hat tick
        const kMask = [1,0,0,1, 0,0,1,0, 1,0,1,0, 0,1,1,1];
        const kHit = kMask[s16] === 1;
        const kPitches = [65, 65, 55, 73.42, 65, 65, 82.41, 55];
        const kp = kPitches[fl(step / 4)];
        const kick = kHit ? shimKickY(sf, kp, 0.145) : NaN;
        const sub = (kHit && sf < 0.12) ? hz(kp * 0.75) : NaN;
        const tick = (mod(step, 4) === 2 && sf < 0.045) ? 2.82 - 2.0 * sf : NaN;
        return [kick, sub, tick];
      }
      if (m === 2) {
        // 3-against-4 prepared piano felt-hammer polyrhythm + kick + rim tick
        const h1 = (mod(step, 3) === 0 && sf < 0.065) ? hz(120 * Math.pow(40 / 120, sf / 0.065)) : NaN;
        const h2 = ((mod(step, 4) === 1 || mod(step, 8) === 6) && sf < 0.055) ? hz(190 * Math.pow(65 / 190, sf / 0.055)) : NaN;
        const kick = (s16 === 0 || s16 === 6 || s16 === 10) ? shimKickY(sf, 65, 0.14) : NaN;
        const rim = (s16 === 4 || s16 === 12) && sf < 0.05 ? 2.45 - 3.0 * sf : NaN;
        return [h1, h2, kick, rim];
      }
      if (m === 3) {
        // Funk backbeat + ghost notes + 16th-note accelerating snare roll on steps 28..31
        const isRoll = step >= 28;
        const isBack = s16 === 4 || s16 === 12;
        const isGhost = s16 === 7 || s16 === 9 || s16 === 15;
        const sHit = isRoll || isBack || isGhost;
        const dur = isRoll ? 0.08 : (isGhost ? 0.06 : 0.13);
        const shell = (sHit && sf < dur) ? hz((isRoll ? 195 : 175) * Math.pow(0.65, sf / dur)) : NaN;
        const wire = (sHit && sf < dur) ? (isBack ? 2.22 : (isRoll ? 2.38 : 1.92)) - 2.4 * sf : NaN;
        const kick = (!isRoll && (s16 === 0 || s16 === 6 || s16 === 10)) ? shimKickY(sf, 65, 0.14) : NaN;
        const hh = (!isRoll && mod(step, 2) === 0 && sf < 0.05) ? 2.82 : NaN;
        return [shell, wire, kick, hh];
      }
      if (m === 4) {
        // Jazz swing rimshot + triplet snare fill on last 4 steps
        const isFill = step >= 27;
        const rimHit = isFill || s16 === 4 || s16 === 11 || s16 === 14;
        const dur = isFill ? 0.075 : 0.11;
        const shell = (rimHit && sf < dur) ? hz(220 * Math.pow(0.65, sf / dur)) : NaN;
        const crack = (rimHit && sf < dur) ? 2.52 - 3.0 * sf : NaN;
        // Swinging ride/hat pattern (steps 0, 4, 7, 8, 12, 15)
        const swHit = s16 === 0 || s16 === 4 || s16 === 7 || s16 === 8 || s16 === 12 || s16 === 15;
        const ride = (swHit && sf < 0.09) ? (s16 === 7 || s16 === 15 ? 2.92 : 2.74) - 1.2 * sf : NaN;
        const kick = (s16 === 0 || s16 === 10) ? shimKickY(sf, 65, 0.14) : NaN;
        return [shell, crack, ride, kick];
      }
      if (m === 5) {
        // 16th-note closed/open hi-hat choreography with metallic ping + kick + snare shell
        const openMask = [0,0,1,0, 0,0,0,1, 0,0,1,0, 0,0,1,0];
        const isOpen = openMask[s16] === 1;
        const dur = isOpen ? 0.145 : 0.055;
        const hhNoise = sf < dur ? (isOpen ? 2.58 : 2.86) - 1.6 * sf : NaN;
        const hhPing = sf < dur ? (isOpen ? 2.90 : 3.00) : NaN;
        const kick = (s16 === 0 || s16 === 5 || s16 === 10) ? shimKickY(sf, 65, 0.14) : NaN;
        const snShell = ((s16 === 4 || s16 === 12) && sf < 0.11) ? hz(175 * Math.pow(0.65, sf / 0.11)) : NaN;
        return [hhNoise, hhPing, kick, snShell];
      }
      if (m === 6) {
        // Concert Timpani Fanfare (E2-G2-A2-B2 roll -> E3 climax)
        const fSeq = [
          82.41, 0, 82.41, 98.0, 110.0, 0, 98.0, 82.41,
          123.47, 0, 110.0, 98.0, 82.41, 0, 123.47, 0,
          82.41, 98.0, 110.0, 123.47, 164.81, 0, 123.47, 110.0,
          123.47, 123.47, 123.47, 123.47, 164.81, 0, 82.41, 0,
        ];
        const f = fSeq[step];
        const isRoll = step >= 24 && step <= 27;
        const dur = isRoll ? 0.12 : 0.15;
        const head = (f > 0 && sf < dur) ? hz(f * (sf < 0.05 ? 1.55 * Math.pow(1 / 1.55, sf / 0.05) : 1.0)) : NaN;
        const mode11 = (f > 0 && sf < dur * 0.7) ? hz(f * 1.48) : NaN;
        const mallet = (f > 0 && sf < 0.045) ? hz(260) : NaN;
        const subBoom = (step === 28 || step === 30) ? hz(f * 0.5) : NaN;
        return [head, mode11, mallet, subBoom];
      }
      if (m === 7) {
        // Atmospheric Damper Pedal Swooshes + Open Hi-Hat Sizzles + Timpani Booms + Felt Clicks
        const swT = frac(u * 0.25) * 0.65;
        const swoosh = swT < 0.42 ? hz(450 * Math.pow(280 / 450, swT / 0.42)) : NaN;
        const timpRoots = [82.41, 110.0, 98.0, 123.47];
        const tf = timpRoots[fl(step / 8)];
        const tHit = mod(step, 8) === 0 || mod(step, 8) === 5;
        const timp = (tHit && sf < 0.14) ? hz(tf * (sf < 0.05 ? 1.55 * Math.pow(1 / 1.55, sf / 0.05) : 1.0)) : NaN;
        const timpM = (tHit && sf < 0.09) ? hz(tf * 1.48) : NaN;
        const hat = ((mod(step, 4) === 2 || mod(step, 8) === 7) && sf < 0.13) ? 2.68 - 1.4 * sf : NaN;
        const hammer = (mod(step, 4) === 3 && sf < 0.055) ? hz(120 * Math.pow(40 / 120, sf / 0.055)) : NaN;
        return [swoosh, timp, timpM, hat, hammer];
      }
      // Part 8: Full 32-Step B-Sound Breakbeat Showcase + Fill + Walking Bass
      const isFill = step >= 28;
      const kHit = !isFill && (s16 === 0 || s16 === 5 || s16 === 10 || (step === 22));
      const sHit = isFill || s16 === 4 || s16 === 12 || s16 === 15;
      const isRim = isFill || s16 === 12;
      const kick = kHit ? shimKickY(sf, step < 16 ? 65 : 55, 0.145) : NaN;
      const snShell = (sHit && sf < 0.11) ? hz((isRim ? 220 : 175) * Math.pow(0.65, sf / 0.11)) : NaN;
      const snWire = (sHit && sf < 0.11) ? (isRim ? 2.42 : 2.12) - 2.2 * sf : NaN;
      const openHH = s16 === 7 || s16 === 14;
      const hh = (!isFill && (mod(step, 2) === 0 || openHH) && sf < (openHH ? 0.14 : 0.05))
        ? (openHH ? 2.62 : 2.86) - 1.5 * sf : NaN;
      const timpF = [82.41, 110.0, 98.0, 123.47][fl(step / 8)];
      const timp = (mod(step, 8) === 0 && sf < 0.14) ? hz(timpF * (sf < 0.05 ? 1.55 * Math.pow(1 / 1.55, sf / 0.05) : 1.0)) : NaN;
      const bassP = [110.0, 110.0, 130.81, 146.83, 164.81, 146.83, 130.81, 123.47];
      const waddle = (mod(step, 2) === 0) ? shimWaddleY(sf, bassP[mod(fl(step / 2), 8)], 0.13) : NaN;
      return [kick, snShell, snWire, hh, timp, waddle];
    },
  },

  // 19 — B-Sound Part III: Acoustic & Orchestral Shims (8 expressive miniatures, 1:1 media.html Shims 9, 10, 11, 18, 21, 22)
  {
    id: "19", name: "B-SOUND: ACOUSTIC & ORCHESTRA", src: "ORCHESTRA §3", speed: 2.2, bsound: true,
    parts: [
      {
        m: 1, modes: ["sine", "tri", "sine", "lpf"],
        f: "Part 1/8 · shimGrandPiano [SHIM 10 / GM 0] — Concert Grand Arpeggio Prelude (Am–F–Dm–E7)\nTri-harmonic strings f · {1.000, 2.002, 3.006} + left-hand concert bass · 8 ms hammer attack",
      },
      {
        m: 2, modes: ["lpf", "tri", "sine", "bpf"],
        f: "Part 2/8 · shimPedalBass [SHIM 11 / GM 38] — Baroque Sforzando Passacaglia\nDescending A1–G1–F1–E1–D1–C1–B1–E1 gravity glide (0.98^(τ/d)) + octave + chimes + damper swoosh",
      },
      {
        m: 3, modes: ["tri", "tri", "lpf", "nse"],
        f: "Part 3/8 · shimGuitar [SHIM 9 / GM 26] — Kazumi Watanabe Hollowbody Jazz-Blues\nGibson L-5 melody with blue-note slides (G4→G#4, D5→E5) + guide-tone chords + walking bass + brush",
      },
      {
        m: 4, modes: ["tri", "bpf", "sine", "lpf"],
        f: "Part 4/8 · shimSaxFlute [SHIM 18 / GM 73] — Debussy / Jazz Woodwind Arabesque\nSoaring triangle flute + 1.8·f bandpass breath formant (Q = 5.0) + harp arpeggios & warm pedal",
      },
      {
        m: 5, modes: ["lfo", "saw", "bpf", "lpf"],
        f: "Part 5/8 · shimViolin [SHIM 21 / GM 40] — Romantic Solo Violin Cadenza\nRosin attack (BP 3.2 kHz) + dual saw (1.002×) + delayed 5.8 Hz vibrato + pizzicato cello pulse",
      },
      {
        m: 6, modes: ["lpf", "tri", "sine", "lpf"],
        f: "Part 6/8 · shimCello [SHIM 22 / GM 42] — Bach Cello Suite (Arco LP 520 → Pizzicato LP 1200)\nBroken-chord Am–F–Dm–E7 prelude switching from bowed Arco sustain to crisp Pizzicato plucks",
      },
      {
        m: 7, modes: ["lfo", "saw", "lpf", "bpf", "sine"],
        f: "Part 7/8 · Orchestra String & Woodwind Quartet — Violin · Viola (−7) · Cello · Flute · Harp\nContrapuntal fugato: GM 40 Violin + GM 41 Viola + GM 42 Cello + GM 73 Flute + GM 46 Harp",
      },
      {
        m: 8, modes: ["lpf", "lpf", "tri", "lfo", "sine", "bpf"],
        f: "Part 8/8 · Full Classic Chamber Ensemble — PedalBass · Cello · Guitar · Violin · Piano · Flute\n6-voice Orchestra Classic Template (Am–C–D–F–Am–E7–Am finale · 48-slot pool · Eq. 8 pan)",
      },
    ],
    eval(x, pi) {
      const u = x + 8; // 0..16
      const m = this.parts[pi].m;
      if (m === 1) {
        // Flowing 32-step Concert Grand Prelude across Am -> F -> Dm -> E7
        const step = clamp(fl(u * 2), 0, 31);
        const sf = frac(u * 2);
        const bar = fl(step / 8); // 0..3
        const arps = [
          [220.0, 261.63, 329.63, 440.0, 523.25, 440.0, 329.63, 261.63], // Am
          [174.61, 220.0, 261.63, 349.23, 440.0, 349.23, 261.63, 220.0], // F
          [146.83, 220.0, 293.66, 349.23, 440.0, 349.23, 293.66, 220.0], // Dm
          [164.81, 246.94, 329.63, 415.30, 493.88, 415.30, 329.63, 246.94], // E7
        ];
        const f = arps[bar][mod(step, 8)];
        const lh = [110.0, 87.31, 73.42, 82.41][bar];
        return [
          sf < 0.85 ? hz(f) : NaN,
          sf < 0.65 ? hz(f * 2.002) : NaN,
          sf < 0.45 ? clamp(hz(f * 3.006), -3.0, 3.0) : NaN,
          hz(lh),
        ];
      }
      if (m === 2) {
        // Baroque Sforzando Passacaglia: 8 descending steps + octave + upper harp chime + damper swoosh
        const seg = clamp(fl(u / 2), 0, 7);
        const st = frac(u / 2) * 2.0;
        const roots = [55.0, 49.0, 43.65, 41.20, 73.42, 65.41, 61.74, 82.41];
        const f0 = roots[seg];
        const pBass = hz(f0 * Math.pow(0.98, st / 2.0));
        const oct = st < 1.75 ? hz(f0 * 2.0) : NaN;
        const chimeNotes = [440.0, 392.0, 349.23, 329.63, 587.33, 523.25, 493.88, 659.25];
        const chime = (st >= 0.45 && st < 1.55) ? hz(chimeNotes[seg] * (st > 1.0 ? 1.5 : 1.0)) : NaN;
        const swoosh = st < 0.35 ? hz(450 * Math.pow(280 / 450, st / 0.35)) : NaN;
        return [pBass, oct, chime, swoosh];
      }
      if (m === 3) {
        // Kazumi Watanabe Jazz-Blues Chord-Melody + Walking Bass + Soft Brush
        const lead = evalEvents(u, [
          [0.0, 293.66, 0.7], [0.8, 349.23, 0.7], [1.6, 392.00, 0.8, 415.30], [2.5, 440.00, 1.3],
          [4.0, 523.25, 0.6, 554.37], [4.7, 587.33, 0.9, 659.25], [5.8, 523.25, 0.6], [6.5, 440.00, 1.2],
          [8.0, 698.46, 0.7], [8.8, 659.25, 0.6], [9.5, 587.33, 0.7], [10.3, 523.25, 0.6], [11.0, 440.00, 0.8],
          [12.0, 415.30, 0.5], [12.6, 392.00, 0.5], [13.2, 349.23, 0.6], [13.9, 293.66, 1.8],
        ]);
        const guide = evalEvents(u, [
          [0.5, 261.63, 1.4], [2.5, 329.63, 1.4], [4.5, 293.66, 1.4], [6.5, 261.63, 1.4],
          [8.5, 349.23, 1.4], [10.5, 329.63, 1.4], [12.5, 293.66, 1.2], [14.0, 261.63, 1.7],
        ]);
        const wBass = [146.83, 174.61, 196.0, 207.65, 220.0, 196.0, 174.61, 164.81, 146.83, 174.61, 196.0, 220.0, 196.0, 174.61, 155.56, 146.83];
        const bass = shimWaddleY(frac(u) * 0.4, wBass[clamp(fl(u), 0, 15)], 0.30);
        const brush = (mod(fl(u * 2), 4) === 2 && frac(u * 2) < 0.32) ? 2.45 - 1.2 * frac(u * 2) : NaN;
        return [lead, guide, bass, brush];
      }
      if (m === 4) {
        // Debussy / Jazz Woodwind Arabesque + 1.8f Breath Formant + Harp + Pedal
        const flute = evalEvents(u, [
          [0.0, 440.0, 0.9], [1.0, 523.25, 0.9], [2.0, 659.25, 1.4], [3.5, 783.99, 0.45],
          [4.0, 739.99, 0.9], [5.0, 659.25, 0.9], [6.0, 587.33, 1.1], [7.2, 493.88, 0.7],
          [8.0, 523.25, 0.7], [8.8, 659.25, 0.7], [9.6, 880.00, 1.5, 987.77], [11.2, 783.99, 0.7],
          [12.0, 659.25, 0.9], [13.0, 587.33, 0.9], [14.0, 523.25, 0.8], [14.9, 440.0, 1.0],
        ]);
        const breath = Number.isFinite(flute) ? clamp(flute + log2(1.8), -3.0, 3.0) : NaN;
        const hNotes = [220.0, 329.63, 440.0, 523.25, 293.66, 440.0, 587.33, 659.25];
        const harp = frac(u * 2) < 0.70 ? hz(hNotes[mod(fl(u * 2), 8)]) : NaN;
        const ped = hz([110.0, 146.83, 130.81, 110.0][clamp(fl(u / 4), 0, 3)]);
        return [flute, breath, harp, ped];
      }
      if (m === 5) {
        // Romantic Solo Violin Cadenza (delayed 5.8 Hz vibrato, rosin bursts, pizzicato cello)
        const vNotes = [
          [0.0, 659.25, 1.4], [1.5, 783.99, 0.9], [2.5, 987.77, 1.4],
          [4.0, 1046.50, 1.2], [5.3, 987.77, 0.8], [6.2, 880.00, 1.6],
          [8.0, 830.61, 0.9], [9.0, 880.00, 1.2], [10.3, 1318.51, 1.6],
          [12.0, 1174.66, 0.9], [13.0, 1046.50, 0.9], [14.0, 987.77, 0.9], [15.0, 880.00, 0.95],
        ];
        let v1 = NaN, v2 = NaN, rosin = NaN;
        for (let i = 0; i < vNotes.length; i++) {
          const n = vNotes[i];
          if (u >= n[0] && u < n[0] + n[2]) {
            const loc = (u - n[0]) * 0.45;
            const vib = loc > 0.08 ? 0.036 * clamp((loc - 0.08) / 0.16, 0, 1) * sin(2 * PI * 5.8 * loc) : 0;
            v1 = clamp(hz(n[1]) + vib, -3.0, 3.0);
            v2 = clamp(hz(n[1] * 1.002) + vib, -3.0, 3.0);
            if (loc < 0.05) rosin = 2.68;
          }
        }
        const pizz = frac(u) < 0.25 ? hz([110.0, 164.81, 130.81, 196.0, 146.83, 220.0, 164.81, 110.0][mod(fl(u), 8)]) : NaN;
        return [v1, v2, rosin, pizz];
      }
      if (m === 6) {
        // Bach Cello Suite Prelude: Arco (u: 0..8) -> Pizzicato Finale (u: 8..16)
        const step = clamp(fl(u * 2), 0, 31);
        const sf = frac(u * 2);
        const isPizz = step >= 16;
        const bar = fl(mod(step, 16) / 4);
        const bach = [
          [110.0, 164.81, 261.63, 246.94], // Am
          [87.31, 130.81, 220.00, 196.00], // F
          [73.42, 110.00, 174.61, 164.81], // Dm
          [82.41, 123.47, 207.65, 246.94], // E7
        ];
        const f = bach[bar][mod(step, 4)];
        const on = isPizz ? sf < 0.36 : sf < 0.90;
        const cBass = [55.0, 43.65, 73.42, 82.41][bar];
        return [
          on ? hz(f) : NaN,
          on ? hz(f * 1.5) : NaN,
          (isPizz && sf < 0.25) ? hz(f * 2.0) : NaN,
          hz(cBass),
        ];
      }
      if (m === 7) {
        // Contrapuntal Orchestra String & Woodwind Quartet + Harp
        const vNotes = [
          [0, 659.25, 1.9], [2, 783.99, 1.9], [4, 880.0, 1.9], [6, 739.99, 1.9],
          [8, 659.25, 1.9], [10, 587.33, 1.9], [12, 523.25, 1.9], [14, 659.25, 1.9],
        ];
        let vln = NaN, vla = NaN;
        for (let i = 0; i < vNotes.length; i++) {
          const n = vNotes[i];
          if (u >= n[0] && u < n[0] + n[2]) {
            const loc = (u - n[0]) * 0.45;
            const vib = loc > 0.08 ? 0.028 * sin(2 * PI * 5.8 * loc) : 0;
            vln = hz(n[1]) + vib;
            vla = vln - 7 / 12; // GM 41 Viola tr = -7
          }
        }
        const cSeq = [110.0, 130.81, 146.83, 164.81, 174.61, 146.83, 164.81, 110.0];
        const cello = hz(cSeq[clamp(fl(u / 2), 0, 7)]);
        const flute = evalEvents(u, [
          [1.0, 1046.5, 0.9], [3.0, 1174.66, 0.9], [5.0, 1318.51, 0.9], [7.0, 987.77, 0.9],
          [9.0, 1318.51, 0.9], [11.0, 1174.66, 0.9], [13.0, 1046.5, 0.9], [15.0, 880.0, 0.9],
        ]);
        const harp = frac(u * 2) < 0.65 ? hz([220, 329.63, 440, 523.25, 293.66, 440, 587.33, 493.88][mod(fl(u * 2), 8)]) : NaN;
        return [vln, vla, cello, flute, harp];
      }
      // Part 8: Full 6-Voice Classic Chamber Ensemble Finale (Am-C-D-F-Am-E7-Am)
      const q = clamp(fl(u / 2), 0, 7);
      const roots = [55.0, 65.41, 73.42, 87.31, 55.0, 82.41, 82.41, 55.0];
      const pedal = hz(roots[q]);
      const cello = hz(roots[q] * 2);
      const guitar = evalEvents(u, [
        [0.5, 220, 1.3], [2.5, 261.63, 1.3], [4.5, 293.66, 1.3], [6.5, 349.23, 1.3],
        [8.5, 220, 1.3], [10.5, 329.63, 1.3], [12.5, 293.66, 1.3], [14.5, 220, 1.4],
      ]);
      const vNotes = [
        [0, 659.25, 1.9], [2, 523.25, 1.9], [4, 587.33, 1.9], [6, 698.46, 1.9],
        [8, 880.0, 1.9], [10, 830.61, 1.9], [12, 987.77, 1.9], [14, 880.0, 1.9],
      ];
      let violin = NaN;
      for (let i = 0; i < vNotes.length; i++) {
        const n = vNotes[i];
        if (u >= n[0] && u < n[0] + n[2]) {
          const loc = (u - n[0]) * 0.45;
          violin = hz(n[1]) + (loc > 0.08 ? 0.028 * sin(2 * PI * 5.8 * loc) : 0);
        }
      }
      const piano = frac(u * 2) < 0.72 ? hz([220, 329.63, 440, 261.63, 392, 523.25, 293.66, 440][mod(fl(u * 2), 8)]) : NaN;
      const flute = evalEvents(u, [
        [1.0, 880, 0.9], [3.0, 1046.5, 0.9], [5.0, 1174.66, 0.9], [7.0, 1396.91, 0.9],
        [9.0, 1318.51, 0.9], [11.0, 1244.51, 0.9], [13.0, 1318.51, 0.9], [15.0, 1760.0, 0.9],
      ]);
      return [pedal, cello, guitar, violin, piano, flute];
    },
  },

  // 20 — B-Sound Part IV: Industrial & Swarmatron DSP (8 cinematic industrial scenes, 1:1 media.html Shims 12–17)
  {
    id: "20", name: "B-SOUND: INDUSTRIAL & SWARM", src: "MEDIA-SOUND §5", speed: 2.8, bsound: true,
    parts: [
      {
        m: 1, modes: ["lpf", "sat", "hpf", "lpf"],
        f: "Part 1/8 · shimIndustrialKick [SHIM 12 / GM 119] — Cyber-Foundry Double-Kick Stomp\nSub LPF (160→42 Hz) + WaveShaper Click SAT (380→55 Hz, k=25) + HPF hydraulic hat + A1/G1 sub",
      },
      {
        m: 2, modes: ["nse", "pls", "tri", "sat", "hpf"],
        f: "Part 2/8 · shimIndustrialSnare [SHIM 13] — Factory Anvil & Metallic Clank Groove\nDistorted BP noise (k=30) + Trash-Can Rings {220 Hz PLS, 352 Hz TRI} + Kick + bar-end flam",
      },
      {
        m: 3, modes: ["sat", "pls", "lpf", "sat", "nse"],
        f: "Part 3/8 · shimIndustrialBass [SHIM 14 / GM 33] — 16th-Note Moog Overdrive Ostinato\nA1–C2–D2–C2–A1–G1 · F1–G1–A1→C2 slide (SAT + PLS) + LP 2600→420 Hz sweep + Kick & Clank",
      },
      {
        m: 4, modes: ["hpf", "pls", "nse", "lpf", "fm"],
        f: "Part 4/8 · shimGlitchZap [SHIM 16 / GM 103] — # ./start_ares_program Terminal Sequence\nHPF 1.8 kHz zaps (2.5·f₀→80 Hz) + PLS binary melody + NSE crackle + A1 sub + FM grid ping",
      },
      {
        m: 5, modes: ["lfo", "saw", "saw", "saw", "saw", "saw", "saw", "lfo"],
        f: "Part 5/8 · shimSwarmatron [SHIM 15 / GM 90] — 8-Voice Dewan Ribbon Ascension & Convergence\nA1 (55 Hz) → A2 (110) → E3 (165) → A3 (220) ribbon bloom & razor-tight unison lock",
      },
      {
        m: 6, modes: ["sat", "pls", "lpf", "sat", "nse"],
        f: "Part 6/8 · shimCyberLead [SHIM 17 / GM 81] — TRON Light-Cycle Sync Lead & Power Slides\nA4–C5–B4–G4–A4–E5→F5 · D5–C5–D5–E5→A5 (SAT + 1.004× PLS) over driving bass, kick & clank",
      },
      {
        m: 7, modes: ["sat", "lpf", "nse", "hpf", "pls"],
        f: "Part 7/8 · Industrial Breakbeat & Stutter Glitch Breakdown (32-Step Cyber Groove)\nDouble-kick + 16th industrial bass + clank snare + steps 28–31 stutter glitch burst + PLS stabs",
      },
      {
        m: 8, modes: ["sat", "pls", "lpf", "nse", "lfo", "hpf"],
        f: "Part 8/8 · Full TRON Cyber-Grid Finale — Lead · Octave · Bass · Clank · Swarmatron · Zap\nAll 6 industrial primitives locked inside B-System's static 632 µs audio block budget",
      },
    ],
    eval(x, pi) {
      const u = x + 8; // 0..16 -> 32 sixteenth steps
      const m = this.parts[pi].m;
      const st = clamp(fl(u * 2), 0, 31);
      const s16 = mod(st, 16);
      const sf = frac(u * 2);
      const bLine = [55.0, 55.0, 65.41, 55.0, 73.42, 65.41, 55.0, 49.0, 55.0, 55.0, 65.41, 55.0, 43.65, 49.0, 55.0, 55.0];

      if (m === 1) {
        // Cyber-Foundry Double-Kick Stomp + WaveShaper Click + Hydraulic HPF Hat + A1/G1 Sub
        const kHit = s16 === 0 || s16 === 3 || s16 === 6 || s16 === 8 || s16 === 10 || s16 === 14 || s16 === 15;
        const kt = sf * 0.22;
        const sub = hz(st < 24 ? 55.0 : 49.0);
        return [
          kHit ? shimIndKickY(kt, 0.20) : NaN,
          (kHit && kt < 0.06) ? hz(380 * Math.pow(55 / 380, kt / 0.06)) : NaN,
          (mod(st, 2) === 1 && sf < 0.30) ? (s16 === 7 || s16 === 15 ? 2.65 : 2.86) - 1.4 * sf : NaN,
          sf < 0.85 ? sub : NaN,
        ];
      }
      if (m === 2) {
        // Factory Anvil & Metallic Clank Groove + Bar-End 4-Hit Flam
        const isFlam = st >= 28;
        const snHit = isFlam || s16 === 4 || s16 === 12 || s16 === 14;
        const clank = isFlam || s16 === 12 || s16 === 14;
        const kt = sf * 0.20;
        const dur = clank ? 0.11 : 0.16;
        const kick = (!isFlam && (s16 === 0 || s16 === 6 || s16 === 8)) ? shimIndKickY(kt, 0.19) : NaN;
        const hat = (!isFlam && mod(st, 2) === 0 && sf < 0.24) ? 2.84 - 1.2 * sf : NaN;
        return [
          (snHit && kt < dur) ? (clank ? 2.48 : 2.15) - 2.0 * kt : NaN,
          (snHit && kt < 0.11) ? hz(220.0) : NaN,
          (snHit && kt < 0.11) ? hz(352.0) : NaN,
          kick,
          hat,
        ];
      }
      if (m === 3) {
        // 16th-Note Moog Overdrive Ostinato + Cutoff Sweep + Kick & Clank
        const f = bLine[s16];
        const bf = s16 === 15 ? f * Math.pow(65.41 / 55.0, clamp(sf / 0.8, 0, 1)) : f;
        const moogEnv = hz(2600 * Math.pow(420 / 2600, sf));
        const kick = (s16 === 0 || s16 === 8) ? shimIndKickY(sf * 0.22, 0.20) : NaN;
        const sn = ((s16 === 4 || s16 === 12) && sf < 0.62) ? 2.25 - 1.5 * sf : NaN;
        return [sf < 0.84 ? hz(bf) : NaN, sf < 0.84 ? hz(bf * 1.005) : NaN, sf < 0.84 ? moogEnv : NaN, kick, sn];
      }
      if (m === 4) {
        // # ./start_ares_program Cyber-Terminal Sequence
        const zHit = mod(st, 4) === 0 || st >= 26;
        const zapF = [3200, 4200, 2800, 4800, 3600, 5200][mod(st, 6)];
        const binSeq = [440, 523.25, 659.25, 440, 880, 659.25, 587.33, 523.25];
        const bin = (mod(st, 2) === 1 && sf < 0.65) ? hz(binSeq[mod(fl(st / 2), 8)]) : NaN;
        const crackle = (s16 === 4 || s16 === 12 || st >= 28) && sf < 0.40 ? 2.55 - 1.8 * sf : NaN;
        const sub = sf < 0.78 ? hz(st < 16 ? 55.0 : 65.41) : NaN;
        const ping = (mod(st, 8) === 0 && sf < 0.55) ? hz(1760.0) : NaN;
        return [zHit ? shimGlitchY(sf * 0.15, zapF, 0.11) : NaN, bin, crackle, sub, ping];
      }
      if (m === 5) {
        // 8-Voice Dewan Ribbon Ascension (A1 -> A2 -> E3 -> A3) & Unison Convergence
        const det = [-1.0, -0.65, -0.35, -0.12, 0.12, 0.35, 0.65, 1.0];
        const p = u / 16;
        const baseF = p < 0.72
          ? 55.0 * Math.pow(4.0, p / 0.72)
          : 220.0 * Math.pow(0.25, (p - 0.72) / 0.28);
        const spread = p < 0.80
          ? 160 * sin(PI * (p / 0.80)) + 16
          : 16 * (1 - (p - 0.80) / 0.20) + 4;
        return det.map((d) => clamp(hz(baseF) + (d * spread) / 1200, -3.0, 3.0));
      }
      if (m === 6) {
        // Searing TRON Light-Cycle Lead (Measure 05-06 full 2-bar phrase) + Driving Bass + Kick + Clank
        const lead = evalEvents(u, [
          [0.0, 440.0, 1.8], [2.0, 523.25, 0.9], [3.0, 493.88, 0.9],
          [4.0, 392.0, 0.9], [5.0, 440.0, 0.9], [6.0, 659.25, 1.8, 698.46],
          [8.0, 587.33, 1.8], [10.0, 523.25, 1.8], [12.0, 587.33, 1.8], [14.0, 659.25, 1.9, 880.0],
        ]);
        const bf = bLine[s16];
        const kick = (s16 === 0 || s16 === 8) ? shimIndKickY(sf * 0.22, 0.20) : NaN;
        const sn = ((s16 === 4 || s16 === 12) && sf < 0.60) ? 2.20 - 1.5 * sf : NaN;
        return [lead, Number.isFinite(lead) ? lead + log2(1.004) : NaN, sf < 0.82 ? hz(bf) : NaN, kick, sn];
      }
      if (m === 7) {
        // 32-Step Industrial Breakbeat + Stutter Glitch Breakdown (steps 28..31)
        const isStutter = st >= 28;
        const kick = (!isStutter && (s16 === 0 || s16 === 6 || s16 === 8 || s16 === 10)) ? shimIndKickY(sf * 0.22, 0.20) : NaN;
        const bass = (!isStutter && sf < 0.80) ? hz(bLine[s16]) : NaN;
        const sn = ((s16 === 4 || s16 === 12 || st === 31) && sf < 0.62) ? 2.25 - 1.5 * sf : NaN;
        const stF = [4800, 3600, 2400, 5200][mod(st, 4)];
        const zap = (isStutter || s16 === 14) ? shimGlitchY(sf * 0.14, stF, 0.09) : NaN;
        const stab = (s16 === 0 || s16 === 10) && sf < 0.55 ? hz(st < 16 ? 440.0 : 523.25) : NaN;
        return [kick, bass, sn, zap, stab];
      }
      // Part 8: Full TRON Cyber-Grid Finale (All 6 Industrial Primitives)
      const lead = evalEvents(u, [
        [0.0, 440.0, 1.8], [2.0, 523.25, 1.8], [4.0, 587.33, 1.8], [6.0, 659.25, 1.8],
        [8.0, 783.99, 1.8], [10.0, 659.25, 1.8], [12.0, 587.33, 1.8], [14.0, 523.25, 1.9, 440.0],
      ]);
      const oct = Number.isFinite(lead) ? clamp(lead + 1.0, -3.0, 3.0) : NaN;
      const bass = sf < 0.82 ? hz(bLine[s16]) : NaN;
      const sn = ((s16 === 4 || s16 === 12) && sf < 0.60) ? 2.15 - 1.4 * sf : NaN;
      const sw = hz(110.0) + 0.10 * sin(PI * u / 8);
      const zap = (st >= 28 || s16 === 6) ? shimGlitchY(sf * 0.14, 4200, 0.09) : NaN;
      return [lead, oct, bass, sn, sw, zap];
    },
  },

  // 21 — Composition 1: Carol of the Bells (鐘のキャロル) — 8 Parts, 1:1 media.html (168 BPM 3/4, 24 Bars = 25.71s)
  {
    id: "21", name: "TRACK 1: CAROL OF THE BELLS", src: "MEDIA.HTML T1", speed: 16 / (24 * 60 / 168 * 3 / 8), bsound: true,
    parts: [
      {
        m: 1, modes: ["sine", "sine", "fm", "tri", "sine", "noise"],
        f: "Part 1/8 · 鐘のキャロル (168 BPM 3/4, E Minor) — Bars 1–3: Intro Bells, Hi-Hat & 2× Octave\nshimDing (G5–F#5–G5–E5) + Bar 1 shimPulseBell · Bar 2 +HiHat · Bar 3 +2×Octave +Kick (0.00–3.21 s)",
      },
      {
        m: 2, modes: ["sine", "sine", "tri", "sine", "noise"],
        f: "Part 2/8 · Bars 4–6: E2 Pickup & BTRON Game Groove (Em · D)\nBar 4 +E2 Pickup · Bar 5 Em (E2–B2–E3) · Bar 6 D (D2–A2–D3) + Kick/Snare/HiHat (3.21–6.43 s)",
      },
      {
        m: 3, modes: ["sine", "tri", "sine", "sine", "noise"],
        f: "Part 3/8 · Bars 7–9: C & B Groove, Bar 8 Snare Roll & Bar 9 B5 Counterpoint\nBar 7 C (C2–G2–C3) · Bar 8 B (B1–F#2–B2) + 16th Snare Roll · Bar 9 Em + B5 Singing Lead (6.43–9.64 s)",
      },
      {
        m: 4, modes: ["sine", "tri", "sine", "sine", "noise"],
        f: "Part 4/8 · Bars 10–12: Chiptune Melodic Counterpoint (D · C · B)\nBar 10 C6–B5–A5 · Bar 11 G5–A5–B5 · Bar 12 E5 + shimPulseSquash + Walking Bass (9.64–12.86 s)",
      },
      {
        m: 5, modes: ["sine", "tri", "sine", "sine", "noise"],
        f: "Part 5/8 · Bars 13–15: Chiptune Coin & Star Arpeggios (Em · D · C)\nshimDance cascades (scale 1.00 / 0.89 / 0.79) + Bell Motif + Walking Bass + Drums (12.86–16.07 s)",
      },
      {
        m: 6, modes: ["sine", "tri", "tri", "sine", "noise"],
        f: "Part 6/8 · Bars 16–18: B7 Chromatic Trill & Virtuoso 16th Speedrun (run17 · run18)\nBar 16 B5–C6–D6–D#6 · Bar 17 run17 + shimSaxFlute (E6–G6–C6) · Bar 18 run18 Flurry (16.07–19.29 s)",
      },
      {
        m: 7, modes: ["sine", "sine", "tri", "sine", "noise", "fm"],
        f: "Part 7/8 · Bars 19–21: High Octave Leaps (run19), G6 Trill & Victory Fanfare Tutti\nBar 19 run19 (→B6) · Bar 20 D#6–F#6–A6–B6→G6 · Bar 21 Full Tutti Fanfare + 2× Bells (19.29–22.50 s)",
      },
      {
        m: 8, modes: ["sine", "sine", "tri", "sine", "noise", "fm"],
        f: "Part 8/8 · Bars 22–24: Descending Cadence (C→B→Em) & E6–B5–E7 Starlight Coda\nBar 22 C→B→Em + shimDance · Bar 23–24 E6 → B5 → E7 ringing into starlight silence (22.50–25.71 s)",
      },
    ],
    eval(x, pi) {
      const beat = 60 / 168;
      const bar = beat * 3; // 1.0714286s
      const tPart = bar * 3; // 3.2142857s per part (3 bars/part × 8 parts = 24 bars = 25.714s)
      const t = pi * tPart + ((x + 8) / 16) * tPart;
      const bIdx = clamp(fl(t / bar), 0, 23); // 0..23 -> Bars 1..24
      const bt = (t - bIdx * bar) / beat; // 0..3 beats in 3/4 bar

      const bellF = bt < 0.92 ? 783.99 : (bt >= 1.0 && bt < 1.44 ? 739.99 : (bt >= 1.5 && bt < 1.92 ? 783.99 : (bt >= 2.0 && bt < 2.9 ? 659.25 : NaN)));
      const bell = Number.isFinite(bellF) ? hz(bellF) : NaN;
      const hiBell = Number.isFinite(bell) ? clamp(bell + 1.0, -3.0, 3.0) : NaN;
      const bBars = [
        [82.41, 123.47, 164.81], [73.42, 110.00, 146.83],
        [65.41, 98.00, 130.81], [61.74, 92.50, 123.47],
      ];
      const kick = bt < 0.45 ? shimKickY(bt * beat, 68, 0.14) : NaN;
      const snareHH = ((bt >= 1.0 && bt < 1.32) || (bt >= 2.0 && bt < 2.32)) ? 2.35 - 1.3 * frac(bt) : NaN;
      const chiBell = hz(164.81);

      if (pi === 0) { // Bars 1–3 (bIdx 0, 1, 2)
        return [
          bell,
          bIdx === 2 ? hiBell : NaN,
          bIdx === 0 ? chiBell : NaN,
          NaN,
          bIdx === 2 ? kick : NaN,
          bIdx >= 1 ? (((bt >= 1.0 && bt < 1.25) || (bt >= 2.0 && bt < 2.25)) ? 2.75 - 1.0 * frac(bt) : NaN) : NaN,
        ];
      }
      if (pi === 1) { // Bars 4–6 (bIdx 3, 4, 5)
        const bass = bIdx === 3
          ? (bt >= 2.0 ? shimWaddleY((bt - 2.0) * beat, 82.41, 0.16) : NaN)
          : shimWaddleY(frac(bt) * beat, bBars[bIdx - 4][clamp(fl(bt), 0, 2)], 0.16);
        return [bell, bIdx === 3 ? hiBell : NaN, bass, kick, snareHH];
      }
      if (pi === 2) { // Bars 7–9 (bIdx 6, 7, 8)
        const bass = shimWaddleY(frac(bt) * beat, bBars[mod(bIdx - 4, 4)][clamp(fl(bt), 0, 2)], 0.16);
        const lead = bIdx === 8 && bt < 2.5 ? hz(987.77) : NaN; // Bar 9 B5
        const isRoll = bIdx === 7 && bt >= 2.25 && bt < 2.85 && frac(bt * 4) < 0.72;
        const sn = isRoll ? 2.48 - 0.9 * frac(bt * 4) : snareHH;
        return [bell, bass, lead, kick, sn];
      }
      if (pi === 3) { // Bars 10–12 (bIdx 9, 10, 11)
        const bass = shimWaddleY(frac(bt) * beat, bBars[mod(bIdx - 4, 4)][clamp(fl(bt), 0, 2)], 0.16);
        let lead = NaN;
        if (bIdx === 9) lead = hz([1046.50, 987.77, 880.00][clamp(fl(bt), 0, 2)]);
        else if (bIdx === 10) lead = hz([783.99, 880.00, 987.77][clamp(fl(bt), 0, 2)]);
        else if (bIdx === 11 && bt < 2.4) lead = hz(659.25);
        return [bell, bass, lead, kick, snareHH];
      }
      if (pi === 4) { // Bars 13–15 (bIdx 12, 13, 14)
        const bass = shimWaddleY(frac(bt) * beat, bBars[bIdx - 12][clamp(fl(bt), 0, 2)], 0.16);
        const sc = [1.0, 0.89, 0.79][bIdx - 12];
        const lt = t - bIdx * bar;
        const arp = evalEvents(lt, [
          [0.00, 587.33 * sc, 0.18], [0.085, 739.99 * sc, 0.20], [0.170, 880.00 * sc, 0.22],
          [0.255, 1174.66 * sc, 0.28], [0.370, 1479.98 * sc, 0.42],
        ]);
        return [bell, bass, arp, kick, snareHH];
      }
      if (pi === 5) { // Bars 16–18 (bIdx 15, 16, 17)
        const bSeq = bIdx === 15 ? bBars[3] : (bIdx === 16 ? [82.41, 82.41, 164.81] : [65.41, 61.74, 123.47]);
        const bass = shimWaddleY(frac(bt) * beat, bSeq[clamp(fl(bt), 0, 2)], 0.16);
        const step12 = clamp(fl(bt * 4), 0, 11);
        const run17 = [659.25, 783.99, 987.77, 1318.51, 1567.98, 1479.98, 1318.51, 1174.66, 1046.50, 987.77, 880.00, 783.99];
        const run18 = [739.99, 783.99, 880.00, 987.77, 1046.50, 1174.66, 1318.51, 1479.98, 1567.98, 1760.00, 1567.98, 1479.98];
        let lead = NaN;
        if (bIdx === 15) {
          const trill = [987.77, 1046.50, 1174.66, 1244.51];
          lead = step12 < 4 ? hz(trill[step12]) : NaN;
        } else {
          lead = frac(bt * 4) < 0.82 ? clamp(hz((bIdx === 16 ? run17 : run18)[step12]), -3.0, 3.0) : NaN;
        }
        const flute = bIdx === 16 ? evalEvents(bt, [[0, 1318.51, 0.8], [1, 1567.98, 0.8], [2, 1046.50, 0.8]]) : NaN;
        return [lead, bass, flute, kick, snareHH];
      }
      if (pi === 6) { // Bars 19–21 (bIdx 18, 19, 20)
        const bSeq = bIdx === 18 ? [82.41, 123.47, 164.81] : (bIdx === 19 ? [61.74, 92.50, 123.47] : [82.41, 123.47, 164.81]);
        const bass = shimWaddleY(frac(bt) * beat, bSeq[clamp(fl(bt), 0, 2)], 0.16);
        const step12 = clamp(fl(bt * 4), 0, 11);
        const run19 = [1318.51, 987.77, 783.99, 659.25, 783.99, 987.77, 1318.51, 1567.98, 1975.53, 1567.98, 1318.51, 987.77];
        let main = NaN, oct2 = NaN;
        if (bIdx === 18) main = frac(bt * 4) < 0.82 ? clamp(hz(run19[step12]), -3.0, 3.0) : NaN;
        else if (bIdx === 19) main = step12 < 4 ? clamp(hz([1244.51, 1479.98, 1760.00, 1975.53][step12]), -3.0, 3.0) : (bt >= 2.0 ? clamp(hz(1567.98), -3.0, 3.0) : NaN);
        else { main = bell; oct2 = hiBell; }
        return [main, oct2, bass, kick, snareHH, bIdx === 20 ? chiBell : NaN];
      }
      // Part 8: Bars 22–24 (bIdx 21, 22, 23)
      if (bIdx === 21) {
        const bass = shimWaddleY(frac(bt) * beat, [65.41, 61.74, 82.41][clamp(fl(bt), 0, 2)], 0.16);
        const lt = t - bIdx * bar;
        const dance = evalEvents(lt, [[0, 587.33, 0.18], [0.085, 739.99, 0.18], [0.17, 880, 0.2], [0.255, 1174.66, 0.25], [0.37, 1479.98, 0.35]]);
        return [bell, dance, bass, kick, snareHH, NaN];
      }
      if (bIdx === 22) {
        const bass = bt < 0.6 ? shimWaddleY(bt * beat, 82.41, 0.16) : NaN;
        return [hz(1318.51), bt >= 2.0 ? 3.00 : NaN, bass, NaN, NaN, chiBell];
      }
      const lt = t - 23 * bar;
      const coda = evalEvents(lt, [[0.0, 1318.51, 0.34], [0.357, 987.77, 0.34], [0.714, 1760.0, 0.80]]);
      return [coda, lt >= 0.714 ? 3.00 : NaN, NaN, NaN, NaN, chiBell];
    },
  },

  // 22 — Composition 2: Green Caterpillar (今田勝) — 8 Parts, 1:1 media.html (98 BPM 4/4, 24.49s)
  {
    id: "22", name: "TRACK 2: GREEN CATERPILLAR", src: "MEDIA.HTML T2", speed: 16 / (24.49 / 8), bsound: true,
    parts: [
      {
        m: 1, modes: ["am", "tri", "fm", "lpf", "hpf"],
        f: "Part 1/8 · 今田勝『Green Caterpillar』(98 BPM 4/4, Dm Blues) — Bar 00: Bayou Swamp Opening\nFrog Croaks (AM 32 Hz) + D2 Drone/Pedal (FM/LPF) + Open HH (HPF) + Ride + Ghost Snares (0.00–3.06 s)",
      },
      {
        m: 2, modes: ["lpf", "sine", "am", "sine", "nse"],
        f: "Part 2/8 · Bar 01–02a: Isoo Fukui Upright Bass Crawl & Imada Dm9 Rhodes Entry\nBass: D3–F3–G3–G#3(blue)–A3–C4–D4–C4–A3 + Beat-4 Frog (AM) + Dm9 Rhodes Chop (3.06–6.12 s)",
      },
      {
        m: 3, modes: ["tri", "tri", "tri", "sine", "sine", "noise"],
        f: "Part 3/8 · Bar 02b–03: G13 · Ebmaj7#11 & Head A Crawling Blues (Watanabe Guitar + Flute)\nGuitar: D4–F4–G4→G#4(slide)–A4 → A4–G#4–G4–F4–D4 + SaxFlute Octave + Frog (6.12–9.18 s)",
      },
      {
        m: 4, modes: ["tri", "tri", "tri", "sine", "sine", "noise"],
        f: "Part 4/8 · Bar 04: Climbing Lyrical High Cry (F5–E5–D5–C5–D5→E5) & Blues Cascade\nPickup F4–G4–A4–C5–D5 → High Cry F5→E5 + Cascade C5–A4–G#4–G4–F4–D4 (9.18–12.25 s)",
      },
      {
        m: 5, modes: ["tri", "tri", "tri", "sine", "fm", "noise"],
        f: "Part 5/8 · Bar 05: Harmonized Parallel Thirds & Chromatic Turnaround + Snare Build\nF4/A4 → G4/Bb4 → A4/C5 → C5/E5 → D5/F5 + Eb5–D5–C5–A4–G4–F4–D4 + Obara Roll (12.25–15.31 s)",
      },
      {
        m: 6, modes: ["sine", "tri", "tri", "tri", "noise"],
        f: "Part 6/8 · Bar 06–07a: Masaru Imada Fender Rhodes Solo & Watanabe Blues Response\nRhodes: A4–C5–D5–F5–E5–D5–C5–D5 + Guitar G4→G#4–A4–C5–D5 + Unison Entry (15.31–18.37 s)",
      },
      {
        m: 7, modes: ["tri", "tri", "sine", "tri", "sine", "noise"],
        f: "Part 7/8 · Bar 07b–08a: Full Quintet Unison Fortissimo Climax & Turnaround Vamp\nUnison C5–A4–G4–F4–D4 + Crash Ping + Turnaround Bass D3 → C3 → Bb2 → A2 (18.37–21.43 s)",
      },
      {
        m: 8, modes: ["sine", "sine", "tri", "saw", "fm", "noise"],
        f: "Part 8/8 · Bar 08b–Coda: Moonlit Marsh, Dm11 Resolution & Distant Frog Farewell\nTurnaround cadence + Lush Dm11 chord + Golden Chi D2 Drone + Moonlit Frog (21.43–24.49 s)",
      },
    ],
    eval(x, pi) {
      const tPart = 24.49 / 8; // 3.06125s per part (8 parts = 24.49s exact 98 BPM)
      const t = pi * tPart + ((x + 8) / 16) * tPart;

      // Exact media.html Track 2 event tables (timestamps in literal seconds)
      const fukuiEv = [
        [2.45, 146.83, 0.35], [3.06, 174.61, 0.28], [3.37, 196.00, 0.26], [3.67, 207.65, 0.28],
        [3.98, 220.00, 0.26], [4.28, 261.63, 0.28], [4.59, 293.66, 0.28], [4.90, 261.63, 0.45],
        [5.51, 220.00, 0.45], [6.12, 196.00, 0.45], [6.73, 174.61, 0.28], [7.04, 164.81, 0.28],
        [7.35, 146.83, 0.28], [7.66, 174.61, 0.28], [7.96, 196.00, 0.45], [8.57, 220.00, 0.45],
        [9.18, 196.00, 0.28], [9.49, 146.83, 0.28], [9.80, 146.83, 0.45], [10.41, 174.61, 0.45],
        [11.02, 196.00, 0.45], [11.63, 155.56, 0.45], [12.25, 146.83, 0.28], [12.56, 174.61, 0.28],
        [12.86, 196.00, 0.28], [13.17, 207.65, 0.28], [13.48, 220.00, 0.28], [13.78, 261.63, 0.28],
        [14.09, 293.66, 0.45], [14.70, 146.83, 0.28], [15.01, 174.61, 0.28], [15.31, 196.00, 0.28],
        [15.62, 220.00, 0.45], [16.23, 261.63, 0.45], [17.15, 146.83, 0.28], [17.46, 196.00, 0.28],
        [17.76, 207.65, 0.28], [18.06, 220.00, 0.28], [18.37, 261.63, 0.20], [18.59, 220.00, 0.20],
        [18.81, 174.61, 0.45], [19.60, 146.83, 0.55], [20.21, 130.81, 0.55], [20.82, 116.54, 0.55],
        [21.43, 110.00, 0.55], [22.05, 146.83, 2.20],
      ];
      const guitarEv = [
        // Bar 03 Head A
        [7.35, 293.66, 0.28], [7.66, 349.23, 0.26], [7.96, 392.00, 0.19, 415.30], [8.16, 440.00, 0.36],
        [8.57, 440.00, 0.10], [8.67, 415.30, 0.10], [8.77, 392.00, 0.10], [8.87, 349.23, 0.12], [8.99, 293.66, 0.30],
        // Bar 04 Climbing Lyrical High Cry + Blues Cascade
        [9.80, 349.23, 0.14], [9.95, 392.00, 0.14], [10.10, 440.00, 0.14], [10.25, 523.25, 0.15], [10.41, 587.33, 0.22],
        [10.65, 698.46, 0.22], [10.88, 659.25, 0.18], [11.07, 587.33, 0.20], [11.29, 523.25, 0.16], [11.46, 587.33, 0.28, 659.25],
        [11.75, 523.25, 0.09], [11.85, 440.00, 0.09], [11.95, 415.30, 0.09], [12.05, 392.00, 0.09], [12.14, 349.23, 0.10],
        // Bar 05 Harmonized 3rds lower + Chromatic Turnaround
        [12.25, 349.23, 0.18], [12.45, 392.00, 0.18], [12.65, 440.00, 0.22], [12.90, 523.25, 0.22], [13.15, 587.33, 0.30],
        [13.48, 622.25, 0.12], [13.60, 587.33, 0.12], [13.72, 523.25, 0.12], [13.84, 440.00, 0.12], [13.96, 392.00, 0.12], [14.08, 349.23, 0.13], [14.22, 293.66, 0.30],
        // Bar 06 Guitar response + Bar 07 Unison Hook
        [15.62, 392.00, 0.14, 415.30], [15.77, 440.00, 0.28], [16.06, 523.25, 0.16], [16.24, 587.33, 0.35],
        [17.46, 392.00, 0.15], [17.62, 415.30, 0.14], [17.77, 440.00, 0.26], [18.08, 523.25, 0.25], [18.39, 587.33, 0.28],
        [18.68, 523.25, 0.11], [18.79, 440.00, 0.11], [18.90, 392.00, 0.11], [19.01, 349.23, 0.12], [19.14, 293.66, 0.32],
      ];
      const fluteEv = [
        [7.35, 587.33, 0.28], [7.66, 698.46, 0.26], [7.96, 783.99, 0.19, 830.61], [8.16, 880.00, 0.36],
        [8.57, 880.00, 0.10], [8.67, 830.61, 0.10], [8.77, 783.99, 0.10], [8.87, 698.46, 0.12], [8.99, 587.33, 0.30],
        [9.80, 698.46, 0.14], [9.95, 783.99, 0.14], [10.10, 880.00, 0.14], [10.25, 1046.50, 0.15], [10.41, 1174.66, 0.22],
        [10.65, 1396.91, 0.22], [10.88, 1318.51, 0.18], [11.07, 1174.66, 0.20], [11.29, 1046.50, 0.16], [11.46, 1174.66, 0.28],
        // Bar 05 EXACT Harmonized Parallel 3rds (A4-Bb4-C5-E5-F5)!
        [12.25, 440.00, 0.18], [12.45, 466.16, 0.18], [12.65, 523.25, 0.22], [12.90, 659.25, 0.22], [13.15, 698.46, 0.30],
        [13.48, 622.25, 0.12], [13.60, 587.33, 0.12], [13.72, 523.25, 0.12], [13.84, 440.00, 0.15],
        [15.62, 783.99, 0.14, 830.61], [15.77, 880.00, 0.28], [16.06, 1046.50, 0.16], [16.24, 1174.66, 0.35],
        [17.46, 783.99, 0.15], [17.62, 830.61, 0.14], [17.77, 880.00, 0.26], [18.08, 1046.50, 0.25], [18.39, 1174.66, 0.28],
        [18.68, 1046.50, 0.11], [18.79, 880.00, 0.11], [18.90, 783.99, 0.11], [19.01, 698.46, 0.12], [19.14, 587.33, 0.32],
      ];
      const rhSoloEv = [
        [14.70, 440.0, 0.10], [14.80, 523.25, 0.10], [14.90, 587.33, 0.10], [15.00, 698.46, 0.10],
        [15.10, 659.25, 0.10], [15.20, 587.33, 0.10], [15.30, 523.25, 0.10], [15.40, 587.33, 0.22],
      ];

      const bass = evalEvents(t, fukuiEv);
      const guitar = evalEvents(t, guitarEv);
      const flute = evalEvents(t, fluteEv);
      const rhSolo = evalEvents(t, rhSoloEv);
      const frog = [
        shimFrogY(t - 0.15, 125, 0.19), shimFrogY(t - 0.40, 155, 0.095),
        shimFrogY(t - 0.95, 125 * 0.90, 0.19), shimFrogY(t - 1.20, 155 * 0.90, 0.095),
        shimFrogY(t - 1.90, 125 * 1.15, 0.19), shimFrogY(t - 4.28, 125 * 1.05, 0.19),
        shimFrogY(t - 7.04, 125 * 0.95, 0.19), shimFrogY(t - 22.40, 125, 0.19), shimFrogY(t - 22.65, 155, 0.095),
      ].find(Number.isFinite) ?? NaN;
      const bt = t / 0.612245;
      const swingDrum = t >= 2.15 ? ((mod(fl(bt), 2) === 1 && frac(bt) < 0.20) ? 2.25 - 1.3 * frac(bt) : (frac(bt) < 0.14 ? 2.75 : NaN)) : ((t >= 1.20 && t < 1.45) ? 2.75 : ((t >= 1.70 && t < 1.95) ? 2.90 : NaN));

      if (pi === 0) {
        const frogOver = Number.isFinite(frog) ? frog + log2(2.45) : NaN;
        const pedal = t < 2.2 ? hz(73.42 * Math.pow(0.98, t / 2.2)) : bass;
        return [frog, frogOver, hz(73.42), pedal, swingDrum];
      }
      if (pi === 1) {
        const dm9 = (t >= 5.21 && t < 5.75) ? hz(523.25) : NaN;
        const kick = (frac(bt * 0.5) < 0.12) ? shimKickY(frac(bt * 0.5) * 1.22, 65, 0.16) : NaN;
        return [bass, dm9, frog, kick, swingDrum];
      }
      if (pi === 2) {
        const rh1 = (t >= 6.12 && t < 6.60) ? hz(493.88) : ((t >= 7.04 && t < 7.35) ? hz(466.16) : ((t >= 8.57 && t < 9.00) ? hz(440.0) : NaN));
        const rh2 = (t >= 6.12 && t < 6.60) ? hz(880.0) : ((t >= 7.04 && t < 7.35) ? hz(739.99) : ((t >= 8.57 && t < 9.00) ? hz(659.25) : NaN));
        return [guitar, flute, bass, rh1, rh2, swingDrum];
      }
      if (pi === 3) {
        const rh1 = (t >= 9.80 && t < 10.40) ? hz(440.0) : ((t >= 11.02 && t < 11.55) ? hz(493.88) : ((t >= 11.63 && t < 12.15) ? hz(466.16) : NaN));
        const rh2 = (t >= 9.80 && t < 10.40) ? hz(659.25) : ((t >= 11.02 && t < 11.55) ? hz(880.0) : ((t >= 11.63 && t < 12.15) ? hz(739.99) : NaN));
        return [guitar, flute, bass, rh1, rh2, swingDrum];
      }
      if (pi === 4) {
        const roll = (t >= 14.20 && t < 14.68 && frac((t - 14.20) * 10) < 0.72) ? 2.45 : swingDrum;
        return [guitar, flute, bass, rhSolo, hz(98.00), roll];
      }
      if (pi === 5) {
        return [rhSolo, guitar, flute, bass, swingDrum];
      }
      if (pi === 6) {
        const crash = (t >= 18.98 && t < 19.43) ? hz(1760.0) : NaN;
        const kick = (t >= 19.60 && t < 19.76) || (t >= 20.82 && t < 20.98) ? shimKickY(frac(t) * 0.4, 65, 0.16) : NaN;
        return [guitar, flute, crash, bass, kick, swingDrum];
      }
      // Part 8: Moonlit Marsh, Dm11 Resolution & Distant Frog Farewell
      return [
        t >= 22.05 ? hz(523.25) : NaN,
        t >= 22.05 ? hz(659.25) : NaN,
        bass,
        frog,
        hz(73.42),
        t < 22.8 ? swingDrum : NaN,
      ];
    },
  },

  // 23 — Composition 3: House of the Rising Sun (朝日のあたる家) — 8 Parts, 1:1 media.html (6/8, eighth = 0.24s, 18 Bars = 25.92s)
  {
    id: "23", name: "TRACK 3: HOUSE OF RISING SUN", src: "MEDIA.HTML T3", speed: 16 / (25.92 / 8), bsound: true,
    parts: [
      {
        m: 1, modes: ["sine", "tri", "tri", "noise", "sine"],
        f: "Part 1/8 · 朝日のあたる家 (6/8, eighth = 0.24 s, Am) — Bars 0–1: New Orleans Sunrise Intro\nDamper Swoosh + A1 Pedal + Am & C 6/8 Rolling Arpeggios + A6/E7 Starlight Bells (0.00–3.24 s)",
      },
      {
        m: 2, modes: ["sine", "tri", "sine", "tri", "tri"],
        f: "Part 2/8 · Bars 2–4: Verse 1A — \"There is a house in New Orleans...\"\nAm (A4–C5–D5) · C (E5–E5–D5) · D (D5–F#4 blue note) + 6/8 Arpeggio + Pedal Bass (3.24–6.48 s)",
      },
      {
        m: 3, modes: ["sine", "tri", "sine", "tri", "tri"],
        f: "Part 3/8 · Bars 5–6: Verse 1B — \"...and it's, they call the...\"\nF (F4–A4–C5) · Am (A4–C5–D5) + shimGrandPiano & shimSaxFlute Cantabile Lead (6.48–9.72 s)",
      },
      {
        m: 4, modes: ["sine", "tri", "sine", "tri", "noise"],
        f: "Part 4/8 · Bars 7–9: Verse 1C — \"...Rising Sun\" & E7 Turnaround Crescendo\nC (E5–E5) · E (B4–G#4) · E7 (B4–D5–E5 pickup) + Damper Swoosh into Forte (9.72–12.96 s)",
      },
      {
        m: 5, modes: ["sine", "sine", "tri", "sine", "tri", "tri"],
        f: "Part 5/8 · Bars 10–11: Thomas Krüger Forte Octave Chorus — \"And it's been the ruin...\"\nDoubled Octaves: Am (E5/E6–E5/E6–D5/D6) · C (C5/C6–D5/D6–E5/E6) + Sforzando A1 (12.96–16.20 s)",
      },
      {
        m: 6, modes: ["sine", "sine", "tri", "sine", "tri", "tri"],
        f: "Part 6/8 · Bars 12–13: Forte Octave Peak — \"...of many a poor boy, and...\"\nD (D5/D6–F#5/F#6–A5/A6 high leap!) · F (A5/A6–F5/F6–D5/D6) + Hammer Strikes (16.20–19.44 s)",
      },
      {
        m: 7, modes: ["sine", "sine", "tri", "sine", "tri", "tri"],
        f: "Part 7/8 · Bars 14–15: Forte Octave Resolve — \"And God, I know I'm...\"\nAm (E5/E6–C5/C6–A4/A5) · E7 (B4/B5–G#4/G#5) building into \"ONE!\" Climax (19.44–22.68 s)",
      },
      {
        m: 8, modes: ["sine", "sine", "sine", "tri", "tri", "sine"],
        f: "Part 8/8 · Bars 16–17: \"ONE!\" High Waterfall Cascade & Rolled Am(add9) Sunrise Coda\nE6→D6→C6→B5→A5→G#5→A5 Cascade + A0/A1 Thunder + Am(add9) + A6/E7 Starlight (22.68–25.92 s)",
      },
    ],
    eval(x, pi) {
      const eighth = 0.24;
      const bar = eighth * 6; // 1.44s
      const tPart = 25.92 / 8; // 3.24s per part (8 parts = 25.92s = 18 bars exact!)
      const t = pi * tPart + ((x + 8) / 16) * tPart;
      const bIdx = clamp(fl(t / bar), 0, 17);
      const bt = t - bIdx * bar; // 0..1.44s
      const eIdx = clamp(fl(bt / eighth), 0, 5);
      const eFrac = frac(bt / eighth);

      // Exact 18-bar chord table from media.html lines 5385–5550
      const chMap = {
        Am: { r: 110.00, t: 261.63, f5: 164.81, o: 220.00, b: 55.00 },
        C:  { r: 130.81, t: 329.63, f5: 196.00, o: 261.63, b: 65.41 },
        D:  { r: 146.83, t: 369.99, f5: 220.00, o: 293.66, b: 73.42 },
        F:  { r: 174.61, t: 349.23, f5: 261.63, o: 349.23, b: 87.31 },
        E:  { r: 164.81, t: 415.30, f5: 246.94, o: 329.63, b: 82.41 },
        E7: { r: 164.81, t: 415.30, f5: 293.66, o: 329.63, b: 82.41 },
      };
      const barChords = ["Am", "C", "Am", "C", "D", "F", "Am", "C", "E", "E7", "Am", "C", "D", "F", "Am", "E7", "Am", "Am"];
      const ch = chMap[barChords[bIdx]];
      const arpSeq = [ch.r, ch.f5, ch.o, ch.t, ch.f5, ch.t];
      const arp1 = (bIdx < 16 && eFrac < 0.84) ? hz(arpSeq[eIdx]) : NaN;
      const arp2 = (bIdx < 16 && eFrac < 0.55) ? hz(arpSeq[eIdx] * 2.002) : NaN;
      const pedal = hz(ch.b);
      const swoosh = ((bIdx === 0 && bt < 0.60) || (bIdx === 9 && bt < 0.50) || (bIdx === 17 && bt < 0.80))
        ? hz(450 * Math.pow(280 / 450, bt / 0.60)) : NaN;

      // Exact Verse 1 & Verse 2 Vocal Melody timeline (media.html lines 5401–5534)
      const melEv = [
        // Bar 2 (2.88s) Am: There is a
        [2.88, 440.00, 0.46], [3.36, 523.25, 0.46], [3.84, 587.33, 0.46],
        // Bar 3 (4.32s) C: house in New
        [4.32, 659.25, 0.70], [5.04, 659.25, 0.22], [5.28, 587.33, 0.46],
        // Bar 4 (5.76s) D: Or-leans
        [5.76, 587.33, 0.70], [6.48, 369.99, 0.70],
        // Bar 5 (7.20s) F: and it's
        [7.20, 349.23, 0.46], [7.68, 440.00, 0.46], [8.16, 523.25, 0.46],
        // Bar 6 (8.64s) Am: They call the
        [8.64, 440.00, 0.46], [9.12, 523.25, 0.46], [9.60, 587.33, 0.46],
        // Bar 7 (10.08s) C: Ri-sing
        [10.08, 659.25, 0.70], [10.80, 659.25, 0.70],
        // Bar 8 (11.52s) E: Sun
        [11.52, 493.88, 0.84], [12.48, 415.30, 0.46],
        // Bar 9 (12.96s) E7 turnaround
        [12.96, 493.88, 0.46], [13.44, 587.33, 0.46], [13.92, 659.25, 0.46],
        // Bar 10–15 Verse 2 Forte Octaves (14.40s..23.04s)
        [14.40, 659.25, 0.46], [14.88, 659.25, 0.46], [15.36, 587.33, 0.46],
        [15.84, 523.25, 0.46], [16.32, 587.33, 0.46], [16.80, 659.25, 0.46],
        [17.28, 587.33, 0.70], [18.00, 739.99, 0.34], [18.36, 880.00, 0.34],
        [18.72, 880.00, 0.46], [19.20, 698.46, 0.46], [19.68, 587.33, 0.46],
        [20.16, 659.25, 0.46], [20.64, 523.25, 0.46], [21.12, 440.00, 0.46],
        [21.60, 493.88, 0.70], [22.32, 415.30, 0.70],
        // Bar 16 (23.04s) ONE! + Waterfall Cascade
        [23.04, 440.00, 0.35],
        [23.40, 1318.51, 0.16], [23.568, 1174.66, 0.16], [23.736, 1046.50, 0.16],
        [23.904, 987.77, 0.16], [24.072, 880.00, 0.16], [24.240, 830.61, 0.16], [24.384, 880.00, 0.30],
      ];
      const mel = evalEvents(t, melEv);
      const melOct = (t >= 14.40 && t < 23.40 && Number.isFinite(mel)) ? clamp(mel + 1.0, -3.0, 3.0) : NaN;
      const hammer = (eIdx === 0 && eFrac < 0.16 && t >= 14.40) ? hz(120 * Math.pow(40 / 120, eFrac / 0.16)) : NaN;

      if (pi === 0) {
        const star = (t < 0.80) ? hz(1760.0) : ((t >= 1.44 && t < 2.34) ? 3.00 : mel);
        return [arp1, arp2, pedal, swoosh, star];
      }
      if (pi <= 3) {
        return [mel, mel, arp1, pedal, pi === 3 ? swoosh : arp2];
      }
      if (pi <= 6) {
        return [mel, melOct, arp1, arp2, pedal, hammer];
      }
      // Part 8: Bar 16 Waterfall + Bar 17 Rolled Am(add9) & A0/A1 Thunder + A6/E7
      const rT = t - 24.48;
      const rolledHi = rT >= 0.32 ? hz(440.0) : NaN;
      const rolledTop = rT >= 0.48 ? hz(659.25) : NaN;
      const rolledLo = rT >= 0.10 ? hz(220.0) : arp1;
      const thunder = rT >= 0 ? -2.95 : pedal;
      const starBell = (t >= 23.40 && t < 24.20) ? 3.00 : (rT >= 1.15 ? hz(1760.0) : NaN);
      return [mel, rolledHi, rolledTop, rolledLo, thunder, starBell];
    },
  },

  // 24 — Composition 4: TRON Init (Nine Inch Nails) — 10 Exact Measures + Hall Reverb Decay (1:1 media.html, 93 BPM = 25.80s)
  {
    id: "24", name: "TRACK 4: TRON INIT", src: "MEDIA.HTML T4", speed: 16 / 2.58, bsound: true, reverb: 0.36,
    parts: [
      {
        m: 1, modes: ["hpf", "sat", "lpf", "lfo", "saw", "nse", "rvb"],
        f: "Measure 01/10 · Nine Inch Nails『TRON: Ares - Init』(93 BPM, Am) — System Init (0.00–2.58 s)\n# ./start_ares_program — 4 Zaps + IndKick + A1 Swarmatron + Snare Flams + Hall Reverb Decay (RVB)",
      },
      {
        m: 2, modes: ["sat", "sat", "nse", "hpf", "lfo", "rvb"],
        f: "Measure 02/10 · 93 BPM Industrial Groove Ignites (2.58–5.16 s)\n16th Overdriven Bass (A1–C2–D2–G1 · F1–G1–A1→C2) + Kick + Clank + A6 Ding & RVB Hall Tail",
      },
      {
        m: 3, modes: ["sat", "sat", "nse", "hpf", "rvb"],
        f: "Measure 03/10 · Driving Acceleration, Double-Kick & Glitch Fills (5.16–7.74 s)\nSyncopated Double Kick (6.13/6.45 s) + Glitch Zaps (2400/3600/4800 Hz) + A1→D2 + RVB Tail",
      },
      {
        m: 4, modes: ["sat", "sat", "sat", "nse", "lfo", "rvb"],
        f: "Measure 04/10 · Swarmatron A2 (110 Hz) Ascension & Cyber Lead Teaser (7.74–10.32 s)\nA2 Swarmatron Cluster + Cyber Lead Teaser (A4–C5 @ 9.35 s) + Pre-Drop Flams & RVB Wash",
      },
      {
        m: 5, modes: ["sat", "sat", "sat", "nse", "lfo", "rvb"],
        f: "Measure 05/10 · The Searing TRON: Ares Cyber Lead Drops! (10.32–12.90 s)\nCyber Lead: A4–C5–B4–G4–A4–E5→F5 + 16th Bass + Cavernous Hall Reverb Decay Tail (RVB)",
      },
      {
        m: 6, modes: ["sat", "sat", "sat", "nse", "lfo", "rvb"],
        f: "Measure 06/10 · Theme Resolution & E3 (165 Hz) Swarmatron (12.90–15.48 s)\nCyber Lead: D5–C5–D5–E5→A5 Power Slide + Bass (D2–C2–E2–G2) + Trailing RVB Hall Tail",
      },
      {
        m: 7, modes: ["sat", "pls", "sat", "sat", "nse", "lfo", "rvb"],
        f: "Measure 07/10 · Full Industrial Climax / Fortissimo Octaves (15.48–18.06 s)\nOctave Lead (A4/A5→C5/C6→D5/D6→E5/E6) + 220 Hz Swarmatron + Double-Kick + RVB Bloom",
      },
      {
        m: 8, modes: ["sat", "pls", "sat", "sat", "nse", "hpf", "rvb"],
        f: "Measure 08/10 · Climax Cascade & Digital Stutter Glitches (18.06–20.64 s)\nOctave Lead (G5/G6→A4/A5) + 4 Stutter Glitches (4800/3600/2400/5200) + Long RVB Decay",
      },
      {
        m: 9, modes: ["lpf", "sat", "hpf", "lfo", "fm", "rvb"],
        f: "Measure 09/10 · Ares Terminal Execution & A0 Sub-Bass Breakdown (20.64–23.22 s)\nBeats cut: A0 (27.5 Hz) + A1 Thunder + Swarmatron 6c Unison + Cavernous RVB Ring-Out",
      },
      {
        m: 10, modes: ["lpf", "sat", "hpf", "lfo", "sine", "rvb"],
        f: "Measure 10/10 · Grid Convergence, Pure Silence & Reverb Decay (23.22–25.80 s)\n# ./start_ares_program [COMPLETE] — 4800 Hz Zap + A6/E7 Starlight & Hall RVB Fade",
      },
    ],
    eval(x, pi) {
      const mIdx = pi; // 0..9 -> Exact Measures 01..10
      const mt = ((x + 8) / 16) * 2.58; // 0..2.58s within measure
      const t = mIdx * 2.58 + mt; // 0..25.80s exact media.html timeline

      // Exact media.html Track 4 Event Tables (1:1 timestamps, frequencies, durations & slides)
      const bassEv = [
        // Measure 02 (2.58..5.16)
        [2.58, 55.0, 0.15], [2.74, 55.0, 0.15], [2.90, 65.41, 0.15], [3.06, 55.0, 0.15],
        [3.22, 73.42, 0.15], [3.38, 65.41, 0.15], [3.55, 55.0, 0.15], [3.71, 49.0, 0.15],
        [3.87, 55.0, 0.15], [4.03, 55.0, 0.15], [4.19, 65.41, 0.15], [4.35, 55.0, 0.15],
        [4.51, 43.65, 0.15], [4.67, 49.0, 0.15], [4.84, 55.0, 0.15], [5.00, 55.0, 0.15, 65.41],
        // Measure 03 (5.16..7.74)
        [5.16, 55.0, 0.15], [5.32, 55.0, 0.15], [5.48, 65.41, 0.15], [5.64, 55.0, 0.15],
        [5.80, 73.42, 0.15], [5.96, 65.41, 0.15], [6.13, 55.0, 0.15], [6.29, 49.0, 0.15],
        [6.45, 55.0, 0.15], [6.61, 55.0, 0.15], [6.77, 65.41, 0.15], [6.93, 55.0, 0.15],
        [7.10, 43.65, 0.15], [7.26, 49.0, 0.15], [7.42, 55.0, 0.15], [7.58, 55.0, 0.15, 73.42],
        // Measure 04 (7.74..10.32)
        [7.74, 55.0, 0.15], [7.90, 55.0, 0.15], [8.06, 65.41, 0.15], [8.22, 55.0, 0.15],
        [8.38, 73.42, 0.15], [8.54, 65.41, 0.15], [8.70, 55.0, 0.15], [8.86, 49.0, 0.15],
        [9.03, 55.0, 0.15], [9.19, 55.0, 0.15], [9.35, 65.41, 0.15], [9.51, 55.0, 0.15],
        [9.68, 43.65, 0.15], [9.84, 49.0, 0.15],
        // Measure 05 (10.32..12.90)
        [10.32, 55.0, 0.15], [10.48, 55.0, 0.15], [10.64, 65.41, 0.15], [10.80, 55.0, 0.15],
        [10.96, 73.42, 0.15], [11.12, 65.41, 0.15], [11.28, 55.0, 0.15], [11.44, 49.0, 0.15],
        [11.61, 55.0, 0.15], [11.77, 55.0, 0.15], [11.93, 65.41, 0.15], [12.09, 55.0, 0.15],
        [12.25, 43.65, 0.15], [12.41, 49.0, 0.15], [12.57, 55.0, 0.15], [12.73, 55.0, 0.15, 65.41],
        // Measure 06 (12.90..15.48)
        [12.90, 73.42, 0.15], [13.06, 73.42, 0.15], [13.22, 65.41, 0.15], [13.38, 55.0, 0.15],
        [13.54, 65.41, 0.15], [13.70, 55.0, 0.15], [13.86, 49.0, 0.15], [14.02, 55.0, 0.15],
        [14.19, 73.42, 0.15], [14.35, 73.42, 0.15], [14.51, 82.41, 0.15], [14.67, 73.42, 0.15],
        [14.83, 82.41, 0.15], [14.99, 98.0, 0.15],
        // Measure 07 (15.48..18.06) — exact syncopated climax bass
        [15.48, 55.0, 0.18], [15.80, 55.0, 0.18], [16.12, 65.41, 0.18], [16.44, 55.0, 0.18],
        [16.77, 73.42, 0.18], [17.10, 65.41, 0.18], [17.42, 82.41, 0.18], [17.74, 98.0, 0.18],
        // Measure 08 (18.06..19.99) — stops for 4 digital stutter bursts!
        [18.06, 98.0, 0.15], [18.22, 98.0, 0.15], [18.38, 82.41, 0.15], [18.54, 73.42, 0.15],
        [18.70, 82.41, 0.15], [18.86, 73.42, 0.15], [19.02, 65.41, 0.15], [19.18, 55.0, 0.15],
        [19.35, 73.42, 0.15], [19.51, 65.41, 0.15], [19.67, 55.0, 0.15], [19.83, 49.0, 0.15],
      ];
      const kickTimes = [
        0.00, 2.58, 3.87, 5.16, 6.13, 6.45, 7.74, 9.03, 10.32, 11.61, 12.90, 14.19,
        15.48, 15.80, 16.77, 17.10, 18.06, 19.35,
      ];
      const snareEv = [
        [2.25, 0.10], [2.41, 0.12], [3.22, 0.11], [4.51, 0.11], [5.80, 0.11], [7.10, 0.11],
        [8.38, 0.11], [9.68, 0.11], [10.00, 0.12], [10.16, 0.11], [10.96, 0.11], [12.25, 0.11],
        [13.54, 0.11], [14.83, 0.11], [15.15, 0.12], [15.31, 0.11], [16.12, 0.11], [17.42, 0.11],
        [18.70, 0.11], [20.47, 0.12],
      ];
      const zapEv = [
        [0.00, 3200, 0.12], [0.64, 4200, 0.06], [1.29, 2800, 0.07], [1.93, 4800, 0.08],
        [5.80, 2400, 0.06], [6.77, 3600, 0.07], [7.42, 4800, 0.08],
        [19.99, 4800, 0.045], [20.15, 3600, 0.045], [20.31, 2400, 0.045], [20.47, 5200, 0.065],
        [21.28, 1600, 0.07], [21.93, 2400, 0.06], [22.57, 3200, 0.05], [23.22, 4800, 0.045],
      ];
      const leadEv = [
        [9.35, 440.0, 0.18], [9.51, 523.25, 0.22],
        [10.32, 440.0, 0.60], [10.96, 523.25, 0.30], [11.28, 493.88, 0.30],
        [11.61, 392.0, 0.30], [11.93, 440.0, 0.30], [12.25, 659.25, 0.55, 698.46],
        [12.90, 587.33, 0.60], [13.54, 523.25, 0.60], [14.19, 587.33, 0.60], [14.83, 659.25, 0.60, 880.0],
        [15.48, 440.0, 0.60], [16.12, 523.25, 0.60], [16.77, 587.33, 0.60], [17.41, 659.25, 0.60],
        [18.06, 783.99, 0.60], [18.70, 659.25, 0.60], [19.35, 587.33, 0.60], [19.99, 523.25, 0.60, 440.0],
      ];
      // Exact Swarmatron windows: [start, dur, centerFreq, spreadCents]
      const swWins = [
        [0.05, 3.8, 55.0, 32],
        [7.74, 3.2, 110.0, 28],
        [12.90, 3.2, 165.0, 30],
        [15.48, 3.4, 220.0, 36],
        [20.70, 3.8, 55.0, 6],
      ];

      const bass = evalEvents(t, bassEv);
      const lead = evalEvents(t, leadEv);
      const leadHi = (t >= 15.48 && t < 20.64 && Number.isFinite(lead)) ? clamp(lead + 1.0, -3.0, 3.0) : NaN;
      let kick = NaN;
      for (let i = 0; i < kickTimes.length; i++) {
        const dt = t - kickTimes[i];
        const kd = i === 0 ? 0.35 : 0.22;
        if (dt >= 0 && dt < kd) { kick = shimIndKickY(dt, kd); break; }
      }
      let sn = NaN;
      for (let i = 0; i < snareEv.length; i++) {
        const dt = t - snareEv[i][0];
        if (dt >= 0 && dt < snareEv[i][1]) { sn = 2.35 - 1.8 * (dt / snareEv[i][1]); break; }
      }
      let zap = NaN;
      for (let i = 0; i < zapEv.length; i++) {
        const dt = t - zapEv[i][0];
        if (dt >= 0 && dt < zapEv[i][2]) { zap = shimGlitchY(dt, zapEv[i][1], zapEv[i][2]); break; }
      }
      let swL = NaN, swR = NaN;
      for (let i = 0; i < swWins.length; i++) {
        const w = swWins[i];
        const dt = t - w[0];
        if (dt >= 0 && dt < w[1]) {
          const drift = dt < w[1] * 0.5 ? 1.0 + 0.5 * (dt / (w[1] * 0.5)) : 1.5 - 0.7 * ((dt - w[1] * 0.5) / (w[1] * 0.5));
          const sp = (w[3] * drift) / 1200;
          swL = hz(w[2]) - sp;
          swR = hz(w[2]) + sp;
          break;
        }
      }
      // Visible Hall Reverb Decay Tail (exponential damped shimmer after hits, leads, zaps & chimes)
      const rvbAnchors = [
        [0.05, 261.63, 1.8], [0.64, 523.25, 1.2], [1.29, 329.63, 1.2], [1.93, 659.25, 0.9],
        [2.58, 1760.0, 1.4], [5.16, 1760.0, 1.4], [7.74, 1760.0, 1.4],
        [10.32, 880.0, 2.2], [12.25, 698.46, 1.8], [12.90, 587.33, 2.2], [14.83, 880.0, 1.8],
        [15.48, 1318.51, 2.4], [18.06, 1567.98, 2.4],
        [20.64, 440.0, 2.5], [23.22, 659.25, 1.5], [23.80, 1760.0, 1.95],
      ];
      let rvbTail = NaN;
      for (let i = rvbAnchors.length - 1; i >= 0; i--) {
        const a = rvbAnchors[i];
        const dt = t - a[0];
        if (dt >= 0 && dt < a[2]) {
          // Damped exponential spectral decay curve with hall comb shimmer
          const decay = exp(-dt / (a[2] * 0.45));
          rvbTail = clamp(hz(a[1]) - (1 - decay) * 0.85 + 0.045 * decay * sin(2 * PI * 9.5 * dt), -3.0, 3.0);
          break;
        }
      }

      if (mIdx === 0) {
        const ped = t < 2.5 ? hz(55.0 * Math.pow(0.98, t / 2.5)) : NaN;
        return [zap, kick, ped, swL, swR, sn, rvbTail];
      }
      if (mIdx === 1) return [kick, bass, sn, zap, swL, rvbTail];
      if (mIdx === 2) return [kick, bass, sn, zap, rvbTail];
      if (mIdx === 3) return [lead, kick, bass, sn, swL, rvbTail];
      if (mIdx === 4) return [lead, kick, bass, sn, swL, rvbTail];
      if (mIdx === 5) return [lead, kick, bass, sn, swL, rvbTail];
      if (mIdx === 6) return [leadHi, lead, kick, bass, sn, swL, rvbTail];
      if (mIdx === 7) return [leadHi, lead, kick, bass, sn, zap, rvbTail];
      if (mIdx === 8) {
        const gridBell = t < 23.0 ? hz(261.63) : NaN;
        return [-2.95, hz(55.0), zap, swL, gridBell, rvbTail];
      }
      // Measure 10 (23.22..25.80): A0/A1 fade -> 4800 Hz zap -> A6 (1760) & E7 Starlight + Hall RVB fade
      const a0 = t < 25.14 ? -2.95 : NaN;
      const a1 = t < 24.64 ? hz(55.0) : NaN;
      const star = t >= 23.80 ? (t >= 24.45 ? 3.00 : hz(1760.0)) : NaN;
      return [a0, a1, zap, swL, star, rvbTail];
    },
  },

  // 25 — Composition 5: Apollo 440 "Electro Glide in Blue" (1997) — 1:1 PCM Transcription + Per-Voice Stereo Echo + A440 Finale
  {
    id: "25", name: "TRACK 5: ELECTRO GLIDE IN BLUE", src: "APOLLO 440 · PER-VOICE ECHO · A440 FINALE", speed: 16 / 12.36, bsound: true, reverb: 0.38,
    parts: [
      {
        m: 1, modes: ["pno", "pno", "lpf"], gains: [1.0, 0.78, 0.56],
        echoes: [
          { sec: 0.478, spread: 0.016, fb: 0.60, wet: 0.48, damp: 0.40 },
          { sec: 0.478, spread: 0.022, fb: 0.54, wet: 0.36, damp: 0.28 },
          null,
        ],
        f: "Part 1/6 · Opening Piano Drops (0:08–0:20 PCM · Per-Voice 478 ms Echo · Dry Bass)\nDry Struck Drops (C4·A4·G4·A4·F4·E4 → F4·A4·F4·E4) + 478 ms Stereo Piano Echo · Clean Dry D3/D2 Bass",
      },
      {
        m: 2, modes: ["pno", "pno", "lpf"], gains: [1.0, 0.80, 0.60],
        echoes: [
          { sec: 0.478, spread: 0.016, fb: 0.62, wet: 0.50, damp: 0.40 },
          { sec: 0.478, spread: 0.022, fb: 0.55, wet: 0.38, damp: 0.28 },
          null,
        ],
        f: "Part 2/6 · Iconic Solo Piano-Drop Riff (0:20.7–0:33.1 PCM · Exact 6.18 s Cycle × 2)\nPiano Drops Only in 478 ms Stereo Echo (3.5 s Pure Decay) · Dry C3/D3/D2 Bass",
      },
      {
        m: 3, modes: ["pno", "pno", "lpf"], gains: [1.0, 0.78, 0.58],
        echoes: [
          { sec: 0.478, spread: 0.016, fb: 0.58, wet: 0.46, damp: 0.40 },
          { sec: 0.478, spread: 0.022, fb: 0.52, wet: 0.34, damp: 0.28 },
          null,
        ],
        f: "Part 3/6 · Solo Piano Bloom (0:33.1–0:45.4 PCM · Per-Voice 478 ms Echo · Dry Bass)\nG4·A4·E5·C4·A4·F4·E4 → D5·F5·F4·E4·C4 → D5·E5·C4·D5·F4·E5·E4·C4·D5·A4·E5·E4·C4",
      },
      {
        m: 4, modes: ["pno", "pno", "lpf", "sine"], gains: [1.0, 0.76, 0.74, 0.64],
        echoes: [
          { sec: 0.478, spread: 0.016, fb: 0.56, wet: 0.44, damp: 0.42 },
          { sec: 0.478, spread: 0.022, fb: 0.48, wet: 0.30, damp: 0.28 },
          null,
          null,
        ],
        f: "Part 4/6 · Full Groove & Piano-Drop Call-and-Response (1:02–1:14.4 PCM · Dry Bass & Kick)\n478 ms Echo on Piano Voices Only · Razor-Tight Dry D3/C3 Bass & Sub Kick",
      },
      {
        m: 5, modes: ["pno", "pno", "lpf", "sine"], gains: [0.94, 0.74, 0.76, 0.66],
        echoes: [
          { sec: 0.478, spread: 0.016, fb: 0.54, wet: 0.42, damp: 0.38 },
          { sec: 0.239, spread: 0.014, fb: 0.44, wet: 0.28, damp: 0.28, pingpong: true },
          null,
          null,
        ],
        f: "Part 5/6 · Main Climax High Synth-Piano Theme (2:50–3:02.4 PCM · Dual 478/239 ms Echo)\nV1 Lead 478 ms Stereo Echo + V2 Mid 239 ms Ping-Pong Echo · Dry Rolling D3/C3 Bass & Kick",
      },
      {
        m: 6, modes: ["pno", "pno", "pno", "lpf"], gains: [1.0, 0.88, 0.78, 0.80],
        echoes: [
          { sec: 0.478, spread: 0.016, fb: 0.68, wet: 0.52, damp: 0.38 },
          { sec: 0.478, spread: 0.024, fb: 0.66, wet: 0.46, damp: 0.32 },
          { sec: 0.239, spread: 0.014, fb: 0.52, wet: 0.32, damp: 0.26, pingpong: true },
          null,
        ],
        f: "Part 6/6 · A440 Signature Finale — Fading Drops into Strong Recognizable A = 440 Hz Accord\n478/239 ms Layered Piano Echoes on A5·A4(440 Hz)·E4 over Clean Dry A2→A1 Bass Foundation",
      },
    ],
    eval(x, pi) {
      // Natural 12.36 s phrase (6.18 s per 2-bar cycle) + exact 48 kHz stereo-measured 478 ms echo (16 ms Haas spread)
      const DUR = 12.36;
      const t = ((x + 8) / 16) * DUR;
      const barDur = DUR / 4; // 3.09 s
      const bt = mod(t, barDur);
      const evM = (evs) => {
        for (let i = 0; i < evs.length; i++) {
          const e = evs[i];
          if (t >= e[0] && t < e[0] + e[2]) return clamp((e[1] - 60) / 12, -3.0, 3.0);
        }
        return NaN;
      };

      // PART 1 (0:08.0–0:20.3 PCM): Dry struck opening drops only (434 ms echo carries the tails!)
      if (pi === 0) {
        const top = [
          [0.16,60,0.16],[0.32,69,0.26],[0.62,67,0.16],[0.78,69,0.16],[0.94,67,0.16],[1.24,69,0.20],
          [1.70,65,0.26],[2.02,64,0.42],
          [8.16,65,0.26],[8.48,69,0.16],[8.64,65,0.16],[8.80,64,0.40],
        ];
        const mid = [
          [0.46,60,0.24],[0.94,60,0.16],[1.70,57,0.26],[8.16,57,0.26],[8.48,65,0.16],[8.64,57,0.18],
        ];
        const bass = [
          [0.00,50,0.42],[0.62,50,0.42],[1.70,50,0.48],[2.48,50,0.48],
          [7.40,50,0.85],[8.64,38,0.24],[8.94,38,1.15],
        ];
        return [evM(top), evM(mid), evM(bass)];
      }

      // PART 2 (0:20.7–0:33.0 PCM): Exact 6.16 s solo piano-drop riff — DRY STRIKES ONLY so 434 ms echo is 1:1!
      if (pi === 1) {
        const top = [
          // Cycle 1 (0.00..2.70s), then 3.46s pure 434ms stereo echo + hall reverb decay!
          [0.00,74,0.16],[0.18,69,0.16],[0.42,79,0.16],[0.60,74,0.16],[0.78,69,0.26],
          [1.54,65,0.26],[1.84,69,0.16],[2.00,65,0.16],[2.16,60,0.16],[2.32,67,0.16],[2.48,64,0.24],
          // Cycle 2 (6.16..8.72s), then 3.60s pure 434ms stereo echo + hall reverb decay!
          [6.16,67,0.24],[6.46,76,0.20],[6.78,69,0.26],
          [7.86,69,0.16],[8.02,65,0.26],[8.32,67,0.16],[8.48,64,0.24],
        ];
        const mid = [
          [0.00,67,0.16],[0.42,74,0.16],[0.78,62,0.22],[1.54,57,0.26],[1.84,65,0.16],
          [2.16,57,0.16],[2.32,64,0.16],[2.48,60,0.24],
          [6.32,57,0.24],[6.78,62,0.18],[6.94,60,0.20],[8.02,57,0.22],[8.48,60,0.24],
        ];
        const bass = [
          [0.30,45,0.16],[0.46,48,0.16],[0.62,50,0.92],[2.92,38,0.55],
          [6.62,48,0.16],[6.78,50,0.40],[7.24,50,0.68],[9.68,38,0.65],
        ];
        return [evM(top), evM(mid), evM(bass)];
      }

      // PART 3 (0:33.1–0:45.4 PCM): Exact blooming solo piano melody
      if (pi === 2) {
        const top = [
          [0.00,67,0.16],[0.16,69,0.16],[0.31,76,0.16],[0.46,60,0.16],[0.62,69,0.22],[0.93,69,0.20],
          [1.54,69,0.16],[1.70,65,0.16],[1.85,64,0.16],[2.01,69,0.16],[2.16,64,0.16],[2.47,64,0.26],
          [3.08,60,0.16],[3.24,69,0.16],[3.40,60,0.16],[3.70,74,0.16],[3.86,62,0.16],[4.16,74,0.16],
          [4.32,62,0.16],[4.48,74,0.16],[4.62,77,0.16],[4.78,65,0.24],[5.24,64,0.28],[5.54,60,0.40],
          [6.16,74,0.16],[6.32,76,0.16],[6.48,60,0.16],[6.62,74,0.28],[6.94,62,0.16],[7.10,60,0.20],
          [7.55,69,0.16],[7.70,65,0.28],[8.01,76,0.22],[8.32,64,0.28],[8.62,60,0.24],
          [9.24,76,0.16],[9.40,60,0.28],[9.70,74,0.16],[9.86,60,0.16],[10.16,69,0.22],[10.48,74,0.16],
          [10.62,69,0.28],[10.94,76,0.16],[11.10,69,0.22],[11.40,69,0.16],[11.56,64,0.28],[11.86,69,0.16],[12.02,60,0.26],
        ];
        const mid = [
          [0.31,69,0.16],[1.70,57,0.16],[2.32,64,0.16],[2.47,60,0.20],[3.08,57,0.16],[3.24,60,0.16],
          [3.70,69,0.16],[4.16,69,0.16],[4.32,57,0.24],[5.70,57,0.20],[6.32,69,0.16],[6.78,60,0.20],
          [7.70,57,0.28],[8.01,69,0.16],[8.32,57,0.20],[9.24,69,0.16],[9.40,57,0.26],[9.70,69,0.16],
          [10.16,62,0.18],[10.78,65,0.16],[10.94,69,0.16],[11.10,64,0.20],[11.40,64,0.16],[11.70,60,0.26],
        ];
        const bass = [
          [0.46,48,0.16],[0.62,50,0.92],[3.54,50,0.45],[6.48,48,0.28],[6.78,50,0.38],[7.24,50,0.92],
          [9.86,50,0.45],[10.62,50,0.92],[12.02,50,0.28],
        ];
        return [evM(top), evM(mid), evM(bass)];
      }

      // Soft sub kick for Parts 4 & 5
      const kickSteps = [0, 3, 8, 11];
      let kick = NaN;
      for (let i = 0; i < kickSteps.length; i++) {
        const dt = bt - kickSteps[i] * (barDur / 16);
        if (dt >= 0 && dt < 0.12) { kick = shimKickY(dt, 55, 0.12); break; }
      }

      // PART 4 (1:02.0–1:14.3 PCM): Exact groove & piano-drop call-and-response
      if (pi === 3) {
        const top = [
          [0.15,74,0.16],[0.31,77,0.16],[0.46,65,0.16],[0.77,64,0.28],[1.08,69,0.20],[1.39,60,0.20],
          [1.70,69,0.16],[2.00,74,0.16],[2.16,69,0.16],[2.31,79,0.16],[2.46,74,0.26],
          [3.23,69,0.16],[3.39,77,0.16],[3.54,65,0.16],[3.70,69,0.16],[3.85,64,0.28],[4.16,69,0.16],
          [4.31,64,0.16],[4.47,60,0.22],[4.93,76,0.28],[5.39,74,0.16],[5.54,76,0.16],[5.70,62,0.16],
          [5.85,74,0.16],[6.01,69,0.16],[6.31,74,0.16],[6.47,69,0.16],[6.62,76,0.28],[6.93,64,0.16],
          [7.08,74,0.18],[7.39,64,0.16],[7.55,79,0.22],[8.01,74,0.16],[8.16,69,0.16],[8.32,79,0.16],
          [8.47,72,0.16],[8.62,74,0.26],[9.55,65,0.16],[9.70,76,0.16],[9.86,64,0.28],[10.16,69,0.16],
          [10.32,64,0.16],[10.47,79,0.16],[10.63,69,0.22],[11.09,72,0.16],[11.24,60,0.16],[11.40,74,0.28],[11.86,76,0.32],
        ];
        const mid = [
          [0.31,69,0.16],[1.08,64,0.18],[2.00,67,0.16],[2.31,60,0.20],[3.70,64,0.16],[4.16,64,0.16],
          [4.31,60,0.20],[4.93,69,0.28],[5.39,69,0.16],[5.85,69,0.16],[6.01,62,0.18],[6.47,65,0.16],
          [6.62,69,0.28],[7.08,64,0.18],[7.55,69,0.20],[8.01,67,0.16],[8.47,67,0.16],[8.62,69,0.22],
          [9.70,69,0.16],[10.16,64,0.16],[10.47,60,0.18],[11.09,69,0.16],[11.40,69,0.28],[11.86,69,0.24],
        ];
        const bass = [
          [1.23,50,0.16],[1.39,48,0.22],[1.70,50,0.28],[2.00,48,0.28],[2.31,50,0.24],[2.62,50,0.38],
          [3.08,50,0.62],[3.85,50,0.46],[4.31,48,0.28],[4.77,50,0.90],[5.70,40,0.24],[6.01,38,0.26],
          [6.31,50,0.92],[7.39,48,0.28],[7.70,50,0.38],[8.16,48,0.36],[8.62,50,0.80],[10.01,50,0.26],
          [10.32,50,0.16],[10.47,48,0.16],[10.63,41,0.16],[10.78,48,0.16],[10.94,50,0.28],[11.24,38,0.55],
        ];
        return [evM(top), evM(mid), evM(bass), kick];
      }

      // PART 5 (2:50.0–3:02.3 PCM): Exact climax high synth-piano theme
      if (pi === 4) {
        const top = [
          [0.00,84,0.16],[0.31,83,0.16],[0.46,84,0.28],[0.77,83,0.28],[1.08,84,0.16],[1.23,81,0.16],
          [1.54,79,0.28],[1.85,81,0.16],[2.00,79,0.16],[2.16,74,0.16],[2.46,76,0.16],[2.62,79,0.28],
          [2.93,74,0.16],[3.08,72,0.28],[3.54,72,0.16],[3.70,76,0.16],[4.00,76,0.16],[4.31,81,0.16],
          [4.47,71,0.16],[4.77,74,0.16],[5.08,71,0.16],[5.24,79,0.16],[5.54,74,0.18],[5.85,84,0.42],
          [6.31,83,0.28],[6.62,84,0.16],[6.78,83,0.28],[7.08,84,0.16],[7.24,79,0.16],[7.39,81,0.16],
          [7.55,84,0.16],[7.70,79,0.22],[8.01,79,0.16],[8.16,76,0.16],[8.47,79,0.16],[8.62,76,0.22],
          [8.93,76,0.16],[9.09,72,0.16],[9.39,72,0.28],[9.70,83,0.16],[9.86,72,0.20],[10.16,76,0.16],
          [10.32,72,0.20],[10.78,74,0.22],[11.09,72,0.16],[11.24,74,0.16],[11.55,74,0.16],[11.70,83,0.16],[12.01,84,0.28],
        ];
        const mid = [
          [0.00,69,0.22],[0.77,65,0.16],[0.93,69,0.28],[1.39,65,0.16],[1.70,76,0.16],[1.85,74,0.16],
          [2.00,76,0.16],[2.16,69,0.16],[2.46,72,0.16],[2.62,76,0.22],[2.93,71,0.20],[3.23,62,0.28],
          [3.54,69,0.28],[4.00,67,0.16],[4.31,71,0.16],[4.47,64,0.20],[5.08,67,0.16],[5.24,64,0.16],
          [5.39,60,0.24],[5.85,67,0.24],[6.16,69,0.16],[6.47,65,0.20],[6.78,74,0.16],[6.93,69,0.16],
          [7.24,62,0.28],[7.70,62,0.28],[8.01,71,0.16],[8.47,76,0.16],[8.62,72,0.16],[8.93,72,0.20],
          [9.39,69,0.28],[9.70,72,0.16],[9.86,67,0.16],[10.16,69,0.16],[10.32,64,0.16],[10.47,65,0.16],
          [10.78,65,0.26],[11.24,67,0.16],[11.40,60,0.22],[11.70,67,0.16],[12.01,71,0.26],
        ];
        const bass = [
          [0.00,50,0.74],[0.77,48,0.16],[0.93,38,0.16],[1.08,50,0.16],[1.23,36,0.16],[1.39,50,0.16],
          [1.54,38,0.16],[1.70,50,0.28],[2.00,48,0.16],[2.16,38,0.16],[2.31,48,0.16],[2.46,38,0.16],
          [2.62,50,0.16],[2.77,48,0.16],[2.93,50,0.16],[3.08,38,0.16],[3.23,50,0.28],[3.54,48,0.16],
          [3.70,50,0.16],[3.85,48,0.16],[4.00,50,0.16],[4.16,48,0.34],[4.62,38,0.16],[4.77,43,0.40],
          [6.16,50,0.74],[6.93,48,0.28],[7.24,38,0.28],[7.70,50,0.42],[8.16,48,0.28],[8.62,50,0.45],
          [9.24,50,0.45],[9.70,48,0.28],[10.16,50,0.45],[10.78,48,0.36],[11.24,50,0.65],
        ];
        return [evM(top), evM(mid), evM(bass), kick];
      }

      // PART 6/6 — Fading Drops into Strong Recognizable A440 Accord (A2 · E4 · A4 = 440 Hz · A5 = 880 Hz)
      // Bars 1–2 (0.00..5.20s): Gentle fading echo of the main motif descending D -> C -> A
      // Bars 3–4 (5.60..12.36s): Strong, unmistakable, sustained A440 accord fading smoothly into 478 ms stereo echo!
      const finTop = [
        // Fading motif descent
        [0.00,74,0.22],[0.32,69,0.24],[1.54,65,0.28],[1.96,64,0.34],[3.09,69,0.38],[4.12,67,0.42],
        // Strong recognizable A440 accord (A5 = 880 Hz over A4 = 440 Hz) — struck & softly echoed!
        [5.60,81,1.65],[7.72,81,1.85],
      ];
      const finMid = [
        [0.00,67,0.22],[1.54,57,0.32],[3.09,64,0.40],[4.12,60,0.44],
        // Exact A4 = 440.00 Hz (MIDI 69) strong center voice!
        [5.60,69,1.85],[7.72,69,2.10],
      ];
      const finLow = [
        [0.32,62,0.36],[3.09,60,0.48],
        // Exact E4 (MIDI 64) + C#5/E4 open fifth resonant support for A440!
        [5.60,64,1.85],[7.72,64,2.05],
      ];
      const finBass = [
        [0.00,50,0.90],[1.54,48,0.95],[3.09,45,1.40],
        // Deep A2 (110 Hz, MIDI 45) -> A1 (55 Hz, MIDI 33) grounding the A440 finale accord!
        [5.60,45,2.00],[7.72,33,2.60],
      ];
      return [evM(finTop), evM(finMid), evM(finLow), evM(finBass)];
    },
  },

  // 26 — Composition 6: Carla Bley "440" (1978, ALRAC Music) — Transcribed from 440.pdf (4 Pages, ♩ = 138 BPM)
  {
    id: "26", name: "TRACK 6: CARLA BLEY — 440", src: "440.PDF · 138 BPM · A=440", speed: 16 / 13.913, bsound: true, reverb: 0.24,
    parts: [
      {
        m: 1, modes: ["pno", "pno", "pno", "lpf"],
        f: "Part 1/6 · Carla Bley『440』(1978) — Opening A = 440 Hz Crossing-Hands Motif (Page 1, Sys 1)\nAm (2) → E/A (2) → Bb/A (2) → E/A (2) · l.h. A4–A5 (440/880 Hz) Pickup over Deep A1 Pedal",
      },
      {
        m: 2, modes: ["pno", "pno", "pno", "lpf"],
        f: "Part 2/6 · Chromatic Inner Bass & A6/A0 Octave Break (Page 1, Sys 2–3)\nGm/A (2) → G/A (2) → Am (2) → Syncopated Jazz-Rock Vamp Pickup over Constant A Pedal",
      },
      {
        m: 3, modes: ["pno", "pno", "lpf", "sine", "nse"],
        f: "Part 3/6 · Polychord Jazz-Rock Theme A (Page 2–3 · Over A = 440 Hz Pedal)\nC/A | B/A | Eb/A | D/A | Bb/A | G/A | F/A–G/A | A · Syncopated Piano + Bass + Jazz-Rock Drums",
      },
      {
        m: 4, modes: ["pno", "pno", "pno", "lpf"],
        f: "Part 4/6 · Legato Chromatic B-Section (Page 3, Sys 3–5 · Descending Bassline)\nF/A | G/A | Fm/E | Em/Eb | Fm/D | Abm–Abm/F# | Fm/E | Em · Pulsing Legato Triads",
      },
      {
        m: 5, modes: ["pno", "pno", "lpf", "sine", "nse"],
        f: "Part 5/6 · Full-Groove B-Section 8va & Polychord Drive (Page 4, Sys 1–2)\nF/A | G/A | Fm/E | Em/Eb | Fm/D | Abm–Abm/F# | Fm/E | Em (8va) + Driving Rhythm Section",
      },
      {
        m: 6, modes: ["pno", "pno", "pno", "lpf"],
        f: "Part 6/6 · Coda (* 2nd time play as written · Page 4, Sys 4–5)\nF/A–G/A→A | F/A–B/A→A | F/A–Eb/A→A (6/4) + Unison Lick Eb–D–C–A → Final 4-Octave Staccato A!",
      },
    ],
    eval(x, pi) {
      // Exact tempo from 440.pdf: quarter note = 138 BPM
      // 1 beat = 60/138 = 0.434783 s · 1 bar (4/4) = 1.73913 s · 8 bars = 13.91304 s
      const B = 60 / 138;
      const BAR = 4 * B;
      const DUR = 8 * BAR;
      const t = ((x + 8) / 16) * DUR;
      const bar = clamp(fl(t / BAR), 0, 7);
      const bt = t - bar * BAR;
      const st8 = clamp(fl(bt / (B * 0.5)), 0, 7);
      const sf8 = (bt - st8 * (B * 0.5)) / (B * 0.5);

      // Helper: convert beat index & duration (in beats) to seconds inside evalEvents
      const evB = (list) => {
        for (let i = 0; i < list.length; i++) {
          const s = list[i][0] * B, d = list[i][2] * B;
          if (t >= s && t < s + d) return clamp(hz(list[i][1]), -3.0, 3.0);
        }
        return NaN;
      };

      // PART 1 (Page 1 Sys 1): Am(2) | E/A(2) | Bb/A(2) | E/A(2) — iconic A4 (440 Hz) -> A5 (880 Hz) l.h. crossover!
      if (pi === 0) {
        const hi = [
          [2.0, 440.00, 0.45], [2.5, 880.00, 3.2], [6.0, 440.00, 0.45], [6.5, 880.00, 1.3],
          [10.0, 415.30, 0.45], [10.5, 440.00, 0.45], [11.0, 880.00, 3.2], [14.5, 880.00, 1.3],
          [18.0, 440.00, 0.45], [18.5, 466.16, 0.45], [19.0, 880.00, 3.2], [22.5, 880.00, 1.3],
          [26.0, 415.30, 0.45], [26.5, 440.00, 0.45], [27.0, 880.00, 3.2], [30.5, 880.00, 1.3],
        ];
        const mid = [
          [0.0, 261.63, 3.8], [4.0, 329.63, 3.8],
          [8.0, 246.94, 3.8], [12.0, 415.30, 3.8],
          [16.0, 233.08, 3.8], [20.0, 349.23, 3.8],
          [24.0, 246.94, 3.8], [28.0, 415.30, 3.8],
        ];
        const inner = [
          [0.0, 110.00, 3.8], [4.0, 164.81, 3.8],
          [8.0, 103.83, 3.8], [12.0, 123.47, 3.8],
          [16.0, 116.54, 3.8], [20.0, 146.83, 3.8],
          [24.0, 103.83, 3.8], [28.0, 110.00, 3.8],
        ];
        const pedA = bt < BAR * 0.94 ? hz(55.00) : NaN; // Deep A1 = 55 Hz pedal
        return [evB(hi), evB(mid), evB(inner), pedA];
      }

      // PART 2 (Page 1 Sys 2–3): Gm/A(2) | G/A(2) | Am(2) | A-octave break & vamp pickup (2)
      if (pi === 1) {
        const hi = [
          [2.0, 440.00, 0.45], [2.5, 880.00, 3.2], [6.5, 880.00, 1.3],
          [10.0, 440.00, 0.45], [10.5, 880.00, 3.2], [14.5, 880.00, 1.3],
          [18.0, 440.00, 0.45], [18.5, 880.00, 3.2], [22.0, 880.00, 1.5],
          // Dramatic A6 exclamation + syncopated rock-jazz pickup
          [24.0, 1760.00, 1.6], [26.5, 880.00, 0.45], [27.5, 783.99, 0.45],
          [28.0, 880.00, 0.85], [29.5, 880.00, 0.45], [30.0, 987.77, 0.45], [30.5, 880.00, 0.9],
        ];
        const mid = [
          [0.0, 233.08, 3.8], [4.0, 293.66, 3.8],
          [8.0, 246.94, 3.8], [12.0, 293.66, 3.8],
          [16.0, 261.63, 3.8], [20.0, 329.63, 3.8],
          [24.0, 440.00, 1.8], [28.0, 329.63, 0.9], [29.5, 392.00, 0.9], [30.5, 440.00, 1.2],
        ];
        const inner = [
          [0.0, 98.00, 3.8], [4.0, 146.83, 3.8],
          [8.0, 110.00, 3.8], [12.0, 146.83, 3.8],
          [16.0, 110.00, 3.8], [20.0, 164.81, 3.8],
          [24.0, 220.00, 1.8], [28.0, 110.00, 0.85], [29.0, 123.47, 0.85], [30.0, 138.59, 0.85], [31.0, 146.83, 0.85],
        ];
        const pedA = bt < BAR * 0.94 ? hz(55.00) : NaN;
        return [evB(hi), evB(mid), evB(inner), pedA];
      }

      // PART 3 (Page 2–3 Polychord Theme A): C/A | B/A | Eb/A | D/A | Bb/A | G/A | F/A–G/A | A
      if (pi === 2) {
        const rhTop = [
          // Bar 1 (C/A):  C5 — E5 · C5 · G4 · C5
          [0.0, 523.25, 0.85], [1.0, 659.25, 0.45], [1.5, 523.25, 0.85], [3.5, 523.25, 0.45],
          // Bar 2 (B/A):  B4 — D#5 · B4 · F#4
          [4.0, 493.88, 0.85], [5.0, 622.25, 0.45], [5.5, 493.88, 0.90], [7.5, 493.88, 0.45],
          // Bar 3 (Eb/A): Eb5 · G5 · Bb5 · C6 · Bb5 · G5 · F5 (exact Page 3 Sys 2 flourish!)
          [8.5, 622.25, 0.45], [9.0, 783.99, 0.45], [9.5, 932.33, 0.45], [10.0, 1046.50, 0.45], [10.5, 932.33, 0.45], [11.0, 783.99, 0.45], [11.5, 698.46, 0.45],
          // Bar 4 (D/A):  A5 — F#4 · A4
          [12.0, 880.00, 0.90], [13.5, 369.99, 0.45], [14.0, 440.00, 0.90],
          // Bar 5 (Bb/A): Bb4 — D5 · Bb4 · F5
          [16.0, 466.16, 0.85], [17.0, 587.33, 0.45], [17.5, 466.16, 0.85], [19.5, 698.46, 0.45],
          // Bar 6 (G/A):  B4 — D5 · G5
          [20.0, 493.88, 0.85], [21.0, 587.33, 0.45], [21.5, 783.99, 0.90],
          // Bar 7 (F/A - G/A): A4 · C5 · F5 | B4 · D5 · G5
          [24.5, 440.00, 0.45], [25.0, 523.25, 0.45], [25.5, 698.46, 0.85], [26.5, 493.88, 0.45], [27.0, 587.33, 0.45], [27.5, 783.99, 0.45],
          // Bar 8 (A):    A5 + E5 hold!
          [28.0, 880.00, 3.6],
        ];
        const rhMid = [
          [0.0, 329.63, 0.85], [1.0, 392.00, 0.85], [3.5, 329.63, 0.45],
          [4.0, 311.13, 0.85], [5.0, 369.99, 0.85], [7.5, 311.13, 0.45],
          [8.5, 392.00, 0.90], [10.0, 466.16, 0.90], [11.0, 392.00, 0.85],
          [12.0, 587.33, 0.90], [13.5, 293.66, 0.90],
          [16.0, 293.66, 0.85], [17.0, 349.23, 0.85], [19.5, 293.66, 0.45],
          [20.0, 293.66, 0.85], [21.0, 392.00, 0.85],
          [24.5, 349.23, 1.2], [26.5, 392.00, 1.2],
          [28.0, 554.37, 3.6], // C#5 bright A major resolution!
        ];
        // Constant A1/A2 jazz-rock syncopated bass
        const bassMask = [1, 0, 0, 2, 0, 1, 0, 2][st8];
        const bass = (bassMask > 0 && sf8 < 0.78) ? hz(bassMask === 2 ? 110.00 : 55.00) : NaN;
        const kick = (st8 === 0 || st8 === 3 || st8 === 5) && sf8 < 0.55 ? shimKickY(sf8 * B * 0.5, 58, 0.12) : NaN;
        const snr = (st8 === 2 || st8 === 6) && sf8 < 0.28 ? 2.1 - 1.4 * (sf8 / 0.28) : NaN;
        return [evB(rhTop), evB(rhMid), bass, kick, snr];
      }

      // PART 4 & PART 5 (Page 3 Sys 3–5 & Page 4 Sys 1–2): Legato Chromatic B-Section
      // F/A | G/A | Fm/E | Em/Eb | Fm/D | Abm – Abm/F# | Fm/E | Em
      if (pi === 3 || pi === 4) {
        const oct = pi === 4 ? 2.0 : 1.0; // Page 4 repeats the B-section 1 octave higher with full groove!
        // [bassHz, chordLow, chordMid, chordTop]
        const B_CH = [
          [110.00, 261.63, 349.23, 440.00], // Bar 1: F/A
          [110.00, 293.66, 392.00, 493.88], // Bar 2: G/A
          [ 82.41, 261.63, 311.13, 415.30], // Bar 3: Fm/E (Ab4–F4–C4 over E2)
          [ 77.78, 246.94, 329.63, 392.00], // Bar 4: Em/Eb (G4–E4–B3 over Eb2)
          [ 73.42, 261.63, 349.23, 415.30], // Bar 5: Fm/D (Ab4–F4–C4 over D2)
          [103.83, 246.94, 311.13, 415.30], // Bar 6: Abm (beats 1-2) -> Abm/F# (beats 3-4)
          [ 82.41, 261.63, 349.23, 415.30], // Bar 7: Fm/E
          [ 82.41, 246.94, 329.63, 392.00], // Bar 8: Em
        ];
        const ch = B_CH[bar];
        const bassHz = (bar === 5 && bt >= 2 * B) ? 92.50 : ch[0]; // Abm/F# on beat 3 of bar 6!
        // Signature Carla Bley pulsing legato 8th-note syncopation (beats 1, 2, 2+, tie, 3+, 4, 4+)
        const pulseOn = (st8 === 0 || st8 === 2 || st8 === 3 || st8 === 5 || st8 === 6 || st8 === 7) && sf8 < 0.84;
        const topNote = pulseOn ? hz(ch[3] * oct) : NaN;
        const midNote = pulseOn ? hz(ch[2] * oct) : NaN;
        const lowNote = pulseOn ? hz(ch[1] * oct) : NaN;

        if (pi === 3) {
          const legBass = bt < BAR * 0.94 ? hz(bassHz) : NaN;
          return [topNote, midNote, lowNote, legBass];
        }
        // Part 5: Full driving groove 8va
        const bMask = [1, 0, 1, 0, 2, 0, 1, 0][st8];
        const driveBass = (bMask > 0 && sf8 < 0.78) ? hz(bMask === 2 ? bassHz * 1.5 : bassHz) : NaN;
        const kick = (st8 === 0 || st8 === 3 || st8 === 5) && sf8 < 0.55 ? shimKickY(sf8 * B * 0.5, 58, 0.12) : NaN;
        const snr = (st8 === 2 || st8 === 6) && sf8 < 0.28 ? 2.1 - 1.4 * (sf8 / 0.28) : NaN;
        return [topNote, midNote, driveBass, kick, snr];
      }

      // PART 6 (Page 4 Sys 4–5): Coda (* 2nd time play as written)
      // F/A–G/A -> A | F/A–B/A -> A | F/A–Eb/A -> A(6/4) + Unison Lick Eb–D–C–A -> Final 4-Octave Staccato A!
      const codaTop = [
        // Bars 1–2: F/A (C5) -> G/A (D5) -> A (A5)
        [0.5, 349.23, 0.45], [1.0, 440.00, 0.45], [1.5, 523.25, 0.45], [2.0, 587.33, 1.9], [4.0, 880.00, 3.6],
        // Bars 3–4: F/A -> B/A (D#5) -> A (A5)
        [8.5, 349.23, 0.45], [9.0, 440.00, 0.45], [9.5, 523.25, 0.45], [10.0, 622.25, 1.9], [12.0, 880.00, 3.6],
        // Bars 5–6: F/A -> Eb/A (Eb5) -> Massive A6!
        [16.5, 349.23, 0.45], [17.0, 440.00, 0.45], [17.5, 523.25, 0.45], [18.0, 622.25, 1.9], [20.0, 1760.00, 3.8],
        // Bar 7: Descending bluesy unison lick Eb5 -> D5 -> C5 -> A4
        [24.5, 622.25, 0.45], [25.0, 587.33, 0.45], [25.5, 523.25, 0.45], [26.0, 440.00, 0.90],
        // Bar 8: Final sharp staccato A5 = 880 Hz on beat 1!
        [28.0, 880.00, 0.38],
      ];
      const codaMid = [
        [2.0, 392.00, 1.9], [4.0, 440.00, 3.6],
        [10.0, 369.99, 1.9], [12.0, 440.00, 3.6],
        [18.0, 392.00, 1.9], [20.0, 440.00, 3.8],
        [24.5, 311.13, 0.45], [25.0, 293.66, 0.45], [25.5, 261.63, 0.45], [26.0, 220.00, 0.90],
        [28.0, 440.00, 0.38], // A4 = 440 Hz!
      ];
      const codaLow = [
        [2.0, 293.66, 1.9], [4.0, 329.63, 3.6],
        [10.0, 246.94, 1.9], [12.0, 329.63, 3.6],
        [18.0, 311.13, 1.9], [20.0, 329.63, 3.8],
        [24.5, 155.56, 0.45], [25.0, 146.83, 0.45], [25.5, 130.81, 0.45], [26.0, 110.00, 0.90],
        [28.0, 220.00, 0.38],
      ];
      const codaBass = [
        [0.0, 55.00, 3.8], [4.0, 55.00, 3.6],
        [8.0, 55.00, 3.8], [12.0, 55.00, 3.6],
        [16.0, 55.00, 3.8], [20.0, 55.00, 3.8],
        [28.0, 55.00, 0.38], // Final staccato A1!
      ];
      return [evB(codaTop), evB(codaMid), evB(codaLow), evB(codaBass)];
    },
  },
];

// ============================================================================
// SAMPLE-ACCURATE WEB AUDIO SYNTHESIZER (1:1 Continuous Phase Integration)
// ============================================================================
const MAX_VOICES = 10;
let audioCtx = null;
let procNode = null;
let audioOn = false;
let muted = false;
let playing = true;
let autoParts = true;
let demoIdx = 0;
let partIdx = 0;
let curX = X_MIN;
let scrubbing = false;

const vPhase = new Float64Array(MAX_VOICES);
const vModPhase = new Float64Array(MAX_VOICES);
const vEnv = new Float64Array(MAX_VOICES);
const vFreq = new Float64Array(MAX_VOICES);
const vNoiseLp = new Float64Array(MAX_VOICES);
const vFilterLp = new Float64Array(MAX_VOICES);
const vNoteAge = new Float64Array(MAX_VOICES);
const vPrevActive = new Uint8Array(MAX_VOICES);
const vPrevFreq = new Float64Array(MAX_VOICES);
let rngState = 0x12345678;
let lpL = 0, lpR = 0;

// Real-time broadcast metering telemetry (Pro Tools / ITU-R BS.1770 style)
let meterPeakL = 0, meterPeakR = 0;
let meterRmsL = 0, meterRmsR = 0;
let meterLimHit = 0;
let meterBal = 0;

// Static 4-Comb Schroeder Hall Reverb + Global & Per-Voice Stereo Delay Buffers (zero hot-path allocation)
const RVB_LENS = [1559, 1699, 1847, 1993];
const rvbBufs = RVB_LENS.map((n) => new Float32Array(n));
const rvbIdx = new Int32Array(4);
const rvbLp = new Float32Array(4);
const ECHO_MAX = 48000;
const echoBufL = new Float32Array(ECHO_MAX);
const echoBufR = new Float32Array(ECHO_MAX);
let echoIdx = 0, echoLpL = 0, echoLpR = 0;
const vEchoL = Array.from({ length: MAX_VOICES }, () => new Float32Array(ECHO_MAX));
const vEchoR = Array.from({ length: MAX_VOICES }, () => new Float32Array(ECHO_MAX));
const vEchoIdx = new Int32Array(MAX_VOICES);
const vEchoLpL = new Float32Array(MAX_VOICES);
const vEchoLpR = new Float32Array(MAX_VOICES);
function clearReverb() {
  rvbBufs.forEach((b) => b.fill(0));
  rvbLp.fill(0);
  echoBufL.fill(0);
  echoBufR.fill(0);
  echoIdx = 0;
  echoLpL = 0;
  echoLpR = 0;
  for (let v = 0; v < MAX_VOICES; v++) {
    vEchoL[v].fill(0);
    vEchoR[v].fill(0);
  }
  vEchoIdx.fill(0);
  vEchoLpL.fill(0);
  vEchoLpR.fill(0);
  vNoteAge.fill(0);
  vPrevActive.fill(0);
}

function nextNoise() {
  rngState ^= rngState << 13;
  rngState ^= rngState >>> 17;
  rngState ^= rngState << 5;
  return ((rngState >>> 0) / 2147483648) - 1;
}

function synthBSoundWave(mode, ph, modPh, f, v) {
  const s1 = Math.sin(ph);
  if (mode === "sine") {
    return f < 95 ? 0.90 * s1 + 0.10 * Math.sin(2 * ph) : s1;
  }
  if (mode === "tri") {
    return (2 / PI) * Math.asin(s1);
  }
  if (mode === "saw") {
    return 0.62 * (s1 - 0.5 * Math.sin(2 * ph) + 0.333 * Math.sin(3 * ph) - 0.25 * Math.sin(4 * ph));
  }
  if (mode === "pls") {
    // Band-limited soft square / pulse wave
    return 0.78 * Math.tanh(3.4 * s1);
  }
  if (mode === "fm") {
    // Orchestra.html Eq. 12: 2-Operator FM Bell (f_m/f_c = 2.76, I = 1.8)
    return Math.sin(ph + 1.8 * Math.sin(modPh));
  }
  if (mode === "am") {
    // Amplitude / Ring Modulation (32 Hz cuica rasp / Orchestra Eq. 19 tremolo)
    const saw4 = 0.62 * (s1 - 0.5 * Math.sin(2 * ph) + 0.333 * Math.sin(3 * ph) - 0.25 * Math.sin(4 * ph));
    return saw4 * (0.55 + 0.45 * Math.sin(modPh * 0.08));
  }
  if (mode === "noise" || mode === "nse") {
    const n = nextNoise();
    const alpha = f > 900 ? 0.45 : 0.12;
    vNoiseLp[v] += (n - vNoiseLp[v]) * alpha;
    if (f > 900) {
      const hp = n - vNoiseLp[v];
      return hp * 0.78 + s1 * Math.sin(modPh) * 0.22;
    }
    return vNoiseLp[v] * 0.72 + s1 * 0.28;
  }
  if (mode === "lpf") {
    // Resonant low-pass filtered saw/triangle (cello arco, Moog bass, upright bass)
    const raw = 0.65 * (s1 - 0.5 * Math.sin(2 * ph) + 0.333 * Math.sin(3 * ph)) + 0.35 * (2 / PI) * Math.asin(s1);
    vFilterLp[v] += (raw - vFilterLp[v]) * 0.16;
    return vFilterLp[v] * 1.25;
  }
  if (mode === "hpf") {
    // High-pass filtered crisp saw/glitch transient (1.8–7.5 kHz edge)
    const saw4 = 0.62 * (s1 - 0.5 * Math.sin(2 * ph) + 0.333 * Math.sin(3 * ph) - 0.25 * Math.sin(4 * ph));
    vFilterLp[v] += (saw4 - vFilterLp[v]) * 0.22;
    return (saw4 - vFilterLp[v]) * 1.35;
  }
  if (mode === "bpf") {
    // Band-pass formant voice (woodwind breath, damper air swoosh, body formant)
    const n = nextNoise();
    vNoiseLp[v] += (n - vNoiseLp[v]) * 0.18;
    const tri = (2 / PI) * Math.asin(s1);
    return tri * 0.62 + (vNoiseLp[v] - vFilterLp[v]) * 0.55;
  }
  if (mode === "lfo") {
    // Vibrato-modulated bowed string (5.8 Hz LFO phase shimmer)
    const vph = ph + 0.18 * Math.sin(modPh * 0.015);
    return 0.62 * (Math.sin(vph) - 0.5 * Math.sin(2 * vph) + 0.333 * Math.sin(3 * vph) - 0.25 * Math.sin(4 * vph));
  }
  if (mode === "pno") {
    // Velvety Acoustic Grand Piano Drop (warm fundamental + felt-hammer overtone roll-off)
    const age = vNoteAge[v];
    const bright = Math.exp(-age * 8.5);
    const body = 0.16 + 0.84 * Math.exp(-age * 2.5);
    const hiRoll = f > 480 ? 0.55 : 1.0; // gentle upper-register felt warmth
    const w = 0.78 * s1
      + (0.20 + 0.18 * bright) * hiRoll * Math.sin(2 * ph)
      + (0.06 + 0.12 * bright) * hiRoll * Math.sin(3 * ph)
      + 0.05 * bright * hiRoll * Math.sin(4 * ph);
    return w * body * 0.90;
  }
  if (mode === "rvb") {
    // Hall reverb shimmer carrier (soft damped sine + airy comb overtone)
    return 0.42 * s1 + 0.16 * Math.sin(modPh) * 0.5;
  }
  if (mode === "sat") {
    // Orchestra.html Eq. 14 / MEDIA-SOUND.txt §5.2 WaveShaper saturation (k = 25)
    if (f < 100) {
      return bSoundSat(s1 * 1.45, 25);
    }
    const saw4 = 0.62 * (s1 - 0.5 * Math.sin(2 * ph) + 0.333 * Math.sin(3 * ph) - 0.25 * Math.sin(4 * ph));
    const sq = Math.tanh(2.4 * s1);
    return bSoundSat((saw4 * 0.65 + sq * 0.45) * 1.35, 25);
  }
  return Math.tanh(2.15 * s1);
}

function ensureAudio() {
  if (audioCtx) {
    if (audioCtx.state === "suspended") audioCtx.resume();
    audioOn = true;
    updateAudioUI();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  audioCtx = new AC();
  const sr = audioCtx.sampleRate;
  const bufSize = 1024;
  procNode = audioCtx.createScriptProcessor(bufSize, 0, 2);
  const envRate = 1 - Math.exp(-1 / (0.0028 * sr)); // 2.8ms smooth anti-click envelope
  const lpAlpha = 1 - Math.exp((-2 * PI * 4200) / sr); // warm analog 4.2kHz low-pass

  procNode.onaudioprocess = (ev) => {
    const outL = ev.outputBuffer.getChannelData(0);
    const outR = ev.outputBuffer.getChannelData(1);
    let demo = DEMOS[demoIdx];
    let partModes = demo.parts[partIdx].modes || null;
    let partGains = demo.parts[partIdx].gains || null;
    let partEchoes = demo.parts[partIdx].echoes || null;
    const dt = 1 / sr;
    let dx = (playing && !scrubbing) ? demo.speed * dt : 0;
    let blkPkL = 0, blkPkR = 0, blkSqL = 0, blkSqR = 0, limTrig = 0;

    for (let i = 0; i < bufSize; i++) {
      const vals = demo.eval(curX, partIdx);
      const nv = Math.min(MAX_VOICES, vals.length);
      let sL = 0, sR = 0;
      const norm = 1 / Math.sqrt(Math.max(1, nv));

      for (let v = 0; v < MAX_VOICES; v++) {
        const y = v < nv ? vals[v] : NaN;
        const active = !muted && (playing || scrubbing) && Number.isFinite(y) && y > -4.5 && y < 4.5;
        vEnv[v] += ((active ? 1 : 0) - vEnv[v]) * envRate;
        if (active) {
          const newF = F0 * Math.pow(2, y);
          if (!vPrevActive[v] || abs(newF - vPrevFreq[v]) > newF * 0.025) {
            vNoteAge[v] = 0;
          } else {
            vNoteAge[v] += dt;
          }
          vFreq[v] = newF;
          vPrevFreq[v] = newF;
          vPrevActive[v] = 1;
        } else {
          vPrevActive[v] = 0;
        }
        let vDryL = 0, vDryR = 0;
        if (vEnv[v] > 1e-4) {
          const f = vFreq[v];
          vPhase[v] += 2 * PI * f * dt;
          if (vPhase[v] > 2 * PI) vPhase[v] -= 2 * PI * Math.floor(vPhase[v] / (2 * PI));
          vModPhase[v] += 2 * PI * (f * 2.76) * dt;
          if (vModPhase[v] > 2 * PI) vModPhase[v] -= 2 * PI * Math.floor(vModPhase[v] / (2 * PI));
          let wave;
          if (partModes) {
            wave = synthBSoundWave(partModes[v] || "sine", vPhase[v], vModPhase[v], f, v);
          } else {
            // Exact warm odd-harmonic timbre matching original math-synth FFT (1f, 3f, 5f):
            // Cleaner sine for deep sub/kick (<120Hz), warm soft-square tanh(2.1 sin) for melodic,
            // crisp metallic shimmer for high hats/claps (>950Hz)
            const s1 = Math.sin(vPhase[v]);
            if (f < 115) {
              wave = Math.tanh(1.35 * s1);
            } else if (f > 950) {
              wave = Math.tanh(2.5 * s1) * 0.72 + Math.sin(vPhase[v] * 2.73) * 0.28;
            } else {
              wave = Math.tanh(2.15 * s1);
            }
          }
          const vGain = partGains && partGains[v] !== undefined ? partGains[v] : 1;
          const sample = wave * vEnv[v] * vGain * norm;
          // Equal-power / subtle stereo spread across voices (Orchestra.html Eq. 8)
          const pan = nv > 1 ? ((v / (nv - 1)) - 0.5) * 0.45 : 0;
          vDryL = sample * (0.5 - pan);
          vDryR = sample * (0.5 + pan);
          sL += vDryL;
          sR += vDryR;
        }
        // Per-voice custom stereo delay & echo (keeps ringing smoothly even when dry gate closes)
        const veCfg = partEchoes ? partEchoes[v] : null;
        if (veCfg && veCfg.wet > 0) {
          const bL = vEchoL[v], bR = vEchoR[v];
          const wIdx = vEchoIdx[v];
          const dL = clamp(Math.round(veCfg.sec * sr), 1, ECHO_MAX - 1);
          const dR = clamp(Math.round((veCfg.sec + (veCfg.spread || 0)) * sr), 1, ECHO_MAX - 1);
          const rdL = bL[(wIdx - dL + ECHO_MAX) % ECHO_MAX];
          const rdR = bR[(wIdx - dR + ECHO_MAX) % ECHO_MAX];
          const dmp = veCfg.damp || 0.36;
          vEchoLpL[v] += (rdL - vEchoLpL[v]) * dmp;
          vEchoLpR[v] += (rdR - vEchoLpR[v]) * dmp;
          if (veCfg.pingpong) {
            bL[wIdx] = vDryL + vEchoLpR[v] * veCfg.fb;
            bR[wIdx] = vDryR + vEchoLpL[v] * veCfg.fb;
          } else {
            bL[wIdx] = vDryL + vEchoLpL[v] * veCfg.fb;
            bR[wIdx] = vDryR + vEchoLpR[v] * veCfg.fb;
          }
          vEchoIdx[v] = (wIdx + 1) % ECHO_MAX;
          sL += vEchoLpL[v] * veCfg.wet;
          sR += vEchoLpR[v] * veCfg.wet;
        }
      }

      // Gentle 1-pole analog warmth filter + optional 4-Comb Hall Reverb (Orchestra Eq. 15) + soft limiter
      lpL += (sL - lpL) * lpAlpha;
      lpR += (sR - lpR) * lpAlpha;
      let mixL = lpL, mixR = lpR;
      const echoCfg = demo.parts[partIdx].echo !== undefined ? demo.parts[partIdx].echo : (demo.echo || null);
      if (echoCfg && echoCfg.wet > 0) {
        const dSampL = clamp(Math.round(echoCfg.sec * sr), 1, ECHO_MAX - 1);
        const dSampR = clamp(Math.round((echoCfg.sec + (echoCfg.spread || 0)) * sr), 1, ECHO_MAX - 1);
        const rdL = echoBufL[(echoIdx - dSampL + ECHO_MAX) % ECHO_MAX];
        const rdR = echoBufR[(echoIdx - dSampR + ECHO_MAX) % ECHO_MAX];
        echoLpL += (rdL - echoLpL) * 0.36;
        echoLpR += (rdR - echoLpR) * 0.36;
        // True parallel stereo delay (with optional Haas spread) matching studio tape echo
        echoBufL[echoIdx] = lpL + echoLpL * echoCfg.fb;
        echoBufR[echoIdx] = lpR + echoLpR * echoCfg.fb;
        echoIdx = (echoIdx + 1) % ECHO_MAX;
        mixL += echoLpL * echoCfg.wet;
        mixR += echoLpR * echoCfg.wet;
      }
      const rvbWet = demo.reverb || 0;
      if (rvbWet > 0) {
        // Feed dry + stereo echo taps into the 4-comb hall reverb for lush ambient piano-drop tail
        const monoIn = 0.5 * (mixL + mixR);
        let wL = 0, wR = 0;
        for (let c = 0; c < 4; c++) {
          const buf = rvbBufs[c];
          const idx = rvbIdx[c];
          const rd = buf[idx];
          rvbLp[c] += (rd - rvbLp[c]) * 0.28; // Hall high-frequency damping
          buf[idx] = monoIn + rvbLp[c] * 0.78;
          rvbIdx[c] = (idx + 1) % buf.length;
          if (c & 1) wR += rd; else wL += rd;
        }
        mixL += wL * 0.5 * rvbWet;
        mixR += wR * 0.5 * rvbWet;
      }
      const preL = mixL * 1.15, preR = mixR * 1.15;
      if (Math.abs(preL) > 0.85 || Math.abs(preR) > 0.85) limTrig = 1;
      const oL = Math.tanh(preL) * 0.42;
      const oR = Math.tanh(preR) * 0.42;
      outL[i] = oL;
      outR[i] = oR;
      const aL = Math.abs(oL), aR = Math.abs(oR);
      if (aL > blkPkL) blkPkL = aL;
      if (aR > blkPkR) blkPkR = aR;
      blkSqL += oL * oL;
      blkSqR += oR * oR;

      if (dx > 0) {
        curX += dx;
        if (curX >= X_MAX) {
          curX = X_MIN;
          if (autoParts) {
            if (partIdx + 1 < demo.parts.length) {
              partIdx++;
            } else {
              demoIdx = (demoIdx + 1) % DEMOS.length;
              partIdx = 0;
              demo = DEMOS[demoIdx];
              dx = (playing && !scrubbing) ? demo.speed * dt : 0;
              vEnv.fill(0);
              clearReverb();
            }
            partModes = demo.parts[partIdx].modes || null;
            partGains = demo.parts[partIdx].gains || null;
            partEchoes = demo.parts[partIdx].echoes || null;
            needChromeUpdate = true;
          }
        }
      }
    }
    // Smooth peak hold & RMS ballistic decay
    meterPeakL = Math.max(blkPkL, meterPeakL * 0.84);
    meterPeakR = Math.max(blkPkR, meterPeakR * 0.84);
    meterRmsL = Math.sqrt(blkSqL / bufSize);
    meterRmsR = Math.sqrt(blkSqR / bufSize);
    meterLimHit = limTrig ? 1.0 : meterLimHit * 0.82;
    const sumLR = meterRmsL + meterRmsR;
    meterBal = sumLR > 1e-5 ? (meterRmsR - meterRmsL) / sumLR : 0;
  };
  procNode.connect(audioCtx.destination);
  audioOn = true;
  updateAudioUI();
}

// ============================================================================
// UI & HAL 9000 RENDERER
// ============================================================================
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const elEye = document.getElementById("eye");
const elName = document.getElementById("d-name");
const elMeta = document.getElementById("d-meta");
const elAudio = document.getElementById("btn-audio");
const elBSound = document.getElementById("btn-bsound");
const elFPart = document.getElementById("f-part");
const elFTelem = document.getElementById("f-telem");
const elFBody = document.getElementById("f-body");
const elDspTitle = document.getElementById("f-dsp-title");
const elDspVoices = document.getElementById("f-dsp-voices");
const elMBarL = document.getElementById("m-bar-l");
const elMBarR = document.getElementById("m-bar-r");
const elMPk = document.getElementById("m-pk");
const elMRms = document.getElementById("m-rms");
const elMLim = document.getElementById("m-lim");
const elMBal = document.getElementById("m-bal");
const elProg = document.getElementById("prog");
const elLegend = document.getElementById("legend");
const elIndex = document.getElementById("index");

let dspChipsKey = "";
let dspChipEls = [];

function dspMarkerSvg(mode, col) {
  const s = `stroke="${col}" stroke-width="1.45" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  if (mode === "tri") return `<svg viewBox="-5 -5 10 10"><polygon points="0,-4.2 3.9,3.2 -3.9,3.2" ${s}/></svg>`;
  if (mode === "saw") return `<svg viewBox="-5 -5 10 10"><polygon points="-3.8,3.2 3.8,-3.6 3.8,3.2" ${s}/></svg>`;
  if (mode === "pls") return `<svg viewBox="-5 -5 10 10"><polyline points="-4,2.8 -2,2.8 -2,-3.2 2,-3.2 2,2.8 4,2.8" ${s}/></svg>`;
  if (mode === "fm")  return `<svg viewBox="-5 -5 10 10"><polygon points="0,-4.2 4,0 0,4.2 -4,0" ${s}/></svg>`;
  if (mode === "am")  return `<svg viewBox="-5 -5 10 10"><circle cx="0" cy="0" r="3.8" ${s}/><line x1="-2.5" y1="-2.5" x2="2.5" y2="2.5" ${s}/><line x1="2.5" y1="-2.5" x2="-2.5" y2="2.5" ${s}/></svg>`;
  if (mode === "sat") return `<svg viewBox="-5 -5 10 10"><rect x="-3.3" y="-3.3" width="6.6" height="6.6" ${s}/></svg>`;
  if (mode === "lpf") return `<svg viewBox="-5 -5 10 10"><polyline points="-4,-2.4 0.6,-2.4 4,3.2" ${s}/></svg>`;
  if (mode === "hpf") return `<svg viewBox="-5 -5 10 10"><polyline points="-4,3.2 -0.6,-2.4 4,-2.4" ${s}/></svg>`;
  if (mode === "bpf") return `<svg viewBox="-5 -5 10 10"><polyline points="-4,3 0,-3.8 4,3" ${s}/></svg>`;
  if (mode === "lfo") return `<svg viewBox="-5 -5 10 10"><path d="M-4,0 Q-2,-4 0,0 T4,0" ${s}/></svg>`;
  if (mode === "pno") return `<svg viewBox="-5 -5 10 10"><rect x="-3.8" y="-3.2" width="7.6" height="6.4" ${s}/><line x1="-1.2" y1="-3.2" x2="-1.2" y2="0.6" ${s}/><line x1="1.3" y1="-3.2" x2="1.3" y2="0.6" ${s}/></svg>`;
  if (mode === "rvb") return `<svg viewBox="-5 -5 10 10"><circle cx="0" cy="0" r="3.9" ${s}/><circle cx="0" cy="0" r="1.7" ${s}/></svg>`;
  if (mode === "noise" || mode === "nse") return `<svg viewBox="-5 -5 10 10"><line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" ${s}/><line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" ${s}/><line x1="0" y1="-4.1" x2="0" y2="4.1" ${s}/></svg>`;
  return `<svg viewBox="-5 -5 10 10"><circle cx="0" cy="0" r="3.6" ${s}/></svg>`;
}

let needChromeUpdate = true;
let lastFrame = performance.now();
let curveCacheKey = "";
let curveCache = null;

function updateAudioUI() {
  const live = audioOn && !muted && playing;
  elEye.classList.toggle("live", live);
  elAudio.classList.toggle("on", live);
  elAudio.textContent = !audioOn ? "AUDIO OFF" : (muted ? "MUTED" : (playing ? "AUDIO LIVE" : "PAUSED"));
}

function updateChrome() {
  const d = DEMOS[demoIdx];
  const p = d.parts[partIdx];
  elName.textContent = d.name;
  elMeta.textContent = d.bsound
    ? `DEMO ${d.id}/${String(DEMOS.length).padStart(2, "0")} · PART ${partIdx + 1}/${d.parts.length} · B-SOUND VIRTUAL DSP · ${d.src}`
    : `DEMO ${d.id}/${String(DEMOS.length).padStart(2, "0")} · PART ${partIdx + 1}/${d.parts.length} · F(Y) = 261.63 · 2^Y HZ`;
  elFPart.textContent = `PART ${partIdx + 1}/${d.parts.length}  ·  ${d.name}` + (autoParts ? "  [AUTO]" : "  [LOOP]");
  elFBody.textContent = p.f;
  if (elBSound) elBSound.classList.toggle("on", !!d.bsound);
  document.querySelectorAll(".idx-item").forEach((b) => b.classList.toggle("on", Number(b.dataset.idx) === demoIdx));
  updateAudioUI();
  needChromeUpdate = false;
}

function selectDemo(i, p = 0) {
  demoIdx = ((i % DEMOS.length) + DEMOS.length) % DEMOS.length;
  partIdx = clamp(p, 0, DEMOS[demoIdx].parts.length - 1);
  curX = X_MIN;
  vEnv.fill(0);
  clearReverb();
  needChromeUpdate = true;
}

function selectPart(p) {
  const n = DEMOS[demoIdx].parts.length;
  partIdx = ((p % n) + n) % n;
  curX = X_MIN;
  vEnv.fill(0);
  needChromeUpdate = true;
}

function buildIndex() {
  const catOf = (i) =>
    i < 4 ? "HARMONIC & POLYPHONIC"
    : i < 9 ? "BITMASK & ACID GROOVES"
    : i < 12 ? "AMBIENT & CANON"
    : i < 16 ? "PIECEWISE & ANALYTICAL"
    : "B-SOUND VIRTUAL DSP";
  const cats = [
    "HARMONIC & POLYPHONIC",
    "BITMASK & ACID GROOVES",
    "AMBIENT & CANON",
    "PIECEWISE & ANALYTICAL",
    "B-SOUND VIRTUAL DSP",
  ];
  let activeCat = "ALL";
  const h = document.createElement("h2");
  h.textContent = "HAL 9000 // MATH-SYNTH & B-SOUND VIRTUAL DSP CATALOGUE (" + DEMOS.length + " DEMOS)";
  const filters = document.createElement("div");
  filters.className = "idx-filters";
  const body = document.createElement("div");

  function renderList() {
    body.replaceChildren();
    const listCats = activeCat === "ALL" ? cats : [activeCat];
    listCats.forEach((cat) => {
      const items = DEMOS.map((d, i) => ({ d, i })).filter((x) => catOf(x.i) === cat);
      if (!items.length) return;
      const ch = document.createElement("div");
      ch.className = "idx-cat";
      ch.textContent = cat + "  (" + items.length + ")";
      const grid = document.createElement("div");
      grid.className = "idx-grid";
      items.forEach(({ d, i }) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "idx-item" + (i === demoIdx ? " on" : "");
        b.dataset.idx = String(i);
        b.innerHTML = `<div class="num">${d.id} · SRC ${d.src}</div><div class="ttl">${d.name}</div><div class="pts">${d.parts.length} PARTS</div>`;
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          selectDemo(i, 0);
          elIndex.classList.remove("open");
          ensureAudio();
        });
        grid.append(b);
      });
      body.append(ch, grid);
    });
  }

  ["ALL", ...cats].forEach((cat) => {
    const p = document.createElement("button");
    p.type = "button";
    p.className = "pill";
    p.textContent = cat === "ALL" ? "ALL (" + DEMOS.length + ")" : cat.split(" ")[0];
    p.addEventListener("click", (e) => {
      e.stopPropagation();
      activeCat = cat;
      filters.querySelectorAll(".pill").forEach((elP) => elP.classList.toggle("on", elP === p));
      renderList();
    });
    if (cat === "ALL") p.classList.add("on");
    filters.append(p);
  });

  elIndex.append(h, filters, body);
  renderList();
}

function getPlotRect(W, H) {
  const fRect = document.getElementById("formula-screen").getBoundingClientRect();
  const top = 66;
  const bot = Math.max(top + 160, fRect.top - 16);
  const padX = Math.max(36, W * 0.055);
  return { x: padX, y: top, w: W - padX * 2, h: bot - top };
}

function ensureCurveCache(demo, pi) {
  const key = `${demo.id}:${pi}`;
  if (key === curveCacheKey && curveCache) return curveCache;
  const SAMPLES = 960;
  const sample0 = demo.eval(X_MIN, pi);
  const nv = sample0.length;
  const ys = Array.from({ length: nv }, () => new Float32Array(SAMPLES));
  for (let i = 0; i < SAMPLES; i++) {
    const x = X_MIN + (i / (SAMPLES - 1)) * (X_MAX - X_MIN);
    const vals = demo.eval(x, pi);
    for (let v = 0; v < nv; v++) {
      ys[v][i] = Number.isFinite(vals[v]) ? vals[v] : NaN;
    }
  }
  curveCacheKey = key;
  curveCache = { SAMPLES, nv, ys };
  return curveCache;
}

function draw() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  // Fallback clock when audio hasn't been unlocked yet
  if ((!audioOn || audioCtx.state !== "running") && playing && !scrubbing) {
    const demo = DEMOS[demoIdx];
    curX += demo.speed * dt;
    if (curX >= X_MAX) {
      curX = X_MIN;
      if (autoParts) {
        if (partIdx + 1 < demo.parts.length) {
          partIdx++;
        } else {
          demoIdx = (demoIdx + 1) % DEMOS.length;
          partIdx = 0;
          vEnv.fill(0);
          clearReverb();
        }
        needChromeUpdate = true;
      }
    }
  }
  if (needChromeUpdate) updateChrome();

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = window.innerWidth, H = window.innerHeight;
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#050609";
  ctx.fillRect(0, 0, W, H);

  const box = getPlotRect(W, H);
  const toX = (x) => box.x + ((x - X_MIN) / (X_MAX - X_MIN)) * box.w;
  const toY = (y) => box.y + box.h - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * box.h;

  // Subtle HAL square musical scale grid (1-unit x beats + diatonic musical scale degrees per octave)
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(127, 212, 204, 0.032)";
  ctx.beginPath();
  for (let gx = -7; gx <= 7; gx += 2) {
    const px = toX(gx);
    ctx.moveTo(px, box.y); ctx.lineTo(px, box.y + box.h);
  }
  const SCALE_SEMI = [2, 4, 5, 7, 9, 11]; // D, E, F, G, A, B diatonic scale lines inside each octave
  for (let oct = -3; oct <= 2; oct++) {
    for (let k = 0; k < SCALE_SEMI.length; k++) {
      const py = toY(oct + SCALE_SEMI[k] / 12);
      if (py >= box.y && py <= box.y + box.h) {
        ctx.moveTo(box.x, py); ctx.lineTo(box.x + box.w, py);
      }
    }
  }
  ctx.stroke();

  // Primary octave & 2-beat square grid
  ctx.strokeStyle = "rgba(127, 212, 204, 0.085)";
  ctx.beginPath();
  for (let gx = -8; gx <= 8; gx += 2) {
    const px = toX(gx);
    ctx.moveTo(px, box.y); ctx.lineTo(px, box.y + box.h);
  }
  for (let gy = -3; gy <= 3; gy += 1) {
    const py = toY(gy);
    ctx.moveTo(box.x, py); ctx.lineTo(box.x + box.w, py);
  }
  ctx.stroke();

  // Cartesian axes x & y
  const axY = toY(0), axX = toX(0);
  ctx.strokeStyle = "rgba(230, 225, 214, 0.34)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(box.x, axY); ctx.lineTo(box.x + box.w, axY);
  ctx.moveTo(axX, box.y); ctx.lineTo(axX, box.y + box.h);
  ctx.stroke();

  // Axis ticks & octave labels
  ctx.fillStyle = "rgba(230, 225, 214, 0.36)";
  ctx.font = '10px "IBM Plex Mono", monospace';
  ctx.textAlign = "center";
  for (let gx = -8; gx <= 8; gx += 2) {
    if (gx === 0) continue;
    const px = toX(gx);
    ctx.beginPath(); ctx.moveTo(px, axY - 3); ctx.lineTo(px, axY + 3); ctx.stroke();
    ctx.fillText(String(gx), px, axY + 14);
  }
  ctx.textAlign = "right";
  for (let gy = -2; gy <= 2; gy += 1) {
    if (gy === 0) continue;
    const py = toY(gy);
    ctx.beginPath(); ctx.moveTo(axX - 3, py); ctx.lineTo(axX + 3, py); ctx.stroke();
    ctx.fillText(`${gy > 0 ? "+" : ""}${gy}`, axX - 7, py + 3);
  }
  // Concert Pitch ISO 16 reference labels on right margin (C2..C6 + A4 = 440 Hz hairline)
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(127, 212, 204, 0.36)";
  ctx.font = '9.5px "IBM Plex Mono", monospace';
  const refNotes = [
    [2, "C6 · 1047"], [1 + 7/12, "G5"], [1 + 4/12, "E5"], [1, "C5 · 523"],
    [7/12, "G4"], [4/12, "E4"], [0, "C4 · 262"],
    [-1 + 9/12, "A3"], [-1 + 7/12, "G3"], [-1, "C3 · 131"],
    [-2 + 9/12, "A2"], [-2, "C2 · 65"],
  ];
  for (let i = 0; i < refNotes.length; i++) {
    const py = toY(refNotes[i][0]);
    const isC = refNotes[i][1].includes("·");
    ctx.fillStyle = isC ? "rgba(127, 212, 204, 0.42)" : "rgba(127, 212, 204, 0.22)";
    ctx.fillText(refNotes[i][1], box.x + box.w - 4, py - 2);
  }
  const pyA4 = toY(log2(440 / F0));
  ctx.strokeStyle = "rgba(232, 164, 84, 0.14)";
  ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.moveTo(box.x, pyA4); ctx.lineTo(box.x + box.w, pyA4); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(232, 164, 84, 0.42)";
  ctx.fillText("A4 · 440", box.x + box.w - 4, pyA4 - 3);

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(232, 164, 84, 0.55)";
  ctx.fillText("x", box.x + box.w - 10, axY - 8);
  ctx.fillText("y (oct)", axX + 8, box.y + 12);

  // Plot all voices up to current playhead curX (with subtle ghost preview ahead + per-voice or global shifted echo trails)
  const demo = DEMOS[demoIdx];
  const partObj = demo.parts[partIdx];
  const cache = ensureCurveCache(demo, partIdx);
  const { SAMPLES, nv, ys } = cache;
  const headIdx = clamp(Math.floor(((curX - X_MIN) / (X_MAX - X_MIN)) * (SAMPLES - 1)), 0, SAMPLES - 1);
  const globalEchoDraw = partObj.echo !== undefined ? partObj.echo : (demo.echo || null);
  const partEchoesDraw = partObj.echoes || null;

  for (let v = 0; v < nv; v++) {
    const col = V_COLS[v % V_COLS.length];
    const arr = ys[v];
    const vEco = (partEchoesDraw ? partEchoesDraw[v] : null) || globalEchoDraw;

    // Shifted ghost echo trails (k = 1..4 repeats at exact +k * speed * vEco.sec for this voice)
    if (vEco && vEco.wet > 0) {
      const echoStepIdx = Math.max(1, Math.round((demo.speed * vEco.sec / (X_MAX - X_MIN)) * (SAMPLES - 1)));
      ctx.strokeStyle = col;
      ctx.setLineDash([4, 3]);
      for (let k = 1; k <= 4; k++) {
        const sh = k * echoStepIdx;
        if (sh >= SAMPLES) break;
        const aTraced = clamp(vEco.wet * Math.pow(vEco.fb, k - 1) * 1.10, 0.06, 0.52);
        ctx.lineWidth = Math.max(0.75, 1.35 - 0.16 * k);

        // Faint echo preview ahead of playhead
        ctx.globalAlpha = aTraced * 0.28;
        ctx.beginPath();
        let pen = false, prevY = 0;
        for (let i = Math.max(sh, headIdx); i < SAMPLES; i++) {
          const y = arr[i - sh];
          if (!Number.isFinite(y) || y < Y_MIN - 0.5 || y > Y_MAX + 0.5) { pen = false; continue; }
          const px = box.x + (i / (SAMPLES - 1)) * box.w;
          const py = toY(y);
          if (!pen || abs(y - prevY) > 0.55) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
          pen = true; prevY = y;
        }
        ctx.stroke();

        // Active echo trail behind playhead
        if (headIdx >= sh) {
          ctx.globalAlpha = aTraced;
          ctx.beginPath();
          pen = false; prevY = 0;
          for (let i = sh; i <= headIdx; i++) {
            const y = arr[i - sh];
            if (!Number.isFinite(y) || y < Y_MIN - 0.5 || y > Y_MAX + 0.5) { pen = false; continue; }
            const px = box.x + (i / (SAMPLES - 1)) * box.w;
            const py = toY(y);
            if (!pen || abs(y - prevY) > 0.55) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
            pen = true; prevY = y;
          }
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
    }

    // Faint ghost curve ahead of playhead
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.14;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    let pen = false, prevY = 0;
    for (let i = headIdx; i < SAMPLES; i++) {
      const y = arr[i];
      if (!Number.isFinite(y) || y < Y_MIN - 0.5 || y > Y_MAX + 0.5) { pen = false; continue; }
      const px = box.x + (i / (SAMPLES - 1)) * box.w;
      const py = toY(y);
      if (!pen || abs(y - prevY) > 0.55) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
      pen = true; prevY = y;
    }
    ctx.stroke();

    // Active traced curve behind playhead
    ctx.globalAlpha = 0.92;
    ctx.lineWidth = nv > 5 ? 1.35 : 1.75;
    ctx.beginPath();
    pen = false; prevY = 0;
    for (let i = 0; i <= headIdx; i++) {
      const y = arr[i];
      if (!Number.isFinite(y) || y < Y_MIN - 0.5 || y > Y_MAX + 0.5) { pen = false; continue; }
      const px = box.x + (i / (SAMPLES - 1)) * box.w;
      const py = toY(y);
      if (!pen || abs(y - prevY) > 0.55) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
      pen = true; prevY = y;
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Vertical HAL playhead scanner line
  const hx = toX(curX);
  ctx.strokeStyle = "rgba(217, 56, 41, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hx, box.y); ctx.lineTo(hx, box.y + box.h);
  ctx.stroke();

  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  function midiLabel(y) {
    const n = Math.round(60 + 12 * y);
    return NOTE_NAMES[mod(n, 12)] + String(Math.floor(n / 12) - 1);
  }

  // Glowing playhead markers for active voices + MIDI note + df/dt pitch-bend arrow (ALL 24 demos)
  const curVals = demo.eval(curX, partIdx);
  const nextVals = demo.eval(clamp(curX + 0.04, X_MIN, X_MAX), partIdx);
  const pModes = demo.parts[partIdx].modes || null;
  function modeForVoice(v, yVal) {
    if (pModes) return pModes[v] || "sine";
    let yRef = yVal;
    if (!Number.isFinite(yRef)) {
      const arr = ys[v];
      for (let i = 0; i < SAMPLES; i += 8) {
        if (Number.isFinite(arr[i])) { yRef = arr[i]; break; }
      }
    }
    if (!Number.isFinite(yRef)) return "sat";
    const fRef = F0 * Math.pow(2, yRef);
    return fRef < 115 ? "sine" : (fRef > 950 ? "fm" : "sat");
  }

  let activeHz = [];
  for (let v = 0; v < curVals.length; v++) {
    const y = curVals[v];
    if (!Number.isFinite(y) || y < Y_MIN - 0.5 || y > Y_MAX + 0.5) continue;
    const py = toY(y);
    const col = V_COLS[v % V_COLS.length];
    const dy = Number.isFinite(nextVals[v]) ? nextVals[v] - y : 0;
    const slopeArrow = dy > 0.035 ? " ↗" : (dy < -0.035 ? " ↘" : "");
    // Clean HAL 9000 glowing circle emitters on the moving playhead (DSP shapes live in the HUD legend)
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.28;
    ctx.beginPath(); ctx.arc(hx, py, 8.5, 0, PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(hx, py, 3.2, 0, PI * 2); ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(hx, py, 4.5, 0, PI * 2); ctx.stroke();
    ctx.font = '9px "IBM Plex Mono", monospace';
    const flipR = hx > box.x + box.w - 58;
    ctx.textAlign = flipR ? "right" : "left";
    ctx.fillStyle = col;
    ctx.fillText(`${midiLabel(y)}${slopeArrow}`, hx + (flipR ? -8 : 8), py + 3);
    activeHz.push(F0 * Math.pow(2, y));
  }

  // Integrated Bottom Panel DSP Channel Legend & Broadcast Metering (no overlap over C7 octave)
  if (elDspVoices) {
    const chipsKey = `${demo.id}:${partIdx}:${nv}`;
    if (chipsKey !== dspChipsKey) {
      dspChipsKey = chipsKey;
      if (elDspTitle) {
        elDspTitle.textContent = demo.bsound ? "B-SOUND DSP" : "DSP VOICES";
        elDspTitle.classList.toggle("bsound", !!demo.bsound);
      }
      elDspVoices.innerHTML = "";
      dspChipEls = [];
      for (let v = 0; v < nv; v++) {
        const tag = modeForVoice(v, curVals[v]);
        const lbl = tag === "noise" ? "NSE" : tag.toUpperCase();
        const col = V_COLS[v % V_COLS.length];
        const chip = document.createElement("span");
        chip.className = "f-vchip";
        chip.innerHTML = `${dspMarkerSvg(tag, col)}<span>${lbl}</span>`;
        elDspVoices.appendChild(chip);
        dspChipEls.push(chip);
      }
      // HUD Echo Pill: shows per-voice custom echo times or global echo settings
      const echoTags = [];
      if (partEchoesDraw) {
        for (let v = 0; v < nv; v++) {
          const ve = partEchoesDraw[v];
          if (ve && ve.wet > 0) echoTags.push(`V${v + 1}:${Math.round(ve.sec * 1000)}MS`);
        }
      } else if (globalEchoDraw && globalEchoDraw.wet > 0) {
        echoTags.push(`${Math.round(globalEchoDraw.sec * 1000)}MS · FB ${Math.round(globalEchoDraw.fb * 100)}%`);
      }
      if (echoTags.length) {
        const echoChip = document.createElement("span");
        echoChip.className = "f-vchip live";
        echoChip.style.borderColor = "rgba(127,212,204,0.45)";
        echoChip.style.color = "var(--cyan)";
        echoChip.innerHTML = `${dspMarkerSvg("rvb", "#7fd4cc")}<span>ECHO ${echoTags.join(" · ")}</span>`;
        elDspVoices.appendChild(echoChip);
      }
    }
    for (let v = 0; v < dspChipEls.length; v++) {
      const isLive = Number.isFinite(curVals[v]) && curVals[v] >= Y_MIN - 0.5 && curVals[v] <= Y_MAX + 0.5;
      dspChipEls[v].classList.toggle("live", isLive);
    }
  }

  if (elMBarL) {
    const pk = Math.max(meterPeakL, meterPeakR);
    const rms = Math.sqrt(0.5 * (meterRmsL * meterRmsL + meterRmsR * meterRmsR));
    const pkDb = pk > 1e-4 ? Math.max(-60, 20 * Math.log10(pk)) : -60;
    const rmsDb = rms > 1e-4 ? Math.max(-60, 20 * Math.log10(rms)) : -60;
    const fL = clamp((20 * Math.log10(Math.max(1e-4, meterPeakL)) + 48) / 48, 0, 1);
    const fR = clamp((20 * Math.log10(Math.max(1e-4, meterPeakR)) + 48) / 48, 0, 1);
    elMBarL.style.width = `${(fL * 100).toFixed(1)}%`;
    elMBarR.style.width = `${(fR * 100).toFixed(1)}%`;
    elMBarL.classList.toggle("hot", fL > 0.85);
    elMBarR.classList.toggle("hot", fR > 0.85);
    elMPk.textContent = pk > 1e-4 ? pkDb.toFixed(1) : "-∞";
    elMRms.textContent = rms > 1e-4 ? rmsDb.toFixed(1) : "-∞";
    elMLim.classList.toggle("hit", meterLimHit > 0.15);
    elMBal.style.left = `${(50 + clamp(meterBal, -1, 1) * 45).toFixed(1)}%`;
  }

  // Update hairline progress bar & live telemetry
  const prog = ((curX - X_MIN) / (X_MAX - X_MIN)) * 100;
  elProg.style.width = `${clamp(prog, 0, 100).toFixed(2)}%`;
  const hzStr = activeHz.length
    ? `${activeHz[0].toFixed(1)} HZ` + (activeHz.length > 1 ? ` (+${activeHz.length - 1})` : "")
    : "REST";
  elFTelem.textContent = `X = ${curX >= 0 ? "+" : ""}${curX.toFixed(2)}  ·  ${hzStr}`;

  requestAnimationFrame(draw);
}

// ============================================================================
// MINIMAL CURSOR & KEYBOARD CONTROLS (HAL 9000 Style)
// ============================================================================
function xFromClient(clientX) {
  const box = getPlotRect(window.innerWidth, window.innerHeight);
  return clamp(X_MIN + ((clientX - box.x) / box.w) * (X_MAX - X_MIN), X_MIN, X_MAX);
}

canvas.addEventListener("pointerdown", (e) => {
  ensureAudio();
  scrubbing = true;
  curX = xFromClient(e.clientX);
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (scrubbing) curX = xFromClient(e.clientX);
});
canvas.addEventListener("pointerup", () => { scrubbing = false; });
canvas.addEventListener("pointercancel", () => { scrubbing = false; });

document.getElementById("nav-prev").addEventListener("click", (e) => {
  e.stopPropagation(); ensureAudio(); selectDemo(demoIdx - 1, 0);
});
document.getElementById("nav-next").addEventListener("click", (e) => {
  e.stopPropagation(); ensureAudio(); selectDemo(demoIdx + 1, 0);
});
elAudio.addEventListener("click", (e) => {
  e.stopPropagation();
  if (!audioOn) { ensureAudio(); playing = true; }
  else { muted = !muted; }
  updateAudioUI();
});
if (elBSound) {
  elBSound.addEventListener("click", (e) => {
    e.stopPropagation();
    ensureAudio();
    const firstBSound = DEMOS.findIndex((d) => d.bsound);
    if (firstBSound >= 0) {
      if (demoIdx < firstBSound) selectDemo(firstBSound, 0);
      else selectDemo(demoIdx + 1 < DEMOS.length ? demoIdx + 1 : firstBSound, 0);
    }
  });
}
document.getElementById("btn-idx").addEventListener("click", (e) => {
  e.stopPropagation();
  elLegend.classList.remove("open");
  elIndex.classList.toggle("open");
});
document.getElementById("btn-help").addEventListener("click", (e) => {
  e.stopPropagation();
  elIndex.classList.remove("open");
  elLegend.classList.toggle("open");
});
elLegend.addEventListener("click", () => elLegend.classList.remove("open"));
elIndex.addEventListener("click", (e) => { if (e.target === elIndex) elIndex.classList.remove("open"); });

let wheelLock = 0;
window.addEventListener("wheel", (e) => {
  if (elIndex.classList.contains("open")) return;
  const now = performance.now();
  if (now - wheelLock < 240) return;
  if (Math.abs(e.deltaY) < 12 && Math.abs(e.deltaX) < 12) return;
  wheelLock = now;
  const dir = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) > 0 ? 1 : -1;
  if (e.shiftKey) selectPart(partIdx + dir);
  else selectDemo(demoIdx + dir, 0);
}, { passive: true });

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") { ensureAudio(); selectDemo(demoIdx + 1, 0); e.preventDefault(); }
  else if (e.key === "ArrowLeft") { ensureAudio(); selectDemo(demoIdx - 1, 0); e.preventDefault(); }
  else if (e.key === "ArrowUp") { ensureAudio(); selectPart(partIdx - 1); e.preventDefault(); }
  else if (e.key === "ArrowDown") { ensureAudio(); selectPart(partIdx + 1); e.preventDefault(); }
  else if (e.key === " ") {
    e.preventDefault();
    if (!audioOn) { ensureAudio(); playing = true; }
    else { playing = !playing; }
    updateAudioUI();
  }
  else if (e.key === "m" || e.key === "M") { ensureAudio(); muted = !muted; updateAudioUI(); }
  else if (e.key === "b" || e.key === "B") {
    ensureAudio();
    const firstBSound = DEMOS.findIndex((d) => d.bsound);
    if (firstBSound >= 0) {
      if (demoIdx < firstBSound) selectDemo(firstBSound, 0);
      else selectDemo(demoIdx + 1 < DEMOS.length ? demoIdx + 1 : firstBSound, 0);
    }
  }
  else if (e.key === "a" || e.key === "A") { autoParts = !autoParts; needChromeUpdate = true; }
  else if (e.key === "i" || e.key === "I" || e.key === "Tab") {
    e.preventDefault(); elLegend.classList.remove("open"); elIndex.classList.toggle("open");
  }
  else if (e.key === "?" || e.key === "h" || e.key === "H") {
    elIndex.classList.remove("open"); elLegend.classList.toggle("open");
  }
  else if (e.key === "Escape") {
    elIndex.classList.remove("open"); elLegend.classList.remove("open");
  }
  else if (e.key >= "1" && e.key <= "8") {
    const p = parseInt(e.key, 10) - 1;
    if (p < DEMOS[demoIdx].parts.length) { ensureAudio(); selectPart(p); }
  }
});

if (window.location.hash === "#bsound") {
  const firstBSound = DEMOS.findIndex((d) => d.bsound);
  if (firstBSound >= 0) demoIdx = firstBSound;
}
buildIndex();
updateChrome();
requestAnimationFrame(draw);
