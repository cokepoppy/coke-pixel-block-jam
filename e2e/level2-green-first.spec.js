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

test('触屏按住绿槽在墙下时持续收集，松手后红槽仍可拖动', async ({ page }) => {
  test.setTimeout(25_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?previewLevel=2');
  await expect(page.locator('#live-status')).toHaveText('第 2 关开始');
  const canvas = page.locator('#game-canvas');
  const bounds = await canvas.boundingBox();
  const point = (x, y) => ({ x: bounds.x + x * bounds.width / 597, y: bounds.y + y * bounds.height / 1296, id: 1 });
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  const touch = (type, points) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  await touch('touchStart', [point(100, 750)]);
  for (let step = 1; step <= 20; step += 1) {
    await touch('touchMove', [point(100, 750 - step * 10)]);
    await page.waitForTimeout(12);
  }
  await expect.poll(() => canvas.getAttribute('data-progress-green'), { timeout: 5_000 }).not.toBe('0');
  await expect.poll(() => canvas.getAttribute('data-progress-green'), { timeout: 8_000 }).toBe('100');
  expect(await canvas.getAttribute('data-progress-red')).toBe('0');
  const green = await canvas.evaluate((el) => JSON.parse(el.dataset.levelTwoBuckets).find((bucket) => bucket.id === 'green'));
  expect(green.y).toBeGreaterThanOrEqual(520);
  await touch('touchEnd', []);
  await touch('touchStart', [point(450, 750)]);
  await touch('touchMove', [point(450, 550)]);
  await touch('touchEnd', []);
  await expect.poll(() => canvas.getAttribute('data-progress-red'), { timeout: 8_000 }).not.toBe('0');
  expect(errors).toEqual([]);
});
