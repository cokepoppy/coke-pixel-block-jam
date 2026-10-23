import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { createGameState } from '../src/game.js';

const [sourceFrame, outputPath = 'assets/level5/level5-board.png'] = process.argv.slice(2);
if (!sourceFrame) {
  throw new Error('Usage: node scripts/extract-level5-board.mjs <normalized-source-frame> [output.png]');
}

const { grid } = createGameState(5).config;
const metadata = await sharp(sourceFrame).metadata();
if (!metadata.width || !metadata.height || grid.x + grid.width > metadata.width || grid.y + grid.height > metadata.height) {
  throw new Error(`Source frame ${metadata.width}x${metadata.height} is too small for the Level 5 board crop.`);
}

await mkdir(path.dirname(outputPath), { recursive: true });
await sharp(sourceFrame)
  .extract({ left: grid.x, top: grid.y, width: grid.width, height: grid.height })
  .png()
  .toFile(outputPath);
console.log(`Saved ${outputPath} from source crop ${grid.x},${grid.y},${grid.width},${grid.height}.`);
