import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const errors=[];
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await b.newContext({ viewport:{width:1200,height:1000} });
const p = await c.newPage();
p.on('pageerror', e=>errors.push('PAGEERROR: '+e.message));
await p.goto(BASE + '/', { waitUntil:'domcontentloaded' });
await p.waitForSelector('#login-gate');
await p.click('#login-gate button[data-u="estelleandchris"]');
await p.waitForSelector('#before:not([hidden])');
await p.click('.you-tabs button[aria-controls="pane-book"]');
await p.waitForSelector('#pane-book .vault-lock');
await p.fill('#pane-book .vault-pin','7208');
await p.click('#pane-book .you-btn');
await p.waitForSelector('#vault-body-book',{timeout:20000});
await p.fill('#vault-body-book textarea', `British Airways
Booking reference: AB12CD
Outbound Thursday 20 August 2026
BA478 London Heathrow (LHR) 15:15 -> Barcelona (BCN) 18:35
Return Wednesday 2 September 2026
BA479 Barcelona (BCN) 19:30 -> London Heathrow (LHR) 20:45
Total paid: £1,284.60`);
await p.evaluate(()=>{ const f=[...document.querySelectorAll('#vault-body-book form')].find(x=>x.querySelector('textarea')); f.querySelector('button[type=submit]').click(); });
await p.waitForTimeout(800);
console.log('parse:', await p.textContent('#vault-body-book .you-status'));
await p.evaluate(()=>document.querySelectorAll('#vault-body-book form')[1].querySelector('button[type=submit]').click());
await p.waitForTimeout(800);
console.log('saved:', await p.$$eval('#booking-list .trav-card h4', n=>n.map(x=>x.textContent)));
// lock from bookings, confirm passports tab locks too
await p.evaluate(()=>[...document.querySelectorAll('#pane-book button')].find(b=>b.textContent==='Lock this section').click());
await p.waitForTimeout(500);
await p.click('.you-tabs button[aria-controls="pane-docs"]');
await p.waitForTimeout(500);
console.log('passports locked too:', await p.$('#pane-docs .vault-lock')!==null);
console.log('ERRORS:', errors.length?errors.join('\n'):'none');
await b.close();
