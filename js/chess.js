// מסך השחמט: מול המחשב או מול חבר שיושב מול הלוח.
(function () {
  const A = window.App;
  const h = A.h;
  const E = window.ChessEngine;

  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟︎' };
  const glyph = (p) => GLYPH[p.toLowerCase()];

  let saved = null; // משחק שלא הסתיים, כדי שאפשר יהיה לחזור אליו

  const LEVEL_NAMES = { 1: 'קל', 2: 'בינוני', 3: 'חזק' };

  function newGame(mode, level) {
    const state = E.initial();
    return {
      mode, level, state,
      history: [],
      positions: { [E.positionKey(state)]: 1 },
      sel: -1,
      last: null,
      over: null,
      moved: false
    };
  }

  A.screens.chess = (root) => {
    let game = null;
    let visit = null;
    let mounted = true;
    let thinking = false;
    const holder = h('div', { class: 'page' });

    root.append(A.topbar({ title: 'שחמט' }), holder);

    function drawSetup() {
      const start = (mode, level) => {
        game = newGame(mode, level);
        beginVisit();
        drawGame();
      };
      holder.replaceChildren(
        saved && h('button', {
          class: 'btn good block',
          style: { 'margin-bottom': '14px' },
          onclick: () => { game = saved; game.moved = false; beginVisit(); drawGame(); }
        }, '▶️ להמשיך את המשחק הקודם'),
        h('div', { class: 'section-title', style: { 'margin-top': '0' } }, '👫 מול חבר'),
        h('button', { class: 'btn primary block', style: { 'min-height': '84px', 'font-size': '22px' }, onclick: () => start('friend') }, 'משחקים שניים על אותו מסך'),
        h('p', { class: 'small muted', style: { 'margin-top': '6px' } }, 'מניחים את המכשיר בין השחקנים. הכלים השחורים הפוכים, כדי שהחבר שיושב ממול יראה אותם ישר.'),
        h('div', { class: 'section-title' }, '🤖 מול המחשב'),
        h('div', { class: 'choice-grid' },
          [1, 2, 3].map((lv) => h('button', { class: 'btn', style: { 'min-height': '76px', 'font-size': '20px' }, onclick: () => start('computer', lv) }, LEVEL_NAMES[lv]))
        )
      );
    }

    function beginVisit() {
      if (visit) visit.end();
      visit = A.visit('chess', 'שחמט', { mode: game.mode, level: game.level || null, result: 'unfinished' });
    }

    function statusText() {
      const s = game.state;
      if (game.over) return game.over.text;
      const check = E.inCheck(s);
      if (game.mode === 'computer') {
        if (s.turn === 'b') return 'המחשב חושב… 🤔';
        return check ? '⚠️ שח! צריך להציל את המלך' : 'התור שלך: כלים לבנים';
      }
      const who = s.turn === 'w' ? 'לבן' : 'שחור';
      return check ? `⚠️ שח! התור של ${who}` : `התור של ${who}`;
    }

    function finish(result, text) {
      game.over = { result, text };
      saved = null;
      if (visit) visit.set({ result });
      setTimeout(() => {
        if (!mounted) return;
        A.modal({
          title: text,
          body: result === 'win' ? 'כל הכבוד! 🎉' : result === 'loss' ? 'משחק יפה! בפעם הבאה 💪' : 'משחק יפה! 👏',
          actions: [{ label: 'משחק חדש', class: 'primary', value: 'again' }, { label: 'סיום', value: 'done' }]
        }).then((v) => {
          if (!mounted) return;
          if (v === 'again') { game = null; drawSetup(); }
          else if (v === 'done') A.back();
        });
      }, 500);
    }

    function checkEnd() {
      const s = game.state;
      const st = E.status(s);
      const key = E.positionKey(s);
      game.positions[key] = (game.positions[key] || 0) + 1;
      if (st === 'checkmate') {
        const whiteWon = s.turn === 'b';
        if (game.mode === 'computer') finish(whiteWon ? 'win' : 'loss', whiteWon ? '🏆 ניצחון! מט!' : 'מט: המחשב ניצח');
        else finish(whiteWon ? 'white' : 'black', `🏆 מט! ${whiteWon ? 'לבן' : 'שחור'} ניצח`);
        return true;
      }
      const drawText = { stalemate: 'תיקו: אין מהלכים (פט)', insufficient: 'תיקו: לא נשארו מספיק כלים', fifty: 'תיקו: 50 מהלכים בלי שינוי' }[st];
      if (drawText) { finish('draw', drawText); return true; }
      if (game.positions[key] >= 3) { finish('draw', 'תיקו: אותו מצב חזר 3 פעמים'); return true; }
      return false;
    }

    function play(move) {
      if (!game.moved) {
        game.moved = true;
        A.free.mark('chess');
      }
      game.history.push({ state: game.state, last: game.last, key: E.positionKey(game.state) });
      game.state = E.apply(game.state, move);
      game.last = { from: move.from, to: move.to };
      game.sel = -1;
      saved = game;
      const ended = checkEnd();
      drawGame();
      if (!ended && game.mode === 'computer' && game.state.turn === 'b') computerMove();
    }

    function computerMove() {
      thinking = true;
      const g = game;
      setTimeout(() => {
        if (!mounted || g !== game) { thinking = false; return; }
        const m = E.bestMove(g.state, g.level);
        thinking = false;
        if (m) play(m);
      }, 350);
    }

    function undo() {
      if (thinking || game.over || !game.history.length) return;
      const steps = game.mode === 'computer' ? 2 : 1;
      for (let i = 0; i < steps && game.history.length; i++) {
        const key = E.positionKey(game.state);
        game.positions[key] = Math.max(0, (game.positions[key] || 1) - 1);
        const prev = game.history.pop();
        game.state = prev.state;
        game.last = prev.last;
      }
      game.sel = -1;
      drawGame();
    }

    async function choosePromotion(white) {
      const pieces = white ? ['Q', 'R', 'B', 'N'] : ['q', 'r', 'b', 'n'];
      return new Promise((resolve) => {
        const grid = h('div', { class: 'promo' }, pieces.map((p) =>
          h('button', {
            'aria-label': { q: 'מלכה', r: 'צריח', b: 'רץ', n: 'פרש' }[p.toLowerCase()],
            onclick: (e) => { e.currentTarget.closest('.overlay').closeModal(); resolve(p); }
          }, h('span', { class: `pc ${white ? 'w' : 'b'}` }, glyph(p)))
        ));
        A.modal({ title: 'הגעת לקצה! לאיזה כלי להפוך?', body: grid, dismissable: false });
      });
    }

    async function tap(i) {
      if (game.over || thinking) return;
      const s = game.state;
      if (game.mode === 'computer' && s.turn === 'b') return;
      const piece = s.b[i];
      const mine = piece && E.isWhite(piece) === (s.turn === 'w');
      if (game.sel >= 0) {
        const options = E.legalMoves(s).filter((m) => m.from === game.sel && m.to === i);
        if (options.length) {
          let move = options[0];
          if (move.promo) {
            const p = await choosePromotion(s.turn === 'w');
            if (!mounted) return;
            move = options.find((m) => m.promo === p);
          }
          play(move);
          return;
        }
      }
      game.sel = mine && i !== game.sel ? i : -1;
      drawGame();
    }

    function drawGame() {
      const s = game.state;
      const moves = game.sel >= 0 ? E.legalMoves(s).filter((m) => m.from === game.sel) : [];
      const targets = new Set(moves.map((m) => m.to));
      const checkSq = E.inCheck(s) ? E.kingSquare(s.b, s.turn === 'w') : -1;
      const board = h('div', { class: 'board', role: 'grid', 'aria-label': 'לוח שחמט' });
      for (let i = 0; i < 64; i++) {
        const dark = ((i >> 3) + (i & 7)) % 2 === 1;
        const p = s.b[i];
        const cls = ['sq', dark ? 'dark' : 'light'];
        if (game.last && (game.last.from === i || game.last.to === i)) cls.push('last');
        if (game.sel === i) cls.push('sel');
        if (checkSq === i) cls.push('check');
        if (targets.has(i)) cls.push('target', p || moves.some((m) => m.to === i && m.enPassant) ? 'capture' : '');
        const white = p && E.isWhite(p);
        board.append(h('button', {
          class: cls.filter(Boolean).join(' '),
          'aria-label': `${E.sqName(i)}${p ? ` ${p}` : ''}`,
          onclick: () => tap(i)
        }, p && h('span', { class: `pc ${white ? 'w' : 'b'} ${game.mode === 'friend' && !white ? 'flip' : ''}` }, glyph(p))));
      }
      const status = game.over ? 'chess-status' : `chess-status ${E.inCheck(s) ? 'alert' : ''}`;
      holder.replaceChildren(
        h('div', { class: 'chess-wrap' },
          h('div', { class: status, role: 'status' }, statusText()),
          board,
          h('div', { class: 'row', style: { 'margin-top': '10px' } },
            h('button', { class: 'btn sm', style: { flex: '1' }, disabled: !game.history.length || !!game.over || thinking, onclick: undo }, '↩️ ביטול מהלך'),
            h('button', {
              class: 'btn sm', style: { flex: '1' },
              onclick: async () => {
                if (game.over || !game.history.length || await A.confirm('להתחיל משחק חדש?', 'המשחק הזה ייעלם.', 'כן', 'לא')) {
                  saved = null;
                  game = null;
                  drawSetup();
                }
              }
            }, '🔄 משחק חדש')
          ),
          game.mode === 'computer' && h('p', { class: 'small muted center', style: { 'margin-top': '6px' } }, `רמה: ${LEVEL_NAMES[game.level]}`)
        )
      );
    }

    drawSetup();
    return () => {
      mounted = false;
      if (visit) visit.end();
    };
  };
})();
