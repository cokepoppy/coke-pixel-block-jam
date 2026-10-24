import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [sourcePath, sampledGridPath, outputPath = 'assets/level8/level8-board.png'] = process.argv.slice(2);
if (!sourcePath || !sampledGridPath) {
  throw new Error('Usage: node scripts/extract-level8-board.mjs <source-frame> <sampled-grid.json> [output.png]');
}

const sample = JSON.parse(await readFile(sampledGridPath, 'utf8'));
const { board, rows } = sample;
const { data: sourcePixels, info } = await sharp(sourcePath)
  .extract({ left: board.left, top: board.top, width: board.width, height: board.height })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const channels = info.channels;
const output = Buffer.from(sourcePixels);

await mkdir(path.dirname(outputPath), { recursive: true });
await sharp(output, { raw: { width: board.width, height: board.height, channels } }).png().toFile(outputPath);
console.log(`Saved ${outputPath}; preserved the source board, including its yellow circular pixel pattern.`);
