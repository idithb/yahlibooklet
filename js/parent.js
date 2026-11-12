// אזור ההורים: קוד כניסה, נתונים, הקלדת מערכת, מחברות, נושאים והגדרות.
(function () {
  const A = window.App;
  const h = A.h;

  // מסך הקוד
  A.screens.pin = (root) => {
    let entry = '';
    const dots = h('div', { class: 'pin-dots', 'aria-label': 'קוד' });
    const msg = h('p', { class: 'center muted' }, 'מקישים את קוד ההורים');
    const draw = () => dots.replaceChildren(...[0, 1, 2, 3].map((i) => h('i', { class: i < entry.length ? 'on' : '' })));
    const press = (d) => {
      if (entry.length >= 4) return;
      entry += d;
      draw();
      if (entry.length === 4) {
        if (A.hashPin(entry) === A.state.settings.pinHash) A.replace('parent', { tab: 'data' });
        else {
          msg.textContent = 'הקוד לא נכון. אפשר לנסות שוב.';
          entry = '';
          setTimeout(draw, 200);
        }
      }
    };
    const forgot = async () => {
      const a = 12 + Math.floor(Math.random() * 30);
      const b = 13 + Math.floor(Math.random() * 30);
      const input = h('input', { class: 'input ltr', inputMode: 'numeric', style: { width: '100%' }, 'aria-label': 'תוצאה' });
      const ok = await A.modal({
        title: 'שכחתם את הקוד?',
        body: h('div', { class: 'stack' }, h('p', null, 'כדי לקבוע קוד חדש, פתרו את התרגיל:'), h('p', { class: 'center', style: { 'font-size': '24px', 'font-weight': '800' } }, A.ltr(`${a} × ${b} = ?`)), input),
        actions: [{ label: 'בדיקה', class: 'primary', value: true }, { label: 'ביטול', value: false }]
      });
      if (ok && Number(input.value) === a * b) A.replace('parent', { tab: 'settings' });
      else if (ok) A.toast('התשובה לא נכונה');
    };
    draw();
    root.append(
      A.topbar({ title: '🔒 אזור הורים' }),
      h('div', { class: 'pin-wrap' },
        msg,
        dots,
        h('div', { class: 'pin-keys' },
          ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => h('button', { onclick: () => press(d) }, d)),
          h('button', { 'aria-label': 'מחיקה', onclick: () => { entry = entry.slice(0, -1); draw(); } }, '⌫'),
          h('button', { onclick: () => press('0') }, '0'),
          h('span')
        ),
        h('button', { class: 'btn sm', onclick: forgot }, 'שכחתי את הקוד')
      )
    );
  };

  const TABS = [
    ['data', '📊 נתונים'], ['schedule', '📅 מערכת'], ['notebooks', '📓 מחברות'], ['topics', '📚 נושאים'], ['settings', '⚙️ הגדרות']
  ];

  A.screens.parent = (root, params) => {
    A.free.current = null;
    let tab = params.tab || 'data';
    const nav = h('div', { class: 'ptabs', role: 'tablist' });
    const body = h('div', { class: 'parent-page' });
    const draw = async () => {
      params.tab = tab;
      nav.replaceChildren(...TABS.map(([id, label]) =>
        h('button', { class: id === tab ? 'on' : '', role: 'tab', onclick: () => { tab = id; draw(); } }, label)));
      body.replaceChildren();
      await PANELS[tab](body, params);
    };
    root.append(
      A.topbar({ title: 'אזור הורים', back: true, onBack: () => A.reset('home') }),
      nav,
      body
    );
    draw();
  };

  const PANELS = {};

  // נתונים
  const eventText = (e) => {
    const d = e.detail || {};
    switch (e.type) {
      case 'subject': return [A.iconImg('notebook', 20), `פתיחת מחברת: ${e.label}`];
      case 'note': return [{ type: '⌨️', write: '✏️', record: '🎤' }[d.kind] || '📝', `${{ type: 'הקלדה', write: 'כתיבה ביד', record: 'הקלטה' }[d.kind] || 'עריכה'} במחברת ${e.label}`];
      case 'free': return [A.iconImg('free', 20), 'כניסה לשיעור חופשי'];
      case 'chess': {
        const vs = d.mode === 'friend' ? 'מול חבר' : `מול המחשב${d.level ? ` (רמה ${{ 1: 'קלה', 2: 'בינונית', 3: 'חזקה' }[d.level]})` : ''}`;
        const res = { win: 'ניצחון', loss: 'הפסד', draw: 'תיקו', white: 'לבן ניצח', black: 'שחור ניצח', unfinished: 'לא הסתיים' }[d.result] || '';
        return [A.iconImg('chess', 20), `שחמט ${vs}${res ? ` · ${res}` : ''}`];
      }
      case 'memory': {
        const res = d.result === 'unfinished' ? 'לא הסתיים' : d.result || '';
        return [A.iconImg('memory', 20), `משחק הזיכרון ${d.mode === 'friend' ? 'מול חבר' : 'לבד'} · ${d.pairs} זוגות${res ? ` · ${res}` : ''}`];
      }
      case 'topic': return [A.iconImg('learn', 20), `נושא: ${e.label}${d.quiz ? ` · חידון ${d.quiz}` : d.cardsRead ? ` · ${d.cardsRead} כרטיסי קריאה` : ''}`];
      default: return ['•', e.label || e.type];
    }
  };

  const barList = (rows, fmt) => {
    if (!rows.length) return h('p', { class: 'muted' }, 'עדיין אין נתונים בתקופה הזאת.');
    const max = Math.max(...rows.map((r) => r.value), 1);
    return h('div', { class: 'bars' }, rows.map((r) =>
      h('div', { class: 'bar-row', title: `${r.name || r.label}: ${fmt(r.value)}` },
        h('span', null, r.label),
        h('div', { class: 'bar-track', 'aria-hidden': 'true' }, h('div', { class: 'bar-fill', style: { width: `${(r.value / max) * 100}%` } })),
        h('span', { class: 'bar-val' }, fmt(r.value)))
    ));
  };

  let dataRange = 7;
  PANELS.data = async (body) => {
    if (!A.isInstalled()) {
      body.append(h('div', { class: 'notice row', style: { 'margin-bottom': '12px' } },
        h('span', { class: 'spacer' }, '📲 האפליקציה עוד לא מותקנת במכשיר הזה.'),
        h('button', { class: 'btn sm', onclick: () => A.replace('parent', { tab: 'settings' }) }, 'איך מתקינים')));
    }
    const since = (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (dataRange - 1));
      return d.getTime();
    })();
    const events = (await A.db.eventsSince(since)).sort((a, b) => b.ts - a.ts);
    const sum = (list) => list.reduce((acc, e) => acc + (e.dur || 0), 0);
    const of = (t) => events.filter((e) => e.type === t);

    const totalTime = sum(events);
    const subjects = {};
    of('subject').forEach((e) => {
      subjects[e.label] = subjects[e.label] || { time: 0, opens: 0 };
      subjects[e.label].time += e.dur || 0;
      subjects[e.label].opens++;
    });
    const subjectRows = Object.entries(subjects)
      .map(([label, v]) => ({ label, value: v.time }))
      .sort((a, b) => b.value - a.value);

    const freeRows = [
      { label: [A.iconImg('chess', 22), ' שחמט'], name: 'שחמט', value: of('chess').length },
      { label: [A.iconImg('memory', 22), ' זיכרון'], name: 'זיכרון', value: of('memory').length },
      { label: [A.iconImg('learn', 22), ' נושאים'], name: 'נושאים', value: of('topic').length }
    ].filter((r) => r.value > 0);

    const topicsDone = {};
    of('topic').forEach((e) => { (topicsDone[e.label] = topicsDone[e.label] || []).push(e); });

    const locked = FreeRule.locked(A.state.freeSessions, null, A.state.settings.freeResetAt);
    const name = A.state.settings.childName;

    const lockCard = h('div', { class: 'card' },
      h('div', { class: 'row' },
        h('div', { class: 'spacer' },
          h('b', null, 'בשיעור החופשי הבא: '),
          locked.length
            ? `נעול: ${locked.map((l) => A.ACTIVITIES[l].name).join(', ')}`
            : 'הכול פתוח'),
        locked.length > 0 && h('button', {
          class: 'btn sm',
          onclick: async () => {
            A.state.settings.freeResetAt = Date.now();
            await A.save('settings');
            A.toast('הנעילה נפתחה');
            A.refresh();
          }
        }, '🔓 לפתוח נעילה')
      )
    );

    // שורת זמן לפי ימים
    const timeline = h('div');
    let lastDay = null;
    events.slice(0, 150).forEach((e) => {
      const key = A.dateKey(new Date(e.ts));
      if (key !== lastDay) {
        timeline.append(h('div', { class: 'tl-day' }, A.fmtDate(key)));
        lastDay = key;
      }
      const [icon, text] = eventText(e);
      timeline.append(h('div', { class: 'tl-item' },
        h('span', { class: 'tm ltr' }, A.fmtClock(e.ts)),
        h('span', { 'aria-hidden': 'true' }, icon),
        h('span', { class: 'tx' }, text),
        e.dur >= 30000 && h('span', { class: 'tm' }, A.fmtDur(e.dur))
      ));
    });

    const range = (days, label) => h('button', {
      class: `btn sm ${dataRange === days ? 'on' : ''}`,
      onclick: () => { dataRange = days; A.refresh(); }
    }, label);

    body.append(
      h('div', { class: 'row', style: { 'margin-bottom': '12px' } },
        h('b', null, `הפעילות של ${name}`),
        h('span', { class: 'spacer' }),
        range(1, 'היום'), range(7, '7 ימים'), range(30, '30 יום')
      ),
      h('div', { class: 'kpis' },
        h('div', { class: 'kpi' }, h('b', null, A.fmtDur(totalTime)), h('span', null, 'זמן פעיל באפליקציה')),
        h('div', { class: 'kpi' }, h('b', null, of('subject').length), h('span', null, 'פתיחות של מחברות')),
        h('div', { class: 'kpi' }, h('b', null, of('free').length), h('span', null, 'שיעורים חופשיים')),
        h('div', { class: 'kpi' }, h('b', null, Object.keys(topicsDone).length), h('span', null, 'נושאים שנלמדו'))
      ),
      h('div', { style: { 'margin-top': '12px' } }, lockCard),
      h('div', { class: 'section-title' }, 'זמן במחברות לפי מקצוע'),
      h('div', { class: 'card' }, barList(subjectRows, A.fmtDur)),
      h('div', { class: 'section-title' }, 'מה נבחר בשיעורים החופשיים'),
      h('div', { class: 'card' }, barList(freeRows, (n) => (n === 1 ? 'פעם אחת' : `${n} פעמים`))),
      h('div', { class: 'section-title' }, 'נושאים וחידונים'),
      h('div', { class: 'card' },
        Object.keys(topicsDone).length
          ? Object.entries(topicsDone).map(([title, list]) => {
              const quizzes = list.filter((e) => e.detail && e.detail.quiz).map((e) => e.detail.quiz);
              return h('div', { class: 'tl-item' },
                h('span', { class: 'tx' }, h('b', null, title)),
                h('span', { class: 'muted small' }, quizzes.length ? `חידון: ${quizzes.join(', ')}` : 'נקרא, בלי חידון'),
                h('span', { class: 'tm' }, A.fmtDur(sum(list))));
            })
          : h('p', { class: 'muted' }, 'עדיין אין נתונים בתקופה הזאת.')
      ),
      h('div', { class: 'section-title' }, 'על מה לחצו, לפי הזמן'),
      h('div', { class: 'card' }, events.length ? timeline : h('p', { class: 'muted' }, 'עדיין אין פעילות בתקופה הזאת.')),
      h('div', { style: { 'margin-top': '12px' } }, h('button', { class: 'btn sm', onclick: () => exportCsv() }, '⬇️ הורדת הנתונים לאקסל (CSV)'))
    );
  };

  async function exportCsv() {
    const rows = (await A.db.all('events')).sort((a, b) => a.ts - b.ts);
    const esc = (v) => `"${String(v === undefined || v === null ? '' : v).replace(/"/g, '""')}"`;
    const lines = [['תאריך', 'שעה', 'פעילות', 'דקות פעילות'].map(esc).join(',')];
    rows.forEach((e) => {
      const [, text] = eventText(e);
      lines.push([A.dateKey(new Date(e.ts)), A.fmtClock(e.ts), text, ((e.dur || 0) / 60000).toFixed(1)].map(esc).join(','));
    });
    download(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `פעילות-${A.dateKey()}.csv`);
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: filename });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // הקלדת המערכת
  PANELS.schedule = (body, params) => {
    const tt = A.state.timetable;
    const listId = 'subject-names';
    const datalist = h('datalist', { id: listId });
    const saved = h('span', { class: 'small muted', role: 'status' });
    const tableHolder = h('div');
    const subjectsHolder = h('div');

    const fillList = () => datalist.replaceChildren(
      ...A.state.subjects.map((s) => h('option', { value: s.name })),
      h('option', { value: 'חופשי' }),
      h('option', { value: 'הפסקה' })
    );

    const cellValue = (cell) => {
      if (!cell) return '';
      if (cell === 'free') return 'חופשי';
      if (cell === 'break') return 'הפסקה';
      const s = A.subjectById(cell);
      return s ? s.name : '';
    };
    const cellStyle = (el, cell) => {
      el.style.background = '';
      el.style.color = '';
      if (cell === 'free') { el.style.background = 'var(--free-soft)'; el.style.color = 'var(--free)'; }
      else if (cell === 'break') { el.style.background = '#EEEBE3'; }
      else if (cell) {
        const s = A.subjectById(cell);
        if (s) el.style.background = `color-mix(in srgb, ${s.color} 14%, white)`;
      }
    };
    const markSaved = () => { saved.textContent = 'נשמר ✓'; };

    const drawTable = () => {
      const rows = tt.periods.map((period, p) =>
        h('tr', null,
          h('td', { class: 'tt-side' },
            h('div', { class: 'num-row' },
              `שעה ${p + 1}`,
              h('button', { 'aria-label': `מחיקת שעה ${p + 1}`, onclick: () => removePeriod(p) }, '✕')),
            h('div', { class: 'times' },
              h('input', { type: 'time', value: period.start, 'aria-label': `תחילת שעה ${p + 1}`, onchange: (e) => { period.start = e.target.value; A.save('timetable'); markSaved(); } }),
              h('input', { type: 'time', value: period.end, 'aria-label': `סוף שעה ${p + 1}`, onchange: (e) => { period.end = e.target.value; A.save('timetable'); markSaved(); } })
            )
          ),
          A.DAYS.map((dayName, d) => {
            const input = h('input', {
              class: 'cell',
              list: listId,
              value: cellValue(tt.cells[d][p]),
              'aria-label': `יום ${dayName}, שעה ${p + 1}`,
              autocomplete: 'off',
              onchange: (e) => {
                A.setCell(d, p, e.target.value);
                A.save('timetable');
                e.target.value = cellValue(tt.cells[d][p]);
                cellStyle(e.target, tt.cells[d][p]);
                fillList();
                drawSubjects();
                markSaved();
              }
            });
            cellStyle(input, tt.cells[d][p]);
            return h('td', null, input);
          })
        )
      );
      tableHolder.replaceChildren(
        h('div', { class: 'tt-scroll' },
          h('table', { class: 'tt' },
            h('thead', null, h('tr', null,
              h('th', { class: 'tt-side' }, 'שעות'),
              A.DAYS.map((d) => h('th', null, d)))),
            h('tbody', null, rows)
          )
        )
      );
    };

    async function removePeriod(p) {
      const hasContent = A.DAYS.some((_, d) => tt.cells[d][p]);
      if (hasContent && !(await A.confirm(`למחוק את שעה ${p + 1}?`, 'השיעורים בשורה הזאת יימחקו מהמערכת. המחברות נשארות.', 'למחוק', 'לא', true))) return;
      tt.periods.splice(p, 1);
      tt.cells.forEach((day) => day.splice(p, 1));
      A.save('timetable');
      drawTable();
    }

    function drawSubjects() {
      const rows = A.state.subjects.map((s) => {
        const iconBtn = h('button', {
          class: 'icon-btn', 'aria-label': `החלפת אייקון של ${s.name}`,
          onclick: async () => {
            const grid = h('div', { class: 'emoji-grid' });
            const pick = A.modal({ title: `אייקון ל${s.name}`, body: grid, actions: [{ label: 'ביטול' }] });
            A.ICON_CHOICES.forEach((ic) => grid.append(h('button', {
              onclick: (ev) => { s.icon = ic; ev.currentTarget.closest('.overlay').closeModal(); A.save('subjects'); drawSubjects(); }
            }, A.subjectIcon(ic))));
            await pick;
          }
        }, A.subjectIcon(s.icon));
        const color = h('button', {
          class: 'color-dot', style: { background: s.color }, 'aria-label': `החלפת צבע של ${s.name}`,
          onclick: () => {
            const i = A.SUBJECT_COLORS.indexOf(s.color);
            s.color = A.SUBJECT_COLORS[(i + 1) % A.SUBJECT_COLORS.length];
            A.save('subjects');
            drawSubjects();
            drawTable();
          }
        });
        const nameInput = h('input', {
          class: 'input', value: s.name, 'aria-label': 'שם המקצוע',
          onchange: (e) => {
            const v = e.target.value.trim();
            if (v && !A.state.subjects.some((x) => x !== s && x.name === v)) {
              s.name = v;
              A.save('subjects');
              fillList();
              drawTable();
            } else {
              e.target.value = s.name;
            }
          }
        });
        const del = h('button', {
          class: 'btn sm danger', 'aria-label': `מחיקת ${s.name}`,
          onclick: async () => {
            const count = await A.db.countPages(s.id);
            if (count > 0) {
              A.modal({ title: 'יש דפים במחברת', body: `במחברת ${s.name} יש דפים כתובים, ולכן היא נשארת.`, actions: [{ label: 'הבנתי', class: 'primary' }] });
              return;
            }
            if (!(await A.confirm(`למחוק את ${s.name}?`, 'המקצוע יוסר גם מהמערכת.', 'למחוק', 'לא', true))) return;
            tt.cells.forEach((day) => day.forEach((c, i) => { if (c === s.id) day[i] = null; }));
            A.state.subjects = A.state.subjects.filter((x) => x !== s);
            A.save('timetable');
            A.save('subjects');
            fillList();
            drawTable();
            drawSubjects();
          }
        }, '🗑️');
        const paperBtn = h('button', {
          class: 'btn sm',
          'aria-label': `סוג הדף של ${s.name}`,
          onclick: () => {
            s.paper = A.subjectPaper(s) === 'grid' ? 'lines' : 'grid';
            A.save('subjects');
            drawSubjects();
          }
        }, A.subjectPaper(s) === 'grid' ? '▦ משבצות' : '☰ שורות');
        return h('div', { class: 'subj-row' }, iconBtn, color, nameInput, paperBtn, del);
      });
      subjectsHolder.replaceChildren(...(rows.length ? rows : [h('p', { class: 'muted' }, 'מקצועות שתקלידו במערכת יופיעו כאן.')]));
    }

    fillList();
    drawTable();
    drawSubjects();

    body.append(
      params.first && h('div', { class: 'notice', style: { 'margin-bottom': '12px' } },
        h('b', null, 'כמעט סיימנו! '), 'הקלידו את המערכת בטבלה, ואז לחצו על "חזרה" כדי להגיע למסך של הילד.'),
      h('div', { class: 'row', style: { 'margin-bottom': '10px' } },
        h('p', { class: 'spacer small' }, 'מקלידים בכל משבצת את שם המקצוע. לשעה חופשית כותבים ', h('b', null, 'חופשי'), ', ולהפסקה ', h('b', null, 'הפסקה'), '.'),
        saved
      ),
      datalist,
      tableHolder,
      h('div', { class: 'row', style: { 'margin-top': '10px' } },
        h('button', {
          class: 'btn sm',
          onclick: () => {
            const lastP = tt.periods[tt.periods.length - 1];
            tt.periods.push({ start: lastP ? lastP.end : '', end: '' });
            tt.cells.forEach((day) => day.push(null));
            A.save('timetable');
            drawTable();
          }
        }, '➕ עוד שעה'),
        tt.cells.every((day) => day.every((c) => !c)) && h('button', {
          class: 'btn sm',
          onclick: () => { A.fillSampleTimetable(); A.refresh(); }
        }, '✨ למלא מערכת לדוגמה')
      ),
      h('div', { class: 'section-title' }, 'המקצועות'),
      h('p', { class: 'small muted', style: { 'margin-bottom': '6px' } }, 'אפשר להחליף אייקון, צבע, שם וסוג דף (שורות או משבצות). לכל מקצוע יש מחברת משלו.'),
      h('div', { class: 'card' }, subjectsHolder)
    );
  };

  // צפייה במחברות
  PANELS.notebooks = async (body) => {
    const subjects = A.state.subjects;
    if (!subjects.length) {
      body.append(h('div', { class: 'card center' }, 'עדיין אין מחברות.'));
      return;
    }
    const counts = await Promise.all(subjects.map((s) => A.db.countPages(s.id)));
    body.append(
      h('p', { class: 'small muted', style: { 'margin-bottom': '10px' } }, 'צפייה בלבד: אפשר לקרוא, לראות כתב יד ולשמוע הקלטות.'),
      h('div', { class: 'tiles' }, subjects.map((s, i) =>
        h('button', {
          class: 'tile', style: { '--c': s.color },
          onclick: () => A.go('page', { subjectId: s.id, readOnly: true })
        },
          h('span', { class: 'ic', 'aria-hidden': 'true' }, A.subjectIcon(s.icon)),
          s.name,
          h('span', { class: 'sub' }, counts[i] === 1 ? 'דף אחד' : `${counts[i]} דפים`))
      ))
    );
  };

  // נושאים
  PANELS.topics = (body) => {
    const settings = A.state.settings;
    body.append(
      h('p', { class: 'small muted', style: { 'margin-bottom': '10px' } }, 'הילד רואה רק את הנושאים המסומנים. אין חיפוש חופשי באינטרנט.'),
      h('div', { class: 'card' }, window.TOPICS.map((t) =>
        h('div', { class: 'toggle-row' },
          h('input', {
            type: 'checkbox',
            id: `topic-${t.id}`,
            checked: !settings.disabledTopics.includes(t.id),
            onchange: (e) => {
              settings.disabledTopics = settings.disabledTopics.filter((x) => x !== t.id);
              if (!e.target.checked) settings.disabledTopics.push(t.id);
              A.save('settings');
            }
          }),
          h('label', { class: 'body', for: `topic-${t.id}` },
            h('b', { class: 'row', style: { gap: '8px' } }, A.iconImg(t.id, 34), t.title),
            h('div', { class: 'small muted' }, t.blurb)),
          h('button', { class: 'btn sm', onclick: () => A.go('topic', { id: t.id, preview: true }) }, 'לקרוא')
        )
      ))
    );
  };

  // הגדרות
  PANELS.settings = (body) => {
    const settings = A.state.settings;
    const nameInput = h('input', {
      class: 'input', value: settings.childName, 'aria-label': 'שם הילד',
      onchange: (e) => {
        const v = e.target.value.trim();
        if (v) { settings.childName = v; A.save('settings'); A.toast('השם נשמר'); }
      }
    });
    const pinInput = h('input', { class: 'input ltr', type: 'password', inputMode: 'numeric', maxLength: 4, autocomplete: 'new-password', placeholder: '4 ספרות', style: { width: '100%' }, 'aria-label': 'קוד חדש' });

    const installArea = h('div', { class: 'stack' });
    const drawInstall = () => {
      if (A.isInstalled()) {
        installArea.replaceChildren(h('p', null, '✅ האפליקציה מותקנת במכשיר הזה.'));
      } else if (A.installPrompt) {
        installArea.replaceChildren(h('button', {
          class: 'btn primary block',
          onclick: async () => {
            A.installPrompt.prompt();
            await A.installPrompt.userChoice;
            A.installPrompt = null;
            drawInstall();
          }
        }, '📲 להתקין את האפליקציה'));
      } else {
        installArea.replaceChildren(A.installSteps());
      }
      installArea.append(A.offlineStatus());
    };
    drawInstall();

    const shareBtn = location.protocol.startsWith('http') && h('button', {
      class: 'btn sm',
      onclick: async () => {
        const url = location.href.split('#')[0].split('?')[0];
        try {
          if (navigator.share) await navigator.share({ title: 'המחברת החכמה', url });
          else { await navigator.clipboard.writeText(url); A.toast('הקישור הועתק'); }
        } catch (e) { /* המשתמש ביטל */ }
      }
    }, '🔗 שיתוף הקישור עם הורים אחרים');

    const importInput = h('input', {
      type: 'file', accept: 'application/json,.json', hidden: true,
      onchange: async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        if (!(await A.confirm('לשחזר מגיבוי?', 'כל מה שנמצא עכשיו במכשיר יוחלף בתוכן הגיבוי.', 'לשחזר', 'ביטול', true))) return;
        try {
          await restoreBackup(JSON.parse(await file.text()));
          A.toast('הגיבוי שוחזר');
          A.reset('home');
        } catch (err) {
          console.error(err);
          A.modal({ title: 'השחזור נכשל', body: 'הקובץ הזה לא נראה כמו גיבוי של המחברת.', actions: [{ label: 'הבנתי', class: 'primary' }] });
        }
      }
    });

    body.append(
      h('div', { class: 'stack' },
        h('div', { class: 'card stack' },
          h('b', null, 'השם של הילד'),
          nameInput,
          h('b', null, 'קוד הורים חדש'),
          pinInput,
          h('button', {
            class: 'btn sm',
            onclick: () => {
              if (!/^\d{4}$/.test(pinInput.value)) { A.toast('הקוד צריך להיות בן 4 ספרות'); return; }
              settings.pinHash = A.hashPin(pinInput.value);
              A.save('settings');
              pinInput.value = '';
              A.toast('הקוד הוחלף');
            }
          }, 'החלפת קוד')
        ),
        h('div', { class: 'card' },
          h('div', { class: 'toggle-row', style: { 'border-bottom': '0', padding: '0' } },
            h('input', {
              type: 'checkbox', id: 'free-lock', checked: settings.freeTimeLock,
              onchange: (e) => { settings.freeTimeLock = e.target.checked; A.save('settings'); }
            }),
            h('label', { class: 'body', for: 'free-lock' },
              h('b', null, 'שיעור חופשי רק בזמן שלו'),
              h('div', { class: 'small muted' }, 'המשחקים והנושאים נפתחים רק בשעה שמוגדרת במערכת, ונסגרים בסופה.'))
          ),
          h('button', {
            class: 'btn sm block', style: { 'margin-top': '12px' },
            onclick: () => { A.free.enterTest(); A.go('freeHub'); }
          }, '🧪 בדיקה: להיכנס לשיעור חופשי עכשיו')
        ),
        h('div', { class: 'card stack' },
          h('b', null, '🗣️ דיבור במחברת'),
          h('p', { class: 'small muted' }, 'בזמן הקלטה במחברת, המילים נכתבות בדף. הדפדפן שולח את הקול לשירות הזיהוי שלו (ב-Chrome זה Google) כדי להפוך אותו למילים, ולכן צריך אינטרנט. קובץ ההקלטה עצמו נשמר רק במכשיר. בחלק מהמכשירים אי אפשר להקליט ולכתוב בבת אחת, ואז נשמר רק הקול.')
        ),
        h('div', { class: 'card stack' },
          h('b', null, '📲 התקנה ושיתוף'),
          installArea,
          shareBtn,
          h('button', { class: 'btn sm', onclick: () => A.go('deviceCheck') }, '🔍 בדיקת המכשיר')
        ),
        h('div', { class: 'card stack' },
          h('b', null, '💾 גיבוי'),
          h('p', { class: 'small muted' }, 'כל המידע נשמר רק במכשיר הזה. כדאי לשמור גיבוי מדי פעם, וגם לפני מעבר למכשיר אחר.'),
          h('div', { class: 'row' },
            h('button', { class: 'btn sm', onclick: () => saveBackup() }, '⬇️ שמירת גיבוי'),
            h('button', { class: 'btn sm', onclick: () => importInput.click() }, '⬆️ שחזור מגיבוי'),
            importInput)
        ),
        h('div', { class: 'card stack' },
          h('b', null, 'מחיקה'),
          h('button', {
            class: 'btn sm danger',
            onclick: async () => {
              if (!(await A.confirm('למחוק את כל המידע במכשיר?', 'המחברות, ההקלטות, המערכת והנתונים יימחקו ואי אפשר יהיה לשחזר אותם.', 'למחוק הכול', 'ביטול', true))) return;
              for (const s of ['kv', 'pages', 'audio', 'events']) await A.db.clear(s);
              location.reload();
            }
          }, '🗑️ מחיקת כל המידע')
        ),
        h('p', { class: 'small muted center' }, `גרסה ${A.VERSION}`)
      )
    );
  };

  // גיבוי ושחזור
  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

  async function saveBackup() {
    const kv = {};
    for (const key of Object.keys(A.defaults()).concat('quizBest')) {
      const v = await A.db.get('kv', key);
      if (v !== undefined) kv[key] = v;
    }
    const audio = await A.db.all('audio');
    const data = {
      app: 'machberet',
      version: 1,
      createdAt: Date.now(),
      kv,
      pages: await A.db.all('pages'),
      events: await A.db.all('events'),
      audio: await Promise.all(audio.map(async (row) => ({ ...row, blob: await blobToBase64(row.blob) })))
    };
    download(new Blob([JSON.stringify(data)], { type: 'application/json' }), `גיבוי-מחברת-${A.dateKey()}.json`);
  }

  async function restoreBackup(data) {
    if (!data || data.app !== 'machberet' || !data.kv) throw new Error('bad backup');
    const audio = await Promise.all((data.audio || []).map(async (row) => ({ ...row, blob: await (await fetch(row.blob)).blob() })));
    for (const s of ['kv', 'pages', 'audio', 'events']) await A.db.clear(s);
    for (const [k, v] of Object.entries(data.kv)) await A.db.put('kv', v, k);
    for (const p of data.pages || []) await A.db.put('pages', p);
    for (const e of data.events || []) await A.db.put('events', e);
    for (const a of audio) await A.db.put('audio', a);
    await A.loadState();
  }
})();
