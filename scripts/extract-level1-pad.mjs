import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [sourceFrame, outputDirectory = 'assets/level1'] = process.argv.slice(2);
if (!sourceFrame) {
  throw new Error('Usage: node scripts/extract-level1-pad.mjs <normalized-source-frame> [output-directory]');
}

const metadata = await sharp(sourceFrame).metadata();
if (!metadata.width || !metadata.height) throw new Error('Could not read source frame dimensions.');

await mkdir(outputDirectory, { recursive: true });
for (let column = 0; column < 4; column += 1) {
  const crop = { left: 50 + column * 125, top: 527, width: 121, height: 121 };
  if (crop.left + crop.width > metadata.width || crop.top + crop.height > metadata.height) {
    throw new Error(`Source frame ${metadata.width}x${metadata.height} is too small for pad cell ${column + 1}.`);
  }
  const outputPath = path.join(outputDirectory, `level1-pad-cell-${column + 1}.png`);
  await sharp(sourceFrame).extract(crop).png().toFile(outputPath);
  console.log(`Saved ${outputPath} from source crop ${crop.left},${crop.top},${crop.width},${crop.height}.`);
}
