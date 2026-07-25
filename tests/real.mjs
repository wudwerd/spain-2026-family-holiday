import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await b.newContext(); const p = await c.newPage();
await p.goto(BASE + '/', { waitUntil:'domcontentloaded' });
const out = await p.evaluate(async () => {
  const src = await (await fetch('assets/you.js')).text();
  new Function(src.replace('})();','window.__t={parseMRZ,mrzCheck,checkPassport,PEOPLE:PEOPLE}; })();'))();
  const T = window.__t;
  // a synthetic passport whose check digits genuinely compute
  const real = `P<GBRSPECIMEN<<ALEX<TAYLOR<<<<<<<<<<<<<<<<<<
9990000010GBR8001014M3012316<<<<<<<<<<<<<<00`;
  // the same MRZ as a camera commonly mangles it
  const mangles = {
    'clean'          : real,
    'O for 0, I for 1': real.replace(/0/g,'O').replace(/1/g,'I'),
    'S for 5, B for 8': real.replace(/5/g,'S').replace(/8/g,'B'),
    'guillemets'     : real.replace(/<</g,'«'),
    'spaces inserted': real.replace(/(.{10})/g,'$1 '),
    'lines swapped'  : real.split('\n').reverse().join('\n')
  };
  const res = {};
  for (const [k,v] of Object.entries(mangles)) {
    const z = T.parseMRZ(v);
    res[k] = z ? { num:z.number, name:(z.given+' '+z.surname).trim(), dob:z.dob, exp:z.expires, sex:z.sex, nat:z.nationality, checksPass:z.allChecksPass } : null;
  }
  // and the Schengen verdict for this couple's dates
  const me = T.PEOPLE.estelleandchris;
  const z = T.parseMRZ(real);
  res._verdict = T.checkPassport({ number:z.number, issued:'2021-05-12', expires:z.expires }, me.arrive, me.leave);
  return res;
});
for (const [k,v] of Object.entries(out)) {
  if (k === '_verdict') continue;
  console.log(k.padEnd(18), v ? (v.checksPass ? 'PASS ' : 'read ') + JSON.stringify(v) : 'FAILED');
}
console.log('\nSchengen check for 20 Aug - 2 Sep 2026:');
out._verdict.forEach(f => console.log('  ', f.bad ? 'PROBLEM:' : 'OK:', f.msg));
await b.close();
