import { chromium } from '@playwright/test';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('http://127.0.0.1:5191/'); await p.waitForTimeout(800);
console.log(await p.evaluate(() => { const { LEVELS, mask, matchScore } = window.__sa; return LEVELS.map((L) => { const t = mask(L.folds, L.cuts);
  const drops = L.cuts.map((_, i) => matchScore(mask(L.folds, L.cuts.filter((_, j) => j !== i)), t));
  const wrongFold = Math.max(...[2,4,6,8,12].filter(f => f !== L.folds).map(f => matchScore(mask(f, L.cuts), t)));
  const shifted = matchScore(mask(L.folds, L.cuts.map(c => ({...c, s: Math.min(1, c.s + 0.05)}))), t);
  return `${L.id} pass${L.pass} drop1=${drops} wrongFold=${wrongFold} nudge=${shifted}`; }).join('\n'); }));
await b.close();
