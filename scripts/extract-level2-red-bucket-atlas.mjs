import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { levelTwoSourceArrivalAt } from '../src/level-two-collection-profile.js';

const [sourceVideo = 'assets/level2/level2-gameplay-source.mp4', output = 'assets/level2/level2-red-bucket-atlas.png'] = process.argv.slice(2);
const columns = 10;
const tile = { width: 208, height: 205 };
const crop = { left: 330, top: 220, ...tile };
const mask = Buffer.from(`<svg width="208" height="205" xmlns="http://www.w3.org/2000/svg"><path fill="white" d="M 2 16 Q 2 1 18 1 H 189 Q 205 1 205 17 V 188 Q 205 203 189 203 H 120 Q 103 203 103 188 V 128 Q 103 114 89 114 H 18 Q 2 114 2 98 Z"/></svg>`);
// The red tray arrives at clip time 0.3 s. Thereafter its recorded label
// follows the source progress profile, starting at clip time 0.2 s.
const samples = Array.from({ length: 101 }, (_, progress) => ({
  progress,
  frame: Math.round((progress === 0 ? 0.3 : 0.2 + levelTwoSourceArrivalAt('red', progress, 0) / 1000) * 60),
}));
const firstFrame = Math.min(...samples.map(({ frame }) => frame));
const lastFrame = Math.max(...samples.map(({ frame }) => frame));
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'pixel-block-jam-level2-red-'));

try {
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', sourceVideo,
    '-vf', `select='between(n,${firstFrame},${lastFrame})'`,
    '-fps_mode', 'passthrough', '-start_number', '0', '-y',
    path.join(temporaryDirectory, 'frame-%04d.png'),
  ], { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr}`);
  const frames = (await readdir(temporaryDirectory)).filter(name => name.endsWith('.png')).sort();
  if (frames.length !== lastFrame - firstFrame + 1) throw new Error('The source frame range is incomplete.');
  const layers = [];
  for (const { progress, frame } of samples) {
    const sprite = await sharp(path.join(temporaryDirectory, frames[frame - firstFrame]))
      .extract(crop).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    layers.push({ input: sprite, left: (progress % columns) * tile.width, top: Math.floor(progress / columns) * tile.height });
  }
  await sharp({ create: { width: columns * tile.width, height: Math.ceil(samples.length / columns) * tile.height,
    channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers).png({ compressionLevel: 9 }).toFile(output);
  console.log(`Saved ${output}: ${samples.length} masked source red-tray frames, ${columns} columns.`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
