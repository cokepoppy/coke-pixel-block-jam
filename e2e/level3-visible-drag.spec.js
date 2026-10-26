import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

test.use({ video: { mode: 'on', size: { width: 597, height: 1296 } } });

test('Level 3 可从原片当前可见的蓝色槽接管，真实拖动后继续收集', async ({ page }, testInfo) => {
  test.setTimeout(25_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?previewLevel=3');

  const canvas = page.locator('#game-canvas');
  const sourceVideo = page.locator('#level-three-source-gameplay-video');
  await expect.poll(() => sourceVideo.evaluate((video) => video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA))
    .toBeTruthy();
  await expect(page.locator('#live-status')).toHaveText('第 3 关开始');

  // Start the recorded opening with the same purple tray move used in the
  // source, then wait for the blue tray to visibly move to the wall.
  await page.mouse.move(500, 921);
  await page.mouse.down();
  await page.mouse.move(500, 628, { steps: 24 });
  await page.mouse.up();
  await expect.poll(() => sourceVideo.evaluate((video) => video.currentTime > 0.3)).toBeTruthy();
  await expect.poll(() => sourceVideo.evaluate((video) => video.currentTime >= 3.05), { timeout: 8_000 })
    .toBeTruthy();

  const before = await page.evaluate(() => {
    const video = document.querySelector('#level-three-source-gameplay-video');
    const canvasElement = document.querySelector('#game-canvas');
    return {
      sourceTime: video.currentTime,
      progress: Number(canvasElement.dataset.progressBlue),
      status: canvasElement.dataset.gameStatus,
    };
  });
  expect(before.progress).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath('level3-blue-visible-before.png') });

  // At source time 3.05s the blue bucket occupies x=51..351, y=480..672.
  // Grab its visible centre and pull it through the blue pixels on the board.
  await page.mouse.move(200, 550);
  await page.mouse.down();
  await page.mouse.move(250, 300, { steps: 32 });
  await page.mouse.up();

  await expect.poll(() => sourceVideo.evaluate((video) => video.paused)).toBeTruthy();
  const afterDrag = await page.evaluate(() => ({
    sourcePaused: document.querySelector('#level-three-source-gameplay-video').paused,
    progressBlue: Number(document.querySelector('#game-canvas').dataset.progressBlue),
    gameStatus: document.querySelector('#game-canvas').dataset.gameStatus,
    manualStatus: document.querySelector('#live-status').textContent,
  }));
  await testInfo.attach('level3-progress-diagnostic.json', {
    body: JSON.stringify({ before, afterDrag }, null, 2),
    contentType: 'application/json',
  });
  expect(afterDrag.progressBlue, `blue progress should rise after visible drag: ${JSON.stringify({ before, afterDrag })}`)
    .toBeGreaterThan(before.progress);
  await expect(canvas).toHaveAttribute('data-game-status', 'playing');
  await page.screenshot({ path: testInfo.outputPath('level3-blue-after-manual-drag.png') });
  expect(errors).toEqual([]);

  const after = await page.evaluate(() => ({
    sourcePaused: document.querySelector('#level-three-source-gameplay-video').paused,
    progressBlue: Number(document.querySelector('#game-canvas').dataset.progressBlue),
    gameStatus: document.querySelector('#game-canvas').dataset.gameStatus,
    manualStatus: document.querySelector('#live-status').textContent,
  }));
  const report = {
    level: 3,
    input: 'Playwright mouse drag from the blue tray visible in the source video into the blue board cells',
    visibleGrabBoundsAtStart: { x: 51, y: 480, width: 300, height: 192 },
    before,
    after,
    errors,
  };
  const evidenceDirectory = new URL('../.research/recordings/level3-visible-drag/', import.meta.url);
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(new URL('report.json', evidenceDirectory), `${JSON.stringify(report, null, 2)}\n`);
  await testInfo.attach('level3-visible-drag-report.json', {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json',
  });
});
