/* Catalonia 2026. The personal section.
   Everything here stays on the device. Passport details are encrypted with a PIN
   before they touch localStorage; nothing is ever uploaded. */
(function () {
  var sec = document.getElementById('you');
  if (!sec) return;

  /* ---------- the content ---------- */

  /* People, places, tables, routes and numbers live in trip-data.js so they can
     be edited without going near any of the behaviour below. */
  var DATA = window.CAT26 || {};
  var PEOPLE = DATA.PEOPLE || {};
  var INTERESTS = DATA.INTERESTS || [];
  var PLACES = DATA.PLACES || [];
  var DATE_NIGHTS = DATA.DATE_NIGHTS || [];
  var TAXI_RETURN = DATA.TAXI_RETURN || 30;
  var ROUTES = DATA.ROUTES || {};
  var DIRECTORY = DATA.DIRECTORY || [];

  function maps(q) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); }

  /* ---------- storage ---------- */

  var user = null, prefs = {};

  function prefKey(u) { return 'cat26_you_' + u; }
  function docKey(u) { return 'cat26_docs_' + u; }
  function travelKey(u) { return 'cat26_travel_' + u; }

  /* Everything here lives in this browser, so the two things that matter are
     that a write actually landed and that the browser will not quietly bin it
     later. Both used to be assumed. */

  var SCHEMA = 1;

  function readJSON(k, fb) { try { return JSON.parse(localStorage.getItem(k)) || fb; } catch (e) { return fb; } }

  function writeJSON(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch (e) {
      /* full, or Private Browsing, or storage blocked. Saying nothing here is
         how someone loses a passport number they thought was saved. */
      storageFailed(e);
      return false;
    }
  }

  function savePrefs() {
    prefs.v = SCHEMA;
    return writeJSON(prefKey(user), prefs);
  }

  /* Anything written before versioning began has no v, so it is v0. Keeping the
     ladder explicit means a future change can move old data forward instead of
     silently dropping fields somebody typed in. */
  function migratePrefs(p) {
    p = p || {};
    var from = p.v || 0;
    if (from === SCHEMA) return p;
    /* v0 -> v1: nothing to reshape, the stamp is the change */
    p.v = SCHEMA;
    return p;
  }

  function migrateVault(data) {
    data = data || {};
    if (!data.travellers) data.travellers = [];
    if (!data.bookings) data.bookings = [];
    data.v = SCHEMA;
    return data;
  }

  /* --- did the write land? --- */

  var storageBroken = false;

  function storageFailed(err) {
    storageBroken = true;
    var quota = err && (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014);
    showStorageBanner(quota
      ? 'This phone has run out of room for the page, so that did not save. Free some space, or remove a booking you no longer need, then try again.'
      : 'That did not save. If you are in Private Browsing, the page cannot store anything: open it in a normal tab.');
  }

  function showStorageBanner(msg) {
    var host = document.getElementById('you');
    if (!host) return;
    var bar = document.getElementById('storage-alert');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'storage-alert';
      bar.className = 'storage-alert';
      host.insertBefore(bar, host.firstChild);
    }
    bar.textContent = msg;
  }

  /* --- will the browser keep it? --- */

  /* Safari clears script-written storage after about a week of not visiting a
     site. Asking for persistence, and adding the page to the home screen, is
     what stops passports quietly disappearing between now and the airport. */
  var persistState = 'unknown';

  function askPersistence() {
    if (!navigator.storage || !navigator.storage.persist) {
      persistState = 'unsupported';
      return Promise.resolve(persistState);
    }
    return navigator.storage.persisted().then(function (already) {
      if (already) { persistState = 'granted'; return persistState; }
      return navigator.storage.persist().then(function (ok) {
        persistState = ok ? 'granted' : 'denied';
        return persistState;
      });
    }).catch(function () { persistState = 'unknown'; return persistState; });
  }

  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function isoAdd(iso, days) {
    var d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function daysBetween(a, b) {
    return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
  }

  /* every date of this couple's trip, as { iso, label } */
  function tripDays() {
    var me = PEOPLE[user], out = [], n = daysBetween(me.arrive, me.leave);
    for (var i = 0; i <= n; i++) {
      var iso = isoAdd(me.arrive, i);
      out.push({ iso: iso, label: shortDate(iso) });
    }
    return out;
  }

  function shortDate(v) {
    try {
      return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
        .format(new Date(v + 'T12:00:00'));
    } catch (e) { return v; }
  }

  function icsStamp(iso, time) {
    var t = (time || '09:00').replace(':', '') + '00';
    return iso.replace(/-/g, '') + 'T' + t;
  }

  function downloadICS(name, events) {
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//catalonia2026//you//EN', 'CALSCALE:GREGORIAN'];
    events.forEach(function (e, i) {
      lines.push('BEGIN:VEVENT');
      lines.push('UID:cat26you-' + i + '-' + e.start + '@catalonia2026');
      lines.push('DTSTAMP:20260719T000000Z');
      if (e.allDay) {
        lines.push('DTSTART;VALUE=DATE:' + e.start.replace(/-/g, ''));
        lines.push('DTEND;VALUE=DATE:' + isoAdd(e.start, 1).replace(/-/g, ''));
      } else {
        lines.push('DTSTART:' + icsStamp(e.start, e.time));
        lines.push('DTEND:' + icsStamp(e.start, e.endTime || e.time));
      }
      lines.push('SUMMARY:' + String(e.title).replace(/([,;\\])/g, '\\$1'));
      if (e.desc) lines.push('DESCRIPTION:' + String(e.desc).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'));
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function share(text) {
    if (window.cat26Share) { window.cat26Share(text); return; }
    if (navigator.share) { navigator.share({ text: text }).catch(function () {}); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
  }

  function flash(node, msg, warn) {
    if (!node) return;
    node.textContent = msg;
    node.className = 'you-status' + (warn ? ' warn' : '');
    setTimeout(function () { if (node.textContent === msg) node.textContent = ''; }, 4000);
  }

  /* ---------- pane 1: what you'd like to do ---------- */

  function legOK(leg) {
    if (!leg || leg === 'any') return true;
    return PEOPLE[user].legs.indexOf(leg) !== -1;
  }

  function renderPicks() {
    var wrap = document.getElementById('you-picks');
    if (!wrap) return;
    wrap.innerHTML = '';
    var chosen = prefs.interests || [];

    if (!chosen.length) {
      wrap.appendChild(el('p', 'you-empty', 'Tap what you are in the mood for.'));
      return;
    }

    var scored = PLACES.filter(function (p) { return legOK(p.leg); }).map(function (p) {
      var hits = p.tags.filter(function (t) { return chosen.indexOf(t) !== -1; });
      return { p: p, score: hits.length, hits: hits };
    }).filter(function (r) { return r.score > 0; });

    scored.sort(function (a, b) { return b.score - a.score || a.p.name.localeCompare(b.p.name); });

    if (!scored.length) {
      wrap.appendChild(el('p', 'you-empty', 'Nothing on the page matches that combination on your leg of the trip. Try another interest.'));
      return;
    }

    scored.forEach(function (r) {
      var row = el('div', 'you-pick');
      var left = el('div');
      var h = el('h4');
      var a = el('a', null, r.p.name);
      a.href = maps(r.p.q); a.target = '_blank'; a.rel = 'noopener';
      h.appendChild(a);
      left.appendChild(h);
      left.appendChild(el('p', 'pick-why', r.p.why));
      var labels = r.hits.map(function (t) {
        var f = INTERESTS.filter(function (i) { return i.id === t; })[0];
        return f ? f.label : t;
      });
      /* columns, not a string of separators */
      var meta = el('div', 'pick-meta');
      meta.appendChild(el('span', 'pm-where', r.p.where));
      meta.appendChild(el('span', 'pm-tags', labels.join(', ')));
      left.appendChild(meta);

      var links = el('div', 'pick-links');

      var want = prefs.want || {};
      var on = !!want[r.p.name];
      var w = el('button', 'pick-want' + (on ? ' on' : ''), on ? '✓ On the list' : '+ Add to list');
      w.type = 'button';
      w.addEventListener('click', function () {
        var list = prefs.want || {};
        if (list[r.p.name]) delete list[r.p.name]; else list[r.p.name] = true;
        prefs.want = list;
        savePrefs();
        renderPicks();
        renderWantCount();
      });
      links.appendChild(w);

      var m = el('a', null, 'Google Maps ↗');
      m.href = maps(r.p.q); m.target = '_blank'; m.rel = 'noopener';
      links.appendChild(m);
      if (r.p.tel) {
        var t = el('a', 'tel', 'Call ' + r.p.telLabel);
        t.href = 'tel:' + r.p.tel;
        links.appendChild(t);
      }
      if (r.p.anchor) {
        var s = el('a', null, 'On the page ↓');
        s.href = r.p.anchor;
        links.appendChild(s);
      }
      row.appendChild(left);
      row.appendChild(links);
      wrap.appendChild(row);
    });
  }

  function wantList() {
    var want = prefs.want || {};
    return PLACES.filter(function (p) { return want[p.name] && legOK(p.leg); });
  }

  function renderWantCount() {
    var bar = document.getElementById('want-bar');
    if (!bar) return;
    var list = wantList();
    bar.innerHTML = '';
    if (!list.length) {
      bar.appendChild(el('span', 'want-empty', 'Nothing on the list yet.'));
      return;
    }
    bar.appendChild(el('span', 'want-count', list.length + (list.length === 1 ? ' thing' : ' things') + ' on your list'));
    list.forEach(function (p) {
      var chip = el('span', 'want-chip', p.name);
      var x = el('button', null, '×');
      x.type = 'button';
      x.title = 'Take ' + p.name + ' off the list';
      x.addEventListener('click', function () {
        delete prefs.want[p.name];
        savePrefs();
        renderPicks();
        renderWantCount();
      });
      chip.appendChild(x);
      bar.appendChild(chip);
    });
  }

  function buildPlansPane(pane) {
    pane.appendChild(el('h3', null, 'What would you like to do today?'));
    var note = el('p', 'you-note', 'Tap anything that appeals. The list underneath is built from the places already on this page, filtered to your leg of the trip, with the phone number and the map link attached.');
    pane.appendChild(note);

    var chips = el('div', 'you-chips');
    INTERESTS.forEach(function (i) {
      var b = el('button', null, i.label);
      b.type = 'button';
      b.setAttribute('aria-pressed', (prefs.interests || []).indexOf(i.id) !== -1 ? 'true' : 'false');
      b.addEventListener('click', function () {
        var list = prefs.interests || [];
        var at = list.indexOf(i.id);
        if (at === -1) list.push(i.id); else list.splice(at, 1);
        prefs.interests = list;
        savePrefs();
        b.setAttribute('aria-pressed', at === -1 ? 'true' : 'false');
        renderPicks();
      });
      chips.appendChild(b);
    });
    pane.appendChild(chips);

    var bar = el('div', 'want-bar');
    bar.id = 'want-bar';
    pane.appendChild(bar);

    var picks = el('div', 'you-picks');
    picks.id = 'you-picks';
    pane.appendChild(picks);

    var wishWrap = el('div', 'you-form');
    wishWrap.style.marginTop = '34px';
    var wl = el('label', null, 'Anything the tags miss');
    var wt = document.createElement('textarea');
    wt.maxLength = 400;
    wt.placeholder = 'Anything else you two fancy.';
    wt.value = prefs.wish || '';
    wt.addEventListener('input', function () { prefs.wish = wt.value; savePrefs(); });
    wl.appendChild(wt);
    wishWrap.appendChild(wl);
    pane.appendChild(wishWrap);

    var row = el('div', 'you-btn-row');
    row.style.marginTop = '26px';
    var sh = el('button', 'you-btn ghost', 'Send our list to the group chat');
    sh.type = 'button';
    sh.addEventListener('click', function () {
      var list = wantList();
      var lines = [PEOPLE[user].label + ' would like to do:'];
      if (list.length) lines = lines.concat(list.map(function (p) {
        return '· ' + p.name + ', ' + p.where + (p.telLabel ? ' (' + p.telLabel + ')' : '');
      }));
      if (prefs.wish) lines.push('Also: ' + prefs.wish);
      if (!list.length && !prefs.wish) lines.push('(nothing on the list yet)');
      share(lines.join('\n'));
    });
    row.appendChild(sh);

    var cal = el('button', 'you-btn ghost', 'Add the list to your calendar');
    cal.type = 'button';
    cal.addEventListener('click', function () {
      var list = wantList();
      if (!list.length) return;
      var days = tripDays();
      downloadICS('catalonia-2026-list.ics', list.map(function (p, i) {
        var d = days[Math.min(i, days.length - 1)];
        return { start: d.iso, allDay: true, title: p.name + ', ' + p.where, desc: p.why + '\n' + maps(p.q) };
      }));
    });
    row.appendChild(cal);
    pane.appendChild(row);

    renderPicks();
    renderWantCount();
  }

  /* ---------- pane 2: date night budget ---------- */

  function money(n) { return '€' + Math.round(n); }

  function renderBudget() {
    var out = document.getElementById('budget-out');
    var list = document.getElementById('budget-list');
    if (!out || !list) return;

    var total = parseFloat(prefs.dnTotal) || 0;
    var nights = parseInt(prefs.dnNights, 10) || 0;
    var withTaxi = !!prefs.dnTaxi;
    var perNight = nights > 0 ? total / nights : 0;

    out.innerHTML = '';
    function fig(k, v, small) {
      var f = el('div', 'budget-fig');
      f.appendChild(el('div', 'bk', k));
      var b = el('div', 'bv', v);
      if (small) { var s = el('small', null, ' ' + small); b.appendChild(s); }
      f.appendChild(b);
      return f;
    }
    var log = prefs.dnLog || [];
    var spent = log.reduce(function (a, e) { return a + (parseFloat(e.amount) || 0); }, 0);
    var left = total - spent;
    var remainingNights = Math.max(0, nights - log.length);

    out.appendChild(fig('Set aside', total ? money(total) : '-'));
    out.appendChild(fig('Nights out', nights ? String(nights) : '-'));
    out.appendChild(fig('Per night', perNight ? money(perNight) : '-', perNight ? 'for two' : ''));
    if (log.length) {
      out.appendChild(fig('Spent so far', money(spent), log.length + (log.length === 1 ? ' night' : ' nights')));
      var lf = fig(left < 0 ? 'Over by' : 'Left', money(Math.abs(left)),
        remainingNights ? money(Math.max(0, left) / remainingNights) + ' × ' + remainingNights + ' to come' : '');
      if (left < 0) lf.querySelector('.bv').style.color = '#9a4a24';
      out.appendChild(lf);
    }

    list.innerHTML = '';
    if (!perNight) {
      list.appendChild(el('p', 'you-empty', 'Put a figure in above and the tables below are ranked against it.'));
      renderSpendLog();
      return;
    }

    /* once you have been out, sort against what is actually left per remaining night */
    var budgetNow = (log.length && remainingNights) ? Math.max(0, left) / remainingNights : perNight;
    var head = document.getElementById('budget-basis');
    if (head) {
      head.textContent = (log.length && remainingNights)
        ? 'Sorted against ' + money(budgetNow) + ' a night, which is what is left across your ' + remainingNights + ' remaining ' + (remainingNights === 1 ? 'night' : 'nights') + '.'
        : (log.length && !remainingNights)
          ? 'You have used all ' + nights + ' planned nights. Anything below is extra.'
          : 'Sorted against ' + money(perNight) + ' a night for two.';
    }

    var rows = DATE_NIGHTS.filter(function (d) { return legOK(d.leg); }).map(function (d) {
      var extra = withTaxi ? d.taxi * TAXI_RETURN : 0;
      return { d: d, lo: d.lo + extra, hi: d.hi + extra };
    });
    rows.sort(function (a, b) { return a.hi - b.hi; });

    rows.forEach(function (r) {
      var fits = r.hi <= budgetNow;
      var stretch = !fits && r.lo <= budgetNow;
      var row = el('div', 'you-pick');
      var left = el('div');
      var h = el('h4');
      var a = el('a', null, r.d.name);
      a.href = maps(r.d.q); a.target = '_blank'; a.rel = 'noopener';
      h.appendChild(a);
      left.appendChild(h);
      left.appendChild(el('p', 'pick-why', r.d.note));
      var verdict = fits ? 'Fits' : (stretch ? 'A stretch' : 'Over budget');
      var band = el('div', 'pick-meta ' + (fits ? 'fits-yes' : 'fits-no'));
      band.appendChild(el('span', 'pm-where', r.d.where));
      band.appendChild(el('span', 'pick-band', money(r.lo) + '-' + money(r.hi)));
      band.appendChild(el('span', 'pm-verdict', verdict + (withTaxi && r.d.taxi ? ', taxi in' : '')));
      left.appendChild(band);

      var links = el('div', 'pick-links');
      var m = el('a', null, 'Google Maps ↗');
      m.href = maps(r.d.q); m.target = '_blank'; m.rel = 'noopener';
      links.appendChild(m);
      if (r.d.tel) {
        var t = el('a', 'tel', 'Call ' + r.d.telLabel);
        t.href = 'tel:' + r.d.tel;
        links.appendChild(t);
      }
      var went = el('button', 'pick-want', 'We went');
      went.type = 'button';
      went.title = 'Log a night here against the budget';
      went.addEventListener('click', function () {
        var f = document.getElementById('dn-log-form');
        if (!f) return;
        f.place.value = r.d.name;
        f.amount.value = '';
        f.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function () { f.amount.focus(); }, 400);
      });
      links.appendChild(went);

      row.appendChild(left);
      row.appendChild(links);
      list.appendChild(row);
    });

    renderSpendLog();
  }

  function renderSpendLog() {
    var wrap = document.getElementById('dn-log');
    if (!wrap) return;
    var log = prefs.dnLog || [];
    wrap.innerHTML = '';
    if (!log.length) {
      wrap.appendChild(el('p', 'you-empty', 'Nothing logged yet. After a night out, put in what it came to and the remaining nights are re-ranked.'));
      return;
    }
    log.forEach(function (e, idx) {
      var row = el('div', 'log-row');
      var l = el('div');
      l.appendChild(el('div', 'log-place', e.place || 'A night out'));
      l.appendChild(el('div', 'log-sub', [e.date ? shortDate(e.date) : '', e.note].filter(Boolean).join(' · ')));
      row.appendChild(l);
      var r = el('div', 'log-right');
      r.appendChild(el('span', 'log-amt', money(parseFloat(e.amount) || 0)));
      var del = el('button', null, 'Remove');
      del.type = 'button';
      del.addEventListener('click', function () {
        prefs.dnLog.splice(idx, 1);
        savePrefs();
        renderBudget();
      });
      r.appendChild(del);
      row.appendChild(r);
      wrap.appendChild(row);
    });
  }

  function buildDatePane(pane) {
    pane.appendChild(el('h3', null, 'Budget for date night.'));
    pane.appendChild(el('p', 'you-note', 'The campsite week is the one stretch where two of you can slip out while another family holds the fort. Put in what you are happy to spend across the week. The tables below are ranked against it.'));

    var form = el('div', 'you-form');
    var r1 = el('div', 'you-row thirds');

    function numField(label, key, placeholder) {
      var l = el('label', null, label);
      var i = document.createElement('input');
      i.type = 'number'; i.min = '0'; i.inputMode = 'numeric'; i.placeholder = placeholder;
      i.value = prefs[key] || '';
      i.addEventListener('input', function () { prefs[key] = i.value; savePrefs(); renderBudget(); });
      l.appendChild(i);
      return l;
    }
    r1.appendChild(numField('Set aside for the week (€)', 'dnTotal', '400'));
    r1.appendChild(numField('How many nights out', 'dnNights', '3'));

    var l3 = el('label', null, 'Include a return taxi');
    var sel = document.createElement('select');
    [['', 'No, we will walk or drive'], ['1', 'Yes, add about €30 a night']].forEach(function (o) {
      var op = document.createElement('option');
      op.value = o[0]; op.textContent = o[1];
      sel.appendChild(op);
    });
    sel.value = prefs.dnTaxi ? '1' : '';
    sel.addEventListener('change', function () { prefs.dnTaxi = sel.value === '1'; savePrefs(); renderBudget(); });
    l3.appendChild(sel);
    r1.appendChild(l3);
    form.appendChild(r1);

    var l4 = el('label', null, 'Who holds the fort, and when');
    var ta = document.createElement('textarea');
    ta.maxLength = 300;
    ta.placeholder = 'e.g. Daisy & Phil have ours Tuesday, we have theirs Thursday';
    ta.value = prefs.dnSitter || '';
    ta.addEventListener('input', function () { prefs.dnSitter = ta.value; savePrefs(); });
    l4.appendChild(ta);
    form.appendChild(l4);
    pane.appendChild(form);

    var out = el('div', 'budget-out'); out.id = 'budget-out';
    pane.appendChild(out);

    /* what a night actually cost */
    var logHead = el('div', 'you-sub');
    logHead.textContent = 'After a night out';
    pane.appendChild(logHead);

    var lf = document.createElement('form');
    lf.className = 'you-form'; lf.id = 'dn-log-form';
    var lr = el('div', 'you-row thirds');
    function lfField(name, label, type, ph) {
      var l = el('label', null, label);
      var i = document.createElement('input');
      i.name = name; i.type = type || 'text';
      if (ph) i.placeholder = ph;
      if (type === 'number') { i.min = '0'; i.inputMode = 'decimal'; i.step = '0.01'; }
      l.appendChild(i);
      return l;
    }
    lr.appendChild(lfField('place', 'Where', 'text', 'Casamar'));
    lr.appendChild(lfField('amount', 'What it came to (€)', 'number', '190'));
    var ld = el('label', null, 'Which night');
    var lds = document.createElement('select');
    lds.name = 'date';
    tripDays().forEach(function (d) {
      var o = document.createElement('option');
      o.value = d.iso; o.textContent = d.label;
      lds.appendChild(o);
    });
    ld.appendChild(lds);
    lr.appendChild(ld);
    lf.appendChild(lr);
    lf.appendChild(lfField('note', 'Worth remembering', 'text', 'Table 4 on the terrace, ask for it again'));
    var lb = el('button', 'you-btn', 'Log the night');
    lb.type = 'submit';
    lf.appendChild(lb);
    lf.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(lf);
      var amount = parseFloat(d.get('amount'));
      if (!(amount >= 0)) return;
      prefs.dnLog = prefs.dnLog || [];
      prefs.dnLog.push({
        place: (d.get('place') || '').toString().trim(),
        amount: amount,
        date: d.get('date') || '',
        note: (d.get('note') || '').toString().trim()
      });
      savePrefs();
      lf.reset();
      renderBudget();
    });
    pane.appendChild(lf);

    var logWrap = el('div', 'log-list'); logWrap.id = 'dn-log';
    pane.appendChild(logWrap);

    var basis = el('p', 'budget-basis'); basis.id = 'budget-basis';
    pane.appendChild(basis);

    var list = el('div', 'you-picks'); list.id = 'budget-list';
    pane.appendChild(list);

    pane.appendChild(el('p', 'vault-warn', 'Bands are rough August guides for two with wine, not quotations. Only Casamar\'s €200 comes from a figure this page already carried. Confirm when you book.'));

    var row = el('div', 'you-btn-row');
    var sh = el('button', 'you-btn ghost', 'Send the swap to the group chat');
    sh.type = 'button';
    sh.addEventListener('click', function () {
      var lines = [PEOPLE[user].label + ' · date nights'];
      if (prefs.dnTotal && prefs.dnNights) {
        lines.push('Budget: ' + money(prefs.dnTotal) + ' across ' + prefs.dnNights + ' nights, about ' +
          money(prefs.dnTotal / prefs.dnNights) + ' a night for two' + (prefs.dnTaxi ? ', taxi included' : ''));
      }
      if (prefs.dnSitter) lines.push('Cover: ' + prefs.dnSitter);
      share(lines.join('\n'));
    });
    row.appendChild(sh);
    pane.appendChild(row);
    renderBudget();
  }

  /* ---------- pane 3: running ---------- */

  function renderRunners() {
    var wrap = document.getElementById('runner-out');
    if (!wrap) return;
    wrap.innerHTML = '';
    var runners = (prefs.runners || []).filter(function (r) { return r.is; });
    if (!runners.length) {
      wrap.appendChild(el('p', 'you-empty', 'Say yes above and a week of running appears here, matched to the three routes from the campsite gate.'));
      return;
    }
    runners.forEach(function (r) {
      var route = ROUTES[r.focus] || ROUTES.easy;
      var card = el('div', 'runner-card');
      card.appendChild(el('h4', null, r.name + (r.training ? ' · training for ' + r.training : '')));
      var plan = el('div', 'runner-plan');
      function row(k, v) {
        var d = el('div', 'rp-row');
        d.appendChild(el('div', 'rp-k', k));
        d.appendChild(el('div', 'rp-v', v));
        plan.appendChild(d);
      }
      row('Your route', 'Route ' + route.n + ' · ' + route.name);
      row('Distance', route.dist + ' · ' + route.gain);
      row('Leave at', route.start + (r.weekly && +r.weekly >= 60 ? ', earlier if you are doubling' : ''));
      row('Session', route.session);
      var wk = +r.weekly || 0;
      var week = wk >= 70 ? 'Six days, one double, long run Sunday off the Gavarres track.'
        : wk >= 40 ? 'Five days: two quality, three easy, long run on the forest track.'
        : wk >= 20 ? 'Four days, one with a bit of effort in it, the rest genuinely easy.'
        : 'Three days, all easy, and swim at the turn.';
      row('The week', week);
      row('Heat', 'August sunrise is about 07:05 and it builds fast after 09:00. Carry a flask on 02 and a vest on 03; there is no water on the Gavarres.');
      card.appendChild(plan);

      var links = el('div', 'you-btn-row');
      links.style.marginTop = '18px';
      var g = el('a', 'you-btn ghost', 'Open the routes ↓');
      g.href = '#running';
      links.appendChild(g);
      card.appendChild(links);
      wrap.appendChild(card);
    });

    renderRunWeek();
  }

  var ROUTE_KM = { '': 0, easy: 6, hills: 10.5, tempo: 11.2, long: 20.5 };
  var ROUTE_PICK = [
    ['', 'Rest'],
    ['easy', 'Easy, out and back'],
    ['hills', '01 · Lighthouse, hills'],
    ['tempo', '02 · Plain loop, tempo'],
    ['long', '03 · Gavarres, long']
  ];

  function renderRunWeek() {
    var wrap = document.getElementById('run-week');
    if (!wrap) return;
    var runners = (prefs.runners || []).filter(function (r) { return r.is; });
    wrap.innerHTML = '';
    if (!runners.length) return;

    wrap.appendChild(el('div', 'you-sub', 'The week, day by day'));
    var plan = prefs.runWeek || {};
    var days = tripDays();
    var total = 0;

    var grid = el('div', 'week-grid');
    days.forEach(function (d) {
      var cell = el('div', 'week-day');
      cell.appendChild(el('div', 'wd-date', d.label));
      var sel = document.createElement('select');
      ROUTE_PICK.forEach(function (o) {
        var op = document.createElement('option');
        op.value = o[0]; op.textContent = o[1];
        sel.appendChild(op);
      });
      sel.value = plan[d.iso] || '';
      sel.addEventListener('change', function () {
        prefs.runWeek = prefs.runWeek || {};
        if (sel.value) prefs.runWeek[d.iso] = sel.value; else delete prefs.runWeek[d.iso];
        savePrefs();
        renderRunWeek();
      });
      cell.appendChild(sel);
      var km = ROUTE_KM[plan[d.iso] || ''] || 0;
      total += km;
      cell.appendChild(el('div', 'wd-km', km ? km + ' km' : '-'));
      grid.appendChild(cell);
    });
    wrap.appendChild(grid);

    var sum = el('div', 'week-sum');
    sum.appendChild(el('span', null, total ? Math.round(total * 10) / 10 + ' km planned across ' + days.length + ' days' : 'Nothing planned yet'));
    wrap.appendChild(sum);

    var row = el('div', 'you-btn-row');
    row.style.marginTop = '18px';
    var cal = el('button', 'you-btn ghost', 'Put the runs in your calendar');
    cal.type = 'button';
    cal.addEventListener('click', function () {
      var ev = [];
      days.forEach(function (d) {
        var k = plan[d.iso];
        if (!k) return;
        var route = ROUTES[k];
        ev.push({
          start: d.iso, time: route.start, endTime: '09:00',
          title: 'Run · ' + route.name + ' (' + route.dist + ')',
          desc: route.session + '\nStart ' + route.start + '. ' + route.gain + ' of climb.'
        });
      });
      if (ev.length) downloadICS('catalonia-2026-running.ics', ev);
    });
    row.appendChild(cal);
    wrap.appendChild(row);
  }

  function buildRunPane(pane) {
    pane.appendChild(el('h3', null, 'Are you a runner? Will you be training?'));
    pane.appendChild(el('p', 'you-note', 'Answer for each of you. The three routes from the campsite gate are matched to a week, with the start times August allows.'));

    var names = PEOPLE[user].names;
    if (!prefs.runners || prefs.runners.length !== names.length) {
      var old = prefs.runners || [];
      prefs.runners = names.map(function (n, i) {
        return old[i] || { name: n, is: false, training: '', weekly: '', focus: 'easy' };
      });
      prefs.runners.forEach(function (r, i) { r.name = names[i]; });
    }

    prefs.runners.forEach(function (r, idx) {
      var form = el('div', 'you-form');
      form.style.marginBottom = '30px';
      form.appendChild(el('h4', null, r.name)).style.cssText =
        'font-family:var(--serif);font-weight:400;font-size:21px;margin:0;';

      var r1 = el('div', 'you-row');
      var lIs = el('label', null, 'Running out there?');
      var sIs = document.createElement('select');
      [['', 'No, this one is a holiday'], ['1', 'Yes']].forEach(function (o) {
        var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; sIs.appendChild(op);
      });
      sIs.value = r.is ? '1' : '';
      lIs.appendChild(sIs);
      r1.appendChild(lIs);

      var lTr = el('label', null, 'Training for something?');
      var iTr = document.createElement('input');
      iTr.maxLength = 60; iTr.placeholder = 'e.g. Valencia marathon, December';
      iTr.value = r.training || '';
      lTr.appendChild(iTr);
      r1.appendChild(lTr);
      form.appendChild(r1);

      var r2 = el('div', 'you-row');
      var lWk = el('label', null, 'Weekly kilometres');
      var iWk = document.createElement('input');
      iWk.type = 'number'; iWk.min = '0'; iWk.max = '250'; iWk.inputMode = 'numeric'; iWk.placeholder = '45';
      iWk.value = r.weekly || '';
      lWk.appendChild(iWk);
      r2.appendChild(lWk);

      var lFc = el('label', null, 'What the week is for');
      var sFc = document.createElement('select');
      [['easy', 'Easy miles and a swim'], ['hills', 'Hills and strength'], ['tempo', 'Tempo and threshold'], ['long', 'Long-run volume']].forEach(function (o) {
        var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; sFc.appendChild(op);
      });
      sFc.value = r.focus || 'easy';
      lFc.appendChild(sFc);
      r2.appendChild(lFc);
      form.appendChild(r2);

      function sync() {
        r.is = sIs.value === '1';
        r.training = iTr.value.trim();
        r.weekly = iWk.value;
        r.focus = sFc.value;
        savePrefs();
        renderRunners();
      }
      [sIs, iTr, iWk, sFc].forEach(function (n) {
        n.addEventListener('change', sync);
        n.addEventListener('input', sync);
      });

      pane.appendChild(form);
    });

    var out = el('div'); out.id = 'runner-out';
    pane.appendChild(out);

    var week = el('div'); week.id = 'run-week';
    pane.appendChild(week);

    var row = el('div', 'you-btn-row');
    var sh = el('button', 'you-btn ghost', 'Send the running plan to the group chat');
    sh.type = 'button';
    sh.addEventListener('click', function () {
      var rs = (prefs.runners || []).filter(function (r) { return r.is; });
      if (!rs.length) { share(PEOPLE[user].label + ': no running this trip.'); return; }
      var lines = [PEOPLE[user].label + ' · running'];
      rs.forEach(function (r) {
        var route = ROUTES[r.focus] || ROUTES.easy;
        lines.push(r.name + ': route ' + route.n + ', ' + route.name + ', out at ' + route.start +
          (r.training ? ' (training for ' + r.training + ')' : ''));
      });
      share(lines.join('\n'));
    });
    row.appendChild(sh);
    pane.appendChild(row);
    renderRunners();
  }

  /* ---------- pane 4: paperwork, behind a password ---------- */

  var vaultOpen = false, vaultData = null, vaultKey = null, idleTimer = 0;
  var vaultMode = 'docs';   /* 'docs' = passports, 'book' = bookings */
  var ITERATIONS = 310000;      /* new vaults */
  var LEGACY_ITERATIONS = 250000; /* vaults written before the password upgrade */
  var IDLE_MS = 5 * 60 * 1000;

  function subtle() {
    return (window.crypto && window.crypto.subtle) ? window.crypto.subtle : null;
  }

  function b64(buf) {
    var b = new Uint8Array(buf), s = '';
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s);
  }
  function unb64(str) {
    var s = atob(str), b = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }

  function deriveKey(secret, salt, iterations) {
    var s = subtle();
    return s.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return s.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      });
  }

  function vaultEncrypt(data) {
    var s = subtle();
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var bytes = new TextEncoder().encode(JSON.stringify(data));
    return s.encrypt({ name: 'AES-GCM', iv: iv }, vaultKey, bytes).then(function (ct) {
      var store = readJSON(docKey(user), {});
      store.iv = b64(iv);
      store.ct = b64(ct);
      writeJSON(docKey(user), store);
      writeDocsMeta(data);
      touchIdle();
    });
  }

  /* Counts only, written outside the encrypted blob so the before-you-fly card can
     say what is outstanding without asking for the password. No names, no numbers,
     no references ever go in here. */
  function metaKey(u) { return 'cat26_docs_meta_' + u; }

  function writeDocsMeta(data) {
    var me = PEOPLE[user];
    var people = data.travellers || [];
    var flagged = 0;
    people.forEach(function (p) {
      if (checkPassport(p, me.arrive, me.leave).some(function (f) { return f.bad; })) flagged++;
    });
    writeJSON(metaKey(user), {
      people: people.length,
      flagged: flagged,
      bookings: (data.bookings || []).length
    });
    renderBefore();
  }

  function vaultDecrypt(store, key) {
    var s = subtle();
    return s.decrypt({ name: 'AES-GCM', iv: unb64(store.iv) }, key, unb64(store.ct))
      .then(function (buf) { return JSON.parse(new TextDecoder().decode(buf)); });
  }

  function lockVault(quiet) {
    vaultOpen = false; vaultData = null; vaultKey = null;
    clearTimeout(idleTimer);
    var msg = quiet ? 'Locked after five minutes untouched.' : '';
    [['pane-docs', 'docs'], ['pane-book', 'book']].forEach(function (x) {
      var pane = document.getElementById(x[0]);
      if (pane && pane.childNodes.length) buildVaultPane(pane, true, msg, x[1]);
    });
  }

  function touchIdle() {
    clearTimeout(idleTimer);
    if (!vaultOpen) return;
    idleTimer = setTimeout(function () { lockVault(true); }, IDLE_MS);
  }

  /* Schengen: passport issued within 10 years of entry, valid 3 months past departure. */
  function checkPassport(p, arrive, leave) {
    var flags = [];
    if (p.expires) {
      var exp = new Date(p.expires + 'T12:00:00');
      var out = new Date(leave + 'T12:00:00');
      var need = new Date(out.getTime()); need.setMonth(need.getMonth() + 3);
      if (exp < out) flags.push({ bad: true, msg: 'Expires before you fly home. This passport cannot be used.' });
      else if (exp < need) flags.push({ bad: true, msg: 'Expires within three months of ' + fmtDate(leave) + '. Spain requires three months of validity beyond departure. Renew before August.' });
    }
    if (p.issued) {
      var iss = new Date(p.issued + 'T12:00:00');
      var arr = new Date(arrive + 'T12:00:00');
      var tenYears = new Date(iss.getTime()); tenYears.setFullYear(tenYears.getFullYear() + 10);
      if (tenYears < arr) flags.push({ bad: true, msg: 'Issued more than ten years before you land. Not accepted for Schengen entry, even if the expiry date looks fine.' });
    }
    if (!flags.length && p.expires && p.issued) flags.push({ bad: false, msg: 'Valid for this trip on both the ten-year and three-month rules.' });
    return flags;
  }

  function fmtDate(v) {
    if (!v) return '';
    try {
      return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(v + 'T12:00:00'));
    } catch (e) { return v; }
  }

  function maskNumber(n) {
    if (!n) return '';
    if (n.length <= 4) return n;
    var dots = '';
    for (var i = 0; i < n.length - 4; i++) dots += '•';
    return dots + n.slice(-4);
  }

  /* ---------- reading a confirmation email ---------- */

  var AIRLINES = {
    BA: 'British Airways', IB: 'Iberia', VY: 'Vueling', FR: 'Ryanair', U2: 'easyJet', EZY: 'easyJet',
    LS: 'Jet2', W6: 'Wizz Air', KL: 'KLM', AF: 'Air France', LH: 'Lufthansa', TP: 'TAP', EI: 'Aer Lingus'
  };
  var AIRPORTS = {
    LHR: 'Heathrow', LGW: 'Gatwick', STN: 'Stansted', LTN: 'Luton', LCY: 'London City', SEN: 'Southend',
    MAN: 'Manchester', BHX: 'Birmingham', EDI: 'Edinburgh', GLA: 'Glasgow', BRS: 'Bristol', NCL: 'Newcastle',
    LPL: 'Liverpool', LBA: 'Leeds Bradford', BCN: 'Barcelona', GRO: 'Girona', REU: 'Reus', MAD: 'Madrid',
    PMI: 'Palma', AGP: 'Malaga', ALC: 'Alicante', VLC: 'Valencia'
  };
  var MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function toISO(y, m, d) {
    if (!y || !m || !d) return '';
    if (y < 100) y += 2000;
    if (m < 1 || m > 12 || d < 1 || d > 31) return '';
    return y + '-' + pad2(m) + '-' + pad2(d);
  }

  /* dates in the order they appear in the text, each with where it was found */
  function findDates(text) {
    var found = [], m;
    var re1 = /\b(\d{1,2})\s*(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?\s+(\d{4})\b/g; /* 20 August 2026 */
    var re2 = /\b([A-Za-z]{3,9})\.?\s+(\d{1,2})\s*(?:st|nd|rd|th)?,?\s+(\d{4})\b/g; /* August 20, 2026 */
    var re3 = /\b(\d{4})-(\d{2})-(\d{2})\b/g;                                        /* 2026-08-20 */
    var re4 = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;                                  /* 20/08/2026 dd/mm */
    while ((m = re1.exec(text))) {
      var mo = MONTHS[m[2].slice(0, 3).toLowerCase()];
      if (mo) found.push({ iso: toISO(+m[3], mo, +m[1]), at: m.index });
    }
    while ((m = re2.exec(text))) {
      var mo2 = MONTHS[m[1].slice(0, 3).toLowerCase()];
      if (mo2) found.push({ iso: toISO(+m[3], mo2, +m[2]), at: m.index });
    }
    while ((m = re3.exec(text))) found.push({ iso: toISO(+m[1], +m[2], +m[3]), at: m.index });
    while ((m = re4.exec(text))) found.push({ iso: toISO(+m[3], +m[2], +m[1]), at: m.index });

    found = found.filter(function (f) { return f.iso; }).sort(function (a, b) { return a.at - b.at; });
    var seen = {}, out = [];
    found.forEach(function (f) {
      var k = f.iso + ':' + f.at;
      if (seen[k]) return;
      seen[k] = 1;
      out.push(f);
    });
    return out;
  }

  /* the first date that appears just after a label like "Check-in" */
  function dateNear(text, labelRe, dates) {
    labelRe.lastIndex = 0;
    var m = labelRe.exec(text);
    if (!m) return '';
    var from = m.index, to = m.index + 140;
    for (var i = 0; i < dates.length; i++) {
      if (dates[i].at >= from && dates[i].at <= to) return dates[i].iso;
    }
    return '';
  }

  function timeNear(text, labelRe) {
    labelRe.lastIndex = 0;
    var m = labelRe.exec(text);
    if (!m) return '';
    var win = text.slice(m.index, m.index + 140);
    var t = win.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    return t ? pad2(+t[1]) + ':' + t[2] : '';
  }

  function parseConfirmation(text) {
    var out = { flights: [], airports: [], times: [], dates: [] };
    if (!text) return out;
    var t = text.replace(/ /g, ' ');
    var upper = t.toUpperCase();

    /* booking reference, labelled forms first: they are the reliable ones */
    var refRe = /(?:BOOKING\s+REFERENCE|CONFIRMATION\s+(?:NUMBER|CODE)|RESERVATION\s+(?:NUMBER|CODE)|BOOKING\s+(?:NUMBER|CODE|ID)|REFERENCE|PNR|RECORD\s+LOCATOR|CONFIRMATION)\s*(?:IS|:|-|#|–)?\s*([A-Z0-9]{4,14})\b/g;
    var m, refs = [];
    while ((m = refRe.exec(upper))) refs.push(m[1]);
    out.ref = refs.filter(function (r) { return !/^\d{1,3}$/.test(r); })[0] || '';

    /* PIN for Booking.com style confirmations */
    var pin = upper.match(/\bPIN\s*(?:CODE)?\s*(?::|-)?\s*(\d{4,6})\b/);
    if (pin) out.pin = pin[1];

    /* flights */
    var fRe = /\b(BA|IB|VY|FR|U2|EZY|LS|W6|KL|AF|LH|TP|EI)\s*-?\s?(\d{1,4})\b/g;
    var seen = {};
    while ((m = fRe.exec(upper))) {
      var code = m[1] + m[2];
      if (seen[code]) continue;
      seen[code] = 1;
      out.flights.push({ code: code, airline: AIRLINES[m[1]] || m[1] });
    }

    /* airports, in the order they appear */
    var aRe = /\b([A-Z]{3})\b/g;
    while ((m = aRe.exec(upper))) {
      if (AIRPORTS[m[1]] && out.airports.indexOf(m[1]) === -1) out.airports.push(m[1]);
    }

    /* times */
    var tRe = /\b([01]?\d|2[0-3]):([0-5]\d)\b/g;
    while ((m = tRe.exec(t))) {
      var hhmm = pad2(+m[1]) + ':' + m[2];
      if (out.times.indexOf(hhmm) === -1) out.times.push(hhmm);
    }

    /* dates: prefer the ones sitting next to a label, fall back to the order they appear */
    var dated = findDates(t);
    out.dates = dated.map(function (d) { return d.iso; });

    var checkIn  = dateNear(t, /check[\s-]?in|arrival|pick[\s-]?up|collect|outbound|depart(?:ure|ing|s)?/i, dated);
    var checkOut = dateNear(t, /check[\s-]?out|departure date|drop[\s-]?off|return(?:ing|s)?|inbound/i, dated);
    out.cancelBy = dateNear(t, /free cancellation|cancel(?:lation)?\s+(?:until|before|by)|cancel free/i, dated);

    /* a cancellation date is a deadline, never the stay itself */
    if (checkIn && checkIn === out.cancelBy) checkIn = '';
    if (checkOut && checkOut === out.cancelBy) checkOut = '';

    var ordered = out.dates.filter(function (d) { return d !== out.cancelBy; });
    out.start = checkIn || ordered[0] || '';
    out.end = checkOut || (ordered.length > 1 ? ordered[ordered.length - 1] : '');
    if (out.end === out.start) out.end = '';

    out.startTime = timeNear(t, /check[\s-]?in|from\b|pick[\s-]?up|depart(?:ure|ing|s)?|outbound/i) || out.times[0] || '';
    out.endTime = timeNear(t, /check[\s-]?out|drop[\s-]?off|return(?:ing|s)?|inbound/i) || '';

    var money = t.match(/(£|€|\$|GBP|EUR|USD)\s?([\d][\d,]*(?:\.\d{2})?)/i);
    if (money) {
      out.amount = money[2].replace(/,/g, '');
      var sym = money[1].toUpperCase();
      out.currency = (sym === '£' || sym === 'GBP') ? '£'
        : (sym === '€' || sym === 'EUR') ? '€'
        : (sym === '$' || sym === 'USD') ? '$' : '';
    }

    var mail = t.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/);
    if (mail) out.email = mail[0];

    var tel = t.match(/\+\d[\d\s().-]{7,}\d/);
    if (tel) out.tel = tel[0].replace(/[\s().-]/g, '');

    /* who sent it */
    var providers = [
      [/BOOKING\.COM/, 'Booking.com', 'stay'], [/AIRBNB/, 'Airbnb', 'stay'],
      [/BRITISH AIRWAYS/, 'British Airways', 'flight'], [/EASYJET/, 'easyJet', 'flight'],
      [/RYANAIR/, 'Ryanair', 'flight'], [/VUELING/, 'Vueling', 'flight'], [/IBERIA/, 'Iberia', 'flight'], [/JET2/, 'Jet2', 'flight'],
      [/EUROPCAR/, 'Europcar', 'car'], [/\bAVIS\b/, 'Avis', 'car'], [/\bHERTZ\b/, 'Hertz', 'car'],
      [/\bSIXT\b/, 'Sixt', 'car'], [/ENTERPRISE/, 'Enterprise', 'car'], [/\bBUDGET\b/, 'Budget', 'car'],
      [/GOLDCAR/, 'Goldcar', 'car'], [/RENTALCARS/, 'Rentalcars', 'car'],
      [/THE\s?FORK|LAFOURCHETTE/, 'TheFork', 'table'], [/OPENTABLE/, 'OpenTable', 'table'],
      [/CAMPING/, 'Campsite', 'stay']
    ];
    for (var i = 0; i < providers.length; i++) {
      if (providers[i][0].test(upper)) { out.provider = providers[i][1]; out.type = providers[i][2]; break; }
    }
    if (!out.type && out.flights.length) out.type = 'flight';
    if (!out.provider && out.flights.length) out.provider = out.flights[0].airline;
    if (!out.type) {
      if (/CHECK[\s-]?IN|CHECK[\s-]?OUT|NIGHTS?\b/.test(upper)) out.type = 'stay';
      else if (/PICK[\s-]?UP|DROP[\s-]?OFF|HIRE|RENTAL/.test(upper)) out.type = 'car';
      else if (/TABLE|COVERS|DINNER|LUNCH/.test(upper)) out.type = 'table';
      else out.type = 'other';
    }
    return out;
  }

  /* ---------- reading a block of passport details ---------- */

  var MONTH_WORDS = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ');

  function looseDate(v) {
    if (!v) return '';
    v = v.trim();
    var m = v.match(/^(\d{1,2})[\s.\/-]+([A-Za-z]{3,9}|\d{1,2})[\s.\/-]+(\d{2,4})$/);
    if (m) {
      var mo = /^\d+$/.test(m[2]) ? +m[2] : MONTH_WORDS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1;
      return toISO(+m[3], mo, +m[1]);
    }
    m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return toISO(+m[1], +m[2], +m[3]);
    return '';
  }

  function titleCase(s) {
    return String(s).toLowerCase().replace(/(^|[\s'-])([a-z])/g, function (_, a, b) { return a + b.toUpperCase(); });
  }

  /* ---------- the machine-readable zone ---------- */

  /* The two lines across the bottom of a passport are ICAO 9303 TD3: fixed
     columns with check digits, so this is exact rather than a guess. It is also
     what a phone camera's own text recognition will hand you if you copy it. */
  function mrzCheck(str) {
    var w = [7, 3, 1], sum = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str[i], v;
      if (c >= '0' && c <= '9') v = +c;
      else if (c >= 'A' && c <= 'Z') v = c.charCodeAt(0) - 55;
      else v = 0;                       /* '<' and anything unexpected */
      sum += v * w[i % 3];
    }
    return sum % 10;
  }

  function mrzYear(yy, kind) {
    var n = +yy;
    var thisYY = new Date().getFullYear() % 100;
    if (kind === 'birth') return (n > thisYY ? 1900 : 2000) + n;
    return (n < 70 ? 2000 : 1900) + n;  /* expiry dates run forwards */
  }

  function mrzDate(s, kind) {
    if (!/^\d{6}$/.test(s)) return '';
    return toISO(mrzYear(s.slice(0, 2), kind), +s.slice(2, 4), +s.slice(4, 6));
  }

  /* ---------- reading the MRZ off a camera ---------- */

  /* Real passport scanners use a model trained on OCR-B, the MRZ typeface, run
     over live video. This has neither, so it leans on the two things it does
     have: the fixed column layout of ICAO 9303, and the check digits. Every
     frame is repaired against the layout and then accepted only if the digits
     agree, which turns a merely-plausible read into a verified one. */

  var DIGIT_FIX = { O: '0', Q: '0', D: '0', U: '0', I: '1', L: '1', J: '1', Z: '2', S: '5', B: '8', G: '6', T: '7', A: '4', E: '8' };
  var ALPHA_FIX = { '0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B', '6': 'G', '4': 'A', '7': 'T' };

  function toDigits(s) {
    return s.split('').map(function (c) { return DIGIT_FIX[c] || c; }).join('');
  }
  function toAlpha(s) {
    return s.split('').map(function (c) { return ALPHA_FIX[c] || c; }).join('');
  }

  /* Line 2 of a TD3 passport is fixed columns, so each field can be forced to
     the character class it is required to be before the checksums are tested. */
  function repairLine2(l) {
    return toDigits(l.slice(0, 9).replace(/</g, '<')).slice(0, 9)   /* number: usually digits */
      + toDigits(l.slice(9, 10))
      + toAlpha(l.slice(10, 13))
      + toDigits(l.slice(13, 19))
      + toDigits(l.slice(19, 20))
      + (/[MF<]/.test(l[20]) ? l[20] : '<')
      + toDigits(l.slice(21, 27))
      + toDigits(l.slice(27, 28))
      + l.slice(28);
  }

  function repairLine1(l) {
    return 'P' + l.slice(1, 2) + toAlpha(l.slice(2, 5)) + l.slice(5).replace(/[0-9]/g, function (d) { return ALPHA_FIX[d] || d; });
  }

  function mrzNormalise(text, wide) {
    return String(text || '')
      .toUpperCase()
      .replace(/[«≪]/g, wide ? '<<' : '<')
      .replace(/[‹〈]/g, '<')
      .replace(/[|¦]/g, '<')
      .replace(/[^\S\r\n]+/g, '')      /* strip spaces, keep newlines */
      .replace(/[^A-Z0-9<\r\n]/g, '');
  }

  /* Pull every plausible MRZ line out of arbitrary recognised text. */
  function mrzLines(text, wide) {
    return mrzNormalise(text, wide).split(/\r?\n/).filter(function (l) {
      /* trailing filler makes length unreliable, so only the floor matters */
      return l.length >= 26 && l.length <= 90;
    });
  }

  function pad44(s) { return (s + new Array(46).join('<')).slice(0, 44); }

  function readPair(l1, l2) {
    l1 = pad44(repairLine1(pad44(l1)));
    l2 = pad44(repairLine2(pad44(l2)));

    var num = l2.slice(0, 9);
    var numOK = mrzCheck(num) === +l2[9];
    var dobRaw = l2.slice(13, 19), dobOK = mrzCheck(dobRaw) === +l2[19];
    var expRaw = l2.slice(21, 27), expOK = mrzCheck(expRaw) === +l2[27];

    var dob = mrzDate(dobRaw, 'birth');
    var exp = mrzDate(expRaw, 'expiry');
    if (!exp) return null;

    var names = l1.slice(5).split('<<');
    return {
      number: num.replace(/</g, ''),
      nationality: l2.slice(10, 13).replace(/</g, ''),
      issuer: l1.slice(2, 5).replace(/</g, ''),
      expires: exp,
      dob: dob,
      sex: l2[20] === '<' ? '' : l2[20],
      surname: (names[0] || '').replace(/</g, ' ').trim(),
      given: (names[1] || '').replace(/</g, ' ').trim(),
      checks: { number: numOK, dob: dobOK, expiry: expOK },
      allChecksPass: numOK && dobOK && expOK
    };
  }

  function parseMRZ(text) {
    var passed = [], best = null;
    /* two readings of the guillemet, since it may stand for one '<' or two */
    for (var w = 0; w < 2; w++) {
      var lines = mrzLines(text, w === 1);
      for (var i = 0; i < lines.length; i++) {
        if (lines[i][0] !== 'P') continue;
        for (var j = 0; j < lines.length; j++) {
          if (i === j) continue;
          var z = readPair(lines[i], lines[j]);
          if (!z) continue;
          if (z.allChecksPass) passed.push(z);
          else if (!best) best = z;
        }
      }
    }
    if (!passed.length) return best;
    /* among equally valid reads, prefer the one that actually split the name,
       otherwise a collapsed separator returns "Surname Given" as one lump */
    for (var k = 0; k < passed.length; k++) {
      if (passed[k].surname && passed[k].given) return passed[k];
    }
    return passed[0];
  }

  /* ---------- recognition backends ---------- */

  /* Chrome on Android exposes the phone's own text recognition, which is the
     same engine behind Google Lens and is far better than anything shipped
     here. Use it when it exists and fall back otherwise. */
  function hasNativeText() {
    return typeof window.TextDetector === 'function';
  }

  function detectNative(canvas) {
    return new window.TextDetector().detect(canvas).then(function (blocks) {
      return blocks.map(function (b) { return b.rawValue; }).join('\n');
    }).catch(function () { return ''; });
  }

  var OCR_SRC = 'https://unpkg.com/tesseract.js@5.1.1/dist/tesseract.min.js';
  var ocrLoading = null, ocrWorker = null;

  function loadOCR() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (ocrLoading) return ocrLoading;
    ocrLoading = new Promise(function (res, rej) {
      var done = false;
      var fail = function () { if (done) return; done = true; ocrLoading = null; rej(new Error('offline')); };
      var timer = setTimeout(fail, 30000);
      var sc = document.createElement('script');
      sc.src = OCR_SRC;
      sc.onload = function () {
        if (done) return;
        done = true; clearTimeout(timer);
        window.Tesseract ? res(window.Tesseract) : fail();
      };
      sc.onerror = function () { clearTimeout(timer); fail(); };
      document.head.appendChild(sc);
    });
    return ocrLoading;
  }

  function getWorker(onProgress) {
    if (ocrWorker) return Promise.resolve(ocrWorker);
    return loadOCR().then(function (T) {
      onProgress('Downloading the reader, this part needs a connection…');
      return T.createWorker('eng', 1, {
        logger: function (m) {
          if (m.status && m.status.indexOf('loading') === 0) onProgress('Preparing the reader…');
        }
      });
    }).then(function (w) {
      /* single uniform block of text, which is what an MRZ band is */
      return w.setParameters({ tessedit_pageseg_mode: '6' }).then(function () {
        ocrWorker = w;
        return w;
      });
    });
  }

  function detectTesseract(canvas, onProgress) {
    return getWorker(onProgress).then(function (w) {
      return w.recognize(canvas);
    }).then(function (r) { return (r && r.data && r.data.text) || ''; });
  }

  /* Confirm up front that there is something here able to read text, so a
     phone with no engine says so immediately instead of staring at the
     passport for half a minute first. */
  function ensureBackend(onProgress) {
    if (hasNativeText()) return Promise.resolve('native');
    return getWorker(onProgress).then(function () { return 'tesseract'; });
  }

  function detectText(canvas, onProgress) {
    if (hasNativeText()) {
      return detectNative(canvas).then(function (t) {
        if (mrzLines(t).length >= 2) return t;
        return detectTesseract(canvas, onProgress).catch(function () { return t; });
      });
    }
    return detectTesseract(canvas, onProgress);
  }

  /* ---------- image preparation ---------- */

  /* Scale the band UP. The first version rendered a 4000px phone photo down to
     1600px wide, which shrank the very characters it was trying to read. */
  function bandCanvas(src, sw, sh, band) {
    var sy = Math.round(sh * (1 - band));
    var chH = sh - sy;
    var target = 2400;
    var scale = Math.min(4, Math.max(1, target / sw));
    var cv = document.createElement('canvas');
    cv.width = Math.round(sw * scale);
    cv.height = Math.max(1, Math.round(chH * scale));
    var ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, sy, sw, chH, 0, 0, cv.width, cv.height);
    try {
      var d = ctx.getImageData(0, 0, cv.width, cv.height), px = d.data;
      /* mean of the band, then a hard threshold either side of it */
      var sum = 0, n = px.length / 4;
      for (var i = 0; i < px.length; i += 4) sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      var mean = sum / n;
      for (var k = 0; k < px.length; k += 4) {
        var g = 0.299 * px[k] + 0.587 * px[k + 1] + 0.114 * px[k + 2];
        var v = g < mean - 8 ? 0 : 255;
        px[k] = px[k + 1] = px[k + 2] = v;
      }
      ctx.putImageData(d, 0, 0);
    } catch (e) { /* not fatal */ }
    return cv;
  }

  function readFromSource(src, sw, sh, onProgress) {
    var bands = [0.28, 0.4, 0.6, 1];
    var best = null;
    var step = function (i) {
      if (i >= bands.length) return Promise.resolve(best);
      return detectText(bandCanvas(src, sw, sh, bands[i]), onProgress).then(function (txt) {
        var z = parseMRZ(txt);
        if (z && z.allChecksPass) return z;
        if (z && !best) best = z;
        return step(i + 1);
      }).catch(function () { return step(i + 1); });
    };
    return step(0);
  }

  function readFromFile(file, onProgress) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () {
        readFromSource(img, img.width, img.height, onProgress).then(function (z) {
          URL.revokeObjectURL(img.src);
          res(z);
        }, rej);
      };
      img.onerror = function () { rej(new Error('That file did not open as an image.')); };
      img.src = URL.createObjectURL(file);
    });
  }

  /* Handles the usual "Surname: / Given names: / Passport No:" note format, with
     several people in one paste. Driving licences and other documents are skipped. */
  function parsePassports(text) {
    if (!text) return [];
    var out = [], cur = null;

    function flush() {
      if (!cur) return;

      /* if the record carried its MRZ, that is the authoritative copy */
      if (cur._mrz1 && cur._mrz2) {
        var z = parseMRZ(cur._mrz1 + '\n' + cur._mrz2);
        if (z) {
          cur.number = cur.number || z.number;
          cur.expires = cur.expires || z.expires;
          cur.nationality = cur.nationality || (z.nationality === 'GBR' ? 'British Citizen' : z.nationality);
          cur._surname = cur._surname || z.surname;
          cur._given = cur._given || z.given;
          cur._dob = cur._dob || z.dob;
          cur.mrzVerified = z.allChecksPass;
          /* a typed number that disagrees with the MRZ is worth knowing about */
          if (cur.number && z.number && cur.number !== z.number) cur.mrzMismatch = true;
        }
      }
      delete cur._mrz1; delete cur._mrz2;

      if (cur.number && cur.expires) {
        var name = [cur._given, cur._surname].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        cur.name = name ? titleCase(name) : (cur._label || '');
        delete cur._given; delete cur._surname; delete cur._label;
        out.push(cur);
      }
      cur = null;
    }

    text.split(/\r?\n/).forEach(function (raw) {
      var line = raw.trim();
      if (!line) return;

      /* a heading such as "Celeste Lily Colombe Woodward - Passport" starts a record */
      var head = line.match(/^(.+?)\s*[–—-]\s*passport\s*$/i);
      if (head) { flush(); cur = { _label: head[1].trim() }; return; }

      /* anything that is plainly another kind of document ends the current one */
      if (/[–—-]\s*(uk\s+)?(driving\s+licence|driver'?s\s+license|id\s+card)/i.test(line)) { flush(); return; }

      var kv = line.match(/^([A-Za-z][A-Za-z ()0-9]*?)\s*[:：]\s*(.+)$/);
      if (!kv) return;
      if (!cur) cur = {};
      var k = kv[1].toLowerCase().replace(/\s+/g, ' ').trim();
      var v = kv[2].trim();

      if (k === 'surname') cur._surname = v;
      else if (k === 'given names' || k === 'given name' || k === 'forenames') cur._given = v;
      else if (k === 'nationality') cur.nationality = v;
      else if (k === 'passport no' || k === 'passport number' || k === 'document no' || k === 'passport') cur.number = v.replace(/\s+/g, '');
      else if (k === 'date of issue' || k === 'issued') cur.issued = looseDate(v);
      else if (k === 'date of expiry' || k === 'expiry' || k === 'expires') cur.expires = looseDate(v);
      else if (k === 'authority' || k === 'issuing authority') cur.issuedAt = v;
      else if (k === 'place of birth') cur._pob = v;
      else if (k === 'date of birth') cur._dob = looseDate(v);
      else if (/^mrz line ?1$/.test(k)) cur._mrz1 = v;
      else if (/^mrz line ?2$/.test(k)) cur._mrz2 = v;
    });
    flush();

    /* Bare MRZ with no labels around it: two lines lifted straight off the
       document, which is what a phone's text recognition gives you. */
    var seen = {};
    out.forEach(function (p) { if (p.number) seen[p.number] = 1; });
    var raw = text.toUpperCase().split(/\r?\n/)
      .map(function (l) { return l.replace(/\s+/g, ''); });
    for (var i = 0; i < raw.length - 1; i++) {
      if (raw[i][0] !== 'P' || !/^[A-Z0-9<]{28,50}$/.test(raw[i]) || !/^[A-Z0-9<]{28,50}$/.test(raw[i + 1])) continue;
      var z = parseMRZ(raw[i] + '\n' + raw[i + 1]);
      if (!z || !z.number || seen[z.number]) continue;
      seen[z.number] = 1;
      out.push({
        name: titleCase([z.given, z.surname].filter(Boolean).join(' ')),
        number: z.number,
        nationality: z.nationality === 'GBR' ? 'British Citizen' : z.nationality,
        expires: z.expires,
        issuedAt: z.issuer,
        mrzVerified: z.allChecksPass,
        _dob: z.dob
      });
    }

    out.forEach(function (p) {
      var bits = [];
      if (p._dob) bits.push('Born ' + fmtDate(p._dob));
      if (p._pob) bits.push(p._pob);
      if (p.mrzMismatch) bits.push('Typed number does not match the MRZ, check it');
      if (bits.length) p.notes = [p.notes, bits.join(', ')].filter(Boolean).join('. ');
      delete p._dob; delete p._pob;
    });
    return out;
  }

  var BOOKING_TYPES = [
    ['flight', 'Flight'], ['stay', 'Somewhere to stay'], ['car', 'Hire car'],
    ['table', 'A table'], ['ticket', 'Tickets'], ['other', 'Something else']
  ];

  function typeLabel(t) {
    for (var i = 0; i < BOOKING_TYPES.length; i++) if (BOOKING_TYPES[i][0] === t) return BOOKING_TYPES[i][1];
    return 'Booking';
  }

  function today() { return new Date().toISOString().slice(0, 10); }

  function renderBookings() {
    var wrap = document.getElementById('booking-list');
    if (!wrap) return;
    wrap.innerHTML = '';
    var list = (vaultData.bookings || []).slice();
    if (!list.length) {
      wrap.appendChild(el('p', 'you-empty', 'Nothing saved yet. Paste a confirmation above, or fill the form in by hand.'));
      return;
    }
    list.sort(function (a, b) { return (a.date || '9999').localeCompare(b.date || '9999'); });

    list.forEach(function (bk) {
      var idx = vaultData.bookings.indexOf(bk);
      var card = el('div', 'trav-card');
      var head = el('div', 'tc-head');
      var h = el('h4', null, bk.name || typeLabel(bk.type));
      head.appendChild(h);
      var tag = el('span', 'bk-type', typeLabel(bk.type));
      head.appendChild(tag);
      card.appendChild(head);

      function row(k, v, mask) {
        if (!v) return;
        var d = el('div', 'trav-row');
        d.appendChild(el('div', 'tk', k));
        var val = el('div', 'tv' + (mask ? ' mask' : ''));
        if (mask) {
          var span = el('span', null, maskNumber(v));
          var btn = el('button', null, 'Show');
          btn.type = 'button';
          var shown = false;
          btn.addEventListener('click', function () {
            shown = !shown;
            span.textContent = shown ? v : maskNumber(v);
            btn.textContent = shown ? 'Hide' : 'Show';
            touchIdle();
          });
          var copy = el('button', null, 'Copy');
          copy.type = 'button';
          copy.addEventListener('click', function () {
            if (navigator.clipboard) navigator.clipboard.writeText(v).then(function () {
              copy.textContent = 'Copied';
              setTimeout(function () { copy.textContent = 'Copy'; }, 1500);
            }).catch(function () {});
          });
          val.appendChild(span); val.appendChild(btn); val.appendChild(copy);
        } else {
          val.textContent = v;
        }
        d.appendChild(val);
        card.appendChild(d);
      }

      row('Reference', bk.ref, true);
      if (bk.pin) row('PIN', bk.pin, true);
      row('Booked with', bk.provider);
      row('Confirmation sent to', bk.email);
      if (bk.date) row(bk.type === 'stay' ? 'Check in' : bk.type === 'car' ? 'Collect' : 'Date',
        fmtDate(bk.date) + (bk.time ? ' · ' + bk.time : ''));
      if (bk.endDate) row(bk.type === 'stay' ? 'Check out' : bk.type === 'car' ? 'Return' : 'Until',
        fmtDate(bk.endDate) + (bk.endTime ? ' · ' + bk.endTime : ''));
      if (bk.amount) row('Cost', (bk.currency || '') + bk.amount);
      row('Phone', bk.tel);
      row('Notes', bk.notes);

      /* what to do and when */
      if (bk.type === 'flight' && bk.date) {
        var opens = isoAdd(bk.date, -1);
        card.appendChild(el('div', 'doc-flag ok',
          'Online check-in opens ' + fmtDate(opens) + (bk.time ? ' at about ' + bk.time : '') + ', 24 hours before departure.'));
      }
      if (bk.cancelBy) {
        var daysLeft = daysBetween(today(), bk.cancelBy);
        var msg = daysLeft < 0
          ? 'Free cancellation ended ' + fmtDate(bk.cancelBy) + '. Changing this now will cost something.'
          : 'Free cancellation until ' + fmtDate(bk.cancelBy) + ', ' + daysLeft + ' ' + (daysLeft === 1 ? 'day' : 'days') + ' left.';
        card.appendChild(el('div', 'doc-flag' + (daysLeft < 0 || daysLeft <= 3 ? '' : ' ok'), msg));
      }

      var acts = el('div', 'you-btn-row');
      acts.style.marginTop = '16px';

      if (bk.link) {
        var lk = el('a', 'you-btn ghost', 'Manage booking ↗');
        lk.href = bk.link; lk.target = '_blank'; lk.rel = 'noopener';
        acts.appendChild(lk);
      }
      if (bk.type === 'flight' && bk.flightNo) {
        var fr = el('a', 'you-btn ghost', bk.flightNo + ' status ↗');
        fr.href = 'https://www.flightradar24.com/data/flights/' + bk.flightNo.toLowerCase();
        fr.target = '_blank'; fr.rel = 'noopener';
        acts.appendChild(fr);
      }
      if (bk.type === 'flight' && bk.flightBack) {
        var fb = el('a', 'you-btn ghost', bk.flightBack + ' status ↗');
        fb.href = 'https://www.flightradar24.com/data/flights/' + bk.flightBack.toLowerCase();
        fb.target = '_blank'; fb.rel = 'noopener';
        acts.appendChild(fb);
      }
      if (bk.date) {
        var ics = el('button', 'you-btn ghost', 'Add to calendar');
        ics.type = 'button';
        ics.addEventListener('click', function () {
          var ev = [];
          ev.push({
            start: bk.date, time: bk.time || '09:00', endTime: bk.time || '10:00',
            title: (bk.name || typeLabel(bk.type)) + (bk.ref ? ' · ' + bk.ref : ''),
            desc: [bk.provider, bk.tel, bk.notes].filter(Boolean).join('\n')
          });
          if (bk.type === 'flight') ev.push({
            start: isoAdd(bk.date, -1), time: bk.time || '09:00', endTime: bk.time || '09:30',
            title: 'Check in for ' + (bk.flightNo || bk.name || 'the flight'),
            desc: 'Online check-in opens now. Reference ' + (bk.ref || '') + '.'
          });
          if (bk.cancelBy) ev.push({
            start: bk.cancelBy, allDay: true,
            title: 'Last day to cancel ' + (bk.name || typeLabel(bk.type)) + ' free',
            desc: 'Reference ' + (bk.ref || '') + '.'
          });
          downloadICS('booking-' + (bk.ref || bk.type) + '.ics', ev);
        });
        acts.appendChild(ics);
      }
      var cp = el('button', 'you-btn ghost', 'Copy the details');
      cp.type = 'button';
      cp.addEventListener('click', function () {
        var lines = [(bk.name || typeLabel(bk.type)) + (bk.provider ? ' · ' + bk.provider : '')];
        if (bk.ref) lines.push('Reference: ' + bk.ref);
        if (bk.date) lines.push((bk.type === 'stay' ? 'Check in: ' : 'Date: ') + fmtDate(bk.date) + (bk.time ? ' ' + bk.time : ''));
        if (bk.endDate) lines.push((bk.type === 'stay' ? 'Check out: ' : 'Until: ') + fmtDate(bk.endDate));
        if (bk.tel) lines.push('Phone: ' + bk.tel);
        if (bk.notes) lines.push(bk.notes);
        if (navigator.clipboard) navigator.clipboard.writeText(lines.join('\n')).then(function () {
          cp.textContent = 'Copied';
          setTimeout(function () { cp.textContent = 'Copy the details'; }, 1500);
        }).catch(function () {});
      });
      acts.appendChild(cp);

      var del = el('button', 'you-btn ghost', 'Remove');
      del.type = 'button';
      del.addEventListener('click', function () {
        if (del.dataset.armed !== '1') {
          del.dataset.armed = '1';
          del.textContent = 'Tap again to remove';
          setTimeout(function () { del.dataset.armed = '0'; del.textContent = 'Remove'; }, 5000);
          return;
        }
        vaultData.bookings.splice(idx, 1);
        vaultEncrypt(vaultData).then(renderBookings);
      });
      acts.appendChild(del);
      card.appendChild(acts);
      wrap.appendChild(card);
    });
  }

  function bookingForm(prefill, onSave) {
    var form = document.createElement('form');
    form.className = 'you-form';
    var p = prefill || {};

    function field(name, label, type, ph, value) {
      var l = el('label', null, label);
      var i = document.createElement('input');
      i.name = name; i.type = type || 'text';
      if (ph) i.placeholder = ph;
      if (value) i.value = value;
      l.appendChild(i);
      return l;
    }

    var r0 = el('div', 'you-row');
    var lt = el('label', null, 'What is it');
    var st = document.createElement('select');
    st.name = 'type';
    BOOKING_TYPES.forEach(function (o) {
      var op = document.createElement('option');
      op.value = o[0]; op.textContent = o[1];
      st.appendChild(op);
    });
    st.value = p.type || 'stay';
    lt.appendChild(st);
    r0.appendChild(lt);
    r0.appendChild(field('name', 'Name it', 'text', 'Camping Palafrugell', p.name || ''));
    form.appendChild(r0);

    var r1 = el('div', 'you-row thirds');
    r1.appendChild(field('ref', 'Booking reference', 'text', 'ABC123', p.ref || ''));
    r1.appendChild(field('pin', 'PIN, if there is one', 'text', '', p.pin || ''));
    r1.appendChild(field('provider', 'Booked with', 'text', 'Booking.com', p.provider || ''));
    form.appendChild(r1);

    var r2 = el('div', 'you-row');
    r2.appendChild(field('email', 'Confirmation sent to', 'email', 'which inbox it landed in', p.email || ''));
    r2.appendChild(field('flightNo', 'Flight number', 'text', 'BA478', p.flightNo || ''));
    form.appendChild(r2);

    var r3 = el('div', 'you-row thirds');
    r3.appendChild(field('date', 'Date / check in', 'date', '', p.date || ''));
    r3.appendChild(field('time', 'Time', 'time', '', p.time || ''));
    r3.appendChild(field('endDate', 'Ends / check out', 'date', '', p.endDate || ''));
    form.appendChild(r3);

    var r3b = el('div', 'you-row');
    r3b.appendChild(field('endTime', 'Time it ends', 'time', '', p.endTime || ''));
    r3b.appendChild(field('flightBack', 'Return flight number', 'text', 'BA479', p.flightBack || ''));
    form.appendChild(r3b);

    var r4 = el('div', 'you-row thirds');
    r4.appendChild(field('amount', 'Cost', 'text', '480.00', p.amount || ''));
    r4.appendChild(field('cancelBy', 'Free cancellation until', 'date', '', p.cancelBy || ''));
    r4.appendChild(field('tel', 'Phone', 'tel', '+34…', p.tel || ''));
    form.appendChild(r4);

    form.appendChild(field('link', 'Manage-booking link', 'url', 'https://…', p.link || ''));

    var ln = el('label', null, 'Notes');
    var ta = document.createElement('textarea');
    ta.name = 'notes'; ta.maxLength = 500;
    ta.placeholder = 'Terminal, pitch number, who the booking is under, what the deposit was…';
    ta.value = p.notes || '';
    ln.appendChild(ta);
    form.appendChild(ln);

    var btn = el('button', 'you-btn', 'Save this booking');
    btn.type = 'submit';
    form.appendChild(btn);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var bk = {};
      ['type', 'name', 'ref', 'pin', 'provider', 'email', 'flightNo', 'flightBack', 'date', 'time',
       'endDate', 'endTime', 'amount', 'cancelBy', 'tel', 'link', 'notes'].forEach(function (k) {
        bk[k] = (d.get(k) || '').toString().trim();
      });
      bk.currency = p.currency || '';
      if (!bk.name && !bk.ref) return;
      onSave(bk, form);
    });
    return form;
  }

  function renderVault(mode) {
    if (mode) vaultMode = mode;
    mode = vaultMode;
    var wrap = document.getElementById('vault-body-' + mode);
    if (!wrap) return;
    wrap.innerHTML = '';
    var me = PEOPLE[user];

    if (mode === 'book') {
    /* --- paste a confirmation --- */
    wrap.appendChild(el('div', 'you-sub', 'Paste a confirmation email'));
    wrap.appendChild(el('p', 'you-note',
      'Copy the whole confirmation (flight, hotel, car or restaurant) and paste it here. The page reads out the reference, dates, times and flight numbers, shows you what it found, and you correct anything it got wrong before saving. Nothing is sent anywhere; the reading happens on the phone.'));

    var pasteForm = document.createElement('form');
    pasteForm.className = 'you-form';
    var pl = el('label', null, 'The email');
    var pta = document.createElement('textarea');
    pta.rows = 5;
    pta.placeholder = 'Paste the confirmation here…';
    pl.appendChild(pta);
    pasteForm.appendChild(pl);
    var prow = el('div', 'you-btn-row');
    var pbtn = el('button', 'you-btn', 'Read it');
    pbtn.type = 'submit';
    prow.appendChild(pbtn);
    var pstat = el('div', 'you-status');
    prow.appendChild(pstat);
    pasteForm.appendChild(prow);
    wrap.appendChild(pasteForm);

    var reviewWrap = el('div');
    wrap.appendChild(reviewWrap);

    pasteForm.addEventListener('submit', function (e) {
      e.preventDefault();
      touchIdle();
      var parsed = parseConfirmation(pta.value);
      reviewWrap.innerHTML = '';
      if (!parsed.ref && !parsed.flights.length && !parsed.dates.length) {
        flash(pstat, 'Could not find a reference or a date in that. Fill the form in below instead.', true);
        return;
      }

      var found = [];
      if (parsed.ref) found.push('reference ' + parsed.ref);
      if (parsed.flights.length) found.push(parsed.flights.map(function (f) { return f.code; }).join(', '));
      if (parsed.airports.length) found.push(parsed.airports.join(' → '));
      if (parsed.dates.length) found.push(parsed.dates.length + (parsed.dates.length === 1 ? ' date' : ' dates'));
      flash(pstat, 'Found ' + found.join(', ') + '. Check it below.');

      var pre = {
        type: parsed.type,
        ref: parsed.ref || '',
        pin: parsed.pin || '',
        provider: parsed.provider || '',
        email: parsed.email || '',
        flightNo: parsed.flights.length ? parsed.flights[0].code : '',
        flightBack: parsed.flights.length > 1 ? parsed.flights[1].code : '',
        date: parsed.start || '',
        endDate: parsed.end || '',
        time: parsed.startTime || '',
        endTime: parsed.endTime || '',
        cancelBy: parsed.cancelBy || '',
        amount: parsed.amount || '',
        currency: parsed.currency || '',
        tel: parsed.tel || '',
        name: parsed.provider || (parsed.flights.length ? parsed.flights[0].airline : ''),
        notes: parsed.airports.length ? parsed.airports.map(function (a) { return a + ' ' + AIRPORTS[a]; }).join(' → ') : ''
      };

      reviewWrap.appendChild(el('div', 'you-sub', 'Check what it read'));
      reviewWrap.appendChild(el('p', 'you-note',
        'Everything below came out of the text you pasted. Dates and times are the least reliable part. Confirm them against the email before you save.'));
      var rf = bookingForm(pre, function (bk, form) {
        vaultData.bookings = vaultData.bookings || [];
        vaultData.bookings.push(bk);
        vaultEncrypt(vaultData).then(function () {
          reviewWrap.innerHTML = '';
          pta.value = '';
          renderBookings();
          flash(pstat, 'Saved.');
        });
      });
      reviewWrap.appendChild(rf);
    });

    /* --- bookings --- */
    wrap.appendChild(el('div', 'you-sub', 'Every booking, with its reference'));
    var bl = el('div'); bl.id = 'booking-list';
    wrap.appendChild(bl);

    var addToggle = el('button', 'you-btn ghost', 'Add one by hand');
    addToggle.type = 'button';
    addToggle.style.marginTop = '18px';
    wrap.appendChild(addToggle);
    var manualWrap = el('div');
    wrap.appendChild(manualWrap);
    addToggle.addEventListener('click', function () {
      if (manualWrap.firstChild) { manualWrap.innerHTML = ''; addToggle.textContent = 'Add one by hand'; return; }
      addToggle.textContent = 'Never mind';
      manualWrap.appendChild(bookingForm({}, function (bk, form) {
        vaultData.bookings = vaultData.bookings || [];
        vaultData.bookings.push(bk);
        vaultEncrypt(vaultData).then(function () {
          manualWrap.innerHTML = '';
          addToggle.textContent = 'Add one by hand';
          renderBookings();
        });
      }));
    });

    }

    if (mode === 'docs') {
    /* --- travellers --- */
    wrap.appendChild(el('div', 'you-sub', 'Passports and cover'));

    /* Paste a block of passport details rather than typing each one out. Same
       principle as the confirmation reader: read on this device, shown back for
       checking, saved only when you say so. */
    wrap.appendChild(el('p', 'you-note',
      'If you keep passport details in a note, paste the whole lot in here. Everything it finds is listed for checking and you choose who gets saved. Driving licences are ignored.'));

    /* --- scan a passport --- */
    var scanWrap = el('div', 'scan-wrap');

    var scanRow = el('div', 'you-btn-row');
    var liveBtn = el('button', 'you-btn', 'Scan with the camera');
    liveBtn.type = 'button';
    var shotBtn = el('button', 'you-btn ghost', 'Use a photo instead');
    shotBtn.type = 'button';
    var scanIn = document.createElement('input');
    scanIn.type = 'file';
    scanIn.accept = 'image/*';        /* no capture attribute, so the library is available too */
    scanIn.style.display = 'none';
    scanRow.appendChild(liveBtn);
    scanRow.appendChild(shotBtn);
    scanRow.appendChild(scanIn);
    scanWrap.appendChild(scanRow);

    var scanStat = el('div', 'you-status');
    scanWrap.appendChild(scanStat);

    var stage = el('div', 'scan-stage');
    stage.hidden = true;
    var video = document.createElement('video');
    video.setAttribute('playsinline', '');    /* iOS refuses to play inline without this */
    video.setAttribute('muted', '');
    video.muted = true;
    stage.appendChild(video);
    stage.appendChild(el('div', 'scan-guide'));
    var stopBtn = el('button', 'you-btn ghost', 'Stop');
    stopBtn.type = 'button';
    var stageFoot = el('div', 'you-btn-row');
    stageFoot.appendChild(stopBtn);
    stage.appendChild(stageFoot);
    scanWrap.appendChild(stage);

    scanWrap.appendChild(el('p', 'vault-warn',
      'Lay the passport flat and fill the box with the two lines of letters and numbers along the very bottom of the photo page. Hold steady; it keeps reading until the numbers check out. Those lines carry their own check digits, so a misread is rejected rather than saved wrong. Nothing is uploaded, and the picture is not kept.'));

    wrap.appendChild(scanWrap);

    var durability = el('div', 'durability');
    durability.id = 'durability';
    wrap.appendChild(durability);
    askPersistence().then(renderStorageState);

    var say = function (m, warn) {
      scanStat.className = 'you-status' + (warn ? ' warn' : '');
      scanStat.textContent = m;
    };

    function handoff(z) {
      showFound([{
        name: titleCase([z.given, z.surname].filter(Boolean).join(' ')),
        number: z.number,
        nationality: z.nationality === 'GBR' ? 'British Citizen' : z.nationality,
        expires: z.expires,
        issuedAt: z.issuer,
        mrzVerified: z.allChecksPass,
        notes: z.dob ? 'Born ' + fmtDate(z.dob) : ''
      }], z.allChecksPass ? '' : 'The check digits did not agree, so at least one character is misread. Correct anything wrong before you save.');
    }

    /* ---- live camera ---- */
    var stream = null, scanning = false, rafId = 0;

    function stopLive() {
      scanning = false;
      cancelAnimationFrame(rafId);
      if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
      stage.hidden = true;
      liveBtn.disabled = false;
      video.srcObject = null;
    }
    stopBtn.addEventListener('click', function () { stopLive(); say(''); });

    liveBtn.addEventListener('click', function () {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        say('This browser will not open the camera here. Use a photo instead.', true);
        return;
      }
      touchIdle();
      liveBtn.disabled = true;
      ppReview.innerHTML = '';
      say('Opening the camera…');

      navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      }).then(function (st) {
        stream = st;
        video.srcObject = st;
        stage.hidden = false;
        return video.play();
      }).then(function () {
        say('Getting the reader ready…');
        return ensureBackend(say);
      }).then(function () {
        scanning = true;
        say('Line up the two lines at the bottom of the passport…');
        var busy = false, last = 0, started = Date.now(), tries = 0;

        var tick = function () {
          if (!scanning) return;
          rafId = requestAnimationFrame(tick);
          var now = Date.now();
          if (busy || now - last < 500) return;
          if (!video.videoWidth) return;
          last = now; busy = true;
          tries++;

          var frame = document.createElement('canvas');
          frame.width = video.videoWidth;
          frame.height = video.videoHeight;
          frame.getContext('2d').drawImage(video, 0, 0);

          readFromSource(frame, frame.width, frame.height, function () {})
            .then(function (z) {
              busy = false;
              if (!scanning) return;
              if (z && z.allChecksPass) {
                stopLive();
                say('Read and checked.');
                handoff(z);
                return;
              }
              var secs = Math.round((Date.now() - started) / 1000);
              say(z ? 'Almost, hold it steady… (' + secs + 's)' : 'Looking for the two lines… (' + secs + 's)');
              if (secs > 45 && z) {
                stopLive();
                say('Could not get a clean read. Check every field before saving.', true);
                handoff(z);
              } else if (secs > 60) {
                stopLive();
                say('No luck from the camera. Try a photo in good light, or paste the details below.', true);
              }
            })
            .catch(function (err) {
              busy = false;
              if (err && err.message === 'offline' && !hasNativeText()) {
                stopLive();
                say('The reader could not be downloaded and this browser has no built-in one. Paste the details below instead.', true);
              }
            });
        };
        tick();
      }).catch(function (err) {
        liveBtn.disabled = false;
        stopLive();
        if (err && err.message === 'offline') {
          say('The reader could not be downloaded, and this browser has no built-in one. It needs a connection the first time. You can still paste the details below.', true);
          return;
        }
        var name = err && err.name;
        say(name === 'NotAllowedError'
          ? 'Camera access was refused. Allow it in the browser settings, or use a photo instead.'
          : name === 'NotFoundError'
            ? 'No camera found on this device. Use a photo instead.'
            : 'Could not open the camera. Use a photo instead.', true);
      });
    });

    /* ---- a still photo ---- */
    shotBtn.addEventListener('click', function () { scanIn.click(); });

    scanIn.addEventListener('change', function () {
      var f = scanIn.files && scanIn.files[0];
      scanIn.value = '';
      if (!f) return;
      touchIdle();
      stopLive();
      shotBtn.disabled = true;
      ppReview.innerHTML = '';
      say('Getting the reader ready…');

      ensureBackend(say).then(function () {
        say('Reading the photo…');
        return readFromFile(f, say);
      }).then(function (z) {
        shotBtn.disabled = false;
        if (!z) {
          say('Could not find the two lines. Try again with the passport flat, in good light, filling the frame. Or open the photo in your camera app, copy the text and paste it below.', true);
          return;
        }
        if (!z.allChecksPass) say('Read it, but the check digits disagree. Check every field before saving.', true);
        else say('Read and checked.');
        handoff(z);
      }).catch(function (err) {
        shotBtn.disabled = false;
        say(err && err.message === 'offline'
          ? 'The reader could not be downloaded. It needs a connection the first time. You can still paste the details below.'
          : 'Could not read that photo. You can still paste the details below.', true);
      });
    });

    var ppForm = document.createElement('form');
    ppForm.className = 'you-form';
    var ppl = el('label', null, 'The details');
    var ppta = document.createElement('textarea');
    ppta.rows = 5;
    ppta.placeholder = 'Surname: ...\nGiven names: ...\nPassport No: ...\nDate of issue: ...\nDate of expiry: ...';
    ppl.appendChild(ppta);
    ppForm.appendChild(ppl);
    var pprow = el('div', 'you-btn-row');
    var ppbtn = el('button', 'you-btn', 'Read it');
    ppbtn.type = 'submit';
    pprow.appendChild(ppbtn);
    var ppstat = el('div', 'you-status');
    pprow.appendChild(ppstat);
    ppForm.appendChild(pprow);
    wrap.appendChild(ppForm);

    var ppReview = el('div');
    wrap.appendChild(ppReview);

    ppForm.addEventListener('submit', function (e) {
      e.preventDefault();
      touchIdle();
      ppReview.innerHTML = '';
      var found = parsePassports(ppta.value);
      if (!found.length) {
        flash(ppstat, 'No passports found in that. It needs at least a passport number and an expiry date.', true);
        return;
      }
      flash(ppstat, 'Found ' + found.length + (found.length === 1 ? ' passport.' : ' passports.') + ' Untick anyone you do not want saved.');
      showFound(found);
    });

    function showFound(found, warning) {
      ppReview.innerHTML = '';
    ppReview.appendChild(el('div', 'you-sub', 'Check, then save'));
    var chosen = [];
    found.forEach(function (p, i) {
      var card = el('div', 'trav-card');
      var head = el('div', 'tc-head');
      var lbl = el('label', 'pp-pick');
      var box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = true;
      lbl.appendChild(box);
      lbl.appendChild(el('span', null, p.name || 'Traveller ' + (i + 1)));
      head.appendChild(lbl);
      card.appendChild(head);
      chosen.push({ box: box, rec: p });

      function row(k, v) {
        if (!v) return;
        var d = el('div', 'trav-row');
        d.appendChild(el('div', 'tk', k));
        d.appendChild(el('div', 'tv', v));
        card.appendChild(d);
      }
      row('Passport no.', maskNumber(p.number));
      row('Nationality', p.nationality);
      row('Issued', fmtDate(p.issued));
      row('Expires', fmtDate(p.expires));

      checkPassport(p, me.arrive, me.leave).forEach(function (f) {
        card.appendChild(el('div', 'doc-flag' + (f.bad ? '' : ' ok'), f.msg));
      });
      ppReview.appendChild(card);
    });

    var saveRow = el('div', 'you-btn-row');
    var saveBtn = el('button', 'you-btn', 'Save the ticked ones');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', function () {
      var add = chosen.filter(function (c) { return c.box.checked; }).map(function (c) { return c.rec; });
      if (!add.length) { flash(ppstat, 'Nothing ticked.', true); return; }
      vaultData.travellers = vaultData.travellers || [];
      add.forEach(function (p) {
        /* replace rather than duplicate if this person is already in */
        var at = -1;
        vaultData.travellers.forEach(function (x, i) {
          if (x.name && p.name && x.name.toLowerCase() === p.name.toLowerCase()) at = i;
        });
        if (at >= 0) vaultData.travellers[at] = p; else vaultData.travellers.push(p);
      });
      vaultEncrypt(vaultData).then(function () {
        ppta.value = '';
        renderVault();
      });
    });
    saveRow.appendChild(saveBtn);
    ppReview.appendChild(saveRow);
      if (warning) ppReview.appendChild(el('div', 'doc-flag', warning));
    }

    var travellers = vaultData.travellers || [];
    travellers.forEach(function (p, idx) {
      var card = el('div', 'trav-card');
      var head = el('div', 'tc-head');
      head.appendChild(el('h4', null, p.name || 'Traveller ' + (idx + 1)));
      var del = el('button', 'bk-remove', 'Remove');
      del.type = 'button';
      del.addEventListener('click', function () {
        vaultData.travellers.splice(idx, 1);
        vaultEncrypt(vaultData).then(renderVault);
      });
      head.appendChild(del);
      card.appendChild(head);

      function row(k, v, mask) {
        if (!v) return;
        var d = el('div', 'trav-row');
        d.appendChild(el('div', 'tk', k));
        var val = el('div', 'tv' + (mask ? ' mask' : ''));
        if (mask) {
          var span = el('span', null, maskNumber(v));
          var btn = el('button', null, 'Show');
          btn.type = 'button';
          var shown = false;
          btn.addEventListener('click', function () {
            shown = !shown;
            span.textContent = shown ? v : maskNumber(v);
            btn.textContent = shown ? 'Hide' : 'Show';
            touchIdle();
          });
          val.appendChild(span); val.appendChild(btn);
        } else {
          val.textContent = v;
        }
        d.appendChild(val);
        card.appendChild(d);
      }

      row('Passport no.', p.number, true);
      row('Nationality', p.nationality);
      row('Issued', fmtDate(p.issued));
      row('Expires', fmtDate(p.expires));
      row('Place of issue', p.issuedAt);
      row('GHIC / EHIC', p.ghic, true);
      row('Insurance', p.insurer);
      row('Policy no.', p.policy, true);
      row('Emergency line', p.insurerTel);
      row('Where it is kept', p.kept);
      row('Notes', p.notes);

      checkPassport(p, me.arrive, me.leave).forEach(function (f) {
        card.appendChild(el('div', 'doc-flag' + (f.bad ? '' : ' ok'), f.msg));
      });

      var na = el('div', 'you-btn-row');
      na.style.marginTop = '16px';
      var nb = el('button', 'you-btn ghost', p.notes ? 'Edit the notes' : 'Add a note');
      nb.type = 'button';
      nb.addEventListener('click', function () {
        if (na.querySelector('form')) { na.querySelector('form').remove(); nb.textContent = p.notes ? 'Edit the notes' : 'Add a note'; return; }
        var nf = document.createElement('form');
        nf.className = 'you-form';
        nf.style.width = '100%';
        nf.style.marginTop = '14px';
        var nl = el('label', null, 'Notes for this passport');
        var nt = document.createElement('textarea');
        nt.maxLength = 600;
        nt.placeholder = 'Renewal booked for March. Check the name matches the booking exactly. Consent letter for the children in the blue folder.';
        nt.value = p.notes || '';
        nl.appendChild(nt);
        nf.appendChild(nl);
        var kl = el('label', null, 'Where the document is kept');
        var ki = document.createElement('input');
        ki.value = p.kept || '';
        ki.placeholder = 'Front pocket of the grey case';
        kl.appendChild(ki);
        nf.appendChild(kl);
        var nsave = el('button', 'you-btn', 'Save the note');
        nsave.type = 'submit';
        nf.appendChild(nsave);
        nf.addEventListener('submit', function (e) {
          e.preventDefault();
          p.notes = nt.value.trim();
          p.kept = ki.value.trim();
          vaultEncrypt(vaultData).then(renderVault);
        });
        na.appendChild(nf);
        nb.textContent = 'Never mind';
      });
      na.appendChild(nb);
      card.appendChild(na);

      wrap.appendChild(card);
    });

    if (!travellers.length) {
      wrap.appendChild(el('p', 'you-empty', 'Nobody added yet. Add each person flying, and the page checks the passport against the Schengen rules for your dates.'));
    }

    var form = document.createElement('form');
    form.className = 'you-form';
    form.style.marginTop = '26px';

    function field(name, label, type, ph, max) {
      var l = el('label', null, label);
      var i = document.createElement('input');
      i.name = name; i.type = type || 'text';
      if (ph) i.placeholder = ph;
      if (max) i.maxLength = max;
      l.appendChild(i);
      return l;
    }

    var g1 = el('div', 'you-row');
    g1.appendChild(field('name', 'Name as printed', 'text', 'Estelle Woodward', 80));
    g1.appendChild(field('number', 'Passport number', 'text', '123456789', 20));
    form.appendChild(g1);

    var g2 = el('div', 'you-row thirds');
    g2.appendChild(field('nationality', 'Nationality', 'text', 'British Citizen', 40));
    g2.appendChild(field('issued', 'Date of issue', 'date'));
    g2.appendChild(field('expires', 'Date of expiry', 'date'));
    form.appendChild(g2);

    var g3 = el('div', 'you-row thirds');
    g3.appendChild(field('issuedAt', 'Place of issue', 'text', 'UKPA', 40));
    g3.appendChild(field('ghic', 'GHIC / EHIC number', 'text', '', 40));
    g3.appendChild(field('kept', 'Where it is kept', 'text', 'Grey case, front pocket', 60));
    form.appendChild(g3);

    var g4 = el('div', 'you-row thirds');
    g4.appendChild(field('insurer', 'Travel insurer', 'text', '', 60));
    g4.appendChild(field('policy', 'Policy number', 'text', '', 40));
    g4.appendChild(field('insurerTel', 'Insurer emergency line', 'tel', '+44…', 30));
    form.appendChild(g4);

    var nl2 = el('label', null, 'Notes');
    var nt2 = document.createElement('textarea');
    nt2.name = 'notes'; nt2.maxLength = 600;
    nt2.placeholder = 'Renewal dates, name spellings, who is carrying what.';
    nl2.appendChild(nt2);
    form.appendChild(nl2);

    var btn = el('button', 'you-btn', 'Add traveller');
    btn.type = 'submit';
    form.appendChild(btn);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var p = {};
      ['name', 'number', 'nationality', 'issued', 'expires', 'issuedAt', 'ghic', 'kept',
       'insurer', 'policy', 'insurerTel', 'notes'].forEach(function (k) {
        p[k] = (d.get(k) || '').toString().trim();
      });
      if (!p.name) return;
      vaultData.travellers = vaultData.travellers || [];
      vaultData.travellers.push(p);
      vaultEncrypt(vaultData).then(renderVault);
    });
    wrap.appendChild(form);

    }

    if (mode === 'book') {
    /* --- the flight card from the travel section --- */
    var t = readJSON(travelKey(user), {});
    wrap.appendChild(el('div', 'you-sub', 'Flights, car and notes'));
    var tw = el('div', 'trav-card');
    var th = el('div', 'tc-head');
    th.appendChild(el('h4', null, 'From the travel section'));
    var edit = el('a', 'bk-remove', 'Edit in Travel ↑');
    edit.href = '#travel';
    th.appendChild(edit);
    tw.appendChild(th);
    function trow(k, v) {
      var d = el('div', 'trav-row');
      d.appendChild(el('div', 'tk', k));
      d.appendChild(el('div', 'tv', v || 'Not entered yet'));
      tw.appendChild(d);
    }
    trow('Flights', t.flights);
    trow('Hire car', t.car);
    trow('Notes', t.tnotes);
    wrap.appendChild(tw);

    }

    /* --- everything, one export --- */
    var allRow = el('div', 'you-btn-row');
    allRow.style.marginTop = '30px';

    var allCal = el('button', 'you-btn ghost', 'All check-ins and deadlines to calendar');
    if (mode !== 'book') allCal.style.display = 'none';
    allCal.type = 'button';
    allCal.addEventListener('click', function () {
      var ev = [];
      (vaultData.bookings || []).forEach(function (bk) {
        if (bk.date) ev.push({
          start: bk.date, time: bk.time || '09:00', endTime: bk.time || '10:00',
          title: (bk.name || typeLabel(bk.type)) + (bk.ref ? ' · ' + bk.ref : ''),
          desc: [bk.provider, bk.tel].filter(Boolean).join('\n')
        });
        if (bk.type === 'flight' && bk.date) ev.push({
          start: isoAdd(bk.date, -1), time: bk.time || '09:00', endTime: bk.time || '09:30',
          title: 'Check in for ' + (bk.flightNo || bk.name || 'the flight'),
          desc: 'Reference ' + (bk.ref || '') + '.'
        });
        if (bk.cancelBy) ev.push({
          start: bk.cancelBy, allDay: true,
          title: 'Last free cancellation · ' + (bk.name || typeLabel(bk.type))
        });
      });
      (vaultData.travellers || []).forEach(function (p) {
        if (!p.expires) return;
        var warn = new Date(p.expires + 'T12:00:00');
        warn.setMonth(warn.getMonth() - 9);
        ev.push({ start: warn.toISOString().slice(0, 10), allDay: true, title: 'Renew ' + p.name + "'s passport (expires " + fmtDate(p.expires) + ')' });
      });
      if (ev.length) downloadICS('catalonia-2026-paperwork.ics', ev);
    });
    allRow.appendChild(allCal);

    /* an encrypted copy you can put somewhere safe, or carry to another phone */
    var backup = el('button', 'you-btn ghost', 'Save an encrypted backup');
    backup.type = 'button';
    backup.addEventListener('click', function () {
      var store = readJSON(docKey(user), {});
      var payload = {
        travellers: vaultData.travellers || [],
        bookings: vaultData.bookings || [],
        prefs: prefs,
        travel: readJSON(travelKey(user), {})
      };
      var iv = crypto.getRandomValues(new Uint8Array(12));
      subtle().encrypt({ name: 'AES-GCM', iv: iv }, vaultKey, new TextEncoder().encode(JSON.stringify(payload)))
        .then(function (ct) {
          var file = {
            format: 'catalonia-2026-backup', v: 1, user: user,
            exportedAt: new Date().toISOString().slice(0, 10),
            salt: store.salt, it: store.it || LEGACY_ITERATIONS,
            iv: b64(iv), ct: b64(ct)
          };
          var blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'catalonia-2026-' + user + '-backup.json';
          document.body.appendChild(a);
          a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
          backup.textContent = 'Backup saved';
          setTimeout(function () { backup.textContent = 'Save an encrypted backup'; }, 2500);
        }).catch(function () {
          backup.textContent = 'Could not write the backup';
          setTimeout(function () { backup.textContent = 'Save an encrypted backup'; }, 2500);
        });
    });
    allRow.appendChild(backup);

    var lb = el('button', 'you-btn ghost', 'Lock this section');
    lb.type = 'button';
    lb.addEventListener('click', function () { lockVault(false); });
    allRow.appendChild(lb);
    wrap.appendChild(allRow);

    wrap.appendChild(el('p', 'vault-warn',
      'The backup file is ciphertext. It only opens with the same password, so it is safe to email to yourself or drop in a cloud folder. It is also how you get everything back if this phone is lost or its site data is cleared, and how you carry it to a second device.'));

    wrap.appendChild(el('p', 'vault-warn',
      'Everything on this screen is encrypted with your password before it is written to this browser, and never leaves the device. There is no server behind this page. It locks itself after five minutes untouched. A short password is not a bank vault: anyone with both the phone and the password can read it, and clearing the site data erases it with no way back. Keep references out of the group chat.'));

    if (mode === 'book') renderBookings();
    touchIdle();
  }

  function buildVaultPane(pane, keepScroll, message, mode) {
    mode = mode || 'docs';
    vaultMode = mode;
    pane.innerHTML = '';
    pane.appendChild(el('h3', null, mode === 'book' ? 'Bookings and references.' : 'Passports.'));
    pane.appendChild(el('p', 'you-note', mode === 'book'
      ? 'Every reference number and check-in in one place, behind the same password. Encrypted on this device, never uploaded, and it works on the plane.'
      : 'One passport per traveller, checked against the Schengen rules for your own dates. Encrypted on this device, never uploaded, and it works on the plane.'));

    if (!subtle()) {
      pane.appendChild(el('p', 'you-empty', 'This browser will not encrypt on the device, so the locker is switched off here. Open the page over https, or use Safari or Chrome on the phone you are travelling with.'));
      return;
    }

    var store = readJSON(docKey(user), null);
    var hasVault = !!(store && store.ct);

    if (vaultOpen && vaultData) {
      var body = el('div'); body.id = 'vault-body-' + mode;
      pane.appendChild(body);
      renderVault(mode);
      return;
    }

    var lock = el('div', 'vault-lock');
    lock.appendChild(el('h4', null, hasVault ? 'Enter your password' : 'Set a password'));
    lock.appendChild(el('p', null, hasVault
      ? 'The one you set on this device for ' + PEOPLE[user].label + '.'
      : 'A word or phrase you will still know in August, or a PIN of at least four digits. It encrypts everything behind this screen. There is no way to reset it and no way to recover what is behind it.'));

    var form = document.createElement('form');
    form.className = 'you-form';
    var l = el('label', null, hasVault ? 'Password' : 'Password or PIN');
    var i = document.createElement('input');
    i.type = 'password'; i.className = 'vault-pin'; i.autocomplete = hasVault ? 'current-password' : 'new-password';
    l.appendChild(i);
    form.appendChild(l);

    var showRow = el('label', 'vault-show');
    var showBox = document.createElement('input');
    showBox.type = 'checkbox';
    showBox.addEventListener('change', function () { i.type = showBox.checked ? 'text' : 'password'; });
    showRow.appendChild(showBox);
    showRow.appendChild(el('span', null, 'Show what I am typing'));
    form.appendChild(showRow);

    var btn = el('button', 'you-btn', hasVault ? 'Unlock' : 'Set it and open');
    btn.type = 'submit';
    form.appendChild(btn);
    var status = el('div', 'you-status'); status.id = 'vault-status';
    if (message) status.textContent = message;
    form.appendChild(status);
    lock.appendChild(form);

    if (hasVault) {
      var forget = el('button', 'you-btn ghost', 'Forgotten it? Erase and start again');
      forget.type = 'button';
      forget.style.marginTop = '18px';
      forget.addEventListener('click', function () {
        if (forget.dataset.armed !== '1') {
          forget.dataset.armed = '1';
          forget.textContent = 'Tap again to erase everything in the locker';
          setTimeout(function () { forget.dataset.armed = '0'; forget.textContent = 'Forgotten it? Erase and start again'; }, 6000);
          return;
        }
        try { localStorage.removeItem(docKey(user)); } catch (e) {}
        buildVaultPane(pane, false, '', mode);
      });
      lock.appendChild(forget);
    }

    /* bring a backup file back, on this phone or a new one */
    var restore = el('div', 'vault-restore');
    var rBtn = el('button', 'you-btn ghost', hasVault ? 'Restore from a backup file' : 'Or restore from a backup file');
    rBtn.type = 'button';
    var rInput = document.createElement('input');
    rInput.type = 'file';
    rInput.accept = 'application/json,.json';
    rInput.style.display = 'none';
    var rStat = el('div', 'you-status');
    rBtn.addEventListener('click', function () { rInput.click(); });
    rInput.addEventListener('change', function () {
      var f = rInput.files && rInput.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        var data;
        try { data = JSON.parse(reader.result); } catch (err) { data = null; }
        if (!data || data.format !== 'catalonia-2026-backup' || !data.salt || !data.ct || !data.iv) {
          flash(rStat, 'That is not a backup file from this page.', true);
          return;
        }
        if (data.user && data.user !== user) {
          flash(rStat, 'That backup belongs to ' + (PEOPLE[data.user] ? PEOPLE[data.user].label : 'someone else') + '. Switch to them first.', true);
          return;
        }
        if (hasVault && rBtn.dataset.armed !== '1') {
          rBtn.dataset.armed = '1';
          flash(rStat, 'This replaces what is already in the locker here. Choose the file again to go ahead.', true);
          setTimeout(function () { rBtn.dataset.armed = '0'; }, 8000);
          return;
        }
        writeJSON(docKey(user), { salt: data.salt, it: data.it || LEGACY_ITERATIONS, iv: data.iv, ct: data.ct });
        buildVaultPane(pane, true, 'Backup loaded. Enter the password it was saved with.', mode);
      };
      reader.readAsText(f);
    });
    restore.appendChild(rBtn);
    restore.appendChild(rInput);
    restore.appendChild(rStat);
    lock.appendChild(restore);

    pane.appendChild(lock);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var secret = i.value;
      var okPin = /^\d{4,}$/.test(secret);
      var okPhrase = secret.length >= 6;
      if (!okPin && !okPhrase) {
        flash(status, 'At least four digits, or six characters if it is a word.', true);
        return;
      }
      btn.disabled = true;
      flash(status, 'Working…');

      if (hasVault) {
        var salt = unb64(store.salt);
        var iters = store.it || LEGACY_ITERATIONS;
        deriveKey(secret, salt, iters).then(function (key) {
          return vaultDecrypt(store, key).then(function (data) {
            vaultKey = key;

            /* a restored backup carries the rest of the section with it */
            var restored = false;
            if (data.prefs) {
              prefs = data.prefs;
              savePrefs();
              delete data.prefs;
              restored = true;
            }
            if (data.travel) {
              writeJSON(travelKey(user), data.travel);
              delete data.travel;
              restored = true;
            }

            vaultData = migrateVault(data);
            vaultOpen = true;

            if (restored) {
              /* drop the carried copy so the live vault holds only paperwork */
              vaultEncrypt(vaultData).then(function () { mount(); openDocsPane(); });
              return;
            }
            buildVaultPane(pane, false, '', mode);
          });
        }).catch(function () {
          btn.disabled = false;
          flash(status, 'That does not open it.', true);
        });
      } else {
        var newSalt = crypto.getRandomValues(new Uint8Array(16));
        deriveKey(secret, newSalt, ITERATIONS).then(function (key) {
          vaultKey = key;
          vaultData = migrateVault({ travellers: [], bookings: [] });
          vaultOpen = true;
          writeJSON(docKey(user), { salt: b64(newSalt), it: ITERATIONS });
          return vaultEncrypt(vaultData).then(function () { buildVaultPane(pane, false, '', mode); });
        }).catch(function () {
          btn.disabled = false;
          flash(status, 'Could not set that up on this browser.', true);
        });
      }
    });

    if (!keepScroll) i.focus();
  }

  ['click', 'keydown', 'touchstart'].forEach(function (evt) {
    document.addEventListener(evt, function () { if (vaultOpen) touchIdle(); }, { passive: true });
  });

  /* ---------- pane 5: contacts ---------- */

  function dirFilter(q) {
    q = (q || '').trim().toLowerCase();
    var groups = document.querySelectorAll('#pane-dir .dir-group');
    Array.prototype.forEach.call(groups, function (g) {
      var any = false;
      Array.prototype.forEach.call(g.querySelectorAll('.dir-row'), function (r) {
        var hit = !q || r.textContent.toLowerCase().indexOf(q) !== -1;
        r.style.display = hit ? '' : 'none';
        if (hit) any = true;
      });
      g.style.display = any ? '' : 'none';
    });
  }

  function renderOwnContacts() {
    var wrap = document.getElementById('own-contacts');
    if (!wrap) return;
    wrap.innerHTML = '';
    var list = prefs.contacts || [];
    if (!list.length) {
      wrap.appendChild(el('p', 'you-empty', 'Nothing added yet. The sitter, the neighbour with the spare key, whoever is minding the house.'));
      return;
    }
    list.forEach(function (c, idx) {
      var row = el('div', 'dir-row');
      var left = el('div');
      left.appendChild(el('div', 'dir-name', c.name));
      if (c.sub) left.appendChild(el('div', 'dir-sub', c.sub));
      var links = el('div', 'dir-links');
      if (c.tel) {
        var t = el('a', 'tel', c.tel);
        t.href = 'tel:' + c.tel.replace(/[^\d+]/g, '');
        links.appendChild(t);
      }
      if (c.place) {
        var m = el('a', null, 'Maps ↗');
        m.href = maps(c.place); m.target = '_blank'; m.rel = 'noopener';
        links.appendChild(m);
      }
      var del = el('a', null, 'Remove');
      del.href = '#';
      del.addEventListener('click', function (e) {
        e.preventDefault();
        prefs.contacts.splice(idx, 1);
        savePrefs();
        renderOwnContacts();
      });
      links.appendChild(del);
      row.appendChild(left);
      row.appendChild(links);
      wrap.appendChild(row);
    });
  }

  function buildDirPane(pane) {
    pane.appendChild(el('h3', null, 'Every number, one screen.'));
    pane.appendChild(el('p', 'you-note', 'Accommodation, tables, taxis and the medical numbers, filtered to your leg of the trip. Numbers dial on tap and every entry opens in Google Maps. This screen works offline.'));

    var searchWrap = el('div', 'you-form');
    var sl = el('label', null, 'Find a number');
    var si = document.createElement('input');
    si.type = 'search';
    si.placeholder = 'taxi, pharmacy, Casamar…';
    si.addEventListener('input', function () { dirFilter(si.value); });
    sl.appendChild(si);
    searchWrap.appendChild(sl);
    pane.appendChild(searchWrap);

    DIRECTORY.forEach(function (g) {
      var rows = g.rows.filter(function (r) { return legOK(r.leg); });
      if (!rows.length) return;
      var grp = el('div', 'dir-group');
      grp.appendChild(el('h4', null, g.group));
      rows.forEach(function (r) {
        var row = el('div', 'dir-row');
        var left = el('div');
        left.appendChild(el('div', 'dir-name', r.name));
        if (r.sub) left.appendChild(el('div', 'dir-sub', r.sub));
        var links = el('div', 'dir-links');
        if (r.tel) {
          var t = el('a', 'tel', r.telLabel || r.tel);
          t.href = 'tel:' + r.tel;
          links.appendChild(t);
        }
        if (r.q) {
          var m = el('a', null, 'Maps ↗');
          m.href = maps(r.q); m.target = '_blank'; m.rel = 'noopener';
          links.appendChild(m);
        }
        if (r.link) {
          var b = el('a', null, r.linkLabel || 'Open ↗');
          b.href = r.link; b.target = '_blank'; b.rel = 'noopener';
          links.appendChild(b);
        }
        row.appendChild(left);
        row.appendChild(links);
        grp.appendChild(row);
      });
      pane.appendChild(grp);
    });

    /* your own numbers */
    var ownGrp = el('div', 'dir-group');
    ownGrp.appendChild(el('h4', null, 'Yours'));
    var own = el('div'); own.id = 'own-contacts';
    ownGrp.appendChild(own);
    pane.appendChild(ownGrp);

    var cf = document.createElement('form');
    cf.className = 'you-form';
    cf.style.marginTop = '18px';
    var cr = el('div', 'you-row thirds');
    function cField(name, label, ph) {
      var l = el('label', null, label);
      var i = document.createElement('input');
      i.name = name; i.placeholder = ph; i.maxLength = 80;
      l.appendChild(i);
      return l;
    }
    cr.appendChild(cField('name', 'Who', 'The sitter'));
    cr.appendChild(cField('tel', 'Number', '+34…'));
    cr.appendChild(cField('sub', 'What for', 'Tuesday and Thursday'));
    cf.appendChild(cr);
    cf.appendChild(cField('place', 'Somewhere to map, if useful', 'Carrer de Fuerteventura, Calella'));
    var cb = el('button', 'you-btn', 'Add the number');
    cb.type = 'submit';
    cf.appendChild(cb);
    cf.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(cf);
      var c = {
        name: (d.get('name') || '').toString().trim(),
        tel: (d.get('tel') || '').toString().trim(),
        sub: (d.get('sub') || '').toString().trim(),
        place: (d.get('place') || '').toString().trim()
      };
      if (!c.name) return;
      prefs.contacts = prefs.contacts || [];
      prefs.contacts.push(c);
      savePrefs();
      cf.reset();
      renderOwnContacts();
    });
    pane.appendChild(cf);

    var row = el('div', 'you-btn-row');
    var sh = el('button', 'you-btn ghost', 'Send the taxi and emergency numbers');
    sh.type = 'button';
    sh.addEventListener('click', function () {
      share([
        'Catalonia 2026 · the numbers',
        'Emergencies 112 · Salut Respon 061',
        'CAP de Palafrugell 972 610 607',
        'Campsite 972 615 116',
        'Taxi Claus 663 731 841 · Masca 972 301 123 / 659 936 772'
      ].join('\n'));
    });
    row.appendChild(sh);
    pane.appendChild(row);

    renderOwnContacts();
  }

  /* ---------- assembly ---------- */

  var PANES = [
    { id: 'plans', label: 'What you fancy', build: buildPlansPane },
    { id: 'date',  label: 'Date night',     build: buildDatePane },
    { id: 'run',   label: 'Running',        build: buildRunPane },
    { id: 'docs',  label: 'Passports',      build: function (n) { buildVaultPane(n, false, '', 'docs'); } },
    { id: 'book',  label: 'Bookings',       build: function (n) { buildVaultPane(n, false, '', 'book'); } },
    { id: 'dir',   label: 'Contacts',       build: buildDirPane }
  ];

  function mount() {
    sec.innerHTML = '';
    var head = el('div', 'split asym');
    head.appendChild(el('div', 'eyebrow', PEOPLE[user].label));
    head.appendChild(el('h2', null, 'Your bit of the trip.'));
    var p = el('p');
    p.innerHTML = 'Only for you two, and only on this phone. ' +
      esc(fmtDate(PEOPLE[user].arrive)) + ' to ' + esc(fmtDate(PEOPLE[user].leave)) + '.';
    head.appendChild(p);
    sec.appendChild(head);

    var tabs = el('div', 'you-tabs');
    tabs.setAttribute('role', 'tablist');
    var panes = {};

    PANES.forEach(function (def, idx) {
      var b = el('button', null, def.label);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
      b.setAttribute('aria-controls', 'pane-' + def.id);
      tabs.appendChild(b);

      var pane = el('div', 'you-pane');
      pane.id = 'pane-' + def.id;
      pane.setAttribute('role', 'tabpanel');
      if (idx !== 0) pane.hidden = true;
      panes[def.id] = { node: pane, tab: b, def: def, built: false };

      b.addEventListener('click', function () {
        PANES.forEach(function (o) {
          var pr = panes[o.id];
          var on = o.id === def.id;
          pr.tab.setAttribute('aria-selected', on ? 'true' : 'false');
          pr.node.hidden = !on;
          if (on && !pr.built) { pr.built = true; pr.def.build(pr.node); }
        });
      });
    });

    sec.appendChild(tabs);
    PANES.forEach(function (def) { sec.appendChild(panes[def.id].node); });

    panes.plans.built = true;
    buildPlansPane(panes.plans.node);
    sec.hidden = false;
  }

  function renderStorageState() {
    var box = document.getElementById('durability');
    if (!box) return;
    box.className = 'durability';
    if (persistState === 'granted') {
      box.classList.add('ok');
      box.textContent = 'This browser has agreed to keep what you save here, so it will not be cleared out on its own.';
      return;
    }
    box.textContent = persistState === 'unsupported'
      ? 'This browser will not promise to keep stored data. Add the page to your home screen, and save a backup file once the passports are in.'
      : 'This browser has not promised to keep what you save. Safari in particular clears it after about a week of not opening the page. Add this to your home screen, and save a backup file once the passports are in.';
  }

  /* ---------- before you fly ---------- */

  /* What is still outstanding, ordered by how long it takes to fix.
     Disappears on the morning you land, when the Today card takes over. */
  function outstanding(days) {
    var items = [];

    var meta = readJSON(metaKey(user), null);
    if (!meta || !meta.people) {
      items.push({ href: '#you-docs', text: 'No passports checked yet. It is the only thing here with a lead time you cannot shorten.' });
    } else if (meta.flagged) {
      items.push({ href: '#you-docs', text: meta.flagged + (meta.flagged === 1 ? ' passport will not' : ' passports will not') + ' get you into Spain on these dates. Renew now.' });
    }

    var rows = Array.prototype.slice.call(document.querySelectorAll('.book-row'));
    var unbooked = rows.filter(function (r) {
      if (getComputedStyle(r).display === 'none') return false;
      var cb = r.querySelector('[data-book-key]');
      return cb && !cb.checked;
    });
    if (unbooked.length) {
      /* each label reads "Casamar, Llafranc", so keep the venue and drop the town,
         otherwise five bookings read as ten */
      var names = unbooked.map(function (r) {
        var st = r.querySelector('strong');
        return st ? st.textContent.replace(/\.$/, '').split(',')[0].trim() : '';
      }).filter(Boolean);
      items.push({ href: '#bookings', text: names.length + ' still to book: ' + names.join(', ') + '.' });
    }

    /* the travel card renders before this runs, so the DOM is the honest source */
    if (!document.querySelector('#travel-saved .travel-saved-card')) {
      items.push({ href: '#travel', text: 'Your flights and hire car are not saved on this phone yet.' });
    }

    var boxes = Array.prototype.slice.call(document.querySelectorAll('[data-pack-key]'));
    var packed = boxes.filter(function (b) { return b.checked; }).length;
    if (days <= 10 && boxes.length && packed < boxes.length) {
      items.push({ href: '#packing', text: 'Packing list: ' + packed + ' of ' + boxes.length + ' ticked.' });
    }

    return items;
  }

  function renderBefore() {
    var sec = document.getElementById('before');
    if (!sec) return;
    if (!user) { sec.hidden = true; return; }

    var me = PEOPLE[user];
    var days = daysBetween(today(), me.arrive);
    if (days < 0) { sec.hidden = true; return; }   /* the Today card has it from here */

    var line = document.getElementById('before-line');
    var list = document.getElementById('before-list');
    var note = document.getElementById('before-note');
    var shareBtn = document.getElementById('before-share');
    if (!line || !list) return;

    line.textContent = days === 0 ? 'You fly today'
      : days === 1 ? 'You fly tomorrow, ' + shortDate(me.arrive)
      : days + ' days to go, ' + shortDate(me.arrive);

    var items = outstanding(days);
    list.innerHTML = '';

    if (!items.length) {
      var li = document.createElement('li');
      li.textContent = 'Nothing outstanding. Passports checked, everything booked, travel saved.';
      list.appendChild(li);
      if (note) note.textContent = '';
      if (shareBtn) shareBtn.style.display = 'none';
    } else {
      items.forEach(function (it) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = it.href;
        a.textContent = it.text;
        a.className = 'before-link';
        li.appendChild(a);
        list.appendChild(li);
      });
      if (note) note.textContent = items.length === 1 ? 'One thing left.' : items.length + ' things left.';
      if (shareBtn) shareBtn.style.display = '';
    }

    if (shareBtn && !shareBtn.dataset.wired) {
      shareBtn.dataset.wired = '1';
      shareBtn.addEventListener('click', function () {
        var d = daysBetween(today(), PEOPLE[user].arrive);
        var lines = [PEOPLE[user].label + ', ' + d + ' days to go'];
        outstanding(d).forEach(function (it) { lines.push('- ' + it.text); });
        if (lines.length === 1) lines.push('Nothing outstanding.');
        share(lines.join('\n'));
      });
    }

    sec.hidden = false;
  }

  /* keep it honest as things get ticked off */
  ['change', 'input'].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;
      if (t.hasAttribute('data-book-key') || t.hasAttribute('data-pack-key')) renderBefore();
    });
  });
  window.addEventListener('focus', function () { if (user) renderBefore(); });
  window.addEventListener('storage', function () { if (user) renderBefore(); });

  /* after a rebuild, put the reader back on the paperwork tab */
  function openPane(id) {
    var tab = sec.querySelector('.you-tabs button[aria-controls="pane-' + id + '"]');
    if (!tab) return false;
    tab.click();
    return true;
  }

  function openDocsPane() { openPane('docs'); }

  /* #you-docs, #you-date and friends open that tab rather than dumping you on the
     first one. The page's own anchor handler ignores them, since no element has
     that id, so the scroll is done here. */
  var PANE_IDS = { plans: 1, date: 1, run: 1, docs: 1, book: 1, dir: 1 };

  function handleYouHash() {
    var m = /^#you-([a-z]+)$/.exec(location.hash || '');
    if (!m || !user || !PANE_IDS[m[1]]) return;
    if (!openPane(m[1])) return;
    var target = document.getElementById('you');
    if (!target) return;
    target.scrollIntoView();
    setTimeout(function () { target.scrollIntoView(); }, 450);
  }

  window.addEventListener('hashchange', handleYouHash);
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#you-"]');
    if (!a) return;
    /* same hash twice fires no hashchange, so drive it directly */
    setTimeout(handleYouHash, 0);
  });

  function start(u) {
    if (!u || !PEOPLE[u]) {
      sec.hidden = true;
      var bs = document.getElementById('before');
      if (bs) bs.hidden = true;
      user = null;
      return;
    }
    user = u;
    prefs = migratePrefs(readJSON(prefKey(u), {}));
    vaultOpen = false; vaultData = null; vaultKey = null;
    clearTimeout(idleTimer); /* a timer from the last person must not fire into this one's pane */
    mount();
    renderBefore();
    handleYouHash();
    askPersistence().then(renderStorageState);
  }

  document.addEventListener('cat26:user', function (e) { start(e.detail); });

  var initial = null;
  try { initial = localStorage.getItem('cat26_user'); } catch (e) {}
  if (initial) start(initial);
})();
