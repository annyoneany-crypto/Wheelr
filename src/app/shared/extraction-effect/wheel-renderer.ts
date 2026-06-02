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
  /** Image drawn behind the whole wheel disc (replaces solid slice fills). */
  wheelImage?: HTMLImageElement | null;
  /** Per-slice images (up to 10, cycling). Each replaces the solid color fill of its slice. */
  sliceImages?: (HTMLImageElement | null)[];
  /** Slice indices whose labels must be drawn even when slices are too thin to
   *  normally fit text — e.g. the winner slice (and the neighbours revealed by
   *  the zoom) on very large wheels. Ignored when every slice already gets a
   *  label. */
  labelSliceIndices?: number[];
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
    wheelImage = null,
    sliceImages = [],
    labelSliceIndices = [],
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

  // Draw the wheel background image once, clipped to the full circle.
  if (wheelImage) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(wheelImage, centerX - radius, centerY - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  // Slice geometry is identical for every slice, so the font-size bounds and
  // text position only need to be computed once instead of once per label.
  const bounds = computeFontBounds(radius, textInset, sliceAngle, n, renderScale);
  const maxWidth = Math.max(20, radius - textInset - 6);
  const labelX = radius - textInset;
  const hasSliceImages = sliceImages.length > 0;
  // When there are so many slices that each arc is too thin to fit even the
  // smallest legible font, the labels are sub-pixel and invisible. Skipping
  // them avoids thousands of measureText/strokeText/fillText calls per redraw,
  // which is what froze the UI on very large name lists (>~1200 entries).
  const drawLabels = bounds.canFitText;
  // On those large wheels the caller can still request labels for a few slices
  // (the winner + neighbours revealed by the zoom). They read fine radially —
  // the thin arc only limited the tangential height — and stay readable once
  // the wheel is zoomed in.
  const forcedLabelSet =
    !drawLabels && labelSliceIndices.length
      ? new Set(labelSliceIndices.map((idx) => ((idx % n) + n) % n))
      : null;

  for (let i = 0; i < n; i += 1) {
    const angle = i * sliceAngle;
    const sliceColor = colors[i % colorCount] ?? '#ffffff';
    const sliceImg = hasSliceImages ? (sliceImages[i % sliceImages.length] ?? null) : null;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, angle, angle + sliceAngle);

    if (sliceImg) {
      // Draw image fitted (cover) to the slice's own local coordinate frame.
      ctx.save();
      ctx.clip();

      // Rotate so the slice mid-angle points along +x.
      ctx.translate(centerX, centerY);
      ctx.rotate(angle + sliceAngle / 2);

      // Slot dimensions in local coords: width = radius, height = arc-width at outer edge.
      const halfArc = radius * Math.sin(sliceAngle / 2);
      const slotW = radius;
      const slotH = halfArc * 2;
      const nw = sliceImg.naturalWidth || 1;
      const nh = sliceImg.naturalHeight || 1;
      const imgAspect = nw / nh;
      const slotAspect = slotW / Math.max(slotH, 0.001);

      // Cover: scale so the image fills the slot on the shorter dimension.
      let drawW: number, drawH: number;
      if (imgAspect > slotAspect) {
        drawH = slotH;
        drawW = drawH * imgAspect;
      } else {
        drawW = slotW;
        drawH = drawW / imgAspect;
      }

      // Centre the image within the slot (x: 0…radius, y: ±halfArc).
      ctx.drawImage(sliceImg, (slotW - drawW) / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      // Re-trace path for the stroke (clip consumed the path).
      if (sliceStroke) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle, angle + sliceAngle);
        ctx.lineWidth = renderScale;
        ctx.strokeStyle = sliceStroke;
        ctx.stroke();
      }
    } else if (!wheelImage) {
      // Default: solid color fill.
      ctx.fillStyle = sliceColor;
      ctx.fill();
      if (sliceStroke) {
        ctx.lineWidth = renderScale;
        ctx.strokeStyle = sliceStroke;
        ctx.stroke();
      }
    } else {
      // Wheel background image is active; just draw the separator line.
      if (sliceStroke) {
        ctx.lineWidth = renderScale;
        ctx.strokeStyle = sliceStroke;
        ctx.stroke();
      }
    }

    if (!drawLabels && !forcedLabelSet?.has(i)) {
      continue;
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Over images always use white text with a dark outline for readability.
    const useImageText = !!(sliceImg || wheelImage);
    const labelColor = useImageText ? '#FFFFFF' : contrastForHex(sliceColor);
    const outlineColor = useImageText ? '#000000' : (labelColor === '#FFFFFF' ? '#000000' : '#FFFFFF');
    ctx.fillStyle = labelColor;

    const fitted = fitLabel(ctx, names[i] ?? '', fontFamily, bounds, maxWidth);

    ctx.font = `bold ${fitted.fontSize}px ${fontFamily}`;
    ctx.strokeStyle = useImageText ? `#000000CC` : `${outlineColor}AA`;
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
  /** False when the per-slice arc cannot fit even the minimum font size, i.e.
   *  the labels would be sub-pixel/invisible. Lets the draw loop skip the
   *  (per-slice) label work entirely on very large name lists. */
  canFitText: boolean;
}

/** Geometry-derived font-size bounds, shared by every slice of a wheel. */
function computeFontBounds(
  radius: number,
  textInset: number,
  sliceAngle: number,
  sliceCount: number,
  renderScale: number
): FontBounds {
  const minFontSize = 8;
  const textRadius = Math.max(8, radius - textInset);
  const maxFontByRadius = Math.max(8, Math.round(radius * 0.1));
  // Raw arc capacity (before clamping) tells us whether text physically fits.
  const arcFontCapacity = Math.floor(textRadius * sliceAngle * 0.58);
  const maxFontByArc = Math.max(minFontSize, arcFontCapacity);
  const countScale = Math.min(1, Math.sqrt(8 / Math.max(1, sliceCount)));
  const maxFontByCount = Math.max(minFontSize, Math.floor(34 * countScale * renderScale));
  const preferredFontSize = Math.floor(
    Math.min(42 * renderScale, maxFontByRadius, maxFontByArc, maxFontByCount)
  );

  return {
    preferredFontSize: Math.max(minFontSize, preferredFontSize),
    minFontSize,
    canFitText: arcFontCapacity >= minFontSize,
  };
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
