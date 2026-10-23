import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [
  sourceFramesDirectory = '.research/events/level2-frame-sequence/frames',
  decodedVideoFramesDirectory = '.research/events/level2-frame-sequence/source-panel-mp4-frames',
  outputPath = '.research/events/level2-frame-sequence/level2-panel-frame-audit.json',
] = process.argv.slice(2);

const sourceDirectory = path.resolve(root, sourceFramesDirectory);
const videoDirectory = path.resolve(root, decodedVideoFramesDirectory);
const reportPath = path.resolve(root, outputPath);
const listFrames = async (directory) => (await readdir(directory))
  .filter((name) => /^frame-\d+\.(?:jpg|png)$/u.test(name))
  .sort((left, right) => Number(left.match(/\d+/u)[0]) - Number(right.match(/\d+/u)[0]));

const sourceFrames = await listFrames(sourceDirectory);
const videoFrames = await listFrames(videoDirectory);
if (!sourceFrames.length || !videoFrames.length) throw new Error('Both source and decoded video frame folders must contain frames.');

const differences = [];
for (let index = 0; index < videoFrames.length; index += 1) {
  const frameNumber = index + 1;
  const sourcePath = path.join(sourceDirectory, `frame-${String(frameNumber).padStart(4, '0')}.jpg`);
  const videoPath = path.join(videoDirectory, videoFrames[index]);
  const [source, video] = await Promise.all([
    sharp(sourcePath)
      .extract({ left: 17, top: 310, width: 562, height: 666 })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }),
    sharp(videoPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  if (source.info.width !== video.info.width || source.info.height !== video.info.height) {
    throw new Error(`Frame ${frameNumber} dimensions differ: ${source.info.width}x${source.info.height} vs ${video.info.width}x${video.info.height}.`);
  }
  const diffPixels = pixelmatch(
    source.data,
    video.data,
    Buffer.alloc(video.data.length),
    video.info.width,
    video.info.height,
    { threshold: 0.12, includeAA: false },
  );
  let absoluteError = 0;
  for (let pixel = 0; pixel < video.data.length; pixel += 4) {
    absoluteError += Math.abs(source.data[pixel] - video.data[pixel]);
    absoluteError += Math.abs(source.data[pixel + 1] - video.data[pixel + 1]);
    absoluteError += Math.abs(source.data[pixel + 2] - video.data[pixel + 2]);
  }
  const pixelCount = video.info.width * video.info.height;
  differences.push({
    frame: frameNumber,
    sourceTimeSeconds: Number((9.5 + (index / 60)).toFixed(6)),
    changedPixelRatio: diffPixels / pixelCount,
    meanAbsoluteRgbError: absoluteError / (pixelCount * 3),
  });
}

const ratios = differences.map(({ changedPixelRatio }) => changedPixelRatio).sort((left, right) => left - right);
const percentile = (fraction) => ratios[Math.min(ratios.length - 1, Math.floor((ratios.length - 1) * fraction))];
const report = {
  source: 'User recording S5, continuous 60 fps Level 2 sequence',
  sourceFramesDirectory,
  decodedVideoFramesDirectory,
  crop: { left: 17, top: 310, width: 562, height: 666 },
  alignment: 'decoded video frame N compared with source recording frame N',
  comparison: { threshold: 0.12, includeAntialiasing: false },
  sourceFrameCount: sourceFrames.length,
  decodedVideoFrameCount: videoFrames.length,
  checkedFrameCount: differences.length,
  changedPixelRatio: {
    min: ratios[0],
    median: percentile(0.5),
    p95: percentile(0.95),
    max: ratios.at(-1),
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
  reportPath,
}, null, 2));
