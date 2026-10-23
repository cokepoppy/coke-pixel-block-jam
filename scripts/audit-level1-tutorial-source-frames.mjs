import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [sourceVideo, outputDirectory = '.research/events/level1-tutorial-raw-frame-audit', baseUrl = 'http://127.0.0.1:4173/?previewLevel=1'] = process.argv.slice(2);
if (!sourceVideo) {
  throw new Error('Usage: node scripts/audit-level1-tutorial-source-frames.mjs <source-video> [output-dir] [url]');
}

const outputRoot = path.resolve(root, outputDirectory);
const sourceDirectory = path.join(outputRoot, 'source');
const browserDirectory = path.join(outputRoot, 'browser');
const diffDirectory = path.join(outputRoot, 'diff');
const regions = {
  pixelWall: { left: 44, top: 43, width: 474, height: 219 },
  operationGrid: { left: 33, top: 301, width: 496, height: 216 },
  hand: { left: 260, top: 320, width: 190, height: 210 },
  yellowTray: { left: 140, top: 512, width: 285, height: 244 },
  collectionTrayRow: { left: 32, top: 512, width: 500, height: 242 },
  lowerFrameEdge: { left: 0, top: 696, width: 563, height: 60 },
};
await Promise.all([sourceDirectory, browserDirectory, diffDirectory].map((directory) => mkdir(directory, { recursive: true })));

const sourcePattern = path.join(sourceDirectory, 'frame-%02d.png');
const extraction = spawnSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'info', '-i', sourceVideo,
  '-vf', "select='between(t,2.3,2.716667)',scale=597:1296:flags=lanczos:in_range=pc:out_range=pc,crop=563:756:17:226,showinfo",
  '-fps_mode', 'passthrough', '-frames:v', '26', '-start_number', '0', '-compression_level', '4', '-y', sourcePattern,
], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
if (extraction.error) throw extraction.error;
if (extraction.status !== 0) throw new Error(`ffmpeg failed: ${extraction.stderr}`);
const sourceTimestamps = [...extraction.stderr.matchAll(/pts_time:([0-9.]+)/gu)].map((match) => Number(match[1]));
if (sourceTimestamps.length !== 26) {
  throw new Error(`Expected 26 original source timestamps, found ${sourceTimestamps.length}.`);
}

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 597, height: 1296 }, deviceScaleFactor: 1 });
try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const video = document.querySelector('#level-one-tutorial-video');
    const canvas = document.querySelector('#game-canvas');
    return video?.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && canvas?.width > 0;
  }, null, { timeout: 15_000 });

  const frames = [];
  for (let index = 0; index < 26; index += 1) {
    await page.evaluate(async (frameIndex) => {
      const video = document.querySelector('#level-one-tutorial-video');
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      video.pause();
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Tutorial seek to frame ${frameIndex} timed out`)), 3_000);
        video.addEventListener('seeked', () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });
        video.currentTime = (frameIndex + 0.5) / 60;
      });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, index);

    const browserPath = path.join(browserDirectory, `frame-${String(index).padStart(2, '0')}.png`);
    await page.screenshot({ path: browserPath, clip: { x: 17, y: 226, width: 563, height: 756 } });
    if (index === 0) {
      await page.screenshot({ path: path.join(outputRoot, 'browser-full-screen-frame-00.png') });
    }
    const sourcePath = path.join(sourceDirectory, `frame-${String(index).padStart(2, '0')}.png`);
    const [source, rendered] = await Promise.all([
      sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
      sharp(browserPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    ]);
    if (source.info.width !== rendered.info.width || source.info.height !== rendered.info.height) {
      throw new Error(`Frame ${index} crop dimensions differ: ${source.info.width}x${source.info.height} vs ${rendered.info.width}x${rendered.info.height}.`);
    }
    const pixelCount = source.info.width * source.info.height;
    const diffPixels = Buffer.alloc(source.data.length);
    const changedPixels = pixelmatch(source.data, rendered.data, diffPixels, source.info.width, source.info.height, {
      threshold: 0.12,
      includeAA: false,
    });
    let absoluteRgbError = 0;
    let exactChangedPixels = 0;
    for (let offset = 0; offset < source.data.length; offset += 4) {
      const maximum = Math.max(
        Math.abs(source.data[offset] - rendered.data[offset]),
        Math.abs(source.data[offset + 1] - rendered.data[offset + 1]),
        Math.abs(source.data[offset + 2] - rendered.data[offset + 2]),
      );
      if (maximum > 0) exactChangedPixels += 1;
      absoluteRgbError += Math.abs(source.data[offset] - rendered.data[offset])
        + Math.abs(source.data[offset + 1] - rendered.data[offset + 1])
        + Math.abs(source.data[offset + 2] - rendered.data[offset + 2]);
    }
    const regionResults = {};
    for (const [name, region] of Object.entries(regions)) {
      const sourceCrop = Buffer.alloc(region.width * region.height * 4);
      const renderedCrop = Buffer.alloc(region.width * region.height * 4);
      for (let y = 0; y < region.height; y += 1) {
        const from = ((region.top + y) * source.info.width + region.left) * 4;
        const to = y * region.width * 4;
        source.data.copy(sourceCrop, to, from, from + region.width * 4);
        rendered.data.copy(renderedCrop, to, from, from + region.width * 4);
      }
      const regionPixels = region.width * region.height;
      const regionDiffPixels = pixelmatch(
        sourceCrop,
        renderedCrop,
        Buffer.alloc(sourceCrop.length),
        region.width,
        region.height,
        { threshold: 0.12, includeAA: false },
      );
      let regionRgbError = 0;
      for (let offset = 0; offset < sourceCrop.length; offset += 4) {
        regionRgbError += Math.abs(sourceCrop[offset] - renderedCrop[offset])
          + Math.abs(sourceCrop[offset + 1] - renderedCrop[offset + 1])
          + Math.abs(sourceCrop[offset + 2] - renderedCrop[offset + 2]);
      }
      regionResults[name] = {
        changedPixelRatio: regionDiffPixels / regionPixels,
        meanAbsoluteRgbError: regionRgbError / (regionPixels * 3),
      };
    }
    await sharp(diffPixels, { raw: { width: source.info.width, height: source.info.height, channels: 4 } })
      .png()
      .toFile(path.join(diffDirectory, `frame-${String(index).padStart(2, '0')}.png`));
    frames.push({
      frame: index,
      sourceTimestampSeconds: sourceTimestamps[index],
      browserVideoTimeSeconds: Number(((index + 0.5) / 60).toFixed(6)),
      changedPixelRatio: changedPixels / pixelCount,
      exactChangedPixelRatio: exactChangedPixels / pixelCount,
      meanAbsoluteRgbError: absoluteRgbError / (pixelCount * 3),
      regions: regionResults,
    });
  }

  const byRatio = frames.map(({ changedPixelRatio }) => changedPixelRatio).sort((left, right) => left - right);
  const percentile = (fraction) => byRatio[Math.floor((byRatio.length - 1) * fraction)];
  const regionSummary = Object.fromEntries(Object.keys(regions).map((name) => {
    const ratios = frames.map(({ regions: frameRegions }) => frameRegions[name].changedPixelRatio).sort((left, right) => left - right);
    const errors = frames.map(({ regions: frameRegions }) => frameRegions[name].meanAbsoluteRgbError).sort((left, right) => left - right);
    return [name, {
      changedPixelRatio: {
        min: ratios[0],
        median: ratios[Math.floor((ratios.length - 1) * 0.5)],
        p95: ratios[Math.floor((ratios.length - 1) * 0.95)],
        max: ratios.at(-1),
      },
      meanAbsoluteRgbError: {
        median: errors[Math.floor((errors.length - 1) * 0.5)],
        max: errors.at(-1),
      },
    }];
  }));
  const report = {
    sourceVideo: path.resolve(sourceVideo),
    sourceRangeSeconds: [sourceTimestamps[0], sourceTimestamps.at(-1)],
    sourceFrameCount: sourceTimestamps.length,
    sourceCrop: { left: 17, top: 226, width: 563, height: 756, normalizedFrom: '597x1296' },
    browserUrl: baseUrl,
    browserViewport: { width: 597, height: 1296 },
    comparison: { pixelmatchThreshold: 0.12, includeAntialiasing: false },
    regions,
    changedPixelRatio: {
      min: byRatio[0],
      median: percentile(0.5),
      p95: percentile(0.95),
      max: byRatio.at(-1),
    },
    regionSummary,
    frames,
  };
  await writeFile(path.join(outputRoot, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

  const contactSheets = [];
  const thumbWidth = 282;
  const thumbHeight = 378;
  const labelHeight = 22;
  const cellWidth = thumbWidth * 2 + 6;
  const cellHeight = thumbHeight + labelHeight;
  const pageFrames = 13;
  for (let start = 0; start < frames.length; start += pageFrames) {
    const batch = frames.slice(start, start + pageFrames);
    const rows = Math.ceil(batch.length / 2);
    const sheetWidth = cellWidth * 2;
    const sheetHeight = cellHeight * rows;
    const overlays = [];
    for (const [slot, frame] of batch.entries()) {
      const col = slot % 2;
      const row = Math.floor(slot / 2);
      const left = col * cellWidth;
      const top = row * cellHeight;
      const suffix = String(frame.frame).padStart(2, '0');
      const sourcePath = path.join(sourceDirectory, `frame-${suffix}.png`);
      const browserPath = path.join(browserDirectory, `frame-${suffix}.png`);
      const sourceThumb = await sharp(sourcePath).resize(thumbWidth, thumbHeight).png().toBuffer();
      const browserThumb = await sharp(browserPath).resize(thumbWidth, thumbHeight).png().toBuffer();
      const label = Buffer.from(`<svg width="${cellWidth}" height="${labelHeight}"><rect width="100%" height="100%" fill="#17212f"/><text x="4" y="16" font-family="Arial,sans-serif" font-size="12" fill="#ffffff">F${suffix} ${frame.sourceTimestampSeconds.toFixed(3)}s · diff ${(frame.changedPixelRatio * 100).toFixed(2)}%</text></svg>`);
      overlays.push(
        { input: label, left, top },
        { input: sourceThumb, left, top: top + labelHeight },
        { input: browserThumb, left: left + thumbWidth + 6, top: top + labelHeight },
      );
    }
    const contactPath = path.join(outputRoot, `contact-${String(start).padStart(2, '0')}-${String(start + batch.length - 1).padStart(2, '0')}.jpg`);
    await sharp({ create: { width: sheetWidth, height: sheetHeight, channels: 3, background: '#17212f' } })
      .composite(overlays)
      .jpeg({ quality: 88 })
      .toFile(contactPath);
    contactSheets.push(contactPath);
  }

  const edgeSource = await sharp(path.join(sourceDirectory, 'frame-00.png'))
    .extract({ left: 0, top: 696, width: 563, height: 60 })
    .resize(1689, 180, { kernel: 'nearest' })
    .png()
    .toBuffer();
  const edgeBrowser = await sharp(path.join(browserDirectory, 'frame-00.png'))
    .extract({ left: 0, top: 696, width: 563, height: 60 })
    .resize(1689, 180, { kernel: 'nearest' })
    .png()
    .toBuffer();
  const edgeLabel = Buffer.from('<svg width="3378" height="24"><rect width="100%" height="100%" fill="#17212f"/><text x="12" y="17" font-family="Arial,sans-serif" font-size="14" fill="#ffffff">Original S5 frame 00 · crop y=922–982</text><text x="1701" y="17" font-family="Arial,sans-serif" font-size="14" fill="#ffffff">Web canvas frame 00 · same crop</text></svg>');
  await sharp({ create: { width: 3378, height: 204, channels: 3, background: '#17212f' } })
    .composite([
      { input: edgeLabel, left: 0, top: 0 },
      { input: edgeSource, left: 0, top: 24 },
      { input: edgeBrowser, left: 1689, top: 24 },
    ])
    .png()
    .toFile(path.join(outputRoot, 'lower-frame-edge-zoom.png'));

  console.log(JSON.stringify({
    checkedFrames: frames.length,
    sourceRangeSeconds: report.sourceRangeSeconds,
    changedPixelRatio: report.changedPixelRatio,
    regionSummary: report.regionSummary,
    report: path.join(outputRoot, 'report.json'),
    contactSheets,
    lowerFrameEdgeZoom: path.join(outputRoot, 'lower-frame-edge-zoom.png'),
  }, null, 2));
} finally {
  await browser.close();
}
