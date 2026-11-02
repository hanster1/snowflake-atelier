import './style.css';
import { Score } from './audio';
import { kochPolygon } from './fractal';
import { LEVELS, CHAPTERS } from './levels';
import { FOLDS, FOLD_INFO, KIND_INFO, cutPolygon, mask, matchScore, nearestEdge, paintUnfolded, paintWedge, tracePoly, wedgeAngle,
  type Cut, type CutKind, type Folds, type Size } from './paper';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('stage'); const ctx = canvas.getContext('2d')!;
const audio = new Score();
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DPR = Math.min(devicePixelRatio, 2);
const best: Record<string, number> = JSON.parse(localStorage.getItem('sa2.best') || '{}');

type Phase = 'title' | 'folding' | 'cut' | 'unfolding' | 'result';
const S = {
  phase: 'title' as Phase, li: 0, folds: 2 as Folds, cuts: [] as Cut[], kind: 'tri' as CutKind, size: 2 as Size,
  anim: 0, animStart: 0, hover: null as Cut | null, hint: false, score: 0, diff: null as HTMLCanvasElement | null,
};
const lv = () => LEVELS[S.li];

// ---------- background (cut-paper doilies, drawn exactly) ----------
let bg = document.createElement('canvas'); let W = 0, H = 0;
function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }
function resize() {
  const r = canvas.getBoundingClientRect(); W = r.width; H = r.height;
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  bg = document.createElement('canvas'); bg.width = canvas.width; bg.height = canvas.height;
  const c = bg.getContext('2d')!; c.scale(DPR, DPR);
  const g = c.createRadialGradient(W * .5, H * .45, 0, W * .5, H * .5, Math.max(W, H) * .8);
  g.addColorStop(0, '#2b3f7a'); g.addColorStop(.55, '#16224b'); g.addColorStop(1, '#0a1029'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const rand = rng(42); const m = Math.min(W, H);
  for (let i = 0; i < 10; i++) {
    const R = m * (.14 + rand() * .2); const side = i % 4;
    const x = side < 2 ? (side ? W + R * .2 : -R * .2) : rand() * W; const y = side < 2 ? rand() * H : (side === 2 ? -R * .3 : H + R * .3);
    const p = kochPolygon({ kind: 'koch', angle: 60, inward: i % 3 === 1 }, 3); const s = 30 + Math.floor(rand() * 22);
    c.save(); c.translate(x, y); c.rotate(rand() * 2); c.shadowColor = 'rgba(0,0,10,.5)'; c.shadowBlur = 16; c.shadowOffsetY = 5;
    c.beginPath(); p.forEach(([px, py], k) => (k ? c.lineTo(px * R, py * R) : c.moveTo(px * R, py * R))); c.closePath();
    c.fillStyle = `rgb(${s - 8},${s + 6},${s + 50})`; c.fill(); c.restore();
  }
}
new ResizeObserver(resize).observe(canvas);

// ---------- layout ----------
const phone = () => W < 700;
function targetBox() { const m = Math.min(W, H); const r = phone() ? m * .15 : Math.min(m * .17, 120); return { x: r + 16, y: r + 30, r }; }
/** Where to draw the paper: fit either the whole disc or just the wedge into the free area. */
function fitFor(wedge: boolean, folds: number) {
  const tb = targetBox(); const left = phone() ? 0 : tb.x + tb.r; const top = phone() ? 0 : 0;
  const ax = left + 20, ay = top + 20, aw = W - ax - 20, ah = H - ay - 20;
  let minx = -1, maxx = 1, miny = -1, maxy = 1;
  if (wedge) { const th = wedgeAngle(folds); minx = 0; maxx = 0; miny = 0; maxy = 0;
    for (let i = 0; i <= 32; i++) { const a = (i / 32) * th; minx = Math.min(minx, Math.cos(a)); maxx = Math.max(maxx, Math.cos(a)); miny = Math.min(miny, Math.sin(a)); maxy = Math.max(maxy, Math.sin(a)); } }
  let R = Math.min(aw / (maxx - minx), ah / (maxy - miny)) * .86;
  let cx = ax + aw / 2 - ((minx + maxx) / 2) * R, cy = ay + ah / 2 + ((miny + maxy) / 2) * R;
  if (phone()) { // keep clear of the target in the top-left corner: shrink until the paper's box misses it
    const tx = tb.x + tb.r + 8, ty = tb.y + tb.r + 8;
    R = Math.min(R, (aw - (wedge ? 0 : tx * .55)) / (maxx - minx), (ah - (wedge ? 0 : ty * .55)) / (maxy - miny)) * (wedge ? 1 : .98);
    cx = W - 16 - maxx * R; cy = H - 14 + miny * R;
  }
  return { cx, cy, R };
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

// ---------- drawing ----------
const paperFill = (c: CanvasRenderingContext2D, R: number) => { const g = c.createLinearGradient(-1, -1, 1, 1); void R; g.addColorStop(0, '#f6f9ff'); g.addColorStop(1, '#d8e5f8'); return g; };
const layer = document.createElement('canvas');
function withShadow(draw: (c: CanvasRenderingContext2D) => void) {
  layer.width = canvas.width; layer.height = canvas.height; const c = layer.getContext('2d')!; c.setTransform(DPR, 0, 0, DPR, 0, 0); draw(c);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.shadowColor = 'rgba(0,0,12,.6)'; ctx.shadowBlur = 22 * DPR; ctx.shadowOffsetY = 8 * DPR; ctx.drawImage(layer, 0, 0); ctx.restore();
}
function drawTarget() {
  const { x, y, r } = targetBox(); const L = lv();
  ctx.save(); ctx.fillStyle = 'rgba(10,16,40,.75)'; ctx.strokeStyle = 'rgba(242,181,68,.6)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, r + 10, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f2b544'; ctx.font = `${phone() ? 11 : 13}px Cinzel, serif`; ctx.textAlign = 'center'; ctx.fillText('TARGET', x, y - r - 16 < 10 ? y + r + 24 : y - r - 16);
  ctx.restore();
  withShadow((c) => paintUnfolded(c, L.folds, L.cuts, x, y, r, '#f2e6c9'));
}
function drawEdgesAndCuts(f: { cx: number; cy: number; R: number }) {
  ctx.save(); ctx.translate(f.cx, f.cy); ctx.scale(f.R, -f.R); ctx.lineWidth = 1.5 / f.R;
  // creases (fold lines) dashed
  const th = wedgeAngle(S.folds); ctx.setLineDash([6 / f.R, 5 / f.R]); ctx.strokeStyle = 'rgba(60,90,150,.55)';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1, 0); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(th), Math.sin(th)); ctx.stroke(); ctx.setLineDash([]);
  if (S.hint) { ctx.strokeStyle = 'rgba(242,181,68,.95)'; ctx.setLineDash([4 / f.R, 4 / f.R]); ctx.lineWidth = 2 / f.R;
    for (const c of lv().cuts) { ctx.beginPath(); tracePoly(ctx, cutPolygon(c, S.folds)); ctx.stroke(); } ctx.setLineDash([]); }
  if (S.hover) { ctx.fillStyle = 'rgba(255,120,140,.35)'; ctx.strokeStyle = '#ff7890'; ctx.lineWidth = 2 / f.R; ctx.beginPath(); tracePoly(ctx, cutPolygon(S.hover, S.folds)); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
function frame(now: number) {
  requestAnimationFrame(frame);
  if (!W) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bg, 0, 0); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (S.phase === 'title') { if (!$('title').classList.contains('active')) return; const m = Math.min(W, H); const R = m * .33; const cx = phone() ? W / 2 : W * .7, cy = phone() ? H * .78 : H / 2;
    const t = (Math.sin(now / 1400) + 1) / 2; withShadow((c) => paintUnfolded(c, 12, LEVELS[11].cuts, cx, cy, R, paperFill(c, R), ease(.15 + .85 * t))); return; }
  drawTarget();
  const dur = reduced ? 1 : S.phase === 'folding' ? 1100 : 1700;
  const p = Math.min(1, (now - S.animStart) / dur); const e = ease(p);
  const disc = fitFor(false, S.folds), wed = fitFor(true, S.folds);
  if (S.phase === 'folding') {
    const f = { cx: lerp(disc.cx, wed.cx, e), cy: lerp(disc.cy, wed.cy, e), R: lerp(disc.R, wed.R, e) };
    withShadow((c) => paintUnfolded(c, S.folds, [], f.cx, f.cy, f.R, paperFill(c, f.R), 1 - e));
    if (p >= 1) { S.phase = 'cut'; audio.tick(); syncUI(); }
  } else if (S.phase === 'cut') {
    // stacked layers peek out like real folded paper
    withShadow((c) => { for (let k = Math.min(3, S.folds - 1); k >= 0; k--) { c.save(); c.translate(k * 2, k * 2);
      c.save(); c.translate(wed.cx, wed.cy); c.scale(wed.R, -wed.R); paintWedge(c, S.folds, S.cuts, k ? '#c9d7ee' : paperFill(c, 1)); c.restore(); c.restore(); } });
    drawEdgesAndCuts(wed);
  } else if (S.phase === 'unfolding') {
    const f = { cx: lerp(wed.cx, disc.cx, e), cy: lerp(wed.cy, disc.cy, e), R: lerp(wed.R, disc.R, e) };
    withShadow((c) => paintUnfolded(c, S.folds, S.cuts, f.cx, f.cy, f.R, paperFill(c, f.R), e));
    if (p >= 1) finishUnfold();
  } else if (S.phase === 'result') {
    withShadow((c) => paintUnfolded(c, S.folds, S.cuts, disc.cx, disc.cy, disc.R, paperFill(c, disc.R)));
    if (S.diff) { ctx.save(); ctx.globalAlpha = .85; ctx.drawImage(S.diff, disc.cx - disc.R, disc.cy - disc.R, disc.R * 2, disc.R * 2); ctx.restore(); }
  }
}

// ---------- interaction ----------
function toWedge(ev: PointerEvent) { const r = canvas.getBoundingClientRect(); const f = fitFor(true, S.folds);
  return [(ev.clientX - r.left - f.cx) / f.R, -(ev.clientY - r.top - f.cy) / f.R] as const; }
function hoverAt(ev: PointerEvent): Cut | null {
  if (S.phase !== 'cut') return null; const [x, y] = toWedge(ev); const n = nearestEdge(x, y, S.folds);
  if (n.d > .2) return null;
  if (S.kind === 'tip') return { edge: 'A', s: 0, kind: 'tip', size: S.size };
  return { edge: n.edge, s: n.s, kind: S.kind, size: S.size };
}
canvas.addEventListener('pointermove', (ev) => { if (ev.pointerType === 'mouse') S.hover = hoverAt(ev); });
canvas.addEventListener('pointerleave', () => { S.hover = null; });
canvas.addEventListener('pointerdown', (ev) => {
  const c = hoverAt(ev); if (!c) return;
  S.cuts.push(c); S.hover = ev.pointerType === 'mouse' ? c : null; audio.snip(c.kind === 'koch' ? 3 : c.size);
  say(`Cut a ${KIND_INFO[c.kind].slice(2).toLowerCase()} on the ${c.edge === 'arc' ? 'rim' : 'crease'}. It will appear ${S.folds} times.`); syncUI();
});

function startLevel(i: number) {
  S.li = i; S.cuts = []; S.hint = false; S.diff = null; S.folds = i < 2 ? lv().folds : 2;
  audio.setState(0, lv().chapter + 1); show('play'); refold(); renderPanel();
  history.replaceState(null, '', `?level=${lv().id}`);
}
function refold() { S.phase = 'folding'; S.animStart = performance.now(); S.diff = null; $('result').innerHTML = ''; audio.tape(); syncUI(); }
function unfold() { if (S.phase !== 'cut') return; S.phase = 'unfolding'; S.animStart = performance.now(); S.hover = null; audio.snip(1); syncUI(); }
function finishUnfold() {
  S.phase = 'result'; const L = lv();
  const a = mask(S.folds, S.cuts), b = mask(L.folds, L.cuts); S.score = matchScore(a, b);
  // difference picture: amber = target cut you missed, rose = extra cut
  const N = 160; const d = document.createElement('canvas'); d.width = d.height = N; const dc = d.getContext('2d')!; const img = dc.createImageData(N, N);
  for (let k = 0; k < N * N; k++) { const ra = !a[k], rb = !b[k]; const x = k % N - N / 2, y = Math.floor(k / N) - N / 2; if (x * x + y * y > (N / 2 - 2) ** 2) continue;
    if (rb && !ra) img.data.set([242, 181, 68, 200], k * 4); else if (ra && !rb) img.data.set([255, 110, 140, 170], k * 4); }
  dc.putImageData(img, 0, 0); S.diff = d;
  const pass = S.score >= L.pass; best[L.id] = Math.max(best[L.id] || 0, S.score); localStorage.setItem('sa2.best', JSON.stringify(best));
  audio.chime(pass);
  const sym = S.folds !== L.folds ? `<p class="small">Count the repeats in the target: it was folded into <b>${FOLD_INFO[L.folds].name.toLowerCase()}</b>, you used ${FOLD_INFO[S.folds].name.toLowerCase()}.</p>` : '';
  $('result').innerHTML = `<p class="score ${pass ? 'pass' : 'fail'}" data-testid="score">${S.score}%</p>
    <p class="legend">match · pass at ${L.pass}%<br><i style="background:#f2b544"></i>cut you missed <i style="background:#ff6e8c"></i>extra cut</p>
    <p class="small">${pass ? 'A match! Madame Isolde pins it to the window.' : 'Close the gap: compare the coloured bits with the target and try again.'}</p>${sym}
    <p class="small"><b>Match %</b> = how much of the cut-away paper lines up with the target's cut-away paper.</p>
    <div class="actions"><button class="btn" id="retry" data-testid="retry">↺ Refold &amp; fix</button>${S.li < LEVELS.length - 1 ? `<button class="btn ${pass ? 'gold' : ''}" id="next" data-testid="next">Next →</button>` : ''}</div>`;
  $('retry').onclick = () => refold(); const nx = document.getElementById('next'); if (nx) nx.onclick = () => startLevel(S.li + 1);
  say(pass ? 'Passed!' : 'Not quite yet: retries are free.'); syncUI();
}

// ---------- panel ----------
function seg(id: string, items: [string, string][], on: string, pick: (v: string) => void) {
  const el = $(id); el.innerHTML = '';
  for (const [v, label] of items) { const b = document.createElement('button'); b.className = 'btn' + (v === on ? ' on' : ''); b.textContent = label; b.dataset.testid = `${id}-${v}`;
    b.onclick = () => { pick(v); audio.tick(); }; el.appendChild(b); }
}
function renderPanel() {
  const L = lv(); $('chap').textContent = `${CHAPTERS[L.chapter].name} · ${L.id}/${LEVELS.length}`; $('lvTitle').textContent = L.title; $('story').textContent = L.story;
  $('term').innerHTML = L.term ? `<b>${L.term[0]}</b>${L.term[1]}` : ''; syncUI();
}
function syncUI() {
  seg('foldSeg', FOLDS.map((f) => [String(f), FOLD_INFO[f].name] as [string, string]), String(S.folds), (v) => { S.folds = Number(v) as Folds; refold(); });
  $('foldNote').textContent = `${FOLD_INFO[S.folds].steps}: ${FOLD_INFO[S.folds].plain}`;
  seg('kindSeg', (Object.keys(KIND_INFO) as CutKind[]).map((k) => [k, KIND_INFO[k]] as [string, string]), S.kind, (v) => { S.kind = v as CutKind; syncUI(); });
  seg('sizeSeg', [['1', 'Small'], ['2', 'Medium'], ['3', 'Large']], String(S.size), (v) => { S.size = Number(v) as Size; syncUI(); });
  const cutting = S.phase === 'cut';
  $('stepCut').classList.toggle('dim', !cutting); ($('unfold') as HTMLButtonElement).disabled = !cutting;
  ($('undo') as HTMLButtonElement).disabled = !cutting || !S.cuts.length; ($('clear') as HTMLButtonElement).disabled = !cutting || !S.cuts.length;
  $('hint').textContent = S.hint ? 'Hide hint' : 'Hint';
  $('unfold').textContent = S.phase === 'result' ? '❄ Unfolded' : '❄ Unfold';
}
const say = (t: string) => { $('feedback').textContent = t; };
$('undo').onclick = () => { S.cuts.pop(); audio.tape(); syncUI(); };
$('clear').onclick = () => { S.cuts = []; refold(); };
$('hint').onclick = () => { S.hint = !S.hint; if (S.hint) say(lv().hint); syncUI(); };
$('unfold').onclick = unfold;

// ---------- screens ----------
function show(id: string) { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  document.body.classList.toggle('playing', id === 'play'); if (id !== 'play') S.phase = 'title'; resize(); }
function buildMap() {
  const host = $('chapters'); host.innerHTML = '';
  CHAPTERS.forEach((ch, ci) => {
    const sec = document.createElement('div'); sec.className = 'chapter'; sec.innerHTML = `<h3>${ch.name}</h3><p>${ch.note}</p>`;
    const grid = document.createElement('div'); grid.className = 'levels';
    LEVELS.forEach((L, i) => { if (L.chapter !== ci) return;
      const b = document.createElement('button'); b.className = 'lvcard'; b.dataset.testid = `level-${L.id}`;
      b.innerHTML = `<canvas width="112" height="112"></canvas><small>Level ${L.id} · ${FOLD_INFO[L.folds].name}</small>${L.title}${best[L.id] ? `<span class="best">${best[L.id]}%</span>` : ''}`;
      const c = b.querySelector('canvas')!.getContext('2d')!; paintUnfolded(c, L.folds, L.cuts, 56, 56, 54, '#dbe9fb');
      b.onclick = () => startLevel(i); grid.appendChild(b); });
    sec.appendChild(grid); host.appendChild(sec);
  });
}
const firstGesture = () => { audio.start(); };
document.addEventListener('pointerdown', firstGesture, { once: true });
$('begin').onclick = () => startLevel(0);
$('openMap').onclick = () => { buildMap(); show('map'); };
$('toMap').onclick = () => { buildMap(); show('map'); };
document.querySelectorAll('[data-back]').forEach((b) => ((b as HTMLElement).onclick = () => show('title')));
let muted = false; $('mute').onclick = () => { muted = !muted; audio.setMuted(muted); $('mute').textContent = muted ? '♪̸' : '♪'; };

const q = new URLSearchParams(location.search).get('level'); const qi = LEVELS.findIndex((L) => L.id === q);
if (qi >= 0) startLevel(qi);
(window as unknown as { __sa: unknown }).__sa = { S, LEVELS, mask, matchScore, solve: () => { S.folds = lv().folds; S.cuts = lv().cuts.map((c) => ({ ...c })); S.phase = 'cut'; syncUI(); } };
resize(); requestAnimationFrame(frame);
