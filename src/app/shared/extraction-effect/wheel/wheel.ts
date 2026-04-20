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

    this.wheelConfigurator.drawWheelForCanvas(canvasElement, context);

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

  constructor() {
    this.calculateSize();
  }

  ngOnDestroy(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }
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
        this.wheelConfigurator.drawWheelForCanvas(canvasElement, context);
      }
      this.resizeTimeout = null; 
    }, 200);
  }
}
