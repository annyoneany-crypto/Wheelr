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

  calculateSize() {
    const visibleWheelCount = this.wheelConfigurator.visibleWheelCount();
    const scaleByCount = visibleWheelCount === 1 ? 0.7 : visibleWheelCount === 2 ? 0.48 : visibleWheelCount === 3 ? 0.36 : 0.3;
    const size = Math.min(window.innerWidth, window.innerHeight) * scaleByCount;
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
