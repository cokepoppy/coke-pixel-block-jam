import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const [sourceVideo = 'assets/level2/level2-gameplay-source.mp4', output = 'assets/level2/level2-green-bucket-atlas.png'] = process.argv.slice(2);
const columns = 10;
const tile = { width: 208, height: 206 };
// The source crop includes the tray body but excludes the falling pixels above
// it. The transparent mask keeps the unoccupied corner of the L transparent.
const crop = { left: 31, top: 220, ...tile };
const mask = Buffer.from(`<svg width="208" height="206" xmlns="http://www.w3.org/2000/svg"><path fill="white" d="M 2 16 Q 2 2 17 2 H 188 Q 205 2 205 19 V 79 Q 205 99 185 99 H 113 Q 99 99 99 113 V 182 Q 99 201 82 201 H 17 Q 1 201 1 183 Z"/></svg>`);
// Read from the actual encoded clip: 25% at 3.2 s, 45% at 3.3 s,
// 60% at 3.4 s, 72% at 3.5 s, 87% at 3.6 s, and 100% at 3.8 s.
const progressTimes = [[0, 3.0], [25, 3.2], [45, 3.3], [60, 3.4], [72, 3.5], [87, 3.6], [97, 3.7], [100, 3.8]];
const samples = Array.from({ length: 101 }, (_, progress) => {
  let time = 2.8;
  if (progress > 0) {
    const end = progressTimes.findIndex(([value]) => value >= progress);
    const [a, aTime] = progressTimes[end - 1];
    const [b, bTime] = progressTimes[end];
    time = aTime + ((progress - a) / (b - a)) * (bTime - aTime);
  }
  return { progress, frame: Math.round(time * 60) };
});
const firstFrame = Math.min(...samples.map(({ frame }) => frame));
const lastFrame = Math.max(...samples.map(({ frame }) => frame));
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'pixel-block-jam-level2-green-'));

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
  const cleanOpeningRim = await sharp('assets/level2/level2-opening-panel.png')
    .extract({ left: 31, top: 421, width: 208, height: 15 }).png().toBuffer();
  const layers = [];
  for (const { progress, frame } of samples) {
    const operations = progress === 0 ? [{ input: cleanOpeningRim, left: 0, top: 0 }] : [];
    operations.push({ input: mask, blend: 'dest-in' });
    const sprite = await sharp(path.join(temporaryDirectory, frames[frame - firstFrame]))
      .extract(crop).ensureAlpha().composite(operations).png().toBuffer();
    layers.push({ input: sprite, left: (progress % columns) * tile.width, top: Math.floor(progress / columns) * tile.height });
  }
  await sharp({ create: { width: columns * tile.width, height: Math.ceil(samples.length / columns) * tile.height,
    channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers).png({ compressionLevel: 9 }).toFile(output);
  console.log(`Saved ${output}: ${samples.length} masked source green-tray frames, ${columns} columns.`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
