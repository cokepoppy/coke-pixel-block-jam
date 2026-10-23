import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [inputPath, outputDir = 'assets'] = process.argv.slice(2);
if (!inputPath) {
  throw new Error('Usage: node scripts/extract-level8-tiles.mjs <source-frame> [output-directory]');
}

const grid = { left: 58, top: 309, width: 485, height: 312, cols: 60, rows: 39 };
const samples = {
  orange: { column: 10, row: 5 },
  magenta: { column: 55, row: 5 },
  yellow: { column: 5, row: 35 },
};
await mkdir(outputDir, { recursive: true });

for (const [color, { column, row }] of Object.entries(samples)) {
  const left = Math.round(grid.left + column * grid.width / grid.cols);
  const top = Math.round(grid.top + row * grid.height / grid.rows);
  const width = Math.round(grid.left + (column + 1) * grid.width / grid.cols) - left;
  const height = Math.round(grid.top + (row + 1) * grid.height / grid.rows) - top;
  await sharp(inputPath)
    .extract({ left, top, width, height })
    .png()
    .toFile(path.join(outputDir, `level8-${color}.png`));
}

process.stdout.write(`Extracted three source-cell textures from ${inputPath} into ${outputDir}.\n`);
