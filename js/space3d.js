// מערכת השמש בתלת ממד: מנוע קטן ב-WebGL, בלי ספריות ובלי אינטרנט.
// כל גוף הוא כדור שמצויר בקרן אור בתוך ה-shader, וכל כרטיס בנושא הוא סצנה משלו.
(function () {
  const A = window.App;
  const h = A.h;

  const MAX_BODIES = 10;
  const DEG = Math.PI / 180;
  const TAU = Math.PI * 2;

  // תאי המרקם במפה המשותפת
  const CELL = { sun: 0, rock: 1, venus: 2, earth: 3, mars: 4, jupiter: 5, saturn: 6, ice: 7 };

  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform vec3 uCam, uRight, uUp, uFwd, uLight;
uniform float uScale, uTime, uAmbient;
uniform int uN, uON, uRing, uGlow;
uniform vec4 uB[${MAX_BODIES}];
uniform vec4 uM[${MAX_BODIES}];
uniform vec3 uT[${MAX_BODIES}];
uniform float uOrb[8];
uniform sampler2D uTex;

vec3 toLocal(vec3 n, float spin, float tilt) {
  float c = cos(tilt), s = sin(tilt);
  vec3 a = vec3(c * n.x + s * n.y, -s * n.x + c * n.y, n.z);
  c = cos(spin); s = sin(spin);
  return vec3(c * a.x - s * a.z, a.y, s * a.x + c * a.z);
}
vec3 sampleCell(float cell, vec3 l, float shift) {
  float u = fract(atan(-l.z, l.x) / 6.28318 + 0.5 + shift);
  float v = 0.5 - asin(clamp(l.y, -1., 1.)) / 3.14159;
  float col = mod(cell, 2.), row = floor(cell / 2.);
  return texture2D(uTex, vec2((col + u * 0.998 + 0.001) / 2., (row + v * 0.998 + 0.001) / 4.)).rgb;
}
float hitSphere(vec3 ro, vec3 rd, vec4 s) {
  vec3 oc = ro - s.xyz;
  float b = dot(oc, rd), c = dot(oc, oc) - s.w * s.w, d = b * b - c;
  if (d < 0.) return -1.;
  return -b - sqrt(d);
}
float ringDensity(float r) {
  if (r < 1.24 || r > 2.27) return 0.;
  float d = 0.55 + 0.3 * sin(r * 34.) * sin(r * 11. + 1.) + 0.15 * sin(r * 90.);
  if (r < 1.52) d *= 0.45;
  d *= 1. - smoothstep(1.94, 1.96, r) * (1. - smoothstep(2.01, 2.03, r));
  return clamp(d, 0., 1.) * smoothstep(1.24, 1.27, r) * (1. - smoothstep(2.24, 2.27, r));
}
vec3 ringNormal(float tilt) { return vec3(-sin(tilt), cos(tilt), 0.); }

vec3 stars(vec3 rd) {
  vec3 q = rd * 170.;
  vec3 cell = floor(q);
  float h = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  if (h < 0.986) return vec3(0.);
  float m = fract(h * 91.7);
  float d = length(fract(q) - 0.5);
  float b = smoothstep(0.42, 0.05, d) * (0.3 + 0.7 * m);
  return b * mix(vec3(0.75, 0.85, 1.), vec3(1., 0.92, 0.8), fract(h * 37.));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * uRes.y);
  vec3 rd = normalize(uFwd + (uv.x * uRight + uv.y * uUp) * uScale);
  vec3 col = stars(rd) + vec3(0.008, 0.012, 0.03);

  float best = 1e9;
  int hit = -1;
  for (int i = 0; i < ${MAX_BODIES}; i++) {
    if (i >= uN) break;
    float t = hitSphere(uCam, rd, uB[i]);
    if (t > 0. && t < best) { best = t; hit = i; }
  }

  // מסלולים
  if (uON > 0 && abs(rd.y) > 1e-4) {
    float t = -uCam.y / rd.y;
    if (t > 0. && t < best) {
      vec3 p = uCam + rd * t;
      float L = length(p.xz);
      float w = max(0.0035, t * 0.0016 * uScale);
      for (int i = 0; i < 8; i++) {
        if (i >= uON) break;
        col += smoothstep(w, 0., abs(L - uOrb[i])) * vec3(0.32, 0.42, 0.68);
      }
    }
  }

  // הילת השמש
  if (uGlow >= 0) {
    vec4 s = vec4(0.);
    for (int i = 0; i < ${MAX_BODIES}; i++) if (i == uGlow) s = uB[i];
    float b = dot(s.xyz - uCam, rd);
    if (b > 0.) {
      float d = length(uCam + rd * b - s.xyz);
      float g = s.w / max(d, s.w);
      col += vec3(1., 0.58, 0.18) * (pow(g, 4.) * 0.4 + pow(g, 12.) * 0.7) * (hit >= 0 && best < b ? 0. : 1.);
    }
  }

  if (hit >= 0) {
    vec4 body = vec4(0.), mat = vec4(0.);
    vec3 tint = vec3(1.);
    for (int i = 0; i < ${MAX_BODIES}; i++) if (i == hit) { body = uB[i]; mat = uM[i]; tint = uT[i]; }
    vec3 p = uCam + rd * best;
    vec3 n = normalize(p - body.xyz);
    vec3 l = toLocal(n, mat.y, mat.z);
    vec3 base = sampleCell(mat.x, l, 0.);
    if (mat.w > 0.5) {
      // השמש רותחת: שתי שכבות שזזות זו מול זו, והקצה כהה יותר
      vec3 b2 = sampleCell(mat.x, l.zyx, uTime * 0.004);
      vec3 b3 = sampleCell(mat.x, l, -uTime * 0.007);
      vec3 c = (base + b2 + b3) / 3.;
      float limb = pow(max(dot(n, -rd), 0.), 0.45);
      col = c * (0.55 + 0.75 * limb) * 1.15;
    } else {
      vec3 L = normalize(uLight - p);
      float diff = dot(n, L);
      float lit = smoothstep(-0.03, 0.12, diff) * (0.25 + 0.85 * max(diff, 0.));
      // הצל של הטבעות על הכוכב
      if (uRing == hit) {
        vec3 rn = ringNormal(mat.z);
        float dn = dot(L, rn);
        if (abs(dn) > 1e-3) {
          float tr = dot(body.xyz - p, rn) / dn;
          if (tr > 0.) lit *= 1. - 0.65 * ringDensity(length(p + L * tr - body.xyz) / body.w);
        }
      }
      vec3 surf = base * tint;
      col = surf * (lit + uAmbient);
      // אווירה של כדור הארץ
      if (mat.x > 2.5 && mat.x < 3.5) {
        float rim = pow(1. - max(dot(n, -rd), 0.), 3.2);
        col += vec3(0.25, 0.5, 1.) * rim * (smoothstep(-0.25, 0.4, diff) * 0.9 + 0.02);
      }
    }
  }

  // טבעות
  if (uRing >= 0) {
    vec4 s = vec4(0.);
    float tilt = 0.;
    for (int i = 0; i < ${MAX_BODIES}; i++) if (i == uRing) { s = uB[i]; tilt = uM[i].z; }
    vec3 rn = ringNormal(tilt);
    float dn = dot(rd, rn);
    if (abs(dn) > 1e-4) {
      float t = dot(s.xyz - uCam, rn) / dn;
      if (t > 0. && t < best) {
        vec3 p = uCam + rd * t;
        float r = length(p - s.xyz) / s.w;
        float d = ringDensity(r);
        if (d > 0.) {
          vec3 L = normalize(uLight - p);
          float shadow = hitSphere(p, L, s) > 0. ? 0.12 : 1.;
          vec3 c = mix(vec3(0.72, 0.62, 0.46), vec3(0.95, 0.88, 0.72), fract(r * 7.3)) * shadow;
          col = mix(col, c, d * 0.92);
        }
      }
    }
  }

  gl_FragColor = vec4(col, 1.);
}`;

  // רעש תלת ממדי, כדי שלא יהיה תפר במרקם
  const PERM = new Uint8Array(512);
  (function () {
    let seed = 12345;
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      const j = seed % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
  })();
  const fade = (t) => t * t * (3 - 2 * t);
  function noise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const fx = fade(x - xi), fy = fade(y - yi), fz = fade(z - zi);
    const X = xi & 255, Y = yi & 255, Z = zi & 255;
    const v = (a, b, c) => PERM[PERM[PERM[(X + a) & 255] + ((Y + b) & 255)] + ((Z + c) & 255)] / 255;
    const lerp = (a, b, t) => a + (b - a) * t;
    return lerp(
      lerp(lerp(v(0, 0, 0), v(1, 0, 0), fx), lerp(v(0, 1, 0), v(1, 1, 0), fx), fy),
      lerp(lerp(v(0, 0, 1), v(1, 0, 1), fx), lerp(v(0, 1, 1), v(1, 1, 1), fx), fy),
      fz
    );
  }
  function fbm(x, y, z, oct = 4) {
    let a = 0.5, f = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) {
      sum += a * noise(x * f, y * f, z * f);
      norm += a;
      a *= 0.5;
      f *= 2.03;
    }
    return sum / norm;
  }
  const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const clamp01 = (t) => Math.max(0, Math.min(1, t));
  const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  // היבשות בקירוב: מרכז (קו רוחב, קו אורך) וחצי רוחב במעלות
  const LAND = [
    [50, -100, 18, 30], [36, -95, 12, 19], [66, -120, 10, 32], [20, -101, 8, 8], [60, -74, 9, 10], [72, -40, 11, 13], [12, -85, 6, 5],
    [-5, -62, 16, 15], [-22, -57, 14, 10], [-40, -68, 12, 5],
    [16, 0, 12, 22], [16, 25, 12, 11], [0, 20, 12, 14], [-15, 26, 13, 10], [-28, 25, 6, 7], [8, 41, 6, 6], [-19, 47, 5, 3],
    [50, 12, 7, 17], [41, -4, 4, 6], [42, 13, 3, 4], [41, 24, 4, 8], [60, 32, 10, 26], [65, 16, 7, 7], [54, -3, 5, 3],
    [56, 65, 14, 30], [62, 102, 12, 40], [40, 100, 13, 26], [31, 80, 9, 13], [21, 78, 11, 7], [25, 46, 9, 9], [33, 38, 5, 6],
    [38, 40, 5, 14], [37, 68, 8, 15], [14, 103, 10, 6], [35, 116, 8, 11], [68, 130, 6, 32], [36, 138, 5, 3],
    [-2, 112, 4, 8], [-5, 130, 3, 9], [-25, 134, 11, 16], [-84, 0, 8, 200]
  ];
  function landAt(lat, lon) {
    let v = 0;
    for (const [a, o, ra, ro] of LAND) {
      const dLat = (lat - a) / ra;
      let dLon = lon - o;
      if (dLon > 180) dLon -= 360;
      if (dLon < -180) dLon += 360;
      dLon /= ro;
      const d = dLat * dLat + dLon * dLon;
      if (d < 1) v = Math.max(v, 1 - d);
    }
    return v;
  }

  A.earthLandAt = landAt;

  const PAINT = {
    sun(d, lat) {
      const n = fbm(d[0] * 9, d[1] * 9, d[2] * 9, 4);
      const g = noise(d[0] * 48, d[1] * 48, d[2] * 48);
      const c = mix3([1, 0.42, 0.04], [1, 0.84, 0.32], smooth(0.3, 0.72, n * 0.75 + g * 0.25));
      const spot = smooth(0.74, 0.8, fbm(d[0] * 3.1 + 5, d[1] * 3.1, d[2] * 3.1, 2)) * (Math.abs(lat) < 40 ? 0.3 : 0);
      return mix3(c, [0.45, 0.12, 0.02], spot);
    },
    rock(d) {
      const n = fbm(d[0] * 5, d[1] * 5, d[2] * 5, 5);
      const pits = smooth(0.62, 0.72, noise(d[0] * 22, d[1] * 22, d[2] * 22));
      const v = 0.5 + (n - 0.5) * 1.1 - pits * 0.14;
      return [v, v, v];
    },
    venus(d, lat) {
      const n = fbm(d[0] * 3 + lat * 0.02, d[1] * 9, d[2] * 3, 5);
      return mix3([0.78, 0.58, 0.3], [0.98, 0.9, 0.68], n);
    },
    earth(d, lat, lon) {
      const wx = (fbm(d[0] * 4, d[1] * 4, d[2] * 4, 4) - 0.5) * 16;
      const wy = (fbm(d[0] * 4 + 9, d[1] * 4, d[2] * 4, 4) - 0.5) * 16;
      const land = landAt(lat + wx, lon + wy);
      const abs = Math.abs(lat);
      const deep = mix3([0.02, 0.13, 0.42], [0.04, 0.28, 0.62], fbm(d[0] * 3, d[1] * 3, d[2] * 3, 3));
      let c = deep;
      if (land > 0.015) {
        const n = fbm(d[0] * 8, d[1] * 8, d[2] * 8, 4);
        const dry = smooth(12, 30, abs) * (1 - smooth(34, 46, abs));
        c = mix3(mix3([0.13, 0.38, 0.14], [0.3, 0.42, 0.18], n), [0.76, 0.62, 0.36], dry * smooth(0.35, 0.6, n + 0.1));
        c = mix3(deep, c, smooth(0.015, 0.06, land));
      }
      c = mix3(c, [0.95, 0.97, 1], smooth(70, 78, abs + (fbm(d[0] * 6, d[1] * 6, d[2] * 6, 3) - 0.5) * 14));
      const cloud = smooth(0.62, 0.8, fbm(d[0] * 5 + 3, d[1] * 9, d[2] * 5, 5));
      return mix3(c, [1, 1, 1], cloud * 0.7);
    },
    mars(d, lat) {
      const n = fbm(d[0] * 4, d[1] * 4, d[2] * 4, 5);
      let c = mix3([0.5, 0.2, 0.09], [0.86, 0.46, 0.24], n);
      c = mix3(c, [0.28, 0.14, 0.1], smooth(0.56, 0.68, fbm(d[0] * 2.4 + 4, d[1] * 2.4, d[2] * 2.4, 3)) * 0.6);
      return mix3(c, [0.96, 0.94, 0.92], smooth(76, 82, Math.abs(lat) + (n - 0.5) * 8));
    },
    jupiter(d, lat, lon) {
      const warp = (fbm(d[0] * 6, d[1] * 16, d[2] * 6, 5) - 0.5) * 5;
      const band = Math.sin((lat + warp) * 0.62) * 0.5 + 0.5;
      const fine = fbm(d[0] * 3, d[1] * 26, d[2] * 3, 4);
      let c = mix3([0.62, 0.39, 0.24], [0.95, 0.87, 0.73], smooth(0.25, 0.75, band * 0.75 + fine * 0.25));
      const dx = (lon - 30) / 15, dy = (lat + 22) / 8;
      const spot = dx * dx + dy * dy;
      c = mix3(c, [0.97, 0.9, 0.82], smooth(2.1, 1.3, spot) * 0.7);
      return mix3(c, [0.75, 0.25, 0.14], smooth(1.1, 0.75, spot));
    },
    saturn(d, lat) {
      const warp = (fbm(d[0] * 4, d[1] * 10, d[2] * 4, 3) - 0.5) * 4;
      const band = Math.sin((lat + warp) * 0.42) * 0.5 + 0.5;
      return mix3([0.78, 0.65, 0.42], [0.97, 0.89, 0.68], band);
    },
    ice(d, lat) {
      const v = 0.86 + 0.1 * Math.sin(lat * 0.25) + (fbm(d[0] * 3, d[1] * 8, d[2] * 3, 3) - 0.5) * 0.2;
      return [v, v, v];
    }
  };

  let atlasCache = null;
  function bakeAtlas() {
    if (atlasCache) return atlasCache;
    const W = 2048, H = 2048;
    const atlas = document.createElement('canvas');
    atlas.width = W; atlas.height = H;
    const ctx = atlas.getContext('2d');
    const sizes = A.lowPower ? {} : { earth: [1024, 512], jupiter: [1024, 512] };
    const small = A.lowPower ? [384, 192] : [512, 256];
    for (const [name, cell] of Object.entries(CELL)) {
      const [w, ht] = sizes[name] || small;
      const img = ctx.createImageData(w, ht);
      const paint = PAINT[name];
      for (let y = 0; y < ht; y++) {
        const lat = 90 - ((y + 0.5) / ht) * 180;
        const cl = Math.cos(lat * DEG), sl = Math.sin(lat * DEG);
        for (let x = 0; x < w; x++) {
          const lon = ((x + 0.5) / w) * 360 - 180;
          const d = [cl * Math.cos(lon * DEG), sl, -cl * Math.sin(lon * DEG)];
          const c = paint(d, lat, lon);
          const o = (y * w + x) * 4;
          img.data[o] = c[0] * 255;
          img.data[o + 1] = c[1] * 255;
          img.data[o + 2] = c[2] * 255;
          img.data[o + 3] = 255;
        }
      }
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = ht;
      tmp.getContext('2d').putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(tmp, (cell % 2) * 1024, Math.floor(cell / 2) * 512, 1024, 512);
    }
    atlasCache = atlas;
    return atlas;
  }

  // כיוון של נקודה על גוף מסתובב ונטוי, בעולם (תואם ל-toLocal שב-shader)
  function surfacePoint(lat, lon, spin, tilt) {
    const cl = Math.cos(lat * DEG), sl = Math.sin(lat * DEG);
    const x = cl * Math.cos(lon * DEG), y = sl, z = -cl * Math.sin(lon * DEG);
    const c = Math.cos(spin), s = Math.sin(spin);
    const x1 = x * c + z * s, z1 = -x * s + z * c;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    return [x1 * ct - y * st, x1 * st + y * ct, z1];
  }

  const orbitAt = (r, angle, y = 0) => [r * Math.cos(angle), y, -r * Math.sin(angle)];

  const PLANETS = [
    { name: 'חמה', cell: CELL.rock, tint: [0.72, 0.66, 0.6], r: 0.15, orbit: 1.5, period: 88, phase: 0.4, tilt: 0 },
    { name: 'נוגה', cell: CELL.venus, tint: [1, 1, 1], r: 0.23, orbit: 2.05, period: 225, phase: 2.5, tilt: 0.05 },
    { name: 'ארץ', cell: CELL.earth, tint: [1, 1, 1], r: 0.25, orbit: 2.7, period: 365.25, phase: 4.5, tilt: 23.4 * DEG },
    { name: 'מאדים', cell: CELL.mars, tint: [1, 1, 1], r: 0.19, orbit: 3.3, period: 687, phase: 1.1, tilt: 25 * DEG },
    { name: 'צדק', cell: CELL.jupiter, tint: [1, 1, 1], r: 0.58, orbit: 4.6, period: 4333, phase: 3.4, tilt: 3 * DEG },
    { name: 'שבתאי', cell: CELL.saturn, tint: [1, 1, 1], r: 0.4, orbit: 6.1, period: 10759, phase: 5.6, tilt: 26.7 * DEG, ring: true },
    { name: 'אורנוס', cell: CELL.ice, tint: [0.62, 0.9, 0.93], r: 0.32, orbit: 7.4, period: 30687, phase: 0.9, tilt: 82 * DEG },
    { name: 'נפטון', cell: CELL.ice, tint: [0.32, 0.46, 0.95], r: 0.31, orbit: 8.4, period: 60190, phase: 2.9, tilt: 28 * DEG }
  ];
  const EARTH_YEAR_SECONDS = 9; // בסצנה של כל הכוכבים: שנת ארץ אחת ב-9 שניות, ושאר הכוכבים ביחס האמיתי

  const body = (pos, r, cell, opts = {}) => ({
    pos, r, cell,
    spin: opts.spin || 0,
    tilt: opts.tilt || 0,
    tint: opts.tint || [1, 1, 1],
    emissive: !!opts.emissive
  });

  const SCENES = {
    // השמש, ולידה כדור הארץ בגודל אמיתי ביחס אליה
    sun: {
      caption: () => 'השמש וכדור הארץ, בגודל אמיתי זה לעומת זה',
      build(t) {
        const earth = body([1.75, 0.35, -0.9], 1 / 109, CELL.earth, { tilt: 23.4 * DEG });
        return {
          cam: { dist: 3.7, az: 0.32 + t * 0.012, el: 0.08, target: [0.25, 0, 0], fov: 40 },
          light: [0, 0, 0],
          bodies: [body([0, 0, 0], 1, CELL.sun, { spin: t * 0.02, emissive: true }), earth],
          glow: 0,
          labels: [
            { text: 'השמש', pos: [0, 1, 0], big: true, up: 8, body: 0 },
            { text: 'כדור הארץ', pos: earth.pos, up: 12, body: 1 }
          ]
        };
      }
    },
    // כל מערכת השמש: זמני ההקפה ביחס האמיתי
    system: {
      note: 'הגדלים והמרחקים הוקטנו כדי שהכול ייכנס לתמונה',
      build(t) {
        const bodies = [body([0, 0, 0], 0.8, CELL.sun, { spin: t * 0.05, emissive: true })];
        const labels = [{ text: 'השמש', pos: [0, 0.8, 0], up: 14, body: 0 }];
        let ring = -1;
        for (const p of PLANETS) {
          const a = p.phase + (t / EARTH_YEAR_SECONDS) * (365.25 / p.period) * TAU;
          const pos = orbitAt(p.orbit, a);
          bodies.push(body(pos, p.r, p.cell, { tint: p.tint, tilt: p.tilt, spin: t * 0.8 }));
          if (p.ring) ring = bodies.length - 1;
          labels.push({ text: p.name, pos, up: Math.round(p.r * 12) + 6, body: bodies.length - 1 });
        }
        return {
          cam: { dist: 15.5, az: 0.45 + t * 0.008, el: 0.62, target: [0, 0, 0], fov: 38 },
          ambient: 0.28,
          light: [0, 0, 0],
          bodies, glow: 0, ring, labels,
          orbits: PLANETS.map((p) => p.orbit)
        };
      }
    },
    // יום ולילה: כדור הארץ מסתובב, ישראל עוברת מאור לחושך
    day: {
      build(t) {
        const spin = t * (TAU / 16) - 3.58;
        const tilt = 23.4 * DEG;
        const light = [-52, 6, 30];
        const dir = surfacePoint(31.5, 35, spin, tilt);
        const lightDir = norm(light);
        const isDay = dot(dir, lightDir) > 0;
        return {
          cam: { dist: 3.1, az: 0, el: 0.14, target: [0, 0, 0], fov: 40 },
          light,
          bodies: [body([0, 0, 0], 1, CELL.earth, { spin, tilt })],
          liveCaption: isDay ? 'בישראל עכשיו יום ☀️' : 'בישראל עכשיו לילה 🌙',
          labels: [
            { text: 'ישראל', pos: dir, surface: true, up: 9, marker: true },
            { text: '☀️ אור השמש מגיע מכאן', screen: [0.2, 0.24] },
            { text: '🌙 צד הלילה', screen: [0.84, 0.5] }
          ]
        };
      }
    },
    // שנה: הקפה אחת סביב השמש
    year: {
      build(t) {
        const YEAR = 16;
        const a = (t / YEAR) * TAU + 0.8;
        const pos = orbitAt(3.1, a);
        const dayOfYear = Math.floor(((t / YEAR) % 1) * 365) + 1;
        return {
          cam: { dist: 8.6, az: 0.5, el: 0.6, target: [0, 0, 0], fov: 40 },
          light: [0, 0, 0],
          bodies: [
            body([0, 0, 0], 0.8, CELL.sun, { spin: t * 0.05, emissive: true }),
            body(pos, 0.3, CELL.earth, { tilt: 23.4 * DEG, spin: t * 3 })
          ],
          glow: 0,
          orbits: [3.1],
          liveCaption: `יום ${dayOfYear} מתוך 365`,
          labels: [
            { text: 'השמש', pos: [0, 0.8, 0], up: 8, body: 0 },
            { text: 'כדור הארץ', pos, up: 22, body: 1 }
          ]
        };
      }
    },
    // הירח: חצי מואר תמיד, והצורה שאנחנו רואים משתנה
    moon: {
      phase: true,
      note: 'המרחק בתמונה הוקטן: בפועל הירח רחוק פי 30 מרוחב כדור הארץ',
      build(t) {
        const MONTH = 18;
        const a = (t / MONTH) * TAU;
        const moon = orbitAt(3.2, a + 0.5);
        const light = [70, 3, 18];
        return {
          cam: { dist: 8, az: 0.2, el: 0.52, target: [0, 0, 0], fov: 38 },
          light,
          bodies: [
            body([0, 0, 0], 0.85, CELL.earth, { tilt: 23.4 * DEG, spin: t * 0.5 }),
            body(moon, 0.23, CELL.rock, { tint: [0.92, 0.91, 0.88], spin: a })
          ],
          orbits: [3.2],
          moonPos: moon,
          lightDir: norm(light),
          labels: [
            { text: 'כדור הארץ', pos: [0, 0.85, 0], up: 12, body: 0 },
            { text: 'הירח', pos: moon, up: 12, body: 1 },
            { text: '☀️ אור השמש מגיע מכאן', screen: [0.8, 0.62] }
          ]
        };
      }
    },
    jupiter: {
      caption: () => 'צדק וכדור הארץ, בגודל אמיתי זה לעומת זה',
      build(t) {
        const earth = body([1.42, 0.25, 0.55], 1 / 11, CELL.earth, { tilt: 23.4 * DEG, spin: t * 0.5 });
        return {
          cam: { dist: 3.8, az: 0.25, el: 0.08, target: [0.22, 0, 0], fov: 40 },
          light: [45, 12, 60],
          bodies: [body([0, 0, 0], 1, CELL.jupiter, { spin: t * 0.22, tilt: 3 * DEG }), earth],
          labels: [
            { text: 'צדק', pos: [0, 1, 0], big: true, up: 8, body: 0 },
            { text: 'כדור הארץ', pos: earth.pos, up: 20, body: 1 }
          ]
        };
      }
    },
    saturn: {
      caption: () => 'שבתאי וכדור הארץ, בגודל אמיתי זה לעומת זה',
      build(t) {
        const earth = body([2.7, 0.75, 0.2], 0.85 / 9.45, CELL.earth, { tilt: 23.4 * DEG, spin: t * 0.5 });
        return {
          cam: { dist: 6.3, az: 0.35 + t * 0.018, el: 0.3, target: [0.2, 0.05, 0], fov: 40 },
          light: [50, 18, 40],
          bodies: [body([0, 0, 0], 0.85, CELL.saturn, { spin: t * 0.25, tilt: 26.7 * DEG }), earth],
          ring: 0,
          labels: [
            { text: 'שבתאי', pos: [0, 0.85, 0], big: true, up: 8, body: 0 },
            { text: 'כדור הארץ', pos: earth.pos, up: 16, body: 1 }
          ]
        };
      }
    }
  };

  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function norm(a) { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  // מחזיר null אם המכשיר לא תומך, ואז הנושא מוצג בלי התמונה
  A.mountSpace = function mountSpace(host) {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'low-power' });
    if (!gl) return null;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return null;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, bakeAtlas());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const U = {};
    ['uRes', 'uCam', 'uRight', 'uUp', 'uFwd', 'uLight', 'uScale', 'uTime', 'uAmbient', 'uN', 'uON', 'uRing', 'uGlow', 'uB', 'uM', 'uT', 'uOrb', 'uTex']
      .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1i(U.uTex, 0);

    // שכבת הכיתובים
    const labelLayer = h('div', { 'aria-hidden': 'true' });
    const caption = h('span');
    const captionBox = h('div', { class: 'sp-caption', role: 'status' }, caption);
    const note = h('div', { class: 'sp-note' });
    const phaseCanvas = h('canvas', { width: 112, height: 112 });
    const phaseText = h('div');
    const phaseBox = h('div', { class: 'sp-phase', hidden: true }, 'מכדור הארץ הוא נראה כך:', phaseCanvas, phaseText);
    const stage = h('div', { class: 'sp-stage' }, canvas, labelLayer, note, phaseBox, captionBox);
    host.append(stage);
    canvas.setAttribute('aria-label', 'תמונת תלת ממד של מערכת השמש');

    const labelEls = [];
    const labelEl = (i) => {
      if (!labelEls[i]) {
        labelEls[i] = h('div', { class: 'sp-label' });
        labelLayer.append(labelEls[i]);
      }
      return labelEls[i];
    };

    let W = 0, H = 0;
    const size = () => {
      const r = stage.getBoundingClientRect();
      if (!r.width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, A.lowPower ? 1 : 1.5);
      const w = Math.round(r.width * dpr), ht = Math.round(r.height * dpr);
      if (w !== canvas.width || ht !== canvas.height) {
        canvas.width = w;
        canvas.height = ht;
        gl.viewport(0, 0, w, ht);
      }
      W = r.width;
      H = r.height;
    };

    let current = null, sceneT = 0, yaw = 0, pitch = 0;
    let frame = 0, last = 0, visible = true, alive = true;
    const still = matchMedia('(prefers-reduced-motion: reduce)');

    function drawPhase(scene) {
      const toMoon = norm(scene.moonPos);
      // הזווית בין השמש לירח, כפי שרואים מכדור הארץ
      const cosE = dot(toMoon, scene.lightDir);
      const lit = (1 - cosE) / 2;
      const waxing = cross(scene.lightDir, toMoon)[1] > 0;
      const c = phaseCanvas.getContext('2d');
      const R = 52, cx = 56, cy = 56;
      c.clearRect(0, 0, 112, 112);
      c.fillStyle = '#1B2036';
      c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
      c.fillStyle = '#EDEBE2';
      c.beginPath();
      const side = waxing ? 1 : -1;
      c.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2, side < 0);
      const k = (lit - 0.5) * 2;
      c.ellipse(cx, cy, Math.abs(k) * R, R, 0, Math.PI / 2, -Math.PI / 2, (k > 0) !== (side > 0));
      c.closePath();
      c.fill();
      let name = 'חצי ירח';
      if (lit > 0.93) name = 'ירח מלא 🌕';
      else if (lit < 0.07) name = 'מולד: כמעט לא רואים';
      else if (lit < 0.4) name = 'סהר דק';
      else if (lit > 0.6) name = 'כמעט מלא';
      if (phaseText.textContent !== A.plainText(name)) phaseText.textContent = A.plainText(name);
    }

    let framesDrawn = 0;
    function render() {
      if (!current || !W) return;
      framesDrawn++;
      const scene = current.build(still.matches ? 6 : sceneT);

      const cam = scene.cam;
      const el = Math.max(-1.35, Math.min(1.35, cam.el + pitch));
      const az = cam.az + yaw;
      const pos = [
        cam.target[0] + cam.dist * Math.cos(el) * Math.sin(az),
        cam.target[1] + cam.dist * Math.sin(el),
        cam.target[2] + cam.dist * Math.cos(el) * Math.cos(az)
      ];
      const fwd = norm(sub(cam.target, pos));
      const right = norm(cross(fwd, [0, 1, 0]));
      const up = cross(right, fwd);
      // במסך צר מתרחקים, כדי שהכול ייכנס גם לרוחב
      const aspect = W / H;
      const scale = Math.tan((cam.fov * DEG) / 2) * Math.max(1, 1.25 / aspect);

      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform3fv(U.uCam, pos);
      gl.uniform3fv(U.uRight, right);
      gl.uniform3fv(U.uUp, up);
      gl.uniform3fv(U.uFwd, fwd);
      gl.uniform3fv(U.uLight, scene.light);
      gl.uniform1f(U.uScale, scale);
      gl.uniform1f(U.uTime, sceneT);
      gl.uniform1f(U.uAmbient, scene.ambient === undefined ? 0.035 : scene.ambient);
      gl.uniform1i(U.uN, scene.bodies.length);
      gl.uniform1i(U.uRing, scene.ring === undefined ? -1 : scene.ring);
      gl.uniform1i(U.uGlow, scene.glow === undefined ? -1 : scene.glow);
      const B = new Float32Array(MAX_BODIES * 4), M = new Float32Array(MAX_BODIES * 4), T = new Float32Array(MAX_BODIES * 3);
      scene.bodies.forEach((b, i) => {
        B.set([b.pos[0], b.pos[1], b.pos[2], b.r], i * 4);
        M.set([b.cell, b.spin, b.tilt, b.emissive ? 1 : 0], i * 4);
        T.set(b.tint, i * 3);
      });
      gl.uniform4fv(U.uB, B);
      gl.uniform4fv(U.uM, M);
      gl.uniform3fv(U.uT, T);
      const orbits = scene.orbits || [];
      gl.uniform1i(U.uON, orbits.length);
      const O = new Float32Array(8);
      O.set(orbits);
      gl.uniform1fv(U.uOrb, O);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // כיתובים שעוקבים אחרי הגופים
      const project = (p) => {
        const v = sub(p, pos);
        const z = dot(v, fwd);
        if (z <= 0.01) return null;
        const f = (H / 2) / (z * scale);
        return [W / 2 + dot(v, right) * f, H / 2 - dot(v, up) * f, z];
      };
      const hidden = (p, self) => scene.bodies.some((b, i) => {
        if (i === self) return false;
        const oc = sub(pos, b.pos);
        const d = norm(sub(p, pos));
        const bb = dot(oc, d);
        const disc = bb * bb - dot(oc, oc) + b.r * b.r;
        if (disc < 0) return false;
        const t = -bb - Math.sqrt(disc);
        return t > 0 && t < Math.hypot(...sub(p, pos)) - 0.02;
      });

      scene.labels.forEach((l, i) => {
        const el2 = labelEl(i);
        let x, y, show = true;
        if (l.screen) {
          x = l.screen[0] * W;
          y = l.screen[1] * H;
        } else {
          const q = project(l.pos);
          if (!q) show = false;
          else {
            x = q[0];
            y = q[1] - (l.up || 10);
            if (l.surface) show = dot(norm(l.pos), norm(sub(pos, l.pos))) > 0.12;
            else if (hidden(l.pos, l.body)) show = false;
          }
        }
        el2.hidden = !show;
        if (!show) return;
        const labelText = A.plainText(l.text);
        if (el2.textContent !== labelText) el2.textContent = labelText;
        el2.classList.toggle('big', !!l.big);
        el2.classList.toggle('pin', !!l.marker);
        el2.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      });
      for (let i = scene.labels.length; i < labelEls.length; i++) labelEls[i].hidden = true;

      const text = A.plainText(scene.liveCaption || (current.caption ? current.caption() : ''));
      if (caption.textContent !== text) caption.textContent = text;
      captionBox.hidden = !text;
      if (current.phase) drawPhase(scene);
    }

    function tick(now) {
      frame = 0;
      if (!alive) return;
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
      last = now;
      if (!still.matches) sceneT += dt;
      size();
      render();
      schedule();
    }
    function schedule() {
      if (!frame && visible && alive && !still.matches) frame = requestAnimationFrame(tick);
      if (!frame) last = 0;
    }
    const once = () => { size(); render(); };

    const io = new IntersectionObserver((e) => {
      visible = e[e.length - 1].isIntersecting;
      schedule();
    }, { rootMargin: '60px' });
    io.observe(stage);
    const ro = new ResizeObserver(once);
    ro.observe(stage);

    // גרירה מסובבת את המבט סביב הסצנה
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

    const api = {
      probe() {
        try {
          size();
          render();
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
      setScene(id) {
        const next = SCENES[id];
        if (!next || next === current) { schedule(); return; }
        canvas.classList.add('fading');
        const apply = () => {
          if (!alive) return;
          current = next;
          sceneT = 0;
          yaw = 0;
          pitch = 0;
          note.textContent = next.note || '';
          phaseBox.hidden = !next.phase;
          labelEls.forEach((l) => { l.hidden = true; });
          once();
          canvas.classList.remove('fading');
          schedule();
        };
        if (current) setTimeout(apply, 260);
        else apply();
      },
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
    return api;
  };
})();
