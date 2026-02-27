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
  effCanvasRef = effect(() => {
    if(this.canvasRef()) {
      this.wheelConfigurator.ctx.set(this.canvasRef()!.nativeElement.getContext('2d')!);
      this.wheelConfigurator.canvasRef.set(this.canvasRef()!);

      this.wheelConfigurator.drawWheel();
    }
  });

  width = signal(800);
  height = signal(800);

  private resizeTimeout: any;

  constructor() {
    this.calculateSize();  
  }

  calculateSize() {
    const size = Math.min(window.innerWidth, window.innerHeight) * 0.7;
    this.width.set(size);
    this.height.set(size);

    // 1. Cancella il timeout precedente se esiste
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    // 2. Fai ripartire il timer da zero
    this.resizeTimeout = setTimeout(() => {
      this.wheelConfigurator.drawWheel();
      this.resizeTimeout = null; 
    }, 200);
  }
}
