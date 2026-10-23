import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { createGameState } from '../src/game.js';

const [sourcePath, outputPath = 'assets/level10/level10-board.png'] = process.argv.slice(2);
if (!sourcePath) {
  throw new Error('Usage: node scripts/extract-level10-board.mjs <normalized-source-frame> [output.png]');
}

const { grid } = createGameState(10).config;
const metadata = await sharp(sourcePath).metadata();
if (!metadata.width || !metadata.height || grid.x + grid.width > metadata.width || grid.y + grid.height > metadata.height) {
  throw new Error(`Source frame ${metadata.width}x${metadata.height} is too small for the Level 10 board crop.`);
}

await mkdir(path.dirname(outputPath), { recursive: true });
await sharp(sourcePath)
  .extract({ left: grid.x, top: grid.y, width: grid.width, height: grid.height })
  .png()
  .toFile(outputPath);

const backgroundColumn = 2;
const backgroundRow = 11;
const left = Math.round(backgroundColumn * grid.width / grid.cols);
const top = Math.round(backgroundRow * grid.height / grid.rows);
const tileWidth = Math.round((backgroundColumn + 1) * grid.width / grid.cols) - left;
const tileHeight = Math.round((backgroundRow + 1) * grid.height / grid.rows) - top;
const emptyTilePath = path.join(path.dirname(outputPath), 'level10-empty-tile.png');
await sharp(sourcePath)
  .extract({ left: grid.x + left, top: grid.y + top, width: tileWidth, height: tileHeight })
  .png()
  .toFile(emptyTilePath);
console.log(`Saved ${outputPath} from source crop ${grid.x},${grid.y},${grid.width},${grid.height}; empty tile ${emptyTilePath} from cell ${backgroundColumn},${backgroundRow}.`);
