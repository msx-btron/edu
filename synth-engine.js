"use strict";

// ============================================================================
// HAL 9000 // 2D ANALYTICAL FUNCTION SYNTHESIZER
// 16 Digitized Multi-Part Demos from ./math-synth/*.mov
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

  // 16 — V19: Analytical Etudes (4 parts)
  {
    id: "16", name: "ANALYTICAL ETUDES", src: "10.30.19", speed: 1.75,
    parts: [
      { m: 1, f: "y = 2.8 · sin(5 · sin(4 · sin(3 · sin(2 · sin(x)))))" },
      { m: 2, f: "y = { 1.73·⌊1.5(x mod 2)⌋ − 2.3(x mod 2)   if x mod 16 < 2\n    { 0.6 − 2(x mod 2)   otherwise" },
      { m: 3, f: "y = { 3(1 − 2⌊2(6x mod 1)⌋)   if x mod 2 < 0.5\n    { −1.2   if x mod 2 < 1.2\n    { 2.2 − 2(2x − ⌊2x + ½⌋)   otherwise" },
      { m: 4, f: "y = 3·(⌊(x mod 1) / (0.15 + 0.25(⌊x⌋ mod 3))⌋ mod 2) − 1.5" },
    ],
    eval(x, pi) {
      const m = this.parts[pi].m;
      if (m === 1) return [2.8 * sin(5 * sin(4 * sin(3 * sin(2 * sin(x)))))];
      if (m === 2) {
        const m2 = mod(x, 2);
        return [mod(x, 16) < 2 ? 1.73 * fl(1.5 * m2) - 2.3 * m2 : 0.6 - 2 * m2];
      }
      if (m === 3) {
        const m2 = mod(x, 2);
        if (m2 < 0.5) return [clamp(3 * (1 - 2 * fl(2 * mod(6 * x, 1))), -2.8, 2.8)];
        if (m2 < 1.2) return [-1.2];
        return [2.2 - 2 * (2 * x - fl(2 * x + 0.5))];
      }
      const den = 0.15 + 0.25 * mod(fl(x), 3);
      return [3 * mod(fl(mod(x, 1) / den), 2) - 1.5];
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
const vEnv = new Float64Array(MAX_VOICES);
const vFreq = new Float64Array(MAX_VOICES);
let lpL = 0, lpR = 0;

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
    const demo = DEMOS[demoIdx];
    const dt = 1 / sr;
    const dx = (playing && !scrubbing) ? demo.speed * dt : 0;

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
          vFreq[v] = F0 * Math.pow(2, y);
        }
        if (vEnv[v] > 1e-4) {
          const f = vFreq[v];
          vPhase[v] += 2 * PI * f * dt;
          if (vPhase[v] > 2 * PI) vPhase[v] -= 2 * PI * Math.floor(vPhase[v] / (2 * PI));
          // Exact warm odd-harmonic timbre matching original math-synth FFT (1f, 3f, 5f):
          // Cleaner sine for deep sub/kick (<120Hz), warm soft-square tanh(2.1 sin) for melodic,
          // crisp metallic shimmer for high hats/claps (>950Hz)
          let wave;
          const s1 = Math.sin(vPhase[v]);
          if (f < 115) {
            wave = Math.tanh(1.35 * s1);
          } else if (f > 950) {
            wave = Math.tanh(2.5 * s1) * 0.72 + Math.sin(vPhase[v] * 2.73) * 0.28;
          } else {
            wave = Math.tanh(2.15 * s1);
          }
          const sample = wave * vEnv[v] * norm;
          // Subtle stereo spread across voices
          const pan = nv > 1 ? ((v / (nv - 1)) - 0.5) * 0.45 : 0;
          sL += sample * (0.5 - pan);
          sR += sample * (0.5 + pan);
        }
      }

      // Gentle 1-pole analog warmth filter + soft master limiter
      lpL += (sL - lpL) * lpAlpha;
      lpR += (sR - lpR) * lpAlpha;
      outL[i] = Math.tanh(lpL * 1.15) * 0.42;
      outR[i] = Math.tanh(lpR * 1.15) * 0.42;

      if (dx > 0) {
        curX += dx;
        if (curX >= X_MAX) {
          curX = X_MIN;
          if (autoParts) {
            if (partIdx + 1 < demo.parts.length) {
              partIdx++;
            } else {
              partIdx = 0;
            }
            needChromeUpdate = true;
          }
        }
      }
    }
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
const elFPart = document.getElementById("f-part");
const elFTelem = document.getElementById("f-telem");
const elFBody = document.getElementById("f-body");
const elProg = document.getElementById("prog");
const elLegend = document.getElementById("legend");
const elIndex = document.getElementById("index");

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
  elMeta.textContent = `DEMO ${d.id}/${String(DEMOS.length).padStart(2, "0")} · PART ${partIdx + 1}/${d.parts.length} · F(Y) = 261.63 · 2^Y HZ`;
  elFPart.textContent = `PART ${partIdx + 1}/${d.parts.length}  ·  ${d.name}` + (autoParts ? "  [AUTO]" : "  [LOOP]");
  elFBody.textContent = p.f;
  document.querySelectorAll(".idx-item").forEach((b, i) => b.classList.toggle("on", i === demoIdx));
  updateAudioUI();
  needChromeUpdate = false;
}

function selectDemo(i, p = 0) {
  demoIdx = ((i % DEMOS.length) + DEMOS.length) % DEMOS.length;
  partIdx = clamp(p, 0, DEMOS[demoIdx].parts.length - 1);
  curX = X_MIN;
  vEnv.fill(0);
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
  const h = document.createElement("h2");
  h.textContent = "HAL 9000 // DIGITIZED MATH-SYNTH CATALOGUE (16 DEMOS)";
  const grid = document.createElement("div");
  grid.className = "idx-grid";
  DEMOS.forEach((d, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "idx-item";
    b.innerHTML = `<div class="num">${d.id} · SRC ${d.src}</div><div class="ttl">${d.name}</div><div class="pts">${d.parts.length} PARTS</div>`;
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      selectDemo(i, 0);
      elIndex.classList.remove("open");
      ensureAudio();
    });
    grid.append(b);
  });
  elIndex.append(h, grid);
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
        partIdx = (partIdx + 1) % demo.parts.length;
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

  // Subtle HAL grid (octaves horizontally, beats vertically)
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(127, 212, 204, 0.065)";
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
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(232, 164, 84, 0.55)";
  ctx.fillText("x", box.x + box.w - 10, axY - 8);
  ctx.fillText("y (oct)", axX + 8, box.y + 12);

  // Plot all voices up to current playhead curX (with subtle ghost preview ahead)
  const demo = DEMOS[demoIdx];
  const cache = ensureCurveCache(demo, partIdx);
  const { SAMPLES, nv, ys } = cache;
  const headIdx = clamp(Math.floor(((curX - X_MIN) / (X_MAX - X_MIN)) * (SAMPLES - 1)), 0, SAMPLES - 1);

  for (let v = 0; v < nv; v++) {
    const col = V_COLS[v % V_COLS.length];
    const arr = ys[v];

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

  // Glowing playhead dots for active voices + live frequency telemetry
  const curVals = demo.eval(curX, partIdx);
  let activeHz = [];
  for (let v = 0; v < curVals.length; v++) {
    const y = curVals[v];
    if (!Number.isFinite(y) || y < Y_MIN - 0.5 || y > Y_MAX + 0.5) continue;
    const py = toY(y);
    const col = V_COLS[v % V_COLS.length];
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.28;
    ctx.beginPath(); ctx.arc(hx, py, 8.5, 0, PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(hx, py, 3.2, 0, PI * 2); ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(hx, py, 4.5, 0, PI * 2); ctx.stroke();
    activeHz.push(F0 * Math.pow(2, y));
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

buildIndex();
updateChrome();
requestAnimationFrame(draw);
