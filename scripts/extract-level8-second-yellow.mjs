import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [sourceVideo, outputDirectory = 'assets/level8'] = process.argv.slice(2);
if (!sourceVideo) {
  throw new Error('Usage: node scripts/extract-level8-second-yellow.mjs <source-video> [output-directory]');
}

const startTime = '177.383333';
const duration = '1.6';
const absoluteOutputDirectory = path.resolve(outputDirectory);
await mkdir(absoluteOutputDirectory, { recursive: true });

const outputs = [
  {
    name: 'level8-second-yellow.webm',
    args: [
      '-hide_banner', '-loglevel', 'warning', '-i', sourceVideo,
      '-ss', startTime, '-t', duration,
      '-vf', 'scale=597:1296:flags=bicubic,format=yuv444p,crop=541:695:27:280:exact=1,setpts=PTS-STARTPTS',
      '-frames:v', '95', '-fps_mode', 'passthrough',
      '-c:v', 'libvpx-vp9', '-lossless', '1', '-pix_fmt', 'yuv444p', '-row-mt', '1',
      '-g', '6', '-lag-in-frames', '0', '-auto-alt-ref', '0',
      '-an', '-y', path.join(absoluteOutputDirectory, 'level8-second-yellow.webm'),
    ],
  },
  {
    name: 'level8-second-yellow-audio.m4a',
    args: [
      '-hide_banner', '-loglevel', 'warning', '-i', sourceVideo,
      '-ss', startTime, '-t', duration, '-map', '0:a:0', '-vn',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
      '-y', path.join(absoluteOutputDirectory, 'level8-second-yellow-audio.m4a'),
    ],
  },
];

for (const output of outputs) {
  const result = spawnSync('ffmpeg', output.args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg failed while creating ${output.name}: ${result.status}`);
  console.log(`Saved ${path.join(absoluteOutputDirectory, output.name)} from source time 00:02:57.383–00:02:58.950.`);
}
