import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [sourceVideo, outputDirectory = 'assets/level11'] = process.argv.slice(2);
if (!sourceVideo) {
  throw new Error('Usage: node scripts/extract-level11-source-sweeps.mjs <source-video> [output-directory]');
}

const absoluteOutputDirectory = path.resolve(outputDirectory);
await mkdir(absoluteOutputDirectory, { recursive: true });

const clips = [
  { name: 'first-purple', start: '323.8', duration: '1.4', frames: 84 },
  { name: 'second-purple', start: '325.6', duration: '1.2', frames: 72 },
];

for (const clip of clips) {
  const baseName = `level11-${clip.name}`;
  const videoPath = path.join(absoluteOutputDirectory, `${baseName}.webm`);
  const audioPath = path.join(absoluteOutputDirectory, `${baseName}-audio.m4a`);
  const video = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'warning', '-i', sourceVideo,
    '-ss', clip.start, '-t', clip.duration,
    '-vf', 'scale=597:1296:flags=bicubic,format=yuv444p,crop=541:470:27:165:exact=1,setpts=PTS-STARTPTS',
    '-frames:v', String(clip.frames), '-fps_mode', 'passthrough',
    '-c:v', 'libvpx-vp9', '-lossless', '1', '-pix_fmt', 'yuv444p', '-row-mt', '1',
    '-g', '6', '-lag-in-frames', '0', '-auto-alt-ref', '0',
    '-an', '-y', videoPath,
  ], { stdio: 'inherit' });
  if (video.error) throw video.error;
  if (video.status !== 0) throw new Error(`ffmpeg failed to create ${videoPath}: ${video.status}`);

  const audio = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'warning', '-i', sourceVideo,
    '-ss', clip.start, '-t', clip.duration, '-map', '0:a:0', '-vn',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-y', audioPath,
  ], { stdio: 'inherit' });
  if (audio.error) throw audio.error;
  if (audio.status !== 0) throw new Error(`ffmpeg failed to create ${audioPath}: ${audio.status}`);

  console.log(`Saved ${baseName} (${clip.frames} frames) from source time ${clip.start}s.`);
}
