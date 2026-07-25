import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const errors=[];
const b = await chromium.launch({
  executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']
});
const c = await b.newContext({ viewport:{width:430,height:900}, permissions:['camera'] });
const p = await c.newPage();
p.on('pageerror', e=>errors.push('PAGEERROR: '+e.message));
await p.goto(BASE + '/', { waitUntil:'domcontentloaded' });
await p.waitForSelector('#login-gate');
await p.click('#login-gate button[data-u="camandben"]');
await p.waitForSelector('#before:not([hidden])');
await p.click('.you-tabs button[aria-controls="pane-docs"]');
await p.waitForSelector('#pane-docs .vault-lock');
await p.fill('#pane-docs .vault-pin','7208');
await p.click('#pane-docs .you-btn');
await p.waitForSelector('#vault-body-docs',{timeout:20000});

console.log('buttons:', await p.$$eval('.scan-wrap .you-btn', n=>n.map(x=>x.textContent)));
console.log('capture attr removed (library allowed):', await p.$eval('.scan-wrap input[type=file]', n=>n.getAttribute('capture')));

// live camera
await p.click('.scan-wrap .you-btn');           // "Scan with the camera"
await p.waitForTimeout(3000);
console.log('stage visible :', await p.$eval('.scan-stage', n=>!n.hidden));
console.log('video playing :', await p.$eval('.scan-stage video', v=>v.videoWidth+'x'+v.videoHeight));
console.log('guide overlay :', await p.$('.scan-guide')!==null);
console.log('status        :', (await p.textContent('.scan-wrap .you-status')).slice(0,80));
await p.waitForTimeout(4000);
console.log('still scanning:', (await p.textContent('.scan-wrap .you-status')).slice(0,80));
// stop
await p.evaluate(()=>[...document.querySelectorAll('.scan-stage button')].find(b=>b.textContent==='Stop').click());
await p.waitForTimeout(500);
console.log('after Stop, stage hidden:', await p.$eval('.scan-stage', n=>n.hidden));
console.log('camera released:', await p.$eval('.scan-stage video', v=>v.srcObject===null));

// paste still works
await p.fill('#vault-body-docs textarea', `P<GBRSPECIMEN<<ALEX<TAYLOR<<<<<<<<<<<<<<<<<<
9990000010GBR8001014M3012316<<<<<<<<<<<<<<00`);
await p.evaluate(()=>{ const f=[...document.querySelectorAll('#vault-body-docs form')].find(x=>x.querySelector('textarea')); f.querySelector('button[type=submit]').click(); });
await p.waitForTimeout(600);
console.log('paste path    :', await p.$$eval('.pp-pick span', n=>n.map(x=>x.textContent)));
await p.evaluate(()=>document.querySelector('.scan-wrap').scrollIntoView());
await p.waitForTimeout(300);
await p.screenshot({ path:'scan-ui.png' });
console.log('ERRORS:', errors.length?errors.join('\n'):'none');
await b.close();
