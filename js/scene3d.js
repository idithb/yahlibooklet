// מנוע סצנות תלת ממד קטן ב-WebGL, בלי ספריות. כל נושא בונה בו עולם משלו (js/scenes/*.js),
// וכל כרטיס בנושא הוא "צילום": מיקום מצלמה, מה מוצג ומה זז.
(function () {
  const A = window.App;
  const h = A.h;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

  // ---------- צבעים ווקטורים ----------
  const hex = (s) => {
    if (Array.isArray(s)) return s;
    const n = parseInt(s.slice(1), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (t) => Math.max(0, Math.min(1, t));
  const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  // ---------- בניית צורות ----------
  class Mesh {
    constructor() { this.p = []; this.n = []; this.c = []; }
    v(p, n, c) { this.p.push(p[0], p[1], p[2]); this.n.push(n[0], n[1], n[2]); this.c.push(c[0], c[1], c[2]); }
    tri(a, b, c, col = [1, 1, 1], na, nb, nc) {
      if (!na) { const f = norm(cross(sub(b, a), sub(c, a))); na = nb = nc = f; }
      this.v(a, na, col); this.v(b, nb, col); this.v(c, nc, col);
    }
    quad(a, b, c, d, col, na, nb, nc, nd) {
      this.tri(a, b, c, col, na, nb, nc);
      this.tri(a, c, d, col, na, nc, nd);
    }
  }
  const S = {};
  S.box = (w, ht, d, col) => {
    const m = new Mesh(); const x = w / 2, y = ht / 2, z = d / 2; const c = col ? hex(col) : [1, 1, 1];
    const P = [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z]];
    [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]]
      .forEach(([a, b, e, f]) => m.quad(P[a], P[b], P[e], P[f], c));
    return m;
  };
  S.sphere = (rx = 1, ry = rx, rz = rx, seg = 18, col) => {
    const m = new Mesh(); const rows = Math.max(6, Math.round(seg * 0.6)); const c = col ? hex(col) : [1, 1, 1];
    const pt = (i, j) => {
      const th = (i / seg) * TAU, ph = (j / rows) * Math.PI;
      const u = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
      return { p: [u[0] * rx, u[1] * ry, u[2] * rz], n: norm([u[0] / rx, u[1] / ry, u[2] / rz]) };
    };
    for (let i = 0; i < seg; i++) for (let j = 0; j < rows; j++) {
      const a = pt(i, j), b = pt(i + 1, j), d = pt(i, j + 1), e = pt(i + 1, j + 1);
      m.tri(a.p, b.p, e.p, c, a.n, b.n, e.n);
      m.tri(a.p, e.p, d.p, c, a.n, e.n, d.n);
    }
    return m;
  };
  // גליל או חרוט: הבסיס ב-y=0 והראש ב-y=ht
  S.cyl = (rTop, rBot, ht, seg = 14, col) => {
    const m = new Mesh(); const c = col ? hex(col) : [1, 1, 1];
    const slope = (rBot - rTop) / ht;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const n0 = norm([c0, slope, s0]), n1 = norm([c1, slope, s1]);
      m.quad([c0 * rBot, 0, s0 * rBot], [c0 * rTop, ht, s0 * rTop], [c1 * rTop, ht, s1 * rTop], [c1 * rBot, 0, s1 * rBot], c, n0, n0, n1, n1);
      if (rTop > 0) m.tri([0, ht, 0], [c1 * rTop, ht, s1 * rTop], [c0 * rTop, ht, s0 * rTop], c, [0, 1, 0], [0, 1, 0], [0, 1, 0]);
      if (rBot > 0) m.tri([0, 0, 0], [c0 * rBot, 0, s0 * rBot], [c1 * rBot, 0, s1 * rBot], c, [0, -1, 0], [0, -1, 0], [0, -1, 0]);
    }
    return m;
  };
  // גוף סיבוב: רשימת [רדיוס, גובה] מלמטה למעלה. arc לחיתוך (למשל הר חתוך לשניים)
  S.lathe = (prof, seg = 24, col, arc = TAU, start = 0) => {
    const m = new Mesh(); const c = col ? hex(col) : null;
    for (let i = 0; i < seg; i++) {
      const a0 = start + (i / seg) * arc, a1 = start + ((i + 1) / seg) * arc;
      for (let j = 0; j + 1 < prof.length; j++) {
        const [r0, y0, k0] = prof[j], [r1, y1] = prof[j + 1];
        const P = (r, y, a) => [Math.cos(a) * r, y, Math.sin(a) * r];
        const dy = y1 - y0, dr = r1 - r0;
        const N = (a) => norm([Math.cos(a) * dy, -dr, Math.sin(a) * dy]);
        const col2 = k0 ? hex(k0) : (c || [1, 1, 1]);
        m.quad(P(r0, y0, a0), P(r1, y1, a0), P(r1, y1, a1), P(r0, y0, a1), col2, N(a0), N(a0), N(a1), N(a1));
      }
    }
    return m;
  };
  // צינור לאורך נתיב. radius יכול להיות מספר או פונקציה של t (0..1)
  S.tube = (pts, radius, seg = 10, col) => {
    const m = new Mesh(); const c = col ? hex(col) : [1, 1, 1];
    const R = typeof radius === 'function' ? radius : () => radius;
    let prevA = null;
    const rings = pts.map((p, i) => {
      const t = norm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
      // המסגרת נישאת מטבעת לטבעת, כדי שהצינור לא יתפתל על עצמו
      const a = prevA
        ? norm(sub(prevA, mul(t, dot(prevA, t))))
        : norm(cross(t, Math.abs(t[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]));
      const b = norm(cross(a, t));
      prevA = a;
      const r = R(i / (pts.length - 1));
      return Array.from({ length: seg }, (_, k) => {
        const an = (k / seg) * TAU;
        const n = add(mul(a, Math.cos(an)), mul(b, Math.sin(an)));
        return { p: add(p, mul(n, r)), n };
      });
    });
    for (let i = 0; i + 1 < rings.length; i++) for (let k = 0; k < seg; k++) {
      const a = rings[i][k], b = rings[i][(k + 1) % seg], d = rings[i + 1][k], e = rings[i + 1][(k + 1) % seg];
      m.quad(a.p, b.p, e.p, d.p, c, a.n, b.n, e.n, d.n);
    }
    [[0, -1], [pts.length - 1, 1]].forEach(([i, sign]) => {
      const n = norm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
      const nn = mul(n, sign);
      for (let k = 0; k < seg; k++) m.tri(pts[i], rings[i][k].p, rings[i][(k + 1) % seg].p, c, nn, nn, nn);
    });
    return m;
  };
  S.torus = (R, r, col, segA = 28, segB = 10, arc = TAU, start = 0) => {
    const m = new Mesh(); const c = col ? hex(col) : [1, 1, 1];
    const pt = (i, j) => {
      const a = start + (i / segA) * arc, b = (j / segB) * TAU;
      const n = [Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)];
      return { p: [Math.cos(a) * (R + r * Math.cos(b)), r * Math.sin(b), Math.sin(a) * (R + r * Math.cos(b))], n };
    };
    for (let i = 0; i < segA; i++) for (let j = 0; j < segB; j++) {
      const a = pt(i, j), b = pt(i + 1, j), d = pt(i, j + 1), e = pt(i + 1, j + 1);
      m.quad(a.p, d.p, e.p, b.p, c, a.n, d.n, e.n, b.n);
    }
    return m;
  };
  // משטח גובה. hf(x,z) נותן גובה, cf(x,z,y) צבע. נראה מחוטב, כמו דגם
  S.grid = (w, d, nx, nz, hf, cf) => {
    if (A.lowPower) { nx = Math.max(4, Math.round(nx * 0.6)); nz = Math.max(4, Math.round(nz * 0.6)); }
    const m = new Mesh();
    const P = (i, j) => {
      const x = (i / nx - 0.5) * w, z = (j / nz - 0.5) * d;
      return [x, hf ? hf(x, z) : 0, z];
    };
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const a = P(i, j), b = P(i + 1, j), e = P(i + 1, j + 1), f = P(i, j + 1);
      const tint = (q, r, s) => {
        const x = (q[0] + r[0] + s[0]) / 3, y = (q[1] + r[1] + s[1]) / 3, z = (q[2] + r[2] + s[2]) / 3;
        return hex(cf ? cf(x, z, y) : [1, 1, 1]);
      };
      m.tri(a, f, e, tint(a, f, e));
      m.tri(a, e, b, tint(a, e, b));
    }
    return m;
  };
  // משטח שטוח בצורה חופשית, עם עובי
  S.plate = (poly, thick = 0.02, col) => {
    const m = new Mesh(); const c = col ? hex(col) : [1, 1, 1]; const t = thick / 2;
    const top = poly.map(([x, y]) => [x, y, t]), bot = poly.map(([x, y]) => [x, y, -t]);
    for (let i = 1; i + 1 < poly.length; i++) {
      m.tri(top[0], top[i], top[i + 1], c);
      m.tri(bot[0], bot[i + 1], bot[i], c);
    }
    poly.forEach((_, i) => {
      const j = (i + 1) % poly.length;
      m.quad(bot[i], bot[j], top[j], top[i], c);
    });
    return m;
  };
  // משטחים אורגניים: פונקציית מרחק הופכת לצורה חלקה אחת. נשמר בזיכרון כדי לא לחשב פעמיים
  const isoCache = {};
  S.iso = (key, fn, min, max, cell, colorFn) => {
    if (A.lowPower) cell *= 1.45;
    if (!isoCache[key]) isoCache[key] = buildIso(fn, min, max, cell, colorFn);
    const c = isoCache[key];
    return { p: c.p, n: c.n, c: c.c };
  };
  function buildIso(fn, min, max, cell, colorFn) {
    const nx = Math.ceil((max[0] - min[0]) / cell) + 1, ny = Math.ceil((max[1] - min[1]) / cell) + 1, nz = Math.ceil((max[2] - min[2]) / cell) + 1;
    const vals = new Float32Array(nx * ny * nz);
    const id = (i, j, k) => i + nx * (j + ny * k);
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      vals[id(i, j, k)] = fn(min[0] + i * cell, min[1] + j * cell, min[2] + k * cell);
    }
    const verts = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
    const cid = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
    const VP = [], VN = [], VC = [];
    const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
    const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    const e = cell * 0.5;
    const local = new Array(8);
    for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      let mask = 0;
      for (let q = 0; q < 8; q++) {
        const v = vals[id(i + corners[q][0], j + corners[q][1], k + corners[q][2])];
        local[q] = v;
        if (v < 0) mask |= 1 << q;
      }
      if (mask === 0 || mask === 255) continue;
      let sx = 0, sy = 0, sz = 0, cnt = 0;
      for (const [a, b] of edges) {
        const va = local[a], vb = local[b];
        if ((va < 0) === (vb < 0)) continue;
        const t = va / (va - vb);
        sx += corners[a][0] + (corners[b][0] - corners[a][0]) * t;
        sy += corners[a][1] + (corners[b][1] - corners[a][1]) * t;
        sz += corners[a][2] + (corners[b][2] - corners[a][2]) * t;
        cnt++;
      }
      const x = min[0] + (i + sx / cnt) * cell, y = min[1] + (j + sy / cnt) * cell, z = min[2] + (k + sz / cnt) * cell;
      verts[cid(i, j, k)] = VP.length / 3;
      VP.push(x, y, z);
      const n = norm([fn(x + e, y, z) - fn(x - e, y, z), fn(x, y + e, z) - fn(x, y - e, z), fn(x, y, z + e) - fn(x, y, z - e)]);
      VN.push(n[0], n[1], n[2]);
      const col = colorFn ? hex(colorFn(x, y, z)) : [1, 1, 1];
      VC.push(col[0], col[1], col[2]);
    }
    const P = [], N = [], C = [];
    const put = (v) => {
      P.push(VP[v * 3], VP[v * 3 + 1], VP[v * 3 + 2]);
      N.push(VN[v * 3], VN[v * 3 + 1], VN[v * 3 + 2]);
      C.push(VC[v * 3], VC[v * 3 + 1], VC[v * 3 + 2]);
    };
    const quad = (a, b, c, d, flip) => {
      if (a < 0 || b < 0 || c < 0 || d < 0) return;
      if (flip) { put(a); put(c); put(b); put(a); put(d); put(c); } else { put(a); put(b); put(c); put(a); put(c); put(d); }
    };
    for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const v0 = vals[id(i, j, k)] < 0;
      if (v0 !== (vals[id(i + 1, j, k)] < 0)) quad(verts[cid(i, j - 1, k - 1)], verts[cid(i, j, k - 1)], verts[cid(i, j, k)], verts[cid(i, j - 1, k)], !v0);
      if (v0 !== (vals[id(i, j + 1, k)] < 0)) quad(verts[cid(i - 1, j, k - 1)], verts[cid(i - 1, j, k)], verts[cid(i, j, k)], verts[cid(i, j, k - 1)], !v0);
      if (v0 !== (vals[id(i, j, k + 1)] < 0)) quad(verts[cid(i - 1, j - 1, k)], verts[cid(i, j - 1, k)], verts[cid(i, j, k)], verts[cid(i - 1, j, k)], !v0);
    }
    return { p: P, n: N, c: C };
  }
  // אבני בניין לפונקציות מרחק
  S.sd = {
    ell: (x, y, z, cx, cy, cz, rx, ry, rz) => {
      const a = (x - cx) / rx, b = (y - cy) / ry, c = (z - cz) / rz;
      const k0 = Math.sqrt(a * a + b * b + c * c);
      const k1 = Math.sqrt(a * a / (rx * rx) + b * b / (ry * ry) + c * c / (rz * rz));
      return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(rx, ry, rz);
    },
    cap: (x, y, z, ax, ay, az, bx, by, bz, ra, rb) => {
      const px = x - ax, py = y - ay, pz = z - az, dx = bx - ax, dy = by - ay, dz = bz - az;
      const t = Math.max(0, Math.min(1, (px * dx + py * dy + pz * dz) / (dx * dx + dy * dy + dz * dz)));
      return Math.hypot(px - dx * t, py - dy * t, pz - dz * t) - (ra + (rb - ra) * t);
    },
    smin: (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; },
    smax: (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; }
  };

  // צירוף הרבה חלקים לצורה אחת, כדי לחסוך ציורים
  S.at = (mesh, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], c } = {}) => {
    const out = new Mesh();
    const M = compose(p, r, typeof s === 'number' ? [s, s, s] : s);
    const col = c ? hex(c) : null;
    for (let i = 0; i < mesh.p.length; i += 3) {
      const x = mesh.p[i], y = mesh.p[i + 1], z = mesh.p[i + 2];
      out.p.push(M[0] * x + M[4] * y + M[8] * z + M[12], M[1] * x + M[5] * y + M[9] * z + M[13], M[2] * x + M[6] * y + M[10] * z + M[14]);
      const nx = mesh.n[i], ny = mesh.n[i + 1], nz = mesh.n[i + 2];
      const q = norm([M[0] * nx + M[4] * ny + M[8] * nz, M[1] * nx + M[5] * ny + M[9] * nz, M[2] * nx + M[6] * ny + M[10] * nz]);
      out.n.push(q[0], q[1], q[2]);
      if (col) out.c.push(col[0], col[1], col[2]);
      else out.c.push(mesh.c[i], mesh.c[i + 1], mesh.c[i + 2]);
    }
    return out;
  };
  S.merge = (...list) => {
    const out = new Mesh();
    list.flat().forEach((m) => { for (let i = 0; i < m.p.length; i++) { out.p.push(m.p[i]); out.n.push(m.n[i]); out.c.push(m.c[i]); } });
    return out;
  };

  // חלקים שחוזרים בכמה עולמות
  S.tree = (ht = 1, leaf = '#3E8E41') => S.merge(
    S.at(S.cyl(0.05, 0.08, ht * 0.5, 7), { c: '#7A5230' }),
    S.at(S.sphere(0.32, 0.36, 0.32, 8), { p: [0, ht * 0.62, 0], c: leaf }),
    S.at(S.sphere(0.24, 0.26, 0.24, 7), { p: [0.14, ht * 0.8, 0.05], c: leaf }),
    S.at(S.sphere(0.2, 0.22, 0.2, 7), { p: [-0.14, ht * 0.76, -0.08], c: leaf })
  );
  S.palm = (ht = 1.3) => {
    const leaves = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      leaves.push(S.at(S.plate([[0, -0.05], [0.25, -0.1], [0.62, -0.26], [0.25, 0.04], [0, 0.05]], 0.015), { p: [0, ht, 0], r: [0, -a, 0], c: i % 2 ? '#3C8D40' : '#4FA24A' }));
    }
    return S.merge(S.at(S.cyl(0.035, 0.07, ht, 7), { c: '#8A6A44' }), leaves);
  };
  S.cloud = (k = 1) => S.merge(
    S.at(S.sphere(0.5 * k, 0.3 * k, 0.4 * k, 10), {}),
    S.at(S.sphere(0.38 * k, 0.28 * k, 0.32 * k, 9), { p: [0.46 * k, -0.04 * k, 0] }),
    S.at(S.sphere(0.34 * k, 0.24 * k, 0.3 * k, 9), { p: [-0.48 * k, -0.06 * k, 0.05 * k] })
  );
  S.flower = (petal = '#F06AA6', centerCol = '#F6C22D', ht = 0.5) => {
    const parts = [S.at(S.cyl(0.012, 0.018, ht, 6), { c: '#3F8A3C' }), S.at(S.sphere(0.05, 0.03, 0.05, 8), { p: [0, ht, 0], c: centerCol })];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      parts.push(S.at(S.sphere(0.05, 0.016, 0.03, 6), { p: [Math.cos(a) * 0.075, ht, Math.sin(a) * 0.075], r: [0, -a, 0], c: petal }));
    }
    return S.merge(parts);
  };
  S.earthColor = (lat, lon) => {
    const wob = Math.sin(lat * 0.31 + lon * 0.17) * 3 + Math.sin(lat * 0.83 - lon * 0.41) * 2 + Math.sin(lon * 0.97 + lat * 0.23) * 1.2;
    const land = A.earthLandAt ? A.earthLandAt(lat + wob, lon + wob * 1.3) : 0;
    if (Math.abs(lat) > 76) return '#EEF3F8';
    if (land > 0.03) return Math.abs(lat) > 12 && Math.abs(lat) < 36 ? '#BFA267' : '#4E8F46';
    return '#1F5FB0';
  };
  // כדור ארץ לפי המפה של מערכת השמש. pointAt מחזיר נקודה על פניו
  S.globe = (R = 1, colorAt = S.earthColor, seg = 220) => {
    if (A.lowPower) seg = Math.min(seg, 110);
    const m = new Mesh(); const rows = Math.round(seg / 2);
    const P = (i, j) => {
      const lon = (i / seg) * 360 - 180, lat = 90 - (j / rows) * 180;
      return S.pointAt(lat, lon, R);
    };
    for (let i = 0; i < seg; i++) for (let j = 0; j < rows; j++) {
      const lon = ((i + 0.5) / seg) * 360 - 180, lat = 90 - ((j + 0.5) / rows) * 180;
      const c = hex(colorAt(lat, lon));
      const a = P(i, j), b = P(i + 1, j), e = P(i + 1, j + 1), f = P(i, j + 1);
      const n = (q) => norm(q);
      m.quad(a, f, e, b, c, n(a), n(f), n(e), n(b));
    }
    return m;
  };
  S.pointAt = (lat, lon, R = 1) => {
    const cl = Math.cos(lat * DEG);
    return [R * cl * Math.cos(lon * DEG), R * Math.sin(lat * DEG), -R * cl * Math.sin(lon * DEG)];
  };
  S.helpers = { TAU, DEG, hex, lerp, smooth, clamp01, lerp3, add, sub, mul, norm, dot };

  // ---------- מטריצות ----------
  function compose(p, r, s) {
    const cx = Math.cos(r[0]), sx = Math.sin(r[0]), cy = Math.cos(r[1]), sy = Math.sin(r[1]), cz = Math.cos(r[2]), sz = Math.sin(r[2]);
    // R = Ry * Rx * Rz
    const m00 = cy * cz + sy * sx * sz, m01 = -cy * sz + sy * sx * cz, m02 = sy * cx;
    const m10 = cx * sz, m11 = cx * cz, m12 = -sx;
    const m20 = -sy * cz + cy * sx * sz, m21 = sy * sz + cy * sx * cz, m22 = cy * cx;
    return [
      m00 * s[0], m10 * s[0], m20 * s[0], 0,
      m01 * s[1], m11 * s[1], m21 * s[1], 0,
      m02 * s[2], m12 * s[2], m22 * s[2], 0,
      p[0], p[1], p[2], 1
    ];
  }
  function mult(a, b) {
    const o = new Array(16);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      o[j * 4 + i] = a[i] * b[j * 4] + a[i + 4] * b[j * 4 + 1] + a[i + 8] * b[j * 4 + 2] + a[i + 12] * b[j * 4 + 3];
    }
    return o;
  }
  const xform = (M, p) => [M[0] * p[0] + M[4] * p[1] + M[8] * p[2] + M[12], M[1] * p[0] + M[5] * p[1] + M[9] * p[2] + M[13], M[2] * p[0] + M[6] * p[1] + M[10] * p[2] + M[14]];

  // ---------- תוכניות ציור ----------
  const VS = `attribute vec3 aP,aN,aC;uniform mat4 uVP,uM;varying vec3 vN,vC,vW;
void main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vN=mat3(uM[0].xyz,uM[1].xyz,uM[2].xyz)*aN;vC=aC;gl_Position=uVP*w;}`;
  const FS = `precision mediump float;varying vec3 vN,vC,vW;
uniform vec3 uColor,uL,uSun,uSky,uGround,uFog,uCam,uRimC;uniform float uEmis,uOp,uFogD,uSpec,uRim;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 c=uColor*vC;
float d=max(dot(n,uL),0.);vec3 hemi=mix(uGround,uSky,n.y*.5+.5);
vec3 o=c*(hemi+d*uSun)+c*uEmis;
vec3 v=normalize(uCam-vW);
if(uSpec>0.){vec3 hv=normalize(uL+v);o+=vec3(1.)*pow(max(dot(n,hv),0.),48.)*uSpec;o+=c*pow(1.-max(dot(n,v),0.),3.)*uSpec*.35;}
float a=uOp;
if(uRim>0.){float r=pow(1.-abs(dot(n,v)),2.6);o=mix(o,uRimC,r);a=uOp+r*uRim;}
float z=length(vW-uCam);float f=1.-exp(-z*z*uFogD);
gl_FragColor=vec4(mix(o,uFog,f),a);}`;
  const BG_VS = 'attribute vec2 p;varying float y;void main(){y=p.y*.5+.5;gl_Position=vec4(p,.9999,1.);}';
  const BG_FS = 'precision mediump float;varying float y;uniform vec3 uA,uB;void main(){gl_FragColor=vec4(mix(uB,uA,y),1.);}';
  const PT_VS = `attribute vec3 aP;attribute float aS;uniform mat4 uVP;uniform float uSize,uH;varying float vA;
void main(){gl_Position=uVP*vec4(aP,1.);vA=aS;gl_PointSize=max(1.,uSize*aS*uH/gl_Position.w);}`;
  const PT_FS = `precision mediump float;uniform vec3 uColor;uniform float uOp;varying float vA;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);if(d>.5)discard;gl_FragColor=vec4(uColor,uOp*smoothstep(.5,.28,d)*step(.001,vA));}`;

  function program(gl, vs, fs) {
    const make = (t, src) => {
      const s = gl.createShader(t);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, make(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) { const n = gl.getActiveUniform(p, i).name; u[n] = gl.getUniformLocation(p, n); }
    return { p, u, a: (n) => gl.getAttribLocation(p, n) };
  }

  A.SCENES3D = {};
  A.hasScene3D = (id) => !!A.SCENES3D[id];

  // ---------- העולם ----------
  class World {
    constructor(gl) { this.gl = gl; this.nodes = []; this.pts = []; }
    upload(mesh) {
      if (mesh.buf) return mesh;
      const gl = this.gl;
      const mk = (arr) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); return b; };
      mesh.buf = { p: mk(mesh.p), n: mk(mesh.n), c: mk(mesh.c), count: mesh.p.length / 3 };
      return mesh;
    }
    add(mesh, color, o = {}) {
      const node = {
        mesh: mesh ? this.upload(mesh) : null,
        color: color ? hex(color) : [1, 1, 1],
        p: o.p ? o.p.slice() : [0, 0, 0],
        r: o.r ? o.r.slice() : [0, 0, 0],
        s: o.s === undefined ? [1, 1, 1] : (typeof o.s === 'number' ? [o.s, o.s, o.s] : o.s.slice()),
        emis: o.emis || 0,
        op: o.op === undefined ? 1 : o.op,
        spec: o.spec || 0,
        rim: o.rim || 0,
        rimCol: o.rimCol ? hex(o.rimCol) : [1, 1, 1],
        glass: !!o.glass,
        parent: o.parent || null,
        visible: true
      };
      this.nodes.push(node);
      return node;
    }
    group(o = {}) { return this.add(null, null, o); }
    // חלקיקים: pos ו-size מתעדכנים בכל פריים
    points(n, o = {}) {
      const gl = this.gl;
      const pt = {
        n, pos: new Float32Array(n * 3), size: new Float32Array(n),
        color: hex(o.color || '#FFFFFF'), base: o.size || 0.1, op: o.op === undefined ? 1 : o.op,
        add: !!o.add, parent: o.parent || null, visible: true,
        bp: gl.createBuffer(), bs: gl.createBuffer()
      };
      this.pts.push(pt);
      return pt;
    }
    matrixOf(node) {
      const m = compose(node.p, node.r, node.s);
      return node.parent ? mult(this.matrixOf(node.parent), m) : m;
    }
    shown(node) {
      for (let n = node; n; n = n.parent) if (!n.visible) return false;
      return true;
    }
    pos(node, local = [0, 0, 0]) { return xform(this.matrixOf(node), local); }
  }

  // מחזיר null אם אין WebGL, ואז הנושא מוצג בלי תמונה
  A.mountScene = function mountScene(host, topicId) {
    const builder = A.SCENES3D[topicId];
    if (!builder) return null;
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'תמונת תלת ממד של הנושא');
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'low-power' });
    if (!gl) return null;

    let main, bg, pts;
    try {
      main = program(gl, VS, FS);
      bg = program(gl, BG_VS, BG_FS);
      pts = program(gl, PT_VS, PT_FS);
    } catch (e) { console.error(e); return null; }
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enable(gl.DEPTH_TEST);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const labelLayer = h('div', { 'aria-hidden': 'true' });
    const caption = h('span');
    const captionBox = h('div', { class: 'sp-caption', role: 'status' }, caption);
    const note = h('div', { class: 'sp-note' });
    const stage = h('div', { class: 'sp-stage' }, canvas, labelLayer, note, captionBox);
    host.append(stage);

    const world = new World(gl);
    const scene = builder(world, S);
    const ENV = {
      bgTop: '#BFE3FF', bgBot: '#EAF6FF', fog: 0, sun: [0.5, 0.8, 0.4], sunCol: [0.68, 0.66, 0.6],
      sky: [0.5, 0.54, 0.6], ground: [0.27, 0.25, 0.23], ...(scene.env || {})
    };

    const labelEls = [];
    const labelEl = (i) => {
      if (!labelEls[i]) { labelEls[i] = h('div', { class: 'sp-label' }); labelLayer.append(labelEls[i]); }
      return labelEls[i];
    };

    let W = 0, H = 0;
    const size = () => {
      const r = stage.getBoundingClientRect();
      if (!r.width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, A.lowPower ? 1.1 : 1.75);
      const w = Math.round(r.width * dpr), ht = Math.round(r.height * dpr);
      if (w !== canvas.width || ht !== canvas.height) { canvas.width = w; canvas.height = ht; gl.viewport(0, 0, w, ht); }
      W = r.width; H = r.height;
    };

    let shot = null, shotT = 0, yaw = 0, pitch = 0;
    let frame = 0, last = 0, visible = true, alive = true, followCam = 1;
    const cam = { t: [0, 0, 0], d: 5, az: 0, el: 0.3, fov: 40 };
    const still = matchMedia('(prefers-reduced-motion: reduce)');

    const camTarget = () => {
      const c = typeof shot.cam === 'function' ? shot.cam(still.matches ? 3 : shotT) : shot.cam;
      return { t: c.t || [0, 0, 0], d: c.d || 5, az: (c.az || 0) + (c.spin || 0) * shotT, el: c.el === undefined ? 0.3 : c.el, fov: c.fov || 40 };
    };

    let framesDrawn = 0;
    function render(dt) {
      if (!shot || !W) return;
      framesDrawn++;
      if (shot.update) shot.update(still.matches ? 3 : shotT, dt);

      const want = camTarget();
      const k = followCam >= 1 ? 1 : 1 - Math.exp(-dt / 0.55);
      cam.t = lerp3(cam.t, want.t, k);
      cam.d = lerp(cam.d, want.d, k);
      cam.az = lerp(cam.az, want.az, k);
      cam.el = lerp(cam.el, want.el, k);
      cam.fov = lerp(cam.fov, want.fov, k);

      const el = Math.max(-1.3, Math.min(1.45, cam.el + pitch));
      const az = cam.az + yaw;
      const eye = [
        cam.t[0] + cam.d * Math.cos(el) * Math.sin(az),
        cam.t[1] + cam.d * Math.sin(el),
        cam.t[2] + cam.d * Math.cos(el) * Math.cos(az)
      ];
      const fwd = norm(sub(cam.t, eye));
      const right = norm(cross(fwd, [0, 1, 0]));
      const up = cross(right, fwd);
      const aspect = W / H;
      const scale = Math.tan((cam.fov * DEG) / 2) * Math.max(1, 1.25 / aspect);
      const near = 0.05, far = 400;
      const f = 1 / scale;
      const P = [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0];
      const Vm = [right[0], up[0], -fwd[0], 0, right[1], up[1], -fwd[1], 0, right[2], up[2], -fwd[2], 0, -dot(right, eye), -dot(up, eye), dot(fwd, eye), 1];
      const VP = new Float32Array(mult(P, Vm));

      const env = { ...ENV, ...(shot.env || {}) };
      const fogCol = hex(env.fogCol || env.bgBot);

      // רקע
      gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
      gl.depthMask(false);
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(bg.p);
      gl.uniform3fv(bg.u.uA, hex(env.bgTop));
      gl.uniform3fv(bg.u.uB, hex(env.bgBot));
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      const qa = bg.a('p');
      gl.enableVertexAttribArray(qa);
      gl.vertexAttribPointer(qa, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);

      // גופים
      gl.useProgram(main.p);
      const U = main.u;
      gl.uniformMatrix4fv(U.uVP, false, VP);
      gl.uniform3fv(U.uL, norm(env.sun));
      gl.uniform3fv(U.uSun, env.sunCol);
      gl.uniform3fv(U.uSky, env.sky);
      gl.uniform3fv(U.uGround, env.ground);
      gl.uniform3fv(U.uFog, fogCol);
      gl.uniform1f(U.uFogD, env.fog);
      gl.uniform3fv(U.uCam, eye);
      const aP = main.a('aP'), aN = main.a('aN'), aC = main.a('aC');
      [aP, aN, aC].forEach((a) => gl.enableVertexAttribArray(a));

      const draw = (node, M) => {
        const b = node.mesh.buf;
        gl.bindBuffer(gl.ARRAY_BUFFER, b.p); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, b.n); gl.vertexAttribPointer(aN, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, b.c); gl.vertexAttribPointer(aC, 3, gl.FLOAT, false, 0, 0);
        gl.uniformMatrix4fv(U.uM, false, M);
        gl.uniform3fv(U.uColor, node.color);
        gl.uniform1f(U.uEmis, node.emis);
        gl.uniform1f(U.uOp, node.op);
        gl.uniform1f(U.uSpec, node.spec);
        gl.uniform1f(U.uRim, node.rim);
        gl.uniform3fv(U.uRimC, node.rimCol);
        gl.drawArrays(gl.TRIANGLES, 0, b.count);
      };
      const clear = [];
      const glass = [];
      for (const node of world.nodes) {
        if (!node.mesh || !world.shown(node) || node.op <= 0) continue;
        const M = world.matrixOf(node);
        if (node.glass) glass.push({ node, M });
        else if (node.op < 1) clear.push({ node, M, z: Math.hypot(M[12] - eye[0], M[13] - eye[1], M[14] - eye[2]) });
        else draw(node, new Float32Array(M));
      }
      if (clear.length) {
        clear.sort((a, b) => b.z - a.z);
        gl.enable(gl.BLEND);
        gl.depthMask(false);
        clear.forEach((c) => draw(c.node, new Float32Array(c.M)));
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }
      [aN, aC].forEach((a) => gl.disableVertexAttribArray(a));

      // חלקיקים
      if (world.pts.some((p) => world.shown(p))) {
        gl.useProgram(pts.p);
        gl.uniformMatrix4fv(pts.u.uVP, false, VP);
        gl.uniform1f(pts.u.uH, canvas.height * 0.5 * f);
        gl.enable(gl.BLEND);
        gl.depthMask(false);
        const paP = pts.a('aP'), paS = pts.a('aS');
        gl.enableVertexAttribArray(paP);
        gl.enableVertexAttribArray(paS);
        for (const pt of world.pts) {
          if (!world.shown(pt)) continue;
          gl.blendFunc(gl.SRC_ALPHA, pt.add ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
          gl.bindBuffer(gl.ARRAY_BUFFER, pt.bp);
          gl.bufferData(gl.ARRAY_BUFFER, pt.pos, gl.DYNAMIC_DRAW);
          gl.vertexAttribPointer(paP, 3, gl.FLOAT, false, 0, 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, pt.bs);
          gl.bufferData(gl.ARRAY_BUFFER, pt.size, gl.DYNAMIC_DRAW);
          gl.vertexAttribPointer(paS, 1, gl.FLOAT, false, 0, 0);
          gl.uniform3fv(pts.u.uColor, pt.color);
          gl.uniform1f(pts.u.uSize, pt.base);
          gl.uniform1f(pts.u.uOp, pt.op);
          gl.drawArrays(gl.POINTS, 0, pt.n);
        }
        gl.disableVertexAttribArray(paS);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      }

      // זכוכית אחרונה: רק השכבה הקרובה נצבעת, כך שהגוף נראה חלק אחד
      if (glass.length) {
        // מהאטום לשקוף: איברים בפנים לפני המעטפת שמסביבם
        glass.sort((a, b) => b.node.op - a.node.op);
        gl.useProgram(main.p);
        [aN, aC].forEach((a) => gl.enableVertexAttribArray(a));
        glass.forEach((g) => {
          gl.colorMask(false, false, false, false);
          draw(g.node, new Float32Array(g.M));
          gl.colorMask(true, true, true, true);
          gl.enable(gl.BLEND);
          gl.depthFunc(gl.LEQUAL);
          gl.depthMask(false);
          draw(g.node, new Float32Array(g.M));
          gl.depthMask(true);
          gl.depthFunc(gl.LESS);
          gl.disable(gl.BLEND);
        });
        [aN, aC].forEach((a) => gl.disableVertexAttribArray(a));
      }

      // כיתובים
      const project = (p) => {
        const v = sub(p, eye);
        const z = dot(v, fwd);
        if (z <= 0.01) return null;
        const k2 = (H / 2) / (z * scale);
        return [W / 2 + dot(v, right) * k2, H / 2 - dot(v, up) * k2];
      };
      const labels = shot.labels ? shot.labels(still.matches ? 3 : shotT) : [];
      labels.forEach((l, i) => {
        const e = labelEl(i);
        let x, y, show = l.show !== false;
        if (l.screen) { x = l.screen[0] * W; y = l.screen[1] * H; }
        else {
          const q = project(l.pos);
          if (!q) show = false;
          else { x = q[0]; y = q[1] - (l.up === undefined ? 8 : l.up); }
        }
        e.hidden = !show;
        if (!show) return;
        const labelText = A.plainText(l.text);
        if (e.textContent !== labelText) e.textContent = labelText;
        e.classList.toggle('big', !!l.big);
        e.classList.toggle('pin', !!l.pin);
        // שלא ייצא מהמסגרת
        const half = e.offsetWidth / 2 + 2;
        x = Math.max(half, Math.min(W - half, x));
        y = Math.max(e.offsetHeight + 2, y);
        e.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      });
      for (let i = labels.length; i < labelEls.length; i++) labelEls[i].hidden = true;

      const text = A.plainText(shot.caption ? shot.caption(still.matches ? 3 : shotT) : '');
      if (caption.textContent !== text) caption.textContent = text;
      captionBox.hidden = !text;
    }

    function tick(now) {
      frame = 0;
      if (!alive) return;
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
      last = now;
      if (!still.matches) shotT += dt;
      size();
      render(dt);
      followCam = 0;
      schedule();
    }
    function schedule() {
      if (!frame && visible && alive && !still.matches) frame = requestAnimationFrame(tick);
      if (!frame) last = 0;
    }
    const once = () => { size(); render(1 / 60); };

    const io = new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; schedule(); }, { rootMargin: '60px' });
    io.observe(stage);
    const ro = new ResizeObserver(once);
    ro.observe(stage);

    // גרירה מסובבת את המבט
    let drag = null;
    stage.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, yaw, pitch, mouse: e.pointerType === 'mouse' };
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      if (!drag) return;
      yaw = drag.yaw - (e.clientX - drag.x) * 0.008;
      if (drag.mouse) pitch = drag.pitch + (e.clientY - drag.y) * 0.006;
      if (still.matches) once();
    });
    const stop = () => { drag = null; };
    stage.addEventListener('pointerup', stop);
    stage.addEventListener('pointercancel', stop);

    function enter(next) {
      shot = next;
      shotT = 0;
      yaw = 0;
      pitch = 0;
      note.textContent = next.note || '';
      labelEls.forEach((l) => { l.hidden = true; });
      if (scene.groups) {
        Object.entries(scene.groups).forEach(([name, g]) => {
          g.visible = !next.group || name === next.group;
        });
      }
      if (next.enter) next.enter();
    }

    return {
      probe() {
        try {
          size();
          render(0);
          const px = new Uint8Array(4);
          let lit = 0;
          const seen = new Set();
          for (let i = 1; i < 8; i++) for (let j = 1; j < 8; j++) {
            gl.readPixels(Math.floor(canvas.width * i / 8), Math.floor(canvas.height * j / 8), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
            if (px[0] + px[1] + px[2] > 45) lit++;
            seen.add(px[0] >> 4 << 8 | px[1] >> 4 << 4 | px[2] >> 4);
          }
          return { lit, colors: seen.size };
        } catch (e) { return { lit: -1, colors: 0 }; }
      },
      diag: () => ({ frames: framesDrawn, w: canvas.width, h: canvas.height, renderer: gl.getParameter(gl.RENDERER) }),
      setCard(i) {
        const next = scene.shots[i];
        if (!next || next === shot) { schedule(); return; }
        const sameGroup = shot && shot.group === next.group;
        if (shot && sameGroup) {
          // אותו עולם: המצלמה מרחפת למקום החדש
          enter(next);
          followCam = 0;
          schedule();
          return;
        }
        if (shot) canvas.classList.add('fading');
        const apply = () => {
          if (!alive) return;
          enter(next);
          followCam = 1;
          once();
          canvas.classList.remove('fading');
          schedule();
        };
        if (shot) setTimeout(apply, 240); else apply();
      },
      // לבדיקות: לצייר רגע נתון של כרטיס, ולהחזיר את ה-canvas
      snapshot(i, t = 3) {
        enter(scene.shots[i]);
        followCam = 1;
        shotT = t;
        size();
        render(1 / 60);
        return canvas;
      },
      count: () => scene.shots.length,
      destroy() {
        alive = false;
        if (frame) cancelAnimationFrame(frame);
        io.disconnect();
        ro.disconnect();
        const lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
        stage.remove();
      }
    };
  };

  A.S3D = S;
})();
