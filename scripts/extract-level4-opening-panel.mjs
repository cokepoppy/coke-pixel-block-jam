import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const [
  sourceVideo = '/Users/shangguan/Downloads/RPReplay_Final1792661235.MP4',
  outputPath = 'assets/level4/level4-opening-panel.png',
  frameOverlayOutputPath = 'assets/level4/level4-frame-overlay.png',
] = process.argv.slice(2);
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'pixel-block-jam-level4-opening-'));
const sourceFramePath = path.join(temporaryDirectory, 'source-frame.png');

try {
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-i', sourceVideo,
    '-ss', '47.3',
    '-frames:v', '1',
    '-y', sourceFramePath,
  ], { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed with exit code ${result.status}: ${result.stderr}`);
  }

  const metadata = await sharp(sourceFramePath).metadata();
  if (metadata.width !== 1206 || metadata.height !== 2622) {
    throw new Error(`Expected a 1206x2622 source frame, received ${metadata.width}x${metadata.height}.`);
  }

  const openingPanel = await sharp(sourceFramePath)
    .extract({ left: 34, top: 570, width: 1126, height: 1412 })
    .resize(563, 706, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer();
  await sharp(openingPanel, { raw: { width: 563, height: 706, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  // Keep the exact source bezel after the first drag, while allowing the live
  // board and buckets to redraw through the interior opening.
  const frameOverlay = Buffer.from(openingPanel);
  const aperture = { left: 28, top: 26, right: 535, bottom: 678, radius: 22 };
  for (let y = aperture.top; y < aperture.bottom; y += 1) {
    for (let x = aperture.left; x < aperture.right; x += 1) {
      const nearestX = Math.max(aperture.left + aperture.radius, Math.min(aperture.right - aperture.radius - 1, x));
      const nearestY = Math.max(aperture.top + aperture.radius, Math.min(aperture.bottom - aperture.radius - 1, y));
      const dx = x - nearestX;
      const dy = y - nearestY;
      if (dx * dx + dy * dy <= aperture.radius * aperture.radius) {
        frameOverlay[(y * 563 + x) * 4 + 3] = 0;
      }
    }
  }
  await sharp(frameOverlay, { raw: { width: 563, height: 706, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(frameOverlayOutputPath);
  console.log(`Saved ${outputPath} and ${frameOverlayOutputPath} from S5 00:47.3 game-panel crop (x=34,y=570,w=1126,h=1412 -> 563x706).`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
