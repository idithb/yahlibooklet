// דף המחברת: הקלדה, כתיבה ביד (עט או אצבע) והקלטה. אפשר להקליט ובמקביל להקליד או לכתוב. ההורים רואים את אותו דף לקריאה בלבד.
(function () {
  const A = window.App;
  const h = A.h;

  const MIN_HEIGHT = 880;
  const COLORS = ['#1F2A37', '#2456C8', '#C81E1E', '#157A47'];
  const PEN_WIDTH = 3.2;
  const ERASE_RADIUS = 16;

  const newPage = (subjectId, topic = '') => {
    const now = Date.now();
    return { id: A.newId(), subjectId, date: A.dateKey(), topic, text: '', strokes: [], createdAt: now, updatedAt: now };
  };

  A.screens.page = async (root, params) => {
    const readOnly = !!params.readOnly;
    const subject = A.subjectById(params.subjectId);
    if (!subject) { A.back(); return undefined; }

    const pages = (await A.db.byIndex('pages', 'subjectId', subject.id)).sort((a, b) => a.createdAt - b.createdAt);
    const persisted = new Set(pages.map((p) => p.id));
    let idx;
    if (readOnly) idx = pages.length - 1;
    else {
      // כל פתיחה מתחילה בדף חדש ונקי עם התאריך של היום. הוא נשמר רק כשכותבים בו
      pages.push(newPage(subject.id, ''));
      idx = pages.length - 1;
    }

    const visit = readOnly ? null : A.visit('subject', subject.name, { subjectId: subject.id, from: params.from });
    const noted = new Set();
    const note = (kind) => {
      if (readOnly || noted.has(kind)) return;
      noted.add(kind);
      A.log('note', subject.name, { subjectId: subject.id, kind });
    };

    let mode = 'type';
    let color = COLORS[0];
    let eraser = false;
    let undoStack = [];
    let audioRows = [];
    let audioUrls = [];
    const current = () => pages[idx];

    // שמירה אוטומטית
    let saveTimer = null;
    const saveNote = h('span', { class: 'save-note', role: 'status' });
    const pageEmpty = (p) => !p.text.trim() && !p.strokes.length;
    const saveNow = async (force) => {
      clearTimeout(saveTimer);
      saveTimer = null;
      const p = current();
      if (!p) return;
      if (pageEmpty(p) && !persisted.has(p.id) && !force) return;
      p.updatedAt = Date.now();
      persisted.add(p.id);
      await A.db.put('pages', p);
      saveNote.textContent = 'נשמר ✓';
    };
    const scheduleSave = () => {
      saveNote.textContent = 'שומר…';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveNow().catch(console.error), 500);
    };

    // נייר
    const textarea = h('textarea', {
      dir: 'auto',
      readOnly,
      'aria-label': 'הטקסט של הדף',
      placeholder: readOnly ? '' : 'אפשר להתחיל להקליד כאן…',
      oninput: () => { current().text = textarea.value; note('type'); layout(); scheduleSave(); }
    });
    const canvas = h('canvas', { 'aria-label': 'משטח כתיבה ביד' });
    const paperKind = A.subjectPaper(subject);
    const LINE = paperKind === 'grid' ? 32 : 40;
    if (paperKind === 'grid') textarea.dir = 'ltr';
    const paper = h('div', { class: `paper ${paperKind}` }, textarea, canvas);
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0;

    const strokePath = (s) => {
      const pts = s.pts;
      ctx.strokeStyle = s.c;
      ctx.lineWidth = s.w;
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      if (pts.length === 2) ctx.lineTo(pts[0] + 0.0005, pts[1]);
      for (let i = 2; i + 3 < pts.length; i += 2) {
        ctx.quadraticCurveTo(pts[i], pts[i + 1], (pts[i] + pts[i + 2]) / 2, (pts[i + 1] + pts[i + 3]) / 2);
      }
      if (pts.length > 2) ctx.lineTo(pts[pts.length - 2], pts[pts.length - 1]);
      ctx.stroke();
    };
    const redraw = () => {
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr * W, 0, 0, dpr * W, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      current().strokes.forEach(strokePath);
    };
    function layout() {
      const dpr = window.devicePixelRatio || 1;
      const w = paper.clientWidth;
      if (!w) return;
      let maxY = 0;
      for (const s of current().strokes) {
        for (let i = 1; i < s.pts.length; i += 2) if (s.pts[i] > maxY) maxY = s.pts[i];
      }
      // מודדים את הטקסט בלי לשנות את גובה הדף, כדי שהגלילה לא תקפוץ
      textarea.style.height = '1px';
      const textH = textarea.scrollHeight + 80;
      textarea.style.height = '';
      const height = Math.ceil(Math.max(MIN_HEIGHT, textH, maxY * w + 240) / LINE) * LINE;
      paper.style.height = `${height}px`;
      if (w !== W || height !== H) {
        W = w; H = height;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${height}px`;
        redraw();
      }
    }

    // ציור
    const pointers = new Map();
    let stroke = null;
    let twoFinger = null;
    let penSeen = false;

    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return [(e.clientX - r.left) / W, (e.clientY - r.top) / W];
    };
    const pushUndo = () => {
      undoStack.push(current().strokes.slice());
      if (undoStack.length > 40) undoStack.shift();
      renderPenBar();
    };
    const eraseAt = (x, y) => {
      const rad = ERASE_RADIUS / W;
      const strokes = current().strokes;
      const keep = strokes.filter((s) => {
        for (let i = 0; i + 1 < s.pts.length; i += 2) {
          if (Math.hypot(s.pts[i] - x, s.pts[i + 1] - y) < rad) return false;
        }
        return true;
      });
      if (keep.length !== strokes.length) {
        current().strokes = keep;
        redraw();
        scheduleSave();
      }
    };
    const cancelStroke = () => {
      if (stroke) {
        stroke = null;
        undoStack.pop();
        redraw();
        renderPenBar();
      }
    };

    canvas.addEventListener('pointerdown', (e) => {
      if (mode !== 'write' || readOnly) return;
      if (e.pointerType === 'pen') penSeen = true;
      if (e.pointerType === 'touch' && penSeen) { pointers.set(e.pointerId, [e.clientX, e.clientY]); startTwoFinger(); return; }
      e.preventDefault();
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size >= 2) { cancelStroke(); startTwoFinger(); return; }
      canvas.setPointerCapture(e.pointerId);
      const [x, y] = pos(e);
      pushUndo();
      if (eraser) { stroke = { eraser: true }; eraseAt(x, y); return; }
      stroke = { c: color, w: PEN_WIDTH / W, pts: [x, y], id: e.pointerId };
      current().strokes.push(stroke);
      ctx.strokeStyle = stroke.c;
      ctx.lineWidth = stroke.w;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.0005, y);
      ctx.stroke();
    });
    function startTwoFinger() {
      const ys = [...pointers.values()].map((p) => p[1]);
      twoFinger = { y: ys.reduce((a, b) => a + b, 0) / ys.length };
    }
    canvas.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (twoFinger) {
        const ys = [...pointers.values()].map((p) => p[1]);
        const y = ys.reduce((a, b) => a + b, 0) / ys.length;
        window.scrollBy(0, twoFinger.y - y);
        twoFinger.y = y;
        return;
      }
      if (!stroke) return;
      const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of events.length ? events : [e]) {
        const [x, y] = pos(ev);
        if (stroke.eraser) { eraseAt(x, y); continue; }
        const pts = stroke.pts;
        ctx.beginPath();
        ctx.moveTo(pts[pts.length - 2], pts[pts.length - 1]);
        ctx.lineTo(x, y);
        ctx.stroke();
        pts.push(x, y);
      }
    });
    const endPointer = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (twoFinger) {
        if (pointers.size === 0) twoFinger = null;
        return;
      }
      if (!stroke) return;
      const finished = stroke;
      stroke = null;
      if (!finished.eraser) {
        delete finished.id;
        finished.pts = finished.pts.map((v) => Math.round(v * 1e4) / 1e4);
        note('write');
      }
      redraw();
      layout();
      scheduleSave();
      renderPenBar();
    };
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);

    const ro = new ResizeObserver(() => layout());
    ro.observe(paper);

    // שורת התאריך: חיצים לדפדוף, התאריך, וליד התאריך אפשר לכתוב נושא
    const dateLabel = h('b', { class: 'date-label' });
    const prevBtn = h('button', { class: 'btn sm arrow', 'aria-label': 'דף קודם', onclick: () => moveTo(idx - 1) }, '→');
    const nextBtn = h('button', { class: 'btn sm arrow', 'aria-label': 'דף הבא', onclick: () => moveTo(idx + 1) }, '←');

    // הנושא של הדף משמש כחוצץ במחברת
    const topicList = h('datalist', { id: 'page-topics' });
    const savedPages = () => pages.filter((p) => persisted.has(p.id) && (!pageEmpty(p) || p.hasAudio));
    const topicNames = () => [...new Set(savedPages().map((p) => (p.topic || '').trim()).filter(Boolean))];
    const topicInput = h('input', {
      class: 'topic-input',
      id: 'page-topic',
      list: 'page-topics',
      autocomplete: 'off',
      maxLength: 40,
      readOnly,
      'aria-label': 'נושא הדף',
      placeholder: readOnly ? '' : 'נושא (לא חובה)',
      oninput: () => { current().topic = topicInput.value; scheduleSave(); }
    });
    const dateRow = h('div', { class: 'date-row' },
      prevBtn,
      h('div', { class: 'date-box' }, dateLabel, topicInput, topicList),
      nextBtn);

    const listBtn = h('button', { class: 'btn sm', onclick: () => openList() });
    function openList() {
      const saved = savedPages().slice().reverse();
      if (!saved.length) {
        A.toast('עדיין אין דפים קודמים במחברת הזאת');
        return;
      }
      const names = topicNames();
      const hasUntagged = names.length > 0 && saved.some((p) => !(p.topic || '').trim());
      let filter = null;
      const tabs = h('div', { class: 'tabs-strip', role: 'tablist', hidden: !names.length });
      const list = h('div', { class: 'page-list' });
      const preview = (p) => {
        const line = p.text.trim().split('\n')[0];
        if (line) return line;
        if (p.strokes.length) return '✏️ כתיבה ביד';
        return '🎤 הקלטה';
      };
      const draw = () => {
        const tab = (label, value) => h('button', {
          class: filter === value ? 'on' : '',
          role: 'tab',
          onclick: () => { filter = value; draw(); }
        }, label);
        tabs.replaceChildren(
          tab('הכול', null),
          ...names.map((n) => tab(n, n)),
          ...(hasUntagged ? [tab('בלי נושא', '')] : [])
        );
        const shown = filter === null ? saved : saved.filter((p) => (p.topic || '').trim() === filter);
        list.replaceChildren(...shown.map((p) => h('button', {
          class: 'page-row',
          onclick: (e) => {
            e.currentTarget.closest('.overlay').closeModal();
            moveTo(pages.indexOf(p));
          }
        },
          h('b', null, A.fmtDate(p.date), (p.topic || '').trim() && h('span', { class: 'tag' }, p.topic.trim())),
          h('span', { class: 'pv' }, preview(p))
        )));
      };
      draw();
      A.modal({
        title: `📂 הדפים של ${subject.name}`,
        body: h('div', { class: 'stack' }, tabs, list),
        actions: [{ label: 'סגירה' }]
      });
    }

    // הכלים: כפתור צף בצד, כדי שלמעלה יהיה רק הדף
    const allowed = readOnly ? { type: false, write: false, record: false } : A.state.settings.tools;
    const penModes = ['type', 'write'].filter((m) => allowed[m]);
    const MODE_ICON = { type: '⌨️', write: '✏️' };

    const penBar = h('div', { class: 'pen-bar float', hidden: true });
    function renderPenBar() {
      if (readOnly) return;
      penBar.replaceChildren(
        ...COLORS.map((c) => h('button', {
          class: `swatch ${!eraser && c === color ? 'on' : ''}`,
          style: { background: c },
          'aria-label': 'צבע עט',
          onclick: () => { color = c; eraser = false; renderPenBar(); }
        })),
        h('button', { class: `btn sm ${eraser ? 'on' : ''}`, 'aria-label': 'מחק', title: 'מחק', onclick: () => { eraser = !eraser; renderPenBar(); } }, '🧽'),
        h('button', {
          class: 'btn sm', disabled: !undoStack.length, 'aria-label': 'ביטול', title: 'ביטול',
          onclick: () => {
            if (!undoStack.length) return;
            current().strokes = undoStack.pop();
            redraw(); layout(); scheduleSave(); renderPenBar();
          }
        }, '↩️')
      );
    }

    const fabBtn = h('button', { class: 'fab', 'aria-expanded': 'false', 'aria-label': 'כלים', onclick: () => toggleMenu() });
    const fabMenu = h('div', { class: 'fab-menu', hidden: true });
    const recPill = h('button', { class: 'rec-pill', hidden: true, 'aria-label': 'עצירת ההקלטה', onclick: () => stopRecording() });
    const fab = readOnly || (penModes.length < 2 && !allowed.record) ? null
      : h('div', { class: 'fab-wrap' }, fabMenu, h('div', { class: 'fab-row' }, fabBtn, recPill));
    const menuItem = (icon, label, on, onclick, cls = '') => h('button', { class: `fab-item ${on ? 'on' : ''} ${cls}`, onclick }, h('span', { class: 'ic', 'aria-hidden': 'true' }, icon), label);
    function drawFab() {
      if (!fab) return;
      fabBtn.classList.toggle('rec', recActive);
      fabBtn.replaceChildren(h('span', { 'aria-hidden': 'true' }, fabMenu.hidden ? (penModes.length ? MODE_ICON[mode] || '✏️' : '🎤') : '✕'));
      fabMenu.replaceChildren(
        ...penModes.map((m) => menuItem(MODE_ICON[m], m === 'type' ? 'הקלדה' : 'כתיבה ביד', mode === m, () => { setMode(m); closeMenu(); })),
        allowed.record && (recActive
          ? menuItem('⏹️', 'לעצור את ההקלטה', false, () => { stopRecording(); closeMenu(); }, 'stop')
          : menuItem('🔴', 'להקליט את השיעור', false, () => { closeMenu(); startRecording(); }, 'record'))
      );
    }
    function toggleMenu() {
      // רק הקלטה: הכפתור עצמו מתחיל ועוצר
      if (!penModes.length) { if (recActive) stopRecording(); else startRecording(); return; }
      fabMenu.hidden = !fabMenu.hidden;
      fabBtn.setAttribute('aria-expanded', fabMenu.hidden ? 'false' : 'true');
      drawFab();
    }
    function closeMenu() {
      fabMenu.hidden = true;
      fabBtn.setAttribute('aria-expanded', 'false');
      drawFab();
    }

    // הקלטה: הקול נשמר, ובמכשירים שמאפשרים גם המילים נשמרות ליד ההקלטה (לא בתוך הדף, כדי לא להפריע להקלדה)
    let speech = null;

    let heard = { committed: '', now: '' };
    const transcript = () => (heard.committed + heard.now).trim();
    function startSpeech() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR || readOnly) return;
      if (speech) stopSpeech();
      // מקשיבים למשפט אחד בכל פעם ומתחילים מחדש. בהקשבה רצופה, באנדרואיד המילים חוזרות כמה פעמים
      let lastSentence = '';
      let sentence = '';
      let interim = '';
      const sr = new SR();
      sr.lang = 'he-IL';
      sr.continuous = false;
      sr.interimResults = true;
      sr.maxAlternatives = 1;
      sr.onresult = (ev) => {
        interim = '';
        for (let i = 0; i < ev.results.length; i++) {
          const t = ev.results[i][0].transcript.trim();
          if (t) wordsHeard = true;
          if (ev.results[i].isFinal) sentence = t;
          else interim = t;
        }
        heard.now = sentence || interim;
      };
      sr.onerror = (ev) => {
        if (ev.error === 'no-speech' || ev.error === 'aborted') return;
        // המיקרופון תפוס בגלל שמירת הקול: הקול חשוב יותר, אז מוותרים על המילים
        if (ev.error === 'audio-capture' && recorder) setMicConflict();
        speech = null;
      };
      sr.onend = () => {
        if (sentence && sentence !== lastSentence) {
          heard.committed += sentence + ' ';
          lastSentence = sentence;
        }
        sentence = '';
        interim = '';
        heard.now = '';
        if (speech === sr) { try { sr.start(); } catch (e) { /* כבר פועל */ } }
      };
      speech = sr;
      try { sr.start(); } catch (e) { speech = null; }
    }
    function stopSpeech() {
      const sr = speech;
      speech = null;
      if (sr) { try { sr.stop(); } catch (e) { /* כבר נעצר */ } }
    }
    const recList = h('div', { class: 'rec-list' });
    let recorder = null;
    let recStart = 0;
    let recTick = null;
    let recActive = false;
    let wordsHeard = false;
    // אם במכשיר הזה אי אפשר לשמור קול ולכתוב מילים בבת אחת, המחברת זוכרת ומעדיפה את המילים
    const conflictKey = 'machberet-mic-conflict';
    const micConflict = () => { try { return localStorage.getItem(conflictKey) === '1'; } catch (e) { return false; } };
    const setMicConflict = () => { try { localStorage.setItem(conflictKey, '1'); } catch (e) { /* בלי זיכרון */ } };

    const setRecLabel = () => {
      if (!fab) return;
      recPill.hidden = !recActive;
      if (recActive) {
        const sec = Math.floor((Date.now() - recStart) / 1000);
        const mm = String(Math.floor(sec / 60)).padStart(2, '0');
        const ss = String(sec % 60).padStart(2, '0');
        recPill.replaceChildren(h('i', { class: 'rec-dot', 'aria-hidden': 'true' }), A.ltr(`${mm}:${ss}`), ' ⏹️');
      }
      drawFab();
    };

    // שמירת הקלטה: הקול (אם יש) והמילים ששמענו
    async function saveRecording(page, blob, dur, ts, text) {
      if (!blob && !text) return;
      const row = { id: A.newId(), pageId: page.id, subjectId: page.subjectId, blob: blob || null, mime: blob ? blob.type : '', dur, ts, text: text || '' };
      persisted.add(page.id);
      page.hasAudio = true;
      await A.db.put('pages', page);
      await A.db.put('audio', row);
      note('record');
      if (mounted && current().id === page.id) {
        saveNote.textContent = 'נשמר ✓';
        await loadAudio();
      }
    }

    // הקלטה: קודם הקול (הכי חשוב), ואז המילים מצטרפות אם המכשיר מאפשר
    async function startRecording() {
      const page = current();
      const canWords = A.speechSupported() && !readOnly;
      const canAudio = !!(navigator.mediaDevices && window.MediaRecorder);
      if (!canWords && !canAudio) {
        A.modal({ title: 'אין אפשרות להקליט', body: 'הדפדפן הזה לא תומך בהקלטה. כדאי לפתוח את האפליקציה מהקישור המאובטח (https).', actions: [{ label: 'הבנתי', class: 'primary' }] });
        return;
      }
      recActive = true;
      wordsHeard = false;
      heard = { committed: '', now: '' };
      recStart = Date.now();
      recTick = setInterval(setRecLabel, 500);
      setRecLabel();
      if (canAudio) {
        const ok = await startAudio(page, canWords);
        if (!ok && !canWords) { recActive = false; clearInterval(recTick); setRecLabel(); return; }
      }
      if (!recActive) return;
      if (canWords && (!canAudio || !micConflict())) {
        if (canAudio) await new Promise((r) => setTimeout(r, 700));
        if (recActive) startSpeech();
      }
      A.toast('מקליטים 🎤 אפשר להמשיך לכתוב');
    }

    async function startAudio(page, canWords) {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        if (!canWords) A.modal({ title: 'אין גישה למיקרופון', body: 'צריך לאשר למחברת להשתמש במיקרופון, בחלון שהדפדפן מציג או בהגדרות המכשיר.', actions: [{ label: 'הבנתי', class: 'primary' }] });
        return false;
      }
      if (!recActive) { stream.getTracks().forEach((t) => t.stop()); return false; }
      // מד עוצמה: אם הקול שנשמר שקט לגמרי, המיקרופון היה תפוס בשביל המילים
      let peak = 0;
      let meter = null;
      let actx = null;
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        const an = actx.createAnalyser();
        an.fftSize = 512;
        actx.createMediaStreamSource(stream).connect(an);
        const buf = new Uint8Array(an.fftSize);
        meter = setInterval(() => {
          an.getByteTimeDomainData(buf);
          for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
        }, 250);
      } catch (e) { peak = 128; }
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks = [];
      const started = Date.now();
      rec.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(meter);
        if (actx) actx.close().catch(() => {});
        let blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        // הקול יצא שקט כי המילים תפסו את המיקרופון: שומרים את המילים, ובפעם הבאה רק קול
        if (rec.words && peak < 3) { blob = null; setMicConflict(); }
        await saveRecording(page, blob, Date.now() - started, started, rec.words || '');
      };
      rec.start();
      recorder = rec;
      return true;
    }
    function stopRecording() {
      if (!recActive) return;
      recActive = false;
      clearInterval(recTick);
      const words = wordsHeard ? transcript() : '';
      stopSpeech();
      if (recorder) { recorder.words = words; recorder.stop(); recorder = null; }
      else if (words) saveRecording(current(), null, Date.now() - recStart, recStart, words).catch(console.error);
      setRecLabel();
      A.toast('ההקלטה נשמרה ✓');
    }

    async function loadAudio() {
      audioUrls.forEach((u) => URL.revokeObjectURL(u));
      audioUrls = [];
      audioRows = (await A.db.byIndex('audio', 'pageId', current().id)).sort((a, b) => a.ts - b.ts);
      recList.replaceChildren(...audioRows.map((row, i) => {
        const url = row.blob ? URL.createObjectURL(row.blob) : null;
        if (url) audioUrls.push(url);
        return h('div', { class: 'rec-item' },
          h('b', null, `🎧 הקלטה ${i + 1}`),
          url && h('audio', { controls: true, src: url, preload: 'metadata' }),
          row.text && h('p', { class: 'rec-text' }, row.text),
          row.text && !readOnly && allowed.type && h('button', {
            class: 'btn sm',
            onclick: () => {
              const p = current();
              p.text = (p.text.trimEnd() ? p.text.trimEnd() + '\n' : '') + row.text;
              textarea.value = p.text;
              note('type'); layout(); scheduleSave();
              A.toast('המילים נוספו לדף');
            }
          }, '📝 להוסיף לדף'),
          !readOnly && h('button', {
            class: 'btn sm danger',
            'aria-label': `מחיקת הקלטה ${i + 1}`,
            onclick: async () => {
              if (await A.confirm('למחוק את ההקלטה?', 'אי אפשר יהיה לשחזר אותה.', 'למחוק', 'לא', true)) {
                await A.db.del('audio', row.id);
                await loadAudio();
              }
            }
          }, '🗑️')
        );
      }));
    }

    // מעבר בין מצבים ודפים
    function setMode(m, opening) {
      mode = m;
      paper.classList.toggle('writing', m === 'write');
      textarea.readOnly = readOnly || m !== 'type';
      penBar.hidden = m !== 'write';
      if (m === 'write') renderPenBar();
      drawFab();
      if (m === 'type' && !readOnly && !opening) textarea.focus({ preventScroll: true });
    }

    async function showPage() {
      const p = current();
      undoStack = [];
      textarea.value = p ? p.text : '';
      prevBtn.disabled = idx <= 0;
      nextBtn.disabled = idx >= pages.length - 1;
      dateLabel.textContent = p ? A.fmtDate(p.date) : '';
      topicInput.value = p ? p.topic || '' : '';
      topicList.replaceChildren(...topicNames().map((n) => h('option', { value: n })));
      listBtn.textContent = savedPages().length ? `📂 הדפים (${savedPages().length})` : '📂 הדפים';
      saveNote.textContent = '';
      W = 0; H = 0;
      layout();
      renderPenBar();
      await loadAudio();
    }
    async function moveTo(i) {
      if (i < 0 || i >= pages.length) return;
      if (recActive) stopRecording();
      if (speech) stopSpeech();
      await saveNow();
      idx = i;
      window.scrollTo(0, 0);
      await showPage();
    }
    async function addPage() {
      if (pageEmpty(current()) && !audioRows.length) {
        A.toast('הדף הזה עדיין ריק, אפשר לכתוב בו 🙂');
        return;
      }
      if (recActive) stopRecording();
      if (speech) stopSpeech();
      await saveNow();
      pages.push(newPage(subject.id, ''));
      idx = pages.length - 1;
      window.scrollTo(0, 0);
      await showPage();
      setMode(mode);
    }

    let mounted = true;
    const titleEnd = readOnly ? null : h('div', { class: 'row' }, saveNote);
    if (readOnly && !pages.length) {
      root.append(
        A.topbar({ title: subject.name }),
        h('div', { class: 'page' }, h('div', { class: 'card center' }, 'עדיין אין דפים במחברת הזאת.'))
      );
      return () => { ro.disconnect(); };
    }

    root.append(
      A.topbar({ title: subject.name, end: titleEnd }),
      h('div', { class: `page nb-page ${fab ? 'has-fab' : ''}` },
        dateRow,
        h('div', { class: 'nb-actions' },
          listBtn,
          !readOnly && h('button', { class: 'btn sm', onclick: addPage }, '➕ דף חדש')),
        paper,
        recList
      ),
      penBar,
      fab
    );
    await showPage();
    setMode(readOnly ? 'read' : penModes[0] || 'read', true);
    setRecLabel();

    return () => {
      mounted = false;
      ro.disconnect();
      if (recActive) stopRecording();
      if (speech) stopSpeech();
      saveNow().catch(console.error);
      if (visit) visit.end();
      audioUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  };
})();
