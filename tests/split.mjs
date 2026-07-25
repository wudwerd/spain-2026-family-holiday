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
console.log('tabs:', await p.$$eval('.you-tabs button', n=>n.map(x=>x.textContent)));

// unlock via the Passports tab
await p.click('.you-tabs button[aria-controls="pane-docs"]');
await p.waitForSelector('#pane-docs .vault-lock');
console.log('passports heading:', await p.textContent('#pane-docs h3'));
await p.fill('#pane-docs .vault-pin','7208');
await p.click('#pane-docs .you-btn');
await p.waitForSelector('#vault-body-docs',{timeout:20000});
console.log('passports pane has: bookings?', await p.$('#vault-body-docs #booking-list')!==null,
            '| traveller form?', await p.$('#vault-body-docs input[name=number]')!==null);

// paste bare MRZ only - the camera-copy case
const mrz = `P<GBRSPECIMEN<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
9900000001GBR8501014F3012315<<<<<<<<<<<<<<02`;
await p.fill('#vault-body-docs textarea', mrz);
await p.evaluate(()=>{
  const f=[...document.querySelectorAll('#vault-body-docs form')].find(x=>x.querySelector('textarea'));
  f.querySelector('button[type=submit]').click();
});
await p.waitForTimeout(700);
console.log('bare MRZ ->', await p.$$eval('#vault-body-docs .pp-pick span', n=>n.map(x=>x.textContent)));
const rows = await p.$$eval('#vault-body-docs .trav-row', n=>n.map(x=>x.textContent.replace(/\s+/g,' ')));
rows.slice(0,4).forEach(r=>console.log('   ', r));

// bookings tab is separate and already unlocked
await p.click('.you-tabs button[aria-controls="pane-book"]');
await p.waitForTimeout(600);
console.log('bookings heading:', await p.textContent('#pane-book h3'));
console.log('bookings pane has: booking list?', await p.$('#vault-body-book #booking-list')!==null,
            '| passport form?', await p.$('#vault-body-book input[name=number]')!==null);
console.log('ERRORS:', errors.length?errors.join('\n'):'none');
await b.close();
