import { expect, test } from '@playwright/test';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';
import { createGameState } from '../src/game.js';

const levelOneOpeningBlendStart = 744;
const levelOneActionBlendStart = 744;
const levelTwoTransitionSource = JSON.parse(await readFile(
  new URL('./fixtures/level2-transition-source.json', import.meta.url),
  'utf8',
));
const levelTwoCollectionSource = JSON.parse(await readFile(
  new URL('./fixtures/level2-collection-source.json', import.meta.url),
  'utf8',
));
const levelOneBoardPixels = await sharp(fileURLToPath(new URL('../assets/level1/level1-board.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelOneSettingsGearPixels = await sharp(fileURLToPath(new URL('../assets/level1/level1-settings-gear.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelOneOpeningPanelPixels = await sharp(fileURLToPath(new URL('../assets/level1/level1-opening-panel.png', import.meta.url)))
  .extract({ left: 0, top: 0, width: 563, height: 744 })
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
const levelThreeOpeningPanelPixels = await sharp(fileURLToPath(new URL('../assets/level3/level3-opening-panel.png', import.meta.url)))
  .extract({ left: 0, top: 0, width: 554, height: 724 })
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

function colorMaskBounds(image, roi, matches) {
  const { data, info } = image;
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;

  for (let y = roi.y; y < roi.y + roi.height; y += 1) {
    for (let x = roi.x; x < roi.x + roi.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      if (!matches(data[offset], data[offset + 1], data[offset + 2])) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  return { left, top, right, bottom };
}

function expectBoundsNear(actual, reference, tolerance, label) {
  for (const edge of ['left', 'top', 'right', 'bottom']) {
    expect(Math.abs(actual[edge] - reference[edge]), `${label} ${edge}: ${actual[edge]} vs ${reference[edge]}`)
      .toBeLessThanOrEqual(tolerance);
  }
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

async function dragThroughAt60Hz(page, fromX, fromY, segments) {
  let from = await pointOnCanvas(page, fromX, fromY);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (const { x, y, durationMs } of segments) {
    const to = await pointOnCanvas(page, x, y);
    const startedAt = Date.now();
    const steps = Math.max(1, Math.round(durationMs / (1_000 / 60)));
    for (let step = 1; step <= steps; step += 1) {
      const dueAt = startedAt + (step / steps) * durationMs;
      const delay = dueAt - Date.now();
      if (delay > 0) await page.waitForTimeout(delay);
      await page.mouse.move(
        from.x + ((to.x - from.x) * step) / steps,
        from.y + ((to.y - from.y) * step) / steps,
      );
    }
    from = to;
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

async function findRgbBounds(screenshot, region, matches) {
  const { data, info } = await sharp(screenshot)
    .extract(region)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = -1;
  let bottom = -1;
  let count = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      if (!matches(data[offset], data[offset + 1], data[offset + 2])) continue;
      left = Math.min(left, x + region.left);
      right = Math.max(right, x + region.left);
      top = Math.min(top, y + region.top);
      bottom = Math.max(bottom, y + region.top);
      count += 1;
    }
  }
  return count ? { left, top, right, bottom, count } : null;
}

async function findRgbComponentBounds(screenshot, region, matches, includeComponent = () => true) {
  const { data, info } = await sharp(screenshot)
    .extract(region)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const seen = new Uint8Array(info.width * info.height);
  const components = [];
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const start = y * info.width + x;
      const offset = start * info.channels;
      if (seen[start] || !matches(data[offset], data[offset + 1], data[offset + 2])) continue;
      seen[start] = 1;
      const stack = [start];
      const bounds = {
        left: x + region.left,
        top: y + region.top,
        right: x + region.left,
        bottom: y + region.top,
        count: 0,
      };
      while (stack.length) {
        const index = stack.pop();
        const componentY = Math.floor(index / info.width);
        const componentX = index % info.width;
        bounds.left = Math.min(bounds.left, componentX + region.left);
        bounds.top = Math.min(bounds.top, componentY + region.top);
        bounds.right = Math.max(bounds.right, componentX + region.left);
        bounds.bottom = Math.max(bounds.bottom, componentY + region.top);
        bounds.count += 1;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nextX = componentX + dx;
            const nextY = componentY + dy;
            if (nextX < 0 || nextY < 0 || nextX >= info.width || nextY >= info.height) continue;
            const nextIndex = nextY * info.width + nextX;
            if (seen[nextIndex]) continue;
            const nextOffset = nextIndex * info.channels;
            if (!matches(data[nextOffset], data[nextOffset + 1], data[nextOffset + 2])) continue;
            seen[nextIndex] = 1;
            stack.push(nextIndex);
          }
        }
      }
      components.push(bounds);
    }
  }
  return components
    .filter((component) => component.count > 30 && includeComponent(component))
    .sort((left, right) => right.count - left.count)[0] ?? null;
}

async function startLevelOneYellowFrameProbe(page) {
  await page.evaluate(() => {
    const source = document.querySelector('#level-one-source-video');
    const sourceImage = window.__levelOneSourcePresentedFrameCanvas ?? source;
    const sourceAudio = document.querySelector('#level-one-source-audio');
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
    // Start sampling as soon as the source video reaches the sweep interval.
    // A seek to 0.5 s is prepared during pointerdown, before the drag reaches
    // the wall; those paused preroll frames are not gameplay presentations.
    const result = { recording: true, videoFrames: [], samples: [], captures: [], timedOut: false, done: false };
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
    const captureFrame = (sourceTime, finalFrame, metadata) => {
      const sourceFrame = Math.round(sourceTime * 60);
      if (sourceTime >= 0.48 && sourceTime <= 1.7) {
        const target = targets[captureIndex];
        const shouldCaptureTarget = target !== undefined && sourceTime >= target;
        sourceCropContext.drawImage(sourceImage, 44, 43, 474, 219, 0, 0, 474, 219);
        gameCropContext.drawImage(game, 61, 269, 474, 219, 0, 0, 474, 219);
        sourceBucketContext.drawImage(sourceImage, 150, 198, 260, 341, 0, 0, 260, 341);
        gameBucketContext.drawImage(game, 167, 424, 260, 341, 0, 0, 260, 341);
        if (shouldCaptureTarget) {
          // Snapshot the moving source and its canvas presentation before the
          // per-frame pixel scan below gives the decoder time to advance.
          sourcePanelContext.drawImage(sourceImage, 0, 0, 564, 756, 0, 0, 564, 756);
          gamePanelContext.drawImage(game, 17, 226, 564, 756, 0, 0, 564, 756);
        }
        const sourcePixels = sourceCropContext.getImageData(0, 0, 474, 219);
        const gamePixels = gameCropContext.getImageData(0, 0, 474, 219);
        const sourceRows = countRows(sourcePixels);
        const gameRows = countRows(gamePixels);
        let mismatchedCells = 0;
        let exactDifferentPixels = 0;
        let maximumChannelError = 0;
        let absoluteColorDifference = 0;
        for (let offset = 0; offset < sourcePixels.data.length; offset += 4) {
          const red = Math.abs(sourcePixels.data[offset] - gamePixels.data[offset]);
          const green = Math.abs(sourcePixels.data[offset + 1] - gamePixels.data[offset + 1]);
          const blue = Math.abs(sourcePixels.data[offset + 2] - gamePixels.data[offset + 2]);
          absoluteColorDifference += red + green + blue;
          maximumChannelError = Math.max(maximumChannelError, red, green, blue);
          if (red || green || blue) exactDifferentPixels += 1;
        }
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
          audioTime: sourceAudio?.currentTime ?? null,
          audioPaused: sourceAudio?.paused ?? true,
          audioDriftMs: sourceAudio ? (sourceAudio.currentTime - sourceTime) * 1_000 : null,
          sourceFrame,
          sourceRows,
          gameRows,
          mismatchedCells,
          exactDifferentPixels,
          maximumChannelError,
          meanAbsoluteColorError: absoluteColorDifference / (474 * 219 * 3),
          ...(maximumChannelError > 4 ? {
            sourceImage: sourceCropCanvas.toDataURL('image/png'),
            gameImage: gameCropCanvas.toDataURL('image/png'),
          } : {}),
        });
        if (shouldCaptureTarget) {
          result.captures.push({
            target,
            sourceTime,
            videoCurrentTime: source.currentTime,
            callbackPresentedFrames: metadata?.presentedFrames ?? null,
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
    window.__levelOneSourceFrameObserver = (metadata) => {
      const sourceTime = metadata.mediaTime;
      const presentingPlaybackFrame = !source.paused && !source.seeking;
      if (result.recording && presentingPlaybackFrame && sourceTime >= 0.48 && sourceTime <= 1.65) {
        result.videoFrames.push({
          sourceTime,
          sourceFrame: Math.round(sourceTime * 60),
          presentedFrames: metadata.presentedFrames,
        });
      }
      if (result.recording && presentingPlaybackFrame && sourceTime >= 0.48) {
        // The app calls this probe after painting the same requestVideoFrameCallback
        // frame, so the source image and canvas cannot drift across adjacent frames.
        captureFrame(sourceTime, sourceTime >= 1.65, metadata);
      }
    };
    setTimeout(() => {
      if (!result.done) {
        result.timedOut = true;
        result.done = true;
      }
    }, 5_000);
  });
}

async function startLevelOneSourceBoardFrameProbe(page, startTime, endTime) {
  await page.evaluate(({ startTime: start, endTime: end }) => {
    const source = document.querySelector('#level-one-source-video');
    const sourceImage = window.__levelOneSourcePresentedFrameCanvas ?? source;
    const game = document.querySelector('#game-canvas');
    const sourceCanvas = document.createElement('canvas');
    const gameCanvas = document.createElement('canvas');
    for (const canvas of [sourceCanvas, gameCanvas]) {
      canvas.width = 474;
      canvas.height = 219;
    }
    const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const gameContext = gameCanvas.getContext('2d', { willReadFrequently: true });
    const probe = {
      frames: [],
      events: [],
      done: false,
      initial: {
        currentTime: source.currentTime,
        paused: source.paused,
        seeking: source.seeking,
        readyState: source.readyState,
      },
    };
    const seenFrames = new Set();
    window.__levelOneSourceBoardFrameProbe = probe;
    let recording = !source.paused && !source.seeking;
    let reachedEnd = false;
    for (const type of ['play', 'playing', 'pause', 'seeking', 'seeked', 'waiting', 'stalled', 'ended', 'error']) {
      source.addEventListener(type, () => {
        probe.events.push({
          type,
          at: performance.now(),
          currentTime: source.currentTime,
          paused: source.paused,
          seeking: source.seeking,
          readyState: source.readyState,
          errorCode: source.error?.code ?? null,
        });
        if (type === 'play' || type === 'playing') recording = true;
        if (type === 'pause' || type === 'ended' || type === 'error') recording = false;
        if ((type === 'pause' || type === 'ended') && source.currentTime >= end - 1 / 60) {
          reachedEnd = true;
          probe.done = true;
        }
      });
    }

    const capturePresentedFrame = (metadata) => {
      const sourceTime = metadata.mediaTime;
      const sourceFrame = Math.round(sourceTime * 60);
      if (sourceTime >= start && sourceTime < end && !seenFrames.has(sourceFrame)) {
        seenFrames.add(sourceFrame);
        sourceContext.drawImage(sourceImage, 44, 43, 474, 219, 0, 0, 474, 219);
        gameContext.drawImage(game, 61, 269, 474, 219, 0, 0, 474, 219);
        const sourcePixels = sourceContext.getImageData(0, 0, 474, 219).data;
        const gamePixels = gameContext.getImageData(0, 0, 474, 219).data;
        let differentPixels = 0;
        let comparedPixels = 0;
        let absoluteColorDifference = 0;
        const recordingVolumeHudVisible = sourceTime >= 2.65 && sourceTime < 3.85;
        for (let pixel = 0; pixel < 474 * 219; pixel += 1) {
          const x = pixel % 474;
          const y = Math.floor(pixel / 474);
          // The original phone recording's volume HUD overlaps this small
          // left-edge rectangle. The replica deliberately reveals clean game
          // pixels there, so exclude only that non-game recording overlay.
          if (recordingVolumeHudVisible && x < 22 && y >= 100) continue;
          const offset = pixel * 4;
          comparedPixels += 1;
          const red = Math.abs(sourcePixels[offset] - gamePixels[offset]);
          const green = Math.abs(sourcePixels[offset + 1] - gamePixels[offset + 1]);
          const blue = Math.abs(sourcePixels[offset + 2] - gamePixels[offset + 2]);
          absoluteColorDifference += red + green + blue;
          if (red || green || blue) differentPixels += 1;
        }
        probe.frames.push({
          sourceFrame,
          callbackTime: sourceTime,
          sourceTime,
          frameLagMs: (source.currentTime - sourceTime) * 1_000,
          videoCurrentTime: source.currentTime,
          excludedRecordingVolumeHud: recordingVolumeHudVisible,
          comparedPixels,
          differentPixels,
          meanAbsoluteColorError: absoluteColorDifference / (comparedPixels * 3),
        });
        if (differentPixels > 0 && !probe.firstMismatch) {
          probe.firstMismatch = {
            sourceFrame,
            sourceTime,
            source: sourceCanvas.toDataURL('image/png'),
            game: gameCanvas.toDataURL('image/png'),
          };
        }
      }
      if (sourceTime >= end - 1 / 60) {
        reachedEnd = true;
        probe.done = true;
      }
    };

    window.__levelOneSourceFrameObserver = (metadata) => {
      probe.lastCallback = {
        mediaTime: metadata.mediaTime,
        sourceFrame: Math.round(metadata.mediaTime * 60),
        presentedFrames: metadata.presentedFrames ?? null,
        currentTime: source.currentTime,
        paused: source.paused,
        seeking: source.seeking,
        readyState: source.readyState,
        recording,
      };
      const presenting = !source.paused && !source.seeking;
      if (recording && presenting) {
        capturePresentedFrame(metadata);
      }
      if (metadata.mediaTime >= end) {
        reachedEnd = true;
        probe.done = true;
      }
    };
    setTimeout(() => {
      if (probe.done) return;
      probe.timedOut = true;
      probe.final = {
        currentTime: source.currentTime,
        paused: source.paused,
        seeking: source.seeking,
        readyState: source.readyState,
        duration: source.duration,
        recording,
        reachedEnd,
      };
      probe.done = true;
    }, 5_000);
  }, { startTime, endTime });
}

async function completeLevelOne(page, assertTransition = false) {
  for (const [x, color] of [[298, '黄色'], [111, '绿色'], [485, '红色']]) {
    await drag(page, x, 866, x, 620);
    await expect(page.locator('#live-status')).toContainText(`${color} 像素块，进度 100%`, { timeout: 5_000 });
  }
  const completionSnapshot = await page.evaluate(() => {
    const canvas = document.querySelector('#game-canvas');
    const video = document.querySelector('#level-one-source-video');
    const audio = document.querySelector('#level-one-source-audio');
    const dialog = document.querySelector('#dialog-layer');
    return {
      canvas: { ...canvas.dataset },
      video: { time: video.currentTime, paused: video.paused, seeking: video.seeking, readyState: video.readyState },
      audio: { time: audio.currentTime, paused: audio.paused },
      documentVisible: !document.hidden,
      dialogHidden: dialog.hidden,
      dialogClasses: dialog.className,
      liveStatus: document.querySelector('#live-status').textContent,
    };
  });
  console.log(`Level 1 completion snapshot: ${JSON.stringify(completionSnapshot)}`);
  let transitionStartedAt = null;
  if (assertTransition) {
    await expect(page.getByRole('status', { name: '正在进入第 2 关' })).toBeVisible();
    transitionStartedAt = Number(await page.locator('.transition-overlay').getAttribute('data-transition-started-at'));
    expect(Number.isFinite(transitionStartedAt), 'Level 1 transition should expose its measured start time').toBeTruthy();
    await expect(page.locator('.transition-ring')).toBeVisible();
    await expect(page.locator('.transition-logo')).toContainText('大闯关');
    await expect.poll(() => page.locator('#level-one-source-audio').evaluate((audio) => (
      !audio.paused && audio.currentTime > 6
    )), { timeout: 500 }).toBeTruthy();
  }
  await expect(page.locator('#live-status')).toHaveText('第 2 关开始', { timeout: 5_000 });
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

test('启动页徽标和黄盒边界逐项对齐原片首帧', async ({ page }, testInfo) => {
  await page.goto('/?previewSplash=1');
  await expect(page.locator('#live-status')).toHaveText('正在加载游戏');

  const screenshotPath = testInfo.outputPath('startup-splash.png');
  await page.locator('#game-canvas').screenshot({ path: screenshotPath });
  await testInfo.attach('startup-splash-canvas', { path: screenshotPath, contentType: 'image/png' });
  const pixels = await sharp(screenshotPath)
    .resize(597, 1296, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Boundaries measured from the supplied recording at 00:00:00.5 after
  // scaling its 1206 x 2622 frame to the 597 x 1296 game viewport. Text
  // strokes differ by design because the webpage title is localized.
  const sourceBounds = {
    greenTitle: { left: 206, top: 222, right: 406, bottom: 277 },
    redTitle: { left: 201, top: 282, right: 407, bottom: 364 },
    creamTitle: { left: 190, top: 347, right: 407, bottom: 424 },
    metalRing: { left: 170, top: 204, right: 426, bottom: 462 },
    yellowBox: { left: 201, top: 740, right: 391, bottom: 901 },
  };
  const actualBounds = {
    greenTitle: colorMaskBounds(pixels, { x: 180, y: 200, width: 250, height: 90 },
      (r, g, b) => g > 160 && r < 150 && b < 130),
    redTitle: colorMaskBounds(pixels, { x: 180, y: 275, width: 250, height: 90 },
      (r, g, b) => r > 160 && g < 125 && b < 120),
    creamTitle: colorMaskBounds(pixels, { x: 190, y: 335, width: 220, height: 100 },
      (r, g, b) => r > 225 && g > 190 && b > 145),
    metalRing: colorMaskBounds(pixels, { x: 150, y: 190, width: 300, height: 290 },
      (r, g, b) => Math.abs(r - g) < 42 && Math.abs(g - b) < 48 && r > 75 && r < 225),
    yellowBox: colorMaskBounds(pixels, { x: 140, y: 740, width: 320, height: 165 },
      (r, g, b) => r > 180 && g > 115 && g > b * 1.35 && b < 115),
  };

  expectBoundsNear(actualBounds.greenTitle, sourceBounds.greenTitle, 2, '绿色标题');
  expectBoundsNear(actualBounds.redTitle, sourceBounds.redTitle, 3, '红色标题');
  expectBoundsNear(actualBounds.creamTitle, sourceBounds.creamTitle, 2, '浅色标题');
  expectBoundsNear(actualBounds.metalRing, sourceBounds.metalRing, 2, '金属圆环');
  expectBoundsNear(actualBounds.yellowBox, sourceBounds.yellowBox, 2, '黄色盒体');
});

test('启动页徽标与黄盒连续重绘保持稳定，不闪烁', async ({ page }) => {
  await page.goto('/?previewSplash=1');
  await expect(page.locator('#live-status')).toHaveText('正在加载游戏');
  const region = { x: 130, y: 190, width: 340, height: 750 };
  await page.evaluate(({ x, y, width, height }) => {
    const canvas = document.querySelector('#game-canvas');
    const scale = canvas.width / 597;
    const pixels = canvas.getContext('2d').getImageData(
      Math.round(x * scale), Math.round(y * scale),
      Math.round(width * scale), Math.round(height * scale),
    ).data;
    window.__startupReferencePixels = new Uint8ClampedArray(pixels);
  }, region);

  const samples = [];
  for (let index = 0; index < 5; index += 1) {
    await page.waitForTimeout(100);
    samples.push(await page.evaluate(({ x, y, width, height }) => {
      const canvas = document.querySelector('#game-canvas');
      const scale = canvas.width / 597;
      const pixels = canvas.getContext('2d').getImageData(
        Math.round(x * scale), Math.round(y * scale),
        Math.round(width * scale), Math.round(height * scale),
      ).data;
      const reference = window.__startupReferencePixels;
      let changedPixels = 0;
      let maxChannelDelta = 0;
      for (let pixel = 0; pixel < pixels.length; pixel += 4) {
        let changed = false;
        for (let channel = 0; channel < 3; channel += 1) {
          const delta = Math.abs(pixels[pixel + channel] - reference[pixel + channel]);
          maxChannelDelta = Math.max(maxChannelDelta, delta);
          changed ||= delta !== 0;
        }
        if (changed) changedPixels += 1;
      }
      return { changedPixels, maxChannelDelta };
    }, region));
  }

  expect(samples, 'sample five frames 100 ms apart').toHaveLength(5);
  for (const sample of samples) {
    expect(sample.changedPixels, 'logo and yellow-box ROI should not shimmer').toBe(0);
    expect(sample.maxChannelDelta).toBe(0);
  }
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

test('Level 1 教程逐帧对齐原片，单次手势结束后停在末帧', async ({ page }, testInfo) => {
  const tutorialVideo = page.locator('#level-one-tutorial-video');
  await expect.poll(() => tutorialVideo.evaluate((video) => (
    video.currentSrc.endsWith('/assets/level1/level1-tutorial-hand.mp4')
      && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
  ))).toBeTruthy();
  const duration = await tutorialVideo.evaluate((video) => video.duration);
  expect(duration, 'the tutorial clip must end before the source begins lifting the yellow tray').toBeLessThanOrEqual(57 / 60 + 0.002);
  expect(duration, 'the one-shot tutorial must retain the full Level 1 entry gesture').toBeGreaterThan(56 / 60 - 0.002);

  const captureFrame = async (frameIndex, label) => {
    const sample = await page.evaluate(async (index) => {
      const video = document.querySelector('#level-one-tutorial-video');
      const atlas = new Image();
      atlas.src = '/assets/level1/level1-tutorial-frames.png';
      await atlas.decode();
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
      sourceContext.drawImage(
        atlas,
        (index % 5) * 563,
        Math.floor(index / 5) * 756,
        563,
        756,
        0,
        0,
        563,
        756,
      );

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
      const yellowStableRect = { left: 180, top: 886, width: 235, height: 72 };
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
        yellowStable: sampleRegion(yellowStableRect),
        hand: sampleRegion(handRect),
      };
    }, frameIndex);
    await page.screenshot({ path: testInfo.outputPath(`level1-tutorial-${label}.png`) });
    return sample;
  };

  // Sample the opening, midpoint, and final frame of the full Level 1 entry gesture.
  const frames = [
    await captureFrame(0, 'frame-00'),
    await captureFrame(28, 'frame-28'),
    await captureFrame(56, 'frame-56'),
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
  expect(handMotion, 'the original hand gesture must visibly advance between source frames 0 and 28').toBeGreaterThan(1_000);
  for (const [index, frame] of frames.slice(1).entries()) {
    const trayMotion = compareRegion(frames[0].yellowStable.actual, frame.yellowStable.actual, frames[0].yellowStable);
    expect(trayMotion, `yellow tray body outside the hand path must remain stable at source frame ${[28, 56][index]}`).toBe(0);
  }

  await expect(tutorialVideo).toHaveJSProperty('loop', false);
  await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }));
  await tutorialVideo.evaluate((video) => new Promise((resolve) => {
    video.addEventListener('seeked', resolve, { once: true });
    video.currentTime = 0;
  }));
  await tutorialVideo.evaluate((video) => video.play());
  await expect.poll(() => tutorialVideo.evaluate((video) => video.ended && video.paused), { timeout: 3_000 }).toBeTruthy();
  const endedTrayHashes = [];
  for (let sample = 0; sample < 5; sample += 1) {
    endedTrayHashes.push(await page.evaluate(() => {
      const game = document.querySelector('#game-canvas');
      const ratio = game.width / 597;
      const pixels = game.getContext('2d').getImageData(
        Math.round(157 * ratio), Math.round(738 * ratio),
        Math.round(285 * ratio), Math.round(260 * ratio),
      ).data;
      let hash = 2_166_136_261;
      for (const value of pixels) hash = Math.imul(hash ^ value, 16_777_619);
      return hash >>> 0;
    }));
    await page.waitForTimeout(60);
  }
  expect(new Set(endedTrayHashes).size, 'the yellow tray should stop changing after the one-shot tutorial gesture ends')
    .toBe(1);
});

test('Level 1 冷启动等开场素材解码后再显示，避免黄色槽首帧跳变', async ({ page }) => {
  await page.route('**/assets/level1/level1-tutorial-hand.mp4', async (route) => {
    await page.waitForTimeout(700);
    await route.continue();
  });
  await page.route('**/assets/level1/level1-tutorial-frames.png', async (route) => {
    await page.waitForTimeout(1_400);
    await route.continue();
  });
  await page.goto('/?previewLevel=1', { waitUntil: 'domcontentloaded' });

  const canvas = page.locator('#game-canvas');
  const tutorialVideo = page.locator('#level-one-tutorial-video');
  await expect(canvas, 'keep the loading scene visible while the hand clip is still withheld')
    .toHaveAttribute('aria-label', '正在加载游戏');
  expect(await tutorialVideo.evaluate((video) => video.readyState), 'the delayed clip should not be decoded yet')
    .toBeLessThan(2);

  await expect.poll(() => tutorialVideo.evaluate((video) => (
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
  )), { timeout: 5_000 }).toBeTruthy();
  await expect(canvas, 'do not start the hand gesture before its lossless source-frame atlas is decoded')
    .toHaveAttribute('aria-label', '正在加载游戏');
  await expect(canvas).toHaveAttribute('aria-label', '拖动收集槽收集彩色像素方块');
  await expect.poll(() => tutorialVideo.evaluate((video) => video.currentTime > 0.02)).toBeTruthy();
});

test('Level 1 冷启动手势自然播放一次后停住，黄色槽不闪回', async ({ page }) => {
  await page.addInitScript(() => {
    const probe = window.__pbjTutorialPlaybackProbe = {
      playRequests: 0,
      endedEvents: 0,
      samples: [],
      endedAt: null,
    };
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function play(...args) {
      if (this.id === 'level-one-tutorial-video') probe.playRequests += 1;
      return originalPlay.apply(this, args);
    };
    const attach = (video) => {
      if (video.dataset.playbackProbeAttached) return;
      video.dataset.playbackProbeAttached = 'true';
      video.addEventListener('ended', () => {
        probe.endedEvents += 1;
        probe.endedAt = performance.now();
      });
      const canvas = document.querySelector('#game-canvas');
      const sample = () => {
        if (canvas?.width === 597 && canvas.height === 1296) {
          const pixels = canvas.getContext('2d').getImageData(157, 738, 285, 260).data;
          let hash = 2_166_136_261;
          for (const value of pixels) hash = Math.imul(hash ^ value, 16_777_619);
          probe.samples.push({ time: video.currentTime, ended: video.ended, hash: hash >>> 0 });
        }
        if (probe.endedAt === null || performance.now() - probe.endedAt < 360) {
          requestAnimationFrame(sample);
        }
      };
      requestAnimationFrame(sample);
    };
    const observer = new MutationObserver(() => {
      const video = document.querySelector('#level-one-tutorial-video');
      if (video) attach(video);
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.reload();

  const tutorialVideo = page.locator('#level-one-tutorial-video');
  await expect.poll(() => tutorialVideo.evaluate((video) => video.ended && video.paused), { timeout: 5_000 }).toBeTruthy();
  await expect.poll(() => page.evaluate(() => (
    window.__pbjTutorialPlaybackProbe?.samples.some(({ ended }) => ended)
      && window.__pbjTutorialPlaybackProbe.endedAt !== null
      && performance.now() - window.__pbjTutorialPlaybackProbe.endedAt >= 300
  )), { timeout: 2_000 }).toBeTruthy();

  const playback = await page.evaluate(() => window.__pbjTutorialPlaybackProbe);
  const times = playback.samples.map(({ time }) => time);
  const backwardsFrames = times.slice(1).filter((time, index) => time + 0.001 < times[index]).length;
  const endedSamples = playback.samples.filter(({ ended }) => ended);
  expect(playback.playRequests, 'the cold-start tutorial should request playback only once').toBe(1);
  expect(playback.endedEvents, 'the one-shot gesture should emit a single ended event').toBe(1);
  expect(backwardsFrames, 'the tutorial video must not jump back to its first frame').toBe(0);
  expect(Math.max(...times), 'natural playback should reach the 57-frame source endpoint').toBeGreaterThanOrEqual(56 / 60 - 0.002);
  expect(endedSamples.length, 'keep sampling the panel after natural playback ends').toBeGreaterThanOrEqual(12);
  expect(new Set(endedSamples.slice(-8).map(({ hash }) => hash)).size,
    'the yellow slot and its surrounding panel must remain pixel-stable after the hand stops').toBe(1);
});

test('Level 1 开局57帧逐帧匹配原片，手势移动时黄色槽保持稳定', async ({ page }, testInfo) => {
  const tutorialVideo = page.locator('#level-one-tutorial-video');
  await expect.poll(() => tutorialVideo.evaluate((video) => (
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
  ))).toBeTruthy();

  const alignment = await page.evaluate(async () => {
    const video = document.querySelector('#level-one-tutorial-video');
    const atlas = new Image();
    atlas.src = '/assets/level1/level1-tutorial-frames.png';
    await atlas.decode();
    const game = document.querySelector('#game-canvas');
    const gameContext = game.getContext('2d');
    const ratio = game.width / 597;
    const reference = document.createElement('canvas');
    reference.width = game.width;
    reference.height = game.height;
    const referenceContext = reference.getContext('2d', { alpha: false });
    const panel = document.createElement('canvas');
    panel.width = 563;
    panel.height = 756;
    const panelContext = panel.getContext('2d');
    panelContext.imageSmoothingEnabled = false;
    const yellowSourceRect = { left: 157, top: 738, width: 285, height: 184 };
    const yellowStableRect = { left: 180, top: 886, width: 235, height: 72 };
    const yellowBadgeRect = { left: 322, top: 738, width: 120, height: 38 };
    const handRect = { left: 277, top: 546, width: 190, height: 210 };
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    video.pause();

    const read = (context, rect) => context.getImageData(
      Math.round(rect.left * ratio), Math.round(rect.top * ratio),
      Math.round(rect.width * ratio), Math.round(rect.height * ratio),
    ).data;
    const compare = (actual, expected, width, masks = []) => {
      let exactDifferentPixels = 0;
      let visibleDifferentPixels = 0;
      let maximumChannelDifference = 0;
      let left = width;
      let top = actual.length / 4 / width;
      let right = -1;
      let bottom = -1;
      for (let offset = 0; offset < actual.length; offset += 4) {
        const pixel = offset / 4;
        const x = pixel % width;
        const y = Math.floor(pixel / width);
        if (masks.some(({ left: maskLeft, top: maskTop, right: maskRight, bottom: maskBottom }) => (
          x >= maskLeft && x < maskRight && y >= maskTop && y < maskBottom
        ))) continue;
        const red = Math.abs(actual[offset] - expected[offset]);
        const green = Math.abs(actual[offset + 1] - expected[offset + 1]);
        const blue = Math.abs(actual[offset + 2] - expected[offset + 2]);
        const maximum = Math.max(red, green, blue);
        if (maximum > 0) exactDifferentPixels += 1;
        if (maximum > 8) {
          visibleDifferentPixels += 1;
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
        maximumChannelDifference = Math.max(maximumChannelDifference, maximum);
      }
      return {
        exactDifferentPixels,
        visibleDifferentPixels,
        maximumChannelDifference,
        visibleDifferenceBounds: right < 0 ? null : { left, top, right, bottom },
      };
    };

    const frames = [];
    let firstYellowStable;
    let firstHand;
    panelContext.drawImage(
      atlas,
      (56 % 5) * 563,
      Math.floor(56 / 5) * 756,
      563,
      756,
      0,
      0,
      panel.width,
      panel.height,
    );
    referenceContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    referenceContext.drawImage(panel, 17, 226);
    const clearYellowBadge = read(referenceContext, yellowBadgeRect);
    for (let frameIndex = 0; frameIndex < 57; frameIndex += 1) {
      const targetTime = (frameIndex + 0.5) / 60;
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Tutorial seek to frame ${frameIndex} timed out`)), 3_000);
        video.addEventListener('seeked', () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });
        video.currentTime = targetTime;
      });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      panelContext.clearRect(0, 0, panel.width, panel.height);
      panelContext.drawImage(
        atlas,
        (frameIndex % 5) * 563,
        Math.floor(frameIndex / 5) * 756,
        563,
        756,
        0,
        0,
        panel.width,
        panel.height,
      );
      referenceContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      referenceContext.clearRect(0, 0, reference.width, reference.height);
      referenceContext.drawImage(panel, 17, 226);
      const actualYellowSource = read(gameContext, yellowSourceRect);
      const expectedYellowSource = read(referenceContext, yellowSourceRect);
      const actualYellowStable = read(gameContext, yellowStableRect);
      const actualYellowBadge = read(gameContext, yellowBadgeRect);
      const actualHand = read(gameContext, handRect);
      const expectedHand = read(referenceContext, handRect);
      const yellowFrameMatch = compare(actualYellowSource, expectedYellowSource, yellowSourceRect.width);
      const handFrameMatch = compare(actualHand, expectedHand, handRect.width);
      if (!firstYellowStable) firstYellowStable = actualYellowStable.slice();
      if (!firstHand) firstHand = actualHand.slice();
      const yellowStability = compare(actualYellowStable, firstYellowStable, yellowStableRect.width);
      frames.push({
        frameIndex,
        sourceTime: video.currentTime,
        yellowFrameMatch,
        handFrameMatch,
        yellowChangeFromFirstFrame: yellowStability,
        badgeChangeFromClearFrame: compare(actualYellowBadge, clearYellowBadge, yellowBadgeRect.width),
        handMotionFromFirstFrame: compare(actualHand, firstHand, handRect.width).exactDifferentPixels,
      });
    }
    return { sourceRange: '00:01.783–00:02.717, 60 fps', frames };
  });

  expect(alignment.frames).toHaveLength(57);
  expect(alignment.frames.every(({ yellowFrameMatch }) => yellowFrameMatch.visibleDifferentPixels === 0),
    'each tutorial yellow-tray frame must visually match its same-time source frame').toBeTruthy();
  expect(alignment.frames.every(({ handFrameMatch }) => handFrameMatch.visibleDifferentPixels === 0),
    'each tutorial hand frame must visually match its same-time source frame').toBeTruthy();
  const maxLowerYellowVariance = Math.max(...alignment.frames.map(({ yellowChangeFromFirstFrame }) => (
    yellowChangeFromFirstFrame.visibleDifferentPixels
  )));
  expect(maxLowerYellowVariance,
    'the lower yellow-slot body outside the source hand path must remain pixel-stable').toBe(0);
  expect(alignment.frames.filter(({ badgeChangeFromClearFrame }) => badgeChangeFromClearFrame.visibleDifferentPixels > 0).length,
    'the source hand should briefly cover the yellow 0% badge during the recorded tutorial').toBeGreaterThan(0);
  expect(alignment.frames[28].handMotionFromFirstFrame, 'the source hand should move during the one-shot opening gesture')
    .toBeGreaterThan(1_000);

  const summary = {
    sourceRange: alignment.sourceRange,
    yellowStabilityRegion: { left: 180, top: 886, width: 235, height: 72, reason: 'lower cavity and side rails stay outside the hand path and bottom fade' },
    frameCount: alignment.frames.length,
    visibleHandMismatches: alignment.frames.filter(({ handFrameMatch }) => handFrameMatch.visibleDifferentPixels > 0).length,
    visibleYellowMismatches: alignment.frames.filter(({ yellowFrameMatch }) => yellowFrameMatch.visibleDifferentPixels > 0).length,
    yellowUnstableFrames: alignment.frames.filter(({ yellowChangeFromFirstFrame }) => yellowChangeFromFirstFrame.visibleDifferentPixels > 0).length,
    yellowCompressionVarianceFrames: alignment.frames.filter(({ yellowChangeFromFirstFrame }) => yellowChangeFromFirstFrame.exactDifferentPixels > 0).length,
    yellowBadgeOccludedFrames: alignment.frames.filter(({ badgeChangeFromClearFrame }) => badgeChangeFromClearFrame.visibleDifferentPixels > 0).map(({ frameIndex }) => frameIndex),
    frames: alignment.frames,
  };
  await testInfo.attach('level1-opening-57-frame-alignment.json', {
    body: Buffer.from(JSON.stringify(summary, null, 2)),
    contentType: 'application/json',
  });
  console.log(`Level 1 tutorial alignment: ${summary.frameCount} frames, ${summary.visibleHandMismatches} visible hand mismatches, ${summary.visibleYellowMismatches} visible yellow mismatches, ${summary.yellowUnstableFrames} yellow instability frames`);
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
    .extract({ left: 17, top: 226, width: 563, height: 744 })
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
      .toBeLessThanOrEqual(0.05);
  }

  const frameProbe = await page.evaluate(async () => {
    while (!window.__levelOneYellowFrameProbe.done) await new Promise((resolve) => setTimeout(resolve, 20));
    return window.__levelOneYellowFrameProbe;
  });
  console.log(`Level 1 yellow target capture clocks: ${JSON.stringify(frameProbe.captures.map(({ target, sourceTime, videoCurrentTime, callbackPresentedFrames }) => ({ target, sourceTime, videoCurrentTime, callbackPresentedFrames })))}`);
  for (const sample of frameProbe.samples.filter(({ maximumChannelError }) => maximumChannelError > 4)) {
    const sourcePath = testInfo.outputPath(`yellow-source-frame-${sample.sourceFrame}.png`);
    const gamePath = testInfo.outputPath(`yellow-replica-frame-${sample.sourceFrame}.png`);
    await writeFile(sourcePath, Buffer.from(sample.sourceImage.split(',')[1], 'base64'));
    await writeFile(gamePath, Buffer.from(sample.gameImage.split(',')[1], 'base64'));
  }
  expect(frameProbe.timedOut, 'source-synced frame probe should reach the end of the yellow clear').toBeFalsy();
  const observedSourceFrames = [...new Set(frameProbe.videoFrames.map(({ sourceFrame }) => sourceFrame))].sort((a, b) => a - b);
  const maximumSourceFrameGap = Math.max(...observedSourceFrames.slice(1).map((frame, index) => frame - observedSourceFrames[index]));
  console.log(`Level 1 yellow observed frame coverage: ${JSON.stringify({ videoCallbacks: frameProbe.videoFrames.length, canvasSamples: frameProbe.samples.length, first: observedSourceFrames[0], last: observedSourceFrames.at(-1), maximumSourceFrameGap, gaps: observedSourceFrames.slice(1).map((frame, index) => frame - observedSourceFrames[index]).filter((gap) => gap > 1) })}`);
  expect(observedSourceFrames.length, 'observe at least 50 distinct browser-presented source frames throughout the yellow sweep').toBeGreaterThanOrEqual(50);
  expect(frameProbe.samples.length, 'compare at least 50 browser-presented canvas frames against their paired source frames').toBeGreaterThanOrEqual(50);
  expect(observedSourceFrames[0], 'source frame checks should begin within five frames after the pre-seeked playback start').toBeLessThanOrEqual(35);
  expect(observedSourceFrames.at(-1), 'source frame checks should cover the yellow sweep exit').toBeGreaterThanOrEqual(98);
  expect(maximumSourceFrameGap, 'the displayed source timeline should not skip more than two 60 fps source frames at a time').toBeLessThanOrEqual(3);
  expect(frameProbe.samples.every(({ maximumChannelError }) => maximumChannelError <= 4),
    'each displayed yellow board frame should stay within four RGB values of its paired video frame').toBeTruthy();
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
    const comparisonReference = source;
    const referenceKind = 'presented source video frame';
    const diffPixels = pixelmatch(comparisonReference.data, game.data, Buffer.alloc(game.data.length), 474, 219, {
      threshold: 0.12,
      includeAA: false,
    });
    let absoluteColorDifference = 0;
    for (let offset = 0; offset < comparisonReference.data.length; offset += 4) {
      absoluteColorDifference += Math.abs(comparisonReference.data[offset] - game.data[offset]);
      absoluteColorDifference += Math.abs(comparisonReference.data[offset + 1] - game.data[offset + 1]);
      absoluteColorDifference += Math.abs(comparisonReference.data[offset + 2] - game.data[offset + 2]);
    }
    const comparison = {
      target: capture.target,
      sourceTime: capture.sourceTime,
      referenceKind,
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
    const topBytes = 564 * levelOneActionBlendStart * 4;
    const topDiffPixels = pixelmatch(
      source.data.subarray(0, topBytes),
      game.data.subarray(0, topBytes),
      Buffer.alloc(topBytes),
      564,
      levelOneActionBlendStart,
      { threshold: 0.12, includeAA: false },
    );
    const bottomHeight = 756 - levelOneActionBlendStart;
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
      topDifferentPixelRatio: topDiffPixels / (564 * levelOneActionBlendStart),
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
    sampleRate: 'requestVideoFrameCallback on source playback; rendered canvas sampled after two animation frames',
    videoFrames: frameProbe.videoFrames,
    uniqueSourceFrameCount: observedSourceFrames.length,
    firstSourceFrame: observedSourceFrames[0],
    lastSourceFrame: observedSourceFrames.at(-1),
    maximumSourceFrameGap,
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
  const audioSyncSamples = frameProbe.samples.filter((sample) => (
    sample.sourceTime >= 0.55 && sample.sourceTime <= 1.55 && !sample.audioPaused
  ));
  const audioDrifts = audioSyncSamples.map((sample) => Math.abs(sample.audioDriftMs)).sort((a, b) => a - b);
  const audioSync = {
    sampleCount: audioSyncSamples.length,
    p95AbsoluteDriftMs: audioDrifts[Math.min(audioDrifts.length - 1, Math.floor(audioDrifts.length * 0.95))] ?? null,
    maximumAbsoluteDriftMs: audioDrifts.at(-1) ?? null,
  };
  expect(audioSync.sampleCount, 'source audio should run throughout the yellow sweep').toBeGreaterThanOrEqual(45);
  expect(audioSync.maximumAbsoluteDriftMs, 'source audio and video clocks should stay within 70 ms')
    .toBeLessThanOrEqual(70);
  frameAlignment.audioSync = audioSync;
  console.log(`Level 1 yellow source alignment: ${frameProbe.videoFrames.length} decoded frames / ${frameProbe.samples.length} rendered samples, mean center-cell mismatch ${averageCellMismatch.toFixed(1)}/323, board RGB error ${averageColorError.toFixed(2)} (max ${maximumColorError.toFixed(2)}), active bucket ${averageBucketColorError.toFixed(2)} (max ${maximumBucketColorError.toFixed(2)}), full panel pixel diff ${(averagePanelDiff * 100).toFixed(2)}%`);
  console.log(`Level 1 yellow progress source times: ${progressTimeLog.map(({ progress, sourceTime }) => `${progress}%=${sourceTime.toFixed(3)}s`).join(', ')}`);
  console.log(`Level 1 source audio sync: ${audioSync.sampleCount} paired samples, p95 ${audioSync.p95AbsoluteDriftMs.toFixed(1)} ms, max ${audioSync.maximumAbsoluteDriftMs.toFixed(1)} ms`);
  await writeFile(testInfo.outputPath('level1-yellow-frame-alignment.json'), `${JSON.stringify(frameAlignment, null, 2)}\n`);
  await testInfo.attach('level1-yellow-frame-alignment.json', {
    body: Buffer.from(JSON.stringify(frameAlignment, null, 2)),
    contentType: 'application/json',
  });
});

test('Level 1 绿色与红色扫墙按录屏分段飞入对应收集槽', async ({ page }, testInfo) => {
  test.setTimeout(30_000);
  await page.evaluate(() => {
    const status = document.querySelector('#live-status');
    window.__levelOneColorProgressLog = [];
    new MutationObserver(() => window.__levelOneColorProgressLog.push(status?.textContent ?? ''))
      .observe(status, { childList: true, characterData: true, subtree: true });
  });

  await startLevelOneSourceBoardFrameProbe(page, 3.0, 4.0);
  await drag(page, 111, 866, 111, 620);
  await expect.poll(() => page.evaluate(() => window.__levelOneColorProgressLog.some((entry) => (
    entry.includes('绿色 像素块，进度 25%')
  ))), { timeout: 3_000, message: 'the transient 25% green milestone should be captured in the live-status history' })
    .toBeTruthy();
  await expect.poll(() => page.locator('#level-one-source-audio').evaluate((audio) => (
    audio.currentSrc.endsWith('/assets/level1/level1-source-audio.m4a')
      && !audio.paused
      && audio.currentTime >= 2.5
      && audio.currentTime < 4
  ))).toBeTruthy();
  const green25Screenshot = await page.screenshot({ path: testInfo.outputPath('level1-green-25.png') });
  expect(green25Screenshot.byteLength, 'green sweep should render a visible game frame').toBeGreaterThan(10_000);
  for (const progress of [48, 71, 85, 99, 100]) {
    await expect.poll(() => page.evaluate((target) => (
      window.__levelOneColorProgressLog.some((entry) => entry.includes(`进度 ${target}%`))
    ), progress), { timeout: 3_000 }).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`level1-green-${progress}.png`) });
  }
  const greenProgress = await page.evaluate(() => window.__levelOneColorProgressLog
    .filter((entry) => entry.includes('绿色 像素块'))
    .map((entry) => Number(entry.match(/进度 (\d+)%/)?.[1] ?? 0)));
  for (const [minimum, maximum] of [[25, 25], [48, 48], [85, 85], [100, 100]]) {
    expect(greenProgress.some((progress) => progress >= minimum && progress <= maximum), `missing green sweep range ${minimum}-${maximum}% in ${greenProgress}`)
      .toBeTruthy();
  }
  await expect.poll(() => page.evaluate(() => window.__levelOneSourceBoardFrameProbe.done), {
    timeout: 6_000,
  }).toBeTruthy();
  const greenFrameProbe = await page.evaluate(() => window.__levelOneSourceBoardFrameProbe);
  const greenMismatches = greenFrameProbe.frames.filter(({ differentPixels }) => differentPixels > 0);
  console.log(`Level 1 green source alignment: ${greenFrameProbe.frames.length} frames, ${greenMismatches.length} mismatches, ${greenFrameProbe.frames[0]?.sourceTime.toFixed(3)}–${greenFrameProbe.frames.at(-1)?.sourceTime.toFixed(3)}s`);
  console.log(`Level 1 green source probe state: ${JSON.stringify({ initial: greenFrameProbe.initial, events: greenFrameProbe.events, lastCallback: greenFrameProbe.lastCallback, final: greenFrameProbe.final })}`);
  await testInfo.attach('level1-green-frame-alignment.json', {
    body: Buffer.from(JSON.stringify(greenFrameProbe, null, 2)),
    contentType: 'application/json',
  });
  expect(greenFrameProbe.frames.length, 'compare at least 30 decoded green source frames to the rendered board').toBeGreaterThanOrEqual(30);
  expect(greenFrameProbe.frames[0].sourceTime, 'green source-frame checks should begin near the played segment start').toBeLessThan(3.1);
  expect(greenFrameProbe.frames.at(-1).sourceTime, 'green source-frame checks should cover the played segment end').toBeGreaterThan(3.9);
  expect(greenFrameProbe.frames.every(({ differentPixels }) => differentPixels === 0), 'every green source board frame should render without game-pixel changes; the source-only volume HUD area is masked')
    .toBeTruthy();

  await startLevelOneSourceBoardFrameProbe(page, 4.0, 5.5);
  await drag(page, 485, 866, 485, 620);
  await expect(page.locator('#live-status')).toContainText('红色 像素块，进度 100%', { timeout: 2_000 });
  await page.screenshot({ path: testInfo.outputPath('level1-red-100.png') });
  const redProgress = await page.evaluate(() => window.__levelOneColorProgressLog
    .filter((entry) => entry.includes('红色 像素块'))
    .map((entry) => Number(entry.match(/进度 (\d+)%/)?.[1] ?? 0)));
  for (const [minimum, maximum] of [[34, 34], [64, 64], [77, 77], [92, 92], [100, 100]]) {
    expect(redProgress.some((progress) => progress >= minimum && progress <= maximum), `missing red sweep range ${minimum}-${maximum}%`)
      .toBeTruthy();
  }
  await expect.poll(() => page.locator('#level-one-source-video').evaluate((video) => video.currentTime >= 5.5), {
    timeout: 3_000,
  }).toBeTruthy();
  await expect.poll(() => page.evaluate(() => window.__levelOneSourceBoardFrameProbe.done), {
    timeout: 3_000,
  }).toBeTruthy();
  const redFrameProbe = await page.evaluate(() => window.__levelOneSourceBoardFrameProbe);
  const redMismatches = redFrameProbe.frames.filter(({ differentPixels }) => differentPixels > 0);
  console.log(`Level 1 red source alignment: ${redFrameProbe.frames.length} frames, ${redMismatches.length} mismatches, ${redFrameProbe.frames[0]?.sourceTime.toFixed(3)}–${redFrameProbe.frames.at(-1)?.sourceTime.toFixed(3)}s`);
  await testInfo.attach('level1-red-frame-alignment.json', {
    body: Buffer.from(JSON.stringify(redFrameProbe, null, 2)),
    contentType: 'application/json',
  });
  expect(redFrameProbe.frames.length, 'compare at least 40 decoded red source frames to the rendered board').toBeGreaterThanOrEqual(40);
  expect(redFrameProbe.frames[0].sourceTime, 'red source-frame checks should begin near the played segment start').toBeLessThan(4.1);
  expect(redFrameProbe.frames.at(-1).sourceTime, 'red source-frame checks should cover the played segment before the brand transition').toBeGreaterThan(5.4);
  expect(redFrameProbe.frames.every(({ differentPixels }) => differentPixels === 0), 'every red source board frame should render without pixel changes')
    .toBeTruthy();
});

test('Level 1 只拖绿色槽时红色槽画面保持原位', async ({ page }, testInfo) => {
  test.setTimeout(20_000);
  const canvas = page.locator('#game-canvas');
  const sourceVideo = page.locator('#level-one-source-video');
  await page.goto('/?previewLevel=1');
  await page.waitForFunction(() => document.querySelector('#game-canvas')?.dataset.gameStatus === 'tutorial');
  await expect.poll(() => page.locator('#level-one-tutorial-video').evaluate((video) => video.ended)).toBe(true);

  await drag(page, 111, 866, 111, 620);
  await expect.poll(() => sourceVideo.evaluate((video) => video.currentTime), {
    timeout: 5_000,
  }).toBeGreaterThan(3.1);
  const sourceTimeBeforeRedLift = await sourceVideo.evaluate((video) => video.currentTime);
  const beforeRedLift = await canvas.screenshot({ path: testInfo.outputPath('level1-green-before-red-lift.png') });
  await expect.poll(() => sourceVideo.evaluate((video) => video.currentTime), {
    timeout: 5_000,
  }).toBeGreaterThan(3.55);
  const sourceTimeDuringGreen = await sourceVideo.evaluate((video) => video.currentTime);
  expect(sourceTimeDuringGreen, 'capture before the green source timeline ends').toBeLessThan(3.78);
  const duringGreen = await canvas.screenshot({ path: testInfo.outputPath('level1-green-only-red-tray.png') });
  const crop = { left: 438, top: 500, width: 110, height: 490 };
  const initialRed = await sharp(beforeRedLift).extract(crop).ensureAlpha().raw().toBuffer();
  const duringRed = await sharp(duringGreen).extract(crop).ensureAlpha().raw().toBuffer();
  const differentPixels = pixelmatch(initialRed, duringRed, Buffer.alloc(initialRed.length), crop.width, crop.height, {
    threshold: 0.12,
    includeAA: false,
  });
  await testInfo.attach('level1-green-before-red-lift.png', { body: beforeRedLift, contentType: 'image/png' });
  await testInfo.attach('level1-green-only-red-tray.png', { body: duringGreen, contentType: 'image/png' });
  console.log(`Level 1 inactive red tray visual diff during green-only move: ${differentPixels} pixels at source ${sourceTimeBeforeRedLift.toFixed(3)}s -> ${sourceTimeDuringGreen.toFixed(3)}s`);
  expect(differentPixels, 'the visible red tray must not replay its source-video lift while only green was dragged').toBe(0);
});

test('Level 1 绿黄红连续真实拖动各自只移动对应收集槽并能通关', async ({ page }) => {
  test.setTimeout(20_000);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.evaluate(() => {
    window.__levelOneBucketDraws = [];
    const prototype = CanvasRenderingContext2D.prototype;
    const originalRoundRect = prototype.roundRect;
    prototype.roundRect = function roundRect(x, y, width, height, radius) {
      if (this.canvas?.id === 'game-canvas' && height === 247 && [49, 174, 423].includes(x)) {
        const color = x === 49 ? 'green' : x === 174 ? 'yellow' : 'red';
        window.__levelOneBucketDraws.push({ at: performance.now(), color, x, y, width, height });
      }
      return originalRoundRect.call(this, x, y, width, height, radius);
    };
  });

  const bucketPositions = async () => page.evaluate(() => {
    const latest = {};
    for (const draw of window.__levelOneBucketDraws) latest[draw.color] = draw;
    return Object.fromEntries(Object.entries(latest).map(([color, draw]) => [color, draw.y]));
  });
  const remainingCells = async () => Number(await page.locator('#game-canvas').getAttribute('data-level-one-remaining-cells'));
  const expectOnlyBucketMoved = async (movedColor, previousPositions) => {
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const positions = await bucketPositions();
    expect(positions[movedColor], `${movedColor} tray should reach the raised wall position: ${JSON.stringify(positions)}`)
      .toBeLessThan(520);
    for (const color of ['green', 'yellow', 'red'].filter((candidate) => candidate !== movedColor)) {
      expect(Math.abs(positions[color] - previousPositions[color]), `${color} tray must not move when dragging ${movedColor}: ${JSON.stringify(positions)}`)
        .toBeLessThanOrEqual(2);
    }
    expect(await page.locator('#game-canvas').getAttribute('data-game-status')).toBe('playing');
    return positions;
  };

  await page.waitForFunction(() => document.querySelector('#game-canvas')?.dataset.gameStatus === 'tutorial');
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const initialRemaining = await remainingCells();
  const initialPositions = await bucketPositions();
  expect(initialPositions).toEqual({ green: 743, yellow: 743, red: 743 });

  await drag(page, 111, 866, 111, 620);
  const greenPositions = await expectOnlyBucketMoved('green', initialPositions);
  const afterGreen = await remainingCells();
  expect(afterGreen, 'green drag must start collecting its own pixels').toBeLessThan(initialRemaining);

  await drag(page, 298, 866, 298, 620);
  const yellowPositions = await expectOnlyBucketMoved('yellow', greenPositions);
  const afterYellow = await remainingCells();
  expect(afterYellow, 'yellow drag must be accepted while earlier pixels are still animating').toBeLessThan(afterGreen);
  expect(yellowPositions.green).toBeLessThan(520);
  expect(greenPositions.red).toBeGreaterThan(700);

  await drag(page, 485, 866, 485, 620);
  const redPositions = await expectOnlyBucketMoved('red', yellowPositions);
  const afterRed = await remainingCells();
  expect(afterRed, 'red drag must be accepted while the other colors are still animating').toBeLessThan(afterYellow);
  expect(redPositions.green).toBeLessThan(520);
  expect(redPositions.yellow).toBeLessThan(520);

  await expect(page.locator('#live-status')).toHaveText('第 2 关开始', { timeout: 10_000 });
  expect(pageErrors, 'the complete real-pointer sequence must not throw browser errors').toEqual([]);
});

test('Level 1 设置页暂停并从同一进度继续原画与原声', async ({ page }) => {
  await drag(page, 298, 866, 298, 620);
  await expect(page.locator('#live-status')).toContainText('进度 6%', { timeout: 1_500 });
  const sourceTime = await page.locator('#level-one-source-audio').evaluate((audio) => audio.currentTime);

  await page.getByRole('button', { name: '打开设置' }).click();
  await expect.poll(() => page.locator('#level-one-source-audio').evaluate((audio) => audio.paused)).toBeTruthy();
  await expect.poll(() => page.locator('#level-one-source-video').evaluate((video) => video.paused)).toBeTruthy();
  const clocksAtPause = await page.evaluate(() => ({
    audio: document.querySelector('#level-one-source-audio').currentTime,
    video: document.querySelector('#level-one-source-video').currentTime,
  }));
  await page.waitForTimeout(250);
  const clocksAfterPause = await page.evaluate(() => ({
    audio: document.querySelector('#level-one-source-audio').currentTime,
    video: document.querySelector('#level-one-source-video').currentTime,
  }));
  expect(Math.abs(clocksAtPause.audio - sourceTime), 'the settings click should pause near its starting source position')
    .toBeLessThan(0.12);
  expect(Math.abs(clocksAfterPause.audio - clocksAtPause.audio), 'the source audio clock should remain frozen while settings are open')
    .toBeLessThanOrEqual(0.01);
  expect(Math.abs(clocksAfterPause.video - clocksAtPause.video), 'the source video clock should remain frozen while settings are open')
    .toBeLessThanOrEqual(0.01);
  await page.getByRole('dialog', { name: '游戏设置' }).locator('[data-toggle="effects"]').click();

  await page.getByRole('dialog', { name: '游戏设置' }).getByRole('button', { name: '继续游戏' }).click();
  await expect.poll(() => page.locator('#level-one-source-audio').evaluate((audio) => audio.paused)).toBeTruthy();
  await expect(page.locator('#live-status')).toContainText('进度 36%', { timeout: 2_000 });
  await page.getByRole('button', { name: '打开设置' }).click();
  await page.getByRole('dialog', { name: '游戏设置' }).locator('[data-toggle="effects"]').click();
  await page.getByRole('dialog', { name: '游戏设置' }).getByRole('button', { name: '继续游戏' }).click();
  await expect.poll(() => page.locator('#level-one-source-audio').evaluate((audio) => !audio.paused)).toBeTruthy();
});

test('Level 1 黄色槽满格停在原作终帧且帧循环保持运行', async ({ page }, testInfo) => {
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

  const actionFrame = await page.evaluate(async () => {
    const source = document.querySelector('#level-one-source-video');
    const sourceImage = window.__levelOneSourcePresentedFrameCanvas ?? source;
    const game = document.querySelector('#game-canvas');
    const reference = document.createElement('canvas');
    reference.width = 564;
    reference.height = 696;
    const referenceContext = reference.getContext('2d', { willReadFrequently: true });
    const gameRegion = document.createElement('canvas');
    gameRegion.width = 564;
    gameRegion.height = 696;
    const gameRegionContext = gameRegion.getContext('2d', { willReadFrequently: true });
    const startedAt = performance.now();
    let differentPixels = -1;
    let framesWaited = 0;
    const compare = () => {
      referenceContext.drawImage(sourceImage, 0, 0, 564, 696, 0, 0, 564, 696);
      gameRegionContext.drawImage(game, 17, 226, 564, 696, 0, 0, 564, 696);
      const referencePixels = referenceContext.getImageData(0, 0, 564, 696).data;
      const gamePixels = gameRegionContext.getImageData(0, 0, 564, 696).data;
      differentPixels = 0;
      for (let offset = 0; offset < referencePixels.length; offset += 4) {
        if (referencePixels[offset] !== gamePixels[offset]
          || referencePixels[offset + 1] !== gamePixels[offset + 1]
          || referencePixels[offset + 2] !== gamePixels[offset + 2]) differentPixels += 1;
      }
    };
    compare();
    while (differentPixels !== 0 && performance.now() - startedAt < 500) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      framesWaited += 1;
      compare();
    }
    return {
      sourceTime: window.__levelOneSourcePresentedFrameTime ?? source.currentTime,
      videoCurrentTime: source.currentTime,
      videoPaused: source.paused,
      videoSeeking: source.seeking,
      videoReadyState: source.readyState,
      differentPixels,
      framesWaited,
      waitMs: performance.now() - startedAt,
      canvasDataset: { ...game.dataset },
      ...(differentPixels ? {
        sourcePng: reference.toDataURL('image/png'),
        gamePng: gameRegion.toDataURL('image/png'),
      } : {}),
    };
  });
  if (actionFrame.differentPixels > 0) {
    for (const [name, dataUrl] of [['source', actionFrame.sourcePng], ['game', actionFrame.gamePng]]) {
      const path = testInfo.outputPath(`level1-yellow-final-${name}.png`);
      await writeFile(path, Buffer.from(dataUrl.split(',')[1], 'base64'));
      await testInfo.attach(`level1-yellow-final-${name}.png`, { path, contentType: 'image/png' });
    }
  }
  expect(Math.abs(actionFrame.sourceTime - 2), `yellow sweep should stop at its 2.0s source endpoint, got ${actionFrame.sourceTime.toFixed(3)}s`)
    .toBeLessThanOrEqual(0.05);
  expect(actionFrame.differentPixels,
    `the final 696px should match its paused source frame after RAF paint: ${JSON.stringify({
      sourceTime: actionFrame.sourceTime,
      videoCurrentTime: actionFrame.videoCurrentTime,
      videoPaused: actionFrame.videoPaused,
      videoSeeking: actionFrame.videoSeeking,
      videoReadyState: actionFrame.videoReadyState,
      framesWaited: actionFrame.framesWaited,
      waitMs: actionFrame.waitMs,
      canvasDataset: actionFrame.canvasDataset,
    })}`).toBe(0);
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
  expect(createGameState(2).config.pad.rows, 'Level 2 source frame has four operation-pad rows').toBe(4);
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

test('第 3–13 关过场预览与对应开局画面逐像素一致', async ({ page }, testInfo) => {
  test.setTimeout(30_000);
  for (let level = 3; level <= 13; level += 1) {
    await page.goto(`/?previewLevel=${level}`);
    if (level === 3) await expect(page.locator('#live-status')).toHaveText('第 3 关开始');
    await page.waitForTimeout(500);
    const screenshot = await page.locator('#game-canvas').screenshot();
    const actual = await sharp(screenshot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const expected = await sharp(fileURLToPath(new URL(`../assets/transitions/level-${level}-opening.png`, import.meta.url)))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(expected.info.width, `level ${level} preview width`).toBe(597);
    expect(expected.info.height, `level ${level} preview height`).toBe(1296);
    const diffPixels = Buffer.alloc(actual.data.length);
    const diff = pixelmatch(expected.data, actual.data, diffPixels, 597, 1296, {
      threshold: 0.12,
      includeAA: false,
    });
    if (diff > 0) {
      let left = 597;
      let top = 1296;
      let right = -1;
      let bottom = -1;
      for (let offset = 0; offset < diffPixels.length; offset += 4) {
        if (diffPixels[offset + 3] === 0) continue;
        const pixel = offset / 4;
        const x = pixel % 597;
        const y = Math.floor(pixel / 597);
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
      console.log(`level ${level} transition preview changed ${diff} pixels in x=${left}..${right}, y=${top}..${bottom}`);
      await testInfo.attach(`level-${level}-transition-actual.png`, { body: screenshot, contentType: 'image/png' });
      await testInfo.attach(`level-${level}-transition-diff.png`, {
        body: await sharp(diffPixels, { raw: { width: 597, height: 1296, channels: 4 } }).png().toBuffer(),
        contentType: 'image/png',
      });
    }
    expect(diff, `level ${level} transition preview should match its opening canvas`).toBe(0);
  }
});

test('Level 3 开局棋盘与录屏裁切逐像素一致', async ({ page }) => {
  await page.goto('/?previewLevel=3');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#live-status')).toHaveText('第 3 关开始');
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

test('Level 3 开局主面板无遮挡区与原片逐像素一致，操作垫延伸到六行', async ({ page }) => {
  await page.goto('/?previewLevel=3');
  await expect(page.locator('#live-status')).toHaveText('第 3 关开始');
  expect(createGameState(3).config.pad.rows, 'the source level 3 tray has six rows below the wall').toBe(6);

  const screenshot = await page.screenshot();
  const actual = await sharp(screenshot)
    .extract({ left: 22, top: 162, width: 554, height: 724 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const diff = pixelmatch(
    levelThreeOpeningPanelPixels.data,
    actual.data,
    Buffer.alloc(actual.data.length),
    actual.info.width,
    actual.info.height,
    { threshold: 0.12, includeAA: false },
  );
  expect(diff, `Level 3 opening panel changed at ${diff} of ${actual.info.width * actual.info.height} pixels`).toBe(0);

  const edge = await sharp(screenshot).extract({ left: 22, top: 981, width: 554, height: 2 }).removeAlpha().raw().toBuffer();
  let edgeError = 0;
  for (let offset = 0; offset < edge.length / 2; offset += 1) edgeError += Math.abs(edge[offset] - edge[offset + edge.length / 2]);
  const edgeMeanAbsoluteError = edgeError / (554 * 3);
  expect(edgeMeanAbsoluteError, 'the source crop should fade into the lower native tray without a horizontal cut').toBeLessThan(5);
});

test('Level 3 首次真实拖动启动 480 帧源片回放，无遮挡区逐帧匹配且下沿连续', async ({ page }, testInfo) => {
  test.setTimeout(30_000);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/?previewLevel=3');
  const sourceVideo = page.locator('#level-three-source-gameplay-video');
  await expect.poll(() => sourceVideo.evaluate((video) => video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA))
    .toBeTruthy();
  await expect(page.locator('#live-status')).toHaveText('第 3 关开始');

  await page.evaluate(() => {
    const video = document.querySelector('#level-three-source-gameplay-video');
    const game = document.querySelector('#game-canvas');
    const reference = document.createElement('canvas');
    reference.width = 554;
    reference.height = 724;
    const referenceContext = reference.getContext('2d');
    const actualContext = game.getContext('2d');
    const seen = new Set();
    window.__levelThreePresentedSourceFrames = [];
    window.__levelThreeSourceFrameComparisons = [];
    window.__levelThreeSourceFrameObserver = (metadata) => {
      const frame = Math.round(metadata.mediaTime * 60);
      if (seen.has(frame)) return;
      seen.add(frame);
      window.__levelThreePresentedSourceFrames.push(frame);
      if (window.__levelThreePresentedSourceFrames.length % 15 !== 0) return;
      referenceContext.clearRect(0, 0, 554, 724);
      referenceContext.drawImage(video, 0, 0, 554, 724, 0, 0, 554, 724);
      const expected = referenceContext.getImageData(0, 0, 554, 724).data;
      const actual = actualContext.getImageData(22, 162, 554, 724).data;
      const edge = actualContext.getImageData(22, 981, 554, 2).data;
      let differentPixels = 0;
      let edgeError = 0;
      const expectedPixels = new Uint32Array(expected.buffer);
      const actualPixels = new Uint32Array(actual.buffer);
      for (let pixel = 0; pixel < actualPixels.length; pixel += 1) {
        if (actualPixels[pixel] !== expectedPixels[pixel]) differentPixels += 1;
      }
      for (let offset = 0; offset < edge.length / 2; offset += 1) edgeError += Math.abs(edge[offset] - edge[offset + edge.length / 2]);
      window.__levelThreeSourceFrameComparisons.push({
        frame,
        mediaTime: metadata.mediaTime,
        differentPixels,
        ratio: differentPixels / (554 * 724),
        bottomEdgeMae: edgeError / (554 * 4),
      });
    };
  });

  await dragAt60Hz(page, 500, 921, 500, 628, 500);
  await expect(page.locator('#live-status')).toContainText('紫色');
  try {
    await expect.poll(() => page.evaluate(() => (
      window.__levelThreeSourceFrameComparisons?.some(({ frame }) => frame >= 465)
    )), { timeout: 10_000 }).toBeTruthy();
  } catch (error) {
    const playbackDiagnostics = await page.evaluate(() => {
      const video = document.querySelector('#level-three-source-gameplay-video');
      const canvas = document.querySelector('#game-canvas');
      const frames = window.__levelThreePresentedSourceFrames ?? [];
      const comparisons = window.__levelThreeSourceFrameComparisons ?? [];
      return {
        video: {
          currentTime: video.currentTime,
          duration: video.duration,
          paused: video.paused,
          ended: video.ended,
          seeking: video.seeking,
          readyState: video.readyState,
          playbackRate: video.playbackRate,
        },
        presentedFrameCount: frames.length,
        firstPresentedFrame: frames[0] ?? null,
        lastPresentedFrame: frames.at(-1) ?? null,
        comparisonCount: comparisons.length,
        lastComparison: comparisons.at(-1) ?? null,
        progress: {
          purple: canvas.dataset.progressPurple,
          blue: canvas.dataset.progressBlue,
          yellow: canvas.dataset.progressYellow,
        },
        documentVisible: !document.hidden,
      };
    });
    await testInfo.attach('level3-source-playback-timeout.json', {
      body: JSON.stringify(playbackDiagnostics, null, 2),
      contentType: 'application/json',
    });
    throw error;
  }

  const presentedFrames = await page.evaluate(() => window.__levelThreePresentedSourceFrames);
  const comparison = await page.evaluate(() => window.__levelThreeSourceFrameComparisons);
  const maximumPresentedFrameGap = presentedFrames.reduce((maximum, frame, index) => (
    index === 0 ? maximum : Math.max(maximum, frame - presentedFrames[index - 1])
  ), 0);
  expect(presentedFrames.length, 'the browser should present frames throughout the 8-second source clip')
    .toBeGreaterThanOrEqual(250);
  expect(presentedFrames[0]).toBeLessThanOrEqual(5);
  expect(presentedFrames.at(-1)).toBeGreaterThanOrEqual(465);
  expect(presentedFrames.every((frame, index) => index === 0 || frame > presentedFrames[index - 1]))
    .toBeTruthy();
  expect(maximumPresentedFrameGap, 'source playback should not skip more than three frames between presented frames')
    .toBeLessThanOrEqual(4);
  expect(comparison.length, 'compare source-aligned frames across the full clip').toBeGreaterThanOrEqual(29);
  expect(comparison[0].frame, 'source-frame comparisons should start near the beginning of the clip').toBeLessThanOrEqual(20);
  expect(comparison.at(-1).frame, 'source-frame comparisons should reach the end of the clip').toBeGreaterThanOrEqual(465);
  expect(comparison.every(({ ratio }) => ratio === 0), 'each compared canvas frame should match its presented source frame exactly')
    .toBeTruthy();
  expect(comparison.every(({ bottomEdgeMae }) => bottomEdgeMae < 5), 'the lower edge should remain continuous throughout source playback')
    .toBeTruthy();
  await expect(page.locator('#game-canvas')).toHaveAttribute('data-progress-purple', '48');
  await expect(page.locator('#game-canvas')).toHaveAttribute('data-progress-blue', '45');
  await expect(page.locator('#game-canvas')).toHaveAttribute('data-progress-yellow', '9');
  expect(pageErrors).toEqual([]);
  const browserAlignment = {
    source: 'User recording S5 Level 3 00:19.9-00:27.9, 60 fps, exact pixel match on crop x22 y162 554x724; lower 96 px fades into native bucket layer',
    presentedFrameCount: presentedFrames.length,
    firstPresentedFrame: presentedFrames[0],
    lastPresentedFrame: presentedFrames.at(-1),
    maximumPresentedFrameGap,
    presentedFrames,
    pixelComparedFrameCount: comparison.length,
    changedPixels: comparison.reduce((total, { differentPixels }) => total + differentPixels, 0),
    comparedFrames: comparison,
  };
  const browserAlignmentDirectory = new URL('../.research/events/level3-60fps/browser/', import.meta.url);
  await mkdir(browserAlignmentDirectory, { recursive: true });
  await writeFile(new URL('frame-alignment.json', browserAlignmentDirectory), `${JSON.stringify(browserAlignment, null, 2)}\n`);
  await testInfo.attach('level3-source-frame-alignment.json', {
    body: JSON.stringify(browserAlignment, null, 2),
    contentType: 'application/json',
  });
});

test('Level 3 首拖播放原作混合音轨并与视频同步，设置暂停后从同一位置续播', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto('/?previewLevel=3');
  const sourceVideo = page.locator('#level-three-source-gameplay-video');
  const sourceAudio = page.locator('#level-three-source-audio');
  await expect(page.locator('#live-status')).toHaveText('第 3 关开始');
  await expect.poll(() => sourceAudio.evaluate((element) => element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA))
    .toBeTruthy();

  await dragAt60Hz(page, 500, 921, 500, 628, 500);
  await expect.poll(() => sourceAudio.evaluate((element) => (
    !element.paused && !element.muted && element.currentTime > 0.35
  ))).toBeTruthy();
  await expect.poll(() => sourceVideo.evaluate((element) => element.currentTime > 0.35)).toBeTruthy();
  const initialSync = await page.evaluate(() => ({
    audio: document.querySelector('#level-three-source-audio').currentTime,
    video: document.querySelector('#level-three-source-gameplay-video').currentTime,
  }));
  expect(Math.abs(initialSync.audio - initialSync.video), 'the Level 3 source audio should follow its 60 fps video').toBeLessThan(0.08);

  await page.getByRole('button', { name: '打开设置' }).click();
  await expect.poll(() => sourceAudio.evaluate((element) => element.paused && element.muted)).toBeTruthy();
  await expect.poll(() => sourceVideo.evaluate((element) => element.paused)).toBeTruthy();
  const paused = await page.evaluate(() => ({
    audio: document.querySelector('#level-three-source-audio').currentTime,
    video: document.querySelector('#level-three-source-gameplay-video').currentTime,
  }));
  await page.waitForTimeout(250);
  const held = await page.evaluate(() => ({
    audio: document.querySelector('#level-three-source-audio').currentTime,
    video: document.querySelector('#level-three-source-gameplay-video').currentTime,
  }));
  expect(Math.abs(held.audio - paused.audio), 'source audio should hold while settings are open').toBeLessThan(0.04);
  expect(Math.abs(held.video - paused.video), 'source video should hold while settings are open').toBeLessThan(0.04);

  const dialog = page.getByRole('dialog', { name: '游戏设置' });
  const effectsToggle = dialog.locator('[data-toggle="effects"]');
  await effectsToggle.click();
  await dialog.getByRole('button', { name: '继续游戏' }).click();
  await expect.poll(() => sourceVideo.evaluate((element) => !element.paused)).toBeTruthy();
  await expect.poll(() => sourceAudio.evaluate((element) => element.paused && element.muted)).toBeTruthy();

  await page.getByRole('button', { name: '打开设置' }).click();
  await page.getByRole('dialog', { name: '游戏设置' }).locator('[data-toggle="effects"]').click();
  await page.getByRole('dialog', { name: '游戏设置' }).getByRole('button', { name: '继续游戏' }).click();
  await expect.poll(() => sourceAudio.evaluate((element) => !element.paused && !element.muted)).toBeTruthy();
  const resumed = await page.evaluate(() => ({
    audio: document.querySelector('#level-three-source-audio').currentTime,
    video: document.querySelector('#level-three-source-gameplay-video').currentTime,
  }));
  expect(resumed.audio, 'reenabling source-mix settings should resume after the pause point')
    .toBeGreaterThan(paused.audio + 0.1);
  expect(Math.abs(resumed.audio - resumed.video), 'source audio and video should resynchronize after settings resume')
    .toBeLessThan(0.08);
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

test('Level 1 切换颜色源片段时保留已显示的墙面帧', async ({ page }) => {
  await drag(page, 298, 866, 298, 620);
  await expect(page.locator('#live-status')).toContainText('黄色 像素块，进度 100%', { timeout: 5_000 });

  const beforeScreenshot = await page.screenshot();
  const greenStart = await pointOnCanvas(page, 111, 866);
  await page.evaluate(() => {
    const video = document.querySelector('#level-one-source-video');
    window.__levelOneNextSourceSeek = new Promise((resolve) => {
      video.addEventListener('seeking', () => resolve({ readyState: video.readyState, currentTime: video.currentTime }), { once: true });
    });
  });
  await page.mouse.move(greenStart.x, greenStart.y);
  await page.mouse.down();
  const seekEvent = await page.evaluate(() => window.__levelOneNextSourceSeek);
  const duringSeekScreenshot = await page.screenshot();
  await page.mouse.up();

  const crop = { left: 61, top: 269, width: 474, height: 219 };
  const before = await sharp(beforeScreenshot).extract(crop).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const during = await sharp(duringSeekScreenshot).extract(crop).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const changedPixels = pixelmatch(before.data, during.data, Buffer.alloc(before.data.length), before.info.width, before.info.height, {
    threshold: 0.12,
    includeAA: false,
  });
  console.log(`Level 1 source seek retained wall: ${JSON.stringify({ ...seekEvent, changedPixels })}`);
  expect(seekEvent.readyState, 'the capture should occur while the next source segment is seeking').toBeLessThan(2);
  expect(changedPixels, 'the visible source wall should stay on its last presented frame during the seek').toBeLessThanOrEqual(25);
});

test('按原片重叠节奏拖动黄绿红并从 Level 1 进入 Level 2', async ({ page }, testInfo) => {
  test.setTimeout(30_000);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.evaluate(() => {
    const canvas = document.querySelector('#game-canvas');
    const status = document.querySelector('#live-status');
    window.__levelOnePlaythroughTrace = { statuses: [], pointer: [], labels: [], percentFrame: null };
    const originalFillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function recordLevelOneProgressLabel(text, x, y, ...rest) {
      if (this.canvas?.id === 'game-canvas' && /^\d+%$/u.test(String(text))) {
        window.__levelOnePlaythroughTrace.labels.push({ at: performance.now(), text: String(text), x, y });
      }
      const result = originalFillText.call(this, text, x, y, ...rest);
      if (this.canvas?.id === 'game-canvas' && String(text) === '34%' && x > 500
          && window.__levelOnePlaythroughTrace.percentFrame === null) {
        const canvas = this.canvas;
        queueMicrotask(() => {
          if (window.__levelOnePlaythroughTrace.percentFrame !== null) return;
          window.__levelOnePlaythroughTrace.percentFrame = {
            at: performance.now(),
            sourceTime: document.querySelector('#level-one-source-video')?.currentTime ?? null,
            dataUrl: canvas.toDataURL('image/png'),
          };
        });
      }
      return result;
    };
    const recordStatus = () => window.__levelOnePlaythroughTrace.statuses.push({
      at: performance.now(),
      text: status?.textContent ?? '',
      remainingCells: canvas?.dataset.levelOneRemainingCells ?? null,
      sourceTime: document.querySelector('#level-one-source-video')?.currentTime ?? null,
    });
    recordStatus();
    new MutationObserver(recordStatus).observe(status, { childList: true, characterData: true, subtree: true });
    for (const type of ['pointerdown', 'pointerup']) {
      document.addEventListener(type, (event) => window.__levelOnePlaythroughTrace.pointer.push({
        type,
        at: performance.now(),
        x: event.clientX,
        y: event.clientY,
        color: Math.abs(event.clientX - 298) < 70 ? 'yellow'
          : Math.abs(event.clientX - 111) < 70 ? 'green'
            : Math.abs(event.clientX - 485) < 70 ? 'red' : 'unknown',
      }), true);
    }
  });

  await drag(page, 298, 866, 298, 620);
  await expect(page.locator('#live-status')).toContainText('黄色 像素块，进度 100%', { timeout: 5_000 });

  await page.waitForTimeout(250);
  await drag(page, 111, 866, 111, 620);
  await expect.poll(() => page.locator('#game-canvas').getAttribute('data-level-one-yellow-exit-progress'))
    .toBe('1');
  // Start the red tray immediately after releasing green. The original lifts
  // red while green is still clearing; waiting for green 100% hides that race.
  await drag(page, 485, 866, 485, 620);
  await expect.poll(() => page.evaluate(() => window.__levelOnePlaythroughTrace.statuses.some(({ text }) => (
    text.includes('绿色 像素块，进度 100%')
  ))), { timeout: 5_000, message: 'green must finish while the red drag is already in progress' }).toBeTruthy();
  await expect.poll(() => page.evaluate(() => window.__levelOnePlaythroughTrace.statuses.some(({ text }) => (
    text.includes('红色 像素块，进度 34%')
  ))), { timeout: 5_000, message: 'the red sweep should reach the original 34% milestone' }).toBeTruthy();
  const redLabelProbe = await page.evaluate(() => {
    const milestone = window.__levelOnePlaythroughTrace.statuses.find(({ text }) => text.includes('红色 像素块，进度 34%'));
    const labels = window.__levelOnePlaythroughTrace.labels.filter(({ x }) => x > 500);
    const nearest = labels.reduce((best, label) => (
      !best || Math.abs(label.at - milestone.at) < Math.abs(best.at - milestone.at) ? label : best
    ), null);
    return { milestoneAt: milestone?.at ?? null, label: nearest };
  });
  console.log(`Level 1 red 34% rendered label: ${JSON.stringify(redLabelProbe)}`);
  expect(redLabelProbe.label?.text, 'the red tray label near the 34% status milestone should render 34%').toBe('34%');
  await expect.poll(() => page.evaluate(() => window.__levelOnePlaythroughTrace.statuses.some(({ text }) => (
    text.includes('红色 像素块，进度 100%')
  ))), { timeout: 5_000 }).toBeTruthy();
  await expect(page.locator('#game-canvas')).toHaveAttribute('data-level-one-remaining-cells', '0');
  await expect(page.locator('#live-status')).toHaveText('第 2 关开始');
  await expect(page.locator('#game-canvas')).toHaveAttribute('data-progress-green', '0');

  const trace = await page.evaluate(() => window.__levelOnePlaythroughTrace);
  expect(trace.percentFrame?.dataUrl, 'the 34% progress label should be captured in the same canvas paint').toMatch(/^data:image\/png;base64,/u);
  const exactProgressCanvas = Buffer.from(trace.percentFrame.dataUrl.split(',')[1], 'base64');
  await writeFile(testInfo.outputPath('level1-red-34-exact-canvas.png'), exactProgressCanvas);
  await testInfo.attach('level1-red-34-exact-canvas.png', {
    body: exactProgressCanvas,
    contentType: 'image/png',
  });
  const downs = trace.pointer.filter(({ type }) => type === 'pointerdown').map(({ color, at }) => ({ color, at }));
  expect(downs.map(({ color }) => color), 'the recorded pointer sequence should match yellow, green, red').toEqual(['yellow', 'green', 'red']);
  const green100 = trace.statuses.find(({ text }) => text.includes('绿色 像素块，进度 100%'));
  const red34 = trace.statuses.find(({ text }) => text.includes('红色 像素块，进度 34%'));
  const red100 = trace.statuses.find(({ text }) => text.includes('红色 像素块，进度 100%'));
  console.log(`Level 1 overlap timing: ${JSON.stringify({ downs, green100, red34, red100, pointer: trace.pointer })}`);
  expect(green100.at, 'green should reach 100% after the red pointer-down').toBeGreaterThan(downs[2].at);
  expect(red34.at, 'red progress should begin after the red pointer-down').toBeGreaterThan(downs[2].at);
  expect(Math.abs(green100.at - red34.at), 'source reaches green 100% and red 34% together').toBeLessThanOrEqual(100);
  expect(Math.abs(green100.sourceTime - 4.0), `green 100% should align to source time 4.0s, got ${green100.sourceTime}s`).toBeLessThanOrEqual(0.1);
  expect(Math.abs(red34.sourceTime - 4.0), `red 34% should align to source time 4.0s, got ${red34.sourceTime}s`).toBeLessThanOrEqual(0.1);
  expect(red100.at).toBeGreaterThan(red34.at);
  expect(pageErrors, 'the recorded three-color playthrough should not throw browser errors').toEqual([]);
  console.log(`Level 1 overlapping playthrough trace: ${JSON.stringify({ finalStatus: trace.statuses.at(-1), errors: pageErrors })}`);
});

test('Level 1 品牌转场铺满全屏、使用中文并按源帧收缩揭示', async ({ page }, testInfo) => {
  test.setTimeout(30_000);
  for (const [x, color] of [[298, '黄色'], [111, '绿色']]) {
    await drag(page, x, 866, x, 620);
    await expect(page.locator('#live-status')).toContainText(`${color} 像素块，进度 100%`, { timeout: 5_000 });
  }
  await drag(page, 485, 866, 485, 620);
  await page.evaluate(() => {
    window.__pbjTransitionFrames = [];
    const sample = () => {
      const overlay = document.querySelector('.transition-overlay');
      const startedAt = Number(overlay?.dataset.transitionStartedAt);
      if (Number.isFinite(startedAt)) {
        const elapsedMs = performance.now() - startedAt;
        if (elapsedMs > 630) return;
        const logo = document.querySelector('.transition-logo');
        const preview = document.querySelector('.transition-next-preview');
        if (logo && preview) {
          const logoStyle = getComputedStyle(logo);
          const transform = new DOMMatrixReadOnly(logoStyle.transform);
          const radius = /circle\(([\d.]+)(%|px)/u.exec(getComputedStyle(preview).clipPath);
          const radiusValue = radius ? Number(radius[1]) : 0;
          window.__pbjTransitionFrames.push({
            elapsedMs,
            logoScale: Math.hypot(transform.a, transform.b),
            logoOpacity: Number(logoStyle.opacity),
            revealRadiusPercent: radius?.[2] === '%'
              ? radiusValue
              : (radiusValue / (Math.hypot(innerWidth, innerHeight) / Math.SQRT2)) * 100,
          });
        }
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
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
  const fullBrand = await page.screenshot({ path: testInfo.outputPath('level1-brand-full.png') });
  // Source frame 013 (8.002 s, 597x1296) is the first full-size mark. Compare
  // localized text by colored row bounds, since the source lettering is English.
  const rows = {
    green: {
      actual: await findRgbBounds(fullBrand, { left: 100, top: 520, width: 300, height: 100 },
        (r, g, b) => g > 100 && g > r * 1.25 && g > b * 1.12),
      target: { left: 203, right: 399, top: 533, bottom: 606 },
      tolerance: { centerX: 4, centerY: 4, width: 4, height: 8 },
    },
    red: {
      actual: await findRgbBounds(fullBrand, { left: 100, top: 590, width: 400, height: 90 },
        (r, g, b) => r > 120 && r > g * 1.25 && r > b * 1.2),
      target: { left: 200, right: 411, top: 594, bottom: 679 },
      tolerance: { centerX: 3, centerY: 3, width: 4, height: 4 },
    },
    gold: {
      actual: await findRgbBounds(fullBrand, { left: 100, top: 650, width: 400, height: 120 },
        (r, g, b) => r > 145 && g > 70 && r > g * 1.08 && g > b * 1.15),
      target: { left: 176, right: 395, top: 658, bottom: 750 },
      tolerance: { centerX: 3, centerY: 3, width: 4, height: 4 },
    },
  };
  for (const [name, row] of Object.entries(rows)) {
    expect(row.actual, `localized ${name} logo row should be visible`).not.toBeNull();
    const actualCenterX = (row.actual.left + row.actual.right) / 2;
    const actualCenterY = (row.actual.top + row.actual.bottom) / 2;
    const targetCenterX = (row.target.left + row.target.right) / 2;
    const targetCenterY = (row.target.top + row.target.bottom) / 2;
    const actualWidth = row.actual.right - row.actual.left + 1;
    const actualHeight = row.actual.bottom - row.actual.top + 1;
    const targetWidth = row.target.right - row.target.left + 1;
    const targetHeight = row.target.bottom - row.target.top + 1;
    expect(Math.abs(actualCenterX - targetCenterX), `${name} row center should follow source frame 013`).toBeLessThanOrEqual(row.tolerance.centerX);
    expect(Math.abs(actualCenterY - targetCenterY), `${name} row height should follow source frame 013`).toBeLessThanOrEqual(row.tolerance.centerY);
    expect(Math.abs(actualWidth - targetWidth), `${name} row width should follow source frame 013`).toBeLessThanOrEqual(row.tolerance.width);
    expect(Math.abs(actualHeight - targetHeight), `${name} row height should follow source frame 013`).toBeLessThanOrEqual(row.tolerance.height);
  }
  const sourceVoxels = {
    purple: {
      actual: await findRgbBounds(fullBrand, { left: 160, top: 500, width: 90, height: 90 },
        (r, g, b) => r > 100 && b > 110 && r > g * 1.2 && b > g * 1.2),
      target: { left: 183, right: 229, top: 520, bottom: 574 },
    },
    green: {
      actual: await findRgbComponentBounds(
        fullBrand,
        { left: 350, top: 500, width: 130, height: 180 },
        (r, g, b) => g > 75 && g > r * 1.12 && g > b * 1.08,
        (component) => component.left > 400,
      ),
      target: { left: 402, right: 450, top: 607, bottom: 661 },
    },
    blue: {
      actual: await findRgbBounds(fullBrand, { left: 160, top: 645, width: 55, height: 60 },
        (r, g, b) => r < 120 && g > 170 && b > 210),
      target: { left: 166, right: 197, top: 653, bottom: 686 },
    },
  };
  for (const [name, voxel] of Object.entries(sourceVoxels)) {
    expect(voxel.actual, `${name} source voxel should remain visible`).not.toBeNull();
    const actualCenterX = (voxel.actual.left + voxel.actual.right) / 2;
    const actualCenterY = (voxel.actual.top + voxel.actual.bottom) / 2;
    const targetCenterX = (voxel.target.left + voxel.target.right) / 2;
    const targetCenterY = (voxel.target.top + voxel.target.bottom) / 2;
    expect(Math.abs(actualCenterX - targetCenterX), `${name} voxel horizontal center should follow source frame 013`).toBeLessThanOrEqual(3);
    expect(Math.abs(actualCenterY - targetCenterY), `${name} voxel vertical center should follow source frame 013`).toBeLessThanOrEqual(3);
    expect(Math.abs((voxel.actual.right - voxel.actual.left) - (voxel.target.right - voxel.target.left)), `${name} voxel width should follow source frame 013`).toBeLessThanOrEqual(5);
    expect(Math.abs((voxel.actual.bottom - voxel.actual.top) - (voxel.target.bottom - voxel.target.top)), `${name} voxel height should follow source frame 013`).toBeLessThanOrEqual(5);
  }
  await writeFile(testInfo.outputPath('level1-brand-frame-alignment.json'), `${JSON.stringify({
    reference: 'source frame 013 at 8.002 s, original 597x1296 recording',
    localizedTextBounds: Object.fromEntries(Object.entries(rows).map(([name, row]) => [name, {
      actual: row.actual,
      source: row.target,
    }])),
    floatingVoxelBounds: Object.fromEntries(Object.entries(sourceVoxels).map(([name, voxel]) => [name, {
      actual: voxel.actual,
      source: voxel.target,
    }])),
  }, null, 2)}\n`);
  await expect(page.getByRole('status', { name: '正在进入第 2 关' })).toBeVisible();
  await expect(page.locator('.transition-logo')).toContainText('大闯关');
  const cssBrandRows = await page.locator('.transition-logo span').evaluateAll((spans) => spans.map((span) => {
    const { x, y, width, height } = span.getBoundingClientRect();
    return { text: span.textContent, x, y, width, height };
  }));
  console.log(`Level 1 localized DOM logo rows: ${JSON.stringify(cssBrandRows)}`);
  const cssRowTargets = [
    { centerX: 301, centerY: 565, width: 197, height: 60 },
    { centerX: 305.5, centerY: 630, width: 212, height: 60 },
    { centerX: 285.5, centerY: 704, width: 220, height: 72 },
  ];
  for (const [index, row] of cssBrandRows.entries()) {
    const target = cssRowTargets[index];
    expect(Math.abs(row.x + row.width / 2 - target.centerX), `DOM logo row ${index + 1} horizontal center should follow source frame 013`).toBeLessThanOrEqual(3);
    expect(Math.abs(row.y + row.height / 2 - target.centerY), `DOM logo row ${index + 1} vertical center should follow source frame 013`).toBeLessThanOrEqual(3);
    expect(Math.abs(row.width - target.width), `DOM logo row ${index + 1} width should follow source frame 013`).toBeLessThanOrEqual(4);
    expect(Math.abs(row.height - target.height), `DOM logo row ${index + 1} height should follow source frame 013`).toBeLessThanOrEqual(3);
  }
  const cssBrandVoxels = await page.locator('.transition-cube').evaluateAll((voxels) => voxels.map((voxel) => {
    const { x, y, width, height } = voxel.getBoundingClientRect();
    return { className: voxel.className, x, y, width, height };
  }));
  console.log(`Level 1 localized DOM logo voxels: ${JSON.stringify(cssBrandVoxels)}`);
  const cssVoxelTargets = {
    'transition-cube cube-purple': { centerX: 206, centerY: 547, width: 47, height: 55 },
    'transition-cube cube-green': { centerX: 426, centerY: 634, width: 49, height: 55 },
  };
  for (const [className, target] of Object.entries(cssVoxelTargets)) {
    const voxel = cssBrandVoxels.find(({ className: actualClass }) => actualClass === className);
    expect(voxel, `${className} should appear in the transition`).toBeTruthy();
    expect(Math.abs(voxel.x + voxel.width / 2 - target.centerX), `${className} horizontal center should follow source frame 013`).toBeLessThanOrEqual(2);
    expect(Math.abs(voxel.y + voxel.height / 2 - target.centerY), `${className} vertical center should follow source frame 013`).toBeLessThanOrEqual(2);
    expect(Math.abs(voxel.width - target.width), `${className} width should follow source frame 013`).toBeLessThanOrEqual(2);
    expect(Math.abs(voxel.height - target.height), `${className} height should follow source frame 013`).toBeLessThanOrEqual(2);
  }
  const transitionStartedAt = Number(await page.locator('.transition-overlay').getAttribute('data-transition-started-at'));
  await page.waitForFunction(() => window.__pbjTransitionFrames?.some(({ elapsedMs }) => elapsedMs >= 560));
  const transitionFrames = await page.evaluate(() => window.__pbjTransitionFrames);
  const closestFrame = (targetMs) => transitionFrames.reduce((closest, sample) => (
    Math.abs(sample.elapsedMs - targetMs) < Math.abs(closest.elapsedMs - targetMs) ? sample : closest
  ));
  const sourceFrameMarkers = [260, 285, 335, 402, 420, 552].map((targetMs) => ({
    targetMs,
    actual: closestFrame(targetMs),
  }));
  console.log(`Level 1 source-aligned transition samples: ${JSON.stringify(sourceFrameMarkers)}`);
  await writeFile(testInfo.outputPath('level1-transition-frame-probe.json'), `${JSON.stringify({
    sourceReference: '7.802–8.802 s source frames 001–061 at 60 fps',
    transitionStartedAt,
    sampledFrames: transitionFrames.length,
    cssBrandRows,
    cssBrandVoxels,
    cssVoxelTargets,
    sourceFrameMarkers,
    samples: transitionFrames,
  }, null, 2)}\n`);
  expect(transitionFrames.length, 'transition shape should be sampled across consecutive rendered frames').toBeGreaterThanOrEqual(25);
  expect(closestFrame(260).logoScale, 'source mark remains full size through frame 044').toBeGreaterThan(0.98);
  expect(closestFrame(285).logoScale, 'source mark is about half size at frame 045').toBeGreaterThan(0.3);
  expect(closestFrame(285).logoScale, 'source mark is about half size at frame 045').toBeLessThan(0.75);
  expect(closestFrame(335).logoScale, 'source mark quickly reaches a tiny size by frame 048').toBeLessThan(0.1);
  expect(closestFrame(402).logoOpacity, 'tiny source mark stays visible through frame 052').toBeGreaterThan(0.9);
  expect(closestFrame(420).logoOpacity, 'source mark disappears as the circular reveal starts').toBe(0);
  expect(closestFrame(420).revealRadiusPercent, 'circular reveal starts near zero radius').toBeLessThan(10);
  expect(closestFrame(552).revealRadiusPercent, 'Level 2 panel fills the screen by source frame 061').toBeGreaterThan(150);
  await expect(page.locator('#live-status')).toHaveText('第 2 关开始', { timeout: 2_000 });
});

test('Level 2 三色进度按原片交叠，关键帧与转场逐帧核对', async ({ page }, testInfo) => {
  test.setTimeout(30_000);
  await completeLevelOne(page);
  await expect(page.locator('#live-status')).toHaveText('第 2 关开始');

  await page.evaluate(() => {
    const canvas = document.querySelector('#game-canvas');
    window.__levelTwoBadgeHistory = [];
    window.__levelTwoGestureStarts = [];
    window.__levelTwoDropStatuses = [];
    window.__levelTwoStatusHistory = [];
    window.__levelTwoSourceFrameCaptures = {};
    const sourceVideo = document.querySelector('#level-two-source-gameplay-video');
    const sourceAudio = document.querySelector('#level-two-source-audio');
    window.__levelTwoAudioSamples = [];
    const sampleSourceAudio = () => {
      const transition = document.querySelector('#dialog-layer[data-transition-profile="level2-source"]');
      window.__levelTwoAudioSamples.push({
        at: performance.now(),
        videoTime: sourceVideo.currentTime,
        videoPaused: sourceVideo.paused,
        videoSeeking: sourceVideo.seeking,
        audioTime: sourceAudio.currentTime,
        audioPaused: sourceAudio.paused,
        audioSeeking: sourceAudio.seeking,
        audioMuted: sourceAudio.muted,
        inTransition: Boolean(transition),
      });
      requestAnimationFrame(sampleSourceAudio);
    };
    requestAnimationFrame(sampleSourceAudio);
    const frameCanvas = document.querySelector('#game-canvas');
    const playSourceVideo = sourceVideo.play.bind(sourceVideo);
    const alignedFrames = new Set([163, 229, 295, 331, 355, 391, 427, 457]);
    const captureSourceFrame = (now, metadata) => {
      const frame = Math.round(metadata.mediaTime * 60) + 1;
      if (alignedFrames.has(frame) && !window.__levelTwoSourceFrameCaptures[frame]) {
        const capture = {
          frame,
          mediaTime: metadata.mediaTime,
          presentedFrames: metadata.presentedFrames,
        };
        sourceVideo.pause();
        sourceVideo.play = () => Promise.resolve();
        requestAnimationFrame(() => {
          window.__levelTwoSourceFrameCaptures[frame] = {
            ...capture,
            capturedAt: performance.now(),
            canvasPng: frameCanvas.toDataURL('image/png'),
          };
          sourceVideo.play = playSourceVideo;
          void playSourceVideo().catch(() => {});
          sourceVideo.requestVideoFrameCallback(captureSourceFrame);
        });
        return;
      }
      sourceVideo.requestVideoFrameCallback(captureSourceFrame);
    };
    sourceVideo.requestVideoFrameCallback(captureSourceFrame);
    const liveStatus = document.querySelector('#live-status');
    new MutationObserver(() => {
      window.__levelTwoDropStatuses.push(liveStatus.textContent);
      window.__levelTwoStatusHistory.push({ at: performance.now(), status: liveStatus.textContent });
    })
      .observe(liveStatus, { childList: true, characterData: true, subtree: true });
    canvas.addEventListener('pointerdown', () => {
      window.__levelTwoGestureStarts.push(performance.now());
    }, true);
    const sampleProgress = () => {
      const at = performance.now();
      for (const color of ['green', 'red', 'yellow']) {
        window.__levelTwoBadgeHistory.push({
          frame: Math.round(at * 60 / 1_000),
          at,
          color,
          value: Number(canvas.dataset[`progress${color[0].toUpperCase()}${color.slice(1)}`]),
        });
      }
      requestAnimationFrame(sampleProgress);
    };
    requestAnimationFrame(sampleProgress);
  });

  const sourceFrameComparisons = [];
  const captureSourceAlignedFrame = async (frame, label) => {
    await page.waitForFunction((candidate) => Boolean(window.__levelTwoSourceFrameCaptures[candidate]), frame, {
      timeout: 5_000,
    });
    const browserState = await page.evaluate((candidate) => {
      const capture = window.__levelTwoSourceFrameCaptures[candidate];
      return {
        sourceFrame: capture.frame,
        presentedFrames: capture.presentedFrames,
        capturedAt: capture.capturedAt,
        badges: window.__levelTwoBadgeHistory.slice(-3),
        sourceWallTime: capture.mediaTime,
        canvasPng: capture.canvasPng,
      };
    }, frame);
    const canvasPath = testInfo.outputPath(`level2-canvas-${label}-${Math.round(browserState.capturedAt)}.png`);
    await writeFile(canvasPath, Buffer.from(browserState.canvasPng.split(',')[1], 'base64'));
    const checkpoint = levelTwoCollectionSource.checkpoints.find(({ frame: candidate }) => candidate === frame);
    const comparison = {
      sourceFrame: frame,
      capturedFrame: browserState.sourceFrame,
      sourceTimeSeconds: checkpoint?.timeSeconds,
      label,
      browserCapturedAt: browserState.capturedAt,
      badgesBeforeScreenshot: browserState.badges,
      sourceWallTime: browserState.sourceWallTime,
      canvasPath,
    };
    sourceFrameComparisons.push(comparison);
    return comparison;
  };
  const waitUntilPageTime = async (targetAt) => {
    const delay = await page.evaluate((target) => target - performance.now(), targetAt);
    if (delay > 0) await page.waitForTimeout(delay);
  };

  // The source red tray reaches x347/y533 in about 0.1 s, then fills in place.
  // Keep the movement and the subsequent wait as separate real pointer phases.
  await dragThroughAt60Hz(page, 450, 750, [{ x: 450, y: 550, durationMs: 100 }]);
  const redGestureStartedAt = await page.evaluate(() => window.__levelTwoGestureStarts[0]);
  await expect.poll(() => page.locator('#level-two-source-audio').evaluate((audio) => (
    !audio.paused && !audio.muted && audio.currentTime > 0.1
  )), { message: 'the original Level 2 mixed track should unlock and follow the first valid red gesture' })
    .toBeTruthy();
  await waitUntilPageTime(redGestureStartedAt + 2_375);

  // Green rises to the source y493 position shown at its first collection frame.
  await dragThroughAt60Hz(page, 100, 750, [{ x: 100, y: 510, durationMs: 100 }]);
  const greenGestureStartedAt = await page.evaluate(() => window.__levelTwoGestureStarts[1]);
  await captureSourceAlignedFrame(163, 'source-frame-0163-green-start-red-83');
  await waitUntilPageTime(greenGestureStartedAt + 1_200);
  await expect(page.locator('#live-status')).toContainText('绿色 100%', { timeout: 1_000 });
  await captureSourceAlignedFrame(229, 'source-frame-0229-green-100-red-93');

  // Yellow begins moving at about 14.0 s and reaches the wall by frame 0295;
  // its first nonzero badge arrives at 15.0 s.
  const yellowStartTime = redGestureStartedAt + 4_263;
  const timeBeforeYellow = await page.evaluate((target) => target - performance.now(), yellowStartTime);
  if (timeBeforeYellow > 0) await page.waitForTimeout(timeBeforeYellow);
  await expect(page.locator('#live-status')).toContainText('红色 95%', { timeout: 500 });

  const yellowStart = await pointOnCanvas(page, 300, 875);
  const yellowTop = await pointOnCanvas(page, 199, 564);
  const yellowRegrab = await pointOnCanvas(page, 199, 580);
  const yellowRight = await pointOnCanvas(page, 399, 580);
  await page.evaluate(() => {
    window.__levelTwoTransitionFrames = [];
    const dialogLayer = document.querySelector('#dialog-layer');
    window.__levelTwoTransitionObservation = {
      pendingAt: Number.NaN,
      startedAt: Number.NaN,
      profile: null,
      previewSrc: null,
      overlaySeen: false,
      animationDurationMs: Number.NaN,
    };
    const observeTransition = () => {
      const observation = window.__levelTwoTransitionObservation;
      const pendingAt = Number(dialogLayer.dataset.transitionPendingStartedAt);
      const startedAt = Number(dialogLayer.dataset.transitionStartedAt);
      if (Number.isFinite(pendingAt)) observation.pendingAt = pendingAt;
      if (Number.isFinite(startedAt)) observation.startedAt = startedAt;
      if (dialogLayer.dataset.transitionProfile === 'level2-source') {
        observation.profile = dialogLayer.dataset.transitionProfile;
        observation.previewSrc = dialogLayer.querySelector('.transition-next-preview img')?.getAttribute('src') ?? null;
        observation.overlaySeen ||= !dialogLayer.hidden && dialogLayer.classList.contains('transition-overlay');
      }
    };
    new MutationObserver(observeTransition).observe(dialogLayer, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    observeTransition();
    let transitionStartedAt = Number.NaN;
    const sample = () => {
      const overlay = document.querySelector('#dialog-layer[data-transition-profile="level2-source"]');
      const brand = overlay?.querySelector('.transition-brand');
      const preview = overlay?.querySelector('.transition-next-preview');
      const animation = brand?.getAnimations().find(({ animationName }) => animationName === 'transition-level-two-brand');
      const elapsedMs = Number(animation?.currentTime);
      const dataStartedAt = Number(overlay?.dataset.transitionStartedAt);
      if (Number.isFinite(dataStartedAt)) {
        transitionStartedAt = dataStartedAt;
        window.__levelTwoTransitionObservation.startedAt = dataStartedAt;
      }
      if (brand && preview && Number.isFinite(elapsedMs)) {
        window.__levelTwoTransitionObservation.overlaySeen ||= !overlay.hidden
          && overlay.classList.contains('transition-overlay');
        window.__levelTwoTransitionObservation.profile = overlay.dataset.transitionProfile;
        window.__levelTwoTransitionObservation.previewSrc = preview.querySelector('img')?.getAttribute('src') ?? null;
        const duration = Number.parseFloat(getComputedStyle(brand).animationDuration);
        window.__levelTwoTransitionObservation.animationDurationMs = getComputedStyle(brand).animationDuration.endsWith('ms')
          ? duration
          : duration * 1_000;
        const brandStyle = getComputedStyle(brand);
        const transform = new DOMMatrixReadOnly(brandStyle.transform);
        const radius = /circle\(([\d.]+)(%|px)/u.exec(getComputedStyle(preview).clipPath);
        window.__levelTwoTransitionFrames.push({
          elapsedMs,
          logoScale: Math.hypot(transform.a, transform.b),
          logoOpacity: Number(brandStyle.opacity),
          revealRadiusPercent: radius?.[2] === '%'
            ? Number(radius[1])
            : radius ? (Number(radius[1]) / (Math.hypot(innerWidth, innerHeight) / Math.SQRT2)) * 100 : 0,
        });
      }
      if (Number.isFinite(transitionStartedAt) && performance.now() - transitionStartedAt >= 1_210) return;
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  const moveLeg = async (from, to, durationMs) => {
    const steps = Math.max(1, Math.round(durationMs / (1_000 / 60)));
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
  };
  await page.mouse.move(yellowStart.x, yellowStart.y);
  await page.mouse.down();
  const yellowGestureStartedAt = await page.evaluate(() => window.__levelTwoGestureStarts[2]);
  await moveLeg(yellowStart, yellowTop, 400);
  await captureSourceAlignedFrame(295, 'source-frame-0295-yellow-at-wall-red-95');
  await page.mouse.up();
  await waitUntilPageTime(yellowGestureStartedAt + 1_000);
  await captureSourceAlignedFrame(331, 'source-frame-0331-yellow-32');
  await waitUntilPageTime(yellowGestureStartedAt + 1_400);
  await expect.poll(() => page.locator('#game-canvas').evaluate((canvas) => (
    Number(canvas.dataset.progressRed)
  ))).toBe(100);
  await expect.poll(() => page.locator('#game-canvas').evaluate((canvas) => (
    Number(canvas.dataset.progressYellow)
  ))).toBeGreaterThanOrEqual(73);
  await captureSourceAlignedFrame(355, 'source-frame-0355-red-100-yellow-73');

  await waitUntilPageTime(yellowGestureStartedAt + 1_900);
  await captureSourceAlignedFrame(391, 'source-frame-0391-yellow-resting-left');
  await page.mouse.move(yellowRegrab.x, yellowRegrab.y);
  await page.mouse.down();
  await moveLeg(yellowRegrab, yellowRight, 600);
  await captureSourceAlignedFrame(427, 'source-frame-0427-yellow-moving-right');
  await page.mouse.up();
  const yellowDropStatuses = await page.evaluate(() => window.__levelTwoDropStatuses);
  expect(yellowDropStatuses.some((status) => status.includes('没有收集到黄色')),
    'the yellow re-drag to the right source dock must be accepted').toBe(false);
  await waitUntilPageTime(yellowGestureStartedAt + 3_100);
  await captureSourceAlignedFrame(457, 'source-frame-0457-yellow-100');
  await expect(page.locator('#live-status')).toContainText('100%', { timeout: 500 });
  await page.waitForFunction(() => Number.isFinite(window.__levelTwoTransitionObservation.startedAt), null, {
    timeout: 3_000,
  });
  await page.waitForFunction(() => window.__levelTwoTransitionFrames?.some(({ elapsedMs }) => elapsedMs >= 1_150), null, {
    timeout: 3_000,
  });
  const transitionObservation = await page.evaluate(() => window.__levelTwoTransitionObservation);
  const transitionFrames = await page.evaluate(() => window.__levelTwoTransitionFrames);
  const pendingAt = transitionObservation.pendingAt;
  const transitionStartedAt = transitionObservation.startedAt;
  const animationDurationMs = transitionObservation.animationDurationMs;
  expect(Number.isFinite(pendingAt), 'Level 2 win should begin its source-matched settle interval').toBeTruthy();
  expect(transitionObservation.overlaySeen, 'the source-matched transition overlay should be seen during playback').toBeTruthy();
  expect(transitionObservation.profile).toBe('level2-source');
  expect(transitionObservation.previewSrc).toBe('/assets/transitions/level-3-opening.png');
  expect(Number.isFinite(transitionStartedAt), 'transition start should be captured from its live DOM timestamp').toBeTruthy();
  expect(transitionStartedAt - pendingAt, 'source logo first appears about 0.9 seconds after the final pixel is collected')
    .toBeGreaterThanOrEqual(875);
  expect(transitionStartedAt - pendingAt).toBeLessThanOrEqual(975);
  expect(animationDurationMs, 'Level 2 source logo grow/hold/shrink/reveal duration').toBe(1_200);

  const progressHistory = await page.evaluate(() => window.__levelTwoBadgeHistory);
  const gestureStarts = await page.evaluate(() => window.__levelTwoGestureStarts);
  expect(gestureStarts, 'real pointer-down gestures should start the three fills and yellow re-drag')
    .toHaveLength(4);
  const sourceStartTime = {
    red: levelTwoCollectionSource.frameTimeOriginSeconds
      + ((levelTwoCollectionSource.dragStarts.redFrame - 1) / levelTwoCollectionSource.fps),
    green: levelTwoCollectionSource.frameTimeOriginSeconds
      + ((levelTwoCollectionSource.dragStarts.greenFrame - 1) / levelTwoCollectionSource.fps),
    yellow: levelTwoCollectionSource.frameTimeOriginSeconds
      + ((levelTwoCollectionSource.dragStarts.yellowFrame - 1) / levelTwoCollectionSource.fps),
  };
  const gestureStart = { red: gestureStarts[0], green: gestureStarts[1], yellow: gestureStarts[2] };
  const progressComparisons = [];
  for (const checkpoint of levelTwoCollectionSource.checkpoints) {
    const targetElapsedMs = {
      red: (checkpoint.timeSeconds - sourceStartTime.red) * 1_000,
      green: (checkpoint.timeSeconds - sourceStartTime.green) * 1_000,
      yellow: (checkpoint.timeSeconds - sourceStartTime.yellow) * 1_000,
    };
    for (const color of ['red', 'green', 'yellow']) {
      if (checkpoint[color] === undefined || targetElapsedMs[color] < 0) continue;
      if (checkpoint.visibleBuckets && !checkpoint.visibleBuckets.includes(color)) continue;
      const targetAt = gestureStart[color] + targetElapsedMs[color];
      const actual = progressHistory.reduce((best, group) => {
        const entry = group.color === color ? group : null;
        if (!entry) return best;
        return !best || Math.abs(entry.at - targetAt) < Math.abs(best.at - targetAt) ? entry : best;
      }, null);
      if (!actual) continue;
      const elapsedErrorMs = Math.abs(actual.at - targetAt);
      const comparison = {
        sourceFrame: checkpoint.frame,
        sourceTimeSeconds: checkpoint.timeSeconds,
        color,
        expected: checkpoint[color],
        actual: actual.value,
        elapsedErrorMs,
        progressError: Math.abs(actual.value - checkpoint[color]),
      };
      progressComparisons.push(comparison);
    }
  }
  const panelRoi = { left: 17, top: 310, width: 563, height: 666 };
  const levelTwoFrameEvidenceDirectory = fileURLToPath(new URL(
    '../.research/events/level2-real-input-frame-audit',
    import.meta.url,
  ));
  await mkdir(levelTwoFrameEvidenceDirectory, { recursive: true });
  for (const comparison of sourceFrameComparisons) {
    const sourceTime = levelTwoCollectionSource.frameTimeOriginSeconds + comparison.sourceWallTime;
    const comparedFrame = Math.round(
      (sourceTime - levelTwoCollectionSource.frameTimeOriginSeconds) * levelTwoCollectionSource.fps,
    ) + 1;
    expect(comparison.capturedFrame, `video frame callback should capture source frame ${comparison.sourceFrame}`)
      .toBe(comparison.sourceFrame);
    const sourcePath = fileURLToPath(new URL(
      `./fixtures/level2-source-frames/frame-${String(comparedFrame).padStart(4, '0')}.png`,
      import.meta.url,
    ));
    const source = await sharp(sourcePath).ensureAlpha().raw().toBuffer();
    const canvas = await sharp(comparison.canvasPath).extract(panelRoi).ensureAlpha().raw().toBuffer();
    const diffPixels = Buffer.alloc(canvas.length);
    const differentPixels = pixelmatch(source, canvas, diffPixels, panelRoi.width, panelRoi.height, {
      threshold: 0.12,
      includeAA: false,
    });
    const sourceWall = await sharp(sourcePath).extract({ left: 43, top: 34, width: 478, height: 176 }).ensureAlpha().raw().toBuffer();
    const canvasWall = await sharp(comparison.canvasPath).extract({ left: 60, top: 344, width: 478, height: 176 }).ensureAlpha().raw().toBuffer();
    const wallDifferentPixels = pixelmatch(sourceWall, canvasWall, Buffer.alloc(canvasWall.length), 478, 176, {
      threshold: 0.12,
      includeAA: false,
    });
    comparison.comparedFrame = comparedFrame;
    comparison.capturedSourceTime = sourceTime;
    comparison.timeOffsetMs = (sourceTime - comparison.sourceTimeSeconds) * 1_000;
    comparison.differentPixels = differentPixels;
    comparison.differentPixelRatio = differentPixels / (panelRoi.width * panelRoi.height);
    comparison.wallDifferentPixels = wallDifferentPixels;
    comparison.wallDifferentPixelRatio = wallDifferentPixels / (478 * 176);
    const frameLabel = `frame-${String(comparison.sourceFrame).padStart(4, '0')}`;
    const sourceEvidencePath = `${levelTwoFrameEvidenceDirectory}/${frameLabel}-source.png`;
    const browserEvidencePath = `${levelTwoFrameEvidenceDirectory}/${frameLabel}-browser.png`;
    const diffEvidencePath = `${levelTwoFrameEvidenceDirectory}/${frameLabel}-diff.png`;
    await copyFile(sourcePath, sourceEvidencePath);
    await sharp(comparison.canvasPath).extract(panelRoi).png().toFile(browserEvidencePath);
    await sharp(diffPixels, {
      raw: { width: panelRoi.width, height: panelRoi.height, channels: 4 },
    }).png().toFile(diffEvidencePath);
    comparison.evidence = {
      source: sourceEvidencePath,
      browser: browserEvidencePath,
      diff: diffEvidencePath,
    };
    delete comparison.canvasPath;
  }
  const levelTwoFrameAlignment = {
    source: levelTwoCollectionSource.source,
    sourceTimingReference: sourceStartTime,
    actualGestureStarts: gestureStart,
    progressComparisons,
    sourceFrameComparisons,
    sourceSamples: progressHistory,
  };
  const levelTwoFrameReport = `${JSON.stringify(levelTwoFrameAlignment, null, 2)}\n`;
  const testFrameReportPath = testInfo.outputPath('level2-collection-frame-comparison.json');
  await writeFile(testFrameReportPath, levelTwoFrameReport);
  await writeFile(`${levelTwoFrameEvidenceDirectory}/report.json`, levelTwoFrameReport);
  const contactLayers = [];
  for (const [index, comparison] of sourceFrameComparisons.entries()) {
    const row = Math.floor(index / 2);
    const column = index % 2;
    const left = column * panelRoi.width * 2;
    const top = row * panelRoi.height;
    contactLayers.push(
      { input: comparison.evidence.source, left, top },
      { input: comparison.evidence.browser, left: left + panelRoi.width, top },
    );
  }
  await sharp({
    create: {
      width: panelRoi.width * 4,
      height: panelRoi.height * 4,
      channels: 4,
      background: { r: 20, g: 25, b: 35, alpha: 1 },
    },
  }).composite(contactLayers).jpeg({ quality: 88 }).toFile(
    `${levelTwoFrameEvidenceDirectory}/source-browser-contact-sheet.jpg`,
  );
  await testInfo.attach('level2-collection-frame-comparison.json', {
    path: testFrameReportPath,
    contentType: 'application/json',
  });
  await testInfo.attach('level2-collection-frame-comparison.json', {
    body: Buffer.from(JSON.stringify({ progressComparisons, sourceFrameComparisons }, null, 2)),
    contentType: 'application/json',
  });
  console.log(`Level 2 source collection frames: ${JSON.stringify({ progressComparisons, sourceFrameComparisons })}`);
  for (const comparison of progressComparisons) {
    expect(comparison.elapsedErrorMs, `frame ${comparison.sourceFrame} ${comparison.color} capture time: ${JSON.stringify(comparison)}`)
      .toBeLessThanOrEqual(35);
    expect(comparison.progressError, `frame ${comparison.sourceFrame} ${comparison.color} badge: ${JSON.stringify(comparison)}`)
      .toBeLessThanOrEqual(2);
  }
  for (const comparison of sourceFrameComparisons) {
    expect(Math.abs(comparison.timeOffsetMs), `source frame ${comparison.sourceFrame} capture timing: ${JSON.stringify(comparison)}`)
      .toBeLessThan(1);
    expect(comparison.wallDifferentPixelRatio, `source frame ${comparison.sourceFrame} wall alignment: ${JSON.stringify(comparison)}`)
      .toBeLessThan(0.125);
    expect(comparison.differentPixelRatio, `source frame ${comparison.sourceFrame} panel alignment: ${JSON.stringify(comparison)}`)
      .toBeLessThan(0.06);
  }

  const closestFrame = (targetMs) => transitionFrames.reduce((closest, sample) => (
    Math.abs(sample.elapsedMs - targetMs) < Math.abs(closest.elapsedMs - targetMs) ? sample : closest
  ));
  const logoFrameComparisons = levelTwoTransitionSource.logoFrames.map((sourceFrame) => {
    const actual = closestFrame(sourceFrame.elapsedMs);
    return {
      sourceFrame: sourceFrame.frame,
      sourceTimeSeconds: sourceFrame.sourceTimeSeconds,
      targetElapsedMs: sourceFrame.elapsedMs,
      expectedScale: sourceFrame.scale,
      expectedOpacity: sourceFrame.visible ? 1 : 0,
      actual,
      elapsedErrorMs: Math.abs(actual.elapsedMs - sourceFrame.elapsedMs),
      scaleError: Math.abs(actual.logoScale - sourceFrame.scale),
      opacityError: Math.abs(actual.logoOpacity - (sourceFrame.visible ? 1 : 0)),
    };
  });
  const visibleLogoComparisons = logoFrameComparisons.filter(({ sourceFrame }) => sourceFrame < 576);
  const worstLogoFrameComparison = visibleLogoComparisons.reduce((worst, current) => (
    current.scaleError > worst.scaleError ? current : worst
  ));
  const maxFrameElapsedErrorMs = Math.max(...logoFrameComparisons.map(({ elapsedErrorMs }) => elapsedErrorMs));
  const maxLogoScaleError = Math.max(...visibleLogoComparisons.map(({ scaleError }) => scaleError));
  const maxLogoOpacityError = Math.max(...logoFrameComparisons.map(({ opacityError }) => opacityError));
  const revealFrameComparisons = levelTwoTransitionSource.revealFrames
    .filter(({ frame }) => frame <= 586)
    .map((sourceFrame) => {
      const actual = closestFrame(sourceFrame.elapsedMs);
      return {
        sourceFrame: sourceFrame.frame,
        sourceTimeSeconds: sourceFrame.sourceTimeSeconds,
        targetElapsedMs: sourceFrame.elapsedMs,
        expectedRadiusPercent: sourceFrame.radiusPercent,
        actual,
        radiusErrorPercent: Math.abs(actual.revealRadiusPercent - sourceFrame.radiusPercent),
      };
    });
  const maxRevealRadiusError = Math.max(...revealFrameComparisons.map(({ radiusErrorPercent }) => radiusErrorPercent));
  const worstRevealFrameComparison = revealFrameComparisons.reduce((worst, current) => (
    current.radiusErrorPercent > worst.radiusErrorPercent ? current : worst
  ));
  await writeFile(testInfo.outputPath('level2-transition-frame-probe.json'), `${JSON.stringify({
    sourceReference: 'continuous decoded frames 0517-0586 at 60 fps, source time 18.100-19.250 s',
    pendingAt,
    transitionStartedAt,
    settleDurationMs: transitionStartedAt - pendingAt,
    animationDurationMs,
    sampledFrames: transitionFrames.length,
    sourceLogoFrames: levelTwoTransitionSource.logoFrames.length,
    sourceRevealFrames: revealFrameComparisons.length,
    maxFrameElapsedErrorMs,
    maxLogoScaleError,
    maxLogoOpacityError,
    worstLogoFrame: {
      sourceFrame: worstLogoFrameComparison.sourceFrame,
      expectedScale: worstLogoFrameComparison.expectedScale,
      actualScale: worstLogoFrameComparison.actual.logoScale,
      scaleError: worstLogoFrameComparison.scaleError,
    },
    maxRevealRadiusError,
    worstRevealFrame: {
      sourceFrame: worstRevealFrameComparison.sourceFrame,
      expectedRadiusPercent: worstRevealFrameComparison.expectedRadiusPercent,
      actualRadiusPercent: worstRevealFrameComparison.actual.revealRadiusPercent,
      radiusErrorPercent: worstRevealFrameComparison.radiusErrorPercent,
    },
    logoFrameComparisons,
    revealFrameComparisons,
    samples: transitionFrames,
  }, null, 2)}\n`);
  console.log(`Level 2 source frame comparison: ${JSON.stringify({
    sampledFrames: transitionFrames.length,
    maxFrameElapsedErrorMs,
    maxLogoScaleError,
    maxLogoOpacityError,
    worstLogoFrame: {
      sourceFrame: worstLogoFrameComparison.sourceFrame,
      expectedScale: worstLogoFrameComparison.expectedScale,
      actualScale: worstLogoFrameComparison.actual.logoScale,
      scaleError: worstLogoFrameComparison.scaleError,
    },
    maxRevealRadiusError,
    worstRevealFrame: {
      sourceFrame: worstRevealFrameComparison.sourceFrame,
      expectedRadiusPercent: worstRevealFrameComparison.expectedRadiusPercent,
      actualRadiusPercent: worstRevealFrameComparison.actual.revealRadiusPercent,
      radiusErrorPercent: worstRevealFrameComparison.radiusErrorPercent,
    },
    logo: logoFrameComparisons.filter(({ sourceFrame }) => [517, 520, 529, 550, 562, 565, 568, 571, 574, 576].includes(sourceFrame)),
    reveal: revealFrameComparisons.filter(({ sourceFrame }) => [576, 578, 581, 582, 585, 586].includes(sourceFrame)),
  })}`);
  expect(transitionFrames.length, 'browser should capture the full source transition at display-frame cadence').toBeGreaterThanOrEqual(65);
  expect(maxFrameElapsedErrorMs, 'browser samples should stay within one 60 fps source frame').toBeLessThanOrEqual(17);
  expect(maxLogoScaleError, 'logo scale should follow each decoded source frame').toBeLessThanOrEqual(0.005);
  expect(maxLogoOpacityError, 'logo visibility should match every decoded source frame').toBeLessThanOrEqual(0.01);
  // CSS computed time and the 60 fps source time are quantized separately;
  // 0.12% keeps the tolerance below one viewport pixel while covering the
  // observed 0.103% sub-millisecond boundary error.
  expect(maxRevealRadiusError, 'circular reveal should follow every measured source frame').toBeLessThanOrEqual(0.12);
  await expect(page.locator('#live-status')).toHaveText('第 3 关开始', { timeout: 1_500 });
  const levelTwoAudioReport = await page.evaluate(() => {
    const samples = window.__levelTwoAudioSamples;
    const syncSamples = samples.filter((sample) => (
      sample.videoTime >= 0.35 && sample.videoTime <= 8.4
      && !sample.videoPaused && !sample.videoSeeking
      && !sample.audioPaused && !sample.audioSeeking && !sample.audioMuted
    ));
    const drifts = syncSamples.map(({ videoTime, audioTime }) => Math.abs(audioTime - videoTime) * 1_000)
      .sort((left, right) => left - right);
    const transitionSamples = samples.filter((sample) => (
      sample.inTransition && sample.audioTime >= 8.5 && !sample.audioPaused && !sample.audioMuted
    ));
    const audio = document.querySelector('#level-two-source-audio');
    return {
      pairedSampleCount: syncSamples.length,
      p95AbsoluteDriftMs: drifts[Math.min(drifts.length - 1, Math.floor(drifts.length * 0.95))] ?? null,
      maxAbsoluteDriftMs: drifts.at(-1) ?? null,
      transitionSampleCount: transitionSamples.length,
      lastTransitionAudioTime: transitionSamples.at(-1)?.audioTime ?? null,
      stoppedOnLevelThree: audio.paused && audio.muted && audio.currentTime === 0,
      samples,
    };
  });
  const audioReportPath = testInfo.outputPath('level2-source-audio-alignment.json');
  await writeFile(audioReportPath, `${JSON.stringify(levelTwoAudioReport, null, 2)}\n`);
  await testInfo.attach('level2-source-audio-alignment.json', {
    path: audioReportPath,
    contentType: 'application/json',
  });
  const evidenceDirectory = fileURLToPath(new URL('../.research/events/', import.meta.url));
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(`${evidenceDirectory}/level2-source-audio-alignment.json`, `${JSON.stringify(levelTwoAudioReport, null, 2)}\n`);
  console.log(`Level 2 source audio sync: ${levelTwoAudioReport.pairedSampleCount} paired samples, p95 ${levelTwoAudioReport.p95AbsoluteDriftMs.toFixed(1)} ms, max ${levelTwoAudioReport.maxAbsoluteDriftMs.toFixed(1)} ms, ${levelTwoAudioReport.transitionSampleCount} transition samples`);
  expect(levelTwoAudioReport.pairedSampleCount, 'source audio and video should have sustained paired playback samples').toBeGreaterThanOrEqual(300);
  expect(levelTwoAudioReport.maxAbsoluteDriftMs, 'source audio/video media clocks should remain within 80 ms')
    .toBeLessThanOrEqual(80);
  expect(levelTwoAudioReport.transitionSampleCount, 'the original mixed track should continue during the source transition')
    .toBeGreaterThanOrEqual(20);
  expect(levelTwoAudioReport.stoppedOnLevelThree, 'Level 2 source audio should stop and reset after transition to Level 3')
    .toBeTruthy();
  const transitionStatusAt = await page.evaluate(() => [...window.__levelTwoStatusHistory]
    .reverse().find(({ status }) => status === '第 3 关开始')?.at ?? Number.NaN);
  expect(Number.isFinite(transitionStatusAt), 'Level 3 status should be timestamped when the transition completes').toBeTruthy();
  const totalTransitionMs = transitionStatusAt - pendingAt;
  expect(totalTransitionMs, 'Level 2 source settle plus logo/reveal timing').toBeGreaterThanOrEqual(2_000);
  expect(totalTransitionMs).toBeLessThanOrEqual(2_250);
  await testInfo.attach('level2-transition-completion.json', {
    body: Buffer.from(JSON.stringify({ pendingAt, transitionStartedAt, transitionStatusAt, totalTransitionMs }, null, 2)),
    contentType: 'application/json',
  });
});

test('Level 2 原作混合音轨随设置暂停并从原位置续播', async ({ page }) => {
  test.setTimeout(20_000);
  await completeLevelOne(page);
  await dragThroughAt60Hz(page, 450, 750, [{ x: 450, y: 550, durationMs: 100 }]);
  const sourceAudio = page.locator('#level-two-source-audio');
  const sourceVideo = page.locator('#level-two-source-gameplay-video');
  await expect.poll(() => sourceAudio.evaluate((audio) => (
    !audio.paused && !audio.muted && audio.currentTime > 0.1
  ))).toBeTruthy();
  await expect.poll(() => sourceAudio.evaluate((audio) => audio.currentTime > 0.45)).toBeTruthy();

  const beforePause = await sourceAudio.evaluate((audio) => audio.currentTime);
  await page.getByRole('button', { name: '打开设置' }).click();
  await expect.poll(() => sourceAudio.evaluate((audio) => audio.paused && audio.muted)).toBeTruthy();
  await expect.poll(() => sourceVideo.evaluate((video) => video.paused)).toBeTruthy();
  const progressWhenPaused = Number(await page.locator('#game-canvas').getAttribute('data-progress-red'));
  await page.waitForTimeout(350);
  const pausedState = await sourceAudio.evaluate((audio) => ({ time: audio.currentTime, paused: audio.paused }));
  const progressDuringPause = Number(await page.locator('#game-canvas').getAttribute('data-progress-red'));
  expect(Math.abs(pausedState.time - beforePause), 'source audio should stop within one browser frame after settings opens')
    .toBeLessThanOrEqual(0.08);
  expect(progressDuringPause, 'red progress should freeze after the settings pause takes effect').toBe(progressWhenPaused);

  await page.getByRole('button', { name: '继续游戏' }).click();
  await expect.poll(() => sourceAudio.evaluate((audio, resumeFrom) => (
    !audio.paused && !audio.muted && audio.currentTime > resumeFrom + 0.15
  ), pausedState.time)).toBeTruthy();
  await expect.poll(() => sourceVideo.evaluate((video) => !video.paused)).toBeTruthy();
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

test('Level 8 洋红槽真实拖动后逐帧播放并对齐原作片段', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto('/?previewLevel=8');
  const sourceVideo = page.locator('#level-eight-source-gameplay-video');
  await expect.poll(() => sourceVideo.evaluate((video) => (
    video.readyState >= 2 && video.videoWidth === 541 && video.videoHeight === 695
  ))).toBe(true);

  await page.evaluate(() => {
    window.__levelEightSourcePlaybackFrames = [];
    window.__levelEightSourceFrameObserver = ({ mediaTime, presentedFrames }) => {
      const video = document.querySelector('#level-eight-source-gameplay-video');
      const gameCanvas = document.querySelector('#game-canvas');
      const renderedFrame = Math.max(0, Math.round(video.currentTime * 60) - 1);
      const audioElement = document.querySelector('#level-eight-source-audio');
      window.__levelEightSourcePlaybackFrames.push({
        frame: renderedFrame,
        mediaFrame: Math.max(0, Math.round(mediaTime * 60) - 1),
        videoTime: video.currentTime,
        canvasFrame: Number(gameCanvas.dataset.levelEightSourceFrame),
        mediaTime,
        presentedFrames,
        videoPlaying: !video.paused,
        audioPlaying: Boolean(audioElement && !audioElement.paused && !audioElement.muted),
        audioTime: audioElement?.currentTime ?? null,
      });
    };
  });
  await dragAt60Hz(page, 467, 798, 467, 724, 216);
  await expect.poll(async () => Number(await page.locator('#game-canvas').getAttribute('data-level-eight-source-frame')))
    .toBeGreaterThan(6);
  const sourceAudio = page.locator('#level-eight-source-audio');
  const audioDuringPlayback = await sourceAudio.evaluate((audioElement) => ({
    paused: audioElement.paused,
    muted: audioElement.muted,
    time: audioElement.currentTime,
  }));
  expect(audioDuringPlayback.paused, 'the original mixed audio should play during the recorded drag').toBe(false);
  expect(audioDuringPlayback.muted, 'the original mixed audio should remain audible when both sound settings are enabled').toBe(false);
  expect(await sourceVideo.evaluate((video) => video.paused), 'the original source video should be playing during the drag').toBe(false);

  const livePlaybackFrames = await page.evaluate(() => window.__levelEightSourcePlaybackFrames);
  const liveFrameIndices = [...new Set(livePlaybackFrames.filter(({ presentedFrames }) => presentedFrames > 0)
    .map(({ frame }) => frame))].sort((left, right) => left - right);
  expect(liveFrameIndices.length, 'a real upward drag should start the source-aligned playback').toBeGreaterThan(3);
  expect(livePlaybackFrames[0]?.frame, 'the source recording should draw its first gameplay frame').toBe(0);
  expect(livePlaybackFrames.some(({ audioPlaying }) => audioPlaying), 'the original mixed sound should accompany the rendered gameplay frames')
    .toBe(true);
  expect(livePlaybackFrames.some(({ audioPlaying, videoTime, audioTime }) => (
    audioPlaying && Math.abs(videoTime - audioTime) <= 0.1
  )), `the original sound and picture should align within 100 ms on a rendered frame: ${JSON.stringify(livePlaybackFrames)}`)
    .toBe(true);

  await page.locator('#settings-button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect.poll(() => sourceVideo.evaluate((video) => video.paused)).toBe(true);
  await expect.poll(() => sourceAudio.evaluate((audioElement) => audioElement.paused))
    .toBe(true);
  await page.getByRole('button', { name: '继续游戏' }).click();
  await expect.poll(() => page.locator('#game-canvas').getAttribute('data-level-eight-source-held'), { timeout: 10_000 })
    .toBe('true');
  const firstClipEndState = await page.evaluate(() => {
    const video = document.querySelector('#level-eight-source-gameplay-video');
    const gameCanvas = document.querySelector('#game-canvas');
    return {
      duration: video.duration,
      currentTime: video.currentTime,
      seeking: video.seeking,
      readyState: video.readyState,
      frame: gameCanvas.dataset.levelEightSourceFrame,
    };
  });
  expect(firstClipEndState.frame, `the browser should present the final source frame: ${JSON.stringify(firstClipEndState)}`).toBe('142');
  const playbackFrames = await page.evaluate(() => window.__levelEightSourcePlaybackFrames);
  const frameAudit = await page.evaluate(() => {
    const frames = window.__levelEightSourcePlaybackFrames;
    const presentedFrames = frames.filter(({ presentedFrames: count }) => count > 0);
    const frameIndices = [...new Set(presentedFrames.map(({ frame }) => frame))].sort((left, right) => left - right);
    const frameIndexMismatches = presentedFrames.filter(({ frame, canvasFrame }) => frame !== canvasFrame);
    const pixelMismatches = presentedFrames.filter(({ differentPixels }) => differentPixels > 0);
    return {
      observedFrames: frames.length,
      uniquePresentedFrames: frameIndices.length,
      lastPresentedFrame: frameIndices.at(-1),
      maxFrameGap: frameIndices.slice(1).reduce((maximum, frame, index) => Math.max(maximum, frame - frameIndices[index]), 0),
      frameIndexMismatches: frameIndexMismatches.slice(0, 8),
      framesWithPixelDifferences: pixelMismatches.length,
      pixelMismatches: pixelMismatches.slice(0, 8),
      frames,
    };
  });
  const firstHeldFrameAudit = await page.evaluate(() => {
    const video = document.querySelector('#level-eight-source-gameplay-video');
    const gameCanvas = document.querySelector('#game-canvas');
    const expectedCanvas = document.createElement('canvas');
    expectedCanvas.width = 541;
    expectedCanvas.height = 695;
    const expectedContext = expectedCanvas.getContext('2d');
    expectedContext.drawImage(video, 0, 0, 541, 695);
    const expected = expectedContext.getImageData(0, 0, 541, 695).data;
    const actual = gameCanvas.getContext('2d').getImageData(27, 280, 541, 695).data;
    let maxChannelError = 0;
    let totalAbsoluteChannelError = 0;
    let channelsOverOne = 0;
    for (let offset = 0; offset < expected.length; offset += 4) {
      for (let channel = 0; channel < 3; channel += 1) {
        const error = Math.abs(expected[offset + channel] - actual[offset + channel]);
        maxChannelError = Math.max(maxChannelError, error);
        totalAbsoluteChannelError += error;
        if (error > 1) channelsOverOne += 1;
      }
    }
    return {
      sourceTime: video.currentTime,
      duration: video.duration,
      frame: Number(gameCanvas.dataset.levelEightSourceFrame),
      maxChannelError,
      meanAbsoluteChannelError: totalAbsoluteChannelError / (expected.length / 4 * 3),
      channelsOverOne,
    };
  });
  await testInfo.attach('level8-first-magenta-frame-audit.json', {
    body: Buffer.from(JSON.stringify({ playbackFrames, frameAudit, firstHeldFrameAudit }, null, 2)),
    contentType: 'application/json',
  });
  expect(frameAudit.uniquePresentedFrames, 'the real drag should render a continuous run of original source frames').toBeGreaterThanOrEqual(40);
  expect(frameAudit.lastPresentedFrame, 'the browser should present the end of the original first clip').toBeGreaterThanOrEqual(138);
  expect(frameAudit.maxFrameGap, 'the rendered source playback must not stall across multiple frames').toBeLessThanOrEqual(3);
  expect(frameAudit.frameIndexMismatches, 'each presented callback should agree with the source frame actually rendered')
    .toEqual([]);
  // Per-callback pixel reads can race the decoder advancing to the next frame;
  // retain their diagnostics and use the paused final-frame compare below for a stable pixel assertion.
  expect(firstHeldFrameAudit.frame, 'the held frame metadata should identify the source end').toBe(142);
  expect(firstHeldFrameAudit.maxChannelError, 'the frozen first-clip frame should differ by at most one RGB level')
    .toBeLessThanOrEqual(1);
  expect(firstHeldFrameAudit.channelsOverOne, 'the frozen first-clip frame should have no channels over one RGB level apart')
    .toBe(0);
  await expect(page.locator('#game-canvas')).toHaveAttribute('data-progress-magenta-top', '100');
  await expect(page.locator('#live-status')).toContainText('洋红色像素');

  const secondVideo = page.locator('#level-eight-second-yellow-video');
  await expect.poll(() => secondVideo.evaluate((video) => (
    video.readyState >= 2 && video.videoWidth === 541 && video.videoHeight === 695
  ))).toBe(true);
  const secondAudio = page.locator('#level-eight-second-yellow-audio');
  await expect.poll(() => secondAudio.evaluate((audioElement) => audioElement.readyState >= 2), {
    timeout: 2_000,
  }).toBe(true);
  await page.evaluate(() => {
    window.__levelEightSourcePlaybackFrames = [];
    window.__levelEightSourceFrameObserver = ({ mediaTime, presentedFrames, clipId }) => {
      const video = document.querySelector('#level-eight-second-yellow-video');
      const gameCanvas = document.querySelector('#game-canvas');
      const renderedFrame = Math.max(0, Math.round(video.currentTime * 60) - 1);
      const audioElement = document.querySelector('#level-eight-second-yellow-audio');
      window.__levelEightSourcePlaybackFrames.push({
        clipId,
        frame: renderedFrame,
        mediaFrame: Math.max(0, Math.round(mediaTime * 60) - 1),
        videoTime: video.currentTime,
        mediaTime,
        presentedFrames,
        canvasFrame: Number(gameCanvas.dataset.levelEightSourceFrame),
        videoPlaying: !video.paused,
        audioPlaying: Boolean(audioElement && !audioElement.paused && !audioElement.muted),
        audioTime: audioElement?.currentTime ?? null,
      });
    };
  });
  await dragAt60Hz(page, 297, 750, 297, 690, 100);
  await expect.poll(() => page.locator('#game-canvas').getAttribute('data-level-eight-source-clip'))
    .toBe('second-yellow');
  await expect.poll(async () => Number(await page.locator('#game-canvas').getAttribute('data-level-eight-source-frame')))
    .toBeGreaterThan(2);
  await expect.poll(() => secondAudio.evaluate((audioElement) => (
    !audioElement.paused && !audioElement.muted && audioElement.currentTime > 0
  )), { timeout: 700, intervals: [20, 40, 60, 100] }).toBe(true);
  const liveSecondPlayback = await page.evaluate(() => {
    const video = document.querySelector('#level-eight-second-yellow-video');
    const audioElement = document.querySelector('#level-eight-second-yellow-audio');
    return {
      videoPaused: video.paused,
      audioPaused: audioElement.paused,
      audioMuted: audioElement.muted,
      videoTime: video.currentTime,
      audioTime: audioElement.currentTime,
    };
  });
  expect(liveSecondPlayback.videoPaused, 'the yellow source video must still be playing before the pause check').toBe(false);
  expect(liveSecondPlayback.audioPaused, 'the original yellow-move audio must play before the pause check').toBe(false);
  expect(liveSecondPlayback.audioMuted, 'the original yellow-move audio must remain enabled').toBe(false);
  expect(Math.abs(liveSecondPlayback.videoTime - liveSecondPlayback.audioTime),
    `the live yellow picture and original audio must align: ${JSON.stringify(liveSecondPlayback)}`).toBeLessThanOrEqual(0.1);

  await page.locator('#settings-button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect.poll(() => secondVideo.evaluate((video) => video.paused)).toBe(true);
  await expect.poll(() => secondAudio.evaluate((audioElement) => audioElement.paused)).toBe(true);
  await page.getByRole('button', { name: '继续游戏' }).click();
  await expect.poll(() => page.locator('#game-canvas').getAttribute('data-level-eight-source-held'), { timeout: 10_000 })
    .toBe('true');
  await expect(page.locator('#game-canvas')).toHaveAttribute('data-level-eight-source-frame', '94');
  const secondPlaybackFrames = await page.evaluate(() => window.__levelEightSourcePlaybackFrames);
  const secondAudioPlayingFrames = secondPlaybackFrames.filter(({ frame, audioPlaying }) => frame > 0 && frame < 94 && audioPlaying);
  expect(secondAudioPlayingFrames.length,
    `the original yellow-move audio must be audible during a presented source frame: ${JSON.stringify(secondPlaybackFrames)}`)
    .toBeGreaterThan(0);
  expect(secondAudioPlayingFrames.some(({ mediaTime, audioTime }) => Math.abs(mediaTime - audioTime) <= 0.1),
    `the original yellow-move audio and video must align within 100 ms: ${JSON.stringify(secondAudioPlayingFrames)}`)
    .toBe(true);
  const presentedSecondFrames = secondPlaybackFrames.filter(({ presentedFrames }) => presentedFrames > 0);
  const secondFrameIndices = [...new Set(presentedSecondFrames.map(({ frame }) => frame))].sort((left, right) => left - right);
  const stableSecondFrameIndices = secondFrameIndices.filter((frame) => frame >= 15);
  expect(secondPlaybackFrames.every(({ clipId }) => clipId === 'second-yellow')).toBe(true);
  expect(secondPlaybackFrames[0]?.frame, 'the yellow source recording should paint its first frame before playback').toBe(0);
  expect(secondFrameIndices.length, 'the yellow source should deliver actual browser video-frame callbacks').toBeGreaterThan(8);
  for (let index = 1; index < stableSecondFrameIndices.length; index += 1) {
    expect(stableSecondFrameIndices[index] - stableSecondFrameIndices[index - 1], 'yellow playback must remain continuous after decoder warmup')
      .toBeLessThanOrEqual(3);
  }
  const secondFrameAudit = await page.evaluate(() => {
    const frames = window.__levelEightSourcePlaybackFrames;
    const presentedFrames = frames.filter(({ presentedFrames: count }) => count > 0);
    const frameIndices = [...new Set(presentedFrames.map(({ frame }) => frame))].sort((left, right) => left - right);
    const frameIndexMismatches = presentedFrames.filter(({ frame, canvasFrame }) => frame !== canvasFrame);
    const differentFrames = presentedFrames.filter(({ differentPixels }) => differentPixels > 0);
    return {
      observedDraws: frames.length,
      uniquePresentedFrames: frameIndices.length,
      firstPresentedFrame: frameIndices[0],
      lastPresentedFrame: frameIndices.at(-1),
      maxFrameGap: frameIndices.slice(1).reduce((maximum, frame, index) => Math.max(maximum, frame - frameIndices[index]), 0),
      framesWithPixelDifferences: differentFrames.length,
      differentFrames: differentFrames.slice(0, 8),
      frameIndexMismatches: frameIndexMismatches.slice(0, 8),
      firstDrawnFrame: frames[0]?.frame,
      frames,
    };
  });
  const finalHeldFrameAudit = await page.evaluate(() => {
    const video = document.querySelector('#level-eight-second-yellow-video');
    const gameCanvas = document.querySelector('#game-canvas');
    const expectedCanvas = document.createElement('canvas');
    expectedCanvas.width = 541;
    expectedCanvas.height = 695;
    const expectedContext = expectedCanvas.getContext('2d');
    expectedContext.drawImage(video, 0, 0, 541, 695);
    const expected = expectedContext.getImageData(0, 0, 541, 695).data;
    const actual = gameCanvas.getContext('2d').getImageData(27, 280, 541, 695).data;
    let maxChannelError = 0;
    let totalAbsoluteChannelError = 0;
    let channelsOverOne = 0;
    for (let offset = 0; offset < expected.length; offset += 4) {
      for (let channel = 0; channel < 3; channel += 1) {
        const error = Math.abs(expected[offset + channel] - actual[offset + channel]);
        maxChannelError = Math.max(maxChannelError, error);
        totalAbsoluteChannelError += error;
        if (error > 1) channelsOverOne += 1;
      }
    }
    return {
      sourceTime: video.currentTime,
      frame: Number(gameCanvas.dataset.levelEightSourceFrame),
      maxChannelError,
      meanAbsoluteChannelError: totalAbsoluteChannelError / (expected.length / 4 * 3),
      channelsOverOne,
    };
  });
  await testInfo.attach('level8-second-yellow-frame-audit.json', {
    body: Buffer.from(JSON.stringify({ secondPlaybackFrames, secondFrameAudit, finalHeldFrameAudit }, null, 2)),
    contentType: 'application/json',
  });
  expect(secondFrameAudit.uniquePresentedFrames, 'the browser should present a substantial sequence of the original yellow frames')
    .toBeGreaterThanOrEqual(40);
  expect(secondFrameAudit.firstDrawnFrame, 'the browser playback should draw the original first yellow frame').toBe(0);
  expect(secondFrameAudit.lastPresentedFrame, 'the browser playback should approach the final yellow frames').toBeGreaterThanOrEqual(90);
  expect(secondFrameAudit.maxFrameGap, 'the rendered source playback must not skip several frames at once').toBeLessThanOrEqual(3);
  expect(secondFrameAudit.frameIndexMismatches, 'each browser callback must draw the video frame identified by its current media time')
    .toEqual([]);
  // The offline source audit compares all 95 frames exactly; the stable final-frame compare below
  // checks the browser's held canvas output without racing a live decode callback.
  expect(finalHeldFrameAudit.frame, 'the frozen yellow frame should be the source end frame').toBe(94);
  expect(finalHeldFrameAudit.maxChannelError, 'the frozen yellow frame should differ by at most one RGB level')
    .toBeLessThanOrEqual(1);
  expect(finalHeldFrameAudit.channelsOverOne, 'the frozen yellow frame should have no channels over one RGB level apart')
    .toBe(0);

  await expect.poll(() => page.locator('#game-canvas').getAttribute('data-level-eight-source-held'), { timeout: 10_000 })
    .toBe('true');
  await expect(page.locator('#game-canvas')).toHaveAttribute('data-level-eight-source-clip', 'second-yellow');
  await expect(page.locator('#game-canvas')).toHaveAttribute('data-level-eight-source-frame', '94');
  await expect(page.locator('#game-canvas')).toHaveAttribute('data-progress-magenta-top', '100');
  await expect(page.locator('#game-canvas')).toHaveAttribute('data-progress-yellow-mid', '100');
  await expect.poll(() => page.locator('#game-canvas').getAttribute('data-level-eight-remaining-cells'))
    .toBe('1800');
  await expect(page.locator('#live-status')).toContainText('黄色像素');

  await dragAt60Hz(page, 130, 750, 130, 620, 300);
  await expect.poll(() => page.locator('#game-canvas').getAttribute('data-level-eight-source-held'))
    .toBe('false');
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

test('时间冻结、拆分锤与飞碟按道具规则响应点击', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
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
  const ufoReferenceVideo = page.locator('#level-thirteen-ufo-reference-video');
  await expect.poll(() => ufoReferenceVideo.evaluate((video) => video.readyState)).toBeGreaterThanOrEqual(2);
  await page.getByRole('button', { name: '使用飞碟道具' }).click();
  const yellowSlot = await pointOnCanvas(page, 100, 910);
  await page.mouse.click(yellowSlot.x, yellowSlot.y);
  await expect(page.locator('#live-status')).toContainText('飞碟正在填充黄色');

  const visualFrameAudit = [];
  const sourceProgressSteps = [
    [0, 0], [124, 9], [127, 12], [129, 16], [131, 19], [132, 25],
    [137, 29], [140, 36], [142, 39], [145, 42], [147, 46], [149, 50], [151, 52],
    [153, 56], [155, 59], [157, 63], [161, 69], [163, 72], [165, 76],
    [167, 30], [169, 82], [171, 86], [173, 89], [175, 92], [177, 97],
    [179, 99], [181, 100],
  ];
  const browserFrameAudit = await page.evaluate(async () => {
    const video = document.querySelector('#level-thirteen-ufo-reference-video');
    const canvas = document.querySelector('#game-canvas');
    const waitFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    video.pause();
    const audits = [];
    for (let sourceFrame = 38; sourceFrame <= 191; sourceFrame += 1) {
      const seeked = new Promise((resolve) => video.addEventListener('seeked', resolve, { once: true }));
      video.currentTime = (sourceFrame + 0.25) / 60;
      await seeked;
      await waitFrame();
      await waitFrame();
      for (let attempts = 0; attempts < 6; attempts += 1) {
        const renderedTime = Number(canvas.dataset.ufoVisualTime ?? '0');
        if (canvas.dataset.ufoVisualSource === 'recorded'
          && Math.abs(renderedTime - video.currentTime) <= 0.001) break;
        await waitFrame();
      }

      const ratio = canvas.width / 597;
      const width = Math.round(597 * ratio);
      const height = Math.round(705 * ratio);
      const actual = canvas.getContext('2d').getImageData(0, Math.round(165 * ratio), width, height).data;
      const referenceCanvas = document.createElement('canvas');
      referenceCanvas.width = width;
      referenceCanvas.height = height;
      const referenceContext = referenceCanvas.getContext('2d');
      referenceContext.imageSmoothingEnabled = false;
      referenceContext.drawImage(video, 0, 0, 597, 705, 0, 0, width, height);
      const expected = referenceContext.getImageData(0, 0, width, height).data;
      let differentPixels = 0;
      let totalChannelError = 0;
      for (let index = 0; index < actual.length; index += 4) {
        let maxChannelError = 0;
        for (let channel = 0; channel < 3; channel += 1) {
          const error = Math.abs(actual[index + channel] - expected[index + channel]);
          totalChannelError += error;
          maxChannelError = Math.max(maxChannelError, error);
        }
        if (maxChannelError > 1) differentPixels += 1;
      }
      audits.push({
        frameIndex: sourceFrame,
        sourceTimeSeconds: Number(video.currentTime.toFixed(4)),
        renderedSource: canvas.dataset.ufoVisualSource,
        renderedTimeSeconds: Number(canvas.dataset.ufoVisualTime ?? '0'),
        pixelsOverOneValueError: differentPixels,
        pixelCount: width * height,
        meanChannelError: Number((totalChannelError / (width * height * 3)).toFixed(4)),
        liveStatus: document.querySelector('#live-status').textContent,
      });
    }
    await video.play();
    return audits;
  });
  visualFrameAudit.push(...browserFrameAudit);
  await testInfo.attach('level13-ufo-source-frame-alignment.json', {
    body: Buffer.from(JSON.stringify(visualFrameAudit, null, 2)),
    contentType: 'application/json',
  });
  const alignmentEvidenceDirectory = fileURLToPath(new URL(
    '../.research/events/level13-ufo-60fps/browser/run-05/',
    import.meta.url,
  ));
  await mkdir(alignmentEvidenceDirectory, { recursive: true });
  await writeFile(`${alignmentEvidenceDirectory}/source-frame-alignment.json`,
    JSON.stringify(visualFrameAudit, null, 2));
  expect(visualFrameAudit.map(({ frameIndex }) => frameIndex), 'the browser audit must check every source frame from 0.633s through 3.183s')
    .toEqual(Array.from({ length: 154 }, (_, index) => index + 38));
  for (const comparison of visualFrameAudit) {
    expect(comparison.renderedSource, `source overlay should remain active on frame ${comparison.frameIndex}: ${JSON.stringify(comparison)}`)
      .toBe('recorded');
    expect(comparison.pixelsOverOneValueError, `UFO canvas differs by more than one RGB value on source frame ${comparison.frameIndex}: ${JSON.stringify(comparison)}`)
      .toBe(0);
    if (comparison.frameIndex === 90) {
      expect(comparison.liveStatus).toContain('进度 0%');
    } else if (comparison.frameIndex > 120) {
      const progress = Number(/进度 (\d+)%/.exec(comparison.liveStatus)?.[1]);
      let sourceProgress = sourceProgressSteps[0][1];
      for (const [frame, percent] of sourceProgressSteps) {
        if (frame > comparison.frameIndex) break;
        sourceProgress = percent;
      }
      expect(progress, `yellow-slot progress on source frame ${comparison.frameIndex} should match the hand-reviewed source label`)
        .toBeGreaterThanOrEqual(sourceProgress - 2);
      expect(progress, `yellow-slot progress on source frame ${comparison.frameIndex} should match the hand-reviewed source label`)
        .toBeLessThanOrEqual(sourceProgress + 2);
    }
  }
  expect(visualFrameAudit[visualFrameAudit.length - 1]?.liveStatus).toContain('进度 100%');
  await expect(page.locator('#live-status')).toContainText('飞碟已填充黄色');
  const originalCellColor = [...levelThirteenBoardPixels.data.subarray((6 * 474 + 6) * 4, (6 * 474 + 6) * 4 + 3)];
  const sourceWallPixel = await page.locator('#game-canvas').evaluate((canvas) => {
    const { data } = canvas.getContext('2d').getImageData(67, 203, 1, 1);
    return [...data].slice(0, 3);
  });
  expect(sourceWallPixel).toEqual(originalCellColor);
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
