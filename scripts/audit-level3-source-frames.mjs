import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [
  sourceFramesDirectory = '.research/events/level3-full-route/source-normalized',
  decodedVideoFramesDirectory = '.research/events/level3-full-route/asset-decoded-full',
  outputPath = '.research/events/level3-full-route/full-frame-audit.json',
] = process.argv.slice(2);

const sourceDirectory = path.resolve(root, sourceFramesDirectory);
const videoDirectory = path.resolve(root, decodedVideoFramesDirectory);
const reportPath = path.resolve(root, outputPath);
const frameName = (index) => `frame-${String(index).padStart(4, '0')}.png`;
const listFrames = async (directory) => (await readdir(directory))
  .filter((name) => /^frame-\d+\.png$/u.test(name))
  .sort((left, right) => Number(left.match(/\d+/u)[0]) - Number(right.match(/\d+/u)[0]));

const sourceFrames = await listFrames(sourceDirectory);
const videoFrames = await listFrames(videoDirectory);
if (sourceFrames.length < 480 || videoFrames.length !== sourceFrames.length) {
  throw new Error(`Expected matching source/video sequences with at least 480 frames; got ${sourceFrames.length} and ${videoFrames.length}.`);
}

const crop = { left: 22, top: 162, width: 554, height: 820 };
const differences = [];
for (let index = 0; index < sourceFrames.length; index += 1) {
  const expectedPath = path.join(sourceDirectory, frameName(index));
  const actualPath = path.join(videoDirectory, frameName(index));
  const [source, video] = await Promise.all([
    sharp(expectedPath).extract(crop).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(actualPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  if (source.info.width !== crop.width || source.info.height !== crop.height
      || video.info.width !== crop.width || video.info.height !== crop.height) {
    throw new Error(`Frame ${index} dimensions are not ${crop.width}x${crop.height}.`);
  }

  const diffPixels = pixelmatch(
    source.data,
    video.data,
    Buffer.alloc(video.data.length),
    crop.width,
    crop.height,
    { threshold: 0.12, includeAA: false },
  );
  let absoluteRgbError = 0;
  for (let offset = 0; offset < video.data.length; offset += 4) {
    absoluteRgbError += Math.abs(source.data[offset] - video.data[offset]);
    absoluteRgbError += Math.abs(source.data[offset + 1] - video.data[offset + 1]);
    absoluteRgbError += Math.abs(source.data[offset + 2] - video.data[offset + 2]);
  }
  const pixelCount = crop.width * crop.height;
  differences.push({
    frame: index,
    sourceTimeSeconds: Number((19.9 + (index / 60)).toFixed(6)),
    changedPixelRatio: diffPixels / pixelCount,
    meanAbsoluteRgbError: absoluteRgbError / (pixelCount * 3),
  });
}

const ratios = differences.map(({ changedPixelRatio }) => changedPixelRatio).sort((left, right) => left - right);
const percentile = (fraction) => ratios[Math.min(ratios.length - 1, Math.floor((ratios.length - 1) * fraction))];
const report = {
  source: `User recording S5, Level 3 sequence 00:19.9-${(19.9 + (sourceFrames.length / 60)).toFixed(1)} at 60 fps`,
  sourceFramesDirectory,
  decodedVideoFramesDirectory,
  crop,
  alignment: 'decoded browser asset frame N compared with source recording frame N',
  comparison: { threshold: 0.12, includeAntialiasing: false },
  sourceFrameCount: sourceFrames.length,
  decodedVideoFrameCount: videoFrames.length,
  checkedFrameCount: differences.length,
  frameRate: 60,
  durationSeconds: sourceFrames.length / 60,
  changedPixelRatio: {
    min: ratios[0],
    median: percentile(0.5),
    p95: percentile(0.95),
    max: ratios.at(-1),
  },
  meanAbsoluteRgbError: {
    min: Math.min(...differences.map(({ meanAbsoluteRgbError }) => meanAbsoluteRgbError)),
    median: [...differences.map(({ meanAbsoluteRgbError }) => meanAbsoluteRgbError)]
      .sort((left, right) => left - right)[Math.floor((differences.length - 1) * 0.5)],
    p95: [...differences.map(({ meanAbsoluteRgbError }) => meanAbsoluteRgbError)]
      .sort((left, right) => left - right)[Math.floor((differences.length - 1) * 0.95)],
    max: Math.max(...differences.map(({ meanAbsoluteRgbError }) => meanAbsoluteRgbError)),
  },
  frames: differences,
};

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  checked: report.checkedFrameCount,
  sourceFrames: report.sourceFrameCount,
  decodedVideoFrames: report.decodedVideoFrameCount,
  changedPixelRatio: report.changedPixelRatio,
  meanAbsoluteRgbError: report.meanAbsoluteRgbError,
  reportPath,
}, null, 2));
