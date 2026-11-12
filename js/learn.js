// לימוד נושא חדש: רשימת נושאים מוכנים, כרטיסי קריאה, המחשות חיות וחידון.
(function () {
  const A = window.App;
  const h = A.h;

  A.screens.topics = (root) => {
    const off = A.state.settings.disabledTopics || [];
    const visible = window.TOPICS.filter((t) => !off.includes(t.id));
    const results = A.state.quizBest || {};
    root.append(
      A.topbar({ title: 'ללמוד משהו חדש' }),
      h('div', { class: 'page' },
        h('div', { class: 'tiles' }, visible.map((t) =>
          h('button', {
            class: 'tile',
            style: { '--c': '#157A47' },
            onclick: () => A.go('topic', { id: t.id })
          },
            h('span', { class: 'ic', 'aria-hidden': 'true' }, A.iconImg(t.id)),
            t.title,
            h('span', { class: 'sub' }, t.blurb),
            results[t.id] !== undefined && h('span', { class: 'sub' }, `⭐ ${results[t.id]}/${t.quiz.length}`)
          )
        ))
      )
    );
  };

  A.screens.topic = (root, params) => {
    const topic = window.TOPICS.find((t) => t.id === params.id);
    if (!topic) { A.back(); return undefined; }
    const preview = !!params.preview;
    // הלמידה: בטלפון התמונה במסך מלא והטקסט בכרטיס צף, בטאבלט שוכב זה לצד זה
    const stageSlot = h('div', { class: 'learn-stage' });
    const dots = h('div', { class: 'learn-dots', 'aria-hidden': 'true' });
    const backBtn = h('button', { class: 'learn-back', 'aria-label': 'חזרה לנושאים', onclick: () => A.back() });
    backBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>';
    const head = h('header', { class: 'learn-head' }, backBtn,
      h('div', { class: 'learn-title' }, A.iconImg(topic.id), h('h1', null, topic.title)), dots);
    const steps = h('ol', { class: 'learn-steps', 'aria-label': 'הכרטיסים בנושא' });
    const cardEl = h('article', { class: 'learn-card' });
    const learnView = h('div', { class: 'learn' }, stageSlot, h('div', { class: 'learn-panel' }, head, steps, cardEl));
    const holder = h('div', { class: 'page' });
    const quizView = h('div', { hidden: true }, A.topbar({ title: topic.title }), holder);
    root.append(learnView, quizView);
    const cardSize = new ResizeObserver(() => learnView.style.setProperty('--card-h', `${cardEl.offsetHeight}px`));
    cardSize.observe(cardEl);

    let visit = null;
    if (!preview) {
      A.free.mark('learn');
      visit = A.visit('topic', topic.title, { topicId: topic.id, cardsRead: 1 });
    }
    let furthest = 0;

    // תמונת התלת ממד נשארת במקום, וכל כרטיס מראה בה את מה שכתוב בו
    // הטקסט מופיע מיד, והתמונה נבנית רגע אחר כך, כדי שהמסך לא ייתקע
    const hasFigure = topic.figure === 'space3d' || A.hasScene3D(topic.id);
    let stage = null;
    let currentCard = 0;
    let mountTimer = 0;
    let diagTimer = 0;
    if (hasFigure) {
      stageSlot.append(h('div', { class: 'sp-stage sp-loading' }, 'רגע, מכינים את התמונה... בטאבלט זה יכול לקחת כמה שניות'));
      const fallback = (why) => {
        stageSlot.replaceChildren();
        learnView.classList.add('no-figure');
        stageSlot.append(h('div', { class: 'learn-plain' }, A.iconImg(topic.id), h('p', { class: 'small muted' }, why)));
      };
      mountTimer = setTimeout(() => {
        stageSlot.replaceChildren();
        const started = performance.now();
        try {
          stage = topic.figure === 'space3d' ? A.mountSpace(stageSlot) : A.mountScene(stageSlot, topic.id);
        } catch (err) {
          console.error(err);
          stage = null;
          fallback(`התמונה לא נטענה במכשיר הזה (${err && err.message ? err.message : err}).`);
          return;
        }
        if (!stage) {
          fallback('המכשיר או הדפדפן הזה לא תומכים בתמונות תלת ממד.');
          return;
        }
        if (stage.setScene) stage.setScene(topic.cards[currentCard].scene);
        else stage.setCard(currentCard);
        const buildSec = ((performance.now() - started) / 1000).toFixed(1);
        // אם אחרי כמה שניות עוד לא צוירה תמונה, מראים פרטים כדי שאפשר יהיה להבין מה קרה
        diagTimer = setTimeout(() => {
          if (!stage || !stage.diag) return;
          const d = stage.diag();
          const pr = stage.probe ? stage.probe() : { lit: 1, colors: 9 };
          if (d.frames > 0 && d.w > 0 && d.h > 0 && pr.lit > 0 && pr.colors > 1) return;
          stageSlot.append(h('p', { class: 'learn-diag' },
            `התמונה לא הוצגה. פרטים לשליחה: גרסה ${A.VERSION} · נקודות ${pr.lit}/${pr.colors} · ציורים ${d.frames} · גודל ${d.w}×${d.h} · בנייה ${buildSec} שנ׳ · ${A.lowPower ? 'מצב קל' : 'מצב רגיל'} (${A.benchMs}) · ${d.renderer}`));
        }, 6000);
      }, 60);
    } else {
      learnView.classList.add('no-figure');
      stageSlot.append(h('div', { class: 'learn-plain' }, A.iconImg(topic.id)));
    }
    const total = topic.cards.length;

    function showStage(on) {
      learnView.hidden = !on;
      quizView.hidden = on;
    }

    function drawCard(i) {
      furthest = Math.max(furthest, i);
      if (visit) visit.set({ cardsRead: furthest + 1 });
      showStage(true);
      currentCard = i;
      const card = topic.cards[i];
      const last = i === total - 1;
      if (stage) {
        if (stage.setScene) stage.setScene(card.scene);
        else stage.setCard(i);
      }
      dots.replaceChildren(...topic.cards.map((_, k) => h('i', { class: k <= i ? 'on' : '' })));
      steps.replaceChildren(...topic.cards.map((c, k) => h('li', null,
        h('button', { class: `${k === i ? 'now' : ''} ${k < i ? 'done' : ''}`, 'aria-current': k === i ? 'step' : null, onclick: () => drawCard(k) },
          h('span', { class: 'num', 'aria-hidden': 'true' }, k < i ? '✓' : String(k + 1)), c.title))));
      const prev = h('button', { class: 'learn-prev', 'aria-label': 'הכרטיס הקודם', disabled: i === 0, onclick: () => drawCard(i - 1) });
      prev.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>';
      cardEl.replaceChildren(
        hasFigure ? '' : h('div', { class: 'learn-card-ic', 'aria-hidden': 'true' }, card.icon),
        h('p', { class: 'learn-count' }, `כרטיס ${i + 1} מתוך ${total}`),
        h('h2', null, card.title),
        h('p', { class: 'learn-text' }, card.text),
        h('div', { class: 'learn-nav' },
          prev,
          last
            ? h('button', { class: 'btn good learn-next', onclick: () => startQuiz() }, 'לשחק בחידון')
            : h('button', { class: 'btn primary learn-next', onclick: () => drawCard(i + 1) }, 'הבא ←'))
      );
    }

    function startQuiz() {
      let score = 0;
      const questions = A.shuffle(topic.quiz);
      showStage(false);

      function ask(n) {
        const q = questions[n];
        const right = q.a[0];
        const answers = h('div', { class: 'answers' });
        const feedback = h('div', { hidden: true });
        const nextBtn = h('button', { class: 'btn primary block', hidden: true, style: { 'margin-top': '12px' }, onclick: () => (n + 1 < questions.length ? ask(n + 1) : finish()) },
          n + 1 < questions.length ? 'לשאלה הבאה ←' : 'לתוצאה ←');
        A.shuffle(q.a).forEach((text) => {
          const b = h('button', {
            class: 'btn',
            onclick: () => {
              const ok = text === right;
              if (ok) score++;
              answers.querySelectorAll('button').forEach((x) => {
                x.disabled = true;
                if (x.textContent === right) x.classList.add('right');
              });
              if (!ok) b.classList.add('wrong');
              feedback.className = `feedback ${ok ? 'ok' : 'no'}`;
              feedback.textContent = `${ok ? '✅ נכון!' : `💡 התשובה: ${right}.`} ${q.why}`;
              feedback.hidden = false;
              nextBtn.hidden = false;
            }
          }, text);
          answers.append(b);
        });
        window.scrollTo(0, 0);
        holder.replaceChildren(
          h('div', { class: 'progress', 'aria-hidden': 'true' }, h('i', { style: { width: `${((n + 1) / questions.length) * 100}%` } })),
          h('p', { class: 'small muted' }, `שאלה ${n + 1} מתוך ${questions.length}`),
          h('h2', { style: { 'font-size': '24px', 'line-height': '1.3' } }, q.q),
          answers,
          feedback,
          nextBtn
        );
      }

      function finish() {
        const count = questions.length;
        const stars = score === count ? 3 : score >= count * 0.6 ? 2 : score > 0 ? 1 : 0;
        if (visit) visit.set({ quiz: `${score}/${count}`, score, total: count });
        if (!preview) {
          const best = A.state.quizBest || {};
          if (best[topic.id] === undefined || score > best[topic.id]) {
            best[topic.id] = score;
            A.state.quizBest = best;
            A.save('quizBest');
          }
        }
        holder.replaceChildren(
          h('div', { class: 'card reader' },
            h('div', { class: 'stars', 'aria-label': `${stars} כוכבים` }, stars ? '⭐'.repeat(stars) : '🌱'),
            h('h2', null, `${score} תשובות נכונות מתוך ${count}`),
            h('p', null, score === count ? 'מושלם! כל הכבוד!' : score >= count * 0.6 ? 'יפה מאוד!' : 'אפשר לקרוא שוב ולנסות עוד פעם.')),
          h('div', { class: 'stack', style: { 'margin-top': '12px' } },
            h('button', { class: 'btn primary block', onclick: () => A.back() }, '📚 לנושא אחר'),
            h('button', { class: 'btn block', onclick: () => startQuiz() }, '🔄 עוד פעם בחידון'),
            h('button', { class: 'btn block', onclick: () => drawCard(0) }, '📖 לקרוא שוב'))
        );
      }

      ask(0);
    }

    drawCard(0);
    return () => {
      if (visit) visit.end();
      cardSize.disconnect();
      clearTimeout(mountTimer);
      clearTimeout(diagTimer);
      if (stage) stage.destroy();
    };
  };
})();
