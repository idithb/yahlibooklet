// עולמות תלת ממד של כדור הארץ: אוקיינוסים ומזג אוויר.
(function () {
  const A = window.App;
  const { TAU, DEG, hex } = A.S3D.helpers;

  // ---------- אוקיינוסים ----------
  A.SCENES3D.oceans = (w, S) => {
    const globeG = w.group();
    const g = w.group({ parent: globeG });
    w.add(S.globe(2, (lat, lon) => {
      const c = S.earthColor(lat, lon);
      return c === '#1F5FB0' ? '#1A6BC4' : c;
    }), '#FFFFFF', { parent: g });
    const names = [['האוקיינוס השקט', 0, -150], ['האוקיינוס האטלנטי', 15, -35], ['האוקיינוס ההודי', -25, 80], ['האוקיינוס הדרומי', -60, 40], ['האוקיינוס הארקטי', 78, 40]];

    // חתך עומק
    const deep = w.group();
    const seabed = (x) => {
      const d = Math.abs(x);
      return -1.1 - 0.6 * Math.cos(x * 0.5) - 8.4 * Math.exp(-d * d * 0.32);
    };
    const bed = [];
    for (let i = 0; i < 80; i++) {
      const x0 = -13 + i * 0.325, x1 = x0 + 0.325;
      bed.push(S.at(S.plate([[x0, -12], [x1, -12], [x1, seabed(x1)], [x0, seabed(x0)]], 2.4), { c: i % 2 ? '#6C5A47' : '#62523F' }));
    }
    w.add(S.merge(bed), '#FFFFFF', { parent: deep });
    const water = w.add(S.box(26, 11.6, 2), '#2070B8', { parent: deep, p: [0, -5.8, 0.2], op: 0.38 });
    w.add(S.grid(26, 2.4, 40, 3, null, () => '#6CB7E8'), '#FFFFFF', { parent: deep, p: [0, 0, 0] });
    // סירת מחקר וצוללת
    w.add(S.merge(S.at(S.box(0.9, 0.2, 0.3), { c: '#F3F3F0' }), S.at(S.box(0.4, 0.22, 0.24), { p: [0, 0.2, 0], c: '#E0532E' })), '#FFFFFF', { parent: deep, p: [0, 0.14, 0] });
    const sub = w.group({ parent: deep });
    w.add(S.merge(S.at(S.sphere(0.32, 0.22, 0.22, 12), { c: '#F2C53B' }), S.at(S.box(0.14, 0.14, 0.08), { p: [0, 0.2, 0], c: '#E0A92B' }), S.at(S.sphere(0.07, 0.07, 0.03, 8), { p: [0.1, 0.02, 0.2], c: '#7ED6FF' })), '#FFFFFF', { parent: sub });
    const lamp = w.points(1, { color: '#FFF4B0', size: 0.8, add: true, parent: sub, op: 0.6 });
    // סרגל עומק
    const ruler = [];
    for (let k = 0; k <= 11; k++) ruler.push(S.at(S.box(k % 5 === 0 ? 0.5 : 0.28, 0.03, 0.03), { p: [0, -k, 0], c: '#FFFFFF' }));
    w.add(S.merge(ruler, S.at(S.box(0.03, 11, 0.03), { p: [-0.1, -5.5, 0], c: '#FFFFFF' })), '#FFFFFF', { parent: deep, p: [4, 0, 1.4] });

    // מתחת למים: לוויתן
    const under = w.group();
    w.add(S.grid(60, 40, 36, 24, (x, z) => Math.sin(x * 0.3) * Math.cos(z * 0.4) * 0.5 - 6, (x, z) => (Math.sin(x + z) > 0 ? '#2B6C9C' : '#26638F')), '#FFFFFF', { parent: under });
    const whale = w.group({ parent: under, p: [0, 0, 0] });
    const body = [];
    for (let i = 0; i <= 28; i++) body.push([0, Math.sin(i / 28 * 3.1) * 0.25, -11 + (i / 28) * 22]);
    w.add(S.tube(body, (t) => { const k = t < 0.8 ? 0.15 + Math.pow(t / 0.8, 0.8) * 1.5 : 1.65 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.8) / 0.2, 2))); return Math.max(0.08, k * 1.1); }, 16), '#7FAAD0', { parent: whale });
    const tail = w.group({ parent: whale, p: [0, 0, -11] });
    w.add(S.at(S.plate([[0, 0.2], [2.6, -1.3], [1.4, -1], [0, -0.7], [-1.4, -1], [-2.6, -1.3]], 0.12), { r: [Math.PI / 2, 0, 0] }), '#4D7A9E', { parent: tail });
    [1, -1].forEach((k) => w.add(S.at(S.plate([[0, 0], [0.8, 0.15], [2.6, -2], [0.6, -0.7]], 0.08), { r: [Math.PI / 2 - k * 0.2, 0, k * 0.2] }), '#4D7A9E', { parent: whale, p: [k * 1.1, -0.7, 4.8], s: [k, 1, 1] }));
    w.add(S.merge(S.at(S.sphere(0.11, 0.11, 0.11, 8), { p: [1.45, 0.12, 7.2], c: '#111C28' }), S.at(S.sphere(0.11, 0.11, 0.11, 8), { p: [-1.45, 0.12, 7.2], c: '#111C28' })), '#FFFFFF', { parent: whale });
    const belly = [];
    for (let i = 0; i < 14; i++) belly.push(S.at(S.tube([[-0.7, -1.05, 10 - i * 0.55], [0, -1.55, 10.2 - i * 0.55], [0.7, -1.05, 10 - i * 0.55]], 0.02, 5), { c: '#D9E4EE' }));
    w.add(S.merge(belly), '#FFFFFF', { parent: whale });
    const diver = w.group({ parent: under, p: [6.5, 1.5, 7] });
    w.add(S.merge(S.at(S.sphere(0.12, 0.12, 0.12, 8), { p: [0, 0.5, 0], c: '#F0C09A' }), S.at(S.cyl(0.13, 0.13, 0.5, 8), { p: [0, 0, 0], c: '#2A2A30' }), S.at(S.cyl(0.08, 0.08, 0.4, 8), { p: [0, 0.03, -0.17], c: '#E8C53B' }), S.at(S.cyl(0.06, 0.05, 0.5, 6), { p: [0.08, -0.48, 0], c: '#2A2A30' }), S.at(S.cyl(0.06, 0.05, 0.5, 6), { p: [-0.08, -0.48, 0], c: '#2A2A30' })), '#FFFFFF', { parent: diver, r: [1.25, 0, 0] });
    const krill = w.points(240, { color: '#FFD0B0', size: 0.09, parent: under, op: 0.85 });
    const rays = w.points(40, { color: '#FFFFFF', size: 0.09, parent: under, op: 0.3 });

    // שונית
    const reef = w.group();
    const floor = (x, z) => -0.3 + Math.sin(x * 0.7) * Math.cos(z * 0.6) * 0.35;
    w.add(S.grid(26, 20, 40, 30, floor, (x, z) => (Math.sin(x * 2.3 + z * 1.7) > 0 ? '#E3CFA0' : '#D8C391')), '#FFFFFF', { parent: reef });
    const corals = [];
    let seed = 9;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const colors = ['#E8577C', '#F58A3C', '#B45FD6', '#F2C53B', '#E44C4C', '#47C6A6'];
    const branch = (px, py, pz, r, depth, col, ang) => {
      const len = 0.2 + depth * 0.14;
      const nx = px + Math.cos(ang) * len * 0.5, nz = pz + Math.sin(ang) * len * 0.5, ny = py + len;
      corals.push(S.at(S.tube([[px, py, pz], [nx, ny, nz]], r, 6), { c: col }));
      if (depth > 0) [0, 2.1, 4.2].slice(0, depth > 1 ? 3 : 2).forEach((d) => branch(nx, ny, nz, r * 0.72, depth - 1, col, ang + d + rnd()));
    };
    for (let i = 0; i < 26; i++) {
      const x = (rnd() - 0.5) * 18, z = (rnd() - 0.5) * 12, col = colors[i % 6];
      if (i % 3 === 0) {
        corals.push(S.at(S.sphere(0.7 + rnd() * 0.5, 0.45 + rnd() * 0.3, 0.7, 10), { p: [x, floor(x, z) + 0.2, z], c: col }));
      } else branch(x, floor(x, z), z, 0.09, 3, col, rnd() * TAU);
    }
    w.add(S.merge(corals), '#FFFFFF', { parent: reef });
    const fishes = Array.from({ length: 22 }, (_, i) => {
      const n = w.group({ parent: reef });
      const col = ['#F7941E', '#FFD23F', '#3DA5D9', '#F25F5C', '#FFFFFF'][i % 5];
      w.add(S.merge(
        S.at(S.sphere(0.22, 0.14, 0.05, 10), {}),
        S.at(S.plate([[-0.2, 0], [-0.42, 0.12], [-0.42, -0.12]], 0.02), {}),
        S.at(S.plate([[-0.02, 0.1], [0.05, 0.22], [0.12, 0.1]], 0.02), {}),
        S.at(S.sphere(0.022, 0.022, 0.02, 6), { p: [0.13, 0.03, 0.04], c: '#111111' })
      ), col, { parent: n, r: [0, 0, 0] });
      n.seed = i;
      return n;
    });

    // גאות ושפל
    const tide = w.group();
    const beach = (x) => 0.3 + x * 0.16;
    w.add(S.grid(24, 12, 40, 12, (x) => beach(x), (x, z, y) => (y > 1.3 ? '#7FB35A' : (Math.sin(x * 3 + z * 2) > 0 ? '#E8D5A0' : '#E0CC94'))), '#FFFFFF', { parent: tide });
    const sea = w.add(S.box(24, 3, 12), '#2E8CD0', { parent: tide, p: [0, -1.5, 0], op: 0.82 });
    w.add(S.merge(S.at(S.box(0.6, 0.05, 0.25), { p: [0, 0.36, 0], c: '#D8452E' }), S.at(S.box(0.05, 0.36, 0.05), { c: '#6F5532', p: [0, 0.18, 0] })), '#FFFFFF', { parent: tide, p: [1.2, 0.5, 1.5] });
    w.add(S.merge(S.at(S.palm(1.5), { p: [7, beach(7), -2] }), S.at(S.palm(1.3), { p: [8.2, beach(8.2), 2] })), '#FFFFFF', { parent: tide });
    const moonBall = w.add(S.sphere(0.9, 0.9, 0.9, 18), '#E9E7DD', { parent: tide, emis: 0.45 });

    return {
      groups: { globeG, deep, under, reef, tide },
      env: { bgTop: '#04071A', bgBot: '#0B1436' },
      shots: [
        {
          group: 'globeG',
          env: { sky: [0.75, 0.75, 0.8], ground: [0.5, 0.5, 0.55], sun: [0.3, 0.5, 1] },
          cam: { t: [0, 0, 0], d: 6, az: 0, el: 0.16 },
          update: (t) => { g.r[1] = 2 + t * 0.2; },
          labels: () => names.map(([text, lat, lon]) => {
            const p = w.pos(g, S.pointAt(lat, lon, 2.02));
            return { text, pos: p, show: p[2] > 0.3, up: 2 };
          }),
          caption: () => 'רוב כדור הארץ מכוסה במים'
        },
        {
          group: 'deep',
          env: { bgTop: '#BFE5FB', bgBot: '#16334F' },
          cam: { t: [0, -5, 0], d: 15, az: 0.12, el: 0.04 },
          update: (t) => {
            const q = (Math.sin(t * 0.4 - Math.PI / 2) * 0.5 + 0.5);
            sub.p = [0, -0.6 - q * 9.7, 0.2];
            lamp.pos.set([0.35, 0, 0.2], 0);
            lamp.size[0] = 1;
          },
          labels: () => [
            { text: 'מחילת מריאנה', pos: [0, -10.3, 0.5], up: -24 },
            { text: '11 ק"מ למטה', pos: [4.6, -10.8, 1.4], up: 2 },
            { text: 'צוללת מחקר', pos: w.pos(sub), up: 14 }
          ],
          caption: (t) => {
            const q = (Math.sin(t * 0.4 - Math.PI / 2) * 0.5 + 0.5);
            return `עומק: ${(q * 11).toFixed(1)} ק"מ`;
          }
        },
        {
          group: 'under',
          env: { bgTop: '#2D8FD0', bgBot: '#0A3C69', fog: 0.0007, fogCol: '#0F4E86', sun: [0.2, 1, 0.3], sky: [0.62, 0.8, 0.92], ground: [0.22, 0.34, 0.46], sunCol: [0.5, 0.55, 0.6] },
          cam: { t: [1, 0, 1], d: 25, az: 1.15, el: 0.08 },
          update: (t) => {
            whale.p[2] = Math.sin(t * 0.12) * 2;
            whale.r[0] = Math.sin(t * 0.7) * 0.03;
            tail.r[0] = Math.sin(t * 1.4) * 0.28;
            diver.r[2] = Math.sin(t) * 0.2;
            for (let i = 0; i < krill.n; i++) {
              const a = i * 2.399, r = 1 + ((i * 0.37) % 1) * 5;
              krill.pos.set([Math.cos(a + t * 0.1) * r + 2, -1 + Math.sin(a * 3) * 1.8, 13 + Math.sin(a + t * 0.1) * r], i * 3);
              krill.size[i] = 1;
            }
            for (let i = 0; i < rays.n; i++) {
              const q = (i / rays.n + t * 0.04) % 1;
              rays.pos.set([Math.sin(i * 12.9) * 26, 11 - q * 15, Math.cos(i * 7.7) * 22], i * 3);
              rays.size[i] = 1;
            }
          },
          labels: () => [
            { text: 'לוויתן כחול', pos: w.pos(whale, [0, 1.8, 2]), up: 4, big: true },
            { text: 'אדם צולל', pos: w.pos(diver), up: 12 },
            { text: 'קריל קטנטן: המזון שלו', pos: [2, 0.5, 13], up: 4 }
          ]
        },
        {
          group: 'reef',
          env: { bgTop: '#40B8EC', bgBot: '#0F6FA8', fog: 0.0045, fogCol: '#1F85C2', sun: [0.2, 1, 0.35], sky: [0.65, 0.8, 0.9], ground: [0.3, 0.42, 0.5] },
          cam: { t: [0, 1, 0], d: 11, az: 0.3, el: 0.22, spin: 0.02 },
          update: (t) => {
            fishes.forEach((f) => {
              const i = f.seed, r = 2.4 + (i % 6) * 0.9, sp = (0.14 + (i % 4) * 0.04) * (i % 2 ? 1 : -1);
              const a = t * sp + i * 1.7;
              f.p = [Math.cos(a) * r, 0.9 + (i % 5) * 0.45 + Math.sin(a * 3) * 0.1, Math.sin(a) * r * 0.75];
              f.r[1] = -a + (sp > 0 ? -Math.PI / 2 : Math.PI / 2);
            });
          },
          labels: () => [{ text: 'אלמוגים: בעלי חיים, לא צמחים', pos: [0.5, 1.4, 3], up: 4 }],
          caption: () => 'השונית היא בית לדגים רבים'
        },
        {
          group: 'tide',
          env: { bgTop: '#3A5CA8', bgBot: '#F5D7B4', sky: [0.6, 0.6, 0.68], ground: [0.32, 0.32, 0.34] },
          cam: { t: [4, 1, 0], d: 11, az: 0.55, el: 0.2 },
          update: (t) => {
            const q = Math.sin(t * 0.45) * 0.5 + 0.5;
            sea.p[1] = -1.5 + 0.5 + q * 0.75;
            const a = t * 0.45 + 0.4;
            moonBall.p = [Math.cos(a - Math.PI / 2 + 0.3) * 2 + 2, 3.2 + q * 0.8, -5];
          },
          labels: () => [{ text: 'הירח מושך את מי הים', pos: moonBall.p, up: 26 }],
          caption: (t) => (Math.sin(t * 0.45) > 0 ? 'גאות: המים עולים על החוף 🌊' : 'שפל: המים נסוגים 🏖️')
        }
      ]
    };
  };

  // ---------- מזג אוויר ----------
  A.SCENES3D.weather = (w, S) => {
    const land = w.group();
    // ים משמאל, הר מימין
    const H = (x, z) => {
      const m = 3.8 * Math.exp(-(Math.pow(x - 8, 2) / 16 + Math.pow(z + 1, 2) / 26));
      return Math.max(-0.2, (x + 3) * 0.08 + m + Math.sin(x * 0.8) * Math.cos(z * 0.7) * 0.08) * (x < -3 ? 0 : 1);
    };
    const C = (x, z, y) => {
      if (x < -3.1) return Math.sin(x * 2 + z) > 0 ? '#2B86CC' : '#2580C6';
      if (y > 3.3) return '#F5F7FA';
      if (y > 2.2) return '#8B8778';
      if (Math.abs(z - (Math.sin(x * 0.7) * 0.6 + 1.5)) < 0.22 && x < 8) return '#3B9AD9';
      return Math.sin(x * 3 + z * 2) > 0 ? '#73B254' : '#67A64A';
    };
    w.add(S.grid(34, 22, 70, 46, H, C), '#FFFFFF', { parent: land });
    let seed = 3;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const trees = [];
    for (let i = 0; i < 30; i++) {
      const x = -1 + rnd() * 10, z = (rnd() - 0.5) * 16;
      if (Math.abs(z - 1.5) < 0.8) continue;
      trees.push(S.at(S.tree(1), { p: [x, H(x, z), z], s: 0.6 + rnd() * 0.5 }));
    }
    const treesNode = w.add(S.merge(trees), '#FFFFFF', { parent: land });
    // בית קטן
    w.add(S.merge(S.at(S.box(0.9, 0.6, 0.8), { p: [0, 0.3, 0], c: '#F0E2C6' }), S.at(S.cyl(0, 0.75, 0.5, 4), { p: [0, 0.6, 0], r: [0, Math.PI / 4, 0], c: '#B9583B' })), '#FFFFFF', { parent: land, p: [1.8, H(1.8, 4), 4] });

    const sunBall = w.add(S.sphere(1.1, 1.1, 1.1, 18), '#FFD23C', { parent: land, p: [-10, 9, -6], emis: 0.95 });
    const clouds = [
      w.add(S.cloud(2.2), '#FFFFFF', { parent: land, p: [5.5, 7, -1], emis: 0.25 }),
      w.add(S.cloud(1.8), '#FFFFFF', { parent: land, p: [2, 7.6, 1.6], emis: 0.25 }),
      w.add(S.cloud(1.5), '#FFFFFF', { parent: land, p: [-3, 8.2, 0], emis: 0.25 })
    ];
    const vapor = w.points(120, { color: '#CDEBFF', size: 0.2, op: 0.65, parent: land });
    const rain = w.points(220, { color: '#6DBBF2', size: 0.09, parent: land });
    const windP = w.points(120, { color: '#FFFFFF', size: 0.12, op: 0.8, parent: land });
    const bolt = w.add(S.tube([[3, 6.6, 0.2], [2.5, 5.2, 0.2], [3.1, 4.3, 0.2], [2.5, 3, 0.2], [2.9, 1.9, 0.2], [2.5, 0.8, 0.2]], 0.07, 5), '#FFF8B5', { parent: land, emis: 1.1 });
    const rainbow = w.group({ parent: land, p: [2.5, 0, -5] });
    ['#E84A4A', '#F58A2E', '#F7D92E', '#55B84A', '#3A86E0', '#6A4BC4'].forEach((c, i) => {
      w.add(S.torus(8 - i * 0.26, 0.11, c, 44, 5, Math.PI), c, { parent: rainbow, r: [-Math.PI / 2, 0, 0], emis: 0.65, op: 0.86 });
    });
    const windSock = w.group({ parent: land, p: [2.4, H(2.4, 4.8), 4.8] });
    w.add(S.cyl(0.03, 0.03, 1.2, 6), '#555555', { parent: windSock });
    const flag = w.add(S.at(S.cyl(0.05, 0.16, 0.8, 8), { r: [0, 0, -Math.PI / 2] }), '#F0612E', { parent: windSock, p: [0, 1.15, 0] });

    // כלי מדידה
    const lab = w.group();
    w.add(S.grid(16, 12, 16, 12, null, (x, z) => (Math.sin(x * 2 + z * 2) > 0 ? '#7CBB5E' : '#72B054')), '#FFFFFF', { parent: lab });
    const thermo = w.group({ parent: lab, p: [-1.3, 0, 0] });
    w.add(S.merge(S.at(S.box(0.8, 3.6, 0.12), { p: [0, 2, 0], c: '#F5F2E8' }), S.at(S.box(0.1, 1.2, 0.1), { p: [0, 0.3, -0.1], c: '#6F5532' })), '#FFFFFF', { parent: thermo });
    w.add(S.cyl(0.08, 0.08, 2.9, 10), '#E6F3FA', { parent: thermo, p: [0, 0.85, 0.1], op: 0.65 });
    w.add(S.sphere(0.16, 0.16, 0.16, 12), '#D92B2B', { parent: thermo, p: [0, 0.68, 0.1] });
    const mercury = w.add(S.cyl(0.05, 0.05, 1, 8), '#D92B2B', { parent: thermo, p: [0, 0.7, 0.1], s: [1, 1, 1] });
    const ticks = [];
    for (let i = 0; i < 10; i++) ticks.push(S.at(S.box(i % 5 === 0 ? 0.24 : 0.14, 0.018, 0.01), { p: [0.24, 0.95 + i * 0.27, 0.07], c: '#333333' }));
    w.add(S.merge(ticks), '#FFFFFF', { parent: thermo });
    const gauge = w.group({ parent: lab, p: [1.4, 0, 0.2] });
    w.add(S.lathe([[0.42, 0, '#D9E6EF'], [0.42, 1.8, '#D9E6EF']], 20), '#FFFFFF', { parent: gauge, op: 0.5 });
    const gaugeWater = w.add(S.cyl(0.38, 0.38, 1, 18), '#3B9AD9', { parent: gauge, p: [0, 0.02, 0], s: [1, 0.1, 1] });
    const satellite = w.group({ parent: lab, p: [0, 5, -3] });
    w.add(S.merge(S.at(S.box(0.5, 0.35, 0.35), { c: '#D8D8DE' }), S.at(S.box(1.1, 0.03, 0.4), { p: [0.82, 0, 0], c: '#2B4E9C' }), S.at(S.box(1.1, 0.03, 0.4), { p: [-0.82, 0, 0], c: '#2B4E9C' })), '#FFFFFF', { parent: satellite });
    const labRain = w.points(60, { color: '#6DBBF2', size: 0.07, parent: lab });

    const mode = (o) => {
      vapor.visible = !!o.vapor;
      rain.visible = !!o.rain;
      windP.visible = !!o.wind;
      bolt.visible = false;
      rainbow.visible = !!o.rainbow;
    };
    const setCloud = (col, e) => clouds.forEach((c) => { c.color = hex(col); c.emis = e; });
    const rainAt = (t, cx, cz, spread) => {
      for (let i = 0; i < rain.n; i++) {
        const q = (t * 0.9 + (i * 0.618) % 1) % 1;
        const x = cx + Math.sin(i * 12.9) * spread, z = cz + Math.cos(i * 7.7) * 3;
        rain.pos.set([x, 6.5 - q * (6.5 - Math.max(0, H(x, z))), z], i * 3);
        rain.size[i] = 1;
      }
    };

    return {
      groups: { land, lab },
      env: { bgTop: '#7BC2F2', bgBot: '#EDF7FC', fog: 0.0006, fogCol: '#EDF7FC' },
      shots: [
        {
          group: 'land',
          enter: () => { mode({ vapor: true, rain: true }); setCloud('#FFFFFF', 0.25); },
          cam: { t: [1, 3, 0], d: 21, az: 0, el: 0.1 },
          update: (t) => {
            for (let i = 0; i < vapor.n; i++) {
              const q = (t * 0.13 + i / vapor.n) % 1;
              vapor.pos.set([-9 + ((i * 0.77) % 1) * 5 + q * 7, q * 7.4, Math.sin(i * 9.1) * 4], i * 3);
              vapor.size[i] = 1 - q * 0.5;
            }
            rainAt(t, 5, 0, 3.5);
            clouds[2].p[0] = -3 + Math.sin(t * 0.2);
          },
          labels: () => [
            { text: '☀️ השמש מחממת', pos: sunBall.p, up: 26 },
            { text: 'המים מתאדים', pos: [-5, 3.2, 0], up: 0 },
            { text: 'אדים נהיים ענן', pos: [-3, 8.7, 0], up: 4 },
            { text: 'יורד גשם', pos: [5.2, 3.5, 2], up: 0 }
          ]
        },
        {
          group: 'land',
          enter: () => { mode({ wind: true }); setCloud('#FFFFFF', 0.25); },
          cam: { t: [2, 2.2, 3], d: 13, az: 0.5, el: 0.14 },
          update: (t) => {
            for (let i = 0; i < windP.n; i++) {
              const q = (t * 0.3 + i / windP.n) % 1;
              windP.pos.set([-8 + q * 20, 0.8 + (i % 8) * 0.55 + Math.sin(q * 9 + i) * 0.14, -5 + (i % 11) * 1.1], i * 3);
              windP.size[i] = Math.sin(q * Math.PI);
            }
            clouds.forEach((c, i) => { c.p[0] = -8 + ((t * 0.7 + i * 6.5) % 22); });
            flag.r[0] = Math.sin(t * 7) * 0.2;
            flag.r[2] = -0.1 + Math.sin(t * 2) * 0.1;
            treesNode.r[2] = 0;
          },
          labels: () => [{ text: 'רוח: אוויר בתנועה ➜', pos: [2, 4, 0], up: 0 }],
          caption: () => 'אוויר נע מלחץ גבוה ללחץ נמוך'
        },
        {
          group: 'land',
          enter: () => { mode({ rain: true }); setCloud('#59616E', 0.08); },
          env: { bgTop: '#2E3A52', bgBot: '#67758C', sky: [0.34, 0.36, 0.42], sunCol: [0.35, 0.35, 0.38], fog: 0.001, fogCol: '#67758C' },
          cam: { t: [2, 3, 0], d: 16, az: 0.2, el: 0.09 },
          update: (t) => {
            rainAt(t, 3, 0, 6);
            const LOOP = 6;
            const q = t % LOOP;
            const flash = q < 0.22;
            bolt.visible = flash;
            sunBall.visible = false;
            bolt.emis = 1.2;
          },
          labels: (t) => {
            const q = t % 6;
            return [{ text: '⚡ קודם רואים את הברק', pos: [2.6, 4, 0.2], up: 0, show: q < 1.4 }, { text: '🔊 רעם!', pos: [2.6, 4, 0.2], up: 0, show: q > 2.8 && q < 4 }];
          },
          caption: (t) => {
            const q = t % 6;
            return q < 2.8 ? 'האור כבר הגיע, הקול עוד בדרך...' : 'הרעם מגיע אחרי הברק, כי קול איטי יותר מאור';
          }
        },
        {
          group: 'land',
          enter: () => { mode({ rainbow: true, rain: true }); setCloud('#FFFFFF', 0.25); sunBall.visible = true; },
          cam: { t: [2, 3, 0], d: 21, az: -0.05, el: 0.06 },
          update: (t) => { rainAt(t, 8, -2, 3); },
          labels: () => [{ text: 'אור השמש נשבר בטיפות המים', pos: [2.5, 8.6, -5], up: 6 }],
          caption: () => 'השמש מאחורינו, הגשם מולנו: כך רואים קשת'
        },
        {
          group: 'lab',
          enter: () => { sunBall.visible = true; },
          cam: { t: [0, 2.2, 0], d: 9, az: 0.1, el: 0.12 },
          update: (t) => {
            const temp = Math.sin(t * 0.5) * 0.5 + 0.5;
            mercury.s[1] = 0.5 + temp * 2;
            gaugeWater.s[1] = 0.05 + ((t * 0.09) % 1) * 1.3;
            satellite.p[0] = Math.sin(t * 0.15) * 4;
            for (let i = 0; i < labRain.n; i++) {
              const q = (t * 0.9 + (i * 0.618) % 1) % 1;
              labRain.pos.set([1.4 + Math.sin(i * 12.9) * 0.36, 5 - q * 5, 0.2 + Math.cos(i * 7.7) * 0.36], i * 3);
              labRain.size[i] = 1;
            }
          },
          labels: (t) => [
            { text: `מדחום: ${Math.round(8 + (Math.sin(t * 0.5) * 0.5 + 0.5) * 26)}°`, pos: [-1.3, 4, 0], up: 2 },
            { text: 'מד גשם', pos: [1.4, 1.9, 0.2], up: 2 },
            { text: 'לוויין מצלם עננים', pos: w.pos(satellite), up: 12 }
          ],
          caption: () => 'החזאים אוספים מדידות ובעזרת מחשבים חוזים את מזג האוויר'
        }
      ]
    };
  };
})();
