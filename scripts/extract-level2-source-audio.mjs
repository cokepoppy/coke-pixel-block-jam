import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [sourceVideo, outputPath = 'assets/level2/level2-source-audio.m4a'] = process.argv.slice(2);
if (!sourceVideo) {
  throw new Error('Usage: node scripts/extract-level2-source-audio.mjs <source-video> [output.m4a]');
}

await mkdir(path.dirname(outputPath), { recursive: true });
const result = spawnSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'warning',
  '-ss', '9.5', '-i', sourceVideo, '-t', '9.8',
  '-map', '0:a:0', '-vn', '-c:a', 'aac', '-b:a', '192k',
  '-movflags', '+faststart', '-y', outputPath,
], { stdio: 'inherit' });

if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`ffmpeg failed with exit code ${result.status}`);
console.log(`Saved Level 2 source gameplay and transition audio to ${outputPath}.`);
