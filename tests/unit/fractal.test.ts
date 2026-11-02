import { describe, expect, it } from 'vitest';
import { kochPolygon, measure, maxRadius, pieceCount, polyPerimeter, polyArea, baseTriangle, sierpinski, cantor, perimeterFactor, type Rule } from '../../src/fractal';
const K: Rule = { kind: 'koch', angle: 60, inward: false };
const P0 = polyPerimeter(baseTriangle()), A0 = polyArea(baseTriangle());

describe('Koch snowflake', () => {
  it('edges multiply by 4: 3, 12, 48, 192, 768', () => {
    expect([0, 1, 2, 3, 4].map((n) => kochPolygon(K, n).length)).toEqual([3, 12, 48, 192, 768]);
    expect(pieceCount(K, 6)).toBe(12288);
  });
  it('perimeter grows exactly ×4/3 per step', () => {
    for (let n = 0; n <= 5; n++) expect(polyPerimeter(kochPolygon(K, n)) / P0).toBeCloseTo((4 / 3) ** n, 9);
  });
  it('stays inside its circle forever (max radius is 1)', () => {
    for (let n = 0; n <= 6; n++) expect(maxRadius(kochPolygon(K, n))).toBeLessThanOrEqual(1 + 1e-9);
  });
  it('area approaches 8/5 of the triangle', () => {
    expect(polyArea(kochPolygon(K, 1)) / A0).toBeCloseTo(4 / 3, 9);
    expect(polyArea(kochPolygon(K, 6)) / A0).toBeCloseTo(1.6, 2);
    expect(polyArea(kochPolygon(K, 6)) / A0).toBeLessThan(1.6);
  });
  it('bumps point outward (area grows)', () => { expect(measure(K, 1).area).toBeGreaterThan(1); });
});
describe('variants', () => {
  it('anti-snowflake: same thread, area toward 2/5', () => {
    const anti = { ...K, inward: true };
    expect(measure(anti, 3).perimeter).toBeCloseTo(measure(K, 3).perimeter, 9);
    expect(polyPerimeter(kochPolygon(anti, 3)) / P0).toBeCloseTo((4 / 3) ** 3, 9);
    expect(measure(anti, 6).area).toBeCloseTo(0.4, 2);
  });
  it('angle variants: numeric perimeter matches 2/3 + 1/(3 cos a)', () => {
    for (const a of [30, 45, 60]) { const r = { ...K, angle: a };
      expect(polyPerimeter(kochPolygon(r, 3)) / P0).toBeCloseTo(perimeterFactor(r) ** 3, 9); }
    expect(perimeterFactor({ ...K, angle: 30 })).toBeCloseTo(1.0516, 3);
  });
  it('square rule: ×5/3, 5 pieces', () => {
    const q: Rule = { kind: 'quad', angle: 60, inward: false };
    expect(kochPolygon(q, 2).length).toBe(100);
    expect(pieceCount(q, 2)).toBe(100);
    expect(polyPerimeter(kochPolygon(q, 2)) / polyPerimeter(kochPolygon(q, 0))).toBeCloseTo(25 / 9, 9);
        expect(measure(q, 1).area).toBeCloseTo(1 + 4 / 9, 9);
  });
  it('Sierpinski: 3ⁿ triangles, 3/4 area, half size', () => {
    expect(sierpinski(3)).toHaveLength(27);
    const area = sierpinski(3).reduce((s, t) => s + polyArea(t), 0) / A0; expect(area).toBeCloseTo(0.75 ** 3, 9);
  });
  it('Cantor: 2ⁿ pieces, length (2/3)ⁿ', () => {
    expect(cantor(4)).toHaveLength(16);
    expect(cantor(4).reduce((s, [a, b]) => s + b - a, 0)).toBeCloseTo((2 / 3) ** 4, 12);
  });
});
describe('square island never overlaps itself', () => {
  it('shoelace area equals the sum of bump squares (an overlap would break this)', () => {
    const q: Rule = { kind: 'quad', angle: 60, inward: false };
    for (let n = 1; n <= 4; n++) { let exp = 1; for (let k = 1; k <= n; k++) exp += (4 * 5 ** (k - 1)) / 9 ** k; expect(measure(q, n).area).toBeCloseTo(exp, 9); }
  });
});
