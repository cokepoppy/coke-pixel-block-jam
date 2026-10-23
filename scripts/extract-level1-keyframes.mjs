import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const [sourceVideo, outputDirectory = 'assets/level1/keyframes'] = process.argv.slice(2);
if (!sourceVideo) {
  throw new Error('Usage: node scripts/extract-level1-keyframes.mjs <source-video> [output-directory]');
}

const keyframes = [
  ['yellow-6', 60], ['yellow-36', 75], ['yellow-63', 90], ['yellow-99', 105], ['yellow-100', 120],
  ['green-25', 195], ['green-48', 204], ['green-71', 213], ['green-85', 222], ['green-99', 231], ['green-100', 240],
  ['red-3', 240], ['red-6', 252], ['red-69', 254], ['red-72', 255], ['red-77', 257],
  ['red-82', 260], ['red-86', 262], ['red-92', 263], ['red-96', 267], ['red-100', null],
];

const scratchDirectory = await mkdtemp(path.join(os.tmpdir(), 'pixel-block-jam-level1-'));
try {
  const selectedFrames = [...new Set(keyframes
    .map(([, sourceFrame]) => sourceFrame)
    .filter((sourceFrame) => sourceFrame !== null))];
  const selection = selectedFrames.map((sourceFrame) => `eq(n,${sourceFrame})`).join('+');
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'warning',
    '-ss', '2.3', '-i', sourceVideo,
    '-vf', `scale=597:1296:flags=lanczos:in_range=pc:out_range=pc,crop=563:756:17:226,select='${selection}'`,
    '-fps_mode', 'passthrough', '-frames:v', String(selectedFrames.length), '-start_number', '0', '-y',
    path.join(scratchDirectory, 'frame-%02d.png'),
  ], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg failed with exit code ${result.status}`);

  const finalRedFramePath = path.join(scratchDirectory, 'red-final.png');
  const finalRedResult = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'warning', '-ss', '6.85', '-i', sourceVideo,
    '-frames:v', '1', '-vf', 'scale=597:1296:flags=lanczos:in_range=pc:out_range=pc,crop=563:756:17:226', '-update', '1',
    '-y', finalRedFramePath,
  ], { stdio: 'inherit' });
  if (finalRedResult.error) throw finalRedResult.error;
  if (finalRedResult.status !== 0) throw new Error(`ffmpeg final red keyframe failed with exit code ${finalRedResult.status}`);

  await mkdir(outputDirectory, { recursive: true });
  const manifest = [];
  for (let index = 0; index < keyframes.length; index += 1) {
    const [name, sourceFrame] = keyframes[index];
    const sourcePath = sourceFrame === null
      ? finalRedFramePath
      : path.join(scratchDirectory, `frame-${String(selectedFrames.indexOf(sourceFrame)).padStart(2, '0')}.png`);
    const outputPath = path.join(outputDirectory, `${name}.webp`);
    await sharp(sourcePath).webp({ lossless: true, quality: 100 }).toFile(outputPath);
    const sourceTimeSeconds = sourceFrame === null ? 6.85 : 2.3 + sourceFrame / 60;
    manifest.push({ name, sourceTimeSeconds: Number(sourceTimeSeconds.toFixed(4)), asset: `${name}.webp` });
  }
  await writeFile(path.join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Saved ${keyframes.length} source keyframes to ${outputDirectory}.`);
} finally {
  await rm(scratchDirectory, { recursive: true, force: true });
}
