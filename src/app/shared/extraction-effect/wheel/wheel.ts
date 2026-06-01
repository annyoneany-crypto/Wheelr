import { Component, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
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
    isZoomed: boolean
  ): void {
    if (this.drawFrameId !== null) {
      cancelAnimationFrame(this.drawFrameId);
    }

    this.drawFrameId = requestAnimationFrame(() => {
      this.drawFrameId = null;
      this.wheelConfigurator.drawWheelForCanvas(canvas, context, this.CANVAS_RENDER_SCALE, isZoomed);
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
