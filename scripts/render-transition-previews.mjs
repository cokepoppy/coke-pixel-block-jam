import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const requestedLevels = process.argv.slice(2).map(Number);
const levels = requestedLevels.length ? requestedLevels : Array.from({ length: 11 }, (_, index) => index + 3);
const origin = process.env.PBJ_PREVIEW_ORIGIN ?? 'http://127.0.0.1:4173';

if (levels.some((level) => !Number.isInteger(level) || level < 3 || level > 13)) {
  throw new Error('Transition previews can be rendered for levels 3 through 13.');
}

const outputDirectory = path.resolve('assets/transitions');
await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });

try {
  const page = await browser.newPage({
    viewport: { width: 597, height: 1296 },
    deviceScaleFactor: 1,
  });

  for (const level of levels) {
    await page.goto(`${origin}/?previewLevel=${level}`, { waitUntil: 'load' });
    await page.waitForFunction(() => {
      const canvas = document.querySelector('#game-canvas');
      return canvas?.width === 597 && canvas?.height === 1296;
    });
    await page.waitForFunction((expectedLevel) => (
      document.querySelector('#live-status')?.textContent === `第 ${expectedLevel} 关开始`
    ), level);
    await page.waitForTimeout(500);

    const outputPath = path.join(outputDirectory, `level-${level}-opening.png`);
    await page.locator('#game-canvas').screenshot({ path: outputPath, animations: 'disabled' });
    console.log(`Rendered ${outputPath} from ${origin}/?previewLevel=${level}`);
  }
} finally {
  await browser.close();
}
