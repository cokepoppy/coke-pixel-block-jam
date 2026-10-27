import { expect, test } from '@playwright/test';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { createGameState } from '../src/game.js';

test.use({ video: { mode: 'on', size: { width: 597, height: 1296 } } });

test('第二关槽位停在像素墙下沿，并可通过实际拖动收集和通关', async ({ page }) => {
  test.setTimeout(60_000);
  const directory = new URL('../.research/recordings/level2-boundary/', import.meta.url);
  await mkdir(directory, { recursive: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const video = page.video();
  await page.goto('/?previewLevel=2');
  const canvas = page.locator('#game-canvas');
  await expect(page.locator('#live-status')).toHaveText('第 2 关开始');
  const bounds = await canvas.boundingBox();
  const point = (x, y) => ({ x: bounds.x + x * bounds.width / 597, y: bounds.y + y * bounds.height / 1296 });
  const progress = () => canvas.evaluate(el => ({
    green: Number(el.dataset.progressGreen), red: Number(el.dataset.progressRed), yellow: Number(el.dataset.progressYellow),
  }));
  await page.evaluate(() => {
    window.__levelTwoBoundarySamples = [];
    const sample = () => {
      const el = document.querySelector('#game-canvas');
      if (el.dataset.levelTwoBuckets) window.__levelTwoBoundarySamples.push(JSON.parse(el.dataset.levelTwoBuckets));
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  const drag = async (from, to) => {
    const a = point(...from); const b = point(...to);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    for (let i = 1; i <= 30; i += 1) {
      await page.mouse.move(a.x + (b.x - a.x) * i / 30, a.y + (b.y - a.y) * i / 30);
      await page.waitForTimeout(12);
    }
    await page.mouse.up();
  };

  // A tray can be rearranged within the lower pad without collecting pixels.
  await drag([100, 750], [120, 700]);
  await expect.poll(async () => canvas.evaluate(el => JSON.parse(el.dataset.levelTwoBuckets).find(b => b.id === 'green').y)).toBeCloseTo(683, 0);
  expect(await progress()).toEqual({ green: 0, red: 0, yellow: 0 });
  await drag([120, 700], [100, 100]);
  await expect.poll(progress, { timeout: 6_000 }).toMatchObject({ green: 100, red: 0, yellow: 0 });
  await page.screenshot({ path: new URL('green-complete.png', directory).pathname });
  await drag([450, 750], [450, 100]);
  await expect.poll(progress, { timeout: 10_000 }).toMatchObject({ green: 100, red: 100, yellow: 0 });
  await page.waitForTimeout(1_500);
  const afterRed = await page.screenshot({ path: new URL('red-complete.png', directory).pathname });
  const pixels = await sharp(afterRed).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const redCells = createGameState(2).grid.filter(cell => cell?.color === 'red');
  const redCentersStillVisible = redCells.filter(cell => {
    const offset = (Math.round(cell.y) * pixels.info.width + Math.round(cell.x)) * 3;
    const [red, green, blue] = pixels.data.subarray(offset, offset + 3);
    return red > green * 1.35 && red > blue * 1.25;
  });
  expect(redCentersStillVisible, 'red wall centers should clear when red reaches 100%').toEqual([]);
  const background = await sharp('assets/level2/level2-gameplay-background.png').removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const [x, y] of [[100, 375], [500, 375]]) {
    const actualOffset = (y * pixels.info.width + x) * 3;
    const expectedOffset = ((y - 310) * background.info.width + x - 17) * 3;
    for (let channel = 0; channel < 3; channel += 1) {
      expect(Math.abs(pixels.data[actualOffset + channel] - background.data[expectedOffset + channel])).toBeLessThanOrEqual(2);
    }
  }
  await drag([300, 875], [199, 100]);
  await page.waitForTimeout(4_500);
  const partial = await progress();
  expect(partial.yellow).toBeGreaterThan(0);
  expect(partial.yellow).toBeLessThan(100);
  await page.screenshot({ path: new URL('yellow-partial.png', directory).pathname });
  await drag([199, 570], [399, 570]);
  await expect(page.locator('#live-status')).toHaveText('第 3 关开始', { timeout: 12_000 });
  const samples = await page.evaluate(() => window.__levelTwoBoundarySamples);
  const limits = { green: 493, red: 520, yellow: 520 };
  const pixelGridBottom = createGameState(2).gridRect.y + createGameState(2).gridRect.height;
  const minima = Object.fromEntries(Object.keys(limits).map(id => [id, Math.min(...samples.flat().filter(b => b.id === id).map(b => b.y))]));
  expect(pixelGridBottom).toBe(520);
  expect(minima, 'a real drag to the screen top must stop at the source-measured tray limits').toEqual(limits);
  expect(pixelGridBottom - minima.green, 'the source green tray reaches only the bottom 27 px of the pixel grid').toBe(27);
  expect(errors).toEqual([]);
  await page.close();
  await copyFile(await video.path(), new URL('level2-boundary.webm', directory));
  await writeFile(new URL('report.json', directory), JSON.stringify({ minima, pixelGridBottom, greenTopOverlapPx: pixelGridBottom - minima.green, partialYellow: partial.yellow, finalStatus: '第 3 关开始', errors }, null, 2));
});
