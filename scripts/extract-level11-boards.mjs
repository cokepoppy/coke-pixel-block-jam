import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';
import { createGameState } from '../src/game.js';

const [sourcePath] = process.argv.slice(2);
if (!sourcePath) {
  throw new Error('Usage: node scripts/extract-level11-boards.mjs <normalized-opening-frame>');
}

const metadata = await sharp(sourcePath).metadata();
if (metadata.width !== 597 || metadata.height !== 1296) {
  throw new Error(`Expected a normalized 597x1296 frame, received ${metadata.width}x${metadata.height}.`);
}

const outputDirectory = 'assets/level11';
await mkdir(outputDirectory, { recursive: true });
for (const board of createGameState(11).config.boards) {
  const { x, y, width, height } = board.rect;
  await sharp(sourcePath)
    .extract({ left: x, top: y, width, height })
    .png()
    .toFile(`${outputDirectory}/level11-${board.id}-board.png`);
}
console.log(`Extracted both Level 11 board crops from ${sourcePath}.`);
