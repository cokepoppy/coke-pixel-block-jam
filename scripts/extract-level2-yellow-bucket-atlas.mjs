import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import {
  LEVEL_TWO_YELLOW_ATLAS,
  levelTwoRecordedBucketPosition,
  levelTwoYellowAtlasSource,
} from '../src/level-two-collection-profile.js';

const [sourceVideo = 'assets/level2/level2-gameplay-source.mp4', outputPath = 'assets/level2/level2-yellow-bucket-atlas.png'] = process.argv.slice(2);
const snapshots = Array.from(
  { length: LEVEL_TWO_YELLOW_ATLAS.frameCount },
  (_, progress) => levelTwoYellowAtlasSource(progress),
);
const firstFrame = Math.min(...snapshots.map(({ sourceFrame }) => sourceFrame));
const lastFrame = Math.max(...snapshots.map(({ sourceFrame }) => sourceFrame));
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'pixel-block-jam-level2-yellow-'));

function yellowEdge(pixelData, offset) {
  const red = pixelData[offset];
  const green = pixelData[offset + 1];
  const blue = pixelData[offset + 2];
  return red > 180 && green > 130 && blue < 140
    && red > blue * 1.45 && green > blue * 1.2;
}

async function findBucketCrop(sourcePath, snapshot) {
  if (snapshot.progress === 0 || snapshot.sourceTime < 6.5) {
    const initial = levelTwoRecordedBucketPosition('yellow', snapshot.sourceTime);
    return {
      left: Math.round(initial.x - LEVEL_TWO_YELLOW_ATLAS.sourceCropOffset.x),
      top: Math.round(initial.y - LEVEL_TWO_YELLOW_ATLAS.sourceCropOffset.y),
      ...LEVEL_TWO_YELLOW_ATLAS.tile,
    };
  }

  const { data, info } = await sharp(sourcePath).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = LEVEL_TWO_YELLOW_ATLAS.tile;
  let best = { score: 0 };
  for (let y = 180; y <= 235; y += 1) {
    for (let x = 15; x <= info.width - width; x += 1) {
      let matches = 0;
      let samples = 0;
      for (let sampleX = x + 25; sampleX < x + width - 25; sampleX += 2) {
        for (const sampleY of [y + 4, y + 6, y + 92, y + 94]) {
          const offset = (sampleY * info.width + sampleX) * info.channels;
          matches += yellowEdge(data, offset) ? 1 : 0;
          samples += 1;
        }
      }
      for (let sampleY = y + 20; sampleY < y + 80; sampleY += 2) {
        for (const sampleX of [x + 4, x + 6, x + width - 6, x + width - 4]) {
          const offset = (sampleY * info.width + sampleX) * info.channels;
          matches += yellowEdge(data, offset) ? 1 : 0;
          samples += 1;
        }
      }
      const score = matches / samples;
      if (score > best.score) best = { x, y, score };
    }
  }

  if (best.score < 0.72) {
    throw new Error(`Could not locate the yellow tray at progress ${snapshot.progress}; edge confidence ${best.score.toFixed(3)}.`);
  }
  return {
    left: Math.max(0, best.x - 2),
    top: best.y + 3,
    ...LEVEL_TWO_YELLOW_ATLAS.tile,
  };
}

try {
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-i', sourceVideo,
    '-vf', `select='between(n,${firstFrame},${lastFrame})'`,
    '-fps_mode', 'passthrough',
    '-start_number', '0',
    '-y', path.join(temporaryDirectory, 'frame-%04d.png'),
  ], { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed with exit code ${result.status}: ${result.stderr}`);
  }

  const extractedFrames = (await readdir(temporaryDirectory))
    .filter((name) => name.endsWith('.png'))
    .sort()
    .map((name) => path.join(temporaryDirectory, name));
  const expectedFrameCount = lastFrame - firstFrame + 1;
  if (extractedFrames.length !== expectedFrameCount) {
    throw new Error(`Expected ${expectedFrameCount} source frames, found ${extractedFrames.length}.`);
  }

  const { columns, tile } = LEVEL_TWO_YELLOW_ATLAS;
  const rows = Math.ceil(LEVEL_TWO_YELLOW_ATLAS.frameCount / columns);
  const composites = [];
  const sourceFrameMap = [];
  for (let progress = 0; progress < snapshots.length; progress += 1) {
    const snapshot = snapshots[progress];
    const { sourceFrame } = snapshot;
    const sourcePath = extractedFrames[sourceFrame - firstFrame];
    const crop = await findBucketCrop(sourcePath, snapshot);
    const frame = await sharp(sourcePath).extract(crop).png().toBuffer();
    composites.push({
      input: frame,
      left: (progress % columns) * tile.width,
      top: Math.floor(progress / columns) * tile.height,
    });
    sourceFrameMap.push({ ...snapshot, crop });
  }

  await sharp({
    create: {
      width: columns * tile.width,
      height: rows * tile.height,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`Yellow source positions: ${JSON.stringify(sourceFrameMap.filter(({ progress }) => [73, 77, 81, 86, 87, 88, 89, 90, 100].includes(progress)))}`);
  console.log(`Saved ${outputPath}: ${snapshots.length} source-matched progress frames, ${columns} columns.`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
