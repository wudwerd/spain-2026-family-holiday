import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const errors = [];
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });

// ===== DEVICE 1: fill it in, then back up =====
const c1 = await b.newContext({ viewport:{width:1280,height:1000}, acceptDownloads:true });
const p1 = await c1.newPage();
p1.on('pageerror', e => errors.push('D1 PAGEERROR: ' + e.message));
await p1.goto(BASE + '/', { waitUntil:'domcontentloaded' });
await p1.waitForSelector('#login-gate');
await p1.click('#login-gate button[data-u="camandben"]');
await p1.waitForSelector('#you:not([hidden])');

// prefs: interests + want list
await p1.click('.you-chips button:nth-child(1)');
await p1.waitForTimeout(200);
await p1.click('#you-picks .you-pick:nth-child(1) .pick-want');
await p1.waitForTimeout(200);
// budget
await p1.click('.you-tabs button:nth-child(2)');
await p1.fill('#pane-date input[type=number] >> nth=0','380');
await p1.fill('#pane-date input[type=number] >> nth=1','2');
await p1.waitForTimeout(250);
// vault
await p1.click('.you-tabs button[aria-controls="pane-docs"]');
await p1.waitForSelector('.vault-lock');
await p1.fill('.vault-pin','cove-swim-2026');
await p1.click('#pane-docs .you-btn');
await p1.waitForSelector('#vault-body-docs',{timeout:20000});
await p1.fill('#vault-body-docs input[name=name]','Ben Traveller');
await p1.fill('#vault-body-docs input[name=number]','998877665');
await p1.fill('#vault-body-docs input[name=expires]','2031-04-04');
await p1.fill('#vault-body-docs input[name=issued]','2023-04-04');
await p1.evaluate(()=>{const f=document.querySelectorAll('#vault-body-docs form');f[f.length-1].querySelector('button[type=submit]').click();});
await p1.waitForTimeout(700);
await p1.fill('#vault-body-docs textarea', 'Booking.com\nConfirmation number: 7712345678\nCheck-in: Sunday, 23 August 2026 from 15:00\nCheck-out: Sunday, 30 August 2026\nFree cancellation until 16 August 2026\nEUR 1,100.00');
await p1.click('#vault-body-docs button[type=submit]');
await p1.waitForTimeout(700);
await p1.evaluate(()=>document.querySelectorAll('#vault-body-docs form')[1].querySelector('button[type=submit]').click());
await p1.waitForTimeout(700);
console.log('D1 travellers:', await p1.$$eval('#vault-body-docs .trav-card h4', n=>n.map(x=>x.textContent)));

// download the backup
const [dl] = await Promise.all([
  p1.waitForEvent('download', { timeout: 15000 }),
  p1.evaluate(()=>[...document.querySelectorAll('#pane-docs button')].find(x=>x.textContent==='Save an encrypted backup').click())
]);
const path = 'backup.json';
await dl.saveAs(path);
const raw = fs.readFileSync(path,'utf8');
const parsed = JSON.parse(raw);
console.log('BACKUP file keys:', Object.keys(parsed).join(','), '| name:', dl.suggestedFilename());
console.log('BACKUP is ciphertext only:', /998877665|Ben Traveller|7712345678/.test(raw) ? 'LEAKED!!' : 'yes — nothing readable');
await c1.close();

// ===== DEVICE 2: brand new, empty, restore from the file =====
const c2 = await b.newContext({ viewport:{width:1280,height:1000} });
const p2 = await c2.newPage();
p2.on('pageerror', e => errors.push('D2 PAGEERROR: ' + e.message));
await p2.goto(BASE + '/', { waitUntil:'domcontentloaded' });
await p2.waitForSelector('#login-gate');
await p2.click('#login-gate button[data-u="camandben"]');
await p2.waitForSelector('#you:not([hidden])');
const before = await p2.$$eval('.you-chips button[aria-pressed="true"]', n=>n.length);
console.log('D2 starts empty (interests set):', before);

await p2.click('.you-tabs button[aria-controls="pane-docs"]');
await p2.waitForSelector('.vault-lock');
console.log('D2 lock says:', await p2.textContent('.vault-lock h4'));
await p2.setInputFiles('#pane-docs input[type=file]', path);
await p2.waitForTimeout(800);
console.log('D2 after loading file:', await p2.textContent('#vault-status'));
await p2.fill('.vault-pin','cove-swim-2026');
await p2.click('#pane-docs .you-btn');
await p2.waitForSelector('#vault-body-docs',{timeout:25000});
console.log('D2 travellers restored:', await p2.$$eval('#vault-body-docs .trav-card h4', n=>n.map(x=>x.textContent)));
console.log('D2 bookings restored:', await p2.$$eval('#booking-list .trav-card h4', n=>n.map(x=>x.textContent)));

// did prefs come across too?
await p2.click('.you-tabs button:nth-child(1)');
await p2.waitForTimeout(300);
console.log('D2 interests restored:', await p2.$$eval('.you-chips button[aria-pressed="true"]', n=>n.map(x=>x.textContent)));
console.log('D2 want list restored:', (await p2.textContent('#want-bar')).replace(/\s+/g,' ').slice(0,60));
await p2.click('.you-tabs button:nth-child(2)');
await p2.waitForTimeout(300);
console.log('D2 budget restored:', await p2.$$eval('#budget-out .budget-fig', n=>n.map(x=>x.textContent.trim())));

// wrong password against a restored backup
await p2.click('.you-tabs button[aria-controls="pane-docs"]');
await p2.evaluate(()=>[...document.querySelectorAll('#pane-docs button')].find(x=>x.textContent==='Lock this section').click());
await p2.waitForTimeout(400);
await p2.fill('.vault-pin','wrong-password-here');
await p2.click('#pane-docs .you-btn');
await p2.waitForTimeout(3000);
console.log('D2 wrong password:', await p2.textContent('#vault-status'));

// a backup belonging to someone else must be refused
const other = JSON.parse(raw); other.user = 'lilyandmax';
const otherPath = path.replace('.json','-other.json');
fs.writeFileSync(otherPath, JSON.stringify(other));
await p2.setInputFiles('#pane-docs input[type=file]', otherPath);
await p2.waitForTimeout(600);
console.log('D2 foreign backup refused:', await p2.$eval('.vault-restore .you-status', n=>n.textContent));

console.log('\nERRORS:', errors.length ? errors.join('\n') : 'none');
await b.close();
