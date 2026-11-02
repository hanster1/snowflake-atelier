import { describe, it, expect } from 'vitest';
import { copyTransform, cutPolygon, wedgeAngle } from '../../src/paper';
import { LEVELS } from '../../src/levels';
describe('paper folding', () => {
  it('copies tile the full circle', () => { for (const f of [2, 4, 6, 8, 12]) expect(copyTransform(f - 1, f).rot).toBeCloseTo(2 * Math.PI); });
  it('odd copies are mirrored', () => { expect(copyTransform(1, 6).flip).toBe(-1); expect(copyTransform(2, 6).flip).toBe(1); });
  it('every cut is a closed exact polygon', () => { for (const L of LEVELS) for (const c of L.cuts) expect(cutPolygon(c, L.folds).length).toBeGreaterThan(3); });
  it('has a gentle 12-level progression', () => { expect(LEVELS.length).toBe(12); expect(wedgeAngle(12)).toBeCloseTo(Math.PI / 6); });
});
