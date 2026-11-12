// הפעלת האפליקציה.
(function () {
  const A = window.App;

  A.installPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    A.installPrompt = e;
  });
  // הוראות התקנה לפי המכשיר והדפדפן
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isSamsung = /SamsungBrowser/.test(ua);
  const isAndroid = /Android/.test(ua);
  A.installSteps = () => {
    const h = A.h;
    if (isIOS) {
      return h('div', { class: 'stack' },
        h('p', null, h('b', null, 'באייפד או אייפון: '), 'פותחים את הקישור בדפדפן Safari (לא בכרום), לוחצים על כפתור השיתוף (ריבוע עם חץ למעלה), ובוחרים "הוספה למסך הבית".'),
        h('p', { class: 'small muted' }, 'באייפד אין חלון התקנה אוטומטי. זה בסדר: אחרי "הוספה למסך הבית" יופיע אייקון המחברת.'));
    }
    if (isSamsung) return h('p', null, h('b', null, 'בדפדפן של סמסונג: '), 'פותחים את התפריט (שלושה קווים למטה), בוחרים "הוסף דף אל", ואז "מסך הבית".');
    if (isAndroid) return h('div', { class: 'stack' },
      h('p', null, h('b', null, 'באנדרואיד: '), 'פותחים את הקישור בדפדפן Chrome (לא מקובץ שהורד), פותחים את התפריט (שלוש הנקודות למעלה), ובוחרים "התקנת אפליקציה". אם מופיע רק "הוספה למסך הבית", בוחרים בו ואז "התקנה" (ולא "קיצור דרך").'),
      h('p', { class: 'small muted' }, 'אם על האייקון יש סמל קטן של כרום, או שהוא נפתח בתוך כרום, זה קיצור דרך ולא אפליקציה. אפשר למחוק אותו ולהתקין שוב. בטאבלטים בלי חנות Google Play אפשר רק קיצור דרך.'));
    return h('p', null, h('b', null, 'במחשב: '), 'ב-Chrome או ב-Edge לוחצים על סמל ההתקנה בשורת הכתובת, או בוחרים בתפריט "התקנת האפליקציה".');
  };
  // האם המחברת שמורה במכשיר ויכולה להיפתח בלי אינטרנט
  A.offlineStatus = () => {
    const h = A.h;
    const line = h('p', { class: 'small' }, 'בודקים אם המחברת מוכנה לעבוד בלי אינטרנט...');
    (async () => {
      let ready = false;
      try {
        ready = !!(navigator.serviceWorker && navigator.serviceWorker.controller) && (await caches.keys()).length > 0;
      } catch (e) { ready = false; }
      if (!location.protocol.startsWith('http')) line.textContent = 'המחברת נפתחה מקובץ, ולכן לא תעבוד בלי אינטרנט. צריך לפתוח אותה מהקישור.';
      else line.textContent = ready
        ? '✅ המחברת שמורה במכשיר ותיפתח גם בלי אינטרנט.'
        : '⏳ המחברת עוד לא שמורה במכשיר. צריך לפתוח אותה פעם אחת עם אינטרנט, ולרענן את הדף.';
    })();
    return line;
  };

  A.isInstalled = () =>
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  // בזמן פיתוח על המחשב לא נרשם עובד רקע, אלא אם מוסיפים לכתובת ?sw=1
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && (!isLocal || location.search.includes('sw=1'))) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(console.error));
    const hadWorker = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadWorker && !reloaded) { reloaded = true; location.reload(); }
    });
  }

  A.loadState()
    .then(() => {
      A.state.quizBest = A.state.quizBest || null;
      return A.db.get('kv', 'quizBest');
    })
    .then((best) => {
      A.state.quizBest = best || {};
      A.reset(A.state.settings.setupDone ? 'home' : 'setup');
    })
    .catch((err) => {
      console.error(err);
      document.getElementById('app').textContent = 'לא הצלחנו לפתוח את שמירת הנתונים בדפדפן הזה. אם זה חלון גלישה פרטית, כדאי לפתוח חלון רגיל.';
    });
})();
