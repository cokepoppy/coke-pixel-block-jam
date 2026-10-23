import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const viewport = { width: 597, height: 1296 };
const sourceRegion = { left: 140, top: 660, width: 310, height: 295 };
const backgroundBorderRatio = 0.055;
const alphaStart = 6;
const alphaOpaque = 22;

function solveLinearSystem(matrix, values) {
  const size = values.length;
  const rows = matrix.map((row, index) => [...row, values[index]]);

  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    }
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];

    const divisor = rows[column][column];
    if (Math.abs(divisor) < 1e-10) throw new Error('Background fit is singular.');
    for (let entry = column; entry <= size; entry += 1) rows[column][entry] /= divisor;

    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = rows[row][column];
      for (let entry = column; entry <= size; entry += 1) {
        rows[row][entry] -= factor * rows[column][entry];
      }
    }
  }

  return rows.map((row) => row[size]);
}

function backgroundFeatures(x, y, width, height) {
  const nx = (x - (width - 1) / 2) / ((width - 1) / 2);
  const ny = (y - (height - 1) / 2) / ((height - 1) / 2);
  return [1, nx, ny, nx * ny, nx * nx, ny * ny];
}

function fitBackground(data, { width, height, channels }) {
  const border = Math.round(Math.min(width, height) * backgroundBorderRatio);
  const normal = Array.from({ length: 6 }, () => Array(6).fill(0));
  const rightSides = Array.from({ length: 3 }, () => Array(6).fill(0));
  const sampleResiduals = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x >= border && x < width - border && y >= border && y < height - border) continue;
      const features = backgroundFeatures(x, y, width, height);
      const offset = (y * width + x) * channels;
      for (let left = 0; left < 6; left += 1) {
        for (let right = 0; right < 6; right += 1) normal[left][right] += features[left] * features[right];
        for (let channel = 0; channel < 3; channel += 1) {
          rightSides[channel][left] += features[left] * data[offset + channel];
        }
      }
    }
  }

  const coefficients = rightSides.map((values) => solveLinearSystem(normal, values));
  const colorAt = (x, y) => {
    const features = backgroundFeatures(x, y, width, height);
    return coefficients.map((channel) => channel.reduce((sum, value, index) => sum + value * features[index], 0));
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x >= border && x < width - border && y >= border && y < height - border) continue;
      const offset = (y * width + x) * channels;
      const prediction = colorAt(x, y);
      sampleResiduals.push(Math.sqrt((
        (data[offset] - prediction[0]) ** 2
        + (data[offset + 1] - prediction[1]) ** 2
        + (data[offset + 2] - prediction[2]) ** 2
      ) / 3));
    }
  }
  sampleResiduals.sort((a, b) => a - b);

  return {
    colorAt,
    border,
    borderResidualP95: sampleResiduals[Math.floor(sampleResiduals.length * 0.95)],
  };
}

async function main() {
  const [sourceVideoPath, outputArg] = process.argv.slice(2);
  if (!sourceVideoPath) {
    throw new Error('Usage: node scripts/extract-startup-splash-box.mjs <reference-video.mp4> [output.png]');
  }

  const outputPath = path.resolve(outputArg ?? fileURLToPath(new URL('../assets/startup/splash-box.png', import.meta.url)));
  const frame = execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-ss', '0.5', '-i', path.resolve(sourceVideoPath),
    '-frames:v', '1', '-q:v', '2', '-f', 'image2pipe', '-vcodec', 'mjpeg', 'pipe:1',
  ], { maxBuffer: 24 * 1024 * 1024 });
  const metadata = await sharp(frame).metadata();
  if (!metadata.width || !metadata.height) throw new Error('Could not read a source frame from the video.');

  const crop = {
    left: Math.round(sourceRegion.left * metadata.width / viewport.width),
    top: Math.round(sourceRegion.top * metadata.height / viewport.height),
    width: Math.round(sourceRegion.width * metadata.width / viewport.width),
    height: Math.round(sourceRegion.height * metadata.height / viewport.height),
  };
  const image = await sharp(frame)
    .extract(crop)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const background = fitBackground(image.data, image.info);
  const output = Buffer.alloc(image.info.width * image.info.height * 4);
  let opaquePixels = 0;

  for (let y = 0; y < image.info.height; y += 1) {
    for (let x = 0; x < image.info.width; x += 1) {
      const sourceOffset = (y * image.info.width + x) * image.info.channels;
      const outputOffset = (y * image.info.width + x) * 4;
      const prediction = background.colorAt(x, y);
      const difference = Math.sqrt((
        (image.data[sourceOffset] - prediction[0]) ** 2
        + (image.data[sourceOffset + 1] - prediction[1]) ** 2
        + (image.data[sourceOffset + 2] - prediction[2]) ** 2
      ) / 3);
      const alpha = Math.max(0, Math.min(255, Math.round(
        (difference - alphaStart) / (alphaOpaque - alphaStart) * 255,
      )));

      output[outputOffset] = image.data[sourceOffset];
      output[outputOffset + 1] = image.data[sourceOffset + 1];
      output[outputOffset + 2] = image.data[sourceOffset + 2];
      output[outputOffset + 3] = alpha;
      if (alpha >= 128) opaquePixels += 1;
    }
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(output, {
    raw: { width: image.info.width, height: image.info.height, channels: 4 },
  }).png().toFile(outputPath);

  console.log(JSON.stringify({
    sourceVideo: path.resolve(sourceVideoPath),
    sourceTimeSeconds: 0.5,
    sourceFrameSize: { width: metadata.width, height: metadata.height },
    sourceCrop: crop,
    viewportRegion: sourceRegion,
    outputPath,
    outputSize: { width: image.info.width, height: image.info.height },
    backgroundBorderPixels: background.border,
    backgroundBorderResidualP95: Number(background.borderResidualP95.toFixed(2)),
    opaquePixels,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
