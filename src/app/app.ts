import { Component, effect, inject, viewChild } from '@angular/core';
import { WheelConfigurator } from './services/wheel-configurator.service';
import { Settings } from "./feature/settings/settings";
import { Wheel } from './shared/extraction-effect/wheel/wheel';
import { FireEffect } from './shared/winner-effect/fire-effect/fire-effect';
import { Header } from './feature/header/header';
import { LinearWheel } from './shared/extraction-effect/linear-wheel/linear-wheel';

@Component({
  selector: 'app-root',
  imports: [
    Header,
    Settings, 
    Wheel,
    LinearWheel,
    FireEffect
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: {
    'display': 'block'
  }
})
export class App {
  wheelConfigurator = inject(WheelConfigurator);

  fireEffectRef = viewChild<IWinnerEffect>('winnerEffect');

  constructor() {
    // Avvia animazione fuoco quando c'è un vincitore
    effect(() => {
      const winnerName = this.wheelConfigurator.winner();
      if (winnerName) {
        setTimeout(() => this.fireEffectRef()!.initAnimation(), 50);
      } else {
        if (this.wheelConfigurator.fireAnimationId()) cancelAnimationFrame(this.wheelConfigurator.fireAnimationId()!);
      }
    });
  }

  closeModal() {
    this.wheelConfigurator.drawWheel();
    this.wheelConfigurator.showModal.set(false);
  }
}
