// מסכי הילד: פתיחה ראשונה, המערכת של היום ורשימת המחברות.
(function () {
  const A = window.App;
  const h = A.h;

  const SAMPLE = [
    ['חשבון', 'עברית', 'אנגלית', 'חופשי', 'מדעים', 'ספורט'],
    ['עברית', 'חשבון', 'תורה', 'אומנות', 'חופשי', ''],
    ['אנגלית', 'מדעים', 'חשבון', 'עברית', 'מוזיקה', 'חופשי'],
    ['תורה', 'עברית', 'חופשי', 'חשבון', 'אנגלית', 'ספורט'],
    ['חשבון', 'מדעים', 'עברית', 'תורה', 'חופשי', ''],
    ['עברית', 'אומנות', 'חופשי', '', '', '']
  ];

  A.fillSampleTimetable = () => {
    SAMPLE.forEach((day, d) => day.forEach((name, p) => A.setCell(d, p, name)));
    A.save('timetable');
  };

  A.setCell = (day, period, text) => {
    const t = (text || '').trim();
    const cells = A.state.timetable.cells;
    if (!t) cells[day][period] = null;
    else if (A.isFreeWord(t)) cells[day][period] = 'free';
    else if (A.isBreakWord(t)) cells[day][period] = 'break';
    else cells[day][period] = A.findOrCreateSubject(t).id;
  };

  // פתיחה ראשונה: שם הילד וקוד הורים
  A.screens.setup = (root) => {
    const name = h('input', { class: 'input', id: 'child-name', autocomplete: 'off', maxLength: 30, placeholder: 'למשל: יהלי' });
    const pin = h('input', { class: 'input ltr', id: 'pin', type: 'password', inputMode: 'numeric', maxLength: 4, autocomplete: 'new-password', placeholder: '4 ספרות', style: { width: '100%' } });
    const err = h('div', { class: 'notice', hidden: true });
    const submit = async (e) => {
      e.preventDefault();
      if (!name.value.trim()) { err.textContent = 'כתבו את שם הילד או הילדה.'; err.hidden = false; return; }
      if (!/^\d{4}$/.test(pin.value)) { err.textContent = 'קוד ההורים צריך להיות בן 4 ספרות.'; err.hidden = false; return; }
      A.state.settings.childName = name.value.trim();
      A.state.settings.pinHash = A.hashPin(pin.value);
      A.state.settings.setupDone = true;
      A.state.settings.onboardDone = false;
      await A.save('settings');
      A.reset('onboard', { step: 'intro' });
    };
    root.append(
      h('form', { class: 'setup', onsubmit: submit },
        h('div', { class: 'logo', 'aria-hidden': 'true' }, A.iconImg('notebook', 110)),
        h('h1', null, 'ברוכים הבאים למחברת החכמה'),
        h('p', { class: 'center muted' }, 'שני פרטים קצרים, ואחר כך קובעים יחד את המערכת ואת מה שיש במחברת.'),
        h('div', { class: 'field' }, h('label', { for: 'child-name' }, 'שם הילד או הילדה'), name),
        h('div', { class: 'field' }, h('label', { for: 'pin' }, 'קוד הורים'), pin,
          h('span', { class: 'small muted', style: { 'font-weight': '400' } }, 'הקוד פותח את אזור ההורים. לא לגלות לילדים 🙂')),
        A.installCard(),
        err,
        h('button', { class: 'btn primary block', type: 'submit' }, 'ממשיכים')
      )
    );
  };

  // בחירות של ההורה: אילו כלים יש במחברת, והאם יש אזור חופשי ומה יש בו.
  // משמשות גם בפתיחה הראשונה וגם בהגדרות.
  const choiceCard = ({ on, icon, title, text, onclick }) => h('button', {
    class: `choice ${on ? 'on' : ''}`, type: 'button', 'aria-pressed': on ? 'true' : 'false', onclick
  },
    h('span', { class: 'choice-ic', 'aria-hidden': 'true' }, icon),
    h('span', { class: 'choice-body' }, h('b', null, title), text && h('span', { class: 'small muted' }, text)),
    h('span', { class: 'choice-check', 'aria-hidden': 'true' }, on ? '✓' : ''));

  A.TOOL_INFO = {
    write: { icon: '✏️', name: 'כתיבה ביד', text: 'כותבים ומציירים באצבע או בעט, כמו במחברת אמיתית.' },
    record: { icon: '🎤', name: 'הקלטה', text: 'מקליטים את השיעור. אפשר להקליד או לכתוב בזמן שמקליטים.' },
    type: { icon: '⌨️', name: 'הקלדה', text: 'מקלידים במקלדת.' }
  };

  A.toolsChooser = (onChange) => {
    const box = h('div', { class: 'stack' });
    const s = A.state.settings;
    const draw = () => box.replaceChildren(...['write', 'record', 'type'].map((id) => choiceCard({
      on: s.tools[id], icon: A.TOOL_INFO[id].icon, title: A.TOOL_INFO[id].name, text: A.TOOL_INFO[id].text,
      onclick: () => {
        const next = { ...s.tools, [id]: !s.tools[id] };
        if (!next.write && !next.type && !next.record) { A.toast('צריך לבחור לפחות דבר אחד'); return; }
        s.tools = next;
        A.save('settings');
        draw();
        if (onChange) onChange();
      }
    })));
    draw();
    return box;
  };

  const FREE_TEXT = { chess: 'מול המחשב או מול חבר', memory: 'לבד או מול חבר', learn: 'נושאים מוכנים לקריאה, עם חידון' };
  A.freeChooser = (onChange) => {
    const box = h('div', { class: 'stack' });
    const s = A.state.settings;
    const set = (v) => { s.freeZone = v; A.save('settings'); draw(); if (onChange) onChange(); };
    function draw() {
      const yesNo = h('div', { class: 'yes-no' },
        h('button', { type: 'button', class: `btn ${s.freeZone ? 'on' : ''}`, onclick: () => set(true) }, '✅ כן, רוצים'),
        h('button', { type: 'button', class: `btn ${!s.freeZone ? 'on' : ''}`, onclick: () => set(false) }, '🚫 בלי אזור חופשי'));
      const acts = s.freeZone && h('div', { class: 'stack' },
        h('b', null, 'מה יוצג באזור החופשי? אפשר לבחור כמה.'),
        ...['chess', 'memory', 'learn'].map((id) => {
          const on = s.freeActivities.includes(id);
          return choiceCard({
            on, icon: A.iconImg(id, 40), title: A.ACTIVITIES[id].name, text: FREE_TEXT[id],
            onclick: () => {
              const next = on ? s.freeActivities.filter((x) => x !== id) : s.freeActivities.concat(id);
              if (!next.length) { A.toast('צריך לבחור לפחות דבר אחד'); return; }
              s.freeActivities = ['chess', 'memory', 'learn'].filter((x) => next.includes(x));
              A.save('settings');
              draw();
              if (onChange) onChange();
            }
          });
        }));
      box.replaceChildren(yesNo, acts || h('p', { class: 'small muted' }, 'שעות שכתוב בהן "חופשי" יופיעו במערכת כשעה חופשית רגילה, בלי משחקים.'));
    }
    draw();
    return box;
  };

  // הפתיחה הראשונה של ההורה: הסבר, מערכת, כלים במחברת ואזור חופשי
  const STEPS = ['intro', 'schedule', 'tools', 'free'];
  A.screens.onboard = (root, params) => {
    const step = STEPS.includes(params.step) ? params.step : 'intro';
    const n = STEPS.indexOf(step);
    const kid = A.state.settings.childName || 'הילד';
    const finish = async () => {
      A.state.settings.onboardDone = true;
      await A.save('settings');
      A.reset('home');
      A.toast('הכול מוכן! 🎉');
    };
    const next = () => (n + 1 < STEPS.length ? A.go('onboard', { step: STEPS[n + 1] }) : finish());
    const dots = h('div', { class: 'steps', role: 'img', 'aria-label': `שלב ${n + 1} מתוך ${STEPS.length}` },
      STEPS.map((_, i) => h('i', { class: i <= n ? 'on' : '' })));
    const foot = (label) => h('div', { class: 'onb-foot' }, h('button', { class: 'btn primary block', onclick: next }, label));

    if (step === 'intro') {
      root.append(h('div', { class: 'setup' },
        dots,
        h('div', { class: 'logo', 'aria-hidden': 'true' }, A.iconImg('calendar', 96)),
        h('h1', null, 'עכשיו קובעים את המערכת'),
        h('div', { class: 'card stack' },
          h('p', null, 'במסך הבא יש טבלה של ימים ושעות. בכל משבצת מקלידים את שם המקצוע, למשל ', h('b', null, 'חשבון'), ' או ', h('b', null, 'אנגלית'), '.'),
          h('p', null, 'לשעה חופשית כותבים ', h('b', null, 'חופשי'), ', ולהפסקה ', h('b', null, 'הפסקה'), '.'),
          h('p', null, 'לכל מקצוע יש מחברת משלו. לחיצה על שיעור במערכת פותחת את המחברת שלו.'),
          h('p', { class: 'small muted' }, 'אחרי המערכת יש עוד שתי שאלות קצרות: מה יש במחברת, והאם יש אזור חופשי.')),
        A.installCard(),
        h('button', { class: 'btn primary block', onclick: next }, 'בואו נתחיל ←')));
      return;
    }
    if (step === 'schedule') {
      const body = h('div');
      root.append(
        A.topbar({ title: 'קובעים את המערכת' }),
        h('div', { class: 'page' }, dots, body, foot('המערכת מוכנה, ממשיכים ←')));
      A.schedulePanel(body, {});
      return;
    }
    if (step === 'tools') {
      root.append(
        A.topbar({ title: 'מה יש במחברת?' }),
        h('div', { class: 'page narrow' }, dots,
          h('p', { class: 'onb-q' }, `מה ${kid} יוכלו לעשות במחברת? אפשר לבחור כמה.`),
          A.toolsChooser(),
          h('p', { class: 'small muted', style: { 'margin-top': '10px' } }, 'אפשר לשנות את זה בכל זמן באזור ההורים, בהגדרות.'),
          foot('ממשיכים ←')));
      return;
    }
    root.append(
      A.topbar({ title: 'אזור חופשי' }),
      h('div', { class: 'page narrow' }, dots,
        h('p', { class: 'onb-q' }, 'רוצים אזור חופשי בשעות החופשיות של המערכת?'),
        A.freeChooser(),
        foot('סיום 🎉')));
  };

  // המערכת שלי
  A.screens.home = (root) => {
    A.free.current = null;
    const now = new Date();
    const todayIdx = now.getDay();
    let day = todayIdx <= 5 ? todayIdx : 0;
    const name = A.state.settings.childName;

    const list = h('div', { class: 'stack' });
    const days = h('div', { class: 'days', role: 'tablist' });

    const lessonButton = (d, p) => {
      const cell = A.state.timetable.cells[d][p];
      const period = A.state.timetable.periods[p];
      const time = period.start && period.end ? A.ltr(`${period.start}–${period.end}`) : null;
      const isNow = d === todayIdx && A.free.isNowIn(period);

      if (cell === 'break') {
        return h('div', { class: 'lesson pause' }, h('span', { 'aria-hidden': 'true' }, '🍎'), h('span', { class: 'name' }, 'הפסקה'), h('span', { class: 'spacer' }), h('span', { class: 'sub small muted' }, time));
      }

      if (cell === 'free' && !A.state.settings.freeZone) {
        return h('div', { class: 'lesson pause' }, h('span', { 'aria-hidden': 'true' }, '🌤️'), h('span', { class: 'name' }, 'שעה חופשית'), h('span', { class: 'spacer' }), h('span', { class: 'sub small muted' }, time));
      }
      if (cell === 'free') {
        const state = A.free.slotState(d, p);
        let sub;
        if (state.open) sub = 'אפשר להיכנס!';
        else if (state.why === 'early') sub = ['נפתח ב-', A.ltr(period.start)];
        else if (state.why === 'late') sub = 'השעה הזאת כבר הסתיימה';
        else sub = time;
        return h('button', {
          class: `lesson free ${state.open ? '' : 'locked'} ${isNow ? 'now' : ''}`,
          disabled: !state.open,
          onclick: () => { A.free.enter(d, p); A.go('freeHub'); }
        },
          h('span', { class: 'bubble', 'aria-hidden': 'true' }, state.open ? A.iconImg('free', 42) : '🔒'),
          h('span', { class: 'body' },
            h('span', { class: 'name' }, 'שיעור חופשי'),
            h('span', { class: 'sub' }, sub)),
          isNow && h('span', { class: 'badge' }, 'עכשיו')
        );
      }

      const subject = A.subjectById(cell);
      if (!subject) return null;
      return h('button', {
        class: `lesson ${isNow ? 'now' : ''}`,
        style: { '--c': subject.color },
        onclick: () => A.go('page', { subjectId: subject.id, from: 'schedule' })
      },
        h('span', { class: 'bubble', 'aria-hidden': 'true' }, A.subjectIcon(subject.icon, 44)),
        h('span', { class: 'body' },
          isNow && h('span', { class: 'sub now-label' }, 'עכשיו בשיעור'),
          h('span', { class: 'name' }, subject.name),
          h('span', { class: 'sub' }, time)),
        isNow && h('span', { class: 'badge' }, 'עכשיו')
      );
    };

    const draw = () => {
      days.replaceChildren(...A.DAYS.map((label, i) =>
        h('button', {
          class: `${i === day ? 'on' : ''} ${i === todayIdx ? 'today' : ''}`,
          role: 'tab',
          'aria-selected': i === day ? 'true' : 'false',
          onclick: () => { day = i; draw(); }
        }, label)
      ));
      const rows = A.state.timetable.periods
        .map((_, p) => (A.state.timetable.cells[day][p] ? lessonButton(day, p) : null))
        .filter(Boolean);
      list.replaceChildren(...(rows.length ? rows : [
        h('div', { class: 'card center' },
          h('div', { style: { 'font-size': '48px' }, 'aria-hidden': 'true' }, '🌤️'),
          h('p', null, A.state.timetable.cells.some((d) => d.some(Boolean)) ? 'אין שיעורים ביום הזה.' : 'המערכת עוד ריקה. ההורים מקלידים אותה באזור ההורים.'),
          h('p', { class: 'small muted' }, 'אפשר לפתוח מחברת דרך הכפתור "המחברות שלי".'))
      ]));
    };

    root.append(
      A.childHeader({ active: 'home', title: `שלום, ${name}!`, sub: A.fmtDate(A.dateKey(now)) }),
      h('div', { class: 'page' },
        !location.protocol.startsWith('http') && h('div', { class: 'notice', style: { 'margin-top': '10px' } }, '⚠️ המחברת נפתחה מקובץ שהורד, ולכן ציורים, הקלטה והתקנה לא יעבדו. צריך לפתוח אותה מהקישור באינטרנט.'),
        days,
        list
      )
    );
    draw();
    const timer = setInterval(draw, 30000);
    return () => clearInterval(timer);
  };

  // המחברות שלי
  A.screens.notebooks = (root) => {
    A.free.current = null;
    const subjects = A.state.subjects;
    root.append(
      A.childHeader({ active: 'notebooks', title: 'המחברות שלי', sub: subjects.length ? `${subjects.length} מחברות` : '' }),
      h('div', { class: 'page' },
        subjects.length
          ? h('div', { class: 'tiles' }, subjects.map((s) =>
              h('button', {
                class: 'tile',
                style: { '--c': s.color },
                onclick: () => A.go('page', { subjectId: s.id, from: 'notebooks' })
              }, h('span', { class: 'ic', 'aria-hidden': 'true' }, A.subjectIcon(s.icon)), s.name)
            ))
          : h('div', { class: 'card center' }, 'עוד אין מחברות. ההורים צריכים להקליד את מערכת השעות באזור ההורים.')
      )
    );
  };
})();
