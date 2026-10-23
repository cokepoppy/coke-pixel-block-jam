import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { createGameState } from '../src/game.js';

const [sourceFrame, outputPath = 'assets/level12/level12-board.png'] = process.argv.slice(2);
if (!sourceFrame) {
  throw new Error('Usage: node scripts/extract-level12-board.mjs <1206x2622-source-frame> [output.png]');
}

const metadata = await sharp(sourceFrame).metadata();
if (metadata.width !== 1206 || metadata.height !== 2622) {
  throw new Error(`Expected the source video frame at 1206x2622; got ${metadata.width}x${metadata.height}.`);
}

const state = createGameState(12);
const { grid, pad, buckets } = state.config;
const normalizedFrame = await sharp(sourceFrame)
  .resize({ width: 603, height: 1311, kernel: 'nearest' })
  .extract({ left: 3, top: 7, width: 597, height: 1296 })
  .png()
  .toBuffer();
const { data, info } = await sharp(normalizedFrame)
  .extract({ left: grid.x, top: grid.y, width: grid.width, height: grid.height })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const boardPixels = Buffer.from(data);

function maskRect(left, top, right, bottom, padding) {
  const x0 = Math.max(0, Math.floor(left - padding - grid.x));
  const y0 = Math.max(0, Math.floor(top - padding - grid.y));
  const x1 = Math.min(grid.width, Math.ceil(right + padding - grid.x));
  const y1 = Math.min(grid.height, Math.ceil(bottom + padding - grid.y));
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      boardPixels[(y * grid.width + x) * info.channels + 3] = 0;
    }
  }
}

for (let row = 0; row < pad.rows; row += 1) {
  const [firstColumn, endColumn] = pad.rowRanges?.[row] ?? [0, pad.cols];
  for (let column = firstColumn; column < endColumn; column += 1) {
    const left = pad.x + column * (pad.cellWidth + pad.gap);
    const top = pad.y + row * (pad.cellHeight + pad.gap);
    maskRect(left, top, left + pad.cellWidth, top + pad.cellHeight, 8);
  }
}

for (const bucket of buckets) {
  const segments = bucket.segments?.length
    ? bucket.segments
    : [{ x: 0, y: 0, width: bucket.width, height: bucket.height }];
  for (const segment of segments) {
    const left = bucket.x + segment.x;
    const top = bucket.y + segment.y;
    maskRect(left, top, left + segment.width, top + segment.height, 12);
  }
}

await mkdir(path.dirname(outputPath), { recursive: true });
await sharp(boardPixels, { raw: { width: grid.width, height: grid.height, channels: info.channels } })
  .png()
  .toFile(outputPath);
console.log(`Saved ${outputPath}; Level 12 pad cells and both bucket shapes are masked with shadows.`);
