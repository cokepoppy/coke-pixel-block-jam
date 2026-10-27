import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { createGameState } from '../src/game.js';

test.use({ video: { mode: 'on', size: { width: 597, height: 1296 } } });

test('只拖动红槽时，绿槽和黄槽不会自行移动或清空', async ({ page }) => {
  test.setTimeout(30_000);
  const directory = new URL('../.research/recordings/level2-no-phantom-moves/', import.meta.url);
  await mkdir(directory, { recursive: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const video = page.video();
  await page.goto('/?previewLevel=2');
  const canvas = page.locator('#game-canvas');
  await expect(page.locator('#live-status')).toHaveText('第 2 关开始');
  const bounds = await canvas.boundingBox();
  const at = (x, y) => ({ x: bounds.x + x * bounds.width / 597, y: bounds.y + y * bounds.height / 1296 });
  const drag = async (start, end) => {
    const a = at(...start); const b = at(...end);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    for (let step = 1; step <= 10; step += 1) {
      await page.mouse.move(a.x + (b.x - a.x) * step / 10, a.y + (b.y - a.y) * step / 10);
      await page.waitForTimeout(10);
    }
    await page.mouse.up();
  };
  const initial = await page.screenshot();
  await drag([450, 750], [450, 550]);
  await page.waitForTimeout(4_500);
  const after = await page.screenshot({ path: new URL('red-only.png', directory).pathname });
  const snapshot = await canvas.evaluate(el => ({
    buckets: JSON.parse(el.dataset.levelTwoBuckets),
    green: Number(el.dataset.progressGreen), red: Number(el.dataset.progressRed), yellow: Number(el.dataset.progressYellow),
  }));
  const green = snapshot.buckets.find(bucket => bucket.id === 'green');
  const yellow = snapshot.buckets.find(bucket => bucket.id === 'yellow');
  expect(green.x).toBe(50);
  expect(green.y).toBe(733);
  expect(yellow.x).toBe(151);
  expect(yellow.y).toBe(831);
  expect(snapshot.green).toBe(0);
  expect(snapshot.yellow).toBe(0);
  expect(snapshot.red).toBeGreaterThan(0);
  const frames = await Promise.all([initial, after].map(frame => sharp(frame).removeAlpha().raw().toBuffer({ resolveWithObject: true })));
  const cells = createGameState(2).grid.filter(cell => cell?.color === 'green');
  for (const cell of cells) {
    const offset = (Math.round(cell.y) * frames[0].info.width + Math.round(cell.x)) * 3;
    const greenAt = frame => {
      const [red, value, blue] = frame.data.subarray(offset, offset + 3);
      return value > red * 1.3 && value > blue * 1.2;
    };
    expect(greenAt(frames[1]), `green cell ${cell.row},${cell.column} should remain visible`).toBe(greenAt(frames[0]));
  }
  await drag([100, 750], [100, 510]);
  await expect.poll(() => canvas.evaluate(el => Number(el.dataset.progressGreen)), { timeout: 6_000 }).toBe(100);
  await drag([300, 875], [304, 564]);
  await expect(page.locator('#live-status')).toHaveText('第 3 关开始', { timeout: 12_000 });
  expect(errors).toEqual([]);
  await page.close();
  await copyFile(await video.path(), new URL('red-only-then-finish.webm', directory));
  await writeFile(new URL('report.json', directory), JSON.stringify({ snapshot, greenCellsChecked: cells.length, errors }, null, 2));
});

test('绿槽由玩家拖动后，黄槽仍要等到玩家操作才会移动', async ({ page }, testInfo) => {
  test.setTimeout(25_000);
  const directory = new URL('../.research/recordings/level2-no-phantom-moves/', import.meta.url);
  await mkdir(directory, { recursive: true });
  const video = page.video();
  const canvas = page.locator('#game-canvas');
  await page.goto('/?previewLevel=2');
  await expect(page.locator('#live-status')).toHaveText('第 2 关开始');

  await dragCanvasPath(page, { x: 450, y: 750 }, { x: 450, y: 550 }, 120);
  const sourceVideo = page.locator('#level-two-source-gameplay-video');
  await page.waitForFunction(() => {
    const source = document.querySelector('#level-two-source-gameplay-video');
    return !source.paused && source.currentTime >= 2.35 && source.currentTime < 2.55;
  }, null, { timeout: 5_000 });
  await dragCanvasPath(page, { x: 100, y: 750 }, { x: 100, y: 510 }, 120);

  await expect.poll(() => sourceVideo.evaluate(element => element.paused), { timeout: 5_000 }).toBe(true);
  const untouchedYellow = await canvas.evaluate(element => {
    const buckets = JSON.parse(element.dataset.levelTwoBuckets);
    const yellow = buckets.find(bucket => bucket.id === 'yellow');
    return {
      x: yellow.x,
      y: yellow.y,
      progress: Number(element.dataset.progressYellow),
      sourceTime: document.querySelector('#level-two-source-gameplay-video').currentTime,
    };
  });
  expect(untouchedYellow.sourceTime).toBeGreaterThanOrEqual(4.4);
  expect(untouchedYellow.sourceTime).toBeLessThan(4.7);
  expect(untouchedYellow.x).toBe(151);
  expect(untouchedYellow.y).toBe(831);
  expect(untouchedYellow.progress).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('yellow-still-before-player-drag.png') });

  await dragCanvasPath(page, { x: 300, y: 875 }, { x: 199, y: 564 }, 250);
  await expect.poll(() => canvas.getAttribute('data-progress-yellow'), { timeout: 2_000 })
    .not.toBe('0');
  const finalYellowProgress = await canvas.getAttribute('data-progress-yellow');
  await page.close();
  await copyFile(await video.path(), new URL('green-then-manual-yellow.webm', directory));
  await writeFile(new URL('green-then-manual-yellow.json', directory), `${JSON.stringify({
    untouchedYellow,
    finalYellowProgress,
    manualYellowDragAccepted: true,
  }, null, 2)}\n`);
});

async function dragCanvasPath(page, from, to, durationMs = 400) {
  const canvas = page.locator('#game-canvas');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('游戏画布没有显示');
  const point = ({ x, y }) => ({
    x: bounds.x + (x / 597) * bounds.width,
    y: bounds.y + (y / 1296) * bounds.height,
  });
  const start = point(from);
  const end = point(to);
  const steps = Math.max(1, Math.round(durationMs / (1_000 / 60)));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let step = 1; step <= steps; step += 1) {
    await page.mouse.move(
      start.x + ((end.x - start.x) * step) / steps,
      start.y + ((end.y - start.y) * step) / steps,
    );
    await page.waitForTimeout(durationMs / steps);
  }
  await page.mouse.up();
}
