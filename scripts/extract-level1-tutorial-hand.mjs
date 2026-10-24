import { mkdtemp, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const [
  sourceVideo,
  outputPath = 'assets/level1/level1-tutorial-hand.mp4',
  atlasOutputPath = 'assets/level1/level1-tutorial-frames.png',
] = process.argv.slice(2);
if (!sourceVideo) {
  throw new Error('Usage: node scripts/extract-level1-tutorial-hand.mjs <source-video> [output.mp4] [frames.png]');
}

await mkdir(path.dirname(outputPath), { recursive: true });
await mkdir(path.dirname(atlasOutputPath), { recursive: true });
const result = spawnSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'warning',
  // Level 1 first appears at 1.783 s. Preserve the complete hand gesture
  // through frame 56 at 2.717 s; frame 57 (2.733 s) begins the yellow-tray lift.
  '-ss', '1.783333', '-i', sourceVideo,
  '-map', '0:v:0', '-an',
  // Keep the crop even-width for browser-friendly H.264 4:2:0 decoding; the
  // Canvas panel compositor maps the one extra source column to its 563 px box.
  '-vf', 'scale=597:1296:flags=lanczos:in_range=pc:out_range=pc,crop=564:756:17:226',
  '-r', '60', '-fps_mode', 'cfr', '-frames:v', '57',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '0', '-pix_fmt', 'yuv420p',
  '-color_range', 'pc', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
  '-movflags', '+faststart', '-y', outputPath,
], { stdio: 'inherit' });

if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`ffmpeg failed with exit code ${result.status}`);

const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'level1-tutorial-frames-'));
try {
  const frameExtraction = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'warning', '-i', sourceVideo,
    '-vf', "select='between(t,1.783333,2.717)',scale=597:1296:flags=lanczos:in_range=pc:out_range=pc,crop=563:756:17:226",
    '-fps_mode', 'passthrough', '-frames:v', '57', '-start_number', '0', '-compression_level', '4', '-y',
    path.join(temporaryDirectory, 'frame-%02d.png'),
  ], { stdio: 'inherit' });
  if (frameExtraction.error) throw frameExtraction.error;
  if (frameExtraction.status !== 0) {
    throw new Error(`ffmpeg tutorial-frame extraction failed with exit code ${frameExtraction.status}`);
  }

  const frameFiles = (await readdir(temporaryDirectory))
    .filter((file) => /^frame-\d{2}\.png$/u.test(file))
    .sort();
  if (frameFiles.length !== 57) {
    throw new Error(`Expected 57 source tutorial frames but extracted ${frameFiles.length}.`);
  }

  const columns = 5;
  const rows = Math.ceil(frameFiles.length / columns);
  const frameOverlays = await Promise.all(frameFiles.map(async (file, index) => ({
    input: await readFile(path.join(temporaryDirectory, file)),
    left: (index % columns) * 563,
    top: Math.floor(index / columns) * 756,
  })));
  await sharp({
    create: {
      width: columns * 563,
      height: rows * 756,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  }).composite(frameOverlays).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(atlasOutputPath);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log(`Saved the 57-frame Level 1 opening gesture clip to ${outputPath}.`);
console.log(`Saved the lossless 563x756 source-frame atlas to ${atlasOutputPath}.`);
