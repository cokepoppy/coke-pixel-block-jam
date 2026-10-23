import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [sourceFrame, outputPath = 'assets/level1/level1-board.png'] = process.argv.slice(2);
if (!sourceFrame) {
  throw new Error('Usage: node scripts/extract-level1-board.mjs <normalized-source-frame> [output.png]');
}

const crop = { left: 61, top: 269, width: 474, height: 219 };
const metadata = await sharp(sourceFrame).metadata();
if (!metadata.width || !metadata.height || crop.left + crop.width > metadata.width || crop.top + crop.height > metadata.height) {
  throw new Error(`Source frame ${metadata.width}x${metadata.height} is too small for the Level 1 board crop.`);
}

await mkdir(path.dirname(outputPath), { recursive: true });
await sharp(sourceFrame).extract(crop).png().toFile(outputPath);
console.log(`Saved ${outputPath} from source crop ${crop.left},${crop.top},${crop.width},${crop.height}.`);
