// שמירת הנתונים במכשיר (IndexedDB) ומעקב אחרי הפעילות עבור ההורים.
(function () {
  const A = window.App;
  const DB_NAME = 'machberet';
  const DB_VERSION = 1;
  let db;

  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        d.createObjectStore('kv');
        d.createObjectStore('pages', { keyPath: 'id' }).createIndex('subjectId', 'subjectId');
        d.createObjectStore('audio', { keyPath: 'id' }).createIndex('pageId', 'pageId');
        d.createObjectStore('events', { keyPath: 'id' }).createIndex('ts', 'ts');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  const wrap = (req) => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const store = (name, mode = 'readonly') => db.transaction(name, mode).objectStore(name);

  A.db = {
    get: (s, k) => wrap(store(s).get(k)),
    put: (s, v, k) => wrap(k === undefined ? store(s, 'readwrite').put(v) : store(s, 'readwrite').put(v, k)),
    del: (s, k) => wrap(store(s, 'readwrite').delete(k)),
    all: (s) => wrap(store(s).getAll()),
    clear: (s) => wrap(store(s, 'readwrite').clear()),
    byIndex: (s, index, value) => wrap(store(s).index(index).getAll(value)),
    eventsSince: (ts) => wrap(store('events').index('ts').getAll(IDBKeyRange.lowerBound(ts))),
    countPages: (subjectId) => wrap(store('pages').index('subjectId').count(subjectId))
  };

  A.newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const DEFAULT_TIMES = [
    ['08:00', '08:45'], ['08:50', '09:35'], ['09:55', '10:40'], ['10:45', '11:30'],
    ['11:50', '12:35'], ['12:40', '13:25'], ['13:30', '14:15'], ['14:20', '15:05']
  ];

  A.state = {};
  A.defaults = () => ({
    settings: { setupDone: false, childName: '', pinHash: '', freeTimeLock: true, freeResetAt: null, transcribe: false, disabledTopics: [] },
    subjects: [],
    timetable: {
      periods: DEFAULT_TIMES.map(([start, end]) => ({ start, end })),
      cells: A.DAYS.map(() => DEFAULT_TIMES.map(() => null))
    },
    freeSessions: []
  });

  A.loadState = async () => {
    db = await open();
    const d = A.defaults();
    for (const key of Object.keys(d)) {
      const v = await A.db.get('kv', key);
      A.state[key] = v === undefined ? d[key] : v;
    }
    A.state.settings = { ...d.settings, ...A.state.settings };
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  };
  A.save = (key) => A.db.put('kv', A.state[key], key);

  A.subjectById = (id) => A.state.subjects.find((s) => s.id === id);
  A.findOrCreateSubject = (name) => {
    const clean = name.trim().replace(/\s+/g, ' ');
    let s = A.state.subjects.find((x) => x.name === clean);
    if (!s) {
      s = {
        id: A.newId(),
        name: clean,
        icon: A.guessIcon(clean),
        color: A.SUBJECT_COLORS[A.state.subjects.length % A.SUBJECT_COLORS.length]
      };
      A.state.subjects.push(s);
      A.save('subjects');
    }
    return s;
  };

  // יומן פעילות: כל ביקור נשמר כשורה אחת עם זמן פעיל מצטבר
  let lastInteraction = Date.now();
  const visits = new Set();
  ['pointerdown', 'keydown', 'scroll'].forEach((t) =>
    window.addEventListener(t, () => { lastInteraction = Date.now(); }, { passive: true, capture: true })
  );

  const TICK = 5000;
  const IDLE_LIMIT = 120000;
  let tickCount = 0;
  setInterval(() => {
    if (document.hidden || Date.now() - lastInteraction > IDLE_LIMIT) return;
    tickCount++;
    visits.forEach((v) => {
      v.row.dur += TICK;
      if (tickCount % 6 === 0) v.flush();
    });
  }, TICK);

  window.addEventListener('pagehide', () => visits.forEach((v) => v.flush()));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) visits.forEach((v) => v.flush());
  });

  A.log = (type, label, detail) => {
    A.db.put('events', { id: A.newId(), ts: Date.now(), type, label, detail: detail || {}, dur: 0 }).catch(console.error);
  };

  A.visit = (type, label, detail) => {
    const row = { id: A.newId(), ts: Date.now(), type, label, detail: detail || {}, dur: 0 };
    const v = {
      row,
      flush: () => A.db.put('events', row).catch(console.error),
      set: (d) => { Object.assign(row.detail, d); v.flush(); },
      end: () => { visits.delete(v); v.flush(); }
    };
    visits.add(v);
    v.flush();
    return v;
  };
})();
