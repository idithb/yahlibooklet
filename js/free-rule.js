// כלל השיעור החופשי: מה שנעשה בשיעור החופשי הקודם ננעל בשיעור החופשי הבא.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FreeRule = factory();
})(this, function () {
  const ALL = ['chess', 'memory', 'learn'];

  // sessions: [{ id, activities: [{ type, ts }] }]
  // currentId: השיעור החופשי הנוכחי, שלא נספר כ"קודם"
  // resetAt: רגע שבו ההורה פתח את הנעילה. פעילות ישנה ממנו לא נועלת
  function locked(sessions, currentId, resetAt) {
    let prev = null;
    let prevTs = -Infinity;
    for (const s of sessions || []) {
      if (s.id === currentId || !s.activities || !s.activities.length) continue;
      const ts = s.activities[s.activities.length - 1].ts;
      if (ts > prevTs) { prev = s; prevTs = ts; }
    }
    if (!prev || (resetAt && prevTs <= resetAt)) return [];
    const unique = [...new Set(prev.activities.map((a) => a.type))];
    // אם נעשו כל שלושת הדברים, ננעל רק האחרון, כדי שתמיד תישאר בחירה
    if (unique.length >= ALL.length) return [prev.activities[prev.activities.length - 1].type];
    return unique;
  }

  return { locked, ALL };
});
