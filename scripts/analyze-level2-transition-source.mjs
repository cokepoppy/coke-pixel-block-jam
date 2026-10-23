import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const framesDirectory = process.argv[2] ?? '.research/events/level2-frame-sequence/frames';
const outputPath = process.argv[3] ?? 'e2e/fixtures/level2-transition-source.json';
const sequenceStartSeconds = 9.5;
const framesPerSecond = 60;
const firstBrandFrame = 517;
const lastBrandFrame = 576;
const revealStartFrame = 576;
const revealEndFrame = 588;
const width = 597;
const height = 1296;
const center = { x: (width - 1) / 2, y: (height - 1) / 2 };
const normalizedDiagonalRadius = Math.hypot(width, height) / Math.SQRT2;

function framePath(frame) {
  return path.join(framesDirectory, `frame-${String(frame).padStart(4, '0')}.jpg`);
}

function toHsl(r0, g0, b0) {
  const r = r0 / 255;
  const g = g0 / 255;
  const b = b0 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (delta > 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }

  return { hue, saturation, lightness };
}

async function loadFrame(frame) {
  const image = await sharp(framePath(frame)).raw().toBuffer({ resolveWithObject: true });
  if (image.info.width !== width || image.info.height !== height || image.info.channels !== 3) {
    throw new Error(`frame ${frame} must be ${width}x${height} RGB`);
  }
  return image.data;
}

function logoBounds(pixels) {
  const bounds = { left: width, top: height, right: -1, bottom: -1, pixels: 0 };
  for (let y = 490; y < 800; y += 1) {
    for (let x = 125; x < 480; x += 1) {
      const index = (y * width + x) * 3;
      const { hue, saturation, lightness } = toHsl(
        pixels[index], pixels[index + 1], pixels[index + 2],
      );
      const sourceLogoColor = hue < 20 || hue > 340
        || (hue >= 20 && hue <= 70)
        || (hue >= 70 && hue <= 165)
        || (hue >= 260 && hue <= 335);
      if (!sourceLogoColor || saturation <= 0.45 || lightness <= 0.18 || lightness >= 0.88) continue;
      bounds.left = Math.min(bounds.left, x);
      bounds.right = Math.max(bounds.right, x);
      bounds.top = Math.min(bounds.top, y);
      bounds.bottom = Math.max(bounds.bottom, y);
      bounds.pixels += 1;
    }
  }

  if (bounds.pixels === 0) return null;
  return {
    x: bounds.left,
    y: bounds.top,
    width: bounds.right - bounds.left + 1,
    height: bounds.bottom - bounds.top + 1,
    pixels: bounds.pixels,
  };
}

function median(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function visibleRadiusPercent(current, baseline) {
  let lastVisibleRadius = 0;
  for (let radius = 12; radius <= Math.ceil(normalizedDiagonalRadius); radius += 2) {
    let changedSamples = 0;
    let samples = 0;
    for (let angle = 0; angle < 360; angle += 2) {
      const radians = angle * Math.PI / 180;
      const x = Math.round(center.x + Math.cos(radians) * radius);
      const y = Math.round(center.y + Math.sin(radians) * radius);
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const index = (y * width + x) * 3;
      const difference = Math.max(
        Math.abs(current[index] - baseline[index]),
        Math.abs(current[index + 1] - baseline[index + 1]),
        Math.abs(current[index + 2] - baseline[index + 2]),
      );
      if (difference > 35) changedSamples += 1;
      samples += 1;
    }
    if (samples > 0 && changedSamples / samples > 0.2) lastVisibleRadius = radius;
  }
  return Math.min(100, (lastVisibleRadius / normalizedDiagonalRadius) * 100);
}

const measurements = new Map();
for (let frame = firstBrandFrame; frame <= lastBrandFrame; frame += 1) {
  measurements.set(frame, logoBounds(await loadFrame(frame)));
}

const stableBounds = Array.from({ length: 23 }, (_, index) => measurements.get(534 + index))
  .filter(Boolean);
const baseline = {
  width: median(stableBounds.map(({ width: frameWidth }) => frameWidth)),
  height: median(stableBounds.map(({ height: frameHeight }) => frameHeight)),
};

const sourceFrames = Array.from({ length: lastBrandFrame - firstBrandFrame + 1 }, (_, index) => {
  const frame = firstBrandFrame + index;
  const bounds = measurements.get(frame);
  return {
    frame,
    sourceTimeSeconds: Number((sequenceStartSeconds + (frame - 1) / framesPerSecond).toFixed(3)),
    elapsedMs: Number(((frame - firstBrandFrame) / framesPerSecond * 1000).toFixed(1)),
    visible: Boolean(bounds),
    scale: bounds
      ? Number(Math.sqrt((bounds.width * bounds.height) / (baseline.width * baseline.height)).toFixed(4))
      : 0,
    bounds,
  };
});

const revealBaseline = await loadFrame(revealStartFrame - 1);
const revealFrames = [];
for (let frame = revealStartFrame; frame <= revealEndFrame; frame += 1) {
  revealFrames.push({
    frame,
    sourceTimeSeconds: Number((sequenceStartSeconds + (frame - 1) / framesPerSecond).toFixed(3)),
    elapsedMs: Number(((frame - firstBrandFrame) / framesPerSecond * 1000).toFixed(1)),
    radiusPercent: Number(visibleRadiusPercent(await loadFrame(frame), revealBaseline).toFixed(2)),
  });
}

const output = {
  source: {
    recording: 'RPReplay_Final1792661235.MP4',
    frameSequence: '.research/events/level2-frame-sequence/frames',
    sequenceStartSeconds,
    framesPerSecond,
    normalizedResolution: `${width}x${height}`,
    firstBrandFrame,
    brandFrameTimeSeconds: 18.1,
    finalProgressToBrandStartMs: 900,
    stableLogoBounds: baseline,
    logoMask: 'HSL saturation > 0.45; lightness 0.18-0.88; green/red/yellow/purple hue ranges, center crop x=125..479 y=490..799',
    revealMask: 'RGB channel difference > 35 from frame 575; radial occupancy > 20%; radius normalized by the screen diagonal',
    firstFullLevelThreeFrame: 589,
    firstFullLevelThreeTimeSeconds: 19.3,
  },
  logoFrames: sourceFrames,
  revealFrames,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${sourceFrames.length} logo and ${revealFrames.length} reveal frame measurements to ${outputPath}`);
