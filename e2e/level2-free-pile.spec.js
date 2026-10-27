import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';

test.use({ video: { mode: 'on', size: { width: 597, height: 1296 } } });

const evidenceDirectory = new URL('../.research/recordings/level2-free-pile/', import.meta.url);

async function dragCanvasPath(page, from, to, durationMs = 300) {
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

test('第二关自由拖动时黄色像素在槽底形成密实堆积', async ({ page }, testInfo) => {
  test.setTimeout(20_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const video = page.video();
  const canvas = page.locator('#game-canvas');
  await mkdir(evidenceDirectory, { recursive: true });
  await page.goto('/?previewLevel=2');
  await expect(page.locator('#live-status')).toHaveText('第 2 关开始');

  await dragCanvasPath(page, { x: 300, y: 875 }, { x: 199, y: 564 });
  const yellowProgress = () => canvas.evaluate(element => Number(element.dataset.progressYellow));
  await expect.poll(yellowProgress, { timeout: 4_000 })
    .toBeGreaterThanOrEqual(72);
  await expect.poll(yellowProgress)
    .toBeLessThanOrEqual(78);

  const state = await canvas.evaluate(element => {
    const yellow = JSON.parse(element.dataset.levelTwoBuckets).find(bucket => bucket.id === 'yellow');
    return { ...yellow, progress: Number(element.dataset.progressYellow) };
  });
  const frame = await page.screenshot({ path: testInfo.outputPath('yellow-free-pile-at-73-percent.png') });
  await writeFile(new URL('yellow-free-pile-at-73-percent.png', evidenceDirectory), frame);
  const { data, info } = await sharp(frame).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const cavity = {
    left: Math.round(state.x + 15),
    right: Math.round(state.x + state.width - 15),
    top: Math.round(state.y + 15),
    bottom: Math.round(state.y + state.height - 8),
  };
  const rowCounts = Array.from({ length: cavity.bottom - cavity.top }, (_, row) => {
    let count = 0;
    const y = cavity.top + row;
    for (let x = cavity.left; x < cavity.right; x += 1) {
      const offset = (y * info.width + x) * 3;
      const [red, green, blue] = data.subarray(offset, offset + 3);
      if (red > 120 && green > 80 && blue < 105 && red > blue * 1.35 && green > blue * 1.1) count += 1;
    }
    return count;
  });
  const midpoint = Math.floor(rowCounts.length / 2);
  const topHalfPixels = rowCounts.slice(0, midpoint).reduce((sum, value) => sum + value, 0);
  const bottomHalfPixels = rowCounts.slice(midpoint).reduce((sum, value) => sum + value, 0);
  expect(bottomHalfPixels, 'settled yellow fragments should be denser in the lower half of the tray').toBeGreaterThan(topHalfPixels * 1.15);
  expect(errors).toEqual([]);

  await page.close();
  const savedVideo = new URL('yellow-free-pile.webm', evidenceDirectory);
  await copyFile(await video.path(), savedVideo);
  await writeFile(new URL('report.json', evidenceDirectory), `${JSON.stringify({
    state,
    cavity,
    topHalfPixels,
    bottomHalfPixels,
    bottomToTopDensityRatio: Number((bottomHalfPixels / Math.max(topHalfPixels, 1)).toFixed(3)),
    errors,
    video: savedVideo.pathname,
  }, null, 2)}\n`);
});
