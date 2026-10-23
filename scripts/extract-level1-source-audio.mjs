import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [sourceVideo, outputPath = 'assets/level1/level1-source-audio.m4a'] = process.argv.slice(2);
if (!sourceVideo) {
  throw new Error('Usage: node scripts/extract-level1-source-audio.mjs <source-video> [output.m4a]');
}

await mkdir(path.dirname(outputPath), { recursive: true });
const result = spawnSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'warning',
  '-ss', '2.3', '-i', sourceVideo, '-t', '6.55',
  '-map', '0:a:0', '-vn', '-c:a', 'aac', '-b:a', '192k',
  '-movflags', '+faststart', '-y', outputPath,
], { stdio: 'inherit' });

if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`ffmpeg failed with exit code ${result.status}`);
console.log(`Saved Level 1 source action and win-transition audio to ${outputPath}.`);
