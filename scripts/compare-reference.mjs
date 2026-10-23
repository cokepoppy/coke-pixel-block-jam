import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';

function parseBox(value, label) {
  const parts = value.split(',').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part)) || parts.some((part) => part < 0) || parts[2] < 1 || parts[3] < 1) {
    throw new Error(`${label} must be four comma-separated non-negative integers: x,y,width,height`);
  }
  return { left: parts[0], top: parts[1], width: parts[2], height: parts[3] };
}

function parseBoxes(values = []) {
  return values.flatMap((value) => value.split(';').filter(Boolean).map((box) => parseBox(box, 'Ignore region')));
}

function validateBox(box, metadata, label) {
  if (box.left + box.width > metadata.width || box.top + box.height > metadata.height) {
    throw new Error(`${label} ${box.left},${box.top},${box.width},${box.height} exceeds ${metadata.width}x${metadata.height}`);
  }
}

function maskRegions(expected, actual, width, height, regions) {
  let ignoredPixels = 0;
  for (const region of regions) {
    validateBox(region, { width, height }, 'Ignore region');
    for (let y = region.top; y < region.top + region.height; y += 1) {
      for (let x = region.left; x < region.left + region.width; x += 1) {
        const offset = (y * width + x) * 4;
        expected[offset] = actual[offset] = 127;
        expected[offset + 1] = actual[offset + 1] = 127;
        expected[offset + 2] = actual[offset + 2] = 127;
        expected[offset + 3] = actual[offset + 3] = 255;
        ignoredPixels += 1;
      }
    }
  }
  return ignoredPixels;
}

export async function compareReference({
  actualPath,
  referencePath,
  referenceCrop,
  actualCrop,
  ignoreRegions = [],
  outputDir = 'test-results/reference-comparison',
  threshold = 0.16,
  maxDiffRatio,
}) {
  if (!actualPath || !referencePath) throw new Error('Both actualPath and referencePath are required.');
  const actualMeta = await sharp(actualPath).metadata();
  const referenceMeta = await sharp(referencePath).metadata();
  if (!actualMeta.width || !actualMeta.height || !referenceMeta.width || !referenceMeta.height) throw new Error('Could not read image dimensions.');

  const expectedBox = referenceCrop ?? { left: 0, top: 0, width: referenceMeta.width, height: referenceMeta.height };
  validateBox(expectedBox, referenceMeta, 'Reference crop');
  const actualBox = actualCrop ?? {
    left: 0,
    top: 0,
    width: actualMeta.width,
    height: Math.min(actualMeta.height, Math.floor(actualMeta.width * expectedBox.height / expectedBox.width)),
  };
  validateBox(actualBox, actualMeta, 'Actual crop');

  const expected = await sharp(referencePath).extract(expectedBox).resize(expectedBox.width, expectedBox.height).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const actual = await sharp(actualPath).extract(actualBox).resize(expectedBox.width, expectedBox.height, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const ignoredPixels = maskRegions(expected.data, actual.data, expectedBox.width, expectedBox.height, ignoreRegions);
  const diff = Buffer.alloc(expectedBox.width * expectedBox.height * 4);
  const differentPixels = pixelmatch(expected.data, actual.data, diff, expectedBox.width, expectedBox.height, { threshold, includeAA: false });
  const comparedPixels = expectedBox.width * expectedBox.height - ignoredPixels;
  const diffRatio = comparedPixels > 0 ? differentPixels / comparedPixels : 0;

  await mkdir(outputDir, { recursive: true });
  const expectedPng = path.join(outputDir, 'reference-crop.png');
  const actualPng = path.join(outputDir, 'actual-aligned.png');
  const diffPng = path.join(outputDir, 'pixel-difference.png');
  const overlayPng = path.join(outputDir, 'overlay-50.png');
  await sharp(expected.data, { raw: { width: expectedBox.width, height: expectedBox.height, channels: 4 } }).png().toFile(expectedPng);
  await sharp(actual.data, { raw: { width: expectedBox.width, height: expectedBox.height, channels: 4 } }).png().toFile(actualPng);
  await sharp(diff, { raw: { width: expectedBox.width, height: expectedBox.height, channels: 4 } }).png().toFile(diffPng);
  await sharp(actualPng).composite([{ input: expectedPng, blend: 'over', opacity: 0.5 }]).png().toFile(overlayPng);

  const report = {
    actualPath: path.resolve(actualPath),
    referencePath: path.resolve(referencePath),
    referenceCrop: expectedBox,
    actualCrop: actualBox,
    size: { width: expectedBox.width, height: expectedBox.height },
    threshold,
    ignoredPixels,
    differentPixels,
    comparedPixels,
    diffRatio,
    maxDiffRatio: maxDiffRatio ?? null,
    passed: maxDiffRatio === undefined || diffRatio <= maxDiffRatio,
    artifacts: { referencePng: expectedPng, actualPng, diffPng, overlayPng },
  };
  const reportPath = path.join(outputDir, 'comparison.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return { ...report, reportPath };
}

function option(args, name) {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

async function main() {
  const args = process.argv.slice(2);
  const actualPath = option(args, '--actual');
  const referencePath = option(args, '--reference');
  if (!actualPath || !referencePath) {
    throw new Error('Usage: npm run compare:reference -- --actual <local.png> --reference <source.png> [--reference-crop x,y,w,h] [--actual-crop x,y,w,h] [--ignore x,y,w,h] [--max-diff-ratio 0.2] [--out test-results/reference-comparison]');
  }
  const cropArg = option(args, '--reference-crop');
  const actualCropArg = option(args, '--actual-crop');
  const threshold = Number(option(args, '--threshold') ?? 0.16);
  const maxDiffArg = option(args, '--max-diff-ratio');
  const result = await compareReference({
    actualPath,
    referencePath,
    referenceCrop: cropArg ? parseBox(cropArg, 'Reference crop') : undefined,
    actualCrop: actualCropArg ? parseBox(actualCropArg, 'Actual crop') : undefined,
    ignoreRegions: parseBoxes(args.flatMap((value, index) => args[index - 1] === '--ignore' ? [value] : [])),
    outputDir: option(args, '--out') ?? 'test-results/reference-comparison',
    threshold,
    maxDiffRatio: maxDiffArg === undefined ? undefined : Number(maxDiffArg),
  });
  console.log(`Visual diff: ${(result.diffRatio * 100).toFixed(2)}% (${result.differentPixels}/${result.comparedPixels} pixels), ignored ${result.ignoredPixels}.`);
  console.log(`Overlay: ${result.artifacts.overlayPng}`);
  console.log(`Diff image: ${result.artifacts.diffPng}`);
  if (!result.passed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
