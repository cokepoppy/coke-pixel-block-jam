import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const [
  sourceVideo = '/Users/shangguan/Downloads/RPReplay_Final1792661235.MP4',
  outputVideo = 'assets/level5/level5-gameplay-source.mp4',
  outputAudio = 'assets/level5/level5-source-audio.m4a',
  openingPanel = 'assets/level5/level5-opening-panel.png',
  comparisonFrame = 'assets/level5/level5-frame-78.75.png',
] = process.argv.slice(2);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resolve = (filename) => path.resolve(root, filename);
await mkdir(path.dirname(resolve(outputVideo)), { recursive: true });
await mkdir(path.dirname(resolve(outputAudio)), { recursive: true });

function runFfmpeg(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], {
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed with exit code ${result.status}: ${result.stderr}`);
  }
}

const panelFilter = 'scale=597:1296:flags=lanczos,format=rgb24,crop=539:551:29:375,pad=540:552:0:0:color=black,fps=60';
runFfmpeg([
  '-ss', '77.75', '-i', sourceVideo, '-t', '14', '-an',
  '-vf', panelFilter,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', '-y', resolve(outputVideo),
]);

runFfmpeg([
  '-ss', '77.75', '-i', sourceVideo, '-t', '14', '-vn', '-c:a', 'copy', '-y', resolve(outputAudio),
]);

const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'pixel-block-jam-level5-frame-'));
async function saveNormalizedPanel(timeSeconds, destination) {
  const sourceFrame = path.join(temporaryDirectory, `source-${timeSeconds}.png`);
  runFfmpeg(['-ss', String(timeSeconds), '-i', sourceVideo, '-frames:v', '1', '-y', sourceFrame]);
  await sharp(sourceFrame)
    .resize(597, 1296, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .extract({ left: 29, top: 375, width: 539, height: 551 })
    .png({ compressionLevel: 9 })
    .toFile(resolve(destination));
}

try {
  await mkdir(path.dirname(resolve(openingPanel)), { recursive: true });
  await mkdir(path.dirname(resolve(comparisonFrame)), { recursive: true });
  await saveNormalizedPanel(77, openingPanel);
  await saveNormalizedPanel(78.75, comparisonFrame);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log(`Saved the S5 01:17.75–01:31.75 Level 5 panel, mixed source audio, opening panel, and 01:18.75 comparison frame.`);
