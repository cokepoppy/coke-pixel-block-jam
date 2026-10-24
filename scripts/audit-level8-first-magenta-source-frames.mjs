import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [sourceVideo, runtimeVideo = 'assets/level8/level8-first-magenta.webm', reportPath = '.research/events/level-8-02_54-02_59/level8-first-magenta-source-audit.json'] = process.argv.slice(2);
if (!sourceVideo) {
  throw new Error('Usage: node scripts/audit-level8-first-magenta-source-frames.mjs <source-video> [runtime-webm] [report.json]');
}

const absoluteSourceVideo = path.resolve(sourceVideo);
const absoluteRuntimeVideo = path.resolve(root, runtimeVideo);
const absoluteReportPath = path.resolve(root, reportPath);
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'pixel-block-jam-level8-audit-'));
const sourceDirectory = path.join(temporaryDirectory, 'source');
const runtimeDirectory = path.join(temporaryDirectory, 'runtime');
await Promise.all([sourceDirectory, runtimeDirectory].map((directory) => mkdir(directory, { recursive: true })));

function extractFrames(input, outputDirectory, source = false) {
  const outputPattern = path.join(outputDirectory, 'frame-%03d.png');
  const args = source
    ? [
      '-hide_banner', '-loglevel', 'error', '-i', input,
      '-ss', '174.0', '-t', '5.0',
      '-vf', 'scale=597:1296:flags=bicubic,format=yuv444p,crop=541:695:27:280:exact=1',
      '-fps_mode', 'passthrough', '-frames:v', '300', '-start_number', '1', '-compression_level', '4', '-y', outputPattern,
    ]
    : [
      '-hide_banner', '-loglevel', 'error', '-i', input,
      '-fps_mode', 'passthrough', '-frames:v', '143', '-start_number', '1', '-compression_level', '4', '-y', outputPattern,
    ];
  const result = spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg frame extraction failed for ${input}: ${result.stderr}`);
  return readdir(outputDirectory).then((files) => files.filter((file) => file.endsWith('.png')).sort());
}

try {
  const [sourceFrames, runtimeFrames] = await Promise.all([
    extractFrames(absoluteSourceVideo, sourceDirectory, true),
    extractFrames(absoluteRuntimeVideo, runtimeDirectory),
  ]);
  const sourceFirstFrame = 61;
  const frameCount = 143;
  if (sourceFrames.length < sourceFirstFrame + frameCount - 1) {
    throw new Error(`Expected at least ${sourceFirstFrame + frameCount - 1} source frames after 02:54, found ${sourceFrames.length}.`);
  }
  if (runtimeFrames.length !== frameCount) {
    throw new Error(`Expected ${frameCount} runtime frames, found ${runtimeFrames.length}.`);
  }

  const frames = [];
  for (let index = 0; index < frameCount; index += 1) {
    const sourcePath = path.join(sourceDirectory, sourceFrames[sourceFirstFrame - 1 + index]);
    const runtimePath = path.join(runtimeDirectory, runtimeFrames[index]);
    const [source, runtime] = await Promise.all([
      sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
      sharp(runtimePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    ]);
    if (source.info.width !== 541 || source.info.height !== 695
        || runtime.info.width !== source.info.width || runtime.info.height !== source.info.height) {
      throw new Error(`Unexpected frame size at index ${index}: ${source.info.width}x${source.info.height} vs ${runtime.info.width}x${runtime.info.height}.`);
    }
    let exactDifferentPixels = 0;
    let absoluteRgbError = 0;
    for (let offset = 0; offset < source.data.length; offset += 4) {
      if (source.data[offset] !== runtime.data[offset]
          || source.data[offset + 1] !== runtime.data[offset + 1]
          || source.data[offset + 2] !== runtime.data[offset + 2]) exactDifferentPixels += 1;
      absoluteRgbError += Math.abs(source.data[offset] - runtime.data[offset])
        + Math.abs(source.data[offset + 1] - runtime.data[offset + 1])
        + Math.abs(source.data[offset + 2] - runtime.data[offset + 2]);
    }
    const perceptualDifferentPixels = pixelmatch(
      source.data,
      runtime.data,
      Buffer.alloc(runtime.data.length),
      source.info.width,
      source.info.height,
      { threshold: 0.16, includeAA: false },
    );
    frames.push({
      sourceFrame: sourceFirstFrame + index,
      sourceTimeSeconds: Number((175 + index / 60).toFixed(6)),
      runtimeFrame: index,
      exactDifferentPixels,
      perceptualDifferentPixels,
      meanAbsoluteChannelError: absoluteRgbError / (source.info.width * source.info.height * 3),
    });
  }

  const report = {
    sourceVideo: absoluteSourceVideo,
    runtimeVideo: absoluteRuntimeVideo,
    sourceInterval: { start: '00:02:55.000', endExclusive: '00:02:57.383', fps: 60, frames: frameCount },
    sourcePanelCrop: { x: 27, y: 280, width: 541, height: 695, normalizedFrom: '597x1296' },
    sourceFrameMapping: { first: sourceFirstFrame, last: sourceFirstFrame + frameCount - 1 },
    comparison: { pixelmatchThreshold: 0.16, includeAntialiasing: false },
    framesCompared: frames.length,
    framesWithExactPixelDifferences: frames.filter(({ exactDifferentPixels }) => exactDifferentPixels > 0).length,
    framesWithPerceptualDifferences: frames.filter(({ perceptualDifferentPixels }) => perceptualDifferentPixels > 0).length,
    maximumExactDifferentPixels: Math.max(...frames.map(({ exactDifferentPixels }) => exactDifferentPixels)),
    maximumPerceptualDifferentPixels: Math.max(...frames.map(({ perceptualDifferentPixels }) => perceptualDifferentPixels)),
    maximumMeanAbsoluteChannelError: Math.max(...frames.map(({ meanAbsoluteChannelError }) => meanAbsoluteChannelError)),
    frames,
  };
  await mkdir(path.dirname(absoluteReportPath), { recursive: true });
  await writeFile(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    report: absoluteReportPath,
    framesCompared: report.framesCompared,
    framesWithExactPixelDifferences: report.framesWithExactPixelDifferences,
    framesWithPerceptualDifferences: report.framesWithPerceptualDifferences,
    maximumExactDifferentPixels: report.maximumExactDifferentPixels,
    maximumPerceptualDifferentPixels: report.maximumPerceptualDifferentPixels,
    maximumMeanAbsoluteChannelError: report.maximumMeanAbsoluteChannelError,
  }, null, 2));
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
