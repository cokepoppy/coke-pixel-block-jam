import { expect, test } from '@playwright/test';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { createGameState } from '../src/game.js';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';

test.use({ video: { mode: 'on', size: { width: 597, height: 1296 } } });
const directory = new URL('../.research/recordings/level1-green-first-reliability/', import.meta.url);

async function coordinates(page, x, y) {
  const box = await page.locator('#game-canvas').boundingBox();
  if (!box) throw new Error('游戏画布不可见');
  return { x: box.x + x * box.width / 597, y: box.y + y * box.height / 1296 };
}

async function dragMouse(page, x, { holdUntilComplete = false } = {}) {
  const from = await coordinates(page, x, 866), to = await coordinates(page, x, 620);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step <= 30; step++) {
    await page.mouse.move(from.x, from.y + (to.y - from.y) * step / 30);
    await page.waitForTimeout(10);
  }
  if (holdUntilComplete) await expect(page.locator('#live-status')).toContainText('绿色 像素块，进度 100%', { timeout: 6_000 });
  await page.mouse.up();
}

async function wallColorVisibility(page, color) {
  const cells = createGameState(1).grid.filter(cell => cell?.color === color);
  return page.locator('#game-canvas').evaluate((canvas, points) => {
    const context = canvas.getContext('2d');
    const scale = canvas.width / 597;
    return points.map(({ x, y, color }) => {
      const [r, g, b] = context.getImageData(Math.round(x * scale), Math.round(y * scale), 1, 1).data;
      return color === 'green' ? g > r * 1.3 && g > b * 1.2
        : color === 'red' ? r > g * 1.35 && r > b * 1.25
          : r > 140 && g > 140 && b < 140;
    });
  }, cells);
}

test('第一关绿槽按住收集后仍能拖红黄进入第二关', async ({ page }) => {
  test.setTimeout(35_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const video = page.video();
  await mkdir(directory, { recursive: true });
  await page.goto('/');
  await expect(page.locator('#live-status')).toHaveText('第 1 关开始');
  const originalRed = await wallColorVisibility(page, 'red');
  const originalYellow = await wallColorVisibility(page, 'yellow');
  await dragMouse(page, 111, { holdUntilComplete: true });
  const buckets = () => page.locator('#game-canvas').evaluate(el => JSON.parse(el.dataset.levelOneBuckets));
  await expect.poll(async () => {
    const green = (await buckets()).find(bucket => bucket.id === 'green');
    return green.collected === green.total;
  }).toBe(true);
  expect((await buckets()).filter(bucket => bucket.id !== 'green').map(bucket => bucket.collected)).toEqual([0, 0]);
  const redAfterGreen = await wallColorVisibility(page, 'red');
  const yellowAfterGreen = await wallColorVisibility(page, 'yellow');
  expect(originalRed.filter((visible, index) => visible && !redAfterGreen[index])).toEqual([]);
  expect(originalYellow.filter((visible, index) => visible && !yellowAfterGreen[index])).toEqual([]);
  const greenFrame = await page.screenshot({ path: new URL('green-complete.png', directory).pathname });
  for (const region of [{ x: 0, y: 0, width: 563, height: 30 }, { x: 0, y: 310, width: 20, height: 400 }]) {
    const [source, rendered] = await Promise.all([
      sharp('assets/level1/level1-opening-panel.png').extract({ left: region.x, top: region.y, width: region.width, height: region.height }).ensureAlpha().raw().toBuffer(),
      sharp(greenFrame).extract({ left: 17 + region.x, top: 226 + region.y, width: region.width, height: region.height }).ensureAlpha().raw().toBuffer(),
    ]);
    expect(pixelmatch(source, rendered, Buffer.alloc(source.length), region.width, region.height,
      { threshold: 0.12, includeAA: false }), 'the live frame should retain the unobstructed source border').toBe(0);
  }
  const [sourceBucket, liveBucket] = await Promise.all([
    sharp('e2e/fixtures/level1-green-bucket-100-source.png').ensureAlpha().raw().toBuffer(),
    sharp(greenFrame).extract({ left: 49, top: 497, width: 125, height: 247 }).ensureAlpha().raw().toBuffer(),
  ]);
  const bucketDiff = pixelmatch(sourceBucket, liveBucket, Buffer.alloc(sourceBucket.length), 125, 247,
    { threshold: 0.16, includeAA: false });
  expect(bucketDiff / (125 * 247), 'green 100% tray should stay close to the source frame').toBeLessThan(0.10);
  await dragMouse(page, 485);
  await expect(page.locator('#live-status')).toContainText('红色 像素块，进度 100%', { timeout: 7_000 });
  await expect.poll(async () => {
    const red = (await buckets()).find(bucket => bucket.id === 'red');
    return red.collected === red.total;
  }).toBe(true);
  // Red was not the last color: the recorded victory screen must not obscure
  // the remaining yellow tray after its source segment reaches the logo.
  await page.waitForTimeout(1_800);
  const yellowVisible = await page.locator('#game-canvas').evaluate(canvas => {
    const scale = canvas.width / 597;
    const [r, g, b] = canvas.getContext('2d').getImageData(Math.round(300 * scale), Math.round(750 * scale), 1, 1).data;
    return r > 110 && g > 90 && b < 130;
  });
  expect(yellowVisible, 'yellow remains visibly available until the player moves it').toBe(true);
  await dragMouse(page, 298);
  expect((await wallColorVisibility(page, 'green')).filter(Boolean), 'the already-cleared green wall must not reappear during yellow').toEqual([]);
  await expect(page.locator('#live-status')).toHaveText('第 2 关开始', { timeout: 12_000 });
  expect(errors).toEqual([]);
  await page.close();
  await copyFile(await video.path(), new URL('green-red-yellow.webm', directory));
  await writeFile(new URL('report.json', directory), JSON.stringify({ route: 'green held to 100%, red, yellow, Level 2', errors }, null, 2));
});

test.describe('缩放窗口和触屏', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  test('高分屏触屏先拖绿槽，再拖黄红完成第一关', async ({ page }) => {
    test.setTimeout(30_000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?previewLevel=1');
    await expect(page.locator('#live-status')).toHaveText('第 1 关开始');
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    const touch = async (x, hold) => {
      const from = await coordinates(page, x, 866), to = await coordinates(page, x, 620);
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...from, id: 1 }] });
      for (let step = 1; step <= 25; step++) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x, y: from.y + (to.y - from.y) * step / 25, id: 1 }] });
        await page.waitForTimeout(10);
      }
      if (hold) await expect(page.locator('#live-status')).toContainText('绿色 像素块，进度 100%', { timeout: 6_000 });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    await touch(111, true);
    await touch(298, false);
    await expect(page.locator('#live-status')).toContainText('黄色 像素块，进度 100%', { timeout: 6_000 });
    await touch(485, false);
    await expect(page.locator('#live-status')).toHaveText('第 2 关开始', { timeout: 12_000 });
    expect(errors).toEqual([]);
    await session.detach();
  });
});

test('浏览器不支持视频帧回调时第一关绿槽仍能收集并继续', async ({ page }) => {
  test.setTimeout(30_000);
  await page.addInitScript(() => { Object.defineProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback', { value: undefined, configurable: true }); });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?previewLevel=1');
  await expect(page.locator('#live-status')).toHaveText('第 1 关开始');
  const started = Date.now();
  await dragMouse(page, 111, { holdUntilComplete: true });
  expect(Date.now() - started, 'fallback rendering should not wait for the video to play to its end').toBeLessThan(2_700);
  await dragMouse(page, 485);
  await expect(page.locator('#live-status')).toContainText('红色 像素块，进度 100%', { timeout: 7_000 });
  await dragMouse(page, 298);
  await expect(page.locator('#live-status')).toHaveText('第 2 关开始', { timeout: 12_000 });
  expect(errors).toEqual([]);
});

test('第一关一次快速上滑也不能把绿槽拖进像素墙', async ({ page }) => {
  await page.addInitScript(() => {
    window.__greenTrayDraws = [];
    const original = CanvasRenderingContext2D.prototype.roundRect;
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
      if (this.canvas?.id === 'game-canvas' && x === 49 && width === 125 && height === 247) {
        window.__greenTrayDraws.push(y);
      }
      return original.call(this, x, y, width, height, radius);
    };
  });
  await page.goto('/?previewLevel=1');
  await expect(page.locator('#live-status')).toHaveText('第 1 关开始');
  const from = await coordinates(page, 111, 866), to = await coordinates(page, 111, 100);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const y = await page.evaluate(() => window.__greenTrayDraws.at(-1));
  expect(y, 'green tray must stay below the pixel wall even with one pointer move').toBeGreaterThanOrEqual(497);
  await page.mouse.up();
  await expect(page.locator('#live-status')).toContainText('绿色 像素块，进度 100%', { timeout: 6_000 });
});

test('原片视频播放失败时第一关依然可拖动收集和过关', async ({ page }) => {
  test.setTimeout(30_000);
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this.id === 'level-one-source-video') return Promise.reject(new DOMException('Playback denied', 'NotAllowedError'));
      return play.call(this);
    };
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?previewLevel=1');
  await expect(page.locator('#live-status')).toHaveText('第 1 关开始');
  await dragMouse(page, 111, { holdUntilComplete: true });
  await dragMouse(page, 485);
  await expect(page.locator('#live-status')).toContainText('红色 像素块，进度 100%', { timeout: 6_000 });
  await dragMouse(page, 298);
  await expect(page.locator('#live-status')).toHaveText('第 2 关开始', { timeout: 12_000 });
  expect(errors).toEqual([]);
});
