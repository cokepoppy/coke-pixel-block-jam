import { expect, test } from '@playwright/test';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';

const canvasSize = { width: 597, height: 1296 };
const levelFourSourcePanel = await sharp(fileURLToPath(new URL('../assets/level4/level4-opening-panel.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelFourSourceFrame = await sharp(fileURLToPath(new URL('../assets/level4/level4-frame-55.5.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

test.use({ video: { mode: 'on', size: canvasSize } });

async function readLevelFourState(page) {
  return page.locator('#game-canvas').evaluate((canvas) => ({
    buckets: JSON.parse(canvas.dataset.levelFourBuckets ?? '[]'),
    remainingCells: Number(canvas.dataset.levelFourRemainingCells),
    sourceActive: canvas.dataset.levelFourSourceActive === 'true',
    sourceTime: Number(canvas.dataset.levelFourSourceTime),
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

test('Level 4 的真实拖动路线按源帧播放像素下落并进入 Level 5', async ({ page }) => {
  test.setTimeout(45_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const video = page.video();
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

  await dragBucket(page, { x: 216, y: 637 }, { x: 381, y: 637 });
  await expect(canvas).toHaveAttribute('data-level-four-source-active', 'true');
  await expect.poll(async () => Number(await canvas.getAttribute('data-level-four-source-time')))
    .toBeGreaterThan(1);
  const sourceAudio = page.locator('#level-four-source-audio');
  await expect.poll(() => sourceAudio.evaluate((element) => element.currentTime), { timeout: 5_000 })
    .toBeGreaterThan(1);
  await expect.poll(() => sourceAudio.evaluate((element) => ({ paused: element.paused, muted: element.muted })))
    .toEqual({ paused: false, muted: false });

  // Freeze the source-timed panel through Settings and compare it with the
  // original S5 00:55.5 panel frame at the same media time.
  await page.locator('#settings-button').click();
  await expect(page.getByRole('dialog', { name: '游戏设置' })).toBeVisible();
  await expect.poll(() => sourceAudio.evaluate((element) => ({ paused: element.paused, muted: element.muted })))
    .toEqual({ paused: true, muted: true });
  await page.evaluate(() => {
    document.querySelector('#level-four-source-gameplay-video').currentTime = 1;
  });
  await page.waitForFunction(() => {
    const source = document.querySelector('#level-four-source-gameplay-video');
    return Math.abs(source.currentTime - 1) < 0.01 && !source.seeking;
  });
  const sourceMatchDataUrl = await canvas.evaluate((element) => element.toDataURL('image/png'));
  const sourceMatchScreenshot = Buffer.from(sourceMatchDataUrl.split(',')[1], 'base64');
  await writeFile(`${recordingDir}/source-frame-55.5-browser.png`, sourceMatchScreenshot);
  const sourceMatchPanel = await sharp(sourceMatchScreenshot)
    .extract({ left: 17, top: 285, width: 563, height: 706 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sourceFrameDiff = pixelmatch(
    levelFourSourceFrame.data,
    sourceMatchPanel.data,
    Buffer.alloc(sourceMatchPanel.data.length),
    sourceMatchPanel.info.width,
    sourceMatchPanel.info.height,
    { threshold: 0.12, includeAA: false },
  );
  const sourceFrameDiffRatio = sourceFrameDiff / (563 * 706);
  expect(sourceFrameDiffRatio, 'the 55.5 s source action frame should remain aligned in the browser panel')
    .toBeLessThan(0.015);

  await page.getByRole('button', { name: '继续游戏' }).click();
  await expect.poll(async () => (await readLevelFourState(page)).sourceTime, { timeout: 5_000 }).toBeGreaterThan(1.5);
  await expect.poll(() => sourceAudio.evaluate((element) => element.currentTime), { timeout: 5_000 })
    .toBeGreaterThan(1.5);
  await expect.poll(() => page.evaluate(() => {
    const videoTime = Number(document.querySelector('#game-canvas').dataset.levelFourSourceTime);
    const audioElement = document.querySelector('#level-four-source-audio');
    return !audioElement.paused && !audioElement.muted && Math.abs(videoTime - audioElement.currentTime) < 0.15;
  })).toBe(true);
  const audioDrift = await page.evaluate(() => Math.abs(
    Number(document.querySelector('#game-canvas').dataset.levelFourSourceTime)
      - document.querySelector('#level-four-source-audio').currentTime,
  ));
  expect(audioDrift).toBeLessThan(0.15);
  await expect.poll(async () => (await readLevelFourState(page)).buckets
    .find((bucket) => bucket.id === 'blue-left')?.progress ?? 0, { timeout: 5_000 }).toBe(100);
  await expect.poll(async () => (await readLevelFourState(page)).buckets
    .find((bucket) => bucket.id === 'red-top')?.progress ?? 0, { timeout: 5_000 }).toBeGreaterThan(0);
  await expect.poll(async () => Number(await canvas.getAttribute('data-level-four-remaining-cells')))
    .toBeLessThan(before.remainingCells);
  await expect(page.locator('#live-status')).toHaveText('第 5 关开始', { timeout: 30_000 });
  expect(errors).toEqual([]);
  await page.screenshot({ path: `${recordingDir}/level5-after-level4-source-route.png` });
  const videoPath = await video.path();
  await page.close();
  await copyFile(videoPath, `${recordingDir}/level4-source-route.webm`);
  await writeFile(`${recordingDir}/source-route-report.json`, JSON.stringify({
    sourceMedia: 'S5 00:54.5–01:09.5',
    route: 'five real lower-tray rearrangements then blue-left from (216,637) to (381,637)',
    comparedSourceFrame: 'S5 00:55.5',
    sourceFrameDiffRatio,
    finalStatus: '第 5 关开始',
    errors,
  }, null, 2));
});

test('Level 4 原片路线播放时拖动可见槽会暂停源片并接回自由操作', async ({ page }) => {
  await page.goto('/?previewLevel=4');
  const canvas = page.locator('#game-canvas');
  const rearrangements = [
    [{ x: 50, y: 637 }, { x: 216, y: 637 }],
    [{ x: 50, y: 801 }, { x: 50, y: 637 }],
    [{ x: 216, y: 801 }, { x: 50, y: 801 }],
    [{ x: 381, y: 801 }, { x: 216, y: 801 }],
    [{ x: 381, y: 637 }, { x: 381, y: 801 }],
  ];
  for (const [from, to] of rearrangements) await dragBucket(page, from, to);
  await dragBucket(page, { x: 216, y: 637 }, { x: 381, y: 637 });
  await expect.poll(async () => (await readLevelFourState(page)).sourceTime, { timeout: 5_000 }).toBeGreaterThan(1);

  const stateDuringPlayback = await readLevelFourState(page);
  const redTop = stateDuringPlayback.buckets.find((bucket) => bucket.id === 'red-top');
  expect(redTop).toBeTruthy();
  await dragBucket(page, { x: redTop.x, y: redTop.y }, { x: redTop.x, y: 637 }, 176);

  const stateAfterTakeover = await readLevelFourState(page);
  expect(stateAfterTakeover.sourceActive).toBe(false);
  expect(stateAfterTakeover.buckets.find((bucket) => bucket.id === 'red-top')?.y).toBeCloseTo(637, 3);
  await expect(page.locator('#level-four-source-audio')).toHaveJSProperty('paused', true);
  await expect(page.locator('#live-status')).toHaveText('已调整红色 收集槽位置');
});

test('Level 4 下方收集槽不会被拖进像素墙，红色中央槽保留原片起始高度', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?previewLevel=4');
  await expect(page.locator('#live-status')).toHaveText('第 4 关开始');
  const canvas = page.locator('#game-canvas');
  const before = await readLevelFourState(page);
  await dragBucket(page, { x: 50, y: 801 }, { x: 50, y: 300 });
  let state = await readLevelFourState(page);
  expect(state.buckets.find((bucket) => bucket.id === 'green-bottom')?.y).toBe(637);
  expect(state.remainingCells).toBe(before.remainingCells);
  expect(state.buckets.every((bucket) => bucket.progress === 0)).toBe(true);

  await dragBucket(page, { x: 381, y: 637 }, { x: 381, y: 300 });
  state = await readLevelFourState(page);
  expect(state.buckets.find((bucket) => bucket.id === 'red-right')?.y).toBe(637);
  expect(state.remainingCells).toBe(before.remainingCells);

  await dragBucket(page, { x: 216, y: 465 }, { x: 216, y: 300 }, 176);
  state = await readLevelFourState(page);
  expect(state.buckets.find((bucket) => bucket.id === 'red-top')?.y).toBe(465);
  expect(state.remainingCells).toBe(before.remainingCells);
  await expect(canvas).toHaveAttribute('data-level-four-source-active', 'false');
  expect(errors).toEqual([]);
  await page.screenshot({ path: '.research/recordings/level4-reposition/level-four-drag-limits.png' });
});
