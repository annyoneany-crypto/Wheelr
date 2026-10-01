/**
 * Turns community-wheel frame artwork drawn on a black background into a
 * transparent WebP the page can lay over the wheel with plain alpha blending.
 *
 *   node tools/community-frame.mjs <input> <output.webp> [--crop left,top,width,height]
 *     [--scale-x 0.85] [--hole x,y] [--dark 80] [--hole-dark n]
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
 * `--scale-x` narrows the artwork after cropping. A ring drawn as an ellipse
 * wider than tall cannot be filled by a round wheel; squeezing it round is what
 * lets the wheel cover the whole hole without the flames eating the slices.
 *
 * `--hole x,y` (a point inside the ring, in output pixels) makes the drawing
 * itself opaque — a head that overlaps the wheel must hide it, nose and pupils
 * included, where unscreening would let the slices show through the darker
 * fur. Pixels reachable from the image border or from the hole through dark
 * pixels are background and keep the unscreened alpha; everything else is the
 * drawing and becomes solid, with its edge softened so it does not look cut out.
 *
 * Print the output size afterwards: the wheel geometry in
 * `community-wheels.data.ts` is expressed as fractions of it.
 */
import sharp from 'sharp';

const [input, output, ...rest] = process.argv.slice(2);
if (!input || !output) {
  throw new Error(
    'Usage: node tools/community-frame.mjs <input> <output.webp> [--crop l,t,w,h] [--scale-x n] [--hole x,y] [--dark n] [--hole-dark n]'
  );
}

const cropIndex = rest.indexOf('--crop');
const crop = cropIndex >= 0 ? rest[cropIndex + 1]?.split(',').map(Number) : null;
if (crop && (crop.length !== 4 || crop.some((value) => !Number.isFinite(value)))) {
  throw new Error('--crop expects four integers: left,top,width,height');
}

const scaleIndex = rest.indexOf('--scale-x');
const scaleX = scaleIndex >= 0 ? Number(rest[scaleIndex + 1]) : 1;
if (!(scaleX > 0 && scaleX <= 1)) {
  throw new Error('--scale-x expects a number in (0, 1]');
}

const holeIndex = rest.indexOf('--hole');
const hole = holeIndex >= 0 ? rest[holeIndex + 1]?.split(',').map(Number) : null;
if (hole && (hole.length !== 2 || hole.some((value) => !Number.isFinite(value)))) {
  throw new Error('--hole expects two integers: x,y');
}

/**
 * Below this peak channel a pixel counts as dark when looking for the background.
 * 80 suits glowing art; solid artwork with shaded detail (RED's engraved metal
 * ring) needs it lower, or its grooves join the background and turn see-through.
 */
const darkIndex = rest.indexOf('--dark');
const DARK_LEVEL = darkIndex >= 0 ? Number(rest[darkIndex + 1]) : 80;
if (!Number.isFinite(DARK_LEVEL) || DARK_LEVEL < 1 || DARK_LEVEL > 255) {
  throw new Error('--dark expects a level between 1 and 255');
}
/**
 * The same, for the flood from `--hole` only. A ring drawn in perspective has a
 * dark inner wall between its metal and the black hole: a looser level here
 * lets that wall become a translucent shadow over the wheel instead of an
 * opaque band hiding its edge, while `--dark` keeps the outside strict.
 */
const holeDarkIndex = rest.indexOf('--hole-dark');
const HOLE_DARK_LEVEL = holeDarkIndex >= 0 ? Number(rest[holeDarkIndex + 1]) : DARK_LEVEL;
if (!Number.isFinite(HOLE_DARK_LEVEL) || HOLE_DARK_LEVEL < 1 || HOLE_DARK_LEVEL > 255) {
  throw new Error('--hole-dark expects a level between 1 and 255');
}

/** JPEG never delivers a true 0 black: treat the darkest levels as fully transparent. */
const BLACK_FLOOR = 10;

let image = sharp(input).removeAlpha();
if (crop) {
  const [left, top, width, height] = crop;
  image = image.extract({ left, top, width, height });
}

if (scaleX !== 1) {
  // Materialise the crop first: sharp would otherwise resize before extracting.
  const cropped = await image.toBuffer({ resolveWithObject: true });
  image = sharp(cropped.data).resize({
    width: Math.round(cropped.info.width * scaleX),
    height: cropped.info.height,
    fit: 'fill',
  });
}

const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
const out = Buffer.alloc(info.width * info.height * 4);
const pixels = info.width * info.height;
const peakAt = (pixel) =>
  Math.max(data[pixel * 3], data[pixel * 3 + 1], data[pixel * 3 + 2]);

/** Dark pixels connected to the border or the hole: the background. Only with --hole. */
let background = null;
if (hole) {
  background = new Uint8Array(pixels);
  const flood = (level, seeds) => {
    const stack = [];
    const seed = (x, y) => {
      const pixel = y * info.width + x;
      if (!background[pixel] && peakAt(pixel) < level) {
        background[pixel] = 1;
        stack.push(pixel);
      }
    };
    seeds(seed);
    while (stack.length) {
      const pixel = stack.pop();
      const x = pixel % info.width;
      const y = (pixel - x) / info.width;
      if (x > 0) seed(x - 1, y);
      if (x < info.width - 1) seed(x + 1, y);
      if (y > 0) seed(x, y - 1);
      if (y < info.height - 1) seed(x, y + 1);
    }
  };

  flood(DARK_LEVEL, (seed) => {
    for (let x = 0; x < info.width; x += 1) {
      seed(x, 0);
      seed(x, info.height - 1);
    }
    for (let y = 0; y < info.height; y += 1) {
      seed(0, y);
      seed(info.width - 1, y);
    }
  });
  flood(HOLE_DARK_LEVEL, (seed) => seed(Math.round(hole[0]), Math.round(hole[1])));
}

/** 1 where the drawing is solid, 0 on the background, feathered in between. */
let solid = null;
if (background) {
  solid = new Float32Array(pixels);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    solid[pixel] = background[pixel] ? 0 : 1;
  }
  // Two passes of a 3×3 box blur: enough to anti-alias the flood-fill edge.
  for (let pass = 0; pass < 2; pass += 1) {
    const next = new Float32Array(pixels);
    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        let sum = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < info.width && ny < info.height) {
              sum += solid[ny * info.width + nx];
              count += 1;
            }
          }
        }
        next[y * info.width + x] = sum / count;
      }
    }
    solid = next;
  }
}

for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
  const r = data[pixel * 3];
  const g = data[pixel * 3 + 1];
  const b = data[pixel * 3 + 2];
  const peak = Math.max(r, g, b);
  const unscreened = Math.max(0, (peak - BLACK_FLOOR) / (255 - BLACK_FLOOR));
  // Any alpha at least the unscreened one reproduces the original over black
  // once the colour is divided by it, so the solid mask can only raise it.
  const alpha = solid ? Math.max(unscreened, solid[pixel]) : unscreened;

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
