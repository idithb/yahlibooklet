// עולמות תלת ממד של המצאות ומחשבים.
(function () {
  const A = window.App;
  const { TAU, hex } = A.S3D.helpers;

  // ---------- המצאות ----------
  A.SCENES3D.inventions = (w, S) => {
    const plain = (color = '#C9B684') => S.grid(40, 18, 40, 16, null, (x, z) => (Math.sin(x * 1.7 + z * 2.3) > 0 ? color : hex(color).map((v) => v * 0.94)));
    // גלגל: אבן על מזחלת מול אבן על עגלה
    const wheel = w.group();
    w.add(plain(), '#FFFFFF', { parent: wheel });
    const trackTop = w.group({ parent: wheel, p: [-8, 0, -1.6] });
    w.add(S.merge(S.at(S.box(2.2, 0.14, 0.9), { p: [0, 0.1, 0], c: '#8A6A44' }), S.at(S.sphere(0.8, 0.62, 0.7, 10), { p: [0, 0.76, 0], c: '#918C86' })), '#FFFFFF', { parent: trackTop });
    const trackBot = w.group({ parent: wheel, p: [-8, 0, 1.6] });
    w.add(S.merge(S.at(S.box(2.2, 0.14, 0.9), { p: [0, 0.68, 0], c: '#8A6A44' }), S.at(S.sphere(0.8, 0.62, 0.7, 10), { p: [0, 1.32, 0], c: '#918C86' }), S.at(S.tube([[-0.8, 0.45, 0], [-0.8, 0.46, 0]], 0.03, 4), {})), '#FFFFFF', { parent: trackBot });
    const wheels = [[-0.8, 0.5], [-0.8, -0.5], [0.8, 0.5], [0.8, -0.5]].map(([x, z]) => {
      const g = w.group({ parent: trackBot, p: [x, 0.46, z] });
      w.add(S.merge(
        S.at(S.torus(0.4, 0.05, '#6F5532', 18, 6), { r: [Math.PI / 2, 0, 0] }),
        S.at(S.cyl(0.08, 0.08, 0.1, 8), { p: [0, 0, -0.05], r: [Math.PI / 2, 0, 0], c: '#6F5532' }),
        ...[0, 1, 2].map((i) => S.at(S.box(0.75, 0.05, 0.05), { r: [0, 0, (i / 3) * Math.PI], c: '#8A6A44' }))
      ), '#FFFFFF', { parent: g });
      return g;
    });
    const people = [trackTop, trackBot].map((t) => {
      const g = w.group({ parent: t, p: [1.9, 0, 0] });
      const person = S.merge(S.at(S.sphere(0.13, 0.15, 0.13, 8), { p: [0, 1.15, 0], c: '#D9A77E' }), S.at(S.cyl(0.13, 0.17, 0.6, 8), { p: [0, 0.48, 0], c: '#4A6FA5' }), S.at(S.cyl(0.05, 0.06, 0.48, 6), { p: [0.07, 0, 0], c: '#3C3C40' }), S.at(S.cyl(0.05, 0.06, 0.48, 6), { p: [-0.07, 0, 0], c: '#3C3C40' }), S.at(S.tube([[-0.05, 0.92, 0], [-1, 0.6, 0]], 0.012, 5), { c: '#6F5532' }));
      w.add(person, '#FFFFFF', { parent: g, r: [0, 0, -0.18] });
      return g;
    });

    // דפוס
    const press = w.group();
    w.add(S.grid(16, 12, 14, 12, null, (x, z) => (Math.floor(x + 100) + Math.floor(z + 100)) % 2 ? '#B59A70' : '#A98E66'), '#FFFFFF', { parent: press });
    const wood = '#6F4E2C';
    w.add(S.merge(
      S.at(S.box(0.3, 4.4, 0.3), { p: [-1.1, 2.2, 0], c: wood }), S.at(S.box(0.3, 4.4, 0.3), { p: [1.1, 2.2, 0], c: wood }),
      S.at(S.box(2.8, 0.34, 0.5), { p: [0, 4.3, 0], c: wood }), S.at(S.box(2.8, 0.3, 1.6), { p: [0, 1.2, 0], c: wood }),
      S.at(S.box(0.34, 0.7, 2.4), { p: [-1.1, 0.35, 0], c: wood }), S.at(S.box(0.34, 0.7, 2.4), { p: [1.1, 0.35, 0], c: wood })
    ), '#FFFFFF', { parent: press });
    const page = w.add(S.box(1.4, 0.02, 1), '#FFFEF4', { parent: press, p: [0, 1.36, 0] });
    const inkLetters = w.add(S.merge(...Array.from({ length: 28 }, (_, i) => S.at(S.box(0.1, 0.01, 0.04), { p: [-0.55 + (i % 7) * 0.18, 0, -0.34 + Math.floor(i / 7) * 0.2], c: '#222222' })), S.at(S.box(0.3, 0.01, 0.1), { p: [0, 0, -0.42], c: '#AA2222' })), '#FFFFFF', { parent: press, p: [0, 1.38, 0] });
    const plunger = w.group({ parent: press, p: [0, 2.8, 0] });
    w.add(S.merge(S.at(S.box(1.6, 0.28, 1.1), { p: [0, -0.2, 0], c: '#8A6A44' }), S.at(S.cyl(0.11, 0.11, 1.6, 10), { p: [0, 0, 0], c: '#9A9EA3' })), '#FFFFFF', { parent: plunger });
    const lever = w.add(S.at(S.cyl(0.05, 0.05, 2.2, 8), { r: [0, 0, Math.PI / 2], p: [1.1, 0, 0] }), '#7A5A34', { parent: plunger, p: [0, 0.95, 0] });
    const stack = w.group({ parent: press, p: [3.2, 0, 0.6] });
    const books = Array.from({ length: 16 }, (_, i) => w.add(S.box(0.9, 0.16, 0.7), ['#B6452C', '#2C6FA8', '#3C8A4B', '#D8A93C'][i % 4], { parent: stack, p: [Math.sin(i * 3) * 0.04, 0.09 + i * 0.17, Math.cos(i * 3) * 0.04] }));

    // טלפון
    const phone = w.group();
    w.add(S.grid(26, 12, 26, 12, null, (x, z) => (x < 0 ? '#CDBE9C' : '#B9C9DA')), '#FFFFFF', { parent: phone });
    const makePhone = (x) => {
      const g = w.group({ parent: phone, p: [x, 0.8, 0] });
      w.add(S.merge(
        S.at(S.box(3.4, 0.14, 1.8), { p: [0, -0.74, 0], c: '#7A5A34' }),
        S.at(S.cyl(0.32, 0.42, 0.14, 16), { p: [0, -0.66, 0], c: '#1C1C20' }),
        S.at(S.cyl(0.06, 0.08, 1.2, 10), { p: [0, -0.52, 0], c: '#1C1C20' }),
        S.at(S.cyl(0.2, 0.08, 0.3, 14), { p: [0, 0.66, 0.1], r: [1.2, 0, 0], c: '#1C1C20' }),
        S.at(S.cyl(0.08, 0.1, 0.34, 10), { p: [0.34, 0.2, 0], c: '#2C2C30' }),
        S.at(S.sphere(0.12, 0.12, 0.08, 10), { p: [0.34, 0.56, 0], c: '#2C2C30' })
      ), '#FFFFFF', { parent: g });
      return g;
    };
    makePhone(-5); makePhone(5);
    w.add(S.tube([[-4.7, 0.1, 0.3], [-2.6, 2.4, 0.4], [0, 2.8, 0.4], [2.6, 2.4, 0.4], [4.7, 0.1, 0.3]], 0.03, 5), '#3A3A40', { parent: phone });
    const voice = w.points(14, { color: '#E8552B', size: 0.22, add: false, parent: phone });
    const ringsA = Array.from({ length: 4 }, () => w.add(S.torus(0.5, 0.025, '#E8552B', 24, 5), '#E8552B', { parent: phone, r: [Math.PI / 2, 0, 0], emis: 0.9, op: 0.8 }));
    const ringsB = Array.from({ length: 4 }, () => w.add(S.torus(0.5, 0.025, '#3A86E0', 24, 5), '#3A86E0', { parent: phone, r: [Math.PI / 2, 0, 0], emis: 0.9, op: 0.8 }));
    const voicePath = [[-4.7, 0.1, 0.3], [-2.6, 2.4, 0.4], [0, 2.8, 0.4], [2.6, 2.4, 0.4], [4.7, 0.1, 0.3]];
    const along = (q) => {
      const f = q * (voicePath.length - 1), i = Math.min(Math.floor(f), voicePath.length - 2), u = f - i;
      return S.helpers.lerp3(voicePath[i], voicePath[i + 1], u);
    };

    // מטוס האחים רייט
    const flight = w.group();
    const dune = (x, z) => 0.7 * Math.sin(x * 0.11) * Math.cos(z * 0.16) + 0.3 * Math.sin(x * 0.31 + z * 0.2);
    w.add(S.grid(120, 60, 80, 40, dune, (x, z, y) => (y > 0.3 ? '#D2BF8A' : '#C6B27D')), '#FFFFFF', { parent: flight });
    const sea2 = w.add(S.box(120, 0.3, 30), '#3B8FCB', { parent: flight, p: [0, -0.4, -30] });
    const plane = w.group({ parent: flight, p: [-10, 1.2, 1], s: 1.25 });
    const wingM = S.box(5, 0.03, 0.7, '#F4EEDA');
    const struts = [];
    for (let i = -2; i <= 2; i++) [-0.25, 0.25].forEach((z) => struts.push(S.at(S.cyl(0.012, 0.012, 0.56, 4), { p: [i * 1.1, -0.28, z], c: '#6F5532' })));
    w.add(S.merge(
      S.at(wingM, { p: [0, 0.3, 0] }), S.at(wingM, { p: [0, -0.28, 0] }), struts,
      S.at(S.tube([[0, -0.3, 0.3], [2.4, -0.3, 0.2]], 0.012, 4), { c: '#6F5532' }),
      S.at(S.tube([[0, -0.3, -0.3], [2.4, -0.3, -0.2]], 0.012, 4), { c: '#6F5532' }),
      S.at(S.box(0.08, 0.3, 0.5), { p: [2.5, 0, 0], c: '#F4EEDA' }),
      S.at(S.box(0.9, 0.03, 0.34), { p: [-1.4, 0, 0], c: '#F4EEDA' }),
      S.at(S.box(0.34, 0.22, 0.24), { p: [0.3, -0.13, 0], c: '#34343A' }),
      S.at(S.sphere(0.08, 0.09, 0.08, 8), { p: [-0.25, -0.03, 0], c: '#D9A77E' }),
      S.at(S.cyl(0.08, 0.11, 0.26, 6), { p: [-0.25, -0.3, 0], c: '#2C2C30' })
    ), '#FFFFFF', { parent: plane, r: [0, Math.PI, 0] });
    const props = [0.42, -0.42].map((z) => {
      const g = w.group({ parent: plane, p: [-0.9, 0, z] });
      w.add(S.box(0.03, 0.7, 0.05), '#8A6A44', { parent: g });
      return g;
    });

    // אינטרנט
    const net = w.group();
    const gl2 = w.group({ parent: net });
    w.add(S.globe(2, (lat, lon) => (S.earthColor(lat, lon) === '#1F5FB0' ? '#123066' : '#3EA96B')), '#FFFFFF', { parent: gl2 });
    const cities = [[40, -74], [51, 0], [32, 35], [35, 139], [-33, 151], [-23, -46], [19, 73], [1, 103], [55, 37], [-1, 37]];
    const cityPts = cities.map(([lat, lon]) => S.pointAt(lat, lon, 2));
    w.add(S.merge(...cityPts.map((p) => S.at(S.sphere(0.055, 0.055, 0.055, 7), { p, c: '#FFD23F' }))), '#FFFFFF', { parent: gl2, emis: 0 });
    const links = [[0, 1], [1, 2], [2, 6], [6, 7], [7, 3], [3, 4], [0, 5], [5, 9], [9, 2], [1, 8], [8, 3], [2, 3], [0, 3]];
    const arcPts = links.map(([a, b]) => {
      const P = cityPts[a], Q = cityPts[b], out = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const m = S.helpers.lerp3(P, Q, t);
        const n = S.helpers.norm(m);
        out.push(S.helpers.mul(n, 2 + Math.sin(t * Math.PI) * 0.55));
      }
      return out;
    });
    w.add(S.merge(arcPts.map((p) => S.tube(p, 0.008, 4))), '#7FD6FF', { parent: gl2, emis: 0.9 });
    const packets = w.points(arcPts.length * 2, { color: '#FFD23F', size: 0.11, add: true });

    return {
      groups: { wheel, press, phone, flight, net },
      env: { bgTop: '#A6D6F4', bgBot: '#F6F0DE' },
      shots: [
        {
          group: 'wheel',
          cam: { t: [0, 1, 0], d: 16, az: 0.28, el: 0.22 },
          update: (t) => {
            const q = (t % 11) / 11;
            const slow = -8 + q * 6.5;
            const fast = -8 + q * 16;
            trackTop.p[0] = slow;
            trackBot.p[0] = fast;
            wheels.forEach((g) => { g.r[2] = -q * 16 / 0.42; });
            people.forEach((g, i) => { g.r[2] = Math.sin(t * (i ? 9 : 3)) * 0.04; g.p[1] = Math.abs(Math.sin(t * (i ? 9 : 3))) * 0.05; });
          },
          labels: () => [
            { text: 'בלי גלגל: גוררים לאט', pos: w.pos(trackTop, [0, 1.5, 0]), up: 2 },
            { text: 'עם גלגלים: מתגלגל מהר', pos: w.pos(trackBot, [0, 2, 0]), up: 2 }
          ],
          caption: () => 'הגלגל הומצא לפני יותר מ-5,000 שנה'
        },
        {
          group: 'press',
          env: { bgTop: '#5C4A36', bgBot: '#A89273', sky: [0.72, 0.65, 0.56] },
          cam: { t: [0.7, 2.1, 0], d: 9.5, az: 0.4, el: 0.14 },
          update: (t) => {
            const LOOP = 3;
            const q = (t % LOOP) / LOOP;
            const down = q < 0.35 ? q / 0.35 : q < 0.5 ? 1 : Math.max(0, 1 - (q - 0.5) / 0.35);
            plunger.p[1] = 2.8 - down * 1.1;
            plunger.r[1] = down * 2.2;
            inkLetters.visible = q > 0.35;
            page.p[0] = q > 0.8 ? (q - 0.8) * 16 : 0;
            inkLetters.p[0] = page.p[0];
            const n = Math.min(books.length, Math.floor(t / LOOP) + 2);
            books.forEach((b, i) => { b.visible = i < n; });
          },
          labels: (t) => [
            { text: 'לוחצים: האותיות נדפסות על הנייר', pos: w.pos(plunger, [0, 1, 0]), up: 2 },
            { text: `${Math.min(16, Math.floor(t / 3) + 2)} ספרים ועוד...`, pos: [3.2, 3.4, 0.6], up: 2 }
          ],
          caption: () => 'בלי מכונת דפוס העתיקו ספרים ביד, דף אחרי דף'
        },
        {
          group: 'phone',
          env: { bgTop: '#BBD9F0', bgBot: '#EFEBDD' },
          cam: { t: [0, 1.2, 0], d: 16, az: 0.1, el: 0.12 },
          update: (t) => {
            ringsA.forEach((r, i) => {
              const q = (t * 0.4 + i * 0.25) % 1;
              r.p = [-5 + 0.34, 1.5, 0.2];
              const s = 0.2 + q * 1.6;
              r.s = [s, s, s];
              r.op = 0.85 * (1 - q);
              r.visible = (t % 8) < 4;
            });
            ringsB.forEach((r, i) => {
              const q = (t * 0.4 + i * 0.25) % 1;
              r.p = [5 + 0.34, 1.5, 0.2];
              const s = 0.2 + q * 1.6;
              r.s = [s, s, s];
              r.op = 0.85 * (1 - q);
              r.visible = (t % 8) >= 4;
            });
            for (let i = 0; i < voice.n; i++) {
              const q = (t * 0.28 + i / voice.n) % 1;
              voice.pos.set(along((t % 8) < 4 ? q : 1 - q), i * 3);
              voice.size[i] = 1;
            }
          },
          labels: () => [
            { text: 'בעיר אחת', pos: [-5, 2.3, 0], up: 2 },
            { text: 'בעיר אחרת', pos: [5, 2.3, 0], up: 2 },
            { text: 'הקול עובר בחוט כחשמל', pos: [0, 3, 0.4], up: 4 }
          ],
          caption: () => '1876: בפעם הראשונה שומעים קול של מי שנמצא רחוק'
        },
        {
          group: 'flight',
          env: { bgTop: '#7FC2EC', bgBot: '#F6EFDD', fog: 0.0012, fogCol: '#F6EFDD' },
          cam: (t) => { const q = (t % 12) / 12; return { t: [-13 + q * 24, 1.2 + Math.sin(q * Math.PI) * 1.2, 1], d: 7.5, az: 0.6, el: 0.1 }; },
          update: (t) => {
            const q = (t % 12) / 12;
            plane.p = [-13 + q * 24, 0.8 + Math.sin(q * Math.PI) * 1.4 + Math.sin(t * 2) * 0.05, 1];
            plane.r[2] = Math.sin(t * 1.3) * 0.05;
            props.forEach((g, i) => { g.r[0] = t * (i ? 32 : -32); });
          },
          labels: () => [{ text: 'האחים רייט, 1903', pos: w.pos(plane, [0, 0.6, 0]), up: 2 }],
          caption: (t) => `הטיסה הראשונה: ${Math.floor(t % 12) + 1} מתוך 12 שניות`
        },
        {
          group: 'net',
          env: { bgTop: '#03071C', bgBot: '#0A1436', sky: [0.72, 0.72, 0.82], ground: [0.45, 0.45, 0.55], sun: [0.4, 0.6, 1] },
          cam: { t: [0, 0, 0], d: 6.4, az: 0, el: 0.2 },
          update: (t) => {
            gl2.r[1] = -0.6 + t * 0.16;
            const M = w.matrixOf(gl2);
            for (let i = 0; i < packets.n; i++) {
              const arc = arcPts[i % arcPts.length];
              const q = (t * (0.25 + (i % 5) * 0.04) + i * 0.37) % 1;
              const p = arc[Math.floor(q * (arc.length - 1))];
              packets.pos.set([M[0] * p[0] + M[8] * p[2], p[1], M[2] * p[0] + M[10] * p[2]], i * 3);
              packets.size[i] = 1;
            }
          },
          caption: () => 'הודעות ותמונות עוברות בין מחשבים בכל העולם תוך שניות'
        }
      ]
    };
  };

  // ---------- מחשבים ----------
  A.SCENES3D.computers = (w, S) => {
    const desk = w.group();
    w.add(S.box(9, 0.2, 6), '#A97F50', { parent: desk, p: [0, -0.1, 0] });
    // מחשב נייד פתוח
    const base = w.group({ parent: desk, p: [0, 0, 0.6] });
    w.add(S.box(3.4, 0.12, 2.2), '#C6CAD2', { parent: base, p: [0, 0.06, 0] });
    const keys = [];
    const keyMeshes = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 11; c++) {
      const n = w.add(S.box(0.235, 0.05, 0.22), '#2B2F38', { parent: base, p: [-1.33 + c * 0.266, 0.135, -0.72 + r * 0.26] });
      keyMeshes.push(n);
    }
    w.add(S.box(0.9, 0.012, 0.55), '#9AA0AC', { parent: base, p: [0, 0.122, 0.78] });
    const lid = w.group({ parent: base, p: [0, 0.12, -1.08], r: [-0.28, 0, 0] });
    w.add(S.box(3.4, 2.1, 0.08), '#AEB3BD', { parent: lid, p: [0, 1.05, 0] });
    const screen = w.add(S.box(3.1, 1.85, 0.01), '#101626', { parent: lid, p: [0, 1.05, 0.045], emis: 0.3 });
    const typed = Array.from({ length: 14 }, (_, i) => w.add(S.box(0.13, 0.17, 0.01), '#7FE28A', { parent: lid, p: [-1.3 + i * 0.2, 1.62, 0.055], emis: 1 }));
    const speakers = [1, -1].map((k) => w.add(S.box(0.34, 0.012, 0.1), '#6E737E', { parent: base, p: [k * 1.4, 0.122, 0.8] }));
    const sound = Array.from({ length: 3 }, () => w.add(S.torus(0.3, 0.012, '#3A86E0', 20, 4), '#3A86E0', { parent: base, emis: 0.8, op: 0.8 }));
    const pulse = w.points(8, { color: '#FF9F1C', size: 0.1, add: true, parent: base });
    const mouse = w.add(S.sphere(0.26, 0.13, 0.4, 12), '#D8DAE0', { parent: desk, p: [2.6, 0.12, 1.1] });

    // הלוח שבפנים
    const board = w.group();
    w.add(S.box(7, 0.12, 5), '#1F6A4C', { parent: board });
    const traces = [];
    for (let i = 0; i < 26; i++) {
      const z = -2.1 + i * 0.17;
      traces.push(S.at(S.box(6.2, 0.006, 0.018), { p: [Math.sin(i * 7) * 0.1, 0.064, z], c: '#E0B44B' }));
    }
    w.add(S.merge(traces), '#FFFFFF', { parent: board });
    const cpu = w.group({ parent: board, p: [0, 0.06, 0] });
    const pins = [];
    for (let i = 0; i < 16; i++) {
      const a = -0.72 + i * 0.096;
      pins.push(S.at(S.box(0.03, 0.04, 0.14), { p: [a, 0.02, 0.86], c: '#E0B44B' }), S.at(S.box(0.03, 0.04, 0.14), { p: [a, 0.02, -0.86], c: '#E0B44B' }));
      pins.push(S.at(S.box(0.14, 0.04, 0.03), { p: [0.86, 0.02, a], c: '#E0B44B' }), S.at(S.box(0.14, 0.04, 0.03), { p: [-0.86, 0.02, a], c: '#E0B44B' }));
    }
    w.add(S.merge(pins), '#FFFFFF', { parent: cpu });
    w.add(S.box(1.6, 0.14, 1.6), '#30343C', { parent: cpu, p: [0, 0.07, 0] });
    const cpuTop = w.add(S.box(1, 0.04, 1), '#B8BDC6', { parent: cpu, p: [0, 0.16, 0], emis: 0.1 });
    const dataFlow = w.points(90, { color: '#FFE05A', size: 0.09, add: true, parent: board });
    const ram = [0, 1].map((i) => {
      const g = w.group({ parent: board, p: [2.1 + i * 0.5, 0.06, 0] });
      w.add(S.box(0.16, 0.6, 3), '#245C8F', { parent: g, p: [0, 0.3, 0] });
      const chips = [];
      for (let k = 0; k < 7; k++) chips.push(w.add(S.box(0.03, 0.26, 0.28), '#FFD23F', { parent: g, p: [0.09, 0.32, -1.2 + k * 0.4], emis: 0.9 }));
      return { g, chips };
    });
    const ssd = w.group({ parent: board, p: [-2.1, 0.06, -0.8] });
    w.add(S.box(1.7, 0.2, 1.1), '#3C3F47', { parent: ssd, p: [0, 0.1, 0] });
    const ssdLights = [];
    for (let k = 0; k < 6; k++) ssdLights.push(w.add(S.box(0.2, 0.02, 0.16), '#6FE08A', { parent: ssd, p: [-0.55 + k * 0.22, 0.21, 0], emis: 0.9 }));
    const pwr = w.add(S.cyl(0.26, 0.26, 0.1, 18), '#E8552B', { parent: board, p: [-2.4, 0.06, 1.7], emis: 0.8 });

    // ביטים
    const bits = w.group();
    w.add(S.box(9, 0.34, 2), '#2C3038', { parent: bits, p: [0, 0, 0] });
    const lamps = Array.from({ length: 8 }, (_, i) => {
      const x = -3.5 + i;
      w.add(S.cyl(0.36, 0.42, 0.14, 18), '#7E838E', { parent: bits, p: [x, 0.17, 0] });
      return w.add(S.sphere(0.34, 0.34, 0.34, 16), '#FFD23F', { parent: bits, p: [x, 0.5, 0] });
    });
    const LETTERS = [['A', 65], ['B', 66], ['C', 67], ['1', 49], ['!', 33]];

    // רובוט על לוח שמבצע הוראות
    const code = w.group();
    const tiles = [];
    for (let x = 0; x < 6; x++) for (let z = 0; z < 5; z++) tiles.push(S.at(S.box(0.96, 0.08, 0.96), { p: [x - 2.5, 0, z - 2], c: (x + z) % 2 ? '#E8ECF2' : '#CCD3DE' }));
    w.add(S.merge(tiles), '#FFFFFF', { parent: code });
    w.add(S.merge(S.at(S.box(0.96, 0.1, 0.96), { p: [2.5, 0.01, -2], c: '#55B84A' }), S.at(S.cyl(0.03, 0.03, 0.9, 6), { p: [2.5, 0, -2], c: '#555555' }), S.at(S.plate([[0, 0], [0.45, -0.14], [0, -0.28]], 0.01), { p: [2.5, 0.88, -2], c: '#E8552B' })), '#FFFFFF', { parent: code });
    w.add(S.box(0.96, 0.7, 0.96), '#8E7A5E', { parent: code, p: [0.5, 0.35, -2] });
    const robot = w.group({ parent: code });
    w.add(S.merge(
      S.at(S.box(0.54, 0.46, 0.4), { p: [0, 0.32, 0], c: '#4C8FD8' }),
      S.at(S.box(0.4, 0.3, 0.34), { p: [0, 0.72, 0], c: '#6FAEE8' }),
      S.at(S.sphere(0.05, 0.05, 0.03, 8), { p: [0.1, 0.76, 0.17], c: '#FFFFFF' }),
      S.at(S.sphere(0.05, 0.05, 0.03, 8), { p: [-0.1, 0.76, 0.17], c: '#FFFFFF' }),
      S.at(S.cyl(0.012, 0.012, 0.16, 5), { p: [0, 0.87, 0], c: '#555555' }),
      S.at(S.sphere(0.04, 0.04, 0.04, 7), { p: [0, 1.04, 0], c: '#E8552B' }),
      S.at(S.box(0.16, 0.1, 0.3), { p: [0.16, 0.05, 0], c: '#3A3F4A' }),
      S.at(S.box(0.16, 0.1, 0.3), { p: [-0.16, 0.05, 0], c: '#3A3F4A' })
    ), '#FFFFFF', { parent: robot });
    const STEPS = [
      ['קדימה', 0, 1], ['קדימה', 0, 1], ['פנייה ימינה', 1, 0], ['קדימה', 0, 1], ['קדימה', 0, 1], ['קדימה', 0, 1], ['קדימה', 0, 1], ['קדימה', 0, 1], ['פנייה שמאלה', -1, 0], ['קדימה', 0, 1], ['קדימה', 0, 1]
    ];
    const robotStart = { x: -2.5, z: 2, dir: Math.PI };
    const robotAt = (t) => {
      let { x, z, dir } = robotStart;
      const q = (t % (STEPS.length + 3));
      for (let i = 0; i < STEPS.length; i++) {
        const u = Math.max(0, Math.min(1, q - i));
        const [, turn, mv] = STEPS[i];
        const ease = u * u * (3 - 2 * u);
        if (u <= 0) break;
        if (turn) dir -= turn * ease * Math.PI / 2;
        if (mv) { x += Math.sin(dir) * ease; z += Math.cos(dir) * ease; }
      }
      return { x, z, dir, idx: Math.min(Math.floor(q), STEPS.length), done: q >= STEPS.length };
    };

    return {
      groups: { desk, board, bits, code },
      env: { bgTop: '#DCE6F2', bgBot: '#F6F8FB' },
      shots: [
        {
          group: 'desk',
          cam: { t: [0, 0.9, 0.2], d: 7.4, az: 0.34, el: 0.34 },
          update: (t) => {
            const LOOP = 0.6;
            const n = Math.floor(t / LOOP);
            const key = keyMeshes[(n * 17) % keyMeshes.length];
            keyMeshes.forEach((k) => { k.p[1] = 0.135; k.color = [0.17, 0.18, 0.22]; });
            key.p[1] = 0.115;
            key.color = [0.95, 0.6, 0.15];
            typed.forEach((c, i) => { c.visible = i <= n % 14; });
            const from = [key.p[0], 0.2, key.p[2]], to = [0, 1.1, -1.05];
            const u = (t % LOOP) / LOOP;
            for (let i = 0; i < pulse.n; i++) {
              const q = Math.min(1, Math.max(0, u - i * 0.03));
              pulse.pos.set(S.helpers.lerp3(from, to, q), i * 3);
              pulse.size[i] = u > i * 0.03 && u < 0.95 ? 1 : 0;
            }
            sound.forEach((r, i) => {
              const q = (t * 0.6 + i / 3) % 1;
              r.p = [1.4, 0.15 + q * 0.5, 0.8];
              const s = 0.4 + q * 1.3;
              r.s = [s, s, s];
              r.op = 0.8 * (1 - q);
            });
          },
          labels: () => [
            { text: 'קלט: מקלדת', pos: [-0.9, 0.3, 0.6], up: -20 },
            { text: 'קלט: עכבר', pos: [2.6, 0.4, 1.1], up: 2 },
            { text: 'פלט: מסך', pos: [0, 2.3, -0.9], up: 2 },
            { text: 'פלט: רמקול', pos: [1.4, 0.35, 1.4], up: -18 }
          ]
        },
        {
          group: 'board',
          enter: () => {},
          env: { bgTop: '#0D1F2D', bgBot: '#1B3B4D' },
          cam: { t: [0, 0.1, 0], d: 5.2, az: 0.2, el: 0.62 },
          update: (t) => {
            const on = 1;
            ram.forEach((r) => r.chips.forEach((c) => { c.emis = 0.9; }));
            ssdLights.forEach((c) => { c.emis = 0.9; });
            pwr.emis = 0.9;
            for (let i = 0; i < dataFlow.n; i++) {
              const q = (t * 0.75 + (i * 0.618) % 1) % 1;
              const lane = ((i * 7) % 15) * 0.1 - 0.7;
              const horiz = i % 2 === 0;
              const a = (q - 0.5) * 2 * (i % 4 < 2 ? 1 : -1) * 3.2;
              dataFlow.pos.set(horiz ? [a, 0.1, lane] : [lane, 0.1, a * 0.75], i * 3);
              dataFlow.size[i] = Math.abs(a) < 0.9 ? 0 : on;
            }
            cpuTop.emis = 0.2 + Math.abs(Math.sin(t * 9)) * 0.3;
          },
          labels: () => [{ text: 'המעבד', pos: [0, 0.3, 0], up: 8, big: true }],
          caption: () => 'מיליארדי פעולות פשוטות בכל שנייה'
        },
        {
          group: 'board',
          env: { bgTop: '#0D1F2D', bgBot: '#1B3B4D' },
          cam: { t: [0, 0.2, 0], d: 6.4, az: -0.1, el: 0.62 },
          update: (t) => {
            const LOOP = 6;
            const off = (t % LOOP) > 3;
            ram.forEach((r) => r.chips.forEach((c) => { c.emis = off ? 0 : 0.9; c.color = off ? [0.28, 0.28, 0.3] : [1, 0.82, 0.25]; }));
            ssdLights.forEach((c, i) => { c.emis = off ? 0.65 : 0.9; c.color = [0.43, 0.88, 0.54]; });
            pwr.emis = off ? 0 : 0.9;
            pwr.color = off ? [0.3, 0.2, 0.18] : [0.91, 0.33, 0.17];
            for (let i = 0; i < dataFlow.n; i++) dataFlow.size[i] = 0;
          },
          labels: (t) => [
            { text: (t % 6) > 3 ? 'זיכרון זמני: נמחק!' : 'זיכרון זמני', pos: [2.3, 0.7, 0], up: 2 },
            { text: 'אחסון: הקבצים נשארים', pos: [-2.1, 0.35, -0.8], up: 2 },
            { text: (t % 6) > 3 ? 'כבוי' : 'דולק', pos: [-2.4, 0.2, 1.7], up: 2 }
          ],
          caption: (t) => ((t % 6) > 3 ? 'כיבינו את המחשב: הזיכרון הזמני כבה, והאחסון שמר הכול' : 'המחשב דולק: הכול פועל')
        },
        {
          group: 'bits',
          env: { bgTop: '#101626', bgBot: '#27324A' },
          cam: { t: [0, 0.4, 0], d: 7.6, az: 0.12, el: 0.32 },
          update: (t) => {
            const [, code2] = LETTERS[Math.floor(t / 2.6) % LETTERS.length];
            lamps.forEach((l, i) => {
              const on = (code2 >> (7 - i)) & 1;
              l.color = on ? [1, 0.82, 0.25] : [0.2, 0.22, 0.27];
              l.emis = on ? 1 : 0;
            });
          },
          labels: (t) => {
            const [, code2] = LETTERS[Math.floor(t / 2.6) % LETTERS.length];
            return lamps.map((l, i) => ({ text: String((code2 >> (7 - i)) & 1), pos: [l.p[0], 1, 0], up: 2, big: true }));
          },
          caption: (t) => {
            const [ch] = LETTERS[Math.floor(t / 2.6) % LETTERS.length];
            return `כך המחשב שומר את התו: ${ch}`;
          }
        },
        {
          group: 'code',
          env: { bgTop: '#D5E0EE', bgBot: '#EDF2F8' },
          cam: { t: [0, 0.3, 0], d: 8.4, az: 0.3, el: 0.6 },
          update: (t) => {
            const r = robotAt(t);
            robot.p = [r.x, 0.04, r.z];
            robot.r[1] = r.dir;
          },
          labels: () => [{ text: 'רובוט', pos: [robot.p[0], 1.05, robot.p[2]], up: 8 }, { text: '🏁 יעד', pos: [2.5, 1, -2], up: 2 }],
          caption: (t) => {
            const r = robotAt(t);
            if (r.done) return '🎉 הגיע! הרובוט עשה בדיוק מה שכתוב בתוכנה';
            return `הוראה ${r.idx + 1} מתוך ${STEPS.length}: ${STEPS[r.idx][0]}`;
          }
        }
      ]
    };
  };
})();
