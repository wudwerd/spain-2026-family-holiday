import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const errors=[];
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await b.newContext({ viewport:{width:1200,height:900} });
const p = await c.newPage();
p.on('pageerror', e=>errors.push('PAGEERROR: '+e.message));
await p.goto(BASE + '/', { waitUntil:'domcontentloaded' });
await p.waitForSelector('#login-gate');
await p.click('#login-gate button[data-u="estelleandchris"]');
await p.waitForSelector('#before:not([hidden])');

const state = async () => await p.evaluate(()=>{
  const t=[...document.querySelectorAll('.you-tabs button')].find(b=>b.getAttribute('aria-selected')==='true');
  const y=document.getElementById('you').getBoundingClientRect();
  return { tab: t && t.textContent, youTop: Math.round(y.top) };
});
console.log('start:', JSON.stringify(await state()));

// click the passport line in the before card
const href = await p.$eval('#before-list a', a=>a.getAttribute('href'));
console.log('passport link href =', href);
await p.click('#before-list a');
await p.waitForTimeout(1400);
console.log('after click:', JSON.stringify(await state()), ' <- should be Passports, youTop near 0');

// scroll away, then test the deep link cold in a fresh load
await p.goto(BASE + '/#you-docs', { waitUntil:'domcontentloaded' });
await p.waitForTimeout(1800);
console.log('cold load of #you-docs:', JSON.stringify(await state()));

// and another tab, to prove it is general
await p.goto(BASE + '/#you-date', { waitUntil:'domcontentloaded' });
await p.waitForTimeout(1800);
console.log('cold load of #you-date:', JSON.stringify(await state()));

// plain #you must still work as before
await p.goto(BASE + '/#you', { waitUntil:'domcontentloaded' });
await p.waitForTimeout(1800);
console.log('cold load of #you   :', JSON.stringify(await state()), ' <- default tab, still scrolls');

console.log('ERRORS:', errors.length?errors.join('\n'):'none');
await b.close();
