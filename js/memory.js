// משחק הזיכרון: לבד או מול חבר.
(function () {
  const A = window.App;
  const h = A.h;

  const THEMES = [
    ['🐶', '🐱', '🦊', '🐻', '🐼', '🐸', '🐵', '🦁', '🐯', '🐨', '🐰', '🐷'],
    ['🍎', '🍌', '🍇', '🍉', '🍓', '🍒', '🍍', '🥝', '🍑', '🍋', '🥕', '🌽'],
    ['🚗', '🚀', '✈️', '🚲', '🚂', '⛵', '🚁', '🚜', '🚒', '🚌', '🛴', '🏍️'],
    ['⚽', '🏀', '🎾', '🏐', '🎈', '🎲', '🧩', '🎸', '🎨', '🪁', '🔭', '🎯']
  ];
  const SIZES = [
    { pairs: 6, label: 'קל', cols: 4, sub: '12 קלפים' },
    { pairs: 8, label: 'בינוני', cols: 4, sub: '16 קלפים' },
    { pairs: 12, label: 'קשה', cols: 6, sub: '24 קלפים' }
  ];

  A.screens.memory = (root) => {
    const holder = h('div', { class: 'page' });
    root.append(A.topbar({ title: 'משחק הזיכרון' }), holder);
    let mounted = true;
    let visit = null;
    let flipTimer = null;
    const childName = A.state.settings.childName;

    function drawSetup() {
      let mode = 'solo';
      const modeRow = h('div', { class: 'choice-grid' });
      const drawMode = () => modeRow.replaceChildren(
        h('button', { class: `btn ${mode === 'solo' ? 'on' : ''}`, style: { 'min-height': '76px' }, onclick: () => { mode = 'solo'; drawMode(); } }, '🙂 לבד'),
        h('button', { class: `btn ${mode === 'friend' ? 'on' : ''}`, style: { 'min-height': '76px' }, onclick: () => { mode = 'friend'; drawMode(); } }, '👫 מול חבר')
      );
      drawMode();
      holder.replaceChildren(
        h('div', { class: 'section-title', style: { 'margin-top': '0' } }, 'עם מי משחקים?'),
        modeRow,
        h('div', { class: 'section-title' }, 'לבחור רמה ולהתחיל'),
        h('div', { class: 'choice-grid' }, SIZES.map((size) =>
          h('button', {
            class: 'btn primary',
            style: { 'min-height': '84px', 'flex-direction': 'column', gap: '0', 'font-size': '21px' },
            onclick: () => play(mode, size)
          }, size.label, h('span', { class: 'small', style: { 'font-weight': '400' } }, size.sub))
        ))
      );
    }

    function play(mode, size) {
      if (visit) visit.end();
      visit = A.visit('memory', 'משחק הזיכרון', { mode, pairs: size.pairs, result: 'unfinished' });
      const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
      const faces = A.shuffle(theme).slice(0, size.pairs);
      const deck = A.shuffle([...faces, ...faces]).map((face, i) => ({ i, face, up: false, done: false }));
      const players = mode === 'friend' ? [{ name: childName, score: 0 }, { name: 'חבר', score: 0 }] : [{ name: childName, score: 0 }];
      let turn = 0;
      let open = [];
      let tries = 0;
      let started = false;
      let busy = false;
      let found = 0;

      const scores = h('div', { class: 'scores' });
      const cols = size.pairs === 12 && window.innerWidth < window.innerHeight ? 4 : size.cols;
      const rows = Math.ceil(deck.length / cols);
      const grid = h('div', {
        class: 'mem-grid',
        style: { 'grid-template-columns': `repeat(${cols}, 1fr)`, '--ratio': String(cols / rows) }
      });

      const buttons = deck.map((card) => {
        const btn = h('button', {
          class: 'mem-card',
          'aria-label': `קלף ${card.i + 1}`,
          onclick: () => flip(card)
        }, h('span', { class: 'mem-inner' },
          h('span', { class: 'mem-face mem-back', 'aria-hidden': 'true' }, '?'),
          h('span', { class: 'mem-face mem-front' }, card.face)));
        grid.append(btn);
        return btn;
      });
      const sync = (card) => {
        const b = buttons[card.i];
        b.classList.toggle('up', card.up);
        b.classList.toggle('done', card.done);
      };

      const drawScores = () => {
        if (mode === 'solo') {
          scores.replaceChildren(
            h('div', { class: 'score' }, h('b', null, found), `זוגות מתוך ${size.pairs}`),
            h('div', { class: 'score' }, h('b', null, tries), 'ניסיונות')
          );
        } else {
          scores.replaceChildren(...players.map((p, i) =>
            h('div', { class: `score ${i === turn ? 'on' : ''}` }, h('b', null, p.score), `${i === turn ? '👉 ' : ''}${p.name}`)
          ));
        }
      };

      function endGame() {
        let title, result;
        if (mode === 'solo') {
          title = `🎉 סיימת ב-${tries} ניסיונות!`;
          result = `${tries} ניסיונות`;
        } else if (players[0].score === players[1].score) {
          title = '🤝 תיקו!';
          result = `תיקו ${players[0].score}:${players[1].score}`;
        } else {
          const winner = players[0].score > players[1].score ? players[0] : players[1];
          title = `🏆 הניצחון של ${winner.name}!`;
          if (winner === players[0]) result = `ניצחון ${players[0].score}:${players[1].score}`;
          else result = `הפסד ${players[0].score}:${players[1].score}`;
        }
        visit.set({ result });
        A.modal({
          title,
          body: 'משחק יפה!',
          actions: [{ label: 'עוד משחק', class: 'primary', value: 'again' }, { label: 'סיום', value: 'done' }]
        }).then((v) => {
          if (!mounted) return;
          if (v === 'again') drawSetup();
          else if (v === 'done') A.back();
        });
      }

      function flip(card) {
        if (busy || card.up || card.done) return;
        if (!started) {
          started = true;
          A.free.mark('memory');
        }
        card.up = true;
        sync(card);
        open.push(card);
        if (open.length < 2) return;
        tries++;
        const [a, b] = open;
        open = [];
        if (a.face === b.face) {
          a.done = b.done = true;
          sync(a); sync(b);
          found++;
          players[turn].score++;
          drawScores();
          if (found === size.pairs) setTimeout(() => { if (mounted) endGame(); }, 450);
        } else {
          busy = true;
          drawScores();
          flipTimer = setTimeout(() => {
            if (!mounted) return;
            a.up = b.up = false;
            sync(a); sync(b);
            busy = false;
            if (mode === 'friend') turn = 1 - turn;
            drawScores();
          }, 1000);
        }
      }

      drawScores();
      holder.replaceChildren(scores, grid);
    }

    drawSetup();
    return () => {
      mounted = false;
      clearTimeout(flipTimer);
      if (visit) visit.end();
    };
  };
})();
