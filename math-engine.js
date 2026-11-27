"use strict";
// HAL 9000 // PURE MATHEMATICS ENGINE (WebGL1 2D Calculus + 3D Special Functions & Topological Surfaces)
// Series I-XII: 2D Calculus/Polynomials/Complex Analysis, 3D Special Functions, Minimal/Calabi-Yau/Yang-Mills/Lie Surfaces

const COL = {
  paper: [0.90, 0.88, 0.84, 0.92],
  dim: [0.45, 0.48, 0.55, 0.78],
  grid: [0.24, 0.28, 0.36, 0.42],
  amber: [0.91, 0.64, 0.33, 0.95],
  cyan: [0.50, 0.83, 0.80, 0.95],
  hot: [0.89, 0.38, 0.29, 0.95],
};

const RAW = {
  "0": "01110100011001110101110011000101110", "1": "00100011000010000100001000010001110",
  "2": "01110100010000100110010001000011111", "3": "11110000010000101110000010000111110",
  "4": "00010001100101010010111110001000010", "5": "11111100001111000001000011000101110",
  "6": "00110010001000011110100011000101110", "7": "11111000010001000100010000100001000",
  "8": "01110100011000101110100011000101110", "9": "01110100011000101111000010001001100",
  "A": "01110100011000111111100011000110001", "B": "11110100011000111110100011000111110",
  "C": "01110100011000010000100001000101110", "D": "11110100011000110001100011000111110",
  "E": "11111100001000011110100001000011111", "F": "11111100001000011110100001000010000",
  "G": "01110100011000010111100011000101111", "H": "10001100011000111111100011000110001",
  "I": "01110001000010000100001000010001110", "J": "00111000100001000010100101001001100",
  "K": "10001100101010011000101001001010001", "L": "10000100001000010000100001000011111",
  "M": "10001110111010110101100011000110001", "N": "10001110011010110011100011000110001",
  "O": "01110100011000110001100011000101110", "P": "11110100011000111110100001000010000",
  "Q": "01110100011000110001101011001001101", "R": "11110100011000111110101001001010001",
  "S": "01111100001000001110000010000111110", "T": "11111001000010000100001000010000100",
  "U": "10001100011000110001100011000101110", "V": "10001100011000110001100010101000100",
  "W": "10001100011000110101101011101110001", "X": "10001100010101000100010101000110001",
  "Y": "10001100010101000100001000010000100", "Z": "11111000010001000100010001000011111",
  "-": "00000000000000011111000000000000000", "+": "00000001000010011111001000010000000",
  "=": "00000000001111100000111110000000000", ".": "00000000000000000000000000110001100",
  ",": "00000000000000000000001100010001000", ":": "00000001100011000000001100011000000",
  "/": "00001000100010001000100000000000000", "(": "00010001000100001000010000010000010",
  ")": "01000001000001000010000100010001000", "[": "01110010000100001000010000100001110",
  "]": "01110000100001000010000100001001110", "|": "00100001000010000100001000010000100",
  "<": "00010001000100010000010000010000010", ">": "01000001000001000001000100010001000",
  "^": "00100010101000100000000000000000000", "*": "00000101010111011111011101010100000",
};
const GLYPH = {};
for (const k in RAW) {
  const s = RAW[k], rows = [];
  for (let r = 0; r < 7; r++) {
    let bits = 0;
    for (let c = 0; c < 5; c++) if (s[r * 5 + c] === "1") bits |= 1 << (4 - c);
    rows.push(bits);
  }
  GLYPH[k] = rows;
}

const canvas = document.getElementById("c");
const gl = canvas.getContext("webgl", { alpha: false, antialias: true, depth: true, preserveDrawingBuffer: false });
const ctx2d = gl ? null : canvas.getContext("2d");
// 3-Pass Hardware Z-Buffer Vertex Buffers (7 x 32-bit floats/vert: x, y, ndcZ, r, g, b, a)
const MAXV = 400000;
const MAX_MASK = 1000000;
const MAX_WIRE = 2000000;
const vbuf = new Float32Array(MAXV * 7);
const vbufMask = new Float32Array(MAX_MASK * 7);
const vbufWire = new Float32Array(MAX_WIRE * 7);
let vn = 0, vnMask = 0, vnWire = 0, cssW = 1280, cssH = 800, aspect = 1.6;
const segs = [], fills = [], cmds2d = [];

// 3D CAD Camera, Hidden-Line Occlusion & Wire-Mesh Discretization State
const MESH_LEVELS = [0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0, 6.0, 8.0, 10.0];
let meshIdx = 5; // default 3.0x (crisp calibrated wireframe)
let hlrOn = true; // Painter's Algorithm Hidden-Line Removal (occlude lines shadowed behind peaks)
const COL_OCCLUDE = [0.020, 0.024, 0.035, 1.0];
const meshMul = () => MESH_LEVELS[meshIdx];
// Unified perceptual surface-scaling factor (1.0 at 3.0x, monotonic from 0.5x to 10.0x)
const surfScale = () => Math.pow(meshMul() / 3.0, 0.62);
const meshW = (base) => Math.max(0.55, (base || 1.15) / Math.pow(meshMul(), 0.30));
const CAM = { yaw: 0, pitch: 0, zoom: 1.0, panU: 0, panV: 0, panX: 0, panY: 0, userOrbited: false, dragMode: null, lastX: 0, lastY: 0, effYaw: 0.6 };
function resetCam() {
  CAM.yaw = 0; CAM.pitch = 0; CAM.zoom = 1.0; CAM.panU = 0; CAM.panV = 0; CAM.panX = 0; CAM.panY = 0; CAM.userOrbited = false;
}

let prog = null, buf = null, uAspect = null;
if (gl) {
  const VS = "precision highp float;attribute vec3 a_pos;attribute vec4 a_col;uniform float u_aspect;varying vec4 v_col;void main(){gl_Position=vec4(a_pos.x/u_aspect,a_pos.y,a_pos.z,1.0);v_col=a_col;}";
  const FS = "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nvarying vec4 v_col;void main(){gl_FragColor=v_col;}";
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
  prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.bindAttribLocation(prog, 0, "a_pos");
  gl.bindAttribLocation(prog, 1, "a_col");
  gl.linkProgram(prog);
  uAspect = gl.getUniformLocation(prog, "u_aspect");
  buf = gl.createBuffer();
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthFunc(gl.LEQUAL);
}

// Convert positive camera depth [1.15 .. 24.0] monotonically to WebGL NDC z [-0.95 .. +0.95]
function depthToNDC(depth) {
  return Math.max(-0.95, Math.min(0.95, ((depth - 1.15) / 22.85) * 1.90 - 0.95));
}

function pushTri(x0, y0, x1, y1, x2, y2, c) {
  if (vn + 3 > MAXV) return;
  const r = c[0], g = c[1], b = c[2], a = c[3] == null ? 1 : c[3];
  let o = vn * 7;
  vbuf[o++] = x0; vbuf[o++] = y0; vbuf[o++] = 0; vbuf[o++] = r; vbuf[o++] = g; vbuf[o++] = b; vbuf[o++] = a;
  vbuf[o++] = x1; vbuf[o++] = y1; vbuf[o++] = 0; vbuf[o++] = r; vbuf[o++] = g; vbuf[o++] = b; vbuf[o++] = a;
  vbuf[o++] = x2; vbuf[o++] = y2; vbuf[o++] = 0; vbuf[o++] = r; vbuf[o++] = g; vbuf[o++] = b; vbuf[o++] = a;
  vn += 3;
}
function pushQuad(x0, y0, x1, y1, x2, y2, x3, y3, c) {
  if (vn + 6 > MAXV) return;
  const r = c[0], g = c[1], b = c[2], a = c[3] == null ? 1 : c[3];
  let o = vn * 7;
  const pts = [x0, y0, x1, y1, x2, y2, x0, y0, x2, y2, x3, y3];
  for (let i = 0; i < 12; i += 2) {
    vbuf[o++] = pts[i]; vbuf[o++] = pts[i + 1]; vbuf[o++] = 0;
    vbuf[o++] = r; vbuf[o++] = g; vbuf[o++] = b; vbuf[o++] = a;
  }
  vn += 6;
}
function pushMaskTri3D(x0, y0, z0, x1, y1, z1, x2, y2, z2, c) {
  if (vnMask + 3 > MAX_MASK) return;
  const r = c[0], g = c[1], b = c[2], a = c[3] == null ? 1 : c[3];
  let o = vnMask * 7;
  vbufMask[o++] = x0; vbufMask[o++] = y0; vbufMask[o++] = z0; vbufMask[o++] = r; vbufMask[o++] = g; vbufMask[o++] = b; vbufMask[o++] = a;
  vbufMask[o++] = x1; vbufMask[o++] = y1; vbufMask[o++] = z1; vbufMask[o++] = r; vbufMask[o++] = g; vbufMask[o++] = b; vbufMask[o++] = a;
  vbufMask[o++] = x2; vbufMask[o++] = y2; vbufMask[o++] = z2; vbufMask[o++] = r; vbufMask[o++] = g; vbufMask[o++] = b; vbufMask[o++] = a;
  vnMask += 3;
}
function pushWireQuad3D(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3, c) {
  if (vnWire + 6 > MAX_WIRE) return;
  const r = c[0], g = c[1], b = c[2], a = c[3] == null ? 1 : c[3];
  let o = vnWire * 7;
  vbufWire[o++] = x0; vbufWire[o++] = y0; vbufWire[o++] = z0; vbufWire[o++] = r; vbufWire[o++] = g; vbufWire[o++] = b; vbufWire[o++] = a;
  vbufWire[o++] = x1; vbufWire[o++] = y1; vbufWire[o++] = z1; vbufWire[o++] = r; vbufWire[o++] = g; vbufWire[o++] = b; vbufWire[o++] = a;
  vbufWire[o++] = x2; vbufWire[o++] = y2; vbufWire[o++] = z2; vbufWire[o++] = r; vbufWire[o++] = g; vbufWire[o++] = b; vbufWire[o++] = a;
  vbufWire[o++] = x0; vbufWire[o++] = y0; vbufWire[o++] = z0; vbufWire[o++] = r; vbufWire[o++] = g; vbufWire[o++] = b; vbufWire[o++] = a;
  vbufWire[o++] = x2; vbufWire[o++] = y2; vbufWire[o++] = z2; vbufWire[o++] = r; vbufWire[o++] = g; vbufWire[o++] = b; vbufWire[o++] = a;
  vbufWire[o++] = x3; vbufWire[o++] = y3; vbufWire[o++] = z3; vbufWire[o++] = r; vbufWire[o++] = g; vbufWire[o++] = b; vbufWire[o++] = a;
  vnWire += 6;
}

// Sutherland-Hodgman polygon clipper against 2D host CLIP rect (for opaque HLR occlusion quads!)
function clipPolyEdge(pts, inside, intersect) {
  const out = [];
  const n = pts.length;
  if (!n) return out;
  let prev = pts[n - 1], prevIn = inside(prev);
  for (let i = 0; i < n; i++) {
    const cur = pts[i], curIn = inside(cur);
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur));
      out.push(cur);
    } else if (prevIn) {
      out.push(intersect(prev, cur));
    }
    prev = cur; prevIn = curIn;
  }
  return out;
}
function clipPoly(pts, c) {
  const lerpPt = (a, b, t) => (a.length > 2 ? [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] : [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  let p = clipPolyEdge(pts, (q) => q[0] >= c.left, (a, b) => lerpPt(a, b, (c.left - a[0]) / (b[0] - a[0])));
  p = clipPolyEdge(p, (q) => q[0] <= c.right, (a, b) => lerpPt(a, b, (c.right - a[0]) / (b[0] - a[0])));
  p = clipPolyEdge(p, (q) => q[1] >= c.bot, (a, b) => lerpPt(a, b, (c.bot - a[1]) / (b[1] - a[1])));
  p = clipPolyEdge(p, (q) => q[1] <= c.top, (a, b) => lerpPt(a, b, (c.top - a[1]) / (b[1] - a[1])));
  return p;
}

// 2D Host Clipping Rect (Cohen-Sutherland line clip + rect fill clip) — ONLY the host rect bounds all functions!
let CLIP = null;
function clipCode(x, y, c) {
  return (x < c.left ? 1 : x > c.right ? 2 : 0) | (y < c.bot ? 4 : y > c.top ? 8 : 0);
}
function clipLine(x0, y0, x1, y1, c) {
  let c0 = clipCode(x0, y0, c), c1 = clipCode(x1, y1, c);
  for (let it = 0; it < 12; it++) {
    if ((c0 | c1) === 0) return [x0, y0, x1, y1];
    if ((c0 & c1) !== 0) return null;
    const out = c0 || c1;
    let x, y;
    if (out & 8) { x = x0 + (x1 - x0) * (c.top - y0) / (y1 - y0); y = c.top; }
    else if (out & 4) { x = x0 + (x1 - x0) * (c.bot - y0) / (y1 - y0); y = c.bot; }
    else if (out & 2) { y = y0 + (y1 - y0) * (c.right - x0) / (x1 - x0); x = c.right; }
    else { y = y0 + (y1 - y0) * (c.left - x0) / (x1 - x0); x = c.left; }
    if (out === c0) { x0 = x; y0 = y; c0 = clipCode(x0, y0, c); }
    else { x1 = x; y1 = y; c1 = clipCode(x1, y1, c); }
  }
  return null;
}

const G = {
  line(x0, y0, x1, y1, col, widthPx) {
    if (CLIP) {
      const cl = clipLine(x0, y0, x1, y1, CLIP);
      if (!cl) return;
      x0 = cl[0]; y0 = cl[1]; x1 = cl[2]; y1 = cl[3];
    }
    const wpx = widthPx || 1.25;
    if (!gl || !prog) {
      const a = col[3] == null ? 1 : col[3];
      segs.push(x0, y0, x1, y1, col[0], col[1], col[2], a, wpx);
      cmds2d.push([0, x0, y0, x1, y1, col[0], col[1], col[2], a, wpx]);
      return;
    }
    const hw = wpx / Math.max(1, cssH);
    let dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return;
    dx /= len; dy /= len;
    const px = -dy * hw, py = dx * hw, ex = dx * hw, ey = dy * hw;
    pushQuad(x0 - ex + px, y0 - ey + py, x0 - ex - px, y0 - ey - py, x1 + ex - px, y1 + ey - py, x1 + ex + px, y1 + ey + py, col);
  },
  quad(x0, y0, x1, y1, x2, y2, x3, y3, col) {
    let poly = [[x0, y0], [x1, y1], [x2, y2], [x3, y3]];
    if (CLIP) {
      poly = clipPoly(poly, CLIP);
      if (poly.length < 3) return;
    }
    if (!gl || !prog) {
      cmds2d.push([1, poly, col[0], col[1], col[2], col[3] == null ? 1 : col[3]]);
      return;
    }
    for (let k = 1; k < poly.length - 1; k++) {
      pushTri(poly[0][0], poly[0][1], poly[k][0], poly[k][1], poly[k + 1][0], poly[k + 1][1], col);
    }
  },
  maskQuad3D(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3, col) {
    let poly = [[x0, y0, z0], [x1, y1, z1], [x2, y2, z2], [x3, y3, z3]];
    if (CLIP) {
      poly = clipPoly(poly, CLIP);
      if (poly.length < 3) return;
    }
    for (let k = 1; k < poly.length - 1; k++) {
      pushMaskTri3D(poly[0][0], poly[0][1], poly[0][2], poly[k][0], poly[k][1], poly[k][2], poly[k + 1][0], poly[k + 1][1], poly[k + 1][2], col);
    }
  },
  line3D(x0, y0, z0, x1, y1, z1, col, widthPx) {
    let ox0 = x0, oy0 = y0, ox1 = x1, oy1 = y1;
    if (CLIP) {
      const cl = clipLine(x0, y0, x1, y1, CLIP);
      if (!cl) return;
      const dx0 = ox1 - ox0, dy0 = oy1 - oy0;
      const len2 = dx0 * dx0 + dy0 * dy0;
      if (len2 > 1e-12) {
        const t0 = ((cl[0] - ox0) * dx0 + (cl[1] - oy0) * dy0) / len2;
        const t1 = ((cl[2] - ox0) * dx0 + (cl[3] - oy0) * dy0) / len2;
        const nz0 = z0 + (z1 - z0) * t0, nz1 = z0 + (z1 - z0) * t1;
        z0 = nz0; z1 = nz1;
      }
      x0 = cl[0]; y0 = cl[1]; x1 = cl[2]; y1 = cl[3];
    }
    const wpx = widthPx || 1.25;
    const hw = wpx / Math.max(1, cssH);
    let dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return;
    dx /= len; dy /= len;
    const px = -dy * hw, py = dx * hw, ex = dx * hw, ey = dy * hw;
    pushWireQuad3D(x0 - ex + px, y0 - ey + py, z0, x0 - ex - px, y0 - ey - py, z0, x1 + ex - px, y1 + ey - py, z1, x1 + ex + px, y1 + ey + py, z1, col);
  },
  fill(x, y, w, h, col) {
    if (!w || !h) return;
    if (CLIP) {
      const nx0 = Math.max(x, CLIP.left), ny0 = Math.max(y, CLIP.bot);
      const nx1 = Math.min(x + w, CLIP.right), ny1 = Math.min(y + h, CLIP.top);
      if (nx1 <= nx0 || ny1 <= ny0) return;
      x = nx0; y = ny0; w = nx1 - nx0; h = ny1 - ny0;
    }
    if (!gl || !prog) { fills.push(x, y, w, h, col[0], col[1], col[2], col[3] == null ? 1 : col[3]); return; }
    pushQuad(x, y, x + w, y, x + w, y + h, x, y + h, col);
  },
  circle(cx, cy, r, col, w, n) {
    const N = n || 32;
    let px = cx + r, py = cy;
    for (let i = 1; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      this.line(px, py, x, y, col, w || 1.2);
      px = x; py = y;
    }
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

function drawClipFrame(box) {
  const prev = CLIP;
  CLIP = null;
  const col = [0.42, 0.56, 0.68, 0.34], corner = [0.91, 0.64, 0.33, 0.82];
  const L = box.left, R = box.right, B = box.bot, T = box.top, tk = 0.048;
  G.line(L, B, R, B, col, 1.0); G.line(L, T, R, T, col, 1.0);
  G.line(L, B, L, T, col, 1.0); G.line(R, B, R, T, col, 1.0);
  G.line(L, T, L + tk, T, corner, 1.8); G.line(L, T, L, T - tk, corner, 1.8);
  G.line(R, T, R - tk, T, corner, 1.8); G.line(R, T, R, T - tk, corner, 1.8);
  G.line(L, B, L + tk, B, corner, 1.8); G.line(L, B, L, B + tk, corner, 1.8);
  G.line(R, B, R - tk, B, corner, 1.8); G.line(R, B, R, B + tk, corner, 1.8);
  CLIP = prev;
}

function viewOf(box) {
  // Strictly 1:1 isotropic scaling (sx === sy === s) so 3D manifolds, spheres, and conformal angles NEVER stretch!
  // V.w gives the true widescreen half-width in isotropic units (e.g. ~1.85 on 16:10, ~2.1 on 16:9).
  const s = (box.top - box.bot) * 0.5;
  const w = (box.right - box.left) / Math.max(1e-4, box.top - box.bot);
  const cx = (box.left + box.right) / 2, cy = (box.top + box.bot) / 2;
  const X = (x) => cx + x * s, Y = (y) => cy + y * s;
  return {
    s, w,
    line(x0, y0, x1, y1, col, wd) { G.line(X(x0), Y(y0), X(x1), Y(y1), col, wd); },
    line3D(x0, y0, z0, x1, y1, z1, col, wd) { G.line3D(X(x0), Y(y0), z0, X(x1), Y(y1), z1, col, wd); },
    quad(x0, y0, x1, y1, x2, y2, x3, y3, col) { G.quad(X(x0), Y(y0), X(x1), Y(y1), X(x2), Y(y2), X(x3), Y(y3), col); },
    maskQuad3D(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3, col) { G.maskQuad3D(X(x0), Y(y0), z0, X(x1), Y(y1), z1, X(x2), Y(y2), z2, X(x3), Y(y3), z3, col); },
    circ(x, y, r, col, wd, n) { G.circle(X(x), Y(y), r * s, col, wd, n); },
    fill(x, y, rw, rh, col) { G.fill(X(x), Y(y), rw * s, rh * s, col); },
    text(str, x, y, h, col) { G.text(str, X(x), Y(y), h * s, col); },
  };
}

// Perceptually balanced domain-coloring wheel tuned for CRT phosphor (arg in [-pi, pi])
// Red and blue/violet channels are luminance-lifted so red stripes match cyan/green/yellow brightness!
function phaseColor(arg, alpha) {
  if (!Number.isFinite(arg)) arg = 0;
  const h = ((arg / (Math.PI * 2)) % 1 + 1) % 1;
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = 0.28, q = 0.98 - 0.70 * f, tv = 0.28 + 0.70 * f;
  let r, g, b;
  if (i === 0) { r = 1.00; g = tv; b = p; }
  else if (i === 1) { r = q; g = 0.98; b = p; }
  else if (i === 2) { r = p; g = 0.98; b = tv; }
  else if (i === 3) { r = p; g = q; b = 1.00; }
  else if (i === 4) { r = tv; g = p; b = 1.00; }
  else { r = 1.00; g = p; b = q; }
  // Perceptual luminance boost for red/blue-heavy hues (Rec.709 Y = 0.2126R + 0.7152G + 0.0722B)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const lift = lum < 0.62 ? (0.62 - lum) * 0.55 : 0;
  return [Math.min(1, r + lift), Math.min(1, g + lift), Math.min(1, b + lift), alpha == null ? 0.90 : alpha];
}

// Circular angle wrap & midpoint so arbitrary unwrapped phases or +-pi branch cuts NEVER produce rainbow mismatches!
const TWO_PI = Math.PI * 2;
function wrapPi(a) {
  return ((a + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;
}
function avgAngle(a, b) {
  return a + wrapPi(b - a) * 0.5;
}

// Complex arithmetic & Special Functions (Smith-scaled cDiv & wide-range log-space Gamma!)
const cAdd = (a, b) => [a[0] + b[0], a[1] + b[1]];
const cMul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cDiv = (a, b) => {
  const br = b[0], bi = b[1], ar = a[0], ai = a[1];
  const abr = Math.abs(br), abi = Math.abs(bi);
  if (abr < 1e-12 && abi < 1e-12) {
    // Exact pole: preserve numerator phase with large finite magnitude (NEVER collapse 1/0 to 0!)
    return [ar * 1e12, ai * 1e12];
  }
  if (abr >= abi) {
    const r = bi / br, d = br + bi * r;
    return [(ar + ai * r) / d, (ai - ar * r) / d];
  } else {
    const r = br / bi, d = bi + br * r;
    return [(ar * r + ai) / d, (ai * r - ar) / d];
  }
};
const cExp = (z) => { const e = Math.exp(Math.max(-65, Math.min(65, z[0]))); return [e * Math.cos(z[1]), e * Math.sin(z[1])]; };
const cSin = (z) => { const y = Math.max(-65, Math.min(65, z[1])); return [Math.sin(z[0]) * Math.cosh(y), Math.cos(z[0]) * Math.sinh(y)]; };
const cCos = (z) => { const y = Math.max(-65, Math.min(65, z[1])); return [Math.cos(z[0]) * Math.cosh(y), -Math.sin(z[0]) * Math.sinh(y)]; };
const cCosh = (z) => { const x = Math.max(-65, Math.min(65, z[0])); return [Math.cosh(x) * Math.cos(z[1]), Math.sinh(x) * Math.sin(z[1])]; };
const cSinh = (z) => { const x = Math.max(-65, Math.min(65, z[0])); return [Math.sinh(x) * Math.cos(z[1]), Math.cosh(x) * Math.sin(z[1])]; };
const cPow = (r, s) => { const lr = Math.log(Math.max(1e-300, r)); const m = Math.exp(Math.max(-65, Math.min(65, s[0] * lr))); return [m * Math.cos(s[1] * lr), m * Math.sin(s[1] * lr)]; };
const cPowC = (z, p) => { const r = Math.hypot(z[0], z[1]) + 1e-12, a = Math.atan2(z[1], z[0]); const m = Math.pow(r, p); return [m * Math.cos(p * a), m * Math.sin(p * a)]; };

// Wide-range complex log(sin(w)) with exact wrapped phase & zero overflow for arbitrary |Im(w)|
function cLogSin(w) {
  const x = w[0], y = w[1], ay = Math.abs(y);
  if (ay < 12) {
    const sr = Math.sin(x) * Math.cosh(y), si = Math.cos(x) * Math.sinh(y);
    const m = Math.hypot(sr, si);
    if (m < 1e-9) return [-21, Math.cos(x) >= 0 ? 0 : Math.PI];
    return [Math.log(m), Math.atan2(si, sr)];
  }
  const sgn = y >= 0 ? 1 : -1;
  return [ay - Math.LN2, wrapPi(sgn * (Math.PI * 0.5 - x))];
}

const LANCZOS_P = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
// Log-space Lanczos Gamma: exact across huge complex ranges with wrapped phase & zero overflow/underflow!
function cLogGamma(z) {
  if (z[0] < 0.5) {
    const ls = cLogSin([Math.PI * z[0], Math.PI * z[1]]);
    const lg1 = cLogGamma([1 - z[0], -z[1]]);
    return [Math.log(Math.PI) - ls[0] - lg1[0], wrapPi(-ls[1] - lg1[1])];
  }
  const zm = [z[0] - 1, z[1]];
  let x = [0.99999999999980993, 0];
  for (let i = 0; i < LANCZOS_P.length; i++) x = cAdd(x, cDiv([LANCZOS_P[i], 0], [zm[0] + i + 1, zm[1]]));
  const t = [zm[0] + 7.5, zm[1]];
  const rt = Math.hypot(t[0], t[1]), at = Math.atan2(t[1], t[0]), lnr = Math.log(rt);
  const rx = Math.hypot(x[0], x[1]), ax = Math.atan2(x[1], x[0]);
  return [
    0.5 * Math.log(2 * Math.PI) + (zm[0] + 0.5) * lnr - zm[1] * at - t[0] + Math.log(Math.max(1e-300, rx)),
    wrapPi((zm[0] + 0.5) * at + zm[1] * lnr - t[1] + ax),
  ];
}
function cGamma(z) {
  const lg = cLogGamma(z);
  const m = Math.exp(Math.max(-65, Math.min(65, lg[0])));
  return [m * Math.cos(lg[1]), m * Math.sin(lg[1])];
}
function cInvGamma(z) {
  const lg = cLogGamma(z);
  const m = Math.exp(Math.max(-65, Math.min(65, -lg[0])));
  return [m * Math.cos(-lg[1]), m * Math.sin(-lg[1])];
}

const ZETA_BINOM = [1, 12, 66, 220, 495, 792, 924, 792, 495, 220, 66, 12, 1];
function cZetaRaw(s) {
  const N = 22;
  let re = 0, im = 0;
  for (let n = 1; n <= N; n++) {
    const lr = Math.log(n), m = Math.exp(-s[0] * lr), ang = -s[1] * lr, sgn = (n & 1) ? 1 : -1;
    re += sgn * m * Math.cos(ang); im += sgn * m * Math.sin(ang);
  }
  let tRe = 0, tIm = 0, w = 1 / 4096;
  for (let k = 0; k <= 12; k++) {
    let ck = 0; for (let j = k; j <= 12; j++) ck += ZETA_BINOM[j];
    const n = N + 1 + k, lr = Math.log(n), m = Math.exp(-s[0] * lr), ang = -s[1] * lr, sgn = (n & 1) ? 1 : -1;
    tRe += sgn * ck * w * m * Math.cos(ang); tIm += sgn * ck * w * m * Math.sin(ang);
  }
  const twoPow = cPow(2, [1 - s[0], -s[1]]);
  return cDiv([re + tRe, im + tIm], [1 - twoPow[0], -twoPow[1]]);
}
function cZeta(s) {
  // Guard removable 0/0 singularities of eta(s)/(1 - 2^(1-s)) at s = 1 + 2*pi*i*k/ln(2) (k != 0)!
  const twoPow = cPow(2, [1 - s[0], -s[1]]);
  const denMag = Math.hypot(1 - twoPow[0], -twoPow[1]);
  if (denMag < 0.08 && Math.abs(s[1]) > 1.0) {
    const a = cZetaRaw([s[0] + 0.05, s[1]]), b = cZetaRaw([s[0] - 0.05, s[1]]);
    return [0.5 * (a[0] + b[0]), 0.5 * (a[1] + b[1])];
  }
  return cZetaRaw(s);
}

function besselJ(n, x) {
  const ax = Math.abs(x);
  if (ax > 8.5) {
    const val = Math.sqrt(2 / (Math.PI * ax)) * Math.cos(ax - n * Math.PI * 0.5 - Math.PI * 0.25);
    return (x < 0 && (n & 1)) ? -val : val;
  }
  let sum = 0, term = Math.pow(x * 0.5, n) / (n === 0 ? 1 : (n === 1 ? 1 : 2));
  for (let k = 0; k < 18; k++) { sum += term; term *= -(x * x * 0.25) / ((k + 1) * (k + 1 + n)); }
  return sum;
}

// Unbounded 3D CAD perspective projection — reacts to orbit/zoom/pan and overflows freely to 2D host CLIP!
function proj3D(x, y, z, yaw, pitch, sc, isOpen) {
  const effYaw = (CAM.userOrbited ? 0.62 : yaw) + CAM.yaw;
  const effPitch = isOpen
    ? Math.max(0.24, Math.min(1.42, pitch + CAM.pitch))
    : Math.max(-1.42, Math.min(1.42, pitch + CAM.pitch));
  CAM.effYaw = effYaw;
  const ox = isOpen ? x - CAM.panU : x;
  const oy = isOpen ? y - CAM.panV : y;
  const cyw = Math.cos(effYaw), syw = Math.sin(effYaw), cp = Math.cos(effPitch), sp = Math.sin(effPitch);
  const x1 = ox * cyw - oy * syw, y1 = ox * syw + oy * cyw;
  const z2 = y1 * sp + z * cp;
  // True camera distance: y1 > 0 (top/far) has LARGER depth; y1 < 0 (bottom/near) and z > 0 (peaks) have SMALLER depth!
  const rawDepth = 5.0 + (y1 * cp - z * sp) * 0.28;
  const depth = Math.max(0.85, rawDepth);
  const p = 5.0 / depth;
  const scEff = sc * CAM.zoom;
  return [x1 * scEff * p + (isOpen ? 0 : CAM.panX), z2 * scEff * p * 0.94 + (isOpen ? 0 : CAM.panY), rawDepth];
}

// Dynamic world-plane domain radius: tight enough for crisp on-screen precision while extending cleanly past CLIP!
function openBounds(V, pitch, sc) {
  const effPitch = Math.max(0.24, Math.min(1.42, pitch + CAM.pitch));
  const scEff = sc * CAM.zoom;
  const sinP = Math.sin(effPitch), cosP = Math.cos(effPitch);
  const pFar = 0.78;
  const rX = (V.w * 1.08) / (scEff * pFar);
  const rY = (1.08 / (scEff * pFar * 0.94) + 0.55 * cosP) / sinP;
  const R = Math.max(1.5, Math.min(20.0, Math.max(rX, rY) * 1.10));
  return { R, effPitch, scEff };
}

// Hardware Z-Buffer Hidden-Line Removal (HLR) in WebGL1 (with safe near-plane Painter's fallback in 2D):
// Pass 1 writes exact per-pixel triangle depth via COL_OCCLUDE + polygonOffset; Pass 2 draws each unique edge ONCE!
const COL_STRIPE_YEL = [1.0, 0.94, 0.32, 1.0];
const COL_STRIPE_HOT = [1.0, 0.99, 0.84, 1.0];
const NEAR_DEPTH = 1.15;
function drawHiddenWireGrid(V, grid, nu, nv, lw, highlightColIdx, hasContour, skipCell) {
  const row = nu + 1;
  const bodyFade = (hasContour || highlightColIdx != null) ? 0.72 : 1.0;
  const useHwZ = !!(hlrOn && gl && prog && V.maskQuad3D && V.line3D);

  const drawEdge2D = (p, q, isHi) => {
    if (p[4] < NEAR_DEPTH || q[4] < NEAR_DEPTH) return;
    if (isHi) {
      V.line(p[0], p[1], q[0], q[1], COL_STRIPE_YEL, 3.0);
      V.line(p[0], p[1], q[0], q[1], COL_STRIPE_HOT, 1.4);
      return;
    }
    if (hasContour && p[5] != null && q[5] != null && (p[5] * q[5] <= 0 || Math.abs(p[5] + q[5]) < 0.14)) {
      V.line(p[0], p[1], q[0], q[1], COL_STRIPE_YEL, Math.max(2.1, lw * 2.1));
      return;
    }
    V.line(p[0], p[1], q[0], q[1], phaseColor(avgAngle(p[2], q[2]), Math.min(p[3], q[3]) * bodyFade), lw);
  };

  const drawEdge3D = (p, q, isHi) => {
    if (p[4] < NEAR_DEPTH || q[4] < NEAR_DEPTH) return;
    // Slight forward NDC Z bias (-0.0028) prevents steep/bent mask triangles from eating front wireframe lines!
    const zp = depthToNDC(p[4]) - 0.0028, zq = depthToNDC(q[4]) - 0.0028;
    if (isHi) {
      V.line3D(p[0], p[1], zp - 0.002, q[0], q[1], zq - 0.002, COL_STRIPE_YEL, 3.0);
      V.line3D(p[0], p[1], zp - 0.003, q[0], q[1], zq - 0.003, COL_STRIPE_HOT, 1.4);
      return;
    }
    if (hasContour && p[5] != null && q[5] != null && (p[5] * q[5] <= 0 || Math.abs(p[5] + q[5]) < 0.14)) {
      V.line3D(p[0], p[1], zp - 0.002, q[0], q[1], zq - 0.002, COL_STRIPE_YEL, Math.max(2.1, lw * 2.1));
      return;
    }
    V.line3D(p[0], p[1], zp, q[0], q[1], zq, phaseColor(avgAngle(p[2], q[2]), Math.min(p[3], q[3]) * bodyFade), lw);
  };

  const drawContourSeg = (a, b, c, d, is3D) => {
    if (!hasContour) return;
    const pts = [];
    const edges = [[a, b], [b, c], [c, d], [d, a]];
    for (let e = 0; e < 4; e++) {
      const p = edges[e][0], q = edges[e][1], fp = p[5], fq = q[5];
      if ((fp <= 0 && fq > 0) || (fq <= 0 && fp > 0)) {
        const s = fp / (fp - fq);
        pts.push([p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s, p[4] + (q[4] - p[4]) * s]);
      }
    }
    if (pts.length >= 2) {
      if (is3D) {
        const z0 = depthToNDC(pts[0][2]) - 0.003, z1 = depthToNDC(pts[1][2]) - 0.003;
        V.line3D(pts[0][0], pts[0][1], z0, pts[1][0], pts[1][1], z1, COL_STRIPE_YEL, 3.4);
        V.line3D(pts[0][0], pts[0][1], z0 - 0.001, pts[1][0], pts[1][1], z1 - 0.001, COL_STRIPE_HOT, 1.5);
      } else {
        V.line(pts[0][0], pts[0][1], pts[1][0], pts[1][1], COL_STRIPE_YEL, 3.4);
        V.line(pts[0][0], pts[0][1], pts[1][0], pts[1][1], COL_STRIPE_HOT, 1.5);
      }
    }
  };

  if (!hlrOn) {
    for (let j = 0; j <= nv; j++) {
      for (let i = 0; i <= nu; i++) {
        const a = grid[j * row + i];
        if (i < nu) drawEdge2D(a, grid[j * row + i + 1], false);
        if (j < nv) drawEdge2D(a, grid[(j + 1) * row + i], highlightColIdx != null && i === highlightColIdx);
        if (hasContour && i < nu && j < nv) drawContourSeg(a, grid[j * row + i + 1], grid[(j + 1) * row + i + 1], grid[(j + 1) * row + i], false);
      }
    }
    return;
  }

  const limX = V.w + 0.14, limY = 1.14;
  if (useHwZ) {
    // Hardware Z-Buffer HLR: exact per-pixel depth for every triangle + each unique edge drawn ONCE!
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        if (skipCell && skipCell[j * nu + i]) continue;
        const a = grid[j * row + i], b = grid[j * row + i + 1];
        const c = grid[(j + 1) * row + i + 1], d = grid[(j + 1) * row + i];
        if (a[4] < NEAR_DEPTH || b[4] < NEAR_DEPTH || c[4] < NEAR_DEPTH || d[4] < NEAR_DEPTH) continue;
        const maxX = Math.max(a[0], b[0], c[0], d[0]), minX = Math.min(a[0], b[0], c[0], d[0]);
        const maxY = Math.max(a[1], b[1], c[1], d[1]), minY = Math.min(a[1], b[1], c[1], d[1]);
        if (maxX < -limX || minX > limX || maxY < -limY || minY > limY) continue;
        V.maskQuad3D(a[0], a[1], depthToNDC(a[4]), b[0], b[1], depthToNDC(b[4]), c[0], c[1], depthToNDC(c[4]), d[0], d[1], depthToNDC(d[4]), COL_OCCLUDE);
        // Skip edges already drawn as smooth 4-segment curves by an adjacent subdivided steep cell (zero seam glitches!)
        if (!(skipCell && j > 0 && skipCell[(j - 1) * nu + i])) drawEdge3D(a, b, false);
        if (!(skipCell && i > 0 && skipCell[j * nu + (i - 1)])) drawEdge3D(a, d, highlightColIdx != null && i === highlightColIdx);
        if (j === nv - 1) drawEdge3D(d, c, false);
        if (i === nu - 1) drawEdge3D(b, c, highlightColIdx != null && i + 1 === highlightColIdx);
        drawContourSeg(a, b, c, d, true);
      }
    }
    return;
  }

  // Fallback Painter's Algorithm (2D Canvas only) with strict near-plane culling
  const cells = [];
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = grid[j * row + i], b = grid[j * row + i + 1];
      const c = grid[(j + 1) * row + i + 1], d = grid[(j + 1) * row + i];
      if (a[4] < NEAR_DEPTH || b[4] < NEAR_DEPTH || c[4] < NEAR_DEPTH || d[4] < NEAR_DEPTH) continue;
      const maxX = Math.max(a[0], b[0], c[0], d[0]), minX = Math.min(a[0], b[0], c[0], d[0]);
      const maxY = Math.max(a[1], b[1], c[1], d[1]), minY = Math.min(a[1], b[1], c[1], d[1]);
      if (maxX < -limX || minX > limX || maxY < -limY || minY > limY) continue;
      cells.push({ a, b, c, d, i, depth: 0.25 * (a[4] + b[4] + c[4] + d[4]) });
    }
  }
  cells.sort((p, q) => q.depth - p.depth);
  for (let k = 0; k < cells.length; k++) {
    const { a, b, c, d, i } = cells[k];
    V.quad(a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1], COL_OCCLUDE);
    const isHiL = highlightColIdx != null && i === highlightColIdx;
    const isHiR = highlightColIdx != null && i + 1 === highlightColIdx;
    drawEdge2D(a, b, false);
    drawEdge2D(d, c, false);
    drawEdge2D(a, d, isHiL);
    drawEdge2D(b, c, isHiR);
    drawContourSeg(a, b, c, d, false);
  }
}

// Edge-to-edge 3D surface wireframe: dynamically recalculated infinite plane bounded ONLY by 2D host CLIP rect!
// Optional snapSpec = { uPeriod, uPhase, uSnap, vPeriod, vPhase, vSnap } snaps nearest grid lines exactly onto
// poles/zeros so spires and zeros NEVER vanish or jitter from grid-rounding error at any zoom/pan/mesh density!
function drawOpenSurface3D(V, evalFn, Nu, Nv, yaw, pitch, sc, highlightU, contourFn, snapSpec) {
  const s = surfScale();
  const { R } = openBounds(V, pitch, sc);
  // World-space locked step size (depends ONLY on zoom & mesh scale — NEVER swims with pitch/yaw orbit!)
  const baseLines = Math.max(22, Math.min(220, Math.round(Math.max(Nu, 52) * 2.20 * s)));
  const maxN = 230;
  const baseStep = Math.max((13.6 / Math.max(0.25, CAM.zoom)) / baseLines, (2 * R) / maxN);
  // Align running variables (stepU, stepV) to exact integer subdivisions of any periodic pole/zero lattice
  // so every pole/zero lands on an EXACT, uniformly spaced grid vertex with zero distortion or popping!
  let stepU = baseStep, stepV = baseStep;
  let uPhase = 0, vPhase = 0;
  if (snapSpec) {
    if (snapSpec.uPeriod > 0) {
      const subU = Math.max(1, Math.round(snapSpec.uPeriod / baseStep));
      stepU = Math.max(snapSpec.uPeriod / subU, (2 * R) / maxN);
      uPhase = snapSpec.uPhase || 0;
    } else if (snapSpec.uSnap != null) {
      uPhase = snapSpec.uSnap;
    }
    if (snapSpec.vPeriod > 0) {
      const subV = Math.max(1, Math.round(snapSpec.vPeriod / baseStep));
      stepV = Math.max(snapSpec.vPeriod / subV, (2 * R) / maxN);
      vPhase = snapSpec.vPhase || 0;
    } else if (snapSpec.vSnap != null) {
      vPhase = snapSpec.vSnap;
    }
  }
  const nu = Math.max(18, Math.min(maxN, Math.ceil((2 * R) / stepU)));
  const nv = Math.max(18, Math.min(maxN, Math.ceil((2 * R) / stepV)));
  const u0 = uPhase + Math.floor((CAM.panU - R - uPhase) / stepU) * stepU;
  const v0 = vPhase + Math.floor((CAM.panV - R - vPhase) / stepV) * stepV;
  const nu2 = nu + 2, nv2 = nv + 2;
  const uArr = new Float64Array(nu2 + 1), vArr = new Float64Array(nv2 + 1);
  for (let i = 0; i <= nu2; i++) uArr[i] = u0 + i * stepU;
  for (let j = 0; j <= nv2; j++) vArr[j] = v0 + j * stepV;
  // Fallback exact snap when zoomed very far out (period < step)
  if (snapSpec) {
    const snapAxis = (arr, n, st, val, period, phase) => {
      if (val != null) {
        const idx = Math.round((val - arr[0]) / st);
        if (idx > 0 && idx < n) arr[idx] = val;
      }
      if (period > 0 && period >= st * 1.25) {
        const ph = phase || 0;
        const k0 = Math.ceil((arr[1] - ph) / period), k1 = Math.floor((arr[n - 1] - ph) / period);
        for (let k = k0; k <= k1; k++) {
          const target = ph + k * period;
          const idx = Math.round((target - arr[0]) / st);
          if (idx > 0 && idx < n) arr[idx] = target;
        }
      }
    };
    snapAxis(uArr, nu2, stepU, snapSpec.uSnap, snapSpec.uPeriod, snapSpec.uPhase);
    snapAxis(vArr, nv2, stepV, snapSpec.vSnap, snapSpec.vPeriod, snapSpec.vPhase);
  }
  const grid = new Array((nu2 + 1) * (nv2 + 1));
  const rawZ = new Float32Array((nu2 + 1) * (nv2 + 1));
  let hiIdx = null;
  if (highlightU != null) {
    const idx = Math.round((highlightU - u0) / stepU);
    if (idx >= 0 && idx <= nu2) { hiIdx = idx; uArr[idx] = highlightU; }
  }
  const evalSafe = (u, v) => {
    const res = evalFn(u, v);
    const zVal = Number.isFinite(res[0]) ? Math.max(-2.2, Math.min(2.2, res[0])) : 0;
    const argVal = Number.isFinite(res[1]) ? wrapPi(res[1]) : 0;
    const alpVal = Number.isFinite(res[2]) ? Math.max(0, Math.min(1, res[2])) : 0.84;
    const p = proj3D(u, v, zVal, yaw, pitch, sc, true);
    const cf = contourFn ? contourFn(u, v) : null;
    return [p[0], p[1], argVal, alpVal, p[2], cf, zVal];
  };
  for (let j = 0; j <= nv2; j++) {
    const v = vArr[j];
    for (let i = 0; i <= nu2; i++) {
      const idx = j * (nu2 + 1) + i;
      const pt = evalSafe(uArr[i], v);
      grid[idx] = pt;
      rawZ[idx] = pt[6];
    }
  }
  const lw = meshW(1.15);
  // Adaptive 4x4 steep-quad HLR mask subdivision: refines ONLY the opaque occlusion surface (for exact
  // shadowing/eclipsing) and curves the cell's 4 outer mesh edges — NEVER adds interior sub-grid lines!
  const useHwZ = !!(hlrOn && gl && prog && V.maskQuad3D && V.line3D);
  let skipCell = null;
  if (useHwZ) {
    const row = nu2 + 1, limX = V.w + 0.14, limY = 1.14;
    const SUB = 4, subRow = SUB + 1;
    const subGrid = new Array(subRow * subRow);
    const bodyFade = (!!contourFn || hiIdx != null) ? 0.72 : 1.0;
    const drawCurvedEdge = (p, q, isHi) => {
      if (p[4] < NEAR_DEPTH || q[4] < NEAR_DEPTH) return;
      const zp = depthToNDC(p[4]) - 0.0028, zq = depthToNDC(q[4]) - 0.0028;
      if (isHi) {
        V.line3D(p[0], p[1], zp - 0.002, q[0], q[1], zq - 0.002, COL_STRIPE_YEL, 3.0);
        V.line3D(p[0], p[1], zp - 0.003, q[0], q[1], zq - 0.003, COL_STRIPE_HOT, 1.4);
        return;
      }
      V.line3D(p[0], p[1], zp, q[0], q[1], zq, phaseColor(avgAngle(p[2], q[2]), Math.min(p[3], q[3]) * bodyFade), lw);
    };
    let subBudget = 120;
    for (let j = 0; j < nv2 && subBudget > 0; j++) {
      for (let i = 0; i < nu2 && subBudget > 0; i++) {
        const i00 = j * row + i, i10 = i00 + 1, i11 = (j + 1) * row + i + 1, i01 = (j + 1) * row + i;
        const za = rawZ[i00], zb = rawZ[i10], zc = rawZ[i11], zd = rawZ[i01];
        const dz = Math.max(za, zb, zc, zd) - Math.min(za, zb, zc, zd);
        if (dz < 0.28) continue;
        const a = grid[i00], b = grid[i10], c = grid[i11], d = grid[i01];
        if (a[4] < NEAR_DEPTH || b[4] < NEAR_DEPTH || c[4] < NEAR_DEPTH || d[4] < NEAR_DEPTH) continue;
        if (Math.max(a[0], b[0], c[0], d[0]) < -limX || Math.min(a[0], b[0], c[0], d[0]) > limX ||
            Math.max(a[1], b[1], c[1], d[1]) < -limY || Math.min(a[1], b[1], c[1], d[1]) > limY) continue;
        if (!skipCell) skipCell = new Uint8Array(nu2 * nv2);
        skipCell[j * nu2 + i] = 1;
        subBudget--;
        const uA = uArr[i], uB = uArr[i + 1], vA = vArr[j], vB = vArr[j + 1];
        for (let sj = 0; sj <= SUB; sj++) {
          const vs = vA + (sj / SUB) * (vB - vA);
          for (let si = 0; si <= SUB; si++) {
            const us = uA + (si / SUB) * (uB - uA);
            subGrid[sj * subRow + si] = evalSafe(us, vs);
          }
        }
        // 1) Smooth 4x4 opaque occlusion mask ONLY (accurate shadowing/eclipsing, zero interior lines!)
        for (let sj = 0; sj < SUB; sj++) {
          for (let si = 0; si < SUB; si++) {
            const sa = subGrid[sj * subRow + si], sb = subGrid[sj * subRow + si + 1];
            const sc2 = subGrid[(sj + 1) * subRow + si + 1], sd = subGrid[(sj + 1) * subRow + si];
            if (sa[4] < NEAR_DEPTH || sb[4] < NEAR_DEPTH || sc2[4] < NEAR_DEPTH || sd[4] < NEAR_DEPTH) continue;
            V.maskQuad3D(sa[0], sa[1], depthToNDC(sa[4]), sb[0], sb[1], depthToNDC(sb[4]), sc2[0], sc2[1], depthToNDC(sc2[4]), sd[0], sd[1], depthToNDC(sd[4]), COL_OCCLUDE);
          }
        }
        // 2) Draw ONLY the original uniform mesh cell's 4 outer edges (curved smoothly along the 4x4 mask!)
        const hiL = hiIdx != null && i === hiIdx, hiR = hiIdx != null && i + 1 === hiIdx;
        for (let sI = 0; sI < SUB; sI++) {
          drawCurvedEdge(subGrid[sI], subGrid[sI + 1], false);
          drawCurvedEdge(subGrid[SUB * subRow + sI], subGrid[SUB * subRow + sI + 1], false);
          drawCurvedEdge(subGrid[sI * subRow], subGrid[(sI + 1) * subRow], hiL);
          drawCurvedEdge(subGrid[sI * subRow + SUB], subGrid[(sI + 1) * subRow + SUB], hiR);
        }
      }
    }
  }
  drawHiddenWireGrid(V, grid, nu2, nv2, lw, hiIdx, !!contourFn, skipCell);
}

  // 3D Mountain-Peak / Landmark Elevation Pin: projects (u, v, z) and draws a crisp leader stem + CRT label!
  function pin3D(V, u, v, z, label, yaw, pitch, sc, isOpen, col) {
    const b = proj3D(u, v, z, yaw, pitch, sc, isOpen);
    if (Math.abs(b[0]) > V.w * 0.94 || Math.abs(b[1]) > 0.92) return;
    const top = proj3D(u, v, z + 0.28, yaw, pitch, sc, isOpen);
    const c = col || COL_STRIPE_HOT;
    V.line(b[0], b[1], top[0], top[1], COL_STRIPE_YEL, 1.3);
    V.circ(b[0], b[1], 0.014, c, 1.8, 8);
    const h = 0.052;
    const tx = Math.max(-V.w * 0.94, Math.min(V.w * 0.94 - label.length * h * 0.85, top[0] + 0.02));
    const ty = Math.min(0.95, top[1] + h * 1.15);
    V.text(label, tx, ty, h, c);
  }

  // ============================================================================
  // I. 2D CALCULUS — DERIVATIVES, RIEMANN INTEGRALS & TAYLOR SERIES (3 parts)
  // ============================================================================
  function drawCalculus2D(V, sim, t, dt, part) {
    const p = (part || 0) % 3, W = V.w * 0.95;
    const f = (x) => 0.48 * Math.sin(x * 1.45) + 0.24 * Math.cos(x * 2.9);
    const df = (x) => 0.48 * 1.45 * Math.cos(x * 1.45) - 0.24 * 2.9 * Math.sin(x * 2.9);
    V.line(-W, 0, W, 0, COL.grid, 1.0); V.line(0, -0.92, 0, 0.92, COL.grid, 1.0);

    if (p === 0) {
      const x0 = -2.8 + ((t * 0.95) % 5.6);
      const sx = W / 3.4;
      let px = 0, py = 0, pxD = 0, pyD = 0;
      for (let i = 0; i <= 160; i++) {
        const xv = -3.4 + (i / 160) * 6.8;
        const x = xv * sx, y = f(xv) * 0.85, yD = df(xv) * 0.46;
        if (i > 0) {
          V.line(pxD, pyD, x, yD, [0.34, 0.78, 0.98, 0.42], 1.3);
          V.line(px, py, x, y, COL.paper, 1.9);
        }
        px = x; py = y; pxD = x; pyD = yD;
      }
      const y0 = f(x0) * 0.85, sl = df(x0) * 0.85 / sx, tx = x0 * sx;
      V.line(tx - 0.42, y0 - sl * 0.42, tx + 0.42, y0 + sl * 0.42, COL.amber, 2.2);
      V.line(tx, 0, tx, df(x0) * 0.46, [0.34, 0.78, 0.98, 0.72], 1.2);
      V.circ(tx, y0, 0.024, COL.amber, 2.2, 12);
      V.circ(tx, df(x0) * 0.46, 0.018, COL.cyan, 2.0, 10);
      return [["X0", x0.toFixed(2)], ["F(X0)", f(x0).toFixed(2)], ["F'(X0)", df(x0).toFixed(2)]];
    } else if (p === 1) {
      const N = 6 + Math.floor((t * 4.5) % 42);
      const a = -3.0, b = 3.0, dx = (b - a) / N, sx = W / 3.2;
      let sum = 0;
      for (let k = 0; k < N; k++) {
        const xm = a + (k + 0.5) * dx, yv = f(xm) * 0.85 + 0.25;
        sum += (f(xm) + 0.25 / 0.85) * dx;
        const rx = (a + k * dx) * sx, rw = dx * sx;
        V.fill(rx, Math.min(0, yv), rw * 0.92, Math.abs(yv), yv >= 0 ? [0.34, 0.82, 0.64, 0.20] : [0.89, 0.38, 0.29, 0.20]);
        V.line(rx, 0, rx, yv, yv >= 0 ? COL.cyan : COL.hot, 1.0);
        V.line(rx, yv, rx + rw * 0.92, yv, yv >= 0 ? COL.cyan : COL.hot, 1.1);
      }
      let px = 0, py = 0;
      for (let i = 0; i <= 140; i++) {
        const xv = a + (i / 140) * (b - a), x = xv * sx, y = f(xv) * 0.85 + 0.25;
        if (i > 0) V.line(px, py, x, y, COL.amber, 2.0);
        px = x; py = y;
      }
      return [["PARTITIONS N", String(N)], ["RIEMANN SUM", sum.toFixed(3)], ["DX", dx.toFixed(3)]];
    } else {
      const ord = 1 + 2 * Math.floor((t * 1.1) % 7), sx = W / 6.4;
      let pxS = 0, pyS = 0, pxT = 0, pyT = 0;
      for (let i = 0; i <= 160; i++) {
        const xv = -6.4 + (i / 160) * 12.8, ys = Math.sin(xv) * 0.54;
        let yt = 0, term = xv;
        for (let k = 1; k <= ord; k += 2) { yt += term; term *= -(xv * xv) / ((k + 1) * (k + 2)); }
        const x = xv * sx, yT = Math.max(-1.4, Math.min(1.4, yt * 0.54));
        if (i > 0) { V.line(pxS, pyS, x, ys, [0.34, 0.78, 0.98, 0.55], 1.5); V.line(pxT, pyT, x, yT, COL.amber, 2.0); }
        pxS = x; pyS = ys; pxT = x; pyT = yT;
      }
      return [["TARGET", "SIN(X)"], ["DEGREE", "2K+1 = " + ord], ["PART", "3 / 3"]];
    }
  }

  // ============================================================================
  // II. 2D ORTHOGONAL POLYNOMIALS: CHEBYSHEV, LEGENDRE & HERMITE (3 parts)
  // ============================================================================
  function drawPolynomials2D(V, sim, t, dt, part) {
    const p = (part || 0) % 3, W = V.w * 0.94;
    const active = 1 + Math.floor((t * 0.8) % 6);
    V.line(-W, 0, W, 0, COL.grid, 1.0); V.line(0, -0.92, 0, 0.92, COL.grid, 1.0);

    if (p === 0) {
      for (let n = 1; n <= 6; n++) {
        const hi = n === active; let px = 0, py = 0;
        for (let i = 0; i <= 120; i++) {
          const xv = -1 + (2 * i) / 120, yv = Math.cos(n * Math.acos(xv)) * 0.76, x = xv * W;
          if (i > 0) V.line(px, py, x, yv, hi ? COL.amber : phaseColor(n * 0.9, 0.34), hi ? 2.2 : 1.15);
          px = x; py = yv;
        }
      }
      return [["FAMILY", "CHEBYSHEV T_N"], ["ACTIVE", "T" + active + "(X)"], ["NORM", "[-1, 1]"]];
    } else if (p === 1) {
      for (let n = 1; n <= 6; n++) {
        const hi = n === active; let px = 0, py = 0;
        for (let i = 0; i <= 120; i++) {
          const xv = -1 + (2 * i) / 120; let p0 = 1, p1 = xv;
          for (let k = 2; k <= n; k++) { const pn = ((2 * k - 1) * xv * p1 - (k - 1) * p0) / k; p0 = p1; p1 = pn; }
          const x = xv * W, yv = p1 * 0.76;
          if (i > 0) V.line(px, py, x, yv, hi ? COL.amber : phaseColor(n * 0.9, 0.34), hi ? 2.2 : 1.15);
          px = x; py = yv;
        }
      }
      return [["FAMILY", "LEGENDRE P_N"], ["ACTIVE", "P" + active + "(X)"], ["ROOTS", active + " GAUSS"]];
    } else {
      const nAct = active - 1, norm = [1, 1.41, 2.83, 6.93, 19.6, 62.0];
      for (let n = 0; n < 6; n++) {
        const hi = n === nAct; let px = 0, py = 0;
        for (let i = 0; i <= 140; i++) {
          const xv = -4.2 + (i / 140) * 8.4; let h0 = 1, h1 = 2 * xv;
          if (n === 0) h1 = 1;
          else for (let k = 2; k <= n; k++) { const hn = 2 * xv * h1 - 2 * (k - 1) * h0; h0 = h1; h1 = hn; }
          const psi = (h1 / norm[n]) * Math.exp(-0.5 * xv * xv);
          const x = (xv / 4.2) * W, y = -0.66 + n * 0.25 + psi * 0.22;
          if (i > 0) V.line(px, py, x, y, hi ? COL.amber : [0.34, 0.78, 0.98, 0.42], hi ? 2.2 : 1.2);
          px = x; py = y;
        }
      }
      return [["FAMILY", "HERMITE H_N"], ["LEVEL", "N = " + nAct], ["WEIGHT", "EXP(-X^2/2)"]];
    }
  }

  // ============================================================================
  // III. 2D COMPLEX ANALYSIS & C-SERIES (3 parts: Taylor / Cauchy / Lacunary-Joukowski)
  // ============================================================================
  function drawCSeries2D(V, sim, t, dt, part) {
    const p = (part || 0) % 3, W = V.w * 0.95;

    if (p === 0) {
      const Nterms = 1 + Math.floor((t * 1.4) % 10);
      const scX = W * 0.42, scY = 0.56;
      V.line(-W, 0, W, 0, COL.grid, 1.0); V.line(0, -0.92, 0, 0.92, COL.grid, 1.0);
      V.line(-scX, -0.90, -scX, 0.90, [0.96, 0.42, 0.34, 0.55], 1.2);
      V.line(scX, -0.90, scX, 0.90, [0.96, 0.42, 0.34, 0.55], 1.2);
      V.circ(0, scY, 0.028, COL.hot, 2.0, 12); V.circ(0, -scY, 0.028, COL.hot, 2.0, 12);
      let pxE = 0, pyE = 0, pxT = 0, pyT = 0;
      for (let i = 0; i <= 180; i++) {
        const xv = -2.2 + (i / 180) * 4.4, exact = 1 / (1 + xv * xv);
        let taylor = 0, pow = 1;
        for (let n = 0; n < Nterms; n++) { taylor += ((n & 1) ? -1 : 1) * pow; pow *= xv * xv; }
        const x = xv * scX, yE = exact * scY, yT = Math.max(-1.6, Math.min(1.6, taylor)) * scY;
        if (i > 0) {
          V.line(pxE, pyE, x, yE, [0.34, 0.80, 0.98, 0.65], 1.6);
          if (Math.abs(taylor) < 1.65) V.line(pxT, pyT, x, yT, COL.amber, 2.0);
        }
        pxE = x; pyE = yE; pxT = x; pyT = yT;
      }
      return [["TERMS N", String(Nterms)], ["RADIUS R", "1.00 (POLES +-I)"], ["TARGET", "1 / (1 + X^2)"]];
    } else if (p === 1) {
      const z1 = [-0.52, 0.14], z2 = [0.54, -0.12];
      const cx = -0.68 + 1.36 * (0.5 + 0.5 * Math.sin(t * 0.55)), R = 0.54;
      const in1 = Math.hypot(z1[0] - cx, z1[1]) < R, in2 = Math.hypot(z2[0] - cx, z2[1]) < R;
      const resSum = (in1 ? 1 : 0) + (in2 ? -2 : 0);
      V.line(-W, 0, W, 0, COL.grid, 0.9); V.line(0, -0.92, 0, 0.92, COL.grid, 0.9);
      V.circ(z1[0], z1[1], 0.036, in1 ? COL.amber : COL.hot, 2.2, 12);
      V.circ(z2[0], z2[1], 0.036, in2 ? COL.amber : COL.hot, 2.2, 12);
      let px = 0, py = 0;
      for (let i = 0; i <= 72; i++) {
        const a = (i / 72) * Math.PI * 2, rr = R * (1 + 0.12 * Math.sin(3 * a + t));
        const x = cx + rr * Math.cos(a), y = rr * Math.sin(a);
        if (i > 0) V.line(px, py, x, y, resSum === 0 ? COL.cyan : COL.amber, 2.0);
        px = x; py = y;
      }
      return [["ENCLOSED", (in1 ? "Z1 " : "") + (in2 ? "Z2" : (!in1 ? "NONE" : ""))], ["SUM RES", String(resSum)], ["INTEGRAL", (resSum * 2) + "*PI*I"]];
    } else {
      // Part 3: Joukowski Conformal Map w = z + a^2/z (strictly 1:1 isotropic!)
      const blend = 0.5 + 0.5 * Math.sin(t * 0.75 - Math.PI * 0.5);
      const cx0 = -0.14, cy0 = 0.14, R0 = 1.16;
      const mapZ = (x, y) => { const inv = cDiv([1, 0], [x, y]); return [x + blend * inv[0], y + blend * inv[1]]; };
      for (let rI = 0; rI < 6; rI++) {
        const R = R0 + rI * 0.24; let px = 0, py = 0;
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2, [wx, wy] = mapZ(cx0 + R * Math.cos(a), cy0 + R * Math.sin(a));
          const sx = wx * 0.34, sy = wy * 0.34;
          if (i > 0) V.line(px, py, sx, sy, rI === 0 ? COL.amber : phaseColor(a, 0.68), rI === 0 ? 2.2 : 1.15);
          px = sx; py = sy;
        }
      }
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2; let px = 0, py = 0;
        for (let s = 0; s <= 16; s++) {
          const R = R0 + (s / 16) * 1.20, [wx, wy] = mapZ(cx0 + R * Math.cos(a), cy0 + R * Math.sin(a));
          const sx = wx * 0.34, sy = wy * 0.34;
          if (s > 0) V.line(px, py, sx, sy, [0.34, 0.78, 0.98, 0.42], 1.0);
          px = sx; py = sy;
        }
      }
      return [["MAP", "W = Z + 1/Z"], ["ANGLES", "90 DEG EXACT"], ["BLEND", blend.toFixed(2)]];
    }
  }

  // ============================================================================
  // IV. 2D RIEMANN HYPOTHESIS: CRITICAL-LINE SPIRAL & PRIME EXPLICIT FORMULA (2 parts)
  // ============================================================================
  const RIEMANN_ZEROS = [14.1347, 21.0220, 25.0109, 30.4249, 32.9351, 37.5862, 40.9187, 43.3271, 48.0052, 49.7738];
  function drawRiemann2D(V, sim, t, dt, part) {
    const p = (part || 0) % 2, W = V.w * 0.95;
    if (p === 0) {
      const tMax = 6.0 + ((t * 3.8) % 36.0);
      const Lcx = -W * 0.50, Lcy = 0.0, Lsc = 0.24;
      V.line(-W, Lcy, -0.04, Lcy, COL.grid, 0.9); V.line(Lcx, -0.90, Lcx, 0.90, COL.grid, 0.9);
      V.line(0.0, -0.92, 0.0, 0.92, COL.grid, 1.0);
      V.circ(Lcx, Lcy, 0.026, [1.0, 0.95, 0.75, 0.95], 1.8, 12);
      let px = 0, py = 0;
      for (let i = 0; i <= 180; i++) {
        const ti = (i / 180) * tMax, z = cZeta([0.5, ti]);
        const x = Lcx + Math.max(-3.0, Math.min(3.0, z[0])) * Lsc, y = Lcy + Math.max(-3.6, Math.min(3.6, z[1])) * Lsc;
        if (i > 0) V.line(px, py, x, y, phaseColor(Math.atan2(z[1], z[0]), 0.25 + 0.72 * (i / 180)), 1.5);
        px = x; py = y;
      }
      V.circ(px, py, 0.022, COL.amber, 2.0, 10);
      const Rx0 = 0.08, Rx1 = W, Rcy = -0.52, Rh = 0.38;
      V.line(Rx0, Rcy, Rx1, Rcy, COL.grid, 1.0);
      let qx = 0, qy = 0;
      for (let i = 0; i <= 160; i++) {
        const ti = (i / 160) * 44.0, z = cZeta([0.5, ti]);
        const x = Rx0 + (i / 160) * (Rx1 - Rx0), y = Rcy + Math.min(3.4, Math.hypot(z[0], z[1])) * Rh;
        if (i > 0) V.line(qx, qy, x, y, ti <= tMax ? COL.cyan : [0.34, 0.54, 0.68, 0.35], ti <= tMax ? 1.8 : 1.1);
        qx = x; qy = y;
      }
      RIEMANN_ZEROS.forEach((zr) => { if (zr <= 44) V.circ(Rx0 + (zr / 44.0) * (Rx1 - Rx0), Rcy, 0.018, zr <= tMax ? COL.amber : COL.dim, 1.8, 10); });
      return [["T", tMax.toFixed(2)], ["ZEROS HIT", String(RIEMANN_ZEROS.filter((z) => z <= tMax).length)], ["LINE", "RE(S) = 1/2"]];
    } else {
      const nZeros = 1 + Math.floor((t * 1.4) % RIEMANN_ZEROS.length);
      const x0 = -W, x1 = W, y0 = -0.80, y1 = 0.82, w = x1 - x0, h = y1 - y0, Xmax = 32;
      V.line(x0, y0, x1, y0, COL.grid, 1.0); V.line(x0, y0, x0, y1, COL.grid, 1.0);
      const primePowers = [[2, 2], [3, 3], [4, 2], [5, 5], [7, 7], [8, 2], [9, 3], [11, 11], [13, 13], [16, 2], [17, 17], [19, 19], [23, 23], [25, 5], [27, 3], [29, 29], [31, 31]];
      let pxE = x0, pyE = y0, pxA = x0, pyA = y0;
      for (let i = 1; i <= 180; i++) {
        const xv = 1.5 + (i / 180) * (Xmax - 1.5);
        let psiExact = 0; for (const [pk, pr] of primePowers) if (pk <= xv) psiExact += Math.log(pr);
        let osc = 0; const sx = Math.sqrt(xv), lnx = Math.log(xv);
        for (let k = 0; k < nZeros; k++) { const g = RIEMANN_ZEROS[k], ang = g * lnx; osc += 2 * sx * (0.5 * Math.cos(ang) + g * Math.sin(ang)) / (0.25 + g * g); }
        const x = x0 + (xv / Xmax) * w, yE = y0 + (psiExact / Xmax) * h, yA = y0 + Math.min(1.08, Math.max(0, xv - osc - Math.log(2 * Math.PI)) / Xmax) * h;
        if (i > 1) { V.line(pxE, pyE, x, yE, [0.34, 0.78, 0.98, 0.55], 1.4); V.line(pxA, pyA, x, yA, COL.amber, 2.0); }
        pxE = x; pyE = yE; pxA = x; pyA = yA;
      }
      return [["ZEROS", nZeros + " / 10"], ["MAX X", String(Xmax)], ["TARGET", "PSI(X) PRIMES"]];
    }
  }

  // ============================================================================
  // V. 3D COMPLEX GAMMA |Gamma(z)| & RECIPROCAL 1/Gamma(z) (2 parts, host-clipped!)
  // ============================================================================
  function drawGamma3D(V, sim, t, dt, part) {
    const p = (part || 0) % 2;
    const yaw = 0.62 + t * 0.22, pitch = 0.48 + 0.05 * Math.sin(t * 0.35);
    const deg = ((((CAM.userOrbited ? 0.62 : yaw) + CAM.yaw) * 180 / Math.PI) % 360 + 360) % 360;
    if (p === 0) {
      drawOpenSurface3D(V, (u, v) => {
        const g = cGamma([-0.5 + u * 1.15, v * 1.05]);
        return [Math.min(1.30, Math.log(1 + Math.hypot(g[0], g[1])) * 0.46) - 0.36, Math.atan2(g[1], g[0]), 0.88];
      }, 52, 50, yaw, pitch, 0.58);
      // Pole mountain-peak pins at z = 0, -1, -2, -3 (where -0.5 + u*1.15 = k)
      for (let k = 0; k >= -3; k--) pin3D(V, (k + 0.5) / 1.15, 0, 0.94, "Z=" + k, yaw, pitch, 0.58, true);
      return [["SURFACE", "|GAMMA(Z)|"], ["YAW", deg.toFixed(1) + " DEG"], ["MESH", meshMul().toFixed(1) + "X"]];
    } else {
      drawOpenSurface3D(V, (u, v) => {
        const g = cDiv([1, 0], cGamma([-0.5 + u * 1.15, v * 1.05]));
        return [Math.min(1.15, Math.log(1 + Math.hypot(g[0], g[1])) * 0.44) - 0.36, Math.atan2(g[1], g[0]), 0.88];
      }, 52, 50, yaw, pitch, 0.58);
      for (let k = 0; k >= -2; k--) pin3D(V, (k + 0.5) / 1.15, 0, -0.34, "Z=" + k + " (0)", yaw, pitch, 0.58, true, COL.cyan);
      return [["SURFACE", "|1 / GAMMA(Z)|"], ["YAW", deg.toFixed(1) + " DEG"], ["MESH", meshMul().toFixed(1) + "X"]];
    }
  }

  // ============================================================================
  // VI. 3D RIEMANN ZETA |zeta(s)| OVER CRITICAL STRIP (edge-to-edge host-clipped!)
  // ============================================================================
  function drawZeta3D(V, sim, t) {
    const yaw = 0.68 + 0.24 * Math.sin(t * 0.26), pitch = 0.48;
    const tShift = (t * 1.5) % 14.0;
    const imCenter = 22.0 + CAM.panV * 4.6 + tShift * 0.4;
    // Pass highlightU = 0 so the bright yellow Critical Line Re(s) = 1/2 participates in true HLR occlusion!
    drawOpenSurface3D(V, (u, v) => {
      const sig = 0.5 + u * 0.55;
      const im = 22.0 + v * 4.6 + tShift * 0.4;
      const z = cZetaFull([sig, im]);
      return [1.05 * Math.tanh(Math.log(1 + Math.hypot(z[0], z[1])) * 0.50) - 0.34, Math.atan2(z[1], z[0]), 0.88];
    }, 50, 52, yaw, pitch, 0.60, 0);
    return [["CRITICAL LINE", "RE(S) = 1/2"], ["IM(S)", imCenter.toFixed(2)], ["ZOOM", CAM.zoom.toFixed(2) + "X"]];
  }

  // ============================================================================
  // III. 3D BESSEL WAVEFIELD & COMPLEX AIRY CAUSTIC (2 parts)
  // ============================================================================
  function drawBesselAiry3D(V, sim, t, dt, part) {
    const p = (part || 0) % 2;
    const yaw = 0.55 + t * 0.25, pitch = 0.48;
    if (p === 0) {
      const m = Math.floor((t * 0.32) % 3), osc = Math.cos(t * 2.2);
      drawOpenSurface3D(V, (u, v) => {
        const r = Math.hypot(u, v), th = Math.atan2(v, u);
        const val = besselJ(m, r * 3.2) * Math.cos(m * th) * osc;
        return [val * 0.85, val >= 0 ? 0.5 : -2.3, 0.86];
      }, 52, 52, yaw, pitch, 0.58);
      pin3D(V, 0, 0, (m === 0 ? osc * 0.85 : 0), "R=0 J" + m + "=" + (m === 0 ? osc.toFixed(2) : "0"), yaw, pitch, 0.58, true);
      return [["MODE", "J" + m + "(KR) COS(" + m + "TH)"], ["AMP COS(WT)", osc.toFixed(2)], ["MESH", meshMul().toFixed(1) + "X"]];
    } else {
      // Part 2: 3D Complex Airy Caustic Ai(z)
      const phShift = (t * 0.3) % (Math.PI * 2);
      drawOpenSurface3D(V, (u, v) => {
        const x = u * 1.45, y = v * 1.35;
        const r = Math.hypot(x, y) + 0.15, a = Math.atan2(y, x);
        const z32 = [Math.pow(r, 1.5) * Math.cos(1.5 * a) * (2 / 3), Math.pow(r, 1.5) * Math.sin(1.5 * a) * (2 / 3)];
        const e1 = cExp([-Math.max(-3.2, Math.min(3.2, z32[0])), -z32[1]]);
        const e2 = cExp([Math.max(-3.2, Math.min(3.2, z32[0])), z32[1]]);
        const w = x < 0 ? cAdd(e1, e2) : e1;
        const mag = Math.hypot(w[0], w[1]) / Math.pow(r + 0.35, 0.25);
        return [Math.min(1.05, Math.log(1 + mag) * 0.42) - 0.34, Math.atan2(w[1], w[0]) + phShift, 0.88];
      }, 50, 50, yaw, pitch, 0.58);
      pin3D(V, 0, 0, 0.05, "Z=0 AI=0.355", yaw, pitch, 0.58, true);
      return [["FUNCTION", "AIRY AI(Z)"], ["PHASE", phShift.toFixed(2) + " RAD"], ["MESH", meshMul().toFixed(1) + "X"]];
    }
  }

  // ============================================================================
  // IV. 3D SPHERICAL HARMONICS Y_l^m(theta, phi) (5 parts: Y20 / Y32 / Y42 / Y53 / Y64)
  // ============================================================================
  function drawSphericalHarmonics3D(V, sim, t, dt, part) {
    const p = (part || 0) % 5;
    const modes = [[2, 0], [3, 2], [4, 2], [5, 3], [6, 4]];
    const [l, m] = modes[p];
    const yaw = 0.55 + t * 0.28, pitch = 0.42 + 0.12 * Math.sin(t * 0.36);
    const s = surfScale();
    const Nth = Math.max(12, Math.min(96, Math.round(40 * s))), Nph = Math.max(18, Math.min(140, Math.round(58 * s))), pts = [];
    const lw = meshW(1.15);
    for (let j = 0; j <= Nth; j++) {
      const th = (j / Nth) * Math.PI, c = Math.cos(th), s = Math.sin(th), c2 = c * c, s2 = s * s;
      for (let i = 0; i <= Nph; i++) {
        const ph = (i / Nph) * Math.PI * 2;
        let ylm = 0;
        if (p === 0) ylm = 0.5 * (3 * c2 - 1);
        else if (p === 1) ylm = s2 * c * Math.cos(2 * ph + t * 0.65) * 3.1;
        else if (p === 2) ylm = s2 * (7 * c2 - 1) * Math.cos(2 * ph + t * 0.65) * 1.35;
        else if (p === 3) ylm = s2 * s * (9 * c2 - 1) * Math.cos(3 * ph + t * 0.65) * 1.32;
        else ylm = s2 * s2 * (11 * c2 - 1) * Math.cos(4 * ph + t * 0.65) * 1.48;
        const rad = 0.14 + Math.abs(ylm) * 0.72;
        const q = proj3D(rad * s * Math.cos(ph), rad * s * Math.sin(ph), rad * c, yaw, pitch, 0.78);
        pts.push([q[0], q[1], ylm >= 0 ? 0.52 + 0.25 * c : -2.32 + 0.25 * c, 0.84, q[2]]);
      }
    }
    drawHiddenWireGrid(V, pts, Nph, Nth, lw);
    const phiT = ((t * 0.65) % (Math.PI * 2));
    return [["HARMONIC", "Y(" + l + "," + m + ")"], ["EIGENVAL", "-" + (l * (l + 1))], [m > 0 ? "PHI(T)" : "YAW", (m > 0 ? phiT : yaw).toFixed(2) + " RAD"]];
  }

  // ============================================================================
  // VIII. 3D ELLIPTIC WEIERSTRASS P(z) & MULTI-SHEET RIEMANN SURFACES (2 parts)
  // ============================================================================
  function drawEllipticRiemann3D(V, sim, t, dt, part) {
    const p = (part || 0) % 2;
    const yaw = 0.58 + t * 0.24, pitch = 0.48;
    const deg = ((((CAM.userOrbited ? 0.62 : yaw) + CAM.yaw) * 180 / Math.PI) % 360 + 360) % 360;
    if (p === 0) {
      drawOpenSurface3D(V, (u, v) => {
        const z = [u * Math.PI * 0.62, v * Math.PI * 0.62];
        const s1 = cSin(z), s2 = cSin([-z[1], z[0]]);
        const w = cAdd(cDiv([1, 0], cAdd(cMul(s1, s1), [0.10, 0])), cDiv([1, 0], cAdd(cMul(s2, s2), [0.10, 0])));
        return [Math.min(1.05, Math.log(1 + Math.hypot(w[0], w[1])) * 0.40) - 0.36, Math.atan2(w[1], w[0]), 0.88];
      }, 52, 52, yaw, pitch, 0.58);
      return [["SURFACE", "WEIERSTRASS P(Z)"], ["YAW", deg.toFixed(1) + " DEG"], ["MESH", meshMul().toFixed(1) + "X"]];
    } else {
      const { R } = openBounds(V, pitch, 0.64);
      const rMax = Math.max(5.2, R * 1.15 + Math.hypot(CAM.panU, CAM.panV));
      const s = surfScale();
      const Nr = Math.max(10, Math.min(64, Math.round(28 * s)));
      const Nth = Math.max(28, Math.min(196, Math.round(88 * s)));
      const lw = meshW(1.2), pts = [];
      for (let j = 0; j <= Nr; j++) {
        const r = 0.08 + (j / Nr) * rMax;
        for (let i = 0; i <= Nth; i++) {
          const th = (i / Nth) * Math.PI * 4;
          const wRe = Math.sqrt(r) * Math.cos(th * 0.5), wIm = Math.sqrt(r) * Math.sin(th * 0.5);
          const q = proj3D(r * Math.cos(th), r * Math.sin(th), wRe * 0.58, yaw, pitch, 0.64, true);
          pts.push([q[0], q[1], Math.atan2(wIm, wRe)]);
        }
      }
      for (let j = 0; j <= Nr; j++) {
        for (let i = 0; i <= Nth; i++) {
          const a = pts[j * (Nth + 1) + i];
          if (i < Nth) { const b = pts[j * (Nth + 1) + i + 1]; V.line(a[0], a[1], b[0], b[1], phaseColor(a[2], 0.88), lw); }
          if (j < Nr && i % 2 === 0) { const c = pts[(j + 1) * (Nth + 1) + i]; V.line(a[0], a[1], c[0], c[1], phaseColor(a[2], 0.62), lw * 0.85); }
        }
      }
      return [["SURFACE", "W = SQRT(Z)"], ["YAW", deg.toFixed(1) + " DEG"], ["MESH", meshMul().toFixed(1) + "X"]];
    }
  }

  // ============================================================================
  // VI. 3D MODULAR ETA, JACOBI THETA, EULER BETA & COMPLEX ERF(z) (4 parts)
  // ============================================================================
  function cErf(z) {
    const r = Math.hypot(z[0], z[1]);
    if (r < 3.4) {
      // Exact Maclaurin series: erf(z) = (2/sqrt(pi)) * sum_{k=0}^28 (-1)^k z^{2k+1} / (k! (2k+1))
      const z2 = cMul(z, z);
      let term = [z[0], z[1]], sum = [z[0], z[1]];
      for (let k = 1; k <= 26; k++) {
        term = cMul(term, [-z2[0] / k, -z2[1] / k]);
        const d = 2 * k + 1;
        sum[0] += term[0] / d; sum[1] += term[1] / d;
      }
      const c = 2 / Math.sqrt(Math.PI);
      return [sum[0] * c, sum[1] * c];
    }
    // Asymptotic expansion: sgn(Re z) - exp(-z^2)/(sqrt(pi)*z) * (1 - 1/(2 z^2))
    const z2 = cMul(z, z);
    const ez2 = cExp([-Math.max(-14, Math.min(14, z2[0])), -z2[1]]);
    const inv2z2 = cDiv([0.5, 0], z2);
    const corr = cDiv(cMul(ez2, [1 - inv2z2[0], -inv2z2[1]]), [Math.sqrt(Math.PI) * z[0], Math.sqrt(Math.PI) * z[1]]);
    const sgn = z[0] >= 0 ? 1 : -1;
    return [sgn - corr[0], -corr[1]];
  }

  function drawSpecialZoo3D(V, sim, t, dt, part) {
    const p = (part || 0) % 4;
    const yaw = 0.58 + t * 0.22, pitch = 0.48;
    if (p === 0) {
      // Part 1: Dedekind Eta Modular Form |eta(tau)| on Upper Half-Plane H (weight 1/2)
      const reShift = (t * 0.06) % 1.0;
      drawOpenSurface3D(V, (u, v) => {
        const re = u * 0.48 + reShift;
        const im = 0.055 + 0.13 * Math.exp(Math.max(-2.2, Math.min(1.8, v * 0.48)));
        const qm = Math.exp(-2 * Math.PI * im);
        const qa = 2 * Math.PI * re, cq = Math.cos(qa), sq = Math.sin(qa);
        let eta = [Math.exp(-Math.PI * im / 12) * Math.cos(Math.PI * re / 12), Math.exp(-Math.PI * im / 12) * Math.sin(Math.PI * re / 12)];
        let qnR = qm * cq, qnI = qm * sq;
        for (let n = 1; n <= 20; n++) {
          eta = cMul(eta, [1 - qnR, -qnI]);
          const nr = (qnR * cq - qnI * sq) * qm;
          const ni = (qnR * sq + qnI * cq) * qm;
          qnR = nr; qnI = ni;
        }
        const mag = Math.hypot(eta[0], eta[1]);
        return [Math.min(1.22, Math.log(1 + mag * 2.4) * 0.68) - 0.42, Math.atan2(eta[1], eta[0]) * 2.0, 0.88];
      }, 52, 50, yaw, pitch, 0.58);
      return [["MODULAR", "DEDEKIND ETA(TAU)"], ["RE(TAU)+", reShift.toFixed(3)], ["WEIGHT", "K = 1/2"]];
    } else if (p === 1) {
      // Part 2: Jacobi Elliptic Theta Function |theta_3(z, q)|
      const tauIm = 0.62 + 0.24 * Math.sin(t * 0.55);
      const qBase = Math.exp(-Math.PI * tauIm);
      drawOpenSurface3D(V, (u, v) => {
        const z = [u * Math.PI * 0.52, v * Math.PI * 0.52];
        let re = 1, im = 0;
        for (let n = 1; n <= 7; n++) {
          const qn = Math.pow(qBase, n * n) * 2;
          const cs = cCos([2 * n * z[0], 2 * n * z[1]]);
          re += qn * cs[0]; im += qn * cs[1];
        }
        const mag = Math.hypot(re, im);
        return [Math.min(1.15, Math.log(1 + mag) * 0.44) - 0.34, Math.atan2(im, re), 0.88];
      }, 52, 50, yaw, pitch, 0.58);
      return [["THETA", "JACOBI THETA_3"], ["IM(TAU)", tauIm.toFixed(3)], ["NOME Q", qBase.toFixed(3)]];
    } else if (p === 2) {
      // Part 3: Euler Beta Function |B(z, w)| = |Gamma(z)Gamma(w)/Gamma(z+w)| (Veneziano String Amplitude!)
      const w = [1.45 + 0.35 * Math.cos(t * 0.4), 0.45 * Math.sin(t * 0.4)];
      const gw = cGamma(w);
      drawOpenSurface3D(V, (u, v) => {
        const z = [-0.6 + u * 1.15, v * 1.05];
        const val = cDiv(cMul(cGamma(z), gw), cGamma(cAdd(z, w)));
        return [Math.min(1.22, Math.log(1 + Math.hypot(val[0], val[1])) * 0.46) - 0.36, Math.atan2(val[1], val[0]), 0.88];
      }, 52, 50, yaw, pitch, 0.58);
      return [["AMPLITUDE", "EULER BETA B(Z,W)"], ["W", w[0].toFixed(2) + (w[1] >= 0 ? "+" : "") + w[1].toFixed(2) + "I"], ["MESH", meshMul().toFixed(1) + "X"]];
    } else {
      // Part 4: Complex Error Function |erf(z)| (Stokes Rays at +-45 deg)
      drawOpenSurface3D(V, (u, v) => {
        const z = [u * 1.15, v * 1.15];
        const w = cErf(z);
        return [Math.min(1.20, Math.log(1 + Math.hypot(w[0], w[1])) * 0.46) - 0.36, Math.atan2(w[1], w[0]), 0.88];
      }, 52, 50, yaw, pitch, 0.58);
      return [["FUNCTION", "COMPLEX ERF(Z)"], ["YAW", ((((yaw + CAM.yaw) * 180 / Math.PI) % 360 + 360) % 360).toFixed(1) + " DEG"], ["MESH", meshMul().toFixed(1) + "X"]];
    }
  }

  // ============================================================================
  // IX. 3D MINIMAL & NON-ORIENTABLE SURFACES (3 parts: Enneper / Klein Bottle / Catenoid-Helicoid)
  // ============================================================================
  function drawMinimalSurfaces3D(V, sim, t, dt, part) {
    const p = (part || 0) % 3;
    const yaw = 0.4 + t * 0.30, pitch = 0.42 + 0.12 * Math.sin(t * 0.4);
    const s = surfScale();
    const Nu = Math.max(14, Math.min(108, Math.round(46 * s))), Nv = Math.max(12, Math.min(96, Math.round(40 * s))), pts = [];
    const lw = meshW(1.15);

    if (p === 0) {
      // Part 1: Enneper Minimal Surface (H = 0 everywhere!)
      for (let j = 0; j <= Nv; j++) {
        const v = -1.45 + (2.90 * j) / Nv;
        for (let i = 0; i <= Nu; i++) {
          const u = -1.45 + (2.90 * i) / Nu;
          const x = (u - u * u * u / 3 + u * v * v) * 0.42;
          const y = (v - v * v * v / 3 + v * u * u) * 0.42;
          const z = (u * u - v * v) * 0.34;
          const q = proj3D(x, y, z, yaw, pitch, 0.82);
          pts.push([q[0], q[1], Math.atan2(v, u), 0.84, q[2]]);
        }
      }
    } else if (p === 1) {
      // Part 2: Figure-8 Klein Bottle Immersion (Non-orientable, chi = 0)
      const R = 0.88;
      for (let j = 0; j <= Nv; j++) {
        const v = (j / Nv) * Math.PI * 2;
        for (let i = 0; i <= Nu; i++) {
          const u = (i / Nu) * Math.PI * 2;
          const cu = Math.cos(u * 0.5), su = Math.sin(u * 0.5);
          const s1 = Math.sin(v), s2 = Math.sin(2 * v);
          const rad = R + (cu * s1 - su * s2 * 0.5) * 0.42;
          const x = rad * Math.cos(u), y = rad * Math.sin(u);
          const z = (su * s1 + cu * s2 * 0.5) * 0.52;
          const q = proj3D(x, y, z, yaw, pitch, 0.78);
          pts.push([q[0], q[1], u, 0.84, q[2]]);
        }
      }
    } else {
      // Part 3: Bonnet Isometric Morph Catenoid (a=0) <-> Helicoid (a=pi/2), H = 0 throughout!
      const alpha = (0.5 + 0.5 * Math.sin(t * 0.75 - Math.PI * 0.5)) * (Math.PI * 0.5);
      const ca = Math.cos(alpha), sa = Math.sin(alpha);
      for (let j = 0; j <= Nv; j++) {
        const v = -1.35 + (2.70 * j) / Nv;
        for (let i = 0; i <= Nu; i++) {
          const u = -Math.PI + (2 * Math.PI * i) / Nu;
          const sh = Math.sinh(v), ch = Math.cosh(v);
          const x = (ca * ch * Math.cos(u) + sa * sh * Math.sin(u)) * 0.46;
          const y = (ca * ch * Math.sin(u) - sa * sh * Math.cos(u)) * 0.46;
          const z = (ca * v + sa * u) * 0.36;
          const q = proj3D(x, y, z, yaw, pitch, 0.78);
          pts.push([q[0], q[1], u, 0.84, q[2]]);
        }
      }
    }
    drawHiddenWireGrid(V, pts, Nu, Nv, lw);
    const names = ["ENNEPER H=0", "KLEIN BOTTLE", "CATENOID<->HELICOID"];
    const alphaDeg = ((0.5 + 0.5 * Math.sin(t * 0.75 - Math.PI * 0.5)) * 90).toFixed(1);
    return [["SURFACE", names[p]], p === 2 ? ["BONNET A", alphaDeg + " DEG"] : ["YAW", ((((yaw + CAM.yaw) * 180 / Math.PI) % 360 + 360) % 360).toFixed(1) + " DEG"], ["MESH", meshMul().toFixed(1) + "X"]];
  }

  // ============================================================================
  // VIII. 3D CALABI-YAU MANIFOLDS (5 Canonical Spaces: Quintic / K3 / Sextic / Dwork Conifold / Cubic)
  // ============================================================================
  function drawCalabiYau3D(V, sim, t, dt, part) {
    const p = (part || 0) % 5;
    const cfgs = [
      { n: 5, name: "QUINTIC CY3 (N=5)", chi: "-200", dwork: false, sc: 0.72 },
      { n: 4, name: "K3 SURFACE CY2 (N=4)", chi: "+24", dwork: false, sc: 0.76 },
      { n: 6, name: "SEXTIC CY3 (N=6)", chi: "-204", dwork: false, sc: 0.70 },
      { n: 5, name: "DWORK CONIFOLD CY3", chi: "MIRROR", dwork: true, sc: 0.72 },
      { n: 3, name: "CUBIC TORUS CY1 (N=3)", chi: "0", dwork: false, sc: 0.76 },
    ];
    const cfg = cfgs[p], n = cfg.n;
    const yaw = 0.45 + t * 0.28, pitch = 0.40 + 0.14 * Math.sin(t * 0.32);
    const alpha = 0.65 + 0.55 * Math.sin(t * 0.45); // 4D -> 3D slice angle
    const ca = Math.cos(alpha), sa = Math.sin(alpha);
    const psiMod = cfg.dwork ? 0.58 * (0.5 + 0.5 * Math.sin(t * 0.7)) : 0; // Dwork mirror conifold parameter
    const baseN = n >= 6 ? 5 : n >= 5 ? 6 : 8;
    const Nu = Math.max(3, Math.min(n >= 6 ? 12 : 16, Math.round(baseN * surfScale()))), Nv = Nu;
    const lw = meshW(n >= 6 ? 0.95 : 1.05);
    // Exact complex patches: z1 = e^{2pi i k1/n} cosh(u+iv)^{2/n}, z2 = e^{2pi i k2/n} (-i sinh(u+iv))^{2/n}
    for (let k1 = 0; k1 < n; k1++) {
      const a1 = (2 * Math.PI * k1) / n, e1 = [Math.cos(a1), Math.sin(a1)];
      for (let k2 = 0; k2 < n; k2++) {
        const a2 = (2 * Math.PI * k2) / n, e2 = [Math.cos(a2), Math.sin(a2)];
        const col = phaseColor(a1 + a2 * 0.65 + (cfg.dwork ? psiMod * 1.4 : 0), n >= 6 ? 0.62 : 0.74);
        const pts = [];
        for (let j = 0; j <= Nv; j++) {
          const v = (j / Nv) * (Math.PI * 0.5);
          for (let i = 0; i <= Nu; i++) {
            const u = -0.85 + (1.70 * i) / Nu;
            let z1 = cMul(e1, cPowC(cCosh([u, v]), 2 / n));
            const sh = cSinh([u, v]);
            let z2 = cMul(e2, cPowC([sh[1], -sh[0]], 2 / n)); // -i * sinh(u+iv)
            if (cfg.dwork) {
              // Dwork pencil deformation z1^5 + z2^5 - 5*psi*z1*z2 = 1 pinching the central throat
              const prod = cMul(z1, z2);
              const throat = 1 / (1 + psiMod * Math.hypot(prod[0], prod[1]));
              z1 = [z1[0] * throat + psiMod * 0.28 * prod[0], z1[1] * throat + psiMod * 0.28 * prod[1]];
              z2 = [z2[0] * throat - psiMod * 0.28 * prod[1], z2[1] * throat + psiMod * 0.28 * prod[0]];
            }
            const q = proj3D(z1[0] * cfg.sc, z2[0] * cfg.sc, (ca * z1[1] + sa * z2[1]) * cfg.sc, yaw, pitch, 0.84);
            pts.push(q);
          }
        }
        for (let j = 0; j <= Nv; j++) {
          for (let i = 0; i <= Nu; i++) {
            const a = pts[j * (Nu + 1) + i];
            if (i < Nu) { const b = pts[j * (Nu + 1) + i + 1]; V.line(a[0], a[1], b[0], b[1], col, lw); }
            if (j < Nv) { const c = pts[(j + 1) * (Nu + 1) + i]; V.line(a[0], a[1], c[0], c[1], col, lw); }
          }
        }
      }
    }
    return [["MANIFOLD", cfg.name], cfg.dwork ? ["MODULUS PSI", psiMod.toFixed(3)] : ["SLICE A", (alpha * 180 / Math.PI).toFixed(1) + " DEG"], ["EULER CHI", cfg.chi]];
  }

  // ============================================================================
  // XI. 3D YANG-MILLS INSTANTON & SU(2) HOPF FIBRATION (S^3 -> S^2) (2 parts)
  // ============================================================================
  function drawYangMills3D(V, sim, t, dt, part) {
    const p = (part || 0) % 2;
    const yaw = 0.52 + t * 0.28, pitch = 0.56;

    if (p === 0) {
      // Part 1: BPST SU(2) Yang-Mills Instanton + Anti-Instanton Action Density Tr(F_uv F^uv)
      const rho = 0.58 + 0.16 * Math.sin(t * 0.9);
      const sep = 0.85 * Math.cos(t * 0.45);
      drawOpenSurface3D(V, (u, v) => {
        const r1 = (u - sep) * (u - sep) + v * v + rho * rho;
        const r2 = (u + sep) * (u + sep) + v * v + rho * rho;
        const s1 = Math.pow(rho * rho / r1, 2) * 1.55; // BPST instanton density
        const s2 = Math.pow(rho * rho / r2, 2) * 1.55; // anti-instanton
        const val = s1 + s2;
        return [val * 0.88 - 0.34, s1 > s2 ? 0.55 - val * 0.4 : -2.2 + val * 0.4, 0.88];
      }, 52, 50, yaw, 0.48, 0.62);
      pin3D(V, sep, 0, 1.02, "Q=+1 RHO=" + rho.toFixed(2), yaw, 0.48, 0.62, true);
      pin3D(V, -sep, 0, 1.02, "Q=-1", yaw, 0.48, 0.62, true, COL.cyan);
      return [["GAUGE", "SU(2) BPST"], ["SCALE RHO", rho.toFixed(2)], ["SEP D", sep.toFixed(2)]];
    } else {
      // Part 2: SU(2) = S^3 -> S^2 Hopf Fibration (4D Isoclinic Rotation & Stereographic Projection from btron.pro)
      const s = surfScale();
      const numTori = Math.max(2, Math.min(8, Math.round(4 * s)));
      const fibersPerTorus = Math.max(8, Math.min(64, Math.round(24 * s)));
      const numPts = Math.max(32, Math.min(128, Math.round(64 * Math.sqrt(s))));
      const totalFibers = numTori * fibersPerTorus;
      const hopfScale = 0.56 * CAM.zoom;
      const rotX = (CAM.userOrbited ? 0.30 : 0.30 + 0.16 * Math.sin(t * 0.25)) + CAM.pitch;
      const rotY = (CAM.userOrbited ? 0.0 : t * 0.18) + CAM.yaw;
      const rotZ = CAM.userOrbited ? 0.0 : t * 0.08;
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);
      const psi = t * 0.24, omega = t * 0.16;
      const fiberList = [];

      for (let tr = 0; tr < numTori; tr++) {
        const eta = (Math.PI / 8) + ((tr + 0.5) / numTori) * (Math.PI / 3.4);
        const cosEta = Math.cos(eta), sinEta = Math.sin(eta);
        for (let f = 0; f < fibersPerTorus; f++) {
          const fiberIdx = tr * fibersPerTorus + f;
          const beta = (f * 2 * Math.PI / fibersPerTorus) + omega;
          const pts2d = [];
          let avgZ = 0;
          for (let k = 0; k <= numPts; k++) {
            const xi = (k * 2 * Math.PI) / numPts;
            // 4D Coordinates on S^3
            const x0 = cosEta * Math.cos(xi + beta * 0.5 + psi);
            const x1 = cosEta * Math.sin(xi + beta * 0.5 + psi);
            const x2 = sinEta * Math.cos(xi - beta * 0.5 + psi * 0.8);
            const x3 = sinEta * Math.sin(xi - beta * 0.5 + psi * 0.8);
            // Stereographic projection S^3 -> R^3 from (0,0,0,1)
            const denom = 1.08 - x3;
            const X3d = x0 / denom, Y3d = x1 / denom, Z3d = x2 / denom;
            // 3D Rotation (yaw -> pitch -> roll)
            const xYaw = X3d * cosY + Z3d * sinY, yYaw = Y3d, zYaw = -X3d * sinY + Z3d * cosY;
            const xPitch = xYaw, yPitch = yYaw * cosX - zYaw * sinX, zPitch = yYaw * sinX + zYaw * cosX;
            const xRot = xPitch * cosZ - yPitch * sinZ, yRot = xPitch * sinZ + yPitch * cosZ, zRot = zPitch;
            // Camera perspective
            const camDist = 3.6;
            const pers = camDist / Math.max(0.55, camDist + zRot);
            pts2d.push([xRot * hopfScale * pers + CAM.panX, yRot * hopfScale * pers + CAM.panY]);
            avgZ += zRot;
          }
          avgZ /= (numPts + 1);
          const phase = ((fiberIdx / totalFibers) * Math.PI * 2 + t * 0.42) % (Math.PI * 2);
          fiberList.push({ pts: pts2d, avgZ, phase });
        }
      }
      fiberList.sort((a, b) => a.avgZ - b.avgZ);
      for (let f = 0; f < fiberList.length; f++) {
        const fib = fiberList[f], pts = fib.pts;
        const depthAlpha = Math.max(0.18, Math.min(0.94, 0.44 + fib.avgZ * 0.18));
        const lw = meshW(Math.max(0.95, Math.min(2.2, 1.45 + fib.avgZ * 0.32)));
        const col = phaseColor(fib.phase, depthAlpha);
        for (let i = 1; i < pts.length; i++) V.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], col, lw);
      }
      return [["BUNDLE", "S^1 -> S^3 -> S^2"], ["4D PSI", (psi % (Math.PI * 2)).toFixed(2) + " RAD"], ["FIBERS", totalFibers + " LINKED"]];
    }
  }

  // ============================================================================
  // XII. 3D LIE GROUP SURFACES & SEIFERT-TORUS MANIFOLDS (2 parts: Dupin-Lie / Trefoil Seifert)
  // ============================================================================
  function drawLieSurfaces3D(V, sim, t, dt, part) {
    const p = (part || 0) % 2;
    const yaw = 0.48 + t * 0.30, pitch = 0.42;

    if (p === 0) {
      // Part 1: Dupin Cyclide / SO(3) Maximal Torus & Lie Geodesic Flow
      const a = 1.05, b = 0.96, c = Math.sqrt(a * a - b * b), d = 0.52 + 0.16 * Math.sin(t * 0.65);
      const s = surfScale();
      const Nu = Math.max(14, Math.min(112, Math.round(48 * s))), Nv = Math.max(10, Math.min(76, Math.round(32 * s))), pts = [];
      const lw = meshW(1.15);
      for (let j = 0; j <= Nv; j++) {
        const v = (j / Nv) * Math.PI * 2;
        for (let i = 0; i <= Nu; i++) {
          const u = (i / Nu) * Math.PI * 2;
          const denom = a - c * Math.cos(u) * Math.cos(v);
          const x = (d * (c - a * Math.cos(u) * Math.cos(v)) + b * b * Math.cos(u)) / denom;
          const y = (b * Math.sin(u) * (a - d * Math.cos(v))) / denom;
          const z = (b * Math.sin(v) * (c * Math.cos(u) - d)) / denom;
          const q = proj3D(x * 0.68, y * 0.68, z * 0.68, yaw, pitch, 0.82);
          pts.push([q[0], q[1], u + v, 0.82, q[2]]);
        }
      }
      drawHiddenWireGrid(V, pts, Nu, Nv, lw);
      return [["MANIFOLD", "DUPIN CYCLIDE"], ["INVERSION D", d.toFixed(3)], ["MESH", meshMul().toFixed(1) + "X"]];
    } else {
      // Part 2: (2,3) Trefoil Lie Knot & Twisted Seifert Ribbon in SU(2) = S^3
      const s = surfScale();
      const N = Math.max(64, Math.min(320, Math.round(140 * s))), Nr = Math.max(4, Math.min(20, Math.round(9 * s)));
      const lw = meshW(1.15);
      for (let rI = 0; rI <= Nr; rI++) {
        const w = -0.22 + (0.44 * rI) / Nr;
        const isEdge = rI === 0 || rI === Nr;
        let px = 0, py = 0;
        for (let i = 0; i <= N; i++) {
          const u = (i / N) * Math.PI * 2;
          const R = 0.72 + 0.30 * Math.cos(3 * u);
          const kx = R * Math.cos(2 * u), ky = R * Math.sin(2 * u), kz = 0.34 * Math.sin(3 * u);
          // Normal ribbon offset twisted by 3/2 turns (Seifert surface)
          const nx = Math.cos(2 * u) * Math.cos(1.5 * u), ny = Math.sin(2 * u) * Math.cos(1.5 * u), nz = Math.sin(1.5 * u);
          const q = proj3D((kx + w * nx) * 1.06, (ky + w * ny) * 1.06, (kz + w * nz) * 1.06, yaw, pitch, 0.88);
          if (i > 0) V.line(px, py, q[0], q[1], isEdge ? COL.amber : phaseColor(u * 2, 0.65), isEdge ? 2.3 : lw);
          px = q[0]; py = q[1];
        }
      }
      return [["KNOT", "(2,3) TREFOIL IN SU(2)"], ["YAW", ((((yaw + CAM.yaw) * 180 / Math.PI) % 360 + 360) % 360).toFixed(1) + " DEG"], ["MESH", meshMul().toFixed(1) + "X"]];
    }
  }

  // ============================================================================
  // XI. 3D COMPLEX ANALYSIS: TAYLOR CONVERGENCE, LAURENT RESIDUES, ESSENTIAL e^(1/z), LOG(z) (4 parts)
  // ============================================================================
  function drawComplexAnalysis3D(V, sim, t, dt, part) {
    const p = (part || 0) % 4;
    const yaw = 0.62 + t * 0.22, pitch = 0.48;

    if (p === 0) {
      // Part 1: 3D Complex Taylor Series S_N(z) = sum_{n=0}^N (-1)^n z^(2n) -> 1/(1+z^2)
      // Convergence circle |z| = 1 embedded directly into bright yellow mesh-line read stripes with full HLR!
      const Nterms = 2 + Math.floor((t * 1.4) % 11);
      const rC = 1 / 0.72;
      drawOpenSurface3D(V, (u, v) => {
        const z = [u * 0.72, v * 0.72];
        const z2 = cMul(z, z);
        let sR = 1, sI = 0, pR = 1, pI = 0;
        for (let n = 1; n < Nterms; n++) {
          const nr = pR * z2[0] - pI * z2[1], ni = pR * z2[1] + pI * z2[0];
          pR = -nr; pI = -ni;
          if (Math.hypot(pR, pI) > 1e5) { sR = pR; sI = pI; break; }
          sR += pR; sI += pI;
        }
        const mag = Math.hypot(sR, sI);
        return [Math.min(1.25, Math.log(1 + mag) * 0.42) - 0.36, Math.atan2(sI, sR), 0.88];
      }, 52, 52, yaw, pitch, 0.58, null, (u, v) => Math.hypot(u, v) - rC);
      pin3D(V, 0, rC, 0.55, "Z=+I", yaw, pitch, 0.58, true);
      pin3D(V, 0, -rC, 0.55, "Z=-I", yaw, pitch, 0.58, true);
      pin3D(V, rC, 0, 0.12, "|Z|=1", yaw, pitch, 0.58, true);
      return [["TAYLOR N", String(Nterms)], ["RADIUS R", "1.00 (POLES +-I)"], ["MESH", meshMul().toFixed(1) + "X"]];
    } else if (p === 1) {
      // Part 2: 3D Laurent Series & Cauchy Residues: f(z) = 1/(z-z1) - 2/(z-z2) + 1/(z-z3)^2
      const z1 = [-1.15, 0.45], z2 = [1.05, -0.35], z3 = [0.05, 1.05];
      const cx = -1.1 + 2.2 * (0.5 + 0.5 * Math.sin(t * 0.52)), cy = 0.25 * Math.cos(t * 0.38), Rc = 1.05;
      const in1 = Math.hypot(z1[0] - cx, z1[1] - cy) < Rc;
      const in2 = Math.hypot(z2[0] - cx, z2[1] - cy) < Rc;
      const in3 = Math.hypot(z3[0] - cx, z3[1] - cy) < Rc;
      const resSum = (in1 ? 1 : 0) + (in2 ? -2 : 0); // double pole z3 has residue 0!
      // Cauchy contour gamma(t) embedded directly into bright yellow mesh-line read stripes on the 3D relief!
      drawOpenSurface3D(V, (u, v) => {
        const d1 = [u - z1[0], v - z1[1]], d2 = [u - z2[0], v - z2[1]], d3 = [u - z3[0], v - z3[1]];
        const t1 = cDiv([1, 0], d1);
        const t2 = cDiv([-2, 0], d2);
        const t3 = cDiv([0.65, 0], cMul(d3, d3)); // 2nd-order pole: 4pi phase winding, Res = 0!
        const w = [t1[0] + t2[0] + t3[0], t1[1] + t2[1] + t3[1]];
        return [Math.min(1.30, Math.log(1 + Math.hypot(w[0], w[1])) * 0.46) - 0.36, Math.atan2(w[1], w[0]), 0.88];
      }, 52, 52, yaw, pitch, 0.58, null, (u, v) => {
        const du = u - cx, dv = v - cy, a = Math.atan2(dv, du);
        return Math.hypot(du, dv) - Rc * (1 + 0.08 * Math.sin(3 * a + t));
      });
      pin3D(V, z1[0], z1[1], 0.92, "RES=+1", yaw, pitch, 0.58, true);
      pin3D(V, z2[0], z2[1], 0.92, "RES=-2", yaw, pitch, 0.58, true);
      pin3D(V, z3[0], z3[1], 0.92, "POLE^2 (0)", yaw, pitch, 0.58, true, COL.cyan);
      return [["SUM RES", String(resSum)], ["INTEGRAL", (resSum * 2) + "*PI*I"], ["CENTER", "(" + cx.toFixed(2) + "," + cy.toFixed(2) + ")"]];
    } else if (p === 2) {
      // Part 3: 3D Essential Singularity |exp(1/z)| (Casorati-Weierstrass / Great Picard Theorem!)
      const rot = (t * 0.35) % (Math.PI * 2);
      drawOpenSurface3D(V, (u, v) => {
        const zr = u * 0.65, zi = v * 0.65;
        const d = zr * zr + zi * zi + 0.018;
        const inv = [zr / d, -zi / d];
        const e = cExp([Math.max(-6.5, Math.min(6.5, inv[0])), inv[1] + rot]);
        return [Math.min(1.28, Math.log(1 + Math.hypot(e[0], e[1])) * 0.36) - 0.36, Math.atan2(e[1], e[0]), 0.88];
      }, 54, 54, yaw, pitch, 0.58);
      pin3D(V, 0, 0, 0.92, "Z=0 ESS", yaw, pitch, 0.58, true);
      return [["SINGULARITY", "ESSENTIAL E^(1/Z)"], ["PHASE", rot.toFixed(2) + " RAD"], ["MESH", meshMul().toFixed(1) + "X"]];
    } else {
      // Part 4: 3D Multi-Sheeted Complex Logarithm Helico-Riemann Surface w = log(z)
      const s = surfScale();
      const Nr = Math.max(10, Math.min(56, Math.round(24 * s)));
      const Nth = Math.max(32, Math.min(196, Math.round(84 * s)));
      const lw = meshW(1.15), pts = [];
      for (let j = 0; j <= Nr; j++) {
        const r = 0.14 + (j / Nr) * 1.55;
        for (let i = 0; i <= Nth; i++) {
          const th = -Math.PI * 2.5 + (i / Nth) * Math.PI * 5.0; // 2.5 full Riemann sheets!
          const x = r * Math.cos(th), y = r * Math.sin(th), z = th * 0.16;
          const q = proj3D(x, y, z, yaw, 0.44, 0.72);
          pts.push([q[0], q[1], th, 0.86, q[2]]);
        }
      }
      drawHiddenWireGrid(V, pts, Nth, Nr, lw);
      return [["SURFACE", "RIEMANN LOG(Z)"], ["YAW", ((((yaw + CAM.yaw) * 180 / Math.PI) % 360 + 360) % 360).toFixed(1) + " DEG"], ["MESH", meshMul().toFixed(1) + "X"]];
    }
  }

  // ============================================================================
  // XII. 3D CONFORMAL MAPS, BLASCHKE PRODUCTS & RIEMANN SPHERE C-HAT (3 parts)
  // ============================================================================
  function drawConformalRiemann3D(V, sim, t, dt, part) {
    const p = (part || 0) % 3;
    const yaw = 0.56 + t * 0.24, pitch = 0.48;

    if (p === 0) {
      // Part 1: 3D Complex Joukowski Map |w(z)| = |z + a^2/z| (Conformal Pole at 0 + Zeros at +-i)
      const a2 = 0.85 + 0.35 * Math.sin(t * 0.6);
      drawOpenSurface3D(V, (u, v) => {
        const z = [u * 0.75, v * 0.75];
        const inv = cDiv([a2, 0], z);
        const w = [z[0] + inv[0], z[1] + inv[1]];
        return [Math.min(1.25, Math.log(1 + Math.hypot(w[0], w[1])) * 0.52) - 0.38, Math.atan2(w[1], w[0]), 0.88];
      }, 52, 52, yaw, pitch, 0.58);
      return [["CONFORMAL", "W = Z + A^2 / Z"], ["PARAM A^2", a2.toFixed(3)], ["MESH", meshMul().toFixed(1) + "X"]];
    } else if (p === 1) {
      // Part 2: 3D Blaschke Product B(z) = prod_{k=1}^5 (z - a_k) / (1 - conj(a_k)*z)
      // 5 zeros inside |z|<1 mirrored to 5 poles outside |z|>1, with |B(z)| = 1 on the unit circle!
      const roots = [];
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2 + t * 0.32;
        const rad = 0.56 + 0.14 * Math.sin(t * 0.7 + k * 1.3);
        roots.push([rad * Math.cos(ang), rad * Math.sin(ang)]);
      }
      drawOpenSurface3D(V, (u, v) => {
        const z = [u * 0.75, v * 0.75];
        let w = [1, 0];
        for (let k = 0; k < 5; k++) {
          const ak = roots[k];
          const num = [z[0] - ak[0], z[1] - ak[1]];
          const akz = [ak[0] * z[0] + ak[1] * z[1], ak[0] * z[1] - ak[1] * z[0]]; // conj(ak) * z
          const den = [1 - akz[0], -akz[1]];
          w = cMul(w, cDiv(num, den));
        }
        return [Math.min(1.28, Math.log(1 + Math.hypot(w[0], w[1])) * 0.44) - 0.36, Math.atan2(w[1], w[0]), 0.88];
      }, 52, 52, yaw, pitch, 0.58, null, (u, v) => Math.hypot(u, v) - (1 / 0.75));
      return [["FUNCTION", "BLASCHKE B5(Z)"], ["ROOT R", (0.56 + 0.14 * Math.sin(t * 0.7)).toFixed(2)], ["ORBIT", ((t * 0.32) % (Math.PI * 2)).toFixed(2) + " RAD"]];
    } else {
      // Part 3: 3D Riemann Sphere C-hat = C U {infty} under PSL(2,C) Mobius Flow
      const s = surfScale();
      const Nth = Math.max(14, Math.min(96, Math.round(40 * s))), Nph = Math.max(20, Math.min(140, Math.round(60 * s)));
      const lw = meshW(1.15), pts = [];
      const shift = [0.45 * Math.cos(t * 0.5), 0.45 * Math.sin(t * 0.5)];
      for (let j = 0; j <= Nth; j++) {
        const th = 0.04 + (j / Nth) * (Math.PI - 0.08), s = Math.sin(th), c = Math.cos(th);
        for (let i = 0; i <= Nph; i++) {
          const ph = (i / Nph) * Math.PI * 2;
          const sx = s * Math.cos(ph), sy = s * Math.sin(ph), sz = c;
          // Stereographic projection S^2 -> C: z = (sx + i*sy) / (1 - sz)
          const den = Math.max(0.08, 1 - sz);
          const z = [sx / den, sy / den];
          // Mobius-shifted cubic rational map f(z) = ((z-a)^3 - 1) / ((z-a)^3 + 1)
          const zm = [z[0] - shift[0], z[1] - shift[1]];
          const z3 = cMul(cMul(zm, zm), zm);
          const fz = cDiv([z3[0] - 1, z3[1]], [z3[0] + 1, z3[1]]);
          const bump = 0.86 + 0.16 * Math.tanh(Math.log(1 + Math.hypot(fz[0], fz[1])) - 0.5);
          const q = proj3D(sx * bump, sy * bump, sz * bump, yaw, 0.36, 0.92);
          pts.push([q[0], q[1], Math.atan2(fz[1], fz[0]), 0.88, q[2]]);
        }
      }
      drawHiddenWireGrid(V, pts, Nph, Nth, lw);
      return [["MANIFOLD", "RIEMANN SPHERE S^2"], ["MOBIUS A", shift[0].toFixed(2) + (shift[1] >= 0 ? "+" : "") + shift[1].toFixed(2) + "I"], ["MESH", meshMul().toFixed(1) + "X"]];
    }
  }

  // ============================================================================
  // XIII. 3D COMPLEX LOGARITHMS & GENERALIZED LOGARITHMS WITH VIEWPORT PATH OBSERVER (4 parts)
  // ============================================================================
  function cLambertW0(z) {
    // Complex Halley's method for principal branch Lambert W0(z) (W * exp(W) = z, branch point at -1/e)
    const r = Math.hypot(z[0], z[1]);
    let w = r < 0.35 ? [z[0], z[1]] : [Math.log(1 + r), Math.atan2(z[1], z[0]) * 0.65];
    for (let it = 0; it < 5; it++) {
      const ew = cExp(w), wew = cMul(w, ew);
      const f = [wew[0] - z[0], wew[1] - z[1]];
      const wp1 = [w[0] + 1, w[1]];
      const wp2 = [w[0] + 2, w[1]];
      const d1 = cMul(ew, wp1);
      const denom = [d1[0] - cDiv(cMul(wp2, f), [2 * wp1[0], 2 * wp1[1]])[0], d1[1] - cDiv(cMul(wp2, f), [2 * wp1[0], 2 * wp1[1]])[1]];
      const step = cDiv(f, denom);
      w = [w[0] - step[0], w[1] - step[1]];
    }
    return w;
  }

  function drawLogarithms3D(V, sim, t, dt, part) {
    const p = (part || 0) % 4;
    // Gentle cinematic viewport path observation (paused automatically if user drags camera)
    const yaw = 0.55 + t * 0.24, pitch = 0.44 + 0.08 * Math.sin(t * 0.32);

    if (p === 0) {
      // Part 1: 3-Sheeted Complex Logarithm w = ln(z) with Climbing 3D Path Observer
      const s = surfScale();
      const Nr = Math.max(12, Math.min(60, Math.round(26 * s)));
      const Nth = Math.max(40, Math.min(210, Math.round(96 * s)));
      const lw = meshW(1.12), pts = [];
      for (let j = 0; j <= Nr; j++) {
        const r = 0.16 + (j / Nr) * 1.65;
        for (let i = 0; i <= Nth; i++) {
          const th = -Math.PI * 3 + (i / Nth) * Math.PI * 6; // 3 full sheets: [-3pi, +3pi]
          const q = proj3D(r * Math.cos(th), r * Math.sin(th), th * 0.145, yaw, pitch, 0.70);
          pts.push([q[0], q[1], th, 0.86, q[2]]);
        }
      }
      drawHiddenWireGrid(V, pts, Nth, Nr, lw);
      // Glowing 3D Path Observer climbing the helicoidal Riemann sheets!
      const rObs = 1.05, thMax = -Math.PI * 2.7 + ((t * 1.35) % (Math.PI * 5.4));
      let px = 0, py = 0;
      for (let k = 0; k <= 80; k++) {
        const tk = -Math.PI * 2.7 + (k / 80) * (thMax + Math.PI * 2.7);
        const q = proj3D(rObs * Math.cos(tk), rObs * Math.sin(tk), tk * 0.145 + 0.03, yaw, pitch, 0.70);
        if (k > 0) {
          V.line(px, py, q[0], q[1], COL_STRIPE_YEL, 3.0);
          V.line(px, py, q[0], q[1], COL_STRIPE_HOT, 1.3);
        }
        px = q[0]; py = q[1];
      }
      return [["LOGARITHM", "LN(Z) = LN|Z| + I*TH"], ["PATH TH", thMax.toFixed(2) + " RAD"], ["SHEET K", String(Math.round(thMax / (Math.PI * 2)))]];
    } else if (p === 1) {
      // Part 2: Generalized q-Logarithm (Tsallis Non-Extensive): ln_q(z) = (z^(1-q) - 1) / (1 - q)
      const qVal = 1.05 + 0.78 * Math.sin(t * 0.55); // sweeps smoothly across classical Boltzmann limit q = 1!
      const eps = 1 - qVal;
      const rC = 1 / 0.75;
      drawOpenSurface3D(V, (u, v) => {
        const zr = u * 0.75, zi = v * 0.75;
        const r = Math.hypot(zr, zi) + 1e-4, th = Math.atan2(zi, zr);
        let w;
        if (Math.abs(eps) < 0.02) {
          w = [Math.log(r), th];
        } else {
          // z^(1-q) = exp((1-q)*(ln r + i*th))
          const zp = cExp([Math.max(-6, Math.min(6, eps * Math.log(r))), eps * th]);
          w = [(zp[0] - 1) / eps, zp[1] / eps];
        }
        return [Math.min(1.25, Math.log(1 + Math.hypot(w[0], w[1])) * 0.44) - 0.36, Math.atan2(w[1], w[0]), 0.88];
      }, 52, 52, yaw, 0.48, 0.58, null, (u, v) => Math.hypot(u, v) - rC);
      pin3D(V, 0, 0, 0.55, "Z=0", yaw, 0.48, 0.58, true);
      pin3D(V, rC, 0, -0.34, "Z=1 (LN_Q=0)", yaw, 0.48, 0.58, true);
      return [["TSALLIS", "LN_Q(Z)"], ["PARAM Q", qVal.toFixed(3)], ["LIMIT", Math.abs(eps) < 0.08 ? "Q=1 SHANNON" : "NON-EXTENSIVE"]];
    } else if (p === 2) {
      // Part 3: Complex Polylogarithm Li_s(z) = sum_{n=1}^22 z^n / n^s (Dilogarithm s=2, Trilogarithm s=3)
      const sOrd = 2.0 + 0.85 * Math.sin(t * 0.48);
      const rC = 1 / 0.75;
      drawOpenSurface3D(V, (u, v) => {
        const z = [u * 0.75, v * 0.75];
        const r = Math.hypot(z[0], z[1]);
        let sr = 0, si = 0, pr = 1, pi = 0;
        const scale = r > 1.05 ? 1.02 / r : 1.0; // smooth analytic damping outside branch cut [1, inf)
        const zs = [z[0] * scale, z[1] * scale];
        for (let n = 1; n <= 20; n++) {
          const nr = pr * zs[0] - pi * zs[1], ni = pr * zs[1] + pi * zs[0];
          pr = nr; pi = ni;
          const w = Math.pow(n, -sOrd);
          sr += pr * w; si += pi * w;
        }
        const boost = r > 1.05 ? Math.log(r) * 0.75 : 0;
        return [Math.min(1.25, Math.log(1 + Math.hypot(sr, si)) * 0.52 + boost) - 0.36, Math.atan2(si, sr), 0.88];
      }, 52, 52, yaw, 0.48, 0.58, null, (u, v) => Math.hypot(u, v) - rC);
      // Live 3D Path Observer orbiting branch point z = 1
      const aObs = t * 1.1;
      const uO = rC + 0.55 * Math.cos(aObs), vO = 0.55 * Math.sin(aObs);
      pin3D(V, rC, 0, 0.35, "Z=1 BRANCH", yaw, 0.48, 0.58, true);
      pin3D(V, uO, vO, 0.18, "OBS", yaw, 0.48, 0.58, true, COL.cyan);
      return [["POLYLOG", "LI_S(Z)"], ["ORDER S", sOrd.toFixed(2)], ["AT Z=1", "ZETA(S)"]];
    } else {
      // Part 4: Complex Lambert W(z) (Product Logarithm: W(z) * exp(W(z)) = z, branch point at -1/e)
      const uBranch = -1 / (Math.E * 0.72);
      const rObs = 0.75, aObs = t * 0.9;
      drawOpenSurface3D(V, (u, v) => {
        const w = cLambertW0([u * 0.72, v * 0.72]);
        return [Math.min(1.22, Math.log(1 + Math.hypot(w[0], w[1])) * 0.54) - 0.36, Math.atan2(w[1], w[0]), 0.88];
      }, 52, 52, yaw, 0.48, 0.58, null, (u, v) => Math.hypot(u - uBranch, v) - rObs);
      pin3D(V, uBranch, 0, 0.05, "Z=-1/E (W=-1)", yaw, 0.48, 0.58, true);
      pin3D(V, 0, 0, -0.34, "Z=0 (W=0)", yaw, 0.48, 0.58, true, COL.cyan);
      pin3D(V, uBranch + rObs * Math.cos(aObs), rObs * Math.sin(aObs), 0.18, "W(Z)", yaw, 0.48, 0.58, true);
      return [["PRODUCT LOG", "LAMBERT W0(Z)"], ["BRANCH", "Z = -1/E"], ["OBS ANG", (aObs % (Math.PI * 2)).toFixed(2)]];
    }
  }

  function drawComplexAnalysisWith2D(V, sim, t, dt, part) {
    const p = (part || 0) % 6;
    if (p < 4) return drawComplexAnalysis3D(V, sim, t, dt, p);
    return drawCSeries2D(V, sim, t, dt, p - 4);
  }
  function drawConformalWith2D(V, sim, t, dt, part) {
    const p = (part || 0) % 4;
    if (p < 3) return drawConformalRiemann3D(V, sim, t, dt, p);
    return drawCSeries2D(V, sim, t, dt, 2);
  }
  function drawLogarithmsWithSqrt3D(V, sim, t, dt, part) {
    const p = (part || 0) % 6;
    if (p < 4) return drawLogarithms3D(V, sim, t, dt, p);
    if (p === 4) return drawEllipticRiemann3D(V, sim, t, dt, 1);
    return drawLogarithms2D(V, sim, t);
  }

  // ============================================================================
  // CATALOGUE — JAHNKE–EMDE–LÖSCH SPECIAL FUNCTIONS (I–XIV) & PURE MATH (XV–XXI)
  // ============================================================================
  const CAT_DEFS = [
    { id: "I. ELEMENTARY & COMPLEX TRANSCENDENTALS", short: "I. TRIG & HYP" },
    { id: "II. GAMMA, INTEGRAL & ZETA FUNCTIONS", short: "II. GAMMA · INT · ZETA" },
    { id: "III. ELLIPTIC INTEGRALS & FUNCTIONS", short: "III. ELLIPTIC" },
    { id: "IV. ORTHOGONAL POLYNOMIALS & SPHERICAL", short: "IV. POLY & SPHERICAL" },
    { id: "V. BESSEL, MATHIEU, CONFLUENT & PHYSICS", short: "V. BESSEL · MATHIEU · PHYS" },
    { id: "VI. COMPLEX ANALYSIS & RIEMANN SURFACES", short: "VI. COMPLEX ANALYSIS" },
    { id: "VII. TOPOLOGICAL, CALABI–YAU, YM & LIE", short: "VII. TOPOLOGY · CY · LIE" },
  ];
  const CATS = CAT_DEFS.map((c) => c.id);

  const STATIONS = [
    // ── CATEGORY I: ELEMENTARY & COMPLEX TRANSCENDENTALS (1–3) ────────────────
    {
      roman: "I", cat: CATS[0], disc: "TRIGONOMETRIC FUNCTIONS", badge: "3D + 2D · 3P", parts: 3,
      title: "Trigonometric Functions: Circular Waves & Inverse Branches",
      sub: "3D panoramic trigonometric relief plus 2D circular & inverse trigonometric map studies (↑/↓ or 1–3).",
      formula: "sin²x + cos²x = 1      tan x = sin x / cos x      arcsin x + arccos x = π/2",
      note: "Press ↓ or keys 1–3 to switch between 3D Relief, 2D Circular Curves, and 2D Inverse Branches.",
      partMeta: [
        { tag: "3D Wave Relief", title: "3D Panoramic Trigonometric Relief sin(x+t) cos(y)", sub: "Unbounded 3D harmonic wave relief with glowing nodal zero contours and peak elevation pins.", formula: "z(x, y) = sin(x + t) cos(y) + 0.18 sin(2x − y)", note: "Part 1/3 (3D) — Press ↓ for 2D Circular Functions Study." },
        { tag: "2D Circular", is2d: true, title: "2D Circular Map Study: sin, cos, tan & sec(x)", sub: "Full 2π periodic family showing vertical asymptotes at (n + 1/2)π and live phase cursor.", formula: "sec x = 1 / cos x      tan(x + π) = tan x", note: "Part 2/3 (2D) — Press ↓ for 2D Inverse Trigonometric Branches." },
        { tag: "2D Inverses", is2d: true, title: "2D Inverse Trigonometric Study: arcsin, arccos, arctan, arccot", sub: "Principal branches on [−1, 1] and (−∞, ∞) with ±π/2 horizontal asymptotes.", formula: "arcsin x + arccos x = π/2      arctan x + arccot x = π/2", note: "Part 3/3 (2D) — Principal branch geometry of inverse circular functions." },
      ],
      draw: drawTrigSection,
    },
    {
      roman: "II", cat: CATS[0], disc: "HYPERBOLIC FUNCTIONS", badge: "3D + 2D · 3P", parts: 3,
      title: "Hyperbolic Functions: Catenary, Inverses & Gudermannian",
      sub: "3D hyperbolic saddle/sech relief plus 2D catenary, inverse hyperbolic, and Gudermannian studies (↑/↓ or 1–3).",
      formula: "cosh²x − sinh²x = 1      gd(x) = 2 arctan(eˣ) − π/2",
      note: "Press ↓ or keys 1–3 to switch between 3D Relief, 2D Hyperbolic Family, and 2D Gudermannian Bridge.",
      partMeta: [
        { tag: "3D Saddle", title: "3D Panoramic Hyperbolic Saddle & Sech(r) Relief", sub: "3D hyperbolic curvature landscape with embedded hyperbola contour u² − v² = const.", formula: "sinh x = (eˣ − e⁻ˣ)/2      cosh x = (eˣ + e⁻ˣ)/2", note: "Part 1/3 (3D) — Press ↓ for 2D Catenary & Hyperbolic Curves." },
        { tag: "2D Catenary", is2d: true, title: "2D Hyperbolic Study: cosh (Catenary), sinh, tanh & sech", sub: "Hanging-chain catenary cosh(x), odd sinh(x), logistic tanh(x) → ±1, and soliton sech(x).", formula: "cosh²x − sinh²x = 1      sech²x + tanh²x = 1", note: "Part 2/3 (2D) — Press ↓ for Inverse Hyperbolic & Gudermannian gd(x)." },
        { tag: "2D Inv & gd(x)", is2d: true, title: "2D Inverse Hyperbolic & Gudermannian Bridge gd(x)", sub: "arsinh, arcosh, artanh alongside the Gudermannian gd(x) connecting hyperbolic & circular geometry.", formula: "tan(gd(x)) = sinh(x)      sin(gd(x)) = tanh(x)", note: "Part 3/3 (2D) — Mercator projection latitude = Gudermannian of map y-coordinate." },
      ],
      draw: drawHyperbolicSection,
    },
    {
      roman: "III", cat: CATS[0], disc: "COMPLEX TRIG & HYPERBOLIC", badge: "3D + 2D · 4P", parts: 4,
      title: "Complex Trigonometric & Hyperbolic Reliefs (sin z, tan z, cosh z)",
      sub: "Unbounded 3D complex reliefs of |sin z|, |tan z|, |cosh z| and 2D Jahnke–Emde Höhenkarte conformal net (↑/↓ or 1–4).",
      formula: "sin(iz) = i sinh(z)      cos(iz) = cosh(z)      tan(z + π) = tan(z)",
      note: "Press ↓ or keys 1–4 for |sin z|, |tan z|, |cosh z|, and 2D Altitude/Phase Map (Höhenkarte).",
      partMeta: [
        { tag: "3D |sin(z)|", title: "3D Complex Sine Relief |sin(z)|", sub: "Periodic zeros along the real axis at z = nπ rising into exponential cosh(y) walls along Im(z).", formula: "|sin(x + iy)|² = sin²x + sinh²y", note: "Part 1/4 (3D) — Press ↓ for the infinite pole picket-fence of |tan(z)|." },
        { tag: "3D |tan(z)|", title: "3D Complex Tangent Relief |tan(z)| (Simple Poles)", sub: "Alternating zeros at nπ and simple poles at (n + 1/2)π flattening smoothly to ±i as Im(z) → ±∞.", formula: "tan(z) = sin(z) / cos(z)      Res(π/2) = −1", note: "Part 2/4 (3D) — Press ↓ for 90°-rotated Complex Hyperbolic |cosh(z)|." },
        { tag: "3D |cosh(z)|", title: "3D Complex Hyperbolic Cosine Relief |cosh(z)|", sub: "Exact 90° complex rotation of cos(z): periodic zeros at i(n + 1/2)π and exponential walls in Re(z).", formula: "cosh(z) = cos(iz)      |cosh(x+iy)|² = sinh²x + cos²y", note: "Part 3/4 (3D) — Press ↓ for the 2D Jahnke–Emde Höhenkarte Conformal Net." },
        { tag: "2D Höhenkarte", is2d: true, title: "2D Altitude & Phase Map (Höhenkarte) of w = sin(z)", sub: "Orthogonal constant-modulus |sin z| = R and constant-phase arg(sin z) = φ conformal curves.", formula: "sin²x + sinh²y = R²      tanh y = tan φ · tan x", note: "Part 4/4 (2D) — Classic Jahnke–Emde conformal altitude chart." },
      ],
      draw: drawComplexTrigHypSection,
    },

    // ── CATEGORY II: GAMMA, INTEGRAL & ZETA FUNCTIONS (4–6, J-E-L Ch. I–IV) ──
    {
      roman: "IV", cat: CATS[1], disc: "GAMMA · DIGAMMA · BETA (CH. I)", badge: "3D + 2D · 6P", parts: 6,
      title: "Gamma Γ(z), Reciprocal 1/Γ(z), Digamma ψ(z) & Euler Beta B(z,w)",
      sub: "Jahnke–Emde–Lösch Ch. I: 3D reliefs of Γ, 1/Γ, ψ, Beta + 2D real/incomplete γ(a,x) & Fig. 3 Höhenkarte (↑/↓ or 1–6).",
      formula: "Γ(z) Γ(1−z) = π / sin(πz)      ψ(z) = Γ'(z)/Γ(z)      B(z,w) = Γ(z)Γ(w)/Γ(z+w)",
      note: "Press ↓ or keys 1–6 for |Γ|, |1/Γ|, |ψ|, |B(z,w)|, 2D Real/Incomplete, and Fig. 3 1/Γ Höhenkarte.",
      partMeta: [
        { tag: "3D |Γ(z)|", title: "3D Complex Gamma Relief |Γ(z)| (J-E-L Fig. 1)", sub: "Lanczos continuation showing simple poles at z = 0, −1, −2, −3 with residues (−1)ⁿ/n!.", formula: "Γ(z) = ∫₀^∞ t^(z−1) e^(−t) dt      Γ(n + 1) = n!", note: "Part 1/6 (3D) — Press ↓ for the entire reciprocal |1/Γ(z)| (Fig. 2)." },
        { tag: "3D |1/Γ(z)|", title: "3D Entire Reciprocal Gamma |1 / Γ(z)| (J-E-L Fig. 2)", sub: "Inverting Γ(z) removes all poles and creates smooth simple zeros at z = 0, −1, −2, −3.", formula: "1 / Γ(z) = z e^(γz) Π (1 + z/n) e^(−z/n)", note: "Part 2/6 (3D) — Press ↓ for the Logarithmic Derivative Digamma |ψ(z)|." },
        { tag: "3D |ψ(z)|", title: "3D Digamma Function |ψ(z)| = |Γ'(z)/Γ(z)| (Ch. I.B)", sub: "Meromorphic logarithmic derivative with simple poles at z = 0, −1, −2... and zero at x = 1.4616.", formula: "ψ(z + 1) = ψ(z) + 1/z      ψ(1) = −γ = −0.5772", note: "Part 3/6 (3D) — Press ↓ for Euler Beta / Veneziano Amplitude |B(z, w)|." },
        { tag: "3D |B(z,w)|", title: "3D Euler Beta Function |B(z, w)| (Ch. I.A.4)", sub: "Euler's integral of the 1st kind & Veneziano dual-resonance amplitude with poles at z = 0, −1, −2...", formula: "B(z, w) = ∫₀¹ t^(z−1)(1−t)^(w−1) dt = Γ(z)Γ(w)/Γ(z+w)", note: "Part 4/6 (3D) — Press ↓ for 2D Real Γ(x), 1/Γ(x), ψ(x) & Incomplete γ(a,x)." },
        { tag: "2D Real & γ", is2d: true, title: "2D Map Study: Γ(x), 1/Γ(x), ψ(x) & Incomplete γ(a, x)", sub: "Jahnke–Emde Figs. 4–5: real branches, minimum Γ(1.4616) = 0.8856, and lower incomplete γ(a, x).", formula: "γ(a, x) = ∫₀^x t^(a−1) e^(−t) dt      Γ(1/2) = √π", note: "Part 5/6 (2D) — Press ↓ for Fig. 3 Altitude Chart (Höhenkarte) of 1/Γ(z)." },
        { tag: "2D Fig.3 1/Γ", is2d: true, title: "2D Altitude & Phase Map (Höhenkarte) of 1/Γ(z) (J-E-L Fig. 3)", sub: "Exact 1:1 conformal contours |1/Γ(z)| = const with Im(1/Γ)=0 & Re(1/Γ)=0 phase lines around zeros 0, −1, −2, −3.", formula: "|1/Γ(x + iy)| = const      Im(1/Γ(z)) = 0", note: "Part 6/6 (2D) — Faithful reconstruction of Jahnke–Emde–Lösch Fig. 3." },
      ],
      draw: drawGammaFullSection,
    },
    {
      roman: "V", cat: CATS[1], disc: "INTEGRAL FUNCTIONS (CH. II–III)", badge: "3D + 2D · 5P", parts: 5,
      title: "Integral Functions: Ei, li, Si, Ci, Error Erf(z) & Fresnel Cornu",
      sub: "Jahnke–Emde–Lösch Ch. II & III: 3D complex Erf & E₁ reliefs plus 2D Ei/li, Si/Ci, and Cornu studies (↑/↓ or 1–5).",
      formula: "Ei(x) = ∫ eᵗ/t dt      Si(x) = ∫ (sin t)/t dt      erf(z) = (2/√π) ∫ e^(−t²) dt",
      note: "Press ↓ or keys 1–5 for 3D |erf(z)|, 3D |E₁(z)|, 2D Ei/li, 2D Si/Ci, and 2D Erf + Cornu Spiral.",
      partMeta: [
        { tag: "3D |erf(z)|", title: "3D Complex Error Function |erf(z)| (Ch. III.1 Stokes Rays)", sub: "Flattens to ±1 along the real axis while exploding exponentially across the ±45° Stokes sectors.", formula: "erf(z) = (2/√π) ∫₀^z e^(−t²) dt", note: "Part 1/5 (3D) — Press ↓ for 3D Complex Exponential Integral |E₁(z)|." },
        { tag: "3D |E₁(z)|", title: "3D Complex Exponential Integral |E₁(z)| (Ch. II.1)", sub: "Logarithmic singularity at z = 0 with a 2πi branch-cut jump along the negative real axis.", formula: "E₁(z) = ∫_z^∞ (e^(−t) / t) dt = −γ − ln z − Σ (−z)ⁿ/(n·n!)", note: "Part 2/5 (3D) — Press ↓ for 2D Exponential & Logarithmic Integrals." },
        { tag: "2D Ei & li", is2d: true, title: "2D Integral Study: Ei*(x), E₁(x) = −Ei(−x) & li(x) (Table 4)", sub: "Cauchy principal-value Ei*(x), positive decay E₁(x), and prime-counting logarithmic integral li(x).", formula: "li(x) = ∫₀^x dt / ln t = Ei*(ln x)      (Pole at x = 1)", note: "Part 3/5 (2D) — Press ↓ for 2D Sine & Cosine Integrals Si(x), Ci(x)." },
        { tag: "2D Si & Ci", is2d: true, title: "2D Integral Study: Sine & Cosine Integrals Si(x), Ci(x) (Tables 5–6)", sub: "Oscillatory convergence Si(x) → π/2 with Gibbs overshoot Si(π) = 1.8519 and Ci(x) → 0.", formula: "Si(x) = ∫₀^x (sin t / t) dt      Ci(x) = −∫_x^∞ (cos t / t) dt", note: "Part 4/5 (2D) — Press ↓ for 2D Error Function & Fresnel Cornu Spiral." },
        { tag: "2D Erf+Cornu", is2d: true, title: "2D Integral Study: Erf(x), Gaussian & Fresnel Cornu Spiral", sub: "Standard probability integral Φ(x) paired with optical diffraction Fresnel spiral (C(u), S(u)).", formula: "C(u) = ∫₀^u cos(πt²/2) dt      S(u) = ∫₀^u sin(πt²/2) dt", note: "Part 5/5 (2D) — Cornu spiral winds asymptotically into foci (±1/2, ±1/2)." },
      ],
      draw: drawIntegralFunctionsSection,
    },
    {
      roman: "VI", cat: CATS[1], disc: "RIEMANN ZETA (CH. IV)", badge: "3D + 2D · 4P", parts: 4,
      title: "Riemann Zeta Function ζ(s): Critical Strip, Pole & Prime Formula",
      sub: "Jahnke–Emde–Lösch Ch. IV: 3D critical strip & full-plane functional continuation + 2D spiral & primes (↑/↓ or 1–4).",
      formula: "ζ(s) = Σ n⁻ˢ = Π (1 − p⁻ˢ)⁻¹      ζ(s) = 2ˢ π^(s−1) sin(πs/2) Γ(1−s) ζ(1−s)",
      note: "Press ↓ or keys 1–4 for 3D Critical Strip, 3D Pole/Trivial Zeros, 2D Spiral, and 2D Prime ψ(x).",
      partMeta: [
        { tag: "3D Strip", title: "3D Riemann Zeta |ζ(s)| over the Critical Strip", sub: "Edge-to-edge 3D relief with glowing Re(s) = 1/2 critical line plunging to zeros γ₁=14.13, γ₂=21.02.", formula: "ζ(s) = (1 − 2^(1−s))⁻¹ Σ (−1)^(n−1) n⁻ˢ      Re(s) = 1/2", note: "Part 1/4 (3D) — Press ↓ for Full-Plane Pole s=1 & Trivial Zeros s=−2, −4." },
        { tag: "3D Pole & 0s", title: "3D Full-Plane |ζ(s)|: Simple Pole s = 1 & Trivial Zeros", sub: "Analytic continuation via Riemann's functional equation revealing the pole at s = 1 and zeros at −2, −4.", formula: "ζ(s) = 2ˢ π^(s−1) sin(πs/2) Γ(1−s) ζ(1−s)", note: "Part 2/4 (3D) — Press ↓ for 2D Critical-Line Spiral & First 10 Zeros." },
        { tag: "2D Spiral", is2d: true, title: "2D Map Study: Critical-Line Spiral ζ(1/2 + it) & |ζ(1/2 + it)|", sub: "J-E-L Table 13: parametric trajectory passing through origin at γ₁ = 14.1347, γ₂ = 21.0220...", formula: "ζ(1/2 + iγₙ) = 0      γ₁ = 14.1347, γ₂ = 21.0220, γ₃ = 25.0109", note: "Part 3/4 (2D) — Press ↓ for Riemann–von Mangoldt Prime Explicit Formula." },
        { tag: "2D Primes", is2d: true, title: "2D Map Study: Explicit Prime-Counting Formula ψ(x) from Zeros", sub: "Summing oscillatory waves over the first 10 non-trivial zeros reconstructs the prime-power staircase.", formula: "ψ(x) = x − Σ_ρ x^ρ / ρ − ln(2π) − ½ ln(1 − x⁻²)", note: "Part 4/4 (2D) — Each zero sharpens the prime jumps of Chebyshev's ψ(x)." },
      ],
      draw: drawZetaFullSection,
    },

    // ── CATEGORY III: ELLIPTIC INTEGRALS & FUNCTIONS (7–8, J-E-L Ch. V–VI) ───
    {
      roman: "VII", cat: CATS[2], disc: "ELLIPTIC INTEGRALS (CH. V)", badge: "3D + 2D · 4P", parts: 4,
      title: "Elliptic Integrals (All Kinds): F(φ,k), E(φ,k), Π(n;φ,k), K(k), E(k)",
      sub: "Jahnke–Emde–Lösch Ch. V: 3D incomplete F & Π surfaces plus 2D complete K/E/K'/E' & modular families (↑/↓ or 1–4).",
      formula: "F(φ,k) = ∫ dθ/√(1−k²sin²θ)      E(φ,k) = ∫ √(1−k²sin²θ) dθ      KE' + K'E − KK' = π/2",
      note: "Press ↓ or keys 1–4 for 3D F(φ,k), 3D Π(n;φ,k), 2D Complete K/E, and 2D Incomplete Family.",
      partMeta: [
        { tag: "3D F(φ,k)", title: "3D Panorama: Incomplete Elliptic Integral 1st Kind F(φ, k)", sub: "Smooth integral surface rising into a logarithmic wall as k → 1 and φ → π/2 (pendulum period).", formula: "F(φ, k) = ∫₀^φ dθ / √(1 − k² sin²θ)      K(k) = F(π/2, k)", note: "Part 1/4 (3D) — Press ↓ for 3rd-Kind Incomplete Integral Π(n; φ, k)." },
        { tag: "3D Π(n;φ,k)", title: "3D Panorama: Elliptic Integral 3rd Kind Π(n; φ, k)", sub: "Three-parameter elliptic integral with live characteristic sweep n(t), reducing to F(φ, k) at n = 0.", formula: "Π(n; φ, k) = ∫₀^φ dθ / ((1 − n sin²θ) √(1 − k² sin²θ))", note: "Part 2/4 (3D) — Press ↓ for 2D Complete Integrals K(k), E(k), K', E'." },
        { tag: "2D Complete", is2d: true, title: "2D Integral Study: Complete K(k), E(k), K'(k), E'(k) (Tables 16–17)", sub: "Computed via Gauss's Arithmetic–Geometric Mean (AGM), verifying Legendre's exact identity = π/2.", formula: "K(k) = π / (2 AGM(1, k'))      KE' + K'E − KK' = π/2", note: "Part 3/4 (2D) — Press ↓ for 2D Incomplete F(φ, sin α) & E(φ, sin α) Family." },
        { tag: "2D Family", is2d: true, title: "2D Integral Study: Incomplete F(φ, sin α) & E(φ, sin α) (Tables 14–15)", sub: "Family curves for modular angles α = 0°, 30°, 60°, 75°, 85° spanning linear φ to logarithmic K(k).", formula: "k = sin α      E(φ, 0) = φ      E(φ, 1) = sin φ", note: "Part 4/4 (2D) — Arc length of an ellipse of eccentricity k is 4a E(k)." },
      ],
      draw: drawEllipticIntegralsSection,
    },
    {
      roman: "VIII", cat: CATS[2], disc: "ELLIPTIC FUNCTIONS (CH. VI)", badge: "3D + 2D · 6P", parts: 6,
      title: "Elliptic Functions: Jacobi sn/cn/dn, Weierstrass ℘, Theta θ₁..θ₄ & η(τ)",
      sub: "Jahnke–Emde–Lösch Ch. VI: 3D doubly-periodic reliefs + 2D Jacobi sn/cn/dn & Theta θ₁..θ₄ curves (↑/↓ or 1–6).",
      formula: "sn²u + cn²u = 1      (℘')² = 4℘³ − g₂℘ − g₃      θ₃(z,q) = 1 + 2 Σ q^(n²) cos(2nz)",
      note: "Press ↓ or keys 1–6 for 3D |sn|, |℘|, |θ₃|, |η(τ)|, 2D Real Jacobi sn/cn/dn, and 2D Theta θ₁..θ₄.",
      partMeta: [
        { tag: "3D |sn(z,k)|", title: "3D Complex Jacobi Elliptic |sn(z, k)| (Ch. VI.A)", sub: "Doubly-periodic meromorphic checkerboard of simple zeros and poles with periods 4K and 2iK'.", formula: "sn(u + 4K, k) = sn(u, k)      sn(u + 2iK', k) = sn(u, k)", note: "Part 1/6 (3D) — Press ↓ for Weierstrass Elliptic Lattice |℘(z)|." },
        { tag: "3D |℘(z)|", title: "3D Weierstrass Elliptic Lattice |℘(z)| (Ch. VI.B)", sub: "Doubly-periodic torus relief with double poles on Λ = ℤω₁ + ℤω₂ satisfying (℘')² = 4℘³ − g₂℘ − g₃.", formula: "℘(z + ω₁) = ℘(z + ω₂) = ℘(z)", note: "Part 2/6 (3D) — Press ↓ for Jacobi Elliptic Theta |θ₃(z, q)|." },
        { tag: "3D |θ₃(z,q)|", title: "3D Jacobi Elliptic Theta Function |θ₃(z, q)| (Ch. VI.C)", sub: "Doubly quasi-periodic heat-kernel solution on the complex torus with breathing nome q = e^(iπτ).", formula: "θ₃(z, q) = 1 + 2 Σ_{n=1}^∞ q^(n²) cos(2nz)", note: "Part 3/6 (3D) — Press ↓ for Modular Dedekind |η(τ)| on ℍ." },
        { tag: "3D |η(τ)|", title: "3D Dedekind Eta Modular Form |η(τ)| on ℍ (Ch. VI.C.4)", sub: "Weight-1/2 modular form under SL(2,ℤ) revealing fractal cusp cascades near the real axis.", formula: "η(τ) = q^(1/24) Π_{n=1}^∞ (1 − qⁿ)      q = e^(2πiτ)", note: "Part 4/6 (3D) — Press ↓ for 2D Real Jacobi sn, cn, dn Curves." },
        { tag: "2D sn/cn/dn", is2d: true, title: "2D Map Study: Real Jacobi sn(u, k), cn(u, k), dn(u, k)", sub: "Nonlinear pendulum oscillations morphing smoothly from sin/cos (k = 0) to tanh/sech (k → 1).", formula: "sn²u + cn²u = 1      k² sn²u + dn²u = 1", note: "Part 5/6 (2D) — Press ↓ for 2D Jacobi Theta Functions θ₁..θ₄(v, q)." },
        { tag: "2D θ₁..θ₄", is2d: true, title: "2D Map Study: Jacobi Theta Functions θ₁, θ₂, θ₃, θ₄(v, q) (Tables 18–19)", sub: "All four theta functions sweeping live across nome q(t) = e^(−πK'/K), showing θ₁ odd zeros & θ₃ peaks.", formula: "θ₃⁴(0) = θ₂⁴(0) + θ₄⁴(0)      (Jacobi Identity)", note: "Part 6/6 (2D) — Building blocks of all Jacobi & Weierstrass elliptic functions." },
      ],
      draw: drawEllipticFunctionsSection,
    },

    // ── CATEGORY IV: ORTHOGONAL POLYNOMIALS & SPHERICAL (9–10, J-E-L Ch. VII–VIII)
    {
      roman: "IX", cat: CATS[3], disc: "ORTHOGONAL POLYNOMIALS (CH. VII)", badge: "3D + 2D · 5P", parts: 5,
      title: "Orthogonal Polynomials: Chebyshev, Laguerre & Hermite",
      sub: "Jahnke–Emde–Lösch Ch. VII: 3D Complex Chebyshev & 2D Hermite-Gaussian + 2D T_n, L_n, H_n studies (↑/↓ or 1–5).",
      formula: "Tₙ(cos θ) = cos(nθ)      lₙ(x) = e^(−x/2) Lₙ(x)      φₙ(x) ∝ e^(−x²/2) Hₙ(x)",
      note: "Press ↓ or keys 1–5 for 3D |Tₙ(z)|, 3D Hermite Carpet, 2D Chebyshev, 2D Laguerre, and 2D Hermite.",
      partMeta: [
        { tag: "3D |Tₙ(z)|", title: "3D Complex Chebyshev Relief |Tₙ(z)| (Bernstein Ellipses)", sub: "All n zeros lie cleanly inside [−1, 1] while level contours form confocal Bernstein ellipses in ℂ.", formula: "Tₙ(z) = cos(n arccos z)      Tₙ₊₁ = 2z Tₙ − Tₙ₋₁", note: "Part 1/5 (3D) — Press ↓ for 3D 2D-Oscillator Hermite–Gaussian Carpet." },
        { tag: "3D Hermite", title: "3D Quantum Parabolic-Cylinder Carpet φₘ(x) φₙ(y)", sub: "2D quantum harmonic oscillator eigenmodes built from Hermite polynomials & Gaussian envelopes.", formula: "ψₘₙ(x,y) ∝ Hₘ(x) Hₙ(y) e^(−(x²+y²)/2)      E = (m+n+1)ℏω", note: "Part 2/5 (3D) — Press ↓ for 2D Chebyshev Tₙ(x) & Uₙ(x) Study." },
        { tag: "2D Chebyshev", is2d: true, title: "2D Chebyshev Study: Tₙ(x) & Uₙ(x) on [−1, 1] (Ch. VII.A)", sub: "Minimax equioscillation property |Tₙ(x)| ≤ 1 with yellow Chebyshev–Gauss interpolation nodes.", formula: "Tₙ(x) = cos(n arccos x)      xₖ = cos((2k−1)π / 2n)", note: "Part 3/5 (2D) — Press ↓ for 2D Laguerre Functions lₙ(x) (Table 20)." },
        { tag: "2D Laguerre", is2d: true, title: "2D Laguerre Study: Damped Functions lₙ(x) = e^(−x/2) Lₙ(x) (Table 20)", sub: "Orthonormal Laguerre functions on [0, ∞) governing hydrogen radial decay & Laplace inversion.", formula: "(k+1) Lₖ₊₁ = (2k+1−x) Lₖ − k Lₖ₋₁      ∫₀^∞ lₘ lₙ dx = δₘₙ", note: "Part 4/5 (2D) — Press ↓ for 2D Hermite / Parabolic Cylinder φₙ(x) (Table 21)." },
        { tag: "2D Hermite", is2d: true, title: "2D Hermite & Parabolic Cylinder Study φₙ(x) (Table 21)", sub: "Stacked quantum harmonic oscillator eigenstates φ₀..φ₅ with exact nodal zero counts.", formula: "φₙ(x) = (2ⁿ n! √π)^(−1/2) e^(−x²/2) Hₙ(x)", note: "Part 5/5 (2D) — Eigenfunctions of the continuous Fourier transform." },
      ],
      draw: drawOrthogonalPolySection,
    },
    {
      roman: "X", cat: CATS[3], disc: "SPHERICAL & LEGENDRE (CH. VIII)", badge: "3D + 2D · 6P", parts: 6,
      title: "Spherical Harmonics Yₗᵐ(θ,φ) & Legendre Functions Pₙ, Qₙ",
      sub: "Jahnke–Emde–Lösch Ch. VIII: 3D orbitals Yₗᵐ + 2D Legendre Pₙ/Qₙ & Polar Radiation Lobes |Pₙ(cos θ)| (↑/↓ or 1–6).",
      formula: "∇²_S² Yₗᵐ = −l(l+1) Yₗᵐ      (1−x²) y'' − 2x y' + n(n+1) y = 0",
      note: "Press ↓ or keys 1–6 for 3D Y₃², Y₄², Y₆⁴, Y₂⁰, 2D Pₙ/Qₙ, and 2D Polar Lobes |Pₙ(cos θ)|.",
      partMeta: [
        { tag: "3D Y₃²", title: "3D Spherical Harmonic Y₃² (f_xyz Tetrahedral Octupole)", sub: "l = 3, m = 2 eight-lobe harmonic displaying alternating phase sign across three nodal planes.", formula: "Y₃²(θ, φ) ∝ sin²θ cosθ cos(2φ)      λ = −12", note: "Part 1/6 (3D) — Press ↓ for Y₄² Hexadecapole." },
        { tag: "3D Y₄²", title: "3D Spherical Harmonic Y₄² (g-Orbital Hexadecapole)", sub: "l = 4, m = 2 harmonic combining two azimuthal nodal planes with two latitudinal nodal cones.", formula: "Y₄²(θ, φ) ∝ sin²θ (7 cos²θ − 1) cos(2φ)      λ = −20", note: "Part 2/6 (3D) — Press ↓ for Y₆⁴ Cubic 64-Pole." },
        { tag: "3D Y₆⁴", title: "3D Spherical Harmonic Y₆⁴ (i-Orbital 64-Pole)", sub: "High-degree l = 6, m = 4 harmonic spanning the cubic symmetry basis of S².", formula: "Y₆⁴(θ, φ) ∝ sin⁴θ (11 cos²θ − 1) cos(4φ)      λ = −42", note: "Part 3/6 (3D) — Press ↓ for Y₂⁰ Zonal Quadrupole." },
        { tag: "3D Y₂⁰", title: "3D Spherical Harmonic Y₂⁰ (d_z² Zonal Quadrupole)", sub: "Axially symmetric l = 2, m = 0 zonal Legendre harmonic P₂(cos θ) = (3 cos²θ − 1)/2.", formula: "Y₂⁰(θ, φ) ∝ 3 cos²θ − 1      λ = −6", note: "Part 4/6 (3D) — Press ↓ for 2D Legendre Pₙ(x) & Qₙ(x) (Tables 22–25)." },
        { tag: "2D Pₙ & Qₙ", is2d: true, title: "2D Map Study: Legendre 1st Kind Pₙ(x) & 2nd Kind Qₙ(x)", sub: "J-E-L Tables 22–25: orthogonal polynomials P₁..P₅ paired with logarithmically singular Qₙ(x) at x = ±1.", formula: "Q₀(x) = ½ ln((1+x)/(1−x))      (k+1)Pₖ₊₁ = (2k+1)xPₖ − kPₖ₋₁", note: "Part 5/6 (2D) — Press ↓ for 2D Polar Radiation Lobes |Pₙ(cos θ)|." },
        { tag: "2D Polar Pₙ", is2d: true, title: "2D Polar Map Study: Legendre Radiation Lobes |Pₙ(cos θ)| (Table 23)", sub: "Isotropic 1:1 polar multipole patterns r(θ) = |Pₙ(cos θ)| showing exact zonal nodal cones.", formula: "r(θ) = |Pₙ(cos θ)|      n = 1..5  (Dipole → 32-Pole)", note: "Part 6/6 (2D) — Antenna & acoustic multipole radiation cross-sections." },
      ],
      draw: drawLegendreSphericalSection,
    },

    // ── CATEGORY V: BESSEL, MATHIEU, CONFLUENT & PHYSICS (11–14, J-E-L Ch. IX–XII)
    {
      roman: "XI", cat: CATS[4], disc: "BESSEL · KELVIN · STRUVE (CH. IX)", badge: "3D + 2D · 6P", parts: 6,
      title: "Bessel Functions: Cylinder J, Y, Complex J₀, Airy, Modified I/K & Kelvin",
      sub: "Jahnke–Emde–Lösch Ch. IX: 3D wavefields, |J₀|, |Ai| + 2D J/Y/Struve, I/K/Kelvin & Airy/Spherical jₙ (↑/↓ or 1–6).",
      formula: "z² y'' + z y' + (z² − ν²) y = 0      ber(x) + i bei(x) = J₀(x e^(3πi/4))",
      note: "Press ↓ or keys 1–6 for 3D Wavefield, |J₀|, |Ai|, 2D J/Y/H₀, 2D I/K/ber, and 2D Airy + Spherical jₙ.",
      partMeta: [
        { tag: "3D Wavefield", title: "3D Cylindrical Bessel Wavefield Jₘ(kr) cos(mθ) (Ch. IX.A)", sub: "Unbounded 3D Helmholtz eigenmodes of a circular drum vibrating across the host viewport.", formula: "x² y'' + x y' + (x² − m²) y = 0", note: "Part 1/6 (3D) — Press ↓ for 3D Complex Bessel Relief |J₀(z)|." },
        { tag: "3D |J₀(z)|", title: "3D Complex Bessel Relief |J₀(z)| (Jahnke–Emde Iconic Relief)", sub: "Real-axis zeros at ±2.4048, ±5.5201... rising exponentially into I₀(y) along the imaginary axis.", formula: "J₀(z) = Σ (−1)ᵏ (z/2)^(2k) / (k!)²      J₀(iy) = I₀(y)", note: "Part 2/6 (3D) — Press ↓ for 3D Complex Airy Caustic |Ai(z)|." },
        { tag: "3D |Ai(z)|", title: "3D Complex Airy Caustic |Ai(z)| (Ch. IX.A.7)", sub: "Order-1/3 Bessel caustic oscillating on x < 0 and decaying exponentially across Stokes sectors.", formula: "Ai''(z) − z Ai(z) = 0      Ai(z) = (1/π)√(z/3) K_{1/3}(⅔ z^(3/2))", note: "Part 3/6 (3D) — Press ↓ for 2D Cylinder Jₙ, Neumann Y₀ & Struve H₀." },
        { tag: "2D J, Y, H₀", is2d: true, title: "2D Map Study: Bessel J₀..J₂, Neumann Y₀ & Struve H₀(x)", sub: "J-E-L Ch. IX.A & C: cylindrical oscillations, marked J₀ zeros, logarithmic pole of Y₀, and Struve H₀.", formula: "J₀(x) ~ √(2/πx) cos(x − π/4)      H₀(x) − Y₀(x) ~ 2/(πx)", note: "Part 4/6 (2D) — Press ↓ for 2D Modified Bessel I, K & Kelvin ber/bei." },
        { tag: "2D I, K, ber", is2d: true, title: "2D Map Study: Modified Bessel I₀, I₁, K₀, K₁ & Kelvin ber/bei", sub: "J-E-L Ch. IX.B: exponential growth Iₙ, Macdonald decay Kₙ, and AC skin-effect Kelvin curves.", formula: "ber(x) + i bei(x) = J₀(x e^(3πi/4))      I₀(x) K₁(x) + I₁(x) K₀(x) = 1/x", note: "Part 5/6 (2D) — Press ↓ for 2D Airy Ai(x), Bi(x) & Spherical Bessel j₀, j₁." },
        { tag: "2D Airy & jₙ", is2d: true, title: "2D Map Study: Airy Ai(x), Bi(x) & Spherical Bessel j₀, j₁(x)", sub: "Order ±1/3 Airy turning-point transition at x = 0 paired with half-integer spherical Bessel waves.", formula: "Ai(0) = 0.3550      j₀(x) = sin(x)/x      j₁(x) = sin(x)/x² − cos(x)/x", note: "Part 6/6 (2D) — Quantum WKB connection formulas and spherical scattering." },
      ],
      draw: drawBesselFullSection,
    },
    {
      roman: "XII", cat: CATS[4], disc: "MATHIEU FUNCTIONS (CH. X)", badge: "3D + 2D · 4P", parts: 4,
      title: "Mathieu Functions ceₙ, seₙ & Ince–Strutt Stability Chart",
      sub: "Jahnke–Emde–Lösch Ch. X: 3D elliptic drum & Floquet instability relief + 2D stability chart & ce/se (↑/↓ or 1–4).",
      formula: "y'' + (a − 2q cos 2z) y = 0      |Tr M(π)| ≤ 2  (Stable)",
      note: "Press ↓ or keys 1–4 for 3D Elliptic Drum, 3D Floquet Relief, 2D Ince–Strutt Chart, and 2D ce/se.",
      partMeta: [
        { tag: "3D Elliptic", title: "3D Elliptic-Membrane Mathieu Wavefield ceₘ(η,q) Ceₘ(ξ,q)", sub: "Confocal elliptic-coordinate Helmholtz eigenmodes vibrating around twin foci (±c, 0).", formula: "y'' + (a − 2q cos 2z) y = 0      (Confocal Elliptic Drum)", note: "Part 1/4 (3D) — Press ↓ for 3D Floquet Parametric Instability Relief." },
        { tag: "3D Stability", title: "3D Ince–Strutt Floquet Instability Relief over (q, a)", sub: "Flat blue valleys mark stable bounded orbits (|Tr M| ≤ 2); rising peaks mark parametric resonance tongues.", formula: "μ(a, q) = (1/π) arccosh(|Tr M(π)| / 2)", note: "Part 2/4 (3D) — Press ↓ for 2D Ince–Strutt Stability Chart aₙ(q), bₙ(q)." },
        { tag: "2D Chart", is2d: true, title: "2D Map Study: Ince–Strutt Stability Chart aₙ(q), bₙ(q) (Ch. X.2)", sub: "Characteristic eigenvalue curves separating stable Paul-trap / Kapitza-pendulum zones from instability.", formula: "a₀(q) = −q²/2 + 7q⁴/128 ...      a₁, b₁ = 1 ± q − q²/8 ...", note: "Part 3/4 (2D) — Press ↓ for 2D Periodic Mathieu Functions ceₙ, seₙ." },
        { tag: "2D ceₙ & seₙ", is2d: true, title: "2D Map Study: Periodic Mathieu Functions ce₀..ce₂, se₁..se₂ (Ch. X.3)", sub: "Fourier-series eigenfunctions deforming smoothly from cos(nz), sin(nz) as parameter q(t) sweeps.", formula: "ce₂ₙ(z, q) = Σ A₂ᵣ cos(2rz)      se₂ₙ₊₁(z, q) = Σ B₂ᵣ₊₁ sin((2r+1)z)", note: "Part 4/4 (2D) — Even & odd 2π-periodic solutions of Mathieu's equation." },
      ],
      draw: drawMathieuSection,
    },
    {
      roman: "XIII", cat: CATS[4], disc: "CONFLUENT & WHITTAKER (CH. XI)", badge: "3D + 2D · 4P", parts: 4,
      title: "Confluent Hypergeometric M(a,c;z) & Whittaker M_{κ,μ}(z)",
      sub: "Jahnke–Emde–Lösch Ch. XI: 3D complex Kummer & Whittaker reliefs + 2D Kummer family & Hydrogen radial (↑/↓ or 1–4).",
      formula: "z y'' + (c − z) y' − a y = 0      M(a, c; z) = Σ (a)ₖ zᵏ / ((c)ₖ k!)",
      note: "Press ↓ or keys 1–4 for 3D |M(a,c;z)|, 3D Whittaker, 2D Kummer Family, and 2D Hydrogen Orbitals.",
      partMeta: [
        { tag: "3D |M(a,c;z)|", title: "3D Complex Kummer Relief |M(a, c; z)| = |₁F₁(a; c; z)| (Ch. XI.1)", sub: "Confluent hypergeometric relief with live parameter a(t) sweeping across polynomial & exponential regimes.", formula: "M(a, c; z) = e^z M(c − a, c; −z)      (Kummer Transformation)", note: "Part 1/4 (3D) — Press ↓ for 3D Complex Whittaker |M_{κ,μ}(z)|." },
        { tag: "3D Whittaker", title: "3D Complex Whittaker Function |M_{κ,μ}(z)| (Ch. XI.3)", sub: "Symmetric Coulomb-wave normal form of the confluent ODE with live parameter κ(t).", formula: "M_{κ,μ}(z) = e^(−z/2) z^(μ+1/2) M(μ − κ + 1/2, 2μ + 1; z)", note: "Part 2/4 (3D) — Press ↓ for 2D Kummer M(a, 1; x) Family." },
        { tag: "2D Kummer", is2d: true, title: "2D Map Study: Kummer M(a, 1; x) & Laguerre Limits (Ch. XI.1 & 4)", sub: "Negative integer a = −n truncates to Laguerre polynomials Lₙ(x), while a = 1 recovers eˣ.", formula: "M(−n, 1; x) = Lₙ(x)      M(1, 1; x) = eˣ", note: "Part 3/4 (2D) — Press ↓ for 2D Hydrogen Radial Probability Densities." },
        { tag: "2D Hydrogen", is2d: true, title: "2D Map Study: Hydrogen Radial Density r² |Rₙₗ(r)|² (Ch. XI.4)", sub: "Exact 1s, 2s, 2p, 3s, 3p, 3d atomic radial probability densities computed via confluent M(−(n−l−1), 2l+2; 2r/n).", formula: "Rₙₗ(r) ∝ e^(−r/n) (2r/n)ˡ M(l + 1 − n, 2l + 2; 2r/n)", note: "Part 4/4 (2D) — Exact bound states of the quantum Coulomb problem." },
      ],
      draw: drawConfluentSection,
    },
    {
      roman: "XIV", cat: CATS[4], disc: "PHYSICS FUNCTIONS (CH. XII)", badge: "3D + 2D · 6P", parts: 6,
      title: "Special Functions of Physics: Planck, Langevin, Debye & Heat Kernel",
      sub: "Jahnke–Emde–Lösch Ch. XII: 3D Planck & Heat Kernel + 2D Planck, Langevin, Debye & Heat Profiles (↑/↓ or 1–6).",
      formula: "B(λ,T) ∝ λ⁻⁵/(e^(hc/λkT)−1)      L(x) = coth x − 1/x      G(x,t) = e^(−x²/4t)/√(4πt)",
      note: "Press ↓ or keys 1–6 for 3D Planck, 3D Heat, 2D Planck, 2D Langevin, 2D Debye, and 2D Heat Profiles.",
      partMeta: [
        { tag: "3D Planck", title: "3D Planck Blackbody Surface B(λ, T) + Wien Ridge (Ch. XII.A)", sub: "Quantum spectral radiance over wavelength & temperature with glowing yellow Wien displacement ridge λT = b.", formula: "B(λ, T) = (2hc² / λ⁵) / (e^(hc / λkT) − 1)", note: "Part 1/6 (3D) — Press ↓ for 3D Heat-Conduction Source Kernel G(x, t)." },
        { tag: "3D Heat G(x,t)", title: "3D Heat-Conduction Source Kernel G(x, t) (Ch. XII.D)", sub: "Fundamental Gaussian Green's function of ∂u/∂t = D ∂²u/∂x² spreading from a Dirac delta peak at t → 0.", formula: "G(x, t) = (4πDt)^(−1/2) exp(−x² / 4Dt)      ∫ G dx = 1", note: "Part 2/6 (3D) — Press ↓ for 2D Planck Spectrum Curves." },
        { tag: "2D Planck", is2d: true, title: "2D Map Study: Planck Radiation Spectrum & Wien Peak (Ch. XII.A)", sub: "Blackbody spectral curves across five temperatures highlighting the shifting Wien peak & Rayleigh–Jeans UV curve.", formula: "λ_max T = 2.8978 × 10⁻³ m·K      ∫ B dλ ∝ T⁴", note: "Part 3/6 (2D) — Press ↓ for 2D Langevin & Brillouin Paramagnetism." },
        { tag: "2D Langevin", is2d: true, title: "2D Map Study: Langevin L(x) & Brillouin B_J(x) (Ch. XII.B)", sub: "Classical dipole magnetization L(x) = coth x − 1/x compared with quantum spin-J Brillouin curves.", formula: "L(x) = coth x − 1/x ~ x/3  (x → 0)      B_{1/2}(x) = tanh(x)", note: "Part 4/6 (2D) — Press ↓ for 2D Planck–Einstein vs Debye Specific Heat." },
        { tag: "2D Debye", is2d: true, title: "2D Map Study: Debye D₃(Θ/T) vs Planck–Einstein Specific Heat (Ch. XII.C)", sub: "Solid-state molar heat capacity C_V/3Nk showing Debye's exact low-T T³ law vs Dulong–Petit limit 1.", formula: "D₃(x) = (3/x³) ∫₀^x t⁴ eᵗ / (eᵗ − 1)² dt      C_V ~ (12π⁴/5)(T/Θ)³", note: "Part 5/6 (2D) — Press ↓ for 2D Heat-Conduction Diffusion Profiles G(x, t)." },
        { tag: "2D Heat G(x,t)", is2d: true, title: "2D Map Study: Heat-Conduction Diffusion Profiles G(x, t) (Ch. XII.D)", sub: "Gaussian heat pulses at t = 0.06..1.40 preserving unit total thermal energy while width grows as σ = √(2Dt).", formula: "G(x, t) = (4πDt)^(−1/2) exp(−x² / 4Dt)      σ(t) = √(2Dt)", note: "Part 6/6 (2D) — Fundamental Green's function of the 1D diffusion equation." },
      ],
      draw: drawPhysicsSpecialSection,
    },

    // ── CATEGORY VI: COMPLEX ANALYSIS & RIEMANN SURFACES (XV–XVII) ───────────
    {
      roman: "XV", cat: CATS[5], disc: "TAYLOR · LAURENT · LOG", badge: "3D + 2D · 6P", parts: 6,
      title: "Taylor Convergence, Laurent Residues, e^(1/z) & Log(z)",
      sub: "3D Taylor wall, Cauchy residue contour, e^(1/z), Log(z) helix + 2D Taylor radius & Cauchy studies (↑/↓ or 1–6).",
      formula: "S_N(z) = Σ (−1)ⁿ z^(2n)      ∮ f(z) dz = 2πi Σ Res      e^(1/z)      log(z)",
      note: "Press ↓ or keys 1–6 for 3D reliefs and 2D Taylor / Cauchy Residue map studies.",
      partMeta: [
        { tag: "3D Taylor", title: "3D Complex Taylor Series Convergence Wall (R = 1)", sub: "Partial sums of 1/(1 + z²) lock onto poles ±i inside the amber unit disk |z| = 1 and erupt outside.", formula: "S_N(z) = Σ_{n=0}^N (−1)ⁿ z^(2n)      (|z| < 1)", note: "Part 1/6 (3D) — Press ↓ for 3D Laurent Series & Cauchy Residues." },
        { tag: "3D Laurent", title: "3D Laurent Poles & Floating Cauchy Residue Contour", sub: "Simple poles (Res +1, −2) and a 2nd-order pole (4π winding, Res 0) swept by a 3D Cauchy contour γ.", formula: "f(z) = 1/(z−z₁) − 2/(z−z₂) + 1/(z−z₃)²      ∮ f dz = 2πi Σ Res", note: "Part 2/6 (3D) — Press ↓ for the Essential Singularity exp(1/z)." },
        { tag: "3D e^(1/z)", title: "3D Essential Singularity |exp(1/z)| (Great Picard Theorem)", sub: "Explodes toward 0⁺, vanishes toward 0⁻, and oscillates through every complex phase along the imaginary axis.", formula: "e^(1/z) = Σ_{n=0}^∞ 1 / (n! zⁿ)      (Essential Singularity at 0)", note: "Part 3/6 (3D) — Press ↓ for the 3D Complex Logarithm Helix." },
        { tag: "3D Log(z)", title: "3D Complex Logarithm Riemann Surface w = log(z)", sub: "Infinite helical staircase climbing by 2πi on every loop around the branch point z = 0.", formula: "log(r e^(iθ)) = ln(r) + i(θ + 2πk)      k ∈ ℤ", note: "Part 4/6 (3D) — Press ↓ for 2D Taylor Radius of Convergence Study." },
        { tag: "2D Taylor R=1", is2d: true, title: "2D Map Study: Taylor Radius of Convergence 1/(1 + x²)", sub: "Real partial sums converge inside (−1, 1) and diverge beyond the hidden complex poles at z = ±i.", formula: "1 / (1 + x²) = Σ_{n=0}^∞ (−1)ⁿ x^(2n)      (|x| < 1)", note: "Part 5/6 (2D) — Press ↓ for 2D Cauchy Residue Contour Sweep." },
        { tag: "2D Cauchy ∮", is2d: true, title: "2D Map Study: Cauchy Residue Theorem Contour Sweep", sub: "Deforming closed loop γ sweeps across simple poles z₁ (Res +1) and z₂ (Res −2), jumping ∮ f dz by 2πi Res.", formula: "∮_γ f(z) dz = 2πi Σ_{zₖ ∈ γ} Res(f, zₖ)", note: "Part 6/6 (2D) — Topological invariance of complex contour integration." },
      ],
      draw: drawComplexAnalysisWith2D,
    },
    {
      roman: "XVI", cat: CATS[5], disc: "CONFORMAL & RIEMANN SPHERE", badge: "3D + 2D · 4P", parts: 4,
      title: "Joukowski Map, Blaschke Products & Riemann Sphere ℂ̂",
      sub: "3D Joukowski relief, 5-fold Blaschke mirror, Riemann Sphere ℂ̂ + 2D Joukowski conformal airfoil net (↑/↓ or 1–4).",
      formula: "w = z + a²/z      B(z) = Π (z−aₖ)/(1−āₖz)      ℂ̂ = ℂ ∪ {∞} ≅ S²",
      note: "Press ↓ or keys 1–4 for 3D Joukowski, Blaschke, Riemann Sphere, and 2D Conformal Net.",
      partMeta: [
        { tag: "3D Joukowski", title: "3D Complex Joukowski Conformal Relief |z + a²/z|", sub: "Central simple pole at z = 0 flanked by twin conformal saddle zeros at z = ±ia.", formula: "w(z) = z + a² / z      dw/dz = 0 at z = ±a", note: "Part 1/4 (3D) — Press ↓ for 3D Blaschke Products." },
        { tag: "3D Blaschke", title: "3D Blaschke Product B₅(z): Unit-Circle Zero/Pole Mirror", sub: "Five orbiting zeros inside |z| < 1 mirror into five towering poles outside |z| > 1 with |B| = 1 on S¹.", formula: "B(z) = Π_{k=1}^5 (z − aₖ) / (1 − āₖ z)      |B(e^(iθ))| ≡ 1", note: "Part 2/4 (3D) — Press ↓ for the 3D Riemann Sphere ℂ̂." },
        { tag: "3D ℂ̂ Sphere", title: "3D Riemann Sphere ℂ̂ ≅ S² under Möbius Flow PSL(2,ℂ)", sub: "Stereographic compactification of ℂ ∪ {∞} showing cubic rational poles and zeros flowing across S².", formula: "f(z) = ((z−a)³ − 1) / ((z−a)³ + 1)      M ∈ PSL(2, ℂ)", note: "Part 3/4 (3D) — Press ↓ for 2D Joukowski Conformal Airfoil Net." },
        { tag: "2D Joukowski", is2d: true, title: "2D Conformal Map Study: Joukowski Airfoil w = z + 1/z", sub: "1:1 isotropic morph transforming concentric circles & radial rays into an exact 90°-orthogonal airfoil grid.", formula: "w(z) = z + 1 / z      (Angle-Preserving Conformal Map)", note: "Part 4/4 (2D) — Classic aerodynamic conformal transformation." },
      ],
      draw: drawConformalWith2D,
    },
    {
      roman: "XVII", cat: CATS[5], disc: "LOGARITHMS · LAMBERT W · √Z", badge: "3D + 2D · 6P", parts: 6,
      title: "Complex Log, Tsallis q-Log, Polylog Liₛ, Lambert W & √z",
      sub: "3D multi-sheeted ln(z), q-Log, Polylog Liₛ, Lambert W, √z + 2D real branches study (↑/↓ or 1–6).",
      formula: "ln(z)      ln_q(z) = (z^(1−q)−1)/(1−q)      Liₛ(z) = Σ zⁿ/nˢ      W(z)e^W = z      w² = z",
      note: "Press ↓ or keys 1–6 for 3D reliefs and 2D Real Log / Tsallis / Dilog / Lambert W Branches.",
      partMeta: [
        { tag: "3D ln(z)", title: "3D Multi-Sheeted Complex Logarithm w = ln(z) + Path Observer", sub: "Three helical Riemann sheets (−3π..+3π) with a glowing 3D Path Observer climbing continuously around z = 0.", formula: "ln(r e^(iθ)) = ln(r) + i(θ + 2πk)      k ∈ ℤ", note: "Part 1/6 (3D) — Press ↓ for the Generalized Tsallis q-Logarithm." },
        { tag: "3D q-Log", title: "3D Generalized q-Logarithm ln_q(z) (Tsallis Non-Extensive)", sub: "Deforms smoothly across the classical Boltzmann–Shannon limit q = 1 while bending the branch cut.", formula: "ln_q(z) = (z^(1−q) − 1) / (1 − q)      lim_{q→1} ln_q(z) = ln(z)", note: "Part 2/6 (3D) — Press ↓ for the Complex Polylogarithm Liₛ(z)." },
        { tag: "3D Liₛ(z)", title: "3D Complex Polylogarithm Liₛ(z) (Dilogarithm & Trilogarithm)", sub: "Order s(t) sweeps between Li₁, Li₂, and Li₃ with embedded |z| = 1 circle and path observer at z = 1.", formula: "Liₛ(z) = Σ_{n=1}^∞ zⁿ / nˢ      Liₛ(1) = ζ(s)", note: "Part 3/6 (3D) — Press ↓ for the Complex Lambert W(z) Product Logarithm." },
        { tag: "3D Lambert W", title: "3D Complex Lambert W(z) (Product Logarithm: W e^W = z)", sub: "Principal branch W₀(z) solved via complex Halley iteration, pinning the branch point z = −1/e.", formula: "W(z) e^(W(z)) = z      Branch Point: z = −1/e ≈ −0.3679", note: "Part 4/6 (3D) — Press ↓ for the 2-Sheeted Riemann Surface w = √z." },
        { tag: "3D w = √z", title: "3D Two-Sheeted Riemann Surface w = √z", sub: "Walking 4π around the branch point z = 0 smoothly traverses both sheets without a cut.", formula: "w(r e^(iθ)) = √r e^(iθ/2)      θ ∈ [0, 4π]", note: "Part 5/6 (3D) — Press ↓ for 2D Real Lambert W₀/W₋₁, ln(x), ln_q(x) & Li₂(x)." },
        { tag: "2D Log & W", is2d: true, title: "2D Map Study: Lambert W₀, W₋₁, ln(x), Tsallis ln_q(x) & Li₂(x)", sub: "Real branches showing Lambert's turning point (−1/e, −1), dilogarithm Li₂(1) = π²/6, and live Tsallis q sweep.", formula: "W₀(−1/e) = W₋₁(−1/e) = −1      Li₂(1) = π²/6 ≈ 1.6449", note: "Part 6/6 (2D) — Direct comparison of classical & generalized logarithms." },
      ],
      draw: drawLogarithmsWithSqrt3D,
    },

    // ── CATEGORY VII: TOPOLOGICAL, CALABI–YAU, YANG–MILLS & LIE (XVIII–XXI) ──
    {
      roman: "XVIII", cat: CATS[6], disc: "3D MINIMAL SURFACES", badge: "3D · 3P", parts: 3,
      title: "Minimal & Non-Orientable Surfaces: Enneper, Klein, Bonnet",
      sub: "Zero-mean-curvature Enneper saddle, Figure-8 Klein Bottle, and Catenoid ↔ Helicoid isometric morph (↑/↓ or 1–3).",
      formula: "H = (κ₁ + κ₂) / 2 = 0      χ(Klein) = 0",
      note: "Soap films minimize area (H = 0); Catenoid and Helicoid are locally isometric.",
      partMeta: [
        { tag: "3D Enneper", title: "Enneper Minimal Surface (Mean Curvature H = 0)", sub: "Self-intersecting algebraic minimal surface parameterized by Weierstrass–Enneper data.", formula: "x = u − u³/3 + uv²      y = v − v³/3 + vu²      z = u² − v²", note: "Part 1/3 — Press ↓ for the Figure-8 Klein Bottle." },
        { tag: "3D Klein", title: "Figure-8 Klein Bottle (Non-Orientable Surface)", sub: "Closed one-sided manifold with Euler characteristic χ = 0 embedded in 3D via self-intersection.", formula: "π₁(K) = ⟨a, b | aba⁻¹b = 1⟩", note: "Part 2/3 — Press ↓ for the Catenoid ↔ Helicoid morph." },
        { tag: "3D Bonnet", title: "Bonnet Isometric Morph: Catenoid ↔ Helicoid", sub: "Continuous isometric bending preserving H = 0 and Gaussian curvature K at every angle α.", formula: "X(α) = cos(α) X_cat + sin(α) X_hel      (H ≡ 0)", note: "Part 3/3 — Zero stretching throughout the entire transformation." },
      ],
      draw: drawMinimalSurfaces3D,
    },
    {
      roman: "XIX", cat: CATS[6], disc: "3D CALABI–YAU SPACES", badge: "3D · 5P", parts: 5,
      title: "Calabi–Yau Spaces: Quintic, K3, Sextic, Dwork Conifold & Cubic",
      sub: "Five canonical Ricci-flat Kähler Calabi–Yau manifolds across dimensions 1, 2, and 3 (↑/↓ or 1–5).",
      formula: "z₁ⁿ + z₂ⁿ − 5ψ z₁z₂ = 1      Ric(g) = 0      c₁(M) = 0",
      note: "Press ↓ or keys 1–5 to step through Quintic, K3, Sextic, Dwork Conifold, and Cubic CY manifolds.",
      partMeta: [
        { tag: "3D Quintic", title: "Calabi–Yau 3-Fold: Quintic Hypersurface (n = 5, 25 Patches)", sub: "Iconic Type IIB string-theory quintic in ℂP⁴ with Hodge numbers h¹'¹ = 1, h²'¹ = 101, χ = −200.", formula: "z₁⁵ + z₂⁵ = 1      SU(3) Holonomy      χ = −200", note: "Part 1/5 — Press ↓ for the K3 Quartic Surface (CY2)." },
        { tag: "3D K3", title: "Calabi–Yau 2-Fold: K3 Quartic Surface (n = 4, 16 Patches)", sub: "Unique compact simply-connected Calabi–Yau 2-fold with SU(2) holonomy and Euler χ = +24.", formula: "z₁⁴ + z₂⁴ = 1      SU(2) Holonomy      χ = +24", note: "Part 2/5 — Press ↓ for the Sextic Calabi–Yau (n = 6)." },
        { tag: "3D Sextic", title: "Calabi–Yau 3-Fold: Sextic Hypersurface (n = 6, 36 Patches)", sub: "Six-fold degree-6 Calabi–Yau slice in weighted projective space 𝕎ℙ⁴(1,1,1,1,2) (χ = −204).", formula: "z₁⁶ + z₂⁶ = 1      36 Complex Patches      χ = −204", note: "Part 3/5 — Press ↓ for the Dwork Pencil Mirror Conifold." },
        { tag: "3D Conifold", title: "Dwork Pencil Mirror Conifold (z₁⁵ + z₂⁵ − 5ψ z₁z₂ = 1)", sub: "Modulus ψ(t) deforms the quintic throat toward the conifold singularity of mirror symmetry.", formula: "z₁⁵ + z₂⁵ − 5ψ(t) z₁ z₂ = 1      (Mirror Symmetry)", note: "Part 4/5 — Press ↓ for the Elliptic Cubic Torus (CY1)." },
        { tag: "3D Cubic", title: "Calabi–Yau 1-Fold: Elliptic Cubic Torus (n = 3, 9 Patches)", sub: "Flat 3-fold algebraic slice z₁³ + z₂³ = 1 in ℂP² with U(1) holonomy and χ = 0.", formula: "z₁³ + z₂³ = 1      U(1) Holonomy      χ = 0", note: "Part 5/5 — Every compact Calabi–Yau 1-fold is a flat elliptic torus T²." },
      ],
      draw: drawCalabiYau3D,
    },
    {
      roman: "XX", cat: CATS[6], disc: "3D YANG–MILLS & HOPF", badge: "3D · 2P", parts: 2,
      title: "Yang–Mills Instanton and SU(2) Hopf Fibration",
      sub: "BPST SU(2) Yang–Mills topological action density Tr(F²) and linked S³ → S² Hopf gauge fibers (↑/↓ or 1–2).",
      formula: "F = dA + A ∧ A      S = (1/4g²) ∫ Tr(F ∧ *F) = 8π²|Q|/g²",
      note: "Self-dual Yang–Mills instantons tunnel between topological vacua labeled by Chern class Q.",
      partMeta: [
        { tag: "3D BPST", title: "BPST SU(2) Yang–Mills Instanton–Anti-Instanton Density", sub: "3D topological action density Tr(F_μν F^μν) ∝ ρ⁴/(r² + ρ²)⁴ bounded only by the host rect.", formula: "Tr(F_μν F^μν) = 48 ρ⁴ / (r² + ρ²)⁴      Q = ±1", note: "Part 1/2 — Press ↓ for the SU(2) = S³ → S² Hopf Fibration." },
        { tag: "3D Hopf S³", title: "SU(2) ≅ S³ → S² Hopf Fibration (Gauge Bundle)", sub: "Stereographic projection of linked S¹ gauge fibers on nested Villarceau tori (Chern number c₁ = 1).", formula: "S¹ ↪ SU(2) ≅ S³ → S²      Lk(F₁, F₂) = 1", note: "Part 2/2 — The canonical non-trivial U(1) principal bundle over S² (Dirac monopole)." },
      ],
      draw: drawYangMills3D,
    },
    {
      roman: "XXI", cat: CATS[6], disc: "3D LIE MANIFOLDS", badge: "3D · 2P", parts: 2,
      title: "Lie Group Manifolds: Dupin Cyclide & SU(2) Trefoil",
      sub: "Conformal Lie Dupin Cyclide torus and (2,3)-Trefoil Seifert surface embedded in SU(2) ≅ S³ (↑/↓ or 1–2).",
      formula: "SU(2) ≅ S³      [Tₐ, T_b] = i f_abc T_c      K(2,3) ⊂ S³",
      note: "Smooth Lie group symmetries generate conformal cyclides and knotted minimal Seifert ribbons.",
      partMeta: [
        { tag: "3D Dupin", title: "Conformal Lie Dupin Cyclide (T² Inversion Manifold)", sub: "Inversion of a maximal torus under the Möbius/Lie sphere-geometry group.", formula: "x(u,v) = (d(c − a cos u cos v) + b² cos u) / (a − c cos u cos v)", note: "Part 1/2 — Press ↓ for the (2,3) Trefoil Seifert Surface in SU(2)." },
        { tag: "3D Trefoil", title: "(2,3) Trefoil Knot & Seifert Surface in SU(2) ≅ S³", sub: "Twisted Seifert ribbon bounded by the (2,3)-torus knot inside the Lie group manifold SU(2).", formula: "z₁² + z₂³ = 0  ∩  S³      (Milnor Fibration)", note: "Part 2/2 — The trefoil is the link of the cusp singularity z₁² + z₂³ = 0." },
      ],
      draw: drawLieSurfaces3D,
    },
  ];

  // ============================================================================
  // RUNTIME, CHROME, CATEGORIZED INDEX & CONTROLS
  // ============================================================================
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let index = 0, partIdx = 0, sim = {}, simTime = 0, dwell = 0, paused = false, indexOpen = false;
  let last = performance.now(), lastDom = 0;

  const el = {
    count: document.getElementById("count"), disc: document.getElementById("disc"),
    title: document.getElementById("title"), sub: document.getElementById("sub"),
    formula: document.getElementById("formula"), readout: document.getElementById("readout"),
    note: document.getElementById("note"), bar: document.getElementById("bar"),
    index: document.getElementById("index"), hold: document.getElementById("hold"),
    meshLbl: document.getElementById("mesh-lbl"),
  };
  const elLegend = document.getElementById("legend");

  function updateMeshLabel() {
    if (el.meshLbl) el.meshLbl.textContent = meshMul().toFixed(2).replace(/\.00$/, ".0") + "×";
  }
  function stepMesh(delta) {
    meshIdx = Math.max(0, Math.min(MESH_LEVELS.length - 1, meshIdx + delta));
    updateMeshLabel();
  }
  function resetMesh() { meshIdx = 5; updateMeshLabel(); }

  function renderChrome() {
    const s = STATIONS[index], nParts = s.parts || 1, pm = s.partMeta && s.partMeta[partIdx];
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
    sim = {}; simTime = 0; dwell = 0; resetCam();
    renderChrome();
  }
  function selectPart(p) {
    const nParts = STATIONS[index].parts || 1;
    if (nParts <= 1) return;
    partIdx = ((p % nParts) + nParts) % nParts;
    sim = {}; simTime = 0; dwell = 0; resetCam();
    renderChrome();
  }
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
    let activeCat = "ALL";
    const totalParts = STATIONS.reduce((acc, s) => acc + (s.parts || 1), 0);
    const h = document.createElement("h2");
    h.textContent = "HAL 9000 // JAHNKE–EMDE–LÖSCH & PURE MATH TOC (" + STATIONS.length + " STATIONS · " + totalParts + " PARTS)";
    const filters = document.createElement("div"); filters.className = "idx-filters";
    const body = document.createElement("div");

    function renderList() {
      body.replaceChildren();
      (activeCat === "ALL" ? CATS : [activeCat]).forEach((cat) => {
        const items = STATIONS.map((s, i) => ({ s, i })).filter((x) => x.s.cat === cat);
        if (!items.length) return;
        const ch = document.createElement("div"); ch.className = "idx-cat";
        ch.textContent = cat + "  (" + items.length + ")";
        const grid = document.createElement("div"); grid.className = "idx-grid";
        items.forEach(({ s, i }) => {
          const card = document.createElement("div");
          card.className = "idx-item" + (i === index ? " on" : ""); card.dataset.idx = String(i);
          const head = document.createElement("div"); head.className = "head-row";
          const num = document.createElement("div"); num.className = "num"; num.textContent = s.roman + " · " + s.disc;
          const badge = document.createElement("div"); badge.className = "badge"; badge.textContent = s.badge || ((s.parts || 1) + "P");
          head.append(num, badge);
          const ttl = document.createElement("div"); ttl.className = "ttl"; ttl.textContent = s.title;
          const pts = document.createElement("div"); pts.className = "pts"; pts.textContent = s.formula;
          card.append(head, ttl, pts);
          if (s.partMeta && s.partMeta.length > 1) {
            const pRow = document.createElement("div"); pRow.className = "idx-parts";
            s.partMeta.forEach((pm, pi) => {
              const pb = document.createElement("button"); pb.type = "button";
              pb.className = "idx-part-btn" + (pm.is2d ? " is2d" : "");
              pb.textContent = (pi + 1) + ": " + (pm.tag || pm.title);
              pb.title = pm.title;
              pb.addEventListener("click", (e) => { e.stopPropagation(); enter(i, pi); toggleIndex(false); });
              pRow.append(pb);
            });
            card.append(pRow);
          }
          card.addEventListener("click", (e) => { e.stopPropagation(); enter(i, 0); toggleIndex(false); });
          grid.append(card);
        });
        body.append(ch, grid);
      });
    }
    [{ id: "ALL", short: "ALL (" + STATIONS.length + ")" }, ...CAT_DEFS].forEach((cd) => {
      const p = document.createElement("button"); p.type = "button"; p.className = "pill";
      p.textContent = cd.short;
      p.setAttribute("aria-pressed", cd.id === "ALL" ? "true" : "false");
      p.addEventListener("click", (e) => {
        e.stopPropagation(); activeCat = cd.id;
        filters.querySelectorAll(".pill").forEach((elP) => elP.setAttribute("aria-pressed", elP === p ? "true" : "false"));
        renderList();
      });
      filters.append(p);
    });
    renderList();
    el.index.replaceChildren(h, filters, body);
    el.index.addEventListener("click", (e) => { if (e.target === el.index) toggleIndex(false); });
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssW = window.innerWidth; cssH = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));
    aspect = cssW / Math.max(1, cssH);
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener("resize", resize);
  resize();

  function drawGlBuf(arr, count) {
    if (!count) return;
    gl.bufferData(gl.ARRAY_BUFFER, arr.subarray(0, count * 7), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12);
    gl.drawArrays(gl.TRIANGLES, 0, count);
  }

  function flush() {
    if (gl && prog) {
      gl.clearColor(0.020, 0.024, 0.035, 1.0);
      gl.clearDepth(1.0);
      gl.depthMask(true);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniform1f(uAspect, aspect);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      // Pass 1: Opaque 3D occlusion surface into Hardware Z-Buffer (polygonOffset nudges mask slightly behind wires)
      if (vnMask > 0) {
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(true);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(2.5, 4.0);
        drawGlBuf(vbufMask, vnMask);
        gl.disable(gl.POLYGON_OFFSET_FILL);
      }
      // Pass 2: Crisp 3D wireframe & glowing contours tested pixel-accurately against Hardware Z-Buffer
      if (vnWire > 0) {
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(false);
        drawGlBuf(vbufWire, vnWire);
      }
      // Pass 3: 2D plots, pins, HUD labels & host clipping frame cleanly on top
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(true);
      drawGlBuf(vbuf, vn);
      vn = 0; vnMask = 0; vnWire = 0;
    } else if (ctx2d) {
      const W = canvas.width, H = canvas.height;
      ctx2d.fillStyle = "#050609"; ctx2d.fillRect(0, 0, W, H);
      const sx = (x) => ((x / aspect) * 0.5 + 0.5) * W, sy = (y) => (0.5 - y * 0.5) * H;
      for (let i = 0; i < fills.length; i += 8) {
        ctx2d.fillStyle = `rgba(${fills[i + 4] * 255 | 0},${fills[i + 5] * 255 | 0},${fills[i + 6] * 255 | 0},${fills[i + 7]})`;
        const x0 = sx(fills[i]), y0 = sy(fills[i + 1] + fills[i + 3]);
        ctx2d.fillRect(x0, y0, sx(fills[i] + fills[i + 2]) - x0, sy(fills[i + 1]) - y0);
      }
      for (let i = 0; i < cmds2d.length; i++) {
        const cmd = cmds2d[i];
        if (cmd[0] === 1) {
          const poly = cmd[1];
          ctx2d.fillStyle = `rgba(${cmd[2] * 255 | 0},${cmd[3] * 255 | 0},${cmd[4] * 255 | 0},${cmd[5]})`;
          ctx2d.beginPath();
          ctx2d.moveTo(sx(poly[0][0]), sy(poly[0][1]));
          for (let k = 1; k < poly.length; k++) ctx2d.lineTo(sx(poly[k][0]), sy(poly[k][1]));
          ctx2d.closePath(); ctx2d.fill();
        } else {
          ctx2d.strokeStyle = `rgba(${cmd[5] * 255 | 0},${cmd[6] * 255 | 0},${cmd[7] * 255 | 0},${cmd[8]})`;
          ctx2d.lineWidth = cmd[9]; ctx2d.beginPath();
          ctx2d.moveTo(sx(cmd[1]), sy(cmd[2])); ctx2d.lineTo(sx(cmd[3]), sy(cmd[4])); ctx2d.stroke();
        }
      }
      segs.length = 0; fills.length = 0; cmds2d.length = 0;
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    const stepDt = paused || reduced ? 0 : dt;
    simTime += stepDt; dwell += stepDt;
    const padTop = Math.min(0.32, 118 / Math.max(240, cssH) * 2);
    const padBot = Math.min(0.22, 68 / Math.max(240, cssH) * 2);
    const box = { left: -aspect * 0.965, right: aspect * 0.965, bot: -1 + padBot, top: 1 - padTop };
    vn = 0; vnMask = 0; vnWire = 0; segs.length = 0; fills.length = 0; cmds2d.length = 0;
    CLIP = box;
    const ro = STATIONS[index].draw(viewOf(box), sim, simTime, stepDt, partIdx) || [];
    CLIP = null;
    drawClipFrame(box);
    flush();
    if (now - lastDom > 110) {
      lastDom = now;
      el.bar.style.width = ((index + 1) / STATIONS.length * 100).toFixed(1) + "%";
      el.readout.replaceChildren(...ro.map(([k, v]) => {
        const sp = document.createElement("span");
        const sk = document.createElement("span"); sk.className = "k"; sk.textContent = k;
        sp.append(sk, document.createTextNode(v));
        return sp;
      }));
    }
    requestAnimationFrame(frame);
  }

  document.getElementById("prev").addEventListener("click", () => enter(index - 1));
  document.getElementById("next").addEventListener("click", () => enter(index + 1));
  document.getElementById("hold").addEventListener("click", togglePause);
  document.getElementById("idx").addEventListener("click", () => toggleIndex());
  document.getElementById("btn-help").addEventListener("click", () => toggleLegend());
  const btnMeshDec = document.getElementById("mesh-dec");
  const btnMeshInc = document.getElementById("mesh-inc");
  const btnHlr = document.getElementById("hlr");
  const btnCamRst = document.getElementById("cam-rst");
  function toggleHlr() {
    hlrOn = !hlrOn;
    if (btnHlr) btnHlr.setAttribute("aria-pressed", hlrOn ? "true" : "false");
  }
  if (btnMeshDec) btnMeshDec.addEventListener("click", () => stepMesh(-1));
  if (btnMeshInc) btnMeshInc.addEventListener("click", () => stepMesh(1));
  if (el.meshLbl) el.meshLbl.addEventListener("click", resetMesh);
  if (btnHlr) btnHlr.addEventListener("click", toggleHlr);
  if (btnCamRst) btnCamRst.addEventListener("click", resetCam);
  elLegend.addEventListener("click", (e) => { if (e.target === elLegend) toggleLegend(false); });

  // 3D CAD Mouse Controls: Left-drag = Orbit, Right/Middle/Shift+Left-drag = Pan, Wheel = Zoom, DblClick = Reset
  if (canvas && canvas.style) canvas.style.cursor = "grab";
  window.addEventListener("contextmenu", (e) => { if (!e.target.closest("button, a, nav, aside")) e.preventDefault(); });
  window.addEventListener("wheel", (e) => {
    if (indexOpen || elLegend.classList.contains("open")) return;
    if (e.target.closest("nav, aside")) return;
    e.preventDefault();
    CAM.zoom = Math.max(0.30, Math.min(5.0, CAM.zoom * Math.exp(-e.deltaY * 0.0014)));
  }, { passive: false });
  window.addEventListener("pointerdown", (e) => {
    if (indexOpen || elLegend.classList.contains("open")) return;
    if (e.target.closest("button, a, nav, aside, .nav-edge")) return;
    const isPan = e.button === 2 || e.button === 1 || e.shiftKey;
    CAM.dragMode = isPan ? "pan" : "orbit";
    CAM.lastX = e.clientX; CAM.lastY = e.clientY;
    if (canvas && canvas.style) canvas.style.cursor = "grabbing";
  });
  window.addEventListener("pointermove", (e) => {
    if (!CAM.dragMode) return;
    const dx = e.clientX - CAM.lastX, dy = e.clientY - CAM.lastY;
    CAM.lastX = e.clientX; CAM.lastY = e.clientY;
    if (CAM.dragMode === "orbit") {
      CAM.userOrbited = true;
      CAM.yaw += dx * 0.0075;
      CAM.pitch = Math.max(-0.42, Math.min(0.86, CAM.pitch + dy * 0.006));
    } else {
      // 1:1 CAD screen-to-world-plane pan rotated by inverse camera yaw
      const scale = 2.6 / (Math.max(240, cssH) * CAM.zoom);
      const sx = -dx * scale, sy = dy * scale;
      const cy = Math.cos(CAM.effYaw), syw = Math.sin(CAM.effYaw);
      CAM.panU += sx * cy + sy * syw;
      CAM.panV += -sx * syw + sy * cy;
      CAM.panX += (dx / Math.max(240, cssH)) * 2.0;
      CAM.panY -= (dy / Math.max(240, cssH)) * 2.0;
    }
  });
  window.addEventListener("pointerup", () => {
    CAM.dragMode = null;
    if (canvas && canvas.style) canvas.style.cursor = "grab";
  });
  window.addEventListener("dblclick", (e) => {
    if (!e.target.closest("button, a, nav, aside, .nav-edge")) resetCam();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") enter(index + 1);
    else if (e.key === "ArrowLeft") enter(index - 1);
    else if (e.key === "ArrowDown") { e.preventDefault(); selectPart(partIdx + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); selectPart(partIdx - 1); }
    else if (e.key === "[" || e.key === "-" || e.key === "_") stepMesh(-1);
    else if (e.key === "]" || e.key === "+" || e.key === "=") stepMesh(1);
    else if (e.key === "o" || e.key === "O") toggleHlr();
    else if (e.key === "r" || e.key === "R") resetCam();
    else if (e.key === " ") { e.preventDefault(); togglePause(); }
    else if (e.key === "i" || e.key === "I" || e.key === "Tab") { e.preventDefault(); toggleIndex(); }
    else if (e.key === "?" || e.key === "h" || e.key === "H") { e.preventDefault(); toggleLegend(); }
    else if (e.key === "Escape") { toggleIndex(false); toggleLegend(false); }
    else if (e.key >= "1" && e.key <= "9") {
      const p = parseInt(e.key, 10) - 1;
      if (p < (STATIONS[index].parts || 1)) selectPart(p);
    }
  });

  updateMeshLabel();
  buildIndex();
  renderChrome();
  requestAnimationFrame(frame);
