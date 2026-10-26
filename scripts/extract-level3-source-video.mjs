import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [sourceVideo, outputPath = 'assets/level3/level3-gameplay-source.mp4'] = process.argv.slice(2);
const sourceStartSeconds = 19.9;
const sourceDurationSeconds = 23;
if (!sourceVideo) {
  throw new Error('Usage: node scripts/extract-level3-source-video.mjs <source-video> [output.mp4]');
}

await mkdir(path.dirname(outputPath), { recursive: true });
const result = spawnSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'warning',
  '-ss', String(sourceStartSeconds), '-i', sourceVideo, '-t', String(sourceDurationSeconds),
  '-vf', 'scale=597:1296:flags=lanczos:in_range=pc:out_range=pc,crop=554:820:22:162,format=rgb24',
  '-fps_mode', 'passthrough', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '0',
  '-pix_fmt', 'yuvj420p', '-movflags', '+faststart', '-y', outputPath,
], { stdio: 'inherit' });

if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`ffmpeg failed with exit code ${result.status}`);
console.log(`Saved the Level 3 source gameplay panel from 00:19.9–00:42.9 to ${outputPath}.`);
