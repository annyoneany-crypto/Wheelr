import { Component, inject, signal } from '@angular/core';
import { WheelConfigurator } from './services/wheel-configurator.service';
import { Wheel } from './shared/extraction-effect/wheel/wheel';
import { FireEffect } from './shared/winner-effect/fire-effect/fire-effect';
import { Header } from './feature/header/header';
import { LinearWheel } from './shared/extraction-effect/linear-wheel/linear-wheel';
import { Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [
    Header,
    Wheel,
    LinearWheel,
    FireEffect,
    RouterOutlet
],
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: {
    'display': 'block'
  }
})
export class App {
  wheelConfigurator = inject(WheelConfigurator);
  router = inject(Router);

  showPanelSettings = signal<boolean>(false);
  displyPanel = signal<boolean>(true);

  closeModal() {
    this.wheelConfigurator.drawWheel();
    this.wheelConfigurator.showModal.set(false);
  }

  togglePaletSettings(path: string): void {
    this.router.navigate([path]);
    this.showPanelSettings.set(!this.showPanelSettings());
  }

  closeUserPaneltransitionEnd(): void {
    if(this.showPanelSettings()){
      this.displyPanel.set(false);
    } else {
      this.displyPanel.set(true);
    }
  }
}
