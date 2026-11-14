// כלים בסיסיים: יצירת רכיבים, ניווט, חלונות קופצים ותאריכים.
(function () {
  const A = (window.App = window.App || {});
  A.screens = {};

  A.h = function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const [sk, sv] of Object.entries(v)) el.style.setProperty(sk, sv);
      } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k in el && k !== 'list' && k !== 'form') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    const add = (c) => {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) c.forEach(add);
      else el.append(c.nodeType ? c : document.createTextNode(String(c)));
    };
    kids.forEach(add);
    return el;
  };
  const h = A.h;

  // כיתובים בתמונות התלת ממד: טקסט בלבד, בלי אייקונים
  A.plainText = (text) => String(text).replace(/[\p{Extended_Pictographic}\uFE0F\u200D]+/gu, '').replace(/\s+/g, ' ').trim();

  // אייקונים מצוירים. כולם בסגנון אחד, בתיקייה icons/ui
  const PNG_ICONS = ['learn', 'memory', 'chess', 'notebook'];
  A.iconImg = (name, size) => h('img', {
    class: 'ui-icon',
    src: `icons/ui/${name}.${PNG_ICONS.includes(name) ? 'png' : 'svg'}`,
    alt: '',
    draggable: false,
    style: size ? { width: `${size}px`, height: `${size}px` } : null
  });

  // המקצועות שמורים עם אימוג'י כמזהה, ולכל אחד יש אייקון מצויר
  const SUBJECT_ICONS = {
    '📘': 'subj-book', '📕': 'subj-redbook', '📖': 'subj-openbook', '🔢': 'subj-math', '🔤': 'subj-abc', '🔬': 'subj-microscope',
    '📜': 'subj-scroll', '⚽': 'subj-ball', '🎨': 'subj-palette', '🎵': 'subj-music', '🌍': 'subj-globe', '🏛️': 'subj-history',
    '💻': 'computers', '🤝': 'subj-talk', '✍️': 'subj-pencil', '🎭': 'subj-masks', '🌱': 'subj-sprout', '🧪': 'subj-flask',
    '📐': 'subj-ruler', '🧮': 'subj-abacus', '🗺️': 'subj-map', '🕍': 'subj-synagogue', '🎤': 'subj-mic', '🧩': 'subj-puzzle', '♟️': 'chess'
  };
  A.subjectIcon = (icon, size) => (SUBJECT_ICONS[icon] ? A.iconImg(SUBJECT_ICONS[icon], size) : icon);

  // מכשיר איטי? בדיקה קצרה בפתיחה. בטאבלט איטי התמונות נבנות בפחות פרטים, כדי שייטענו מהר
  A.lowPower = (() => {
    try {
      const t = performance.now();
      let s = 0;
      for (let i = 0; i < 1500000; i++) s += Math.sin(i);
      const ms = performance.now() - t;
      A.benchMs = Math.round(ms) + (s > 1e9 ? 1 : 0);
      const touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
      return touch || ms > 150 || (navigator.deviceMemory && navigator.deviceMemory <= 3) || false;
    } catch (e) { return false; }
  })();

  A.VERSION = '18';

  A.speechSupported = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  A.ltr = (text) => h('span', { class: 'ltr' }, text);

  // תאריכים
  A.dateKey = (d = new Date()) => {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  A.fmtDate = (key) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(y, m - 1, d));
  };
  A.fmtClock = (ts) => new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ts));
  A.fmtDur = (ms) => {
    const min = Math.round((ms || 0) / 60000);
    if (min < 1) return ms > 0 ? 'פחות מדקה' : '0 דק׳';
    if (min < 60) return `${min} דק׳`;
    const hrs = Math.floor(min / 60);
    const rest = min % 60;
    const hTxt = hrs === 1 ? 'שעה' : hrs === 2 ? 'שעתיים' : `${hrs} שעות`;
    return rest ? `${hTxt} ו-${rest} דק׳` : hTxt;
  };
  A.toMinutes = (hhmm) => {
    if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
    const [a, b] = hhmm.split(':').map(Number);
    return a * 60 + b;
  };
  A.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // ניווט: מחסנית מסכים שמחוברת לכפתור "חזרה" של המכשיר
  const stack = [];
  let cleanup = null;
  let renderToken = 0;

  function render() {
    const top = stack[stack.length - 1];
    if (!top) return;
    const token = ++renderToken;
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    const root = document.getElementById('app');
    root.replaceChildren();
    const holder = h('div');
    root.append(holder);
    window.scrollTo(0, 0);
    Promise.resolve(A.screens[top.name](holder, top.params || {}))
      .then((c) => {
        if (typeof c !== 'function') return;
        if (token === renderToken) cleanup = c; else c();
      })
      .catch((e) => {
        console.error(e);
        holder.replaceChildren(h('div', { class: 'page' }, h('div', { class: 'notice' }, 'משהו השתבש. כדאי לסגור ולפתוח שוב את האפליקציה.')));
      });
  }

  A.go = (name, params) => {
    stack.push({ name, params });
    history.pushState({ depth: stack.length }, '');
    render();
  };
  A.replace = (name, params) => {
    stack[stack.length ? stack.length - 1 : 0] = { name, params };
    history.replaceState({ depth: stack.length }, '');
    render();
  };
  A.reset = (name, params) => {
    stack.length = 0;
    stack.push({ name, params });
    history.replaceState({ depth: 1 }, '');
    render();
  };
  A.back = () => {
    if (stack.length > 1) history.back();
    else A.reset('home');
  };
  A.refresh = render;
  window.addEventListener('popstate', () => {
    if (stack.length > 1) {
      stack.pop();
      render();
    }
  });

  // רכיבי מסך
  A.topbar = ({ title, back = true, onBack, end }) =>
    h('header', { class: 'topbar' },
      back && h('button', { class: 'btn back', onclick: onBack || A.back, 'aria-label': 'חזרה' }, '→ חזרה'),
      h('h1', null, title),
      end
    );

  // כותרת של מסכי הילד: ברכה, מנעול הורים, ותפריט המערכת והמחברות למעלה
  A.childHeader = ({ active, title, sub }) => {
    const tab = (id, icon, label) => h('button', {
      class: `kid-tab ${active === id ? 'on' : ''}`,
      'aria-current': active === id ? 'page' : null,
      onclick: () => active !== id && A.reset(id)
    }, A.iconImg(icon), label);
    const lock = h('button', { class: 'kid-lock', 'aria-label': 'אזור הורים', onclick: () => A.go('pin') });
    lock.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.5"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path></svg>';
    return h('header', { class: 'kid-head' },
      h('div', { class: 'kid-row' },
        h('div', { class: 'kid-titles' }, h('h1', null, title), sub && h('p', null, sub)),
        lock),
      h('nav', { class: 'kid-tabs', 'aria-label': 'ניווט ראשי' },
        tab('home', 'calendar', 'המערכת שלי'),
        tab('notebooks', 'notebook', 'המחברות שלי'))
    );
  };

  A.modal = ({ title, body, actions = [], dismissable = true }) =>
    new Promise((resolve) => {
      const close = (v) => { overlay.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
      const onKey = (e) => { if (e.key === 'Escape' && dismissable) close(undefined); };
      const overlay = h('div', { class: 'overlay', onclick: (e) => { if (e.target === overlay && dismissable) close(undefined); } },
        h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' },
          title && h('h2', null, title),
          typeof body === 'string' ? h('p', null, body) : body,
          actions.length > 0 && h('div', { class: 'actions' },
            actions.map((a) => h('button', { class: `btn ${a.class || ''}`, onclick: () => close(a.value) }, a.label))
          )
        )
      );
      overlay.closeModal = close;
      document.addEventListener('keydown', onKey);
      document.body.append(overlay);
      const first = overlay.querySelector('button.primary, button.good, button');
      if (first) first.focus();
    });

  A.confirm = (title, body, yes = 'כן', no = 'ביטול', danger = false) =>
    A.modal({
      title, body,
      actions: [
        { label: yes, class: danger ? 'danger-fill' : 'primary', value: true },
        { label: no, value: false }
      ]
    });

  let toastTimer;
  A.toast = (text) => {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = h('div', { class: 'toast', role: 'status' }, text);
    document.body.append(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), 2800);
  };

  // מקצועות: זיהוי אייקון וצבע לפי שם שההורה מקליד
  A.SUBJECT_COLORS = ['#2456C8', '#C2410C', '#157A47', '#7C3AED', '#BE185D', '#0E7490', '#A16207', '#4D5B6B'];
  const ICON_RULES = [
    [/חשבון|מתמטיק|הנדס/, '🔢'], [/עברית|לשון|הבעה|קריאה|כתיבה/, '📖'], [/אנגלית|english/i, '🔤'],
    [/מדע|טבע|ביולוג|כימיה|פיזיק/, '🔬'], [/תורה|תנ"?ך|מקרא|חומש|נביא|יהדות|משנה|גמרא|תפיל/, '📜'],
    [/ספורט|חינוך גופני|התעמלות|ספורט/, '⚽'], [/אומנות|אמנות|ציור|יצירה/, '🎨'], [/מוסיקה|מוזיקה|שירה/, '🎵'],
    [/גיאוגרפ|מולדת|חברה/, '🌍'], [/היסטור/, '🏛️'], [/מחשב|תכנות|רובוט|טכנולוג/, '💻'],
    [/חינוך|שיחה|כישורי/, '🤝'], [/ערבית/, '✍️'], [/ספרות|ספריה|ספרייה/, '📕'], [/תיאטרון|דרמה/, '🎭'],
    [/שחמט/, '♟️'], [/חקלאות|גינ/, '🌱']
  ];
  A.guessIcon = (name) => {
    for (const [re, icon] of ICON_RULES) if (re.test(name)) return icon;
    return '📘';
  };
  // סוג הדף: חשבון והנדסה נפתחים במשבצות, וההורה יכול לשנות לכל מקצוע
  A.subjectPaper = (s) => s.paper || (/חשבון|מתמטיק|הנדס/.test(s.name) ? 'grid' : 'lines');
  A.ICON_CHOICES = ['📘', '📖', '🔢', '🔤', '🔬', '📜', '⚽', '🎨', '🎵', '🌍', '🏛️', '💻', '🤝', '✍️', '📕', '🎭', '🌱', '🧪', '📐', '🧮', '🗺️', '🕍', '🎤', '🧩'];
  A.isFreeWord = (t) => /^(שיעור |שעה )?חופשי(ת)?$/.test(t.trim()) || t.trim() === 'חופשי';
  A.isBreakWord = (t) => /^הפסקה/.test(t.trim());

  A.DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
  A.ACTIVITIES = {
    chess: { icon: '♟️', name: 'שחמט' },
    memory: { icon: '🧠', name: 'משחק הזיכרון' },
    learn: { icon: '📚', name: 'ללמוד משהו חדש' }
  };

  // קוד הורים: מחסום לילד, לא הצפנה
  A.hashPin = (pin) => {
    let x = 5381;
    for (const ch of `machberet:${pin}`) x = ((x * 33) ^ ch.charCodeAt(0)) >>> 0;
    return x.toString(36);
  };
})();
