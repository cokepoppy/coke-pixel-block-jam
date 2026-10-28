import { expect, test } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

test.use({ video: { mode: 'on', size: { width: 597, height: 1296 } } });

const recordingDirectory = fileURLToPath(new URL('../.research/recordings/level5-source-route/', import.meta.url));
const openingReferencePath = fileURLToPath(new URL('../assets/level5/level5-opening-panel.png', import.meta.url));
const comparisonReferencePath = fileURLToPath(new URL('../assets/level5/level5-frame-78.75.png', import.meta.url));

async function canvasPoint(page, point) {
  const bounds = await page.locator('#game-canvas').boundingBox();
  if (!bounds) throw new Error('游戏画布没有显示');
  return {
    x: bounds.x + (point.x / 597) * bounds.width,
    y: bounds.y + (point.y / 1296) * bounds.height,
  };
}

async function dragCanvas(page, from, to, durationMs = 350) {
  const start = await canvasPoint(page, from);
  const end = await canvasPoint(page, to);
  const steps = Math.max(1, Math.round(durationMs / (1_000 / 60)));
  const startedAt = Date.now();
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let step = 1; step <= steps; step += 1) {
    const dueAt = startedAt + (step / steps) * durationMs;
    const delay = dueAt - Date.now();
    if (delay > 0) await page.waitForTimeout(delay);
    await page.mouse.move(
      start.x + ((end.x - start.x) * step) / steps,
      start.y + ((end.y - start.y) * step) / steps,
    );
  }
  await page.mouse.up();
}

test('Level 5 开局面板与 S5 01:17.0 原片裁切逐像素一致', async ({ page }) => {
  await page.goto('/?previewLevel=5');
  await expect(page.locator('#live-status')).toHaveText('第 5 关开始', { timeout: 20_000 });
  const actualCanvas = await page.locator('#game-canvas').screenshot();
  const actual = await sharp(actualCanvas).extract({ left: 29, top: 375, width: 539, height: 551 })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const expected = await sharp(openingReferencePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const difference = pixelmatch(expected.data, actual.data, Buffer.alloc(actual.data.length), 539, 551, {
    threshold: 0.16,
    includeAA: false,
  });
  expect(difference, `Level 5 opening panel differs at ${difference} pixels`).toBe(0);
});

test('真实蓝槽拖动启动 Level 5 原片路线，音画暂停续播并进入 Level 6', async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  await mkdir(recordingDirectory, { recursive: true });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const recordedVideo = page.video();
  await page.goto('/?previewLevel=5');
  await expect(page.locator('#live-status')).toHaveText('第 5 关开始', { timeout: 20_000 });

  await dragCanvas(page, { x: 446, y: 681 }, { x: 359, y: 673 });
  const canvas = page.locator('#game-canvas');
  const sourceVideo = page.locator('#level-five-source-gameplay-video');
  const sourceAudio = page.locator('#level-five-source-audio');
  await expect(canvas).toHaveAttribute('data-level-five-source-active', 'true');
  await expect.poll(() => sourceVideo.evaluate((video) => video.currentTime), { timeout: 5_000 })
    .toBeGreaterThan(0.3);
  await expect.poll(() => sourceAudio.evaluate((audioElement) => ({ paused: audioElement.paused, muted: audioElement.muted })))
    .toEqual({ paused: false, muted: false });

  await page.locator('#settings-button').click();
  await expect(page.getByRole('dialog', { name: '游戏设置' })).toBeVisible();
  await expect.poll(() => sourceVideo.evaluate((video) => video.paused)).toBe(true);
  await expect.poll(() => sourceAudio.evaluate((audioElement) => ({ paused: audioElement.paused, muted: audioElement.muted })))
    .toEqual({ paused: true, muted: true });
  await sourceVideo.evaluate((video) => { video.currentTime = 1; });
  await page.waitForFunction(() => {
    const video = document.querySelector('#level-five-source-gameplay-video');
    return !video.seeking && Math.abs(video.currentTime - 1) < 0.02;
  });
  await expect.poll(() => canvas.getAttribute('data-level-five-source-time'))
    .toBe('1.000');
  const canvasPng = await canvas.evaluate((element) => element.toDataURL('image/png'));
  const alignedCanvas = Buffer.from(canvasPng.slice(canvasPng.indexOf(',') + 1), 'base64');
  await sharp(alignedCanvas).png().toFile(testInfo.outputPath('level5-source-78.75-aligned.png'));
  const actualPanel = await sharp(alignedCanvas).extract({ left: 29, top: 375, width: 539, height: 551 })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const expectedPanel = await sharp(comparisonReferencePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const diffImage = Buffer.alloc(actualPanel.data.length);
  const changedPixels = pixelmatch(
    expectedPanel.data,
    actualPanel.data,
    diffImage,
    539,
    551,
    { threshold: 0.16, includeAA: false },
  );
  const differenceRatio = changedPixels / (539 * 551);
  await sharp(diffImage, { raw: { width: 539, height: 551, channels: 4 } })
    .png().toFile(`${recordingDirectory}/source-frame-difference.png`);
  await writeFile(`${recordingDirectory}/source-frame-comparison.json`, JSON.stringify({
    sourceTime: 'S5 01:18.75',
    panel: { x: 29, y: 375, width: 539, height: 551 },
    pixelmatchThreshold: 0.16,
    changedPixels,
    differenceRatio,
  }, null, 2));
  expect(differenceRatio, 'the 01:18.75 source panel should align with the same browser media time').toBeLessThan(0.04);

  await page.getByRole('button', { name: '继续游戏' }).click();
  await expect.poll(() => sourceVideo.evaluate((video) => video.currentTime), { timeout: 5_000 })
    .toBeGreaterThan(1.15);
  await expect.poll(() => page.evaluate(() => {
    const canvasElement = document.querySelector('#game-canvas');
    const video = document.querySelector('#level-five-source-gameplay-video');
    const audioElement = document.querySelector('#level-five-source-audio');
    return !video.paused && !audioElement.paused && Math.abs(Number(canvasElement.dataset.levelFiveSourceTime) - audioElement.currentTime) < 0.15;
  }), { timeout: 5_000 }).toBe(true);

  await expect(page.locator('#live-status')).toHaveText('第 6 关开始', { timeout: 22_000 });
  await expect(canvas).toHaveAttribute('data-game-status', 'playing');
  expect(errors).toEqual([]);
  const report = await canvas.evaluate((element) => ({
    sourceActive: element.dataset.levelFiveSourceActive,
    remainingCells: Number(element.dataset.levelFiveRemainingCells),
    status: element.dataset.gameStatus,
    nextLevel: document.querySelector('#live-status').textContent,
  }));
  await page.close();
  const videoPath = await recordedVideo.path();
  await copyFile(videoPath, `${recordingDirectory}/level5-source-route.webm`);
  await writeFile(`${recordingDirectory}/route-report.json`, JSON.stringify({
    input: 'real mouse drag of blue tray from (410,605) to (323,597)',
    source: 'S5 01:17.75–01:31.75 video and mixed audio',
    final: report,
    errors,
  }, null, 2));
});

test('原片路线中可拖动可见红槽接管自由操作', async ({ page }) => {
  test.setTimeout(35_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?previewLevel=5');
  const canvas = page.locator('#game-canvas');
  const sourceVideo = page.locator('#level-five-source-gameplay-video');
  const sourceAudio = page.locator('#level-five-source-audio');
  await expect(page.locator('#live-status')).toHaveText('第 5 关开始', { timeout: 20_000 });
  await dragCanvas(page, { x: 446, y: 681 }, { x: 359, y: 673 });
  await expect.poll(() => sourceVideo.evaluate((video) => video.currentTime), { timeout: 12_000 })
    .toBeGreaterThan(8.15);
  const red = await canvas.evaluate((element) => JSON.parse(element.dataset.levelFiveBuckets)
    .find((bucket) => bucket.id === 'red'));
  expect(red.x, 'the source-timed red tray should be visible in its mid-board route').toBeGreaterThan(180);
  expect(red.x).toBeLessThan(260);
  expect(red.y).toBeGreaterThan(575);
  expect(red.y).toBeLessThan(610);

  await dragCanvas(page, { x: red.x + 36, y: red.y + 70 }, { x: red.x + 42, y: 495 }, 250);
  await expect(canvas).toHaveAttribute('data-level-five-source-active', 'false');
  await expect(sourceVideo).toHaveJSProperty('paused', true);
  await expect(sourceAudio).toHaveJSProperty('paused', true);
  const takeover = await canvas.evaluate((element) => ({
    red: JSON.parse(element.dataset.levelFiveBuckets).find((bucket) => bucket.id === 'red'),
    status: element.dataset.gameStatus,
  }));
  expect(takeover.red.y).toBeLessThan(599);
  expect(takeover.status).toBe('playing');
  expect(errors).toEqual([]);
});
