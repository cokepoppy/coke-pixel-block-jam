import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [sourceVideo, outputPath = 'assets/music/original-game-idle-loop.m4a'] = process.argv.slice(2);
const sourceStartSeconds = 47;
const sourceDurationSeconds = 4;
if (!sourceVideo) {
  throw new Error('Usage: node scripts/extract-source-idle-music.mjs <source-video> [output.m4a]');
}

await mkdir(path.dirname(outputPath), { recursive: true });
const result = spawnSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'warning',
  '-ss', String(sourceStartSeconds), '-i', sourceVideo, '-t', String(sourceDurationSeconds),
  '-map', '0:a:0', '-vn', '-c:a', 'aac', '-b:a', '192k',
  '-movflags', '+faststart', '-y', outputPath,
], { stdio: 'inherit' });

if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`ffmpeg failed with exit code ${result.status}`);
console.log(`Saved the idle original game audio loop from 00:47–00:51 to ${outputPath}.`);
