import { expect, test } from '@playwright/test';
import { createGameState, getBucketAt } from '../src/game.js';

const musicLevels = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

test('第 4–8、9–13 关播放录屏静止段提取的原作音乐，并服从音乐开关', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  for (const level of musicLevels) {
    await page.goto(`/?previewLevel=${level}`);
    const canvas = page.locator('#game-canvas');
    const bounds = await canvas.boundingBox();
    const game = createGameState(level);
    const playablePoint = findPlayableBucketPoint(game);
    const point = {
      x: bounds.x + playablePoint.x * bounds.width / 597,
      y: bounds.y + playablePoint.y * bounds.height / 1296,
    };
    const music = page.locator('#source-music-loop');
    await page.mouse.click(point.x, point.y);
    await expect.poll(() => music.evaluate(element => (
      !element.paused && element.currentTime > 0.15 && element.currentSrc.endsWith('/assets/music/original-game-idle-loop.m4a')
    )), { message: `第 ${level} 关应播放原作音乐循环` }).toBe(true);

    if (level === 4) {
      await page.locator('#settings-button').click();
      await expect.poll(() => music.evaluate(element => element.paused)).toBe(true);
      await page.locator('[data-toggle="music"]').click();
      await page.locator('[data-action="continue"]').click();
      await page.waitForTimeout(250);
      expect(await music.evaluate(element => element.paused), '关闭背景音乐后原声循环应保持暂停').toBe(true);

      await page.locator('#settings-button').click();
      await page.locator('[data-toggle="music"]').click();
      await page.locator('[data-action="continue"]').click();
      await expect.poll(() => music.evaluate(element => !element.paused)).toBe(true);
    }
  }

  expect(errors).toEqual([]);
});

function findPlayableBucketPoint(game) {
  for (const bucket of [...game.buckets].reverse()) {
    if (!bucket.visible) continue;
    const step = Math.max(4, Math.min(bucket.width, bucket.height) / 12);
    for (let y = bucket.y + step; y < bucket.y + bucket.height - step; y += step) {
      for (let x = bucket.x + step; x < bucket.x + bucket.width - step; x += step) {
        if (getBucketAt(game, x, y)?.id === bucket.id) return { x, y };
      }
    }
  }
  throw new Error(`第 ${game.level} 关没有可用于解锁音频的可拖动槽位`);
}
