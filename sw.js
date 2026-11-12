// עובד הרקע של האפליקציה: שומר את כל הקבצים במכשיר כדי שהמחברת תיפתח גם בלי אינטרנט.
// אחרי כל שינוי בקבצים צריך להעלות את מספר הגרסה, כדי שהמכשירים יקבלו את העדכון.
const VERSION = 'machberet-v17';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'fonts/heebo-hebrew-wght-normal.woff2',
  'fonts/heebo-latin-wght-normal.woff2',
  'js/chess-engine.js',
  'js/free-rule.js',
  'js/topics-data.js',
  'js/core.js',
  'js/store.js',
  'js/child.js',
  'js/notebook.js',
  'js/free.js',
  'js/chess.js',
  'js/memory.js',
  'js/space3d.js',
  'js/scene3d.js',
  'js/scenes/living.js',
  'js/scenes/body.js',
  'js/scenes/earth.js',
  'js/scenes/volcano.js',
  'js/scenes/made.js',
  'js/learn.js',
  'js/parent.js',
  'js/check.js',
  'js/app.js',
  'icons/ui/learn.png',
  'icons/ui/memory.png',
  'icons/ui/chess.png',
  'icons/ui/notebook.png',
  'icons/ui/space.svg',
  'icons/ui/body.svg',
  'icons/ui/bees.svg',
  'icons/ui/volcano.svg',
  'icons/ui/oceans.svg',
  'icons/ui/inventions.svg',
  'icons/ui/computers.svg',
  'icons/ui/weather.svg',
  'icons/ui/calendar.svg',
  'icons/ui/free.svg',
  'icons/ui/subj-book.svg',
  'icons/ui/subj-redbook.svg',
  'icons/ui/subj-openbook.svg',
  'icons/ui/subj-math.svg',
  'icons/ui/subj-abc.svg',
  'icons/ui/subj-microscope.svg',
  'icons/ui/subj-scroll.svg',
  'icons/ui/subj-ball.svg',
  'icons/ui/subj-palette.svg',
  'icons/ui/subj-music.svg',
  'icons/ui/subj-globe.svg',
  'icons/ui/subj-history.svg',
  'icons/ui/subj-talk.svg',
  'icons/ui/subj-pencil.svg',
  'icons/ui/subj-masks.svg',
  'icons/ui/subj-sprout.svg',
  'icons/ui/subj-flask.svg',
  'icons/ui/subj-ruler.svg',
  'icons/ui/subj-abacus.svg',
  'icons/ui/subj-map.svg',
  'icons/ui/subj-synagogue.svg',
  'icons/ui/subj-mic.svg',
  'icons/ui/subj-puzzle.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION)
    .then((c) => Promise.all(FILES.map((f) => c.add(f).catch(() => null))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// קבצי האפליקציה עצמה (דף, קוד ועיצוב) נטענים קודם מהרשת, כדי שעדכון ייכנס כבר בפתיחה הראשונה.
// בלי אינטרנט, או כשהרשת איטית מדי, הם נטענים מהזיכרון. תמונות ופונטים נטענים מהזיכרון קודם.
const fresh = (req) => req.mode === 'navigate' || /\.(js|css|html|webmanifest)$/.test(new URL(req.url).pathname);
const remember = (req, res) => {
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
  }
  return res;
};
const fromCache = (req) => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (fresh(req)) {
    e.respondWith(new Promise((resolve) => {
      let done = false;
      const fallback = () => fromCache(req).then((hit) => { if (!done && hit) { done = true; resolve(hit); } });
      const timer = setTimeout(fallback, 4000);
      fetch(req, { cache: 'no-cache' }).then((res) => {
        clearTimeout(timer);
        remember(req, res);
        if (!done) { done = true; resolve(res); }
      }).catch(() => {
        clearTimeout(timer);
        fromCache(req).then((hit) => { if (!done) { done = true; resolve(hit || Response.error()); } });
      });
    }));
    return;
  }
  e.respondWith(fromCache(req).then((hit) => hit || fetch(req).then((res) => remember(req, res))).catch(() => Response.error()));
});
