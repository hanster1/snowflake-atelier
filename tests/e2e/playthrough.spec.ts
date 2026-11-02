import { test, expect, type Page } from '@playwright/test';
import { LEVELS } from '../../src/levels';

function watch(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

test('every level can be solved through the UI', async ({ page }) => {
  const errors = watch(page);
  await page.goto('/');
  await page.getByTestId('begin').click();
  await page.getByTestId('level-1-1').click();
  for (const lv of LEVELS) {
    await expect(page.locator('#lvTitle')).toContainText(lv.title);
    const g = lv.goal;
    if (lv.editable.includes('kind') && g.kind !== lv.start.kind) await page.getByTestId(`kind-${g.kind}`).click();
    if (lv.editable.includes('angle') && g.angle !== lv.start.angle) await page.getByTestId(`angle-${g.angle}`).click();
    if (lv.editable.includes('inward') && g.inward !== lv.start.inward) await page.getByTestId(g.inward ? 'dir-in' : 'dir-out').click();
    if (lv.question) await page.getByTestId(`choice-${lv.question.answer}`).click();
    for (let i = 0; i < g.depth; i++) await page.getByTestId('cut').click();
    await expect(page.getByTestId('stat-step')).toHaveText(String(g.depth));
    await page.getByTestId('present').click();
    await expect(page.locator('#win h3')).toContainText('Accepted');
    if (lv === LEVELS[LEVELS.length - 1]) await page.getByTestId('finale').click();
    else await page.getByTestId('next').click();
  }
  await expect(page.locator('#lvTitle')).toContainText('Free Cutting');
  await page.getByTestId('to-map').click();
  await page.getByTestId('open-gallery').click();
  await expect(page.locator('#galGrid .frame')).toHaveCount(20);
  expect(errors).toEqual([]);
});

test('commission feedback: over-cutting, wrong answer, wrong rule', async ({ page }) => {
  const errors = watch(page);
  await page.goto('/?level=3-1');
  for (let i = 0; i < 3; i++) await page.getByTestId('cut').click();
  await page.getByTestId('present').click();
  await expect(page.locator('#feedback')).toContainText('Too far');
  await page.getByTestId('undo').click();
  await page.getByTestId('present').click();
  await expect(page.locator('#win h3')).toBeVisible();
  await page.goto('/?level=1-3');
  await page.getByTestId('choice-0').click();
  await expect(page.locator('#question .explain')).toContainText('Not quite');
  await page.getByTestId('cut').click(); await page.getByTestId('cut').click();
  await page.getByTestId('present').click();
  await expect(page.locator('#feedback')).toContainText('riddle');
  await page.goto('/?level=4-1');
  for (let i = 0; i < 3; i++) await page.getByTestId('cut').click();
  await page.getByTestId('present').click();
  await expect(page.locator('#feedback')).toContainText('inward');
  expect(errors).toEqual([]);
});

test('studio: hang a piece in the gallery', async ({ page }) => {
  const errors = watch(page);
  await page.goto('/#studio');
  await page.getByTestId('kind-sierpinski').click();
  for (let i = 0; i < 4; i++) await page.getByTestId('cut').click();
  await expect(page.getByTestId('stat-triangles')).toHaveText('81');
  await page.getByTestId('present').click();
  await expect(page.locator('#feedback')).toContainText('Gallery');
  await page.goto('/'); await page.getByTestId('open-gallery').click();
  await expect(page.locator('#galGrid .frame')).toHaveCount(1);
  expect(errors).toEqual([]);
});
