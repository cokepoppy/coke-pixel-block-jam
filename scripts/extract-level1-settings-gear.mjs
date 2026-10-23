import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [sourceFrame, outputPath = 'assets/level1/level1-settings-gear.png'] = process.argv.slice(2);
if (!sourceFrame) {
  throw new Error('Usage: node scripts/extract-level1-settings-gear.mjs <normalized-source-frame> [output.png]');
}

const crop = { left: 490, top: 56, width: 66, height: 66 };
const metadata = await sharp(sourceFrame).metadata();
if (!metadata.width || !metadata.height || crop.left + crop.width > metadata.width || crop.top + crop.height > metadata.height) {
  throw new Error(`Source frame ${metadata.width}x${metadata.height} is too small for the settings gear crop.`);
}

await mkdir(path.dirname(outputPath), { recursive: true });
const circularMask = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="66" height="66"><circle cx="33" cy="33" r="33" fill="#fff"/></svg>');
await sharp(sourceFrame)
  .extract(crop)
  .ensureAlpha()
  .composite([{ input: circularMask, blend: 'dest-in' }])
  .png()
  .toFile(outputPath);
console.log(`Saved ${outputPath} from source crop ${crop.left},${crop.top},${crop.width},${crop.height}.`);
