/* Jellyfish watch.
 *
 * Source: "Estat de les platges de Catalunya", the log the lifeguards fill in
 * on each staffed beach, published by the Generalitat as open data and updated
 * through the day. Every beach on our list is in it except Illa Roja, which
 * has no lifeguard.
 *
 * There is no jellyfish forecast. Nobody publishes one for this coast, and
 * anything claiming to predict a bloom three days out is guessing. What the
 * data does give is fourteen days of daily reports per beach, which is how you
 * actually read it: a bloom that has been sitting on Sa Riera all week is
 * likely to still be there tomorrow, and a clear fortnight means clear.
 */
(function () {
  var rowsEl = document.getElementById('jf-rows');
  if (!rowsEl) return;

  var BEACHES = [
    { name: 'Llafranc',      code: '171175-p1' },
    { name: 'Tamariu',       code: '171175-p4' },
    { name: 'Aiguablava',    code: '170139-p5' },
    { name: 'Sa Riera',      code: '170139-p2' },
    { name: 'Castell',       code: '171181-p1' },
    { name: 'El Canadell',   code: '171175-p0' },
    { name: 'Calella / Port Bo', code: '171175-p2' }
  ];

  /* The fifteen species that appear anywhere in the dataset. The sting note is
     the reason anyone reads this panel at all: a barrel jellyfish on the sand
     is a photograph, a mauve stinger in the water is the end of the swim. */
  var SPECIES = {
    'rhizostoma pulmo':        ['Barrel jellyfish', 'mild'],
    'cotylorhiza tuberculata': ['Fried egg jellyfish', 'mild'],
    'pelagia noctiluca':       ['Mauve stinger', 'bad'],
    'pelagia benovici':        ['Pelagia benovici', 'bad'],
    'chrysaora hysoscella':    ['Compass jellyfish', 'bad'],
    'carybdea marsupialis':    ['Box jellyfish', 'bad'],
    'olindias phosphorica':    ['Flower hat jelly', 'bad'],
    'physalia physalis':       ['Portuguese man o’war', 'worst'],
    'phyllorhiza punctata':    ['White-spotted jellyfish', 'mild'],
    'aurelia aurita':          ['Moon jellyfish', 'none'],
    'velella velella':         ['By-the-wind sailor', 'none'],
    'porpita porpita':         ['Blue button', 'none'],
    'mnemiopsis leidyi':       ['Sea walnut', 'none'],
    'aequorea forskalea':      ['Crystal jelly', 'none'],
    'discomedusa lobata':      ['Discomedusa', 'none']
  };
  var STING = {
    worst: 'get out of the water',
    bad:   'stings',
    mild:  'mild sting',
    none:  'harmless'
  };
  var HOWMANY = { poques: 'a few', bastants: 'a lot', moltes: 'swarms' };
  var FLAG = { verda: 'Green flag', groga: 'Yellow flag', vermella: 'Red flag' };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function key(d) { return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); }

  var today = new Date();
  var WINDOW = 14;
  var days = [];
  for (var i = WINDOW - 1; i >= 0; i--) {
    var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    days.push(key(d));
  }

  /* estat_data is a string, "25/07/2026T15:54:30.000Z", so the API cannot sort
     or range-filter it. Matching one pattern per day is exact and keeps the
     response to a few tens of kilobytes instead of the whole season. */
  function url() {
    var codes = BEACHES.map(function (b) { return "'" + b.code + "'"; }).join(',');
    var pats = days.map(function (k) { return "estat_data like '" + k + "T%'"; }).join(' OR ');
    var where = 'codiplatja in(' + codes + ') AND (' + pats + ')';
    return 'https://analisi.transparenciacatalunya.cat/resource/4baz-cjv2.json'
      + '?$select=' + encodeURIComponent('codiplatja,estat_data,estat_meduses,estat_bandera,estat_motiubandera')
      + '&$where=' + encodeURIComponent(where)
      + '&$limit=400';
  }

  /* "Pelagia noctiluca,poques,0-5" and occasionally two of them joined by a
     semicolon. Returns null when the lifeguard left the field alone. */
  function readSighting(raw) {
    if (!raw || raw === 'N/A') return null;
    var worst = 'none', order = { none: 0, mild: 1, bad: 2, worst: 3 }, parts = [];
    raw.split(';').forEach(function (chunk) {
      var bits = chunk.split(',');
      var latin = (bits[0] || '').trim().toLowerCase();
      var known = SPECIES[latin];
      var name = known ? known[0] : (bits[0] || '').trim();
      var harm = known ? known[1] : 'bad';   /* unknown species is treated as one that stings */
      if (order[harm] > order[worst]) worst = harm;
      var many = HOWMANY[(bits[1] || '').trim().toLowerCase()];
      var size = (bits[2] || '').trim();
      var line = name;
      if (many) line += ', ' + many;
      if (size && size !== 'N/A') line += ', ' + size.replace('>', 'over ') + 'cm';
      parts.push(line);
    });
    if (!parts.length) return null;
    return { text: parts.join(' and '), harm: worst };
  }

  function flaggedForJellyfish(reason) {
    return !!reason && /medus/i.test(reason);
  }

  function dayOf(row) { return (row.estat_data || '').slice(0, 10); }

  function render(rows) {
    var byBeach = {};
    rows.forEach(function (r) {
      var b = byBeach[r.codiplatja] || (byBeach[r.codiplatja] = {});
      var day = dayOf(r);
      var prev = b[day];
      /* Several reports a day; the last one written is the one that stands. */
      if (!prev || (r.estat_data || '') > (prev.estat_data || '')) b[day] = r;
    });

    var html = '';
    BEACHES.forEach(function (beach) {
      var byDay = byBeach[beach.code] || {};
      var dots = '', seen = 0, latest = null, latestDay = null;

      days.forEach(function (k) {
        var r = byDay[k];
        var cls = 'jf-dot', title = k.slice(0, 5) + ' no report';
        if (r) {
          latest = r; latestDay = k;
          var s = readSighting(r.estat_meduses);
          if (s) {
            seen++;
            cls += ' is-' + (s.harm === 'none' ? 'mild' : s.harm === 'worst' ? 'bad' : s.harm);
            title = k.slice(0, 5) + ' ' + s.text;
          } else if (flaggedForJellyfish(r.estat_motiubandera)) {
            seen++;
            cls += ' is-bad';
            title = k.slice(0, 5) + ' flagged for jellyfish';
          } else {
            cls += ' is-clear';
            title = k.slice(0, 5) + ' nothing reported';
          }
        }
        dots += '<span class="' + cls + '" title="' + title + '"></span>';
      });

      var status, note = '', tone = 'clear';
      if (!latest) {
        status = 'No report in the last fortnight';
        tone = 'none';
      } else {
        var s2 = readSighting(latest.estat_meduses);
        if (s2) {
          status = s2.text;
          note = STING[s2.harm];
          tone = (s2.harm === 'none') ? 'mild' : (s2.harm === 'worst' ? 'bad' : s2.harm);
        } else if (flaggedForJellyfish(latest.estat_motiubandera)) {
          status = 'Flagged for jellyfish';
          note = 'no species logged';
          tone = 'bad';
        } else {
          status = 'Nothing reported';
        }
        var flag = FLAG[(latest.estat_bandera || '').toLowerCase()];
        var stamp = latestDay.slice(0, 5);
        note = note ? note + ' · ' + stamp : stamp;
        if (flag && !s2) note = flag + ' · ' + note;
      }

      html += '<div class="jf-row">'
        + '<div class="jf-beach">' + beach.name + '</div>'
        + '<div class="jf-state"><div class="jf-word is-' + tone + '">' + status + '</div>'
        + '<div class="jf-meta">' + note + '</div></div>'
        + '<div class="jf-strip" aria-label="' + (seen ? seen + ' of the last ' + WINDOW + ' days had jellyfish' : 'no jellyfish in the last ' + WINDOW + ' days') + '">' + dots + '</div>'
        + '</div>';
    });

    rowsEl.innerHTML = html;
    var head = document.getElementById('jf-head');
    if (head) head.hidden = false;
  }

  function fail() {
    rowsEl.innerHTML = '<div class="wx-fail">The beach log could not load here. '
      + '<a href="https://interior.gencat.cat/ca/arees_dactuacio/proteccio_civil/estatplatges/" target="_blank" rel="noopener">Check it directly ↗</a></div>';
  }

  var CACHE = 'cat26_jf';
  function cached() {
    try {
      var c = JSON.parse(localStorage.getItem(CACHE));
      if (c && Date.now() - c.t < 30 * 60 * 1000 && c.k === days[days.length - 1]) return c.d;
    } catch (e) {}
    return null;
  }

  var hit = cached();
  if (hit) { render(hit); return; }

  var ac = ('AbortController' in window) ? new AbortController() : null;
  if (ac) setTimeout(function () { ac.abort(); }, 12000);
  fetch(url(), ac ? { signal: ac.signal } : undefined)
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (d) {
      if (!Array.isArray(d)) throw 0;
      try { localStorage.setItem(CACHE, JSON.stringify({ t: Date.now(), k: days[days.length - 1], d: d })); } catch (e) {}
      render(d);
    })
    .catch(fail);
})();
