/**
 * The shareable picture of a draw: background, the wheel stopped on the
 * winner, the winner card and the wheelr.xyz signature.
 *
 * One scene feeds both outputs. The image is `drawWinnerFrame` at the final
 * rotation with the card fully revealed; the clip calls it once per video
 * frame while the rotation replays the spin. Everything is painted on a plain
 * 2D canvas because the live wheel is DOM + CSS (pointer SVG, centre logo,
 * transforms), which no browser API can capture.
 *
 * The wheel is always drawn as the classic disc, whatever the view on screen:
 * linear and cards have no single still that reads as "this one won".
 *
 * A community wheel's scene (`buildCommunityWinnerScene`) adds its frame
 * artwork over the disc — the artwork is the pointer there — plus its own hub,
 * accent and confetti colours, and never reads `WheelConfigurator`.
 */
import { clampDeg, contrastForHex, paletteRimColor, type ColorPalette } from '../../services/global_function';
import type { WheelConfigurator } from '../../services/wheel-configurator.service';
import { drawWheelCanvas } from '../extraction-effect/wheel-renderer';

/** Side of the pre-rendered wheel bitmap, in pixels. */
const WHEEL_BITMAP_SIZE = 1400;
/** The on-screen wheel is at most this wide; font sizes are tuned for it. */
const SCREEN_WHEEL_CSS_SIZE = 760;
/** Centre disc diameter per size setting, in CSS px on a 760 px wheel (Tailwind w-14 … w-48). */
const CENTER_SIZE_PX: Record<string, number> = { s: 56, m: 80, l: 96, xl: 112, xxl: 144, xxxl: 192 };
const UI_FONT = '"Inter", system-ui, sans-serif';
const ACCENT = '#fbbf24';
const CONFETTI_COLORS = ['#34d399', '#60a5fa', '#f59e0b', '#f472b6', '#f87171', '#fef08a'];

export interface WinnerScene {
  winner: string;
  wheelName: string;
  sliceCount: number;
  winnerIndex: number;
  /** CSS rotation (degrees) that puts the winner under the pointer. */
  finalRotation: number;
  palette: ColorPalette;
  wheel: HTMLCanvasElement;
  bgColor: string;
  bgImage: HTMLImageElement | null;
  centerColor: string;
  centerText: string;
  centerImage: HTMLImageElement | null;
  /** Centre disc diameter as a fraction of the wheel diameter. */
  centerRatio: number;
  winnerLabel: string;
  dateLabel: string;
  /** Community wheels: artwork laid over the disc, replacing the drop pointer. */
  frame?: WinnerSceneFrame;
  /** Ring round the centre disc; dark by default. */
  centerBorderColor?: string;
  /** Card border, glow, label and winning-slice outline; amber by default. */
  accent?: string;
  confettiColors?: readonly string[];
}

/** The frame artwork and where the wheel sits in it, as fractions of the image (see `CommunityWheelFrame`). */
export interface WinnerSceneFrame {
  image: HTMLImageElement;
  wheelCenterX: number;
  wheelCenterY: number;
  /** Fraction of the image width. */
  wheelDiameter: number;
}

export interface WinnerSceneLabels {
  winner: string;
  date: string;
}

export interface FrameState {
  rotation: number;
  /** 0 = no card, 1 = card fully in. */
  reveal: number;
  /** Seconds since the reveal started; drives the falling confetti. */
  confettiTime: number;
  /** Stills scatter the confetti over the whole frame instead of letting it fall. */
  still?: boolean;
}

/** Same maths as `WheelConfigurator.pointerSliceIndex`, for any rotation. */
export function sliceUnderPointer(rotation: number, sliceCount: number): number {
  if (!sliceCount) return 0;
  const normalized = clampDeg(360 - clampDeg(rotation));
  const adjusted = clampDeg(normalized - 90);
  return Math.min(sliceCount - 1, Math.floor(adjusted / (360 / sliceCount)));
}

/** A rotation that puts the middle of slice `index` under the pointer. */
function rotationForSlice(index: number, sliceCount: number): number {
  const sliceDeg = 360 / sliceCount;
  return clampDeg(270 - (index + 0.5) * sliceDeg);
}

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Snapshots the active wheel. Returns null when there is no winner to show.
 * `rotation`, when given, is where the wheel stopped (the clip passes the
 * recorded spin's end so both outputs agree).
 */
export async function buildWinnerScene(
  cfg: WheelConfigurator,
  labels: WinnerSceneLabels,
  rotation?: number,
): Promise<WinnerScene | null> {
  const winner = cfg.winner();
  const names = cfg.names();
  if (!winner || !names.length) return null;

  // The rotation on screen normally already points at the winner. When it
  // doesn't (a multi-wheel preview spun on its own), aim at the winner's slice.
  let finalRotation = rotation ?? cfg.currentRotation();
  let winnerIndex = sliceUnderPointer(finalRotation, names.length);
  if (names[winnerIndex] !== winner) {
    winnerIndex = Math.max(0, names.indexOf(winner));
    finalRotation = rotationForSlice(winnerIndex, names.length);
  }

  const [bgImage, centerImage] = await Promise.all([
    loadImage(cfg.bgImage()),
    loadImage(cfg.centerImage()),
    document.fonts?.ready.catch(() => undefined),
  ]);

  const wheel = document.createElement('canvas');
  wheel.width = WHEEL_BITMAP_SIZE;
  wheel.height = WHEEL_BITMAP_SIZE;
  const wctx = wheel.getContext('2d');
  if (!wctx) return null;

  // Mirrors the live wheel: big wheels skip labels for speed, so force them on
  // the winner and its neighbours, as the zoom-on-win does.
  const isLarge = names.length > 30;
  const labelWindow: number[] = [];
  if (isLarge) {
    for (let offset = -25; offset <= 25; offset += 1) labelWindow.push(winnerIndex + offset);
  }
  cfg.drawWheelForCanvas(
    wheel,
    wctx,
    WHEEL_BITMAP_SIZE / SCREEN_WHEEL_CSS_SIZE,
    isLarge,
    isLarge ? labelWindow : undefined,
  );

  return {
    winner,
    wheelName: cfg.activeWheel()?.name ?? '',
    sliceCount: names.length,
    winnerIndex,
    finalRotation,
    palette: cfg.selectedPalette(),
    wheel,
    bgColor: cfg.bgColor() || '#262626',
    bgImage,
    centerColor: cfg.centerColor() || '#ffffff',
    centerText: cfg.centerText(),
    centerImage,
    centerRatio: (CENTER_SIZE_PX[cfg.centerLogoSize()] ?? 80) / SCREEN_WHEEL_CSS_SIZE,
    winnerLabel: labels.winner,
    dateLabel: labels.date,
  };
}

/** What a community wheel hands over to be shared: plain data, no service. */
export interface CommunitySceneInput {
  winner: string;
  names: readonly string[];
  winnerIndex: number;
  /** CSS rotation the wheel stopped at. */
  rotation: number;
  wheelName: string;
  colors: readonly string[];
  gradientTo?: readonly string[];
  fontFamily: string;
  sliceStroke: string;
  backgroundColor: string;
  backgroundImage?: string;
  frame: { src: string; wheelCenterX: number; wheelCenterY: number; wheelDiameter: number };
  hub: { color: string; borderColor: string; image?: string };
  accent: string;
  /** The page's drawing size its label proportions were tuned at. */
  baseCanvasPx: number;
}

/** The hub is a fifth of the wheel, as on the community page. */
const COMMUNITY_HUB_RATIO = 0.2;

export async function buildCommunityWinnerScene(
  input: CommunitySceneInput,
  labels: WinnerSceneLabels,
): Promise<WinnerScene | null> {
  if (!input.winner || !input.names.length) return null;

  const [bgImage, centerImage, frameImage] = await Promise.all([
    loadImage(input.backgroundImage ?? ''),
    loadImage(input.hub.image ?? ''),
    loadImage(input.frame.src),
    document.fonts?.ready.catch(() => undefined),
  ]);
  if (!frameImage) return null;

  const wheel = document.createElement('canvas');
  wheel.width = WHEEL_BITMAP_SIZE;
  wheel.height = WHEEL_BITMAP_SIZE;
  const wctx = wheel.getContext('2d');
  if (!wctx) return null;

  drawWheelCanvas(wheel, wctx, {
    names: [...input.names],
    colors: [...input.colors],
    gradientTo: input.gradientTo ? [...input.gradientTo] : undefined,
    fontFamily: input.fontFamily,
    renderScale: WHEEL_BITMAP_SIZE / input.baseCanvasPx,
    radiusInset: 2,
    emptyFillStyle: input.hub.color,
    sliceStroke: input.sliceStroke,
  });

  return {
    winner: input.winner,
    wheelName: input.wheelName,
    sliceCount: input.names.length,
    winnerIndex: input.winnerIndex,
    finalRotation: input.rotation,
    palette: { name: input.wheelName, colors: [...input.colors] },
    wheel,
    bgColor: input.backgroundColor,
    bgImage,
    centerColor: input.hub.color,
    centerText: '',
    centerImage,
    centerRatio: COMMUNITY_HUB_RATIO,
    winnerLabel: labels.winner,
    dateLabel: labels.date,
    frame: {
      image: frameImage,
      wheelCenterX: input.frame.wheelCenterX,
      wheelCenterY: input.frame.wheelCenterY,
      wheelDiameter: input.frame.wheelDiameter,
    },
    centerBorderColor: input.hub.borderColor,
    accent: input.accent,
    confettiColors: [...input.colors, input.accent],
  };
}

/** Where the wheel, the name above it and the card below it go. */
interface FrameLayout {
  cx: number;
  cy: number;
  diameter: number;
  nameY: number;
  cardTop: number;
  /** The frame artwork's box, when there is one. */
  art?: { x: number; y: number; w: number; h: number };
}

function layoutFrame(width: number, height: number, unit: number, scene: WinnerScene): FrameLayout {
  const frame = scene.frame;
  if (!frame) {
    const diameter = Math.min(width * 0.82, height * 0.55);
    const cy = height * 0.42;
    return {
      cx: width / 2,
      cy,
      diameter,
      nameY: cy - diameter / 2 - 90 * unit,
      cardTop: cy + diameter / 2 + height * 0.04,
    };
  }

  // The artwork is larger than the wheel (a head, a ring of flames): fit all
  // of it, then place the wheel inside by its fractions.
  const ratio = frame.image.naturalWidth / frame.image.naturalHeight;
  const artW = Math.min(width * 0.92, height * 0.6 * ratio);
  const artH = artW / ratio;
  const artX = (width - artW) / 2;
  const artY = height * 0.42 - artH / 2;
  return {
    cx: artX + frame.wheelCenterX * artW,
    cy: artY + frame.wheelCenterY * artH,
    diameter: frame.wheelDiameter * artW,
    nameY: artY - 40 * unit,
    cardTop: artY + artH + height * 0.02,
    art: { x: artX, y: artY, w: artW, h: artH },
  };
}

export function drawWinnerFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: WinnerScene,
  state: FrameState,
): void {
  const unit = Math.min(width, height / 1.25) / 1000;
  const { cx, cy, diameter, nameY, cardTop, art } = layoutFrame(width, height, unit, scene);

  drawBackground(ctx, width, height, scene);
  drawWheelName(ctx, width, nameY, unit, scene);
  drawWheel(ctx, cx, cy, diameter, scene, state);
  if (scene.frame && art) {
    // Over the wheel and under the hub, as on the page.
    ctx.drawImage(scene.frame.image, art.x, art.y, art.w, art.h);
  }
  drawCenter(ctx, cx, cy, diameter, scene);
  if (!scene.frame) {
    drawPointer(ctx, cx, cy - diameter / 2, diameter, scene, state.rotation);
  }

  if (state.reveal > 0) {
    drawConfetti(ctx, width, height, state, scene.confettiColors ?? CONFETTI_COLORS);
    drawWinnerCard(ctx, width, cardTop, height * 0.14, unit, scene, state.reveal);
  }

  drawFooter(ctx, width, height, unit, scene);
}

function easeOutBack(t: number): number {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, scene: WinnerScene): void {
  ctx.fillStyle = scene.bgColor;
  ctx.fillRect(0, 0, w, h);

  if (scene.bgImage) {
    const img = scene.bgImage;
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
  }

  // Darken top and bottom so the name and the signature stay readable on any background.
  const shade = ctx.createLinearGradient(0, 0, 0, h);
  shade.addColorStop(0, 'rgba(0,0,0,0.45)');
  shade.addColorStop(0.3, 'rgba(0,0,0,0.1)');
  shade.addColorStop(0.62, 'rgba(0,0,0,0.25)');
  shade.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
}

function setLetterSpacing(ctx: CanvasRenderingContext2D, px: number): void {
  // Chrome/Edge/Safari 17+; elsewhere the text is simply drawn tighter.
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
  }
}

function drawWheelName(
  ctx: CanvasRenderingContext2D,
  w: number,
  y: number,
  unit: number,
  scene: WinnerScene,
): void {
  if (!scene.wheelName) return;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = Math.round(34 * unit);
  ctx.font = `800 ${size}px ${UI_FONT}`;
  setLetterSpacing(ctx, 3 * unit);
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 12 * unit;
  const text = fitText(ctx, scene.wheelName.toUpperCase(), w * 0.86, `800 {size}px ${UI_FONT}`, size, size * 0.6);
  ctx.fillText(text, w / 2, y);
  ctx.restore();
}

function drawWheel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  diameter: number,
  scene: WinnerScene,
  state: FrameState,
): void {
  const radius = diameter / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = diameter * 0.07;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.985, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const rad = (state.rotation * Math.PI) / 180;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rad);
  ctx.drawImage(scene.wheel, -radius, -radius, diameter, diameter);

  // Outline the winning slice once the card comes in, like the glow on screen.
  if (state.reveal > 0 && scene.sliceCount > 1) {
    const slice = (Math.PI * 2) / scene.sliceCount;
    const r = radius * (1 - 10 / 1400);
    const accent = scene.accent ?? ACCENT;
    ctx.globalAlpha = Math.min(1, state.reveal * 1.5);
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(3, diameter * 0.008);
    ctx.lineJoin = 'round';
    ctx.shadowColor = accent;
    ctx.shadowBlur = diameter * 0.03;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, scene.winnerIndex * slice, (scene.winnerIndex + 1) * slice);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function drawCenter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  diameter: number,
  scene: WinnerScene,
): void {
  const r = (diameter * scene.centerRatio) / 2;
  const border = Math.max(2, diameter * (4 / SCREEN_WHEEL_CSS_SIZE));

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = r * 0.5;
  ctx.fillStyle = scene.centerBorderColor ?? '#171717';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - border, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = scene.centerColor;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  if (scene.centerImage) {
    const img = scene.centerImage;
    const inner = (r - border) * 2;
    const scale = Math.max(inner / img.naturalWidth, inner / img.naturalHeight);
    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    ctx.drawImage(img, cx - iw / 2, cy - ih / 2, iw, ih);
  } else if (scene.centerText) {
    ctx.fillStyle = contrastForHex(scene.centerColor);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const max = r * 0.5;
    const text = fitText(ctx, scene.centerText, r * 1.6, `700 {size}px ${UI_FONT}`, max, max * 0.4);
    ctx.fillText(text, cx, cy);
  }
  ctx.restore();
}

/** The live wheel's default "drop" pointer, tinted with the slice under it. */
function drawPointer(
  ctx: CanvasRenderingContext2D,
  cx: number,
  wheelTop: number,
  diameter: number,
  scene: WinnerScene,
  rotation: number,
): void {
  const size = diameter * 0.11;
  const index = sliceUnderPointer(rotation, scene.sliceCount);
  const fill = paletteRimColor(scene.palette, index);

  ctx.save();
  ctx.translate(cx, wheelTop);
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = size * 0.3;
  ctx.shadowOffsetY = size * 0.12;
  ctx.beginPath();
  // Tip points down into the wheel; the round head sits above the rim.
  ctx.moveTo(0, size * 0.5);
  ctx.bezierCurveTo(-size * 0.15, size * 0.2, -size * 0.45, -size * 0.1, -size * 0.45, -size * 0.35);
  ctx.arc(0, -size * 0.35, size * 0.45, Math.PI, 0);
  ctx.bezierCurveTo(size * 0.45, -size * 0.1, size * 0.15, size * 0.2, 0, size * 0.5);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = Math.max(2, size * 0.06);
  ctx.strokeStyle = contrastForHex(fill);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -size * 0.35, size * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = contrastForHex(fill);
  ctx.fill();
  ctx.restore();
}

/** Deterministic pseudo-random numbers, so every frame agrees on the confetti. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function drawConfetti(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: FrameState,
  colors: readonly string[],
): void {
  const rand = seeded(7);
  const count = 110;
  const piece = Math.min(w, h) * 0.014;

  ctx.save();
  for (let i = 0; i < count; i += 1) {
    const x0 = rand() * w;
    const speed = (0.18 + rand() * 0.22) * h;
    const delay = rand() * 1.2;
    const sway = (0.01 + rand() * 0.03) * w;
    const phase = rand() * Math.PI * 2;
    const spin = (rand() - 0.5) * 10;
    const color = colors[i % colors.length];

    let y: number;
    let t: number;
    if (state.still) {
      t = rand() * 4;
      y = rand() * h;
    } else {
      t = state.confettiTime - delay;
      if (t < 0) continue;
      y = -piece * 2 + speed * t;
      if (y > h + piece) continue;
    }

    const x = x0 + Math.sin(t * 2 + phase) * sway;
    ctx.globalAlpha = Math.min(1, state.reveal * 1.5) * 0.9;
    ctx.fillStyle = color;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(phase + t * spin);
    ctx.fillRect(-piece / 2, -piece / 4, piece, piece / 2);
    ctx.restore();
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawWinnerCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  top: number,
  height: number,
  unit: number,
  scene: WinnerScene,
  reveal: number,
): void {
  const t = Math.min(1, Math.max(0, reveal));
  const pop = easeOutBack(t);
  const cardW = w * 0.8;
  const x = (w - cardW) / 2;

  ctx.save();
  ctx.globalAlpha = t;
  ctx.translate(w / 2, top + height / 2 + (1 - t) * 30 * unit);
  ctx.scale(0.85 + 0.15 * pop, 0.85 + 0.15 * pop);
  ctx.translate(-w / 2, -(top + height / 2));

  // A community's accent is a #rrggbb hex: 8c is the same 55% glow as the default.
  ctx.shadowColor = scene.accent ? `${scene.accent}8c` : 'rgba(251,191,36,0.55)';
  ctx.shadowBlur = 40 * unit;
  roundRect(ctx, x, top, cardW, height, 28 * unit);
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 3 * unit;
  ctx.strokeStyle = scene.accent ?? ACCENT;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = scene.accent ?? '#fde68a';
  ctx.font = `900 ${Math.round(24 * unit)}px ${UI_FONT}`;
  setLetterSpacing(ctx, 7 * unit);
  ctx.fillText(scene.winnerLabel.toUpperCase(), w / 2, top + height * 0.27);

  setLetterSpacing(ctx, 0);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(255,255,255,0.45)';
  ctx.shadowBlur = 14 * unit;
  const max = Math.round(68 * unit);
  const name = fitText(ctx, scene.winner, cardW * 0.9, `900 {size}px ${UI_FONT}`, max, max * 0.45);
  ctx.fillText(name, w / 2, top + height * 0.63);
  ctx.restore();
}

function drawFooter(ctx: CanvasRenderingContext2D, w: number, h: number, unit: number, scene: WinnerScene): void {
  const y = h - 58 * unit;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `500 ${Math.round(22 * unit)}px ${UI_FONT}`;
  ctx.fillText(scene.dateLabel, w / 2, y - 34 * unit);

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${Math.round(30 * unit)}px ${UI_FONT}`;
  setLetterSpacing(ctx, 2 * unit);
  ctx.fillText('wheelr.xyz', w / 2, y);
  ctx.restore();
}

/**
 * Sets the largest font (from `max` down to `min`) at which `text` fits in
 * `maxWidth`, then trims it with an ellipsis if even `min` is too wide.
 * `font` is a template where `{size}` is replaced by the pixel size.
 */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string,
  max: number,
  min: number,
): string {
  let size = Math.round(max);
  const floor = Math.max(8, Math.round(min));
  ctx.font = font.replace('{size}', String(size));
  while (size > floor && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = font.replace('{size}', String(size));
  }
  if (ctx.measureText(text).width <= maxWidth) return text;

  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}
