import { expect, test } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createGameState } from '../src/game.js';

test.use({ video: { mode: 'on', size: { width: 597, height: 1296 } } });

const evidenceDirectory = new URL('../.research/recordings/level2-full-flow/', import.meta.url);
const expectedLevelTwoOpeningPanel = await sharp(fileURLToPath(new URL(
  '../assets/level2/level2-opening-panel.png',
  import.meta.url,
))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

async function dragCanvasPath(page, from, to, durationMs = 400) {
  const canvas = page.locator('#game-canvas');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('游戏画布没有显示');
  const mapPoint = ({ x, y }) => ({
    x: bounds.x + (x / 597) * bounds.width,
    y: bounds.y + (y / 1296) * bounds.height,
  });
  const start = mapPoint(from);
  const end = mapPoint(to);
  const steps = Math.max(1, Math.round(durationMs / (1_000 / 60)));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const gestureStartedAt = Date.now();
  for (let step = 1; step <= steps; step += 1) {
    const dueAt = gestureStartedAt + (step / steps) * durationMs;
    const delay = dueAt - Date.now();
    if (delay > 0) await page.waitForTimeout(delay);
    await page.mouse.move(
      start.x + ((end.x - start.x) * step) / steps,
      start.y + ((end.y - start.y) * step) / steps,
    );
  }
  await page.mouse.up();
}

test('真实鼠标从 Level 1 进入 Level 2 并拖动三色通关，保存浏览器录屏', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const pageErrors = [];
  const observations = [];
  const visualChecks = {};
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const video = page.video();
  await mkdir(evidenceDirectory, { recursive: true });

  const progress = async () => page.locator('#game-canvas').evaluate((canvas) => ({
    green: Number(canvas.dataset.progressGreen),
    red: Number(canvas.dataset.progressRed),
    yellow: Number(canvas.dataset.progressYellow),
  }));
  const saveFrame = async (name) => {
    const screenshot = await page.screenshot({ path: testInfo.outputPath(`${name}.png`) });
    await writeFile(new URL(`${name}.png`, evidenceDirectory), screenshot);
    return screenshot;
  };

  await page.goto('/');
  await expect(page.locator('#live-status')).toHaveText('第 1 关开始');

  for (const [x, color] of [[298, '黄色'], [111, '绿色'], [485, '红色']]) {
    await dragCanvasPath(page, { x, y: 866 }, { x, y: 620 }, 400);
    await expect(page.locator('#live-status')).toContainText(`${color} 像素块，进度 100%`, { timeout: 8_000 });
  }
  await expect(page.locator('#live-status')).toHaveText('第 2 关开始', { timeout: 15_000 });
  await page.waitForTimeout(250);
  const levelTwoOpeningFrame = await saveFrame('level2-opening-after-level1-play');
  const actualLevelTwoOpeningPanel = await sharp(levelTwoOpeningFrame)
    .extract({ left: 17, top: 310, width: 563, height: 666 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const levelTwoOpeningDiffPixels = pixelmatch(
    expectedLevelTwoOpeningPanel.data,
    actualLevelTwoOpeningPanel.data,
    Buffer.alloc(actualLevelTwoOpeningPanel.data.length),
    563,
    666,
    { threshold: 0.16, includeAA: false },
  );
  expect(levelTwoOpeningDiffPixels, 'Level 2 opening panel after the real Level 1 transition')
    .toBe(0);
  visualChecks.levelTwoOpening = {
    crop: { left: 17, top: 310, width: 563, height: 666 },
    diffPixels: levelTwoOpeningDiffPixels,
    totalPixels: 563 * 666,
  };
  observations.push({
    checkpoint: 'first level completed using three visible mouse drags',
    status: await page.locator('#live-status').innerText(),
    progress: await progress(),
  });

  await dragCanvasPath(page, { x: 100, y: 750 }, { x: 100, y: 467 });
  await expect.poll(progress, { timeout: 8_000 }).toMatchObject({ green: 100, red: 0, yellow: 0 });
  const afterGreenFrame = await saveFrame('level2-after-green-drag');
  const redRegion = { left: 349, top: 344, width: 189, height: 176 };
  const [openingRed, afterGreenRed] = await Promise.all([levelTwoOpeningFrame, afterGreenFrame]
    .map((frame) => sharp(frame).extract(redRegion).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  const redRegionDiffPixels = pixelmatch(
    openingRed.data,
    afterGreenRed.data,
    Buffer.alloc(openingRed.data.length),
    redRegion.width,
    redRegion.height,
    { threshold: 0.12, includeAA: false },
  );
  expect(redRegionDiffPixels, 'green drag must leave the visible red wall region pixel-identical').toBe(0);

  const [openingPixels, greenPixels] = await Promise.all([levelTwoOpeningFrame, afterGreenFrame]
    .map((frame) => sharp(frame).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  const classifyVisibleCell = (pixels, cell) => {
    const offset = (Math.round(cell.y) * pixels.info.width + Math.round(cell.x)) * pixels.info.channels;
    const [red, green, blue] = pixels.data.subarray(offset, offset + 3);
    if (red > green * 1.35 && red > blue * 1.25) return 'red';
    if (red > 140 && green > 140 && blue < 140) return 'yellow';
    return 'other';
  };
  const unaffectedCellCenters = createGameState(2).grid.filter((cell) => cell && cell.color !== 'green');
  const changedNonGreenCells = unaffectedCellCenters.filter((cell) => (
    classifyVisibleCell(openingPixels, cell) !== classifyVisibleCell(greenPixels, cell)
  ));
  expect(changedNonGreenCells, 'green drag must not visually erase or recolor any red/yellow cell centers')
    .toEqual([]);
  visualChecks.greenDrag = {
    inactiveRedRegion: redRegion,
    redRegionDiffPixels,
    unchangedRedYellowCellCenterClassifications: unaffectedCellCenters.length,
  };
  observations.push({
    checkpoint: 'green slot dragged through the green wall area',
    status: await page.locator('#live-status').innerText(),
    progress: await progress(),
  });

  await dragCanvasPath(page, { x: 450, y: 750 }, { x: 450, y: 467 });
  await expect.poll(progress, { timeout: 8_000 }).toMatchObject({ green: 100, red: 100, yellow: 0 });
  await saveFrame('level2-after-red-drag');
  observations.push({
    checkpoint: 'red slot dragged through the red wall area',
    status: await page.locator('#live-status').innerText(),
    progress: await progress(),
  });

  await dragCanvasPath(page, { x: 300, y: 875 }, { x: 304, y: 494 });
  await expect.poll(progress, { timeout: 8_000 }).toMatchObject({ green: 100, red: 100, yellow: 100 });
  await saveFrame('level2-completed-before-transition');
  observations.push({
    checkpoint: 'yellow slot completed the board before the level transition',
    status: await page.locator('#live-status').innerText(),
    progress: await progress(),
  });

  await expect(page.locator('#live-status')).toHaveText('第 3 关开始', { timeout: 15_000 });
  await saveFrame('level3-reached');
  observations.push({
    checkpoint: 'yellow slot dragged through the yellow wall area and transition completed',
    status: await page.locator('#live-status').innerText(),
    progress: await progress(),
  });

  expect(pageErrors, 'all visible drag interactions must keep the game frame running').toEqual([]);
  await mkdir(evidenceDirectory, { recursive: true });
  await page.close();
  const rawVideoPath = await video.path();
  const savedVideoPath = new URL('level2-full-flow.webm', evidenceDirectory);
  await copyFile(rawVideoPath, savedVideoPath);
  await writeFile(new URL('report.json', evidenceDirectory), `${JSON.stringify({
    route: 'default game start; visible pointer input completes Level 1, then green -> red -> yellow Level 2 drags',
    viewport: { width: 597, height: 1296 },
    observations,
    visualChecks,
    pageErrors,
    video: savedVideoPath.pathname,
  }, null, 2)}\n`);
});
