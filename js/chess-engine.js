// מנוע שחמט: כל חוקי המשחק ויריב מחשב ברמות שונות.
// הלוח הוא מערך של 64 משבצות: 0 היא a8 ו-63 היא h1. אות גדולה = לבן, אות קטנה = שחור.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChessEngine = factory();
})(this, function () {
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const isWhite = (p) => p >= 'A' && p <= 'Z';
  const sqName = (i) => 'abcdefgh'[i & 7] + (8 - (i >> 3));
  const sqIndex = (n) => (8 - Number(n[1])) * 8 + 'abcdefgh'.indexOf(n[0]);

  function fromFEN(fen) {
    const [board, turn, castle, ep, half, full] = fen.split(' ');
    const b = [];
    for (const ch of board) {
      if (ch === '/') continue;
      if (ch >= '1' && ch <= '8') for (let i = 0; i < Number(ch); i++) b.push('');
      else b.push(ch);
    }
    return {
      b,
      turn,
      castle: castle === '-' ? '' : castle,
      ep: ep === '-' ? -1 : sqIndex(ep),
      half: Number(half) || 0,
      full: Number(full) || 1
    };
  }
  const initial = () => fromFEN(START);

  const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const BISHOP = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const ROOK = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const onBoard = (r, f) => r >= 0 && r < 8 && f >= 0 && f < 8;

  function attacked(b, sq, byWhite) {
    const r = sq >> 3, f = sq & 7;
    const pawn = byWhite ? 'P' : 'p';
    const pr = byWhite ? r + 1 : r - 1;
    for (const df of [-1, 1]) {
      if (onBoard(pr, f + df) && b[pr * 8 + f + df] === pawn) return true;
    }
    const knight = byWhite ? 'N' : 'n';
    for (const [dr, df] of KNIGHT) {
      if (onBoard(r + dr, f + df) && b[(r + dr) * 8 + f + df] === knight) return true;
    }
    const king = byWhite ? 'K' : 'k';
    for (const [dr, df] of KING) {
      if (onBoard(r + dr, f + df) && b[(r + dr) * 8 + f + df] === king) return true;
    }
    const queen = byWhite ? 'Q' : 'q';
    const bishop = byWhite ? 'B' : 'b';
    const rook = byWhite ? 'R' : 'r';
    for (const [dirs, slider] of [[BISHOP, bishop], [ROOK, rook]]) {
      for (const [dr, df] of dirs) {
        let nr = r + dr, nf = f + df;
        while (onBoard(nr, nf)) {
          const p = b[nr * 8 + nf];
          if (p) {
            if (p === slider || p === queen) return true;
            break;
          }
          nr += dr; nf += df;
        }
      }
    }
    return false;
  }

  const kingSquare = (b, white) => b.indexOf(white ? 'K' : 'k');
  const inCheck = (s, white = s.turn === 'w') => attacked(s.b, kingSquare(s.b, white), !white);

  function pseudo(s) {
    const moves = [];
    const white = s.turn === 'w';
    const b = s.b;
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (!p || isWhite(p) !== white) continue;
      const r = i >> 3, f = i & 7;
      const type = p.toLowerCase();
      if (type === 'p') {
        const dir = white ? -1 : 1;
        const startRank = white ? 6 : 1;
        const lastRank = white ? 0 : 7;
        const push = (to) => {
          if ((to >> 3) === lastRank) {
            for (const q of 'qrbn') moves.push({ from: i, to, promo: white ? q.toUpperCase() : q });
          } else moves.push({ from: i, to });
        };
        const one = (r + dir) * 8 + f;
        if (onBoard(r + dir, f) && !b[one]) {
          push(one);
          const two = (r + 2 * dir) * 8 + f;
          if (r === startRank && !b[two]) moves.push({ from: i, to: two, double: true });
        }
        for (const df of [-1, 1]) {
          if (!onBoard(r + dir, f + df)) continue;
          const to = (r + dir) * 8 + f + df;
          if (b[to] && isWhite(b[to]) !== white) push(to);
          else if (to === s.ep) moves.push({ from: i, to, enPassant: true });
        }
      } else if (type === 'n' || type === 'k') {
        for (const [dr, df] of type === 'n' ? KNIGHT : KING) {
          if (!onBoard(r + dr, f + df)) continue;
          const to = (r + dr) * 8 + f + df;
          if (!b[to] || isWhite(b[to]) !== white) moves.push({ from: i, to });
        }
      } else {
        const dirs = type === 'b' ? BISHOP : type === 'r' ? ROOK : BISHOP.concat(ROOK);
        for (const [dr, df] of dirs) {
          let nr = r + dr, nf = f + df;
          while (onBoard(nr, nf)) {
            const to = nr * 8 + nf;
            if (!b[to]) moves.push({ from: i, to });
            else {
              if (isWhite(b[to]) !== white) moves.push({ from: i, to });
              break;
            }
            nr += dr; nf += df;
          }
        }
      }
    }
    // הצרחה
    const kingFrom = white ? 60 : 4;
    if (b[kingFrom] === (white ? 'K' : 'k') && !attacked(b, kingFrom, !white)) {
      const rook = white ? 'R' : 'r';
      if (s.castle.includes(white ? 'K' : 'k') && b[kingFrom + 3] === rook &&
          !b[kingFrom + 1] && !b[kingFrom + 2] &&
          !attacked(b, kingFrom + 1, !white) && !attacked(b, kingFrom + 2, !white)) {
        moves.push({ from: kingFrom, to: kingFrom + 2, castle: 'k' });
      }
      if (s.castle.includes(white ? 'Q' : 'q') && b[kingFrom - 4] === rook &&
          !b[kingFrom - 1] && !b[kingFrom - 2] && !b[kingFrom - 3] &&
          !attacked(b, kingFrom - 1, !white) && !attacked(b, kingFrom - 2, !white)) {
        moves.push({ from: kingFrom, to: kingFrom - 2, castle: 'q' });
      }
    }
    return moves;
  }

  const CASTLE_LOSS = { 60: 'KQ', 63: 'K', 56: 'Q', 4: 'kq', 7: 'k', 0: 'q' };

  function apply(s, m) {
    const b = s.b.slice();
    const p = b[m.from];
    const captured = b[m.to];
    b[m.to] = m.promo || p;
    b[m.from] = '';
    if (m.enPassant) b[m.to + (s.turn === 'w' ? 8 : -8)] = '';
    if (m.castle === 'k') { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = ''; }
    if (m.castle === 'q') { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = ''; }
    let castle = s.castle;
    if (castle) {
      for (const sq of [m.from, m.to]) {
        const lost = CASTLE_LOSS[sq];
        if (lost) for (const c of lost) castle = castle.replace(c, '');
      }
    }
    const isPawn = p === 'P' || p === 'p';
    return {
      b,
      turn: s.turn === 'w' ? 'b' : 'w',
      castle,
      ep: m.double ? (m.from + m.to) / 2 : -1,
      half: isPawn || captured || m.enPassant ? 0 : s.half + 1,
      full: s.full + (s.turn === 'b' ? 1 : 0)
    };
  }

  function legalMoves(s) {
    const white = s.turn === 'w';
    return pseudo(s).filter((m) => {
      const n = apply(s, m);
      return !attacked(n.b, kingSquare(n.b, white), !white);
    });
  }

  function insufficient(b) {
    const minors = [];
    for (const p of b) {
      if (!p || p === 'K' || p === 'k') continue;
      if (p === 'B' || p === 'b' || p === 'N' || p === 'n') minors.push(p);
      else return false;
    }
    return minors.length <= 1;
  }

  // מצב המשחק: playing / checkmate / stalemate / insufficient / fifty
  function status(s) {
    if (legalMoves(s).length === 0) return inCheck(s) ? 'checkmate' : 'stalemate';
    if (insufficient(s.b)) return 'insufficient';
    if (s.half >= 100) return 'fifty';
    return 'playing';
  }

  const positionKey = (s) => `${s.b.map((p) => p || '.').join('')}${s.turn}${s.castle}${s.ep}`;

  // יריב מחשב
  const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  function evaluate(s) {
    let score = 0;
    for (let i = 0; i < 64; i++) {
      const p = s.b[i];
      if (!p) continue;
      const white = isWhite(p);
      const type = p.toLowerCase();
      const r = i >> 3, f = i & 7;
      let v = VALUE[type];
      const center = 3.5 - Math.max(Math.abs(r - 3.5), Math.abs(f - 3.5));
      if (type === 'n' || type === 'b') v += center * 8;
      if (type === 'p') v += (white ? 6 - r : r - 1) * 6 + (f === 3 || f === 4 ? center * 4 : 0);
      if (type === 'k') v -= center * 6;
      score += white ? v : -v;
    }
    return s.turn === 'w' ? score : -score;
  }

  const MATE = 100000;
  function negamax(s, depth, alpha, beta, ply) {
    const moves = legalMoves(s);
    if (!moves.length) return inCheck(s) ? -MATE + ply : 0;
    if (s.half >= 100) return 0;
    if (depth === 0) return evaluate(s);
    moves.sort((a, b) => (s.b[b.to] ? 1 : 0) - (s.b[a.to] ? 1 : 0));
    let best = -Infinity;
    for (const m of moves) {
      const score = -negamax(apply(s, m), depth - 1, -beta, -alpha, ply + 1);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  // level: 1 קל, 2 בינוני, 3 חזק
  function bestMove(s, level = 2, rnd = Math.random) {
    const moves = legalMoves(s);
    if (!moves.length) return null;
    const depth = level === 1 ? 1 : level === 2 ? 2 : 3;
    const noise = level === 1 ? 180 : level === 2 ? 30 : 6;
    let best = null;
    let bestScore = -Infinity;
    for (const m of moves) {
      const score = -negamax(apply(s, m), depth - 1, -Infinity, Infinity, 1) + rnd() * noise;
      if (score > bestScore) { bestScore = score; best = m; }
    }
    return best;
  }

  function perft(s, depth) {
    if (depth === 0) return 1;
    let n = 0;
    for (const m of legalMoves(s)) n += perft(apply(s, m), depth - 1);
    return n;
  }

  return { initial, fromFEN, legalMoves, apply, inCheck, status, positionKey, bestMove, perft, kingSquare, isWhite, sqName, sqIndex };
});
