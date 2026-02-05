import { Component, effect, ElementRef, inject, viewChild } from '@angular/core';
import { WheelConfigurator } from '../../../services/wheel-configurator.service';

@Component({
  selector: 'wl-wheel',
  imports: [],
  templateUrl: './wheel.html',
  styleUrl: './wheel.css',
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
}
