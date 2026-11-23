import { readFileSync } from 'node:fs';
const files = [
  'apps/portal/static/campus/mgimo/v-1.svg',
  'apps/portal/static/campus/mgimo/b-0.svg'
];
for (const p of files) {
  const s = readFileSync(p, 'utf8');
  for (const m of ['«', '»']) {
    let j = s.indexOf(m);
    while (j !== -1) {
      console.log(p, JSON.stringify(s.slice(Math.max(0, j - 60), j + 60)));
      j = s.indexOf(m, j + 1);
    }
  }
}
