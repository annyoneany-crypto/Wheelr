import { Component, inject } from '@angular/core';
import { WheelConfigurator } from '../../../services/wheel-configurator.service';

@Component({
  selector: 'app-effects',
  imports: [],
  templateUrl: './effects.html',
  styleUrl: './effects.css',
})
export class Effects {
  wheelConfigurator = inject(WheelConfigurator);

  setView(view: 'wheel' | 'linear'): void {
    this.wheelConfigurator.wheelView.set(view);
  }
}

