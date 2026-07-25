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
await p.waitForTimeout(900);
console.log('packing checkboxes:', await p.$$eval('[data-pack-key]', n=>n.length));
console.log('packing progress  :', await p.textContent('#packing-progress'));
// tick one, confirm trip-kit.js still runs despite the removed flight form
await p.evaluate(()=>{ const b=document.querySelector('[data-pack-key]'); b.checked=true; b.dispatchEvent(new Event('change',{bubbles:true})); });
await p.waitForTimeout(300);
console.log('after ticking one :', await p.textContent('#packing-progress'));
console.log('official links    :', await p.$$eval('.official-links a', n=>n.length));
console.log('orphan heading gone:', await p.$$eval('h2', n=>!n.some(x=>/Add your flights/.test(x.textContent))));
console.log('ERRORS:', errors.length?errors.join('\n'):'none');
await b.close();
