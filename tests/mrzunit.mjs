import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await b.newContext();
const p = await c.newPage();
await p.goto(BASE + '/', { waitUntil:'domcontentloaded' });
await p.addScriptTag({ path: '../assets/you.js' }).catch(()=>{});
// exercise the repair logic through the page by pasting into the parser via the UI is slow;
// instead re-declare the pure helpers by evaluating the file in an isolated scope
const res = await p.evaluate(async () => {
  const src = await (await fetch('assets/you.js')).text();
  // expose the internals for testing only
  const fn = new Function(src.replace('})();', 'window.__t={parseMRZ:parseMRZ,mrzCheck:mrzCheck}; })();'));
  fn();
  const clean = `P<GBRSPECIMEN<<ALEX<TAYLOR<<<<<<<<<<<<<<<<<<
9990000010GBR8001014M3012316<<<<<<<<<<<<<<00`;
  // the same lines as a phone camera tends to mangle them
  const noisy = `P<GBRSPEC1MEN<<ALEX<TAYLOR<<<<<<<<<<<<<<<<<<
999000001OGBR80O1014M3012316<<<<<<<<<<<<<<00`;
  const spaced = `P<GBRSPECIMEN<<ALEX<TAYLOR<<<<<<<<<<<<<<<<<<
99900000 10GBR8001014 M3012316<<<<<<<<<<<<<<00`;
  const guill = `P<GBRSPECIMEN«ALEX<TAYLOR«««««««««
9990000010GBR8001014M3012316«««««««00`;
  const out = {};
  for (const [k,v] of Object.entries({clean, noisy, spaced, guill})) {
    const z = window.__t.parseMRZ(v);
    out[k] = z ? { num:z.number, exp:z.expires, dob:z.dob, name:(z.given+' '+z.surname).trim(), ok:z.allChecksPass } : null;
  }
  return out;
});
for (const [k,v] of Object.entries(res)) console.log(k.padEnd(8), JSON.stringify(v));
await b.close();
