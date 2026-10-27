import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { LEVEL_TWO_YELLOW_ATLAS, levelTwoYellowAtlasSource } from '../src/level-two-collection-profile.js';

test.use({ video: { mode: 'on', size: { width: 597, height: 1296 } } });

const evidenceDirectory = new URL('../.research/recordings/level2-free-pile/', import.meta.url);
const SOURCE_PILE_REFERENCE = {
  frame: 355,
  timeSeconds: 15.4,
  progress: 73,
  brightYellowCoverage: 0.58,
  bottomToTopRatio: 1.246,
};

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

test('第二关自由拖动时黄色槽逐像素显示对应的原作进度帧', async ({ page }, testInfo) => {
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
  const atlasFrame = levelTwoYellowAtlasSource(state.progress);
  const expectedBucket = await sharp(fileURLToPath(new URL('../assets/level2/level2-yellow-bucket-atlas.png', import.meta.url)))
    .extract({
      left: (atlasFrame.progress % LEVEL_TWO_YELLOW_ATLAS.columns) * LEVEL_TWO_YELLOW_ATLAS.tile.width,
      top: Math.floor(atlasFrame.progress / LEVEL_TWO_YELLOW_ATLAS.columns) * LEVEL_TWO_YELLOW_ATLAS.tile.height,
      ...LEVEL_TWO_YELLOW_ATLAS.tile,
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const frame = await page.screenshot({ path: testInfo.outputPath('yellow-free-pile-source-atlas.png') });
  await writeFile(new URL('yellow-free-pile-source-atlas.png', evidenceDirectory), frame);
  const { data, info } = await sharp(frame).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const actualBucket = await sharp(frame)
    .extract({
      left: Math.round(state.x),
      top: Math.round(state.y),
      width: Math.round(state.width),
      height: Math.round(state.height),
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let differingBucketPixels = 0;
  for (let offset = 0; offset < actualBucket.data.length; offset += 3) {
    if (actualBucket.data[offset] !== expectedBucket.data[offset]
      || actualBucket.data[offset + 1] !== expectedBucket.data[offset + 1]
      || actualBucket.data[offset + 2] !== expectedBucket.data[offset + 2]) {
      differingBucketPixels += 1;
    }
  }
  expect(actualBucket.info.width).toBe(LEVEL_TWO_YELLOW_ATLAS.tile.width);
  expect(actualBucket.info.height).toBe(LEVEL_TWO_YELLOW_ATLAS.tile.height);
  expect(differingBucketPixels, 'the live free-play bucket must reproduce the source-derived tile exactly').toBe(0);
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
      if (red > 160 && green > 140 && blue < 115 && red > blue * 1.45 && green > blue * 1.2) count += 1;
    }
    return count;
  });
  const midpoint = Math.floor(rowCounts.length / 2);
  const topHalfPixels = rowCounts.slice(0, midpoint).reduce((sum, value) => sum + value, 0);
  const bottomHalfPixels = rowCounts.slice(midpoint).reduce((sum, value) => sum + value, 0);
  const bottomToTopDensityRatio = bottomHalfPixels / Math.max(topHalfPixels, 1);
  const brightYellowCoverage = (topHalfPixels + bottomHalfPixels) / (rowCounts.length * (cavity.right - cavity.left));
  expect(Math.abs(brightYellowCoverage - SOURCE_PILE_REFERENCE.brightYellowCoverage), 'yellow voxel coverage should track the source slot crop').toBeLessThan(0.18);
  expect(Math.abs(bottomToTopDensityRatio - SOURCE_PILE_REFERENCE.bottomToTopRatio), 'top-to-bottom voxel balance should track the source slot crop').toBeLessThan(0.3);
  expect(errors).toEqual([]);

  await page.close();
  const savedVideo = new URL('yellow-free-pile.webm', evidenceDirectory);
  await copyFile(await video.path(), savedVideo);
  await writeFile(new URL('report.json', evidenceDirectory), `${JSON.stringify({
    state,
    atlasFrame,
    cavity,
    sourceReference: SOURCE_PILE_REFERENCE,
    topHalfPixels,
    bottomHalfPixels,
    bottomToTopDensityRatio: Number(bottomToTopDensityRatio.toFixed(3)),
    brightYellowCoverage: Number(brightYellowCoverage.toFixed(3)),
    differingBucketPixels,
    errors,
    video: savedVideo.pathname,
  }, null, 2)}\n`);
});
