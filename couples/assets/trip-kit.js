(function () {
  var packInputs = Array.prototype.slice.call(document.querySelectorAll('[data-pack-key]'));
  var packProgress = document.getElementById('packing-progress');
  var packReset = document.getElementById('packing-reset');
  var PACK_KEY = 'cat26-packing-v1';

  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }

  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  function updatePackProgress() {
    if (!packProgress) return;
    var complete = packInputs.filter(function (input) { return input.checked; }).length;
    packProgress.textContent = complete + ' of ' + packInputs.length + ' ready';
  }

  if (packInputs.length) {
    var packState = readJSON(PACK_KEY, {});
    packInputs.forEach(function (input) {
      input.checked = !!packState[input.dataset.packKey];
      input.addEventListener('change', function () {
        var state = readJSON(PACK_KEY, {});
        state[input.dataset.packKey] = input.checked;
        writeJSON(PACK_KEY, state);
        updatePackProgress();
      });
    });
    updatePackProgress();
  }

  if (packReset) {
    packReset.addEventListener('click', function () {
      writeJSON(PACK_KEY, {});
      packInputs.forEach(function (input) { input.checked = false; });
      updatePackProgress();
    });
  }

  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    var copied = false;
    try { copied = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(area);
    return copied;
  }

  function copyText(text, button) {
    var done = function () {
      if (!button) return;
      var original = button.textContent;
      button.textContent = 'Copied';
      setTimeout(function () { button.textContent = original; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        if (fallbackCopy(text)) done();
      });
    } else if (fallbackCopy(text)) {
      done();
    }
  }

  var copyChris = document.getElementById('copy-chris-travel');
  if (copyChris) {
    copyChris.addEventListener('click', function () {
      copyText(
        "Chris's travel party (4)\n" +
        'Out: Thu 20 Aug 2026 · LHR 15:15 → BCN 18:35 · British Airways\n' +
        'Car: BCN pickup 20 Aug 19:30 · Peugeot e-2008 or similar\n' +
        'Car return: BCN 2 Sep 17:30\n' +
        'Back: Wed 2 Sep 2026 · BCN 19:30 → LHR 20:45 · British Airways',
        copyChris
      );
    });
  }

  var form = document.getElementById('flight-form');
  var flightWrap = document.getElementById('saved-flights');
  var flightStatus = document.getElementById('flight-status');
  var FLIGHT_KEY = 'cat26-flight-board-v1';
  if (!form || !flightWrap) return;

  function textEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }

  function dateLabel(value) {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
        .format(new Date(value + 'T12:00:00'));
    } catch (e) { return value; }
  }

  function legText(f, prefix) {
    var date = dateLabel(f[prefix + 'Date']);
    var route = (f[prefix + 'From'] || 'Not entered') + ' ' + (f[prefix + 'Depart'] || '') + ' → ' +
      (f[prefix + 'To'] || 'Not entered') + ' ' + (f[prefix + 'Arrive'] || '');
    return (date ? date + ' · ' : '') + route.trim();
  }

  function shareText(f) {
    var lines = [f.name + (f.travellers ? ' (' + f.travellers + ' traveller' + (f.travellers === '1' ? '' : 's') + ')' : '')];
    if (f.carrier) lines.push('Carrier / flight: ' + f.carrier);
    if (f.lounge) lines.push('Lounge: ' + f.lounge);
    lines.push('Out: ' + legText(f, 'out'));
    lines.push('Back: ' + legText(f, 'back'));
    if (f.notes) lines.push('Notes: ' + f.notes);
    return lines.join('\n');
  }

  function loadFlights() { return readJSON(FLIGHT_KEY, []); }

  function renderFlights() {
    flightWrap.innerHTML = '';
    loadFlights().forEach(function (f, index) {
      var card = textEl('article', 'flight-card');
      var head = textEl('div');
      head.appendChild(textEl('div', 'eyebrow', 'Saved on this device'));
      head.appendChild(textEl('h3', null, f.name));
      head.appendChild(textEl('div', 'flight-card-meta',
        (f.travellers ? f.travellers + ' traveller' + (f.travellers === '1' ? '' : 's') : 'Traveller') +
        (f.carrier ? ' · ' + f.carrier : '')));

      var details = textEl('div');
      var out = textEl('div', 'flight-line', legText(f, 'out'));
      out.insertBefore(textEl('span', null, 'Out'), out.firstChild);
      details.appendChild(out);
      var back = textEl('div', 'flight-line', legText(f, 'back'));
      back.insertBefore(textEl('span', null, 'Back'), back.firstChild);
      details.appendChild(back);
      if (f.lounge) {
        var lounge = textEl('div', 'flight-line', f.lounge);
        lounge.insertBefore(textEl('span', null, 'Lounge'), lounge.firstChild);
        details.appendChild(lounge);
      }
      if (f.notes) details.appendChild(textEl('p', 'flight-notes', f.notes));

      var actions = textEl('div', 'flight-actions');
      var copy = textEl('button', null, 'Copy for group');
      copy.type = 'button';
      copy.addEventListener('click', function () { copyText(shareText(f), copy); });
      var remove = textEl('button', null, 'Remove');
      remove.type = 'button';
      remove.addEventListener('click', function () {
        var list = loadFlights();
        list.splice(index, 1);
        writeJSON(FLIGHT_KEY, list);
        renderFlights();
      });
      actions.appendChild(copy);
      actions.appendChild(remove);
      details.appendChild(actions);
      card.appendChild(head);
      card.appendChild(details);
      flightWrap.appendChild(card);
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var data = new FormData(form);
    var flight = {
      name: (data.get('name') || '').trim(),
      travellers: (data.get('travellers') || '').trim(),
      carrier: (data.get('carrier') || '').trim(),
      lounge: (data.get('lounge') || '').trim(),
      outDate: data.get('out-date') || '',
      outFrom: (data.get('out-from') || '').trim().toUpperCase(),
      outTo: (data.get('out-to') || '').trim().toUpperCase(),
      outDepart: data.get('out-depart') || '',
      outArrive: data.get('out-arrive') || '',
      backDate: data.get('back-date') || '',
      backFrom: (data.get('back-from') || '').trim().toUpperCase(),
      backTo: (data.get('back-to') || '').trim().toUpperCase(),
      backDepart: data.get('back-depart') || '',
      backArrive: data.get('back-arrive') || '',
      notes: (data.get('notes') || '').trim()
    };
    if (!flight.name || !flight.outDate || !flight.outFrom || !flight.outTo) return;
    var flights = loadFlights();
    flights.push(flight);
    writeJSON(FLIGHT_KEY, flights);
    form.reset();
    renderFlights();
    if (flightStatus) {
      flightStatus.textContent = 'Saved. Now copy it into the group chat';
      setTimeout(function () { flightStatus.textContent = ''; }, 3500);
    }
  });

  renderFlights();
})();
