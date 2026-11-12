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
      await A.save('settings');
      A.reset('parent', { tab: 'schedule', first: true });
    };
    root.append(
      h('form', { class: 'setup', onsubmit: submit },
        h('div', { class: 'logo', 'aria-hidden': 'true' }, A.iconImg('notebook', 110)),
        h('h1', null, 'ברוכים הבאים למחברת החכמה'),
        h('p', { class: 'center muted' }, 'שני פרטים קצרים, ואחר כך מקלידים את מערכת השעות.'),
        h('div', { class: 'field' }, h('label', { for: 'child-name' }, 'שם הילד או הילדה'), name),
        h('div', { class: 'field' }, h('label', { for: 'pin' }, 'קוד הורים'), pin,
          h('span', { class: 'small muted', style: { 'font-weight': '400' } }, 'הקוד פותח את אזור ההורים. לא לגלות לילדים 🙂')),
        !A.isInstalled() && h('div', { class: 'notice' }, h('b', null, 'כדי לקבל אייקון במסך הבית: '), A.installSteps()),
        err,
        h('button', { class: 'btn primary block', type: 'submit' }, 'ממשיכים')
      )
    );
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
