// הרי געש: הר אמיתי עם שיפועים וערוצים, חתוך לשניים כדי לראות את המאגמה ואת שכבות הסלע,
// עם זרמי לבה לאורך המדרון, עשן וניצוצות.
(function () {
  const A = window.App;

  // רעש חלק לפני השטח
  const perm = new Uint8Array(512);
  (function () {
    let seed = 4242;
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      const j = seed % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();
  const vn = (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z);
    const fx = x - xi, fz = z - zi;
    const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    const at = (a, b) => perm[perm[(xi + a) & 255] + ((zi + b) & 255)] / 255;
    return (at(0, 0) * (1 - u) + at(1, 0) * u) * (1 - v) + (at(0, 1) * (1 - u) + at(1, 1) * u) * v;
  };
  const fbm = (x, z, oct = 4) => {
    let a = 0.5, f = 1, s = 0, n = 0;
    for (let i = 0; i < oct; i++) { s += a * vn(x * f, z * f); n += a; a *= 0.5; f *= 2.1; }
    return s / n;
  };
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  const CRATER_R = 0.85;
  const heightRaw = (x, z) => {
    const r = Math.hypot(x, z), a = Math.atan2(z, x);
    const n = fbm(x * 0.8 + 20, z * 0.8 + 20);
    const prof = 4.9 * Math.exp(-Math.pow(r / 2.35, 1.45));
    const gully = (Math.sin(a * 12 + n * 7) * 0.5 + 0.5) * 0.24 * sm(1, 1.7, r) * (1 - sm(3.4, 5.6, r));
    let y = prof - gully + (n - 0.5) * 0.75 * sm(0.7, 3, r) + (fbm(x * 3 + 7, z * 3 + 7, 3) - 0.5) * 0.14;
    if (r < CRATER_R) {
      const c = r / CRATER_R;
      const rim = 4.9 * Math.exp(-Math.pow(CRATER_R / 2.35, 1.45));
      y = rim - (1 - c * c) * 1.25 + (n - 0.5) * 0.12;
    }
    return y + 0.05;
  };
  // טבלת גבהים, כדי שהחישוב יהיה מהיר
  const N = 340, SPAN = 8.5;
  let table = null;
  const height = (x, z) => {
    if (!table) {
      table = new Float32Array(N * N);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) table[j * N + i] = heightRaw((i / (N - 1) - 0.5) * 2 * SPAN, (j / (N - 1) - 0.5) * 2 * SPAN);
    }
    const u = Math.max(0, Math.min(N - 1.001, (x / (2 * SPAN) + 0.5) * (N - 1)));
    const v = Math.max(0, Math.min(N - 1.001, (z / (2 * SPAN) + 0.5) * (N - 1)));
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
    return (table[j * N + i] * (1 - fu) + table[j * N + i + 1] * fu) * (1 - fv) + (table[(j + 1) * N + i] * (1 - fu) + table[(j + 1) * N + i + 1] * fu) * fv;
  };

  // צבע המדרון לפי גובה: דשא, סלע, אפר, ומכתש חם
  const slopeColor = (x, z, y) => {
    const r = Math.hypot(x, z);
    const n = fbm(x * 2.2, z * 2.2, 3);
    const grass = lerp3([0.27, 0.46, 0.2], [0.42, 0.56, 0.24], n);
    const rock = lerp3([0.42, 0.33, 0.27], [0.55, 0.44, 0.34], n);
    const ash = lerp3([0.2, 0.18, 0.18], [0.33, 0.29, 0.27], n);
    let c = lerp3(grass, rock, sm(0.5 + (n - 0.5), 1.5 + (n - 0.5), y));
    c = lerp3(c, ash, sm(2 + (n - 0.5) * 0.8, 3.2, y));
    if (r < CRATER_R * 1.25) c = lerp3(c, [0.42, 0.13, 0.06], sm(CRATER_R * 1.25, CRATER_R * 0.8, r));
    return c;
  };

  // זרם לבה שיורד במדרון, מהר עד הסוף
  const flowPath = (a0, len, seedV) => {
    const pts = [];
    for (let r = CRATER_R * 0.96; r < len; r += 0.09) {
      const a = a0 + (vn(r * 1.1 + seedV, seedV) - 0.5) * 0.8 * sm(0.6, 2.2, r);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      pts.push([x, height(x, z) + 0.035, z]);
    }
    return pts;
  };
  const LAVA_STOPS = [[0, [1, 0.94, 0.52]], [0.3, [1, 0.62, 0.12]], [0.68, [0.86, 0.2, 0.08]], [0.9, [0.36, 0.12, 0.08]], [1, [0.15, 0.11, 0.1]]];
  const lavaAt = (t) => {
    for (let i = 0; i + 1 < LAVA_STOPS.length; i++) {
      const [a, ca] = LAVA_STOPS[i], [b, cb] = LAVA_STOPS[i + 1];
      if (t <= b) return lerp3(ca, cb, (t - a) / (b - a));
    }
    return LAVA_STOPS[LAVA_STOPS.length - 1][1];
  };
  const flowMesh = (S, pts, width) => {
    const parts = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const t = i / (pts.length - 1);
      const r = width * (1 - t * 0.55);
      parts.push(S.at(S.tube([pts[i], pts[i + 1]], r, 7), { c: lavaAt(t) }));
    }
    return S.merge(parts);
  };

  A.SCENES3D.volcano = (w, S) => {
    const { ell, cap, smin, smax } = S.sd;

    // ---------- מאגמה ----------
    const magmaBody = (x, y, z) => {
      let d = ell(x, y, z, 0, -2.95, 0, 2.15, 0.82, 0.9);
      d = smin(d, ell(x, y, z, -1.1, -3.2, 0, 1.15, 0.5, 0.8), 0.35);
      d = smin(d, ell(x, y, z, 1.25, -2.6, 0, 0.9, 0.42, 0.8), 0.35);
      d = smin(d, cap(x, y, z, 0, -2.3, 0, 0.14, 0.5, 0, 0.27, 0.14), 0.25);
      d = smin(d, cap(x, y, z, 0.14, 0.5, 0, -0.03, 3.1, 0, 0.14, 0.2), 0.08);
      d = smin(d, cap(x, y, z, 0.15, 0.2, 0, 1.45, 1.05, 0, 0.09, 0.035), 0.1);
      d = smin(d, cap(x, y, z, 0.05, 1.3, 0, -0.95, 2.05, 0, 0.07, 0.03), 0.08);
      d = smin(d, cap(x, y, z, -1.7, -2.9, 0, -2.9, -1.4, 0, 0.1, 0.03), 0.15);
      return d;
    };
    const magmaCol = (x, y) => {
      const d = magmaBody(x, y, 0);
      const c = lerp3([1, 0.93, 0.46], [1, 0.55, 0.1], sm(-0.5, -0.12, d));
      return lerp3(c, [0.9, 0.17, 0.05], sm(-0.12, 0, d));
    };

    // ---------- גוש האדמה החתוך ----------
    const X = 6.8, BOTTOM = -4.5, BACK = -4.8;
    const blockSd = (x, y, z) => {
      const top = (y - height(x, z)) * 0.72;
      const box = Math.max(Math.abs(x) - X, BOTTOM - y, z, BACK - z);
      return Math.max(top, box);
    };
    const strataPalette = [[-0.55, [0.42, 0.29, 0.18]], [-1.25, [0.63, 0.5, 0.33]], [-1.75, [0.49, 0.37, 0.26]], [-2.6, [0.57, 0.45, 0.33]], [-3.4, [0.4, 0.31, 0.26]], [-9, [0.28, 0.23, 0.21]]];
    const blockCol = (x, y, z) => {
      const top = height(x, z);
      if (y > top - 0.13) return slopeColor(x, z, y);
      const nearFace = z > -0.25 || Math.abs(x) > X - 0.25 || y < BOTTOM + 0.2;
      if (!nearFace) return [0.3, 0.25, 0.22];
      const n = fbm(x * 1.6 + 3, y * 1.6 + 3, 3);
      const speck = vn(x * 13, y * 13);
      let c;
      if (y > 0.05 && Math.hypot(x, z) < 5.2) {
        // ההר עצמו: שכבות של לבה ואפר, במקביל לשיפוע
        const depth = top - y;
        const band = (depth * 2.3 + (n - 0.5) * 0.9) % 1;
        c = band < 0.5 ? [0.45, 0.38, 0.33] : [0.27, 0.23, 0.22];
      } else {
        const wy = y + Math.sin(x * 0.8 + 1) * 0.16 + (n - 0.5) * 0.5;
        c = strataPalette.find(([limit]) => wy > limit)[1];
      }
      c = [c[0] * (0.88 + speck * 0.24), c[1] * (0.88 + speck * 0.24), c[2] * (0.88 + speck * 0.24)];
      // סלע שהתחמם ליד המאגמה
      const hot = 1 - sm(0, 0.75, magmaBody(x, y, 0));
      return lerp3(c, [0.72, 0.21, 0.08], hot * 0.85);
    };
    const cut = w.group();
    w.add(S.iso('volcano-block', blockSd, [-X - 0.2, BOTTOM - 0.2, BACK - 0.2], [X + 0.2, 4.6, 0.2], 0.1, blockCol), '#FFFFFF', { parent: cut });
    const magmaFace = (x, y, z) => Math.max(magmaBody(x, y, z), z - 0.045);
    const magma = w.add(S.iso('volcano-magma', magmaFace, [-3.4, -4.1, -0.4], [2.6, 3.4, 0.1], 0.055, (x, y) => magmaCol(x, y)), '#FFFFFF', { parent: cut, emis: 1.15 });

    // לוחות ומעטפת מתחת
    const plateL = w.add(S.box(6.75, 0.5, 4.8), '#3F332E', { parent: cut, p: [-3.42, BOTTOM - 0.25, -2.4] });
    const plateR = w.add(S.box(6.75, 0.5, 4.8), '#463833', { parent: cut, p: [3.42, BOTTOM - 0.25, -2.4] });
    const mantle = w.add(S.box(13.6, 0.55, 4.8), '#F05A14', { parent: cut, p: [0, BOTTOM - 0.78, -2.4], emis: 1 });

    // צמחייה ובתים על המדרונות הרחוקים
    let seed = 21;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const trees = [];
    for (let i = 0; i < 44; i++) {
      const x = (rnd() - 0.5) * 12.6, z = -0.5 - rnd() * 4;
      if (Math.hypot(x, z) < 3.7) continue;
      trees.push(S.at(S.tree(0.62, i % 2 ? '#2F6E36' : '#3E8040'), { p: [x, height(x, z) - 0.02, z], s: 0.75 + rnd() * 0.45 }));
    }
    [[-5.4, -1.4], [-4.7, -2.1], [5.3, -1.6]].forEach(([x, z]) => {
      trees.push(S.at(S.box(0.3, 0.2, 0.26), { p: [x, height(x, z) + 0.1, z], c: '#E9DDC3' }));
      trees.push(S.at(S.cyl(0, 0.26, 0.17, 4), { p: [x, height(x, z) + 0.2, z], r: [0, Math.PI / 4, 0], c: '#B5482F' }));
    });
    w.add(S.merge(trees), '#FFFFFF', { parent: cut });

    // זרמי הלבה
    const flows = [[-0.42, 4.1, 3], [-2.6, 3.7, 9], [-1.15, 3.3, 15], [-1.95, 2.9, 22]].map(([a, len, sd]) => flowPath(a, len, sd));
    const flowsNode = w.add(S.merge(flows.map((p, i) => flowMesh(S, p, i < 2 ? 0.1 : 0.07))), '#FFFFFF', { parent: cut, emis: 0.95 });
    const flowGlow = w.points(90, { color: '#FFD76A', size: 0.13, add: true, parent: cut });

    // התפרצות
    const CRATER = [0, 3.15, -0.25];
    const fountain = w.points(240, { color: '#FF9A2A', size: 0.17, add: true, parent: cut });
    const embers = w.points(90, { color: '#FFE28A', size: 0.06, add: true, parent: cut });
    const craterGlow = w.points(5, { color: '#FF7A1F', size: 1.5, add: true, parent: cut, op: 0.16 });
    const smokeDark = w.points(90, { color: '#6E6764', size: 2.4, op: 0.34, parent: cut });
    const smokeLit = w.points(30, { color: '#B4471F', size: 1.25, op: 0.12, parent: cut, add: true });
    const rising = w.points(46, { color: '#FFE28A', size: 0.13, add: true, parent: cut });

    const erupt = (t, pts, base, spread, ht) => {
      for (let i = 0; i < pts.n; i++) {
        const q = (t * 0.5 + (i * 0.618) % 1) % 1;
        const a = i * 2.399, sp = spread * (0.15 + ((i * 0.37) % 1) * 0.85);
        const v = ht * (0.65 + ((i * 0.73) % 1) * 0.6);
        pts.pos.set([base[0] + Math.cos(a) * sp * q, base[1] + v * q * (2.6 - 2.45 * q), base[2] + Math.sin(a) * sp * q * 0.6], i * 3);
        pts.size[i] = 1.1 - q * 0.8;
      }
    };
    const plume = (t, pts, base, ht, lean, sizeK) => {
      for (let i = 0; i < pts.n; i++) {
        const q = (t * 0.075 + i / pts.n) % 1;
        const a = i * 2.399, wob = 0.25 + q * 2.1;
        pts.pos.set([base[0] + Math.cos(a) * wob * ((i * 0.37) % 1) + q * q * lean, base[1] + q * ht, base[2] + Math.sin(a) * wob * ((i * 0.37) % 1) * 0.7], i * 3);
        pts.size[i] = (0.28 + q * 1.15) * sizeK * sm(0, 0.05, q) * (1 - sm(0.82, 1, q));
      }
    };
    const animateFlows = (t) => {
      for (let i = 0; i < flowGlow.n; i++) {
        const p = flows[i % flows.length];
        const q = (t * 0.1 + (i * 0.618) % 1) % 1;
        flowGlow.pos.set(p[Math.floor(q * (p.length - 1))], i * 3);
        flowGlow.size[i] = 1 - q * 0.9;
      }
    };
    const animateRising = (t) => {
      for (let i = 0; i < rising.n; i++) {
        const q = (t * 0.2 + i / rising.n) % 1;
        const side = i % 3 === 0 ? 0 : (i % 3 === 1 ? -1 : 1);
        let x, y;
        if (q < 0.25) { const u = q / 0.25; x = side * (1.5 - u * 1.5) + Math.sin(i * 7) * 0.25; y = -3.3 + u * 1; } else { const u = (q - 0.25) / 0.75; x = 0.14 * Math.sin(u * 3.1) ; y = -2.3 + u * 5.4; }
        rising.pos.set([x, y, 0.08], i * 3);
        rising.size[i] = 1;
      }
    };
    const eruption = (on) => {
      [fountain, embers, smokeDark, smokeLit, craterGlow].forEach((p) => { p.visible = on; });
      flowsNode.visible = on;
      flowGlow.visible = on;
    };
    const glowOn = () => {
      for (let i = 0; i < craterGlow.n; i++) {
        craterGlow.pos.set([CRATER[0], CRATER[1] + 0.35 + i * 0.25, CRATER[2]], i * 3);
        craterGlow.size[i] = 1 - i * 0.14;
      }
    };

    // ---------- אי שגדל מהים ----------
    const isle = w.group();
    let growing, foam, isleFlowNode, islePlume, isleSmoke, steam, isleBuilt = false;
    const ensureIsle = () => {
    if (isleBuilt) return;
    isleBuilt = true;
    w.add(S.grid(70, 70, 70, 70, null, (x, z) => {
      const n = fbm(x * 0.5, z * 0.5, 3);
      const near = 1 - sm(4, 14, Math.hypot(x, z));
      return lerp3(lerp3([0.09, 0.36, 0.62], [0.13, 0.46, 0.72], n), [0.2, 0.68, 0.76], near * 0.65);
    }), '#FFFFFF', { parent: isle, p: [0, 0.01, 0] });
    const isleColor = (x, z, y) => {
      const n = fbm(x * 2, z * 2, 3);
      if (y < 0.14) return lerp3([0.88, 0.78, 0.55], [0.76, 0.66, 0.45], n);
      if (y < 1 + (n - 0.5)) return lerp3([0.3, 0.56, 0.24], [0.44, 0.63, 0.28], n);
      return slopeColor(x, z, y + 0.7);
    };
    const peak = S.grid(11, 11, 130, 130, (x, z) => {
      const r = Math.hypot(x, z);
      return height(x * 1.05, z * 1.05) * 0.86 - 0.34 - sm(3.6, 5.5, r) * 1.2;
    }, isleColor);
    growing = w.add(peak, '#FFFFFF', { parent: isle });
    foam = w.add(S.torus(3.75, 0.09, '#FFFFFF', 64, 6), '#FFFFFF', { parent: isle, p: [0, 0.03, 0], s: [1, 0.3, 1], op: 0.7, emis: 0.3 });
    const isleFlows = [-0.5, 1.5, 3.4].map((a, i) => flowPath(a, 2.9, i * 5 + 2).map(([x, y, z]) => [x / 1.05, y * 0.86 - 0.34 + 0.05, z / 1.05]));
    isleFlowNode = w.add(S.merge(isleFlows.map((p) => flowMesh(S, p, 0.075))), '#FFFFFF', { parent: isle, emis: 0.95 });
    w.add(S.merge(
      S.grid(6, 6, 46, 46, (x, z) => {
        const r = Math.hypot(x, z) / 2.3;
        return 1.35 * Math.exp(-r * r * 1.05) - 0.14 + (fbm(x * 1.6 + 40, z * 1.6, 3) - 0.5) * 0.3 * Math.min(1, r * 1.4);
      }, (x, z, y) => (y < 0.09 ? [0.88, 0.78, 0.55] : lerp3([0.27, 0.54, 0.24], [0.42, 0.62, 0.27], fbm(x * 2.2, z * 2.2, 2)))),
      S.at(S.palm(0.75), { p: [1.05, 0.28, 0.75] }), S.at(S.palm(0.7), { p: [0.3, 0.45, 1.3] }), S.at(S.palm(0.65), { p: [-1, 0.35, 0.9] })
    ), '#FFFFFF', { parent: isle, p: [-9, 0, -3] });
    islePlume = w.points(110, { color: '#FF9A2A', size: 0.15, add: true, parent: isle });
    isleSmoke = w.points(55, { color: '#3C3836', size: 2, op: 0.26, parent: isle });
    steam = w.points(40, { color: '#FFFFFF', size: 0.5, op: 0.22, parent: isle });
    };

    // ---------- טבעת האש ----------
    const globeG = w.group();
    const ring = [[60, 170], [55, -160], [58, -150], [50, -130], [38, -122], [20, -105], [10, -86], [-5, -80], [-20, -71], [-40, -73], [-55, -70], [-60, 160], [-40, 176], [-20, 170], [-5, 150], [5, 127], [15, 121], [30, 131], [36, 139], [45, 150], [55, 161], [-8, 112], [-3, 100]];
    let ringSparks, globeBuilt = false;
    const ensureGlobe = () => {
    if (globeBuilt) return;
    globeBuilt = true;
    w.add(S.globe(2), '#FFFFFF', { parent: globeG, spec: 0.12 });
    const fireG = w.group({ parent: globeG });
    ring.forEach(([lat, lon]) => {
      const n = w.add(S.lathe([[0.1, 0, '#6A2F18'], [0.03, 0.15, '#3E2118'], [0.02, 0.16, '#FF6A1C']], 10), '#FFFFFF', { parent: fireG, p: S.pointAt(lat, lon, 1.99) });
      const up = S.pointAt(lat, lon, 1);
      n.r = [Math.atan2(Math.hypot(up[0], up[2]), up[1]), Math.atan2(up[0], up[2]), 0];
    });
    ringSparks = w.points(ring.length, { color: '#FF7A1F', size: 0.17, add: true, parent: globeG });
    };

    // ---------- הרי געש כבויים בגולן ----------
    const golan = w.group();
    const cones = [[-2.4, -2, 2.1, 2.1], [2.8, -3.2, 1.8, 1.8], [0.2, -6.4, 2.7, 2.4], [-5.8, -5.5, 2, 1.9], [6.4, -6, 2.2, 1.7]];
    const golanH = (x, z) => {
      let v = 0;
      cones.forEach(([cx, cz, r, ht]) => {
        const d = Math.hypot(x - cx, z - cz);
        const k = Math.max(0, 1 - d / (r * 1.7));
        const crater = d < r * 0.3 ? Math.pow(1 - d / (r * 0.3), 1.4) * ht * 0.32 : 0;
        v = Math.max(v, ht * k * k * (3 - 2 * k) - crater);
      });
      return v + (fbm(x * 0.5 + 9, z * 0.5, 4) - 0.5) * 0.6;
    };
    const golanC = (x, z, y) => {
      const n = fbm(x * 1.8, z * 1.8, 3);
      if (y > 1.05 + (n - 0.5) * 0.5) return lerp3([0.5, 0.52, 0.36], [0.62, 0.62, 0.45], n);
      if (z > 2) {
        const field = Math.floor((x + Math.sin(z) * 0.3) / 1.5) & 1;
        return field ? lerp3([0.82, 0.7, 0.3], [0.88, 0.76, 0.36], n) : lerp3([0.34, 0.6, 0.27], [0.42, 0.66, 0.3], n);
      }
      return lerp3([0.33, 0.55, 0.26], [0.47, 0.65, 0.31], n);
    };
    let golanBuilt = false;
    const ensureGolan = () => {
    if (golanBuilt) return;
    golanBuilt = true;
    w.add(S.grid(30, 24, 140, 112, golanH, golanC), '#FFFFFF', { parent: golan, p: [0, 0, 1] });
    const orchard = [];
    for (let i = 0; i < 46; i++) {
      const x = (rnd() - 0.5) * 24, z = 3.2 + rnd() * 7;
      orchard.push(S.at(S.tree(0.62, i % 2 ? '#2F7D3B' : '#3C8A3F'), { p: [x, golanH(x, z - 1) - 0.03, z], s: 0.55 + rnd() * 0.4 }));
    }
    w.add(S.merge(orchard), '#FFFFFF', { parent: golan });
    };

    const DUSK = { bgTop: '#141B3F', bgBot: '#E37A4A', sun: [-0.42, 0.55, 0.72], sunCol: [0.82, 0.72, 0.62], sky: [0.42, 0.44, 0.58], ground: [0.26, 0.2, 0.2] };
    return {
      groups: { cut, isle, globeG, golan },
      env: DUSK,
      shots: [
        {
          group: 'cut',
          enter: () => { eruption(false); rising.visible = true; plateL.visible = true; },
          cam: { t: [0, -0.35, -1], d: 18.6, az: 0.16, el: 0.12 },
          update: (t) => {
            const s = Math.sin(t * 0.6) * 0.16;
            plateL.p[0] = -3.42 - s;
            plateR.p[0] = 3.42 + s;
            magma.emis = 1.05 + Math.sin(t * 1.8) * 0.12;
            mantle.emis = 0.95 + Math.sin(t * 1.3 + 1) * 0.1;
            animateRising(t);
          },
          labels: () => [
            { text: 'לוחות ענק שזזים לאט', pos: [-3.6, BOTTOM - 0.1, 0], up: -2 },
            { text: 'סלע מותך עמוק באדמה', pos: [3.6, BOTTOM - 0.8, 0], up: -18 },
            { text: 'מאגר מאגמה', pos: [0, -2.9, 0], up: -6, big: true },
            { text: 'שכבות של לבה ואפר', pos: [2.3, 1.75, 0], up: 0 }
          ]
        },
        {
          group: 'cut',
          enter: () => { eruption(true); rising.visible = true; glowOn(); },
          cam: { t: [0.2, 0.75, -1], d: 17, az: 0.52, el: 0.12 },
          update: (t) => {
            magma.emis = 1.1 + Math.sin(t * 3) * 0.12;
            erupt(t, fountain, CRATER, 2.1, 2.6);
            erupt(t * 0.65 + 3, embers, CRATER, 3.2, 3.5);
            plume(t, smokeDark, [0, 3.6, -0.3], 11, 5, 1);
            plume(t, smokeLit, [0, 3.4, -0.3], 3.2, 0.5, 0.75);
            animateFlows(t);
            animateRising(t);
          },
          labels: () => [
            { text: 'לבה: הסלע המותך בחוץ', pos: [2.2, 2.55, -1.3], up: 8 },
            { text: 'מאגמה: הסלע המותך בפנים', pos: [0.1, -0.8, 0], up: 0 },
            { text: 'הלבה מתקררת והופכת לסלע', pos: [3.75, 0.85, -1.9], up: 2 }
          ]
        },
        {
          group: 'isle',
          enter: ensureIsle,
          env: { bgTop: '#4F8CD0', bgBot: '#F5D9B5', sun: [-0.4, 0.75, 0.55], sunCol: [0.75, 0.7, 0.6], sky: [0.52, 0.56, 0.62], ground: [0.26, 0.26, 0.28], fog: 0.00045, fogCol: '#F5D9B5' },
          cam: { t: [-2.4, 1.1, -0.8], d: 19, az: 0.25, el: 0.2 },
          update: (t) => {
            const q = (t % 14) / 14;
            const xz = 0.45 + q * 0.75, yy = 0.3 + q * 0.95;
            growing.s = [xz, yy, xz];
            isleFlowNode.s = [xz, yy, xz];
            foam.s = [xz, 0.3, xz];
            const top = yy * 3.2;
            erupt(t, islePlume, [0, top, 0], 1.3 * xz, 1.7);
            plume(t, isleSmoke, [0, top, 0], 9, 5, 0.95);
            for (let i = 0; i < steam.n; i++) {
              const a = i * 2.399, qq = (t * 0.2 + i / steam.n) % 1, r = 3.7 * xz;
              steam.pos.set([Math.cos(a) * r, qq * 1.5, Math.sin(a) * r], i * 3);
              steam.size[i] = (1 - qq) * (i % 3 === 0 ? 1 : 0);
            }
          },
          labels: (t) => [
            { text: 'אי חדש גדל מהתפרצויות', pos: [0, (0.3 + ((t % 14) / 14) * 0.95) * 3.3, 0], up: 12 },
            { text: 'אי ישן שכבר ירוק', pos: [-9, 1.3, -3], up: 8 }
          ],
          caption: (t) => `לבה ואפר נערמים: האי נבנה, שכבה אחרי שכבה (${Math.round(((t % 14) / 14) * 100)}%)`
        },
        {
          group: 'globeG',
          enter: ensureGlobe,
          env: { bgTop: '#04071A', bgBot: '#0B1436', sky: [0.68, 0.68, 0.74], ground: [0.42, 0.42, 0.48], sun: [0.3, 0.6, 1], sunCol: [0.5, 0.5, 0.5] },
          cam: { t: [0, 0, 0], d: 5.6, az: 0, el: 0.12 },
          update: (t) => {
            globeG.r[1] = 1.8 + t * 0.14;
            ring.forEach(([lat, lon], i) => {
              ringSparks.pos.set(S.pointAt(lat, lon, 2.15), i * 3);
              ringSparks.size[i] = 0.55 + Math.max(0, Math.sin(t * 2.5 + i * 1.3)) * 0.8;
            });
          },
          caption: () => 'כל נקודה כתומה: הר געש בטבעת האש, סביב האוקיינוס השקט'
        },
        {
          group: 'golan',
          enter: ensureGolan,
          env: { bgTop: '#7FBCEB', bgBot: '#F7EFD6', sun: [-0.55, 0.65, 0.5], sunCol: [0.8, 0.74, 0.62], sky: [0.5, 0.54, 0.6], ground: [0.26, 0.25, 0.22], fog: 0.0008, fogCol: '#F7EFD6' },
          cam: { t: [-0.5, 0.5, -1.2], d: 12, az: 0.12, el: 0.34, spin: 0.012 },
          labels: () => [
            { text: 'הר געש כבוי', pos: [-2.4, 2.2, -1], up: 6 },
            { text: 'גומה בראש ההר: המכתש', pos: [0.2, 2.5, -5.4], up: 6 },
            { text: 'אדמה פורייה: שדות ומטעים', pos: [1, 0.4, 6], up: 2 }
          ],
          caption: () => 'כך נראית רמת הגולן: הרים עגולים עם גומה בראש'
        }
      ]
    };
  };
})();
