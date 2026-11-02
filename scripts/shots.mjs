// Screenshot capture for critique rounds: node scripts/shots.mjs <outdir> [baseURL]
import { chromium, devices } from '@playwright/test';
const out = process.argv[2] || 'shots'; const base = process.argv[3] || 'http://127.0.0.1:5191';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function run(name, ctxOpts, steps) {
  const ctx = await b.newContext(ctxOpts); const p = await ctx.newPage();
  await steps(p); await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${name}.png` }); await ctx.close();
}
const desk = { viewport: { width: 1440, height: 900 } };
const phone = { ...devices['iPhone 13'] };
const cut = async (p, n) => { for (let i = 0; i < n; i++) { await p.getByTestId('cut').click(); await p.waitForTimeout(80); } };
await run('01-title-desktop', desk, (p) => p.goto(base));
await run('02-map-desktop', desk, async (p) => { await p.goto(base); await p.getByTestId('begin').click(); });
await run('03-level-1-4-desktop', desk, async (p) => { await p.goto(base + '/?level=1-4'); await cut(p, 3); });
await run('04-level-2-3-win-desktop', desk, async (p) => { await p.goto(base + '/?level=2-3'); await p.getByTestId('choice-1').click(); await cut(p, 5); await p.getByTestId('present').click(); });
await run('05-anti-desktop', desk, async (p) => { await p.goto(base + '/?level=4-1'); await p.getByTestId('dir-in').click(); await cut(p, 3); });
await run('06-sierpinski-desktop', desk, async (p) => { await p.goto(base + '/?level=5-2'); await cut(p, 4); });
await run('07-cantor-desktop', desk, async (p) => { await p.goto(base + '/?level=5-3'); await p.getByTestId('kind-cantor').click(); await cut(p, 5); });
await run('08-gallery-desktop', desk, async (p) => {
  await p.goto(base + '/?level=1-1'); await p.evaluate(() => localStorage.setItem('sa.done', JSON.stringify(['1-1','1-4','2-3','3-3','4-1','4-3','4-4','5-1','5-3','5-4'])));
  await p.goto(base); await p.getByTestId('open-gallery').click(); });
await run('09-title-phone', phone, (p) => p.goto(base));
await run('10-level-phone', phone, async (p) => { await p.goto(base + '/?level=2-2'); await cut(p, 2); });
await run('11-studio-quad-phone', phone, async (p) => { await p.goto(base + '/#studio'); await p.getByTestId('kind-quad').click(); await cut(p, 3); });
await b.close();
