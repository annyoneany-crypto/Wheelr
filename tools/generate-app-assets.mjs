/**
 * Builds the source images @capacitor/assets expects (assets/) out of the single
 * public/Logo.webp we ship on the web. Run it again whenever the logo changes:
 *   node tools/generate-app-assets.mjs && npx capacitor-assets generate --android
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'public/Logo.webp');
const outDir = resolve(root, 'assets');

const BRAND_BG = '#111113';
const ICON_SIZE = 1024;
const SPLASH_SIZE = 2732;

/**
 * capacitor-assets already insets both adaptive layers by 16.7% to land inside the
 * safe zone, so this image only needs breathing room for round masks — not a second
 * safe-zone margin on top of the first.
 */
const FOREGROUND_SCALE = 0.85;
/** Legacy launcher icons are only lightly rounded and can carry a bigger mark. */
const LEGACY_SCALE = 0.8;
/** The splash mark reads better small — it sits alone on a full-bleed background. */
const SPLASH_SCALE = 0.28;

async function markOnCanvas({ canvasSize, scale, background }) {
  const mark = await sharp(source)
    .resize(Math.round(canvasSize * scale), Math.round(canvasSize * scale), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background
    }
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer();
}

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const brand = { r: 0x11, g: 0x11, b: 0x13, alpha: 1 };

await mkdir(outDir, { recursive: true });

const outputs = {
  // Square launcher icon: the mark sits on the app's own dark surface.
  'icon.png': await markOnCanvas({ canvasSize: ICON_SIZE, scale: LEGACY_SCALE, background: brand }),
  // Adaptive foreground must stay transparent — the background layer shows through.
  'icon-foreground.png': await markOnCanvas({
    canvasSize: ICON_SIZE,
    scale: FOREGROUND_SCALE,
    background: transparent
  }),
  'icon-background.png': await sharp({
    create: { width: ICON_SIZE, height: ICON_SIZE, channels: 4, background: brand }
  })
    .png()
    .toBuffer(),
  'splash.png': await markOnCanvas({
    canvasSize: SPLASH_SIZE,
    scale: SPLASH_SCALE,
    background: brand
  })
};
outputs['splash-dark.png'] = outputs['splash.png'];

for (const [name, buffer] of Object.entries(outputs)) {
  await writeFile(resolve(outDir, name), buffer);
  console.log(`wrote assets/${name}`);
}

console.log(`\nSource: ${source} (${BRAND_BG} brand background)`);
