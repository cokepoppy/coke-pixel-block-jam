import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [sourceVideo, outputPath = 'assets/level1/level1-tutorial-hand.mp4'] = process.argv.slice(2);
if (!sourceVideo) {
  throw new Error('Usage: node scripts/extract-level1-tutorial-hand.mjs <source-video> [output.mp4]');
}

await mkdir(path.dirname(outputPath), { recursive: true });
const result = spawnSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'warning',
  // Frame 26 (source time 2.733 s) is the first frame where the yellow tray
  // starts rising. Keep frames 0–25 so the idle tutorial loop contains only
  // the hand gesture and never moves the tray underneath it.
  '-ss', '2.3', '-i', sourceVideo,
  '-map', '0:v:0', '-an',
  // Keep the crop even-width for browser-friendly H.264 4:2:0 decoding; the
  // Canvas panel compositor maps the one extra source column to its 563 px box.
  '-vf', 'scale=597:1296:flags=lanczos:in_range=pc:out_range=pc,crop=564:756:17:226',
  '-r', '60', '-fps_mode', 'cfr', '-frames:v', '26',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '0', '-pix_fmt', 'yuv420p',
  '-color_range', 'pc', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
  '-movflags', '+faststart', '-y', outputPath,
], { stdio: 'inherit' });

if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`ffmpeg failed with exit code ${result.status}`);
console.log(`Saved the 26-frame Level 1 tutorial hand loop to ${outputPath}.`);
