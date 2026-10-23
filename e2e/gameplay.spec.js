import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';
import { createGameState } from '../src/game.js';

const levelOneOpeningBlendStart = 696;
const levelOneBoardPixels = await sharp(fileURLToPath(new URL('../assets/level1/level1-board.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelOneSettingsGearPixels = await sharp(fileURLToPath(new URL('../assets/level1/level1-settings-gear.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelOneOpeningPanelPixels = await sharp(fileURLToPath(new URL('../assets/level1/level1-opening-panel.png', import.meta.url)))
  .extract({ left: 0, top: 0, width: 563, height: 696 })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelOnePadPixels = await Promise.all(Array.from({ length: 4 }, (_, index) => sharp(
  fileURLToPath(new URL(`../assets/level1/level1-pad-cell-${index + 1}.png`, import.meta.url)),
).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
const levelTwoBoardPixels = await sharp(fileURLToPath(new URL('../assets/level2/level2-board.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelTwoOpeningPanelPixels = await sharp(fileURLToPath(new URL('../assets/level2/level2-opening-panel.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelThreeBoardPixels = await sharp(fileURLToPath(new URL('../assets/level3/level3-board.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelFourBoardCellsPixels = await sharp(fileURLToPath(new URL('../assets/level4/level4-board-cells.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelFiveBoardPixels = await sharp(fileURLToPath(new URL('../assets/level5/level5-board.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelSixBoardPixels = await sharp(fileURLToPath(new URL('../assets/level6/level6-board.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelSevenBoardPixels = await sharp(fileURLToPath(new URL('../assets/level7/level7-board.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelNineBoardPixels = await sharp(fileURLToPath(new URL('../assets/level9/level9-board.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelTenBoardPixels = await sharp(fileURLToPath(new URL('../assets/level10/level10-board.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelTenPadPixels = await sharp(fileURLToPath(new URL('../assets/level10/level10-pad-row.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelTenPipePixels = await Promise.all(Array.from({ length: 3 }, (_, index) => sharp(
  fileURLToPath(new URL(`../assets/level10/level10-pipe-${index + 1}-top.png`, import.meta.url)),
).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
const levelTenBucketPixels = await Promise.all(createGameState(10).config.buckets
  .filter(({ y, height }) => y + height <= 900)
  .map(({ id }) => sharp(fileURLToPath(new URL(`../assets/level10/level10-bucket-${id}.png`, import.meta.url)))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })));
const levelElevenBoardPixels = Object.fromEntries(await Promise.all(['upper', 'lower'].map(async (boardId) => [
  boardId,
  await sharp(fileURLToPath(new URL(`../assets/level11/level11-${boardId}-board.png`, import.meta.url)))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true }),
])));
const levelTwelveBoardPixels = await sharp(fileURLToPath(new URL('../assets/level12/level12-board.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelThirteenBoardPixels = await sharp(fileURLToPath(new URL('../assets/level13/level13-board.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelEightBoardPixels = await sharp(fileURLToPath(new URL('../assets/level8/level8-board.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

async function pointOnCanvas(page, x, y) {
  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('游戏画布没有显示');
  return {
    x: box.x + (x / 597) * box.width,
    y: box.y + (y / 1296) * box.height,
  };
}

async function drag(page, fromX, fromY, toX, toY) {
  const from = await pointOnCanvas(page, fromX, fromY);
  const to = await pointOnCanvas(page, toX, toY);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const durationMs = Math.max(100, distance * 2);
  const steps = Math.max(6, Math.ceil(durationMs / (1_000 / 60)));
  const startedAt = Date.now();
  for (let step = 1; step <= steps; step += 1) {
    const dueAt = startedAt + (step / steps) * durationMs;
    const delay = dueAt - Date.now();
    if (delay > 0) await page.waitForTimeout(delay);
    await page.mouse.move(
      from.x + ((to.x - from.x) * step) / steps,
      from.y + ((to.y - from.y) * step) / steps,
    );
  }
  await page.mouse.up();
}

async function installLevelOneMotionProbe(page) {
  await page.addInitScript(() => {
    window.__pbjMotionProbe = { bucketDraws: [], pointerMoves: [], pointerDownAt: null, sourceStarts: [] };
    const prototype = CanvasRenderingContext2D.prototype;
    const originalRoundRect = prototype.roundRect;
    prototype.roundRect = function roundRect(x, y, width, height, radius) {
      if (this.canvas?.id === 'game-canvas' && height === 247 && [49, 174, 423].includes(x)
        && [125, 249, 125].includes(width)) {
        const id = x === 49 ? 'green' : x === 174 ? 'yellow' : 'red';
        window.__pbjMotionProbe.bucketDraws.push({ at: performance.now(), id, y });
      }
      return originalRoundRect.call(this, x, y, width, height, radius);
    };
    document.addEventListener('pointermove', (event) => {
      window.__pbjMotionProbe.pointerMoves.push({ at: performance.now(), x: event.clientX, y: event.clientY });
    }, true);
    document.addEventListener('pointerdown', () => {
      window.__pbjMotionProbe.pointerDownAt = performance.now();
    }, true);

    const watchVideo = () => {
      const video = document.querySelector('#level-one-source-video');
      if (video && !video.paused && window.__pbjMotionProbe.sourceStarts.length === 0) {
        window.__pbjMotionProbe.sourceStarts.push({ at: performance.now(), time: video.currentTime });
      }
      requestAnimationFrame(watchVideo);
    };
    requestAnimationFrame(watchVideo);
  });
}

async function dragAt60Hz(page, fromX, fromY, toX, toY, durationMs) {
  const from = await pointOnCanvas(page, fromX, fromY);
  const to = await pointOnCanvas(page, toX, toY);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const startedAt = Date.now();
  const steps = Math.round(durationMs / (1_000 / 60));
  for (let step = 1; step <= steps; step += 1) {
    const dueAt = startedAt + (step / steps) * durationMs;
    const delay = dueAt - Date.now();
    if (delay > 0) await page.waitForTimeout(delay);
    await page.mouse.move(
      from.x + ((to.x - from.x) * step) / steps,
      from.y + ((to.y - from.y) * step) / steps,
    );
  }
  await page.mouse.up();
}

async function dispatchTouch(session, type, point, id = 1) {
  await session.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: point ? [{ ...point, id, radiusX: 1, radiusY: 1, force: 1 }] : [],
  });
}

async function touchTap(session, box) {
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await dispatchTouch(session, 'touchStart', point);
  await dispatchTouch(session, 'touchEnd', null);
}

async function touchDrag(page, session, fromX, fromY, toX, toY, durationMs = 600) {
  const from = await pointOnCanvas(page, fromX, fromY);
  const to = await pointOnCanvas(page, toX, toY);
  await dispatchTouch(session, 'touchStart', from);
  const startedAt = Date.now();
  const steps = Math.round(durationMs / (1_000 / 60));
  for (let step = 1; step <= steps; step += 1) {
    const dueAt = startedAt + (step / steps) * durationMs;
    const delay = dueAt - Date.now();
    if (delay > 0) await page.waitForTimeout(delay);
    const progress = step / steps;
    await dispatchTouch(session, 'touchMove', {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
    });
  }
  await dispatchTouch(session, 'touchEnd', null);
}

async function countPixelsInRegion(screenshot, region, matches) {
  const { data, info } = await sharp(screenshot)
    .extract(region)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let count = 0;
  for (let offset = 0; offset < data.length; offset += info.channels) {
    if (matches(data[offset], data[offset + 1], data[offset + 2])) count += 1;
  }
  return count;
}

async function startLevelOneYellowFrameProbe(page) {
  await page.evaluate(() => {
    const source = document.querySelector('#level-one-source-video');
    const game = document.querySelector('#game-canvas');
    const sourceCropCanvas = document.createElement('canvas');
    const gameCropCanvas = document.createElement('canvas');
    for (const canvas of [sourceCropCanvas, gameCropCanvas]) {
      canvas.width = 474;
      canvas.height = 219;
    }
    const sourceBucketCanvas = document.createElement('canvas');
    const gameBucketCanvas = document.createElement('canvas');
    for (const canvas of [sourceBucketCanvas, gameBucketCanvas]) {
      canvas.width = 260;
      canvas.height = 341;
    }
    const sourcePanelCanvas = document.createElement('canvas');
    const gamePanelCanvas = document.createElement('canvas');
    for (const canvas of [sourcePanelCanvas, gamePanelCanvas]) {
      canvas.width = 564;
      canvas.height = 756;
    }
    const sourceCropContext = sourceCropCanvas.getContext('2d', { willReadFrequently: true });
    const gameCropContext = gameCropCanvas.getContext('2d', { willReadFrequently: true });
    const sourceBucketContext = sourceBucketCanvas.getContext('2d', { willReadFrequently: true });
    const gameBucketContext = gameBucketCanvas.getContext('2d', { willReadFrequently: true });
    const sourcePanelContext = sourcePanelCanvas.getContext('2d', { willReadFrequently: true });
    const gamePanelContext = gamePanelCanvas.getContext('2d', { willReadFrequently: true });
    const targets = [0.5, 0.7, 1.0, 1.25, 1.5, 1.6];
    const result = { recording: false, videoFrames: [], samples: [], captures: [], timedOut: false, done: false };
    window.__levelOneYellowFrameProbe = result;
    let captureIndex = 0;
    const isYellow = (data, offset) => (
      data[offset] > 150
      && data[offset + 1] > 150
      && data[offset + 2] < 150
      && data[offset] > data[offset + 2] * 1.3
      && data[offset + 1] > data[offset + 2] * 1.2
    );
    const countRows = (pixels) => {
      const rows = [];
      for (let row = 0; row < 17; row += 1) {
        let yellow = 0;
        for (let column = 9; column <= 27; column += 1) {
          const x = Math.round((column + 0.5) * 474 / 37);
          const y = Math.round((row + 0.5) * 219 / 17);
          const offset = (y * 474 + x) * 4;
          if (isYellow(pixels.data, offset)) yellow += 1;
        }
        rows.push(yellow);
      }
      return rows;
    };
    const captureFrame = (sourceTime, finalFrame) => {
      const sourceFrame = Math.round(sourceTime * 60);
      if (sourceTime >= 0.48 && sourceTime <= 1.7) {
        sourceCropContext.drawImage(source, 44, 43, 474, 219, 0, 0, 474, 219);
        gameCropContext.drawImage(game, 61, 269, 474, 219, 0, 0, 474, 219);
        sourceBucketContext.drawImage(source, 150, 198, 260, 341, 0, 0, 260, 341);
        gameBucketContext.drawImage(game, 167, 424, 260, 341, 0, 0, 260, 341);
        const sourcePixels = sourceCropContext.getImageData(0, 0, 474, 219);
        const gamePixels = gameCropContext.getImageData(0, 0, 474, 219);
        const sourceRows = countRows(sourcePixels);
        const gameRows = countRows(gamePixels);
        let mismatchedCells = 0;
        for (let row = 0; row < 17; row += 1) {
          for (let column = 9; column <= 27; column += 1) {
            const x = Math.round((column + 0.5) * 474 / 37);
            const y = Math.round((row + 0.5) * 219 / 17);
            const offset = (y * 474 + x) * 4;
            if (isYellow(sourcePixels.data, offset) !== isYellow(gamePixels.data, offset)) mismatchedCells += 1;
          }
        }
        result.samples.push({
          sourceTime,
          sourceFrame,
          sourceRows,
          gameRows,
          mismatchedCells,
        });
        const target = targets[captureIndex];
        if (target !== undefined && sourceTime >= target) {
          sourcePanelContext.drawImage(source, 0, 0, 564, 756, 0, 0, 564, 756);
          gamePanelContext.drawImage(game, 17, 226, 564, 756, 0, 0, 564, 756);
          result.captures.push({
            target,
            sourceTime,
            source: sourceCropCanvas.toDataURL('image/png'),
            game: gameCropCanvas.toDataURL('image/png'),
            sourceBucket: sourceBucketCanvas.toDataURL('image/png'),
            gameBucket: gameBucketCanvas.toDataURL('image/png'),
            sourcePanel: sourcePanelCanvas.toDataURL('image/png'),
            gamePanel: gamePanelCanvas.toDataURL('image/png'),
            sourceRows,
            gameRows,
          });
          captureIndex += 1;
        }
      }
      if (finalFrame || sourceTime >= 1.65) result.done = true;
    };
    const sampleVideoFrame = (_now, metadata) => {
      const sourceTime = metadata.mediaTime;
      if (result.recording && sourceTime >= 0.48 && sourceTime <= 1.65) {
        result.videoFrames.push({
          sourceTime,
          sourceFrame: Math.round(sourceTime * 60),
          presentedFrames: metadata.presentedFrames,
        });
      }
      if (result.recording && sourceTime >= 0.48) {
        // Let the game's own animation-frame draw consume this decoded video
        // frame before reading its canvas, so paired crops compare the same
        // presented source frame rather than racing the render loop.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => captureFrame(source.currentTime, sourceTime >= 1.65));
        });
      }
      if (sourceTime >= 1.65) {
        return;
      }
      source.requestVideoFrameCallback(sampleVideoFrame);
    };
    source.requestVideoFrameCallback(sampleVideoFrame);
    game.addEventListener('pointerup', () => {
      setTimeout(() => {
        result.recording = true;
        setTimeout(() => {
          if (!result.done) {
            result.timedOut = true;
            result.done = true;
          }
        }, 5_000);
      }, 0);
    }, { once: true });
  });
}
async function completeLevelOne(page, assertTransition = false) {
  for (const [x, color] of [[298, '黄色'], [111, '绿色'], [485, '红色']]) {
    await drag(page, x, 866, x, 620);
    await expect(page.locator('#live-status')).toContainText(`${color} 像素块，进度 100%`, { timeout: 5_000 });
  }
  await expect(page.getByRole('status', { name: '正在进入第 2 关' })).toBeVisible();
  const transitionStartedAt = Number(await page.locator('.transition-overlay').getAttribute('data-transition-started-at'));
  expect(Number.isFinite(transitionStartedAt), 'Level 1 transition should expose its measured start time').toBeTruthy();
  if (assertTransition) {
    await expect(page.locator('.transition-ring')).toBeVisible();
    await expect(page.locator('.transition-logo')).toContainText('大闯关');
    await expect.poll(() => page.locator('#level-one-source-audio').evaluate((audio) => (
      !audio.paused && audio.currentTime > 6
    )), { timeout: 500 }).toBeTruthy();
  }
  await expect(page.locator('#live-status')).toHaveText('第 2 关开始', { timeout: 2_000 });
  if (assertTransition) {
    const transitionDuration = await page.evaluate((startedAt) => performance.now() - startedAt, transitionStartedAt);
    expect(transitionDuration, 'Level 1 logo exit should finish in about 0.65 seconds').toBeGreaterThan(500);
    expect(transitionDuration, 'Level 1 source transition should finish in about 0.6 seconds').toBeLessThan(1_200);
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?previewLevel=1');
});

test('启动页显示中文加载状态并自动进入第 1 关', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#live-status')).toHaveText('正在加载游戏');
  await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', '正在加载游戏');
  await expect(page.getByRole('button', { name: '打开设置' })).toBeHidden();
  await expect(page.locator('#live-status')).toHaveText('第 1 关开始', { timeout: 5_000 });
  await expect(page.getByRole('button', { name: '打开设置' })).toBeVisible();
});

test('点击设置按钮后可继续游戏', async ({ page }) => {
  await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', '拖动收集槽收集彩色像素方块');
  await expect(page.getByRole('group', { name: '道具栏' })).toBeHidden();
  await page.getByRole('button', { name: '打开设置' }).click();

  const dialog = page.getByRole('dialog', { name: '游戏设置' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('背景音乐')).toBeVisible();
  await expect(dialog.getByText('游戏音效')).toBeVisible();

  await dialog.getByRole('button', { name: '继续游戏' }).click();
  await expect(dialog).toBeHidden();
});

test('Level 1 教程逐帧对齐原片，循环时黄色槽不动', async ({ page }, testInfo) => {
  const tutorialVideo = page.locator('#level-one-tutorial-video');
  await expect.poll(() => tutorialVideo.evaluate((video) => (
    video.currentSrc.endsWith('/assets/level1/level1-tutorial-hand.mp4')
      && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      && !video.paused
  ))).toBeTruthy();
  const duration = await tutorialVideo.evaluate((video) => video.duration);
  expect(duration, 'the tutorial clip must end before the source begins lifting the yellow tray').toBeLessThanOrEqual(26 / 60 + 0.002);
  expect(duration, 'the tutorial loop must retain the full hand-only movement').toBeGreaterThan(25 / 60 - 0.002);

  const captureFrame = async (frameIndex, label) => {
    const sample = await page.evaluate(async (index) => {
      const video = document.querySelector('#level-one-tutorial-video');
      const gameCanvas = document.querySelector('#game-canvas');
      const gameContext = gameCanvas.getContext('2d');
      const ratio = gameCanvas.width / 597;
      const targetTime = (index + 0.5) / 60;
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      video.pause();
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Tutorial seek to frame ${index} timed out`)), 3_000);
        video.addEventListener('seeked', () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });
        video.currentTime = targetTime;
      });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const sourcePanel = document.createElement('canvas');
      sourcePanel.width = 563;
      sourcePanel.height = 756;
      const sourceContext = sourcePanel.getContext('2d');
      sourceContext.imageSmoothingEnabled = false;
      sourceContext.drawImage(video, 0, 0, 563, 756);

      const referenceCanvas = document.createElement('canvas');
      referenceCanvas.width = gameCanvas.width;
      referenceCanvas.height = gameCanvas.height;
      const referenceContext = referenceCanvas.getContext('2d', { alpha: false });
      referenceContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      referenceContext.drawImage(sourcePanel, 17, 226);

      const encode = (pixels) => {
        const bytes = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
        let binary = '';
        for (let start = 0; start < bytes.length; start += 0x8000) {
          binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
        }
        return btoa(binary);
      };
      const read = (context, rect) => context.getImageData(
        Math.round(rect.left * ratio), Math.round(rect.top * ratio),
        Math.round(rect.width * ratio), Math.round(rect.height * ratio),
      );
      const yellowRect = { left: 17 + 150, top: 226 + 555, width: 270, height: 135 };
      const handRect = { left: 17 + 260, top: 226 + 320, width: 190, height: 210 };
      const sampleRegion = (rect) => {
        const actual = read(gameContext, rect);
        const reference = read(referenceContext, rect);
        if (actual.width !== reference.width || actual.height !== reference.height) {
          throw new Error('Tutorial source and game canvas crops have different dimensions');
        }
        return {
          width: actual.width,
          height: actual.height,
          actual: encode(actual.data),
          reference: encode(reference.data),
        };
      };
      return {
        time: video.currentTime,
        yellow: sampleRegion(yellowRect),
        hand: sampleRegion(handRect),
      };
    }, frameIndex);
    await page.screenshot({ path: testInfo.outputPath(`level1-tutorial-${label}.png`) });
    return sample;
  };

  // Frames 0, 15, and 25 span the original hand gesture. The final capture
  // returns to frame 0 to exercise the loop seam without replaying tray motion.
  const frames = [
    await captureFrame(0, 'frame-00'),
    await captureFrame(15, 'frame-15'),
    await captureFrame(25, 'frame-25'),
    await captureFrame(0, 'loop-frame-00'),
  ];
  const compareRegion = (before, after, label) => {
    const beforePixels = Buffer.from(before, 'base64');
    const afterPixels = Buffer.from(after, 'base64');
    if (beforePixels.length !== afterPixels.length || beforePixels.length !== label.width * label.height * 4) {
      throw new Error(`Bad ${label.width}x${label.height} crop: ${beforePixels.length} vs ${afterPixels.length} bytes`);
    }
    return pixelmatch(beforePixels, afterPixels, Buffer.alloc(beforePixels.length), label.width, label.height, {
      threshold: 0.04,
      includeAA: false,
    });
  };

  for (const [index, frame] of frames.entries()) {
    expect(compareRegion(frame.hand.actual, frame.hand.reference, frame.hand), `frame ${index} hand must match its source video frame`).toBe(0);
    expect(compareRegion(frame.yellow.actual, frame.yellow.reference, frame.yellow), `frame ${index} yellow tray must match its source video frame`).toBe(0);
  }
  const handMotion = compareRegion(frames[0].hand.actual, frames[1].hand.actual, frames[0].hand);
  expect(handMotion, 'the original hand gesture must visibly advance between source frames 0 and 15').toBeGreaterThan(1_000);
  for (const [index, frame] of frames.slice(1).entries()) {
    const trayMotion = compareRegion(frames[0].yellow.actual, frame.yellow.actual, frames[0].yellow);
    expect(trayMotion, `yellow tray must remain pixel-stable at source frame ${[15, 25, 0][index]}`).toBe(0);
  }
});

test('Level 1 黄色槽按真实指针节奏连续上移，扫墙从对应源帧接上', async ({ page }, testInfo) => {
  await installLevelOneMotionProbe(page);
  await page.goto('/?previewLevel=1');
  await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', '拖动收集槽收集彩色像素方块');

  // Match the source move's roughly half-second travel from the tray to the wall.
  await dragAt60Hz(page, 298, 866, 298, 620, 640);
  await expect(page.locator('#live-status')).toContainText('进度 6%', { timeout: 1_500 });
  await page.screenshot({ path: testInfo.outputPath('level1-yellow-drag-in-progress.png') });

  const probe = await page.evaluate(() => window.__pbjMotionProbe);
  expect(probe.sourceStarts.length, 'source sweep should begin after the bucket reaches the wall').toBeGreaterThan(0);
  expect(probe.sourceStarts[0].time, 'yellow sweep should join the source at its recorded wall-contact frame')
    .toBeGreaterThanOrEqual(0.45);
  expect(probe.sourceStarts[0].time, 'source playback should not jump back to the opening/tutorial frame')
    .toBeLessThanOrEqual(0.6);

  const drawGroups = [];
  for (const draw of probe.bucketDraws) {
    const current = drawGroups.at(-1);
    if (!current || draw.at - current.startedAt > 5) {
      drawGroups.push({ startedAt: draw.at, y: [draw.y] });
    } else {
      current.y.push(draw.y);
    }
  }
  const motionFrames = drawGroups
    .map(({ startedAt, y }) => ({ at: startedAt, y: Math.min(...y) }))
    .filter(({ y }) => y < 742 && y > 502);
  expect(probe.pointerMoves.length, 'the drag should deliver a series of browser pointer events').toBeGreaterThan(25);
  expect(motionFrames.length, 'the bucket should travel across multiple rendered frames before reaching the wall')
    .toBeGreaterThan(12);
  let largestFrameStep = 0;
  let largestFrameGap = { ms: 0, before: null, after: null };
  for (let index = 1; index < motionFrames.length; index += 1) {
    const step = motionFrames[index - 1].y - motionFrames[index].y;
    const frameGapMs = motionFrames[index].at - motionFrames[index - 1].at;
    expect(step, 'the bucket should move toward the wall without reversing').toBeGreaterThanOrEqual(-1.5);
    largestFrameStep = Math.max(largestFrameStep, step);
    if (frameGapMs > largestFrameGap.ms) {
      largestFrameGap = { ms: frameGapMs, before: motionFrames[index - 1], after: motionFrames[index] };
    }
  }
  const gestureMoves = probe.pointerMoves.filter(({ at }) => at >= probe.pointerDownAt);
  const largestPointerGapMs = Math.max(0, ...gestureMoves.slice(1).map((move, index) => move.at - gestureMoves[index].at));
  expect(largestFrameStep, 'no rendered frame should skip a large section of the drag').toBeLessThan(35);
  expect(largestFrameGap.ms, 'the browser should repaint the moving bucket without multi-frame stalls').toBeLessThan(67);
  expect(largestFrameGap.ms - largestPointerGapMs, 'Canvas repaint delay should track the browser input cadence')
    .toBeLessThan(20);
  const motionReport = {
    inputPointerMoves: probe.pointerMoves.length,
    renderedMotionFrames: motionFrames.length,
    largestFrameStepPx: Number(largestFrameStep.toFixed(2)),
    largestFrameGapMs: Number(largestFrameGap.ms.toFixed(2)),
    largestFrameGap: largestFrameGap.before && {
      before: { at: Number(largestFrameGap.before.at.toFixed(1)), y: Number(largestFrameGap.before.y.toFixed(2)) },
      after: { at: Number(largestFrameGap.after.at.toFixed(1)), y: Number(largestFrameGap.after.y.toFixed(2)) },
    },
    largestPointerGapMs: Number(largestPointerGapMs.toFixed(2)),
    firstSourceFrameSeconds: Number(probe.sourceStarts[0].time.toFixed(3)),
    motionFrames: motionFrames.map(({ at, y }) => ({ at: Number(at.toFixed(1)), y: Number(y.toFixed(2)) })),
  };
  await testInfo.attach('level1-yellow-drag-motion.json', {
    body: Buffer.from(JSON.stringify(motionReport, null, 2)),
    contentType: 'application/json',
  });
  console.log(`[Level 1 drag] ${JSON.stringify({
    inputPointerMoves: motionReport.inputPointerMoves,
    renderedMotionFrames: motionReport.renderedMotionFrames,
    largestFrameStepPx: motionReport.largestFrameStepPx,
    largestFrameGapMs: motionReport.largestFrameGapMs,
    largestPointerGapMs: motionReport.largestPointerGapMs,
    largestFrameGap: motionReport.largestFrameGap,
    firstSourceFrameSeconds: motionReport.firstSourceFrameSeconds,
  })}`);
});

test('Level 1 开局棋盘和底框连续贴合录屏裁切', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const screenshot = await page.screenshot({ path: testInfo.outputPath('level1-opening-full.png') });
  const gear = await sharp(screenshot)
    .extract({ left: 490, top: 56, width: 66, height: 66 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const expectedGear = Buffer.from(levelOneSettingsGearPixels.data);
  const actualGear = Buffer.from(gear.data);
  for (let offset = 0; offset < expectedGear.length; offset += 4) {
    if (expectedGear[offset + 3] < 250) {
      expectedGear.fill(0, offset, offset + 4);
      actualGear.fill(0, offset, offset + 4);
    }
  }
  const gearDiff = pixelmatch(expectedGear, actualGear, Buffer.alloc(gear.data.length), 66, 66, {
    threshold: 0.16,
    includeAA: false,
  });
  expect(gearDiff, `Level 1 settings gear differs at ${gearDiff} of 4356 pixels`).toBe(0);
  const panel = await sharp(screenshot)
    .extract({ left: 17, top: 226, width: 563, height: 696 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const panelDiff = pixelmatch(levelOneOpeningPanelPixels.data, panel.data, Buffer.alloc(panel.data.length), panel.info.width, panel.info.height, {
    threshold: 0.16,
    includeAA: false,
  });
  expect(panelDiff, `Level 1 opening panel differs at ${panelDiff} of ${panel.info.width * panel.info.height} pixels`).toBe(0);

  for (const [left, edge] of [[17, 'left'], [549, 'right']]) {
    const strip = await sharp(screenshot)
      .extract({ left, top: 956, width: 31, height: 32 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let largestStep = 0;
    for (let y = 1; y < strip.info.height; y += 1) {
      let rowDifference = 0;
      for (let x = 0; x < strip.info.width; x += 1) {
        const offset = (y * strip.info.width + x) * 3;
        const previous = offset - strip.info.width * 3;
        rowDifference += Math.abs(strip.data[offset] - strip.data[previous])
          + Math.abs(strip.data[offset + 1] - strip.data[previous + 1])
          + Math.abs(strip.data[offset + 2] - strip.data[previous + 2]);
      }
      largestStep = Math.max(largestStep, rowDifference / (strip.info.width * 3));
    }
    expect(largestStep, `Level 1 ${edge} lower frame should not have a horizontal crop seam`).toBeLessThan(5);
  }

  const actual = await sharp(screenshot)
    .extract({ left: 61, top: 269, width: 474, height: 219 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const diff = pixelmatch(levelOneBoardPixels.data, actual.data, Buffer.alloc(actual.data.length), actual.info.width, actual.info.height, {
    threshold: 0.16,
    includeAA: false,
  });
  expect(diff, `Level 1 board changed at ${diff} of ${actual.info.width * actual.info.height} pixels`).toBe(0);

  for (const [column, expected] of levelOnePadPixels.entries()) {
    const visibleHeight = column === 2 ? 90 : expected.info.height;
    const actualPad = await sharp(screenshot)
      .extract({ left: 50 + column * 125, top: 527, width: expected.info.width, height: visibleHeight })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const expectedPad = await sharp(expected.data, {
      raw: { width: expected.info.width, height: expected.info.height, channels: expected.info.channels },
    }).extract({ left: 0, top: 0, width: expected.info.width, height: visibleHeight }).raw().toBuffer();
    const diff = pixelmatch(expectedPad, actualPad.data, Buffer.alloc(actualPad.data.length), actualPad.info.width, actualPad.info.height, {
      threshold: 0.16,
      includeAA: false,
    });
    expect(diff, `Level 1 pad cell ${column + 1} changed at ${diff} of ${actualPad.info.width * actualPad.info.height} pixels`).toBe(0);
  }
});

test('Level 1 倒计时文字在胶囊框内横向和纵向居中', async ({ page }) => {
  const screenshot = await page.screenshot();
  const { data, info } = await sharp(screenshot)
    .extract({ left: 235, top: 55, width: 125, height: 60 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let whiteGlyphPixels = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      if (data[offset] < 235 || data[offset + 1] < 235 || data[offset + 2] < 235) continue;
      whiteGlyphPixels += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  expect(whiteGlyphPixels, 'countdown digits should be visible inside the timer').toBeGreaterThan(300);
  const glyphCenterX = 235 + (minX + maxX) / 2;
  const glyphCenterY = 55 + (minY + maxY) / 2;
  expect(Math.abs(glyphCenterX - 298), `timer glyph center x=${glyphCenterX.toFixed(1)}`).toBeLessThanOrEqual(2);
  expect(Math.abs(glyphCenterY - 83), `timer glyph center y=${glyphCenterY.toFixed(1)}`).toBeLessThanOrEqual(2);
});

test('Level 1 黄色墙面先飞散再入槽，关键进度贴近录屏', async ({ page }, testInfo) => {
  await startLevelOneYellowFrameProbe(page);
  await page.evaluate(() => {
    const status = document.querySelector('#live-status');
    window.__levelOneProgressLog = [];
    window.__levelOneProgressTimeLog = [];
    const record = () => {
      const text = status?.textContent ?? '';
      window.__levelOneProgressLog.push(text);
      const progress = Number(text.match(/进度 (\d+)%/)?.[1]);
      if (Number.isFinite(progress)) {
        window.__levelOneProgressTimeLog.push({
          progress,
          sourceTime: document.querySelector('#level-one-source-video')?.currentTime ?? null,
        });
      }
    };
    record();
    new MutationObserver(record).observe(status, { childList: true, characterData: true, subtree: true });
  });
  await drag(page, 298, 866, 298, 620);

  await expect(page.locator('#live-status')).toContainText('进度 6%', { timeout: 1_500 });

  for (const progress of [36, 63, 99, 100]) {
    await expect(page.locator('#live-status')).toContainText(`进度 ${progress}%`, { timeout: 1_000 });
  }
  const progressLog = await page.evaluate(() => window.__levelOneProgressLog);
  const progressTimeLog = await page.evaluate(() => window.__levelOneProgressTimeLog);
  for (const progress of [36, 63, 99, 100]) {
    expect(progressLog.some((entry) => entry.includes(`进度 ${progress}%`)), `missing observed ${progress}% transition`).toBeTruthy();
  }
  for (const [progress, expectedSourceTime] of [[6, 1.0], [36, 1.2], [63, 1.4], [99, 1.7], [100, 2.0]]) {
    const observed = progressTimeLog.find((entry) => entry.progress === progress);
    expect(observed, `missing source-time record for ${progress}%`).toBeTruthy();
    expect(Math.abs(observed.sourceTime - expectedSourceTime), `${progress}% source time ${observed.sourceTime.toFixed(3)}s`)
      .toBeLessThanOrEqual(0.035);
  }

  const frameProbe = await page.evaluate(async () => {
    while (!window.__levelOneYellowFrameProbe.done) await new Promise((resolve) => setTimeout(resolve, 20));
    return window.__levelOneYellowFrameProbe;
  });
  expect(frameProbe.timedOut, 'source-synced frame probe should reach the end of the yellow clear').toBeFalsy();
  expect(frameProbe.videoFrames.length, 'observe more than 55 decoded source frames during the sweep').toBeGreaterThanOrEqual(55);
  expect(frameProbe.samples.length, 'compare rendered canvas frames against the source wall').toBeGreaterThanOrEqual(55);
  expect(frameProbe.captures.map(({ target }) => target)).toEqual([0.5, 0.7, 1.0, 1.25, 1.5, 1.6]);

  for (const [target, clearedRows] of [[0.7, 4], [1.0, 10], [1.6, 17]]) {
    const capture = frameProbe.captures.find((entry) => entry.target === target);
    expect(capture.sourceRows.slice(0, clearedRows).every((count) => count === 0), `source top ${clearedRows} rows should be clear at ${target}s`)
      .toBeTruthy();
    expect(capture.gameRows.slice(0, clearedRows).every((count) => count === 0), `replica top ${clearedRows} rows should be clear at ${target}s`)
      .toBeTruthy();
  }

  const averageCellMismatch = frameProbe.samples.reduce((sum, frame) => sum + frame.mismatchedCells, 0)
    / frameProbe.samples.length;
  const captureComparisons = [];
  for (const capture of frameProbe.captures) {
    const source = await sharp(Buffer.from(capture.source.split(',')[1], 'base64'))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const game = await sharp(Buffer.from(capture.game.split(',')[1], 'base64'))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const diffPixels = pixelmatch(source.data, game.data, Buffer.alloc(game.data.length), 474, 219, {
      threshold: 0.12,
      includeAA: false,
    });
    let absoluteColorDifference = 0;
    for (let offset = 0; offset < source.data.length; offset += 4) {
      absoluteColorDifference += Math.abs(source.data[offset] - game.data[offset]);
      absoluteColorDifference += Math.abs(source.data[offset + 1] - game.data[offset + 1]);
      absoluteColorDifference += Math.abs(source.data[offset + 2] - game.data[offset + 2]);
    }
    const comparison = {
      target: capture.target,
      sourceTime: capture.sourceTime,
      differentPixelRatio: diffPixels / (474 * 219),
      meanAbsoluteColorError: absoluteColorDifference / (474 * 219 * 3),
      sourceRows: capture.sourceRows,
      gameRows: capture.gameRows,
    };
    captureComparisons.push(comparison);
    await sharp(Buffer.from(capture.source.split(',')[1], 'base64'))
      .png()
      .toFile(testInfo.outputPath(`yellow-source-${capture.target.toFixed(2)}.png`));
    await sharp(Buffer.from(capture.game.split(',')[1], 'base64'))
      .png()
      .toFile(testInfo.outputPath(`yellow-replica-${capture.target.toFixed(2)}.png`));
  }
  for (const comparison of captureComparisons) {
    expect(comparison.differentPixelRatio, `board crop at ${comparison.sourceTime.toFixed(3)}s must match the presented source frame`)
      .toBe(0);
  }
  const averageColorError = captureComparisons.reduce((sum, capture) => sum + capture.meanAbsoluteColorError, 0)
    / captureComparisons.length;
  const maximumColorError = Math.max(...captureComparisons.map((capture) => capture.meanAbsoluteColorError));
  const activeBucketComparisons = [];
  for (const capture of frameProbe.captures) {
    const source = await sharp(Buffer.from(capture.sourceBucket.split(',')[1], 'base64'))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const game = await sharp(Buffer.from(capture.gameBucket.split(',')[1], 'base64'))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const diffPixels = pixelmatch(source.data, game.data, Buffer.alloc(game.data.length), 260, 341, {
      threshold: 0.12,
      includeAA: false,
    });
    let absoluteColorDifference = 0;
    for (let offset = 0; offset < source.data.length; offset += 4) {
      absoluteColorDifference += Math.abs(source.data[offset] - game.data[offset]);
      absoluteColorDifference += Math.abs(source.data[offset + 1] - game.data[offset + 1]);
      absoluteColorDifference += Math.abs(source.data[offset + 2] - game.data[offset + 2]);
    }
    activeBucketComparisons.push({
      target: capture.target,
      sourceTime: capture.sourceTime,
      differentPixelRatio: diffPixels / (260 * 341),
      meanAbsoluteColorError: absoluteColorDifference / (260 * 341 * 3),
    });
    await sharp(Buffer.from(capture.sourceBucket.split(',')[1], 'base64'))
      .png()
      .toFile(testInfo.outputPath(`yellow-source-bucket-${capture.target.toFixed(2)}.png`));
    await sharp(Buffer.from(capture.gameBucket.split(',')[1], 'base64'))
      .png()
      .toFile(testInfo.outputPath(`yellow-replica-bucket-${capture.target.toFixed(2)}.png`));
  }
  for (const comparison of activeBucketComparisons) {
    expect(comparison.differentPixelRatio, `active yellow area at ${comparison.sourceTime.toFixed(3)}s must match the presented source frame`)
      .toBe(0);
  }
  const fullPanelComparisons = [];
  for (const capture of frameProbe.captures) {
    const source = await sharp(Buffer.from(capture.sourcePanel.split(',')[1], 'base64'))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const game = await sharp(Buffer.from(capture.gamePanel.split(',')[1], 'base64'))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const diffPixels = pixelmatch(source.data, game.data, Buffer.alloc(game.data.length), 564, 756, {
      threshold: 0.12,
      includeAA: false,
    });
    const topBytes = 564 * levelOneOpeningBlendStart * 4;
    const topDiffPixels = pixelmatch(
      source.data.subarray(0, topBytes),
      game.data.subarray(0, topBytes),
      Buffer.alloc(topBytes),
      564,
      levelOneOpeningBlendStart,
      { threshold: 0.12, includeAA: false },
    );
    const bottomHeight = 756 - levelOneOpeningBlendStart;
    const bottomDiffPixels = pixelmatch(
      source.data.subarray(topBytes),
      game.data.subarray(topBytes),
      Buffer.alloc(game.data.length - topBytes),
      564,
      bottomHeight,
      { threshold: 0.12, includeAA: false },
    );
    let absoluteColorDifference = 0;
    for (let offset = 0; offset < source.data.length; offset += 4) {
      absoluteColorDifference += Math.abs(source.data[offset] - game.data[offset]);
      absoluteColorDifference += Math.abs(source.data[offset + 1] - game.data[offset + 1]);
      absoluteColorDifference += Math.abs(source.data[offset + 2] - game.data[offset + 2]);
    }
    fullPanelComparisons.push({
      target: capture.target,
      sourceTime: capture.sourceTime,
      differentPixelRatio: diffPixels / (564 * 756),
      topDifferentPixelRatio: topDiffPixels / (564 * levelOneOpeningBlendStart),
      bottomDifferentPixelRatio: bottomDiffPixels / (564 * bottomHeight),
      meanAbsoluteColorError: absoluteColorDifference / (564 * 756 * 3),
    });
    await sharp(Buffer.from(capture.sourcePanel.split(',')[1], 'base64'))
      .png()
      .toFile(testInfo.outputPath(`yellow-source-panel-${capture.target.toFixed(2)}.png`));
    await sharp(Buffer.from(capture.gamePanel.split(',')[1], 'base64'))
      .png()
      .toFile(testInfo.outputPath(`yellow-replica-panel-${capture.target.toFixed(2)}.png`));
  }
  for (const comparison of fullPanelComparisons) {
    expect(comparison.topDifferentPixelRatio, `action panel above the blended bottom at ${comparison.sourceTime.toFixed(3)}s`)
      .toBe(0);
  }
  const frameAlignment = {
    sourceClip: 'RPReplay_Final1792661235.MP4 at 00:02.3 + sourceTime',
    sampleRate: 'requestVideoFrameCallback at source 60 fps; rendered canvas sampled on the following animation frame',
    videoFrames: frameProbe.videoFrames,
    sampleCount: frameProbe.samples.length,
    progressTimeLog,
    averageCellMismatch,
    averageColorError,
    maximumColorError,
    samples: frameProbe.samples,
    captures: captureComparisons,
    activeBucketComparisons,
    fullPanelComparisons,
  };
  const averageBucketColorError = activeBucketComparisons.reduce((sum, capture) => sum + capture.meanAbsoluteColorError, 0)
    / activeBucketComparisons.length;
  const maximumBucketColorError = Math.max(...activeBucketComparisons.map((capture) => capture.meanAbsoluteColorError));
  const averagePanelDiff = fullPanelComparisons.reduce((sum, capture) => sum + capture.differentPixelRatio, 0)
    / fullPanelComparisons.length;
  console.log(`Level 1 yellow source alignment: ${frameProbe.videoFrames.length} decoded frames / ${frameProbe.samples.length} rendered samples, mean center-cell mismatch ${averageCellMismatch.toFixed(1)}/323, board RGB error ${averageColorError.toFixed(2)} (max ${maximumColorError.toFixed(2)}), active bucket ${averageBucketColorError.toFixed(2)} (max ${maximumBucketColorError.toFixed(2)}), full panel pixel diff ${(averagePanelDiff * 100).toFixed(2)}%`);
  console.log(`Level 1 yellow progress source times: ${progressTimeLog.map(({ progress, sourceTime }) => `${progress}%=${sourceTime.toFixed(3)}s`).join(', ')}`);
  await writeFile(testInfo.outputPath('level1-yellow-frame-alignment.json'), `${JSON.stringify(frameAlignment, null, 2)}\n`);
  await testInfo.attach('level1-yellow-frame-alignment.json', {
    body: Buffer.from(JSON.stringify(frameAlignment, null, 2)),
    contentType: 'application/json',
  });
});

test('Level 1 绿色与红色扫墙按录屏分段飞入对应收集槽', async ({ page }, testInfo) => {
  await page.evaluate(() => {
    const status = document.querySelector('#live-status');
    window.__levelOneColorProgressLog = [];
    new MutationObserver(() => window.__levelOneColorProgressLog.push(status?.textContent ?? ''))
      .observe(status, { childList: true, characterData: true, subtree: true });
  });

  await drag(page, 111, 866, 111, 620);
  await expect(page.locator('#live-status')).toContainText('绿色 像素块，进度 25%', { timeout: 1_500 });
  await expect.poll(() => page.locator('audio').evaluate((audio) => (
    audio.currentSrc.endsWith('/assets/level1/level1-source-audio.m4a')
      && !audio.paused
      && audio.currentTime >= 2.5
      && audio.currentTime < 4
  ))).toBeTruthy();
  const green25Screenshot = await page.screenshot({ path: testInfo.outputPath('level1-green-25.png') });
  expect(green25Screenshot.byteLength, 'green sweep should render a visible game frame').toBeGreaterThan(10_000);
  for (const progress of [48, 71, 85, 99, 100]) {
    await expect(page.locator('#live-status')).toContainText(`绿色 像素块，进度 ${progress}%`, { timeout: 1_000 });
    await page.screenshot({ path: testInfo.outputPath(`level1-green-${progress}.png`) });
  }
  const greenProgress = await page.evaluate(() => window.__levelOneColorProgressLog
    .filter((entry) => entry.includes('绿色 像素块'))
    .map((entry) => Number(entry.match(/进度 (\d+)%/)?.[1] ?? 0)));
  for (const [minimum, maximum] of [[25, 25], [48, 48], [85, 85], [100, 100]]) {
    expect(greenProgress.some((progress) => progress >= minimum && progress <= maximum), `missing green sweep range ${minimum}-${maximum}% in ${greenProgress}`)
      .toBeTruthy();
  }

  await drag(page, 485, 866, 485, 620);
  await expect(page.locator('#live-status')).toContainText('红色 像素块，进度 100%', { timeout: 2_000 });
  await page.screenshot({ path: testInfo.outputPath('level1-red-100.png') });
  const redProgress = await page.evaluate(() => window.__levelOneColorProgressLog
    .filter((entry) => entry.includes('红色 像素块'))
    .map((entry) => Number(entry.match(/进度 (\d+)%/)?.[1] ?? 0)));
  for (const [minimum, maximum] of [[3, 6], [69, 72], [86, 96], [100, 100]]) {
    expect(redProgress.some((progress) => progress >= minimum && progress <= maximum), `missing red sweep range ${minimum}-${maximum}%`)
      .toBeTruthy();
  }
});

test('Level 1 设置页暂停并从同一进度继续原画与原声', async ({ page }) => {
  await drag(page, 298, 866, 298, 620);
  await expect(page.locator('#live-status')).toContainText('进度 6%', { timeout: 1_500 });
  const sourceTime = await page.locator('audio').evaluate((audio) => audio.currentTime);

  await page.getByRole('button', { name: '打开设置' }).click();
  await expect.poll(() => page.locator('audio').evaluate((audio) => audio.paused)).toBeTruthy();
  await expect.poll(() => page.locator('#level-one-source-video').evaluate((video) => video.paused)).toBeTruthy();
  await page.waitForTimeout(250);
  const pausedTime = await page.locator('audio').evaluate((audio) => audio.currentTime);
  expect(Math.abs(pausedTime - sourceTime)).toBeLessThan(0.04);
  await page.getByRole('dialog', { name: '游戏设置' }).locator('[data-toggle="effects"]').click();

  await page.getByRole('dialog', { name: '游戏设置' }).getByRole('button', { name: '继续游戏' }).click();
  await expect.poll(() => page.locator('audio').evaluate((audio) => audio.paused)).toBeTruthy();
  await expect(page.locator('#live-status')).toContainText('进度 36%', { timeout: 2_000 });
  await page.getByRole('button', { name: '打开设置' }).click();
  await page.getByRole('dialog', { name: '游戏设置' }).locator('[data-toggle="effects"]').click();
  await page.getByRole('dialog', { name: '游戏设置' }).getByRole('button', { name: '继续游戏' }).click();
  await expect.poll(() => page.locator('audio').evaluate((audio) => !audio.paused)).toBeTruthy();
});

test('Level 1 黄色槽满格停在原作终帧且帧循环保持运行', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const start = await pointOnCanvas(page, 298, 866);
  const pickup = await pointOnCanvas(page, 298, 590);
  const sweep = await pointOnCanvas(page, 298, 330);
  const settle = await pointOnCanvas(page, 298, 620);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(pickup.x, pickup.y, { steps: 36 });
  await page.mouse.move(sweep.x, sweep.y, { steps: 36 });
  await page.mouse.move(settle.x, settle.y, { steps: 36 });
  await page.mouse.up();
  await expect(page.locator('#live-status')).toContainText('进度 100%');

  const actionFrame = await page.evaluate(() => {
    const source = document.querySelector('#level-one-source-video');
    const game = document.querySelector('#game-canvas');
    const reference = document.createElement('canvas');
    reference.width = 564;
    reference.height = 696;
    const referenceContext = reference.getContext('2d', { willReadFrequently: true });
    referenceContext.drawImage(source, 0, 0, 564, 696, 0, 0, 564, 696);
    const referencePixels = referenceContext.getImageData(0, 0, 564, 696).data;
    const gamePixels = game.getContext('2d', { willReadFrequently: true })
      .getImageData(17, 226, 564, 696).data;
    let differentPixels = 0;
    for (let offset = 0; offset < referencePixels.length; offset += 4) {
      if (referencePixels[offset] !== gamePixels[offset]
        || referencePixels[offset + 1] !== gamePixels[offset + 1]
        || referencePixels[offset + 2] !== gamePixels[offset + 2]) differentPixels += 1;
    }
    return { sourceTime: source.currentTime, differentPixels };
  });
  expect(Math.abs(actionFrame.sourceTime - 2), `yellow sweep should stop at its 2.0s source endpoint, got ${actionFrame.sourceTime.toFixed(3)}s`)
    .toBeLessThanOrEqual(0.05);
  expect(actionFrame.differentPixels, 'the final 696px of the yellow action panel should match its paused source frame').toBe(0);
  expect(pageErrors, 'rendering a full yellow slot must not stop the animation loop').toEqual([]);
  await drag(page, 111, 866, 111, 620);
  await expect(page.locator('#live-status')).toContainText('绿色 像素块，进度 100%', { timeout: 5_000 });
  expect(pageErrors, 'the next color must keep advancing after yellow completes').toEqual([]);
});

test('真实触屏拖动绿色槽不闪烁黄槽、红槽不误移且还能继续拖动', async ({ page }, testInfo) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('about:blank');
  await installLevelOneMotionProbe(page);
  await page.goto('/?previewLevel=1');
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, configuration: 'mobile' });

  await touchTap(session, await page.locator('#settings-button').boundingBox());
  const dialog = page.getByRole('dialog', { name: '游戏设置' });
  await expect(dialog).toBeVisible();
  await touchTap(session, await dialog.getByRole('button', { name: '继续游戏' }).boundingBox());
  await expect(dialog).toBeHidden();

  await page.evaluate(() => {
    const status = document.querySelector('#live-status');
    window.__pbjStatusHistory = [];
    window.__pbjYellowSlotHashes = [];
    new MutationObserver(() => window.__pbjStatusHistory.push(status?.textContent ?? ''))
      .observe(status, { childList: true, characterData: true, subtree: true });
    let recordingYellow = false;
    let samplesAfterComplete = 0;
    new MutationObserver(() => {
      if (status?.textContent.includes('绿色 像素块，进度 25%')) recordingYellow = true;
    }).observe(status, { childList: true, characterData: true, subtree: true });
    const canvas = document.querySelector('#game-canvas');
    const context = canvas.getContext('2d');
    const ratio = canvas.width / 597;
    const sampleWidth = Math.round(220 * ratio);
    const sampleHeight = Math.round(247 * ratio);
    const sample = () => {
      if (recordingYellow) {
        const bytes = context.getImageData(
          Math.round(190 * ratio), Math.round(743 * ratio), sampleWidth, sampleHeight,
        ).data;
        let hash = 2166136261;
        for (let offset = 0; offset < bytes.length; offset += 4) {
          hash = Math.imul(hash ^ bytes[offset], 16777619);
          hash = Math.imul(hash ^ bytes[offset + 1], 16777619);
          hash = Math.imul(hash ^ bytes[offset + 2], 16777619);
        }
        window.__pbjYellowSlotHashes.push(hash >>> 0);
        if (status?.textContent.includes('绿色 像素块，进度 100%')) samplesAfterComplete += 1;
      }
      if (samplesAfterComplete < 20) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });

  const from = await pointOnCanvas(page, 111, 866);
  const to = await pointOnCanvas(page, 111, 330);
  await dispatchTouch(session, 'touchStart', from);
  const touchStartedAt = Date.now();
  const touchSteps = 36;
  for (let step = 1; step <= touchSteps; step += 1) {
    const dueAt = touchStartedAt + (step * 600) / touchSteps;
    const delay = dueAt - Date.now();
    if (delay > 0) await page.waitForTimeout(delay);
    const t = step / touchSteps;
    await dispatchTouch(session, 'touchMove', {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    });
  }
  await dispatchTouch(session, 'touchEnd', null);

  await expect(page.locator('#live-status')).toContainText('绿色 像素块，进度 100%', { timeout: 5_000 });
  const greenFinishedScreenshot = await page.screenshot({ path: testInfo.outputPath('level1-green-touch-100.png') });
  const touchEvidence = await page.evaluate(() => ({
    statusHistory: window.__pbjStatusHistory,
    yellowSlotHashes: window.__pbjYellowSlotHashes,
  }));
  expect(touchEvidence.statusHistory.some((status) => /绿色 像素块，进度 (2[5-9]|[3-9]\d|100)%/.test(status)),
    'the real touch sweep should report intermediate green collection progress').toBeTruthy();
  expect(touchEvidence.yellowSlotHashes.length, 'sample the untouched yellow slot throughout the sweep').toBeGreaterThan(20);
  expect(new Set(touchEvidence.yellowSlotHashes).size,
    'the untouched yellow slot must stay pixel-stable throughout the recorded sweep frames').toBe(1);
  expect(pageErrors, 'the touch sweep should not throw a rendering error').toEqual([]);

  const redPixelsAtHome = await countPixelsInRegion(greenFinishedScreenshot,
    { left: 423, top: 743, width: 125, height: 247 },
    (red, green, blue) => red > 105 && red > green * 1.3 && red > blue * 1.1);
  const redPixelsInRaisedArea = await countPixelsInRegion(greenFinishedScreenshot,
    { left: 423, top: 497, width: 125, height: 246 },
    (red, green, blue) => red > 105 && red > green * 1.3 && red > blue * 1.1);
  const yellowPixelsAtHome = await countPixelsInRegion(greenFinishedScreenshot,
    { left: 174, top: 743, width: 249, height: 247 },
    (red, green, blue) => red > 150 && green > 100 && blue < 130 && red > green * 0.9);
  expect(redPixelsAtHome, 'the red slot should remain fully visible at its own home position').toBeGreaterThan(4_000);
  expect(redPixelsInRaisedArea, 'dragging green must not paint the red slot at green’s raised position').toBeLessThan(500);
  expect(yellowPixelsAtHome, 'the untouched yellow slot should remain visible at its home position').toBeGreaterThan(4_000);

  const leftEdgePixel = await sharp(greenFinishedScreenshot)
    .extract({ left: 17, top: 426, width: 1, height: 1 })
    .removeAlpha().raw().toBuffer();
  expect(leftEdgePixel[0], 'the recorded translucent volume strip must not appear on the game frame').toBeGreaterThan(100);
  expect(leftEdgePixel[1]).toBeGreaterThan(170);

  const lowerTileSamples = await sharp(greenFinishedScreenshot)
    .extract({ left: 0, top: 1010, width: 597, height: 1 })
    .removeAlpha().raw().toBuffer();
  for (const x of [110, 235, 360, 485]) {
    const offset = x * 3;
    expect(lowerTileSamples[offset], `bottom row tile at x=${x} should continue below the old source crop`).toBeGreaterThan(140);
    expect(lowerTileSamples[offset + 1]).toBeGreaterThan(190);
    expect(lowerTileSamples[offset + 2]).toBeGreaterThan(215);
  }

  const probe = await page.evaluate(() => window.__pbjMotionProbe);
  const drawGroups = [];
  for (const draw of probe.bucketDraws.filter(({ at }) => at >= probe.pointerDownAt)) {
    const current = drawGroups.at(-1);
    if (!current || draw.at - current.startedAt > 5) drawGroups.push({ startedAt: draw.at, slots: [draw] });
    else current.slots.push(draw);
  }
  const frames = drawGroups
    .filter(({ slots }) => slots.length === 3 && new Set(slots.map(({ id }) => id)).size === 3)
    .map(({ slots }) => Object.fromEntries(slots.map(({ id, y }) => [id, y])));
  expect(frames.length, 'touch drag must render many complete three-slot frames').toBeGreaterThan(20);
  const greenPositions = frames.map(({ green }) => green);
  expect(greenPositions[0] - greenPositions.at(-1), 'green slot should reach the wall').toBeGreaterThan(100);
  for (const { yellow, red } of frames) {
    expect(Math.abs(yellow - 743), 'yellow slot position should stay fixed').toBeLessThan(0.5);
    expect(Math.abs(red - 743), 'red slot position should stay fixed').toBeLessThan(0.5);
  }
  for (let index = 1; index < greenPositions.length; index += 1) {
    const step = greenPositions[index - 1] - greenPositions[index];
    expect(step, 'green slot motion should not reverse or flicker').toBeGreaterThanOrEqual(-1.5);
    expect(step, 'green slot should not skip several rendered frames').toBeLessThan(35);
  }

  await touchDrag(page, session, 485, 866, 485, 330, 600);
  await expect(page.locator('#live-status')).toContainText('红色 像素块，进度 100%', { timeout: 5_000 });
  expect(pageErrors, 'red must remain draggable after the green sweep').toEqual([]);
  await session.detach();
});

test('Level 2 显示四格道具栏及各自的解锁关卡', async ({ page }) => {
  await page.goto('/?previewLevel=2');
  const boosterBar = page.getByRole('group', { name: '道具栏' });
  await expect(boosterBar).toBeVisible();
  await expect(boosterBar.locator('[data-booster]')).toHaveCount(4);

  for (const [kind, level] of [['freeze', 7], ['hammer', 9], ['ufo', 13]]) {
    const button = boosterBar.locator(`[data-booster="${kind}"]`);
    await expect(button).toBeDisabled();
    await expect(button.locator('.booster-lock')).toHaveText(`第 ${level} 关`);
  }
  await expect(boosterBar.getByRole('button', { name: '达到第 16 关解锁' })).toBeDisabled();
});

test('Level 2 开局棋盘与录屏裁切逐像素一致', async ({ page }) => {
  await page.goto('/?previewLevel=2');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const screenshot = await page.screenshot();
  const openingPanel = await sharp(screenshot)
    .extract({ left: 17, top: 310, width: 563, height: 666 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const panelDiff = pixelmatch(levelTwoOpeningPanelPixels.data, openingPanel.data, Buffer.alloc(openingPanel.data.length), openingPanel.info.width, openingPanel.info.height, {
    threshold: 0.16,
    includeAA: false,
  });
  expect(panelDiff, `Level 2 opening panel differs at ${panelDiff} of ${openingPanel.info.width * openingPanel.info.height} pixels`).toBe(0);
  expect(createGameState(2).config.pad.rows, 'Level 2 source frame has two operation-pad rows').toBe(2);
  const actual = await sharp(screenshot)
    .extract({ left: 60, top: 344, width: 478, height: 176 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const diff = pixelmatch(levelTwoBoardPixels.data, actual.data, Buffer.alloc(actual.data.length), actual.info.width, actual.info.height, {
    threshold: 0.16,
    includeAA: false,
  });
  expect(diff, `Level 2 board changed at ${diff} of ${actual.info.width * actual.info.height} pixels`).toBe(0);
});

test('Level 3 开局棋盘与录屏裁切逐像素一致', async ({ page }) => {
  await page.goto('/?previewLevel=3');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const screenshot = await page.screenshot();
  const actual = await sharp(screenshot)
    .extract({ left: 59, top: 197, width: 478, height: 276 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const diff = pixelmatch(levelThreeBoardPixels.data, actual.data, Buffer.alloc(actual.data.length), actual.info.width, actual.info.height, {
    threshold: 0.16,
    includeAA: false,
  });
  expect(diff, `Level 3 board changed at ${diff} of ${actual.info.width * actual.info.height} pixels`).toBe(0);
});

test('Level 4 开局未被红槽与阴影遮挡的棋盘像素与录屏一致', async ({ page }) => {
  await page.goto('/?previewLevel=4');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const screenshot = await page.screenshot();
  const actual = await sharp(screenshot)
    .extract({ left: 61, top: 317, width: 474, height: 314 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const expected = Buffer.from(levelFourBoardCellsPixels.data);
  for (let offset = 0; offset < expected.length; offset += 4) {
    if (levelFourBoardCellsPixels.data[offset + 3] === 0) {
      expected.set(actual.data.subarray(offset, offset + 4), offset);
    }
  }
  const diff = pixelmatch(expected, actual.data, Buffer.alloc(actual.data.length), actual.info.width, actual.info.height, {
    threshold: 0.16,
    includeAA: false,
  });
  expect(diff, `Level 4 visible source cells changed at ${diff} pixels`).toBe(0);
});

test('Level 5 开局棋盘与录屏裁切逐像素一致', async ({ page }) => {
  await page.goto('/?previewLevel=5');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const screenshot = await page.screenshot();
  const actual = await sharp(screenshot)
    .extract({ left: 57, top: 401, width: 492, height: 198 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const diff = pixelmatch(levelFiveBoardPixels.data, actual.data, Buffer.alloc(actual.data.length), actual.info.width, actual.info.height, {
    threshold: 0.16,
    includeAA: false,
  });
  expect(diff, `Level 5 board changed at ${diff} of ${actual.info.width * actual.info.height} pixels`).toBe(0);
});

test('Level 6 开局棋盘与录屏裁切逐像素一致', async ({ page }) => {
  await page.goto('/?previewLevel=6');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const screenshot = await page.screenshot();
  const actual = await sharp(screenshot)
    .extract({ left: 81, top: 195, width: 435, height: 334 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const diff = pixelmatch(levelSixBoardPixels.data, actual.data, Buffer.alloc(actual.data.length), actual.info.width, actual.info.height, {
    threshold: 0.16,
    includeAA: false,
  });
  expect(diff, `Level 6 board changed at ${diff} of ${actual.info.width * actual.info.height} pixels`).toBe(0);
});

test('Level 7 开局棋盘与录屏裁切逐像素一致', async ({ page }) => {
  await page.goto('/?previewLevel=7');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const screenshot = await page.screenshot();
  const actual = await sharp(screenshot)
    .extract({ left: 55, top: 326, width: 487, height: 263 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const expected = Buffer.from(levelSevenBoardPixels.data);
  for (let offset = 0; offset < expected.length; offset += 4) {
    if (levelSevenBoardPixels.data[offset + 3] === 0) {
      expected.set(actual.data.subarray(offset, offset + 4), offset);
    }
  }
  const diff = pixelmatch(expected, actual.data, Buffer.alloc(actual.data.length), actual.info.width, actual.info.height, {
    threshold: 0.16,
    includeAA: false,
  });
  expect(diff, `Level 7 visible board pixels changed at ${diff} pixels`).toBe(0);
});

test('Level 9 开局棋盘与录屏裁切逐像素一致', async ({ page }) => {
  await page.goto('/?previewLevel=9');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const screenshot = await page.screenshot();
  const actual = await sharp(screenshot)
    .extract({ left: 55, top: 305, width: 487, height: 353 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const expected = Buffer.from(levelNineBoardPixels.data);
  for (let offset = 0; offset < expected.length; offset += 4) {
    if (levelNineBoardPixels.data[offset + 3] === 0) {
      expected.set(actual.data.subarray(offset, offset + 4), offset);
    }
  }
  const diff = pixelmatch(expected, actual.data, Buffer.alloc(actual.data.length), actual.info.width, actual.info.height, {
    threshold: 0.16,
    includeAA: false,
  });
  expect(diff, `Level 9 visible board pixels changed at ${diff} pixels`).toBe(0);
});

test('Level 12 开局未被操作格和双层槽遮挡的棋盘像素与录屏一致', async ({ page }) => {
  await page.goto('/?previewLevel=12');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const screenshot = await page.screenshot();
  const actual = await sharp(screenshot)
    .extract({ left: 58, top: 313, width: 482, height: 312 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const expected = Buffer.from(levelTwelveBoardPixels.data);
  for (let offset = 0; offset < expected.length; offset += 4) {
    if (levelTwelveBoardPixels.data[offset + 3] === 0) {
      expected.set(actual.data.subarray(offset, offset + 4), offset);
    }
  }
  const diff = pixelmatch(expected, actual.data, Buffer.alloc(actual.data.length), actual.info.width, actual.info.height, {
    threshold: 0.16,
    includeAA: false,
  });
  expect(diff, `Level 12 visible board pixels changed at ${diff} pixels`).toBe(0);
});

test('Level 13 开局糖果墙与录屏裁切逐像素一致', async ({ page }) => {
  await page.goto('/?previewLevel=13');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const screenshot = await page.screenshot();
  const actual = await sharp(screenshot)
    .extract({ left: 61, top: 197, width: 474, height: 373 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const diff = pixelmatch(levelThirteenBoardPixels.data, actual.data, Buffer.alloc(actual.data.length), actual.info.width, actual.info.height, {
    threshold: 0.16,
    includeAA: false,
  });
  expect(diff, `Level 13 board changed at ${diff} of ${actual.info.width * actual.info.height} pixels`).toBe(0);
});

test('延迟完成 Web Audio 解锁后仍播放首次按钮音效', async ({ page }) => {
  await page.goto('about:blank');
  await page.addInitScript(() => {
    localStorage.setItem('pixel-block-jam.music', 'false');
    const resume = AudioContext.prototype.resume;
    AudioContext.prototype.resume = function delayedResume() {
      return new Promise((resolve, reject) => {
        setTimeout(() => resume.call(this).then(resolve, reject), 220);
      });
    };
    const createOscillator = AudioContext.prototype.createOscillator;
    window.__pixelJamOscillatorStarts = 0;
    AudioContext.prototype.createOscillator = function trackedOscillator() {
      const oscillator = createOscillator.call(this);
      const start = oscillator.start.bind(oscillator);
      oscillator.start = (...args) => {
        window.__pixelJamOscillatorStarts += 1;
        return start(...args);
      };
      return oscillator;
    };
  });
  await page.goto('/?previewLevel=1');
  await page.getByRole('button', { name: '打开设置' }).click();
  await expect.poll(() => page.evaluate(() => window.__pixelJamOscillatorStarts)).toBe(1);
  await page.getByRole('dialog', { name: '游戏设置' }).getByRole('button', { name: '继续游戏' }).click();
});

test('拖动三色收集槽清空 Level 1 并播放转场进入 Level 2', async ({ page }) => {
  test.setTimeout(30_000);
  await completeLevelOne(page, true);
  await expect(page.locator('#live-status')).toHaveText('第 2 关开始');
});

test('Level 1 品牌转场铺满全屏、使用中文并按源帧收缩揭示', async ({ page }, testInfo) => {
  test.setTimeout(30_000);
  for (const [x, color] of [[298, '黄色'], [111, '绿色']]) {
    await drag(page, x, 866, x, 620);
    await expect(page.locator('#live-status')).toContainText(`${color} 像素块，进度 100%`, { timeout: 5_000 });
  }
  await drag(page, 485, 866, 485, 620);
  const sourceVideo = page.locator('#level-one-source-video');
  await expect.poll(() => sourceVideo.evaluate((video) => video.currentTime >= 5.55 && video.currentTime < 5.6), {
    intervals: [10],
    timeout: 5_000,
  }).toBeTruthy();
  const sourceTime = await sourceVideo.evaluate((video) => video.currentTime);
  expect(sourceTime, 'Level 1 localized brand prelude should be captured before the source segment ends').toBeLessThan(5.95);
  const prelude = await page.screenshot({ path: testInfo.outputPath('level1-brand-prelude.png') });
  const left = await sharp(prelude).extract({ left: 8, top: 400, width: 1, height: 1 }).raw().toBuffer();
  const right = await sharp(prelude).extract({ left: 28, top: 400, width: 1, height: 1 }).raw().toBuffer();
  const edgeStep = Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
  expect(edgeStep, 'Level 1 source-logo prelude should not leave a cropped blue rectangle').toBeLessThan(25);
  await expect.poll(() => sourceVideo.evaluate((video) => video.currentTime >= 5.75 && video.currentTime < 5.9), {
    intervals: [10],
    timeout: 2_000,
  }).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('level1-brand-full.png') });
  await expect(page.getByRole('status', { name: '正在进入第 2 关' })).toBeVisible();
  await expect(page.locator('.transition-logo')).toContainText('大闯关');
  await expect(page.locator('#live-status')).toHaveText('第 2 关开始', { timeout: 2_000 });
});

test('进入 Level 2 后可拖动 L 形槽收集阶梯图案', async ({ page }) => {
  test.setTimeout(30_000);
  await completeLevelOne(page);
  await expect(page.locator('#live-status')).toHaveText('第 2 关开始');

  const greenStart = await pointOnCanvas(page, 100, 750);
  await page.mouse.move(greenStart.x, greenStart.y);
  const greenTop = await pointOnCanvas(page, 100, 365);
  await page.mouse.down();
  await page.mouse.move(greenTop.x, greenTop.y, { steps: 36 });
  const greenSweep = await pointOnCanvas(page, 220, 365);
  await page.mouse.move(greenSweep.x, greenSweep.y, { steps: 18 });
  await page.mouse.up();

  const yellowStart = await pointOnCanvas(page, 300, 875);
  const yellowTop = await pointOnCanvas(page, 300, 380);
  const yellowBottom = await pointOnCanvas(page, 300, 472);
  const yellowSweep = await pointOnCanvas(page, 370, 472);
  await page.mouse.move(yellowStart.x, yellowStart.y);
  await page.mouse.down();
  await page.mouse.move(yellowTop.x, yellowTop.y, { steps: 36 });
  await page.mouse.move(yellowBottom.x, yellowBottom.y, { steps: 6 });
  await page.mouse.move(yellowSweep.x, yellowSweep.y, { steps: 4 });
  await page.mouse.up();
  await drag(page, 450, 750, 450, 365);

  await expect(page.getByRole('status', { name: '正在进入第 3 关' })).toBeVisible();
  await expect(page.locator('#live-status')).toHaveText('第 3 关开始');
});

test('Level 3–5 的不同颜色槽能命中各自像素目标', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/?previewLevel=3');
  await expect(page.locator('#live-status')).toHaveText('第 3 关开始');
  await drag(page, 100, 850, 100, 245);
  await expect(page.locator('#live-status')).toContainText('黄色');

  await page.goto('/?previewLevel=4');
  await expect(page.locator('#live-status')).toHaveText('第 4 关开始');
  await drag(page, 300, 520, 150, 400);
  await expect(page.locator('#live-status')).toContainText('红色');

  await page.goto('/?previewLevel=5');
  await expect(page.locator('#live-status')).toHaveText('第 5 关开始');
  const blueStart = await pointOnCanvas(page, 440, 650);
  const blueTop = await pointOnCanvas(page, 440, 440);
  const blueSweep = await pointOnCanvas(page, 370, 440);
  await page.mouse.move(blueStart.x, blueStart.y);
  await page.mouse.down();
  await page.mouse.move(blueTop.x, blueTop.y, { steps: 36 });
  await page.mouse.move(blueSweep.x, blueSweep.y, { steps: 18 });
  await page.mouse.up();
  await expect(page.locator('#live-status')).toContainText('蓝色');
  expect(pageErrors).toEqual([]);
});

test('Level 6、10、11 的不同棋盘布局支持拖动收集', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/?previewLevel=6');
  await drag(page, 344, 760, 344, 340);
  await expect(page.locator('#live-status')).toContainText('红色');

  await page.goto('/?previewLevel=10');
  await drag(page, 85, 630, 85, 380);
  await expect(page.locator('#live-status')).toContainText('蓝色');

  await page.goto('/?previewLevel=11');
  await drag(page, 100, 460, 100, 220);
  await expect(page.locator('#live-status')).toContainText('黄色');
  expect(pageErrors).toEqual([]);
});

test('按录屏重建的 Level 7–9 棋盘支持同色拖动收集', async ({ page }) => {
  await page.goto('/?previewLevel=7');
  await drag(page, 440, 770, 440, 340);
  await expect(page.locator('#live-status')).toContainText('红色');

  await page.goto('/?previewLevel=8');
  await drag(page, 100, 910, 100, 355);
  await expect(page.locator('#live-status')).toContainText('橙色');

  await page.goto('/?previewLevel=9');
  await drag(page, 515, 880, 300, 400);
  await expect(page.locator('#live-status')).toContainText('黄色');
});

test('Level 8 开局显示录屏中的完整橙色与洋红色顶行', async ({ page }) => {
  await page.goto('/?previewLevel=8');
  const initialState = createGameState(8);
  expect(initialState.grid.filter(Boolean)).toHaveLength(60 * 39);
  expect(Object.values(initialState.bucketCollected)).toEqual(Array(9).fill(0));

  await page.waitForFunction(() => performance.getEntriesByType('resource')
    .some(({ name }) => name.endsWith('/assets/level8/level8-board.png')));
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  const boardScreenshot = await page.screenshot();
  const actualBoard = await sharp(boardScreenshot)
    .extract({ left: 58, top: 309, width: 485, height: 312 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const boardDiff = pixelmatch(levelEightBoardPixels.data, actualBoard.data,
    Buffer.alloc(actualBoard.data.length), actualBoard.info.width, actualBoard.info.height, {
      threshold: 0.16,
      includeAA: false,
    });
  expect(boardDiff, `Level 8 clean source frame changed at ${boardDiff} pixels`).toBe(0);

  const gridPoints = initialState.grid.map((cell) => ({ x: Math.floor(cell.x), y: Math.floor(cell.y) }));
  const canvasGridSamples = await page.locator('#game-canvas').evaluate((canvas, points) => {
    const context = canvas.getContext('2d');
    return points.map(({ x, y }) => [...context.getImageData(x, y, 1, 1).data].slice(0, 3));
  }, gridPoints);
  const sourceGridSamples = gridPoints.map(({ x, y }) => {
    const sourceX = x - initialState.config.grid.x;
    const sourceY = y - initialState.config.grid.y;
    const offset = (sourceY * levelEightBoardPixels.info.width + sourceX) * levelEightBoardPixels.info.channels;
    return [...levelEightBoardPixels.data.subarray(offset, offset + 3)];
  });
  expect(canvasGridSamples).toEqual(sourceGridSamples);

  const topRow = await page.locator('#game-canvas').evaluate((canvas) => {
    const context = canvas.getContext('2d');
    const sample = (x, y) => [...context.getImageData(x, y, 1, 1).data].slice(0, 3);
    return {
      orange: sample(66, 320),
      magenta: sample(536, 320),
    };
  });

  expect(topRow.orange[0]).toBeGreaterThan(topRow.orange[1]);
  expect(topRow.orange[1]).toBeGreaterThan(topRow.orange[2]);
  expect(topRow.magenta[0]).toBeGreaterThan(topRow.magenta[1]);
  expect(topRow.magenta[2]).toBeGreaterThan(topRow.magenta[1]);
  expect(topRow.magenta[0]).toBeGreaterThan(190);
  expect(topRow.magenta[1]).toBeLessThan(60);
  expect(topRow.magenta[2]).toBeGreaterThan(190);
});

test('Level 10 开局棋盘与录屏 04:23 源帧逐像素一致', async ({ page }) => {
  await page.goto('/?previewLevel=10');
  const initialState = createGameState(10);
  expect(initialState.grid.filter(Boolean)).toHaveLength(518);
  expect(initialState.config.buckets).toHaveLength(20);
  expect(Object.values(initialState.bucketCollected)).toEqual(Array(20).fill(0));
  expect(Object.values(initialState.bucketTotals).every((count) => count > 0)).toBe(true);
  await page.waitForFunction(() => {
    const resources = performance.getEntriesByType('resource').map(({ name }) => name);
    return resources.some((name) => name.endsWith('/assets/level10/level10-board.png'))
      && resources.some((name) => name.endsWith('/assets/level10/level10-pad-row.png'))
      && resources.filter((name) => /\/assets\/level10\/level10-bucket-/.test(name)).length === 16
      && resources.filter((name) => /\/assets\/level10\/level10-pipe-\d-top\.png$/.test(name)).length === 3;
  });
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  const screenshot = await page.screenshot();
  const actual = await sharp(screenshot)
    .extract({ left: 61, top: 327, width: 474, height: 194 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const diff = pixelmatch(levelTenBoardPixels.data, actual.data, Buffer.alloc(actual.data.length),
    actual.info.width, actual.info.height, { threshold: 0.16, includeAA: false });
  expect(diff, `Level 10 source-frame crop changed at ${diff} pixels`).toBe(0);

  async function compareRegion(reference, left, top, label) {
    const screenshotRegion = await sharp(screenshot)
      .extract({ left, top, width: reference.info.width, height: reference.info.height })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const regionDiff = pixelmatch(reference.data, screenshotRegion.data,
      Buffer.alloc(screenshotRegion.data.length), reference.info.width, reference.info.height, {
        threshold: 0.16,
        includeAA: false,
      });
    expect(regionDiff, `Level 10 ${label} differs at ${regionDiff} pixels`).toBe(0);
  }

  await compareRegion(levelTenPadPixels, 50, 541, '上排操作格');
  for (const [index, x] of initialState.config.pipeChannels.entries()) {
    await compareRegion(levelTenPipePixels[index], x, initialState.config.pipeTrack.y, `第 ${index + 1} 条管道上段`);
  }
  const cleanBuckets = initialState.config.buckets.filter(({ y, height }) => y + height <= 900);
  for (const [index, bucket] of cleanBuckets.entries()) {
    await compareRegion(levelTenBucketPixels[index], bucket.x, bucket.y, `${bucket.id} 槽位`);
  }
});

test('Level 11 上下棋盘开局与录屏 05:23 源帧逐像素一致', async ({ page }) => {
  await page.goto('/?previewLevel=11');
  const initialState = createGameState(11);
  await page.waitForFunction(() => ['upper', 'lower'].every((boardId) => (
    performance.getEntriesByType('resource').some(({ name }) => (
      name.endsWith(`/assets/level11/level11-${boardId}-board.png`)
    ))
  )));
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));

  const screenshot = await page.screenshot();
  for (const boardId of ['upper', 'lower']) {
    const board = initialState.grids.find(({ id }) => id === boardId);
    const reference = levelElevenBoardPixels[boardId];
    const actual = await sharp(screenshot)
      .extract({
        left: board.rect.x,
        top: board.rect.y,
        width: reference.info.width,
        height: reference.info.height,
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const diff = pixelmatch(reference.data, actual.data, Buffer.alloc(actual.data.length),
      actual.info.width, actual.info.height, { threshold: 0.16, includeAA: false });
    expect(diff, `Level 11 ${boardId} board differs at ${diff} pixels`).toBe(0);
  }
});

test('时间冻结、拆分锤与飞碟按道具规则响应点击', async ({ page }) => {
  await page.goto('/?previewLevel=7');
  const levelSevenBoosters = page.getByRole('group', { name: '道具栏' });
  await expect(levelSevenBoosters.getByRole('button', { name: '使用时间冻结道具' })).toBeEnabled();
  await expect(levelSevenBoosters.getByRole('button', { name: '使用拆分锤' })).toBeDisabled();
  await expect(levelSevenBoosters.getByRole('button', { name: '使用飞碟道具' })).toBeDisabled();
  await page.getByRole('button', { name: '使用时间冻结道具' }).click();
  await expect(page.locator('#live-status')).toContainText('时间已冻结 20 秒');

  await page.goto('/?previewLevel=9');
  await page.getByRole('button', { name: '使用拆分锤' }).click();
  const targetPixel = await pointOnCanvas(page, 300, 400);
  await page.mouse.click(targetPixel.x, targetPixel.y);
  await expect(page.locator('#live-status')).toContainText('已拆分');

  await page.goto('/?previewLevel=13');
  const boosterBar = page.getByRole('group', { name: '道具栏' });
  await expect(boosterBar).toBeVisible();
  await expect(boosterBar.locator('[data-booster]')).toHaveCount(4);
  await expect(boosterBar.getByRole('button', { name: '使用时间冻结道具' })).toBeEnabled();
  await expect(boosterBar.getByRole('button', { name: '使用拆分锤' })).toBeEnabled();
  await expect(boosterBar.getByRole('button', { name: '使用飞碟道具' })).toBeEnabled();
  const lockedBooster = boosterBar.getByRole('button', { name: '达到第 16 关解锁' });
  await expect(lockedBooster).toBeDisabled();
  await expect(lockedBooster.locator('.booster-count')).toBeHidden();
  await page.getByRole('button', { name: '使用飞碟道具' }).click();
  const yellowSlot = await pointOnCanvas(page, 100, 910);
  await page.mouse.click(yellowSlot.x, yellowSlot.y);
  await expect(page.locator('#live-status')).toContainText('飞碟正在填充黄色');
  await expect(page.locator('#live-status')).toContainText('飞碟已填充黄色');
  const originalCellColor = [...levelThirteenBoardPixels.data.subarray((6 * 474 + 6) * 4, (6 * 474 + 6) * 4 + 3)];
  const clearedCellColor = await page.locator('#game-canvas').evaluate((canvas) => {
    const { data } = canvas.getContext('2d').getImageData(67, 203, 1, 1);
    return [...data].slice(0, 3);
  });
  expect(clearedCellColor).not.toEqual(originalCellColor);
});

test('Level 9 按录屏展示功能解锁进度并可领取进入下一关', async ({ page }) => {
  await page.goto('/?previewLevel=9&previewReward=1');

  const reward = page.getByRole('dialog', { name: '做得好！' });
  await expect(reward).toBeVisible();
  await expect(reward.getByText('下一项功能')).toBeVisible();
  const progress = reward.getByRole('progressbar', { name: /功能解锁进度/ });
  await expect(progress).toHaveAttribute('aria-valuenow', '83');
  await expect(reward.getByText('83%')).toBeVisible();
  await expect(reward.getByText('到达第 12 关！')).toBeVisible();

  await reward.getByRole('button', { name: /领取并继续/ }).click();
  await expect(page.locator('#live-status')).toHaveText('第 10 关开始');
});

test('Level 12 填满黄色内层后解锁紫色外层', async ({ page }) => {
  await page.goto('/?previewLevel=12');
  await drag(page, 298, 740, 298, 180);
  await expect(page.locator('#live-status')).toContainText('100%');
  await drag(page, 298, 790, 211, 325);
  await expect(page.locator('#live-status')).toContainText('紫色');
});
