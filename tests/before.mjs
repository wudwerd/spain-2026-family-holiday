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
await p.waitForSelector('#before:not([hidden])', { timeout:10000 });

const read = async () => ({
  line: await p.textContent('#before-line'),
  items: await p.$$eval('#before-list li', n=>n.map(x=>x.textContent)),
  note: await p.textContent('#before-note')
});
console.log('--- fresh (nothing done) ---');
let s = await read(); console.log(' line :', s.line); s.items.forEach(i=>console.log('   *', i)); console.log(' note :', s.note);

// tick every booking
await p.$$eval('.book-row [data-book-key]', ns=>ns.forEach(n=>{ if(!n.checked){n.checked=true; n.dispatchEvent(new Event('change',{bubbles:true}));} }));
await p.waitForTimeout(400);
console.log('\n--- after ticking all bookings ---');
s = await read(); s.items.forEach(i=>console.log('   *', i)); console.log(' note :', s.note);

// add a passport (good one) via the vault
await p.click('nav a[href="#you"]'); await p.waitForTimeout(600);
await p.click('.you-tabs button[aria-controls="pane-docs"]');
await p.waitForSelector('.vault-lock');
await p.fill('.vault-pin','before-card-test');
await p.click('#pane-docs .you-btn');
await p.waitForSelector('#vault-body-docs',{timeout:20000});
await p.fill('#vault-body-docs input[name=name]','Chris W');
await p.fill('#vault-body-docs input[name=number]','111222333');
await p.fill('#vault-body-docs input[name=issued]','2023-01-01');
await p.fill('#vault-body-docs input[name=expires]','2031-01-01');
await p.evaluate(()=>{const f=document.querySelectorAll('#vault-body-docs form'); f[f.length-1].querySelector('button[type=submit]').click();});
await p.waitForTimeout(900);
console.log('\n--- after adding a valid passport ---');
s = await read(); s.items.forEach(i=>console.log('   *', i)); console.log(' note :', s.note);

// now a BAD passport - expires too soon
await p.fill('#vault-body-docs input[name=name]','Estelle W');
await p.fill('#vault-body-docs input[name=number]','444555666');
await p.fill('#vault-body-docs input[name=issued]','2023-01-01');
await p.fill('#vault-body-docs input[name=expires]','2026-09-15');
await p.evaluate(()=>{const f=document.querySelectorAll('#vault-body-docs form'); f[f.length-1].querySelector('button[type=submit]').click();});
await p.waitForTimeout(900);
console.log('\n--- after adding a short-dated passport ---');
s = await read(); s.items.forEach(i=>console.log('   *', i));

// what leaked outside the vault?
const meta = await p.evaluate(()=>localStorage.getItem('cat26_docs_meta_estelleandchris'));
console.log('\n meta stored outside the vault:', meta);
console.log(' contains any name/number?', /Chris|Estelle|111222333|444555666/.test(meta) ? 'LEAKED!!' : 'no - counts only');

console.log('\nERRORS:', errors.length?errors.join('\n'):'none');
await b.close();
