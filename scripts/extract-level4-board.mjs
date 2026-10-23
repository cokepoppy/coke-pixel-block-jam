import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { createGameState } from '../src/game.js';

const [sourceFrame, outputPath = 'assets/level4/level4-board-cells.png'] = process.argv.slice(2);
if (!sourceFrame) {
  throw new Error('Usage: node scripts/extract-level4-board.mjs <normalized-source-frame> [output.png]');
}

const state = createGameState(4);
const board = state.config.grid;
const bucket = state.config.buckets.find(({ id }) => id === 'red-top');
if (!bucket) throw new Error('Level 4 red-top bucket was not found.');
const bucketShadowPadding = 10;
const bucketCover = {
  left: Math.max(0, bucket.x - board.x - bucketShadowPadding),
  top: Math.max(0, bucket.y - board.y - bucketShadowPadding),
  right: Math.min(board.width, bucket.x + bucket.width - board.x + bucketShadowPadding),
  bottom: Math.min(board.height, bucket.y + bucket.height - board.y + bucketShadowPadding),
};
const { data: source, info } = await sharp(sourceFrame)
  .extract({ left: board.x, top: board.y, width: board.width, height: board.height })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const output = Buffer.alloc(board.width * board.height * 4);

for (let row = 0; row < board.rows; row += 1) {
  for (let column = 0; column < board.cols; column += 1) {
    if (!state.grid[row * board.cols + column]) continue;
    const left = Math.round(column * board.width / board.cols);
    const top = Math.round(row * board.height / board.rows);
    const right = Math.round((column + 1) * board.width / board.cols);
    const bottom = Math.round((row + 1) * board.height / board.rows);
    for (let y = top; y < bottom; y += 1) {
      const start = (y * board.width + left) * info.channels;
      for (let x = start; x < (y * board.width + right) * info.channels; x += info.channels) {
        const sourceX = Math.floor(x / info.channels) % board.width;
        const sourceY = y;
        if (sourceX >= bucketCover.left && sourceX < bucketCover.right
          && sourceY >= bucketCover.top && sourceY < bucketCover.bottom) continue;
        const destination = (sourceY * board.width + sourceX) * 4;
        output[destination] = source[x];
        output[destination + 1] = source[x + 1];
        output[destination + 2] = source[x + 2];
        output[destination + 3] = 255;
      }
    }
  }
}

await mkdir(path.dirname(outputPath), { recursive: true });
await sharp(output, { raw: { width: board.width, height: board.height, channels: 4 } }).png().toFile(outputPath);
console.log(`Saved ${outputPath} with exact source cells, transparent gaps, and the red bucket plus shadow masked (${board.cols} x ${board.rows}).`);
