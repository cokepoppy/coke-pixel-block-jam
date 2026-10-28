import { expect, test } from '@playwright/test';

test('第二关先拖绿槽到墙下即可收集，随后红黄槽仍可操作并通关', async ({ page }) => {
  test.setTimeout(45_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?previewLevel=2');
  const canvas = page.locator('#game-canvas');
  await expect(page.locator('#live-status')).toHaveText('第 2 关开始');
  const bounds = await canvas.boundingBox();
  const point = (x, y) => ({ x: bounds.x + x * bounds.width / 597, y: bounds.y + y * bounds.height / 1296 });
  const drag = async (from, to) => {
    const a = point(...from), b = point(...to);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 30 });
    await page.mouse.up();
  };
  const snapshot = () => canvas.evaluate((el) => ({
    buckets: JSON.parse(el.dataset.levelTwoBuckets),
    green: Number(el.dataset.progressGreen), red: Number(el.dataset.progressRed), yellow: Number(el.dataset.progressYellow),
  }));

  // Pointer and tray opening stay below the wall bottom (y=520).
  await drag([100, 750], [100, 550]);
  const placed = await snapshot();
  expect(placed.buckets.find((bucket) => bucket.id === 'green').y).toBeGreaterThanOrEqual(520);
  await expect.poll(async () => (await snapshot()).green, { timeout: 8_000 }).toBe(100);
  expect((await snapshot()).red).toBe(0);
  await drag([450, 750], [450, 550]);
  await expect.poll(async () => (await snapshot()).red, { timeout: 10_000 }).toBe(100);
  await drag([300, 875], [199, 580]);
  await expect.poll(async () => (await snapshot()).yellow, { timeout: 8_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(4_000);
  await drag([199, 580], [399, 580]);
  await expect(page.locator('#live-status')).toHaveText('第 3 关开始', { timeout: 12_000 });
  expect(errors).toEqual([]);
});
