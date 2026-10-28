import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const [video = 'assets/level1/level1-source-animation.mp4', output = 'assets/level1/level1-green-bucket-atlas.png'] = process.argv.slice(2);
const width = 125, height = 247, columns = 10;
// Percentages sampled from the user's encoded clip. The green tray is settled
// at x=32, y=271 in the cropped source panel during this interval.
const observed = [[0, 2.95], [6, 3.05], [15, 3.2], [40, 3.35], [60, 3.5], [82, 3.65], [96, 3.8], [100, 3.95]];
const timeFor = value => {
  if (value === 0) return observed[0][1];
  const index = observed.findIndex(([progress]) => progress >= value);
  const [low, lowTime] = observed[index - 1], [high, highTime] = observed[index];
  return lowTime + (value - low) / (high - low) * (highTime - lowTime);
};
const samples = Array.from({ length: 101 }, (_, progress) => ({ progress, frame: Math.round(timeFor(progress) * 60) }));
const first = samples[0].frame, last = samples.at(-1).frame;
const temporary = await mkdtemp(path.join(os.tmpdir(), 'pixel-block-jam-level1-green-'));

async function eraseRecordedNumber(sprite) {
  const pixels = await sharp(sprite).ensureAlpha().raw().toBuffer();
  const original = Buffer.from(pixels);
  const seeds = new Uint8Array(width * height);
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < 48; y += 1) for (let x = 34; x < width; x += 1) {
    const offset = (y * width + x) * 4;
    const [r, g, b] = original.subarray(offset, offset + 3);
    if (r > 175 && g > 175 && b > 175 && Math.max(r, g, b) - Math.min(r, g, b) < 70) seeds[y * width + x] = 1;
  }
  for (let y = 0; y < 48; y += 1) for (let x = 34; x < width; x += 1) {
    if (!seeds[y * width + x]) continue;
    for (let dy = -5; dy <= 5; dy += 1) for (let dx = -5; dx <= 5; dx += 1) {
      if (dx * dx + dy * dy > 25) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) mask[ny * width + nx] = 1;
    }
  }
  for (let y = 0; y < 53; y += 1) for (let x = 29; x < width; x += 1) {
    if (!mask[y * width + x]) continue;
    const neighbors = [];
    for (let distance = 1; distance <= 36 && neighbors.length < 2; distance += 1) {
      for (const [nx, ny] of [[x - distance, y], [x + distance, y], [x, y - distance], [x, y + distance]]) {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || mask[ny * width + nx]) continue;
        const offset = (ny * width + nx) * 4;
        if (original[offset + 3] < 250) continue;
        neighbors.push(offset);
      }
    }
    if (!neighbors.length) continue;
    const offset = (y * width + x) * 4;
    for (let channel = 0; channel < 3; channel += 1) {
      pixels[offset + channel] = Math.round(neighbors.reduce((sum, index) => sum + original[index + channel], 0) / neighbors.length);
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
}
try {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', video,
    '-vf', `select='between(n,${first},${last})'`, '-fps_mode', 'passthrough', '-start_number', '0', '-y',
    path.join(temporary, 'frame-%04d.png')], { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr);
  const frames = (await readdir(temporary)).filter(file => file.endsWith('.png')).sort();
  if (frames.length !== last - first + 1) throw new Error('The source frame range is incomplete.');
  const opening = await sharp('assets/level1/level1-opening-panel.png')
    .extract({ left: 32, top: 517, width, height: 239 }).resize(width, height).ensureAlpha().png().toBuffer();
  const openingTop = await sharp(opening).extract({ left: 0, top: 0, width, height: 14 }).png().toBuffer();
  const patchWidth = 42, patchHeight = 100;
  const initialPatch = await sharp(opening).extract({ left: 0, top: 0, width: patchWidth, height: patchHeight }).raw().toBuffer();
  const finalPatch = await sharp(path.join(temporary, frames.at(-1)))
    .extract({ left: 32, top: 271, width: patchWidth, height: patchHeight }).ensureAlpha().raw().toBuffer();
  const mask = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="123" height="245" rx="16" fill="white"/></svg>`);
  const layers = [];
  for (const { progress, frame } of samples) {
    // The phone's volume HUD obscures the upper-left part of the source for
    // early progress. Blend the clean opening and unobstructed final patch;
    // those pixels are an approximation, never the platform overlay itself.
    const patch = Buffer.alloc(initialPatch.length);
    const ratio = progress / 100;
    for (let index = 0; index < patch.length; index += 4) {
      const pixel = index / 4, x = pixel % patchWidth, y = Math.floor(pixel / patchWidth);
      for (let channel = 0; channel < 3; channel += 1) {
        patch[index + channel] = Math.round(initialPatch[index + channel] * (1 - ratio) + finalPatch[index + channel] * ratio);
      }
      // Fade only beyond the HUD's footprint to avoid a visible rectangular seam.
      patch[index + 3] = Math.round(255 * Math.min(1, (patchWidth - x) / 8, (patchHeight - y) / 8));
    }
    const patchPng = await sharp(patch, { raw: { width: patchWidth, height: patchHeight, channels: 4 } }).png().toBuffer();
    const source = progress === 0 ? sharp(opening) : sharp(path.join(temporary, frames[frame - first])).extract({ left: 32, top: 271, width, height });
    const spriteWithNumber = await source.ensureAlpha().composite([
      { input: openingTop, left: 0, top: 0 }, { input: patchPng, left: 0, top: 0 }, { input: mask, blend: 'dest-in' },
    ]).png().toBuffer();
    const sprite = await eraseRecordedNumber(spriteWithNumber);
    layers.push({ input: sprite, left: (progress % columns) * width, top: Math.floor(progress / columns) * height });
  }
  await sharp({ create: { width: columns * width, height: Math.ceil(samples.length / columns) * height, channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers).png({ compressionLevel: 9 }).toFile(output);
  console.log(`Saved ${output}: ${samples.length} green-tray frames with the volume HUD excluded.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
