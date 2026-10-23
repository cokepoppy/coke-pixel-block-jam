import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { createGameState } from '../src/game.js';

const [sourceFrame, outputPath = 'assets/level7/level7-board.png'] = process.argv.slice(2);
if (!sourceFrame) {
  throw new Error('Usage: node scripts/extract-level7-board.mjs <1206x2622-source-frame> [output.png]');
}

const metadata = await sharp(sourceFrame).metadata();
if (metadata.width !== 1206 || metadata.height !== 2622) {
  throw new Error(`Expected the source video frame at 1206x2622; got ${metadata.width}x${metadata.height}.`);
}

const state = createGameState(7);
const { grid, pad } = state.config;
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
const shadowPadding = 8;

for (let row = 0; row < pad.rows; row += 1) {
  const [firstColumn, endColumn] = pad.rowRanges?.[row] ?? [0, pad.cols];
  for (let column = firstColumn; column < endColumn; column += 1) {
    const padX = pad.x + column * (pad.cellWidth + pad.gap);
    const padY = pad.y + row * (pad.cellHeight + pad.gap);
    const left = Math.max(0, Math.floor(padX - shadowPadding - grid.x));
    const top = Math.max(0, Math.floor(padY - shadowPadding - grid.y));
    const right = Math.min(grid.width, Math.ceil(padX + pad.cellWidth + shadowPadding - grid.x));
    const bottom = Math.min(grid.height, Math.ceil(padY + pad.cellHeight + shadowPadding - grid.y));
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        boardPixels[(y * grid.width + x) * info.channels + 3] = 0;
      }
    }
  }
}

await mkdir(path.dirname(outputPath), { recursive: true });
await sharp(boardPixels, { raw: { width: grid.width, height: grid.height, channels: info.channels } })
  .png()
  .toFile(outputPath);
console.log(`Saved ${outputPath} with source pixels masked beneath the top operation cells and their shadows (${shadowPadding}px).`);
