// בדיקת מכשיר: מראה להורה מה המכשיר תומך בו, ומכינה טקסט קצר לשליחה
(function () {
  const A = window.App;
  const h = A.h;

  const ua = navigator.userAgent;
  const device = () => {
    const android = (ua.match(/Android ([\d.]+)/) || [])[1];
    const model = (ua.match(/Android [\d.]+; ([^;)]+)/) || [])[1];
    const chrome = (ua.match(/Chrome\/([\d.]+)/) || [])[1];
    const samsung = (ua.match(/SamsungBrowser\/([\d.]+)/) || [])[1];
    const parts = [];
    if (android) parts.push(`Android ${android}`);
    if (model && model !== 'K') parts.push(model.trim());
    if (samsung) parts.push(`Samsung Internet ${samsung.split('.')[0]}`);
    else if (chrome) parts.push(`Chrome ${chrome.split('.')[0]}`);
    return parts.length ? parts.join(' · ') : ua.slice(0, 80);
  };

  // ציור קטן בבדיקה: משולש ירוק על רקע אדום, ובודקים שהצבעים באמת יצאו
  function glTest() {
    const out = { ok: false };
    try {
      const c = document.createElement('canvas');
      c.width = 16; c.height = 16;
      const gl = c.getContext('webgl');
      if (!gl) { out.error = 'אין WebGL'; return out; }
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      out.renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
      out.highp = !!(hp && hp.precision > 0);
      out.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      const p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, 'precision mediump float;void main(){gl_FragColor=vec4(0.,1.,0.,1.);}'));
      gl.linkProgram(p);
      gl.useProgram(p);
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.clearColor(1, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const px = new Uint8Array(4);
      gl.readPixels(8, 8, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      out.pixel = `${px[0]},${px[1]},${px[2]}`;
      out.ok = px[1] > 200 && px[0] < 50;
      if (!out.ok) out.error = 'הציור יצא בצבע לא נכון';
    } catch (e) { out.error = String(e && e.message || e); }
    return out;
  }

  A.screens.deviceCheck = (root) => {
    const rows = h('div', { class: 'stack' });
    const facts = [];
    const add = (ok, label, value) => {
      facts.push(`${label}: ${value}`);
      rows.append(h('div', { class: 'check-row' },
        h('span', { class: 'check-mark', 'aria-hidden': 'true' }, ok === null ? 'ℹ️' : ok ? '✅' : '❌'),
        h('span', { class: 'body' }, h('b', null, label), h('div', { class: 'small muted' }, value))));
    };

    const proto = location.protocol;
    const fromLink = proto === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
    add(fromLink, 'כתובת', fromLink ? location.host : `${proto} (נפתח מקובץ שהורד, ולא מהקישור)`);
    add(null, 'גרסה', A.VERSION);
    add(null, 'מכשיר', device());
    add(A.isInstalled(), 'פתוחה כאפליקציה', A.isInstalled() ? 'כן, בחלון משלה' : 'לא, בתוך הדפדפן');
    add(!!A.installPrompt || A.isInstalled() ? true : null, 'אפשר להתקין מכאן', A.installPrompt ? 'כן, יש כפתור התקנה' : 'הדפדפן לא הציע התקנה');
    add(!!(navigator.serviceWorker && navigator.serviceWorker.controller), 'עובדת בלי אינטרנט', navigator.serviceWorker && navigator.serviceWorker.controller ? 'כן' : 'עוד לא');
    const g = glTest();
    add(g.ok, 'ציורים (WebGL)', g.ok ? `עובד · ${g.renderer} · דיוק ${g.highp ? 'גבוה' : 'רגיל'} · ${g.maxTex}` : `${g.error || 'לא עובד'}${g.renderer ? ` · ${g.renderer}` : ''}${g.pixel ? ` · ${g.pixel}` : ''}`);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    add(!!SR, 'דיבור למילים', SR ? 'הדפדפן תומך. אפשר לבדוק בכפתור למטה' : 'הדפדפן לא תומך');
    add(!!(navigator.mediaDevices && window.MediaRecorder), 'הקלטת קול', navigator.mediaDevices && window.MediaRecorder ? 'נתמך' : 'לא נתמך');
    add(null, 'מסך', `${window.innerWidth}×${window.innerHeight} · צפיפות ${window.devicePixelRatio || 1} · ${A.lowPower ? 'מצב קל' : 'מצב רגיל'} (${A.benchMs})`);

    // בדיקת דיבור חיה: מאזינים כמה שניות ומדווחים מה קרה
    const speechOut = h('p', { class: 'small' });
    const speechBtn = SR && h('button', {
      class: 'btn sm block',
      onclick: () => {
        speechBtn.disabled = true;
        const steps = [];
        const say = (t) => { steps.push(t); speechOut.textContent = `${steps.join(' ← ')}`; };
        let sr;
        try {
          sr = new SR();
          sr.lang = 'he-IL';
          sr.interimResults = true;
          sr.continuous = false;
        } catch (e) { say(`שגיאה: ${e.message}`); return; }
        let heard = '';
        sr.onstart = () => say('התחיל');
        sr.onaudiostart = () => say('שומע קול');
        sr.onspeechstart = () => say('זיהה דיבור');
        sr.onresult = (ev) => { heard = ev.results[ev.results.length - 1][0].transcript; speechOut.textContent = `${steps.join(' ← ')} ← "${heard}"`; };
        sr.onerror = (ev) => say(`שגיאה: ${ev.error}`);
        sr.onend = () => {
          say('נגמר');
          facts.push(`בדיקת דיבור: ${steps.join(' > ')}${heard ? ` "${heard}"` : ''}`);
          speechBtn.disabled = false;
          drawText();
        };
        say('מתחילים, אפשר להגיד משפט קצר');
        try { sr.start(); } catch (e) { say(`שגיאה: ${e.message}`); speechBtn.disabled = false; }
        setTimeout(() => { try { sr.stop(); } catch (e) { /* כבר נעצר */ } }, 8000);
      }
    }, '🗣️ בדיקת דיבור למילים');

    const text = h('textarea', { class: 'input ltr', rows: 7, readOnly: true, style: { width: '100%', 'font-size': '13px' } });
    const drawText = () => { text.value = facts.join('\n') + `\n${ua}`; };
    drawText();

    root.append(
      A.topbar({ title: 'בדיקת המכשיר' }),
      h('div', { class: 'page stack' },
        h('div', { class: 'card stack' }, rows),
        speechBtn && h('div', { class: 'card stack' }, speechBtn, speechOut),
        h('div', { class: 'card stack' },
          h('b', null, 'פרטים לשליחה'),
          h('p', { class: 'small muted' }, 'אפשר להעתיק את הטקסט הזה ולשלוח אותו, כדי שיהיה אפשר להבין מה לא עובד.'),
          text,
          h('button', {
            class: 'btn primary block',
            onclick: async () => {
              try { await navigator.clipboard.writeText(text.value); A.toast('הפרטים הועתקו'); } catch (e) { text.select(); document.execCommand('copy'); A.toast('הפרטים הועתקו'); }
            }
          }, '📋 העתקת הפרטים'))
      )
    );
  };
})();
