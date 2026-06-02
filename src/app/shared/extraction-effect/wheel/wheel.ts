import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { WheelConfigurator } from '../../../services/wheel-configurator.service';

@Component({
  selector: 'wl-wheel',
  imports: [],
  templateUrl: './wheel.html',
  styleUrl: './wheel.css',
  host: {
    '(window:resize)': 'calculateSize()'
  }
})
export class Wheel {
  wheelConfigurator = inject(WheelConfigurator);
  readonly CANVAS_RENDER_SCALE = 7;
  /** Above this entry count the winner zoom uses the aggressive scale so the
   *  (very thin) winning slice and its label become legible. */
  private readonly AGGRESSIVE_ZOOM_THRESHOLD = 600;
  private readonly DEFAULT_WINNER_ZOOM = 7;
  private readonly AGGRESSIVE_WINNER_ZOOM = 14;
  /** Number of slices on each side of the winner whose labels are force-drawn
   *  on large wheels, so the zoomed-in strip shows names. */
  private readonly WINNER_LABEL_WINDOW = 25;

  canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('wheelCanvas');
  private readonly syncCanvasEffect = effect(() => {
    const canvasElement = this.canvasRef()?.nativeElement;
    if (!canvasElement) {
      return;
    }

    const context = canvasElement.getContext('2d');
    if (!context) {
      return;
    }

    // Trigger redraw on source data changes and draw on this specific instance.
    this.wheelConfigurator.names();
    this.wheelConfigurator.selectedPalette();
    this.wheelConfigurator.fontFamily();
    this.wheelConfigurator.fontRenderVersion();
    this.wheelConfigurator.imageRenderVersion();

    // Wheels that zoom on win (>30 names) are ALWAYS rendered with the zoomed
    // text inset — note this effect deliberately does not read winner(). That
    // way revealing the winner triggers only the CSS scale() transition and not
    // a canvas redraw, so the zoom stays smooth no matter how many names there
    // are (a full redraw of hundreds of labels on a 7x canvas is what made it
    // stutter above ~250 names). The 7x backing store keeps the zoom sharp.
    this.scheduleDraw(canvasElement, context, this.isLargeWheel());

    // Keep backward compatibility for service consumers expecting a primary canvas.
    this.wheelConfigurator.ctx.set(context);
    this.wheelConfigurator.canvasRef.set(this.canvasRef()!);
  });

  width = signal(800);
  height = signal(800);
  forceUnzoom = signal(false);

  /** Zoom factor used when revealing the winner. Larger lists need a more
   *  aggressive zoom because their slices are far thinner. */
  zoomScale = computed(() =>
    this.wheelConfigurator.names().length > this.AGGRESSIVE_ZOOM_THRESHOLD
      ? this.AGGRESSIVE_WINNER_ZOOM
      : this.DEFAULT_WINNER_ZOOM
  );

  /** True while the wheel is zoomed into the winning slice. */
  winnerZoomActive = computed(
    () =>
      !!this.wheelConfigurator.winner() &&
      this.wheelConfigurator.names().length > 30 &&
      !this.forceUnzoom()
  );

  /** CSS transform for the scaling wrapper around the canvas. */
  wheelScaleTransform = computed(() =>
    this.winnerZoomActive() ? `scale(${this.zoomScale()})` : 'scale(1)'
  );

  /** Vertical offset that keeps the centre logo out of the zoomed-in view.
   *  The wheel centre sits at 50% of the wheel height; scaling from the top
   *  pushes it to scale*50%. */
  centerTopOffset = computed(() =>
    this.winnerZoomActive() ? `${this.zoomScale() * 50}%` : '50%'
  );

  private readonly resetUnzoomEffect = effect(() => {
    // Reset manual zoom-out whenever a new spin starts.
    if (this.wheelConfigurator.isSpinning()) {
      this.forceUnzoom.set(false);
    }
  });

  // On large wheels labels are skipped for performance (see wheel-renderer).
  // When a winner is revealed we redraw once with labels forced on the winner
  // slice and its neighbours, so the zoomed-in strip shows names. Reads
  // pointerSliceIndex() only while a winner is present, so the continuous idle
  // rotation never re-triggers this redraw.
  private readonly winnerLabelEffect = effect(() => {
    const hasWinner = !!this.wheelConfigurator.winner();
    const canvasElement = this.canvasRef()?.nativeElement;
    const context = canvasElement?.getContext('2d') ?? null;
    if (!canvasElement || !context) {
      return;
    }

    if (!hasWinner) {
      // Winner dismissed: redraw without the forced labels.
      this.scheduleDraw(canvasElement, context, this.isLargeWheel());
      return;
    }

    const winnerIndex = this.wheelConfigurator.pointerSliceIndex();
    const labelIndices: number[] = [];
    for (let offset = -this.WINNER_LABEL_WINDOW; offset <= this.WINNER_LABEL_WINDOW; offset += 1) {
      labelIndices.push(winnerIndex + offset);
    }

    this.scheduleDraw(canvasElement, context, this.isLargeWheel(), labelIndices);
  });


  /**
   * SVG path tracing the borders of the winner slice in screen space.
   * The canvas content is drawn with slice 0 starting at angle 0 (3 o'clock).
   * The CSS rotation `currentRotation` shifts all slices clockwise by that many degrees.
   * We account for both so the overlay aligns with the physically rotated canvas.
   */
  winnerSlicePath = computed(() => {
    const n = this.wheelConfigurator.names().length;
    if (!n) return '';
    const w = this.width();
    const h = this.height();
    const cx = w / 2;
    const cy = h / 2;
    const r = cx - 2;
    const sliceAngle = (Math.PI * 2) / n;
    const k = this.wheelConfigurator.pointerSliceIndex();
    const R = this.wheelConfigurator.currentRotation() * (Math.PI / 180);
    // Winner slice k spans canvas angles [k*sliceAngle, (k+1)*sliceAngle].
    // After CSS rotation R the visual screen angles are shifted by R.
    const a1 = k * sliceAngle + R;
    const a2 = a1 + sliceAngle;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  });
  private readonly syncSizeEffect = effect(() => {
    this.wheelConfigurator.visibleWheelCount();
    this.calculateSize();
  });

  private resizeTimeout: any;
  private drawFrameId: number | null = null;

  constructor() {
    this.calculateSize();
  }

  ngOnDestroy(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }
    if (this.drawFrameId !== null) {
      cancelAnimationFrame(this.drawFrameId);
      this.drawFrameId = null;
    }
  }

  // Large wheels (>30 names) use the zoomed text inset and zoom in on win.
  private isLargeWheel(): boolean {
    return this.wheelConfigurator.names().length > 30;
  }

  /**
   * Draws the wheel on the next animation frame instead of synchronously, so a
   * heavy redraw never blocks the main thread during the winner zoom transition.
   */
  private scheduleDraw(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    isZoomed: boolean,
    labelSliceIndices?: number[]
  ): void {
    if (this.drawFrameId !== null) {
      cancelAnimationFrame(this.drawFrameId);
    }

    this.drawFrameId = requestAnimationFrame(() => {
      this.drawFrameId = null;
      this.wheelConfigurator.drawWheelForCanvas(
        canvas,
        context,
        this.CANVAS_RENDER_SCALE,
        isZoomed,
        labelSliceIndices
      );
    });
  }

  calculateSize() {
    const visibleWheelCount = Math.max(1, this.wheelConfigurator.visibleWheelCount());
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth < 1024;

    const horizontalUiReserve = visibleWheelCount > 1
      ? (isMobile ? 20 : 420)
      : (isMobile ? 20 : 160);
    const verticalUiReserve = visibleWheelCount > 1
      ? (isMobile ? 120 : 180)
      : (isMobile ? 150 : 220);
    const usableWidth = Math.max(220, viewportWidth - horizontalUiReserve);
    const usableHeight = Math.max(220, viewportHeight - verticalUiReserve);

    const columns = visibleWheelCount > 1 && viewportWidth >= 768 ? 2 : 1;
    const rows = Math.max(1, Math.ceil(visibleWheelCount / columns));
    const gap = 24;

    const perCellWidth = (usableWidth - gap * (columns - 1)) / columns;
    const perCellHeight = (usableHeight - gap * (rows - 1)) / rows;
    const bestFitSize = Math.min(perCellWidth, perCellHeight, 760);
    const minimumSize = visibleWheelCount > 1 ? 88 : 140;
    const size = Math.max(minimumSize, Number.isFinite(bestFitSize) ? Math.floor(bestFitSize) : minimumSize);

    this.width.set(size);
    this.height.set(size);

    // 1. Cancella il timeout precedente se esiste
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    // 2. Fai ripartire il timer da zero
    this.resizeTimeout = setTimeout(() => {
      const canvasElement = this.canvasRef()?.nativeElement;
      const context = canvasElement?.getContext('2d');
      if (canvasElement && context) {
        this.scheduleDraw(canvasElement, context, this.isLargeWheel());
      }
      this.resizeTimeout = null;
    }, 200);
  }
}
