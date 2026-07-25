import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';

const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const CHROME = process.env.CHROME || undefined;
const errors = [];
const check = (name, cond) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + name);
  if (!cond) errors.push(name);
};

/* Headless Chromium in a sandbox often has no outbound route, so the live feed
   is fetched here and handed to the page. Same data, same parsing, and the
   suite still runs on a machine that cannot reach the Generalitat. */
function liveFeed() {
  const pad = n => String(n).padStart(2, '0');
  const now = new Date();
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push(`${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`);
  }
  const codes = ['171175-p1', '171175-p4', '170139-p5', '170139-p2', '171181-p1', '171175-p0', '171175-p2'];
  const where = `codiplatja in(${codes.map(c => `'${c}'`).join(',')}) AND (${days.map(k => `estat_data like '${k}T%'`).join(' OR ')})`;
  const url = 'https://analisi.transparenciacatalunya.cat/resource/4baz-cjv2.json'
    + '?$select=' + encodeURIComponent('codiplatja,estat_data,estat_meduses,estat_bandera,estat_motiubandera')
    + '&$where=' + encodeURIComponent(where) + '&$limit=400';
  try {
    const out = execFileSync('curl', ['-s', '--max-time', '60', url], { encoding: 'utf8', maxBuffer: 1 << 24 });
    const rows = JSON.parse(out);
    return Array.isArray(rows) && rows.length ? rows : null;
  } catch (e) {
    return null;
  }
}

const b = await chromium.launch({ executablePath: CHROME });
const c = await b.newContext({ viewport: { width: 430, height: 900 } });
const p = await c.newPage();
p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

async function serve(rows) {
  await p.unroute('**/analisi.transparenciacatalunya.cat/**').catch(() => {});
  await p.route('**/analisi.transparenciacatalunya.cat/**', route =>
    rows === null
      ? route.abort()
      : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) }));
}

async function load() {
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const gate = await p.$('#login-gate button[data-u="camandben"]');
  if (gate) await gate.click();
  await p.evaluate(() => localStorage.removeItem('cat26_jf'));
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(400);
}

function rowData() {
  return p.$$eval('#jf-rows .jf-row', els => els.map(e => ({
    beach: e.querySelector('.jf-beach')?.textContent?.trim(),
    word: e.querySelector('.jf-word')?.textContent?.trim(),
    tone: e.querySelector('.jf-word')?.className || '',
    meta: e.querySelector('.jf-meta')?.textContent?.trim(),
    dots: e.querySelectorAll('.jf-dot').length,
    bad: e.querySelectorAll('.jf-dot.is-bad').length,
    mild: e.querySelectorAll('.jf-dot.is-mild').length,
    clear: e.querySelectorAll('.jf-dot.is-clear').length,
  })));
}

/* ---- 1. the live feed, as it stands today ---- */
const live = liveFeed();
if (!live) {
  console.log('\n=== live feed: SKIPPED, no outbound network ===');
} else {
  console.log(`\n=== live feed (${live.length} reports) ===`);
  await serve(live);
  await load();
  await p.waitForSelector('#jf-rows .jf-row', { timeout: 20000 });
  const rows = await rowData();
  for (const r of rows) console.log(' ', r.beach.padEnd(12), '|', r.word, '|', r.meta, '| dots', r.dots);
  check('all seven beaches render', rows.length === 7);
  check('every beach gets a 14-day strip', rows.every(r => r.dots === 14));
  check('every beach has a status', rows.every(r => r.word));
  check('the column header is revealed', await p.$eval('#jf-head', e => !e.hidden));
  await p.screenshot({ path: 'jelly-live.png', fullPage: false });
}

/* ---- 2. a bloom, so the sighting path is actually exercised ---- */
const pad = n => String(n).padStart(2, '0');
const now = new Date();
const D0 = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
const D1 = `${pad(y.getDate())}/${pad(y.getMonth() + 1)}/${y.getFullYear()}`;

await serve([
  { codiplatja: '171175-p1', estat_data: `${D0}T10:00:00.000Z`, estat_meduses: 'Pelagia noctiluca,bastants,5-10', estat_bandera: 'groga', estat_motiubandera: 'Meduses' },
  { codiplatja: '171175-p1', estat_data: `${D1}T10:00:00.000Z`, estat_meduses: 'Pelagia noctiluca,poques,0-5', estat_bandera: 'groga', estat_motiubandera: 'Meduses' },
  { codiplatja: '171175-p4', estat_data: `${D0}T10:00:00.000Z`, estat_meduses: 'Cotylorhiza tuberculata,poques,10-15', estat_bandera: 'verda', estat_motiubandera: 'N/A' },
  { codiplatja: '170139-p5', estat_data: `${D0}T10:00:00.000Z`, estat_meduses: 'N/A', estat_bandera: 'groga', estat_motiubandera: 'Per meduses' },
  // two reports the same day at Sa Riera: the later, clear one must win
  { codiplatja: '170139-p2', estat_data: `${D0}T17:00:00.000Z`, estat_meduses: 'N/A', estat_bandera: 'verda', estat_motiubandera: 'N/A' },
  { codiplatja: '170139-p2', estat_data: `${D0}T08:00:00.000Z`, estat_meduses: 'Rhizostoma pulmo,poques,0-5', estat_bandera: 'verda', estat_motiubandera: 'N/A' },
  { codiplatja: '171181-p1', estat_data: `${D0}T10:00:00.000Z`, estat_meduses: 'Cotylorhiza tuberculata,poques,5-10;Rhizostoma pulmo,poques,10-15', estat_bandera: 'verda', estat_motiubandera: 'N/A' },
  { codiplatja: '171175-p0', estat_data: `${D0}T10:00:00.000Z`, estat_meduses: 'Physalia physalis,poques,0-5', estat_bandera: 'vermella', estat_motiubandera: 'Meduses' },
]);
await load();
await p.waitForSelector('#jf-rows .jf-row', { timeout: 20000 });
const s = Object.fromEntries((await rowData()).map(r => [r.beach, r]));
console.log('\n=== stubbed bloom ===');
for (const k of Object.keys(s)) console.log(' ', k.padEnd(12), '|', s[k].word, '|', s[k].meta, '|', s[k].tone.replace('jf-word ', ''));

check('a stinger is named in English', /Mauve stinger/.test(s.Llafranc.word));
check('a stinger says it stings', /stings/.test(s.Llafranc.meta));
check('a stinger is toned as bad', /is-bad/.test(s.Llafranc.tone));
check('a stinger counts both its days', s.Llafranc.bad === 2);
check('a harmless one is not toned as bad', !/is-bad/.test(s.Tamariu.tone));
check('a harmless one says mild sting', /mild sting/.test(s.Tamariu.meta));
check('a flag with no species is still caught', /Flagged for jellyfish/.test(s.Aiguablava.word));
check('the last report of the day wins', s['Sa Riera'].word === 'Nothing reported');
check('a clear day still marks the strip', s['Sa Riera'].clear === 1);
check('two species are both listed', /Fried egg/.test(s.Castell.word) && /Barrel/.test(s.Castell.word));
check('a man o’war says get out of the water', /get out of the water/.test(s['El Canadell'].meta));
check('sizes are rendered', /5-10cm/.test(s.Llafranc.word));
check('a beach with no report says so', /No report/.test(s['Calella / Port Bo'].word));
await p.screenshot({ path: 'jelly-bloom.png', fullPage: false });

/* ---- 3. the feed being down must not leave a spinner ---- */
await serve(null);
await load();
await p.waitForSelector('#jf-rows .wx-fail', { timeout: 20000 });
check('a dead feed offers the official page instead',
  await p.$eval('#jf-rows .wx-fail a', a => a.href.includes('gencat')));

console.log('\nERRORS:', errors.length ? errors.join('\n  ') : 'none');
await b.close();
process.exit(errors.length ? 1 : 0);
