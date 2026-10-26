import { expect, test } from '@playwright/test';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';

test.use({ video: { mode: 'on', size: { width: 597, height: 1296 } } });

const evidenceDirectory = new URL('../.research/recordings/level2-visible-drag/', import.meta.url);

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
  const startedAt = Date.now();
  for (let step = 1; step <= steps; step += 1) {
    const delay = startedAt + (step / steps) * durationMs - Date.now();
    if (delay > 0) await page.waitForTimeout(delay);
    await page.mouse.move(
      start.x + ((end.x - start.x) * step) / steps,
      start.y + ((end.y - start.y) * step) / steps,
    );
  }
  await page.mouse.up();
}

test('Level 2 原作回放中可抓取可见槽位并继续拖动通关', async ({ page }, testInfo) => {
  test.setTimeout(25_000);
  const video = page.video();
  const canvas = page.locator('#game-canvas');
  const progress = () => canvas.evaluate((element) => ({
    green: Number(element.dataset.progressGreen),
    red: Number(element.dataset.progressRed),
    yellow: Number(element.dataset.progressYellow),
  }));
  await mkdir(evidenceDirectory, { recursive: true });
  await page.goto('/?previewLevel=2');

  // Red docks first and starts the recorded Level 2 sequence. Around source
  // time 3 s, the green L slot is visibly at x=50, y=493.
  await dragCanvasPath(page, { x: 450, y: 750 }, { x: 450, y: 550 }, 160);
  const sourceVideo = page.locator('#level-two-source-gameplay-video');
  await page.waitForFunction(() => {
    const source = document.querySelector('#level-two-source-gameplay-video');
    return !source.paused && source.currentTime >= 3.05;
  }, null, { timeout: 5_000 });
  await page.screenshot({ path: testInfo.outputPath('level2-moving-green-slot.png') });

  // The point lies inside the green slot as rendered by the source video;
  // dragging it upward should enter the green pixel area and interrupt the
  // scripted presentation into playable manual input.
  await dragCanvasPath(page, { x: 100, y: 510 }, { x: 100, y: 365 }, 300);
  await expect.poll(async () => (await progress()).green, { timeout: 2_000 })
    .toBeGreaterThan(0);
  await expect.poll(() => sourceVideo.evaluate((element) => element.paused)).toBe(true);
  const afterGreen = await progress();
  const greenDragFrame = await page.screenshot({ path: testInfo.outputPath('level2-after-visible-green-drag.png') });

  // Let the already-started red collection and this manual green collection
  // settle, then perform the yellow move with a visible mouse drag as well.
  await expect.poll(() => progress(), { timeout: 8_000 }).toMatchObject({ green: 100, red: 100, yellow: 0 });
  await dragCanvasPath(page, { x: 300, y: 875 }, { x: 348, y: 494 }, 400);
  await expect(page.locator('#live-status')).toHaveText('第 3 关开始', { timeout: 12_000 });

  const savedVideo = new URL('level2-visible-green-drag.webm', evidenceDirectory);
  await page.close();
  await copyFile(await video.path(), savedVideo);
  await writeFile(new URL('after-visible-green-drag.png', evidenceDirectory), greenDragFrame);
  await writeFile(new URL('report.json', evidenceDirectory), `${JSON.stringify({
    route: 'red docks and starts source playback; visible moved green tray is grabbed and dragged; red and green settle; yellow completes Level 2',
    capturedGreenProgressAfterDrag: afterGreen.green,
    capturedRedProgressAfterDrag: afterGreen.red,
    sourceVideoPausedAfterManualDrag: true,
    finalStatus: '第 3 关开始',
    video: savedVideo.pathname,
  }, null, 2)}\n`);
});
