import { describe, expect, it } from 'vitest';
import { LEVELS, CHAPTERS } from '../../src/levels';
import { MAX_DEPTH, sameRule, pieceCount, measure } from '../../src/fractal';

describe('levels', () => {
  it('has ~20 levels over 5 chapters with unique ids', () => {
    expect(LEVELS.length).toBe(20);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(20);
    expect(new Set(LEVELS.map((l) => l.chapter))).toEqual(new Set(CHAPTERS.map((c) => c.n)));
  });
  for (const lv of LEVELS) it(`${lv.id} is solvable`, () => {
    expect(lv.goal.depth).toBeGreaterThan(0); expect(lv.goal.depth).toBeLessThanOrEqual(MAX_DEPTH[lv.goal.kind]);
    if (lv.goal.kind !== lv.start.kind) { expect(lv.editable).toContain('kind'); expect(lv.kinds).toContain(lv.goal.kind); }
    if (lv.goal.kind === 'koch' && lv.goal.angle !== lv.start.angle) expect(lv.editable).toContain('angle');
    if (lv.goal.inward !== lv.start.inward && lv.goal.kind !== 'sierpinski' && lv.goal.kind !== 'cantor') expect(lv.editable).toContain('inward');
    if (lv.question) { expect(lv.question.answer).toBeLessThan(lv.question.choices.length); }
    expect(sameRule(lv.goal, lv.goal)).toBe(true);
  });
  it('the numbers in the story are true', () => {
    const K = { kind: 'koch' as const, angle: 60, inward: false };
    expect(pieceCount(K, 2)).toBe(48);                       // 1-3, 3-1
    expect(9 * measure(K, 2).perimeter).toBeCloseTo(16, 9);  // 2-2
    expect(27 * measure(K, 3).perimeter).toBeCloseTo(64, 9); // 3-2
    expect(27 * measure(K, 4).perimeter).toBeGreaterThan(64);
    expect(pieceCount(K, 4)).toBe(768);                      // 3-3
    expect(27 / 3 ** 3).toBe(1);                             // 3-4
    const S = { kind: 'sierpinski' as const, angle: 60, inward: false };
    expect(measure(S, 2).area).toBeGreaterThan(0.5); expect(measure(S, 3).area).toBeLessThan(0.5); // 5-2
    expect(pieceCount(S, 3)).toBe(27);
    expect(pieceCount({ kind: 'cantor', angle: 60, inward: false }, 4)).toBe(16);
    expect(pieceCount(K, 6)).toBe(12288);
  });
});
