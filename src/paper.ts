// Exact paper-snowflake geometry. The paper is a disc of radius 1.
// Folding it into `folds` equal slices gives a wedge from angle 0 to 2π/folds.
// Cuts live in wedge coordinates; unfolding copies the wedge `folds` times,
// mirroring every other copy, exactly like a real folded sheet.
import type { Pt } from './fractal';

export type Edge = 'A' | 'B' | 'arc';           // A = bottom crease, B = top crease, arc = the rim
export type CutKind = 'tri' | 'arc' | 'slot' | 'koch' | 'tip';
export type Size = 1 | 2 | 3;
export interface Cut { edge: Edge; s: number; kind: CutKind; size: Size }
export const FOLDS = [2, 4, 6, 8, 12] as const;
export type Folds = (typeof FOLDS)[number];
export const FOLD_INFO: Record<Folds, { name: string; steps: string; plain: string }> = {
  2: { name: 'Half', steps: 'Fold in half', plain: 'One crease, so the result has 1 mirror line.' },
  4: { name: 'Quarters', steps: 'Half, then half again', plain: '2 creases cross, so 2 mirror lines (like a plus sign).' },
  6: { name: 'Sixths', steps: 'Half, then into thirds', plain: '3 mirror lines: a 3-pointed pattern repeats.' },
  8: { name: 'Eighths', steps: 'Half, half, half', plain: '4 mirror lines: an 8-slice pattern.' },
  12: { name: 'Twelfths', steps: 'Half, thirds, then half', plain: '6 mirror lines: a true 6-pointed snowflake.' },
};
export const SIZE_R: Record<Size, number> = { 1: 0.07, 2: 0.11, 3: 0.16 };
export const KIND_INFO: Record<CutKind, string> = {
  tri: '▲ Notch', arc: '◖ Scoop', slot: '▮ Slot', koch: '✳ Koch', tip: '✂ Tip',
};

export const wedgeAngle = (f: number) => (2 * Math.PI) / f;

/** Where on an edge a cut sits, plus the edge direction (t) and the inward direction (n). */
export function edgeFrame(edge: Edge, s: number, folds: number): { p: Pt; t: Pt; n: Pt } {
  const th = wedgeAngle(folds);
  if (edge === 'A') return { p: [s, 0], t: [1, 0], n: [0, 1] };
  if (edge === 'B') { const c = Math.cos(th), si = Math.sin(th); return { p: [s * c, s * si], t: [c, si], n: [si, -c] }; }
  const a = s * th; const c = Math.cos(a), si = Math.sin(a);
  return { p: [c, si], t: [-si, c], n: [-c, -si] };
}

/** Koch curve from a to b with bumps pointing toward n (depth levels). */
function koch(a: Pt, b: Pt, depth: number, out: Pt[], sign: number) {
  if (depth === 0) { out.push(b); return; }
  const dx = (b[0] - a[0]) / 3, dy = (b[1] - a[1]) / 3;
  const p1: Pt = [a[0] + dx, a[1] + dy], p3: Pt = [a[0] + 2 * dx, a[1] + 2 * dy];
  const h = Math.sqrt(3) / 2 * sign;
  const p2: Pt = [p1[0] + dx / 2 - dy * h, p1[1] + dy / 2 + dx * h];
  koch(a, p1, depth - 1, out, sign); koch(p1, p2, depth - 1, out, sign); koch(p2, p3, depth - 1, out, sign); koch(p3, b, depth - 1, out, sign);
}

/** The cut-away shape as a polygon in wedge coordinates. Each one reaches past the edge so it fully opens it. */
export function cutPolygon(c: Cut, folds: number): Pt[] {
  const { p, t, n } = edgeFrame(c.edge, c.s, folds); const r = SIZE_R[c.size];
  const at = (u: number, v: number): Pt => [p[0] + t[0] * u + n[0] * v, p[1] + t[1] * u + n[1] * v];
  const out = -0.4 * r;
  switch (c.kind) {
    case 'tri': return [at(-r, out), at(-r, 0), at(0, 1.5 * r), at(r, 0), at(r, out)];
    case 'slot': return [at(-0.3 * r, out), at(-0.3 * r, 2.2 * r), at(0.3 * r, 2.2 * r), at(0.3 * r, out)];
    case 'arc': {
      const pts: Pt[] = [at(-r, out)];
      for (let i = 0; i <= 24; i++) { const a = Math.PI - (i / 24) * Math.PI; pts.push(at(r * Math.cos(a), r * Math.sin(a))); }
      pts.push(at(r, out)); return pts;
    }
    case 'tip': { // straight diagonal cut across the corner where the edge starts
      const L = r * 2.2; return [at(-0.2, out * 3), at(-0.2, L), at(0, L), at(L, 0), at(L, out * 3)];
    }
    case 'koch': {
      // A Koch-curve bite: a triangle notch whose sides carry smaller notches, which carry smaller ones.
      // Uses the "anti-snowflake" version: the curve dips into the paper.
      const a = at(-1.3 * r, 0), b = at(1.3 * r, 0);
      const curve: Pt[] = [a];
      // build in local frame then the bumps go toward +n
      const loc: Pt[] = [[-1.3 * r, 0]]; koch([-1.3 * r, 0], [1.3 * r, 0], 3, loc, 1);
      curve.length = 0; for (const [u, v] of loc) curve.push(at(u, v));
      // close: go out past the edge, which removes everything between the edge and the curve
      void a; void b;
      return [at(-1.3 * r, out), ...curve, at(1.3 * r, out)];
    }
  }
}

/** Draw the wedge of paper (with its cuts removed) into ctx, in wedge units. */
export function traceWedge(ctx: CanvasRenderingContext2D, folds: number, seam = 0) {
  // `seam` overlaps neighbouring copies by a hair so anti-aliased edges don't leave dark lines at the creases
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1, -seam, wedgeAngle(folds) + seam); ctx.closePath();
}
export function tracePoly(ctx: CanvasRenderingContext2D, poly: Pt[]) {
  poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
}

/** Transform for copy i of the wedge when the paper is open. Odd copies are mirror images. */
export function copyTransform(i: number, folds: number, t = 1): { rot: number; flip: number } {
  const th = wedgeAngle(folds);
  if (i % 2 === 0) return { rot: i * th * t, flip: 1 };
  // mirror across the crease at angle (i)·θ … final = rotate((i+1)θ) ∘ reflect(x-axis)
  return { rot: ((i + 1) * th) * t, flip: 1 - 2 * t };
}

/** Paint the full unfolded paper (paper colour where paper remains) at radius R around (cx,cy). */
export function paintUnfolded(ctx: CanvasRenderingContext2D, folds: number, cuts: Cut[], cx: number, cy: number, R: number, fill: string | CanvasPattern | CanvasGradient, t = 1) {
  for (let i = 0; i < folds; i++) {
    const { rot, flip } = copyTransform(i, folds, t);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(R, R); ctx.rotate(-rot); ctx.scale(1, -flip);
    paintWedge(ctx, folds, cuts, fill, 1.5 / R);
    ctx.restore();
  }
}
// Note: canvas y points down, so we draw with y flipped to keep math orientation (counter-clockwise).

/** Paint one wedge with holes, in the current transform (wedge units). Uses even-odd-free clipping per cut. */
export function paintWedge(ctx: CanvasRenderingContext2D, folds: number, cuts: Cut[], fill: string | CanvasPattern | CanvasGradient, seam = 0) {
  ctx.save();
  traceWedge(ctx, folds, seam); ctx.clip();
  // Build one path: wedge rectangle bound + all cuts, filled with evenodd won't work for overlapping cuts,
  // so instead clip out each cut using an inverted path.
  for (const c of cuts) {
    ctx.beginPath(); ctx.rect(-2, -2, 4, 4); tracePoly(ctx, cutPolygon(c, folds).slice().reverse()); ctx.clip('evenodd');
  }
  ctx.fillStyle = fill; ctx.fillRect(-2, -2, 4, 4);
  ctx.restore();
}

/** Rasterise a design to a boolean mask (true = paper) on an N×N grid. */
export function mask(folds: number, cuts: Cut[], N = 160): Uint8Array {
  const cv = (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(N, N) : Object.assign(document.createElement('canvas'), { width: N, height: N })) as HTMLCanvasElement;
  const ctx = cv.getContext('2d')! as CanvasRenderingContext2D;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, N, N);
  paintUnfolded(ctx, folds, cuts, N / 2, N / 2, N / 2 - 1, '#fff');
  const d = ctx.getImageData(0, 0, N, N).data; const m = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) m[i] = d[i * 4] > 127 ? 1 : 0;
  return m;
}

/** Grow the removed (cut-away) region by `k` pixels, so near-misses still count. */
function grow(m: Uint8Array, N: number, k: number): Uint8Array {
  const o = new Uint8Array(m.length).fill(1);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (m[y * N + x]) continue;
    for (let dy = -k; dy <= k; dy++) for (let dx = -k; dx <= k; dx++) { if (dx * dx + dy * dy > k * k) continue;
      const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < N && Y < N) o[Y * N + X] = 0; } }
  return o;
}
/** Match score 0..100: the share of your cut-away paper that sits on the target's cuts, and the share of the
 *  target's cut-away paper you reproduced, each allowing a few pixels of wiggle room. Reported as the smaller of the two,
 *  so both extra cuts and missing cuts cost points. */
export function matchScore(a: Uint8Array, b: Uint8Array, N = 160, k = 4): number {
  const ga = grow(a, N, k), gb = grow(b, N, k); let ca = 0, cb = 0, aHit = 0, bHit = 0; const r2 = (N / 2 - 2) ** 2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = x + 0.5 - N / 2, dy = y + 0.5 - N / 2; if (dx * dx + dy * dy > r2) continue;
    const i = y * N + x;
    if (!a[i]) { ca++; if (!gb[i]) aHit++; }
    if (!b[i]) { cb++; if (!ga[i]) bHit++; }
  }
  if (ca + cb === 0) return 100; if (!ca || !cb) return 0;
  return Math.round(100 * Math.min(aHit / ca, bHit / cb));
}

/** Nearest edge spot to a point in wedge coordinates, snapped to 20 steps. */
export function nearestEdge(x: number, y: number, folds: number): { edge: Edge; s: number; d: number } {
  const th = wedgeAngle(folds); const snap = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 20) / 20;
  const r = Math.hypot(x, y); let a = Math.atan2(y, x); if (a < -Math.PI / 2) a += 2 * Math.PI;
  const cands: { edge: Edge; s: number; d: number }[] = [];
  const sA = snap(Math.min(0.95, Math.max(0, x))); cands.push({ edge: 'A', s: sA, d: Math.hypot(x - sA, y) });
  const c = Math.cos(th), si = Math.sin(th); const proj = x * c + y * si; const sB = snap(Math.min(0.95, Math.max(0, proj)));
  cands.push({ edge: 'B', s: sB, d: Math.hypot(x - sB * c, y - sB * si) });
  const k = folds === 2 ? 60 : folds === 4 ? 40 : 20; const sArc = Math.round(Math.min(1, Math.max(0, a / th)) * k) / k; cands.push({ edge: 'arc', s: sArc, d: Math.abs(r - 1) + (a < 0 || a > th ? 0.3 : 0) });
  cands.sort((p, q) => p.d - q.d); return cands[0];
}
