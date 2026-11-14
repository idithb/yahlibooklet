// השיעור החופשי: מתי הוא פתוח, מה נעול בו, ומעקב אחרי מה שהילד עושה בו.
(function () {
  const A = window.App;
  const h = A.h;


  const nowMinutes = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };

  A.free = {
    current: null, // { id, end }

    isNowIn(period) {
      const s = A.toMinutes(period.start);
      const e = A.toMinutes(period.end);
      if (s === null || e === null) return false;
      const n = nowMinutes();
      return n >= s && n < e;
    },

    slotState(day, p) {
      if (!A.state.settings.freeTimeLock) return { open: true };
      if (day !== new Date().getDay()) return { open: false, why: 'day' };
      const period = A.state.timetable.periods[p];
      const s = A.toMinutes(period.start);
      const e = A.toMinutes(period.end);
      if (s === null || e === null) return { open: true };
      const n = nowMinutes();
      if (n < s) return { open: false, why: 'early' };
      if (n >= e) return { open: false, why: 'late' };
      return { open: true };
    },

    enter(day, p) {
      const id = `${A.dateKey()}#${day}#${p}`;
      const period = A.state.timetable.periods[p];
      const seen = A.state.freeSessions.some((s) => s.id === id);
      this.current = { id, end: A.toMinutes(period.end) };
      if (!seen) {
        A.state.freeSessions.push({ id, date: A.dateKey(), period: p, activities: [] });
        if (A.state.freeSessions.length > 300) A.state.freeSessions.shift();
        A.save('freeSessions');
        A.log('free', 'שיעור חופשי', { period: p });
      }
    },

    // מצב בדיקה: כל כניסה היא שיעור חופשי חדש, כדי שאפשר יהיה לראות את כלל הנעילה
    enterTest() {
      const id = `${A.dateKey()}#test#${Date.now()}`;
      this.current = { id, end: null, test: true };
      A.state.freeSessions.push({ id, date: A.dateKey(), period: -1, activities: [] });
      if (A.state.freeSessions.length > 300) A.state.freeSessions.shift();
      A.save('freeSessions');
    },

    lockedNow() {
      const cur = this.current ? this.current.id : null;
      return FreeRule.locked(A.state.freeSessions, cur, A.state.settings.freeResetAt);
    },

    // נקרא רק כשהפעילות באמת התחילה (מהלך ראשון, קלף ראשון, פתיחת נושא)
    mark(type) {
      if (!this.current) return;
      const s = A.state.freeSessions.find((x) => x.id === this.current.id);
      if (!s) return;
      const last = s.activities[s.activities.length - 1];
      if (last && last.type === type) { last.ts = Date.now(); }
      else s.activities.push({ type, ts: Date.now() });
      A.save('freeSessions');
    }
  };

  // כשהשעה החופשית נגמרת, הילד חוזר למערכת
  setInterval(() => {
    const cur = A.free.current;
    if (!cur || !A.state.settings.freeTimeLock || cur.end === null) return;
    if (nowMinutes() >= cur.end) {
      A.free.current = null;
      A.reset('home');
      A.modal({
        title: '⏰ השעה החופשית הסתיימה',
        body: 'כל הכבוד! עכשיו חוזרים למערכת.',
        actions: [{ label: 'בסדר', class: 'primary' }]
      });
    }
  }, 15000);

  const lockedText = 'היה בשיעור החופשי הקודם. יחזור בפעם הבאה 🙂';

  A.screens.freeHub = (root) => {
    if (!A.free.current || !A.state.settings.freeZone) { A.reset('home'); return; }
    const allowed = A.state.settings.freeActivities;
    let locked = A.free.lockedNow().filter((x) => allowed.includes(x));
    // תמיד נשארת לפחות בחירה אחת
    if (allowed.every((x) => locked.includes(x))) locked = [];
    const tile = (id, color, sub, target) => {
      const info = A.ACTIVITIES[id];
      const isLocked = locked.includes(id);
      return h('button', {
        class: `free-tile ${isLocked ? 'locked' : ''}`,
        style: { '--c': color },
        disabled: isLocked,
        onclick: () => A.go(target)
      },
        h('span', { class: 'ic', 'aria-hidden': 'true' }, A.iconImg(id)),
        h('span', { class: 't' }, isLocked ? `🔒 ${info.name}` : info.name),
        h('span', { class: 'sub' }, isLocked ? lockedText : sub)
      );
    };
    root.append(
      A.topbar({ title: 'שיעור חופשי' }),
      h('div', { class: 'page' },
        h('p', { class: 'hello', style: { 'margin-bottom': '14px', 'font-size': '24px' } }, 'מה בא לך לעשות?'),
        A.free.current.test && locked.length > 0 && h('button', {
          class: 'btn sm block',
          style: { 'margin-bottom': '12px' },
          onclick: () => {
            A.state.settings.freeResetAt = Date.now();
            A.save('settings');
            A.refresh();
          }
        }, '🔓 בדיקה: לפתוח את הנעילה'),
        h('div', { class: 'free-tiles' },
          allowed.includes('chess') && tile('chess', '#4D5B6B', 'מול המחשב או מול חבר', 'chess'),
          allowed.includes('memory') && tile('memory', '#7C3AED', 'לבד או מול חבר', 'memory'),
          allowed.includes('learn') && tile('learn', '#157A47', 'לקרוא, ללמוד ולשחק בחידון', 'topics')
        )
      )
    );
  };
})();
