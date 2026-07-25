import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:4173';

const errors = [];
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const c = await b.newContext({ viewport: { width: 430, height: 900 } });
const p = await c.newPage();
p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await p.waitForSelector('#login-gate');
await p.click('#login-gate button[data-u="camandben"]');
await p.waitForSelector('#before:not([hidden])');

// --- persistence is requested, and its state is shown where it matters ---
const persisted = await p.evaluate(() => navigator.storage?.persisted?.() ?? null);
console.log('storage.persisted() ->', persisted);

await p.click('.you-tabs button[aria-controls="pane-docs"]');
await p.waitForSelector('#pane-docs .vault-lock');
await p.fill('#pane-docs .vault-pin', 'durability-test');
await p.click('#pane-docs .you-btn');
await p.waitForSelector('#vault-body-docs', { timeout: 20000 });
await p.waitForTimeout(600);
const dur = await p.textContent('#durability');
console.log('durability notice shown:', !!dur);
console.log('  ', (dur || '').slice(0, 90));

// --- schema stamp is written on a normal save ---
await p.click('.you-tabs button[aria-controls="pane-plans"]');
await p.waitForTimeout(300);
await p.click('.you-chips button');
await p.waitForTimeout(400);
console.log('prefs carry a schema version:', await p.evaluate(() => {
  const raw = localStorage.getItem('cat26_you_camandben');
  return raw ? JSON.parse(raw).v : null;
}));

// --- a failed write must be visible, not swallowed ---
await p.evaluate(() => {
  const real = Storage.prototype.setItem;
  window.__restore = () => { Storage.prototype.setItem = real; };
  Storage.prototype.setItem = function () {
    const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e;
  };
});
await p.click('.you-chips button');            // toggling an interest writes prefs
await p.waitForTimeout(400);
const banner = await p.$('#storage-alert');
console.log('failed write surfaces a banner:', banner !== null);
if (banner) console.log('  ', (await p.textContent('#storage-alert')).slice(0, 90));
await p.evaluate(() => window.__restore());

// --- schema stamp is written, and old unstamped data is migrated ---
await p.evaluate(() => {
  localStorage.setItem('cat26_you_camandben', JSON.stringify({ interests: ['coves'] })); // no v, as v0
});
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForSelector('#you:not([hidden])');
await p.waitForTimeout(400);
await p.click('.you-chips button');
await p.waitForTimeout(400);
const migrated = await p.evaluate(() => {
  const j = JSON.parse(localStorage.getItem('cat26_you_camandben'));
  return { v: j.v, keptInterests: Array.isArray(j.interests) };
});
console.log('v0 data migrated forward:', JSON.stringify(migrated));

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await b.close();
