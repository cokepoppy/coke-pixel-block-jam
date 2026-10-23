import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [sourcePath, sampledGridPath, outputPath = 'assets/level8/level8-board.png'] = process.argv.slice(2);
if (!sourcePath || !sampledGridPath) {
  throw new Error('Usage: node scripts/extract-level8-board.mjs <source-frame> <sampled-grid.json> [output.png]');
}

const sample = JSON.parse(await readFile(sampledGridPath, 'utf8'));
const { board, ignoredRing, rows } = sample;
const { data: sourcePixels, info } = await sharp(sourcePath)
  .extract({ left: board.left, top: board.top, width: board.width, height: board.height })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const channels = info.channels;
const output = Buffer.from(sourcePixels);

function cellBounds(column, row) {
  return {
    left: Math.round(column * board.width / board.cols),
    top: Math.round(row * board.height / board.rows),
    right: Math.round((column + 1) * board.width / board.cols),
    bottom: Math.round((row + 1) * board.height / board.rows),
  };
}

function overlapsTouchRing(column, row) {
  if (!ignoredRing) return false;
  const bounds = cellBounds(column, row);
  return bounds.left < ignoredRing.left + ignoredRing.width
    && bounds.right > ignoredRing.left
    && bounds.top < ignoredRing.top + ignoredRing.height
    && bounds.bottom > ignoredRing.top;
}

const ringCells = [];
for (let row = 0; row < board.rows; row += 1) {
  for (let column = 0; column < board.cols; column += 1) {
    if (rows[row][column] === 'M' && overlapsTouchRing(column, row)) ringCells.push({ column, row });
  }
}

const cleanMagentaCells = [];
for (let row = 0; row < board.rows; row += 1) {
  for (let column = 0; column < board.cols; column += 1) {
    if (rows[row][column] === 'M' && !overlapsTouchRing(column, row)) cleanMagentaCells.push({ column, row });
  }
}

function copyCell(sourceCell, targetCell) {
  const sourceBounds = cellBounds(sourceCell.column, sourceCell.row);
  const targetBounds = cellBounds(targetCell.column, targetCell.row);
  const sourceWidth = sourceBounds.right - sourceBounds.left;
  const sourceHeight = sourceBounds.bottom - sourceBounds.top;
  const targetWidth = targetBounds.right - targetBounds.left;
  const targetHeight = targetBounds.bottom - targetBounds.top;

  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = sourceBounds.left + Math.floor(x * sourceWidth / targetWidth);
      const sourceY = sourceBounds.top + Math.floor(y * sourceHeight / targetHeight);
      const sourceOffset = (sourceY * board.width + sourceX) * channels;
      const targetOffset = ((targetBounds.top + y) * board.width + targetBounds.left + x) * channels;
      sourcePixels.copy(output, targetOffset, sourceOffset, sourceOffset + channels);
    }
  }
}

for (const target of ringCells) {
  const sourceCell = cleanMagentaCells.reduce((nearest, candidate) => {
    const distance = Math.abs(candidate.column - target.column) + Math.abs(candidate.row - target.row);
    return !nearest || distance < nearest.distance ? { ...candidate, distance } : nearest;
  }, null);
  if (!sourceCell) throw new Error(`Could not find a clean magenta tile for ${target.column},${target.row}`);
  copyCell(sourceCell, target);
}

await mkdir(path.dirname(outputPath), { recursive: true });
await sharp(output, { raw: { width: board.width, height: board.height, channels } }).png().toFile(outputPath);
console.log(`Saved ${outputPath}; repaired ${ringCells.length} cells covered by a source touch ring.`);
