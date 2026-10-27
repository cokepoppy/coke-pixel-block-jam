import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';

const canvasSize = { width: 597, height: 1296 };
const levelFourSourcePanel = await sharp(fileURLToPath(new URL('../assets/level4/level4-opening-panel.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

async function readLevelFourState(page) {
  return page.locator('#game-canvas').evaluate((canvas) => ({
    buckets: JSON.parse(canvas.dataset.levelFourBuckets ?? '[]'),
    remainingCells: Number(canvas.dataset.levelFourRemainingCells),
  }));
}

async function dragBucket(page, from, to, size = 166) {
  const box = await page.locator('#game-canvas').boundingBox();
  if (!box) throw new Error('游戏画布没有显示');
  const toBrowserPoint = (x, y) => ({
    x: box.x + (x / canvasSize.width) * box.width,
    y: box.y + (y / canvasSize.height) * box.height,
  });
  const start = toBrowserPoint(from.x + size / 2, from.y + size / 2);
  const end = toBrowserPoint(to.x + size / 2, to.y + size / 2);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 24 });
  await page.mouse.up();
}

test('Level 4 可以在墙下整理收集槽，零进度移动不会回弹或清空像素', async ({ page }) => {
  await page.goto('/?previewLevel=4');
  const canvas = page.locator('#game-canvas');
  await expect(canvas).toHaveAttribute('aria-label', '拖动收集槽收集彩色像素方块');
  await expect(canvas).toHaveAttribute('data-level-four-buckets', /.+/);

  const before = await readLevelFourState(page);
  const recordingDir = '.research/recordings/level4-reposition';
  await mkdir(recordingDir, { recursive: true });
  const initialBox = await canvas.boundingBox();
  const initialScroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  await page.screenshot({ path: `${recordingDir}/before-tray-rearrangement.png` });
  const rearrangements = [
    { id: 'blue-left', from: { x: 50, y: 637 }, to: { x: 216, y: 637 } },
    { id: 'green-bottom', from: { x: 50, y: 801 }, to: { x: 50, y: 637 } },
    { id: 'yellow-bottom', from: { x: 216, y: 801 }, to: { x: 50, y: 801 } },
    { id: 'blue-right', from: { x: 381, y: 801 }, to: { x: 216, y: 801 } },
    { id: 'red-right', from: { x: 381, y: 637 }, to: { x: 381, y: 801 } },
  ];

  for (const move of rearrangements) {
    await dragBucket(page, move.from, move.to);
    await expect.poll(async () => {
      const state = await readLevelFourState(page);
      const bucket = state.buckets.find((candidate) => candidate.id === move.id);
      return Boolean(bucket)
        && Math.abs(bucket.x - move.to.x) < 1
        && Math.abs(bucket.y - move.to.y) < 1
        && bucket.progress === 0;
    }).toBe(true);
    const after = await readLevelFourState(page);
    const movedBucket = after.buckets.find((bucket) => bucket.id === move.id);
    expect(movedBucket.x).toBeCloseTo(move.to.x, 1);
    expect(movedBucket.y).toBeCloseTo(move.to.y, 1);
    expect(after.remainingCells).toBe(before.remainingCells);
    expect(after.buckets.every((bucket) => bucket.progress === 0)).toBe(true);
    if (move.id === 'blue-left') {
      const screenshot = await page.screenshot({ path: `${recordingDir}/after-first-real-drag.png` });
      const panel = await sharp(screenshot)
        .extract({ left: 17, top: 285, width: 563, height: 706 })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const diff = pixelmatch(
        levelFourSourcePanel.data,
        panel.data,
        Buffer.alloc(panel.data.length),
        panel.info.width,
        panel.info.height,
        { threshold: 0.16, includeAA: false },
      );
      expect(diff, 'the source opening panel must yield to live canvas rendering after a real tray drag')
        .toBeGreaterThan(0);
    }
  }

  await page.screenshot({ path: `${recordingDir}/after-tray-rearrangement.png` });
  const finalBox = await canvas.boundingBox();
  const finalScroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  await writeFile(`${recordingDir}/layout.json`, JSON.stringify({ initialBox, finalBox, initialScroll, finalScroll }, null, 2));

  const redStart = { x: 216, y: 465 };
  await dragBucket(page, redStart, { x: 381, y: 317 }, 176);
  await expect.poll(async () => (
    (await readLevelFourState(page)).buckets.find((bucket) => bucket.id === 'red-top')?.progress ?? 0
  )).toBeGreaterThan(0);
  const afterCollection = await readLevelFourState(page);
  expect(afterCollection.buckets.find((bucket) => bucket.id === 'red-right')?.progress).toBe(0);
  expect(afterCollection.remainingCells).toBeLessThan(before.remainingCells);
});

test('Level 4 的重复红蓝槽按原片上下层分别收集', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?previewLevel=4');
  await expect(page.locator('#live-status')).toHaveText('第 4 关开始');

  await dragBucket(page, { x: 50, y: 637 }, { x: 381, y: 465 });
  await expect.poll(async () => (await readLevelFourState(page)).buckets
    .find((bucket) => bucket.id === 'blue-left')?.progress ?? 0).toBe(100);
  let state = await readLevelFourState(page);
  expect(state.buckets.find((bucket) => bucket.id === 'blue-right')?.progress).toBe(0);
  expect(state.buckets.filter((bucket) => bucket.id.startsWith('red-'))
    .every((bucket) => bucket.progress === 0)).toBeTruthy();
  expect(state.remainingCells).toBe(660);

  await dragBucket(page, { x: 216, y: 465 }, { x: 381, y: 317 }, 176);
  await expect.poll(async () => (await readLevelFourState(page)).buckets
    .find((bucket) => bucket.id === 'red-top')?.progress ?? 0).toBe(100);
  state = await readLevelFourState(page);
  expect(state.buckets.find((bucket) => bucket.id === 'red-right')?.progress).toBe(0);
  expect(state.buckets.find((bucket) => bucket.id === 'blue-right')?.progress).toBe(0);
  expect(errors).toEqual([]);
  await page.screenshot({ path: '.research/recordings/level4-reposition/after-duplicate-target-drags.png' });
});
