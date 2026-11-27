"use strict";
// ============================================================================
// HAL 9000 // JAHNKE–EMDE–LÖSCH SPECIAL FUNCTIONS MODULE (7th Ed. Atlas)
// 14 Special Function Sections: 3D Best-Selling Panoramas + 2D Map & Integral Studies
// ============================================================================

const EULER_GAMMA = 0.5772156649015329;

// 16-point Gauss-Legendre nodes & weights on [-1, 1]
const GL16_X = [
  -0.9894009349916499, -0.9445750230732326, -0.8656312023878318, -0.7554044083550030,
  -0.6178762444026438, -0.4580167776572274, -0.2816035507792589, -0.0950125098376374,
   0.0950125098376374,  0.2816035507792589,  0.4580167776572274,  0.6178762444026438,
   0.7554044083550030,  0.8656312023878318,  0.9445750230732326,  0.9894009349916499,
];
const GL16_W = [
   0.0271524594117541,  0.0622535239386479,  0.0951585116824928,  0.1246289712555339,
   0.1495959888165767,  0.1691565193950025,  0.1826034150449236,  0.1894506104550685,
   0.1894506104550685,  0.1826034150449236,  0.1691565193950025,  0.1495959888165767,
   0.1246289712555339,  0.0951585116824928,  0.0622535239386479,  0.0271524594117541,
];

function glQuad(fn, a, b) {
  const m = 0.5 * (a + b), h = 0.5 * (b - a);
  let s = 0;
  for (let i = 0; i < 16; i++) s += GL16_W[i] * fn(m + h * GL16_X[i]);
  return s * h;
}

// ----------------------------------------------------------------------------
// 2D SCIENTIFIC PLOT HELPERS (HAL 9000 CRT Grid, Ticks, Curves & Boxed Legend)
// ----------------------------------------------------------------------------
function makePlot2D(V, xMin, xMax, yMin, yMax, opts) {
  const W = V.w * 0.95;
  const legW = Math.max(0.64, Math.min(0.86, W * 0.40));
  const gap = 0.07;
  let x0 = -W + 0.08;
  let x1 = W - legW - gap;
  let y0 = -0.82, y1 = 0.82;
  // Optional 1:1 isotropic scaling (for conformal maps like Höhenkarte so 90° angles are exact!)
  if (opts && opts.iso) {
    const availW = x1 - x0, availH = y1 - y0;
    const dataRatio = (xMax - xMin) / (yMax - yMin);
    if (availW / availH > dataRatio) {
      const targetW = availH * dataRatio;
      const cx = 0.5 * (x0 + x1);
      x0 = cx - targetW * 0.5;
      x1 = cx + targetW * 0.5;
    } else {
      const targetH = availW / dataRatio;
      const cy = 0.5 * (y0 + y1);
      y0 = cy - targetH * 0.5;
      y1 = cy + targetH * 0.5;
    }
  }
  const legX0 = x1 + gap, legX1 = Math.min(W, legX0 + legW);
  const sx = (x) => x0 + ((x - xMin) / (xMax - xMin)) * (x1 - x0);
  const sy = (y) => y0 + ((y - yMin) / (yMax - yMin)) * (y1 - y0);
  // Clip a 2D segment strictly to the functional graphics rectangle [x0, x1] x [y0, y1]
  const plotClip = { left: x0, right: x1, bot: y0, top: y1 };
  const clipDraw = (ax, ay, bx, by, col, lw) => {
    const cl = clipLine(ax, ay, bx, by, plotClip);
    if (cl) V.line(cl[0], cl[1], cl[2], cl[3], col, lw);
  };
  return {
    x0, x1, y0, y1, xMin, xMax, yMin, yMax, sx, sy,
    axes(xStep, yStep, xLbl, yLbl) {
      // Subtle grid inside the plot rectangle
      if (xStep > 0) {
        const k0 = Math.ceil(xMin / xStep), k1 = Math.floor(xMax / xStep);
        for (let k = k0; k <= k1; k++) {
          const x = sx(k * xStep);
          V.line(x, y0, x, y1, k === 0 ? [0.48, 0.54, 0.64, 0.65] : [0.22, 0.26, 0.34, 0.34], k === 0 ? 1.3 : 0.8);
        }
      }
      if (yStep > 0) {
        const k0 = Math.ceil(yMin / yStep), k1 = Math.floor(yMax / yStep);
        for (let k = k0; k <= k1; k++) {
          const y = sy(k * yStep);
          V.line(x0, y, x1, y, k === 0 ? [0.48, 0.54, 0.64, 0.65] : [0.22, 0.26, 0.34, 0.34], k === 0 ? 1.3 : 0.8);
        }
      }
      // Crisp squared frame border
      const fr = [0.42, 0.56, 0.68, 0.55];
      V.line(x0, y0, x1, y0, fr, 1.2);
      V.line(x0, y1, x1, y1, fr, 1.2);
      V.line(x0, y0, x0, y1, fr, 1.2);
      V.line(x1, y0, x1, y1, fr, 1.2);
      if (xLbl) V.text(xLbl, x1 - xLbl.length * 0.032 - 0.02, y0 + 0.062, 0.038, COL.dim);
      if (yLbl) V.text(yLbl, x0 + 0.025, y1 - 0.02, 0.038, COL.dim);
    },
    curve(fn, col, lw, N, xA, xB) {
      const n = N || 180, a = xA == null ? xMin : xA, b = xB == null ? xMax : xB;
      let px = 0, py = 0, valid = false;
      for (let i = 0; i <= n; i++) {
        const xv = a + (i / n) * (b - a);
        const yv = fn(xv);
        if (!Number.isFinite(yv) || yv < yMin - (yMax - yMin) * 1.2 || yv > yMax + (yMax - yMin) * 1.2) {
          valid = false;
          continue;
        }
        const x = sx(xv), y = sy(yv);
        if (valid && Math.abs(y - py) < 0.85) clipDraw(px, py, x, y, col, lw || 1.8);
        px = x; py = y; valid = true;
      }
    },
    parametric(fn, t0, t1, col, lw, N) {
      const n = N || 140;
      let px = 0, py = 0, valid = false;
      for (let i = 0; i <= n; i++) {
        const pt = fn(t0 + (i / n) * (t1 - t0));
        if (!pt || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) { valid = false; continue; }
        const x = sx(pt[0]), y = sy(pt[1]);
        if (valid && Math.hypot(x - px, y - py) < 0.65) clipDraw(px, py, x, y, col, lw || 1.6);
        px = x; py = y; valid = true;
      }
    },
    // 2D Marching-Squares iso-contour plotter for Jahnke–Emde Höhenkarten (altitude & phase nets)
    contours(gridVals, nx, ny, levels, colFn, lwFn) {
      const dx = (xMax - xMin) / nx, dy = (yMax - yMin) / ny;
      const row = nx + 1;
      for (let li = 0; li < levels.length; li++) {
        const lv = levels[li] + 1e-9, col = typeof colFn === "function" ? colFn(li, levels[li]) : colFn;
        const lw = typeof lwFn === "function" ? lwFn(li, levels[li]) : (lwFn || 1.3);
        for (let j = 0; j < ny; j++) {
          const yA = yMin + j * dy, yB = yA + dy;
          for (let i = 0; i < nx; i++) {
            const xA = xMin + i * dx, xB = xA + dx;
            const v0 = gridVals[j * row + i] - lv;
            const v1 = gridVals[j * row + i + 1] - lv;
            const v2 = gridVals[(j + 1) * row + i + 1] - lv;
            const v3 = gridVals[(j + 1) * row + i] - lv;
            if (!Number.isFinite(v0) || !Number.isFinite(v1) || !Number.isFinite(v2) || !Number.isFinite(v3)) continue;
            const pts = [];
            if ((v0 < 0 && v1 > 0) || (v1 < 0 && v0 > 0)) pts.push([xA + dx * (v0 / (v0 - v1)), yA]);
            if ((v1 < 0 && v2 > 0) || (v2 < 0 && v1 > 0)) pts.push([xB, yA + dy * (v1 / (v1 - v2))]);
            if ((v2 < 0 && v3 > 0) || (v3 < 0 && v2 > 0)) pts.push([xB - dx * (v2 / (v2 - v3)), yB]);
            if ((v3 < 0 && v0 > 0) || (v0 < 0 && v3 > 0)) pts.push([xA, yB - dy * (v3 / (v3 - v0))]);
            if (pts.length === 2) {
              clipDraw(sx(pts[0][0]), sy(pts[0][1]), sx(pts[1][0]), sy(pts[1][1]), col, lw);
            } else if (pts.length === 4) {
              const vc = 0.25 * (v0 + v1 + v2 + v3);
              if ((vc > 0) === (v0 > 0)) {
                clipDraw(sx(pts[0][0]), sy(pts[0][1]), sx(pts[3][0]), sy(pts[3][1]), col, lw);
                clipDraw(sx(pts[1][0]), sy(pts[1][1]), sx(pts[2][0]), sy(pts[2][1]), col, lw);
              } else {
                clipDraw(sx(pts[0][0]), sy(pts[0][1]), sx(pts[1][0]), sy(pts[1][1]), col, lw);
                clipDraw(sx(pts[2][0]), sy(pts[2][1]), sx(pts[3][0]), sy(pts[3][1]), col, lw);
              }
            }
          }
        }
      }
    },
    vline(xv, col, lw) {
      if (xv < xMin || xv > xMax) return;
      const x = sx(xv);
      V.line(x, y0, x, y1, col, lw || 1.0);
    },
    hline(yv, col, lw) {
      if (yv < yMin || yv > yMax) return;
      const y = sy(yv);
      V.line(x0, y, x1, y, col, lw || 1.0);
    },
    dot(xv, yv, r, col) {
      if (!Number.isFinite(yv) || xv < xMin || xv > xMax || yv < yMin || yv > yMax) return;
      V.circ(sx(xv), sy(yv), r || 0.022, col || COL.amber, 2.0, 12);
    },
    legend(items) {
      if (!items || !items.length) return;
      const rowH = 0.088, padX = 0.045, padTop = 0.11, padBot = 0.045;
      const boxH = padTop + items.length * rowH + padBot;
      const top = y1, bot = Math.max(y0, top - boxH);
      const bx0 = legX0, bx1 = legX1;
      // Boxed panel background & border outside the functional graphics rectangle
      V.fill(bx0, bot, bx1 - bx0, top - bot, [0.035, 0.045, 0.068, 0.92]);
      const bCol = [0.42, 0.56, 0.68, 0.52], hiCol = [0.91, 0.64, 0.33, 0.85];
      V.line(bx0, bot, bx1, bot, bCol, 1.1);
      V.line(bx0, top, bx1, top, bCol, 1.1);
      V.line(bx0, bot, bx0, top, bCol, 1.1);
      V.line(bx1, bot, bx1, top, bCol, 1.1);
      // Corner brackets + header
      const tk = 0.032;
      V.line(bx0, top, bx0 + tk, top, hiCol, 1.6); V.line(bx0, top, bx0, top - tk, hiCol, 1.6);
      V.line(bx1, top, bx1 - tk, top, hiCol, 1.6); V.line(bx1, top, bx1, top - tk, hiCol, 1.6);
      V.text("LEGEND", bx0 + padX, top - 0.025, 0.036, COL.dim);
      V.line(bx0 + padX, top - 0.075, bx1 - padX, top - 0.075, [0.42, 0.56, 0.68, 0.28], 0.9);
      // Legend rows
      const maxChars = Math.max(8, Math.floor((bx1 - bx0 - padX * 2 - 0.11) / 0.027));
      let cy = top - padTop;
      for (let i = 0; i < items.length; i++) {
        const [rawLabel, col] = items[i];
        const label = rawLabel.length > maxChars ? rawLabel.slice(0, maxChars) : rawLabel;
        V.line(bx0 + padX, cy - 0.018, bx0 + padX + 0.075, cy - 0.018, col, 2.2);
        V.text(label, bx0 + padX + 0.10, cy, 0.035, col);
        cy -= rowH;
      }
    },
  };
}

// ----------------------------------------------------------------------------
// NUMERICAL KERNELS FOR JAHNKE–EMDE–LÖSCH SPECIAL FUNCTIONS
// ----------------------------------------------------------------------------
const cTan = (z) => cDiv(cSin(z), cCos(z));
const cCot = (z) => cDiv(cCos(z), cSin(z));
const cTanh = (z) => cDiv(cSinh(z), cCosh(z));
const cLog = (z) => [0.5 * Math.log(z[0] * z[0] + z[1] * z[1] + 1e-18), Math.atan2(z[1], z[0])];

// Complex Digamma psi(z) = Gamma'(z)/Gamma(z)
function cDigamma(z) {
  let zr = z[0], zi = z[1];
  let accR = 0, accI = 0;
  if (zr < 0.5) {
    // Reflection: psi(z) = psi(1 - z) - pi * cot(pi * z)
    const cotPz = cCot([Math.PI * zr, Math.PI * zi]);
    const p1 = cDigamma([1 - zr, -zi]);
    return [p1[0] - Math.PI * cotPz[0], p1[1] - Math.PI * cotPz[1]];
  }
  while (zr < 7.0) {
    const d = zr * zr + zi * zi + 1e-14;
    accR -= zr / d;
    accI += zi / d;
    zr += 1.0;
  }
  const lz = cLog([zr, zi]);
  const inv = cDiv([1, 0], [zr, zi]);
  const inv2 = cMul(inv, inv);
  const inv4 = cMul(inv2, inv2);
  const inv6 = cMul(inv4, inv2);
  const r = accR + lz[0] - 0.5 * inv[0] - inv2[0] / 12 + inv4[0] / 120 - inv6[0] / 252;
  const im = accI + lz[1] - 0.5 * inv[1] - inv2[1] / 12 + inv4[1] / 120 - inv6[1] / 252;
  return [r, im];
}

// Lower Incomplete Gamma gamma(a, x) for real a > 0, x >= 0
function gammaIncLower(a, x) {
  if (x <= 0) return 0;
  const ga = cGamma([a, 0])[0];
  if (x < a + 1.0) {
    let ap = a, sum = 1 / a, del = sum;
    for (let n = 1; n <= 40; n++) {
      ap += 1; del *= x / ap; sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-10) break;
    }
    return sum * Math.exp(-x + a * Math.log(x));
  }
  // Lentz continued fraction for upper Gamma(a, x)
  let b = x + 1 - a, c = 1e30, d = 1 / b, h = d;
  for (let i = 1; i <= 40; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-10) break;
  }
  return Math.max(0, ga - Math.exp(-x + a * Math.log(x)) * h);
}

// Real Exponential Integral Ei*(x) (for x > 0) and E1(x) = -Ei(-x) (for x > 0)
function eiStar(x) {
  if (x <= 0) return NaN;
  if (x < 12) {
    let sum = EULER_GAMMA + Math.log(x), term = x;
    for (let k = 1; k <= 40; k++) {
      sum += term / k;
      term *= x / (k + 1);
      if (Math.abs(term) < 1e-11) break;
    }
    return sum;
  }
  let s = 1, t = 1;
  for (let k = 1; k <= 12; k++) { t *= k / x; s += t; }
  return (Math.exp(x) / x) * s;
}
function expIntE1(x) {
  if (x <= 0) return NaN;
  if (x <= 1.0) {
    let sum = -EULER_GAMMA - Math.log(x), term = 1;
    for (let k = 1; k <= 24; k++) {
      term *= -x / k;
      sum -= term / k;
    }
    return sum;
  }
  // Continued fraction
  let b = x + 1, c = 1e30, d = 1 / b, h = d;
  for (let i = 1; i <= 32; i++) {
    const an = -i * i;
    b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; h *= d * c;
    if (Math.abs(d * c - 1) < 1e-10) break;
  }
  return Math.exp(-x) * h;
}

// Complex Exponential Integral E1(z)
function cE1(z) {
  const r = Math.hypot(z[0], z[1]);
  if (r < 1e-5) return [12, 0];
  if (r < 5.5 && (z[0] > -2.5 || Math.abs(z[1]) > 0.5)) {
    const lz = cLog(z);
    let sr = -EULER_GAMMA - lz[0], si = -lz[1];
    let tr = 1, ti = 0;
    for (let k = 1; k <= 28; k++) {
      const nr = (tr * (-z[0]) - ti * (-z[1])) / k;
      const ni = (tr * (-z[1]) + ti * (-z[0])) / k;
      tr = nr; ti = ni;
      sr -= tr / k; si -= ti / k;
    }
    return [sr, si];
  }
  // Continued fraction for |z| >= 5.5 (away from negative real cut)
  let f = [0, 0];
  for (let k = 16; k >= 1; k--) {
    f = cDiv([k, 0], cAdd([1, 0], f));
    f = cDiv([k, 0], cAdd(z, f));
  }
  const ez = cExp([-Math.max(-14, Math.min(14, z[0])), -z[1]]);
  return cMul(ez, cDiv([1, 0], cAdd(z, f)));
}

// Sine & Cosine Integrals Si(x), Ci(x)
function siReal(x) {
  const ax = Math.abs(x);
  if (ax <= 10) {
    let sum = x, term = x;
    for (let k = 1; k <= 28; k++) {
      term *= -(x * x) / ((2 * k) * (2 * k + 1));
      sum += term / (2 * k + 1);
      if (Math.abs(term) < 1e-11) break;
    }
    return sum;
  }
  const inv = 1 / ax, inv2 = inv * inv;
  const f = inv * (1 - 2 * inv2 + 24 * inv2 * inv2);
  const g = inv2 * (1 - 6 * inv2 + 120 * inv2 * inv2);
  const res = Math.PI * 0.5 - f * Math.cos(ax) - g * Math.sin(ax);
  return x >= 0 ? res : -res;
}
function ciReal(x) {
  if (x <= 0) return NaN;
  if (x <= 10) {
    let sum = EULER_GAMMA + Math.log(x), term = 1;
    for (let k = 1; k <= 28; k++) {
      term *= -(x * x) / ((2 * k - 1) * (2 * k));
      sum += term / (2 * k);
      if (Math.abs(term) < 1e-11) break;
    }
    return sum;
  }
  const inv = 1 / x, inv2 = inv * inv;
  const f = inv * (1 - 2 * inv2 + 24 * inv2 * inv2);
  const g = inv2 * (1 - 6 * inv2 + 120 * inv2 * inv2);
  return f * Math.sin(x) - g * Math.cos(x);
}

// Fresnel Integrals C(x), S(x)
function fresnelCS(x) {
  const ax = Math.abs(x), sgn = x < 0 ? -1 : 1;
  if (ax < 3.6) {
    const c = glQuad((t) => Math.cos(Math.PI * 0.5 * t * t), 0, ax);
    const s = glQuad((t) => Math.sin(Math.PI * 0.5 * t * t), 0, ax);
    return [sgn * c, sgn * s];
  }
  const p = Math.PI * ax, p2 = p * ax;
  const f = 1 / (Math.PI * ax) * (1 - 3 / (p2 * p2));
  const g = 1 / (Math.PI * Math.PI * ax * ax * ax) * (1 - 15 / (p2 * p2));
  const arg = 0.5 * Math.PI * ax * ax;
  return [sgn * (0.5 + f * Math.sin(arg) - g * Math.cos(arg)), sgn * (0.5 - f * Math.cos(arg) - g * Math.sin(arg))];
}

// Full-plane Riemann Zeta via log-space functional equation for Re(s) < 0.25 (zero overflow at large |Im(s)|!)
function cZetaFull(s) {
  if (s[0] >= 0.25) return cZeta(s);
  const oneMinusS = [1 - s[0], -s[1]];
  const z1 = cZeta(oneMinusS);
  const mz1 = Math.hypot(z1[0], z1[1]);
  if (mz1 < 1e-14) return [0, 0];
  const lg1 = cLogGamma(oneMinusS);
  const ls = cLogSin([Math.PI * 0.5 * s[0], Math.PI * 0.5 * s[1]]);
  const logMag = s[0] * Math.LN2 + (s[0] - 1) * Math.log(Math.PI) + ls[0] + lg1[0] + Math.log(mz1);
  const ang = wrapPi(s[1] * Math.LN2 + s[1] * Math.log(Math.PI) + ls[1] + lg1[1] + Math.atan2(z1[1], z1[0]));
  const m = Math.exp(Math.max(-65, Math.min(65, logMag)));
  return [m * Math.cos(ang), m * Math.sin(ang)];
}

// Complete Elliptic Integrals K(k), E(k) via AGM
function ellipKE(k) {
  const k2 = Math.min(0.999999, k * k);
  let a = 1.0, b = Math.sqrt(1 - k2), c = Math.abs(k);
  let sumC = 0.5 * c * c, pow2 = 1;
  for (let i = 0; i < 8; i++) {
    const an = 0.5 * (a + b), bn = Math.sqrt(a * b), cn = 0.5 * (a - b);
    pow2 *= 2; sumC += pow2 * cn * cn * 0.5;
    a = an; b = bn; c = cn;
    if (c < 1e-12) break;
  }
  const K = Math.PI / (2 * a);
  const E = K * (1 - sumC);
  return [K, E];
}

// Incomplete Elliptic Integrals F(phi, k), E(phi, k), Pi(n; phi, k)
function ellipFE(phi, k) {
  const k2 = Math.min(0.99999, k * k);
  const F = glQuad((t) => 1 / Math.sqrt(Math.max(1e-9, 1 - k2 * Math.sin(t) * Math.sin(t))), 0, phi);
  const E = glQuad((t) => Math.sqrt(Math.max(1e-9, 1 - k2 * Math.sin(t) * Math.sin(t))), 0, phi);
  return [F, E];
}
function ellipPi(n, phi, k) {
  const k2 = Math.min(0.99999, k * k);
  return glQuad((t) => {
    const s2 = Math.sin(t) * Math.sin(t);
    return 1 / ((1 - n * s2) * Math.sqrt(Math.max(1e-9, 1 - k2 * s2)));
  }, 0, phi);
}

// Real Jacobi Elliptic Functions sn, cn, dn, am via Descending Landen Transform
function jacobiReal(u, k) {
  const k2 = Math.min(0.999999, k * k);
  const a = [1], b = [Math.sqrt(1 - k2)], c = [Math.abs(k)];
  let n = 0;
  while (c[n] > 1e-10 && n < 10) {
    a.push(0.5 * (a[n] + b[n]));
    b.push(Math.sqrt(a[n] * b[n]));
    c.push(0.5 * (a[n] - b[n]));
    n++;
  }
  let phi = (1 << n) * a[n] * u;
  for (let i = n; i >= 1; i--) {
    phi = 0.5 * (phi + Math.asin(Math.max(-1, Math.min(1, (c[i] / a[i]) * Math.sin(phi)))));
  }
  const sn = Math.sin(phi), cn = Math.cos(phi), dn = Math.sqrt(Math.max(0, 1 - k2 * sn * sn));
  return { sn, cn, dn, am: phi };
}

// Complex Jacobi sn(u + iv, k) via Addition Formula
function cJacobiSN(z, k) {
  const kp = Math.sqrt(Math.max(1e-6, 1 - k * k));
  const r = jacobiReal(z[0], k);
  const i = jacobiReal(z[1], kp);
  const d = i.cn * i.cn + k * k * r.sn * r.sn * i.sn * i.sn + 1e-9;
  return [(r.sn * i.dn) / d, (r.cn * r.dn * i.sn * i.cn) / d];
}

// Real Jacobi Theta Functions theta_1..theta_4(v, q)
function jacobiThetas(v, q) {
  let t1 = 0, t2 = 0, t3 = 1, t4 = 1;
  const q14 = Math.pow(q, 0.25);
  for (let n = 0; n < 7; n++) {
    const qn = Math.pow(q, n * (n + 1)) * q14;
    const sgn = (n & 1) ? -1 : 1;
    t1 += 2 * sgn * qn * Math.sin((2 * n + 1) * v);
    t2 += 2 * qn * Math.cos((2 * n + 1) * v);
  }
  for (let n = 1; n <= 7; n++) {
    const qn = 2 * Math.pow(q, n * n);
    t3 += qn * Math.cos(2 * n * v);
    t4 += ((n & 1) ? -qn : qn) * Math.cos(2 * n * v);
  }
  return [t1, t2, t3, t4];
}

// Orthogonal Polynomials: Chebyshev, Laguerre, Hermite, Legendre P_n, Q_n, P_l^m
function chebT(n, x) {
  if (n === 0) return 1; if (n === 1) return x;
  let a = 1, b = x;
  for (let k = 2; k <= n; k++) { const c = 2 * x * b - a; a = b; b = c; }
  return b;
}
function chebU(n, x) {
  if (n === 0) return 1; if (n === 1) return 2 * x;
  let a = 1, b = 2 * x;
  for (let k = 2; k <= n; k++) { const c = 2 * x * b - a; a = b; b = c; }
  return b;
}
function cChebT(n, z) {
  let a = [1, 0], b = [z[0], z[1]];
  if (n === 0) return a; if (n === 1) return b;
  for (let k = 2; k <= n; k++) {
    const t = cMul(z, b);
    const c = [2 * t[0] - a[0], 2 * t[1] - a[1]];
    a = b; b = c;
  }
  return b;
}
function laguerreL(n, x) {
  if (n === 0) return 1; if (n === 1) return 1 - x;
  let a = 1, b = 1 - x;
  for (let k = 1; k < n; k++) { const c = ((2 * k + 1 - x) * b - k * a) / (k + 1); a = b; b = c; }
  return b;
}
function hermiteH(n, x) {
  if (n === 0) return 1; if (n === 1) return 2 * x;
  let a = 1, b = 2 * x;
  for (let k = 2; k <= n; k++) { const c = 2 * x * b - 2 * (k - 1) * a; a = b; b = c; }
  return b;
}
function legendreP(n, x) {
  if (n === 0) return 1; if (n === 1) return x;
  let a = 1, b = x;
  for (let k = 2; k <= n; k++) { const c = ((2 * k - 1) * x * b - (k - 1) * a) / k; a = b; b = c; }
  return b;
}
function legendreQ(n, x) {
  if (Math.abs(x) >= 0.9995) return NaN;
  const q0 = 0.5 * Math.log((1 + x) / (1 - x));
  if (n === 0) return q0;
  const q1 = x * q0 - 1;
  if (n === 1) return q1;
  let a = q0, b = q1;
  for (let k = 2; k <= n; k++) { const c = ((2 * k - 1) * x * b - (k - 1) * a) / k; a = b; b = c; }
  return b;
}

// Bessel Y_n(x), Modified I_n(x), K_n(x), Kelvin ber/bei, Struve H_n(x), Complex J0(z)
function besselY0(x) {
  if (x <= 1e-4) return NaN;
  if (x > 8.5) return Math.sqrt(2 / (Math.PI * x)) * Math.sin(x - Math.PI * 0.25);
  const j0 = besselJ(0, x);
  let sum = 0, term = 1, h = 0;
  for (let k = 1; k <= 16; k++) {
    term *= -(x * x * 0.25) / (k * k);
    h += 1 / k;
    sum += term * h;
  }
  return (2 / Math.PI) * ((Math.log(0.5 * x) + EULER_GAMMA) * j0 - sum);
}
function besselY1(x) {
  if (x <= 1e-4) return NaN;
  if (x > 8.5) return Math.sqrt(2 / (Math.PI * x)) * Math.sin(x - 0.75 * Math.PI);
  const j1 = besselJ(1, x);
  let sum = 0, term = 0.5 * x, h = 0;
  for (let k = 0; k <= 15; k++) {
    if (k > 0) { term *= -(x * x * 0.25) / (k * (k + 1)); h += 1 / k; }
    sum += term * (2 * h + 1 / (k + 1));
  }
  return (2 / Math.PI) * ((Math.log(0.5 * x) + EULER_GAMMA) * j1 - 1 / x - 0.5 * sum);
}
function besselI(n, x) {
  let sum = 0, term = Math.pow(0.5 * x, n) / (n <= 1 ? 1 : 2);
  for (let k = 0; k <= 20; k++) { sum += term; term *= (x * x * 0.25) / ((k + 1) * (k + 1 + n)); }
  return sum;
}
function besselK0(x) {
  if (x <= 1e-4) return NaN;
  if (x > 4.5) return Math.sqrt(Math.PI / (2 * x)) * Math.exp(-x) * (1 - 1 / (8 * x) + 9 / (128 * x * x));
  const i0 = besselI(0, x);
  let sum = 0, term = 1, h = 0;
  for (let k = 1; k <= 16; k++) { term *= (x * x * 0.25) / (k * k); h += 1 / k; sum += term * h; }
  return -(Math.log(0.5 * x) + EULER_GAMMA) * i0 + sum;
}
function besselK1(x) {
  if (x <= 1e-4) return NaN;
  if (x > 4.5) return Math.sqrt(Math.PI / (2 * x)) * Math.exp(-x) * (1 + 3 / (8 * x) - 15 / (128 * x * x));
  const i1 = besselI(1, x);
  let sum = 0, term = 0.5 * x, h = 0;
  for (let k = 0; k <= 15; k++) {
    if (k > 0) { term *= (x * x * 0.25) / (k * (k + 1)); h += 1 / k; }
    sum += term * (2 * h + 1 / (k + 1));
  }
  return (Math.log(0.5 * x) + EULER_GAMMA) * i1 + 1 / x - 0.5 * sum;
}
function kelvinBerBei(x) {
  let ber = 1, bei = 0, t = 1;
  const x2 = 0.25 * x * x;
  for (let k = 1; k <= 14; k++) {
    t *= x2 / (k * k);
    if ((k & 3) === 1) bei += t;
    else if ((k & 3) === 2) ber -= t;
    else if ((k & 3) === 3) bei -= t;
    else ber += t;
  }
  return [ber, bei];
}
function struveH0(x) {
  if (x > 9.0) return besselY0(x) + (2 / Math.PI) * (1 / x - 1 / (x * x * x));
  let sum = 0, term = (2 / Math.PI) * x;
  for (let k = 0; k <= 18; k++) {
    sum += term;
    const d = 2 * k + 3;
    term *= -(x * x) / (d * d);
  }
  return sum;
}
function cBesselJ0(z) {
  const z2 = cMul(z, z);
  const q = [-0.25 * z2[0], -0.25 * z2[1]];
  let sr = 1, si = 0, tr = 1, ti = 0;
  for (let k = 1; k <= 18; k++) {
    const k2 = k * k;
    const nr = (tr * q[0] - ti * q[1]) / k2;
    const ni = (tr * q[1] + ti * q[0]) / k2;
    tr = nr; ti = ni;
    sr += tr; si += ti;
  }
  return [sr, si];
}

// Mathieu Monodromy Trace (Ince-Strutt stability) & Periodic ce_n, se_n
function mathieuTrace(a, q) {
  // Integrate y'' + (a - 2q cos 2t) y = 0 over [0, pi] for two fundamental solutions
  const N = 16, h = Math.PI / N;
  let y1 = 1, v1 = 0, y2 = 0, v2 = 1;
  for (let i = 0; i < N; i++) {
    const t0 = i * h, tm = t0 + 0.5 * h, t1 = t0 + h;
    const p0 = -(a - 2 * q * Math.cos(2 * t0));
    const pm = -(a - 2 * q * Math.cos(2 * tm));
    const p1 = -(a - 2 * q * Math.cos(2 * t1));
    // RK4 for pair 1
    let k1y = v1, k1v = p0 * y1;
    let k2y = v1 + 0.5 * h * k1v, k2v = pm * (y1 + 0.5 * h * k1y);
    let k3y = v1 + 0.5 * h * k2v, k3v = pm * (y1 + 0.5 * h * k2y);
    let k4y = v1 + h * k3v, k4v = p1 * (y1 + h * k3y);
    y1 += (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
    v1 += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    // RK4 for pair 2
    k1y = v2; k1v = p0 * y2;
    k2y = v2 + 0.5 * h * k1v; k2v = pm * (y2 + 0.5 * h * k1y);
    k3y = v2 + 0.5 * h * k2v; k3v = pm * (y2 + 0.5 * h * k2y);
    k4y = v2 + h * k3v; k4v = p1 * (y2 + h * k3y);
    y2 += (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
    v2 += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
  }
  return y1 + v2; // |Trace| <= 2 => stable; |Trace| > 2 => unstable tongue!
}

// Characteristic curves a_n(q), b_n(q) (accurate asymptotic/series from Jahnke-Emde-Lösch Ch. X.2)
function mathieuCharA(n, q) {
  const q2 = q * q, q3 = q2 * q, q4 = q2 * q2;
  if (n === 0) return -0.5 * q2 + (7 / 128) * q4;
  if (n === 1) return 1 + q - 0.125 * q2 - (1 / 64) * q3 - (1 / 1536) * q4;
  if (n === 2) return 4 + (5 / 12) * q2 - (763 / 13824) * q4;
  if (n === 3) return 9 + (1 / 16) * q2 + (1 / 64) * q3 + (13 / 20480) * q4;
  return n * n + q2 / (2 * (n * n - 1));
}
function mathieuCharB(n, q) {
  const q2 = q * q, q3 = q2 * q, q4 = q2 * q2;
  if (n === 1) return 1 - q - 0.125 * q2 + (1 / 64) * q3 - (1 / 1536) * q4;
  if (n === 2) return 4 - (1 / 12) * q2 + (5 / 13824) * q4;
  if (n === 3) return 9 + (1 / 16) * q2 - (1 / 64) * q3 + (13 / 20480) * q4;
  return n * n + q2 / (2 * (n * n - 1));
}
function mathieuCE(n, z, q) {
  if (n === 0) return (1 - 0.5 * q * Math.cos(2 * z) + (q * q / 32) * Math.cos(4 * z)) / Math.sqrt(2);
  if (n === 1) return Math.cos(z) - (q / 8) * Math.cos(3 * z) + (q * q / 64) * (Math.cos(3 * z) + Math.cos(5 * z) / 3);
  return Math.cos(2 * z) + (q / 4) * (1 - Math.cos(4 * z) / 3) + (q * q / 128) * Math.cos(6 * z);
}
function mathieuSE(n, z, q) {
  if (n === 1) return Math.sin(z) - (q / 8) * Math.sin(3 * z) + (q * q / 64) * (-Math.sin(3 * z) + Math.sin(5 * z) / 3);
  return Math.sin(2 * z) - (q / 12) * Math.sin(4 * z) + (q * q / 384) * Math.sin(6 * z);
}

// Complex Confluent Hypergeometric Kummer M(a, c; z) = 1F1(a; c; z)
function cKummerM(a, c, z) {
  // Use Kummer's 1st transformation M(a,c;z) = e^z M(c-a,c;-z) when Re(z) < 0 for stability
  if (z[0] < -1.5) {
    const m = cKummerM(c - a, c, [-z[0], -z[1]]);
    return cMul(cExp([Math.max(-14, Math.min(14, z[0])), z[1]]), m);
  }
  let sr = 1, si = 0, tr = 1, ti = 0;
  for (let k = 0; k < 28; k++) {
    const fac = (a + k) / ((c + k) * (k + 1));
    const nr = (tr * z[0] - ti * z[1]) * fac;
    const ni = (tr * z[1] + ti * z[0]) * fac;
    tr = nr; ti = ni;
    sr += tr; si += ti;
    if (Math.abs(tr) + Math.abs(ti) < 1e-8) break;
  }
  return [sr, si];
}

// Special Functions of Physics (Ch. XII)
function langevinL(x) {
  if (Math.abs(x) < 1e-3) return x / 3 - (x * x * x) / 45;
  return 1 / Math.tanh(x) - 1 / x;
}
function brillouinB(J, x) {
  if (Math.abs(x) < 1e-3) return ((J + 1) / (3 * J)) * x;
  const a = (2 * J + 1) / (2 * J), b = 1 / (2 * J);
  return a / Math.tanh(a * x) - b / Math.tanh(b * x);
}
function planckEinsteinCv(x) {
  if (x < 1e-3) return 1 - (x * x) / 12;
  if (x > 40) return 0;
  const ex = Math.exp(x);
  return (x * x * ex) / ((ex - 1) * (ex - 1));
}
function debyeD3(x) {
  if (x < 1e-2) return 1 - 0.05 * x * x;
  const val = glQuad((t) => {
    if (t < 1e-4) return t * t;
    if (t > 40) return 0;
    const et = Math.exp(t);
    return (t * t * t * t * et) / ((et - 1) * (et - 1));
  }, 0, x);
  return (3 / (x * x * x)) * val;
}

// ============================================================================
// SECTION 1: TRIGONOMETRIC FUNCTIONS (3 Parts: 3D Panorama + 2D Circular + 2D Inverses)
// ============================================================================
function drawTrigSection(V, sim, t, dt, part) {
  const p = (part || 0) % 3;
  if (p === 0) {
    // Part 1: 3D Panoramic Trigonometric Wave Surface z = sin(x) cos(y) + Harmonic Modulation
    const yaw = 0.58 + t * 0.22, pitch = 0.48;
    const ph = t * 0.85;
    drawOpenSurface3D(V, (u, v) => {
      const x = u * 1.45, y = v * 1.45;
      const val = Math.sin(x + ph) * Math.cos(y) * 0.72 + 0.18 * Math.sin(2 * x - y);
      return [val, val >= 0 ? 0.52 + 0.6 * val : -2.35 + 0.6 * val, 0.88];
    }, 52, 52, yaw, pitch, 0.58, null, (u, v) => Math.sin(u * 1.45 + ph) * Math.cos(v * 1.45));
    pin3D(V, (Math.PI * 0.5 - ph % (Math.PI * 2)) / 1.45, 0, 0.75, "MAX +1", yaw, pitch, 0.58, true);
    return [["SURFACE", "SIN(X+T) COS(Y)"], ["PHASE", (ph % (Math.PI * 2)).toFixed(2) + " RAD"], ["MESH", meshMul().toFixed(1) + "X"]];
  } else if (p === 1) {
    // Part 2: 2D Map Study — Circular Functions sin, cos, tan, sec + Unit Circle Projection
    const P = makePlot2D(V, -Math.PI * 2, Math.PI * 2, -2.4, 2.4);
    P.axes(Math.PI * 0.5, 1.0, "X (RAD)", "Y");
    for (let k = -3; k <= 3; k += 2) P.vline(k * Math.PI * 0.5, [0.89, 0.38, 0.29, 0.28], 0.9);
    P.curve((x) => Math.sin(x), COL.amber, 2.2, 220);
    P.curve((x) => Math.cos(x), COL.cyan, 1.9, 220);
    P.curve((x) => Math.tan(x), [0.89, 0.38, 0.29, 0.78], 1.4, 260);
    P.curve((x) => 1 / Math.cos(x), [0.68, 0.58, 0.95, 0.58], 1.2, 240);
    const th = -Math.PI * 1.8 + ((t * 0.95) % (Math.PI * 3.6));
    P.vline(th, [1.0, 0.94, 0.32, 0.45], 1.1);
    P.dot(th, Math.sin(th), 0.024, COL.amber);
    P.dot(th, Math.cos(th), 0.022, COL.cyan);
    P.legend([["SIN(X)", COL.amber], ["COS(X)", COL.cyan], ["TAN(X)", COL.hot], ["SEC(X)", [0.68, 0.58, 0.95, 0.95]]]);
    return [["THETA", th.toFixed(2) + " RAD"], ["SIN / COS", Math.sin(th).toFixed(2) + " / " + Math.cos(th).toFixed(2)], ["TAN", Math.abs(Math.cos(th)) > 0.05 ? Math.tan(th).toFixed(2) : "INF"]];
  } else {
    // Part 3: 2D Map Study — Inverse Trigonometric Branches arcsin, arccos, arctan, arccot
    const P = makePlot2D(V, -4.0, 4.0, -Math.PI * 0.65, Math.PI * 1.15);
    P.axes(1.0, Math.PI * 0.5, "X", "Y (RAD)");
    P.hline(Math.PI * 0.5, [0.50, 0.83, 0.80, 0.30], 0.9);
    P.hline(-Math.PI * 0.5, [0.50, 0.83, 0.80, 0.30], 0.9);
    P.hline(Math.PI, [0.91, 0.64, 0.33, 0.28], 0.9);
    P.curve((x) => Math.asin(x), COL.amber, 2.2, 140, -1, 1);
    P.curve((x) => Math.acos(x), COL.cyan, 2.0, 140, -1, 1);
    P.curve((x) => Math.atan(x), [0.44, 0.92, 0.62, 0.92], 1.9, 200);
    P.curve((x) => Math.PI * 0.5 - Math.atan(x), [0.89, 0.38, 0.29, 0.78], 1.5, 200);
    const xv = Math.sin(t * 0.85);
    P.dot(xv, Math.asin(xv), 0.024, COL.amber);
    P.dot(xv, Math.acos(xv), 0.022, COL.cyan);
    P.dot(xv * 3.2, Math.atan(xv * 3.2), 0.022, [0.44, 0.92, 0.62, 0.95]);
    P.legend([["ARCSIN(X)", COL.amber], ["ARCCOS(X)", COL.cyan], ["ARCTAN(X)", [0.44, 0.92, 0.62, 0.95]], ["ARCCOT(X)", COL.hot]]);
    return [["X", xv.toFixed(3)], ["ARCSIN+ARCCOS", (Math.asin(xv) + Math.acos(xv)).toFixed(3) + " (PI/2)"], ["ARCTAN(3X)", Math.atan(xv * 3.2).toFixed(3)]];
  }
}

// ============================================================================
// SECTION 2: HYPERBOLIC FUNCTIONS (3 Parts: 3D Panorama + 2D Hyperbolic + 2D Inverses/Gudermannian)
// ============================================================================
function drawHyperbolicSection(V, sim, t, dt, part) {
  const p = (part || 0) % 3;
  if (p === 0) {
    // Part 1: 3D Panoramic Hyperbolic Saddle & Catenary Surface z = tanh(x) * sech(y) + cosh relief
    const yaw = 0.60 + t * 0.22, pitch = 0.48;
    const mod = 0.65 + 0.35 * Math.sin(t * 0.55);
    drawOpenSurface3D(V, (u, v) => {
      const x = u * 1.05, y = v * 1.05;
      const z = (Math.sinh(x * 0.9) * Math.cosh(y * 0.7) * 0.26 * mod) + (1 / Math.cosh(Math.hypot(x, y) * 1.1)) * 0.65;
      const cl = Math.max(-1.1, Math.min(1.25, z));
      return [cl - 0.12, Math.atan2(Math.sinh(y), Math.cosh(x)), 0.88];
    }, 52, 52, yaw, pitch, 0.58, null, (u, v) => u * u - v * v - 0.8);
    pin3D(V, 0, 0, 0.55, "SECH(0)=1", yaw, pitch, 0.58, true);
    return [["SURFACE", "SINH/COSH/SECH"], ["MOD", mod.toFixed(2)], ["IDENTITY", "COSH^2-SINH^2=1"]];
  } else if (p === 1) {
    // Part 2: 2D Map Study — sinh, cosh (Catenary), tanh, sech
    const P = makePlot2D(V, -3.2, 3.2, -3.2, 3.8);
    P.axes(1.0, 1.0, "X", "Y");
    P.hline(1.0, [0.50, 0.83, 0.80, 0.30], 0.9);
    P.hline(-1.0, [0.50, 0.83, 0.80, 0.30], 0.9);
    P.curve((x) => Math.cosh(x), COL.amber, 2.3, 200);
    P.curve((x) => Math.sinh(x), COL.cyan, 2.0, 200);
    P.curve((x) => Math.tanh(x), [0.44, 0.92, 0.62, 0.92], 1.9, 200);
    P.curve((x) => 1 / Math.cosh(x), [0.89, 0.38, 0.29, 0.82], 1.6, 200);
    const xv = 2.2 * Math.sin(t * 0.65);
    P.dot(xv, Math.cosh(xv), 0.024, COL.amber);
    P.dot(xv, Math.sinh(xv), 0.022, COL.cyan);
    P.dot(xv, Math.tanh(xv), 0.022, [0.44, 0.92, 0.62, 0.95]);
    P.legend([["COSH(X) CATENARY", COL.amber], ["SINH(X)", COL.cyan], ["TANH(X)", [0.44, 0.92, 0.62, 0.95]], ["SECH(X)", COL.hot]]);
    return [["X", xv.toFixed(2)], ["COSH / SINH", Math.cosh(xv).toFixed(2) + " / " + Math.sinh(xv).toFixed(2)], ["TANH(X)", Math.tanh(xv).toFixed(3)]];
  } else {
    // Part 3: 2D Map Study — Inverse Hyperbolic arsinh, arcosh, artanh & Gudermannian gd(x)
    const P = makePlot2D(V, -4.0, 4.0, -2.6, 2.6);
    P.axes(1.0, 1.0, "X", "Y");
    P.hline(Math.PI * 0.5, [0.91, 0.64, 0.33, 0.30], 0.9);
    P.hline(-Math.PI * 0.5, [0.91, 0.64, 0.33, 0.30], 0.9);
    P.curve((x) => Math.asinh(x), COL.cyan, 2.1, 200);
    P.curve((x) => Math.acosh(x), COL.amber, 2.1, 140, 1.0001, 4.0);
    P.curve((x) => Math.atanh(x), COL.hot, 1.8, 160, -0.995, 0.995);
    P.curve((x) => 2 * Math.atan(Math.exp(x)) - Math.PI * 0.5, [0.44, 0.92, 0.62, 0.95], 2.2, 200);
    const xv = 3.0 * Math.sin(t * 0.6);
    const gd = 2 * Math.atan(Math.exp(xv)) - Math.PI * 0.5;
    P.dot(xv, gd, 0.024, [0.44, 0.92, 0.62, 0.95]);
    P.dot(xv, Math.asinh(xv), 0.022, COL.cyan);
    P.legend([["GD(X) GUDERMANNIAN", [0.44, 0.92, 0.62, 0.95]], ["ARSINH(X)", COL.cyan], ["ARCOSH(X) (X>=1)", COL.amber], ["ARTANH(X) (|X|<1)", COL.hot]]);
    return [["X", xv.toFixed(2)], ["GD(X)", gd.toFixed(3) + " RAD"], ["TAN(GD)=SINH", Math.sinh(xv).toFixed(2)]];
  }
}

// ============================================================================
// SECTION 3: COMPLEX TRIGONOMETRIC & HYPERBOLIC (4 Parts: 3D sin, 3D tan, 3D cosh, 2D Höhenkarte)
// ============================================================================
function drawComplexTrigHypSection(V, sim, t, dt, part) {
  const p = (part || 0) % 4;
  const yaw = 0.60 + t * 0.22, pitch = 0.48;
  if (p === 0) {
    // Part 1: 3D Complex |sin(z)| Relief (snapped to real-axis zeros z = n*pi)
    drawOpenSurface3D(V, (u, v) => {
      const w = cSin([u * 1.55, v * 0.95]);
      return [Math.min(1.25, Math.log(1 + Math.hypot(w[0], w[1])) * 0.52) - 0.38, Math.atan2(w[1], w[0]), 0.88];
    }, 52, 52, yaw, pitch, 0.58, null, null, { uPeriod: Math.PI / 1.55, uPhase: 0, vSnap: 0 });
    pin3D(V, 0, 0, -0.34, "Z=0", yaw, pitch, 0.58, true, COL.cyan);
    pin3D(V, Math.PI / 1.55, 0, -0.34, "Z=PI", yaw, pitch, 0.58, true, COL.cyan);
    pin3D(V, -Math.PI / 1.55, 0, -0.34, "Z=-PI", yaw, pitch, 0.58, true, COL.cyan);
    return [["SURFACE", "|SIN(Z)|"], ["IDENTITY", "SIN(IZ)=I*SINH(Z)"], ["MESH", meshMul().toFixed(1) + "X"]];
  } else if (p === 1) {
    // Part 2: 3D Complex |tan(z)| Relief (snapped to poles (n+1/2)pi and zeros n*pi!)
    drawOpenSurface3D(V, (u, v) => {
      const w = cTan([u * 1.55, v * 0.95]);
      return [Math.min(1.28, Math.log(1 + Math.hypot(w[0], w[1])) * 0.48) - 0.36, Math.atan2(w[1], w[0]), 0.88];
    }, 54, 52, yaw, pitch, 0.58, null, null, { uPeriod: (Math.PI * 0.5) / 1.55, uPhase: 0, vSnap: 0 });
    pin3D(V, (Math.PI * 0.5) / 1.55, 0, 0.92, "Z=PI/2 POLE", yaw, pitch, 0.58, true);
    pin3D(V, (-Math.PI * 0.5) / 1.55, 0, 0.92, "Z=-PI/2 POLE", yaw, pitch, 0.58, true);
    return [["SURFACE", "|TAN(Z)|"], ["POLES", "(N+1/2)*PI"], ["LIMIT IM->INF", "+/- I"]];
  } else if (p === 2) {
    // Part 3: 3D Complex |cosh(z)| Relief (snapped to imaginary-axis zeros i(n+1/2)pi)
    drawOpenSurface3D(V, (u, v) => {
      const w = cCosh([u * 0.95, v * 1.55]);
      return [Math.min(1.25, Math.log(1 + Math.hypot(w[0], w[1])) * 0.52) - 0.38, Math.atan2(w[1], w[0]), 0.88];
    }, 52, 52, yaw, pitch, 0.58, null, null, { uSnap: 0, vPeriod: Math.PI / 1.55, vPhase: (Math.PI * 0.5) / 1.55 });
    pin3D(V, 0, (Math.PI * 0.5) / 1.55, -0.34, "Z=I*PI/2 (0)", yaw, pitch, 0.58, true, COL.cyan);
    pin3D(V, 0, (-Math.PI * 0.5) / 1.55, -0.34, "Z=-I*PI/2 (0)", yaw, pitch, 0.58, true, COL.cyan);
    return [["SURFACE", "|COSH(Z)|"], ["IDENTITY", "COSH(Z)=COS(IZ)"], ["ZEROS", "I*(N+1/2)*PI"]];
  } else {
    // Part 4: 2D Jahnke-Emde Höhenkarte (Isotropic Conformal Altitude & Phase Map of w = sin(z))
    const P = makePlot2D(V, -Math.PI, Math.PI, -2.1, 2.1, { iso: true });
    P.axes(Math.PI * 0.5, 0.5, "RE(Z)", "IM(Z)");
    // 1) Closed constant-modulus ovals |sin(z)| = R < 1 parameterized smoothly around zeros z = 0, +-pi
    for (const R of [0.35, 0.70]) {
      for (const xC of [-Math.PI, 0, Math.PI]) {
        P.parametric((th) => [xC + Math.asin(R * Math.cos(th)), Math.asinh(R * Math.sin(th))], 0, Math.PI * 2, COL.cyan, 1.35, 96);
      }
    }
    // 2) Exact separatrix |sin(z)| = 1 (sinh(y) = +-cos(x), crossing at saddle points z = +-pi/2)
    for (const sgn of [-1, 1]) {
      P.curve((x) => sgn * Math.asinh(Math.abs(Math.cos(x))), COL.amber, 2.2, 240);
    }
    // 3) Open constant-modulus waves |sin(z)| = R > 1
    for (const R of [1.5, 2.2, 3.2]) {
      for (const sgn of [-1, 1]) {
        P.curve((x) => sgn * Math.asinh(Math.sqrt(R * R - Math.sin(x) * Math.sin(x))), COL.cyan, 1.3, 220);
      }
    }
    // 4) Exact constant-phase curves arg(sin z) = phi: tanh(y) = tan(phi) * tan(x)
    for (let k = -5; k <= 5; k++) {
      if (k === 0) continue;
      const tp = Math.tan((k / 12) * Math.PI);
      P.curve((x) => {
        const v = tp * Math.tan(x);
        return Math.abs(v) < 0.992 ? Math.atanh(v) : NaN;
      }, [0.89, 0.38, 0.29, 0.50], 1.0, 260);
    }
    // Live tracer locked EXACTLY onto the amber |sin(z)| = 1 separatrix (sin^2(x) + sinh^2(y) === 1)
    const a = t * 0.85;
    const tx = Math.PI * 0.5 * Math.sin(a);
    const ty = (Math.cos(a) >= 0 ? 1 : -1) * Math.asinh(Math.abs(Math.cos(tx)));
    const wDot = cSin([tx, ty]);
    P.dot(tx, ty, 0.025, COL_STRIPE_YEL);
    P.dot(Math.PI * 0.5, 0, 0.018, COL.amber);
    P.dot(-Math.PI * 0.5, 0, 0.018, COL.amber);
    P.legend([["|SIN(Z)| = 1", COL.amber], ["|SIN(Z)| = CONST", COL.cyan], ["ARG(SIN Z) = PHI", COL.hot], ["TRACER |W| = 1", COL_STRIPE_YEL]]);
    return [["HOHENKARTE", "W = SIN(Z)"], ["Z", tx.toFixed(2) + (ty >= 0 ? "+" : "") + ty.toFixed(2) + "I"], ["|SIN(Z)|", Math.hypot(wDot[0], wDot[1]).toFixed(3)]];
  }
}

// ============================================================================
// SECTION 4: GAMMA, DIGAMMA & BETA FUNCTIONS (Ch. I — 6 Parts)
// ============================================================================
function drawGammaFullSection(V, sim, t, dt, part) {
  const p = (part || 0) % 6;
  const yaw = 0.62 + t * 0.22, pitch = 0.48 + 0.04 * Math.sin(t * 0.35);
  const deg = ((((CAM.userOrbited ? 0.62 : yaw) + CAM.yaw) * 180 / Math.PI) % 360 + 360) % 360;
  const gammaSnap = { uPeriod: 1 / 1.15, uPhase: 0.5 / 1.15, vSnap: 0 };
  if (p === 0) {
    // Part 1: 3D |Gamma(z)| (Jahnke-Emde Fig. 1 — log-space Gamma + smooth trumpet rolloff + pole-lattice snapping!)
    drawOpenSurface3D(V, (u, v) => {
      const lg = cLogGamma([-0.5 + u * 1.15, v * 1.05]);
      const h = lg[0] > 10 ? lg[0] : Math.log(1 + Math.exp(Math.max(-65, lg[0])));
      return [1.30 * Math.tanh(h * 0.44) - 0.36, lg[1], 0.88];
    }, 52, 50, yaw, pitch, 0.58, null, null, gammaSnap);
    for (let k = 0; k >= -4; k--) pin3D(V, (k + 0.5) / 1.15, 0, 0.94, "Z=" + k, yaw, pitch, 0.58, true);
    return [["SURFACE", "|GAMMA(Z)| FIG.1"], ["YAW", deg.toFixed(1) + " DEG"], ["MESH", meshMul().toFixed(1) + "X"]];
  } else if (p === 1) {
    // Part 2: 3D |1 / Gamma(z)| (Jahnke-Emde Fig. 2 — exact log-space reciprocal + zero-lattice snapping!)
    drawOpenSurface3D(V, (u, v) => {
      const lg = cLogGamma([-0.5 + u * 1.15, v * 1.05]);
      const lInv = -lg[0];
      const h = lInv > 10 ? lInv : Math.log(1 + Math.exp(Math.max(-65, lInv)));
      return [Math.min(1.15, h * 0.44) - 0.36, -lg[1], 0.88];
    }, 52, 50, yaw, pitch, 0.58, null, null, gammaSnap);
    for (let k = 0; k >= -3; k--) pin3D(V, (k + 0.5) / 1.15, 0, -0.34, "Z=" + k + " (0)", yaw, pitch, 0.58, true, COL.cyan);
    return [["SURFACE", "|1/GAMMA(Z)| FIG.2"], ["YAW", deg.toFixed(1) + " DEG"], ["ENTIRE", "NO POLES IN C"]];
  } else if (p === 2) {
    // Part 3: 3D Complex Digamma |psi(z)| = |Gamma'(z)/Gamma(z)| (Ch. I.B — snapped to integer poles!)
    drawOpenSurface3D(V, (u, v) => {
      const g = cDigamma([-0.5 + u * 1.15, v * 1.05]);
      return [Math.min(1.26, Math.log(1 + Math.hypot(g[0], g[1])) * 0.48) - 0.36, Math.atan2(g[1], g[0]), 0.88];
    }, 52, 50, yaw, pitch, 0.58, null, null, gammaSnap);
    pin3D(V, (1.4616 + 0.5) / 1.15, 0, -0.34, "ZERO 1.4616", yaw, pitch, 0.58, true, COL.cyan);
    for (let k = 0; k >= -3; k--) pin3D(V, (k + 0.5) / 1.15, 0, 0.90, "POLE " + k, yaw, pitch, 0.58, true);
    return [["SURFACE", "|PSI(Z)| = G'/G"], ["PSI(1)", "-0.5772 (-GAMMA)"], ["MIN G(X)", "X = 1.4616"]];
  } else if (p === 3) {
    // Part 4: 3D Euler Beta |B(z, w)| = |Gamma(z)Gamma(w)/Gamma(z+w)| (Ch. I.A.4 — log-space + pole snapping!)
    const w = [1.45 + 0.35 * Math.cos(t * 0.4), 0.45 * Math.sin(t * 0.4)];
    const lgw = cLogGamma(w);
    drawOpenSurface3D(V, (u, v) => {
      const z = [-0.6 + u * 1.15, v * 1.05];
      const lgz = cLogGamma(z), lgzw = cLogGamma(cAdd(z, w));
      const lr = lgz[0] + lgw[0] - lgzw[0], li = lgz[1] + lgw[1] - lgzw[1];
      const h = lr > 10 ? lr : Math.log(1 + Math.exp(Math.max(-65, lr)));
      return [Math.min(1.22, h * 0.46) - 0.36, li, 0.88];
    }, 52, 50, yaw, pitch, 0.58, null, null, { uPeriod: 1 / 1.15, uPhase: 0.6 / 1.15, vSnap: 0 });
    return [["EULER BETA", "|B(Z, W)|"], ["W", w[0].toFixed(2) + (w[1] >= 0 ? "+" : "") + w[1].toFixed(2) + "I"], ["MESH", meshMul().toFixed(1) + "X"]];
  } else if (p === 4) {
    // Part 5: 2D Map Study — Real Gamma(x), 1/Gamma(x), Digamma psi(x) & Incomplete gamma(a, x) (Ch. I Figs. 4–5)
    const P = makePlot2D(V, -3.6, 4.6, -4.5, 5.5);
    P.axes(1.0, 1.0, "X", "Y");
    for (let k = 0; k >= -3; k--) P.vline(k, [0.89, 0.38, 0.29, 0.30], 0.9);
    P.curve((x) => { const d = Math.abs(x - Math.round(x)); return (x <= 0 && d < 0.03) ? NaN : cGamma([x, 0])[0]; }, COL.amber, 2.2, 260);
    P.curve((x) => cDiv([1, 0], cGamma([x, 0]))[0], COL.cyan, 1.9, 220);
    P.curve((x) => { const d = Math.abs(x - Math.round(x)); return (x <= 0 && d < 0.03) ? NaN : cDigamma([x, 0])[0]; }, [0.89, 0.38, 0.29, 0.85], 1.5, 240);
    const aInc = 1.0 + 1.5 * (0.5 + 0.5 * Math.sin(t * 0.55));
    P.curve((x) => gammaIncLower(aInc, x), [0.44, 0.92, 0.62, 0.92], 1.9, 140, 0.02, 4.6);
    P.dot(1.4616, 0.8856, 0.024, COL_STRIPE_YEL);
    P.legend([["GAMMA(X)", COL.amber], ["1 / GAMMA(X)", COL.cyan], ["DIGAMMA PSI(X)", COL.hot], ["INCOMPLETE GAMMA(A,X)", [0.44, 0.92, 0.62, 0.95]]]);
    return [["MIN GAMMA", "G(1.4616)=0.8856"], ["GAMMA(1/2)", "1.7725 (SQRT PI)"], ["INC A", aInc.toFixed(2)]];
  } else if (p === 5) {
    // Part 6: 2D Jahnke–Emde Fig. 3 Höhenkarte (Exact Altitude & 30°-Phase Conformal Chart of 1/Gamma(z))
    const xMin = -3.2, xMax = 3.8, yMin = -3.0, yMax = 3.0;
    const P = makePlot2D(V, xMin, xMax, yMin, yMax, { iso: true });
    P.axes(1.0, 1.0, "RE(Z)", "IM(Z)");
    const nx = 98, ny = 84;
    const N = (nx + 1) * (ny + 1);
    const logMod = new Float32Array(N);
    const uRe = new Float32Array(N);
    const uIm = new Float32Array(N);
    const phaseBuf = new Float32Array(N);
    for (let j = 0; j <= ny; j++) {
      const y = yMin + (j / ny) * (yMax - yMin);
      for (let i = 0; i <= nx; i++) {
        const x = xMin + (i / nx) * (xMax - xMin);
        const w = cDiv([1, 0], cGamma([x, y]));
        const mag = Math.hypot(w[0], w[1]);
        const invM = mag > 1e-12 ? 1 / mag : 0;
        const idx = j * (nx + 1) + i;
        logMod[idx] = Math.log10(Math.max(1e-6, mag));
        uRe[idx] = w[0] * invM;
        uIm[idx] = w[1] * invM;
      }
    }
    // 1) All 12 conformal phase rays every 30 deg (0, +-30, +-60, +-90, +-120, +-150, +-180)
    for (let k = 0; k < 6; k++) {
      const ang = (k * Math.PI) / 6, ca = Math.cos(ang), sa = Math.sin(ang);
      for (let idx = 0; idx < N; idx++) phaseBuf[idx] = uIm[idx] * ca - uRe[idx] * sa;
      const col = k === 0 ? [0.89, 0.38, 0.29, 0.68] : k === 3 ? [0.44, 0.92, 0.62, 0.56] : [0.89, 0.38, 0.29, 0.30];
      P.contours(phaseBuf, nx, ny, [0], col, k === 0 || k === 3 ? 1.15 : 0.85);
    }
    // 2) Exact J-E-L Fig. 3 altitude levels in log10(|1/Gamma(z)|): 0.2 .. 10000
    const rawLevels = [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.5, 2.0, 3.0, 5.0, 10, 100, 1000, 10000];
    const logLevels = rawLevels.map((v) => Math.log10(v));
    P.contours(
      logMod, nx, ny, logLevels,
      (li) => (li === 4 ? COL.amber : li >= 10 ? [0.50, 0.83, 0.80, 0.72] : COL.cyan),
      (li) => (li === 4 ? 2.2 : 1.15)
    );
    // Fixed zeros at z = 0, -1, -2, -3 and fixed local max at z = 1.4616 (never moving!)
    for (let k = 0; k >= -3; k--) P.dot(k, 0, 0.022, COL_STRIPE_YEL);
    P.dot(1.4616, 0, 0.020, COL.amber);
    P.legend([
      ["|1/GAMMA| = 1.0", COL.amber],
      ["|1/G| 0.2..10000", COL.cyan],
      ["ARG 0, +-180 DEG", COL.hot],
      ["ARG +-90 DEG", [0.44, 0.92, 0.62, 0.95]],
      ["ZEROS 0,-1,-2,-3", COL_STRIPE_YEL],
    ]);
    return [["FIG. 3", "HOHENKARTE 1/G(Z)"], ["LEVELS", "0.2 .. 10000"], ["PHASE", "30 DEG CONFORMAL"]];
  }
}

// ============================================================================
// SECTION 5: INTEGRAL FUNCTIONS — Ei, li, Si, Ci, Erf & Fresnel (Ch. II–III — 5 Parts)
// ============================================================================
function drawIntegralFunctionsSection(V, sim, t, dt, part) {
  const p = (part || 0) % 5;
  const yaw = 0.58 + t * 0.22, pitch = 0.48;
  if (p === 0) {
    // Part 1: 3D Complex Error Function |erf(z)| (Ch. III.1)
    drawOpenSurface3D(V, (u, v) => {
      const w = cErf([u * 1.15, v * 1.15]);
      return [Math.min(1.22, Math.log(1 + Math.hypot(w[0], w[1])) * 0.46) - 0.36, Math.atan2(w[1], w[0]), 0.88];
    }, 52, 50, yaw, pitch, 0.58);
    pin3D(V, 0, 0, -0.34, "ERF(0)=0", yaw, pitch, 0.58, true, COL.cyan);
    return [["SURFACE", "|ERF(Z)| CH.III"], ["STOKES RAYS", "+/- 45 DEG"], ["MESH", meshMul().toFixed(1) + "X"]];
  } else if (p === 1) {
    // Part 2: 3D Complex Exponential Integral |E1(z)| (Ch. II.1)
    drawOpenSurface3D(V, (u, v) => {
      const w = cE1([u * 1.25, v * 1.25]);
      return [Math.min(1.26, Math.log(1 + Math.hypot(w[0], w[1])) * 0.48) - 0.36, Math.atan2(w[1], w[0]), 0.88];
    }, 52, 50, yaw, pitch, 0.58);
    pin3D(V, 0, 0, 0.90, "Z=0 LOG POLE", yaw, pitch, 0.58, true);
    return [["SURFACE", "|E1(Z)| CH.II"], ["BRANCH CUT", "(-INF, 0]"], ["MESH", meshMul().toFixed(1) + "X"]];
  } else if (p === 2) {
    // Part 3: 2D Integral Study — Exponential Integral Ei*(x), E1(x) = -Ei(-x) & Logarithmic Integral li(x) (Ch. II.1)
    const P = makePlot2D(V, 0.02, 4.5, -3.0, 6.0);
    P.axes(1.0, 1.0, "X", "Y");
    P.vline(1.0, [0.89, 0.38, 0.29, 0.35], 1.0);
    P.curve((x) => eiStar(x), COL.amber, 2.2, 200, 0.04, 3.6);
    P.curve((x) => expIntE1(x), COL.cyan, 2.1, 200, 0.04, 4.5);
    P.curve((x) => Math.abs(x - 1) < 0.03 ? NaN : (x > 1 ? eiStar(Math.log(x)) : -expIntE1(-Math.log(x))), [0.44, 0.92, 0.62, 0.92], 1.9, 240, 0.04, 4.5);
    const xv = 0.2 + ((t * 0.65) % 3.4);
    P.dot(xv, eiStar(xv), 0.024, COL.amber);
    P.dot(xv, expIntE1(xv), 0.022, COL.cyan);
    P.legend([["EI*(X)", COL.amber], ["E1(X) = -EI(-X)", COL.cyan], ["LI(X) = EI(LN X)", [0.44, 0.92, 0.62, 0.95]]]);
    return [["X", xv.toFixed(2)], ["EI*(X)", eiStar(xv).toFixed(3)], ["E1(X)", expIntE1(xv).toFixed(3)]];
  } else if (p === 3) {
    // Part 4: 2D Integral Study — Sine & Cosine Integrals Si(x), Ci(x) (Ch. II.2, Tables 5–6)
    const P = makePlot2D(V, 0.05, 16.0, -1.6, 2.2);
    P.axes(Math.PI, 0.5, "X", "Y");
    P.hline(Math.PI * 0.5, [0.91, 0.64, 0.33, 0.35], 1.0);
    P.curve((x) => siReal(x), COL.amber, 2.3, 240, 0.05, 16.0);
    P.curve((x) => ciReal(x), COL.cyan, 2.0, 240, 0.08, 16.0);
    P.dot(Math.PI, siReal(Math.PI), 0.024, COL_STRIPE_YEL);
    const xv = 0.25 + ((t * 2.2) % 15.5);
    P.dot(xv, siReal(xv), 0.022, COL.amber);
    P.dot(xv, ciReal(xv), 0.022, COL.cyan);
    P.legend([["SI(X) -> PI/2", COL.amber], ["CI(X) -> 0", COL.cyan]]);
    return [["X", xv.toFixed(2)], ["SI(X)", siReal(xv).toFixed(3)], ["GIBBS MAX", "SI(PI) = 1.8519"]];
  } else {
    // Part 5: 2D Integral Study — Error Function erf(x), Gaussian & Fresnel Cornu Spiral (C(t), S(t)) (Ch. III)
    const W = V.w * 0.95;
    // Left half: erf(x), erfc(x), Gaussian phi'(x)
    const xL0 = -W + 0.08, xL1 = -0.06, yB = -0.80, yT = 0.80;
    const sxL = (x) => xL0 + ((x + 3.0) / 6.0) * (xL1 - xL0);
    const syL = (y) => yB + ((y + 1.2) / 2.4) * (yT - yB);
    V.line(xL0, syL(0), xL1, syL(0), COL.grid, 1.0);
    V.line(sxL(0), yB, sxL(0), yT, COL.grid, 1.0);
    let px1 = 0, py1 = 0, px2 = 0, py2 = 0;
    for (let i = 0; i <= 140; i++) {
      const xv = -3.0 + (i / 140) * 6.0;
      const ef = cErf([xv, 0])[0], gs = (2 / Math.sqrt(Math.PI)) * Math.exp(-xv * xv);
      const x = sxL(xv), y1 = syL(ef), y2 = syL(gs);
      if (i > 0) { V.line(px1, py1, x, y1, COL.amber, 2.1); V.line(px2, py2, x, y2, COL.cyan, 1.6); }
      px1 = x; py1 = y1; px2 = x; py2 = y2;
    }
    V.text("ERF(X) + GAUSS", xL0 + 0.03, yT - 0.03, 0.044, COL.amber);
    // Right half: Fresnel Cornu Spiral (C(u), S(u))
    const cx = (0.08 + W) * 0.5, cy = 0.0, sc = Math.min((W - 0.14) * 0.54, 0.88);
    V.line(0.06, cy, W, cy, COL.grid, 0.9);
    V.line(cx, yB, cx, yT, COL.grid, 0.9);
    const uMax = 0.4 + ((t * 0.85) % 4.4);
    let qx = 0, qy = 0;
    for (let i = 0; i <= 220; i++) {
      const u = -uMax + (i / 220) * (2 * uMax);
      const [C, S] = fresnelCS(u);
      const x = cx + C * sc, y = cy + S * sc;
      if (i > 0) V.line(qx, qy, x, y, phaseColor(u * 0.85, 0.88), 1.9);
      qx = x; qy = y;
    }
    V.circ(cx + 0.5 * sc, cy + 0.5 * sc, 0.018, COL.amber, 1.8, 10);
    V.circ(cx - 0.5 * sc, cy - 0.5 * sc, 0.018, COL.amber, 1.8, 10);
    V.text("CORNU SPIRAL (C,S)", 0.10, yT - 0.03, 0.044, COL.cyan);
    const [cu, su] = fresnelCS(uMax);
    return [["FRESNEL U", uMax.toFixed(2)], ["C(U) / S(U)", cu.toFixed(3) + " / " + su.toFixed(3)], ["FOCI", "(+-0.5, +-0.5)"]];
  }
}

// ============================================================================
// SECTION 6: RIEMANN ZETA FUNCTION (Ch. IV — 4 Parts: Critical Strip 3D, Pole+Trivial 3D, 2D Spiral, 2D Primes)
// ============================================================================
function drawZetaFullSection(V, sim, t, dt, part) {
  const p = (part || 0) % 4;
  if (p === 0) {
    return drawZeta3D(V, sim, t);
  } else if (p === 1) {
    // Part 2: 3D |zeta(s)| around Simple Pole s = 1 & Trivial Zeros s = -2, -4 (snapped to integer real axis!)
    const yaw = 0.62 + t * 0.20, pitch = 0.48;
    drawOpenSurface3D(V, (u, v) => {
      const s = [-1.2 + u * 1.45, v * 1.65];
      const z = cZetaFull(s);
      return [Math.min(1.26, Math.log(1 + Math.hypot(z[0], z[1])) * 0.48) - 0.36, Math.atan2(z[1], z[0]), 0.88];
    }, 50, 50, yaw, pitch, 0.58, null, null, { uPeriod: 1 / 1.45, uPhase: 1.2 / 1.45, vSnap: 0 });
    pin3D(V, (1 + 1.2) / 1.45, 0, 0.92, "S=1 POLE", yaw, pitch, 0.58, true);
    pin3D(V, (-2 + 1.2) / 1.45, 0, -0.34, "S=-2 (0)", yaw, pitch, 0.58, true, COL.cyan);
    return [["SURFACE", "|ZETA(S)| FULL C"], ["POLE", "S = 1 (RES = 1)"], ["TRIVIAL", "S = -2,-4,-6..."]];
  } else if (p === 2) {
    return drawRiemann2D(V, sim, t, dt, 0);
  } else {
    return drawRiemann2D(V, sim, t, dt, 1);
  }
}

// ============================================================================
// SECTION 7: ELLIPTIC INTEGRALS — ALL KINDS F, E, Pi, K, E (Ch. V — 4 Parts)
// ============================================================================
function drawEllipticIntegralsSection(V, sim, t, dt, part) {
  const p = (part || 0) % 4;
  const yaw = 0.58 + t * 0.22, pitch = 0.48;
  if (p === 0) {
    // Part 1: 3D Panorama Incomplete Elliptic Integral 1st Kind F(phi, k)
    drawOpenSurface3D(V, (u, v) => {
      const phi = Math.max(0.02, Math.min(Math.PI * 0.495, (u + 1.6) * 0.48));
      const k = Math.max(0.0, Math.min(0.992, (v + 1.6) * 0.30));
      const [F] = ellipFE(phi, k);
      return [Math.min(1.28, Math.log(1 + F) * 0.72) - 0.38, F * 0.85 - 1.2, 0.88];
    }, 46, 46, yaw, pitch, 0.58);
    pin3D(V, 1.5, 1.5, 0.90, "K->1 LOG WALL", yaw, pitch, 0.58, true);
    return [["INTEGRAL", "1ST KIND F(PHI,K)"], ["DOMAIN", "PHI IN [0,PI/2]"], ["AT PI/2", "COMPLETE K(K)"]];
  } else if (p === 1) {
    // Part 2: 3D Panorama Incomplete 2nd Kind E(phi, k) & 3rd Kind Pi(n; phi, k)
    const nParam = 0.35 + 0.35 * Math.sin(t * 0.55);
    drawOpenSurface3D(V, (u, v) => {
      const phi = Math.max(0.02, Math.min(Math.PI * 0.495, (u + 1.6) * 0.48));
      const k = Math.max(0.0, Math.min(0.985, (v + 1.6) * 0.30));
      const piVal = ellipPi(nParam, phi, k);
      return [Math.min(1.25, Math.log(1 + piVal) * 0.68) - 0.38, piVal * 0.75 - 1.4, 0.88];
    }, 44, 44, yaw, pitch, 0.58);
    return [["INTEGRAL", "3RD KIND PI(N;PHI,K)"], ["CHAR N", nParam.toFixed(3)], ["N=0 LIMIT", "F(PHI, K)"]];
  } else if (p === 2) {
    // Part 3: 2D Complete Elliptic Integrals K(k), E(k), K'(k), E'(k) (Ch. V.C, Tables 16–17)
    const P = makePlot2D(V, 0.0, 1.0, 0.8, 4.2);
    P.axes(0.2, 0.5, "MODULUS K", "VALUE");
    P.hline(Math.PI * 0.5, [0.45, 0.52, 0.64, 0.40], 0.9);
    P.curve((k) => ellipKE(k)[0], COL.amber, 2.3, 180, 0.001, 0.996);
    P.curve((k) => ellipKE(k)[1], COL.cyan, 2.2, 180, 0.001, 0.999);
    P.curve((k) => ellipKE(Math.sqrt(1 - k * k))[0], [0.89, 0.38, 0.29, 0.82], 1.6, 180, 0.04, 0.999);
    P.curve((k) => ellipKE(Math.sqrt(1 - k * k))[1], [0.44, 0.92, 0.62, 0.85], 1.6, 180, 0.001, 0.999);
    const kv = 0.05 + ((t * 0.18) % 0.92);
    const [K, E] = ellipKE(kv), [Kp, Ep] = ellipKE(Math.sqrt(1 - kv * kv));
    P.vline(kv, [1.0, 0.94, 0.32, 0.45], 1.0);
    P.dot(kv, K, 0.024, COL.amber); P.dot(kv, E, 0.022, COL.cyan);
    P.legend([["K(K) 1ST COMPLETE", COL.amber], ["E(K) 2ND COMPLETE", COL.cyan], ["K'(K) = K(K')", COL.hot], ["E'(K) = E(K')", [0.44, 0.92, 0.62, 0.95]]]);
    return [["MODULUS K", kv.toFixed(3)], ["K(K) / E(K)", K.toFixed(3) + " / " + E.toFixed(3)], ["LEGENDRE", (K * Ep + Kp * E - K * Kp).toFixed(4)]];
  } else {
    // Part 4: 2D Incomplete Elliptic Integrals F(phi, sin a) & E(phi, sin a) Family (Ch. V.B, Tables 14–15)
    const P = makePlot2D(V, 0.0, Math.PI * 0.5, 0.0, 3.6);
    P.axes(Math.PI / 6, 0.5, "AMPLITUDE PHI", "F(PHI,K) & E(PHI,K)");
    const alphas = [0, 30, 60, 75, 85];
    const active = Math.floor((t * 0.75) % alphas.length);
    for (let i = 0; i < alphas.length; i++) {
      const k = Math.sin((alphas[i] * Math.PI) / 180), hi = i === active;
      P.curve((phi) => ellipFE(phi, k)[0], hi ? COL.amber : phaseColor(i * 0.7, 0.48), hi ? 2.4 : 1.2, 90, 0, Math.PI * 0.5);
      P.curve((phi) => ellipFE(phi, k)[1], hi ? COL.cyan : phaseColor(i * 0.7 + 2.5, 0.38), hi ? 2.1 : 1.0, 90, 0, Math.PI * 0.5);
    }
    P.legend([["F(PHI, SIN A) ACTIVE", COL.amber], ["E(PHI, SIN A) ACTIVE", COL.cyan]]);
    return [["MOD ANGLE", alphas[active] + " DEG"], ["K = SIN(A)", Math.sin((alphas[active] * Math.PI) / 180).toFixed(3)], ["TABLES", "J-E-L 14 & 15"]];
  }
}

// ============================================================================
// SECTION 8: ELLIPTIC FUNCTIONS — JACOBI, WEIERSTRASS, THETA & MODULAR (Ch. VI — 6 Parts)
// ============================================================================
function drawEllipticFunctionsSection(V, sim, t, dt, part) {
  const p = (part || 0) % 6;
  const yaw = 0.58 + t * 0.22, pitch = 0.48;
  if (p === 0) {
    // Part 1: 3D Complex Jacobi Elliptic |sn(z, k)| (Doubly-periodic poles & zeros!)
    const k = 0.65 + 0.22 * Math.sin(t * 0.45);
    drawOpenSurface3D(V, (u, v) => {
      const w = cJacobiSN([u * 1.45, v * 1.45], k);
      return [Math.min(1.26, Math.log(1 + Math.hypot(w[0], w[1])) * 0.48) - 0.36, Math.atan2(w[1], w[0]), 0.88];
    }, 52, 52, yaw, pitch, 0.58);
    pin3D(V, 0, 0, -0.34, "Z=0 (SN=0)", yaw, pitch, 0.58, true, COL.cyan);
    return [["JACOBI", "|SN(Z, K)|"], ["MODULUS K", k.toFixed(3)], ["PERIODS", "4K & 2I*K'"]];
  } else if (p === 1) {
    // Part 2: 3D Weierstrass Elliptic |℘(z)|
    return drawEllipticRiemann3D(V, sim, t, dt, 0);
  } else if (p === 2) {
    // Part 3: 3D Jacobi Theta |theta_3(z, q)|
    return drawSpecialZoo3D(V, sim, t, dt, 1);
  } else if (p === 3) {
    // Part 4: 3D Modular Dedekind |eta(tau)|
    return drawSpecialZoo3D(V, sim, t, dt, 0);
  } else if (p === 4) {
    // Part 5: 2D Map Study — Real Jacobi sn, cn, dn (Ch. VI.A)
    const k = 0.55 + 0.40 * (0.5 + 0.5 * Math.sin(t * 0.5));
    const [K] = ellipKE(k);
    const P = makePlot2D(V, 0, 4 * K, -1.35, 1.45);
    P.axes(K, 0.5, "U (0..4K)", "SN, CN, DN");
    P.curve((u) => jacobiReal(u, k).sn, COL.amber, 2.3, 180, 0, 4 * K);
    P.curve((u) => jacobiReal(u, k).cn, COL.cyan, 2.0, 180, 0, 4 * K);
    P.curve((u) => jacobiReal(u, k).dn, [0.44, 0.92, 0.62, 0.92], 2.0, 180, 0, 4 * K);
    const u0 = (t * 1.1) % (4 * K);
    const j0 = jacobiReal(u0, k);
    P.dot(u0, j0.sn, 0.024, COL.amber); P.dot(u0, j0.cn, 0.022, COL.cyan); P.dot(u0, j0.dn, 0.022, [0.44, 0.92, 0.62, 0.95]);
    P.legend([["SN(U, K)", COL.amber], ["CN(U, K)", COL.cyan], ["DN(U, K)", [0.44, 0.92, 0.62, 0.95]]]);
    return [["MODULUS K", k.toFixed(3)], ["4K PERIOD", (4 * K).toFixed(2)], ["SN^2+CN^2", (j0.sn * j0.sn + j0.cn * j0.cn).toFixed(3)]];
  } else {
    // Part 6: 2D Map Study — Jacobi Theta Functions theta_1..theta_4(v, q) (Ch. VI.C, Tables 18–19)
    const q = 0.08 + 0.34 * (0.5 + 0.5 * Math.sin(t * 0.55));
    const P = makePlot2D(V, -Math.PI, Math.PI, -2.1, 2.4);
    P.axes(Math.PI * 0.5, 0.5, "V (RAD)", "THETA_1..4(V, Q)");
    P.curve((v) => jacobiThetas(v, q)[0], COL.hot, 1.9, 180);
    P.curve((v) => jacobiThetas(v, q)[1], COL.cyan, 1.9, 180);
    P.curve((v) => jacobiThetas(v, q)[2], COL.amber, 2.3, 180);
    P.curve((v) => jacobiThetas(v, q)[3], [0.44, 0.92, 0.62, 0.92], 2.0, 180);
    const v0 = -Math.PI + ((t * 1.0) % (Math.PI * 2));
    const th = jacobiThetas(v0, q);
    P.vline(v0, [1.0, 0.94, 0.32, 0.35], 1.0);
    P.dot(v0, th[2], 0.024, COL.amber); P.dot(v0, th[0], 0.020, COL.hot);
    P.legend([["THETA_3(V, Q)", COL.amber], ["THETA_2(V, Q)", COL.cyan], ["THETA_4(V, Q)", [0.44, 0.92, 0.62, 0.95]], ["THETA_1(V, Q)", COL.hot]]);
    return [["NOME Q", q.toFixed(3)], ["THETA_3(0)", jacobiThetas(0, q)[2].toFixed(3)], ["TABLES", "J-E-L 18 & 19"]];
  }
}

// ============================================================================
// SECTION 9: ORTHOGONAL POLYNOMIALS — CHEBYSHEV, LAGUERRE & HERMITE (Ch. VII — 5 Parts)
// ============================================================================
function drawOrthogonalPolySection(V, sim, t, dt, part) {
  const p = (part || 0) % 5;
  const yaw = 0.58 + t * 0.22, pitch = 0.48;
  if (p === 0) {
    // Part 1: 3D Complex Chebyshev |T_n(z)| (Bernstein Elliptic Level Curves in C!)
    const n = 2 + Math.floor((t * 0.55) % 5);
    drawOpenSurface3D(V, (u, v) => {
      const w = cChebT(n, [u * 0.78, v * 0.78]);
      return [Math.min(1.26, Math.log(1 + Math.hypot(w[0], w[1])) * 0.46) - 0.36, Math.atan2(w[1], w[0]), 0.88];
    }, 52, 52, yaw, pitch, 0.58, null, (u, v) => {
      // Highlight |z| = 1 ellipse
      const x = u * 0.78, y = v * 0.78;
      return (x * x) / 1.44 + (y * y) / 0.44 - 1.0;
    });
    pin3D(V, -1 / 0.78, 0, -0.30, "X=-1", yaw, pitch, 0.58, true, COL.cyan);
    pin3D(V, 1 / 0.78, 0, -0.30, "X=+1", yaw, pitch, 0.58, true, COL.cyan);
    return [["COMPLEX", "|T_" + n + "(Z)|"], ["DEGREE N", String(n)], ["ZEROS", "COS((2K-1)PI/2N)"]];
  } else if (p === 1) {
    // Part 2: 3D Quantum Hermite-Gaussian Parabolic Cylinder Carpet phi_n(x) x phi_m(y)
    const m = Math.floor((t * 0.45) % 4), n = (m + 1) % 4;
    const norm = [1, 1.414, 2.828, 6.928];
    drawOpenSurface3D(V, (u, v) => {
      const x = u * 1.45, y = v * 1.45;
      const px = (hermiteH(m, x) / norm[m]) * Math.exp(-0.5 * x * x);
      const py = (hermiteH(n, y) / norm[n]) * Math.exp(-0.5 * y * y);
      const val = px * py * 1.45;
      return [val, val >= 0 ? 0.55 : -2.35, 0.88];
    }, 52, 52, yaw, pitch, 0.58);
    return [["2D HERMITE", "PHI_" + m + "(X) PHI_" + n + "(Y)"], ["ENERGY", "E = " + (m + n + 1) + " HW"], ["MESH", meshMul().toFixed(1) + "X"]];
  } else if (p === 2) {
    // Part 3: 2D Chebyshev T_n(x) & U_n(x) (Ch. VII.A)
    const active = 1 + Math.floor((t * 0.75) % 6);
    const P = makePlot2D(V, -1.05, 1.05, -1.35, 1.35);
    P.axes(0.5, 0.5, "X IN [-1, 1]", "T_N(X)");
    for (let n = 1; n <= 6; n++) {
      const hi = n === active;
      P.curve((x) => chebT(n, x), hi ? COL.amber : phaseColor(n * 0.9, 0.36), hi ? 2.4 : 1.1, 160, -1, 1);
    }
    P.curve((x) => chebU(active, x) / (active + 1), COL.cyan, 1.6, 160, -1, 1);
    for (let k = 1; k <= active; k++) P.dot(Math.cos(((2 * k - 1) * Math.PI) / (2 * active)), 0, 0.020, COL_STRIPE_YEL);
    P.legend([["T_" + active + "(X) 1ST KIND", COL.amber], ["U_" + active + "(X)/(N+1) 2ND", COL.cyan]]);
    return [["CHEBYSHEV", "T_" + active + " & U_" + active], ["ZEROS", active + " NODES"], ["MINIMAX", "|T_N| <= 1"]];
  } else if (p === 3) {
    // Part 4: 2D Laguerre Functions l_n(x) = exp(-x/2) L_n(x) (Ch. VII.B, Table 20)
    const active = Math.floor((t * 0.75) % 6);
    const P = makePlot2D(V, 0.0, 14.0, -0.95, 1.15);
    P.axes(2.0, 0.5, "X >= 0", "L_N(X) EXP(-X/2)");
    for (let n = 0; n < 6; n++) {
      const hi = n === active;
      P.curve((x) => Math.exp(-0.5 * x) * laguerreL(n, x), hi ? COL.amber : phaseColor(n * 0.95, 0.40), hi ? 2.4 : 1.15, 200, 0, 14);
    }
    P.legend([["L_" + active + "(X) EXP(-X/2)", COL.amber], ["ORTHOGONAL ON [0,INF)", COL.cyan]]);
    return [["LAGUERRE", "N = " + active], ["NORM", "INT L_N^2 E^-X = 1"], ["TABLE", "J-E-L TABLE 20"]];
  } else {
    // Part 5: 2D Hermite / Parabolic Cylinder Functions phi_n(x) (Ch. VII.C, Table 21)
    return drawPolynomials2D(V, sim, t, dt, 2);
  }
}

// ============================================================================
// SECTION 10: SPHERICAL & LEGENDRE FUNCTIONS (Ch. VIII — 6 Parts)
// ============================================================================
function drawLegendreSphericalSection(V, sim, t, dt, part) {
  const p = (part || 0) % 6;
  if (p === 0) return drawSphericalHarmonics3D(V, sim, t, dt, 1); // Y_3^2
  if (p === 1) return drawSphericalHarmonics3D(V, sim, t, dt, 2); // Y_4^2
  if (p === 2) return drawSphericalHarmonics3D(V, sim, t, dt, 4); // Y_6^4
  if (p === 3) {
    // Part 4: 3D Spherical Harmonic Y_2^0 + Zonal Legendre Wave Relief
    return drawSphericalHarmonics3D(V, sim, t, dt, 0);
  } else if (p === 4) {
    // Part 5: 2D Map Study — Legendre 1st Kind P_n(x) & 2nd Kind Q_n(x) (Ch. VIII, Tables 22–25)
    const active = 1 + Math.floor((t * 0.70) % 5);
    const P = makePlot2D(V, -1.04, 1.04, -2.2, 2.2);
    P.axes(0.5, 0.5, "X = COS(THETA)", "P_N(X) & Q_N(X)");
    P.vline(-1, [0.89, 0.38, 0.29, 0.35], 1.0); P.vline(1, [0.89, 0.38, 0.29, 0.35], 1.0);
    for (let n = 1; n <= 5; n++) {
      const hi = n === active;
      P.curve((x) => legendreP(n, x), hi ? COL.amber : phaseColor(n * 0.85, 0.36), hi ? 2.4 : 1.1, 160, -1, 1);
    }
    P.curve((x) => legendreQ(active, x), COL.cyan, 2.1, 180, -0.992, 0.992);
    P.legend([["P_" + active + "(X) 1ST KIND", COL.amber], ["Q_" + active + "(X) 2ND KIND", COL.cyan]]);
    return [["LEGENDRE", "P_" + active + " & Q_" + active], ["Q_N POLES", "LOG AT X = +-1"], ["TABLES", "J-E-L 22–25"]];
  } else {
    // Part 6: 2D Polar Map Study — Legendre Radiation Lobes |P_n(cos theta)| (Ch. VIII, Table 23)
    const active = 1 + Math.floor((t * 0.65) % 5);
    const P = makePlot2D(V, -1.2, 1.2, -1.2, 1.2, { iso: true });
    P.axes(0.5, 0.5, "SIN(TH) * |P|", "COS(TH) * |P|");
    P.parametric((a) => [Math.cos(a), Math.sin(a)], 0, Math.PI * 2, [0.35, 0.45, 0.56, 0.32], 0.9, 96);
    for (let n = 1; n <= 5; n++) {
      const hi = n === active;
      P.parametric((th) => {
        const r = Math.abs(legendreP(n, Math.cos(th)));
        return [r * Math.sin(th), r * Math.cos(th)];
      }, 0, Math.PI * 2, hi ? COL.amber : phaseColor(n * 0.9, 0.34), hi ? 2.4 : 1.05, 180);
    }
    const th0 = (t * 0.95) % (Math.PI * 2), r0 = Math.abs(legendreP(active, Math.cos(th0)));
    P.dot(r0 * Math.sin(th0), r0 * Math.cos(th0), 0.024, COL_STRIPE_YEL);
    P.legend([["|P_" + active + "(COS TH)|", COL.amber], ["OTHER P_1..P_5", COL.cyan], ["UNIT CIRCLE R=1", COL.dim]]);
    return [["POLAR LOBE", "|P_" + active + "(COS TH)|"], ["THETA", ((th0 * 180) / Math.PI).toFixed(1) + " DEG"], ["|P_N|", r0.toFixed(3)]];
  }
}

// ============================================================================
// SECTION 11: BESSEL, MODIFIED, KELVIN, AIRY & STRUVE FUNCTIONS (Ch. IX — 6 Parts)
// ============================================================================
function airyReal(x) {
  // Accurate real Airy Ai(x), Bi(x) via Maclaurin series for |x| <= 5.4 and 2-term asymptotic for |x| > 5.4
  const c1 = 0.3550280538878172, c2 = 0.2588194037928068, sq3 = Math.sqrt(3);
  if (Math.abs(x) <= 5.4) {
    let f = 1, g = x, tf = 1, tg = x;
    const x3 = x * x * x;
    for (let k = 1; k <= 34; k++) {
      tf *= x3 / ((3 * k - 1) * (3 * k));
      tg *= x3 / ((3 * k) * (3 * k + 1));
      f += tf; g += tg;
    }
    return [c1 * f - c2 * g, sq3 * (c1 * f + c2 * g)];
  }
  const ax = Math.abs(x), z = (2 / 3) * Math.pow(ax, 1.5);
  if (x > 0) {
    const pre = 1 / (2 * Math.sqrt(Math.PI) * Math.pow(ax, 0.25));
    return [pre * Math.exp(-z) * (1 - 5 / (72 * z)), 2 * pre * Math.exp(Math.min(10, z)) * (1 + 5 / (72 * z))];
  }
  const pre = 1 / (Math.sqrt(Math.PI) * Math.pow(ax, 0.25));
  const ph = z + Math.PI * 0.25, c = 5 / (72 * z);
  return [pre * (Math.sin(ph) - c * Math.cos(ph)), pre * (Math.cos(ph) + c * Math.sin(ph))];
}
function drawBesselFullSection(V, sim, t, dt, part) {
  const p = (part || 0) % 6;
  const yaw = 0.58 + t * 0.22, pitch = 0.48;
  if (p === 0) return drawBesselAiry3D(V, sim, t, dt, 0); // 3D Cylindrical Wavefield
  if (p === 1) {
    // Part 2: 3D Complex Bessel Relief |J_0(z)| (Iconic Jahnke-Emde Cylinder Relief!)
    drawOpenSurface3D(V, (u, v) => {
      const w = cBesselJ0([u * 2.2, v * 1.45]);
      return [Math.min(1.26, Math.log(1 + Math.hypot(w[0], w[1])) * 0.48) - 0.38, Math.atan2(w[1], w[0]), 0.88];
    }, 52, 50, yaw, pitch, 0.58);
    pin3D(V, 2.4048 / 2.2, 0, -0.34, "J0 ZERO 2.405", yaw, pitch, 0.58, true, COL.cyan);
    pin3D(V, -2.4048 / 2.2, 0, -0.34, "-2.405", yaw, pitch, 0.58, true, COL.cyan);
    return [["COMPLEX BESSEL", "|J_0(Z)| CH.IX"], ["1ST ZERO", "J_0,1 = 2.4048"], ["MESH", meshMul().toFixed(1) + "X"]];
  }
  if (p === 2) return drawBesselAiry3D(V, sim, t, dt, 1); // 3D Airy Caustic Ai(z)
  if (p === 3) {
    // Part 4: 2D Map Study — Cylinder Functions J_0..J_2(x), Neumann Y_0(x), Y_1(x) & Struve H_0(x) (Ch. IX.A & C)
    const P = makePlot2D(V, 0.0, 14.0, -1.2, 1.35);
    P.axes(2.0, 0.5, "X", "J_N, Y_N, H_0");
    P.curve((x) => besselJ(0, x), COL.amber, 2.3, 220, 0, 14);
    P.curve((x) => besselJ(1, x), COL.cyan, 1.9, 220, 0, 14);
    P.curve((x) => besselJ(2, x), [0.68, 0.58, 0.95, 0.82], 1.5, 220, 0, 14);
    P.curve((x) => besselY0(x), COL.hot, 1.8, 220, 0.14, 14);
    P.curve((x) => struveH0(x), [0.44, 0.92, 0.62, 0.92], 1.7, 200, 0, 14);
    const j0Zeros = [2.4048, 5.5201, 8.6537, 11.7915];
    j0Zeros.forEach((z) => P.dot(z, 0, 0.020, COL_STRIPE_YEL));
    P.legend([["J_0(X) 1ST KIND", COL.amber], ["J_1(X)", COL.cyan], ["Y_0(X) NEUMANN", COL.hot], ["H_0(X) STRUVE", [0.44, 0.92, 0.62, 0.95]]]);
    return [["J_0 ZEROS", "2.405, 5.520, 8.654"], ["ASYMPTOTIC", "SQRT(2/PI*X) COS"], ["CH. IX", "A + C STRUVE"]];
  } else if (p === 4) {
    // Part 5: 2D Map Study — Modified Bessel I_0, I_1, K_0, K_1 & Kelvin ber(x), bei(x) (Ch. IX.B)
    const P = makePlot2D(V, 0.0, 5.0, -2.5, 4.5);
    P.axes(1.0, 1.0, "X", "I, K, BER, BEI");
    P.curve((x) => besselI(0, x), COL.amber, 2.2, 180, 0, 3.2);
    P.curve((x) => besselI(1, x), [0.95, 0.78, 0.45, 0.78], 1.6, 180, 0, 3.4);
    P.curve((x) => besselK0(x), COL.cyan, 2.2, 180, 0.04, 5.0);
    P.curve((x) => besselK1(x), [0.44, 0.92, 0.62, 0.85], 1.6, 180, 0.16, 5.0);
    P.curve((x) => kelvinBerBei(x)[0], COL.hot, 1.8, 180, 0, 5.0);
    P.curve((x) => kelvinBerBei(x)[1], [0.76, 0.56, 0.98, 0.88], 1.8, 180, 0, 5.0);
    P.legend([["I_0(X) MODIFIED", COL.amber], ["K_0(X) MACDONALD", COL.cyan], ["BER(X) KELVIN", COL.hot], ["BEI(X) KELVIN", [0.76, 0.56, 0.98, 0.95]]]);
    return [["MODIFIED", "I_0(X) & K_0(X)"], ["KELVIN", "J_0(X*EXP(3PI*I/4))"], ["SKIN EFFECT", "CH. IX.B.3"]];
  } else {
    // Part 6: 2D Map Study — Airy Ai(x), Bi(x) & Spherical Bessel j_0(x) = sin(x)/x, j_1(x) (Ch. IX.A.7)
    const P = makePlot2D(V, -10.0, 4.0, -0.8, 1.25);
    P.axes(2.0, 0.5, "X", "AI, BI, J_0(X)");
    P.curve((x) => airyReal(x)[0], COL.amber, 2.3, 240);
    P.curve((x) => airyReal(x)[1], COL.hot, 1.8, 220, -10.0, 2.6);
    P.curve((x) => Math.abs(x) < 1e-4 ? 1 : Math.sin(x) / x, COL.cyan, 1.8, 220, 0, 4.0);
    P.curve((x) => x < 1e-3 ? 0 : (Math.sin(x) / (x * x) - Math.cos(x) / x), [0.44, 0.92, 0.62, 0.90], 1.6, 160, 0, 4.0);
    const xv = -9.2 + ((t * 1.6) % 12.6);
    const [ai, bi] = airyReal(xv);
    P.dot(xv, ai, 0.024, COL.amber); P.dot(0, 0.3550, 0.020, COL_STRIPE_YEL);
    P.legend([["AIRY AI(X)", COL.amber], ["AIRY BI(X)", COL.hot], ["SPHERICAL J_0(X)", COL.cyan], ["SPHERICAL J_1(X)", [0.44, 0.92, 0.62, 0.95]]]);
    return [["X", xv.toFixed(2)], ["AI(X) / BI(X)", ai.toFixed(3) + " / " + (Math.abs(bi) < 9 ? bi.toFixed(2) : "EXP")], ["AI(0)", "0.3550"]];
  }
}

// ============================================================================
// SECTION 12: MATHIEU FUNCTIONS & INCE-STRUTT STABILITY (Ch. X — 4 Parts)
// ============================================================================
function drawMathieuSection(V, sim, t, dt, part) {
  const p = (part || 0) % 4;
  const yaw = 0.58 + t * 0.22, pitch = 0.48;
  if (p === 0) {
    // Part 1: 3D Elliptic-Membrane Mathieu Eigenmode ce_m(eta, q) * Ce_m(xi, q)
    const m = Math.floor((t * 0.35) % 3), q = 1.6 + 1.1 * Math.sin(t * 0.45), osc = Math.cos(t * 2.2);
    drawOpenSurface3D(V, (u, v) => {
      // Confocal elliptic coordinates (xi, eta) from Cartesian (u, v) with foci at (+-c, 0)
      const c = 1.05;
      const r1 = Math.hypot(u - c, v), r2 = Math.hypot(u + c, v);
      const chXi = Math.max(1.0, (r1 + r2) / (2 * c));
      const xi = Math.acosh(chXi);
      const cosEta = Math.max(-1, Math.min(1, (r2 - r1) / (2 * c)));
      const eta = v >= 0 ? Math.acos(cosEta) : -Math.acos(cosEta);
      const rad = besselJ(m, Math.sinh(xi) * 2.4) * Math.exp(-0.12 * xi);
      const ang = mathieuCE(m, eta, q);
      const val = rad * ang * osc * 0.95;
      return [val, val >= 0 ? 0.50 : -2.35, 0.88];
    }, 52, 52, yaw, pitch, 0.58);
    pin3D(V, 1.05, 0, 0.08, "FOCUS +C", yaw, pitch, 0.58, true, COL.cyan);
    pin3D(V, -1.05, 0, 0.08, "FOCUS -C", yaw, pitch, 0.58, true, COL.cyan);
    return [["ELLIPTIC DRUM", "CE_" + m + "(ETA,Q)"], ["PARAM Q", q.toFixed(2)], ["COS(WT)", osc.toFixed(2)]];
  } else if (p === 1) {
    // Part 2: 3D Ince-Strutt Mathieu Stability Relief |Tr(M(a, q))| - 2 over (q, a)
    drawOpenSurface3D(V, (u, v) => {
      const q = (u + 1.5) * 2.2;
      const a = (v + 1.5) * 3.8 - 1.5;
      const tr = Math.abs(mathieuTrace(a, q));
      const unstable = Math.max(0, tr - 2.0);
      const z = Math.min(1.22, Math.log(1 + unstable * 1.4) * 0.45) - 0.36;
      return [z, tr <= 2.0 ? -2.2 : 0.45 - Math.min(1.2, unstable * 0.25), 0.88];
    }, 44, 44, yaw, pitch, 0.58);
    return [["RELIEF", "FLOQUET INSTABILITY"], ["BLUE VALLEYS", "STABLE |TR|<=2"], ["PEAKS", "PARAMETRIC RESONANCE"]];
  } else if (p === 2) {
    // Part 3: 2D Ince-Strutt Stability Chart a_n(q), b_n(q) (Ch. X.2)
    const P = makePlot2D(V, 0.0, 5.5, -2.5, 11.5);
    P.axes(1.0, 2.0, "PARAM Q", "EIGENVALUE A");
    for (let n = 0; n <= 3; n++) {
      P.curve((q) => mathieuCharA(n, q), COL.amber, 2.1, 140, 0, 5.5);
      if (n >= 1) P.curve((q) => mathieuCharB(n, q), COL.cyan, 1.9, 140, 0, 5.5);
    }
    const qv = (t * 0.9) % 5.2;
    P.vline(qv, [1.0, 0.94, 0.32, 0.45], 1.1);
    P.dot(qv, mathieuCharA(0, qv), 0.022, COL.amber);
    P.dot(qv, mathieuCharA(1, qv), 0.022, COL.amber);
    P.dot(qv, mathieuCharB(1, qv), 0.022, COL.cyan);
    P.legend([["A_N(Q) EVEN CHAR", COL.amber], ["B_N(Q) ODD CHAR", COL.cyan]]);
    return [["INCE-STRUTT", "Q = " + qv.toFixed(2)], ["A0 / A1", mathieuCharA(0, qv).toFixed(2) + " / " + mathieuCharA(1, qv).toFixed(2)], ["B1", mathieuCharB(1, qv).toFixed(2)]];
  } else {
    // Part 4: 2D Periodic Mathieu Functions ce_0, ce_1, ce_2 & se_1, se_2 (Ch. X.3)
    const q = 2.2 * Math.sin(t * 0.55);
    const P = makePlot2D(V, 0, Math.PI * 2, -1.6, 1.6);
    P.axes(Math.PI * 0.5, 0.5, "Z (0..2PI)", "CE_N, SE_N");
    P.curve((z) => mathieuCE(0, z, q), COL.amber, 2.2, 180, 0, Math.PI * 2);
    P.curve((z) => mathieuCE(1, z, q), COL.cyan, 2.0, 180, 0, Math.PI * 2);
    P.curve((z) => mathieuCE(2, z, q), [0.44, 0.92, 0.62, 0.88], 1.6, 180, 0, Math.PI * 2);
    P.curve((z) => mathieuSE(1, z, q), COL.hot, 1.8, 180, 0, Math.PI * 2);
    P.curve((z) => mathieuSE(2, z, q), [0.76, 0.56, 0.98, 0.85], 1.5, 180, 0, Math.PI * 2);
    P.legend([["CE_0(Z,Q)", COL.amber], ["CE_1(Z,Q)", COL.cyan], ["SE_1(Z,Q)", COL.hot], ["CE_2 / SE_2", [0.44, 0.92, 0.62, 0.95]]]);
    return [["PARAM Q", q.toFixed(3)], ["Q=0 LIMIT", "COS(NZ) & SIN(NZ)"], ["ODE", "Y''+(A-2Q COS 2Z)Y=0"]];
  }
}

// ============================================================================
// SECTION 13: CONFLUENT HYPERGEOMETRIC & WHITTAKER FUNCTIONS (Ch. XI — 4 Parts)
// ============================================================================
function drawConfluentSection(V, sim, t, dt, part) {
  const p = (part || 0) % 4;
  const yaw = 0.58 + t * 0.22, pitch = 0.48;
  if (p === 0) {
    // Part 1: 3D Complex Kummer Relief |M(a, c; z)| = |1F1(a; c; z)| (Ch. XI.1)
    const a = -1.5 + 2.5 * (0.5 + 0.5 * Math.sin(t * 0.45)), c = 1.5;
    drawOpenSurface3D(V, (u, v) => {
      const w = cKummerM(a, c, [u * 1.8, v * 1.8]);
      return [Math.min(1.26, Math.log(1 + Math.hypot(w[0], w[1])) * 0.46) - 0.38, Math.atan2(w[1], w[0]), 0.88];
    }, 50, 50, yaw, pitch, 0.58);
    pin3D(V, 0, 0, -0.05, "M(A,C;0)=1", yaw, pitch, 0.58, true, COL.cyan);
    return [["KUMMER", "|M(A, C; Z)|"], ["A / C", a.toFixed(2) + " / " + c.toFixed(1)], ["CH. XI.1", "1F1(A; C; Z)"]];
  } else if (p === 1) {
    // Part 2: 3D Complex Whittaker Function |M_{kappa, mu}(z)| (Ch. XI.3)
    const kappa = 1.25 + 0.85 * Math.sin(t * 0.45), mu = 0.5;
    drawOpenSurface3D(V, (u, v) => {
      const z = [u * 1.7 + 1.2, v * 1.5];
      const m = cKummerM(mu - kappa + 0.5, 2 * mu + 1, z);
      const em = cExp([-0.5 * Math.max(-10, Math.min(10, z[0])), -0.5 * z[1]]);
      const zp = cPowC(z, mu + 0.5);
      const w = cMul(cMul(em, zp), m);
      return [Math.min(1.26, Math.log(1 + Math.hypot(w[0], w[1])) * 0.48) - 0.38, Math.atan2(w[1], w[0]), 0.88];
    }, 50, 50, yaw, pitch, 0.58);
    return [["WHITTAKER", "|M_{K,MU}(Z)|"], ["KAPPA / MU", kappa.toFixed(2) + " / 0.5"], ["CH. XI.3", "COULOMB WAVES"]];
  } else if (p === 2) {
    // Part 3: 2D Map Study — Kummer M(a, 1; x) Family (Laguerre Polynomial Limits at a = -n) (Ch. XI.1 & 4)
    const aList = [-3, -2, -1, 0.5, 1.0, 2.0];
    const active = Math.floor((t * 0.7) % aList.length);
    const P = makePlot2D(V, -2.0, 6.0, -3.5, 5.5);
    P.axes(1.0, 1.0, "X", "M(A, 1; X)");
    for (let i = 0; i < aList.length; i++) {
      const a = aList[i], hi = i === active;
      P.curve((x) => cKummerM(a, 1.0, [x, 0])[0], hi ? COL.amber : phaseColor(i * 0.9, 0.45), hi ? 2.4 : 1.2, 180, -2.0, 6.0);
    }
    P.legend([["ACTIVE A = " + aList[active], COL.amber], ["A=-N => LAGUERRE L_N(X)", COL.cyan]]);
    return [["KUMMER", "M(" + aList[active] + ", 1; X)"], ["A=1 LIMIT", "EXP(X)"], ["A=-N LIMIT", "LAGUERRE L_N"]];
  } else {
    // Part 4: 2D Map Study — Hydrogen Atom Radial Probability r^2 |R_{nl}(r)|^2 (Whittaker Special Case Ch. XI.4)
    const states = [[1, 0, "1S"], [2, 0, "2S"], [2, 1, "2P"], [3, 0, "3S"], [3, 1, "3P"], [3, 2, "3D"]];
    const active = Math.floor((t * 0.7) % states.length);
    const P = makePlot2D(V, 0.0, 22.0, 0.0, 0.60);
    P.axes(4.0, 0.15, "RADIUS R / A0", "R^2 |R_NL(R)|^2");
    const fact = [1, 1, 2, 6, 24, 120, 720];
    for (let i = 0; i < states.length; i++) {
      const [n, l] = states[i], hi = i === active;
      // Exact quantum normalization: int_0^inf r^2 |R_nl(r)|^2 dr === 1
      const cNL = (1 / fact[2 * l + 1]) * Math.sqrt(fact[n + l] / (2 * n * fact[n - l - 1])) * Math.pow(2 / n, 1.5);
      P.curve((r) => {
        const rho = (2 * r) / n;
        const m = cKummerM(-(n - l - 1), 2 * l + 2, [rho, 0])[0];
        const R = cNL * Math.exp(-0.5 * rho) * Math.pow(rho, l) * m;
        return r * r * R * R;
      }, hi ? COL.amber : phaseColor(i * 0.9, 0.45), hi ? 2.4 : 1.2, 220, 0, 22);
    }
    P.legend([["ACTIVE ORBITAL " + states[active][2], COL.amber], ["WHITTAKER COULOMB", COL.cyan]]);
    return [["HYDROGEN", states[active][2] + " (N=" + states[active][0] + ",L=" + states[active][1] + ")"], ["NODES", String(states[active][0] - states[active][1] - 1)], ["CH. XI.4", "1F1 COULOMB"]];
  }
}

// ============================================================================
// SECTION 14: SPECIAL FUNCTIONS OF PHYSICS — PLANCK, LANGEVIN, DEBYE & HEAT (Ch. XII — 6 Parts)
// ============================================================================
function drawPhysicsSpecialSection(V, sim, t, dt, part) {
  const p = (part || 0) % 6;
  const yaw = 0.58 + t * 0.22, pitch = 0.48;
  if (p === 0) {
    // Part 1: 3D Planck Blackbody Radiation Surface B(lambda, T) + Wien Ridge (Ch. XII.A)
    drawOpenSurface3D(V, (u, v) => {
      const lam = Math.max(0.22, (u + 1.8) * 1.15);
      const T = Math.max(0.45, (v + 1.8) * 0.48);
      const arg = 4.965114 / (lam * T);
      const B = arg > 35 ? 0 : 142.32 / (Math.pow(lam, 5) * (Math.exp(arg) - 1));
      const z = Math.min(1.26, Math.log(1 + B * 2.2) * 0.48) - 0.38;
      return [z, 1.8 - lam * 0.85, 0.88];
    }, 50, 50, yaw, pitch, 0.58, null, (u, v) => {
      // Glowing yellow Wien's Displacement Law ridge: lam * T = 1.0!
      const lam = Math.max(0.22, (u + 1.8) * 1.15), T = Math.max(0.45, (v + 1.8) * 0.48);
      return lam * T - 1.0;
    });
    return [["BLACKBODY", "PLANCK B(LAM, T)"], ["YELLOW RIDGE", "WIEN LAM*T = B"], ["CH. XII.A", "STEFAN T^4"]];
  } else if (p === 1) {
    // Part 2: 3D Heat-Conduction Source Kernel G(x, t) = exp(-x^2/(4t)) / sqrt(4 pi t) (Ch. XII.D)
    const tOff = 0.14 + 0.10 * Math.sin(t * 0.55);
    drawOpenSurface3D(V, (u, v) => {
      const x = u * 1.45;
      const tau = Math.max(0.06, (v + 1.7) * 0.55 + tOff);
      const Gv = Math.exp(-(x * x) / (4 * tau)) / Math.sqrt(4 * Math.PI * tau);
      return [Math.min(1.25, Gv * 1.15) - 0.36, 0.55 - Gv * 1.4, 0.88];
    }, 52, 50, yaw, pitch, 0.58);
    pin3D(V, 0, -1.4, 0.88, "T->0 DELTA(X)", yaw, pitch, 0.58, true);
    return [["HEAT KERNEL", "G(X, T) CH.XII.D"], ["DIFFUSION", "SIGMA = SQRT(2DT)"], ["INTEGRAL", "INT G DX = 1"]];
  } else if (p === 2) {
    // Part 3: 2D Planck Radiation Spectrum across Temperatures & Wien Displacement Locus (Ch. XII.A)
    const C = 115.0, WIEN_X = 4.9651142317, WIEN_D = Math.exp(WIEN_X) - 1;
    const planckY = (lam, T) => {
      const a = WIEN_X / (lam * T);
      return a > 38 ? 0 : C / (Math.pow(lam, 5) * (Math.exp(a) - 1));
    };
    const P = makePlot2D(V, 0.0, 3.6, 0.0, 2.7);
    P.axes(0.5, 0.5, "WAVELENGTH LAMBDA", "RADIANCE B(LAM,T)");
    const temps = [0.85, 0.95, 1.05, 1.15, 1.25];
    const active = Math.floor((t * 0.7) % temps.length);
    // Wien's Displacement Peak Locus: B_peak(lam) = C / (lam^5 * (e^4.9651 - 1))
    P.curve((lam) => C / (Math.pow(lam, 5) * WIEN_D), [1.0, 0.94, 0.32, 0.45], 1.2, 160, 0.72, 3.6);
    // Classical Rayleigh-Jeans UV catastrophe curve for active T: C * T / (WIEN_X * lam^4)
    const Ta = temps[active];
    P.curve((lam) => (C * Ta) / (WIEN_X * Math.pow(lam, 4)), [0.89, 0.38, 0.29, 0.55], 1.2, 160, 0.45, 3.6);
    for (let i = 0; i < temps.length; i++) {
      const T = temps[i], hi = i === active;
      P.curve((lam) => planckY(lam, T), hi ? COL.amber : phaseColor(i * 0.65, 0.55), hi ? 2.4 : 1.35, 220, 0.12, 3.6);
      const lm = 1.0 / T;
      P.dot(lm, planckY(lm, T), hi ? 0.025 : 0.014, hi ? COL_STRIPE_YEL : COL.cyan);
    }
    const lamMax = 1.0 / Ta, bPeak = planckY(lamMax, Ta);
    P.vline(lamMax, [1.0, 0.94, 0.32, 0.32], 1.0);
    P.legend([
      ["PLANCK T = " + Ta.toFixed(2), COL.amber],
      ["OTHER T (0.85..1.25)", COL.cyan],
      ["WIEN LOCUS ~ LAM^-5", COL_STRIPE_YEL],
      ["RAYLEIGH-JEANS UV", COL.hot],
    ]);
    return [["PLANCK T", Ta.toFixed(2)], ["WIEN PEAK", "LAM=" + lamMax.toFixed(2) + " B=" + bPeak.toFixed(2)], ["CH. XII.A", "STEFAN ~ T^4"]];
  } else if (p === 3) {
    // Part 4: 2D Langevin L(x) = coth(x) - 1/x & Brillouin B_J(x) Paramagnetism (Ch. XII.B)
    const P = makePlot2D(V, -6.0, 6.0, -1.18, 1.18);
    P.axes(2.0, 0.5, "FIELD X = MU*B/KT", "MAGNETIZATION");
    P.hline(1.0, [0.50, 0.83, 0.80, 0.30], 0.9); P.hline(-1.0, [0.50, 0.83, 0.80, 0.30], 0.9);
    P.curve((x) => langevinL(x), COL.amber, 2.4, 200);
    P.curve((x) => brillouinB(0.5, x), COL.cyan, 2.0, 200);
    P.curve((x) => brillouinB(1.5, x), [0.44, 0.92, 0.62, 0.88], 1.7, 200);
    P.curve((x) => brillouinB(3.5, x), [0.76, 0.56, 0.98, 0.85], 1.5, 200);
    const xv = 4.5 * Math.sin(t * 0.55);
    P.dot(xv, langevinL(xv), 0.024, COL.amber);
    P.dot(xv, brillouinB(0.5, xv), 0.022, COL.cyan);
    P.legend([["LANGEVIN L(X) (J->INF)", COL.amber], ["BRILLOUIN J=1/2 (TANH)", COL.cyan], ["BRILLOUIN J=3/2", [0.44, 0.92, 0.62, 0.95]], ["BRILLOUIN J=7/2", [0.76, 0.56, 0.98, 0.95]]]);
    return [["X", xv.toFixed(2)], ["LANGEVIN L(X)", langevinL(xv).toFixed(3)], ["CURIE SLOPE", "1/3 AT X=0"]];
  } else if (p === 4) {
    // Part 5: 2D Planck-Einstein vs Debye Specific Heat Cv(T/Theta) & T^3 Law (Ch. XII.C)
    const P = makePlot2D(V, 0.0, 2.0, 0.0, 1.15);
    P.axes(0.5, 0.25, "T / THETA_D", "C_V / 3NK");
    P.hline(1.0, [0.91, 0.64, 0.33, 0.32], 1.0);
    P.curve((tau) => tau < 0.01 ? 0 : debyeD3(1 / tau), COL.amber, 2.4, 180, 0.01, 2.0);
    P.curve((tau) => tau < 0.01 ? 0 : planckEinsteinCv(1 / tau), COL.cyan, 2.1, 180, 0.01, 2.0);
    P.curve((tau) => Math.min(1.15, (12 * Math.pow(Math.PI, 4) / 5) * tau * tau * tau / 3), [0.89, 0.38, 0.29, 0.72], 1.4, 100, 0.0, 0.36);
    const tau = 0.05 + ((t * 0.32) % 1.90);
    P.dot(tau, debyeD3(1 / tau), 0.024, COL.amber);
    P.dot(tau, planckEinsteinCv(1 / tau), 0.022, COL.cyan);
    P.legend([["DEBYE D_3(THETA/T)", COL.amber], ["PLANCK-EINSTEIN E(X)", COL.cyan], ["DEBYE T^3 LAW", COL.hot]]);
    return [["T / THETA", tau.toFixed(2)], ["DEBYE C_V", debyeD3(1 / tau).toFixed(3)], ["EINSTEIN C_V", planckEinsteinCv(1 / tau).toFixed(3)]];
  } else {
    // Part 6: 2D Heat-Conduction Source Profiles G(x, t) across Diffusing Times (Ch. XII.D)
    const P = makePlot2D(V, -4.0, 4.0, 0.0, 1.35);
    P.axes(1.0, 0.25, "POSITION X", "G(X, T)");
    const times = [0.06, 0.14, 0.32, 0.70, 1.40];
    const active = Math.floor((t * 0.7) % times.length);
    for (let i = 0; i < times.length; i++) {
      const tau = times[i], hi = i === active;
      P.curve((x) => Math.exp(-(x * x) / (4 * tau)) / Math.sqrt(4 * Math.PI * tau), hi ? COL.amber : phaseColor(i * 0.7, 0.52), hi ? 2.4 : 1.3, 200);
    }
    const ta = times[active], sig = Math.sqrt(2 * ta), peak = 1 / Math.sqrt(4 * Math.PI * ta);
    P.vline(sig, [0.50, 0.83, 0.80, 0.40], 1.0); P.vline(-sig, [0.50, 0.83, 0.80, 0.40], 1.0);
    P.dot(0, peak, 0.024, COL_STRIPE_YEL);
    P.legend([["ACTIVE T = " + ta.toFixed(2), COL.amber], ["TIMES 0.06..1.40", COL.cyan], ["SIGMA = +-SQRT(2T)", COL.dim]]);
    return [["DIFFUSION T", ta.toFixed(2)], ["PEAK G(0,T)", peak.toFixed(3)], ["WIDTH SIGMA", sig.toFixed(2)]];
  }
}

// ============================================================================
// 2D MAP FOR STATION XVII: REAL ln(x), TSALLIS ln_q(x), DILOG Li_2(x) & LAMBERT W(x)
// ============================================================================
function drawLogarithms2D(V, sim, t) {
  const qVal = 0.55 + 0.85 * (0.5 + 0.5 * Math.sin(t * 0.5));
  const P = makePlot2D(V, -0.5, 4.2, -2.6, 2.2);
  P.axes(1.0, 1.0, "X", "Y");
  P.vline(-1 / Math.E, [0.89, 0.38, 0.29, 0.42], 1.0);
  P.vline(1.0, [0.50, 0.83, 0.80, 0.28], 0.9);
  // Natural log ln(x)
  P.curve((x) => Math.log(x), COL.cyan, 2.0, 200, 0.02, 4.2);
  // Tsallis q-Logarithm (x^(1-q) - 1) / (1 - q)
  P.curve((x) => Math.abs(1 - qVal) < 0.02 ? Math.log(x) : (Math.pow(x, 1 - qVal) - 1) / (1 - qVal), [0.44, 0.92, 0.62, 0.92], 1.8, 200, 0.02, 4.2);
  // Dilogarithm Li_2(x) for x <= 1
  P.curve((x) => {
    let s = 0, p = x;
    for (let n = 1; n <= 28; n++) { s += p / (n * n); p *= x; }
    return s;
  }, [0.76, 0.56, 0.98, 0.92], 1.9, 140, -0.5, 1.0);
  // Lambert W0(x) (x >= -1/e) and lower branch W_-1(x) (-1/e <= x < 0) via exact parametric (w e^w, w)
  P.parametric((w) => [w * Math.exp(w), w], -1.0, 1.35, COL.amber, 2.3, 140);
  P.parametric((w) => [w * Math.exp(w), w], -3.6, -1.0, COL.hot, 1.9, 100);
  P.dot(-1 / Math.E, -1, 0.024, COL_STRIPE_YEL);
  P.dot(1.0, (Math.PI * Math.PI) / 6, 0.022, [0.76, 0.56, 0.98, 0.95]);
  P.legend([["LAMBERT W_0(X)", COL.amber], ["LAMBERT W_-1(X)", COL.hot], ["LN(X)", COL.cyan], ["TSALLIS LN_Q(X)", [0.44, 0.92, 0.62, 0.95]], ["DILOG LI_2(X)", [0.76, 0.56, 0.98, 0.95]]]);
  return [["BRANCH", "(-1/E, -1)"], ["LI_2(1)", "1.6449 (PI^2/6)"], ["TSALLIS Q", qVal.toFixed(2)]];
}
