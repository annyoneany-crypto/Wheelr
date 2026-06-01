/**
 * Shared canvas renderer for the circular wheel.
 *
 * A single implementation used by the interactive wheel (WheelConfigurator),
 * the multi-wheel previews (WheelPage) and the public read-only wheel
 * (PublicWheel) to avoid duplicating the slice/label drawing logic.
 */
import { contrastForHex } from '../../services/global_function';

const DEFAULT_FONT_FAMILY = '"Inter", sans-serif';

export interface WheelRenderOptions {
  names: string[];
  colors: string[];
  fontFamily: string;
  /** Multiplier applied to font/line sizing when drawing on an upscaled canvas. */
  renderScale?: number;
  /** When true, text inset is divided by renderScale (used while zoomed in). */
  zoomed?: boolean;
  /** Distance in px subtracted from the half-width to obtain the wheel radius. */
  radiusInset?: number;
  /** Fill style used to draw a placeholder disc when there are no names. */
  emptyFillStyle?: string | null;
  /** Stroke colour for slice separators; pass null to skip the stroke. */
  sliceStroke?: string | null;
}

export function drawWheelCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  options: WheelRenderOptions
): void {
  const {
    names,
    colors,
    renderScale = 1,
    zoomed = false,
    radiusInset = 10,
    emptyFillStyle = null,
    sliceStroke = 'rgba(255,255,255,0.2)',
  } = options;
  const fontFamily = options.fontFamily || DEFAULT_FONT_FAMILY;

  const { width, height } = canvas;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = centerX - radiusInset;

  ctx.clearRect(0, 0, width, height);

  const n = names.length;
  if (n === 0) {
    if (emptyFillStyle) {
      ctx.fillStyle = emptyFillStyle;
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(radius, 0), 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  const colorCount = Math.max(1, colors.length);
  const baseInset = Math.max(20, Math.round(radius * 0.08));
  const textInset = zoomed ? Math.round(baseInset / renderScale) : baseInset;
  const sliceAngle = (Math.PI * 2) / n;

  // Slice geometry is identical for every slice, so the font-size bounds and
  // text position only need to be computed once instead of once per label.
  const bounds = computeFontBounds(radius, textInset, sliceAngle, n, renderScale);
  const maxWidth = Math.max(20, radius - textInset - 6);
  const labelX = radius - textInset;

  for (let i = 0; i < n; i += 1) {
    const angle = i * sliceAngle;
    const sliceColor = colors[i % colorCount] ?? '#ffffff';

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, angle, angle + sliceAngle);
    ctx.fillStyle = sliceColor;
    ctx.fill();
    if (sliceStroke) {
      ctx.lineWidth = renderScale;
      ctx.strokeStyle = sliceStroke;
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const labelColor = contrastForHex(sliceColor);
    const outlineColor = labelColor === '#FFFFFF' ? '#000000' : '#FFFFFF';
    ctx.fillStyle = labelColor;

    const fitted = fitLabel(ctx, names[i] ?? '', fontFamily, bounds, maxWidth);

    ctx.font = `bold ${fitted.fontSize}px ${fontFamily}`;
    ctx.strokeStyle = `${outlineColor}AA`;
    ctx.lineWidth = Math.max(2, Math.round(fitted.fontSize * 0.18));
    ctx.lineJoin = 'round';
    ctx.strokeText(fitted.text, labelX, 0);
    ctx.fillText(fitted.text, labelX, 0);
    ctx.restore();
  }
}

interface FontBounds {
  preferredFontSize: number;
  minFontSize: number;
}

/** Geometry-derived font-size bounds, shared by every slice of a wheel. */
function computeFontBounds(
  radius: number,
  textInset: number,
  sliceAngle: number,
  sliceCount: number,
  renderScale: number
): FontBounds {
  const textRadius = Math.max(8, radius - textInset);
  const maxFontByRadius = Math.max(8, Math.round(radius * 0.1));
  const maxFontByArc = Math.max(8, Math.floor(textRadius * sliceAngle * 0.58));
  const countScale = Math.min(1, Math.sqrt(8 / Math.max(1, sliceCount)));
  const maxFontByCount = Math.max(8, Math.floor(34 * countScale * renderScale));
  const preferredFontSize = Math.floor(
    Math.min(42 * renderScale, maxFontByRadius, maxFontByArc, maxFontByCount)
  );

  return { preferredFontSize: Math.max(8, preferredFontSize), minFontSize: 8 };
}

/**
 * Picks the largest font size (and, if needed, an ellipsised label) that fits
 * inside a slice. The common case — the preferred size fits, which is almost
 * always true on large wheels with short names — costs a single `measureText`.
 */
function fitLabel(
  ctx: CanvasRenderingContext2D,
  rawText: string,
  fontFamily: string,
  bounds: FontBounds,
  maxWidth: number
): { text: string; fontSize: number } {
  const text = rawText.trim() || '---';
  const { preferredFontSize, minFontSize } = bounds;

  // Fast path: the preferred size already fits.
  ctx.font = `bold ${preferredFontSize}px ${fontFamily}`;
  if (ctx.measureText(text).width <= maxWidth) {
    return { text, fontSize: preferredFontSize };
  }

  // If even the smallest size overflows, keep it and ellipsise the text.
  ctx.font = `bold ${minFontSize}px ${fontFamily}`;
  if (ctx.measureText(text).width > maxWidth) {
    return clipToWidth(ctx, text, fontFamily, minFontSize, maxWidth);
  }

  // Largest size in (minFontSize, preferredFontSize) whose label still fits.
  let lo = minFontSize;
  let hi = preferredFontSize;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    ctx.font = `bold ${mid}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  return { text, fontSize: lo };
}

function clipToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFamily: string,
  fontSize: number,
  maxWidth: number
): { text: string; fontSize: number } {
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  if (ctx.measureText(text).width <= maxWidth) {
    return { text, fontSize };
  }

  let clipped = text;
  while (clipped.length > 1) {
    clipped = clipped.slice(0, -1);
    const candidate = `${clipped}...`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      return { text: candidate, fontSize };
    }
  }

  return { text: '...', fontSize };
}
