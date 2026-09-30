/**
 * Turns community-wheel frame artwork drawn on a black background into a
 * transparent WebP the page can lay over the wheel with plain alpha blending.
 *
 *   node tools/community-frame.mjs <input> <output.webp> [--crop left,top,width,height]
 *
 * Glowing artwork (fire, sparks, neon) is usually delivered on solid black. It
 * cannot go over the wheel as is — the black would hide it — and CSS
 * `mix-blend-mode: screen` only works until some ancestor opens a stacking
 * context (the page's staggered entry animation does), at which point the black
 * rectangle reappears. So the black is "unscreened" here, once:
 *
 *   alpha = max(r, g, b)      colour = rgb / alpha
 *
 * Composited normally over any background B that gives rgb + B·(1 − alpha),
 * which is within a hair of what `screen` would draw, and it keeps working
 * whatever the page does around it. Artwork that already has transparency
 * should be exported to WebP directly instead of going through this.
 *
 * Print the output size afterwards: the wheel geometry in
 * `community-wheels.data.ts` is expressed as fractions of it.
 */
import sharp from 'sharp';

const [input, output, ...rest] = process.argv.slice(2);
if (!input || !output) {
  throw new Error('Usage: node tools/community-frame.mjs <input> <output.webp> [--crop l,t,w,h]');
}

const cropIndex = rest.indexOf('--crop');
const crop = cropIndex >= 0 ? rest[cropIndex + 1]?.split(',').map(Number) : null;
if (crop && (crop.length !== 4 || crop.some((value) => !Number.isFinite(value)))) {
  throw new Error('--crop expects four integers: left,top,width,height');
}

/** JPEG never delivers a true 0 black: treat the darkest levels as fully transparent. */
const BLACK_FLOOR = 10;

let image = sharp(input).removeAlpha();
if (crop) {
  const [left, top, width, height] = crop;
  image = image.extract({ left, top, width, height });
}

const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
const out = Buffer.alloc(info.width * info.height * 4);

for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
  const r = data[pixel * 3];
  const g = data[pixel * 3 + 1];
  const b = data[pixel * 3 + 2];
  const peak = Math.max(r, g, b);
  const alpha = Math.max(0, (peak - BLACK_FLOOR) / (255 - BLACK_FLOOR));

  const target = pixel * 4;
  if (alpha > 0) {
    // Un-premultiply against black so the composite reproduces the original.
    out[target] = Math.min(255, Math.round(r / alpha));
    out[target + 1] = Math.min(255, Math.round(g / alpha));
    out[target + 2] = Math.min(255, Math.round(b / alpha));
  }
  out[target + 3] = Math.round(alpha * 255);
}

await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .webp({ quality: 86, alphaQuality: 90 })
  .toFile(output);

console.log(`${output}: ${info.width}×${info.height}`);
