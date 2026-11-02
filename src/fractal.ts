// Exact fractal geometry. Every shape is computed here from rules; nothing is drawn from images.
export type Kind = 'koch' | 'quad' | 'sierpinski' | 'cantor';
export interface Rule { kind: Kind; angle: number; inward: boolean }
export type Pt = [number, number];

export const MAX_DEPTH: Record<Kind, number> = { koch: 6, quad: 5, sierpinski: 7, cantor: 7 };

/** The generator: how one straight segment (0,0)->(1,0) is replaced, as a list of points.
 *  `t` (0..1) grows the bump from flat to full height, for the cutting animation. */
export function generator(rule: Rule, t = 1): Pt[] {
  const s = rule.inward ? -1 : 1;
  if (rule.kind === 'quad') {
    const h = (1 / 3) * t * s;
    return [[0, 0], [1 / 3, 0], [1 / 3, h], [2 / 3, h], [2 / 3, 0], [1, 0]];
  }
  const a = (rule.angle * Math.PI) / 180;
  const h = (1 / 6) * Math.tan(a) * t * s;
  return [[0, 0], [1 / 3, 0], [0.5, h], [2 / 3, 0], [1, 0]];
}

/** Factor by which the total edge length grows each step. */
export function perimeterFactor(rule: Rule): number {
  if (rule.kind === 'quad') return 5 / 3;
  if (rule.kind === 'sierpinski') return 3 / 2;
  if (rule.kind === 'cantor') return 2 / 3;
  return 2 / 3 + 1 / (3 * Math.cos((rule.angle * Math.PI) / 180));
}
export function piecesFactor(rule: Rule): number {
  return rule.kind === 'quad' ? 5 : rule.kind === 'sierpinski' ? 3 : rule.kind === 'cantor' ? 2 : 4;
}
/** Number of pieces (edges, triangles or line bits) after n steps. */
export function pieceCount(rule: Rule, n: number): number {
  const base = rule.kind === 'koch' ? 3 : rule.kind === 'quad' ? 4 : 1;
  return base * piecesFactor(rule) ** n;
}

/** Starting equilateral triangle, circumradius 1, centred at origin, pointing up.
 *  Points go clockwise on screen (y down) so that "outward" bumps point away from the centre. */
export function baseTriangle(): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < 3; i++) {
    const th = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
    pts.push([Math.cos(th), Math.sin(th)]);
  }
  return pts;
}

/** Replace each edge of a closed polygon by the generator. */
export function iterateCurve(poly: Pt[], rule: Rule, t = 1): Pt[] {
  const g = generator(rule, t);
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const dx = bx - ax, dy = by - ay;
    // normal pointing outward for a clockwise-on-screen polygon (y down): (dy, -dx)
    for (let k = 0; k < g.length - 1; k++) {
      const [u, v] = g[k];
      out.push([ax + u * dx + v * dy, ay + u * dy - v * dx]);
    }
  }
  return out;
}

/** Square seed for the square rule (the classic quadratic Koch island), clockwise on screen. */
export function baseSquare(): Pt[] {
  const a = Math.SQRT1_2; return [[-a, -a], [a, -a], [a, a], [-a, a]];
}
export function seed(rule: Rule): Pt[] { return rule.kind === 'quad' ? baseSquare() : baseTriangle(); }
export function kochPolygon(rule: Rule, depth: number, growT = 1): Pt[] {
  let p = seed(rule);
  for (let i = 0; i < depth; i++) p = iterateCurve(p, rule, i === depth - 1 ? growT : 1);
  return p;
}

export type Tri = [Pt, Pt, Pt];
export function sierpinski(depth: number): Tri[] {
  let tris: Tri[] = [baseTriangle() as Tri];
  for (let i = 0; i < depth; i++) {
    const next: Tri[] = [];
    for (const [a, b, c] of tris) {
      const m = (p: Pt, q: Pt): Pt => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      const ab = m(a, b), bc = m(b, c), ca = m(c, a);
      next.push([a, ab, ca], [ab, b, bc], [ca, bc, c]);
    }
    tris = next;
  }
  return tris;
}

/** Cantor set on [0,1]: list of kept intervals. */
export function cantor(depth: number): [number, number][] {
  let segs: [number, number][] = [[0, 1]];
  for (let i = 0; i < depth; i++) {
    const n: [number, number][] = [];
    for (const [a, b] of segs) { const d = (b - a) / 3; n.push([a, a + d], [b - d, b]); }
    segs = n;
  }
  return segs;
}

export function polyPerimeter(p: Pt[]): number {
  let L = 0;
  for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; L += Math.hypot(q[0] - p[i][0], q[1] - p[i][1]); }
  return L;
}
export function polyArea(p: Pt[]): number {
  let A = 0;
  for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; A += p[i][0] * q[1] - q[0] * p[i][1]; }
  return Math.abs(A) / 2;
}
export function maxRadius(p: Pt[]): number { return Math.max(...p.map(([x, y]) => Math.hypot(x, y))); }

export interface Measure { pieces: number; perimeter: number; area: number }
/** Measurements relative to step 0 (perimeter = 1 and area = 1 at the start). */
export function measure(rule: Rule, depth: number): Measure {
  const pieces = pieceCount(rule, depth);
  const perimeter = perimeterFactor(rule) ** depth;
  let area: number;
  if (rule.kind === 'sierpinski') area = 0.75 ** depth;
  else if (rule.kind === 'cantor') area = (2 / 3) ** depth; // "how much line is left"
  else { const base = polyArea(seed(rule)); area = polyArea(kochPolygon(rule, depth)) / base; }
  return { pieces, perimeter, area };
}

export function sameRule(a: Rule, b: Rule): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'koch') return a.angle === b.angle && a.inward === b.inward;
  if (a.kind === 'quad') return a.inward === b.inward;
  return true;
}
