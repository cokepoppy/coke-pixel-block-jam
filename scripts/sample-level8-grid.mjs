import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath) {
  throw new Error('Usage: node scripts/sample-level8-grid.mjs <source-frame> [output.json]');
}

// At 00:02:54.83 (frame 51) the 60 x 39 wall is stable. A yellow circle is
// visibly present over the magenta area in opening frames and later changes
// during play; its visual appearance is preserved, but its cell/feedback role
// is unresolved, so this sampler records only the visible color evidence.
const board = { left: 58, top: 309, width: 485, height: 312, cols: 60, rows: 39 };
const image = await sharp(inputPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const channelCount = image.info.channels;

function rgbAt(x, y) {
  const offset = (Math.floor(y) * image.info.width + Math.floor(x)) * channelCount;
  return [...image.data.subarray(offset, offset + 3)];
}

function classify([red, green, blue]) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  if (chroma < 0.12) return '?';

  let hue;
  if (max === r) hue = 60 * (((g - b) / chroma) % 6);
  else if (max === g) hue = 60 * ((b - r) / chroma + 2);
  else hue = 60 * ((r - g) / chroma + 4);
  if (hue < 0) hue += 360;

  if (hue >= 35 && hue < 90) return 'Y';
  if (hue >= 260 && hue <= 330) return 'M';
  if (hue >= 330 || hue < 35) return 'O';
  return '?';
}

const rows = Array.from({ length: board.rows }, () => Array(board.cols).fill('?'));
const sampledColors = { O: [], M: [], Y: [] };
for (let row = 0; row < board.rows; row += 1) {
  for (let column = 0; column < board.cols; column += 1) {
    const x = board.left + (column + 0.5) * board.width / board.cols;
    const y = board.top + (row + 0.5) * board.height / board.rows;
    const color = classify(rgbAt(x, y));
    rows[row][column] = color;
    if (color !== '?') sampledColors[color].push(rgbAt(x, y));
  }
}

// Only a few boundary samples land on compression-mixed edge colors. Fill
// those from the nearest 8-neighbor majority, without smoothing observed cells.
for (let pass = 0; pass < 3; pass += 1) {
  for (let row = 0; row < board.rows; row += 1) {
    for (let column = 0; column < board.cols; column += 1) {
      if (rows[row][column] !== '?') continue;
      const votes = { O: 0, M: 0, Y: 0 };
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const color = rows[row + dy]?.[column + dx];
          if (color in votes) votes[color] += 1;
        }
      }
      rows[row][column] = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
    }
  }
}

function medianRgb(samples) {
  return [0, 1, 2].map((channel) => {
    const values = samples.map((sample) => sample[channel]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  });
}

const result = {
  source: inputPath,
  board,
  counts: Object.fromEntries(['O', 'M', 'Y'].map((color) => [
    color,
    rows.flat().filter((cell) => cell === color).length,
  ])),
  sampledCenterMedians: Object.fromEntries(Object.entries(sampledColors).map(([color, samples]) => [
    color,
    medianRgb(samples),
  ])),
  rows: rows.map((row) => row.join('')),
};

const output = `${JSON.stringify(result, null, 2)}\n`;
if (outputPath) await writeFile(outputPath, output);
else process.stdout.write(output);
