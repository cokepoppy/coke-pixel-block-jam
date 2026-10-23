import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';
import { createGameState } from '../src/game.js';

const levelOneBoardPixels = await sharp(fileURLToPath(new URL('../assets/level1/level1-board.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelOneSettingsGearPixels = await sharp(fileURLToPath(new URL('../assets/level1/level1-settings-gear.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelOneOpeningPanelPixels = await sharp(fileURLToPath(new URL('../assets/level1/level1-opening-panel.png', import.meta.url)))
  .extract({ left: 0, top: 0, width: 563, height: 750 })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelOneSweepPixels = await sharp(fileURLToPath(new URL('../assets/level1/level1-board-sweep-6-top.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const levelOnePadPixels = await Promise.all(Array.from({ length: 4 }, (_, index) => sharp(
  fileURLToPath(new URL(`../assets/level1/level1-pad-cell-${index + 1}.png`, import.meta.url)),
).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
const levelOneYellowPilePixels = await sharp(fileURLToPath(new URL('../assets/level1/level1-yellow-pile-100.png', import.meta.url)))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
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
    const originalTranslate = prototype.translate;
    const originalScale = prototype.scale;
    const pendingTranslate = new WeakMap();
    prototype.translate = function translate(x, y) {
      if (this.canvas?.id === 'game-canvas' && x === 0 && y > 300 && y < 1_100) {
        pendingTranslate.set(this, { y, at: performance.now() });
      }
      return originalTranslate.call(this, x, y);
    };
    prototype.scale = function scale(x, y) {
      const pending = pendingTranslate.get(this);
      if (this.canvas?.id === 'game-canvas' && pending && x === 1 && y >= 1 && y < 1.1) {
        window.__pbjMotionProbe.bucketDraws.push({ at: performance.now(), y: pending.y });
        pendingTranslate.delete(this);
      }
      return originalScale.call(this, x, y);
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

async function expectLevelOnePanelFrame(page, assetName, { phoneHud = false, screenshot } = {}) {
  const pageShot = screenshot ?? await page.screenshot();
  const actual = await sharp(pageShot)
    .extract({ left: 17, top: 226, width: 563, height: 740 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sourcePath = fileURLToPath(new URL(`../assets/level1/keyframes/${assetName}.webp`, import.meta.url));
  const expected = await sharp(sourcePath)
    .extract({ left: 0, top: 0, width: 563, height: 740 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const expectedData = Buffer.from(expected.data);
  const actualData = Buffer.from(actual.data);
  if (phoneHud) {
    for (let y = 0; y < 740; y += 1) {
      for (let x = 0; x < 563; x += 1) {
        // Leave out the recorded iPhone HUD and its one-pixel antialias fringe.
        const dx = x - 33;
        const topDy = y - 171;
        const bottomDy = y - 325;
        const inHudMask = (y >= 170 && y <= 326 && x <= 67)
          || dx * dx + topDy * topDy <= 34 * 34
          || dx * dx + bottomDy * bottomDy <= 34 * 34;
        if (!inHudMask) continue;
        const offset = (y * 563 + x) * 4;
        expectedData.fill(0, offset, offset + 4);
        actualData.fill(0, offset, offset + 4);
      }
    }
  }
  const diff = pixelmatch(expectedData, actualData, Buffer.alloc(actualData.length), 563, 740, {
    threshold: 0.16,
    includeAA: false,
  });
  expect(diff, `${assetName} panel differs${phoneHud ? ' outside the recorded iPhone HUD' : ''} at ${diff} pixels`).toBe(0);
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

test('Level 1 教程手势按录屏轨迹循环播放', async ({ page }) => {
  const tutorialVideo = page.locator('#level-one-tutorial-video');
  await expect.poll(() => tutorialVideo.evaluate((video) => (
    video.currentSrc.endsWith('/assets/level1/level1-tutorial-hand.mp4')
      && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      && !video.paused
  ))).toBeTruthy();
  const first = await page.screenshot();
  await page.waitForTimeout(180);
  const second = await page.screenshot();
  const before = await sharp(first).extract({ left: 260, top: 600, width: 190, height: 210 }).ensureAlpha().raw().toBuffer();
  const after = await sharp(second).extract({ left: 260, top: 600, width: 190, height: 210 }).ensureAlpha().raw().toBuffer();
  const changed = pixelmatch(before, after, Buffer.alloc(before.length), 190, 210, { threshold: 0.16, includeAA: false });
  expect(changed, 'Level 1 source hand should move through the tutorial pad').toBeGreaterThan(1_000);
});

test('Level 1 黄色槽按真实指针节奏连续上移，扫墙从对应源帧接上', async ({ page }, testInfo) => {
  await installLevelOneMotionProbe(page);
  await page.goto('/?previewLevel=1');
  await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', '拖动收集槽收集彩色像素方块');

  // Match the source move's roughly half-second travel from the tray to the wall.
  await dragAt60Hz(page, 298, 866, 298, 620, 640);
  await expect(page.locator('#live-status')).toContainText('进度 6%', { timeout: 1_500 });
  const screenshot = await page.screenshot({ path: testInfo.outputPath('level1-yellow-drag-in-progress.png') });
  await expectLevelOnePanelFrame(page, 'yellow-6', { screenshot });

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

test('Level 1 开局棋盘与录屏裁切逐像素一致', async ({ page }, testInfo) => {
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
    .extract({ left: 17, top: 226, width: 563, height: 750 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const panelDiff = pixelmatch(levelOneOpeningPanelPixels.data, panel.data, Buffer.alloc(panel.data.length), panel.info.width, panel.info.height, {
    threshold: 0.16,
    includeAA: false,
  });
  expect(panelDiff, `Level 1 opening panel differs at ${panelDiff} of ${panel.info.width * panel.info.height} pixels`).toBe(0);

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

test('Level 1 黄色墙面先飞散再入槽，关键进度贴近录屏', async ({ page }, testInfo) => {
  await page.evaluate(() => {
    const status = document.querySelector('#live-status');
    window.__levelOneProgressLog = [];
    const record = () => window.__levelOneProgressLog.push(status?.textContent ?? '');
    record();
    new MutationObserver(record).observe(status, { childList: true, characterData: true, subtree: true });
  });
  await drag(page, 298, 866, 298, 620);

  await expect(page.locator('#live-status')).toContainText('进度 6%', { timeout: 1_500 });
  const screenshot = await page.screenshot({ path: testInfo.outputPath('level1-yellow-sweep-6.png') });
  await expectLevelOnePanelFrame(page, 'yellow-6', { screenshot });
  const actual = await sharp(screenshot)
    .extract({ left: 61, top: 269, width: 474, height: 129 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const diff = pixelmatch(levelOneSweepPixels.data, actual.data, Buffer.alloc(actual.data.length), actual.info.width, actual.info.height, {
    threshold: 0.16,
    includeAA: false,
  });
  expect(diff / (actual.info.width * actual.info.height), `6% sweep board differs at ${diff} pixels`).toBeLessThan(0.12);

  for (const progress of [36, 63, 99, 100]) {
    await expect(page.locator('#live-status')).toContainText(`进度 ${progress}%`, { timeout: 1_000 });
    await expectLevelOnePanelFrame(page, `yellow-${progress}`);
  }
  const progressLog = await page.evaluate(() => window.__levelOneProgressLog);
  for (const progress of [36, 63, 99, 100]) {
    expect(progressLog.some((entry) => entry.includes(`进度 ${progress}%`)), `missing observed ${progress}% transition`).toBeTruthy();
  }
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
  await expectLevelOnePanelFrame(page, 'green-25', { phoneHud: true, screenshot: green25Screenshot });
  for (const progress of [48, 71, 85, 99, 100]) {
    await expect(page.locator('#live-status')).toContainText(`绿色 像素块，进度 ${progress}%`, { timeout: 1_000 });
    await expectLevelOnePanelFrame(page, `green-${progress}`, { phoneHud: progress <= 85 });
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
  await expectLevelOnePanelFrame(page, 'red-100');
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

test('Level 1 黄色槽满格纹理与录屏裁切近乎逐像素一致', async ({ page }) => {
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

  const screenshot = await page.screenshot();
  const actual = await sharp(screenshot)
    .extract({ left: 192, top: 520, width: 213, height: 210 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const diff = pixelmatch(levelOneYellowPilePixels.data, actual.data, Buffer.alloc(actual.data.length), actual.info.width, actual.info.height, {
    threshold: 0.16,
    includeAA: false,
  });
  expect(diff / (actual.info.width * actual.info.height), `Level 1 full bucket texture differs at ${diff} pixels`).toBeLessThan(0.01);
});

test('触屏点击设置并拖动收集槽可更新游戏进度', async ({ page }) => {
  await page.goto('/?previewLevel=1');
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, configuration: 'mobile' });

  await touchTap(session, await page.locator('#settings-button').boundingBox());
  const dialog = page.getByRole('dialog', { name: '游戏设置' });
  await expect(dialog).toBeVisible();
  await touchTap(session, await dialog.getByRole('button', { name: '继续游戏' }).boundingBox());
  await expect(dialog).toBeHidden();

  const from = await pointOnCanvas(page, 111, 866);
  const to = await pointOnCanvas(page, 111, 330);
  await dispatchTouch(session, 'touchStart', from);
  const touchStartedAt = Date.now();
  for (let step = 1; step <= 24; step += 1) {
    const dueAt = touchStartedAt + (step * 1_000) / 60;
    const delay = dueAt - Date.now();
    if (delay > 0) await page.waitForTimeout(delay);
    const t = step / 24;
    await dispatchTouch(session, 'touchMove', {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    });
  }
  await dispatchTouch(session, 'touchEnd', null);
  await expect(page.locator("#live-status")).toContainText(/已收集 \d+ 个绿色 像素块/);
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
