// Screenshot capture for critique rounds: node scripts/shots.mjs <outdir> [baseURL]
import { chromium, devices } from '@playwright/test';
const out = process.argv[2] || 'shots'; const base = process.argv[3] || 'http://127.0.0.1:5191';
const b = await chromium.launch();
const errs = [];
async function run(name, ctxOpts, steps) {
  const ctx = await b.newContext(ctxOpts); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(name + ': ' + e.message));
  await steps(p); await p.waitForTimeout(600); await p.screenshot({ path: `${out}/${name}.png` }); await ctx.close();
}
const desk = { viewport: { width: 1440, height: 900 } };
const phone = { ...devices['iPhone 13'] };
const tapWedge = async (p, pts) => { // pts in wedge units, via the page's own fit
  for (const [edge, s] of pts) await p.evaluate(([edge, s]) => { const sa = window.__sa; sa.S.cuts.push({ edge, s, kind: sa.S.kind, size: sa.S.size }); }, [edge, s]);
};
await run('01-title-desktop', desk, (p) => p.goto(base));
await run('02-map-desktop', desk, async (p) => { await p.goto(base); await p.getByTestId('open-map').click(); });
await run('03-cut-desktop', desk, async (p) => { await p.goto(base + '/?level=7'); await p.getByTestId('foldSeg-12').click(); await p.waitForTimeout(1400);
  const box = await p.locator('#stage').boundingBox(); await p.mouse.move(box.width * .6, box.height * .5); await p.mouse.down(); await p.mouse.up(); await p.getByTestId('hint').click(); });
await run('04-result-desktop', desk, async (p) => { await p.goto(base + '/?level=11'); await p.waitForTimeout(1300); await p.evaluate(() => window.__sa.solve()); await p.evaluate(() => window.__sa.S.cuts.pop());
  await p.getByTestId('unfold').click(); await p.waitForTimeout(2000); });
await run('05-unfolding-desktop', desk, async (p) => { await p.goto(base + '/?level=12'); await p.waitForTimeout(1300); await p.evaluate(() => window.__sa.solve());
  await p.getByTestId('unfold').click(); await p.waitForTimeout(700); });
await run('06-title-phone', phone, (p) => p.goto(base));
await run('07-cut-phone', phone, async (p) => { await p.goto(base + '/?level=4'); await p.getByTestId('foldSeg-6').click(); await p.waitForTimeout(1300);
  await p.evaluate(() => { window.__sa.S.cuts.push({ edge: 'arc', s: .5, kind: 'arc', size: 3 }); }); });
await run('08-result-phone', phone, async (p) => { await p.goto(base + '/?level=10'); await p.waitForTimeout(1300); await p.evaluate(() => window.__sa.solve());
  await p.getByTestId('unfold').click(); await p.waitForTimeout(2000); await p.locator('#panel').evaluate((e) => e.scrollTo(0, 9999)); });
console.log(errs.join('\n') || 'no page errors');
await b.close();
