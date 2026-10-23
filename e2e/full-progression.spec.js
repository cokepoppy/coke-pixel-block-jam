import { expect, test } from '@playwright/test';
import {
  collectAlongPath,
  createGameState,
  getBucketAt,
} from '../src/game.js';

function bucketSegments(bucket) {
  return bucket.segments?.length
    ? bucket.segments
    : [{ x: 0, y: 0, width: bucket.width, height: bucket.height }];
}

function grabPoint(state, bucket) {
  for (const segment of bucketSegments(bucket)) {
    for (const fx of [0.25, 0.5, 0.75]) {
      for (const fy of [0.25, 0.5, 0.75]) {
        const x = bucket.x + segment.x + segment.width * fx;
        const y = bucket.y + segment.y + segment.height * fy;
        if (getBucketAt(state, x, y)?.id === bucket.id) return { x, y };
      }
    }
  }
  return null;
}

function positionOverCell(state, bucket, cell) {
  const frame = state.config.frame;
  const inset = 8;
  const minX = frame.x + inset;
  const minY = frame.y + inset - (state.config.dragTopAllowance ?? 0);
  const maxX = frame.x + frame.width - inset - bucket.width;
  const maxY = frame.y + frame.height - inset - bucket.height;
  const candidates = [];

  for (const segment of bucketSegments(bucket)) {
    for (const fx of [0.2, 0.5, 0.8]) {
      for (const fy of [0.2, 0.5, 0.8]) {
        const x = Math.max(minX, Math.min(maxX, cell.x - segment.x - segment.width * fx));
        const y = Math.max(minY, Math.min(maxY, cell.y - segment.y - segment.height * fy));
        if (cell.x < x + segment.x || cell.x > x + segment.x + segment.width) continue;
        if (cell.y < y + segment.y || cell.y > y + segment.y + segment.height) continue;
        candidates.push({ x, y });
      }
    }
  }

  candidates.sort((a, b) => (
    Math.hypot(a.x - bucket.x, a.y - bucket.y) - Math.hypot(b.x - bucket.x, b.y - bucket.y)
  ));
  return candidates[0] ?? null;
}

function planFullClear(level) {
  const state = createGameState(level);
  const emptyBuckets = state.buckets.filter((bucket) => state.bucketTotals[bucket.id] === 0);
  if (emptyBuckets.length) {
    throw new Error(`Level ${level} 的收集槽没有对应像素：${emptyBuckets.map(({ id }) => id).join(', ')}`);
  }
  const actions = [];
  let stalledPasses = 0;

  while (state.grid.some(Boolean) && stalledPasses < 2) {
    let madeProgress = false;

    for (const bucket of state.buckets) {
      while (bucket.visible && state.grid.some((cell) => cell?.targetBucketId === bucket.id)) {
        const point = grabPoint(state, bucket);
        if (!point) break;
        const offset = { x: point.x - bucket.x, y: point.y - bucket.y };
        const destinations = [];

        while (true) {
          const cells = state.grid
            .filter((cell) => cell?.targetBucketId === bucket.id)
            .sort((a, b) => (
              Math.hypot(a.x - (bucket.x + bucket.width / 2), a.y - (bucket.y + bucket.height / 2))
              - Math.hypot(b.x - (bucket.x + bucket.width / 2), b.y - (bucket.y + bucket.height / 2))
            ));
          const nextCell = cells.find((cell) => positionOverCell(state, bucket, cell));
          if (!nextCell) break;
          const destination = positionOverCell(state, bucket, nextCell);
          const previousCount = state.bucketCollected[bucket.id];
          collectAlongPath(state, bucket.id, { x: bucket.x, y: bucket.y }, destination);
          if (state.bucketCollected[bucket.id] === previousCount) break;
          destinations.push(destination);
        }

        if (!destinations.length) break;
        actions.push({ bucketId: bucket.id, point, offset, destinations });
        madeProgress = true;

        if (state.bucketCollected[bucket.id] >= state.bucketTotals[bucket.id]) {
          bucket.visible = false;
        }
      }
    }

    stalledPasses = madeProgress ? 0 : stalledPasses + 1;
  }

  const remaining = state.grid.filter(Boolean).length;
  if (remaining) {
    throw new Error(`Level ${level} 的模型路线仍有 ${remaining} 格无法清空`);
  }
  return actions;
}

async function playClearRoute(page, level, actions) {
  const box = await page.locator('#game-canvas').boundingBox();
  if (!box) throw new Error('游戏画布没有显示');
  const browserPoint = (point) => ({
    x: box.x + (point.x / 597) * box.width,
    y: box.y + (point.y / 1296) * box.height,
  });

  if (level === 1) {
    for (const [x, color] of [[298, '黄色'], [111, '绿色'], [485, '红色']]) {
      const start = browserPoint({ x, y: 866 });
      const target = browserPoint({ x, y: 620 });
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(target.x, target.y, { steps: 36 });
      await page.mouse.up();
      await expect(page.locator('#live-status')).toContainText(`${color} 像素块，进度 100%`, { timeout: 5_000 });
    }
  } else if (level === 2) {
    const moveFor = async (from, to, durationMs) => {
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
    const dragTo = async (startPoint, targetPoint, durationMs = 100) => {
      const start = browserPoint(startPoint);
      const target = browserPoint(targetPoint);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      const gestureStartedAt = await page.evaluate(() => performance.now());
      await moveFor(start, target, durationMs);
      await page.mouse.up();
      return gestureStartedAt;
    };
    const redStartedAt = await dragTo({ x: 450, y: 750 }, { x: 450, y: 550 });
    const waitUntil = async (targetAt) => {
      const delay = await page.evaluate((target) => target - performance.now(), targetAt);
      if (delay > 0) await page.waitForTimeout(delay);
    };
    await waitUntil(redStartedAt + 2_400);
    await dragTo({ x: 100, y: 750 }, { x: 100, y: 510 });
    await waitUntil(redStartedAt + 4_300);
    const yellowStartedAt = await dragTo({ x: 300, y: 875 }, { x: 199, y: 564 }, 400);
    await waitUntil(yellowStartedAt + 1_900);
    const yellowRegrab = browserPoint({ x: 199, y: 580 });
    const yellowRight = browserPoint({ x: 399, y: 580 });
    await page.mouse.move(yellowRegrab.x, yellowRegrab.y);
    await page.mouse.down();
    await moveFor(yellowRegrab, yellowRight, 600);
    await page.mouse.up();
    await waitUntil(yellowStartedAt + 3_300);
    await expect.poll(() => page.locator('#game-canvas').evaluate((canvas) => (
      ['red', 'green', 'yellow'].map((color) => Number(canvas.dataset[`progress${color[0].toUpperCase()}${color.slice(1)}`]))
    ))).toEqual([100, 100, 100]);
  } else {
    for (const action of actions) {
      const start = browserPoint(action.point);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      for (const destination of action.destinations) {
        const target = browserPoint({
          x: destination.x + action.offset.x,
          y: destination.y + action.offset.y,
        });
        await page.mouse.move(target.x, target.y);
      }
      await page.mouse.up();
      await page.waitForTimeout(500);
    }
  }

  if (level === 9) {
    await expect(page.getByRole('dialog', { name: '做得好！' })).toBeVisible();
    await page.getByRole('button', { name: /领取并继续/ }).click();
    await expect(page.locator('#live-status')).toHaveText('第 10 关开始');
    return;
  }

  const nextLevel = level + 1;
  await expect(page.getByRole('status', { name: `正在进入第 ${nextLevel} 关` })).toBeVisible();
  if (level === 13) return;
  await expect(page.locator('#live-status')).toHaveText(`第 ${nextLevel} 关开始`);
  if ([7, 9, 12, 13].includes(nextLevel)) {
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button').click();
  }
}

test('真实拖动连续清空 Level 1–13 并进入通关转场', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/?previewLevel=1');

  for (let level = 1; level <= 13; level += 1) {
    const actions = level === 2 ? [] : planFullClear(level);
    await playClearRoute(page, level, actions);
  }

  await expect(page.getByRole('status', { name: '正在进入第 14 关' })).toBeVisible();
});
