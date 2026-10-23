import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { createGameState } from '../src/game.js';

const [sourceFrame, outputPath = 'assets/level6/level6-board.png'] = process.argv.slice(2);
if (!sourceFrame) {
  throw new Error('Usage: node scripts/extract-level6-board.mjs <1206x2622-source-frame> [output.png]');
}

const metadata = await sharp(sourceFrame).metadata();
if (metadata.width !== 1206 || metadata.height !== 2622) {
  throw new Error(`Expected the source video frame at 1206x2622; got ${metadata.width}x${metadata.height}.`);
}

const { grid } = createGameState(6).config;
const normalizedFrame = await sharp(sourceFrame)
  .resize({ width: 603, height: 1311, kernel: 'nearest' })
  .extract({ left: 3, top: 7, width: 597, height: 1296 })
  .png()
  .toBuffer();

await mkdir(path.dirname(outputPath), { recursive: true });
await sharp(normalizedFrame)
  .extract({ left: grid.x, top: grid.y, width: grid.width, height: grid.height })
  .png()
  .toFile(outputPath);
console.log(`Saved ${outputPath} from the normalized S5 Level 6 source crop at ${grid.x},${grid.y},${grid.width},${grid.height}.`);
