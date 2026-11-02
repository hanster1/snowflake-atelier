import './style.css';
import { MAX_DEPTH, measure, sameRule, kochPolygon, sierpinski, cantor, type Rule, type Kind } from './fractal';
import { LEVELS, CHAPTERS, NAMES, type Level } from './levels';
import { Stage, drawLedger, pickQuality } from './render';
import { Score } from './audio';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const quality = pickQuality();
const stage = new Stage($<HTMLCanvasElement>('#stage'), quality);
const score = new Score();

type Mode = { type: 'level'; level: Level } | { type: 'studio' };
interface Saved { name: string; rule: Rule; depth: number; at: number }
const store = {
  get done(): string[] { try { return JSON.parse(localStorage.getItem('sa.done') || '[]'); } catch { return []; } },
  markDone(id: string) { const d = new Set(store.done); d.add(id); localStorage.setItem('sa.done', JSON.stringify([...d])); },
  get gallery(): Saved[] { try { return JSON.parse(localStorage.getItem('sa.gallery') || '[]'); } catch { return []; } },
  hang(s: Saved) { const g = store.gallery; g.unshift(s); localStorage.setItem('sa.gallery', JSON.stringify(g.slice(0, 40))); },
};

const state = { mode: { type: 'studio' } as Mode, rule: { kind: 'koch', angle: 60, inward: false } as Rule, depth: 0, answered: false, won: false };
(window as unknown as { __sa: unknown }).__sa = { state, LEVELS };

// ── screens ────────────────────────────────────────────────
function show(id: string) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  document.body.classList.toggle('playing', id === 'play');
  stage.focusX = id === 'title' && innerWidth > 820 ? 0.68 : 0.5;
  requestAnimationFrame(() => stage.resize());
  if (id === 'title') stage.setShape({ kind: 'koch', angle: 60, inward: false }, 4, false);
  if (id === 'map') buildMap();
  if (id === 'gallery') buildGallery();
}
document.addEventListener('pointerdown', () => score.start(), { once: true });
document.addEventListener('keydown', () => score.start(), { once: true });
$('#begin').onclick = () => show('map');
$('#openStudio').onclick = () => openStudio();
$('#openGallery').onclick = () => show('gallery');
$('#galStudio').onclick = () => openStudio();
$('#toMap').onclick = () => show(state.mode.type === 'studio' ? 'title' : 'map');
document.querySelectorAll<HTMLElement>('[data-back]').forEach((b) => (b.onclick = () => show('title')));
$('#mute').onclick = () => { score.setMuted(!score.muted); $('#mute').textContent = score.muted ? '♪̸' : '♪'; $('#mute').setAttribute('aria-pressed', String(score.muted)); };

function thumb(cv: HTMLCanvasElement, rule: Rule, depth: number, size: number) {
  const d = Math.min(devicePixelRatio, 2); cv.width = cv.height = size * d; const c = cv.getContext('2d')!; c.scale(d, d);
  const R = size * 0.44, cx = size / 2, cy = size / 2;
  c.fillStyle = '#dbe9fb'; c.strokeStyle = '#f2b544'; c.lineWidth = 0.8; c.beginPath();
  if (rule.kind === 'koch' || rule.kind === 'quad') {
    const p = kochPolygon(rule, depth); let mr = 1; p.forEach(([x, y]) => (mr = Math.max(mr, Math.hypot(x, y))));
    p.forEach(([x, y], i) => (i ? c.lineTo(cx + (x / mr) * R, cy + (y / mr) * R) : c.moveTo(cx + (x / mr) * R, cy + (y / mr) * R))); c.closePath(); c.fill(); c.stroke();
  } else if (rule.kind === 'sierpinski') {
    for (const t of sierpinski(depth)) { t.forEach(([x, y], i) => (i ? c.lineTo(cx + x * R, cy + y * R) : c.moveTo(cx + x * R, cy + y * R))); c.closePath(); } c.fill();
  } else { for (let k = 0; k <= depth; k++) for (const [a, b] of cantor(k)) c.fillRect(cx - R + a * 2 * R, cy - R * 0.7 + k * ((R * 1.4) / Math.max(depth, 1)), Math.max(0.5, (b - a) * 2 * R), 3); }
}

function buildMap() {
  const done = new Set(store.done); const root = $('#chapters'); root.innerHTML = '';
  for (const ch of CHAPTERS) {
    const sec = document.createElement('div'); sec.className = 'chapter';
    sec.innerHTML = `<h3>Chapter ${ch.n} · ${ch.title}</h3><p>${ch.subtitle}</p><div class="levels"></div>`;
    for (const lv of LEVELS.filter((l) => l.chapter === ch.n)) {
      const b = document.createElement('button'); b.className = 'lvcard' + (done.has(lv.id) ? ' done' : ''); b.dataset.testid = `level-${lv.id}`;
      b.innerHTML = `<canvas></canvas><small>${lv.id}</small>${lv.title}`;
      thumb(b.querySelector('canvas')!, lv.goal, Math.min(lv.goal.depth, 4), 50);
      b.onclick = () => openLevel(lv); sec.querySelector('.levels')!.append(b);
    }
    root.append(sec);
  }
}

function buildGallery() {
  const grid = $('#galGrid'); grid.innerHTML = '';
  const done = new Set(store.done);
  const items: Saved[] = [...store.gallery, ...LEVELS.filter((l) => done.has(l.id)).map((l) => ({ name: l.title, rule: l.goal, depth: l.goal.depth, at: 0 }))];
  $('#galEmpty').style.display = items.length ? 'none' : '';
  for (const it of items) {
    const f = document.createElement('figure'); f.className = 'frame'; f.innerHTML = `<canvas></canvas><p>${escapeHtml(it.name)} · step ${it.depth}</p>`;
    grid.append(f); thumb(f.querySelector('canvas')!, it.rule, it.depth, 200);
  }
}
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// ── play ───────────────────────────────────────────────────
function openLevel(lv: Level) {
  state.mode = { type: 'level', level: lv }; state.rule = { ...lv.start }; state.depth = 0; state.answered = !lv.question; state.won = false;
  $('#chap').textContent = `Chapter ${lv.chapter} · ${CHAPTERS[lv.chapter - 1].title}`;
  $('#lvTitle').textContent = `${lv.id}  ${lv.title}`;
  $('#dialogue').innerHTML = lv.intro.map(lineHtml).join('');
  $('#task').textContent = lv.task;
  $('#present').textContent = 'Present'; $('#present').style.display = '';
  renderQuestion(lv); $('#win').innerHTML = ''; feedback('');
  show('play'); refresh(false);
}
function openStudio() {
  state.mode = { type: 'studio' }; state.rule = { kind: 'koch', angle: 60, inward: false }; state.depth = 0; state.answered = true;
  $('#chap').textContent = 'The Studio'; $('#lvTitle').textContent = 'Free Cutting';
  $('#dialogue').innerHTML = lineHtml({ who: 'isolde', text: 'The studio is yours. Any rule, any angle, any depth. Hang your favourites in the gallery.' });
  $('#task').textContent = 'Experiment freely. “Hang” saves the piece to the Gallery.';
  $('#question').innerHTML = ''; $('#win').innerHTML = ''; $('#present').textContent = 'Hang'; feedback('');
  show('play'); refresh(false);
}
const lineHtml = (l: { who: keyof typeof NAMES; text: string }) =>
  `<div class="line"><span class="who ${l.who}">${NAMES[l.who][0]}</span><div><b>${NAMES[l.who]}</b>${l.text}</div></div>`;

function renderQuestion(lv: Level) {
  const q = lv.question; const el = $('#question'); if (!q) { el.innerHTML = ''; return; }
  el.innerHTML = `<p class="q">❄ ${q.prompt}</p><div class="choices">${q.choices.map((c, i) => `<button class="btn" data-choice="${i}" data-testid="choice-${i}">${c}</button>`).join('')}</div><p class="explain"></p>`;
  el.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((b) => (b.onclick = () => {
    if (state.answered) return;
    const i = Number(b.dataset.choice);
    if (i === q.answer) {
      b.classList.add('right'); state.answered = true; el.querySelector('.explain')!.textContent = q.explain; score.chime(true);
      el.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((x) => (x.disabled = x !== b));
    } else { b.classList.add('wrong'); b.disabled = true; el.querySelector('.explain')!.textContent = 'Not quite. Try another, and count carefully.'; score.chime(false); }
  }));
}

function editable(): { kind: Kind[]; angle: boolean; inward: boolean } {
  if (state.mode.type === 'studio') return { kind: ['koch', 'quad', 'sierpinski', 'cantor'], angle: true, inward: true };
  const lv = state.mode.level;
  return { kind: lv.editable.includes('kind') ? lv.kinds ?? [] : [], angle: lv.editable.includes('angle'), inward: lv.editable.includes('inward') };
}
const KIND_LABEL: Record<Kind, string> = { koch: 'Snowflake', quad: 'Square', sierpinski: 'Sierpinski', cantor: 'Cantor' };
function seg(el: HTMLElement, items: { label: string; on: boolean; id: string; act: () => void }[]) {
  el.innerHTML = '';
  for (const it of items) { const b = document.createElement('button'); b.className = 'btn' + (it.on ? ' on' : ''); b.textContent = it.label; b.dataset.testid = it.id; b.setAttribute('aria-pressed', String(it.on)); b.onclick = () => { it.act(); score.tick(); refresh(false); }; el.append(b); }
}
function buildControls() {
  const e = editable(); const bump = state.rule.kind === 'koch' || state.rule.kind === 'quad';
  seg($('#kindSeg'), e.kind.length > 1 ? e.kind.map((k) => ({ label: KIND_LABEL[k], on: state.rule.kind === k, id: `kind-${k}`, act: () => { if (state.rule.kind !== k) { state.rule.kind = k; state.depth = 0; } } })) : []);
  seg($('#angleSeg'), e.angle && state.rule.kind === 'koch' ? [30, 45, 60].map((a) => ({ label: `${a}° bumps`, on: state.rule.angle === a, id: `angle-${a}`, act: () => { state.rule.angle = a; } })) : []);
  seg($('#dirSeg'), e.inward && bump ? [false, true].map((inw) => ({ label: inw ? 'Inward' : 'Outward', on: state.rule.inward === inw, id: inw ? 'dir-in' : 'dir-out', act: () => { state.rule.inward = inw; } })) : []);
}

function fmt(x: number) { return x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2); }
function refresh(animate: boolean) {
  stage.setShape(state.rule, state.depth, animate);
  score.setState(state.depth, state.mode.type === 'level' ? state.mode.level.chapter : 3);
  buildControls();
  const m = measure(state.rule, state.depth); const r = state.rule;
  const shrink = r.kind === 'sierpinski' ? 2 : 3;
  const pieceName = r.kind === 'sierpinski' ? 'Triangles' : r.kind === 'cantor' ? 'Pieces' : 'Edges';
  const areaName = r.kind === 'cantor' ? 'Ribbon' : 'Paper';
  $('#stats').innerHTML = [
    ['Step', String(state.depth)], [pieceName, m.pieces.toLocaleString()], ['Piece', state.depth ? `1/${shrink ** state.depth}` : '1'],
    ['Thread', '×' + fmt(r.kind === 'cantor' ? m.area : m.perimeter)], [areaName, Math.round(m.area * 100) + '%'],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd data-testid="stat-${k.toLowerCase()}">${v}</dd></div>`).join('');
  $('#threadNote').textContent = r.kind === 'cantor' ? 'length left: ×2/3 per step' : `×${fmt(measure(r, 1).perimeter)} per step`;
  drawLedger($<HTMLCanvasElement>('#ledger'), r, state.depth);
  ($('#cut') as HTMLButtonElement).disabled = state.depth >= MAX_DEPTH[r.kind] || state.won;
  ($('#undo') as HTMLButtonElement).disabled = state.depth === 0 || state.won;
}
function feedback(t: string) { $('#feedback').textContent = t; }

$('#cut').onclick = () => {
  if (state.depth >= MAX_DEPTH[state.rule.kind]) return;
  state.depth++; score.snip(state.depth); feedback(''); refresh(true);
  if (state.depth === MAX_DEPTH[state.rule.kind]) feedback('The scissors can go no finer. Only the idea continues.');
};
$('#undo').onclick = () => { if (state.depth > 0) { state.depth--; score.tape(); feedback(''); refresh(false); } };
$('#present').onclick = () => {
  if (state.mode.type === 'studio') {
    const name = `${KIND_LABEL[state.rule.kind]}${state.rule.kind === 'koch' ? ` ${state.rule.angle}°` : ''}${state.rule.inward ? ' (inward)' : ''}`;
    store.hang({ name, rule: { ...state.rule }, depth: state.depth, at: Date.now() }); score.chime(true); stage.celebrate = 1;
    feedback('Hung in the Gallery of Winter. ✦'); return;
  }
  const lv = state.mode.level; const g = lv.goal;
  if (state.won) return;
  if (!state.answered) { feedback('First, answer the riddle above.'); score.chime(false); return; }
  if (!sameRule(state.rule, g)) { feedback(hintRule(g)); score.chime(false); return; }
  if (state.depth < g.depth) { feedback('Lovely, but the commission asks for more detail. Keep cutting.'); score.chime(false); return; }
  if (state.depth > g.depth) { feedback('Too far! Use “Tape back” to undo a step.'); score.chime(false); return; }
  win(lv);
};
function hintRule(g: Rule) {
  if (g.kind !== state.rule.kind) return `This piece needs the ${KIND_LABEL[g.kind]} rule.`;
  if (g.kind === 'koch' && g.angle !== state.rule.angle) return `Check the bump angle: this piece wants ${g.angle}°.`;
  return `Check the bump direction: this piece wants ${g.inward ? 'inward' : 'outward'} bumps.`;
}
function win(lv: Level) {
  state.won = true; store.markDone(lv.id); score.chime(true); stage.celebrate = 1; feedback('');
  const idx = LEVELS.indexOf(lv); const next = LEVELS[idx + 1];
  $('#win').innerHTML = `<h3>✦ Accepted for the gallery</h3><p class="lesson">${lv.lesson}</p>${lv.outro.map(lineHtml).join('')}
    <div class="row">${next ? `<button class="btn primary" id="next" data-testid="next">Next: ${next.title} →</button>` : `<button class="btn primary" id="toStudio" data-testid="finale">Open the Studio →</button>`}</div>`;
  $('#present').style.display = 'none';
  if (next) $('#next').onclick = () => openLevel(next); else $('#toStudio').onclick = () => openStudio();
  refresh(false);
  $('#win').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

addEventListener('keydown', (e) => {
  if (!document.body.classList.contains('playing')) return;
  if (e.key === ' ' || e.key === 'c') { e.preventDefault(); $('#cut').click(); }
  if (e.key === 'Backspace' || e.key === 'z') $('#undo').click();
  if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') $('#present').click();
});

let last = performance.now();
function loop(now: number) { const dt = Math.min(0.05, (now - last) / 1000); last = now; stage.frame(now, dt); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
const deep = new URLSearchParams(location.search).get('level');
const lv0 = LEVELS.find((l) => l.id === deep);
if (lv0) openLevel(lv0); else if (location.hash === '#studio') openStudio(); else show('title');
