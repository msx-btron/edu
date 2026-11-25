"use strict";
const COL = {
  paper: [0.902, 0.882, 0.839, 0.92],
  dim: [0.902, 0.882, 0.839, 0.28],
  grid: [0.55, 0.62, 0.66, 0.18],
  amber: [0.886, 0.631, 0.353, 0.95],
  cyan: [0.561, 0.816, 0.784, 0.95],
  cyanDim: [0.561, 0.816, 0.784, 0.34],
  hot: [0.824, 0.357, 0.298, 0.95],
  hotDim: [0.824, 0.357, 0.298, 0.4],
};
const DWELL = 13;
const RAW = {
  A:["01110","10001","10001","11111","10001","10001","10001"],
  B:["11110","10001","10001","11110","10001","10001","11110"],
  C:["01111","10000","10000","10000","10000","10000","01111"],
  D:["11110","10001","10001","10001","10001","10001","11110"],
  E:["11111","10000","10000","11110","10000","10000","11111"],
  F:["11111","10000","10000","11110","10000","10000","10000"],
  G:["01111","10000","10000","10011","10001","10001","01111"],
  H:["10001","10001","10001","11111","10001","10001","10001"],
  I:["11111","00100","00100","00100","00100","00100","11111"],
  J:["00111","00010","00010","00010","10010","10010","01100"],
  K:["10001","10010","10100","11000","10100","10010","10001"],
  L:["10000","10000","10000","10000","10000","10000","11111"],
  M:["10001","11011","10101","10101","10001","10001","10001"],
  N:["10001","11001","10101","10011","10001","10001","10001"],
  O:["01110","10001","10001","10001","10001","10001","01110"],
  P:["11110","10001","10001","11110","10000","10000","10000"],
  Q:["01110","10001","10001","10001","10101","10010","01101"],
  R:["11110","10001","10001","11110","10100","10010","10001"],
  S:["01111","10000","10000","01110","00001","00001","11110"],
  T:["11111","00100","00100","00100","00100","00100","00100"],
  U:["10001","10001","10001","10001","10001","10001","01110"],
  V:["10001","10001","10001","10001","10001","01010","00100"],
  W:["10001","10001","10001","10101","10101","10101","01010"],
  X:["10001","10001","01010","00100","01010","10001","10001"],
  Y:["10001","10001","01010","00100","00100","00100","00100"],
  Z:["11111","00001","00010","00100","01000","10000","11111"],
  "0":["01110","10001","10011","10101","11001","10001","01110"],
  "1":["00100","01100","00100","00100","00100","00100","01110"],
  "2":["01110","10001","00001","00010","00100","01000","11111"],
  "3":["11110","00001","00001","01110","00001","00001","11110"],
  "4":["00010","00110","01010","10010","11111","00010","00010"],
  "5":["11111","10000","10000","11110","00001","00001","11110"],
  "6":["01110","10000","10000","11110","10001","10001","01110"],
  "7":["11111","00001","00010","00100","01000","01000","01000"],
  "8":["01110","10001","10001","01110","10001","10001","01110"],
  "9":["01110","10001","10001","01111","00001","00001","01110"],
  ".":["00000","00000","00000","00000","00000","01100","01100"],
  ":":["00000","01100","01100","00000","01100","01100","00000"],
  "+":["00000","00100","00100","11111","00100","00100","00000"],
  "-":["00000","00000","00000","11111","00000","00000","00000"],
  "/":["00001","00010","00010","00100","01000","01000","10000"],
  "=":["00000","00000","11111","00000","11111","00000","00000"],
};
const GLYPH = {};
for (const k in RAW) GLYPH[k] = RAW[k].map((row) => parseInt(row, 2));

const canvas = document.getElementById("c");
const gl = canvas.getContext("webgl", {
  alpha: false, antialias: true, premultipliedAlpha: false, powerPreference: "low-power",
}) || canvas.getContext("experimental-webgl");
const ctx2 = gl ? null : canvas.getContext("2d");
let cssH = 800;

let CLIP = null;
function clipLine(x0, y0, x1, y1, b) {
  const LEFT = 1, RIGHT = 2, BOTTOM = 4, TOP = 8;
  const code = (x, y) => (x < b.left ? LEFT : 0) | (x > b.right ? RIGHT : 0) | (y < b.bot ? BOTTOM : 0) | (y > b.top ? TOP : 0);
  let c0 = code(x0, y0), c1 = code(x1, y1);
  for (let i = 0; i < 8; i++) {
    if (!(c0 | c1)) return [x0, y0, x1, y1];
    if (c0 & c1) return null;
    const c = c0 || c1;
    let x, y;
    if (c & TOP) { x = x0 + ((x1 - x0) * (b.top - y0)) / ((y1 - y0) || 1e-8); y = b.top; }
    else if (c & BOTTOM) { x = x0 + ((x1 - x0) * (b.bot - y0)) / ((y1 - y0) || 1e-8); y = b.bot; }
    else if (c & RIGHT) { y = y0 + ((y1 - y0) * (b.right - x0)) / ((x1 - x0) || 1e-8); x = b.right; }
    else { y = y0 + ((y1 - y0) * (b.left - x0)) / ((x1 - x0) || 1e-8); x = b.left; }
    if (c === c0) { x0 = x; y0 = y; c0 = code(x0, y0); }
    else { x1 = x; y1 = y; c1 = code(x1, y1); }
  }
  return [x0, y0, x1, y1];
}

const VS = "attribute vec2 a_pos;attribute vec4 a_col;uniform float u_aspect;varying vec4 v_col;void main(){gl_Position=vec4(a_pos.x/u_aspect,a_pos.y,0.0,1.0);v_col=a_col;}";
const FS = "precision mediump float;varying vec4 v_col;void main(){gl_FragColor=v_col;}";
let prog = null, locAspect = null, bufGL = null;
const MAXV = 70000;
const fbuf = new Float32Array(MAXV * 6);
let nv = 0;
const segs = [];
const fills = [];

function sh(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
  return s;
}
if (gl) {
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(prog, 0, "a_pos");
    gl.bindAttribLocation(prog, 1, "a_col");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "link");
    locAspect = gl.getUniformLocation(prog, "u_aspect");
    bufGL = gl.createBuffer();
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
  } catch (err) {
    const boot = document.getElementById("boot");
    boot.hidden = false;
    boot.textContent = "VECTOR DISPLAY FAILED — " + err.message;
    console.error(err);
  }
}
function vert(x, y, col) {
  if (nv >= MAXV) return;
  const o = nv * 6;
  const a = col[3] == null ? 1 : col[3];
  fbuf[o] = x; fbuf[o + 1] = y;
  fbuf[o + 2] = col[0] * a; fbuf[o + 3] = col[1] * a; fbuf[o + 4] = col[2] * a; fbuf[o + 5] = a;
  nv++;
}
function pushQuad(x0, y0, x1, y1, x2, y2, x3, y3, col) {
  vert(x0, y0, col); vert(x1, y1, col); vert(x2, y2, col);
  vert(x0, y0, col); vert(x2, y2, col); vert(x3, y3, col);
}
const G = {
  line(x0, y0, x1, y1, col, widthPx) {
    if (CLIP) {
      const c = clipLine(x0, y0, x1, y1, CLIP);
      if (!c) return;
      x0 = c[0]; y0 = c[1]; x1 = c[2]; y1 = c[3];
    }
    const wpx = widthPx || 1.25;
    if (!gl || !prog) {
      segs.push(x0, y0, x1, y1, col[0], col[1], col[2], col[3] == null ? 1 : col[3], wpx);
      return;
    }
    const hw = wpx / Math.max(1, cssH);
    let dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return;
    dx /= len; dy /= len;
    const px = -dy * hw, py = dx * hw, ex = dx * hw, ey = dy * hw;
    const ax = x0 - ex, ay = y0 - ey, bx = x1 + ex, by = y1 + ey;
    pushQuad(ax + px, ay + py, ax - px, ay - py, bx - px, by - py, bx + px, by + py, col);
  },
  fill(x, y, w, h, col) {
    if (!w || !h) return;
    if (CLIP && (x > CLIP.right || y > CLIP.top || x + w < CLIP.left || y + h < CLIP.bot)) return;
    if (!gl || !prog) { fills.push(x, y, w, h, col[0], col[1], col[2], col[3] == null ? 1 : col[3]); return; }
    pushQuad(x, y, x + w, y, x + w, y + h, x, y + h, col);
  },
  circle(cx, cy, r, col, w, n) {
    const N = n || 40;
    let px = cx + r, py = cy;
    for (let i = 1; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      this.line(px, py, x, y, col, w || 1.2);
      px = x; py = y;
    }
  },
  poly(pts, col, w) {
    for (let i = 1; i < pts.length; i++) this.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], col, w || 1.25);
  },
  text(str, x, yTop, h, col) {
    const s = h / 7;
    let cx = x;
    const up = String(str).toUpperCase();
    for (let i = 0; i < up.length; i++) {
      const ch = up[i];
      if (ch === " ") { cx += s * 4; continue; }
      const g = GLYPH[ch];
      if (!g) { cx += s * 4; continue; }
      for (let row = 0; row < 7; row++) {
        const bits = g[row];
        for (let colb = 0; colb < 5; colb++) {
          if (bits & (1 << (4 - colb))) this.fill(cx + colb * s, yTop - (row + 1) * s, s * 0.86, s * 0.86, col);
        }
      }
      cx += s * 6;
    }
  },
};

function viewOf(box) {
  const s = Math.min(box.right - box.left, box.top - box.bot) * 0.5;
  const cx = (box.left + box.right) / 2;
  const cy = (box.top + box.bot) / 2;
  const X = (x) => cx + x * s;
  const Y = (y) => cy + y * s;
  return {
    s,
    line(x0, y0, x1, y1, col, w) { G.line(X(x0), Y(y0), X(x1), Y(y1), col, w); },
    circ(x, y, r, col, w, n) { G.circle(X(x), Y(y), r * s, col, w, n); },
    poly(pts, col, w) { G.poly(pts.map((p) => [X(p[0]), Y(p[1])]), col, w); },
    fill(x, y, w, h, col) { G.fill(X(x), Y(y), w * s, h * s, col); },
    text(str, x, y, h, col) { G.text(str, X(x), Y(y), h * s, col); },
    scope(x, y, w, h, values, col, yMin, yMax) {
      this.line(x, y, x + w, y, COL.grid, 1);
      this.line(x, y + h, x + w, y + h, COL.grid, 1);
      this.line(x, y, x, y + h, COL.grid, 1);
      this.line(x + w, y, x + w, y + h, COL.grid, 1);
      if (yMin < 0 && yMax > 0) {
        const z = y + (h * -yMin) / (yMax - yMin);
        this.line(x, z, x + w, z, COL.grid, 1);
      }
      if (!values || values.length < 2) return;
      const span = yMax - yMin || 1;
      for (let i = 1; i < values.length; i++) {
        const x0 = x + (w * (i - 1)) / (values.length - 1);
        const x1 = x + (w * i) / (values.length - 1);
        const a = Math.max(yMin, Math.min(yMax, values[i - 1]));
        const b = Math.max(yMin, Math.min(yMax, values[i]));
        this.line(x0, y + (h * (a - yMin)) / span, x1, y + (h * (b - yMin)) / span, col, 1.35);
      }
    },
  };
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(rand) {
  const u = Math.max(1e-9, rand()), v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
}
function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, (a[3] == null ? 1 : a[3]) + ((b[3] == null ? 1 : b[3]) - (a[3] == null ? 1 : a[3])) * t];
}
function snell(dx, dy, nx, ny, n1, n2) {
  let cosi = -(dx * nx + dy * ny);
  if (cosi < 0) { nx = -nx; ny = -ny; cosi = -cosi; }
  const eta = n1 / n2;
  const sin2t = eta * eta * (1 - cosi * cosi);
  if (sin2t > 1) return null;
  const cost = Math.sqrt(1 - sin2t);
  let ox = eta * dx + (eta * cosi - cost) * nx;
  let oy = eta * dy + (eta * cosi - cost) * ny;
  const m = Math.hypot(ox, oy) || 1;
  return [ox / m, oy / m, Math.acos(Math.min(1, cosi))];
}
function derivPend(th1, w1, th2, w2) {
  const m1 = 1, m2 = 1, L1 = 1, L2 = 1, g = 9.81;
  const d = th1 - th2;
  const den = 2 * m1 + m2 - m2 * Math.cos(2 * d);
  const a1 = (-g * (2 * m1 + m2) * Math.sin(th1) - m2 * g * Math.sin(th1 - 2 * th2) - 2 * Math.sin(d) * m2 * (w2 * w2 * L2 + w1 * w1 * L1 * Math.cos(d))) / (L1 * den);
  const a2 = (2 * Math.sin(d) * ((m1 + m2) * (w1 * w1 * L1 + g * Math.cos(th1)) + w2 * w2 * L2 * m2 * Math.cos(d))) / (L2 * den);
  return [w1, a1, w2, a2];
}
function rk4Pend(s, dt) {
  const add = (s0, k, h) => s0.map((v, i) => v + k[i] * h);
  const a = derivPend.apply(null, s);
  const b = derivPend.apply(null, add(s, a, dt / 2));
  const c = derivPend.apply(null, add(s, b, dt / 2));
  const d = derivPend.apply(null, add(s, c, dt));
  return s.map((v, i) => v + ((a[i] + 2 * b[i] + 2 * c[i] + d[i]) * dt) / 6);
}

function drawPendulum(V, sim, t, dt) {
  if (!sim.ready) {
    sim.bodies = [];
    for (let i = 0; i < 5; i++) sim.bodies.push({ s: [2.05, 0, 2.05 + (i - 2) * 0.0014, 0], trail: [] });
    sim.ready = true;
  }
  const steps = dt > 0 ? Math.max(1, Math.round(dt / 0.001)) : 0;
  const h = steps ? dt / steps : 0;
  const L = 0.3, pivX = 0, pivY = 0.02;
  const bobs = [];
  sim.bodies.forEach((b, i) => {
    for (let k = 0; k < steps; k++) b.s = rk4Pend(b.s, h);
    const th1 = b.s[0], th2 = b.s[2];
    const x1 = pivX + Math.sin(th1) * L, y1 = pivY - Math.cos(th1) * L;
    const x2 = x1 + Math.sin(th2) * L, y2 = y1 - Math.cos(th2) * L;
    b.trail.push([x2, y2]);
    if (b.trail.length > 80) b.trail.shift();
    const col = mix(COL.cyan, COL.amber, i / 4);
    V.line(pivX, pivY, x1, y1, [col[0], col[1], col[2], 0.45], 1.15);
    V.line(x1, y1, x2, y2, col, 1.35);
    for (let k = 1; k < b.trail.length; k++) {
      const a = (k / b.trail.length) * 0.85;
      V.line(b.trail[k - 1][0], b.trail[k - 1][1], b.trail[k][0], b.trail[k][1], [col[0], col[1], col[2], a], 1.1);
    }
    V.circ(x2, y2, 0.016, col, 1.3, 10);
    bobs.push([x2, y2]);
  });
  V.circ(pivX, pivY, 0.018, COL.paper, 1.3, 12);
  let mx = 0, my = 0;
  bobs.forEach((p) => { mx += p[0]; my += p[1]; });
  mx /= bobs.length; my /= bobs.length;
  let acc = 0;
  bobs.forEach((p) => { acc += (p[0] - mx) ** 2 + (p[1] - my) ** 2; });
  return [["T", t.toFixed(2) + " S"], ["SPREAD", (Math.sqrt(acc / bobs.length) / L).toFixed(3) + " M"], ["BODIES", "5"]];
}

function nPrism(lam) { return 1.5 + 0.022 / (lam * lam); }
function tracePrism(incDeg, n, aim) {
  const alpha = 60 * Math.PI / 180, hgt = 1, w = Math.tan(alpha / 2) * hgt;
  const A = [0, hgt], B = [-w, 0], C = [w, 0];
  const inc = (incDeg * Math.PI) / 180;
  const dir = [Math.cos(inc), Math.sin(inc)];
  const target = [B[0] * (1 - aim) + A[0] * aim, B[1] * (1 - aim) + A[1] * aim];
  const p0 = [target[0] - dir[0] * 3, target[1] - dir[1] * 3];
  function segHit(p, d, S, E) {
    const rx = d[0], ry = d[1], sx = E[0] - S[0], sy = E[1] - S[1];
    const den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-9) return null;
    const qpx = S[0] - p[0], qpy = S[1] - p[1];
    const t = (qpx * sy - qpy * sx) / den, u = (qpx * ry - qpy * rx) / den;
    if (t > 1e-4 && u >= 0.04 && u <= 0.96) return { p: [p[0] + t * rx, p[1] + t * ry], S, E };
    return null;
  }
  function outward(S, E) {
    let nx = -(E[1] - S[1]), ny = E[0] - S[0];
    const m = Math.hypot(nx, ny); nx /= m; ny /= m;
    if ((0 - S[0]) * nx + (0.3 - S[1]) * ny > 0) { nx = -nx; ny = -ny; }
    return [nx, ny];
  }
  const h1 = segHit(p0, dir, A, B);
  if (!h1) return null;
  const nrm = outward(A, B);
  const entered = snell(dir[0], dir[1], nrm[0], nrm[1], 1, n);
  if (!entered) return null;
  const pIn = [h1.p[0] + entered[0] * 0.002, h1.p[1] + entered[1] * 0.002];
  const h2 = segHit(pIn, entered, A, C);
  if (!h2) return null;
  const nrm2 = outward(h2.S, h2.E);
  const left = snell(entered[0], entered[1], nrm2[0], nrm2[1], n, 1);
  if (!left) return null;
  return { hit1: h1.p, hit2: h2.p, dirOut: left, inc: entered[2], A, B, C };
}
function waveColor(lam) {
  const t = (lam - 0.45) / 0.2;
  return t < 0.5 ? mix(COL.cyan, COL.paper, t / 0.5) : mix(COL.paper, COL.hot, (t - 0.5) / 0.5);
}
function drawPrism(V) {
  const inc = 10, aim = 0.55;
  const geo = tracePrism(inc, nPrism(0.55), aim);
  if (!geo) return [["FAN", "TIR"]];
  const sc = 0.62;
  const M = (p) => [(p[0] - 0.15) * sc, (p[1] - 0.45) * sc + 0.05];
  const A = M(geo.A), B = M(geo.B), C = M(geo.C);
  V.poly([A, B, C, A], COL.paper, 1.35);
  V.text("N " + nPrism(0.55).toFixed(2), (A[0] + B[0] + C[0]) / 3 - 0.16, (A[1] + B[1] + C[1]) / 3 + 0.05, 0.05, COL.dim);
  let blue = null, red = null, theta1 = geo.inc;
  for (let i = 0; i < 9; i++) {
    const lam = 0.45 + (0.2 * i) / 8;
    const g = tracePrism(inc, nPrism(lam), aim);
    if (!g) continue;
    const p1 = M(g.hit1), p2 = M(g.hit2), col = waveColor(lam);
    const rad = (inc * Math.PI) / 180;
    V.line(p1[0] - Math.cos(rad) * 0.48, p1[1] - Math.sin(rad) * 0.48, p1[0], p1[1], COL.paper, 1.1);
    V.line(p1[0], p1[1], p2[0], p2[1], [col[0], col[1], col[2], 0.85], 1.15);
    const ang = Math.atan2(g.dirOut[1], g.dirOut[0]);
    V.line(p2[0], p2[1], p2[0] + Math.cos(ang) * 0.7, p2[1] + Math.sin(ang) * 0.7, col, 1.4);
    if (lam < 0.47) blue = ang;
    if (lam > 0.63) red = ang;
    theta1 = g.inc;
  }
  const fan = blue != null && red != null ? (Math.abs(blue - red) * 180) / Math.PI : 0;
  return [["THETA 1", ((theta1 * 180) / Math.PI).toFixed(1) + " DEG"], ["FAN", fan.toFixed(1) + " DEG"], ["BENT", "BLUE MORE"]];
}

function drawCarnot(V, sim, t, dt) {
  const Th = 500, Tc = 300, gamma = 1.4, V1 = 1, V2 = 2.2, R = 8.314;
  const ratio = Math.pow(Th / Tc, 1 / (gamma - 1));
  const V3 = V2 * ratio, V4 = V1 * ratio;
  const W = (R * (Th - Tc) * Math.log(V2 / V1)) / 1000;
  const P = (T, Vv) => (R * T) / Vv;
  function curve(T0, Va, Vb, adiabat) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, Vv = Va * Math.pow(Vb / Va, u);
      const T = adiabat ? (T0 * Math.pow(Va, gamma - 1)) / Math.pow(Vv, gamma - 1) : T0;
      pts.push([Vv, P(T, Vv), T]);
    }
    return pts;
  }
  const legs = [curve(Th, V1, V2, false), curve(Th, V2, V3, true), curve(Tc, V3, V4, false), curve(Tc, V4, V1, true)];
  let pMin = Infinity, pMax = 0;
  legs.forEach((leg) => leg.forEach((p) => { pMin = Math.min(pMin, p[1]); pMax = Math.max(pMax, p[1]); }));
  const x0 = -0.92, y0 = -0.35, w = 1.15, h = 1.05;
  const X = (v) => x0 + ((Math.log(v) - Math.log(V1)) / (Math.log(V3) - Math.log(V1))) * w;
  const Y = (p) => y0 + ((Math.log(p) - Math.log(pMin)) / (Math.log(pMax) - Math.log(pMin))) * h;
  V.line(x0, y0, x0 + w, y0, COL.dim, 1.1);
  V.line(x0, y0, x0, y0 + h, COL.dim, 1.1);
  V.text("V", x0 + w - 0.08, y0 + 0.08, 0.06, COL.dim);
  V.text("P", x0 + 0.04, y0 + h + 0.01, 0.06, COL.dim);
  legs.forEach((leg, li) => {
    const col = li % 2 === 0 ? COL.amber : COL.cyan;
    for (let i = 1; i < leg.length; i++) V.line(X(leg[i - 1][0]), Y(leg[i - 1][1]), X(leg[i][0]), Y(leg[i][1]), col, 1.5);
  });
  const u = (t * 0.16) % 1, li = Math.min(3, (u * 4) | 0), leg = legs[li];
  const bead = leg[Math.min(leg.length - 1, ((u * 4) % 1) * (leg.length - 1) | 0)];
  V.circ(X(bead[0]), Y(bead[1]), 0.02, COL.paper, 1.4, 10);
  const px = 0.42, py = -0.55, pw = 0.16 + 0.28 * ((bead[0] - V1) / (V3 - V1));
  V.line(px, py, px, py + 0.42, COL.dim, 1.1);
  V.line(px + pw, py, px + pw, py + 0.42, COL.dim, 1.1);
  V.line(px, py, px + pw, py, COL.dim, 1.1);
  V.line(px - 0.03, py + 0.42, px + pw + 0.03, py + 0.42, COL.paper, 1.5);
  if (!sim.dots) {
    const rand = mulberry32(4);
    sim.dots = [];
    for (let i = 0; i < 14; i++) sim.dots.push([rand(), rand(), rand() * 6.28]);
  }
  const speed = 0.35 * Math.sqrt(bead[2] / 300);
  sim.dots.forEach((d) => {
    d[2] += dt > 0 ? speed * 0.8 : 0;
    V.fill(px + 0.03 + d[0] * (pw - 0.06), py + 0.05 + d[1] * 0.3 + Math.sin(d[2]) * 0.012 * speed, 0.012, 0.012, bead[2] > 400 ? COL.hot : COL.cyan);
  });
  return [["T", bead[2].toFixed(0) + " K"], ["ETA", (1 - Tc / Th).toFixed(3)], ["W", W.toFixed(2) + " KJ/MOL"]];
}

function drawIsing(V, sim, t, dt) {
  const N = 24;
  if (!sim.ready) {
    sim.rand = mulberry32(5);
    sim.s = new Int8Array(N * N);
    for (let i = 0; i < sim.s.length; i++) sim.s[i] = sim.rand() < 0.5 ? 1 : -1;
    sim.ready = true;
  }
  const cyc = (t % 18) / 18;
  const Temp = cyc < 0.72 ? 4.4 - (4.4 - 1.35) * (cyc / 0.72) : 1.35 + (4.4 - 1.35) * ((cyc - 0.72) / 0.28);
  const tries = dt > 0 ? Math.round(700 * Math.min(dt, 0.05) / 0.016) : 0;
  for (let k = 0; k < tries; k++) {
    const i = (sim.rand() * N * N) | 0;
    const x = i % N, y = (i / N) | 0, s = sim.s[i];
    const sum = sim.s[y * N + ((x + 1) % N)] + sim.s[y * N + ((x + N - 1) % N)] + sim.s[((y + 1) % N) * N + x] + sim.s[((y + N - 1) % N) * N + x];
    const dE = 2 * s * sum;
    if (dE <= 0 || sim.rand() < Math.exp(-dE / Temp)) sim.s[i] = -s;
  }
  const side = 1.45, cell = side / N, x0 = -side / 2, y0 = -side / 2 - 0.02;
  let mag = 0, energy = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const s = sim.s[y * N + x];
    mag += s;
    energy += -s * sim.s[y * N + ((x + 1) % N)] - s * sim.s[((y + 1) % N) * N + x];
    const col = s > 0 ? COL.cyan : COL.hot;
    const g = cell * 0.1;
    V.fill(x0 + x * cell + g, y0 + y * cell + g, cell - 2 * g, cell - 2 * g, [col[0], col[1], col[2], 0.7]);
  }
  return [["T", Temp.toFixed(2) + " J/K"], ["|M|", Math.abs(mag / (N * N)).toFixed(2)], ["E", (energy / (N * N)).toFixed(2)]];
}

const SLIT_CFG = {
  xWall: -0.52,
  xDetL: 0.35,
  xDetR: 0.43,
  yMax: 0.82,
  lam: 0.042,
  d: 0.215,
  gap: 0.018,
};
function slitEnv(sinTh) {
  const a = 3.25 * sinTh;
  return Math.abs(a) < 1e-4 ? 1 : Math.sin(a) / a;
}
function slitPdf(yNorm) {
  const { xWall, xDetL, xDetR, yMax, lam, d } = SLIT_CFG;
  const L = (xDetL + xDetR) * 0.5 - xWall;
  const y = yNorm * yMax;
  const k = (Math.PI * 2) / lam;
  const r1 = Math.hypot(L, y - d * 0.5);
  const r2 = Math.hypot(L, y + d * 0.5);
  const env = slitEnv(y / Math.hypot(L, y));
  const c = Math.cos(0.5 * k * (r1 - r2));
  const geom = L / Math.sqrt(r1 * r2);
  return c * c * env * env * geom;
}
function slitHistColor(u) {
  const stops = [
    [0.0, 0.16, 0.38, 0.88],
    [0.32, 0.18, 0.68, 0.62],
    [0.60, 0.62, 0.82, 0.28],
    [0.84, 0.94, 0.58, 0.22],
    [1.0, 0.92, 0.34, 0.22],
  ];
  let r = stops[stops.length - 1][1], g = stops[stops.length - 1][2], b = stops[stops.length - 1][3];
  for (let i = 1; i < stops.length; i++) {
    if (u <= stops[i][0]) {
      const f = (u - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      r = stops[i - 1][1] + (stops[i][1] - stops[i - 1][1]) * f;
      g = stops[i - 1][2] + (stops[i][2] - stops[i - 1][2]) * f;
      b = stops[i - 1][3] + (stops[i][3] - stops[i - 1][3]) * f;
      break;
    }
  }
  return [r, g, b, 0.88];
}
function drawSlit(V, sim, t, dt) {
  const NBINS = 64;
  const { xWall, xDetL, xDetR, yMax, lam, d, gap } = SLIT_CFG;
  const k = (Math.PI * 2) / lam;
  if (!sim.ready) {
    sim.rand = mulberry32(6);
    sim.hits = [];
    sim.hist = new Float64Array(NBINS);
    sim.pdfs = new Float64Array(NBINS);
    sim.pSum = 0;
    for (let i = 0; i < NBINS; i++) {
      const p = slitPdf(-1 + ((i + 0.5) / NBINS) * 2);
      sim.pdfs[i] = p;
      sim.pSum += p;
    }
    sim.n = 0;
    sim.acc = 0;
    sim.ready = true;
  }

  // Electron arrival rate starts discrete ("one by one") then builds up cleanly
  const rate = 28 + 250 * Math.min(1, t / 5.5);
  sim.acc += dt * rate;
  const addMax = 18;
  let added = 0;
  while (sim.acc >= 1 && sim.n < 2600 && added < addMax) {
    sim.acc -= 1;
    added++;
    let y = 0, accepted = false;
    for (let tries = 0; tries < 200; tries++) {
      const yy = sim.rand() * 2 - 1;
      if (sim.rand() < slitPdf(yy)) { y = yy; accepted = true; break; }
    }
    if (!accepted) continue;
    const rx = sim.rand();
    if (sim.hits.length < 720) {
      sim.hits.push({ y, rx, age: 0 });
    } else {
      sim.hits[sim.n % 720] = { y, rx, age: 0 };
    }
    const bin = Math.max(0, Math.min(NBINS - 1, (((y + 1) * 0.5) * NBINS) | 0));
    sim.hist[bin]++;
    sim.n++;
  }
  if (dt > 0) {
    for (let i = 0; i < sim.hits.length; i++) sim.hits[i].age += dt;
  }

  // 1. Incoming plane wave crests (left of double-slit barrier)
  const phase = (t * 2.4) % 1;
  const xLeft = -0.92;
  const nIn = Math.ceil((xWall - xLeft) / lam) + 1;
  for (let m = 0; m < nIn; m++) {
    const x = xWall - (m + (1 - phase)) * lam;
    if (x < xLeft || x >= xWall - 0.006) continue;
    const fadeL = Math.min(1, (x - xLeft) / 0.14);
    V.line(x, -yMax, x, yMax, [0.24, 0.38, 0.72, 0.34 * fadeL], 2.2);
    V.line(x, -yMax, x, yMax, [0.46, 0.64, 0.92, 0.22 * fadeL], 1.0);
  }
  V.text("E-", -0.96, 0.03, 0.042, COL.dim);

  // 2. Exact 2D double-slit interference wavefield (analytical wavefronts with lambda/2 fringe stagger)
  const Lfield = xDetL - xWall;
  const maxR = Math.hypot(Lfield, yMax);
  const nRings = Math.ceil(maxR / lam) + 1;
  const halfD = d * 0.5;
  const nSeg = 54;
  const thMax = Math.atan2(yMax, Lfield) + 0.06;

  for (let parity = 0; parity < 2; parity++) {
    const signTarget = parity === 0 ? 1 : -1;
    const offset = parity === 0 ? phase : (phase + 0.5) % 1;
    for (let m = 0; m < nRings; m++) {
      const R = (m + offset) * lam;
      if (R < 0.035) continue;
      const distAtten = 1 / Math.sqrt(0.28 + R * 2.1);
      for (let s = 0; s < nSeg; s++) {
        const th0 = -thMax + (2 * thMax * s) / nSeg;
        const th1 = -thMax + (2 * thMax * (s + 1)) / nSeg;
        const thM = 0.5 * (th0 + th1);
        const x0 = xWall + R * Math.cos(th0), y0 = R * Math.sin(th0);
        const x1 = xWall + R * Math.cos(th1), y1 = R * Math.sin(th1);
        const xm = 0.5 * (x0 + x1), ym = 0.5 * (y0 + y1);
        if (xm <= xWall + 0.012 || xm >= xDetL - 0.004 || Math.abs(ym) > yMax) continue;

        const r1 = Math.hypot(xm - xWall, ym - halfD);
        const r2 = Math.hypot(xm - xWall, ym + halfD);
        const interf = Math.cos(0.5 * k * (r1 - r2)) * signTarget;
        if (interf <= 0.08) continue;

        const env = Math.abs(slitEnv(Math.sin(thM)));
        const amp = Math.pow(interf, 1.35) * env * distAtten;
        if (amp < 0.045) continue;

        const intensity = Math.min(1, amp * 1.45);
        // Outer cobalt-blue glow + bright cyan-white wave crest core
        V.line(x0, y0, x1, y1, [0.16, 0.36, 0.86, 0.42 * intensity], 3.4);
        V.line(x0, y0, x1, y1, [0.46 + 0.42 * intensity, 0.72 + 0.24 * intensity, 1.0, 0.72 * intensity], 1.5);
      }
    }
  }

  // 3. Double-slit barrier (3 crisp segments with 2 narrow slits)
  V.line(xWall, -yMax, xWall, -halfD - gap, COL.paper, 2.2);
  V.line(xWall, -halfD + gap, xWall, halfD - gap, COL.paper, 2.2);
  V.line(xWall, halfD + gap, xWall, yMax, COL.paper, 2.2);

  // 4. Detector plate frame & accumulated discrete electron hits
  V.line(xDetL, -yMax, xDetL, yMax, COL.grid, 1.0);
  V.line(xDetR, -yMax, xDetR, yMax, COL.grid, 1.0);
  const detW = xDetR - xDetL - 0.014;
  for (let i = 0; i < sim.hits.length; i++) {
    const h = sim.hits[i];
    const hx = xDetL + 0.007 + h.rx * detW;
    const hy = h.y * yMax;
    const flash = h.age < 0.3 ? 1 - h.age / 0.3 : 0;
    const sz = flash > 0 ? 0.008 + 0.005 * flash : 0.0075;
    const col = flash > 0
      ? [0.75 + 0.25 * flash, 0.90 + 0.10 * flash, 1.0, 0.65 + 0.35 * flash]
      : [0.58, 0.78, 0.98, 0.58];
    V.fill(hx - sz * 0.5, hy - sz * 0.5, sz, sz, col);
  }

  // 5. Color-coded histogram + theoretical |psi1 + psi2|^2 curve
  const xHist = xDetR + 0.018;
  const histW = 0.46;
  let maxH = 1, hSum = 0;
  for (let i = 0; i < NBINS; i++) {
    if (sim.hist[i] > maxH) maxH = sim.hist[i];
    hSum += sim.hist[i];
  }
  const denomH = hSum || 1;
  let mean = 0, ssTot = 0, ssRes = 0;
  for (let i = 0; i < NBINS; i++) mean += sim.hist[i] / denomH;
  mean /= NBINS;

  const pMax = sim.pdfs[NBINS >> 1] || 1;
  const barScale = sim.n > 40 ? maxH : Math.max(maxH, 6);
  for (let i = 0; i < NBINS; i++) {
    const o = sim.hist[i] / denomH, e = sim.pdfs[i] / (sim.pSum || 1);
    ssTot += (o - mean) ** 2;
    ssRes += (o - e) ** 2;
    const y = -yMax + ((i + 0.5) / NBINS) * (2 * yMax);
    const frac = sim.hist[i] / barScale;
    if (frac > 0.001) {
      V.line(xHist, y, xHist + frac * histW, y, slitHistColor(frac), 2.1);
    }
  }
  const theory = [];
  const expectedPeak = sim.n > 30 ? (sim.n * (pMax / (sim.pSum || 1))) / barScale : 0.92;
  const thScale = Math.min(1.0, Math.max(0.55, expectedPeak));
  for (let i = 0; i <= 112; i++) {
    const yy = -1 + (i / 112) * 2;
    theory.push([xHist + (slitPdf(yy) / pMax) * histW * thScale, yy * yMax]);
  }
  V.poly(theory, [0.92, 0.90, 0.85, 0.78], 1.15);

  const r2 = ssTot > 1e-9 && sim.n > 15 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  return [["ELECTRONS", String(sim.n)], ["FIT R2", r2.toFixed(2)], ["LAW", "ABS PSI 2"]];
}

function drawLorentz(V, sim, t) {
  const particles = [
    { q: 1, p: 0.55, th: 0.4, col: COL.cyan },
    { q: -1, p: 0.55, th: 0.2, col: COL.hot },
    { q: 1, p: 0.32, th: 1.3, col: COL.cyanDim },
    { q: -1, p: 0.74, th: 2.2, col: COL.amber },
  ];
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    V.circ(i * 0.5, j * 0.42, 0.025, COL.grid, 1, 8);
  }
  particles.forEach((p) => {
    const r = p.p * 0.7, w = p.q;
    const pts = [];
    for (let i = 0; i <= 42; i++) {
      const ang = p.th - w * t * 0.7 - Math.PI * 1.3 * (i / 42) * Math.sign(p.q);
      pts.push([0.05 * p.q + r * Math.sin(ang), r * 0.85 * Math.cos(ang)]);
    }
    for (let i = 1; i < pts.length; i++) {
      const a = 0.15 + 0.8 * (i / pts.length);
      V.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], [p.col[0], p.col[1], p.col[2], a], 1.3);
    }
    const head = pts[pts.length - 1];
    V.circ(head[0], head[1], 0.02, p.col, 1.4, 8);
  });
  return [["P", "0.55 P0"], ["R", "0.55 R0"], ["B", "OUT OF PAGE"]];
}

function drawVortex(V, sim, t, dt) {
  if (!sim.ready) { sim.parts = []; sim.probe = []; sim.emit = 0; sim.ready = true; }
  const U = 0.42, D = 0.2, St = 0.2, f = (St * U) / D, Uc = 0.78 * U, b = 0.28 * (Uc / f), Gamma = 0.62 * U * D;
  const xC = -0.48, yC = 0.12;
  function vorts(time) {
    const half = 1 / (2 * f), n = Math.floor(time / half), list = [];
    for (let i = Math.max(0, n - 12); i <= n; i++) {
      const sign = i % 2 === 0 ? 1 : -1;
      list.push({ x: xC + 0.12 + Uc * (time - i * half), y: yC + sign * b * 0.5, g: sign * Gamma });
    }
    return list;
  }
  const vs = vorts(t);
  function vel(x, y) {
    let u = U, v = 0;
    vs.forEach((q) => {
      const dx = x - q.x, dy = y - q.y, r2 = dx * dx + dy * dy + 0.012;
      u += (-q.g * dy) / (2 * Math.PI * r2);
      v += (q.g * dx) / (2 * Math.PI * r2);
    });
    if ((x - xC) ** 2 + (y - yC) ** 2 < 0.008) return [0, 0];
    return [u, v];
  }
  if (dt > 0) {
    sim.emit -= dt;
    if (sim.emit <= 0) {
      sim.emit = 0.07;
      for (let i = -3; i <= 3; i++) sim.parts.push({ x: -1.02, y: yC + i * 0.07, hist: [] });
    }
    const h = Math.min(dt, 0.04);
    sim.parts.forEach((p) => {
      const a1 = vel(p.x, p.y), a2 = vel(p.x + a1[0] * h, p.y + a1[1] * h);
      p.x += a2[0] * h; p.y += a2[1] * h;
      p.hist.push([p.x, p.y]);
      if (p.hist.length > 12) p.hist.shift();
    });
    sim.parts = sim.parts.filter((p) => p.x < 1.15 && Math.abs(p.y) < 1.15);
    if (sim.parts.length > 80) sim.parts.splice(0, sim.parts.length - 80);
    sim.probe.push(vel(xC + 0.55, yC)[1] / U);
    if (sim.probe.length > 70) sim.probe.shift();
  }
  V.circ(xC, yC, 0.085, COL.paper, 1.45, 24);
  vs.forEach((q) => { if (q.x < 1.1) V.circ(q.x, q.y, 0.03, q.g > 0 ? COL.cyan : COL.hot, 1.15, 12); });
  sim.parts.forEach((p) => {
    for (let i = 1; i < p.hist.length; i++) {
      V.line(p.hist[i - 1][0], p.hist[i - 1][1], p.hist[i][0], p.hist[i][1], [COL.amber[0], COL.amber[1], COL.amber[2], 0.25 + 0.6 * (i / p.hist.length)], 1.05);
    }
  });
  V.scope(-0.9, -0.9, 1.8, 0.28, sim.probe, COL.amber, -0.8, 0.8);
  const wake = sim.probe.length ? sim.probe[sim.probe.length - 1] : 0;
  return [["RE", "126"], ["ST", "0.20"], ["WAKE", (wake >= 0 ? "+" : "") + wake.toFixed(2) + " U"]];
}

function drawMach(V, sim, t, dt) {
  if (!sim.ready) { sim.x = -0.9; sim.pulses = []; sim.emit = 0; sim.ready = true; }
  const u = t % 16;
  const M = u < 5 ? 0.82 : u < 8.5 ? 0.82 + (0.66 * (u - 5)) / 3.5 : 1.48;
  const c = 0.32;
  if (dt > 0) {
    sim.x += M * c * dt;
    if (sim.x > 1.05) { sim.x = -1.05; sim.pulses = []; }
    sim.emit -= dt;
    if (sim.emit <= 0) { sim.emit = 0.16; sim.pulses.push({ x: sim.x, age: 0 }); }
    sim.pulses.forEach((p) => { p.age += dt; });
    sim.pulses = sim.pulses.filter((p) => p.age * c < 1.5);
  }
  sim.pulses.forEach((p) => {
    const rad = p.age * c;
    V.circ(p.x, 0.08, rad, [COL.cyan[0], COL.cyan[1], COL.cyan[2], Math.max(0.1, 0.5 - rad * 0.3)], 1, 32);
  });
  if (M > 1.02) {
    const mu = Math.asin(1 / M), len = 0.95;
    V.line(sim.x, 0.08, sim.x + Math.cos(Math.PI - mu) * len, 0.08 + Math.sin(Math.PI - mu) * len, COL.amber, 1.45);
    V.line(sim.x, 0.08, sim.x + Math.cos(Math.PI + mu) * len, 0.08 + Math.sin(Math.PI + mu) * len, COL.amber, 1.45);
  }
  V.circ(sim.x, 0.08, 0.03, COL.paper, 1.5, 12);
  const fp = M < 0.98 ? 1 / (1 - M) : null;
  return [["MACH", M.toFixed(2)], ["MU", M > 1 ? ((Math.asin(1 / M) * 180) / Math.PI).toFixed(1) + " DEG" : "—"], ["F RATIO", fp ? fp.toFixed(2) : "SHOCK"]];
}

function drawClock(V, sim, t) {
  const vOverC = 0.8, gamma = 1 / Math.sqrt(1 - vOverC * vOverC);
  const H = 0.28, c = 0.55, v = vOverC * c;
  const Tw = (gamma * H) / c, Trest = (2 * H) / c, Tmov = gamma * Trest;
  function mirrors(x, col) {
    V.line(x - 0.05, H / 2, x + 0.05, H / 2, col, 1.4);
    V.line(x - 0.05, -H / 2, x + 0.05, -H / 2, col, 1.4);
  }
  const xR = -0.55;
  const urest = (t % Trest) / Trest;
  const yR = urest < 0.5 ? -H / 2 + (urest / 0.5) * H : H / 2 - ((urest - 0.5) / 0.5) * H;
  mirrors(xR, COL.cyan);
  V.circ(xR, yR, 0.018, COL.paper, 1.3, 8);
  V.text("REST", xR - 0.12, 0.55, 0.05, COL.dim);
  const cam = v * t;
  const to = (x, y) => [(x - cam) * 0.7 + 0.28, y * 0.9];
  const mc = to(cam, 0);
  mirrors(mc[0], COL.amber);
  const span = Tmov * 0.9, trail = [];
  for (let i = 0; i <= 24; i++) {
    const tt = Math.max(0, t - span * (1 - i / 24));
    const leg = Math.floor(tt / Tw), frac = (tt / Tw) - leg;
    const y = leg % 2 === 0 ? -H / 2 + frac * H : H / 2 - frac * H;
    trail.push(to(v * tt, y));
  }
  for (let i = 1; i < trail.length; i++) {
    V.line(trail[i - 1][0], trail[i - 1][1], trail[i][0], trail[i][1], [COL.amber[0], COL.amber[1], COL.amber[2], 0.25 + 0.7 * (i / trail.length)], 1.2);
  }
  V.circ(trail[trail.length - 1][0], trail[trail.length - 1][1], 0.018, COL.paper, 1.3, 8);
  V.text("0.8C", 0.12, 0.55, 0.05, COL.dim);
  return [["GAMMA", gamma.toFixed(3)], ["REST", String(Math.floor(t / Trest))], ["MOVE", String(Math.floor(t / Tmov))]];
}

function lensMap(bx, by, thE) {
  const b = Math.hypot(bx, by);
  if (b < 1e-5) return [[thE, 0], [-thE, 0]];
  const disc = Math.sqrt(b * b + 4 * thE * thE);
  const ux = bx / b, uy = by / b;
  const tp = 0.5 * (b + disc), tm = 0.5 * (b - disc);
  return [[ux * tp, uy * tp], [ux * tm, uy * tm]];
}
function drawRing(V, sim, t) {
  const thE = 0.42;
  const beta = 0.045 + 0.34 * (0.5 - 0.5 * Math.cos(t * 0.48));
  const ang = -0.35 + 0.42 * Math.sin(t * 0.27);
  const bx = beta * Math.cos(ang), by = beta * Math.sin(ang);

  if (!sim.ready) {
    const rand = mulberry32(11);
    // Background field stars
    sim.bgStars = [];
    for (let i = 0; i < 85; i++) {
      const rr = 0.14 + Math.sqrt(rand()) * 0.84;
      const a = rand() * Math.PI * 2;
      sim.bgStars.push([Math.cos(a) * rr, Math.sin(a) * rr, 0.3 + 0.65 * rand()]);
    }
    // Star-forming knots along the 2 spiral arms of the background galaxy
    sim.knots = [];
    for (let arm = 0; arm < 2; arm++) {
      for (let i = 0; i < 24; i++) {
        const f = (i + 0.5) / 24;
        const r = 0.018 + f * 0.155;
        const a = arm * Math.PI + f * 3.15 + (rand() - 0.5) * 0.22;
        sim.knots.push([Math.cos(a) * r, Math.sin(a) * r * 0.72, 1 - 0.65 * f]);
      }
    }
    sim.ready = true;
  }

  const rot = t * 0.14;
  const cr = Math.cos(rot), sr = Math.sin(rot);
  const rotPt = (x, y) => [bx + x * cr - y * sr, by + x * sr + y * cr];

  // 1. Lensed background starfield (both primary + and secondary - images)
  for (let i = 0; i < sim.bgStars.length; i++) {
    const st = sim.bgStars[i];
    const imgs = lensMap(st[0], st[1], thE);
    const sz = 0.009 + 0.005 * st[2];
    const a1 = 0.48 * st[2];
    if (Math.hypot(imgs[0][0], imgs[0][1]) < 0.96) {
      V.fill(imgs[0][0] - sz * 0.5, imgs[0][1] - sz * 0.5, sz, sz, [0.76, 0.84, 0.96, a1]);
    }
    const r2 = Math.hypot(imgs[1][0], imgs[1][1]);
    if (r2 > 0.08 && r2 < 0.96) {
      V.fill(imgs[1][0] - sz * 0.4, imgs[1][1] - sz * 0.4, sz * 0.8, sz * 0.8, [0.56, 0.70, 0.92, a1 * 0.55]);
    }
  }

  // 2. Einstein critical curve (faint reference circle at theta_E)
  V.circ(0, 0, thE, [0.55, 0.66, 0.82, 0.22], 1.0, 64);
  V.text("TE", thE * 0.74, thE * 0.74, 0.042, COL.dim);

  // Helper to stroke a source-plane curve through both lensed branches (+ and -)
  function strokeLensedCurve(ptsSrc, colGlow, colCore, wGlow, wCore) {
    for (let branch = 0; branch < 2; branch++) {
      let prev = null;
      for (let i = 0; i < ptsSrc.length; i++) {
        const sp = rotPt(ptsSrc[i][0], ptsSrc[i][1]);
        const im = lensMap(sp[0], sp[1], thE)[branch];
        if (prev) {
          const jump = Math.hypot(im[0] - prev[0], im[1] - prev[1]);
          if (jump < 0.35) {
            const fade = ptsSrc[i][2];
            V.line(prev[0], prev[1], im[0], im[1], [colGlow[0], colGlow[1], colGlow[2], colGlow[3] * fade], wGlow);
            V.line(prev[0], prev[1], im[0], im[1], [colCore[0], colCore[1], colCore[2], colCore[3] * fade], wCore);
          }
        }
        prev = im;
      }
    }
  }

  // 3. Background spiral galaxy: 2 bright main arms + 2 softer secondary arms + bulge rings
  for (let arm = 0; arm < 4; arm++) {
    const main = arm < 2;
    const nPts = main ? 44 : 30;
    const pts = [];
    const baseA = (arm * Math.PI) / 2 + (main ? 0 : 0.45);
    const rMaxArm = main ? 0.175 : 0.135;
    for (let i = 0; i <= nPts; i++) {
      const f = i / nPts;
      const r = 0.012 + f * rMaxArm;
      const a = baseA + f * (main ? 3.4 : 2.6);
      const fade = Math.sin(Math.min(1, f * 5) * Math.PI * 0.5) * (1 - 0.72 * f * f);
      pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.74, fade]);
    }
    if (main) {
      strokeLensedCurve(pts, [0.36, 0.58, 0.96, 0.52], [0.88, 0.94, 1.0, 0.90], 3.4, 1.45);
    } else {
      strokeLensedCurve(pts, [0.28, 0.48, 0.88, 0.30], [0.68, 0.82, 0.98, 0.48], 2.4, 1.05);
    }
  }
  // Galaxy core rings (produce bright thickened Einstein ring core)
  [0.018, 0.036, 0.058].forEach((rc, ri) => {
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      pts.push([Math.cos(a) * rc, Math.sin(a) * rc * 0.76, 1 - ri * 0.25]);
    }
    strokeLensedCurve(pts, [0.50, 0.72, 1.0, 0.48], [0.96, 0.98, 1.0, 0.85], 3.0, 1.3);
  });
  // Lensed star-forming knots along arms
  for (let i = 0; i < sim.knots.length; i++) {
    const k = sim.knots[i];
    const sp = rotPt(k[0], k[1]);
    const imgs = lensMap(sp[0], sp[1], thE);
    const sz = 0.013 * (0.6 + 0.5 * k[2]);
    for (let b = 0; b < 2; b++) {
      V.fill(imgs[b][0] - sz * 0.5, imgs[b][1] - sz * 0.5, sz, sz, [0.80, 0.90, 1.0, 0.72 * k[2]]);
    }
  }

  // 4. Unlensed true source position crosshair
  V.line(bx - 0.024, by, bx + 0.024, by, COL.dim, 1.0);
  V.line(bx, by - 0.024, bx, by + 0.024, COL.dim, 1.0);

  // 5. Central foreground lensing mass (warm golden galaxy core)
  V.circ(0, 0, 0.052, [0.95, 0.72, 0.36, 0.22], 3.2, 18);
  V.circ(0, 0, 0.028, [0.98, 0.80, 0.46, 0.55], 2.6, 16);
  V.circ(0, 0, 0.013, [1.0, 0.94, 0.78, 0.95], 2.4, 12);

  const u = beta / thE;
  const mu = (u * u + 2) / (u * Math.sqrt(u * u + 4));
  return [["BETA/TE", u.toFixed(2)], ["MAG", "X" + mu.toFixed(2)], ["ALPHA", "4GM/C2B"]];
}

// Exact Schwarzschild Null Geodesics via RK4 integration of relativistic Binet equation:
// d2u/dphi2 + u = 1.5 * rs * u^2, where u = 1/r, rs = 1.0, r_ph = 1.5, b_crit = 3*sqrt(3)/2 ≈ 2.598076
function integrateSchwarzschildRay(b, rStart) {
  const rs = 1.0;
  const x0 = -Math.sqrt(Math.max(0.01, rStart * rStart - b * b));
  const y0 = b;
  let phi = Math.atan2(y0, x0);
  let u = 1 / rStart;
  // Incoming ray moving in +x direction: dr/dphi = r*cot(phi), so du/dphi = -u*cot(phi) = -u*(x0/y0)
  // Wait: as photon moves toward +x with y > 0, phi decreases from ~pi toward 0, and r decreases (u increases):
  // x = r cos(phi), y = r sin(phi) => dx = dr cos - r sin dphi, dy = dr sin + r cos dphi = 0 => dr/dphi = -r cot(phi)
  // => du/dphi = -(1/r^2) dr/dphi = u cot(phi) = u * (x0 / y0) (negative since x0 < 0, y0 > 0; with dphi < 0, du > 0!).
  let v = u * (x0 / y0);
  const dphi = -0.026;
  const pts = [[x0, y0, 0]];
  let sTotal = 0;
  let captured = false;

  function f(uu) { return 1.5 * rs * uu * uu - uu; }

  for (let step = 0; step < 360; step++) {
    const k1u = v, k1v = f(u);
    const k2u = v + 0.5 * dphi * k1v, k2v = f(u + 0.5 * dphi * k1u);
    const k3u = v + 0.5 * dphi * k2v, k3v = f(u + 0.5 * dphi * k2u);
    const k4u = v + dphi * k3v, k4v = f(u + dphi * k3u);
    u += (dphi / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
    v += (dphi / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    phi += dphi;

    if (u <= 1 / (rStart * 1.08)) break;
    if (u >= 1 / rs) {
      const xh = rs * Math.cos(phi), yh = rs * Math.sin(phi);
      const prev = pts[pts.length - 1];
      sTotal += Math.hypot(xh - prev[0], yh - prev[1]);
      pts.push([xh, yh, sTotal]);
      captured = true;
      break;
    }
    const r = 1 / u;
    const x = r * Math.cos(phi), y = r * Math.sin(phi);
    if (Math.abs(x) > rStart * 1.06 || Math.abs(y) > rStart * 1.06) break;
    const prev = pts[pts.length - 1];
    sTotal += Math.hypot(x - prev[0], y - prev[1]);
    pts.push([x, y, sTotal]);
  }
  const last = pts[pts.length - 1];
  const prev = pts[Math.max(0, pts.length - 2)];
  const outAng = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
  return { b, pts, sTotal, captured, deflect: Math.abs(outAng) };
}

function drawGeodesics(V, sim, t) {
  const rs = 1.0, rPh = 1.5, bCrit = 1.5 * Math.sqrt(3), rIsco = 3.0;
  const rStart = 8.4;
  const sc = 0.112;

  if (!sim.ready) {
    const bs = [0.65, 1.35, 1.95, 2.38, 2.55, 2.602, 2.64, 2.78, 3.08, 3.55, 4.15, 4.90, 5.80, 6.85];
    sim.rays = bs.map((b) => integrateSchwarzschildRay(b, rStart));
    sim.ready = true;
  }

  // Reference spacetime circles: ISCO (3 rs), Shadow (b_crit), Photon sphere (1.5 rs), Event horizon (rs)
  V.circ(0, 0, rIsco * sc, [0.42, 0.52, 0.66, 0.16], 1.0, 56);
  V.circ(0, 0, bCrit * sc, [0.92, 0.72, 0.34, 0.22], 1.0, 52);
  V.circ(0, 0, rPh * sc, [0.96, 0.74, 0.30, 0.52], 1.25, 44);

  const cycleLen = 22.0;
  const waveDist = (t * 4.2) % cycleLen;

  for (let ri = 0; ri < sim.rays.length; ri++) {
    const ray = sim.rays[ri];
    const nearCrit = Math.abs(ray.b - bCrit) < 0.08;
    const colBase = ray.captured
      ? [0.88, 0.34, 0.24, 0.42]
      : nearCrit
        ? [0.98, 0.78, 0.32, 0.68]
        : [0.30, 0.66, 0.94, 0.44];
    const colHead = ray.captured
      ? [1.0, 0.52, 0.34, 0.95]
      : nearCrit
        ? [1.0, 0.92, 0.58, 0.98]
        : [0.68, 0.90, 1.0, 0.95];

    const pts = ray.pts;
    // Draw geodesic curve (mirrored +/- y)
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1], p1 = pts[i];
      const lw = nearCrit ? 1.4 : 1.05;
      V.line(p0[0] * sc, p0[1] * sc, p1[0] * sc, p1[1] * sc, colBase, lw);
      V.line(p0[0] * sc, -p0[1] * sc, p1[0] * sc, -p1[1] * sc, colBase, lw);
    }

    // Animated photon wavepackets traveling along the exact geodesic
    for (let pulse = 0; pulse < 2; pulse++) {
      const sTarget = (waveDist + pulse * (cycleLen * 0.5)) % cycleLen;
      if (sTarget > ray.sTotal) continue;
      // Draw bright trailing comet segment behind photon
      const trailLen = 1.15;
      for (let i = 1; i < pts.length; i++) {
        const s1 = pts[i][2];
        if (s1 < sTarget - trailLen) continue;
        if (pts[i - 1][2] > sTarget) break;
        const frac = Math.max(0, 1 - (sTarget - s1) / trailLen);
        const p0 = pts[i - 1], p1 = pts[i];
        const c = [colHead[0], colHead[1], colHead[2], colHead[3] * frac * 0.85];
        V.line(p0[0] * sc, p0[1] * sc, p1[0] * sc, p1[1] * sc, c, 2.2);
        V.line(p0[0] * sc, -p0[1] * sc, p1[0] * sc, -p1[1] * sc, c, 2.2);
      }
      // Photon head dot
      for (let i = 1; i < pts.length; i++) {
        if (pts[i][2] >= sTarget) {
          const p0 = pts[i - 1], p1 = pts[i];
          const f = (sTarget - p0[2]) / ((p1[2] - p0[2]) || 1e-6);
          const hx = (p0[0] + (p1[0] - p0[0]) * f) * sc;
          const hy = (p0[1] + (p1[1] - p0[1]) * f) * sc;
          V.circ(hx, hy, 0.013, colHead, 2.0, 8);
          V.circ(hx, -hy, 0.013, colHead, 2.0, 8);
          break;
        }
      }
    }
  }

  // Event Horizon boundary (rs)
  V.circ(0, 0, rs * sc, [0.95, 0.42, 0.26, 0.92], 2.0, 36);
  V.circ(0, 0, rs * sc * 0.92, [0.95, 0.42, 0.26, 0.35], 1.2, 32);
  V.text("RS", -0.05, -0.02, 0.04, COL.paper);
  V.text("RPH 1.5", rPh * sc * 0.65, rPh * sc * 0.85, 0.036, COL.amber);
  V.text("ISCO 3", rIsco * sc * 0.62, -rIsco * sc * 0.82, 0.036, COL.dim);

  return [["B CRIT", "2.598 RS"], ["R PHOTON", "1.50 RS"], ["ISCO", "3.00 RS"]];
}

// Luminet (1979) / EHT-style Schwarzschild Black Hole Shadow, Photon Ring & Relativistic Accretion Disk
// Precomputes exact Schwarzschild Binet deflection table b(r, psi) for primary (n=0) and secondary (n=1) images
function buildBlackHoleTable() {
  const rs = 1.0, bCrit = 1.5 * Math.sqrt(3);
  const radii = [];
  for (let i = 0; i < 24; i++) radii.push(3.05 + (i / 23) * 8.4);
  const Npsi = 84;
  // For each radius, integrate a dense fan of impact parameters b and tabulate b_primary(psi) and b_secondary(psi)
  const prim = radii.map(() => new Float32Array(Npsi));
  const sec = radii.map(() => new Float32Array(Npsi));
  const psiGrid = new Float32Array(Npsi);
  for (let j = 0; j < Npsi; j++) psiGrid[j] = (j / (Npsi - 1)) * Math.PI;

  // Integrate null geodesics starting from infinity (u=0, du/dphi = 1/b) for 160 values of b
  const Nb = 160;
  const samplesP = radii.map(() => []);
  const samplesS = radii.map(() => []);
  const f = (u) => 1.5 * rs * u * u - u;

  for (let bi = 0; bi < Nb; bi++) {
    // Cluster b tightly near bCrit to resolve strong bending and secondary arches cleanly
    const t = bi / (Nb - 1);
    const b = bCrit + 0.0015 + 11.8 * Math.pow(t, 2.35);
    let u = 0, v = 1 / b, phi = 0;
    const dphi = 0.018;
    let prevU = 0;
    for (let step = 0; step < 360; step++) {
      const k1u = v, k1v = f(u);
      const k2u = v + 0.5 * dphi * k1v, k2v = f(u + 0.5 * dphi * k1u);
      const k3u = v + 0.5 * dphi * k2v, k3v = f(u + 0.5 * dphi * k2u);
      const k4u = v + dphi * k3v, k4v = f(u + dphi * k3u);
      const nextU = u + (dphi / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
      const nextV = v + (dphi / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
      const nextPhi = phi + dphi;
      if (nextU <= 0 && step > 2) break;
      if (nextU >= 1 / rs) break;

      for (let ri = 0; ri < radii.length; ri++) {
        const uT = 1 / radii[ri];
        if ((u - uT) * (nextU - uT) <= 0 && Math.abs(nextU - u) > 1e-9) {
          const frac = (uT - u) / (nextU - u);
          const phiHit = phi + frac * dphi;
          if (phiHit > 0.01 && phiHit < Math.PI - 0.01) {
            samplesP[ri].push([phiHit, b]);
          } else if (phiHit > Math.PI + 0.01 && phiHit < Math.PI * 2 - 0.01) {
            samplesS[ri].push([Math.PI * 2 - phiHit, b]);
          }
        }
      }
      prevU = u; u = nextU; v = nextV; phi = nextPhi;
    }
  }

  function fillInterp(samples, out) {
    samples.sort((a, b) => a[0] - b[0]);
    for (let j = 0; j < Npsi; j++) {
      const p = psiGrid[j];
      if (!samples.length) { out[j] = 0; continue; }
      if (p <= samples[0][0]) { out[j] = samples[0][1]; continue; }
      if (p >= samples[samples.length - 1][0]) { out[j] = samples[samples.length - 1][1]; continue; }
      let lo = 0, hi = samples.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (samples[mid][0] <= p) lo = mid; else hi = mid;
      }
      const a = samples[lo], b = samples[hi];
      const frac = (p - a[0]) / ((b[0] - a[0]) || 1e-6);
      out[j] = a[1] + (b[1] - a[1]) * frac;
    }
  }
  for (let ri = 0; ri < radii.length; ri++) {
    fillInterp(samplesP[ri], prim[ri]);
    fillInterp(samplesS[ri], sec[ri]);
  }
  return { radii, Npsi, prim, sec, bCrit };
}

function blackbodyDopplerColor(g, em, alpha) {
  // Thermal blackbody color shifted by relativistic Doppler/gravitational factor g
  const temp = Math.max(0, Math.min(1, (g - 0.55) / 0.88));
  const stops = [
    [0.0, 0.58, 0.14, 0.08],
    [0.28, 0.88, 0.32, 0.12],
    [0.56, 0.98, 0.62, 0.24],
    [0.80, 1.0, 0.86, 0.58],
    [1.0, 0.92, 0.96, 1.0],
  ];
  let r = stops[4][1], gg = stops[4][2], b = stops[4][3];
  for (let i = 1; i < stops.length; i++) {
    if (temp <= stops[i][0]) {
      const f = (temp - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      r = stops[i - 1][1] + (stops[i][1] - stops[i - 1][1]) * f;
      gg = stops[i - 1][2] + (stops[i][2] - stops[i - 1][2]) * f;
      b = stops[i - 1][3] + (stops[i][3] - stops[i - 1][3]) * f;
      break;
    }
  }
  const boost = Math.min(1, alpha * em * Math.pow(Math.max(0.35, g), 2.35));
  return [r, gg, b, boost];
}

function drawBlackHole(V, sim, t) {
  if (!sim.ready) {
    sim.tbl = buildBlackHoleTable();
    sim.ready = true;
  }
  const { radii, Npsi, prim, sec, bCrit } = sim.tbl;
  const sc = 0.082;
  const th0 = (78 * Math.PI) / 180;
  const sinT0 = Math.sin(th0), cosT0 = Math.cos(th0);
  const Nphi = 144;

  function sampleB(arr, psi) {
    const u = Math.max(0, Math.min(1, psi / Math.PI)) * (Npsi - 1);
    const i0 = Math.min(Npsi - 2, u | 0);
    return arr[i0] + (arr[i0 + 1] - arr[i0]) * (u - i0);
  }

  // Draw secondary lensed image (bent upside-down under-arch) then primary disk (bent upper arch + front disk)
  for (let order = 1; order >= 0; order--) {
    const table = order === 0 ? prim : sec;
    const isSec = order === 1;
    const stepR = isSec ? 2 : 1;
    for (let ri = 0; ri < radii.length; ri += stepR) {
      const r = radii[ri];
      // Page-Thorne style radial emissivity (peaks near 4.5 rs, falls smoothly outward)
      const em = Math.max(0, (1 - Math.sqrt(3.0 / r)) * Math.pow(3.0 / r, 1.3) * 5.8);
      const omega = Math.sqrt(0.5 / (r * r * r));
      const grav = Math.sqrt(Math.max(0.05, 1 - 1.5 / r));
      const phaseShift = t * omega * 4.2 + ri * 1.1;

      let px = 0, py = 0, hasPrev = false;
      for (let k = 0; k <= Nphi; k++) {
        const phi = (k / Nphi) * Math.PI * 2;
        const cosPsi = sinT0 * Math.sin(phi);
        const psi = Math.acos(Math.max(-0.9995, Math.min(0.9995, cosPsi)));
        const sinPsi = Math.sqrt(Math.max(1e-6, 1 - cosPsi * cosPsi));
        let cosA = Math.cos(phi) / sinPsi;
        let sinA = (-cosT0 * Math.sin(phi)) / sinPsi;
        if (isSec) { cosA = -cosA; sinA = -sinA; }

        const b = sampleB(table[ri], psi);
        if (b < bCrit * 0.99) { hasPrev = false; continue; }
        const x = b * cosA * sc;
        const y = b * sinA * sc;

        // Relativistic Doppler + gravitational redshift (left side approaches observer -> bright!)
        const doppler = grav / Math.max(0.32, 1 + omega * b * sinT0 * (isSec ? -cosA : cosA));
        // Swirling turbulent accretion filaments
        const fil = 0.66 + 0.34 * Math.sin(phi * 3 - phaseShift) * Math.cos(phi * 2 + phaseShift * 0.7 + ri * 0.6);
        const col = blackbodyDopplerColor(doppler, em * fil, isSec ? 0.65 : 0.95);
        const lw = isSec ? 1.55 : (2.3 - 0.55 * (ri / radii.length));

        if (hasPrev && Math.hypot(x - px, y - py) < 0.25 && col[3] > 0.03) {
          V.line(px, py, x, y, col, lw);
        }
        px = x; py = y; hasPrev = true;
      }
    }
  }

  // Razor-sharp n=1 Photon Ring right at the critical shadow radius b_crit = 2.598 rs
  const rShadow = bCrit * sc;
  for (let i = 0; i < 72; i++) {
    const a0 = (i / 72) * Math.PI * 2, a1 = ((i + 1) / 72) * Math.PI * 2;
    const am = 0.5 * (a0 + a1);
    const beam = 0.52 + 0.48 * Math.pow(0.5 - 0.5 * Math.cos(am), 1.4); // brighter on approaching left side
    V.line(Math.cos(a0) * rShadow, Math.sin(a0) * rShadow, Math.cos(a1) * rShadow, Math.sin(a1) * rShadow, [1.0, 0.84, 0.52, 0.72 * beam], 1.8);
    V.line(Math.cos(a0) * rShadow * 1.02, Math.sin(a0) * rShadow * 1.02, Math.cos(a1) * rShadow * 1.02, Math.sin(a1) * rShadow * 1.02, [0.98, 0.56, 0.22, 0.34 * beam], 3.2);
  }

  // Subtle scale annotation for shadow radius
  V.line(-rShadow, -0.84, rShadow, -0.84, COL.dim, 1.0);
  V.line(-rShadow, -0.86, -rShadow, -0.82, COL.dim, 1.0);
  V.line(rShadow, -0.86, rShadow, -0.82, COL.dim, 1.0);
  V.text("5.2 RS SHADOW", -0.26, -0.78, 0.038, COL.dim);

  return [["SHADOW", "2.598 RS"], ["INCL", "78 DEG"], ["ISCO", "3.00 RS"]];
}

function circleOverlap(d, R, r) {
  if (d >= R + r) return 0;
  if (d <= Math.abs(R - r)) return Math.PI * Math.min(R, r) ** 2;
  const a = Math.acos((d * d + R * R - r * r) / (2 * d * R));
  const b = Math.acos((d * d + r * r - R * R) / (2 * d * r));
  return R * R * a + r * r * b - 0.5 * Math.sqrt((-d + R + r) * (d + R - r) * (d - R + r) * (d + R + r));
}
function drawTransit(V, sim, t, dt) {
  if (!sim.ready) {
    const rand = mulberry32(12);
    sim.dots = [];
    for (let i = 0; i < 380; i++) {
      const rr = Math.sqrt(rand()), a = rand() * Math.PI * 2;
      sim.dots.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    sim.flux = [];
    sim.ready = true;
  }
  const Rs = 0.32, Rp = 0.036, ratio = (Rp / Rs) ** 2;
  const xP = -1.05 + ((t % 7.5) / 7.5) * 2.1;
  const star = [-0.02, 0.2];
  sim.dots.forEach((d) => {
    const x = star[0] + d[0] * Rs, y = star[1] + d[1] * Rs;
    if ((x - xP) ** 2 + (y - star[1]) ** 2 < Rp * Rp) return;
    V.fill(x, y, 0.007, 0.007, [COL.amber[0], COL.amber[1], COL.amber[2], 0.8]);
  });
  V.circ(star[0], star[1], Rs, [COL.amber[0], COL.amber[1], COL.amber[2], 0.4], 1.1, 40);
  V.circ(xP, star[1], Rp, COL.paper, 1.3, 16);
  const flux = 1 - circleOverlap(Math.abs(xP - star[0]), Rs, Rp) / (Math.PI * Rs * Rs);
  if (dt > 0) { sim.flux.push(flux); if (sim.flux.length > 100) sim.flux.shift(); }
  V.scope(-0.9, -0.92, 1.8, 0.36, sim.flux, COL.cyan, 0.975, 1.002);
  return [["FLUX", flux.toFixed(4)], ["DIP", ((1 - flux) * 100).toFixed(2) + " %"], ["AREA", (ratio * 100).toFixed(2) + " %"]];
}

function drawRect(V, sim, t, dt) {
  if (!sim.ready) { sim.vout = 0; sim.vin = []; sim.out = []; sim.ready = true; }
  const vin = 16 * Math.sin(2 * Math.PI * 0.55 * t);
  const vrect = Math.abs(vin);
  if (dt > 0) {
    if (vrect > sim.vout) sim.vout += (vrect - sim.vout) * (1 - Math.exp(-dt / 0.05));
    else sim.vout *= Math.exp(-dt / 0.62);
    sim.vin.push(vin); sim.out.push(sim.vout);
    if (sim.vin.length > 80) { sim.vin.shift(); sim.out.shift(); }
  }
  const L = [-0.7, 0.25], T = [-0.28, 0.58], R = [0.12, 0.25], B = [-0.28, -0.08];
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  function diode(a, b, on) {
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const p = mid(a, b), c = Math.cos(ang), s = Math.sin(ang);
    const rot = (px, py) => [p[0] + px * c - py * s, p[1] + px * s + py * c];
    const p1 = rot(-0.05, 0.035), p2 = rot(-0.05, -0.035), tip = rot(0.04, 0);
    const col = on ? COL.amber : COL.dim;
    V.line(p1[0], p1[1], p2[0], p2[1], col, 1.2);
    V.line(p1[0], p1[1], tip[0], tip[1], col, 1.2);
    V.line(p2[0], p2[1], tip[0], tip[1], col, 1.2);
    const barA = rot(0.04, 0.04), barB = rot(0.04, -0.04);
    V.line(barA[0], barA[1], barB[0], barB[1], col, 1.4);
  }
  const pos = vin >= 0;
  const colW = (on) => (on ? COL.amber : COL.dim);
  [[L, T, pos], [L, B, !pos], [R, T, !pos], [R, B, pos]].forEach((e) => V.line(e[0][0], e[0][1], e[1][0], e[1][1], colW(e[2]), 1.2));
  diode(L, T, pos); diode(B, R, pos); diode(B, L, !pos); diode(R, T, !pos);
  V.line(T[0], T[1], 0.7, T[1], COL.paper, 1.1);
  V.line(B[0], B[1], 0.7, B[1], COL.paper, 1.1);
  V.line(0.38, T[1], 0.38, B[1], COL.cyan, 1.25);
  V.line(0.62, T[1] - 0.04, 0.62, B[1] + 0.04, COL.amber, 1.15);
  V.text("C", 0.3, T[1] + 0.06, 0.045, COL.dim);
  V.text("R", 0.66, T[1] + 0.06, 0.045, COL.dim);
  V.scope(-0.92, -0.92, 1.84, 0.4, sim.vin, COL.cyanDim, -18, 18);
  V.scope(-0.92, -0.92, 1.84, 0.4, sim.out, COL.amber, -18, 18);
  return [["VIN", vin.toFixed(1) + " V"], ["VOUT", sim.vout.toFixed(1) + " V"], ["PAIR", pos ? "LT BR" : "BL RT"]];
}

function orPoly(x, y, h, w) {
  const pts = [];
  for (let i = 0; i <= 7; i++) { const tt = -1 + (2 * i) / 7; pts.push([x + 0.04 * (1 - tt * tt), y + tt * h]); }
  for (let i = 0; i <= 7; i++) { const tt = 1 - (2 * i) / 7; pts.push([x + w * Math.sqrt(Math.max(0, 1 - tt * tt)), y + tt * h]); }
  return pts;
}
function drawAdder(V, sim, t, dt) {
  if (!sim.ready) { sim.hist = [[], [], [], [], []]; sim.acc = 0; sim.ready = true; }
  const step = Math.floor(t / 0.7) % 8;
  const A = (step >> 2) & 1, B = (step >> 1) & 1, Cin = step & 1;
  const xor1 = A ^ B, S = xor1 ^ Cin, and1 = A & B, and2 = xor1 & Cin, Cout = and1 | and2;
  if (dt > 0) {
    sim.acc += dt;
    if (sim.acc > 0.08) {
      sim.acc = 0;
      [A, B, Cin, S, Cout].forEach((bit, i) => { sim.hist[i].push(bit); if (sim.hist[i].length > 40) sim.hist[i].shift(); });
    }
  }
  const on = (bit) => (bit ? COL.amber : COL.dim);
  const yA = 0.58, yB = 0.36, yC = 0.08;
  V.line(-0.95, yA, -0.2, yA, on(A), 1.25);
  V.line(-0.95, yB, -0.2, yB, on(B), 1.25);
  V.line(-0.95, yC, 0.15, yC, on(Cin), 1.15);
  V.text("A", -0.95, yA + 0.08, 0.045, COL.dim);
  V.text("B", -0.95, yB + 0.08, 0.045, COL.dim);
  V.text("C", -0.95, yC + 0.08, 0.045, COL.dim);
  const g1 = orPoly(-0.42, 0.47, 0.14, 0.2);
  V.poly(g1.concat([g1[0]]), on(xor1), 1.25);
  V.line(-0.22, 0.47, 0.02, 0.47, on(xor1), 1.2);
  const g2 = orPoly(0.08, 0.34, 0.14, 0.2);
  V.poly(g2.concat([g2[0]]), on(S), 1.25);
  V.line(0.28, 0.34, 0.72, 0.34, on(S), 1.35);
  V.text("S", 0.76, 0.4, 0.05, COL.paper);
  function andGate(x, y, bit) {
    const col = on(bit);
    V.line(x, y - 0.09, x, y + 0.09, col, 1.2);
    V.line(x, y + 0.09, x + 0.07, y + 0.09, col, 1.2);
    V.line(x, y - 0.09, x + 0.07, y - 0.09, col, 1.2);
    let px = x + 0.07, py = y + 0.09;
    for (let i = 1; i <= 6; i++) {
      const a = -Math.PI / 2 + (Math.PI * i) / 6;
      const qx = x + 0.07 + Math.cos(a) * 0.09, qy = y + Math.sin(a) * 0.09;
      V.line(px, py, qx, qy, col, 1.2); px = qx; py = qy;
    }
  }
  andGate(-0.25, -0.18, and1);
  andGate(0.18, -0.22, and2);
  V.line(-0.55, yA, -0.55, -0.09, on(A), 1.05);
  V.line(-0.55, -0.09, -0.25, -0.09, on(A), 1.05);
  V.line(-0.48, yB, -0.48, -0.27, on(B), 1.05);
  V.line(-0.48, -0.27, -0.25, -0.27, on(B), 1.05);
  const g3 = orPoly(0.4, -0.42, 0.11, 0.18);
  V.poly(g3.concat([g3[0]]), on(Cout), 1.25);
  V.line(-0.06, -0.18, 0.42, -0.36, on(and1), 1.1);
  V.line(0.34, -0.22, 0.44, -0.36, on(and2), 1.1);
  V.line(0.58, -0.42, 0.75, -0.42, on(Cout), 1.3);
  V.text("CO", 0.62, -0.3, 0.045, COL.paper);
  const names = ["A", "B", "C", "S", "CO"];
  names.forEach((name, i) => {
    const yy = -0.78 + (4 - i) * 0.055;
    V.text(name, -0.95, yy + 0.04, 0.04, COL.dim);
    const hist = sim.hist[i];
    for (let k = 1; k < hist.length; k++) {
      const x0 = -0.55 + (1.4 * (k - 1)) / 39, x1 = -0.55 + (1.4 * k) / 39;
      const y0 = yy + hist[k - 1] * 0.035, y1 = yy + hist[k] * 0.035;
      const col = i >= 3 ? COL.amber : COL.cyan;
      V.line(x0, y0, x1, y0, col, 1.1);
      V.line(x1, y0, x1, y1, col, 1.1);
    }
  });
  return [["IN", A + "+" + B + "+" + Cin], ["OUT", (Cout ? "1" : "0") + (S ? "1" : "0")], ["SUM", String((Cout << 1) | S)]];
}

function foldFreq(f, fs) {
  let x = f / fs; x -= Math.floor(x); if (x > 0.5) x = 1 - x; return x * fs;
}
function drawNyquist(V, sim, t) {
  const f = 3, fs = 4.2 + 9.5 * (0.5 - 0.5 * Math.cos(t * 0.55)), alias = foldFreq(f, fs);
  const n = 160, cont = [];
  for (let i = 0; i <= n; i++) {
    const tt = (i / n) * 1.35;
    cont.push([-0.9 + (1.8 * i) / n, Math.sin(2 * Math.PI * f * tt) * 0.48]);
  }
  V.poly(cont, COL.cyanDim, 1.1);
  if (fs < 2 * f - 0.15) {
    const aliasPts = [];
    for (let i = 0; i <= n; i++) {
      const tt = (i / n) * 1.35;
      aliasPts.push([-0.9 + (1.8 * i) / n, Math.sin(2 * Math.PI * alias * tt) * 0.48]);
    }
    V.poly(aliasPts, COL.hot, 1.25);
  }
  const nSamp = Math.max(2, Math.floor(1.35 * fs)), samp = [];
  for (let i = 0; i <= nSamp; i++) {
    const tt = (i / nSamp) * 1.35;
    samp.push([-0.9 + (1.8 * i) / nSamp, Math.sin(2 * Math.PI * f * tt) * 0.48]);
  }
  V.poly(samp, COL.amber, 1.4);
  samp.forEach((p) => V.circ(p[0], p[1], 0.016, COL.paper, 1.15, 8));
  V.line(-0.9, 0, 0.9, 0, COL.grid, 1);
  return [["F", "3.00 HZ"], ["FS", fs.toFixed(2) + " HZ"], ["ALIAS", fs > 2 * f ? "NONE" : alias.toFixed(2) + " HZ"]];
}

function drawKalman(V, sim, t, dt) {
  if (!sim.ready) {
    sim.rand = mulberry32(16); sim.x = 0; sim.xhat = 0; sim.p = 1;
    sim.trueH = []; sim.measH = []; sim.estH = []; sim.K = 0; sim.ready = true;
  }
  const q = 0.35, r = 0.22;
  if (dt > 0) {
    const h = Math.min(dt, 0.05);
    sim.x += (-0.35 * sim.x + 0.85 * Math.sin(t * 0.8)) * h + Math.sqrt(q * h) * gauss(sim.rand) * 0.35;
    const z = sim.x + Math.sqrt(r) * gauss(sim.rand);
    sim.p += q * h;
    sim.K = sim.p / (sim.p + r);
    sim.xhat += sim.K * (z - sim.xhat);
    sim.p *= 1 - sim.K;
    sim.trueH.push(sim.x); sim.measH.push(z); sim.estH.push(sim.xhat);
    if (sim.trueH.length > 120) { sim.trueH.shift(); sim.measH.shift(); sim.estH.shift(); }
  }
  V.scope(-0.9, -0.62, 1.8, 1.15, sim.measH, COL.dim, -2.2, 2.2);
  V.scope(-0.9, -0.62, 1.8, 1.15, sim.trueH, COL.cyan, -2.2, 2.2);
  V.scope(-0.9, -0.62, 1.8, 1.15, sim.estH, COL.amber, -2.2, 2.2);
  V.text("TRUTH", -0.9, 0.68, 0.045, COL.cyan);
  V.text("MEAS", -0.35, 0.68, 0.045, COL.dim);
  V.text("EST", 0.2, 0.68, 0.045, COL.amber);
  return [["X", sim.xhat.toFixed(2)], ["K", sim.K.toFixed(2)], ["P", sim.p.toFixed(3)]];
}

const DIPOLE_MS = [
  null,
  [3, 0],
  [0, 1],
  [3, 1],
  [1, 2],
  null,
  [0, 2],
  [3, 2],
  [2, 3],
  [0, 2],
  null,
  [1, 2],
  [3, 1],
  [0, 1],
  [3, 0],
  null,
];
function dipoleColor(u, alpha) {
  // Smooth radial gradient matching reference: orange-gold -> teal/cyan -> royal blue -> indigo
  const stops = [
    [0.05, 0.98, 0.58, 0.20],
    [0.18, 0.92, 0.78, 0.30],
    [0.34, 0.26, 0.72, 0.62],
    [0.54, 0.20, 0.52, 0.80],
    [0.76, 0.24, 0.34, 0.82],
    [0.96, 0.28, 0.24, 0.68],
  ];
  let r = stops[stops.length - 1][1], g = stops[stops.length - 1][2], b = stops[stops.length - 1][3];
  if (u <= stops[0][0]) {
    r = stops[0][1]; g = stops[0][2]; b = stops[0][3];
  } else {
    for (let i = 1; i < stops.length; i++) {
      if (u <= stops[i][0]) {
        const t = (u - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
        r = stops[i - 1][1] + (stops[i][1] - stops[i - 1][1]) * t;
        g = stops[i - 1][2] + (stops[i][2] - stops[i - 1][2]) * t;
        b = stops[i - 1][3] + (stops[i][3] - stops[i - 1][3]) * t;
        break;
      }
    }
  }
  return [r, g, b, alpha];
}
function drawDipole(V, sim, t) {
  const N = 48;
  const Rmax = 0.94;
  const Rcore = 0.042;
  const lam = 0.75;
  const k = (Math.PI * 2) / lam;
  const w = 1.85;
  const Tper = (Math.PI * 2) / w;
  const wt = w * t;
  const phase = Math.cos(wt);

  if (!sim.ready) {
    const M = N + 1;
    const h = Rmax / N;
    sim.h = h;
    sim.M = M;
    sim.sin2 = new Float32Array(M * M);
    sim.invKr = new Float32Array(M * M);
    sim.cosKr = new Float32Array(M * M);
    sim.sinKr = new Float32Array(M * M);
    sim.psi = new Float32Array(M * M);
    for (let j = 0; j < M; j++) {
      const y = j * h;
      for (let i = 0; i < M; i++) {
        const x = i * h;
        const r2 = x * x + y * y;
        const r = Math.sqrt(r2);
        const idx = j * M + i;
        if (r > 1e-6) {
          const kr = k * r;
          sim.sin2[idx] = (x * x) / r2;
          sim.invKr[idx] = 1 / kr;
          sim.cosKr[idx] = Math.cos(kr);
          sim.sinKr[idx] = Math.sin(kr);
        }
      }
    }
    sim.ready = true;
  }

  const M = sim.M, h = sim.h;
  const cw = Math.cos(wt), sw = Math.sin(wt);
  const sin2 = sim.sin2, invKr = sim.invKr, cosKr = sim.cosKr, sinKr = sim.sinKr, psi = sim.psi;
  for (let p = 0; p < M * M; p++) {
    const c = cosKr[p] * cw + sinKr[p] * sw; // cos(kr - wt)
    const s = sinKr[p] * cw - cosKr[p] * sw; // sin(kr - wt)
    psi[p] = sin2[p] * (c * invKr[p] + s);
  }

  const levels = [-1.45, -1.10, -0.86, -0.70, -0.54, -0.39, -0.25, -0.11, 0.11, 0.25, 0.39, 0.54, 0.70, 0.86, 1.10, 1.45];
  const ex = [0, 0, 0, 0], ey = [0, 0, 0, 0];

  for (let j = 0; j < N; j++) {
    const y0 = j * h, y1 = y0 + h, ym = y0 + 0.5 * h;
    const row0 = j * M, row1 = row0 + M;
    for (let i = 0; i < N; i++) {
      const x0 = i * h, x1 = x0 + h, xm = x0 + 0.5 * h;
      const rm = Math.hypot(xm, ym);
      if (rm < Rcore || rm > Rmax) continue;

      const v0 = psi[row0 + i];
      const v1 = psi[row0 + i + 1];
      const v2 = psi[row1 + i + 1];
      const v3 = psi[row1 + i];

      const vmin = Math.min(v0, v1, v2, v3);
      const vmax = Math.max(v0, v1, v2, v3);
      if (vmax < levels[0] || vmin > levels[levels.length - 1]) continue;

      const u = rm / Rmax;
      // Compute physical |E| at cell midpoint for true field-strength coloring
      const krm = k * rm;
      const inv1 = 1 / krm, inv2 = inv1 * inv1, inv3 = inv2 * inv1;
      const cm = Math.cos(krm - wt), sm = Math.sin(krm - wt);
      const sinTh = xm / rm, cosTh = ym / rm;
      const Er = 2 * cosTh * (cm * inv3 + sm * inv2);
      const Eth = sinTh * (cm * inv3 + sm * inv2 - cm * inv1);
      const Emag = Math.hypot(Er, Eth);
      const uCol = Math.max(0.04, Math.min(0.96, 1.0 - Math.log(1 + Emag * 10.0) / 3.85));

      // Smooth outer fade matching reference vignette
      const fadeOut = u < 0.66 ? 1 : Math.max(0, Math.cos(((u - 0.66) / 0.34) * Math.PI * 0.5));
      const fadeIn = rm < Rcore + 0.025 ? (rm - Rcore) / 0.025 : 1;
      const alpha = (0.36 + 0.54 * (1 - 0.32 * u)) * fadeOut * fadeIn;
      if (alpha < 0.02) continue;
      const col = dipoleColor(uCol, alpha);
      const lw = 1.45 - 0.22 * u;

      for (let li = 0; li < levels.length; li++) {
        const lv = levels[li];
        if (lv < vmin || lv > vmax) continue;
        const cidx = (v0 >= lv ? 1 : 0) | (v1 >= lv ? 2 : 0) | (v2 >= lv ? 4 : 0) | (v3 >= lv ? 8 : 0);
        if (cidx === 0 || cidx === 15) continue;

        let edges;
        if (cidx === 5) {
          const vc = 0.25 * (v0 + v1 + v2 + v3);
          edges = vc >= lv ? [3, 2, 0, 1] : [3, 0, 1, 2];
        } else if (cidx === 10) {
          const vc = 0.25 * (v0 + v1 + v2 + v3);
          edges = vc >= lv ? [3, 0, 1, 2] : [3, 2, 0, 1];
        } else {
          edges = DIPOLE_MS[cidx];
        }

        // Compute only the needed edge crossings
        const d0 = v1 - v0, d1 = v2 - v1, d2 = v2 - v3, d3 = v3 - v0;
        ex[0] = x0 + (Math.abs(d0) > 1e-9 ? ((lv - v0) / d0) * h : 0.5 * h); ey[0] = y0;
        ex[1] = x1; ey[1] = y0 + (Math.abs(d1) > 1e-9 ? ((lv - v1) / d1) * h : 0.5 * h);
        ex[2] = x0 + (Math.abs(d2) > 1e-9 ? ((lv - v3) / d2) * h : 0.5 * h); ey[2] = y1;
        ex[3] = x0; ey[3] = y0 + (Math.abs(d3) > 1e-9 ? ((lv - v0) / d3) * h : 0.5 * h);

        for (let s = 0; s < edges.length; s += 2) {
          const eA = edges[s], eB = edges[s + 1];
          const ax = ex[eA], ay = ey[eA], bx = ex[eB], by = ey[eB];
          V.line(ax, ay, bx, by, col, lw);
          V.line(-ax, ay, -bx, by, col, lw);
          V.line(ax, -ay, bx, -by, col, lw);
          V.line(-ax, -ay, -bx, -by, col, lw);
        }
      }
    }
  }

  // Oscillating dipole core (+q warm orange-red, -q cool blue)
  const dy = 0.028 * phase;
  const colPos = [0.98, 0.44, 0.24, 0.95];
  const colNeg = [0.36, 0.62, 1.0, 0.95];
  V.line(0, -dy, 0, dy, [0.85, 0.85, 0.92, 0.55], 1.3);
  V.circ(0, dy, 0.019, [colPos[0], colPos[1], colPos[2], 0.45], 2.2, 14);
  V.circ(0, dy, 0.009, colPos, 2.0, 12);
  V.circ(0, -dy, 0.019, [colNeg[0], colNeg[1], colNeg[2], 0.45], 2.2, 14);
  V.circ(0, -dy, 0.009, colNeg, 2.0, 12);

  // Subtle p(t) label above axis and wavelength lambda scale bar below
  V.text("P", 0.05, 0.88, 0.042, COL.dim);
  const yBar = -0.95, halfLam = lam * 0.5;
  V.line(-halfLam, yBar, halfLam, yBar, COL.dim, 1.1);
  V.line(-halfLam, yBar - 0.02, -halfLam, yBar + 0.02, COL.dim, 1.1);
  V.line(halfLam, yBar - 0.02, halfLam, yBar + 0.02, COL.dim, 1.1);
  // Vector lambda glyph centered above scale bar
  const lx = 0, ly = yBar + 0.028, ls = 0.032;
  V.line(lx - ls * 0.35, ly + ls, lx + ls * 0.35, ly, COL.dim, 1.1);
  V.line(lx, ly + ls * 0.5, lx - ls * 0.35, ly, COL.dim, 1.1);

  return [
    ["T/T0", (t / Tper).toFixed(2)],
    ["P/P0", (phase >= 0 ? "+" : "") + phase.toFixed(2)],
    ["LAMBDA", lam.toFixed(2)],
  ];
}

const STATIONS = [
  { roman: "I", disc: "CLASSICAL MECHANICS", title: "Same start, different futures", sub: "Five double pendulums, released a thousandth of a radian apart.", formula: "d/dt (∂L/∂θ̇) = ∂L/∂θ      L = T − V", note: "A small state error does not stay small.", draw: drawPendulum },
  { roman: "II", disc: "ELECTRODYNAMICS", title: "Shake a charge and light escapes", sub: "An oscillating dipole sheds closed loops of electric field.", formula: "∇ × E = −∂B/∂t      ∇ × B = (1/c²) ∂E/∂t", note: "The shortest antenna is a driven dipole.", draw: drawDipole },
  { roman: "III", disc: "OPTICS", title: "Glass bends blue more than red", sub: "Cauchy’s formula inside a 60° prism. Blue leaves on a steeper heading.", formula: "n₁ sin θ₁ = n₂ sin θ₂      n(λ) ≈ A + B/λ²", note: "A camera lens is this prism, stacked.", draw: drawPrism },
  { roman: "IV", disc: "THERMODYNAMICS", title: "No engine beats Carnot", sub: "Two isotherms, two adiabats. The enclosed area is the work.", formula: "η = 1 − Tc/Th      dS = δQrev / T", note: "No converter of heat into work beats this.", draw: drawCarnot },
  { roman: "V", disc: "STATISTICAL MECHANICS", title: "Cool it, and order appears", sub: "A 24×24 Ising lattice. Metropolis flips. The critical point is near 2.27.", formula: "P(σ) ∝ exp(−E/kT)      E = −J Σ σᵢσⱼ", note: "Cool a noisy lattice and domains form.", draw: drawIsing },
  { roman: "VI", disc: "QUANTUM MECHANICS", title: "One electron at a time, still waves", sub: "Each lands at random, yet together they draw |ψ₁ + ψ₂|².", formula: "P(y) = |ψ₁ + ψ₂|² ≠ |ψ₁|² + |ψ₂|²      λ = h/p", note: "Detections are discrete. The pattern is not.", draw: drawSlit },
  { roman: "VII", disc: "PARTICLE MOTION", title: "Opposite charges curl opposite ways", sub: "Uniform B out of the page. Radius is momentum over charge times B.", formula: "F = q (v × B)      r = p / (|q| B)", note: "A magnetometer is this curl, read slowly.", draw: drawLorentz },
  { roman: "VIII", disc: "FLUID MECHANICS", title: "Flow past a pole sheds swirls in turn", sub: "Discrete vortices, Strouhal 0.20. The street, not a full grid solve.", formula: "∂u/∂t + (u·∇)u = −∇p/ρ + ν∇²u", note: "A mast sheds a street once the wake is unsteady.", draw: drawVortex },
  { roman: "IX", disc: "ACOUSTICS", title: "Outrun your sound and it piles up", sub: "Circles are emitted pulses. Past Mach 1 they share a cone.", formula: "sin μ = 1/M", note: "A propeller tip that outruns sound stands a shock on itself.", draw: drawMach },
  { roman: "X", disc: "SPECIAL RELATIVITY", title: "Moving clocks tick slower", sub: "A light clock at rest, and the same clock at 0.8c. The path is longer.", formula: "Δt = γ Δτ      γ = 1/√(1 − v²/c²)", note: "Navigation clocks carry this factor. It is public arithmetic.", draw: drawClock },
  { roman: "XI", disc: "GRAVITATION", title: "Mass bends light into rings", sub: "A spiral galaxy drifts behind a massive lens and wraps into an Einstein ring.", formula: "Gμν = (8πG/c⁴) Tμν   ⇒   α = 4GM / (c² b)", note: "Surface brightness is conserved. Strong lensing shears a galaxy into rings.", draw: drawRing },
  { roman: "XII", disc: "ASTRONOMY", title: "A tiny dip betrays a planet", sub: "Circle overlap on a central chord. The full dip equals the area ratio.", formula: "ΔF/F ≈ (Rp / R★)²", note: "A dark chord is enough to measure a radius.", draw: drawTransit },
  { roman: "XIII", disc: "ELECTRONICS", title: "Four diodes turn AC into DC", sub: "Ideal bridge, then a capacitor against a load. The pairs swap each half cycle.", formula: "Vripple ≈ Iload / (2 f C)", note: "Four diodes and a capacitor make a supply.", draw: drawRect },
  { roman: "XIV", disc: "DIGITAL ELECTRONICS", title: "Five logic gates can add", sub: "Two XOR, two AND, one OR. The traces underneath are the bits.", formula: "S = A ⊕ B ⊕ Cin      Cout = AB + Cin(A ⊕ B)", note: "Every adder in a small computer is this gate set.", draw: drawAdder },
  { roman: "XV", disc: "SIGNALS", title: "Sample too slowly and a false tone appears", sub: "A 3 Hz sine. The sample rate falls through twice that, and the amber line lies.", formula: "fs > 2 fmax", note: "Sample slower than twice the tone and a false tone appears.", draw: drawNyquist },
  { roman: "XVI", disc: "ESTIMATION", title: "One gain, and the noise steps back", sub: "A scalar Kalman filter. Cyan is truth, dim is the measurement, amber is the estimate.", formula: "K = P⁻/(P⁻+R)      x̂ = x̂⁻ + K(z − x̂⁻)", note: "One ranging beacon, one noise model, one gain.", draw: drawKalman },
  { roman: "XVII", disc: "GENERAL RELATIVITY", title: "Photons orbit at 1.5 Schwarzschild radii", sub: "Exact RK4 null geodesics of the Schwarzschild metric. Below b = 2.598 rs, light falls in.", formula: "d²u/dφ² + u = (3/2) rs u²      bcrit = (3√3/2) rs", note: "The photon sphere is an unstable light trap. One perturbation sends a ray home or in.", draw: drawGeodesics },
  { roman: "XVIII", disc: "BLACK HOLES", title: "A shadow framed by bent starlight", sub: "Luminet-style Schwarzschild accretion disk with Doppler beaming, secondary arch, and photon ring.", formula: "g = √(1 − 3rs/2r) / (1 + Ω b sin θ₀ cos α)      F ∝ g⁴", note: "You see both sides of the disk at once: gravity bends the far side up and over the shadow.", draw: drawBlackHole },
];

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let index = 0, sim = {}, simTime = 0, dwell = 0, paused = false, indexOpen = false;
let last = performance.now(), lastDom = 0, pointerX = null;
const el = {
  count: document.getElementById("count"),
  disc: document.getElementById("disc"),
  title: document.getElementById("title"),
  sub: document.getElementById("sub"),
  formula: document.getElementById("formula"),
  readout: document.getElementById("readout"),
  note: document.getElementById("note"),
  bar: document.getElementById("bar"),
  index: document.getElementById("index"),
  hold: document.getElementById("hold"),
};
function renderChrome() {
  const s = STATIONS[index];
  el.count.textContent = s.roman + "  ·  " + String(index + 1).padStart(2, "0");
  el.disc.textContent = s.disc;
  el.title.textContent = s.title;
  el.sub.textContent = s.sub;
  el.formula.textContent = s.formula;
  el.note.textContent = s.note;
  document.querySelectorAll(".index-row").forEach((row, i) => row.classList.toggle("on", i === index));
}
function enter(i) {
  index = (i + STATIONS.length) % STATIONS.length;
  sim = {}; simTime = 0; dwell = 0;
  renderChrome();
}
function toggleIndex(force) {
  indexOpen = force == null ? !indexOpen : force;
  el.index.classList.toggle("open", indexOpen);
  document.getElementById("idx").setAttribute("aria-pressed", indexOpen ? "true" : "false");
}
function togglePause() {
  paused = !paused;
  el.hold.textContent = paused ? "RUN" : "HOLD";
  el.hold.setAttribute("aria-pressed", paused ? "true" : "false");
}
function buildIndex() {
  const h = document.createElement("h2");
  h.textContent = "SERIES 18";
  const p = document.createElement("p");
  p.className = "lead";
  p.textContent = "Eighteen formal models. Arrows move, space holds, Esc closes. SPEC is the C99 port note.";
  el.index.append(h, p);
  STATIONS.forEach((s, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "index-row";
    const roman = document.createElement("span");
    roman.className = "roman";
    roman.textContent = s.roman;
    const body = document.createElement("span");
    const small = document.createElement("small");
    small.textContent = s.disc;
    body.append(small, document.createTextNode(s.title));
    b.append(roman, body);
    b.addEventListener("click", () => { enter(i); toggleIndex(false); });
    el.index.append(b);
  });
}
function plotBox() {
  const aspect = canvas.width / Math.max(1, canvas.height);
  const copy = document.getElementById("copy").getBoundingClientRect();
  const foot = document.getElementById("foot").getBoundingClientRect();
  const H = canvas.clientHeight || window.innerHeight;
  const topFrac = Math.min(0.62, (copy.bottom + 18) / H);
  const botFrac = Math.min(0.48, (H - foot.top + 12) / H);
  let top = 1 - 2 * topFrac;
  let bot = -1 + 2 * botFrac;
  if (top - bot < 0.3) { top = 0.2; bot = -0.5; }
  return { left: -aspect + 0.05, right: aspect - 0.05, top, bot };
}
function resize() {
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  cssH = canvas.clientHeight || window.innerHeight;
  const W = Math.max(2, Math.round((canvas.clientWidth || window.innerWidth) * dpr));
  const H = Math.max(2, Math.round(cssH * dpr));
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W; canvas.height = H;
    if (gl) gl.viewport(0, 0, W, H);
  }
}
function flush() {
  const aspect = canvas.width / Math.max(1, canvas.height);
  if (gl && prog) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(7 / 255, 8 / 255, 12 / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    gl.uniform1f(locAspect, aspect);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufGL);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 8);
    gl.bufferData(gl.ARRAY_BUFFER, fbuf.subarray(0, nv * 6), gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, nv);
  } else if (ctx2) {
    ctx2.fillStyle = "#07080c";
    ctx2.fillRect(0, 0, canvas.width, canvas.height);
    const S = (x, y) => [((x / aspect) + 1) * 0.5 * canvas.width, (1 - (y + 1) * 0.5) * canvas.height];
    for (let i = 0; i < fills.length; i += 8) {
      const a = S(fills[i], fills[i + 1]), b = S(fills[i] + fills[i + 2], fills[i + 1] + fills[i + 3]);
      ctx2.fillStyle = "rgba(" + (fills[i + 4] * 255 | 0) + "," + (fills[i + 5] * 255 | 0) + "," + (fills[i + 6] * 255 | 0) + "," + fills[i + 7] + ")";
      ctx2.fillRect(a[0], b[1], b[0] - a[0], a[1] - b[1]);
    }
  }
  nv = 0; segs.length = 0; fills.length = 0;
}
function paintReadout(rows) {
  el.readout.replaceChildren();
  (rows || []).forEach((pair) => {
    const d = document.createElement("div");
    const kk = document.createElement("span"); kk.className = "k"; kk.textContent = pair[0];
    const vv = document.createElement("span"); vv.className = "v"; vv.textContent = pair[1];
    d.append(kk, vv); el.readout.append(d);
  });
}
function frame(now) {
  const raw = Math.min(0.05, (now - last) / 1000);
  last = now;
  resize();
  let dt = paused || indexOpen ? 0 : raw;
  if (reduced) dt *= 0.2;
  simTime += dt;
  if (!paused && !indexOpen && !reduced) dwell += raw;
  if (!paused && !indexOpen && !reduced && dwell >= DWELL) enter(index + 1);
  el.bar.style.width = Math.min(100, (dwell / DWELL) * 100) + "%";
  const box = plotBox();
  CLIP = box;
  let rows = [];
  try { rows = STATIONS[index].draw(viewOf(box), sim, simTime, dt) || []; }
  catch (err) {
    const boot = document.getElementById("boot");
    boot.hidden = false; boot.textContent = err.message; console.error(err);
  }
  flush();
  if (now - lastDom > 120) { lastDom = now; paintReadout(rows); }
  requestAnimationFrame(frame);
}
document.getElementById("prev").addEventListener("click", () => enter(index - 1));
document.getElementById("next").addEventListener("click", () => enter(index + 1));
document.getElementById("hold").addEventListener("click", togglePause);
document.getElementById("idx").addEventListener("click", () => toggleIndex());
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") { enter(index + 1); e.preventDefault(); }
  else if (e.key === "ArrowLeft") { enter(index - 1); e.preventDefault(); }
  else if (e.key === " ") { togglePause(); e.preventDefault(); }
  else if (e.key === "i" || e.key === "I") toggleIndex();
  else if (e.key === "Escape") toggleIndex(false);
});
window.addEventListener("pointerdown", (e) => { if (!e.target.closest("button, a, nav")) pointerX = e.clientX; });
window.addEventListener("pointerup", (e) => {
  if (pointerX == null) return;
  const dx = e.clientX - pointerX; pointerX = null;
  if (e.target.closest("button, a, nav")) return;
  if (Math.abs(dx) > 48) enter(index + (dx < 0 ? 1 : -1));
});
buildIndex();
renderChrome();
requestAnimationFrame(frame);
