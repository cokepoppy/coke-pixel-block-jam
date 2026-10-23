import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { createGameState } from '../src/game.js';

const [sourcePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) {
  throw new Error('Usage: node scripts/sample-level10-grid.mjs <normalized-source-frame> <output.json>');
}

const { grid } = createGameState(10).config;
const image = await sharp(sourcePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const rows = [];
const counts = { Y: 0, G: 0, P: 0, B: 0, '?': 0 };

function rgbAt(column, row) {
  const x = Math.floor(grid.x + (column + 0.5) * grid.width / grid.cols);
  const y = Math.floor(grid.y + (row + 0.5) * grid.height / grid.rows);
  const offset = (y * image.info.width + x) * image.info.channels;
  return [...image.data.subarray(offset, offset + 3)];
}

function hue([red, green, blue]) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  if (chroma < 0.12) return null;

  let angle;
  if (max === r) angle = 60 * (((g - b) / chroma) % 6);
  else if (max === g) angle = 60 * ((b - r) / chroma + 2);
  else angle = 60 * ((r - g) / chroma + 4);
  return angle < 0 ? angle + 360 : angle;
}

const unresolved = [];
for (let row = 0; row < grid.rows; row += 1) {
  let line = '';
  for (let column = 0; column < grid.cols; column += 1) {
    const angle = hue(rgbAt(column, row));
    const color = angle === null ? '?'
      : angle >= 35 && angle < 85 ? 'Y'
        : angle >= 85 && angle < 165 ? 'G'
          : angle >= 225 && angle <= 285 ? 'P'
            : angle >= 165 && angle < 225 ? 'B' : '?';
    line += color;
    counts[color] += 1;
    if (color === '?') unresolved.push({ column, row });
  }
  rows.push(line);
}

for (const { column, row } of unresolved) {
  const votes = { Y: 0, G: 0, P: 0, B: 0 };
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const color = rows[row + dy]?.[column + dx];
      if (color in votes) votes[color] += 1;
    }
  }
  const resolved = Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!resolved || votes[resolved] < 3) {
    throw new Error(`Could not classify Level 10 cell ${column},${row} from ${sourcePath}`);
  }
  rows[row] = `${rows[row].slice(0, column)}${resolved}${rows[row].slice(column + 1)}`;
  counts['?'] -= 1;
  counts[resolved] += 1;
}

await writeFile(outputPath, `${JSON.stringify({ source: sourcePath, grid, counts, inferredCells: unresolved, rows }, null, 2)}\n`);
console.log(`Sampled ${grid.cols * grid.rows} Level 10 cells from ${sourcePath}: ${JSON.stringify(counts)}; inferred ${unresolved.length} ambiguous center(s) by neighboring majority.`);
