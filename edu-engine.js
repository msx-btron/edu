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

function nPrism(lam) { return 1.56 + 0.044 / (lam * lam); }
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
    if (t > 1e-4 && u >= 0.02 && u <= 0.98) return { p: [p[0] + t * rx, p[1] + t * ry], S, E };
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
  return { hit1: h1.p, hit2: h2.p, dirOut: left, inc: entered[2], nrm1: nrm, A, B, C };
}
function spectralColor(lam) {
  // Continuous visible spectrum 0.39..0.69 um: violet -> indigo -> blue -> cyan -> green -> yellow -> orange -> red
  const u = Math.max(0, Math.min(1, (lam - 0.39) / 0.30));
  const stops = [
    [0.00, 0.48, 0.14, 0.95],
    [0.18, 0.18, 0.36, 1.00],
    [0.36, 0.12, 0.82, 0.96],
    [0.54, 0.20, 0.94, 0.36],
    [0.70, 0.98, 0.92, 0.18],
    [0.84, 1.00, 0.52, 0.12],
    [1.00, 0.96, 0.16, 0.14],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (u <= stops[i][0]) {
      const f = (u - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      return [
        stops[i - 1][1] + (stops[i][1] - stops[i - 1][1]) * f,
        stops[i - 1][2] + (stops[i][2] - stops[i - 1][2]) * f,
        stops[i - 1][3] + (stops[i][3] - stops[i - 1][3]) * f,
        0.92,
      ];
    }
  }
  return [0.96, 0.16, 0.14, 0.92];
}
function drawPrism(V, sim, t) {
  // Subtle viewport rotation/sweep of incident angle so the wide rainbow fan breathes dynamically
  const inc = 34 + 2.5 * Math.sin(t * 0.6);
  const aim = 0.54;
  const rot = 0.22 + 0.03 * Math.sin(t * 0.45); // rotated viewport framing for wide horizontal rainbow sweep
  const cr = Math.cos(rot), sr = Math.sin(rot);
  const geo = tracePrism(inc, nPrism(0.55), aim);
  if (!geo) return [["FAN", "TIR"]];

  const sc = 0.72;
  const M = (p) => {
    const x = (p[0] - 0.18) * sc, y = (p[1] - 0.42) * sc + 0.08;
    return [x * cr - y * sr - 0.16, x * sr + y * cr];
  };
  const A = M(geo.A), B = M(geo.B), C = M(geo.C);

  // Translucent flint glass prism interior shading
  for (let k = 1; k < 14; k++) {
    const f = k / 14;
    const lx = B[0] + (A[0] - B[0]) * f, ly = B[1] + (A[1] - B[1]) * f;
    const rx = C[0] + (A[0] - C[0]) * f, ry = C[1] + (A[1] - C[1]) * f;
    V.line(lx, ly, rx, ry, [0.46, 0.54, 0.66, 0.08], 3.2);
  }
  V.poly([A, B, C, A], [0.76, 0.80, 0.86, 0.75], 1.5);
  V.text("N " + nPrism(0.55).toFixed(2), (A[0] + B[0] + C[0]) / 3 - 0.13, (A[1] + B[1] + C[1]) / 3 - 0.04, 0.044, COL.dim);

  // Entrance face normal & theta1 cue
  const hit1M = M(geo.hit1);
  const n1x = geo.nrm1[0] * cr - geo.nrm1[1] * sr;
  const n1y = geo.nrm1[0] * sr + geo.nrm1[1] * cr;
  V.line(hit1M[0], hit1M[1], hit1M[0] + n1x * 0.24, hit1M[1] + n1y * 0.24, COL.grid, 1.0);
  V.text("T1", hit1M[0] + n1x * 0.27 - 0.04, hit1M[1] + n1y * 0.27 + 0.04, 0.036, COL.dim);

  // Incident white light beam + animated photon pulses
  const inRad = (inc * Math.PI) / 180 + rot;
  const inStart = [hit1M[0] - Math.cos(inRad) * 0.85, hit1M[1] - Math.sin(inRad) * 0.85];
  V.line(inStart[0], inStart[1], hit1M[0], hit1M[1], [0.95, 0.96, 1.0, 0.35], 4.2);
  V.line(inStart[0], inStart[1], hit1M[0], hit1M[1], [1.0, 1.0, 1.0, 0.95], 1.9);
  for (let p = 0; p < 3; p++) {
    const u = (t * 0.55 + p / 3) % 1;
    const px = inStart[0] + (hit1M[0] - inStart[0]) * u;
    const py = inStart[1] + (hit1M[1] - inStart[1]) * u;
    V.circ(px, py, 0.015, [1.0, 1.0, 1.0, 0.92], 2.0, 8);
  }

  // Wide continuous rainbow spectrum (28 spectral rays from 390nm violet to 690nm red)
  let blue = null, red = null, theta1 = geo.inc;
  const NRAY = 28;
  for (let i = 0; i < NRAY; i++) {
    const lam = 0.39 + (0.30 * i) / (NRAY - 1);
    const g = tracePrism(inc, nPrism(lam), aim);
    if (!g) continue;
    const p1 = M(g.hit1), p2 = M(g.hit2), col = spectralColor(lam);
    // Internal refracted ray (soft white->spectral blend)
    V.line(p1[0], p1[1], p2[0], p2[1], [0.75 + 0.25 * col[0], 0.75 + 0.25 * col[1], 0.75 + 0.25 * col[2], 0.24], 1.6);
    // Exiting rainbow ray (glow + crisp spectral core)
    const ang = Math.atan2(g.dirOut[1], g.dirOut[0]) + rot;
    const len = 1.35;
    const ex = p2[0] + Math.cos(ang) * len, ey = p2[1] + Math.sin(ang) * len;
    V.line(p2[0], p2[1], ex, ey, [col[0], col[1], col[2], 0.26], 4.0);
    V.line(p2[0], p2[1], ex, ey, [col[0], col[1], col[2], 0.85], 1.65);
    if (i === 0) blue = ang;
    if (i === NRAY - 1) red = ang;
    if (i === (NRAY >> 1)) theta1 = g.inc;
  }

  // Spectrum legend bar at bottom
  for (let i = 0; i < 24; i++) {
    const lam = 0.39 + (0.30 * i) / 23;
    const col = spectralColor(lam);
    const sx = -0.36 + (0.72 * i) / 24;
    V.fill(sx, -0.84, 0.72 / 24 + 0.002, 0.022, [col[0], col[1], col[2], 0.85]);
  }
  V.text("390 NM", -0.56, -0.81, 0.032, COL.dim);
  V.text("690 NM", 0.38, -0.81, 0.032, COL.dim);

  const fan = blue != null && red != null ? (Math.abs(blue - red) * 180) / Math.PI : 0;
  return [["THETA 1", ((theta1 * 180) / Math.PI).toFixed(1) + " DEG"], ["FAN", fan.toFixed(1) + " DEG"], ["GLASS", "FLINT SF11"]];
}

function carnotTempColor(T) {
  // Smooth thermal color: 300K cobalt blue -> 400K emerald/yellow -> 500K hot red-orange
  const u = Math.max(0, Math.min(1, (T - 300) / 200));
  const stops = [
    [0.0, 0.22, 0.44, 0.98],
    [0.35, 0.18, 0.78, 0.66],
    [0.68, 0.94, 0.78, 0.22],
    [1.0, 0.96, 0.30, 0.18],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (u <= stops[i][0]) {
      const f = (u - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      return [
        stops[i - 1][1] + (stops[i][1] - stops[i - 1][1]) * f,
        stops[i - 1][2] + (stops[i][2] - stops[i - 1][2]) * f,
        stops[i - 1][3] + (stops[i][3] - stops[i - 1][3]) * f,
        0.95,
      ];
    }
  }
  return [0.96, 0.30, 0.18, 0.95];
}
function drawCarnot(V, sim, t, dt) {
  const Th = 500, Tc = 300, gamma = 1.4, V1 = 1.0, V2 = 2.0, R = 8.314;
  const ratio = Math.pow(Th / Tc, 1 / (gamma - 1)); // ~3.58
  const V3 = V2 * ratio, V4 = V1 * ratio;
  const Wtot = (R * (Th - Tc) * Math.log(V2 / V1)) / 1000;
  const P = (T, Vv) => (R * T) / Vv;

  function curve(T0, Va, Vb, adiabat) {
    const pts = [];
    for (let i = 0; i <= 32; i++) {
      const u = i / 32, Vv = Va + (Vb - Va) * u;
      const T = adiabat ? (T0 * Math.pow(Va, gamma - 1)) / Math.pow(Vv, gamma - 1) : T0;
      pts.push([Vv, P(T, Vv), T]);
    }
    return pts;
  }
  const legs = [curve(Th, V1, V2, false), curve(Th, V2, V3, true), curve(Tc, V3, V4, false), curve(Tc, V4, V1, true)];
  const pMax = P(Th, V1);

  // Linear P-V diagram on left (true curved isotherms & adiabats!)
  const x0 = -0.92, y0 = -0.62, w = 1.24, h = 1.32;
  const X = (v) => x0 + ((v - 0.5) / (V3 - 0.1)) * w;
  const Y = (p) => y0 + (p / (pMax * 1.06)) * h;
  V.line(x0, y0, x0 + w, y0, COL.dim, 1.15);
  V.line(x0, y0, x0, y0 + h, COL.dim, 1.15);
  V.text("V", x0 + w + 0.02, y0 + 0.02, 0.044, COL.dim);
  V.text("P", x0 - 0.06, y0 + h + 0.03, 0.044, COL.dim);

  // Shade enclosed Carnot work area between upper (A->B->C) and lower (A->D->C) boundaries
  const nShade = 44;
  for (let i = 0; i <= nShade; i++) {
    const v = V1 + ((V3 - V1) * i) / nShade;
    const pTop = v <= V2 ? P(Th, v) : P((Th * Math.pow(V2, gamma - 1)) / Math.pow(v, gamma - 1), v);
    const pBot = v <= V4 ? P((Tc * Math.pow(V4, gamma - 1)) / Math.pow(v, gamma - 1), v) : P(Tc, v);
    if (pTop > pBot) {
      V.line(X(v), Y(pBot), X(v), Y(pTop), [0.88, 0.44, 0.24, 0.16], 3.4);
    }
  }

  // Draw the 4 temperature-colored curved legs
  legs.forEach((leg) => {
    for (let i = 1; i < leg.length; i++) {
      const c = carnotTempColor(0.5 * (leg[i - 1][2] + leg[i][2]));
      V.line(X(leg[i - 1][0]), Y(leg[i - 1][1]), X(leg[i][0]), Y(leg[i][1]), [c[0], c[1], c[2], 0.32], 3.4);
      V.line(X(leg[i - 1][0]), Y(leg[i - 1][1]), X(leg[i][0]), Y(leg[i][1]), c, 1.65);
    }
  });
  // Corner state labels A, B, C, D & isotherm labels
  const corners = [[V1, P(Th, V1), "A", -0.07, 0.04], [V2, P(Th, V2), "B", 0.03, 0.05], [V3, P(Tc, V3), "C", 0.03, 0.03], [V4, P(Tc, V4), "D", -0.07, -0.01]];
  corners.forEach((c) => {
    V.circ(X(c[0]), Y(c[1]), 0.013, COL.paper, 1.6, 8);
    V.text(c[2], X(c[0]) + c[3], Y(c[1]) + c[4], 0.04, COL.paper);
  });
  V.text("500K", X(V2 * 1.45), Y(P(Th, V2 * 1.45)) + 0.06, 0.034, [0.96, 0.36, 0.24, 0.85]);
  V.text("300K", X(V4 * 1.15), Y(P(Tc, V4 * 1.15)) - 0.06, 0.034, [0.34, 0.62, 0.98, 0.85]);

  // Moving state bead along the 4 legs
  const u = (t * 0.18) % 1, li = Math.min(3, (u * 4) | 0), leg = legs[li];
  const fLeg = (u * 4) % 1;
  const i0 = Math.min(leg.length - 2, (fLeg * (leg.length - 1)) | 0);
  const fSub = fLeg * (leg.length - 1) - i0;
  const bv = leg[i0][0] + (leg[i0 + 1][0] - leg[i0][0]) * fSub;
  const bp = leg[i0][1] + (leg[i0 + 1][1] - leg[i0][1]) * fSub;
  const bT = leg[i0][2] + (leg[i0 + 1][2] - leg[i0][2]) * fSub;
  const bCol = carnotTempColor(bT);
  V.circ(X(bv), Y(bp), 0.032, [bCol[0], bCol[1], bCol[2], 0.42], 2.5, 14);
  V.circ(X(bv), Y(bp), 0.015, [1.0, 0.98, 0.86, 0.98], 2.0, 10);

  // Vertical cylinder + moving piston + rod on right
  const cx = 0.50, cy = -0.58, cw = 0.36, chMax = 1.18;
  const vFrac = (bv - V1) / (V3 - V1);
  const gasH = 0.22 + 0.72 * vFrac;
  V.line(cx, cy, cx, cy + chMax, COL.dim, 1.3);
  V.line(cx + cw, cy, cx + cw, cy + chMax, COL.dim, 1.3);
  V.line(cx, cy, cx + cw, cy, COL.dim, 1.4);
  // Translucent gas chamber tint
  V.fill(cx + 0.01, cy + 0.01, cw - 0.02, gasH - 0.02, [bCol[0], bCol[1], bCol[2], 0.14]);
  // Piston head & vertical connecting rod
  V.fill(cx + 0.008, cy + gasH, cw - 0.016, 0.042, [0.76, 0.78, 0.82, 0.85]);
  V.line(cx + cw * 0.5, cy + gasH + 0.042, cx + cw * 0.5, cy + chMax + 0.08, [0.70, 0.72, 0.76, 0.75], 3.2);
  // Thermal reservoir base indicator
  const resCol = li === 0 ? [0.95, 0.30, 0.18, 0.65] : li === 2 ? [0.24, 0.48, 0.96, 0.65] : [0.46, 0.50, 0.56, 0.35];
  V.fill(cx - 0.01, cy - 0.08, cw + 0.02, 0.055, resCol);
  V.text(li === 0 ? "HOT 500K" : li === 2 ? "COLD 300K" : "INSULATED", cx + 0.01, cy - 0.11, 0.032, COL.dim);

  // Kinetic gas particles inside chamber
  if (!sim.dots) {
    const rand = mulberry32(4);
    sim.dots = [];
    for (let i = 0; i < 36; i++) sim.dots.push([rand(), rand(), rand() * 2 - 1, rand() * 2 - 1]);
  }
  const spd = 0.45 * Math.sqrt(bT / 300);
  sim.dots.forEach((d) => {
    if (dt > 0) {
      d[0] += d[2] * spd * dt; d[1] += d[3] * spd * dt;
      if (d[0] < 0.04 || d[0] > 0.96) { d[2] = -d[2]; d[0] = Math.max(0.04, Math.min(0.96, d[0])); }
      if (d[1] < 0.04 || d[1] > 0.96) { d[3] = -d[3]; d[1] = Math.max(0.04, Math.min(0.96, d[1])); }
    }
    V.fill(cx + 0.02 + d[0] * (cw - 0.04), cy + 0.02 + d[1] * (gasH - 0.04), 0.012, 0.012, bCol);
  });

  return [["T", bT.toFixed(0) + " K"], ["ETA", (1 - Tc / Th).toFixed(3)], ["W", "+" + Wtot.toFixed(2) + " KJ"]];
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

function integrateBubbleTrack(x0, y0, th0, p0, q, dEdx, B, cmScale) {
  // Exact RK4 Lorentz curvature + Bethe-Bloch ionization energy loss:
  // r(cm) = p(MeV/c) / (3.0 * B), dtheta/ds = -q / r, dp/ds = -dEdx
  // B points out of page (+z): q=+1 (e+) curves CW (dth < 0), q=-1 (e-) curves CCW (dth > 0)
  const pts = [[x0, y0, th0, p0, 0]];
  let x = x0, y = y0, th = th0, p = p0, s = 0;
  const maxSteps = 420;
  for (let i = 0; i < maxSteps; i++) {
    if (p <= 0.55) break;
    const rCm = p / (3.0 * B);
    // Fine angular step (<= 0.065 rad ≈ 3.7°) so every spiral is mathematically smooth
    const dsCm = Math.min(0.24, Math.max(0.018, rCm * 0.065));
    const dsW = dsCm * cmScale;

    // RK4 step in (x, y, th, p) with respect to arc length s
    const k1th = (-q * 3.0 * B) / p;
    const k1x = Math.cos(th), k1y = Math.sin(th);

    const p2 = Math.max(0.45, p - 0.5 * dEdx * dsCm);
    const th2 = th + 0.5 * dsCm * k1th;
    const k2th = (-q * 3.0 * B) / p2;
    const k2x = Math.cos(th2), k2y = Math.sin(th2);

    const th3 = th + 0.5 * dsCm * k2th;
    const k3th = (-q * 3.0 * B) / p2;
    const k3x = Math.cos(th3), k3y = Math.sin(th3);

    const p4 = Math.max(0.45, p - dEdx * dsCm);
    const th4 = th + dsCm * k3th;
    const k4th = (-q * 3.0 * B) / p4;
    const k4x = Math.cos(th4), k4y = Math.sin(th4);

    x += (dsW / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    y += (dsW / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
    th += (dsCm / 6) * (k1th + 2 * k2th + 2 * k3th + k4th);
    p = p4;
    s += dsCm;
    pts.push([x, y, th, p, s]);
    if (Math.abs(x) > 1.25 || Math.abs(y) > 1.15) break;
  }
  return { q, p0, pts, sTotal: s };
}
function drawLorentz(V, sim, t) {
  const B = 1.5;          // Tesla, out of page (+z)
  const dEdx = 0.5;       // MeV/cm ionization energy loss
  const cmScale = 0.088;  // world units per cm (3.60 cm -> 0.317 world units)
  const cyc = t % 10.5;   // 10.5s clean bubble-chamber cycle

  if (!sim.ready) {
    // Background high-momentum beam tracks (huge radius of curvature, faint)
    sim.beams = [
      { y: 0.70, curve: -0.04 },
      { y: 0.48, curve: -0.05 },
      { y: -0.58, curve: -0.04 },
      { y: -0.78, curve: -0.03 },
    ];

    // Sweeping high-energy positive track (e.g. pion/positron, p0 = 56 MeV/c)
    // Integrated first so knock-on delta-ray electrons spawn EXACTLY on its trajectory!
    const sweep = integrateBubbleTrack(-0.96, 0.46, -0.28, 56.0, 1, 0.08, B, cmScale);
    sweep.t0 = 0.15;
    sweep.speed = 7.4;

    // Sample 3 exact points along the sweeping track for knock-on delta-ray electrons (q = -1)
    const deltas = [0.24, 0.50, 0.74].map((frac, di) => {
      const idx = Math.min(sweep.pts.length - 1, Math.floor(frac * (sweep.pts.length - 1)));
      const pt = sweep.pts[idx];
      const pDelta = [2.4, 3.0, 2.7][di];
      const tr = integrateBubbleTrack(pt[0], pt[1], pt[2] + 0.32, pDelta, -1, dEdx, B, cmScale);
      tr.t0 = sweep.t0 + pt[4] / sweep.speed; // exact instant parent passes this point
      tr.speed = 5.6;
      tr.delta = true;
      return tr;
    });

    // Primary pair production: neutral gamma from (-0.98, 0.04) -> vertex (-0.18, -0.04)
    // Heading of gamma: atan2(-0.08, 0.80) ≈ -0.10 rad; both e- and e+ launch tangent (smooth cusp!)
    const g1Th = Math.atan2(-0.08, 0.80);
    const e1Neg = integrateBubbleTrack(-0.18, -0.04, g1Th + 0.015, 19.6, -1, dEdx, B, cmScale);
    e1Neg.t0 = 0.35; e1Neg.speed = 6.6; e1Neg.main = true;
    const e1Pos = integrateBubbleTrack(-0.18, -0.04, g1Th - 0.015, 11.4, 1, dEdx, B, cmScale);
    e1Pos.t0 = 0.35; e1Pos.speed = 6.6;

    // Secondary pair production: neutral gamma from (-0.98, -0.22) -> vertex (0.42, -0.42)
    const g2Th = Math.atan2(-0.20, 1.40);
    const e2Neg = integrateBubbleTrack(0.42, -0.42, g2Th + 0.015, 6.2, -1, dEdx, B, cmScale);
    e2Neg.t0 = 2.6; e2Neg.speed = 6.0;
    const e2Pos = integrateBubbleTrack(0.42, -0.42, g2Th - 0.015, 9.4, 1, dEdx, B, cmScale);
    e2Pos.t0 = 2.6; e2Pos.speed = 6.0;

    // Ambient low-energy Compton electron micro-spirals
    const compton = [
      { x: 0.72, y: 0.34, th: 0.2, p0: 1.9, t0: 0.9 },
      { x: -0.70, y: -0.38, th: -0.1, p0: 2.1, t0: 1.8 },
      { x: 0.80, y: -0.06, th: 0.8, p0: 1.7, t0: 3.1 },
    ].map((c) => {
      const tr = integrateBubbleTrack(c.x, c.y, c.th, c.p0, -1, dEdx, B, cmScale);
      tr.t0 = c.t0; tr.speed = 4.6; tr.delta = true;
      return tr;
    });

    sim.tracks = [e1Neg, e1Pos, sweep, ...deltas, e2Neg, e2Pos, ...compton];
    sim.ready = true;
  }

  // 1. Faint background high-momentum beam tracks
  for (let i = 0; i < sim.beams.length; i++) {
    const bm = sim.beams[i];
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const u = k / 24;
      pts.push([-0.98 + u * 1.96, bm.y + bm.curve * u * u]);
    }
    V.poly(pts, [0.80, 0.82, 0.86, 0.13], 0.9);
  }

  // 2. Dashed neutral gamma rays leading to the two pair-production vertices
  function drawGamma(x0, y0, x1, y1, prog) {
    const nDash = 20;
    for (let i = 0; i < nDash; i++) {
      const u0 = i / nDash, u1 = (i + 0.42) / nDash;
      if (u0 > prog) break;
      const e1 = Math.min(u1, prog);
      V.line(x0 + (x1 - x0) * u0, y0 + (y1 - y0) * u0, x0 + (x1 - x0) * e1, y0 + (y1 - y0) * e1, [0.86, 0.84, 0.80, 0.22], 0.9);
    }
  }
  drawGamma(-0.98, 0.04, -0.18, -0.04, Math.min(1, cyc / 0.35));
  if (cyc > 1.8) drawGamma(-0.98, -0.22, 0.42, -0.42, Math.min(1, (cyc - 1.8) / 0.8));
  V.text("G", -0.64, 0.06, 0.036, COL.dim);
  if (cyc > 2.1) V.text("G", -0.36, -0.27, 0.036, COL.dim);

  // 3. Physically smooth bubble-chamber spiral tracks (zero jitter)
  let mainP = 19.6, mainR = 19.6 / (3.0 * B);
  for (let ti = 0; ti < sim.tracks.length; ti++) {
    const tr = sim.tracks[ti];
    if (cyc < tr.t0) continue;
    const sNow = (cyc - tr.t0) * tr.speed;
    const pts = tr.pts;
    const isNeg = tr.q < 0;
    const colTrail = isNeg ? [0.38, 0.78, 0.98, 0.68] : [0.96, 0.54, 0.24, 0.70];
    const colGlow = isNeg ? [0.22, 0.56, 0.92, 0.26] : [0.92, 0.38, 0.16, 0.28];
    const colHead = isNeg ? [0.84, 0.97, 1.0, 0.96] : [1.0, 0.88, 0.58, 0.96];

    let headX = pts[0][0], headY = pts[0][1], headP = pts[0][3], active = false;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1], p1 = pts[i];
      if (p0[4] > sNow) break;
      let ex = p1[0], ey = p1[1];
      if (p1[4] > sNow) {
        const f = (sNow - p0[4]) / ((p1[4] - p0[4]) || 1e-6);
        ex = p0[0] + (p1[0] - p0[0]) * f;
        ey = p0[1] + (p1[1] - p0[1]) * f;
        headP = p0[3] + (p1[3] - p0[3]) * f;
        headX = ex; headY = ey; active = true;
      } else {
        headX = p1[0]; headY = p1[1]; headP = p1[3];
      }
      const ageFade = active ? 1.0 : Math.max(0.45, 1.0 - (sNow - p1[4]) * 0.010);
      V.line(p0[0], p0[1], ex, ey, [colGlow[0], colGlow[1], colGlow[2], colGlow[3] * ageFade], 2.4);
      V.line(p0[0], p0[1], ex, ey, [colTrail[0], colTrail[1], colTrail[2], colTrail[3] * ageFade], 1.15);
      // Crisp ionization bubble beads placed directly along the exact trajectory
      if (i % 5 === 0) {
        V.fill(ex - 0.0035, ey - 0.0035, 0.007, 0.007, [colHead[0], colHead[1], colHead[2], 0.42 * ageFade]);
      }
    }

    if (tr.main) {
      mainP = headP;
      mainR = headP / (3.0 * B);
    }

    const headR = active ? 0.015 : (tr.delta ? 0.010 : 0.012);
    V.circ(headX, headY, headR * 1.45, [colTrail[0], colTrail[1], colTrail[2], active ? 0.55 : 0.35], 1.8, 12);
    V.circ(headX, headY, headR * 0.65, colHead, 1.8, 10);
  }

  // 4. B out-of-page symbol (top right) & charge labels
  V.text("B", 0.74, 0.78, 0.042, COL.dim);
  V.circ(0.84, 0.76, 0.024, COL.dim, 1.1, 16);
  V.fill(0.836, 0.756, 0.008, 0.008, COL.paper);
  if (cyc > 0.7) {
    V.text("E-", 0.04, 0.09, 0.036, [0.46, 0.82, 1.0, 0.72]);
    V.text("E+", -0.02, -0.15, 0.036, [0.98, 0.62, 0.34, 0.72]);
  }

  return [["P", mainP.toFixed(1) + " MEV/C"], ["R", mainR.toFixed(2) + " CM"], ["B", "1.5 T OUT"]];
}

// D2Q9 Lattice Boltzmann Navier-Stokes solver for von Kármán vortex street (Re = 126)
const LBM_EX = [0, 1, 0, -1, 0, 1, -1, -1, 1];
const LBM_EY = [0, 0, 1, 0, -1, 1, 1, -1, -1];
const LBM_W = [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36];
const LBM_OPP = [0, 3, 4, 1, 2, 7, 8, 5, 6];
const LBM_FLIPY = [0, 1, 4, 3, 2, 8, 7, 6, 5];

function lbmStep(sim, perturb) {
  const { NX, NY, f, fn, solid, ux, uy, U0, omega } = sim;
  const N = NX * NY;
  // 1. Collision + macroscopic velocity computation
  for (let y = 0; y < NY; y++) {
    const row = y * NX;
    for (let x = 0; x < NX; x++) {
      const idx = row + x;
      if (solid[idx]) continue;
      const o = idx * 9;
      let rho = 0, vx = 0, vy = 0;
      for (let k = 0; k < 9; k++) {
        const fk = f[o + k];
        rho += fk;
        vx += fk * LBM_EX[k];
        vy += fk * LBM_EY[k];
      }
      if (rho < 1e-4) rho = 1;
      vx /= rho; vy /= rho;
      if (x === 0) {
        rho = 1.0;
        vx = U0;
        vy = perturb ? 0.012 * Math.sin((2 * Math.PI * y) / NY) : 0;
      }
      ux[idx] = vx; uy[idx] = vy;
      const u2 = 1.5 * (vx * vx + vy * vy);
      for (let k = 0; k < 9; k++) {
        const eu = LBM_EX[k] * vx + LBM_EY[k] * vy;
        const feq = LBM_W[k] * rho * (1 + 3 * eu + 4.5 * eu * eu - u2);
        f[o + k] = x === 0 ? feq : f[o + k] + omega * (feq - f[o + k]);
      }
    }
  }
  // 2. Streaming with bounce-back on cylinder & top/bottom walls
  for (let y = 0; y < NY; y++) {
    const row = y * NX;
    for (let x = 0; x < NX; x++) {
      const idx = row + x;
      if (solid[idx]) continue;
      const o = idx * 9;
      for (let k = 0; k < 9; k++) {
        const nx = x + LBM_EX[k], ny = y + LBM_EY[k];
        if (ny < 0 || ny >= NY) {
          fn[o + LBM_FLIPY[k]] = f[o + k];
        } else if (nx < 0 || nx >= NX) {
          // Inlet/outlet handled below
        } else {
          const nidx = ny * NX + nx;
          if (solid[nidx]) fn[o + LBM_OPP[k]] = f[o + k];
          else fn[nidx * 9 + k] = f[o + k];
        }
      }
    }
  }
  // 3. Open outlet (zero gradient at x = NX - 1) & inlet refill at x = 0
  for (let y = 0; y < NY; y++) {
    const oOut = (y * NX + (NX - 1)) * 9;
    const oPrev = (y * NX + (NX - 2)) * 9;
    for (let k = 0; k < 9; k++) fn[oOut + k] = fn[oPrev + k];
    const oIn = (y * NX) * 9;
    const u2 = 1.5 * U0 * U0;
    for (let k = 0; k < 9; k++) {
      const eu = LBM_EX[k] * U0;
      fn[oIn + k] = LBM_W[k] * (1 + 3 * eu + 4.5 * eu * eu - u2);
    }
  }
  sim.f = fn;
  sim.fn = f;
  sim.step++;
}

function drawVortex(V, sim, t, dt) {
  const NX = 132, NY = 44;
  const cx = 26, cy = 22, R = 5.6;
  const U0 = 0.125;
  const nu = (U0 * (2 * R)) / 140; // Re ~ 126-140 crisp shedding
  const omega = 1 / (3 * nu + 0.5);

  if (!sim.ready) {
    sim.NX = NX; sim.NY = NY; sim.U0 = U0; sim.omega = omega; sim.step = 0;
    sim.f = new Float32Array(NX * NY * 9);
    sim.fn = new Float32Array(NX * NY * 9);
    sim.ux = new Float32Array(NX * NY);
    sim.uy = new Float32Array(NX * NY);
    sim.solid = new Uint8Array(NX * NY);
    sim.probe = [];
    const u2 = 1.5 * U0 * U0;
    for (let y = 0; y < NY; y++) {
      for (let x = 0; x < NX; x++) {
        const idx = y * NX + x;
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= R * R) sim.solid[idx] = 1;
        const o = idx * 9;
        for (let k = 0; k < 9; k++) {
          const eu = LBM_EX[k] * U0;
          sim.f[o + k] = LBM_W[k] * (1 + 3 * eu + 4.5 * eu * eu - u2);
        }
      }
    }
    // Pre-warm LBM until von Kármán vortex street is fully developed & periodically shedding
    const probeIdx = cy * NX + (cx + 30);
    for (let s = 0; s < 1450; s++) {
      lbmStep(sim, s < 140);
      if (s > 650 && s % 8 === 0) {
        sim.probe.push(sim.uy[probeIdx] / U0);
        if (sim.probe.length > 100) sim.probe.shift();
      }
    }
    sim.ready = true;
  }

  const probeX = cx + 30, probeY = cy;
  const probeIdx = probeY * NX + probeX;
  if (dt > 0) {
    const sub = Math.max(1, Math.min(8, Math.round(dt * 380)));
    for (let s = 0; s < sub; s++) lbmStep(sim, false);
    sim.probe.push(sim.uy[probeIdx] / U0);
    if (sim.probe.length > 100) sim.probe.shift();
  }

  // Channel geometry in world coordinates
  const x0 = -0.92, y0 = -0.02, chW = 1.84, chH = chW * (NY / NX);
  const cellW = chW / NX, cellH = chH / NY;

  // 1. Render vorticity field (curl = duy/dx - dux/dy): blue (CW, -) vs glowing orange-amber (CCW, +)
  const ux = sim.ux, uy = sim.uy, solid = sim.solid;
  for (let y = 1; y < NY - 1; y++) {
    const row = y * NX;
    // Softly attenuate wall shear layer right against top/bottom walls so the central street pops
    const wallAtten = (y < 4 ? y / 4 : (y > NY - 5 ? (NY - 1 - y) / 4 : 1));
    for (let x = 1; x < NX - 1; x++) {
      const idx = row + x;
      if (solid[idx]) {
        V.fill(x0 + x * cellW, y0 + y * cellH, cellW * 1.12, cellH * 1.12, [0.84, 0.84, 0.86, 0.95]);
        continue;
      }
      const curl = (uy[idx + 1] - uy[idx - 1]) - (ux[idx + NX] - ux[idx - NX]);
      const mag = Math.abs(curl) * 14.5 * (0.35 + 0.65 * wallAtten);
      if (mag < 0.08) continue;
      const m = Math.min(1, Math.pow(mag, 0.82));
      const a = Math.min(0.94, m * 0.94);
      const col = curl > 0
        ? [0.96 + 0.04 * m, 0.32 + 0.52 * m * m, 0.08 + 0.30 * m * m * m, a]
        : [0.10 + 0.28 * m * m, 0.34 + 0.48 * m, 0.95 + 0.05 * m, a];
      V.fill(x0 + x * cellW, y0 + y * cellH, cellW * 1.1, cellH * 1.1, col);
    }
  }

  // 2. Channel frame, inlet velocity arrows (U ->), solid cylinder outline, and wake probe
  V.line(x0, y0, x0 + chW, y0, COL.grid, 1.0);
  V.line(x0, y0 + chH, x0 + chW, y0 + chH, COL.grid, 1.0);
  V.line(x0, y0, x0, y0 + chH, COL.grid, 1.0);
  V.line(x0 + chW, y0, x0 + chW, y0 + chH, COL.grid, 1.0);
  for (let k = 0; k < 4; k++) {
    const ay = y0 + chH * (0.2 + 0.2 * k);
    V.line(x0 - 0.07, ay, x0 - 0.015, ay, COL.dim, 1.0);
    V.line(x0 - 0.03, ay + 0.012, x0 - 0.015, ay, COL.dim, 1.0);
    V.line(x0 - 0.03, ay - 0.012, x0 - 0.015, ay, COL.dim, 1.0);
  }
  V.text("U", x0 - 0.06, y0 + chH + 0.06, 0.04, COL.dim);

  const poleX = x0 + (cx + 0.5) * cellW, poleY = y0 + (cy + 0.5) * cellH, poleR = R * cellW;
  V.circ(poleX, poleY, poleR, [0.92, 0.92, 0.94, 0.95], 1.8, 28);
  const pxW = x0 + (probeX + 0.5) * cellW, pyW = y0 + (probeY + 0.5) * cellH;
  V.circ(pxW, pyW, 0.015, COL.paper, 1.1, 12);

  // 3. Wake probe oscilloscope (v / U) below channel
  const scX = -0.92, scY = -0.82, scW = 1.84, scH = 0.58;
  V.text("WAKE PROBE  V / U", scX, scY + scH + 0.06, 0.036, COL.dim);
  V.line(scX, scY + scH * 0.5, scX + scW, scY + scH * 0.5, COL.grid, 1.0);
  const pr = sim.probe;
  if (pr.length > 1) {
    let lx = scX, ly = scY + scH * 0.5;
    for (let i = 1; i < pr.length; i++) {
      const a = Math.max(-0.85, Math.min(0.85, pr[i - 1]));
      const b = Math.max(-0.85, Math.min(0.85, pr[i]));
      const ax = scX + (scW * (i - 1)) / (pr.length - 1);
      const bx = scX + (scW * i) / (pr.length - 1);
      const ay = scY + scH * (0.5 + a / 1.7);
      const by = scY + scH * (0.5 + b / 1.7);
      V.line(ax, ay, bx, by, [0.95, 0.52, 0.24, 0.35], 3.0);
      V.line(ax, ay, bx, by, [0.98, 0.68, 0.34, 0.92], 1.35);
      lx = bx; ly = by;
    }
    V.circ(lx, ly, 0.015, [1.0, 0.86, 0.56, 0.96], 2.0, 10);
  }

  const wake = pr.length ? pr[pr.length - 1] : 0;
  return [["RE", "126"], ["ST", "0.20"], ["WAKE V", (wake >= 0 ? "+" : "") + wake.toFixed(2) + " U"]];
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
  const vOverC = 0.8, gamma = 1 / Math.sqrt(1 - vOverC * vOverC); // 5/3 = 1.6667
  const H = 0.32, c = 0.42, v = vOverC * c;
  const TlegRest = H / c, Trest = 2 * TlegRest;
  const TlegMov = gamma * TlegRest, Tmov = 2 * TlegMov;
  const cycT = 6.2; // full sweep across viewport
  const tm = t % cycT;

  function drawMirrorBox(cx, cy, col) {
    const hw = 0.095, hh = H * 0.5;
    V.line(cx - hw, cy + hh, cx + hw, cy + hh, col, 2.0);
    V.line(cx - hw, cy - hh, cx + hw, cy - hh, col, 2.0);
    V.line(cx - hw, cy - hh, cx - hw, cy + hh, [col[0], col[1], col[2], 0.22], 0.9);
    V.line(cx + hw, cy - hh, cx + hw, cy + hh, [col[0], col[1], col[2], 0.22], 0.9);
  }

  // 1. Top center: AT REST clock (cobalt blue mirrors + vertical photon)
  const rx = 0.0, ry = 0.42;
  const colRest = [0.34, 0.56, 0.98, 0.95];
  drawMirrorBox(rx, ry, colRest);
  V.line(rx, ry - H * 0.5, rx, ry + H * 0.5, [0.34, 0.56, 0.98, 0.28], 1.0);
  const legR = Math.floor(tm / TlegRest), fracR = (tm / TlegRest) - legR;
  const yR = ry + (legR % 2 === 0 ? -H * 0.5 + fracR * H : H * 0.5 - fracR * H);
  V.circ(rx, yR, 0.026, [0.46, 0.72, 1.0, 0.45], 2.2, 12);
  V.circ(rx, yR, 0.012, [0.92, 0.97, 1.0, 0.98], 2.0, 10);
  V.text("AT REST", rx - 0.38, ry + 0.02, 0.04, COL.dim);

  // 2. Bottom: MOVING AT 0.8C clock sweeping left -> right with diagonal zigzag light path
  const my = -0.30;
  const xStart = -0.84, xSpan = 1.66;
  const xMov = xStart + (tm / cycT) * xSpan;
  const colMov = [0.96, 0.58, 0.24, 0.95];
  drawMirrorBox(xMov, my, colMov);
  V.text("MOVING 0.8C", Math.min(0.42, xMov - 0.14), my + H * 0.5 + 0.08, 0.036, COL.dim);

  // Exact sawtooth diagonal photon trajectory from t=0 to tm
  const pts = [];
  const nLegs = Math.floor(tm / TlegMov);
  for (let k = 0; k <= nLegs; k++) {
    const tk = k * TlegMov;
    const xk = xStart + (tk / cycT) * xSpan;
    const yk = my + (k % 2 === 0 ? -H * 0.5 : H * 0.5);
    pts.push([xk, yk]);
  }
  const fracM = (tm / TlegMov) - nLegs;
  const yM = my + (nLegs % 2 === 0 ? -H * 0.5 + fracM * H : H * 0.5 - fracM * H);
  pts.push([xMov, yM]);
  for (let i = 1; i < pts.length; i++) {
    V.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], [0.96, 0.52, 0.20, 0.36], 3.4);
    V.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], colMov, 1.55);
  }
  V.circ(xMov, yM, 0.026, [0.98, 0.68, 0.32, 0.45], 2.2, 12);
  V.circ(xMov, yM, 0.012, [1.0, 0.96, 0.86, 0.98], 2.0, 10);

  // 3. Tick comparison timeline dots (blue rest ticks vs amber moving ticks)
  const nRestTicks = Math.floor(tm / Trest);
  const nMovTicks = Math.floor(tm / Tmov);
  for (let k = 1; k <= nRestTicks; k++) {
    const tx = xStart + ((k * Trest) / cycT) * xSpan;
    V.circ(tx, -0.62, 0.011, colRest, 2.0, 8);
  }
  for (let k = 1; k <= nMovTicks; k++) {
    const tx = xStart + ((k * Tmov) / cycT) * xSpan;
    V.circ(tx, -0.56, 0.011, colMov, 2.0, 8);
  }

  // Subtle perspective spacetime floor grid at bottom
  for (let k = -4; k <= 4; k++) {
    V.line(k * 0.22, -0.74, k * 0.34, -0.96, [0.55, 0.62, 0.68, 0.12], 0.9);
  }
  [-0.76, -0.83, -0.92].forEach((gy) => V.line(-0.96, gy, 0.96, gy, [0.55, 0.62, 0.68, 0.10], 0.9));

  return [["GAMMA", gamma.toFixed(3)], ["REST", String(nRestTicks)], ["MOVING", String(nMovTicks)]];
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
  if (!sim.ready) { sim.vout = 13.8; sim.vin = []; sim.out = []; sim.charging = false; sim.ready = true; }
  const vin = 15.5 * Math.sin(2 * Math.PI * 0.65 * t);
  const vrect = Math.max(0, Math.abs(vin) - 0.7); // 0.7V silicon diode forward drop
  const charging = vrect >= sim.vout - 0.08;
  sim.charging = charging;
  if (dt > 0) {
    if (vrect > sim.vout) sim.vout += (vrect - sim.vout) * (1 - Math.exp(-dt / 0.025));
    else sim.vout *= Math.exp(-dt / 1.45); // RC reservoir discharge into load R
    sim.vin.push(vin); sim.out.push(sim.vout);
    if (sim.vin.length > 110) { sim.vin.shift(); sim.out.shift(); }
  }
  const pos = vin >= 0;
  const d14 = charging && pos;   // D1 (top-left) + D4 (bot-right) forward-biased
  const d23 = charging && !pos;  // D2 (top-right) + D3 (bot-left) forward-biased
  const colOn = [0.96, 0.56, 0.22, 0.95], colOff = [0.58, 0.64, 0.72, 0.38];
  const yTop = 0.68, yMid = 0.36, yBot = 0.04;
  const xL = -0.62, xR = -0.14, xCap = 0.30, xLoad = 0.70;
  const xAc = (xL + xR) * 0.5;

  // Helper: upward-pointing diode at (x, y)
  function diodeUp(x, y, on) {
    const col = on ? colOn : colOff;
    const hw = 0.042, hh = 0.036;
    if (on) {
      V.line(x - hw, y - hh, x, y + hh, [0.96, 0.50, 0.18, 0.32], 3.4);
      V.line(x + hw, y - hh, x, y + hh, [0.96, 0.50, 0.18, 0.32], 3.4);
    }
    V.line(x - hw, y - hh, x + hw, y - hh, col, 1.4);
    V.line(x - hw, y - hh, x, y + hh, col, 1.4);
    V.line(x + hw, y - hh, x, y + hh, col, 1.4);
    V.line(x - hw, y + hh, x + hw, y + hh, col, 1.7);
  }
  // Helper: wire with animated current-flow beads strictly from (ax,ay) -> (bx,by) when conducting
  function wire(ax, ay, bx, by, on) {
    const col = on ? colOn : colOff;
    if (on) V.line(ax, ay, bx, by, [0.96, 0.50, 0.18, 0.28], 3.2);
    V.line(ax, ay, bx, by, col, on ? 1.45 : 1.05);
    if (on) {
      const len = Math.hypot(bx - ax, by - ay);
      const nB = Math.max(1, Math.round(len / 0.14));
      for (let i = 0; i < nB; i++) {
        const u = (i / nB + t * 0.95) % 1;
        V.fill(ax + (bx - ax) * u - 0.008, ay + (by - ay) * u - 0.008, 0.016, 0.016, [1.0, 0.88, 0.56, 0.92]);
      }
    }
  }

  // 1. Bridge diode legs (all 4 diodes point UP toward + bus; only conduct when forward-biased!)
  wire(xL, yMid, xL, yTop, d14);   // D1: (xL, yMid) -> (xL, yTop)
  wire(xL, yBot, xL, yMid, d23);   // D3: (xL, yBot) -> (xL, yMid)
  wire(xR, yMid, xR, yTop, d23);   // D2: (xR, yMid) -> (xR, yTop)
  wire(xR, yBot, xR, yMid, d14);   // D4: (xR, yBot) -> (xR, yMid)
  diodeUp(xL, 0.52, d14);
  diodeUp(xL, 0.20, d23);
  diodeUp(xR, 0.52, d23);
  diodeUp(xR, 0.20, d14);

  // 2. AC voltage source (~) & its left/right leads (conducts right->left on pos, left->right on neg)
  if (d14) {
    wire(xAc - 0.075, yMid, xL, yMid, true);   // out of left (+) terminal to xL
    wire(xR, yMid, xAc + 0.075, yMid, true);   // returning from xR into right (-) terminal
  } else if (d23) {
    wire(xAc + 0.075, yMid, xR, yMid, true);   // out of right (+) terminal to xR
    wire(xL, yMid, xAc - 0.075, yMid, true);   // returning from xL into left (-) terminal
  } else {
    wire(xL, yMid, xAc - 0.075, yMid, false);
    wire(xAc + 0.075, yMid, xR, yMid, false);
  }
  V.circ(xAc, yMid, 0.075, charging ? colOn : COL.paper, 1.35, 24);
  const sinPts = [];
  for (let i = 0; i <= 16; i++) {
    const u = -1 + (2 * i) / 16;
    sinPts.push([xAc + u * 0.042, yMid + Math.sin(u * Math.PI) * 0.024]);
  }
  V.poly(sinPts, charging ? colOn : COL.paper, 1.2);

  // 3. Top (+) & bottom (-) buses obeying Kirchhoff's Current Law at every junction
  wire(xL, yTop, xR, yTop, d14);         // top-left span: ONLY active when D1 conducts
  wire(xR, yTop, xCap, yTop, charging);  // bridge -> C top rail: ONLY active while charging
  wire(xCap, yTop, xLoad, yTop, true);   // C -> R top rail: ALWAYS active (supplies load R)
  wire(xLoad, yBot, xCap, yBot, true);   // R -> C bottom return: ALWAYS active
  wire(xCap, yBot, xR, yBot, charging);  // C -> bridge bottom return: ONLY active while charging
  wire(xR, yBot, xL, yBot, d23);         // bottom-left span: ONLY active when D3 conducts

  // 4. Parallel smoothing capacitor C (current flows DOWN when charging, UP when discharging into R!)
  if (charging) {
    wire(xCap, yTop, xCap, yMid + 0.025, true);
    wire(xCap, yMid - 0.025, xCap, yBot, true);
  } else {
    wire(xCap, yMid + 0.025, xCap, yTop, true);
    wire(xCap, yBot, xCap, yMid - 0.025, true);
  }
  V.line(xCap - 0.06, yMid + 0.025, xCap + 0.06, yMid + 0.025, colOn, 2.2);
  V.line(xCap - 0.06, yMid - 0.025, xCap + 0.06, yMid - 0.025, colOn, 2.2);
  V.text("C", xCap + 0.08, yMid + 0.02, 0.042, COL.paper);

  // 5. Parallel load resistor R (current ALWAYS flows DOWN from + to -)
  wire(xLoad, yTop, xLoad, yMid + 0.14, true);
  wire(xLoad, yMid - 0.14, xLoad, yBot, true);
  const rz = [[xLoad, yMid + 0.14]];
  for (let i = 0; i < 6; i++) {
    rz.push([xLoad + (i % 2 === 0 ? 0.036 : -0.036), yMid + 0.12 - i * 0.046]);
  }
  rz.push([xLoad, yMid - 0.14]);
  V.poly(rz, COL.paper, 1.45);
  V.text("R", xLoad + 0.07, yMid + 0.02, 0.042, COL.paper);
  V.text("+", xLoad + 0.06, yTop + 0.02, 0.04, colOn);
  V.text("-", xLoad + 0.06, yBot + 0.02, 0.04, COL.dim);

  // 6. Oscilloscope below: blue AC input + glowing amber-orange smoothed DC output
  const sx = -0.88, sy = -0.86, sw = 1.76, sh = 0.62;
  V.line(sx, sy + sh * 0.5, sx + sw, sy + sh * 0.5, COL.grid, 1.0);
  V.scope(sx, sy, sw, sh, sim.vin, [0.36, 0.52, 0.94, 0.72], -18, 18);
  V.scope(sx, sy, sw, sh, sim.out, [0.98, 0.52, 0.22, 0.95], -18, 18);
  if (sim.out.length) {
    const oy = sy + sh * ((sim.out[sim.out.length - 1] + 18) / 36);
    V.circ(sx + sw, oy, 0.018, [1.0, 0.84, 0.52, 0.96], 2.2, 10);
  }
  const state = d14 ? "D1 D4 CHG" : d23 ? "D2 D3 CHG" : "CAP DISCHG";
  return [["VIN", (vin >= 0 ? "+" : "") + vin.toFixed(1) + " V"], ["VOUT", sim.vout.toFixed(1) + " V"], ["FLOW", state]];
}

function drawAdder(V, sim, t, dt, partIdx) {
  // 64-tick serial ripple-carry full-adder stream organized into 8 navigable parts (8 ticks per part = 64 ticks)
  if (!sim.ready) {
    const rand = mulberry32(64);
    sim.seq = [];
    let carry = 0;
    for (let k = 0; k < 64; k++) {
      let a, b, ci;
      if (k < 8) {
        a = (k >> 2) & 1; b = (k >> 1) & 1; ci = k & 1;
      } else {
        if (k % 8 === 0) carry = 0;
        a = rand() < 0.5 ? 0 : 1;
        b = rand() < 0.5 ? 0 : 1;
        ci = carry;
      }
      const x1 = a ^ b, s = x1 ^ ci, a1 = a & b, a2 = x1 & ci, co = a1 | a2;
      carry = co;
      sim.seq.push([a, b, ci, s, co, x1, a1, a2]);
    }
    sim.ready = true;
  }
  const tickRate = 0.28;
  const pOff = (partIdx || 0) * 8;
  const prog = (pOff + (t / tickRate)) % 64;
  const step = Math.floor(prog) % 64;
  const cur = sim.seq[step];
  const A = cur[0], B = cur[1], Cin = cur[2], S = cur[3], Cout = cur[4], xor1 = cur[5], and1 = cur[6], and2 = cur[7];
  const colOn = [0.98, 0.58, 0.22, 0.96], colGlow = [0.96, 0.46, 0.16, 0.34], colOff = [0.38, 0.46, 0.62, 0.48];

  function seg(x0, y0, x1, y1, bit) {
    if (bit) V.line(x0, y0, x1, y1, colGlow, 3.8);
    V.line(x0, y0, x1, y1, bit ? colOn : colOff, bit ? 1.55 : 1.05);
  }
  function gateOrXor(x, y, bit, isXor, lbl) {
    const col = bit ? colOn : [0.76, 0.80, 0.86, 0.72];
    const h = 0.082, w = 0.16;
    const pts = [];
    for (let i = 0; i <= 8; i++) { const u = -1 + (2 * i) / 8; pts.push([x + 0.032 * (1 - u * u), y + u * h]); }
    for (let i = 0; i <= 8; i++) { const u = 1 - (2 * i) / 8; pts.push([x + w * Math.cos(u * Math.PI * 0.5), y + u * h]); }
    V.poly(pts.concat([pts[0]]), col, 1.4);
    if (isXor) {
      const bar = [];
      for (let i = 0; i <= 8; i++) { const u = -1 + (2 * i) / 8; bar.push([x - 0.024 + 0.032 * (1 - u * u), y + u * h]); }
      V.poly(bar, col, 1.4);
    }
    V.text(lbl, x + 0.032, y + 0.015, 0.028, COL.dim);
  }
  function gateAnd(x, y, bit) {
    const col = bit ? colOn : [0.76, 0.80, 0.86, 0.72];
    const h = 0.075, w = 0.075;
    V.line(x, y - h, x, y + h, col, 1.4);
    V.line(x, y + h, x + w, y + h, col, 1.4);
    V.line(x, y - h, x + w, y - h, col, 1.4);
    let px = x + w, py = y + h;
    for (let i = 1; i <= 10; i++) {
      const a = Math.PI * 0.5 - (Math.PI * i) / 10;
      const qx = x + w + Math.cos(a) * h, qy = y + Math.sin(a) * h;
      V.line(px, py, qx, qy, col, 1.4); px = qx; py = qy;
    }
    V.text("AND", x + 0.022, y + 0.014, 0.026, COL.dim);
  }
  function pin(x, y, bit, lbl, lx) {
    if (bit) V.circ(x, y, 0.032, colGlow, 2.4, 12);
    V.circ(x, y, 0.018, bit ? colOn : colOff, 1.6, 12);
    V.text(lbl, lx, y + 0.018, 0.04, bit ? colOn : COL.paper);
  }

  // Orthogonal Manhattan full-adder layout
  const yA = 0.64, yB = 0.44, yCin = -0.02;
  const gX1 = [-0.42, 0.54], gA1 = [-0.42, 0.24], gX2 = [0.10, 0.40], gA2 = [0.10, 0.06], gOr = [0.46, 0.16];

  seg(-0.84, yA, -0.66, yA, A);
  seg(-0.66, yA, -0.66, gX1[1] + 0.035, A); seg(-0.66, gX1[1] + 0.035, gX1[0] - 0.02, gX1[1] + 0.035, A);
  seg(-0.66, gX1[1] + 0.035, -0.66, gA1[1] + 0.035, A); seg(-0.66, gA1[1] + 0.035, gA1[0], gA1[1] + 0.035, A);
  seg(-0.84, yB, -0.58, yB, B);
  seg(-0.58, yB, -0.58, gX1[1] - 0.035, B); seg(-0.58, gX1[1] - 0.035, gX1[0] - 0.02, gX1[1] - 0.035, B);
  seg(-0.58, yB, -0.58, gA1[1] - 0.035, B); seg(-0.58, gA1[1] - 0.035, gA1[0], gA1[1] - 0.035, B);
  seg(gX1[0] + 0.16, gX1[1], -0.10, gX1[1], xor1);
  seg(-0.10, gX1[1], -0.10, gX2[1] + 0.035, xor1); seg(-0.10, gX2[1] + 0.035, gX2[0] - 0.02, gX2[1] + 0.035, xor1);
  seg(-0.10, gX2[1] + 0.035, -0.10, gA2[1] + 0.035, xor1); seg(-0.10, gA2[1] + 0.035, gA2[0], gA2[1] + 0.035, xor1);
  seg(-0.84, yCin, -0.02, yCin, Cin);
  seg(-0.02, yCin, -0.02, gX2[1] - 0.035, Cin); seg(-0.02, gX2[1] - 0.035, gX2[0] - 0.02, gX2[1] - 0.035, Cin);
  seg(-0.02, gA2[1] - 0.035, gA2[0], gA2[1] - 0.035, Cin);
  seg(gX2[0] + 0.16, gX2[1], 0.82, gX2[1], S);
  seg(gA1[0] + 0.15, gA1[1], 0.36, gA1[1], and1);
  seg(0.36, gA1[1], 0.36, gOr[1] + 0.035, and1); seg(0.36, gOr[1] + 0.035, gOr[0], gOr[1] + 0.035, and1);
  seg(gA2[0] + 0.15, gA2[1], 0.36, gA2[1], and2);
  seg(0.36, gA2[1], 0.36, gOr[1] - 0.035, and2); seg(0.36, gOr[1] - 0.035, gOr[0], gOr[1] - 0.035, and2);
  seg(gOr[0] + 0.16, gOr[1], 0.82, gOr[1], Cout);

  gateOrXor(gX1[0], gX1[1], xor1, true, "XOR");
  gateAnd(gA1[0], gA1[1], and1);
  gateOrXor(gX2[0], gX2[1], S, true, "XOR");
  gateAnd(gA2[0], gA2[1], and2);
  gateOrXor(gOr[0], gOr[1], Cout, false, "OR");
  pin(-0.84, yA, A, "A", -0.94);
  pin(-0.84, yB, B, "B", -0.94);
  pin(-0.84, yCin, Cin, "CI", -0.96);
  pin(0.82, gX2[1], S, "S", 0.87);
  pin(0.82, gOr[1], Cout, "CO", 0.87);

  // 64-tick timing diagram below (8 byte columns of 8 ticks each)
  const tx0 = -0.72, tw = 1.62, stepW = tw / 64;
  const names = ["A", "B", "CI", "S", "CO"];
  for (let c = 0; c <= 64; c += 8) {
    const gx = tx0 + c * stepW;
    V.line(gx, -0.86, gx, -0.22, [0.55, 0.62, 0.68, 0.18], 0.9);
    if (c < 64) V.text(String(c), gx + 0.01, -0.17, 0.028, COL.dim);
  }
  names.forEach((nm, row) => {
    const yBase = -0.32 - row * 0.115;
    V.text(nm, -0.90, yBase + 0.03, 0.034, row >= 3 ? colOn : COL.dim);
    let prevBit = sim.seq[0][row];
    for (let k = 0; k <= step; k++) {
      const bit = sim.seq[k][row];
      const xA = tx0 + k * stepW;
      const xB = tx0 + Math.min(k + 1, prog) * stepW;
      const yL = yBase + bit * 0.052;
      if (k > 0 && bit !== prevBit) V.line(xA, yBase + prevBit * 0.052, xA, yL, colOn, 1.2);
      V.line(xA, yL, xB, yL, bit ? colOn : colOff, bit ? 1.45 : 1.0);
      prevBit = bit;
    }
  });
  const sweepX = tx0 + prog * stepW;
  V.line(sweepX, -0.86, sweepX, -0.22, [0.92, 0.92, 0.96, 0.55], 1.0);

  return [["TICK", String(step + 1).padStart(2, "0") + "/64"], ["INPUT", A + "+" + B + "+" + Cin], ["OUT", (Cout ? "1" : "0") + (S ? "1" : "0") + "B"]];
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

// XIX. THERMODYNAMICS — Maxwell-Boltzmann Molecular Speed Distribution
function drawMaxwellBoltzmann(V, sim, t, dt) {
  const Temp = 180 + 540 * (0.5 - 0.5 * Math.cos(t * 0.42)); // 180K <-> 720K
  const Tnorm = Temp / 300;
  const vp = Math.sqrt(2 * Tnorm);
  const vrms = Math.sqrt(3 * Tnorm);

  if (!sim.ready) {
    const rand = mulberry32(19);
    sim.parts = [];
    for (let i = 0; i < 56; i++) {
      // Sample base 3D thermal speeds from standard normal components (sigma = 1 -> exact Maxwell-Boltzmann)
      const vx = gauss(rand), vy = gauss(rand), vz = gauss(rand);
      sim.parts.push({ x: 0.06 + rand() * 0.88, y: 0.06 + rand() * 0.88, vx, vy, vz });
    }
    sim.ready = true;
  }

  // Left: 2D elastic gas chamber
  const bx = -0.92, by = -0.62, bw = 0.78, bh = 1.24;
  V.line(bx, by, bx + bw, by, COL.dim, 1.2);
  V.line(bx, by + bh, bx + bw, by + bh, COL.dim, 1.2);
  V.line(bx, by, bx, by + bh, COL.dim, 1.2);
  V.line(bx + bw, by, bx + bw, by + bh, COL.dim, 1.2);
  V.text("GAS CHAMBER", bx + 0.02, by + bh + 0.06, 0.036, COL.dim);

  const scaleV = Math.sqrt(Tnorm);
  const NBINS = 24;
  const hist = new Float32Array(NBINS);
  const vMaxPlot = 4.6;

  for (let i = 0; i < sim.parts.length; i++) {
    const p = sim.parts[i];
    const vx = p.vx * scaleV, vy = p.vy * scaleV, vz = p.vz * scaleV;
    if (dt > 0) {
      p.x += vx * 0.24 * dt;
      p.y += vy * 0.24 * dt;
      if (p.x < 0.03 || p.x > 0.97) { p.vx = -p.vx; p.x = Math.max(0.03, Math.min(0.97, p.x)); }
      if (p.y < 0.03 || p.y > 0.97) { p.vy = -p.vy; p.y = Math.max(0.03, Math.min(0.97, p.y)); }
    }
    const spd = Math.hypot(vx, vy, vz);
    const bin = Math.min(NBINS - 1, Math.floor((spd / vMaxPlot) * NBINS));
    hist[bin]++;
    const col = carnotTempColor(300 + (spd - 0.8) * 95);
    const px = bx + p.x * bw, py = by + p.y * bh;
    V.fill(px - 0.011, py - 0.011, 0.022, 0.022, col);
    V.line(px, py, px + vx * 0.025, py + vy * 0.025, [col[0], col[1], col[2], 0.45], 1.0);
  }

  // Right: Speed distribution histogram + exact Maxwell-Boltzmann f(v) curve
  const gx = -0.02, gy = -0.62, gw = 0.94, gh = 1.24;
  V.line(gx, gy, gx + gw, gy, COL.dim, 1.15);
  V.line(gx, gy, gx, gy + gh, COL.dim, 1.15);
  V.text("F(V)", gx + 0.02, gy + gh + 0.05, 0.038, COL.dim);
  V.text("SPEED V", gx + gw - 0.24, gy - 0.06, 0.036, COL.dim);

  const pdf = (v) => {
    const a = 1 / (2 * Tnorm);
    return Math.pow(a / Math.PI, 1.5) * 4 * Math.PI * v * v * Math.exp(-a * v * v);
  };
  const yScale = 0.95; // normalized for 180K..720K peak legibility

  // Histogram bars colored by speed
  const barW = gw / NBINS;
  for (let i = 0; i < NBINS; i++) {
    const hVal = (hist[i] / (sim.parts.length * (vMaxPlot / NBINS))) / yScale;
    const hClip = Math.min(1.0, hVal);
    if (hClip > 0.005) {
      const vMid = ((i + 0.5) / NBINS) * vMaxPlot;
      const col = carnotTempColor(300 + (vMid - 0.8) * 95);
      V.fill(gx + i * barW + 0.004, gy + 0.004, barW - 0.008, hClip * gh * 0.92, [col[0], col[1], col[2], 0.34]);
    }
  }

  // Exact Maxwell-Boltzmann analytical curve
  const curvePts = [];
  for (let i = 0; i <= 72; i++) {
    const v = (i / 72) * vMaxPlot;
    const f = Math.min(1.02, pdf(v) / yScale);
    curvePts.push([gx + (v / vMaxPlot) * gw, gy + f * gh * 0.92]);
  }
  V.poly(curvePts, [0.98, 0.72, 0.34, 0.35], 3.2);
  V.poly(curvePts, [1.0, 0.90, 0.68, 0.95], 1.55);

  // Markers for vp (most probable) and vrms
  const xVp = gx + Math.min(1, vp / vMaxPlot) * gw;
  const xVrms = gx + Math.min(1, vrms / vMaxPlot) * gw;
  V.line(xVp, gy, xVp, gy + Math.min(1, pdf(vp) / yScale) * gh * 0.92, COL.cyan, 1.2);
  V.line(xVrms, gy, xVrms, gy + Math.min(1, pdf(vrms) / yScale) * gh * 0.92, COL.hot, 1.2);
  V.text("VP", xVp - 0.04, gy - 0.06, 0.032, COL.cyan);
  V.text("RMS", xVrms - 0.04, gy - 0.11, 0.032, COL.hot);

  return [["T", Temp.toFixed(0) + " K"], ["VP", (vp * 295).toFixed(0) + " M/S"], ["VRMS", (vrms * 295).toFixed(0) + " M/S"]];
}

// XX. THERMODYNAMICS — 2D Heat Diffusion (Fourier's Law: dT/dt = alpha * nabla^2 T)
function drawHeatDiffusion(V, sim, t, dt) {
  const N = 40;
  if (!sim.ready) {
    sim.T = new Float32Array(N * N);
    sim.Tn = new Float32Array(N * N);
    sim.pulseT = 0;
    // Initial dual thermal hotspots
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const d1 = (x - 13) ** 2 + (y - 20) ** 2;
      const d2 = (x - 27) ** 2 + (y - 20) ** 2;
      sim.T[y * N + x] = Math.exp(-d1 / 18) + 0.85 * Math.exp(-d2 / 14);
    }
    sim.ready = true;
  }

  // Continuous orbiting laser heat source + explicit 2D FTCS heat diffusion so gradients & flux arrows stay vivid
  if (dt > 0) {
    const hx = 20 + 9 * Math.cos(t * 0.9);
    const hy = 20 + 9 * Math.sin(t * 0.9);
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
      const d2 = (x - hx) ** 2 + (y - hy) ** 2;
      if (d2 < 24) sim.T[y * N + x] = Math.min(1.15, sim.T[y * N + x] + 2.4 * dt * Math.exp(-d2 / 8));
    }
    const r = 0.14;
    const T = sim.T, Tn = sim.Tn;
    for (let y = 1; y < N - 1; y++) {
      const row = y * N;
      for (let x = 1; x < N - 1; x++) {
        const i = row + x;
        Tn[i] = (T[i] + r * (T[i - 1] + T[i + 1] + T[i - N] + T[i + N] - 4 * T[i])) * 0.9965;
      }
    }
    for (let k = 0; k < N; k++) {
      Tn[k] = Tn[N + k] * 0.98;
      Tn[(N - 1) * N + k] = Tn[(N - 2) * N + k] * 0.98;
      Tn[k * N] = Tn[k * N + 1] * 0.98;
      Tn[k * N + N - 1] = Tn[k * N + N - 2] * 0.98;
    }
    sim.T = Tn; sim.Tn = T;
  }

  // Render 2D thermal plate (top) + Fourier heat flux vectors q = -k grad(T)
  const px0 = -0.58, py0 = -0.22, side = 1.16, cell = side / N;
  const T = sim.T;
  let tMax = 0, tSum = 0;
  for (let y = 0; y < N; y++) {
    const row = y * N;
    for (let x = 0; x < N; x++) {
      const val = T[row + x];
      if (val > tMax) tMax = val;
      tSum += val;
      if (val < 0.03) continue;
      const u = Math.min(1, val);
      const col = u < 0.35
        ? [0.16 + 0.55 * (u / 0.35), 0.14 + 0.18 * (u / 0.35), 0.52 + 0.25 * (u / 0.35), 0.35 + 0.55 * u]
        : u < 0.72
          ? [0.71 + 0.27 * ((u - 0.35) / 0.37), 0.32 + 0.38 * ((u - 0.35) / 0.37), 0.28 - 0.14 * ((u - 0.35) / 0.37), 0.85]
          : [0.98, 0.70 + 0.28 * ((u - 0.72) / 0.28), 0.14 + 0.68 * ((u - 0.72) / 0.28), 0.94];
      V.fill(px0 + x * cell, py0 + y * cell, cell * 1.08, cell * 1.08, col);
    }
  }
  V.line(px0, py0, px0 + side, py0, COL.dim, 1.0);
  V.line(px0, py0 + side, px0 + side, py0 + side, COL.dim, 1.0);
  V.line(px0, py0, px0, py0 + side, COL.dim, 1.0);
  V.line(px0 + side, py0, px0 + side, py0 + side, COL.dim, 1.0);

  // Sparse Fourier heat-flux arrows q = -grad(T)
  for (let y = 4; y < N - 4; y += 5) {
    for (let x = 4; x < N - 4; x += 5) {
      const i = y * N + x;
      const gx = -(T[i + 1] - T[i - 1]) * 0.5;
      const gy = -(T[i + N] - T[i - N]) * 0.5;
      const mag = Math.hypot(gx, gy);
      if (mag < 0.015) continue;
      const len = Math.min(0.065, mag * 0.85);
      const ax = px0 + (x + 0.5) * cell, ay = py0 + (y + 0.5) * cell;
      V.line(ax, ay, ax + (gx / mag) * len, ay + (gy / mag) * len, [0.92, 0.95, 1.0, 0.65], 1.1);
    }
  }

  // 1D Centerline temperature slice below plate
  const slice = [];
  const midRow = (N >> 1) * N;
  for (let x = 0; x < N; x++) slice.push(T[midRow + x]);
  V.scope(-0.58, -0.82, 1.16, 0.44, slice, COL.amber, 0, 1.15);
  V.text("CENTERLINE T(X)", -0.58, -0.32, 0.034, COL.dim);

  const tAvg = tSum / (N * N);
  return [["T MAX", (300 + tMax * 500).toFixed(0) + " K"], ["T AVG", (300 + tAvg * 500).toFixed(0) + " K"], ["LAW", "FOURIER"]];
}

// XXI. MAGNETISM 2D — Helmholtz Coils & Biot-Savart Magnetic Field Lines
function drawMag2D(V, sim, t) {
  // 2D cross-section of a Helmholtz coil pair: 4 current wires at (x = +/-d, y = +/-R)
  // Upper wires carry +I (out of page), lower wires carry -I (into page)
  // Exact 2D magnetic flux function A_z(x, y) = sum( q_k * ln(r_k) ) -> field lines are contours of A_z!
  const R = 0.44;
  // Gently sweep coil separation around exact Helmholtz spacing (2*d = R -> d = R/2 = 0.22)
  const d = R * (0.5 + 0.14 * Math.sin(t * 0.55));
  const wires = [
    { x: -d, y: R, I: 1 },
    { x: -d, y: -R, I: -1 },
    { x: d, y: R, I: 1 },
    { x: d, y: -R, I: -1 },
  ];

  function fieldB(x, y) {
    let bx = 0, by = 0;
    for (let k = 0; k < 4; k++) {
      const w = wires[k];
      const dx = x - w.x, dy = y - w.y;
      const r2 = dx * dx + dy * dy + 0.0028;
      // B = curl(A_z z_hat) = (dAz/dy, -dAz/dx), Az = I * ln(r) => Bx = I*dy/r2, By = -I*dx/r2
      bx += (w.I * dy) / r2;
      by -= (w.I * dx) / r2;
    }
    return [bx, by];
  }

  // Trace smooth exact RK2 magnetic field lines seeded along the midplane & coil bores
  const seeds = [];
  for (let i = -5; i <= 5; i++) seeds.push([0, i * 0.074]);
  for (let s = -1; s <= 1; s += 2) {
    seeds.push([s * d, R * 0.65]);
    seeds.push([s * d, -R * 0.65]);
    seeds.push([s * (d + 0.22), 0.18]);
    seeds.push([s * (d + 0.22), -0.18]);
  }

  for (let si = 0; si < seeds.length; si++) {
    const sx = seeds[si][0], sy = seeds[si][1];
    for (let dir = -1; dir <= 1; dir += 2) {
      let x = sx, y = sy;
      for (let step = 0; step < 68; step++) {
        const b1 = fieldB(x, y);
        const m1 = Math.hypot(b1[0], b1[1]);
        if (m1 < 1e-4) break;
        const ds = 0.032 * dir;
        const mx = x + (b1[0] / m1) * ds * 0.5, my = y + (b1[1] / m1) * ds * 0.5;
        const b2 = fieldB(mx, my);
        const m2 = Math.hypot(b2[0], b2[1]) || 1;
        const nx = x + (b2[0] / m2) * ds, ny = y + (b2[1] / m2) * ds;
        if (Math.abs(nx) > 0.94 || ny > 0.66 || ny < -0.60) break;
        // Stop near wire cores
        let nearWire = false;
        for (let k = 0; k < 4; k++) {
          if ((nx - wires[k].x) ** 2 + (ny - wires[k].y) ** 2 < 0.0022) nearWire = true;
        }
        if (nearWire) break;
        const uCol = Math.max(0.05, Math.min(0.95, 1.0 - Math.log(1 + m1 * 0.55) / 2.9));
        const col = dipoleColor(uCol, 0.72);
        V.line(x, y + 0.24, nx, ny + 0.24, col, 1.3);
        x = nx; y = ny;
      }
    }
  }

  // Draw the 4 coil cross-sections (gold ring + dot for out-of-page, X for into-page)
  for (let k = 0; k < 4; k++) {
    const w = wires[k], wy = w.y + 0.24;
    const col = w.I > 0 ? [0.98, 0.72, 0.30, 0.95] : [0.38, 0.76, 1.0, 0.95];
    V.circ(w.x, wy, 0.038, col, 1.8, 16);
    if (w.I > 0) {
      V.fill(w.x - 0.01, wy - 0.01, 0.02, 0.02, col);
    } else {
      V.line(w.x - 0.02, wy - 0.02, w.x + 0.02, wy + 0.02, col, 1.4);
      V.line(w.x - 0.02, wy + 0.02, w.x + 0.02, wy - 0.02, col, 1.4);
    }
  }

  // Centerline B_x(x) uniformity profile below
  const prof = [];
  let bCenter = 0, bPeak = 1e-6;
  for (let i = 0; i <= 64; i++) {
    const x = -0.88 + (1.76 * i) / 64;
    const bx = Math.abs(fieldB(x, 0)[0]);
    if (i === 32) bCenter = bx;
    if (bx > bPeak) bPeak = bx;
    prof.push(bx);
  }
  V.scope(-0.88, -0.86, 1.76, 0.42, prof, COL.cyan, 0, bPeak * 1.12);
  V.text("AXIAL FIELD BX(X)", -0.88, -0.39, 0.034, COL.dim);

  const flat = Math.min(99.9, (1 - Math.abs(d * 2 - R) / R) * 100);
  return [["D / R", ((2 * d) / R).toFixed(2)], ["B0", (bCenter * 2.4).toFixed(1) + " MT"], ["UNIFORM", flat.toFixed(1) + " %"]];
}

// XXII. MAGNETISM 3D — 3D Solenoid, Dipole Magnetosphere & Magnetic Mirroring
function drawMag3D(V, sim, t) {
  const yaw = t * 0.45;
  const pitch = 0.36 + 0.14 * Math.sin(t * 0.32);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);

  function proj(x, y, z) {
    // Rotate around Y (yaw) then X (pitch), perspective project
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const y2 = y * cp - z1 * sp;
    const z2 = y * sp + z1 * cp;
    const persp = 2.6 / (2.6 - z2);
    return [x1 * persp, y2 * persp, z2];
  }

  // 1. 3D Dipole Magnetic Field Shells: r(theta) = L * sin^2(theta) across 8 azimuths & 2 L-shells
  const shells = [0.58, 0.92];
  for (let li = 0; li < shells.length; li++) {
    const L = shells[li];
    const nAz = 8;
    for (let ai = 0; ai < nAz; ai++) {
      const phi = (ai / nAz) * Math.PI * 2;
      const cph = Math.cos(phi), sph = Math.sin(phi);
      let prev = null;
      const nPts = 36;
      for (let i = 0; i <= nPts; i++) {
        const th = 0.24 + ((Math.PI - 0.48) * i) / nPts;
        const r = L * Math.sin(th) ** 2;
        const x = r * Math.sin(th) * cph;
        const y = r * Math.cos(th);
        const z = r * Math.sin(th) * sph;
        const p = proj(x, y, z);
        if (prev) {
          const depth = Math.max(0.22, Math.min(1.0, 0.58 + 0.42 * p[2]));
          const uCol = li === 0 ? 0.30 : 0.68;
          const col = dipoleColor(uCol, (li === 0 ? 0.72 : 0.48) * depth);
          V.line(prev[0], prev[1], p[0], p[1], col, li === 0 ? 1.35 : 1.05);
        }
        prev = p;
      }
    }
  }

  // 2. Central 3D Helical Current-Carrying Solenoid Coil (copper-gold winding)
  const nTurns = 7, rCoil = 0.14, hCoil = 0.30;
  let prevC = null;
  for (let i = 0; i <= 140; i++) {
    const u = i / 140;
    const a = u * nTurns * Math.PI * 2;
    const p = proj(rCoil * Math.cos(a), (u - 0.5) * hCoil, rCoil * Math.sin(a));
    if (prevC) {
      const depth = Math.max(0.35, Math.min(1.0, 0.62 + 0.45 * p[2]));
      V.line(prevC[0], prevC[1], p[0], p[1], [0.96, 0.64, 0.26, 0.92 * depth], 1.7);
    }
    prevC = p;
  }

  // 3. Trapped charged particle executing 3D Van Allen magnetic mirroring between N & S poles!
  const Ltrap = 0.76, phiDrift = t * 0.28;
  const thOsc = Math.PI * 0.5 + 0.92 * Math.sin(t * 2.1); // bounces between mirror latitudes
  const gyPts = [];
  for (let i = 0; i <= 48; i++) {
    const tt = t - (1 - i / 48) * 1.1;
    const th = Math.PI * 0.5 + 0.92 * Math.sin(tt * 2.1);
    const phi = tt * 0.28;
    const r = Ltrap * Math.sin(th) ** 2;
    // Local gyration radius shrinks near poles (stronger B -> adiabatic invariant mu = mv_perp^2 / 2B)
    const rGyr = 0.042 * Math.pow(Math.sin(th), 2.2);
    const gAng = tt * 26;
    const gx = r * Math.sin(th) * Math.cos(phi) + rGyr * Math.cos(gAng) * Math.sin(phi);
    const gy = r * Math.cos(th) + rGyr * Math.sin(gAng);
    const gz = r * Math.sin(th) * Math.sin(phi) - rGyr * Math.cos(gAng) * Math.cos(phi);
    gyPts.push(proj(gx, gy, gz));
  }
  for (let i = 1; i < gyPts.length; i++) {
    const a = 0.15 + 0.80 * (i / gyPts.length);
    V.line(gyPts[i - 1][0], gyPts[i - 1][1], gyPts[i][0], gyPts[i][1], [1.0, 0.82, 0.42, a], 1.5);
  }
  const head = gyPts[gyPts.length - 1];
  V.circ(head[0], head[1], 0.022, [1.0, 0.94, 0.72, 0.96], 2.2, 10);

  // Magnetic axis & N/S pole markers
  const pN = proj(0, 0.32, 0), pS = proj(0, -0.32, 0);
  V.text("N", pN[0] - 0.02, pN[1] + 0.06, 0.04, COL.hot);
  V.text("S", pS[0] - 0.02, pS[1] - 0.03, 0.04, COL.cyan);

  const latDeg = ((Math.PI * 0.5 - thOsc) * 180) / Math.PI;
  return [["L-SHELL", "3.0 R0"], ["LAT", (latDeg >= 0 ? "+" : "") + latDeg.toFixed(0) + " DEG"], ["TRAP", "MIRROR"]];
}

// XXIII. ELECTRODYNAMICS 2D — Oscillating Electric Quadrupole Radiation Field Contours
function drawQuadrupole2D(V, sim, t) {
  const N = 46, Rmax = 0.94, Rcore = 0.068, lam = 0.72;
  const k = (Math.PI * 2) / lam, w = 1.9, wt = w * t, phase = Math.cos(wt);

  if (!sim.ready) {
    const M = N + 1, h = Rmax / N;
    sim.M = M; sim.h = h;
    sim.geom = new Float32Array(M * M); // sin^2(th) * cos(th)
    sim.invKr = new Float32Array(M * M);
    sim.invKr2 = new Float32Array(M * M);
    sim.cosKr = new Float32Array(M * M);
    sim.sinKr = new Float32Array(M * M);
    sim.psi = new Float32Array(M * M);
    for (let j = 0; j < M; j++) {
      const y = j * h;
      for (let i = 0; i < M; i++) {
        const x = i * h, r2 = x * x + y * y, r = Math.sqrt(r2), idx = j * M + i;
        if (r > 1e-6) {
          const kr = k * r, sinTh = x / r, cosTh = y / r;
          sim.geom[idx] = sinTh * sinTh * cosTh;
          sim.invKr[idx] = 1 / kr;
          sim.invKr2[idx] = 1 / (kr * kr);
          sim.cosKr[idx] = Math.cos(kr);
          sim.sinKr[idx] = Math.sin(kr);
        }
      }
    }
    sim.ready = true;
  }

  const M = sim.M, h = sim.h, cw = Math.cos(wt), sw = Math.sin(wt);
  const { geom, invKr, invKr2, cosKr, sinKr, psi } = sim;
  for (let p = 0; p < M * M; p++) {
    const c = cosKr[p] * cw + sinKr[p] * sw;
    const s = sinKr[p] * cw - cosKr[p] * sw;
    // Exact electric quadrupole flux function: sin^2(th)*cos(th) * ((3/(kr)^2 - 1)*cos + (3/kr)*sin)
    psi[p] = geom[p] * ((3 * invKr2[p] - 1) * c + 3 * invKr[p] * s);
  }

  const levels = [-0.55, -0.36, -0.24, -0.15, -0.075, 0.075, 0.15, 0.24, 0.36, 0.55];
  const ex = [0, 0, 0, 0], ey = [0, 0, 0, 0];

  for (let j = 0; j < N; j++) {
    const y0 = j * h, y1 = y0 + h, ym = y0 + 0.5 * h;
    const row0 = j * M, row1 = row0 + M;
    for (let i = 0; i < N; i++) {
      const x0 = i * h, x1 = x0 + h, xm = x0 + 0.5 * h;
      const rm = Math.hypot(xm, ym);
      if (rm < Rcore || rm > Rmax) continue;
      const v0 = psi[row0 + i], v1 = psi[row0 + i + 1], v2 = psi[row1 + i + 1], v3 = psi[row1 + i];
      const vmin = Math.min(v0, v1, v2, v3), vmax = Math.max(v0, v1, v2, v3);
      if (vmax < levels[0] || vmin > levels[levels.length - 1]) continue;

      const u = rm / Rmax;
      const fadeOut = u < 0.65 ? 1 : Math.max(0, Math.cos(((u - 0.65) / 0.35) * Math.PI * 0.5));
      const fadeIn = rm < Rcore + 0.03 ? (rm - Rcore) / 0.03 : 1;
      const alpha = (0.38 + 0.54 * (1 - 0.3 * u)) * fadeOut * fadeIn;
      const uCol = Math.max(0.05, Math.min(0.95, u * 0.92 + 0.05));
      const col = dipoleColor(uCol, alpha);
      const lw = 1.42 - 0.24 * u;

      for (let li = 0; li < levels.length; li++) {
        const lv = levels[li];
        if (lv < vmin || lv > vmax) continue;
        const cidx = (v0 >= lv ? 1 : 0) | (v1 >= lv ? 2 : 0) | (v2 >= lv ? 4 : 0) | (v3 >= lv ? 8 : 0);
        if (cidx === 0 || cidx === 15) continue;
        let edges;
        if (cidx === 5) edges = 0.25 * (v0 + v1 + v2 + v3) >= lv ? [3, 2, 0, 1] : [3, 0, 1, 2];
        else if (cidx === 10) edges = 0.25 * (v0 + v1 + v2 + v3) >= lv ? [3, 0, 1, 2] : [3, 2, 0, 1];
        else edges = DIPOLE_MS[cidx];

        const d0 = v1 - v0, d1 = v2 - v1, d2 = v2 - v3, d3 = v3 - v0;
        ex[0] = x0 + (Math.abs(d0) > 1e-9 ? ((lv - v0) / d0) * h : 0.5 * h); ey[0] = y0;
        ex[1] = x1; ey[1] = y0 + (Math.abs(d1) > 1e-9 ? ((lv - v1) / d1) * h : 0.5 * h);
        ex[2] = x0 + (Math.abs(d2) > 1e-9 ? ((lv - v3) / d2) * h : 0.5 * h); ey[2] = y1;
        ex[3] = x0; ey[3] = y0 + (Math.abs(d3) > 1e-9 ? ((lv - v0) / d3) * h : 0.5 * h);

        for (let s = 0; s < edges.length; s += 2) {
          const ax = ex[edges[s]], ay = ey[edges[s]], bx = ex[edges[s + 1]], by = ey[edges[s + 1]];
          V.line(ax, ay, bx, by, col, lw);
          V.line(-ax, ay, -bx, by, col, lw);
          V.line(ax, -ay, bx, -by, col, lw);
          V.line(-ax, -ay, -bx, -by, col, lw);
        }
      }
    }
  }

  // 4-charge oscillating quadrupole core (+, -, +, -)
  const dq = 0.036 * Math.abs(phase) + 0.012;
  const colPos = [0.98, 0.44, 0.24, 0.95], colNeg = [0.36, 0.62, 1.0, 0.95];
  const cTop = phase >= 0 ? colPos : colNeg, cSide = phase >= 0 ? colNeg : colPos;
  [[0, dq, cTop], [0, -dq, cTop], [dq, 0, cSide], [-dq, 0, cSide]].forEach((q) => {
    V.circ(q[0], q[1], 0.014, q[2], 2.0, 10);
  });

  return [["Q/Q0", (phase >= 0 ? "+" : "") + phase.toFixed(2)], ["LOBES", "4 (CLOVER)"], ["LAMBDA", lam.toFixed(2)]];
}

// XXIV. ELECTRODYNAMICS 3D — 3D Transverse Electromagnetic Wave (E perp B perp k) & Poynting Flux
function drawEMWave3D(V, sim, t) {
  const yaw = 0.58 + 0.24 * Math.sin(t * 0.28);
  const pitch = 0.34 + 0.10 * Math.cos(t * 0.22);
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);

  function proj(x, y, z) {
    // x = propagation axis, y = E-field axis, z = B-field axis
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    const p = 2.8 / (2.8 - z2);
    return [x1 * p, y2 * p, z2];
  }

  // Propagation axis k (x from -1.05 to +1.05)
  const a0 = proj(-1.05, 0, 0), a1 = proj(1.05, 0, 0);
  V.line(a0[0], a0[1], a1[0], a1[1], COL.dim, 1.2);
  V.text("K", a1[0] + 0.02, a1[1] + 0.02, 0.04, COL.paper);

  const N = 64, amp = 0.36, k = Math.PI * 2.5, wt = t * 3.4;
  const ePts = [], bPts = [];
  for (let i = 0; i <= N; i++) {
    const x = -0.96 + (1.92 * i) / N;
    const val = amp * Math.sin(k * x - wt);
    const p0 = proj(x, 0, 0);
    const pE = proj(x, val, 0);
    const pB = proj(x, 0, val);
    ePts.push(pE); bPts.push(pB);
    // Field vectors every 2 steps
    if (i % 2 === 0) {
      const m = Math.abs(val) / amp;
      V.line(p0[0], p0[1], pE[0], pE[1], [0.98, 0.56, 0.22, 0.28 + 0.52 * m], 1.25);
      V.line(p0[0], p0[1], pB[0], pB[1], [0.28, 0.72, 0.98, 0.28 + 0.52 * m], 1.25);
    }
  }
  // Smooth E (warm gold-orange) and B (electric cyan-blue) wave envelopes
  for (let i = 1; i < ePts.length; i++) {
    V.line(ePts[i - 1][0], ePts[i - 1][1], ePts[i][0], ePts[i][1], [0.98, 0.52, 0.18, 0.32], 3.4);
    V.line(ePts[i - 1][0], ePts[i - 1][1], ePts[i][0], ePts[i][1], [1.0, 0.72, 0.34, 0.95], 1.6);
    V.line(bPts[i - 1][0], bPts[i - 1][1], bPts[i][0], bPts[i][1], [0.22, 0.58, 0.96, 0.32], 3.4);
    V.line(bPts[i - 1][0], bPts[i - 1][1], bPts[i][0], bPts[i][1], [0.46, 0.84, 1.0, 0.95], 1.6);
  }
  // Poynting flux wavepackets S = (E x B)/mu0 traveling along k
  for (let p = 0; p < 3; p++) {
    const px = -0.96 + ((t * 0.54 + p * 0.64) % 1.92);
    const sp0 = proj(px, 0, 0);
    V.circ(sp0[0], sp0[1], 0.022, [0.95, 0.96, 1.0, 0.88], 2.0, 10);
  }
  const eLbl = proj(-0.68, amp + 0.12, 0), bLbl = proj(-0.68, 0, amp + 0.14);
  V.text("E", eLbl[0], eLbl[1], 0.044, [1.0, 0.72, 0.34, 0.95]);
  V.text("B", bLbl[0], bLbl[1], 0.044, [0.46, 0.84, 1.0, 0.95]);

  return [["PHASE", "E PERP B"], ["S = EXB", "OUTWARD"], ["SPEED", "C = 1/SQRT(UE)"]];
}

// XXV. NONLINEAR DYNAMICS — Lorenz Strange Attractor (Real 3D Space + 2D Phase Space)
function rk4Lorenz(s, h) {
  const sig = 10, rho = 28, beta = 8 / 3;
  const f = (a) => [sig * (a[1] - a[0]), a[0] * (rho - a[2]) - a[1], a[0] * a[1] - beta * a[2]];
  const k1 = f(s);
  const k2 = f([s[0] + 0.5 * h * k1[0], s[1] + 0.5 * h * k1[1], s[2] + 0.5 * h * k1[2]]);
  const k3 = f([s[0] + 0.5 * h * k2[0], s[1] + 0.5 * h * k2[1], s[2] + 0.5 * h * k2[2]]);
  const k4 = f([s[0] + h * k3[0], s[1] + h * k3[1], s[2] + h * k3[2]]);
  return [
    s[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    s[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    s[2] + (h / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
  ];
}
function drawLorenz(V, sim, t, dt) {
  if (!sim.ready) {
    sim.a = [-8.0, 8.0, 27.0];
    sim.b = [-8.005, 8.0, 27.0]; // 5e-3 initial perturbation -> chaotic divergence!
    sim.ta = []; sim.tb = [];
    // Warm up onto both butterfly wings so divergence & full attractor are immediately visible
    for (let i = 0; i < 1800; i++) {
      sim.a = rk4Lorenz(sim.a, 0.008);
      sim.b = rk4Lorenz(sim.b, 0.008);
      if (i >= 1200) { sim.ta.push(sim.a); sim.tb.push(sim.b); }
    }
    sim.ready = true;
  }
  if (dt > 0) {
    const steps = Math.max(1, Math.min(8, Math.round(dt * 100)));
    for (let k = 0; k < steps; k++) {
      sim.a = rk4Lorenz(sim.a, 0.008);
      sim.b = rk4Lorenz(sim.b, 0.008);
      sim.ta.push(sim.a); sim.tb.push(sim.b);
      if (sim.ta.length > 600) { sim.ta.shift(); sim.tb.shift(); }
    }
  }

  // Left panel: Rotating 3D Real-Space Lorenz Butterfly
  const yaw = t * 0.35, cy = Math.cos(yaw), sy = Math.sin(yaw);
  const Lcx = -0.48, Lcy = 0.02, Lsc = 0.0175;
  function proj3(p) {
    const x = p[0], y = p[1], z = p[2] - 25;
    const xr = x * cy - y * sy, zr = x * sy + y * cy;
    const persp = 1.0 / (1.0 - zr * 0.009);
    return [Lcx + xr * Lsc * persp, Lcy + z * Lsc * persp];
  }
  V.text("REAL 3D ATTRACTOR", -0.92, 0.72, 0.034, COL.dim);
  V.line(-0.02, -0.78, -0.02, 0.74, COL.grid, 1.0);

  // Right panel: 2D Phase Space (X vs Z top, X vs Y bottom)
  const Rcx = 0.48, Rcy1 = 0.28, Rcy2 = -0.44, Rsc = 0.0165;
  V.text("PHASE X-Z", 0.06, 0.72, 0.034, COL.dim);
  V.text("PHASE X-Y", 0.06, -0.08, 0.034, COL.dim);
  V.line(0.06, Rcy1, 0.92, Rcy1, COL.grid, 0.9);
  V.line(Rcx, -0.04, Rcx, 0.66, COL.grid, 0.9);
  V.line(0.06, Rcy2, 0.92, Rcy2, COL.grid, 0.9);
  V.line(Rcx, -0.78, Rcx, -0.14, COL.grid, 0.9);

  function drawTrail(tr, col) {
    for (let i = 1; i < tr.length; i++) {
      const a = 0.14 + 0.78 * (i / tr.length);
      const c = [col[0], col[1], col[2], a];
      const p0 = proj3(tr[i - 1]), p1 = proj3(tr[i]);
      V.line(p0[0], p0[1], p1[0], p1[1], c, 1.25);
      // Phase X-Z
      V.line(Rcx + tr[i - 1][0] * Rsc, Rcy1 + (tr[i - 1][2] - 25) * Rsc * 0.85,
             Rcx + tr[i][0] * Rsc, Rcy1 + (tr[i][2] - 25) * Rsc * 0.85, c, 1.15);
      // Phase X-Y
      V.line(Rcx + tr[i - 1][0] * Rsc, Rcy2 + tr[i - 1][1] * Rsc * 0.7,
             Rcx + tr[i][0] * Rsc, Rcy2 + tr[i][1] * Rsc * 0.7, c, 1.15);
    }
    const last = tr[tr.length - 1];
    const lp = proj3(last);
    V.circ(lp[0], lp[1], 0.016, col, 2.0, 8);
    V.circ(Rcx + last[0] * Rsc, Rcy1 + (last[2] - 25) * Rsc * 0.85, 0.014, col, 1.8, 8);
    V.circ(Rcx + last[0] * Rsc, Rcy2 + last[1] * Rsc * 0.7, 0.014, col, 1.8, 8);
  }
  drawTrail(sim.tb, [0.34, 0.76, 0.98, 0.95]);
  drawTrail(sim.ta, [0.98, 0.62, 0.24, 0.95]);

  const div = Math.hypot(sim.a[0] - sim.b[0], sim.a[1] - sim.b[1], sim.a[2] - sim.b[2]);
  return [["SIGMA / RHO", "10 / 28"], ["X1", sim.a[0].toFixed(1)], ["DELTA", div.toFixed(2)]];
}

// XXVI. NONLINEAR DYNAMICS — Chaotic 3-Body Gravitational Scattering (Real Space + Phase Space)
function deriv3Body(st) {
  const m = [1.0, 1.0, 0.85], eps2 = 0.018;
  const ax = [0, 0, 0], ay = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const dx = st[j * 4] - st[i * 4], dy = st[j * 4 + 1] - st[i * 4 + 1];
      const invR3 = 1 / Math.pow(dx * dx + dy * dy + eps2, 1.5);
      ax[i] += m[j] * dx * invR3; ay[i] += m[j] * dy * invR3;
      ax[j] -= m[i] * dx * invR3; ay[j] -= m[i] * dy * invR3;
    }
  }
  const out = new Array(12);
  for (let i = 0; i < 3; i++) {
    out[i * 4] = st[i * 4 + 2]; out[i * 4 + 1] = st[i * 4 + 3];
    out[i * 4 + 2] = ax[i]; out[i * 4 + 3] = ay[i];
  }
  return out;
}
function rk4ThreeBody(s, h) {
  const add = (a, b, f) => a.map((v, i) => v + b[i] * f);
  const k1 = deriv3Body(s);
  const k2 = deriv3Body(add(s, k1, 0.5 * h));
  const k3 = deriv3Body(add(s, k2, 0.5 * h));
  const k4 = deriv3Body(add(s, k3, h));
  return s.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}
function drawThreeBody(V, sim, t, dt, part) {
  const p = (part || 0) % 3;

  // Parts 1 & 2: Prigogine–Petrosky–Miyasaka (UT Austin) 3-Body Quantum Scattering
  // Part 1 = Extended Liouville-Space Scattering (persistent horizontal correlation bar / arrow of time)
  // Part 2 = Conventional Hilbert-Space Scattering (time-reversible, no horizontal bar)
  if (p < 2) {
    const isLiouville = p === 0;
    const cycle = (t * 0.24) % 1.0; // 0..1: Before -> During (0.45) -> After collision
    const tau = (cycle - 0.45) * 2.2; // -1.0 .. +1.2
    const stage = cycle < 0.32 ? "BEFORE COLLISION" : (cycle < 0.58 ? "DURING 3-BODY COLLISION" : "AFTER COLLISION");

    // Left Panel: 3-Body Real Space Scattering (Red, Green, Blue particles matching UT Austin diagram)
    const Lcx = -0.50, Lcy = 0.0;
    V.text("REAL SPACE  (" + stage + ")", -0.94, 0.72, 0.026, COL.dim);
    V.line(-0.04, -0.78, -0.04, 0.74, COL.grid, 1.0);

    // 3 incoming -> 3-body interaction -> 3 outgoing trajectories (smooth hyperbolic scattering)
    const cols3 = [[0.96, 0.26, 0.24, 0.96], [0.28, 0.88, 0.36, 0.96], [0.28, 0.56, 0.98, 0.96]];
    function pos3(idx, s) {
      const bend = 0.5 * (1 + Math.tanh(s * 3.2)); // smooth 0 -> 1 transition through collision
      const xIn  = idx === 0 ? -0.34 + 0.27 * (s + 1) : (idx === 1 ? -0.10 + 0.08 * (s + 1) :  0.34 - 0.27 * (s + 1));
      const xOut = idx === 0 ? -0.07 - 0.32 * Math.max(0, s) : (idx === 1 ? -0.02 + 0.14 * Math.max(0, s) :  0.07 + 0.26 * Math.max(0, s));
      const x = s < 0 ? xIn : (xIn * (1 - bend) + xOut * bend);
      const y = -0.04 + s * 0.56 + (idx === 1 ? 0.05 : -0.02) * Math.exp(-s * s * 6);
      return [Lcx + x, Lcy + y];
    }
    for (let i = 0; i < 3; i++) {
      // Full faint path
      let px = 0, py = 0;
      for (let k = 0; k <= 40; k++) {
        const s = -1.0 + (k / 40) * 2.15;
        const [x, y] = pos3(i, s);
        if (k > 0) V.line(px, py, x, y, [cols3[i][0], cols3[i][1], cols3[i][2], s <= tau ? 0.82 : 0.20], s <= tau ? 1.6 : 1.0);
        px = x; py = y;
      }
      const [hx, hy] = pos3(i, tau);
      V.circ(hx, hy, 0.032, cols3[i], 2.4, 14);
      V.circ(hx, hy, 0.016, cols3[i], 2.0, 10);
    }
    // 3-body interaction glow during collision
    const collGlow = Math.exp(-tau * tau * 8.0);
    if (collGlow > 0.05) {
      V.circ(Lcx, Lcy, 0.11 + 0.04 * (1 - collGlow), [1.0, 0.72, 0.28, 0.45 * collGlow], 1.6, 24);
    }

    // Right Panel: Jacobi Relative-Momentum Probability Portrait P(k, q)
    // k = (p1 - p2)/sqrt(2), q = (p1 + p2 - 2p3)/sqrt(6)
    const Rx0 = 0.06, Rx1 = 0.94, Ry0 = -0.68, Ry1 = 0.64;
    const Rcx = 0.5 * (Rx0 + Rx1), Rcy = 0.5 * (Ry0 + Ry1), Rw = 0.5 * (Rx1 - Rx0), Rh = 0.5 * (Ry1 - Ry0);
    V.text(isLiouville ? "LIOUVILLE SPACE P(K,Q)  [PRIGOGINE BAR]" : "HILBERT SPACE P(K,Q)  [CONVENTIONAL]", Rx0, 0.72, 0.025, isLiouville ? [1.0, 0.68, 0.24, 0.95] : [0.34, 0.78, 0.98, 0.95]);
    V.line(Rx0, Ry0, Rx1, Ry0, COL.grid, 0.9); V.line(Rx0, Ry1, Rx1, Ry1, COL.grid, 0.9);
    V.line(Rx0, Ry0, Rx0, Ry1, COL.grid, 0.9); V.line(Rx1, Ry0, Rx1, Ry1, COL.grid, 0.9);

    const NX = 52, NY = 52, M = NX + 1;
    if (!sim.psi || sim.psi.length !== M * (NY + 1)) sim.psi = new Float32Array(M * (NY + 1));
    const psi = sim.psi;
    // Prigogine horizontal bar builds up smoothly during the 3-body collision and persists afterward!
    const barAmp = isLiouville ? (0.18 + 0.82 * (0.5 * (1 + Math.tanh((tau + 0.25) * 3.5)))) : 0.0;
    const ripple = 0.08 * Math.sin(t * 2.4);

    for (let j = 0; j <= NY; j++) {
      const q = -1.0 + (2.0 * j) / NY; // vertical Jacobi momentum q
      for (let i = 0; i <= NX; i++) {
        const k = -1.0 + (2.0 * i) / NX; // horizontal Jacobi momentum k
        const ak = Math.abs(k);
        // 1) Central energy-conservation shell ring (centered slightly above origin as in Miyasaka's plots)
        const rRing = Math.hypot(k, q - 0.22);
        const ring = Math.exp(-Math.pow((rRing - 0.36) / 0.085, 2)) * (0.85 + 0.35 * Math.exp(-Math.pow((q + 0.02) / 0.28, 2)));
        // 2) Asymptotic binary-collision V-wings (q = 1.65*|k| - 0.56)
        const dWing = Math.abs(q - (1.62 * ak - 0.58));
        const wings = Math.exp(-Math.pow(dWing / 0.072, 2)) * Math.exp(-Math.pow(ak - 0.52, 2) * 0.9);
        // 3) Lower interference X-saddle (two crossing binary channels below the energy shell)
        const dX1 = Math.abs(q + 0.62 - 1.55 * k);
        const dX2 = Math.abs(q + 0.62 + 1.55 * k);
        const xSaddle = 0.72 * (Math.exp(-Math.pow(dX1 / 0.075, 2)) + Math.exp(-Math.pow(dX2 / 0.075, 2))) * Math.exp(-Math.pow((q + 0.62) / 0.34, 2));
        // 4) Prigogine Liouville-space persistent horizontal correlation bar (q ~ -0.06, independent of k!)
        const hBar = barAmp * 0.95 * Math.exp(-Math.pow((q + 0.06) / 0.145, 2)) * (0.68 + 0.32 * Math.cos(k * 7.5 + ripple));
        psi[j * M + i] = ring + 0.85 * wings + xSaddle + hBar;
      }
    }

    const levels = [0.22, 0.42, 0.65, 0.90, 1.18, 1.48, 1.80];
    marchContours(V, psi, NX, NY, Rx0, Rx1, Ry0, Ry1, levels, (xm, ym, v0, v1, v2, v3) => {
      const val = 0.25 * (v0 + v1 + v2 + v3);
      const uCol = Math.max(0.04, Math.min(0.95, 1.0 - val / 1.95));
      return [dipoleColor(uCol, 0.38 + 0.56 * Math.min(1, val / 1.4)), 1.25 + 0.45 * Math.min(1, val / 1.5)];
    });
    V.text("K = (P1-P2)/SQRT(2)", Rcx - 0.20, Ry0 - 0.04, 0.022, COL.dim);
    return [["FORMALISM", isLiouville ? "LIOUVILLE" : "HILBERT"], ["BAR", isLiouville ? "PERSISTENT" : "ABSENT"], ["PART", (p + 1) + " / 3"]];
  }

  // Part 3: Classical RK4 Chaotic 3-Body Gravitational Scattering (Real X-Y + Radial Phase Space)
  function reset() {
    // Classic chaotic binary + intruder scattering encounter (zero net momentum)
    sim.st = [
      -0.42, 0.0, 0.0, -0.78,
       0.42, 0.0, 0.0,  0.78,
      -1.15, 0.52, 0.68, -0.14,
    ];
    // Subtract center-of-mass velocity
    const m = [1.0, 1.0, 0.85], M = 2.85;
    let vx = 0, vy = 0;
    for (let i = 0; i < 3; i++) { vx += m[i] * sim.st[i * 4 + 2]; vy += m[i] * sim.st[i * 4 + 3]; }
    for (let i = 0; i < 3; i++) { sim.st[i * 4 + 2] -= vx / M; sim.st[i * 4 + 3] -= vy / M; }
    sim.trReal = [[], [], []];
    sim.trPhase = [[], [], []];
    sim.age = 0;
    sim.ready = true;
  }
  if (!sim.ready || sim.age > 13.5) reset();

  if (dt > 0) {
    sim.age += dt;
    const sub = 6, h = Math.min(dt, 0.04) / sub;
    for (let k = 0; k < sub; k++) sim.st = rk4ThreeBody(sim.st, h);
    for (let i = 0; i < 3; i++) {
      const x = sim.st[i * 4], y = sim.st[i * 4 + 1], vx = sim.st[i * 4 + 2], vy = sim.st[i * 4 + 3];
      const r = Math.hypot(x, y) || 1e-4;
      const vr = (x * vx + y * vy) / r;
      sim.trReal[i].push([x, y]);
      sim.trPhase[i].push([r, vr]);
      if (sim.trReal[i].length > 180) { sim.trReal[i].shift(); sim.trPhase[i].shift(); }
    }
  }

  // Left: Real Space (X, Y) | Right: Radial Phase Space (r vs vr)
  const Lcx = -0.48, Lcy = 0.0, Lsc = 0.28;
  const Px0 = 0.08, Pcy = 0.0, Pw = 0.84, Ph = 0.68;
  V.text("REAL SPACE X-Y", -0.92, 0.72, 0.034, COL.dim);
  V.text("PHASE SPACE (R, VR)", 0.08, 0.72, 0.034, COL.dim);
  V.line(-0.02, -0.78, -0.02, 0.74, COL.grid, 1.0);
  V.line(Px0, Pcy, Px0 + Pw, Pcy, COL.grid, 1.0);
  V.line(Px0, -0.72, Px0, 0.68, COL.grid, 1.0);
  V.text("R", Px0 + Pw - 0.04, Pcy - 0.05, 0.032, COL.dim);
  V.text("VR", Px0 + 0.02, 0.66, 0.032, COL.dim);

  const cols = [[0.98, 0.62, 0.24, 0.95], [0.34, 0.78, 0.98, 0.95], [0.94, 0.36, 0.42, 0.95]];
  for (let i = 0; i < 3; i++) {
    const tr = sim.trReal[i], tp = sim.trPhase[i], col = cols[i];
    for (let k = 1; k < tr.length; k++) {
      const a = 0.14 + 0.80 * (k / tr.length);
      const c = [col[0], col[1], col[2], a];
      const rx0 = Lcx + tr[k - 1][0] * Lsc, ry0 = Lcy + tr[k - 1][1] * Lsc;
      const rx1 = Lcx + tr[k][0] * Lsc, ry1 = Lcy + tr[k][1] * Lsc;
      if (rx0 < -0.03 && rx1 < -0.03) V.line(rx0, ry0, rx1, ry1, c, 1.3);
      const px0 = Px0 + Math.min(1, tp[k - 1][0] / 2.2) * Pw;
      const py0 = Pcy + Math.max(-1, Math.min(1, tp[k - 1][1] / 2.4)) * Ph;
      const px1 = Px0 + Math.min(1, tp[k][0] / 2.2) * Pw;
      const py1 = Pcy + Math.max(-1, Math.min(1, tp[k][1] / 2.4)) * Ph;
      V.line(px0, py0, px1, py1, c, 1.2);
    }
    const hx = Lcx + sim.st[i * 4] * Lsc, hy = Lcy + sim.st[i * 4 + 1] * Lsc;
    if (hx < -0.03) V.circ(hx, hy, 0.022, col, 2.0, 12);
    if (tp.length) {
      const lp = tp[tp.length - 1];
      V.circ(Px0 + Math.min(1, lp[0] / 2.2) * Pw, Pcy + Math.max(-1, Math.min(1, lp[1] / 2.4)) * Ph, 0.016, col, 1.8, 8);
    }
  }

  // Compute conserved total energy & minimum pair separation
  const m = [1.0, 1.0, 0.85];
  let E = 0, minR = 99;
  for (let i = 0; i < 3; i++) {
    E += 0.5 * m[i] * (sim.st[i * 4 + 2] ** 2 + sim.st[i * 4 + 3] ** 2);
    for (let j = i + 1; j < 3; j++) {
      const d = Math.hypot(sim.st[j * 4] - sim.st[i * 4], sim.st[j * 4 + 1] - sim.st[i * 4 + 1]);
      if (d < minR) minR = d;
      E -= (m[i] * m[j]) / Math.sqrt(d * d + 0.018);
    }
  }
  return [["E TOT", E.toFixed(2)], ["MIN R", minR.toFixed(2)], ["BODIES", "3 (RK4)"]];
}

// Shared full-plane Marching Squares contour renderer for the Electrodynamics Field Topology Zoo
function marchContours(V, psi, NX, NY, xMin, xMax, yMin, yMax, levels, styleFn, skipFn) {
  const M = NX + 1;
  const hx = (xMax - xMin) / NX, hy = (yMax - yMin) / NY;
  const ex = [0, 0, 0, 0], ey = [0, 0, 0, 0];
  for (let j = 0; j < NY; j++) {
    const y0 = yMin + j * hy, y1 = y0 + hy, ym = y0 + 0.5 * hy;
    const row0 = j * M, row1 = row0 + M;
    for (let i = 0; i < NX; i++) {
      const x0 = xMin + i * hx, x1 = x0 + hx, xm = x0 + 0.5 * hx;
      if (skipFn && skipFn(xm, ym)) continue;
      const v0 = psi[row0 + i], v1 = psi[row0 + i + 1], v2 = psi[row1 + i + 1], v3 = psi[row1 + i];
      const vmin = Math.min(v0, v1, v2, v3), vmax = Math.max(v0, v1, v2, v3);
      if (vmax < levels[0] || vmin > levels[levels.length - 1]) continue;
      const st = styleFn(xm, ym, v0, v1, v2, v3);
      if (!st) continue;
      const [col, lw] = st;
      for (let li = 0; li < levels.length; li++) {
        const lv = levels[li];
        if (lv < vmin || lv > vmax) continue;
        const cidx = (v0 >= lv ? 1 : 0) | (v1 >= lv ? 2 : 0) | (v2 >= lv ? 4 : 0) | (v3 >= lv ? 8 : 0);
        if (cidx === 0 || cidx === 15) continue;
        let edges;
        if (cidx === 5) edges = 0.25 * (v0 + v1 + v2 + v3) >= lv ? [3, 2, 0, 1] : [3, 0, 1, 2];
        else if (cidx === 10) edges = 0.25 * (v0 + v1 + v2 + v3) >= lv ? [3, 0, 1, 2] : [3, 2, 0, 1];
        else edges = DIPOLE_MS[cidx];
        const d0 = v1 - v0, d1 = v2 - v1, d2 = v2 - v3, d3 = v3 - v0;
        ex[0] = x0 + (Math.abs(d0) > 1e-9 ? (lv - v0) / d0 : 0.5) * hx; ey[0] = y0;
        ex[1] = x1; ey[1] = y0 + (Math.abs(d1) > 1e-9 ? (lv - v1) / d1 : 0.5) * hy;
        ex[2] = x0 + (Math.abs(d2) > 1e-9 ? (lv - v3) / d2 : 0.5) * hx; ey[2] = y1;
        ex[3] = x0; ey[3] = y0 + (Math.abs(d3) > 1e-9 ? (lv - v0) / d3 : 0.5) * hy;
        for (let k = 0; k < edges.length; k += 2) {
          const a = edges[k], b = edges[k + 1];
          V.line(ex[a], ey[a], ex[b], ey[b], col, lw);
        }
      }
    }
  }
}

// XXVII. ELECTROSTATIC TOPOLOGY ZOO (4 parts: Saddle / Dipole / X-Null / Grounded Image Plane)
function drawElectrostaticZoo(V, sim, t, dt, part) {
  const p = (part || 0) % 4;
  // Gentle breathing motion so students see how topological invariants (saddles, X-nulls, mirror planes) deform continuously
  const breathe = 0.06 * Math.sin(t * 1.1);
  let charges = [], E0x = 0, mirrorX = null;
  if (p === 0) {
    // Part 1: Point charge in uniform E-field -> hyperbolic stagnation saddle point
    charges = [{ x: -0.10, y: 0, q: 1.0 }];
    E0x = 0.95 + 0.35 * Math.sin(t * 0.9);
  } else if (p === 1) {
    // Part 2: Static electric dipole (+q, -q) -> closed source-to-sink flux loops
    const d = 0.34 + breathe;
    charges = [{ x: -d, y: 0, q: 1.0 }, { x: d, y: 0, q: -1.0 }];
  } else if (p === 2) {
    // Part 3: Like charges (+q, +q) -> repulsive hyperbolic X-null at midpoint
    const d = 0.34 + breathe;
    charges = [{ x: -d, y: 0, q: 1.0 }, { x: d, y: 0, q: 1.0 }];
  } else {
    // Part 4: Method of Images — charge +q above grounded conducting plane x = 0 (phi = 0)
    const d = 0.36 + breathe;
    charges = [{ x: d, y: 0, q: 1.0 }, { x: -d, y: 0, q: -1.0, img: true }];
    mirrorX = 0.0;
  }

  function fieldE(x, y) {
    let ex = E0x, ey = 0;
    for (let i = 0; i < charges.length; i++) {
      const c = charges[i], dx = x - c.x, dy = y - c.y;
      const r2 = dx * dx + dy * dy + 0.0008;
      const inv = c.q / Math.pow(r2, 1.5);
      ex += dx * inv; ey += dy * inv;
    }
    return [ex, ey];
  }

  // 1) Equipotential contours (subtle background lattice via Marching Squares on scalar potential Phi)
  const NX = 52, NY = 40;
  if (!sim.phi || sim.phi.length !== (NX + 1) * (NY + 1)) sim.phi = new Float32Array((NX + 1) * (NY + 1));
  const phi = sim.phi;
  const xMin = -1.05, xMax = 1.05, yMin = -0.78, yMax = 0.78;
  for (let j = 0; j <= NY; j++) {
    const y = yMin + (j / NY) * (yMax - yMin);
    for (let i = 0; i <= NX; i++) {
      const x = xMin + (i / NX) * (xMax - xMin);
      let val = -E0x * x;
      for (let c = 0; c < charges.length; c++) {
        const dx = x - charges[c].x, dy = y - charges[c].y;
        val += charges[c].q * 0.55 / Math.sqrt(dx * dx + dy * dy + 0.004);
      }
      phi[j * (NX + 1) + i] = val;
    }
  }
  const eqLevels = [-2.2, -1.5, -1.0, -0.65, -0.35, -0.15, 0.15, 0.35, 0.65, 1.0, 1.5, 2.2];
  marchContours(V, phi, NX, NY, xMin, xMax, yMin, yMax, eqLevels, (xm, ym) => {
    if (mirrorX !== null && xm < mirrorX) return [[0.28, 0.44, 0.62, 0.14], 0.85];
    return [[0.32, 0.52, 0.72, 0.22], 0.9];
  }, (xm, ym) => {
    for (let c = 0; c < charges.length; c++) if (Math.hypot(xm - charges[c].x, ym - charges[c].y) < 0.055) return true;
    return false;
  });

  // 2) Exact RK2 field-line tracing colored by physical |E| in dipoleColor
  function traceLine(x0, y0, dir, maxSteps) {
    let x = x0, y = y0;
    const ds = 0.022;
    for (let s = 0; s < maxSteps; s++) {
      const [ex1, ey1] = fieldE(x, y);
      const m1 = Math.hypot(ex1, ey1);
      if (m1 < 1e-4) break;
      const mx = x + dir * (ex1 / m1) * ds * 0.5;
      const my = y + dir * (ey1 / m1) * ds * 0.5;
      const [ex2, ey2] = fieldE(mx, my);
      const m2 = Math.hypot(ex2, ey2);
      if (m2 < 1e-4) break;
      const nx = x + dir * (ex2 / m2) * ds;
      const ny = y + dir * (ey2 / m2) * ds;
      if (nx < xMin || nx > xMax || ny < yMin || ny > yMax) break;
      // Stop if hitting any charge core
      let hit = false;
      for (let c = 0; c < charges.length; c++) {
        if (Math.hypot(nx - charges[c].x, ny - charges[c].y) < 0.032) { hit = true; break; }
      }
      const uCol = Math.max(0.05, Math.min(0.95, 1.0 - Math.log(1 + m2 * 1.4) / 3.4));
      const inMirror = mirrorX !== null && (x < mirrorX || nx < mirrorX);
      const alpha = inMirror ? 0.24 : 0.86;
      V.line(x, y, nx, ny, dipoleColor(uCol, alpha), inMirror ? 1.05 : 1.45);
      x = nx; y = ny;
      if (hit) break;
    }
  }

  // Seed field lines uniformly around each real charge (+ outward, - inward)
  const nRays = p === 0 ? 16 : 18;
  for (let c = 0; c < charges.length; c++) {
    const ch = charges[c];
    if (ch.img) continue;
    for (let k = 0; k < nRays; k++) {
      const a = ((k + 0.5) / nRays) * Math.PI * 2;
      traceLine(ch.x + Math.cos(a) * 0.038, ch.y + Math.sin(a) * 0.038, ch.q > 0 ? 1 : -1, 120);
    }
  }
  // For Part 1 (uniform field), also seed incoming background field lines from the left edge
  if (p === 0) {
    for (let k = -6; k <= 6; k++) {
      if (k === 0) continue;
      traceLine(xMin + 0.01, k * 0.115, 1, 130);
    }
    // Highlight the hyperbolic stagnation saddle point x_s = x_q - 1/sqrt(E0)
    const xs = charges[0].x - 1 / Math.sqrt(Math.max(0.1, E0x));
    if (xs > xMin && xs < xMax) {
      V.circ(xs, 0, 0.026, [1.0, 0.92, 0.55, 0.9], 1.6, 12);
      V.text("SADDLE", xs - 0.10, 0.06, 0.030, [1.0, 0.92, 0.55, 0.85]);
    }
  }
  // For Part 3 (like charges), highlight the central hyperbolic X-null
  if (p === 2) {
    V.line(-0.04, -0.04, 0.04, 0.04, [1.0, 0.92, 0.55, 0.9], 1.6);
    V.line(-0.04, 0.04, 0.04, -0.04, [1.0, 0.92, 0.55, 0.9], 1.6);
    V.text("X-NULL", -0.09, 0.075, 0.030, [1.0, 0.92, 0.55, 0.85]);
  }
  // For Part 4 (grounded conducting plane), draw mirror conductor at x = 0
  if (mirrorX !== null) {
    V.line(0, yMin, 0, yMax, [0.82, 0.90, 0.98, 0.92], 2.4);
    for (let y = yMin + 0.06; y < yMax; y += 0.10) {
      V.line(0, y, -0.035, y - 0.035, [0.65, 0.78, 0.90, 0.45], 1.1);
    }
    V.text("CONDUCTOR PHI=0", 0.04, 0.72, 0.030, COL.paper);
    V.text("IMAGE -Q", -0.62, 0.72, 0.030, COL.dim);
  }

  // Draw charge markers
  for (let c = 0; c < charges.length; c++) {
    const ch = charges[c];
    const col = ch.q > 0 ? [1.0, 0.58, 0.22, ch.img ? 0.45 : 0.96] : [0.32, 0.76, 1.0, ch.img ? 0.45 : 0.96];
    V.circ(ch.x, ch.y, 0.030, col, 2.2, 14);
    V.line(ch.x - 0.014, ch.y, ch.x + 0.014, ch.y, col, 1.8);
    if (ch.q > 0) V.line(ch.x, ch.y - 0.014, ch.x, ch.y + 0.014, col, 1.8);
  }

  const names = ["SADDLE POINT", "STATIC DIPOLE", "LIKE X-NULL", "IMAGE PLANE"];
  const topo = ["INDEX -1", "SOURCE-SINK", "BIFURCATION", "E PERP WALL"];
  return [["TOPOLOGY", names[p]], ["INVARIANT", topo[p]], ["PART", (p + 1) + " / 4"]];
}

// XXVIII. RELATIVISTIC CHARGE, BREMSSTRAHLUNG KINK & CHERENKOV CONE (3 parts)
function drawRelativisticCharge(V, sim, t, dt, part) {
  const p = (part || 0) % 3;
  if (p === 0) {
    // Part 1: Heaviside-Feynman Lorentz Pancake (beta sweeps 0.0 -> 0.88)
    const beta = 0.44 + 0.44 * Math.sin(t * 0.75 - Math.PI * 0.5);
    const gamma = 1 / Math.sqrt(Math.max(0.02, 1 - beta * beta));
    const nRays = 32, Rmax = 0.88;
    // Radial field lines boosted by tan(theta) = gamma * tan(theta_0)
    for (let k = 0; k < nRays; k++) {
      const th0 = ((k + 0.5) / nRays) * Math.PI * 2;
      const th = Math.atan2(gamma * Math.sin(th0), Math.cos(th0));
      const cth = Math.cos(th), sth = Math.sin(th);
      const angFac = (1 - beta * beta) / Math.pow(Math.max(0.04, 1 - beta * beta * sth * sth), 1.5);
      const segsN = 18;
      for (let s = 0; s < segsN; s++) {
        const r0 = 0.04 + (Rmax - 0.04) * (s / segsN);
        const r1 = 0.04 + (Rmax - 0.04) * ((s + 1) / segsN);
        const rm = 0.5 * (r0 + r1);
        const Emag = angFac / (rm * rm);
        const uCol = Math.max(0.04, Math.min(0.95, 1.0 - Math.log(1 + Emag * 0.65) / 4.2));
        const fade = rm > 0.65 ? Math.max(0, 1 - (rm - 0.65) / 0.25) : 1;
        V.line(cth * r0, sth * r0, cth * r1, sth * r1, dipoleColor(uCol, 0.86 * fade), 1.45);
      }
    }
    // Elliptical Lorentz-contracted equipotential shells (x*gamma)^2 + y^2 = R^2
    for (let e = 1; e <= 4; e++) {
      const Re = e * 0.17;
      let px = Re / gamma, py = 0;
      for (let a = 1; a <= 48; a++) {
        const ang = (a / 48) * Math.PI * 2;
        const nx = (Re / gamma) * Math.cos(ang), ny = Re * Math.sin(ang);
        V.line(px, py, nx, ny, [0.42, 0.72, 0.96, 0.24], 1.0);
        px = nx; py = ny;
      }
    }
    // Velocity arrow
    V.line(0.06, 0, 0.06 + beta * 0.34, 0, [1.0, 0.92, 0.55, 0.9], 2.0);
    V.text("V = " + beta.toFixed(2) + "C", 0.08, 0.07, 0.032, [1.0, 0.92, 0.55, 0.9]);
    V.circ(0, 0, 0.030, [1.0, 0.62, 0.24, 0.98], 2.2, 14);
    return [["BETA V/C", beta.toFixed(2)], ["GAMMA", gamma.toFixed(2)], ["E_PERP/E0", gamma.toFixed(2) + "X"]];
  } else if (p === 1) {
    // Part 2: Purcell Bremsstrahlung Radiation Kink (sudden kick -> expanding transverse shell at c)
    const cycle = (t * 0.42) % 1.0;
    const Rkink = 0.14 + cycle * 0.76;
    const dR = 0.055;
    const Rinner = Math.max(0.06, Rkink - dR);
    const xOld = -0.14, dxKick = Math.min(0.24, cycle * 0.34);
    const xNew = xOld + Math.min(dxKick, Rinner * 0.68);
    const nRays = 28, Rmax = 0.92;
    for (let k = 0; k < nRays; k++) {
      const a = ((k + 0.5) / nRays) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      // Intersect inner ray (from xNew along angle a) with concentric inner light sphere centered at xOld of radius Rinner
      const ocx = xNew - xOld;
      const b = ocx * ca;
      const disc = Math.max(0, b * b - (ocx * ocx - Rinner * Rinner));
      const rIn = Math.max(0.04, -b + Math.sqrt(disc));
      const ix0 = xNew + ca * 0.035, iy0 = sa * 0.035;
      const ix1 = xNew + ca * rIn, iy1 = sa * rIn;
      V.line(ix0, iy0, ix1, iy1, dipoleColor(0.26, 0.86), 1.35);
      // Outer region: old static charge Coulomb field (r > Rkink, centered at xOld)
      const ox0 = xOld + ca * Rkink, oy0 = sa * Rkink;
      const ox1 = xOld + ca * Rmax, oy1 = sa * Rmax;
      if (Rkink < Rmax) {
        V.line(ox0, oy0, ox1, oy1, dipoleColor(0.72, 0.58), 1.25);
      }
      // Transverse radiation kink splicing inner & outer field lines cleanly inside [Rinner, Rkink]
      const sinTh = Math.abs(sa);
      const uCol = Math.max(0.02, 0.36 - 0.34 * sinTh);
      V.line(ix1, iy1, ox0, oy0, dipoleColor(uCol, 0.58 + 0.42 * sinTh), 1.6 + 1.4 * sinTh);
    }
    // Light-cone wavefront shells
    V.circ(xOld, 0, Rkink, [1.0, 0.85, 0.45, 0.36], 1.1, 64);
    V.circ(xOld, 0, Rinner, [1.0, 0.85, 0.45, 0.22], 0.9, 64);
    V.circ(xOld, 0, 0.018, COL.dim, 1.2, 10);
    V.circ(xNew, 0, 0.030, [1.0, 0.58, 0.22, 0.98], 2.2, 14);
    V.text("OLD FIELD", xOld - 0.72, 0.68, 0.030, COL.dim);
    V.text("LIGHT SHELL R=CT", xOld + Rkink * 0.45, Rkink * 0.82 + 0.05, 0.030, [1.0, 0.85, 0.45, 0.85]);
    return [["SHELL R", Rkink.toFixed(2) + " CT"], ["POLARIZATION", "TRANSVERSE"], ["PART", "2 / 3"]];
  } else {
    // Part 3: Cherenkov Radiation Mach Cone (v = 1.45 c/n in dielectric)
    const vRel = 1.45; // n * beta
    const xNow = -0.78 + ((t * 0.55) % 1.62);
    const sinM = 1 / vRel, cosM = Math.sqrt(1 - sinM * sinM);
    // Huygens circular wavefronts emitted at past positions
    const nCirc = 14;
    for (let i = 1; i <= nCirc; i++) {
      const dtPast = i * 0.095;
      const xPast = xNow - vRel * dtPast * 0.55;
      const rad = dtPast * 0.55;
      if (xPast < -1.25 || rad > 0.95) continue;
      const u = i / nCirc;
      V.circ(xPast, 0, rad, dipoleColor(0.20 + 0.70 * u, 0.62 * (1 - 0.65 * u)), 1.25, 48);
    }
    // Bright constructive Cherenkov Mach shock cone
    const coneLen = 1.18;
    const tx = xNow - coneLen * cosM, ty = coneLen * sinM;
    V.line(xNow, 0, tx, ty, dipoleColor(0.08, 0.96), 2.8);
    V.line(xNow, 0, tx, -ty, dipoleColor(0.08, 0.96), 2.8);
    V.line(xNow, 0, tx, ty, [0.55, 0.88, 1.0, 0.95], 1.2);
    V.line(xNow, 0, tx, -ty, [0.55, 0.88, 1.0, 0.95], 1.2);
    // Internal transverse wave vectors perpendicular to shock front
    for (let k = 1; k <= 5; k++) {
      const bx = xNow - k * 0.18 * cosM, by = k * 0.18 * sinM;
      V.line(bx, by, bx + sinM * 0.09, by + cosM * 0.09, [0.46, 0.86, 1.0, 0.72], 1.3);
      V.line(bx, -by, bx + sinM * 0.09, -by - cosM * 0.09, [0.46, 0.86, 1.0, 0.72], 1.3);
    }
    V.circ(xNow, 0, 0.028, [0.60, 0.92, 1.0, 0.98], 2.2, 14);
    V.text("CHERENKOV CONE", -0.94, 0.70, 0.032, [0.55, 0.88, 1.0, 0.9]);
    return [["N * BETA", vRel.toFixed(2)], ["THETA_C", (Math.acos(1 / vRel) * 180 / Math.PI).toFixed(1) + " DEG"], ["PART", "3 / 3"]];
  }
}

// XXIX. SYNCHROTRON RADIATION — Exact Retarded-Time Relativistic Orbiting Charge
function drawSynchrotron(V, sim, t) {
  const R0 = 0.145;
  const beta = 0.64; // v/c
  const c = 0.56;
  const omega = (beta * c) / R0;
  const gamma = 1 / Math.sqrt(1 - beta * beta);
  const nLines = 22;
  const nSteps = 56;
  const maxTau = 1.55;

  // Faint circular orbit ring
  V.circ(0, 0, R0, COL.grid, 1.0, 48);

  // Trace each field line from exact retarded emission times t_e = t - tau
  // Relativistic aberration boosts rest-frame emission angle alpha_0 into the lab frame:
  // cos(alpha_lab) = (cos(alpha_0) + beta) / (1 + beta cos(alpha_0))
  for (let l = 0; l < nLines; l++) {
    const alpha0 = (l / nLines) * Math.PI * 2;
    let px = 0, py = 0, hasPrev = false;
    for (let s = 0; s <= nSteps; s++) {
      const tau = (s / nSteps) * maxTau;
      const te = t - tau;
      const phi = omega * te;
      const cx = R0 * Math.cos(phi), cy = R0 * Math.sin(phi);
      // Instantaneous tangent direction of motion at emission time te: phi + pi/2
      const velAng = phi + Math.PI * 0.5;
      const rel0 = alpha0 - velAng;
      const c0 = Math.cos(rel0), s0 = Math.sin(rel0);
      const denom = 1 + beta * c0;
      const cl = (c0 + beta) / denom;
      const sl = (s0 / gamma) / denom;
      // Rotate lab emission vector back by velAng
      const cv = Math.cos(velAng), sv = Math.sin(velAng);
      const ux = cl * cv - sl * sv;
      const uy = cl * sv + sl * cv;
      const x = cx + c * tau * ux;
      const y = cy + c * tau * uy;
      if (hasPrev) {
        const rMid = Math.hypot(0.5 * (px + x), 0.5 * (py + y));
        if (rMid < 0.94) {
          // Local segment stretch indicates transverse radiation compression (synchrotron shock!)
          const segLen = Math.hypot(x - px, y - py);
          const expected = (c * maxTau) / nSteps;
          const kink = Math.max(0, segLen / expected - 1.0);
          const uCol = Math.max(0.03, Math.min(0.95, 0.88 - Math.log(1 + kink * 3.8 + 0.25 / (rMid + 0.08)) / 2.6));
          const fade = rMid > 0.68 ? Math.max(0, 1 - (rMid - 0.68) / 0.26) : 1;
          V.line(px, py, x, y, dipoleColor(uCol, 0.86 * fade), 1.35 + Math.min(0.8, kink * 0.45));
        }
      }
      px = x; py = y; hasPrev = true;
    }
  }
  const phiNow = omega * t;
  const qx = R0 * Math.cos(phiNow), qy = R0 * Math.sin(phiNow);
  V.circ(qx, qy, 0.026, [1.0, 0.64, 0.22, 0.98], 2.2, 12);
  return [["BETA V/C", beta.toFixed(2)], ["GAMMA", gamma.toFixed(2)], ["BEAMING", "1 / GAMMA"]];
}

// XXX. MULTIPOLE RADIATION ZOO (4 parts: l=1 Dipole / l=2 Quadrupole / l=3 Octupole / Rotating Spiral Dipole)
function drawMultipoleZoo(V, sim, t, dt, part) {
  const p = (part || 0) % 4;
  const lam = 0.72, k = (Math.PI * 2) / lam, wt = t * 1.9;
  const Rmax = 0.92, Rcore = 0.055;

  if (p < 3) {
    // Parts 1–3: 4-way quadrant-symmetric Marching Squares for l = 1 (Dipole), l = 2 (Quadrupole), l = 3 (Octupole)
    const N = 46, M = N + 1, h = Rmax / N;
    if (!sim.psi || sim.psi.length !== M * M) sim.psi = new Float32Array(M * M);
    const psi = sim.psi;
    const cw = Math.cos(wt), sw = Math.sin(wt);
    for (let j = 0; j < M; j++) {
      const y = j * h;
      for (let i = 0; i < M; i++) {
        const x = i * h, r2 = x * x + y * y, r = Math.sqrt(r2);
        if (r < 1e-6) { psi[j * M + i] = 0; continue; }
        const kr = k * r, inv = 1 / kr;
        const c = Math.cos(kr) * cw + Math.sin(kr) * sw;
        const s = Math.sin(kr) * cw - Math.cos(kr) * sw;
        const sin2 = (x * x) / r2, cosTh = y / r;
        if (p === 0) {
          psi[j * M + i] = sin2 * (c * inv + s);
        } else if (p === 1) {
          psi[j * M + i] = sin2 * cosTh * ((3 * inv * inv - 1) * c + 3 * inv * s);
        } else {
          // Exact l=3 Octupole angular factor sin^2(theta)*(5 cos^2(theta) - 1) with near/mid/far spherical Hankel envelope
          const ang = sin2 * (5 * cosTh * cosTh - 1) * 0.55;
          const inv2 = inv * inv, inv3 = inv2 * inv;
          psi[j * M + i] = ang * ((15 * inv3 - 6 * inv) * c + (1 - 15 * inv2) * s);
        }
      }
    }
    const levels = p === 0
      ? [-1.25, -0.92, -0.64, -0.40, -0.18, 0.18, 0.40, 0.64, 0.92, 1.25]
      : [-0.95, -0.68, -0.44, -0.24, -0.10, 0.10, 0.24, 0.44, 0.68, 0.95];
    const ex = [0, 0, 0, 0], ey = [0, 0, 0, 0];
    for (let j = 0; j < N; j++) {
      const y0 = j * h, y1 = y0 + h, ym = y0 + 0.5 * h;
      const row0 = j * M, row1 = row0 + M;
      for (let i = 0; i < N; i++) {
        const x0 = i * h, x1 = x0 + h, xm = x0 + 0.5 * h;
        const rm = Math.hypot(xm, ym);
        if (rm < Rcore || rm > Rmax) continue;
        const v0 = psi[row0 + i], v1 = psi[row0 + i + 1], v2 = psi[row1 + i + 1], v3 = psi[row1 + i];
        const vmin = Math.min(v0, v1, v2, v3), vmax = Math.max(v0, v1, v2, v3);
        if (vmax < levels[0] || vmin > levels[levels.length - 1]) continue;
        const u = rm / Rmax;
        const grad = Math.hypot(v1 - v0, v3 - v0) / h;
        const uCol = Math.max(0.04, Math.min(0.95, 1.0 - Math.log(1 + grad * 0.65) / 3.4));
        const fade = u < 0.66 ? 1 : Math.max(0, Math.cos(((u - 0.66) / 0.34) * Math.PI * 0.5));
        const col = dipoleColor(uCol, (0.38 + 0.52 * (1 - 0.3 * u)) * fade);
        const lw = 1.42 - 0.22 * u;
        for (let li = 0; li < levels.length; li++) {
          const lv = levels[li];
          if (lv < vmin || lv > vmax) continue;
          const cidx = (v0 >= lv ? 1 : 0) | (v1 >= lv ? 2 : 0) | (v2 >= lv ? 4 : 0) | (v3 >= lv ? 8 : 0);
          if (cidx === 0 || cidx === 15) continue;
          let edges;
          if (cidx === 5) edges = 0.25 * (v0 + v1 + v2 + v3) >= lv ? [3, 2, 0, 1] : [3, 0, 1, 2];
          else if (cidx === 10) edges = 0.25 * (v0 + v1 + v2 + v3) >= lv ? [3, 0, 1, 2] : [3, 2, 0, 1];
          else edges = DIPOLE_MS[cidx];
          const d0 = v1 - v0, d1 = v2 - v1, d2 = v2 - v3, d3 = v3 - v0;
          ex[0] = x0 + (Math.abs(d0) > 1e-9 ? (lv - v0) / d0 : 0.5) * h; ey[0] = y0;
          ex[1] = x1; ey[1] = y0 + (Math.abs(d1) > 1e-9 ? (lv - v1) / d1 : 0.5) * h;
          ex[2] = x0 + (Math.abs(d2) > 1e-9 ? (lv - v3) / d2 : 0.5) * h; ey[2] = y1;
          ex[3] = x0; ey[3] = y0 + (Math.abs(d3) > 1e-9 ? (lv - v0) / d3 : 0.5) * h;
          for (let m = 0; m < edges.length; m += 2) {
            const ax = ex[edges[m]], ay = ey[edges[m]], bx = ex[edges[m + 1]], by = ey[edges[m + 1]];
            V.line( ax,  ay,  bx,  by, col, lw);
            V.line(-ax,  ay, -bx,  by, col, lw);
            V.line( ax, -ay,  bx, -by, col, lw);
            V.line(-ax, -ay, -bx, -by, col, lw);
          }
        }
      }
    }
    const ph = Math.cos(wt);
    V.circ(0, 0, 0.022, ph >= 0 ? [1.0, 0.58, 0.22, 0.95] : [0.32, 0.74, 1.0, 0.95], 2.0, 12);
    const lbls = ["L=1 DIPOLE", "L=2 QUADRUPOLE", "L=3 OCTUPOLE"];
    const lobes = ["2 LOBES", "4 LOBES", "6 LOBES"];
    return [["ORDER", lbls[p]], ["PATTERN", lobes[p]], ["PART", (p + 1) + " / 4"]];
  } else {
    // Part 4: Rotating Circular Dipole (l=1, m=+/-1) -> Twin-arm Archimedean spiral radiation!
    const NX = 62, NY = 62, M = NX + 1;
    if (!sim.psiRot || sim.psiRot.length !== M * M) sim.psiRot = new Float32Array(M * M);
    const psi = sim.psiRot;
    for (let j = 0; j <= NY; j++) {
      const y = -Rmax + (2 * Rmax * j) / NY;
      for (let i = 0; i <= NX; i++) {
        const x = -Rmax + (2 * Rmax * i) / NX;
        const r = Math.hypot(x, y);
        if (r < 1e-5) { psi[j * M + i] = 0; continue; }
        const kr = k * r, phi = Math.atan2(y, x);
        const ph = kr - wt - phi;
        // Exact single-valued rotating dipole stream function (zero branch cut!)
        psi[j * M + i] = (Math.cos(ph) / kr + Math.sin(ph)) * Math.min(1, r / 0.14);
      }
    }
    const levels = [-1.10, -0.78, -0.48, -0.20, 0.20, 0.48, 0.78, 1.10];
    marchContours(V, psi, NX, NY, -Rmax, Rmax, -Rmax, Rmax, levels, (xm, ym, v0, v1, v2, v3) => {
      const rm = Math.hypot(xm, ym), u = rm / Rmax;
      const fade = u < 0.68 ? 1 : Math.max(0, Math.cos(((u - 0.68) / 0.32) * Math.PI * 0.5));
      if (fade < 0.02) return null;
      const g = Math.hypot(v1 - v0, v3 - v0) * (NX / (2 * Rmax));
      const uCol = Math.max(0.05, Math.min(0.95, 1.0 - Math.log(1 + g * 0.55) / 3.2));
      return [dipoleColor(uCol, 0.86 * fade), 1.42 - 0.22 * u];
    }, (xm, ym) => {
      const r = Math.hypot(xm, ym);
      return r < 0.075 || r > Rmax;
    });
    // Rotating +/- dipole charges at center
    const dR = 0.042;
    V.circ( dR * Math.cos(wt),  dR * Math.sin(wt), 0.018, [1.0, 0.56, 0.20, 0.96], 2.0, 10);
    V.circ(-dR * Math.cos(wt), -dR * Math.sin(wt), 0.018, [0.30, 0.74, 1.0, 0.96], 2.0, 10);
    return [["ORDER", "L=1 M=+-1"], ["PATTERN", "SPIRAL WAVE"], ["PART", "4 / 4"]];
  }
}

// XXXI. PHASED DIPOLE ARRAY — Interference & Beam Steering (3 parts: Broadside / End-Fire / Anti-Phase)
function drawPhasedArray(V, sim, t, dt, part) {
  const p = (part || 0) % 3;
  const lam = 0.56, k = (Math.PI * 2) / lam, wt = t * 2.2;
  const sep = p === 2 ? lam * 0.75 : lam * 0.5; // separation d
  const dphi = p === 0 ? 0 : (p === 1 ? Math.PI * 0.5 : Math.PI);
  const NX = 68, NY = 54, M = NX + 1;
  if (!sim.psi || sim.psi.length !== M * (NY + 1)) sim.psi = new Float32Array(M * (NY + 1));
  const psi = sim.psi;
  const xMin = -1.04, xMax = 1.04, yMin = -0.80, yMax = 0.80;

  function dipPsi(dx, dy, phaseShift) {
    const r2 = dx * dx + dy * dy, r = Math.sqrt(r2);
    if (r < 0.03) return 0;
    const kr = k * r, sin2 = (dx * dx) / r2;
    const ph = kr - wt - phaseShift;
    return sin2 * (Math.cos(ph) / kr + Math.sin(ph));
  }

  const x1 = -sep * 0.5, x2 = sep * 0.5;
  for (let j = 0; j <= NY; j++) {
    const y = yMin + (j / NY) * (yMax - yMin);
    for (let i = 0; i <= NX; i++) {
      const x = xMin + (i / NX) * (xMax - xMin);
      psi[j * M + i] = dipPsi(x - x1, y, 0) + dipPsi(x - x2, y, dphi);
    }
  }
  const levels = [-1.45, -1.05, -0.70, -0.38, -0.15, 0.15, 0.38, 0.70, 1.05, 1.45];
  marchContours(V, psi, NX, NY, xMin, xMax, yMin, yMax, levels, (xm, ym, v0, v1, v2, v3) => {
    const u = Math.hypot(xm / 1.04, ym / 0.80);
    const fade = u < 0.68 ? 1 : Math.max(0, Math.cos(((u - 0.68) / 0.32) * Math.PI * 0.5));
    if (fade < 0.02) return null;
    const g = Math.hypot(v1 - v0, v3 - v0) * (NX / (xMax - xMin));
    const uCol = Math.max(0.04, Math.min(0.95, 1.0 - Math.log(1 + g * 0.42) / 3.4));
    return [dipoleColor(uCol, 0.86 * fade), 1.38 - 0.20 * u];
  }, (xm, ym) => {
    return Math.hypot(xm - x1, ym) < 0.055 || Math.hypot(xm - x2, ym) < 0.055 || Math.hypot(xm / 1.04, ym / 0.80) > 1.0;
  });

  // Draw the two driven dipole antennas
  const c1 = Math.cos(wt) >= 0 ? [1.0, 0.58, 0.22, 0.96] : [0.32, 0.76, 1.0, 0.96];
  const c2 = Math.cos(wt + dphi) >= 0 ? [1.0, 0.58, 0.22, 0.96] : [0.32, 0.76, 1.0, 0.96];
  V.circ(x1, 0, 0.024, c1, 2.2, 12);
  V.circ(x2, 0, 0.024, c2, 2.2, 12);
  const mode = ["BROADSIDE", "END-FIRE ->", "ANTI-PHASE"];
  const phLbl = ["0 DEG", "+90 DEG", "180 DEG"];
  return [["BEAM", mode[p]], ["DELTA PHI", phLbl[p]], ["PART", (p + 1) + " / 3"]];
}

// XXXII. WAVEGUIDE & RESONANT CAVITY MODES (4 parts: TE10 / TE20 / TM22 Cavity / TM32 Cavity)
function drawWaveguideModes(V, sim, t, dt, part) {
  const p = (part || 0) % 4;
  const xMin = -0.96, xMax = 0.96, yMin = -0.52, yMax = 0.52;
  const L = xMax - xMin, H = yMax - yMin;
  const NX = 66, NY = 38, M = NX + 1;
  if (!sim.psi || sim.psi.length !== M * (NY + 1)) sim.psi = new Float32Array(M * (NY + 1));
  const psi = sim.psi;
  const wt = t * 2.4;

  for (let j = 0; j <= NY; j++) {
    const y = yMin + (j / NY) * H;
    const uy = (y - yMin) / H; // 0..1
    for (let i = 0; i <= NX; i++) {
      const x = xMin + (i / NX) * L;
      const ux = (x - xMin) / L; // 0..1
      if (p === 0) {
        // TE10 propagating waveguide: magnetic stream function sin(pi*y/a)*cos(kz*x - wt)
        psi[j * M + i] = Math.sin(Math.PI * uy) * Math.cos(Math.PI * 3.0 * ux - wt);
      } else if (p === 1) {
        // TE20 higher-order waveguide: dual counter-rotating vortex rows
        psi[j * M + i] = Math.sin(2 * Math.PI * uy) * Math.cos(Math.PI * 3.0 * ux - wt);
      } else if (p === 2) {
        // TM22 resonant metallic cavity: 2x2 standing-wave cells
        psi[j * M + i] = Math.sin(2 * Math.PI * ux) * Math.sin(2 * Math.PI * uy) * Math.cos(wt);
      } else {
        // TM32 resonant metallic cavity: 3x2 standing-wave cells
        psi[j * M + i] = Math.sin(3 * Math.PI * ux) * Math.sin(2 * Math.PI * uy) * Math.cos(wt);
      }
    }
  }

  const levels = [-0.88, -0.68, -0.48, -0.28, -0.10, 0.10, 0.28, 0.48, 0.68, 0.88];
  marchContours(V, psi, NX, NY, xMin, xMax, yMin, yMax, levels, (xm, ym, v0, v1, v2, v3) => {
    const mag = Math.abs(0.25 * (v0 + v1 + v2 + v3));
    const uCol = Math.max(0.05, Math.min(0.95, 0.94 - mag * 0.86));
    return [dipoleColor(uCol, 0.42 + 0.54 * mag), 1.35 + 0.35 * mag];
  });

  // Metallic conducting walls (open ends for waveguides p<2, closed box for cavities p>=2)
  const wallCol = [0.84, 0.92, 1.0, 0.92];
  V.line(xMin, yMax, xMax, yMax, wallCol, 2.6);
  V.line(xMin, yMin, xMax, yMin, wallCol, 2.6);
  if (p >= 2) {
    V.line(xMin, yMin, xMin, yMax, wallCol, 2.6);
    V.line(xMax, yMin, xMax, yMax, wallCol, 2.6);
  } else {
    V.text("PROPAGATION ->", -0.22, 0.60, 0.032, COL.dim);
  }
  const names = ["TE10 WAVEGUIDE", "TE20 WAVEGUIDE", "TM22 CAVITY", "TM32 CAVITY"];
  const bc = ["TRAVELING", "DUAL VORTEX", "STANDING 2X2", "STANDING 3X2"];
  return [["MODE", names[p]], ["TOPOLOGY", bc[p]], ["PART", (p + 1) + " / 4"]];
}

// XXXIII. AUDIO FILTERS — Biquad / RLC Low-Pass, High-Pass, Band-Pass & Notch (Bode + Live Waveform)
function drawAudioFilters(V, sim, t, dt, part) {
  const p = (part || 0) % 4;
  // Sweep cutoff f0 logarithmically between 180 Hz and 6.5 kHz
  const logF0 = 2.25 + 1.55 * (0.5 + 0.5 * Math.sin(t * 0.55 - 0.8));
  const f0 = Math.pow(10, logF0);
  const Q = p === 2 ? 3.2 : (p === 3 ? 4.0 : 1.15 + 0.85 * (0.5 + 0.5 * Math.cos(t * 0.37)));

  // Exact 2nd-order analog s-domain transfer function H(jw) for LPF / HPF / BPF / Notch
  function evalH(f) {
    const r = f / f0; // w / w0
    const reD = 1 - r * r, imD = r / Q;
    let reN = 1, imN = 0;
    if (p === 1) { reN = -r * r; imN = 0; }         // High-Pass
    else if (p === 2) { reN = 0; imN = r / Q; }     // Band-Pass
    else if (p === 3) { reN = 1 - r * r; imN = 0; } // Notch
    const den = reD * reD + imD * imD + 1e-12;
    const re = (reN * reD + imN * imD) / den;
    const im = (imN * reD - reN * imD) / den;
    return [Math.hypot(re, im), Math.atan2(im, re), re, im];
  }

  // Top panel: Bode Magnitude |H(f)| (dB) & Phase on log-frequency grid (20 Hz .. 20 kHz)
  const bx0 = -0.96, bx1 = 0.96, by0 = 0.08, by1 = 0.72;
  const bw = bx1 - bx0, bh = by1 - by0;
  V.line(bx0, by0, bx1, by0, COL.grid, 1.0);
  V.line(bx0, by1, bx1, by1, COL.grid, 1.0);
  V.line(bx0, by0, bx0, by1, COL.grid, 1.0);
  V.line(bx1, by0, bx1, by1, COL.grid, 1.0);
  // Log-frequency decade lines (100 Hz, 1 kHz, 10 kHz)
  const fMin = 20, fMax = 20000, logMin = Math.log10(fMin), logSpan = Math.log10(fMax) - logMin;
  const fx = (f) => bx0 + ((Math.log10(f) - logMin) / logSpan) * bw;
  const fyDb = (db) => by0 + Math.max(0, Math.min(1, (db + 48) / 60)) * bh; // -48 dB to +12 dB
  const y0db = fyDb(0);
  V.line(bx0, y0db, bx1, y0db, [0.55, 0.65, 0.78, 0.35], 1.0);
  [100, 1000, 10000].forEach((dec, idx) => {
    const x = fx(dec);
    V.line(x, by0, x, by1, COL.grid, 0.9);
    V.text(["100HZ", "1KHZ", "10KHZ"][idx], x - 0.06, by0 - 0.035, 0.026, COL.dim);
  });
  V.text("0DB", bx0 - 0.09, y0db + 0.015, 0.024, COL.dim);
  V.text("-24", bx0 - 0.09, fyDb(-24) + 0.015, 0.024, COL.dim);
  // Cutoff marker f0
  const xf0 = fx(f0);
  V.line(xf0, by0, xf0, by1, [1.0, 0.72, 0.28, 0.55], 1.2);
  V.text("FC", xf0 + 0.015, by1 - 0.02, 0.026, [1.0, 0.72, 0.28, 0.9]);

  // Draw Bode Magnitude (amber) and Phase (subtle cyan)
  const N = 120;
  let pxM = 0, pyM = 0, pxP = 0, pyP = 0;
  for (let i = 0; i <= N; i++) {
    const f = Math.pow(10, logMin + (i / N) * logSpan);
    const [mag, ph] = evalH(f);
    const db = 20 * Math.log10(Math.max(1e-4, mag));
    const x = bx0 + (i / N) * bw;
    const yM = fyDb(db);
    const yP = by0 + (0.5 + ph / (2 * Math.PI)) * bh;
    if (i > 0) {
      V.line(pxP, pyP, x, yP, [0.34, 0.76, 0.96, 0.34], 1.1);
      V.line(pxM, pyM, x, yM, [1.0, 0.64, 0.24, 0.95], 2.0);
    }
    pxM = x; pyM = yM; pxP = x; pyP = yP;
  }
  V.text("BODE |H(F)| DB & PHASE", bx0 + 0.02, by1 + 0.045, 0.028, COL.dim);

  // Bottom panel: Real-time Time-Domain Waveform (multi-harmonic test signal: raw cyan vs filtered amber)
  const wy0 = -0.74, wy1 = -0.14, wcy = 0.5 * (wy0 + wy1), wh = (wy1 - wy0) * 0.42;
  V.line(bx0, wcy, bx1, wcy, COL.grid, 0.9);
  V.line(bx0, wy0, bx1, wy0, COL.grid, 0.8);
  V.line(bx0, wy1, bx1, wy1, COL.grid, 0.8);
  V.text("TIME DOMAIN: INPUT (CYAN) VS FILTERED (AMBER)", bx0 + 0.02, wy1 + 0.04, 0.026, COL.dim);

  // 5-harmonic composite audio signal (220 Hz, 660 Hz, 1500 Hz, 3400 Hz, 8200 Hz)
  const freqs = [220, 660, 1500, 3400, 8200];
  const amps = [0.42, 0.26, 0.20, 0.16, 0.14];
  const Hvals = freqs.map((f) => evalH(f));
  const Nw = 140;
  let rx0 = 0, ry0 = 0, fx0p = 0, fy0p = 0;
  for (let i = 0; i <= Nw; i++) {
    const u = i / Nw;
    const x = bx0 + u * bw;
    const tau = t * 0.0022 + u * 0.009; // 9 ms window
    let vIn = 0, vOut = 0;
    for (let k = 0; k < freqs.length; k++) {
      const ang = 2 * Math.PI * freqs[k] * tau;
      vIn += amps[k] * Math.sin(ang);
      vOut += amps[k] * Hvals[k][0] * Math.sin(ang + Hvals[k][1]);
    }
    const yIn = wcy + Math.max(-1.05, Math.min(1.05, vIn)) * wh;
    const yOut = wcy + Math.max(-1.05, Math.min(1.05, vOut)) * wh;
    if (i > 0) {
      V.line(rx0, ry0, x, yIn, [0.34, 0.78, 0.96, 0.42], 1.2);
      V.line(fx0p, fy0p, x, yOut, [1.0, 0.64, 0.24, 0.96], 1.9);
    }
    rx0 = x; ry0 = yIn; fx0p = x; fy0p = yOut;
  }

  const names = ["LOW-PASS", "HIGH-PASS", "BAND-PASS", "NOTCH"];
  return [["FILTER", names[p]], ["FC", f0 >= 1000 ? (f0 / 1000).toFixed(2) + " KHZ" : Math.round(f0) + " HZ"], ["Q", Q.toFixed(2)]];
}

// XXXIV. PCM vs 1-BIT DSD & SIGMA-DELTA NOISE SHAPING (3 parts from 2021-12-23 Аудіо.htm)
function drawPcmDsd(V, sim, t, dt, part) {
  const p = (part || 0) % 3;
  const x0 = -0.96, x1 = 0.96, w = x1 - x0;

  if (p === 0) {
    // Part 1: PCM (16-bit staircase, 1/44100 s) vs 1-Bit DSD (2.8224 MHz Sigma-Delta bitstream)
    const ph = t * 1.1;
    // Top: PCM Staircase
    const ty = 0.38, ta = 0.26;
    V.line(x0, ty, x1, ty, COL.grid, 0.9);
    V.text("PCM  (MULTI-BIT STAIRCASE  1/44100 S)", x0, 0.72, 0.028, COL.paper);
    const Nsmooth = 120;
    for (let i = 1; i <= Nsmooth; i++) {
      const u0 = (i - 1) / Nsmooth, u1 = i / Nsmooth;
      V.line(x0 + u0 * w, ty + Math.sin(u0 * Math.PI * 2.5 + ph) * ta,
             x0 + u1 * w, ty + Math.sin(u1 * Math.PI * 2.5 + ph) * ta, [0.92, 0.94, 0.98, 0.48], 1.2);
    }
    const nPcm = 24, levels = 12;
    let prevY = 0;
    for (let i = 0; i < nPcm; i++) {
      const xa = x0 + (i / nPcm) * w, xb = x0 + ((i + 1) / nPcm) * w;
      const s = Math.sin(((i + 0.5) / nPcm) * Math.PI * 2.5 + ph);
      const q = Math.round(s * (levels * 0.5)) / (levels * 0.5);
      const y = ty + q * ta;
      if (i > 0) V.line(xa, prevY, xa, y, [0.36, 0.88, 0.52, 0.92], 1.6);
      V.line(xa, y, xb, y, [0.36, 0.88, 0.52, 0.92], 1.6);
      prevY = y;
    }

    // Bottom: Real-time 1st-order Sigma-Delta 1-bit DSD Bitstream + Analog LPF Reconstruction
    const by = -0.34, ba = 0.26;
    V.line(x0, by, x1, by, COL.grid, 0.9);
    V.text("DSD  (1-BIT SIGMA-DELTA PDM  1/2822400 S)", x0, 0.00, 0.028, COL.paper);
    const nDsd = 128;
    let integ = 0, lpf = 0, prevBit = -1, pxL = x0, pyL = by;
    for (let i = 0; i < nDsd; i++) {
      const xa = x0 + (i / nDsd) * w, xb = x0 + ((i + 1) / nDsd) * w;
      const target = 0.82 * Math.sin(((i + 0.5) / nDsd) * Math.PI * 2.5 + ph);
      const bit = integ >= 0 ? 1 : -1;
      integ += (target - bit);
      lpf += 0.14 * (bit - lpf);
      const yb = by + (bit > 0 ? ba * 0.95 : -ba * 0.95);
      if (i > 0 && bit !== prevBit) V.line(xa, by + (prevBit > 0 ? ba * 0.95 : -ba * 0.95), xa, yb, [0.34, 0.82, 0.98, 0.72], 1.2);
      V.line(xa, yb, xb, yb, [0.34, 0.82, 0.98, 0.78], 1.25);
      const xl = 0.5 * (xa + xb), yl = by + lpf * ba;
      if (i > 2) V.line(pxL, pyL, xl, yl, [1.0, 0.64, 0.24, 0.95], 1.9);
      pxL = xl; pyL = yl; prevBit = bit;
    }
    return [["PCM", "44.1 KHZ / 16B"], ["DSD64", "2.82 MHZ / 1B"], ["PART", "1 / 3"]];
  } else if (p === 1) {
    // Part 2: 2nd-Order Sigma-Delta Modulator Block Diagram (X -> Sigma -> I -> Sigma -> I -> Q -> LPF -> Y)
    function box(x, y, bw, bh, lbl, col) {
      V.line(x, y, x + bw, y, col, 1.6); V.line(x + bw, y, x + bw, y + bh, col, 1.6);
      V.line(x + bw, y + bh, x, y + bh, col, 1.6); V.line(x, y + bh, x, y, col, 1.6);
      V.text(lbl, x + bw * 0.24, y + bh * 0.66, 0.030, col);
    }
    const yB = 0.34, bh = 0.18;
    V.text("2ND-ORDER SIGMA-DELTA MODULATOR LOOP", x0, 0.70, 0.028, COL.dim);
    const cMain = [0.78, 0.88, 0.98, 0.9], cFb = [1.0, 0.64, 0.24, 0.88];
    V.text("X(S)", -0.96, yB + 0.11, 0.030, COL.paper);
    V.line(-0.82, yB + 0.09, -0.70, yB + 0.09, cMain, 1.6);
    box(-0.70, yB, 0.14, bh, "E1", cMain);
    V.line(-0.56, yB + 0.09, -0.46, yB + 0.09, cMain, 1.6);
    box(-0.46, yB, 0.16, bh, "1/S", [0.34, 0.82, 0.98, 0.95]);
    V.line(-0.30, yB + 0.09, -0.20, yB + 0.09, cMain, 1.6);
    box(-0.20, yB, 0.14, bh, "E2", cMain);
    V.line(-0.06, yB + 0.09, 0.04, yB + 0.09, cMain, 1.6);
    box(0.04, yB, 0.16, bh, "1/S", [0.34, 0.82, 0.98, 0.95]);
    V.line(0.20, yB + 0.09, 0.30, yB + 0.09, cMain, 1.6);
    box(0.30, yB, 0.16, bh, "1B Q", cFb);
    V.line(0.46, yB + 0.09, 0.58, yB + 0.09, cFb, 1.6);
    box(0.58, yB, 0.22, bh, "LPF", [0.42, 0.90, 0.56, 0.95]);
    V.line(0.80, yB + 0.09, 0.90, yB + 0.09, [0.42, 0.90, 0.56, 0.95], 1.6);
    V.text("Y", 0.92, yB + 0.11, 0.030, [0.42, 0.90, 0.56, 0.95]);
    // Negative feedback loop back to E1 & E2
    const yF = 0.16;
    V.line(0.52, yB + 0.09, 0.52, yF, cFb, 1.5);
    V.line(0.52, yF, -0.63, yF, cFb, 1.5);
    V.line(-0.63, yF, -0.63, yB, cFb, 1.5);
    V.line(-0.13, yF, -0.13, yB, cFb, 1.5);
    V.text("NEGATIVE FEEDBACK  (-1 BIT)", -0.42, yF - 0.03, 0.024, cFb);

    // Bottom: Live 2nd-order integrator state & reconstructed waveform
    const by = -0.44, ba = 0.24;
    V.line(x0, by, x1, by, COL.grid, 0.9);
    const N = 128;
    let i1 = 0, i2 = 0, lp1 = 0, lp2 = 0, px = x0, py = by, pxE = x0, pyE = by;
    for (let k = 0; k < N; k++) {
      const u = k / N, x = x0 + u * w;
      const sig = 0.72 * Math.sin(u * Math.PI * 3.0 + t * 1.4);
      const q = i2 >= 0 ? 1 : -1;
      i1 += (sig - q);
      i2 += (i1 * 0.5 - q);
      lp1 += 0.16 * (q - lp1);
      lp2 += 0.16 * (lp1 - lp2);
      const yOut = by + lp2 * ba;
      const yErr = by + Math.max(-1, Math.min(1, i1 * 0.35)) * ba * 0.7;
      if (k > 2) {
        V.line(pxE, pyE, x, yErr, [0.34, 0.76, 0.96, 0.35], 1.0);
        V.line(px, py, x, yOut, [1.0, 0.64, 0.24, 0.95], 1.9);
      }
      px = x; py = yOut; pxE = x; pyE = yErr;
    }
    V.text("2ND-ORDER RECONSTRUCTED Y(T) & INTEGRATOR STATE", x0, -0.10, 0.025, COL.dim);
    return [["ORDER", "2ND (2X 1/S)"], ["NTF(Z)", "(1 - Z^-1)^2"], ["PART", "2 / 3"]];
  } else {
    // Part 3: 5th-Order SACD vs 7th-Order Noise Shaping Spectrum (from article's SNR.PNG!)
    const bx0 = -0.92, bx1 = 0.94, by0 = -0.66, by1 = 0.68;
    const bw = bx1 - bx0, bh = by1 - by0;
    V.line(bx0, by0, bx1, by0, COL.grid, 1.0);
    V.line(bx0, by1, bx1, by1, COL.grid, 1.0);
    V.line(bx0, by0, bx0, by1, COL.grid, 1.0);
    V.line(bx1, by0, bx1, by1, COL.grid, 1.0);
    const fMin = 100, fMax = 1e6, logMin = 2, logSpan = 4; // 100 Hz to 1 MHz
    const fx = (f) => bx0 + ((Math.log10(f) - logMin) / logSpan) * bw;
    const fy = (db) => by0 + Math.max(0, Math.min(1, (db + 200) / 200)) * bh; // -200 dB to 0 dB
    // Audible band shading (100 Hz .. 20 kHz)
    const x20k = fx(20000);
    V.fill(bx0, by0, x20k - bx0, bh, [0.22, 0.65, 0.52, 0.08]);
    V.line(x20k, by0, x20k, by1, [0.42, 0.90, 0.62, 0.55], 1.2);
    V.text("AUDIO BAND <= 20KHZ", bx0 + 0.04, by1 - 0.04, 0.026, [0.42, 0.90, 0.62, 0.85]);
    V.text("ULTRASONIC NOISE", x20k + 0.03, by1 - 0.04, 0.026, [1.0, 0.56, 0.24, 0.85]);

    [100, 1000, 10000, 100000, 1000000].forEach((d, idx) => {
      const x = fx(d);
      V.line(x, by0, x, by1, COL.grid, 0.8);
      V.text(["100", "1K", "10K", "100K", "1M"][idx], x - 0.03, by0 - 0.035, 0.024, COL.dim);
    });
    [-160, -120, -80, -40].forEach((db) => {
      const y = fy(db);
      V.line(bx0, y, bx1, y, COL.grid, 0.7);
      V.text(String(db), bx0 - 0.11, y + 0.015, 0.022, COL.dim);
    });

    // Exact NTF curves with optimized resonator notches matching the article's SNR.PNG (5th-order amber, 7th-order blue)
    function ntfDb(f, order) {
      const lf = Math.log10(f); // 2 (100Hz) .. 6 (1MHz)
      if (order === 5) {
        // 5th-order SACD: -126 dB @ 100Hz -> -90 dB @ 5kHz -> resonator dip @ 9.5kHz -> rises to -2 dB @ 150kHz
        const base = -126 + 22 * Math.min(2.0, lf - 2) + 86 * Math.pow(Math.max(0, lf - 4.0) / 1.15, 1.35);
        const dip = -30 * Math.exp(-Math.pow((lf - 3.96) / 0.13, 2)) + 16 * Math.exp(-Math.pow((lf - 4.10) / 0.04, 2));
        return Math.min(-2, Math.max(-196, base + dip));
      } else {
        // 7th-order DSD: -194 dB @ 100Hz -> -167 dB @ 4kHz -> dual resonator dips @ 6kHz & 10.5kHz -> -30 dB @ 100kHz -> -20 dB @ 600kHz
        const base = -194 + 18 * Math.min(1.8, lf - 2) + 138 * Math.pow(Math.max(0, lf - 3.95) / 1.15, 1.25);
        const dip = -28 * Math.exp(-Math.pow((lf - 3.77) / 0.09, 2)) + 34 * Math.exp(-Math.pow((lf - 3.92) / 0.045, 2))
                  - 22 * Math.exp(-Math.pow((lf - 4.02) / 0.10, 2)) - 14 * Math.exp(-Math.pow((lf - 5.28) / 0.18, 2));
        return Math.min(-18, Math.max(-196, base + dip));
      }
    }
    const N = 140;
    let p5x = 0, p5y = 0, p7x = 0, p7y = 0;
    for (let i = 0; i <= N; i++) {
      const f = Math.pow(10, logMin + (i / N) * logSpan);
      const x = bx0 + (i / N) * bw;
      const y5 = fy(ntfDb(f, 5));
      const y7 = fy(ntfDb(f, 7));
      if (i > 0) {
        V.line(p5x, p5y, x, y5, [1.0, 0.56, 0.20, 0.96], 2.0);
        V.line(p7x, p7y, x, y7, [0.30, 0.72, 1.0, 0.96], 2.0);
      }
      p5x = x; p5y = y5; p7x = x; p7y = y7;
    }
    V.text("5TH-ORDER SACD (-110DB)", bx0 + 0.05, fy(-72), 0.026, [1.0, 0.56, 0.20, 0.95]);
    V.text("7TH-ORDER DSD (-155DB)", bx0 + 0.05, fy(-145), 0.026, [0.30, 0.72, 1.0, 0.95]);
    return [["5TH ORDER", "-115 DB"], ["7TH ORDER", "-155 DB"], ["PART", "3 / 3"]];
  }
}

// XXXV. IMPULSE RESPONSE & PRE-RINGING (Analog vs 48/96/192 kHz PCM vs DSD — from ImpulseResponse.png)
function drawImpulseResponse(V, sim, t, dt, part) {
  const p = (part || 0) % 2;
  const x0 = -0.96, x1 = 0.96, w = x1 - x0;

  if (p === 0) {
    // Part 1: Direct 5-system Impulse Response comparison (-6 dB 3 us click) matching ImpulseResponse.png
    const yBase = -0.34, amp = 0.92;
    V.line(x0, yBase, x1, yBase, COL.grid, 1.0);
    V.text("DIRAC CLICK IMPULSE RESPONSE (-6 DB / 3 US)", x0, 0.72, 0.028, COL.dim);

    const systems = [
      { cx: -0.78, label: "ANALOG",  bw: 18.0, peak: 1.00, ring: 0.02, col: [0.40, 0.94, 0.54, 0.96] },
      { cx: -0.39, label: "48 KHZ",  bw: 2.2,  peak: 0.36, ring: 1.00, col: [1.0, 0.56, 0.24, 0.96] },
      { cx:  0.00, label: "96 KHZ",  bw: 4.4,  peak: 0.58, ring: 0.85, col: [1.0, 0.74, 0.30, 0.96] },
      { cx:  0.39, label: "192 KHZ", bw: 8.2,  peak: 0.84, ring: 0.68, col: [0.36, 0.78, 0.98, 0.96] },
      { cx:  0.78, label: "DSD",     bw: 16.5, peak: 1.02, ring: 0.08, col: [0.46, 0.98, 0.62, 0.98] },
    ];
    // Animated scan pulse sweeping across all 5 systems
    const scan = 0.88 + 0.12 * Math.sin(t * 2.2);
    systems.forEach((sys) => {
      const span = 0.175, N = 64;
      let px = 0, py = 0;
      for (let i = 0; i <= N; i++) {
        const u = (i / N) * 2 - 1; // -1..1
        const x = sys.cx + u * span;
        const arg = u * Math.PI * sys.bw;
        const sinc = Math.abs(arg) < 1e-4 ? 1 : Math.sin(arg) / arg;
        const env = Math.exp(-u * u * (sys.ring < 0.2 ? 18.0 : 3.2));
        const val = sys.peak * sinc * env * scan;
        const y = yBase + val * amp;
        if (i > 0) V.line(px, py, x, y, sys.col, 1.85);
        px = x; py = y;
      }
      V.text(sys.label, sys.cx - 0.085, yBase - 0.16, 0.026, sys.col);
    });
    return [["TEST", "3 US CLICK"], ["48K RING", "PRE + POST"], ["DSD", "CLEAN SPIKE"]];
  } else {
    // Part 2: Linear-Phase Brickwall (Pre-Ringing) vs Minimum-Phase (Causal) vs Pure DSD Analog LPF
    const rows = [
      { y:  0.40, lbl: "LINEAR-PHASE BRICKWALL (SYMMETRIC PRE-RINGING)", mode: 0, col: [1.0, 0.56, 0.24, 0.96] },
      { y: -0.04, lbl: "MINIMUM-PHASE IIR (CAUSAL, POST-RINGING ONLY)",  mode: 1, col: [0.34, 0.78, 0.98, 0.96] },
      { y: -0.48, lbl: "PURE DSD + GENTLE ANALOG LPF (ZERO RINGING)",    mode: 2, col: [0.42, 0.94, 0.56, 0.96] },
    ];
    const t0 = -0.10;
    V.line(t0, -0.72, t0, 0.68, [0.95, 0.92, 0.72, 0.28], 1.0);
    V.text("T=0", t0 + 0.015, 0.66, 0.024, COL.dim);

    rows.forEach((r) => {
      V.line(x0, r.y, x1, r.y, COL.grid, 0.8);
      V.text(r.lbl, x0, r.y + 0.22, 0.024, r.col);
      const N = 150;
      let px = 0, py = 0;
      for (let i = 0; i <= N; i++) {
        const x = x0 + (i / N) * w;
        const dtX = x - t0;
        let val = 0;
        if (r.mode === 0) {
          const arg = dtX * 36;
          val = (Math.abs(arg) < 1e-4 ? 1 : Math.sin(arg) / arg) * Math.exp(-dtX * dtX * 4.5);
        } else if (r.mode === 1) {
          if (dtX >= 0) val = Math.exp(-dtX * 5.2) * (Math.cos(dtX * 26) + 0.35 * Math.sin(dtX * 26));
        } else {
          if (dtX >= 0) val = 1.05 * Math.exp(-dtX * 14.0) * (1 - Math.exp(-dtX * 65.0)) * 1.45;
        }
        const y = r.y + val * 0.17;
        if (i > 0) V.line(px, py, x, y, r.col, 1.8);
        px = x; py = y;
      }
    });
    return [["PRE-RING", "LINEAR FIR"], ["CAUSAL", "MIN-PHASE"], ["PART", "2 / 2"]];
  }
}

// XXXVI. AUDIO NOISE ELIMINATION & R-2R LADDER (3 parts: Dither / Oversampling / R-2R Ladder)
function drawAudioNoiseShaping(V, sim, t, dt, part) {
  const p = (part || 0) % 3;
  const x0 = -0.96, x1 = 0.96, w = x1 - x0;

  if (p === 0) {
    // Part 1: Quantization Distortion (Undithered) vs TPDF Dithering (Decorrelated White Noise Floor)
    const ph = t * 1.3;
    const N = 128;
    // Top: Undithered 3-bit quantized low-level sine (severe harmonic distortion)
    const yT = 0.36, aT = 0.24;
    V.line(x0, yT, x1, yT, COL.grid, 0.9);
    V.text("NO DITHER: QUANTIZATION ERROR CORRELATES INTO HARMONICS", x0, 0.70, 0.026, [1.0, 0.56, 0.24, 0.95]);
    let px = 0, py = 0;
    for (let i = 0; i <= N; i++) {
      const u = i / N, x = x0 + u * w;
      const s = 0.62 * Math.sin(u * Math.PI * 4 + ph);
      const q = Math.round(s * 2.5) / 2.5;
      const y = yT + q * aT;
      if (i > 0) V.line(px, py, x, y, [1.0, 0.56, 0.24, 0.95], 1.7);
      px = x; py = y;
    }

    // Bottom: TPDF Dithered quantization + LPF average recovering smooth sine!
    const yB = -0.34, aB = 0.24;
    V.line(x0, yB, x1, yB, COL.grid, 0.9);
    V.text("TPDF DITHER: DECORRELATED NOISE FLOOR -> SMOOTH RECOVERY", x0, 0.00, 0.026, [0.36, 0.88, 0.62, 0.95]);
    let avg = 0, pxQ = 0, pyQ = 0, pxA = 0, pyA = 0;
    for (let i = 0; i <= N; i++) {
      const u = i / N, x = x0 + u * w;
      const s = 0.62 * Math.sin(u * Math.PI * 4 + ph);
      // Deterministic triangular PDF pseudo-noise (sum of two uniform hashes)
      const h1 = Math.sin(i * 127.1 + Math.floor(t * 24) * 31.7) * 43758.5453;
      const h2 = Math.sin(i * 269.5 + Math.floor(t * 24) * 19.3) * 28461.1234;
      const tpdf = ((h1 - Math.floor(h1)) - (h2 - Math.floor(h2))) * 0.40;
      const q = Math.round((s + tpdf) * 2.5) / 2.5;
      avg += 0.22 * (q - avg);
      const yq = yB + q * aB, ya = yB + avg * aB;
      if (i > 0) {
        V.line(pxQ, pyQ, x, yq, [0.34, 0.76, 0.96, 0.42], 1.1);
        V.line(pxA, pyA, x, ya, [0.36, 0.92, 0.62, 0.96], 1.95);
      }
      pxQ = x; pyQ = yq; pxA = x; pyA = ya;
    }
    return [["DITHER", "TPDF"], ["HARMONICS", "ELIMINATED"], ["PART", "1 / 3"]];
  } else if (p === 1) {
    // Part 2: Exact Integer Oversampling (1x -> 2x -> 4x -> 8x) — Time-Domain ZOH + Exact ZOH-Sinc Spectrum & Noise Floor
    const osrs = [1, 2, 4, 8];
    const stepIdx = Math.floor((t * 0.42) % 4);
    const osr = osrs[stepIdx];
    const fsKHz = 44.1 * osr;
    const snrGain = 10 * Math.log10(osr); // exact +3.01 dB per doubling of fs

    // Top Panel: Exact Time-Domain ZOH Staircase at OSR * 44.1 kHz vs Smooth Analog Sine
    const tx0 = -0.94, tx1 = 0.94, tw = tx1 - tx0;
    const tcy = 0.40, ta = 0.22;
    V.line(tx0, tcy, tx1, tcy, COL.grid, 0.9);
    V.text("ZOH DAC OUTPUT AT " + osr + "X (" + fsKHz.toFixed(1) + " KHZ)  VS  ANALOG SIGNAL", tx0, 0.70, 0.025, COL.paper);
    const ph = t * 1.4;
    // Reference continuous analog signal (cyan)
    for (let i = 1; i <= 120; i++) {
      const u0 = (i - 1) / 120, u1 = i / 120;
      const y0 = tcy + (0.68 * Math.sin(u0 * Math.PI * 3.0 + ph) + 0.28 * Math.sin(u0 * Math.PI * 7.5 + ph * 1.5)) * ta;
      const y1 = tcy + (0.68 * Math.sin(u1 * Math.PI * 3.0 + ph) + 0.28 * Math.sin(u1 * Math.PI * 7.5 + ph * 1.5)) * ta;
      V.line(tx0 + u0 * tw, y0, tx0 + u1 * tw, y1, [0.34, 0.78, 0.98, 0.45], 1.2);
    }
    // Exact Zero-Order Hold staircase with 12 * osr samples across the window
    const nSamp = 12 * osr;
    let prevY = 0;
    for (let i = 0; i < nSamp; i++) {
      const u = i / nSamp;
      const xa = tx0 + u * tw, xb = tx0 + ((i + 1) / nSamp) * tw;
      const val = 0.68 * Math.sin(u * Math.PI * 3.0 + ph) + 0.28 * Math.sin(u * Math.PI * 7.5 + ph * 1.5);
      const y = tcy + val * ta;
      if (i > 0) V.line(xa, prevY, xa, y, [1.0, 0.64, 0.24, 0.92], 1.45);
      V.line(xa, y, xb, y, [1.0, 0.64, 0.24, 0.92], 1.55);
      prevY = y;
    }

    // Bottom Panel: Exact Frequency-Domain Spectrum (0 .. 200 kHz) with ZOH sinc(f/fs) aperture & -3 dB/oct noise floor
    const fx0 = -0.94, fx1 = 0.94, fw = fx1 - fx0;
    const fy0 = -0.68, fh = 0.62, fMax = 200.0; // kHz
    const xOfF = (f) => fx0 + (f / fMax) * fw;
    V.line(fx0, fy0, fx1, fy0, COL.grid, 1.0);
    V.line(fx0, fy0, fx0, fy0 + fh, COL.grid, 1.0);
    [20, 44.1, 88.2, 132.3, 176.4].forEach((f, idx) => {
      const x = xOfF(f);
      V.line(x, fy0, x, fy0 + fh, COL.grid, 0.7);
      V.text(["20K", "44.1", "88.2", "132", "176K"][idx], x - 0.035, fy0 - 0.036, 0.022, COL.dim);
    });
    V.text("SPECTRUM (0-200 KHZ): ZOH SINC(F/FS) IMAGES & QUANTIZATION NOISE FLOOR", fx0, fy0 + fh + 0.055, 0.024, COL.dim);

    // Exact uniform quantization noise floor spread over [0, fs/2] -> density scales as 1/OSR
    const nyqF = Math.min(fMax, fsKHz * 0.5);
    const noiseH = (0.28 / Math.sqrt(osr)) * fh; // RMS amplitude scales as 1/sqrt(OSR) (-3.01 dB power per 2x)
    V.fill(fx0, fy0, xOfF(nyqF) - fx0, noiseH, [0.34, 0.72, 0.96, 0.14]);
    V.line(fx0, fy0 + noiseH, xOfF(nyqF), fy0 + noiseH, [0.34, 0.78, 0.98, 0.65], 1.2);
    V.text("NOISE FLOOR -" + snrGain.toFixed(1) + "DB", fx0 + 0.02, fy0 + noiseH + 0.035, 0.021, [0.34, 0.78, 0.98, 0.85]);

    // Shaded transition guard-band between 20 kHz and first image (fs - 20 kHz)
    const gStart = xOfF(20), gEnd = xOfF(Math.min(fMax, fsKHz - 20));
    if (gEnd > gStart + 0.01) {
      V.fill(gStart, fy0, gEnd - gStart, fh * 0.92, [0.24, 0.72, 0.54, 0.08]);
    }

    // Exact baseband signal X(f) on [0, 20 kHz] and exact ZOH-weighted spectral images |X(f - k*fs) * sinc(f/fs)|
    const sinc = (u) => Math.abs(u) < 1e-5 ? 1 : Math.sin(Math.PI * u) / (Math.PI * u);
    const baseEnv = (fAbs) => fAbs <= 20 ? Math.pow(1 - fAbs / 20, 0.75) * (0.78 + 0.22 * Math.cos(fAbs * 0.45)) : 0;
    const Nf = 160;
    let pxS = fx0, pyS = fy0;
    for (let i = 0; i <= Nf; i++) {
      const f = (i / Nf) * fMax;
      const x = fx0 + (i / Nf) * fw;
      // Distance to nearest multiple k * fsKHz
      const kNear = Math.round(f / fsKHz);
      const df = Math.abs(f - kNear * fsKHz);
      const env = baseEnv(df) * Math.abs(sinc(f / fsKHz));
      const y = fy0 + env * fh * 0.86;
      const col = kNear === 0 ? [0.36, 0.92, 0.62, 0.96] : [0.98, 0.48, 0.34, 0.88];
      if (i > 0 && (env > 0.005 || pyS > fy0 + 0.003)) V.line(pxS, pyS, x, y, col, kNear === 0 ? 2.0 : 1.6);
      pxS = x; pyS = y;
    }

    // Exact Butterworth analog reconstruction LPF (order relaxes from 12th @ 1x to 2nd @ 8x)
    const lpfOrd = osr === 1 ? 12 : (osr === 2 ? 5 : (osr === 4 ? 3 : 2));
    const fcKHz = osr === 1 ? 22.0 : (osr === 2 ? 28.0 : (osr === 4 ? 38.0 : 48.0));
    let pxL = fx0, pyL = fy0 + fh * 0.92;
    for (let i = 1; i <= 100; i++) {
      const f = (i / 100) * fMax;
      const x = fx0 + (i / 100) * fw;
      const mag = 1 / Math.sqrt(1 + Math.pow(f / fcKHz, 2 * lpfOrd));
      const y = fy0 + mag * fh * 0.92;
      V.line(pxL, pyL, x, y, [1.0, 0.80, 0.34, 0.94], 1.85);
      pxL = x; pyL = y;
    }

    return [["OSR", osr + "X"], ["FS", fsKHz.toFixed(1) + " KHZ"], ["SNR GAIN", "+" + snrGain.toFixed(1) + " DB"]];
  } else {
    // Part 3: R-2R Resistor Ladder DAC & Resistor Tolerance Nonlinearity (INL/DNL)
    const val = Math.floor((t * 14) % 64); // 6-bit animated sweep 0..63
    V.text("R-2R RESISTOR LADDER DAC  (CODE " + String(val).padStart(2, "0") + " / 63)", x0, 0.70, 0.028, COL.paper);
    // Top: 6-bit R-2R Ladder Schematic (electrically exact: LSB B0 on left with 2R->GND termination, MSB B5 closest to VOUT!)
    const yRail = 0.44, yBot = 0.16;
    // Left-end 2R termination to GND connected directly to the B0 node
    V.line(-0.92, yRail, -0.74, yRail, [0.58, 0.72, 0.86, 0.75], 1.5);
    V.line(-0.92, yRail, -0.92, yBot, [0.42, 0.56, 0.72, 0.65], 1.5);
    V.text("2R", -0.90, 0.32, 0.020, COL.dim);
    V.text("GND", -0.96, yBot - 0.05, 0.020, COL.dim);
    for (let b = 0; b < 6; b++) {
      // b = 0 is LSB (B0, weight 1/64), b = 5 is MSB (B5, weight 1/2, closest to VOUT)
      const bitOn = (val >> b) & 1;
      const x = -0.74 + b * 0.26;
      const col = bitOn ? [1.0, 0.66, 0.24, 0.96] : [0.36, 0.50, 0.66, 0.55];
      if (b < 5) {
        V.line(x, yRail, x + 0.26, yRail, [0.58, 0.72, 0.86, 0.75], 1.5);
        V.text("R", x + 0.11, yRail + 0.06, 0.024, COL.dim);
      }
      V.line(x, yRail, x, yBot, col, 1.8);
      V.text("2R", x + 0.02, 0.32, 0.022, col);
      V.circ(x, yBot, 0.020, col, 1.8, 10);
      V.text("B" + b, x - 0.03, yBot - 0.06, 0.024, col);
    }
    V.line(0.56, yRail, 0.84, yRail, [0.42, 0.92, 0.58, 0.95], 1.8);
    V.text("VOUT", 0.85, yRail + 0.02, 0.026, [0.42, 0.92, 0.58, 0.95]);

    // Bottom: Transfer Curve — Ideal Linear (cyan) vs Real R-2R with 1.5% MSB Tolerance Glitch (amber)
    const gx0 = -0.86, gx1 = 0.86, gy0 = -0.68, gy1 = -0.06;
    V.line(gx0, gy0, gx1, gy0, COL.grid, 1.0);
    V.line(gx0, gy0, gx0, gy1, COL.grid, 1.0);
    V.text("IDEAL (CYAN) VS 1.5% RESISTOR TOLERANCE NONLINEARITY (AMBER)", gx0, gy1 + 0.04, 0.024, COL.dim);
    const weights = [32.7, 15.6, 8.15, 3.92, 2.04, 0.98]; // realistic resistor mismatch
    let pxI = gx0, pyI = gy0, pxR = gx0, pyR = gy0;
    for (let c = 0; c <= 63; c++) {
      const u = c / 63, x = gx0 + u * (gx1 - gx0);
      let realV = 0;
      for (let b = 0; b < 6; b++) if ((c >> (5 - b)) & 1) realV += weights[b];
      const yI = gy0 + u * (gy1 - gy0);
      const yR = gy0 + Math.min(1, realV / 63.4) * (gy1 - gy0);
      if (c > 0) {
        V.line(pxI, pyI, x, yI, [0.34, 0.78, 0.98, 0.45], 1.2);
        V.line(pxR, pyR, x, yR, [1.0, 0.58, 0.22, 0.95], 1.8);
      }
      if (c === val) V.circ(x, yR, 0.022, [1.0, 0.88, 0.42, 0.98], 2.0, 10);
      pxI = x; pyI = yI; pxR = x; pyR = yR;
    }
    return [["BITS", "6-BIT R-2R"], ["GLITCH", "MSB STEP"], ["PART", "3 / 3"]];
  }
}

// Shared Digital Logic Gate Kit (matches drawAdder visual style for 8085 / Z80 / MSX CPU building blocks)
function logicKit(V) {
  const colOn = [0.98, 0.58, 0.22, 0.96], colGlow = [0.96, 0.46, 0.16, 0.34], colOff = [0.38, 0.46, 0.62, 0.48];
  const colGateOff = [0.76, 0.80, 0.86, 0.72];
  return {
    colOn, colGlow, colOff,
    wire(x0, y0, x1, y1, bit) {
      if (bit) V.line(x0, y0, x1, y1, colGlow, 3.8);
      V.line(x0, y0, x1, y1, bit ? colOn : colOff, bit ? 1.55 : 1.05);
    },
    pin(x, y, bit, lbl, dx) {
      if (bit) V.circ(x, y, 0.025, colGlow, 3.0, 12);
      V.circ(x, y, 0.016, bit ? colOn : colOff, 1.6, 12);
      if (lbl) V.text(lbl, x + (dx || -0.09), y + 0.018, 0.032, bit ? colOn : COL.paper);
    },
    gateNot(x, y, bit) {
      const col = bit ? colOn : colGateOff, h = 0.048, w = 0.072;
      V.line(x, y - h, x, y + h, col, 1.4);
      V.line(x, y + h, x + w, y, col, 1.4);
      V.line(x, y - h, x + w, y, col, 1.4);
      V.circ(x + w + 0.014, y, 0.013, col, 1.4, 10);
    },
    gateAnd(x, y, bit, scale) {
      const sc = scale || 1, col = bit ? colOn : colGateOff, h = 0.068 * sc, w = 0.068 * sc;
      V.line(x, y - h, x, y + h, col, 1.4);
      V.line(x, y + h, x + w, y + h, col, 1.4);
      V.line(x, y - h, x + w, y - h, col, 1.4);
      let px = x + w, py = y + h;
      for (let i = 1; i <= 10; i++) {
        const a = Math.PI * 0.5 - (Math.PI * i) / 10;
        const qx = x + w + Math.cos(a) * h, qy = y + Math.sin(a) * h;
        V.line(px, py, qx, qy, col, 1.4); px = qx; py = qy;
      }
      V.text("AND", x + 0.015 * sc, y + 0.012 * sc, 0.024 * sc, COL.dim);
    },
    gateOr(x, y, bit, isXor, isNor, lbl) {
      const col = bit ? colOn : colGateOff, h = 0.072, w = 0.145;
      const pts = [];
      for (let i = 0; i <= 8; i++) { const u = -1 + (2 * i) / 8; pts.push([x + 0.028 * (1 - u * u), y + u * h]); }
      for (let i = 0; i <= 8; i++) { const u = 1 - (2 * i) / 8; pts.push([x + w * Math.cos(u * Math.PI * 0.5), y + u * h]); }
      V.poly(pts.concat([pts[0]]), col, 1.4);
      if (isXor) {
        const bar = [];
        for (let i = 0; i <= 8; i++) { const u = -1 + (2 * i) / 8; bar.push([x - 0.020 + 0.028 * (1 - u * u), y + u * h]); }
        V.poly(bar, col, 1.4);
      }
      if (isNor) V.circ(x + w + 0.014, y, 0.013, col, 1.4, 10);
      if (lbl) V.text(lbl, x + 0.032, y + 0.012, 0.024, COL.dim);
    },
    ffBox(x, y, w, h, q, title) {
      const col = q ? colOn : colGateOff;
      V.line(x, y, x + w, y, col, 1.5); V.line(x + w, y, x + w, y + h, col, 1.5);
      V.line(x + w, y + h, x, y + h, col, 1.5); V.line(x, y + h, x, y, col, 1.5);
      // Clock triangle at bottom-left
      V.line(x, y + h * 0.28, x + 0.024, y + h * 0.20, col, 1.2);
      V.line(x + 0.024, y + h * 0.20, x, y + h * 0.12, col, 1.2);
      V.text(title, x + w * 0.22, y + h * 0.64, 0.028, col);
      V.text(q ? "1" : "0", x + w * 0.42, y + h * 0.34, 0.032, q ? colOn : COL.dim);
    },
    timing(rows, nTicks, step, yTop, yBot) {
      const tx0 = -0.68, tx1 = 0.88, tw = tx1 - tx0;
      const rh = (yTop - yBot) / rows.length;
      const dx = tw / nTicks;
      // Vertical tick dividers
      for (let k = 0; k <= nTicks; k += Math.max(1, nTicks >> 2)) {
        const x = tx0 + k * dx;
        V.line(x, yBot, x, yTop + 0.02, COL.grid, 0.7);
      }
      const xCur = tx0 + (step + 0.5) * dx;
      V.line(xCur, yBot, xCur, yTop + 0.02, [0.95, 0.96, 1.0, 0.45], 1.1);
      rows.forEach((r, ri) => {
        const yb = yTop - (ri + 1) * rh + rh * 0.18;
        const yh = yb + rh * 0.56;
        const curBit = r.vals[step];
        V.text(r.lbl, tx0 - 0.16, yb + rh * 0.48, 0.026, curBit ? colOn : COL.dim);
        for (let k = 0; k <= step; k++) {
          const b = r.vals[k], xa = tx0 + k * dx, xb = xa + dx;
          const y = b ? yh : yb;
          if (k > 0 && r.vals[k - 1] !== b) V.line(xa, r.vals[k - 1] ? yh : yb, xa, y, colOn, 1.2);
          V.line(xa, y, xb, y, b ? colOn : colOff, b ? 1.5 : 1.0);
        }
      });
    },
  };
}

// XXXVII. FOUR GATES ROUTE A BUS — 2-to-1 Multiplexer & MSX 2-to-4 Slot Address Decoder (2 parts)
function drawMuxDecoder(V, sim, t, dt, part) {
  const p = (part || 0) % 2;
  const K = logicKit(V);

  if (p === 0) {
    // Part 1: 2-to-1 Multiplexer (NOT + 2xAND + OR = 4 gates)
    const nTicks = 16;
    const step = Math.floor((t * 2.2) % nTicks);
    const seqS = [], seqD0 = [], seqD1 = [], seqY = [];
    for (let k = 0; k < nTicks; k++) {
      const s = (k >> 3) & 1, d0 = (k & 1) ^ ((k >> 2) & 1), d1 = ((k >> 1) & 1);
      seqS.push(s); seqD0.push(d0); seqD1.push(d1); seqY.push(s ? d1 : d0);
    }
    const S = seqS[step], nS = S ^ 1, D0 = seqD0[step], D1 = seqD1[step];
    const a0 = D0 & nS, a1 = D1 & S, Y = a0 | a1;

    // Schematic (y from 0.05 to 0.72)
    K.pin(-0.78, 0.60, D0, "D0");
    K.pin(-0.78, 0.38, S,  "S");
    K.pin(-0.78, 0.16, D1, "D1");
    // NOT gate on S -> nS
    K.wire(-0.76, 0.38, -0.54, 0.38, S);
    K.wire(-0.54, 0.38, -0.54, 0.48, S);
    K.wire(-0.54, 0.48, -0.46, 0.48, S);
    K.gateNot(-0.46, 0.48, nS);
    K.wire(-0.36, 0.48, -0.14, 0.48, nS);
    K.wire(-0.14, 0.48, -0.14, 0.54, nS);
    // D0 -> top AND
    K.wire(-0.76, 0.60, -0.14, 0.60, D0);
    K.gateAnd(-0.14, 0.57, a0, 0.92);
    // S & D1 -> bottom AND
    K.wire(-0.54, 0.38, -0.54, 0.24, S);
    K.wire(-0.54, 0.24, -0.14, 0.24, S);
    K.wire(-0.76, 0.16, -0.14, 0.16, D1);
    K.gateAnd(-0.14, 0.20, a1, 0.92);
    // AND outputs -> OR gate -> Y
    K.wire(-0.01, 0.57, 0.16, 0.57, a0);
    K.wire(0.16, 0.57, 0.16, 0.42, a0);
    K.wire(0.16, 0.42, 0.26, 0.42, a0);
    K.wire(-0.01, 0.20, 0.16, 0.20, a1);
    K.wire(0.16, 0.20, 0.16, 0.34, a1);
    K.wire(0.16, 0.34, 0.26, 0.34, a1);
    K.gateOr(0.24, 0.38, Y, false, false, "OR");
    K.wire(0.39, 0.38, 0.68, 0.38, Y);
    K.pin(0.70, 0.38, Y, "Y", 0.04);

    K.timing([
      { lbl: "S",  vals: seqS },
      { lbl: "D0", vals: seqD0 },
      { lbl: "D1", vals: seqD1 },
      { lbl: "Y",  vals: seqY },
    ], nTicks, step, -0.04, -0.74);
    return [["SELECT S", String(S)], ["ROUTED", S ? "D1 -> Y" : "D0 -> Y"], ["GATES", "4 (MUX)"]];
  } else {
    // Part 2: MSX 2-to-4 Address Slot Decoder (A15, A14 -> SLOT0..SLOT3 via 2xNOT + 4xAND)
    const nTicks = 16;
    const step = Math.floor((t * 1.8) % nTicks);
    const seqA15 = [], seqA14 = [], seqS0 = [], seqS1 = [], seqS2 = [], seqS3 = [];
    for (let k = 0; k < nTicks; k++) {
      const a15 = (k >> 1) & 1, a14 = k & 1;
      seqA15.push(a15); seqA14.push(a14);
      seqS0.push((!a15 && !a14) ? 1 : 0); seqS1.push((!a15 && a14) ? 1 : 0);
      seqS2.push((a15 && !a14) ? 1 : 0);  seqS3.push((a15 && a14) ? 1 : 0);
    }
    const A15 = seqA15[step], A14 = seqA14[step], n15 = A15 ^ 1, n14 = A14 ^ 1;
    const slots = [seqS0[step], seqS1[step], seqS2[step], seqS3[step]];
    const addrs = ["0000H BIOS", "4000H CART", "8000H RAM", "C000H RAM"];

    // Address rails on left
    K.pin(-0.82, 0.62, A15, "A15");
    K.pin(-0.82, 0.26, A14, "A14");
    K.wire(-0.80, 0.62, -0.64, 0.62, A15); K.wire(-0.64, 0.62, -0.64, 0.04, A15);
    K.wire(-0.64, 0.50, -0.56, 0.50, A15); K.gateNot(-0.56, 0.50, n15);
    K.wire(-0.46, 0.50, -0.40, 0.50, n15); K.wire(-0.40, 0.62, -0.40, 0.04, n15);

    K.wire(-0.80, 0.26, -0.52, 0.26, A14); K.wire(-0.52, 0.62, -0.52, 0.04, A14);
    K.wire(-0.52, 0.14, -0.44, 0.14, A14); K.gateNot(-0.44, 0.14, n14);
    K.wire(-0.34, 0.14, -0.28, 0.14, n14); K.wire(-0.28, 0.62, -0.28, 0.04, n14);

    // 4 AND gates decoding each 16 KB MSX page
    const ys = [0.60, 0.42, 0.24, 0.06];
    for (let s = 0; s < 4; s++) {
      const y = ys[s], b15 = (s >> 1) & 1, b14 = s & 1;
      const x15 = b15 ? -0.64 : -0.40, v15 = b15 ? A15 : n15;
      const x14 = b14 ? -0.52 : -0.28, v14 = b14 ? A14 : n14;
      K.wire(x15, y + 0.025, 0.04, y + 0.025, v15);
      K.wire(x14, y - 0.025, 0.04, y - 0.025, v14);
      K.gateAnd(0.04, y, slots[s], 0.72);
      K.wire(0.14, y, 0.40, y, slots[s]);
      K.pin(0.42, y, slots[s], "SLOT" + s + " " + addrs[s], 0.04);
    }

    K.timing([
      { lbl: "A15", vals: seqA15 },
      { lbl: "A14", vals: seqA14 },
      { lbl: "SL0", vals: seqS0 },
      { lbl: "SL1", vals: seqS1 },
      { lbl: "SL2", vals: seqS2 },
      { lbl: "SL3", vals: seqS3 },
    ], nTicks, step, -0.08, -0.76);
    const active = (A15 << 1) | A14;
    return [["PAGE", addrs[active]], ["ACTIVE", "SLOT " + active], ["GATES", "6 (2:4 DEC)"]];
  }
}

// XXXVIII. TWO GATES REMEMBER A BIT — Cross-Coupled NOR SR Latch & Clocked D Flip-Flop (2 parts)
function drawFlipFlop(V, sim, t, dt, part) {
  const p = (part || 0) % 2;
  const K = logicKit(V);

  if (p === 0) {
    // Part 1: 2-Gate Cross-Coupled NOR SR Latch (demonstrates SET -> HOLD -> RESET -> HOLD!)
    const nTicks = 16;
    const seqS = [0,1,1,0,0,0,0,0, 0,0,0,0,1,0,0,0];
    const seqR = [0,0,0,0,0,0,1,1, 0,0,0,0,0,0,1,0];
    const seqQ = [], seqNQ = [];
    let q = 0;
    for (let k = 0; k < nTicks; k++) {
      if (seqS[k] && !seqR[k]) q = 1;
      else if (seqR[k] && !seqS[k]) q = 0;
      seqQ.push(q); seqNQ.push(q ^ 1);
    }
    const step = Math.floor((t * 2.0) % nTicks);
    const S = seqS[step], R = seqR[step], Q = seqQ[step], nQ = seqNQ[step];

    // Top NOR (R, nQ -> Q), Bottom NOR (S, Q -> nQ) with crisp X-crossing feedback!
    K.pin(-0.68, 0.56, R, "R (RST)");
    K.pin(-0.68, 0.14, S, "S (SET)");
    K.wire(-0.66, 0.56, -0.18, 0.56, R);
    K.wire(-0.66, 0.14, -0.18, 0.14, S);
    K.gateOr(-0.20, 0.52, Q,  false, true, "NOR");
    K.gateOr(-0.20, 0.18, nQ, false, true, "NOR");
    K.wire(-0.04, 0.52, 0.56, 0.52, Q);
    K.wire(-0.04, 0.18, 0.56, 0.18, nQ);
    K.pin(0.58, 0.52, Q,  "Q",  0.04);
    K.pin(0.58, 0.18, nQ, "NQ", 0.04);
    // Cross-coupled feedback loops!
    K.wire(0.24, 0.52, 0.24, 0.40, Q);
    K.wire(0.24, 0.40, -0.34, 0.24, Q);
    K.wire(-0.34, 0.24, -0.18, 0.24, Q);
    K.wire(0.24, 0.18, 0.24, 0.30, nQ);
    K.wire(0.24, 0.30, -0.34, 0.46, nQ);
    K.wire(-0.34, 0.46, -0.18, 0.46, nQ);
    V.text("CROSS-COUPLED FEEDBACK HOLDS STATE", -0.36, 0.68, 0.025, COL.dim);

    K.timing([
      { lbl: "S",  vals: seqS },
      { lbl: "R",  vals: seqR },
      { lbl: "Q",  vals: seqQ },
      { lbl: "NQ", vals: seqNQ },
    ], nTicks, step, -0.04, -0.74);
    const st = S ? "SET (Q=1)" : (R ? "RESET (Q=0)" : "HOLD (" + Q + ")");
    return [["STATE", st], ["STORED Q", String(Q)], ["GATES", "2 (NOR LATCH)"]];
  } else {
    // Part 2: 5-Gate Clocked D Flip-Flop / 1-Bit CPU Register (NOT + 2xAND + 2xNOR)
    const nTicks = 16;
    const seqCLK = [0,1,0,0, 1,0,0,1, 0,0,1,0, 0,1,0,0];
    const seqD   = [0,1,1,0, 0,0,1,1, 1,0,1,0, 1,0,0,1];
    const seqQ = [], seqNQ = [];
    let q = 0;
    for (let k = 0; k < nTicks; k++) {
      if (seqCLK[k]) q = seqD[k];
      seqQ.push(q); seqNQ.push(q ^ 1);
    }
    const step = Math.floor((t * 2.0) % nTicks);
    const D = seqD[step], nD = D ^ 1, CLK = seqCLK[step], Q = seqQ[step], nQ = seqNQ[step];
    const R = nD & CLK, S = D & CLK;

    // Input D & CLK -> NOT + 2xAND -> SR NOR Latch
    K.pin(-0.84, 0.56, D,   "D");
    K.pin(-0.84, 0.35, CLK, "CLK");
    K.wire(-0.82, 0.56, -0.66, 0.56, D);
    K.gateNot(-0.66, 0.56, nD);
    K.wire(-0.56, 0.56, -0.36, 0.56, nD);
    K.wire(-0.74, 0.56, -0.74, 0.14, D);
    K.wire(-0.74, 0.14, -0.36, 0.14, D);
    // CLK splits to both AND gates
    K.wire(-0.82, 0.35, -0.48, 0.35, CLK);
    K.wire(-0.48, 0.35, -0.48, 0.48, CLK); K.wire(-0.48, 0.48, -0.36, 0.48, CLK);
    K.wire(-0.48, 0.35, -0.48, 0.22, CLK); K.wire(-0.48, 0.22, -0.36, 0.22, CLK);
    K.gateAnd(-0.36, 0.52, R, 0.85);
    K.gateAnd(-0.36, 0.18, S, 0.85);
    // AND -> cross-coupled NOR latch
    K.wire(-0.24, 0.52, 0.04, 0.52, R);
    K.wire(-0.24, 0.18, 0.04, 0.18, S);
    K.gateOr(0.02, 0.50, Q,  false, true, "NOR");
    K.gateOr(0.02, 0.20, nQ, false, true, "NOR");
    K.wire(0.18, 0.50, 0.68, 0.50, Q);
    K.wire(0.18, 0.20, 0.68, 0.20, nQ);
    K.pin(0.70, 0.50, Q,  "Q",  0.04);
    K.pin(0.70, 0.20, nQ, "NQ", 0.04);
    K.wire(0.42, 0.50, 0.42, 0.39, Q);  K.wire(0.42, 0.39, -0.06, 0.25, Q);  K.wire(-0.06, 0.25, 0.04, 0.25, Q);
    K.wire(0.42, 0.20, 0.42, 0.31, nQ); K.wire(0.42, 0.31, -0.06, 0.45, nQ); K.wire(-0.06, 0.45, 0.04, 0.45, nQ);

    K.timing([
      { lbl: "CLK", vals: seqCLK },
      { lbl: "D",   vals: seqD },
      { lbl: "Q",   vals: seqQ },
      { lbl: "NQ",  vals: seqNQ },
    ], nTicks, step, -0.04, -0.74);
    return [["MODE", CLK ? "LATCH D" : "HOLD Q"], ["Q", String(Q)], ["GATES", "5 (D-FF)"]];
  }
}

// XXXIX. FOUR FLIP-FLOPS COUNT EVERY INSTRUCTION — 4-Bit Program Counter & Shift Register (2 parts)
function drawCounter(V, sim, t, dt, part) {
  const p = (part || 0) % 2;
  const K = logicKit(V);

  if (p === 0) {
    // Part 1: 4-Bit Binary Ripple Program Counter — 32 half-cycles = 16 full CLK cycles (true /2 /4 /8 /16!)
    const nTicks = 32;
    const step = Math.floor((t * 4.4) % nTicks);
    const seqCLK = [], qRows = [[], [], [], []];
    for (let k = 0; k < nTicks; k++) {
      seqCLK.push(k & 1);
      const cnt = k >> 1; // increments once per full clock cycle -> Q0 = fCLK/2, Q1 = fCLK/4, Q2 = fCLK/8, Q3 = fCLK/16
      for (let b = 0; b < 4; b++) qRows[b].push((cnt >> b) & 1);
    }
    const cntNow = step >> 1;
    const hex = cntNow.toString(16).toUpperCase();
    V.text("4-BIT PROGRAM COUNTER   PC = 0X" + hex + "   (" + cntNow.toString(2).padStart(4, "0") + "B)", -0.78, 0.68, 0.028, COL.paper);
    const xs = [-0.74, -0.34, 0.06, 0.46];
    K.pin(-0.90, 0.26, seqCLK[step], "CLK", -0.06);
    K.wire(-0.88, 0.26, xs[0], 0.26, seqCLK[step]);
    for (let b = 0; b < 4; b++) {
      const qb = qRows[b][step];
      K.ffBox(xs[b], 0.18, 0.26, 0.34, qb, "FF" + b);
      // Output Q goes up to bus indicator & ripples to next FF clock
      K.wire(xs[b] + 0.26, 0.40, xs[b] + 0.33, 0.40, qb);
      K.pin(xs[b] + 0.33, 0.56, qb, "Q" + b, -0.02);
      K.wire(xs[b] + 0.33, 0.40, xs[b] + 0.33, 0.54, qb);
      if (b < 3) {
        K.wire(xs[b] + 0.33, 0.40, xs[b] + 0.33, 0.26, qb);
        K.wire(xs[b] + 0.33, 0.26, xs[b + 1], 0.26, qb);
      }
    }
    K.timing([
      { lbl: "CLK", vals: seqCLK },
      { lbl: "Q0",  vals: qRows[0] },
      { lbl: "Q1",  vals: qRows[1] },
      { lbl: "Q2",  vals: qRows[2] },
      { lbl: "Q3",  vals: qRows[3] },
    ], nTicks, step, -0.02, -0.76);
    return [["PC HEX", "0X" + hex], ["BINARY", cntNow.toString(2).padStart(4, "0")], ["DIVIDE", "/2 /4 /8 /16"]];
  } else {
    // Part 2: 4-Bit Synchronous SIPO Shift Register — shifts strictly on rising edge of CLK (16 half-cycles = 8 shifts)
    const nTicks = 16;
    const step = Math.floor((t * 3.6) % nTicks);
    const dataBits = [1, 0, 1, 1, 0, 1, 0, 0];
    const seqCLK = [], seqDIN = [], qRows = [[], [], [], []];
    for (let k = 0; k < nTicks; k++) {
      const clk = k & 1;
      const cyc = k >> 1; // 0..7
      seqCLK.push(clk);
      seqDIN.push(dataBits[cyc]);
      // Shift occurs on rising edge (k = 2*cyc + 1); holds during CLK=0 (k = 2*cyc)
      const latched = (k + 1) >> 1; // number of rising edges elapsed (0..8)
      for (let b = 0; b < 4; b++) {
        const srcIdx = latched - 1 - b;
        qRows[b].push(srcIdx >= 0 ? dataBits[srcIdx] : 0);
      }
    }
    const din = seqDIN[step], clkNow = seqCLK[step];
    V.text("4-BIT SERIAL SHIFT REGISTER   DIN -> Q0 -> Q1 -> Q2 -> Q3", -0.78, 0.68, 0.028, COL.paper);
    const xs = [-0.74, -0.34, 0.06, 0.46];
    K.pin(-0.90, 0.42, din, "DIN", -0.06);
    K.wire(-0.88, 0.42, xs[0], 0.42, din);
    K.wire(-0.88, 0.10, xs[3] - 0.04, 0.10, clkNow);
    K.pin(-0.90, 0.10, clkNow, "CLK", -0.06);
    for (let b = 0; b < 4; b++) {
      const qb = qRows[b][step];
      K.ffBox(xs[b], 0.18, 0.26, 0.34, qb, "SR" + b);
      K.wire(xs[b] - 0.04, 0.10, xs[b] - 0.04, 0.25, clkNow);
      K.wire(xs[b] - 0.04, 0.25, xs[b], 0.25, clkNow);
      K.pin(xs[b] + 0.32, 0.56, qb, "Q" + b, -0.02);
      K.wire(xs[b] + 0.26, 0.42, xs[b] + 0.32, 0.42, qb);
      K.wire(xs[b] + 0.32, 0.42, xs[b] + 0.32, 0.54, qb);
      if (b < 3) K.wire(xs[b] + 0.32, 0.42, xs[b + 1], 0.42, qb);
    }
    const word = (qRows[0][step] << 3) | (qRows[1][step] << 2) | (qRows[2][step] << 1) | qRows[3][step];
    K.timing([
      { lbl: "CLK", vals: seqCLK },
      { lbl: "DIN", vals: seqDIN },
      { lbl: "Q0",  vals: qRows[0] },
      { lbl: "Q1",  vals: qRows[1] },
      { lbl: "Q2",  vals: qRows[2] },
      { lbl: "Q3",  vals: qRows[3] },
    ], nTicks, step, -0.02, -0.76);
    return [["WORD", "0X" + word.toString(16).toUpperCase()], ["BITS", word.toString(2).padStart(4, "0")], ["EDGE", clkNow ? "SHIFT" : "HOLD"]];
  }
}

// XL. EIGHT GATES MAKE A CPU ALU SLICE — 8085 / Z80 1-Bit ALU (4 parts: ADD / SUB / AND / XOR)
function drawAluSlice(V, sim, t, dt, part) {
  const op = (part || 0) % 4; // 0:ADD, 1:SUB, 2:AND, 3:XOR
  const K = logicKit(V);
  const nTicks = 16;
  const step = Math.floor((t * 2.1) % nTicks);
  const seqA = [], seqB = [], seqCi = [], seqOut = [], seqCo = [];
  for (let k = 0; k < nTicks; k++) {
    const a = (k >> 2) & 1, b = (k >> 1) & 1, ci = op === 1 ? (k & 1 ? 1 : 1) : (k & 1);
    const bEff = op === 1 ? (b ^ 1) : b; // two's complement invert B for SUB
    const sum = a ^ bEff ^ ci;
    const co = op < 2 ? ((a & bEff) | ((a ^ bEff) & ci)) : 0;
    const out = op < 2 ? sum : (op === 2 ? (a & b) : (a ^ b));
    seqA.push(a); seqB.push(b); seqCi.push(ci); seqOut.push(out); seqCo.push(co);
  }
  const A = seqA[step], B = seqB[step], Ci = seqCi[step], bEff = op === 1 ? (B ^ 1) : B;
  const xorAB = A ^ bEff, andAB = A & bEff;
  const sum = xorAB ^ Ci, co = op < 2 ? (andAB | (xorAB & Ci)) : 0;
  const out = seqOut[step];
  const isArith = op < 2, isAnd = op === 2, isXor = op === 3;

  // Inputs A, B, Cin
  K.pin(-0.84, 0.58, A,  "A");
  K.pin(-0.84, 0.34, B,  "B");
  K.pin(-0.84, 0.10, Ci, "CIN");
  // Optional B-inverter XOR (B ^ SUB)
  K.wire(-0.82, 0.34, -0.66, 0.34, B);
  if (op === 1) {
    K.gateNot(-0.66, 0.34, bEff);
    K.wire(-0.56, 0.34, -0.44, 0.34, bEff);
  } else {
    K.wire(-0.66, 0.34, -0.44, 0.34, bEff);
  }
  // Route A & bEff to XOR1 (top) and AND1 (bottom)
  K.wire(-0.82, 0.58, -0.34, 0.58, A);
  K.wire(-0.50, 0.58, -0.50, 0.28, A); K.wire(-0.50, 0.28, -0.34, 0.28, A);
  K.wire(-0.44, 0.34, -0.44, 0.52, bEff); K.wire(-0.44, 0.52, -0.34, 0.52, bEff);
  K.wire(-0.44, 0.34, -0.44, 0.22, bEff); K.wire(-0.44, 0.22, -0.34, 0.22, bEff);
  K.gateOr(-0.36, 0.55, xorAB, true, false, "XOR");
  K.gateAnd(-0.34, 0.25, andAB, 0.85);

  // Second stage: Full Adder SUM (XOR2) & CARRY-OUT (AND2(xorAB, Ci) + OR(andAB, and2))
  const and2 = xorAB & Ci;
  K.wire(-0.20, 0.55, -0.02, 0.55, xorAB);
  K.wire(-0.82, 0.10, -0.08, 0.10, Ci);
  K.wire(-0.08, 0.10, -0.08, 0.49, Ci); K.wire(-0.08, 0.49, -0.02, 0.49, Ci);
  K.gateOr(-0.04, 0.52, isArith ? sum : 0, true, false, "SUM");

  // Explicit Carry-Out gate chain: AND2(xorAB, Ci) -> OR(andAB, and2) -> CY (active only in ADD/SUB)
  K.wire(-0.14, 0.55, -0.14, 0.16, xorAB); K.wire(-0.14, 0.16, -0.02, 0.16, xorAB);
  K.wire(-0.08, 0.10, -0.02, 0.10, Ci);
  K.gateAnd(-0.02, 0.13, isArith ? and2 : 0, 0.72);
  K.wire(0.08, 0.13, 0.22, 0.13, isArith ? and2 : 0);
  K.wire(-0.22, 0.25, 0.18, 0.25, andAB);
  K.wire(0.18, 0.25, 0.18, 0.08, isArith ? andAB : 0); K.wire(0.18, 0.08, 0.26, 0.08, isArith ? andAB : 0);
  K.gateOr(0.24, 0.10, co, false, false, "OR");
  K.wire(0.39, 0.10, 0.72, 0.10, co);
  K.pin(0.74, 0.10, co, "CY", 0.04);

  // 4-to-1 Opcode Output MUX block selecting ADD/SUB (sum) vs AND (andAB) vs XOR (xorAB)
  const mx = 0.28, my = 0.26, mw = 0.24, mh = 0.34;
  const colM = out ? K.colOn : [0.76, 0.80, 0.86, 0.75];
  V.line(mx, my, mx + mw, my, colM, 1.5); V.line(mx + mw, my, mx + mw, my + mh, colM, 1.5);
  V.line(mx + mw, my + mh, mx, my + mh, colM, 1.5); V.line(mx, my + mh, mx, my, colM, 1.5);
  V.text("OP MUX", mx + 0.03, my + mh * 0.65, 0.024, colM);
  const opNames = ["ADD", "SUB", "ANA", "XRA"];
  V.text(opNames[op], mx + 0.055, my + mh * 0.34, 0.030, K.colOn);

  // Wire active operand branches into OP MUX
  K.wire(0.12, 0.52, mx, 0.52, isArith ? sum : 0);
  K.wire(-0.14, 0.42, mx, 0.42, isXor ? xorAB : 0);
  K.wire(0.18, 0.25, 0.18, 0.31, isAnd ? andAB : 0); K.wire(0.18, 0.31, mx, 0.31, isAnd ? andAB : 0);
  // Output OUT
  K.wire(mx + mw, 0.43, 0.72, 0.43, out);
  K.pin(0.74, 0.43, out, "OUT", 0.04);

  K.timing([
    { lbl: "A",   vals: seqA },
    { lbl: "B",   vals: seqB },
    { lbl: "CIN", vals: seqCi },
    { lbl: "OUT", vals: seqOut },
    { lbl: "CY",  vals: seqCo },
  ], nTicks, step, -0.02, -0.76);
  const ops = ["8085 ADD", "8085 SUB", "8085 ANA", "8085 XRA"];
  return [["OPCODE", ops[op]], ["OUT / CY", out + " / " + co], ["PART", (op + 1) + " / 4"]];
}

// XLI. INTEL 4004 — 4-Bit Multiplexed Bus, 8-Phase Cycle (A1-A3, M1-M2, X1-X3) & MCS-4 Chipset (2 parts)
function draw4004Bus(V, sim, t, dt, part) {
  const p = (part || 0) % 2;
  const K = logicKit(V);
  const phases = ["A1", "A2", "A3", "M1", "M2", "X1", "X2", "X3"];
  const phDesc = ["ADDR LOW", "ADDR MID", "ADDR HI", "OPR (ROM)", "OPA (ROM)", "EXEC X1", "EXEC X2", "EXEC X3"];
  const busNib = [0x4, 0xA, 0x0, 0x8, 0x3, 0x3, 0x5, 0x8]; // PC=0A4h, ADD R3 (0x83), R3=5 + ACC=3 -> 8
  const step = Math.floor((t * 2.2) % 8);
  const nib = busNib[step];

  if (p === 0) {
    // Part 1: 8-Phase Machine Cycle & 4-Bit Multiplexed Bus D0..D3
    V.text("INTEL 4004   8-PHASE CYCLE: " + phases[step] + " (" + phDesc[step] + ")   D3-D0 = 0X" + nib.toString(16).toUpperCase(), -0.92, 0.72, 0.026, COL.paper);
    // 8 phase slots across top
    for (let i = 0; i < 8; i++) {
      const x = -0.92 + i * 0.23, active = i === step;
      const col = active ? K.colOn : (i < 3 ? [0.34, 0.76, 0.96, 0.55] : (i < 5 ? [0.42, 0.90, 0.58, 0.55] : [0.76, 0.80, 0.86, 0.45]));
      V.line(x, 0.46, x + 0.20, 0.46, col, active ? 2.0 : 1.1);
      V.line(x + 0.20, 0.46, x + 0.20, 0.62, col, active ? 2.0 : 1.1);
      V.line(x + 0.20, 0.62, x, 0.62, col, active ? 2.0 : 1.1);
      V.line(x, 0.62, x, 0.46, col, active ? 2.0 : 1.1);
      if (active) V.fill(x, 0.46, 0.20, 0.16, [0.98, 0.58, 0.22, 0.18]);
      V.text(phases[i], x + 0.06, 0.58, 0.028, col);
      V.text(busNib[i].toString(16).toUpperCase(), x + 0.08, 0.51, 0.024, active ? K.colOn : COL.dim);
    }
    // 4-bit multiplexed bus wires D3..D0 glowing with current nibble
    for (let b = 0; b < 4; b++) {
      const bit = (nib >> (3 - b)) & 1;
      const y = 0.34 - b * 0.075;
      K.pin(-0.84, y, bit, "D" + (3 - b), -0.08);
      K.wire(-0.82, y, 0.84, y, bit);
      K.pin(0.86, y, bit, bit ? "1" : "0", 0.04);
    }
    // Timing diagram: SYNC, PHI1, PHI2, D3..D0 across 8 phases
    const seqSync = phases.map((_, i) => i === 7 ? 1 : 0);
    const seqPhi1 = phases.map((_, i) => (i & 1) === 0 ? 1 : 0);
    const seqPhi2 = phases.map((_, i) => (i & 1) === 1 ? 1 : 0);
    K.timing([
      { lbl: "SYNC", vals: seqSync },
      { lbl: "PHI1", vals: seqPhi1 },
      { lbl: "PHI2", vals: seqPhi2 },
      { lbl: "D3",   vals: busNib.map((v) => (v >> 3) & 1) },
      { lbl: "D2",   vals: busNib.map((v) => (v >> 2) & 1) },
      { lbl: "D1",   vals: busNib.map((v) => (v >> 1) & 1) },
      { lbl: "D0",   vals: busNib.map((v) => v & 1) },
    ], 8, step, -0.02, -0.76);
    return [["PHASE", phases[step]], ["BUS D3-D0", "0X" + nib.toString(16).toUpperCase()], ["CLOCK", "740 KHZ"]];
  } else {
    // Part 2: Exact MCS-4 4-Chip System Wiring (4004 CPU <-> 4001 ROM <-> 4002 RAM -> 4003 SREG)
    // In the real MCS-4: D3..D0 connects 4004, 4001, 4002; 4003 SREG is driven serially from 4002 RAM's I/O port!
    const isRom = step < 5;           // A1..A3, M1..M2: 4004 <-> 4001 ROM
    const isRam = step === 5 || step === 6; // X1..X2: 4004 <-> 4002 RAM
    const isIo  = step === 7;         // X3 (WMP): 4004 -> 4002 RAM Port -> 4003 SREG serial
    const cmRom = step >= 2 && step <= 4;   // CM-ROM active during A3, M1, M2
    const cmRam = step >= 5;                // CM-RAM active during X1, X2, X3

    const chips = [
      { x: -0.90, w: 0.36, lbl: "4004 CPU",  sub: "4B ALU+PC",  on: true },
      { x: -0.44, w: 0.36, lbl: "4001 ROM",  sub: "256X8 ROM",  on: isRom },
      { x:  0.02, w: 0.36, lbl: "4002 RAM",  sub: "320B+PORT",  on: isRam || isIo },
      { x:  0.54, w: 0.36, lbl: "4003 SREG", sub: "10B SERIAL", on: isIo },
    ];
    V.text("MCS-4 SYSTEM BUS   PHASE: " + phases[step] + " (" + phDesc[step] + ")   D=" + nib.toString(2).padStart(4, "0") + "B", -0.90, 0.70, 0.026, COL.paper);

    chips.forEach((c) => {
      const col = c.on ? K.colOn : [0.58, 0.68, 0.80, 0.62];
      V.line(c.x, 0.24, c.x + c.w, 0.24, col, c.on ? 2.0 : 1.3);
      V.line(c.x + c.w, 0.24, c.x + c.w, 0.56, col, c.on ? 2.0 : 1.3);
      V.line(c.x + c.w, 0.56, c.x, 0.56, col, c.on ? 2.0 : 1.3);
      V.line(c.x, 0.56, c.x, 0.24, col, c.on ? 2.0 : 1.3);
      if (c.on) V.fill(c.x, 0.24, c.w, 0.32, [0.98, 0.58, 0.22, 0.12]);
      V.text(c.lbl, c.x + 0.035, 0.44, 0.027, col);
      V.text(c.sub, c.x + 0.035, 0.32, 0.021, COL.dim);
    });

    // 4-bit multiplexed Data Bus D3..D0 connecting ONLY 4004 CPU, 4001 ROM, and 4002 RAM
    // Each bit wire lights up ONLY on the active span (4004<->4001 on ROM phases, 4004<->4002 on RAM/IO phases)
    const tapX = (chip, b) => chip.x + 0.08 + b * 0.065;
    for (let b = 0; b < 4; b++) {
      const bit = (nib >> (3 - b)) & 1;
      const y = -0.02 - b * 0.085;
      const xCpu = tapX(chips[0], b);
      const xRom = tapX(chips[1], b);
      const xRam = tapX(chips[2], b);
      V.text("D" + (3 - b), -0.96, y + 0.014, 0.022, bit ? K.colOn : COL.dim);

      // Horizontal bus segments: [CPU..ROM] always active when bit=1; [ROM..RAM] active ONLY during RAM/IO phases!
      K.wire(xCpu, y, xRom, y, bit);
      K.wire(xRom, y, xRam, y, (isRam || isIo) ? bit : 0);

      // Vertical 4-bit pin taps into each bus chip (only active on the two communicating chips!)
      K.wire(xCpu, 0.24, xCpu, y, bit);
      K.wire(xRom, 0.24, xRom, y, isRom ? bit : 0);
      K.wire(xRam, 0.24, xRam, y, (isRam || isIo) ? bit : 0);
    }

    // CM-ROM control wire: physically routed from 4004 CPU -> 4001 ROM
    const xCmCpu1 = chips[0].x + 0.03, xCmRom = chips[1].x + 0.03, yCmRom = -0.44;
    K.wire(xCmCpu1, 0.24, xCmCpu1, yCmRom, cmRom ? 1 : 0);
    K.wire(xCmCpu1, yCmRom, xCmRom, yCmRom, cmRom ? 1 : 0);
    K.wire(xCmRom, yCmRom, xCmRom, 0.24, cmRom ? 1 : 0);
    V.text("CM-ROM", xCmCpu1 + 0.03, yCmRom - 0.035, 0.022, cmRom ? K.colOn : COL.dim);

    // CM-RAM control wire: physically routed from 4004 CPU -> 4002 RAM
    const xCmCpu2 = chips[0].x + 0.33, xCmRam = chips[2].x + 0.33, yCmRam = -0.58;
    K.wire(xCmCpu2, 0.24, xCmCpu2, yCmRam, cmRam ? 1 : 0);
    K.wire(xCmCpu2, yCmRam, xCmRam, yCmRam, cmRam ? 1 : 0);
    K.wire(xCmRam, yCmRam, xCmRam, 0.24, cmRam ? 1 : 0);
    V.text("CM-RAM", xCmCpu2 + 0.03, yCmRam - 0.035, 0.022, cmRam ? K.colOn : COL.dim);

    // Serial DATA & CLK lines directly from 4002 RAM output port -> 4003 SREG (NOT on D3..D0 bus!)
    const xPortL = chips[2].x + chips[2].w, xSregL = chips[3].x;
    K.wire(xPortL, 0.44, xSregL, 0.44, isIo ? (nib & 1) : 0);
    K.wire(xPortL, 0.32, xSregL, 0.32, isIo ? 1 : 0);
    V.text("DATA", xPortL + 0.025, 0.48, 0.020, isIo ? K.colOn : COL.dim);
    V.text("CLK",  xPortL + 0.035, 0.28, 0.020, isIo ? K.colOn : COL.dim);

    return [["ACTIVE", isRom ? "4004<->4001" : (isRam ? "4004<->4002" : "4002->4003")], ["CTRL", cmRom ? "CM-ROM" : (cmRam ? "CM-RAM" : "ADDR")], ["BUS", "0X" + nib.toString(16).toUpperCase()]];
  }
}

const STATIONS = [
  { roman: "I", cat: "MECHANICS & CHAOS", disc: "CLASSICAL MECHANICS", title: "Same start, different futures", sub: "Five double pendulums, released a thousandth of a radian apart.", formula: "d/dt (∂L/∂θ̇) = ∂L/∂θ      L = T − V", note: "A small state error does not stay small.", draw: drawPendulum },
  { roman: "II", cat: "ELECTRODYNAMICS & OPTICS", disc: "ELECTRODYNAMICS", title: "Shake a charge and light escapes", sub: "An oscillating dipole sheds closed loops of electric field.", formula: "∇ × E = −∂B/∂t      ∇ × B = (1/c²) ∂E/∂t", note: "The shortest antenna is a driven dipole.", draw: drawDipole },
  { roman: "III", cat: "ELECTRODYNAMICS & OPTICS", disc: "OPTICS", title: "Glass bends blue more than red", sub: "Cauchy’s formula inside a 60° flint prism. Blue leaves on a steeper heading.", formula: "n₁ sin θ₁ = n₂ sin θ₂      n(λ) ≈ A + B/λ²", note: "A camera lens is this prism, stacked.", draw: drawPrism },
  { roman: "IV", cat: "THERMODYNAMICS", disc: "THERMODYNAMICS", title: "No engine beats Carnot", sub: "Two isotherms, two adiabats. The enclosed area is the work.", formula: "η = 1 − Tc/Th      dS = δQrev / T", note: "No converter of heat into work beats this.", draw: drawCarnot },
  { roman: "V", cat: "THERMODYNAMICS", disc: "STATISTICAL MECHANICS", title: "Cool it, and order appears", sub: "A 24×24 Ising lattice. Metropolis flips. The critical point is near 2.27.", formula: "P(σ) ∝ exp(−E/kT)      E = −J Σ σᵢσⱼ", note: "Cool a noisy lattice and domains form.", draw: drawIsing },
  { roman: "VI", cat: "QUANTUM & PARTICLES", disc: "QUANTUM MECHANICS", title: "One electron at a time, still waves", sub: "Each lands at random, yet together they draw |ψ₁ + ψ₂|².", formula: "P(y) = |ψ₁ + ψ₂|² ≠ |ψ₁|² + |ψ₂|²      λ = h/p", note: "Detections are discrete. The pattern is not.", draw: drawSlit },
  { roman: "VII", cat: "QUANTUM & PARTICLES", disc: "PARTICLE PHYSICS", title: "Opposite charges curl opposite ways", sub: "Bubble-chamber tracks in a magnetic field; tighter curl, less momentum.", formula: "F = q v × B   ⇒   r = p / (|q| B)", note: "γ → e⁺ e⁻ pair production in 1.5 T with Bethe–Bloch energy loss dE/dx = 0.5 MeV/cm.", draw: drawLorentz },
  { roman: "VIII", cat: "MECHANICS & CHAOS", disc: "FLUID MECHANICS", title: "Flow past a pole sheds swirls in turn", sub: "Above Re ≈ 47 the wake rolls up into a von Kármán vortex street.", formula: "∂u/∂t + (u·∇)u = −∇p/ρ + ν∇²u      ∇·u = 0", note: "Real-time Lattice Boltzmann D2Q9 Navier–Stokes solve (Re = 126); colour = vorticity.", draw: drawVortex },
  { roman: "IX", cat: "MECHANICS & CHAOS", disc: "ACOUSTICS", title: "Outrun your sound and it piles up", sub: "Circles are emitted pulses. Past Mach 1 they share a cone.", formula: "sin μ = 1/M", note: "A propeller tip that outruns sound stands a shock on itself.", draw: drawMach },
  { roman: "X", cat: "RELATIVITY & GRAVITATION", disc: "SPECIAL RELATIVITY", title: "Moving clocks tick slower", sub: "A light clock at rest, and the same clock at 0.8c. The path is longer.", formula: "Δt = γ Δτ      γ = 1/√(1 − v²/c²)", note: "Navigation clocks carry this factor. It is public arithmetic.", draw: drawClock },
  { roman: "XI", cat: "RELATIVITY & GRAVITATION", disc: "GRAVITATION", title: "Mass bends light into rings", sub: "A spiral galaxy drifts behind a massive lens and wraps into an Einstein ring.", formula: "Gμν = (8πG/c⁴) Tμν   ⇒   α = 4GM / (c² b)", note: "Surface brightness is conserved. Strong lensing shears a galaxy into rings.", draw: drawRing },
  { roman: "XII", cat: "RELATIVITY & GRAVITATION", disc: "ASTRONOMY", title: "A tiny dip betrays a planet", sub: "Circle overlap on a central chord. The full dip equals the area ratio.", formula: "ΔF/F ≈ (Rp / R★)²", note: "A dark chord is enough to measure a radius.", draw: drawTransit },
  { roman: "XIII", cat: "ELECTRONICS & SIGNALS", disc: "ELECTRONICS", title: "Four diodes turn AC into DC", sub: "Ideal bridge, then a capacitor against a load. Forward-biased pairs recharge C.", formula: "Vripple ≈ Iload / (2 f C)", note: "Four diodes and a capacitor make a supply.", draw: drawRect },
  { roman: "XIV", cat: "ELECTRONICS & SIGNALS", disc: "DIGITAL ELECTRONICS", parts: 8, title: "Five logic gates can add", sub: "Two XOR, two AND, one OR executing a 64-tick (8-part) serial ripple-carry addition stream.", formula: "S = A ⊕ B ⊕ Cin      Cout = AB + Cin(A ⊕ B)", note: "Use ↑/↓ or 1–8 to jump across all 8 byte parts (64 ticks total).", draw: drawAdder },
  { roman: "XV", cat: "ELECTRONICS & SIGNALS", disc: "SIGNALS", title: "Sample too slowly and a false tone appears", sub: "A 3 Hz sine. The sample rate falls through twice that, and the amber line lies.", formula: "fs > 2 fmax", note: "Sample slower than twice the tone and a false tone appears.", draw: drawNyquist },
  { roman: "XVI", cat: "ELECTRONICS & SIGNALS", disc: "ESTIMATION", title: "One gain, and the noise steps back", sub: "A scalar Kalman filter. Cyan is truth, dim is the measurement, amber is the estimate.", formula: "K = P⁻/(P⁻+R)      x̂ = x̂⁻ + K(z − x̂⁻)", note: "One ranging beacon, one noise model, one gain.", draw: drawKalman },
  { roman: "XVII", cat: "RELATIVITY & GRAVITATION", disc: "GENERAL RELATIVITY", title: "Photons orbit at 1.5 Schwarzschild radii", sub: "Exact RK4 null geodesics of the Schwarzschild metric. Below b = 2.598 rs, light falls in.", formula: "d²u/dφ² + u = (3/2) rs u²      bcrit = (3√3/2) rs", note: "The photon sphere is an unstable light trap. One perturbation sends a ray home or in.", draw: drawGeodesics },
  { roman: "XVIII", cat: "RELATIVITY & GRAVITATION", disc: "BLACK HOLES", title: "A shadow framed by bent starlight", sub: "Luminet-style Schwarzschild accretion disk with Doppler beaming, secondary arch, and photon ring.", formula: "g = √(1 − 3rs/2r) / (1 + Ω b sin θ₀ cos α)      F ∝ g⁴", note: "You see both sides of the disk at once: gravity bends the far side up and over the shadow.", draw: drawBlackHole },
  { roman: "XIX", cat: "THERMODYNAMICS", disc: "THERMODYNAMICS", title: "Temperature is the spread of molecular speeds", sub: "Elastic gas chamber and live speed histogram tracking the Maxwell–Boltzmann distribution.", formula: "f(v) = 4π (m / 2πkT)^(3/2) v² exp(−mv² / 2kT)", note: "Warm the gas and the peak shifts right while the tail stretches out.", draw: drawMaxwellBoltzmann },
  { roman: "XX", cat: "THERMODYNAMICS", disc: "THERMODYNAMICS", title: "Heat flows down the gradient and smooths out", sub: "Real-time 2D finite-difference Fourier heat diffusion with flux vectors and centerline slice.", formula: "∂T/∂t = α ∇²T      q = −k ∇T", note: "Sharp thermal peaks flatten irreversibly as entropy increases.", draw: drawHeatDiffusion },
  { roman: "XXI", cat: "ELECTRODYNAMICS & OPTICS", disc: "MAGNETISM 2D", title: "Twin coils flatten a magnetic field", sub: "Exact 2D Biot–Savart field lines of a Helmholtz coil pair with live axial uniformity trace.", formula: "∇ · B = 0      B = (μ₀/4π) ∫ I dl × r̂ / r²", note: "At spacing d = R, the central magnetic field gradient vanishes to fourth order.", draw: drawMag2D },
  { roman: "XXII", cat: "ELECTRODYNAMICS & OPTICS", disc: "MAGNETISM 3D", title: "A 3D dipole traps charges between its poles", sub: "Rotating 3D solenoid and dipole magnetosphere with a Van Allen magnetic-mirroring particle.", formula: "B(r) = (μ₀/4π) [3(m·r̂)r̂ − m] / r³      μ = mv⊥² / 2B", note: "As the field tightens toward the poles, conservation of μ reflects the spiraling charge.", draw: drawMag3D },
  { roman: "XXIII", cat: "ELECTRODYNAMICS & OPTICS", disc: "ELECTRODYNAMICS 2D", title: "Four charges radiate in four lobes", sub: "Exact 2D oscillating electric quadrupole stream-function contours shedding cloverleaf radiation loops.", formula: "ΨQ = sin²θ cosθ [(3/(kr)² − 1)cos + (3/kr)sin]", note: "When dipole moment vanishes, quadrupole radiation dominates in four symmetric quadrants.", draw: drawQuadrupole2D },
  { roman: "XXIV", cat: "ELECTRODYNAMICS & OPTICS", disc: "ELECTRODYNAMICS 3D", title: "Electric and magnetic waves travel at right angles", sub: "Rotating 3D transverse Maxwell wave showing E ⊥ B ⊥ k and Poynting energy flux S = E × B / μ₀.", formula: "E(x,t) = E₀ sin(kx−ωt) ŷ      S = (1/μ₀) E × B", note: "Changing E sustains B and changing B sustains E at speed c.", draw: drawEMWave3D },
  { roman: "XXV", cat: "MECHANICS & CHAOS", disc: "NONLINEAR DYNAMICS", title: "Deterministic equations, unpredictable wings", sub: "Two Lorenz trajectories 0.0005 apart shown in real 3D space and simultaneous X–Z / X–Y phase space.", formula: "ẋ = σ(y−x)      ẏ = x(ρ−z)−y      ż = xy−βz", note: "Bounded, deterministic, and exponentially sensitive to initial state.", draw: drawLorenz },
  {
    roman: "XXVI", cat: "MECHANICS & CHAOS", disc: "NONLINEAR DYNAMICS", parts: 3,
    title: "Three bodies scatter across irreversible correlations",
    sub: "Prigogine–Petrosky–Miyasaka Liouville-space 3-body scattering vs Hilbert space and classical RK4 chaos (↑/↓ or 1–3).",
    formula: "i ∂ρ/∂t = L ρ      k = (p₁−p₂)/√2      q = (p₁+p₂−2p₃)/√6",
    note: "Press ↓ to compare Liouville-space (horizontal bar), Hilbert-space, and classical 3-body chaos.",
    partMeta: [
      { title: "Prigogine Liouville-space 3-body scattering (arrow of time)", sub: "Real-space 3-body collision (left) and Jacobi relative-momentum portrait P(k, q) (right) showing the persistent horizontal correlation bar.", formula: "i ∂ρ/∂t = L ρ      P(k, q) develops persistent bar at q ≈ q₀", note: "Part 1/3 — UT Austin Prigogine Center model. Press ↓ for conventional Hilbert space." },
      { title: "Conventional Hilbert-space 3-body scattering (reversible)", sub: "Same 3-body collision in conventional quantum scattering theory: energy-shell ring & V-wings without the horizontal bar.", formula: "iℏ ∂ψ/∂t = H ψ      T-symmetric (no persistent bar)", note: "Part 2/3 — Press ↓ for classical RK4 chaotic 3-body gravitational scattering." },
      { title: "Classical RK4 chaotic 3-body gravitational scattering", sub: "Binary + intruder encounter shown simultaneously in real space (X, Y) and radial phase space (r, vr).", formula: "r̈ᵢ = Σ G mⱼ (rⱼ − rᵢ) / |rⱼ − rᵢ|³", note: "Part 3/3 — Chaotic energy exchange across bound and unbound phase branches." },
    ],
    draw: drawThreeBody,
  },
  {
    roman: "XXVII", cat: "ELECTRODYNAMICS & OPTICS", disc: "FIELD TOPOLOGY I", parts: 4,
    title: "Static fields organize around saddles and mirrors",
    sub: "Foundational electrostatic field-line topologies with equipotentials. Use ↑/↓ or 1–4 to step from saddle points to image planes.",
    formula: "∇ · E = ρ / ε₀      E = −∇Φ",
    note: "Topological invariants (saddles, X-nulls, mirror boundaries) govern every static field.",
    partMeta: [
      { title: "A charge in a uniform wind carves a saddle point", sub: "Monopole + uniform field E₀. Upstream flux splits cleanly around a hyperbolic stagnation saddle.", formula: "E(r) = (q/4πε₀) r̂/r² + E₀ x̂      xs = −√(q/4πε₀E₀)", note: "Part 1/4 — Press ↓ to step to the static electric dipole." },
      { title: "Opposite charges close every line into a loop", sub: "Static electric dipole (+q, −q) with orthogonal equipotentials. All flux born on +q terminates on −q.", formula: "Φ(r) = (q/4πε₀) (1/r₊ − 1/r₋)", note: "Part 2/4 — Press ↓ to step to like charges (X-null)." },
      { title: "Like charges repel across a hyperbolic X-null", sub: "Two positive charges (+q, +q). Field lines never cross; they bifurcate symmetrically at the central X-point.", formula: "E(0) = 0      det(∂Eᵢ/∂xⱼ) < 0  (hyperbolic X-null)", note: "Part 3/4 — Press ↓ to step to the grounded conducting plane." },
      { title: "A grounded metal wall mirrors a charge", sub: "Method of images: +q induces surface charge so every field line strikes the conductor at exactly 90°.", formula: "Φ(0, y) = 0   ⇔   Φ(x, y) = Φ(+q, +d) + Φ(−q, −d)", note: "Part 4/4 — Outside the conductor, the field is identical to a dipole." },
    ],
    draw: drawElectrostaticZoo,
  },
  {
    roman: "XXVIII", cat: "ELECTRODYNAMICS & OPTICS", disc: "FIELD TOPOLOGY II", parts: 3,
    title: "Speed flattens a field; acceleration kinks it",
    sub: "Relativistic field topology from Lorentz contraction to Purcell radiation kinks and Cherenkov shock cones (↑/↓ or 1–3).",
    formula: "E = (q/4πε₀r²) (1−β²) / (1−β²sin²θ)^(3/2) r̂",
    note: "Motion compresses flux transversely; sudden acceleration launches a light-speed kink.",
    partMeta: [
      { title: "Fast charges flatten their field into a pancake", sub: "Heaviside–Feynman field as β = v/c sweeps 0 → 0.88. Transverse flux concentrates by γ while forward flux shrinks by 1/γ².", formula: "E⊥ = γ E₀      E∥ = E₀ / γ²      tan θ = γ tan θ₀", note: "Part 1/3 — Press ↓ for the Purcell Bremsstrahlung radiation kink." },
      { title: "Kick a charge and a kink races out at speed c", sub: "Purcell’s radiation picture: inside r < ct the field points to the new charge; outside r > ct it still points to the old one.", formula: "Erad ∝ (q a sin θ) / (4πε₀ c² r)      R = c t", note: "Part 2/3 — The transverse splice is electromagnetic radiation. Press ↓ for Cherenkov." },
      { title: "Outrun light in glass and a blue cone trails behind", sub: "Cherenkov shockwave for v = 1.45 c/n. Huygens wavelets pile up constructively along the Mach cone.", formula: "cos θc = 1 / (n β)      v > c / n", note: "Part 3/3 — The optical analogue of a supersonic shock cone." },
    ],
    draw: drawRelativisticCharge,
  },
  {
    roman: "XXIX", cat: "ELECTRODYNAMICS & OPTICS", disc: "FIELD TOPOLOGY III",
    title: "An orbiting relativistic charge whips up spiral light",
    sub: "Exact retarded-time Liénard–Wiechert field lines of a charge circling at 0.64c — synchrotron shockwaves & headlight beaming.",
    formula: "tret = t − |r − r₀(tret)| / c      Δθ ≈ 1 / γ",
    note: "Relativistic aberration beams radiation forward into a narrow rotating lighthouse spiral.",
    draw: drawSynchrotron,
  },
  {
    roman: "XXX", cat: "ELECTRODYNAMICS & OPTICS", disc: "FIELD TOPOLOGY IV", parts: 4,
    title: "Multipole zoo: 2 lobes, 4 lobes, 6 lobes, and spirals",
    sub: "Step up the spherical-harmonic radiation ladder from l=1 dipole to l=3 octupole and rotating spiral waves (↑/↓ or 1–4).",
    formula: "Ψl(r, θ, t) = Pl¹(cos θ) sin θ · Re[hl⁽¹⁾(kr) e⁻ⁱωᵗ]",
    note: "Higher multipoles shed finer angular lobes; a rotating dipole radiates angular momentum in spirals.",
    partMeta: [
      { title: "Dipole (l=1): two lobes shed closed loops", sub: "Fundamental electric dipole radiation (m=0). Maximum power leaves along the equator (sin²θ).", formula: "Ψ₁ = sin²θ [(1/kr) cos(kr−ωt) + sin(kr−ωt)]", note: "Part 1/4 — Press ↓ to climb to l=2 Quadrupole." },
      { title: "Quadrupole (l=2): four cloverleaf lobes", sub: "Linear electric quadrupole (m=0). Dipole moment cancels, leaving four symmetric radiating quadrants.", formula: "Ψ₂ = sin²θ cos θ [(3/(kr)²−1)cos + (3/kr)sin]", note: "Part 2/4 — Press ↓ to climb to l=3 Octupole." },
      { title: "Octupole (l=3): six alternating radiation lobes", sub: "Linear electric octupole (m=0). Six angular lobes pinch off as detached far-zone loops.", formula: "Ψ₃ ∝ sin²θ (5 cos²θ − 1) · Re[h₃⁽¹⁾(kr) e⁻ⁱωᵗ]", note: "Part 3/4 — Press ↓ for a rotating circular dipole (m=±1)." },
      { title: "Rotating dipole (l=1, m=±1): Archimedean spiral waves", sub: "A continuously rotating dipole spins out twin-arm spiral waves carrying circular polarization and angular momentum.", formula: "Ψrot = (1/kr) cos(kr−ωt−φ) + sin(kr−ωt−φ)", note: "Part 4/4 — Spiral phase fronts carry spin angular momentum Lz = ±ħ per photon." },
    ],
    draw: drawMultipoleZoo,
  },
  {
    roman: "XXXI", cat: "ELECTRODYNAMICS & OPTICS", disc: "FIELD TOPOLOGY V", parts: 3,
    title: "Two antennas steer light without moving parts",
    sub: "Superposed Hertzian dipole stream functions with controllable phase shift Δφ (↑/↓ or 1–3).",
    formula: "Ψtotal = Ψ₁(r₁, t) + Ψ₂(r₂, t + Δφ/ω)",
    note: "Phased arrays sculpt radiation topology purely through constructive and destructive interference.",
    partMeta: [
      { title: "Broadside array (Δφ = 0°): beam fires perpendicular", sub: "Two in-phase dipoles spaced by λ/2 reinforce along the vertical axis and cancel along the horizontal line.", formula: "AF(θ) = 2 cos((kd/2) cos θ)      d = λ/2, Δφ = 0", note: "Part 1/3 — Press ↓ to steer into an end-fire beam." },
      { title: "End-fire array (Δφ = 90°): unidirectional cardioid beam", sub: "A quarter-wave phase lag cancels leftward radiation and launches a directed beam to the right.", formula: "AF(θ) = 2 cos((π/4)(cos θ − 1))      Δφ = π/2", note: "Part 2/3 — Press ↓ for anti-phase multi-lobe interference." },
      { title: "Anti-phase array (Δφ = 180°): sharp nodal fringes", sub: "Out-of-phase dipoles spaced by 3λ/4 carve bright multi-lobe beams separated by dark hyperbolic nodes.", formula: "AF(θ) = 2i sin((kd/2) cos θ)      Δφ = π", note: "Part 3/3 — Radar and 5G arrays steer beams by shifting Δφ electronically." },
    ],
    draw: drawPhasedArray,
  },
  {
    roman: "XXXII", cat: "ELECTRODYNAMICS & OPTICS", disc: "FIELD TOPOLOGY VI", parts: 4,
    title: "Metal walls quantize fields into modes and cells",
    sub: "Conducting boundaries lock electromagnetic fields into traveling waveguide vortices and resonant cavity lattices (↑/↓ or 1–4).",
    formula: "(∇² + k²) Ψ = 0      E∥|wall = 0",
    note: "Boundary topology quantizes waves into discrete spatial eigenvalues (m, n).",
    partMeta: [
      { title: "TE₁₀ waveguide: single row of traveling field loops", sub: "Fundamental rectangular waveguide mode. Closed magnetic loops march smoothly down the conducting duct.", formula: "Ψ(x,y,t) = sin(πy/a) cos(kz x − ωt)      fc = c / 2a", note: "Part 1/4 — Press ↓ for the higher-order TE₂₀ waveguide mode." },
      { title: "TE₂₀ waveguide: twin counter-rotating vortex rows", sub: "Second transverse harmonic inside the metal duct splits the flow into two mirrored vortex lanes.", formula: "Ψ(x,y,t) = sin(2πy/a) cos(kz x − ωt)      fc = c / a", note: "Part 2/4 — Press ↓ to close the ends into a TM₂₂ resonant cavity." },
      { title: "TM₂₂ resonant cavity: 2×2 standing-wave checkerboard", sub: "Closed conducting walls trap waves into four alternating standing-wave cells separated by nodal lines.", formula: "Ψ(x,y,t) = sin(2πx/L) sin(2πy/H) cos(ωt)", note: "Part 3/4 — Press ↓ for the TM₃₂ cavity lattice." },
      { title: "TM₃₂ resonant cavity: 3×2 quantized mode lattice", sub: "Six counter-oscillating field cells locked to the cavity’s eigenfrequency — the classical root of quantum modes.", formula: "ωmn = c π √((m/L)² + (n/H)²)      (m, n) = (3, 2)", note: "Part 4/4 — Microwave ovens, lasers, and particle accelerators all run on cavity modes." },
    ],
    draw: drawWaveguideModes,
  },
  {
    roman: "XXXIII", cat: "ELECTRONICS & SIGNALS", disc: "AUDIO FILTERS", parts: 4,
    title: "Audio filters sculpt spectrum and phase",
    sub: "Real-time 2nd-order Low-Pass, High-Pass, Band-Pass, and Notch filters with live Bode dB/phase & waveform (↑/↓ or 1–4).",
    formula: "H(s) = N(s) / (s² + (ω₀/Q)s + ω₀²)",
    note: "Every DAC reconstruction stage relies on low-pass filtering to smooth discrete steps.",
    partMeta: [
      { title: "Low-pass filter: pass bass, roll off ultrasonic images", sub: "2nd-order LPF sweeping fc across 180 Hz–6.5 kHz. Removes high harmonics and DAC ultrasonic carrier noise.", formula: "HLP(s) = ω₀² / (s² + (ω₀/Q)s + ω₀²)      −12 dB/oct", note: "Part 1/4 — Press ↓ for High-Pass filter." },
      { title: "High-pass filter: block DC offset and low rumble", sub: "2nd-order HPF strips low-frequency carrier while letting sharp upper harmonics pass cleanly.", formula: "HHP(s) = s² / (s² + (ω₀/Q)s + ω₀²)      +12 dB/oct", note: "Part 2/4 — Press ↓ for Band-Pass filter." },
      { title: "Band-pass filter: isolate a resonant spectral band", sub: "2nd-order BPF with Q = 3.2 sweeps across the audio spectrum, extracting one harmonic formant at a time.", formula: "HBP(s) = (ω₀/Q)s / (s² + (ω₀/Q)s + ω₀²)", note: "Part 3/4 — Press ↓ for Notch (Band-Stop) filter." },
      { title: "Notch filter: carve a surgical null at one frequency", sub: "2nd-order Band-Stop filter cancels a single narrow frequency (50/60 Hz hum or resonant spike) to −∞ dB.", formula: "HNotch(s) = (s² + ω₀²) / (s² + (ω₀/Q)s + ω₀²)", note: "Part 4/4 — Exact conjugate zeros on the jω axis create a total null." },
    ],
    draw: drawAudioFilters,
  },
  {
    roman: "XXXIV", cat: "ELECTRONICS & SIGNALS", disc: "AUDIO DSP · PCM/DSD", parts: 3,
    title: "PCM staircases vs 1-bit DSD noise shaping",
    sub: "PCM vs 1-bit ΣΔ DSD modulation, feedback modulator loop, and 5th/7th-order SACD noise-shaping spectra (↑/↓ or 1–3).",
    formula: "Y(z) = X(z) + (1 − z⁻¹)ᴺ E(z)      SNR → 140 dB",
    note: "From 2021-12-23 Аудіо: ΣΔ pushes quantization noise into ultrasonic frequencies.",
    partMeta: [
      { title: "PCM multi-bit staircase vs 1-bit DSD pulse density", sub: "Top: 44.1 kHz multi-bit PCM steps. Bottom: 2.8224 MHz 1-bit ΣΔ bitstream smoothly reconstructed by an analog LPF.", formula: "PCM: fs = 44.1 kHz (16b)   |   DSD64: fsk = 2.8224 MHz (1b)", note: "Part 1/3 — Press ↓ for the 2nd-order ΣΔ modulator feedback loop." },
      { title: "Sigma-Delta modulator: negative feedback shapes error", sub: "Two cascaded integrators (1/s) inside a 1-bit feedback loop suppress low-frequency quantization error.", formula: "NTF(z) = (1 − z⁻¹)²      STF(z) = 1", note: "Part 2/3 — Press ↓ for 5th-order SACD vs 7th-order SNR spectra." },
      { title: "5th-order SACD vs 7th-order ultrasonic noise shaping", sub: "Log-frequency noise floor (100 Hz–1 MHz): higher modulator order carves audible noise down to −140…−160 dB.", formula: "|NTF(f)| = |2 sin(πf/fsk)|ᴺ      N = 5 (SACD) vs N = 7", note: "Part 3/3 — Total noise power rises ultrasonically so the 20 kHz band stays silent." },
    ],
    draw: drawPcmDsd,
  },
  {
    roman: "XXXV", cat: "ELECTRONICS & SIGNALS", disc: "AUDIO IMPULSE", parts: 2,
    title: "A 3 µs click exposes filter ringing",
    sub: "Impulse response comparison of Analog, 48/96/192 kHz PCM, and DSD, plus Linear-Phase vs Minimum-Phase filters (↑/↓ or 1–2).",
    formula: "h(t) = 2 fc sinc(2 fc t)      −6 dB / 3 µs Dirac click",
    note: "From 2021-12-23 Аудіо: soundstage clarity tracks the system’s Dirac impulse response.",
    partMeta: [
      { title: "Analog vs 48 / 96 / 192 kHz PCM vs DSD impulse response", sub: "Reaction to a −6 dB, 3 µs Dirac click: steep PCM brickwall filters ring symmetrically; DSD recovers a sharp spike.", formula: "hPCM(t) = sinc(π fs t)   vs   hDSD(t) ≈ δ(t) * hLPF(t)", note: "Part 1/2 — Press ↓ to compare Linear-Phase, Minimum-Phase, and Pure DSD filters." },
      { title: "Linear-phase pre-ringing vs minimum-phase vs pure DSD", sub: "Brickwall FIR rings before t=0 (pre-echo); minimum-phase IIR is causal; gentle DSD analog LPF has zero ringing.", formula: "FIR: h(−t) = h(t)   |   Causal: h(t) = 0 for t < 0", note: "Part 2/2 — Pure DSD bypasses steep digital decimation/interpolation filters." },
    ],
    draw: drawImpulseResponse,
  },
  {
    roman: "XXXVI", cat: "ELECTRONICS & SIGNALS", disc: "DITHER & R-2R DAC", parts: 3,
    title: "Dither, oversampling, and R-2R resistor ladders",
    sub: "TPDF dithering, 4× oversampling filter relaxation, and R-2R ladder resistor-tolerance nonlinearity (↑/↓ or 1–3).",
    formula: "q(x) = Q(x + dTPDF)      Vout = Vref Σ bᵢ / 2ⁱ",
    note: "From 2021-12-23 Аудіо: noise elimination & DAC hardware linearity trade-offs.",
    partMeta: [
      { title: "TPDF dithering turns harmonic distortion into white noise", sub: "Without dither, quantization error locks to the signal as harsh harmonics; adding triangular noise restores linearity.", formula: "dTPDF = U₁ − U₂      E[Q(x + d)] = x", note: "Part 1/3 — Press ↓ for 1× vs 4× Oversampling filter relaxation." },
      { title: "Oversampling widens the gap for a gentle analog filter", sub: "At 1× fs, spectral images sit right next to 20 kHz; 4× oversampling pushes images out so a gentle 2nd-order LPF works.", formula: "fimage = k · OSR · fs ± f      OSR = 4×", note: "Part 2/3 — Press ↓ for the R-2R Resistor Ladder DAC." },
      { title: "R-2R resistor ladder: tolerance causes MSB glitches", sub: "Animated 6-bit R-2R ladder comparing ideal linearity (cyan) against 1.5% resistor mismatch (amber INL/DNL step).", formula: "Vout = Vref Σ bᵢ (Rᵢ / 2ⁱ)      ΔR/R ⇒ INL/DNL", note: "Part 3/3 — Resistor mismatch motivated 1-bit ΣΔ and Dynamic Element Matching." },
    ],
    draw: drawAudioNoiseShaping,
  },
  {
    roman: "XXXVII", cat: "ELECTRONICS & SIGNALS", disc: "CPU BUS LOGIC", parts: 2,
    title: "Four gates route a bus and map MSX slots",
    sub: "Minimal gate-level bus routing: 2-to-1 Multiplexer and MSX 2-to-4 Address Slot Decoder (↑/↓ or 1–2).",
    formula: "Y = (D₀ ∧ ¬S) ∨ (D₁ ∧ S)      SLOTᵢ = (A₁₅, A₁₄)",
    note: "Every 8085/Z80 register selector and MSX 16 KB slot mapper is built from these gates.",
    partMeta: [
      { title: "Four gates route a bus (2-to-1 Multiplexer)", sub: "One NOT, two AND, one OR gate steer D0 or D1 onto output Y under select bit S.", formula: "Y = (D₀ ∧ ¬S) ∨ (D₁ ∧ S)", note: "Part 1/2 — Press ↓ for the MSX 2-to-4 Slot Address Decoder." },
      { title: "Six gates decode 64 KB into four MSX memory slots", sub: "Two NOT and four AND gates decode A15, A14 into mutually exclusive 16 KB pages (BIOS, Cart, RAM).", formula: "SLOT₀..₃ = decode(A₁₅, A₁₄)      4 × 16 KB = 64 KB", note: "Part 2/2 — The exact combinational core of MSX PPI port A8h slot selection." },
    ],
    draw: drawMuxDecoder,
  },
  {
    roman: "XXXVIII", cat: "ELECTRONICS & SIGNALS", disc: "CPU MEMORY", parts: 2,
    title: "Two cross-coupled gates remember a bit",
    sub: "Minimal bistable memory: 2-gate NOR SR Latch and 5-gate Clocked D Flip-Flop 1-bit register (↑/↓ or 1–2).",
    formula: "Q = ¬(R ∨ Q̄)      Q̄ = ¬(S ∨ Q)      Qnext = D (on CLK)",
    note: "Stack 8 D Flip-Flops to form an 8085/Z80 register (A, B, C, D, E, H, L).",
    partMeta: [
      { title: "Two cross-coupled NOR gates remember one bit", sub: "Cross-coupled feedback latches Q=1 on SET and holds the bit indefinitely even after S returns to 0.", formula: "Q = ¬(R ∨ Q̄)      Q̄ = ¬(S ∨ Q)", note: "Part 1/2 — Press ↓ to add a clock gate (D Flip-Flop register)." },
      { title: "Five gates make a clocked 1-bit CPU register (D-FF)", sub: "Captures input D when CLK is high and freezes Q when CLK drops — the building block of every CPU register.", formula: "Q(t+1) = D  when CLK = 1,  else Q(t)", note: "Part 2/2 — Eight D Flip-Flops in parallel store one 8-bit 8085/Z80 byte." },
    ],
    draw: drawFlipFlop,
  },
  {
    roman: "XXXIX", cat: "ELECTRONICS & SIGNALS", disc: "CPU COUNTER", parts: 2,
    title: "Four flip-flops count every instruction",
    sub: "Cascaded flip-flops forming a 4-bit binary Program Counter (0x0–0xF) and 4-bit Serial Shift Register (↑/↓ or 1–2).",
    formula: "PC ← PC + 1      f(Qₙ) = fCLK / 2ⁿ⁺¹",
    note: "Sixteen cascaded flip-flops form the 8085/Z80 16-bit Program Counter (0000h–FFFFh).",
    partMeta: [
      { title: "Four flip-flops count every instruction (4-bit PC)", sub: "Each flip-flop divides the clock by 2, stepping binary addresses 0x0 → 0xF automatically.", formula: "PC ← PC + 1      f(Q₀..Q₃) = fCLK / (2, 4, 8, 16)", note: "Part 1/2 — Press ↓ for the 4-Bit Serial Shift Register." },
      { title: "Four flip-flops shift bits down a serial bus", sub: "Synchronous SIPO shift register clocks serial data DIN → Q0 → Q1 → Q2 → Q3 — used in VDP sprites and serial I/O.", formula: "Q₀(t+1) = DIN      Qₙ(t+1) = Qₙ₋₁(t)", note: "Part 2/2 — Converts serial bitstreams into parallel CPU bytes." },
    ],
    draw: drawCounter,
  },
  {
    roman: "XL", cat: "ELECTRONICS & SIGNALS", disc: "8085 / Z80 ALU", parts: 4,
    title: "Eight gates make a CPU ALU slice",
    sub: "Gate-level 1-bit 8085/Z80 ALU combining Full Adder, inverter, logic gates, and opcode MUX (↑/↓ or 1–4).",
    formula: "OP ∈ {ADD, SUB, ANA, XRA}      CY = Carry Flag",
    note: "Chain 8 of these slices with Carry-Out → Carry-In to build the complete 8085 / Z80 ALU.",
    partMeta: [
      { title: "8085 ALU · ADD A, B (full adder + carry chain)", sub: "Opcode 00 routes the Full Adder sum to OUT and propagates Carry-Out to the next bit slice.", formula: "OUT = A ⊕ B ⊕ Cin      CY = AB + Cin(A ⊕ B)", note: "Part 1/4 — Press ↓ for two's-complement SUB." },
      { title: "8085 ALU · SUB A, B (invert B + Cin = 1)", sub: "Opcode 01 flips B through a NOT gate and sets Cin = 1, turning the same adder into a two's-complement subtractor.", formula: "A − B = A + (¬B) + 1      (Two's Complement)", note: "Part 2/4 — Press ↓ for bitwise ANA (AND)." },
      { title: "8085 ALU · ANA B (bitwise AND, CY = 0)", sub: "Opcode 10 selects the AND gate directly through the OP MUX and clears the Carry flag.", formula: "OUT = A ∧ B      CY = 0", note: "Part 3/4 — Press ↓ for bitwise XRA (XOR)." },
      { title: "8085 ALU · XRA B (bitwise XOR, CY = 0)", sub: "Opcode 11 selects the XOR gate directly — on 8085/Z80, XRA A / XOR A is the fastest way to zero register A.", formula: "OUT = A ⊕ B      CY = 0", note: "Part 4/4 — Combine Adder, MUX, D-FF, Counter, and ALU to build an 8-bit CPU." },
    ],
    draw: drawAluSlice,
  },
  {
    roman: "XLI", cat: "ELECTRONICS & SIGNALS", disc: "INTEL 4004 · BUS", parts: 2,
    title: "Four wires multiplex an entire 1971 CPU",
    sub: "Intel 4004 8-phase machine cycle (A1–A3, M1–M2, X1–X3) on 4-bit bus D0–D3 and the 4-chip MCS-4 system (↑/↓ or 1–2).",
    formula: "16-pin DIP: A1·A2·A3 (12b Addr) → M1·M2 (8b Op) → X1·X2·X3",
    note: "To fit in a 16-pin DIP, Federico Faggin time-multiplexed address, opcode, and data on 4 pins.",
    partMeta: [
      { title: "Intel 4004 · 8-phase machine cycle on 4-bit bus D0–D3", sub: "Two-phase clock Φ1/Φ2 & SYNC drive 8 time slots: 12-bit ROM address, 8-bit instruction fetch, and 4-bit execution.", formula: "A1..A3 (12b PC) → M1·M2 (OPR/OPA) → X1..X3 (Exec)", note: "Part 1/2 — Press ↓ for the 4-chip MCS-4 system bus (4004/4001/4002/4003)." },
      { title: "MCS-4 chipset: 4004 CPU, 4001 ROM, 4002 RAM, 4003 Shift Reg", sub: "CM-ROM and CM-RAM control lines coordinate all four chips over the shared 4-bit data bus.", formula: "4004 (CPU) + 4001 (256B ROM) + 4002 (320b RAM) + 4003 (I/O)", note: "Part 2/2 — The complete 1971 Busicom 141-PF calculator computer." },
    ],
    draw: draw4004Bus,
  },
];

const STATION_CATS = [
  "ELECTRODYNAMICS & OPTICS",
  "THERMODYNAMICS",
  "MECHANICS & CHAOS",
  "QUANTUM & PARTICLES",
  "RELATIVITY & GRAVITATION",
  "ELECTRONICS & SIGNALS",
];
// Graduated pedagogical order within Electrodynamics & Optics (static -> magnetism -> optics -> relativistic -> radiation -> waveguides)
const EM_ORDER = new Map([
  [drawElectrostaticZoo, 0],
  [drawMag2D, 1],
  [drawMag3D, 2],
  [drawPrism, 3],
  [drawRelativisticCharge, 4],
  [drawDipole, 5],
  [drawQuadrupole2D, 6],
  [drawMultipoleZoo, 7],
  [drawSynchrotron, 8],
  [drawPhasedArray, 9],
  [drawEMWave3D, 10],
  [drawWaveguideModes, 11],
]);
const ELEC_ORDER = new Map([
  [drawRect, 0],
  [drawAdder, 1],
  [drawMuxDecoder, 2],
  [drawFlipFlop, 3],
  [drawCounter, 4],
  [drawAluSlice, 5],
  [draw4004Bus, 6],
  [drawNyquist, 7],
  [drawKalman, 8],
  [drawAudioFilters, 9],
  [drawPcmDsd, 10],
  [drawImpulseResponse, 11],
  [drawAudioNoiseShaping, 12],
]);
function toRoman(n) {
  const vals = [[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
  let out = "", x = n;
  for (const [v, s] of vals) while (x >= v) { out += s; x -= v; }
  return out;
}
STATIONS.sort((a, b) => {
  const ca = STATION_CATS.indexOf(a.cat), cb = STATION_CATS.indexOf(b.cat);
  if (ca !== cb) return ca - cb;
  if (a.cat === "ELECTRODYNAMICS & OPTICS") {
    return (EM_ORDER.has(a.draw) ? EM_ORDER.get(a.draw) : 99) - (EM_ORDER.has(b.draw) ? EM_ORDER.get(b.draw) : 99);
  }
  if (a.cat === "ELECTRONICS & SIGNALS") {
    return (ELEC_ORDER.has(a.draw) ? ELEC_ORDER.get(a.draw) : 99) - (ELEC_ORDER.has(b.draw) ? ELEC_ORDER.get(b.draw) : 99);
  }
  return 0;
});
STATIONS.forEach((s, i) => { s.roman = toRoman(i + 1); });

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let index = 0, partIdx = 0, sim = {}, simTime = 0, dwell = 0, paused = false, indexOpen = false;
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
  const nParts = s.parts || 1;
  const pm = s.partMeta && s.partMeta[partIdx];
  el.count.textContent = s.roman + " · " + String(index + 1).padStart(2, "0") + (nParts > 1 ? " · PART " + (partIdx + 1) + "/" + nParts : "");
  el.disc.textContent = s.disc;
  el.title.textContent = (pm && pm.title) || s.title;
  el.sub.textContent = (pm && pm.sub) || s.sub;
  el.formula.textContent = (pm && pm.formula) || s.formula;
  el.note.textContent = (pm && pm.note) || s.note;
  document.querySelectorAll(".idx-item").forEach((row) => row.classList.toggle("on", Number(row.dataset.idx) === index));
}
function enter(i, p) {
  index = (i + STATIONS.length) % STATIONS.length;
  const nParts = STATIONS[index].parts || 1;
  partIdx = p != null ? ((p % nParts) + nParts) % nParts : 0;
  sim = {}; simTime = 0; dwell = 0;
  renderChrome();
}
function selectPart(p) {
  const nParts = STATIONS[index].parts || 1;
  if (nParts <= 1) return;
  partIdx = ((p % nParts) + nParts) % nParts;
  sim = {}; simTime = 0; dwell = 0;
  renderChrome();
}
const elLegend = document.getElementById("legend");
function toggleIndex(force) {
  indexOpen = force == null ? !indexOpen : force;
  if (indexOpen && elLegend) elLegend.classList.remove("open");
  el.index.classList.toggle("open", indexOpen);
  document.getElementById("idx").setAttribute("aria-pressed", indexOpen ? "true" : "false");
}
function toggleLegend(force) {
  if (!elLegend) return;
  const open = force == null ? !elLegend.classList.contains("open") : force;
  if (open) toggleIndex(false);
  elLegend.classList.toggle("open", open);
}
function togglePause() {
  paused = !paused;
  el.hold.textContent = paused ? "RUN" : "HOLD";
  el.hold.setAttribute("aria-pressed", paused ? "true" : "false");
}
function buildIndex() {
  const cats = STATION_CATS;
  let activeCat = "ALL";
  const h = document.createElement("h2");
  h.textContent = "HAL 9000 // FORMAL PHYSICS CATALOGUE (" + STATIONS.length + " STATIONS)";
  const filters = document.createElement("div");
  filters.className = "idx-filters";
  const body = document.createElement("div");

  function renderList() {
    body.replaceChildren();
    const listCats = activeCat === "ALL" ? cats : [activeCat];
    listCats.forEach((cat) => {
      const items = STATIONS.map((s, i) => ({ s, i })).filter((x) => x.s.cat === cat);
      if (!items.length) return;
      const ch = document.createElement("div");
      ch.className = "idx-cat";
      ch.textContent = cat + "  (" + items.length + ")";
      const grid = document.createElement("div");
      grid.className = "idx-grid";
      items.forEach(({ s, i }) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "idx-item" + (i === index ? " on" : "");
        b.dataset.idx = String(i);
        const num = document.createElement("div");
        num.className = "num";
        num.textContent = s.roman + " · " + s.disc;
        const ttl = document.createElement("div");
        ttl.className = "ttl";
        ttl.textContent = s.title;
        const pts = document.createElement("div");
        pts.className = "pts";
        pts.textContent = s.formula;
        b.append(num, ttl, pts);
        b.addEventListener("click", (e) => { e.stopPropagation(); enter(i); toggleIndex(false); });
        grid.append(b);
      });
      body.append(ch, grid);
    });
  }

  ["ALL", ...cats].forEach((cat) => {
    const p = document.createElement("button");
    p.type = "button";
    p.className = "pill";
    p.textContent = cat === "ALL" ? "ALL (" + STATIONS.length + ")" : cat.split(" ")[0];
    p.setAttribute("aria-pressed", cat === "ALL" ? "true" : "false");
    p.addEventListener("click", (e) => {
      e.stopPropagation();
      activeCat = cat;
      filters.querySelectorAll(".pill").forEach((elP) => elP.setAttribute("aria-pressed", elP === p ? "true" : "false"));
      renderList();
    });
    filters.append(p);
  });

  el.index.append(h, filters, body);
  renderList();
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
  try { rows = STATIONS[index].draw(viewOf(box), sim, simTime, dt, partIdx) || []; }
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
const btnHelp = document.getElementById("btn-help");
if (btnHelp) btnHelp.addEventListener("click", () => toggleLegend());
if (elLegend) elLegend.addEventListener("click", () => toggleLegend(false));
el.index.addEventListener("click", (e) => { if (e.target === el.index) toggleIndex(false); });
let wheelLock = 0;
window.addEventListener("wheel", (e) => {
  if (indexOpen) return;
  const now = performance.now();
  if (now - wheelLock < 240) return;
  if (Math.abs(e.deltaY) < 12 && Math.abs(e.deltaX) < 12) return;
  wheelLock = now;
  const dir = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) > 0 ? 1 : -1;
  if (e.shiftKey) selectPart(partIdx + dir);
  else enter(index + dir);
}, { passive: true });
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") { enter(index + 1); e.preventDefault(); }
  else if (e.key === "ArrowLeft") { enter(index - 1); e.preventDefault(); }
  else if (e.key === "ArrowUp") { selectPart(partIdx - 1); e.preventDefault(); }
  else if (e.key === "ArrowDown") { selectPart(partIdx + 1); e.preventDefault(); }
  else if (e.key === " ") { togglePause(); e.preventDefault(); }
  else if (e.key === "i" || e.key === "I" || e.key === "Tab") { e.preventDefault(); toggleIndex(); }
  else if (e.key === "?" || e.key === "h" || e.key === "H") { toggleLegend(); }
  else if (e.key === "Escape") { toggleIndex(false); toggleLegend(false); }
  else if (e.key >= "1" && e.key <= "8") {
    const p = parseInt(e.key, 10) - 1;
    if (p < (STATIONS[index].parts || 1)) selectPart(p);
  }
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
