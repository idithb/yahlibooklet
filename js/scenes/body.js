// גוף האדם: גוף זכוכית אחד וחלק, ובתוכו שלד, לב וכלי דם, ריאות, מוח ועצבים.
// הגובה כ-1.75 יחידות. הפנים לכיוון +z, ולכן צד שמאל של האדם הוא +x.
(function () {
  const A = window.App;
  const TAU = Math.PI * 2;

  const curve = (pts, n = 24) => {
    const out = [];
    const steps = Math.ceil(n / (pts.length - 1));
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
      for (let k = 0; k < steps; k++) {
        const t = k / steps, t2 = t * t, t3 = t2 * t;
        out.push([0, 1, 2].map((a) => 0.5 * (2 * p1[a] + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3)));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  };
  const mirror = (pts) => pts.map(([x, y, z]) => [-x, y, z]);

  A.SCENES3D.body = (w, S) => {
    const { ell, cap, smin, smax } = S.sd;

    // ---------- הגוף ----------
    const bodySd = (x0, y, z) => {
      const x = Math.abs(x0);
      let d = ell(x, y, z, 0, 1.635, 0.005, 0.082, 0.108, 0.098);
      d = smin(d, ell(x, y, z, 0, 1.565, 0.028, 0.06, 0.055, 0.068), 0.03);
      d = smin(d, cap(x, y, z, 0, 1.53, -0.005, 0, 1.43, -0.005, 0.05, 0.056), 0.03);
      let t = ell(x, y, z, 0, 1.27, 0, 0.162, 0.2, 0.1);
      t = smin(t, ell(x, y, z, 0.072, 1.31, 0.052, 0.085, 0.068, 0.052), 0.03);
      t = smin(t, cap(x, y, z, 0, 1.455, -0.008, 0.155, 1.41, -0.008, 0.05, 0.045), 0.05);
      t = smin(t, ell(x, y, z, 0, 1.06, 0, 0.13, 0.2, 0.085), 0.05);
      t = smin(t, ell(x, y, z, 0, 0.92, 0, 0.158, 0.11, 0.098), 0.05);
      t = smin(t, ell(x, y, z, 0.07, 0.87, -0.042, 0.082, 0.088, 0.075), 0.04);
      d = smin(d, t, 0.035);
      let arm = ell(x, y, z, 0.186, 1.39, 0, 0.056, 0.075, 0.058);
      arm = smin(arm, cap(x, y, z, 0.192, 1.38, 0, 0.218, 1.1, -0.005, 0.043, 0.034), 0.02);
      arm = smin(arm, cap(x, y, z, 0.218, 1.1, -0.005, 0.25, 0.85, 0.012, 0.037, 0.023), 0.015);
      arm = smin(arm, ell(x, y, z, 0.26, 0.785, 0.02, 0.018, 0.052, 0.034), 0.012);
      arm = smin(arm, cap(x, y, z, 0.247, 0.81, 0.042, 0.236, 0.755, 0.056, 0.011, 0.008), 0.008);
      d = smin(d, arm, 0.03);
      let leg = cap(x, y, z, 0.085, 0.88, 0, 0.09, 0.5, 0.005, 0.08, 0.05);
      leg = smin(leg, ell(x, y, z, 0.09, 0.49, 0.012, 0.05, 0.05, 0.05), 0.015);
      leg = smin(leg, cap(x, y, z, 0.09, 0.46, 0, 0.09, 0.09, -0.01, 0.046, 0.028), 0.015);
      leg = smin(leg, ell(x, y, z, 0.09, 0.34, -0.02, 0.044, 0.09, 0.048), 0.02);
      leg = smin(leg, cap(x, y, z, 0.09, 0.042, -0.03, 0.098, 0.028, 0.12, 0.034, 0.024), 0.02);
      return smin(d, leg, 0.03);
    };
    const shellMesh = S.iso('body', bodySd, [-0.34, -0.02, -0.17], [0.34, 1.78, 0.19], 0.0145);
    const shell = w.add(shellMesh, '#6FC7FF', { op: 0.035, rim: 0.72, rimCol: '#A9E8FF', glass: true, emis: 0.4 });

    // במה
    const stage = w.group();
    w.add(S.cyl(0.62, 0.66, 0.03, 64), '#1A2C57', { parent: stage, p: [0, -0.03, 0], spec: 0.25 });
    [0.34, 0.5, 0.62].forEach((r, i) => w.add(S.torus(r, 0.0035, '#5FD0FF', 72, 5), '#5FD0FF', { parent: stage, p: [0, 0.002, 0], emis: 1, op: i === 2 ? 0.9 : 0.45 }));

    // ---------- שלד ----------
    const bone = '#D8CEB4';
    const bonePart = (a, b, r, knob = 1.7) => S.tube(
      Array.from({ length: 11 }, (_, i) => S.helpers.lerp3(a, b, i / 10)),
      (t) => r * (1 + (knob - 1) * Math.pow(Math.abs(2 * t - 1), 5)),
      9
    );
    const skullSd = (x0, y, z) => {
      const x = Math.abs(x0);
      let d = ell(x, y, z, 0, 1.66, -0.005, 0.07, 0.08, 0.088);
      d = smin(d, ell(x, y, z, 0, 1.585, 0.042, 0.05, 0.05, 0.04), 0.02);
      d = smax(d, -ell(x, y, z, 0.03, 1.625, 0.078, 0.021, 0.018, 0.024), 0.006);
      d = smax(d, -cap(x, y, z, 0, 1.59, 0.09, 0, 1.575, 0.09, 0.012, 0.009), 0.005);
      d = smax(d, -ell(x, y, z, 0.064, 1.625, 0.03, 0.012, 0.012, 0.022), 0.01);
      const jaw = smax(ell(x, y, z, 0, 1.525, 0.04, 0.046, 0.03, 0.044), -ell(x, y, z, 0, 1.56, 0.03, 0.036, 0.026, 0.04), 0.008);
      return Math.min(d, jaw);
    };
    const pelvisSd = (x0, y, z) => {
      const x = Math.abs(x0);
      let d = ell(x, y, z, 0.082, 0.945, -0.014, 0.058, 0.058, 0.013);
      d = smin(d, cap(x, y, z, 0.07, 0.88, 0.02, 0.02, 0.83, 0.05, 0.016, 0.014), 0.015);
      d = smin(d, cap(x, y, z, 0.075, 0.87, -0.01, 0.045, 0.8, 0.03, 0.018, 0.012), 0.012);
      d = smin(d, ell(x, y, z, 0, 0.925, -0.05, 0.03, 0.055, 0.014), 0.014);
      d = smin(d, ell(x, y, z, 0.097, 0.875, -0.004, 0.022, 0.022, 0.022), 0.012);
      return smax(d, -ell(x, y, z, 0.05, 0.835, 0.03, 0.024, 0.026, 0.05), 0.005);
    };
    const skel = [];
    skel.push(S.iso('skull', skullSd, [-0.1, 1.48, -0.11], [0.1, 1.76, 0.12], 0.0058));
    skel.push(S.iso('pelvis', pelvisSd, [-0.18, 0.76, -0.09], [0.18, 1.02, 0.09], 0.0075));
    // עמוד השדרה
    const spineAt = (s) => [0, 1.49 - s * 0.56, -0.052 + Math.sin(s * Math.PI * 1.25 + 0.2) * 0.03];
    for (let i = 0; i < 24; i++) {
      const s = i / 23, p = spineAt(s), r = 0.014 + s * 0.012;
      skel.push(S.at(S.cyl(r, r, 0.015 + s * 0.006, 10), { p }));
      skel.push(S.at(S.box(0.008, 0.012, 0.022), { p: [p[0], p[1] + 0.008, p[2] - 0.024] }));
    }
    // צלעות
    for (let i = 0; i < 12; i++) {
      const y = 1.415 - i * 0.033, rx = 0.08 + Math.sin(((i + 1) / 13) * Math.PI) * 0.058, rz = 0.06 + Math.sin(((i + 1) / 13) * Math.PI) * 0.028;
      const end = i < 7 ? 1 : 1 - (i - 6) * 0.1;
      [1, -1].forEach((k) => {
        const pts = [];
        for (let q = 0; q <= 18; q++) {
          const a = -Math.PI / 2 + (q / 18) * Math.PI * end;
          pts.push([k * Math.cos(a) * rx, y - q * 0.0025, -0.012 + Math.sin(a) * rz]);
        }
        skel.push(S.tube(pts, 0.0048, 6));
      });
    }
    skel.push(S.tube(curve([[0, 1.405, 0.05], [0, 1.31, 0.076], [0, 1.2, 0.07]], 10), (t) => 0.014 - t * 0.006, 8));
    // כתפיים וידיים, רגליים וכפות
    [1, -1].forEach((k) => {
      const v = (x, y, z = 0) => [k * x, y, z];
      skel.push(S.tube(curve([v(0.012, 1.405, 0.045), v(0.08, 1.425, 0.03), v(0.17, 1.42, -0.015)], 10), 0.0065, 7));
      skel.push(S.at(S.sphere(0.042, 0.052, 0.005, 12), { p: v(0.105, 1.345, -0.078), r: [0, k * 0.35, 0] }));
      skel.push(S.at(S.sphere(0.024, 0.024, 0.024, 10), { p: v(0.188, 1.388, 0) }));
      skel.push(bonePart(v(0.19, 1.37, 0), v(0.215, 1.115, -0.004), 0.0105));
      skel.push(S.at(S.sphere(0.017, 0.016, 0.016, 8), { p: v(0.216, 1.105, -0.004) }));
      skel.push(bonePart(v(0.208, 1.09, -0.002), v(0.238, 0.85, 0.018), 0.0065));
      skel.push(bonePart(v(0.225, 1.09, -0.008), v(0.258, 0.85, 0), 0.006));
      skel.push(S.at(S.sphere(0.021, 0.014, 0.012, 8), { p: v(0.25, 0.838, 0.01) }));
      for (let f = 0; f < 4; f++) {
        const fz = -0.008 + f * 0.012;
        const top = [k * (0.258 + f * 0.001), 0.828, fz], mid = [k * 0.263, 0.785, fz], tip = [k * 0.266, 0.735 + f * 0.003, fz];
        skel.push(S.tube([top, mid], 0.0034, 5), S.tube([mid, tip], 0.0028, 5));
      }
      skel.push(S.tube([v(0.245, 0.825, 0.03), v(0.238, 0.79, 0.05), v(0.236, 0.76, 0.056)], 0.0035, 5));
      skel.push(S.at(S.sphere(0.025, 0.025, 0.025, 10), { p: v(0.105, 0.872, 0) }));
      skel.push(bonePart(v(0.102, 0.86, 0.002), v(0.09, 0.51, 0.006), 0.0135, 1.8));
      skel.push(S.at(S.sphere(0.017, 0.017, 0.009, 9), { p: v(0.09, 0.495, 0.046) }));
      skel.push(bonePart(v(0.086, 0.47, 0.008), v(0.086, 0.085, -0.006), 0.0115, 1.8));
      skel.push(bonePart(v(0.112, 0.46, -0.008), v(0.112, 0.09, -0.012), 0.0048, 1.6));
      skel.push(S.at(S.sphere(0.022, 0.018, 0.034, 9), { p: v(0.092, 0.05, -0.03) }));
      for (let f = 0; f < 5; f++) {
        const fx = 0.073 + f * 0.0085, zEnd = 0.128 - f * 0.009;
        skel.push(S.tube([v(0.09, 0.04, 0), v(fx, 0.024, 0.07), v(fx, 0.012, zEnd)], 0.0038, 5));
      }
    });
    const skeleton = w.add(S.merge(skel), bone, { spec: 0.08 });

    // ---------- לב וכלי דם ----------
    const heartSd = (x, y, z) => {
      let d = cap(x, y, z, 0, 0.02, 0.004, 0.036, -0.06, 0.02, 0.043, 0.01);
      d = smin(d, ell(x, y, z, -0.022, 0.01, 0.01, 0.034, 0.042, 0.036), 0.02);
      d = smin(d, ell(x, y, z, -0.038, 0.038, 0.004, 0.024, 0.024, 0.023), 0.012);
      d = smin(d, ell(x, y, z, 0.03, 0.044, -0.018, 0.022, 0.02, 0.022), 0.012);
      // חריץ בין החדרים
      const groove = Math.abs((x - 0.008) - (0.02 - y) * 0.38) - 0.0013;
      d = smax(d, -Math.max(groove, z < 0 ? 1 : -1), 0.004);
      return d;
    };
    const heartCol = (x, y, z) => {
      const n = Math.sin(x * 190 + y * 120) * Math.sin(y * 170 - z * 150);
      const base = S.helpers.lerp3([0.66, 0.1, 0.13], [0.86, 0.22, 0.2], n * 0.5 + 0.5);
      return S.helpers.lerp3(base, [0.93, 0.76, 0.42], S.helpers.smooth(0.03, 0.06, y) * 0.55);
    };
    const heart = w.group({ p: [0.026, 1.27, 0.03], s: 1.12 });
    let heartNode = null;
    const ensureHeart = () => {
      if (!heartNode) heartNode = w.add(S.iso('heart', heartSd, [-0.08, -0.09, -0.06], [0.08, 0.08, 0.07], 0.0038, heartCol), '#FFFFFF', { parent: heart, spec: 0.45, emis: 0.1 });
    };
    w.add(S.tube(curve([[-0.002, 0.04, 0.008], [0.002, 0.092, 0.012], [0.024, 0.116, 0.002], [0.042, 0.094, -0.025], [0.042, 0.04, -0.045]], 18), 0.0105, 9), '#D9293B', { parent: heart, spec: 0.5 });
    w.add(S.tube(curve([[0.014, 0.038, 0.024], [0.02, 0.075, 0.018], [0.002, 0.086, -0.012], [-0.03, 0.08, -0.024]], 12), 0.0085, 9), '#3E74C9', { parent: heart, spec: 0.5 });
    w.add(S.tube(curve([[-0.042, 0.05, 0.002], [-0.044, 0.1, 0], [-0.045, 0.155, 0]], 8), 0.0092, 9), '#2F5FB5', { parent: heart, spec: 0.45 });
    w.add(S.merge(
      S.tube(curve([[0.012, 0.04, 0.038], [0.015, 0.005, 0.044], [0.024, -0.035, 0.038]], 10), 0.0019, 5),
      S.tube(curve([[-0.014, 0.038, 0.034], [-0.02, 0, 0.04], [-0.004, -0.045, 0.03]], 10), 0.0017, 5)
    ), '#F7D27A', { parent: heart, emis: 0.2 });

    const paths = {
      art: [
        [[0.03, 1.36, -0.02], [0.012, 1.26, -0.035], [0.006, 1.1, -0.03], [0.008, 0.96, -0.02], [0.05, 0.88, -0.004], [0.086, 0.7, 0.03], [0.078, 0.5, -0.012], [0.082, 0.22, -0.01], [0.085, 0.05, 0.05]],
        [[0.03, 1.36, -0.02], [0.012, 1.26, -0.035], [0.006, 1.1, -0.03], [-0.008, 0.96, -0.02], [-0.05, 0.88, -0.004], [-0.086, 0.7, 0.03], [-0.078, 0.5, -0.012], [-0.082, 0.22, -0.01], [-0.085, 0.05, 0.05]],
        [[0.03, 1.38, -0.015], [0.1, 1.41, 0], [0.19, 1.34, 0.015], [0.21, 1.1, 0.012], [0.24, 0.87, 0.018], [0.26, 0.77, 0.02]],
        [[0.01, 1.38, -0.01], [-0.1, 1.41, 0], [-0.19, 1.34, 0.015], [-0.21, 1.1, 0.012], [-0.24, 0.87, 0.018], [-0.26, 0.77, 0.02]],
        [[0.022, 1.385, 0], [0.028, 1.5, 0.01], [0.038, 1.6, 0.02], [0.03, 1.69, 0.03]],
        [[0.002, 1.385, 0], [-0.028, 1.5, 0.01], [-0.038, 1.6, 0.02], [-0.03, 1.69, 0.03]]
      ]
    };
    const off = (route, dx, dz) => route.map(([x, y, z]) => [x + (x >= 0 ? dx : -dx), y, z + dz]);
    const artCurves = paths.art.map((r) => curve(r, 40));
    const veinCurves = paths.art.map((r) => curve(off(r, 0.012, -0.012).reverse(), 40));
    const vessels = w.group();
    w.add(S.merge(artCurves.map((c) => S.tube(c, (t) => 0.0062 - t * 0.0034, 6))), '#E8283A', { parent: vessels, emis: 0.45, spec: 0.3 });
    w.add(S.merge(veinCurves.map((c) => S.tube(c, (t) => 0.0028 + t * 0.0034, 6))), '#3574DB', { parent: vessels, emis: 0.45, spec: 0.3 });
    const redCells = w.points(110, { color: '#FF5261', size: 0.0125 });
    const blueCells = w.points(110, { color: '#5E9BFF', size: 0.0125 });

    // ---------- ריאות ----------
    const lungSd = (x0, y, z) => {
      const x = Math.abs(x0);
      let d = ell(x, y, z, 0.088, 1.285, -0.006, 0.072, 0.138, 0.076);
      d = smin(d, ell(x, y, z, 0.1, 1.215, -0.008, 0.066, 0.07, 0.07), 0.03);
      if (x0 > 0) d = smax(d, -ell(x0, y, z, 0.022, 1.255, 0.05, 0.05, 0.062, 0.05), 0.012);
      d = smax(d, -ell(x, y, z, 0, 1.04, -0.01, 0.2, 0.135, 0.13), 0.012);
      // חריץ בין האונות
      const fissure = Math.abs(y - (1.3 - (x - 0.09) * 0.2 + z * 0.75)) - 0.0018;
      return smax(d, -fissure, 0.004);
    };
    const lungCol = (x, y, z) => {
      const n = Math.sin(x * 240 + Math.sin(y * 180) * 2) * Math.sin(y * 210 + Math.sin(z * 200) * 2) * Math.sin(z * 230);
      return S.helpers.lerp3([0.89, 0.5, 0.56], [0.98, 0.74, 0.74], n * 0.5 + 0.5);
    };
    const lungsNode = w.group({ p: [0, 1.27, 0] });
    let lungsMesh = null;
    const ensureLungs = () => {
      if (!lungsMesh) lungsMesh = w.add(S.at(S.iso('lungs', lungSd, [-0.19, 1.13, -0.1], [0.19, 1.44, 0.09], 0.005, lungCol), { p: [0, -1.27, 0] }), '#FFFFFF', { parent: lungsNode, op: 0.62, spec: 0.3, emis: 0.1, glass: true, rim: 0.25, rimCol: '#FFDDE0' });
    };
    const tree = [];
    const branch = (a, dir, len, r, depth) => {
      const b = S.helpers.add(a, S.helpers.mul(dir, len));
      tree.push(S.tube([a, b], r, 6));
      if (depth <= 0) return;
      const swing = 0.62;
      [-1, 1].forEach((k) => {
        const yaw = k * swing + (depth % 2 ? 0.25 : -0.25);
        const c = Math.cos(yaw), s = Math.sin(yaw);
        const nd = S.helpers.norm([dir[0] * c - dir[1] * s, dir[0] * s + dir[1] * c, dir[2] + k * (depth % 2 ? 0.34 : -0.34)]);
        branch(b, nd, len * 0.72, r * 0.72, depth - 1);
      });
    };
    const trachea = curve([[0, 1.52, 0.025], [0, 1.45, 0.022], [0, 1.385, 0.012]], 8);
    tree.push(S.tube(trachea, 0.012, 10));
    for (let i = 0; i < 9; i++) tree.push(S.at(S.torus(0.0125, 0.0018, null, 14, 4), { p: [0, 1.515 - i * 0.015, 0.024 - i * 0.0012] }));
    [1, -1].forEach((k) => {
      const mid = [k * 0.03, 1.355, 0.006];
      tree.push(S.tube([[0, 1.385, 0.012], mid], 0.008, 7));
      branch(mid, S.helpers.norm([k * 0.75, -0.65, -0.03]), 0.032, 0.0058, 5);
    });
    const bronchi = w.add(S.merge(tree), '#F4E3D7', { spec: 0.2, emis: 0.18 });
    const diaphragm = w.add(S.sphere(0.128, 0.024, 0.082, 26), '#B8504F', { p: [0, 1.125, -0.008], spec: 0.2, s: 1 });
    const airIn = w.points(50, { color: '#7FD6FF', size: 0.011 });
    const airOut = w.points(50, { color: '#C7B3FF', size: 0.011 });

    // ---------- מוח ועצבים ----------
    const gyri = (x, y, z) => Math.sin(x * 165 + Math.sin(z * 105) * 2.1) * Math.sin(y * 150 + Math.sin(x * 95) * 1.7) * Math.sin(z * 135 + Math.sin(y * 115) * 1.6);
    const brainSd = (x0, y, z) => {
      const x = Math.abs(x0);
      let d = ell(x, y, z, 0.031, 0.012, 0.002, 0.039, 0.05, 0.079);
      d = smin(d, ell(x, y, z, 0.038, -0.024, 0.012, 0.032, 0.026, 0.05), 0.012);
      const near = d > -0.012 && d < 0.012;
      if (near) d += gyri(x, y, z) * 0.0022;
      let c = ell(x, y, z, 0, -0.04, -0.054, 0.042, 0.022, 0.03);
      if (c < 0.01) c += Math.sin(y * 680) * 0.0006;
      d = smin(d, c, 0.003);
      return smin(d, cap(x, y, z, 0, -0.03, -0.018, 0, -0.08, -0.034, 0.012, 0.0095), 0.004);
    };
    const brainCol = (x0, y, z) => {
      const x = Math.abs(x0);
      if (y < -0.022 && z < -0.03) return Math.sin(y * 680) > 0 ? '#DF9CA8' : '#C97F91';
      const g = gyri(x, y, z);
      return S.helpers.lerp3([0.72, 0.4, 0.47], [0.97, 0.74, 0.74], S.helpers.smooth(-0.55, 0.45, g));
    };
    const brain = w.group({ p: [0, 1.665, 0.002] });
    const brainMeshArgs = () => S.iso('brain', brainSd, [-0.082, -0.095, -0.095], [0.082, 0.072, 0.092], 0.0029, brainCol);
    let brainNode = null;
    const ensureBrain = () => {
      if (!brainNode) brainNode = w.add(brainMeshArgs(), '#FFFFFF', { parent: brain, spec: 0.4, emis: 0.1 });
    };
    const cordPts = curve([[0, 1.59, -0.02], [0, 1.43, -0.045], [0, 1.23, -0.067], [0, 1.03, -0.03], [0, 0.93, -0.035]], 24);
    const nerveRoutes = [
      [[0, 1.42, -0.045], [0.1, 1.42, -0.015], [0.19, 1.36, 0.008], [0.215, 1.1, 0.005], [0.245, 0.87, 0.013], [0.262, 0.77, 0.022]],
      [[0, 1.42, -0.045], [-0.1, 1.42, -0.015], [-0.19, 1.36, 0.008], [-0.215, 1.1, 0.005], [-0.245, 0.87, 0.013], [-0.262, 0.77, 0.022]],
      [[0, 0.95, -0.035], [0.075, 0.82, -0.03], [0.09, 0.5, -0.018], [0.09, 0.16, -0.015], [0.093, 0.05, 0.07]],
      [[0, 0.95, -0.035], [-0.075, 0.82, -0.03], [-0.09, 0.5, -0.018], [-0.09, 0.16, -0.015], [-0.093, 0.05, 0.07]]
    ].map((r) => curve(r, 34));
    const nerveSide = [];
    nerveRoutes.forEach((r) => {
      for (let i = 4; i < r.length - 2; i += 5) {
        const p = r[i];
        const k = i % 2 ? 1 : -1;
        nerveSide.push(S.tube([p, [p[0] + k * 0.022, p[1] - 0.025, p[2] + 0.016]], 0.0011, 4));
      }
    });
    const nerves = w.add(S.merge(S.tube(cordPts, 0.0065, 7), nerveRoutes.map((c) => S.tube(c, (t) => 0.0034 - t * 0.0018, 5)), nerveSide), '#F7D35A', { emis: 0.7, spec: 0.2 });
    const signalRoute = [...cordPts.slice(0, 7), ...nerveRoutes[0]];
    const sparks = w.points(26, { color: '#FFF1A0', size: 0.02, add: true });
    const brainSparks = w.points(40, { color: '#FFF4B0', size: 0.012, add: true });

    // ---------- חושים: ראש זכוכית עם האיברים שבפנים ----------
    const headSd = (x0, y, z) => {
      const x = Math.abs(x0);
      let d = ell(x, y, z, 0, 1.645, -0.005, 0.082, 0.105, 0.096);
      d = smin(d, ell(x, y, z, 0, 1.57, 0.028, 0.058, 0.056, 0.066), 0.03);
      d = smin(d, cap(x, y, z, 0, 1.53, -0.01, 0, 1.45, -0.01, 0.048, 0.056), 0.025);
      d = smin(d, cap(x, y, z, 0, 1.635, 0.088, 0, 1.592, 0.108, 0.009, 0.0135), 0.016);
      d = smin(d, ell(x, y, z, 0.013, 1.587, 0.1, 0.012, 0.008, 0.012), 0.006);
      d = smin(d, ell(x, y, z, 0.03, 1.668, 0.08, 0.03, 0.009, 0.014), 0.014);
      d = smin(d, ell(x, y, z, 0.043, 1.6, 0.07, 0.025, 0.02, 0.02), 0.022);
      d = smin(d, ell(x, y, z, 0, 1.558, 0.091, 0.022, 0.0065, 0.009), 0.006);
      d = smin(d, ell(x, y, z, 0, 1.542, 0.088, 0.018, 0.0065, 0.009), 0.006);
      d = smin(d, ell(x, y, z, 0, 1.514, 0.075, 0.018, 0.016, 0.014), 0.018);
      d = smax(d, -ell(x, y, z, 0.031, 1.636, 0.091, 0.021, 0.0105, 0.012), 0.006);
      let ear = ell(x, y, z, 0.086, 1.625, -0.008, 0.008, 0.033, 0.022);
      ear = smax(ear, -ell(x, y, z, 0.095, 1.628, -0.004, 0.007, 0.018, 0.012), 0.004);
      return smin(d, ear, 0.006);
    };
    const senses = w.group();
    let headNode = null;
    const ensureHead = () => {
      if (!headNode) headNode = w.add(S.iso('head', headSd, [-0.12, 1.43, -0.13], [0.12, 1.78, 0.14], 0.0044), '#6FC7FF', { parent: senses, op: 0.04, rim: 0.68, rimCol: '#B5ECFF', glass: true, emis: 0.45 });
    };
    const eyes = [1, -1].map((k) => {
      const g = w.group({ parent: senses, p: [k * 0.031, 1.636, 0.066] });
      w.add(S.sphere(0.0125, 0.0125, 0.0125, 16), '#FBFBF6', { parent: g, spec: 0.8 });
      w.add(S.sphere(0.0064, 0.0064, 0.0024, 14), '#3C7FC2', { parent: g, p: [0, 0, 0.0108], emis: 0.2 });
      w.add(S.sphere(0.0031, 0.0031, 0.0014, 10), '#0B0B10', { parent: g, p: [0, 0, 0.0128] });
      return g;
    });
    w.add(S.at(S.sphere(0.019, 0.0065, 0.034, 14), { p: [0, 1.564, 0.046] }), '#EC7D92', { parent: senses, spec: 0.5, emis: 0.15 });
    w.add(S.merge(S.tube(curve([[0, 1.6, 0.09], [0, 1.622, 0.068], [0, 1.655, 0.042]], 10), 0.0013, 5)), '#F7D35A', { parent: senses, emis: 0.8 });
    const cochlea = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * TAU * 2.4, r = 0.0115 - i * 0.00024;
      cochlea.push([0.054, 1.62 + Math.sin(a) * r, -0.002 + Math.cos(a) * r]);
    }
    w.add(S.merge(S.tube(cochlea, 0.0019, 6), S.tube([[0.086, 1.625, -0.003], [0.064, 1.622, -0.002]], 0.002, 6)), '#FFC94D', { parent: senses, spec: 0.5, emis: 0.3 });
    const senseBrain = w.group({ parent: senses });
    const senseRoutes = {
      eye: curve([[0.031, 1.636, 0.056], [0.024, 1.648, 0.03], [0.012, 1.66, 0.014]], 14),
      eye2: curve([[-0.031, 1.636, 0.056], [-0.024, 1.648, 0.03], [-0.012, 1.66, 0.014]], 14),
      nose: curve([[0, 1.655, 0.042], [0, 1.668, 0.032], [0, 1.676, 0.02]], 10),
      ear: curve([[0.054, 1.62, -0.002], [0.04, 1.636, 0], [0.018, 1.652, 0]], 14),
      tongue: curve([[0, 1.565, 0.03], [0.006, 1.59, 0], [0.004, 1.63, -0.012]], 14)
    };
    w.add(S.merge(Object.values(senseRoutes).map((r) => S.tube(r, 0.0013, 4))), '#F7D35A', { parent: senseBrain, emis: 0.8 });
    const senseSparks = w.points(25, { color: '#FFF1A0', size: 0.0062, add: true, parent: senses });
    const soundRings = Array.from({ length: 3 }, () => w.add(S.torus(0.03, 0.001, '#7FE3FF', 28, 4), '#7FE3FF', { parent: senses, r: [0, 0, Math.PI / 2], emis: 1, op: 0.8 }));
    const smell = w.points(20, { color: '#F6B6D4', size: 0.0042, parent: senses, op: 0.9 });
    const light = w.points(18, { color: '#FFF3B0', size: 0.0028, parent: senses, add: true });

    // ---------- מצבים ----------
    const show = (o) => {
      shell.visible = !o.head;
      stage.visible = !o.head;
      skeleton.visible = !!o.skeleton;
      heart.visible = !!o.heart;
      if (o.heart) ensureHeart();
      if (o.lungs) ensureLungs();
      vessels.visible = !!o.heart;
      redCells.visible = !!o.heart;
      blueCells.visible = !!o.heart;
      lungsNode.visible = !!o.lungs;
      bronchi.visible = !!o.lungs;
      diaphragm.visible = !!o.lungs;
      airIn.visible = !!o.lungs;
      airOut.visible = !!o.lungs;
      brain.visible = !!o.brain;
      if (o.brain) ensureBrain();
      nerves.visible = !!o.nerves;
      sparks.visible = !!o.nerves;
      brainSparks.visible = !!o.nerves;
      senses.visible = !!o.head;
      senseSparks.visible = !!o.head;
      smell.visible = !!o.head;
      light.visible = !!o.head;
      if (o.head) { ensureHead(); brain.visible = true; }
      brain.s = o.head ? [0.82, 0.82, 0.82] : [1, 1, 1];
      brain.p = o.head ? [0, 1.682, -0.012] : [0, 1.665, 0.002];
    };
    const flow = (pts, curves, t, speed) => {
      for (let i = 0; i < pts.n; i++) {
        const c = curves[i % curves.length];
        const q = ((i * 0.618) % 1 + t * speed) % 1;
        const p = c[Math.floor(q * (c.length - 1))];
        pts.pos.set([p[0] + Math.sin(i * 9.1) * 0.0018, p[1], p[2] + Math.cos(i * 5.3) * 0.0018], i * 3);
        pts.size[i] = 1;
      }
    };

    const ENV = { bgTop: '#071027', bgBot: '#16305F', sky: [0.62, 0.68, 0.8], ground: [0.28, 0.3, 0.4], sunCol: [0.72, 0.72, 0.72], sun: [0.35, 0.6, 0.8] };
    return {
      groups: {},
      env: ENV,
      shots: [
        {
          group: 'all',
          enter: () => show({ skeleton: true }),
          cam: { t: [0, 0.87, 0], d: 2.95, az: -0.3, el: 0.05, spin: 0.14 },
          labels: () => [
            { text: 'הגולגולת שומרת על המוח', pos: [0, 1.76, 0], up: 6 },
            { text: 'צלעות', pos: [0.13, 1.25, 0.06], up: 0 },
            { text: 'עצם הירך', pos: [0.095, 0.68, 0.01], up: 0 }
          ],
          caption: () => '206 עצמות בגוף של אדם בוגר'
        },
        {
          group: 'all',
          enter: () => show({ heart: true }),
          cam: { t: [0.02, 1.15, 0], d: 1.75, az: 0.15, el: 0.04 },
          update: (t) => {
            const x = (t * 1.1) % 1;
            const b = Math.exp(-Math.pow((x - 0.16) / 0.05, 2)) + 0.65 * Math.exp(-Math.pow((x - 0.34) / 0.06, 2));
            const s = 1.12 * (1 + b * 0.13);
            heart.s = [s, s, s];
            flow(redCells, artCurves, t, 0.16);
            flow(blueCells, veinCurves, t, 0.13);
          },
          labels: () => [
            { text: 'הלב', pos: [0.1, 1.33, 0.08], up: 2, big: true },
            { text: 'עורקים: דם אל הגוף', pos: [0.215, 1.15, 0.02], up: 2 },
            { text: 'ורידים: דם חוזר ללב', pos: [-0.225, 1.15, 0.02], up: 2 }
          ],
          caption: () => 'בערך מאה אלף פעימות ביום'
        },
        {
          group: 'all',
          enter: () => show({ lungs: true }),
          cam: { t: [0, 1.3, 0], d: 1.05, az: 0.12, el: 0.04 },
          update: (t) => {
            const br = Math.sin(t * 1.25) * 0.5 + 0.5;
            lungsNode.s = [0.93 + br * 0.13, 0.94 + br * 0.09, 0.93 + br * 0.14];
            diaphragm.p[1] = 1.135 - br * 0.03;
            const inhale = Math.cos(t * 1.25) > 0;
            const lane = (i, q) => {
              const side = i % 2 ? 1 : -1;
              const a = (i * 2.399);
              if (q < 0.42) return [Math.cos(a) * 0.006, 1.54 - q * 0.36, 0.024 + Math.sin(a) * 0.006];
              const u = (q - 0.42) / 0.58;
              return [side * (0.02 + u * 0.1 + Math.sin(a) * u * 0.03), 1.385 - u * 0.17 + Math.cos(a * 3) * u * 0.06, 0.01 + Math.sin(a * 2) * u * 0.04];
            };
            for (let i = 0; i < airIn.n; i++) {
              const q = (i / airIn.n + t * 0.42) % 1;
              airIn.pos.set(lane(i, q), i * 3);
              airIn.size[i] = inhale ? 1 : 0;
              airOut.pos.set(lane(i, 1 - q), i * 3);
              airOut.size[i] = inhale ? 0 : 1;
            }
          },
          labels: () => [
            { text: 'ריאות', pos: [0.12, 1.42, 0.05], up: 0, big: true },
            { text: 'קנה הנשימה', pos: [0, 1.5, 0.03], up: 4 },
            { text: 'סרעפת: השריר שמושך אוויר', pos: [0, 1.1, 0.09], up: -16 }
          ],
          caption: (t) => (Math.cos(t * 1.25) > 0 ? 'שאיפה: החמצן נכנס ועובר לדם' : 'נשיפה: פחמן דו-חמצני יוצא החוצה')
        },
        {
          group: 'all',
          enter: () => show({ brain: true, nerves: true }),
          cam: { t: [0.06, 1.42, 0], d: 1.25, az: 0.5, el: 0.05 },
          update: (t) => {
            const rt = signalRoute;
            for (let i = 0; i < sparks.n; i++) {
              const q = (t * 0.42 + i * 0.0085) % 1;
              sparks.pos.set(rt[Math.floor(q * (rt.length - 1))], i * 3);
              sparks.size[i] = i < 10 ? 1 - i * 0.07 : 0;
            }
            for (let i = 0; i < brainSparks.n; i++) {
              const a = i * 2.399, u = -1 + (i / brainSparks.n) * 2;
              const r = Math.sqrt(1 - u * u);
              const pulse = Math.max(0, Math.sin(t * 3 + i * 1.7));
              brainSparks.pos.set([Math.cos(a) * r * 0.072, 1.68 + u * 0.056, Math.sin(a) * r * 0.082], i * 3);
              brainSparks.size[i] = pulse * pulse;
            }
          },
          labels: () => [
            { text: 'המוח: מרכז הבקרה', pos: [0, 1.76, 0], up: 8, big: true },
            { text: 'חוט השדרה', pos: [0, 1.2, -0.06], up: 0 },
            { text: 'הוראה יוצאת ליד', pos: [0.215, 1.1, 0], up: 2 }
          ]
        },
        {
          group: 'all',
          enter: () => show({ head: true }),
          cam: { t: [0, 1.62, 0.01], d: 0.56, az: 0.5, el: 0.04, spin: 0 },
          update: (t) => {
            const routes = Object.values(senseRoutes);
            for (let i = 0; i < senseSparks.n; i++) {
              const r = routes[i % routes.length];
              const q = (t * 0.55 + (i % 5) * 0.2 + Math.floor(i / 5) * 0.2) % 1;
              senseSparks.pos.set(r[Math.floor(q * (r.length - 1))], i * 3);
              senseSparks.size[i] = 1;
            }
            soundRings.forEach((ring, i) => {
              const q = (t * 0.45 + i / 3) % 1;
              ring.p = [0.096 + q * 0.09, 1.625, -0.004];
              const s = 0.35 + q * 1.1;
              ring.s = [s, s, s];
              ring.op = 0.8 * (1 - q);
            });
            for (let i = 0; i < smell.n; i++) {
              const q = (i / smell.n + t * 0.22) % 1;
              smell.pos.set([Math.sin(i * 4 + t) * 0.014 * (1 - q), 1.585 - (1 - q) * 0.03, 0.112 + (1 - q) * 0.1], i * 3);
              smell.size[i] = q;
            }
            for (let i = 0; i < light.n; i++) {
              const q = (i / light.n + t * 0.3) % 1;
              const k = i % 2 ? 1 : -1;
              light.pos.set([k * 0.031 + Math.sin(i * 7) * 0.012 * (1 - q), 1.636 + Math.cos(i * 5) * 0.012 * (1 - q), 0.08 + (1 - q) * 0.1], i * 3);
              light.size[i] = 1;
            }
          },
          labels: () => [
            { text: 'ראייה', pos: [0.03, 1.665, 0.08], up: 6 },
            { text: 'שמיעה', pos: [0.1, 1.67, -0.005], up: 2 },
            { text: 'ריח', pos: [0, 1.6, 0.115], up: -6 },
            { text: 'טעם', pos: [0, 1.55, 0.095], up: -20 },
            { text: 'מישוש: כל העור', pos: [-0.07, 1.48, 0.03], up: 0 },
            { text: 'כל החושים מדווחים למוח', pos: [0, 1.76, 0], up: 4 }
          ]
        }
      ]
    };
  };
})();
