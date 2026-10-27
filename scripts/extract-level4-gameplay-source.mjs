import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const [
  sourceVideo = '/Users/shangguan/Downloads/RPReplay_Final1792661235.MP4',
  outputVideo = 'assets/level4/level4-gameplay-source.mp4',
  outputAudio = 'assets/level4/level4-source-audio.m4a',
  referenceFrame = 'assets/level4/level4-frame-55.5.png',
] = process.argv.slice(2);

await mkdir(path.dirname(outputVideo), { recursive: true });
await mkdir(path.dirname(outputAudio), { recursive: true });

function runFfmpeg(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], {
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed with exit code ${result.status}: ${result.stderr}`);
  }
}

runFfmpeg([
  '-ss', '54.5', '-i', sourceVideo, '-t', '15', '-an',
  '-vf', 'crop=1126:1412:34:570,scale=563:706:flags=lanczos,pad=564:706:0:0:color=black,fps=60',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', '-y', outputVideo,
]);

runFfmpeg([
  '-ss', '54.5', '-i', sourceVideo, '-t', '15', '-vn', '-c:a', 'copy', '-y', outputAudio,
]);

const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'pixel-block-jam-level4-frame-'));
const sourceFrame = path.join(temporaryDirectory, 'source-frame.png');
try {
  runFfmpeg(['-ss', '55.5', '-i', sourceVideo, '-frames:v', '1', '-y', sourceFrame]);
  await sharp(sourceFrame)
    .extract({ left: 34, top: 570, width: 1126, height: 1412 })
    .resize(563, 706, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toFile(referenceFrame);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log(`Saved the S5 00:54.5–01:09.5 Level 4 panel and source audio to ${outputVideo} and ${outputAudio}; frame S5 00:55.5 is ${referenceFrame}.`);
