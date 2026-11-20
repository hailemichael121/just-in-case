// Renders the product scenes to WebP with headless Chromium, then sharp.
// Deterministic: fixed viewport, 2x pixel density, fonts awaited by the browser.
// Run from portfolio/: npm run mockups
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, '..');
const chrome = process.env.CHROME_BIN || 'google-chrome';

const jobs = [
  { scene: 'hero-scene.html', out: 'hero-scene.webp', width: 390, height: 844, scale: 2 },
  { scene: 'widgets-sizes.html', out: 'widgets-sizes.webp', width: 648, height: 272, scale: 2 },
  { scene: 'widget-content.html', out: 'widget-content.webp', width: 920, height: 182, scale: 2 },
  { scene: 'widget-glass.html', out: 'widget-glass.webp', width: 706, height: 268, scale: 2 },
  { scene: 'widget-options.html', out: 'widget-options.webp', width: 400, height: 720, scale: 2 },
  { scene: 'notification.html', out: 'notification.webp', width: 600, height: 400, scale: 2 },
  { scene: 'today.html', out: 'today.webp', width: 390, height: 844, scale: 2 },
  { scene: 'reader.html', out: 'reader.webp', width: 390, height: 844, scale: 2 },
  { scene: 'library.html', out: 'library.webp', width: 390, height: 844, scale: 2 },
  { scene: 'og.html', out: 'og-just-in-case.jpg', width: 1200, height: 630, scale: 1, jpg: true },
];

const shotDir = await mkdtemp(path.join(tmpdir(), 'jic-mockups-'));

try {
  for (const job of jobs) {
    const png = path.join(shotDir, job.scene.replace('.html', '.png'));
    const scene = path.join(root, 'mockups', 'scenes', job.scene);
    await run(chrome, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--force-device-scale-factor=${job.scale}`,
      `--window-size=${job.width},${job.height}`,
      '--virtual-time-budget=2500',
      `--screenshot=${png}`,
      `file://${scene}`,
    ]);

    const out = path.join(root, 'assets', job.out);
    if (job.jpg) {
      await sharp(png).jpeg({ quality: 86, mozjpeg: true }).toFile(out);
    } else {
      await sharp(png).webp({ quality: 82, effort: 6 }).toFile(out);
    }
    console.log(`${job.out} ← ${job.scene}`);
  }
} finally {
  await rm(shotDir, { recursive: true, force: true });
}
