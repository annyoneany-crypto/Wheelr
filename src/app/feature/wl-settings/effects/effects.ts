import { Component, inject } from '@angular/core';
import { WheelConfigurator } from '../../../services/wheel-configurator.service';
import type { effectType } from '../../../modules/classes/custom-type';

@Component({
  selector: 'app-effects',
  imports: [],
  templateUrl: './effects.html',
  styleUrl: './effects.css',
})
export class Effects {
  wheelConfigurator = inject(WheelConfigurator);

  setView(view: 'wheel' | 'linear' | 'cards'): void {
    this.wheelConfigurator.resetWinnerEffect();
    this.wheelConfigurator.isSpinning.set(false);
    this.wheelConfigurator.wheelView.set(view);
  }

  setWinnerEffect(effect: effectType): void {
    this.wheelConfigurator.resetWinnerEffect();
    this.wheelConfigurator.winnerEffect.set(effect);
  }
}

