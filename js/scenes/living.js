// עולם התלת ממד של הדבורים.
(function () {
  const A = window.App;
  const { TAU } = A.S3D.helpers;
  // ---------- דבורים ----------
  function makeBee(w, S, parent, o = {}) {
    const root = w.group({ parent, p: o.p || [0, 0, 0], s: o.s || 1 });
    const parts = [];
    const stripes = o.queen ? 6 : 4;
    const len = o.queen ? 0.46 : 0.32;
    for (let i = 0; i < stripes; i++) {
      const t = i / (stripes - 1);
      const r = (o.queen ? 0.1 : 0.115) * Math.sin(0.5 + t * 2.3) * 1.1;
      parts.push(S.at(S.sphere(r, r, len / stripes * 0.82, 10), { p: [0, 0, -0.1 - t * len], c: i % 2 ? '#1F1A14' : '#F1B82B' }));
    }
    parts.push(S.at(S.cyl(0, 0.02, 0.06, 6), { p: [0, 0, -0.12 - len], r: [-Math.PI / 2, 0, 0], c: '#1F1A14' }));
    parts.push(S.at(S.sphere(0.1, 0.095, 0.11, 12), { p: [0, 0, 0], c: '#6E4A1F' }));
    parts.push(S.at(S.sphere(0.09, 0.088, 0.08, 12), { p: [0, 0.01, 0.15], c: '#2A2118' }));
    [1, -1].forEach((k) => {
      parts.push(S.at(S.sphere(0.03, 0.05, 0.05, 8), { p: [k * 0.075, 0.015, 0.175], c: '#3B2B4E' }));
      parts.push(S.at(S.tube([[k * 0.03, 0.06, 0.21], [k * 0.07, 0.13, 0.27], [k * 0.11, 0.13, 0.33]], 0.005, 5), { c: '#1F1A14' }));
      [-0.05, 0.005, 0.06].forEach((z, i) => {
        parts.push(S.at(S.tube([[k * 0.06, -0.06, z], [k * (0.15 + i * 0.01), -0.1, z + (i - 1) * 0.03], [k * 0.18, -0.2, z + (i - 1) * 0.07]], 0.007, 5), { c: '#2A2118' }));
      });
    });
    [[0, 0.09, 0.2], [-0.024, 0.08, 0.19], [0.024, 0.08, 0.19]].forEach((p) => parts.push(S.at(S.sphere(0.009, 0.009, 0.009, 5), { p, c: '#8C5F9F' })));
    w.add(S.merge(parts), '#FFFFFF', { parent: root });
    const wings = [1, -1].map((k) => {
      const g = w.group({ parent: root, p: [k * 0.05, 0.08, -0.03] });
      w.add(S.at(S.plate([[0, 0.04], [k * 0.2, 0.05], [k * 0.33, -0.03], [k * 0.27, -0.15], [0, -0.09]], 0.004), { r: [Math.PI / 2, 0, 0] }), '#DCEFF7', { parent: g, op: 0.68 });
      return g;
    });
    return { root, wings };
  }
  const flutter = (bee, t) => bee.wings.forEach((g, i) => { g.r[2] = (i ? -1 : 1) * (0.25 + Math.sin(t * 40) * 0.5); });
  const face = (bee, from, to) => { bee.root.r[1] = Math.atan2(to[0] - from[0], to[2] - from[2]); };

  A.SCENES3D.bees = (w, S) => {
    // פרח ענק ודבורה מקרוב
    const close = w.group();
    w.add(S.grid(12, 12, 10, 10, null, (x, z) => (Math.sin(x * 4 + z * 3) > 0 ? '#7FBF5F' : '#6FB24F')), '#FFFFFF', { parent: close, p: [0, -0.9, 0] });
    w.add(S.at(S.flower('#F47FB3', '#F7C52F', 0.9), { s: 2.1 }), '#FFFFFF', { parent: close, p: [0, -0.9, 0] });
    const bigBee = makeBee(w, S, close, { p: [0, 1.25, 0], s: 2.6 });

    // חלת דבש
    const hive = w.group();
    w.add(S.box(5.6, 4, 0.25), '#B38544', { parent: hive, p: [0, 0, -0.14] });
    const cellParts = [], honeyCells = [];
    const hexR = 0.2, gapX = hexR * 1.76, gapY = hexR * 1.52;
    const cellPos = [];
    for (let row = 0; row < 11; row++) for (let col = 0; col < 15; col++) {
      const x = (col - 7) * gapX + (row % 2 ? gapX / 2 : 0), y = (row - 5) * gapY;
      cellPos.push([x, y]);
      const r = hexR * 0.98;
      const hexRing = Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * TAU + Math.PI / 6; return [Math.cos(a) * r, Math.sin(a) * r]; });
      const rim = [];
      hexRing.forEach((p, i) => {
        const q = hexRing[(i + 1) % 6];
        rim.push(S.tube([[p[0], p[1], 0.05], [q[0], q[1], 0.05]], 0.016, 4));
      });
      cellParts.push(S.at(S.merge(rim), { p: [x, y, 0], c: '#E7B84C' }));
      const filled = (row * 3 + col * 5) % 3 !== 0;
      cellParts.push(S.at(S.cyl(r * 0.92, r * 0.92, 0.01, 6), { p: [x, y, 0.005], r: [Math.PI / 2, 0, 0], c: filled ? '#E89A1E' : '#C78F3A' }));
    }
    w.add(S.merge(cellParts), '#FFFFFF', { parent: hive, s: 1 });
    const queen = makeBee(w, S, hive, { queen: true, p: [-0.5, 0.1, 0.16], s: 1.1 });
    queen.root.r = [Math.PI / 2 - 0.1, 0, 0];
    const workers = Array.from({ length: 9 }, (_, i) => {
      const b = makeBee(w, S, hive, { p: [0, 0, 0.13], s: 0.82 });
      b.home = [(i % 3 - 1) * 1.45 + (i % 2) * 0.3, ((i * 7) % 5 - 2) * 0.6, 0.13];
      b.root.r = [Math.PI / 2, 0, i];
      return b;
    });
    const dancer = makeBee(w, S, hive, { p: [1, 0, 0.14], s: 1 });
    dancer.root.r = [Math.PI / 2, 0, 0];
    const dance = w.add(S.torus(0.45, 0.012, '#FFFFFF', 30, 5), '#FFFFFF', { parent: hive, p: [1, 0, 0.1], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.85], op: 0 });
    const danceB = w.add(S.torus(0.45, 0.012, '#FFFFFF', 30, 5), '#FFFFFF', { parent: hive, p: [1.9, 0, 0.1], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.85], op: 0 });

    // אחו עם כוורת ופרחים
    const meadow = w.group();
    const groundH = (x, z) => Math.sin(x * 0.4) * Math.cos(z * 0.35) * 0.1;
    w.add(S.grid(18, 14, 22, 18, groundH, (x, z) => (Math.sin(x * 2.3 + z * 3.1) > 0 ? '#86C664' : '#79B955')), '#FFFFFF', { parent: meadow });
    const flowers = [];
    const flowerSpots = [];
    let seed = 5;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const petals = ['#F47FB3', '#F9D648', '#FFFFFF', '#B47FE8', '#F58A5C'];
    for (let i = 0; i < 60; i++) {
      const x = (rnd() - 0.5) * 15, z = (rnd() - 0.5) * 11;
      flowers.push(S.at(S.flower(petals[i % 5], '#F7C52F', 0.3 + rnd() * 0.3), { p: [x, 0, z], s: 1.5 }));
    }
    w.add(S.merge(flowers), '#FFFFFF', { parent: meadow });
    const A1 = [-2.4, 0, 1.4], B1 = [2, 0, 0.8];
    w.add(S.at(S.flower('#F47FB3', '#F7C52F', 0.75), { s: 2.2 }), '#FFFFFF', { parent: meadow, p: A1 });
    w.add(S.at(S.flower('#F47FB3', '#F7C52F', 0.75), { s: 2.2 }), '#FFFFFF', { parent: meadow, p: B1 });
    const flowerTop = (P) => [P[0], 1.72, P[2]];
    // פרי שגדל אחרי האבקה
    const fruit = w.add(S.sphere(0.13, 0.13, 0.13, 12), '#E8552B', { parent: meadow, p: [B1[0], 1.5, B1[2]], s: 0 });
    // כוורת
    const box = w.group({ parent: meadow, p: [4.4, 0, -2.2], r: [0, -0.5, 0] });
    w.add(S.merge(
      S.at(S.box(1.5, 0.5, 1.2), { p: [0, 0.65, 0], c: '#EADCB8' }),
      S.at(S.box(1.5, 0.5, 1.2), { p: [0, 1.17, 0], c: '#D9C491' }),
      S.at(S.box(1.65, 0.1, 1.35), { p: [0, 1.48, 0], c: '#8C6A3E' }),
      S.at(S.box(0.1, 0.4, 0.1), { p: [0.6, 0.2, 0.45], c: '#6F5532' }),
      S.at(S.box(0.1, 0.4, 0.1), { p: [-0.6, 0.2, 0.45], c: '#6F5532' }),
      S.at(S.box(0.1, 0.4, 0.1), { p: [0.6, 0.2, -0.45], c: '#6F5532' }),
      S.at(S.box(0.1, 0.4, 0.1), { p: [-0.6, 0.2, -0.45], c: '#6F5532' }),
      S.at(S.box(0.5, 0.08, 0.04), { p: [0, 0.5, 0.61], c: '#2A2118' })
    ), '#FFFFFF', { parent: box });
    const hiveDoor = [4.4 + 0.27, 0.6, -2.2 + 0.5];
    const flyBees = Array.from({ length: 5 }, () => makeBee(w, S, meadow, { s: 1.3 }));
    const pollenBee = makeBee(w, S, meadow, { s: 2 });
    const pollen = w.points(30, { color: '#F4C21F', size: 0.075, parent: meadow });
    // דבש בחתך הכוורת
    const honeyLevel = w.add(S.box(1.2, 1, 0.8), '#EFA11B', { parent: box, p: [0, 0.65, 0.3], s: [1, 0.01, 1], emis: 0.2 });
    honeyLevel.visible = false;

    const arc = (from, to, q, hop = 1.2) => {
      const s = q * q * (3 - 2 * q);
      return [from[0] + (to[0] - from[0]) * s, from[1] + (to[1] - from[1]) * s + Math.sin(q * Math.PI) * hop, from[2] + (to[2] - from[2]) * s];
    };

    return {
      groups: { close, hive, meadow },
      env: { bgTop: '#A9DBF7', bgBot: '#F3F9E6' },
      shots: [
        {
          group: 'close',
          cam: { t: [0, 1.15, 0], d: 3.1, az: 0.65, el: 0.16 },
          update: (t) => {
            bigBee.root.p[1] = 1.25 + Math.sin(t * 2) * 0.05;
            bigBee.root.r[1] = Math.sin(t * 0.5) * 0.4;
            flutter(bigBee, t);
          },
          labels: () => [
            { text: 'שש רגליים', pos: w.pos(bigBee.root, [0.18, -0.2, 0.03]), up: -14 },
            { text: 'שני זוגות כנפיים', pos: w.pos(bigBee.root, [0.26, 0.09, -0.1]), up: 6 },
            { text: 'חמש עיניים', pos: w.pos(bigBee.root, [0, 0.1, 0.2]), up: 8 }
          ]
        },
        {
          group: 'hive',
          env: { bgTop: '#3D2A12', bgBot: '#6B4A1E' },
          cam: { t: [-0.4, 0, 0], d: 4.2, az: 0.12, el: 0.08 },
          update: (t) => {
            workers.forEach((b, i) => {
              b.root.p = [b.home[0] + Math.sin(t * 0.4 + i * 2.1) * 0.35, b.home[1] + Math.cos(t * 0.33 + i) * 0.28, 0.13];
              b.root.r[2] = t * 0.3 + i;
            });
            dancer.root.visible = false;
            dancer.root.p = [1.45, -1.3, 0.14];
            queen.root.p[0] = -0.5 + Math.sin(t * 0.2) * 0.12;
          },
          labels: () => [
            { text: 'המלכה מטילה ביצים 👑', pos: w.pos(queen.root), up: 26, big: true },
            { text: 'דבורה עובדת', pos: w.pos(workers[4].root), up: 14 }
          ],
          caption: () => 'בכוורת אחת חיות אלפי דבורים, ולכל אחת תפקיד'
        },
        {
          group: 'hive',
          env: { bgTop: '#3D2A12', bgBot: '#6B4A1E' },
          cam: { t: [1.45, 0, 0], d: 2.7, az: 0.05, el: 0.04 },
          update: (t) => {
            workers.forEach((b, i) => {
              const a = (i / workers.length) * TAU;
              b.root.p = [1.45 + Math.cos(a) * 1.05 + Math.sin(t + i) * 0.05, Math.sin(a) * 0.85, 0.13];
              b.root.r[2] = -a + Math.PI / 2;
            });
            dancer.root.visible = true;
            // ריקוד הכשכוש: קו ישר ואז סיבוב לצד, פעם ימינה ופעם שמאלה
            const period = 4;
            const q = (t % (period * 2)) / period;
            const side = q < 1 ? 1 : -1;
            const u = q % 1;
            let x = 1.45, y = 0, ang = 0;
            if (u < 0.45) {
              const s = u / 0.45;
              y = -0.42 + s * 0.84;
              x += Math.sin(t * 34) * 0.035;
              ang = 0;
            } else {
              const s = (u - 0.45) / 0.55;
              const th = Math.PI * s;
              x += side * Math.sin(th) * 0.42;
              y = Math.cos(th) * 0.42;
              ang = side * -(th + Math.PI / 2);
            }
            dancer.root.p = [x, y, 0.16];
            dancer.root.r = [Math.PI / 2, 0, ang];
            flutter(dancer, t);
          },
          labels: () => [{ text: 'הריקוד מספר לאן לעוף', pos: w.pos(dancer.root), up: 24 }],
          caption: (t) => ((t % 8) / 4 % 1 < 0.45 ? 'כשכוש בקו ישר: הכיוון אל הפרחים' : 'סיבוב וחוזרים לתחילת הקו')
        },
        {
          group: 'meadow',
          enter: () => { fruit.s = [0, 0, 0]; pollenBee.root.visible = false; pollen.visible = false; flyBees.forEach((b) => { b.root.visible = true; }); honeyLevel.visible = true; },
          cam: { t: [1.4, 0.7, -0.4], d: 11, az: 0.3, el: 0.3 },
          update: (t) => {
            flyBees.forEach((b, i) => {
              const q = (t * 0.1 + i / flyBees.length) % 1;
              const from = q < 0.5 ? flowerTop(A1) : hiveDoor;
              const to = q < 0.5 ? hiveDoor : flowerTop(A1);
              const u = (q % 0.5) * 2;
              const p = arc(from, to, u, 1.6);
              b.root.p = p;
              face(b, from, to);
              flutter(b, t + i);
            });
            honeyLevel.s[1] = 0.05 + ((t * 0.1) % 1) * 0.9;
            honeyLevel.p[1] = 0.42 + honeyLevel.s[1] * 0.5;
          },
          labels: () => [
            { text: 'צוף מהפרחים', pos: flowerTop(A1), up: 18 },
            { text: 'בכוורת הוא נהיה דבש 🍯', pos: [4.4, 1.6, -2.2], up: 8 }
          ]
        },
        {
          group: 'meadow',
          enter: () => { pollenBee.root.visible = true; pollen.visible = true; flyBees.forEach((b) => { b.root.visible = false; }); honeyLevel.visible = false; },
          cam: { t: [-0.2, 1.3, 1.1], d: 6.4, az: -0.1, el: 0.14 },
          update: (t) => {
            const LOOP = 9;
            const q = (t % LOOP) / LOOP;
            const from = flowerTop(A1), to = flowerTop(B1);
            let p;
            if (q < 0.2) p = from;
            else if (q < 0.65) p = arc(from, to, (q - 0.2) / 0.45, 1);
            else p = to;
            pollenBee.root.p = [p[0], p[1] + 0.18, p[2]];
            pollenBee.root.r[1] = Math.PI / 2;
            flutter(pollenBee, t);
            const grow = Math.max(0, (q - 0.7) / 0.3);
            fruit.s = [grow, grow, grow];
            for (let i = 0; i < pollen.n; i++) {
              const a = i * 2.4;
              pollen.pos.set([p[0] + Math.cos(a) * 0.14, p[1] + 0.1 + Math.sin(i) * 0.08, p[2] + Math.sin(a) * 0.14], i * 3);
              pollen.size[i] = q < 0.1 ? q * 10 : q > 0.72 ? Math.max(0, 1 - (q - 0.72) * 6) : 1;
            }
          },
          labels: () => [{ text: 'אבקה עוברת מפרח לפרח', pos: w.pos(pollenBee.root), up: 26 }],
          caption: (t) => ((t % 9) / 9 > 0.72 ? 'ההאבקה הצליחה: נוצר פרי 🍎' : 'הדבורה נושאת אבקה על הגוף')
        }
      ]
    };
  };
})();
