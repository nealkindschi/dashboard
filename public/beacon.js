(function() {
  const SID = crypto.randomUUID();
  const API = '/api/beacon';

  function send(type, d) {
    navigator.sendBeacon(API, JSON.stringify({
      session_id: SID,
      path: location.pathname,
      event_type: type,
      data: d,
      referer: document.referrer,
    }));
  }

  addEventListener('load', function() {
    send('pageload', { title: document.title });
  });

  var marks = {};
  addEventListener('scroll', function() {
    var pct = Math.round((scrollY + innerHeight) / document.documentElement.scrollHeight * 100);
    [25, 50, 75, 100].forEach(function(t) {
      if (pct >= t && !marks[t]) {
        marks[t] = true;
        send('scroll_' + t, { scrollPct: t });
      }
    });
  });

  addEventListener('click', function(e) {
    var el = e.target.closest('a, button, input[type="submit"], [role="button"]');
    if (el) {
      send('click', {
        tag: el.tagName,
        selector: el.id ? '#' + el.id : el.className ? '.' + el.className.split(' ')[0] : null,
        text: (el.textContent || '').trim().slice(0, 100),
      });
    }
  });

  addEventListener('beforeunload', function() {
    send('exit', { dwellMs: Date.now() - performance.timing.navigationStart });
  });
})();
