import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';
import { createGameState } from '../src/game.js';
import { levelTwoSourceProgressAt } from '../src/level-two-collection-profile.js';

test('第二关真实拖绿槽的画面与原录屏关键帧留存对照', async ({ page }, testInfo) => {
  test.setTimeout(25_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?previewLevel=2');
  await expect(page.locator('#live-status')).toHaveText('第 2 关开始');
  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  const point = (x, y) => ({ x: box.x + x * box.width / 597, y: box.y + y * box.height / 1296 });
  const redStart = point(450, 750), redEnd = point(450, 550);
  await page.mouse.move(redStart.x, redStart.y);
  await page.mouse.down();
  await page.mouse.move(redEnd.x, redEnd.y, { steps: 20 });
  await page.mouse.up();
  const sourceVideo = page.locator('#level-two-source-gameplay-video');
  await expect.poll(() => sourceVideo.evaluate(video => video.currentTime), { timeout: 5_000 }).toBeGreaterThan(2.25);
  const greenStart = point(100, 750), greenEnd = point(100, 537);
  await page.mouse.move(greenStart.x, greenStart.y);
  await page.mouse.down();
  await expect(sourceVideo).toHaveJSProperty('paused', true);
  const sourceTime = await sourceVideo.evaluate(video => video.currentTime);
  const sourceWallPng = await sourceVideo.evaluate(video => {
    const buffer = document.createElement('canvas');
    buffer.width = video.videoWidth;
    buffer.height = video.videoHeight;
    buffer.getContext('2d').drawImage(video, 0, 0);
    return buffer.toDataURL('image/png');
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const takeoverPng = await canvas.evaluate(el => el.toDataURL('image/png'));
  const takeoverRed = Number(await canvas.getAttribute('data-progress-red'));
  const sourceRed = levelTwoSourceProgressAt('red', Math.max(0, (sourceTime - 0.2) * 1000));
  expect(Math.abs(takeoverRed - sourceRed), 'red progress should remain continuous when taking control').toBeLessThanOrEqual(3);
  const decoded = await Promise.all([sourceWallPng, takeoverPng].map(value => (
    sharp(Buffer.from(value.split(',')[1], 'base64')).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  )));
  const redCells = createGameState(2).grid.filter(cell => cell?.targetBucketId === 'red');
  const isRedAt = (frame, x, y) => {
    const offset = (Math.round(y) * frame.info.width + Math.round(x)) * frame.info.channels;
    const [r, g, b] = frame.data.subarray(offset, offset + 3);
    return r > g * 1.35 && r > b * 1.25;
  };
  const redCellMismatches = redCells.filter(cell => (
    isRedAt(decoded[0], cell.x - 17, cell.y - 310) !== isRedAt(decoded[1], cell.x, cell.y)
  )).length;
  expect(redCellMismatches, 'taking control must preserve the red pixels visible immediately beforehand').toBeLessThanOrEqual(6);
  await page.mouse.move(greenEnd.x, greenEnd.y, { steps: 15 });
  await expect.poll(() => canvas.evaluate(el => JSON.parse(el.dataset.levelTwoBuckets).find(b => b.id === 'green').y)).toBe(520);
  const snapshot = await canvas.evaluate(el => ({
    png: el.toDataURL('image/png'), red: Number(el.dataset.progressRed), green: Number(el.dataset.progressGreen),
    yellow: Number(el.dataset.progressYellow), buckets: JSON.parse(el.dataset.levelTwoBuckets),
  }));
  expect(snapshot.red).toBeGreaterThan(0);
  expect(snapshot.yellow).toBe(0);
  const image = Buffer.from(snapshot.png.split(',')[1], 'base64');
  const panel = await sharp(image).extract({ left: 17, top: 310, width: 563, height: 666 }).png().toBuffer();
  const sourcePath = fileURLToPath(new URL('./fixtures/level2-source-frames/frame-0163.png', import.meta.url));
  const original = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const actual = await sharp(panel).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const diff = Buffer.alloc(actual.data.length);
  const changed = pixelmatch(original.data, actual.data, diff, 563, 666, { threshold: 0.16, includeAA: false });
  const dir = fileURLToPath(new URL('../.research/events/level2-live-source-comparison/', import.meta.url));
  await mkdir(dir, { recursive: true });
  // The extracted source video is 562 px wide; the panel crop is 563 px.
  const sourceAtTakeover = await sharp(Buffer.from(sourceWallPng.split(',')[1], 'base64'))
    .extend({ right: 1, background: '#ffffff' }).png().toBuffer();
  const liveAtTakeover = await sharp(Buffer.from(takeoverPng.split(',')[1], 'base64'))
    .extract({ left: 17, top: 310, width: 563, height: 666 }).png().toBuffer();
  const [sourcePixels, livePixels] = await Promise.all([sourceAtTakeover, liveAtTakeover]
    .map(value => sharp(value).ensureAlpha().raw().toBuffer()));
  const takeoverDiff = Buffer.alloc(sourcePixels.length);
  const takeoverChanged = pixelmatch(sourcePixels, livePixels, takeoverDiff, 563, 666, { threshold: 0.16, includeAA: false });
  await sharp({ create: { width: 1126, height: 666, channels: 4, background: '#ffffff' } })
    .composite([{ input: sourceAtTakeover, left: 0, top: 0 }, { input: liveAtTakeover, left: 563, top: 0 }])
    .png().toFile(`${dir}/source-at-takeover-left-live-right.png`);
  await sharp({ create: { width: 1126, height: 666, channels: 4, background: '#ffffff' } })
    .composite([{ input: sourcePath, left: 0, top: 0 }, { input: panel, left: 563, top: 0 }])
    .png().toFile(`${dir}/source-left-live-right.png`);
  await sharp(diff, { raw: { width: 563, height: 666, channels: 4 } }).png().toFile(`${dir}/diff.png`);
  await writeFile(`${dir}/report.json`, JSON.stringify({ source: 'S5 00:12.2 frame 163',
    red: snapshot.red, green: snapshot.green, yellow: snapshot.yellow, greenPosition: snapshot.buckets.find(b => b.id === 'green'),
    changedPixels: changed, changedPixelRatio: changed / (563 * 666), threshold: 0.16, redCellMismatches, redCellsChecked: redCells.length,
    takeoverSourceTime: sourceTime, takeoverRed, expectedSourceRed: sourceRed,
    takeoverChangedPixels: takeoverChanged, takeoverChangedPixelRatio: takeoverChanged / (563 * 666),
    limitation: 'Source green y=493, live green y=520; progress and particle states are not identical.' }, null, 2));
  await testInfo.attach('source-left-live-right.png', { path: `${dir}/source-left-live-right.png`, contentType: 'image/png' });
  await page.mouse.up();
  await expect.poll(() => canvas.getAttribute('data-progress-green'), { timeout: 8_000 }).toBe('100');
  expect(errors).toEqual([]);
});
