import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';
import { createGameState } from '../src/game.js';

const [sourcePath] = process.argv.slice(2);
if (!sourcePath) {
  throw new Error('Usage: node scripts/extract-level10-detail-assets.mjs <normalized-clean-opening-frame>');
}

const outputDirectory = 'assets/level10';
await mkdir(outputDirectory, { recursive: true });
const metadata = await sharp(sourcePath).metadata();
if (metadata.width !== 597 || metadata.height !== 1296) {
  throw new Error(`Expected a normalized 597x1296 frame, received ${metadata.width}x${metadata.height}.`);
}

async function crop(name, rect) {
  await sharp(sourcePath).extract(rect).png().toFile(`${outputDirectory}/${name}.png`);
}

// The player controls obscure the last bucket row, so only extract clean pixels
// from the top pad row, the upper tube spans, and the first four bucket rows.
await crop('level10-pad-row', { left: 50, top: 541, width: 497, height: 57 });
const { pipeChannels, buckets } = createGameState(10).config;
for (const [index, left] of pipeChannels.entries()) {
  await crop(`level10-pipe-${index + 1}-top`, { left, top: 598, width: 71, height: 312 });
}

for (const bucket of buckets) {
  if (bucket.y + bucket.height > 900) continue;
  await crop(`level10-bucket-${bucket.id}`, {
    left: bucket.x,
    top: bucket.y,
    width: bucket.width,
    height: bucket.height,
  });
}

console.log(`Extracted Level 10 pad, ${pipeChannels.length} clean tube spans, and source-visible bucket sprites from ${sourcePath}.`);
