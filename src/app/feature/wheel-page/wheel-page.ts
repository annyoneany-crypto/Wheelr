import { Component, inject, signal } from '@angular/core';
import { WheelConfigurator } from '../../services/wheel-configurator.service';
import { LinearWheel } from '../../shared/extraction-effect/linear-wheel/linear-wheel';
import { Wheel } from '../../shared/extraction-effect/wheel/wheel';
import { CardsEffect } from '../../shared/extraction-effect/cards-draw/cards-draw';
import { FireEffect } from '../../shared/winner-effect/fire-effect/fire-effect';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-wheel-page',
  imports: [LinearWheel, Wheel, CardsEffect, FireEffect, RouterModule],
  templateUrl: './wheel-page.html',
  styleUrl: './wheel-page.css',
})
export class WheelPage {
  wheelConfigurator = inject(WheelConfigurator);
  router = inject(Router);
  route = inject(ActivatedRoute);

  showPanelSettings = signal<boolean>(false);
  displyPanel = signal<boolean>(true);
  currentPanelPath = signal<string>('');

  constructor() {
    this.syncPanelStateFromRoute();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.syncPanelStateFromRoute());
  }

  togglePaletSettings(path: string): void {
    if (this.showPanelSettings() && this.currentPanelPath() === path) {
      this.closePanel();
      return;
    }

    this.currentPanelPath.set(path);
    this.router.navigate([{ outlets: { panel: [path] } }], { relativeTo: this.route });
    if (!this.showPanelSettings()) {
      this.showPanelSettings.set(true);
    }
  }

  closePanel(): void {
    this.showPanelSettings.set(false);
    this.currentPanelPath.set('');
    this.displyPanel.set(true);
    this.router.navigate([{ outlets: { panel: null } }], { relativeTo: this.route });
  }

  isPanelActive(path: string): boolean {
    return this.showPanelSettings() && this.currentPanelPath() === path;
  }

  panelTitle(): string {
    const path = this.currentPanelPath();
    if (path === 'users') return 'Users';
    if (path === 'color-settings') return 'Colors';
    if (path === 'effects') return 'Effects';
    if (path === 'sound') return 'Audio';
    if (path === 'wheel-manager') return 'Wheels';
    return 'Settings';
  }

  private syncPanelStateFromRoute(): void {
    const panelSnapshot = this.route.snapshot.children.find((child) => child.outlet === 'panel');
    const panelPath = panelSnapshot?.url[0]?.path ?? '';
    const isOpen = panelPath.length > 0;

    this.currentPanelPath.set(panelPath);
    this.showPanelSettings.set(isOpen);
    this.displyPanel.set(!isOpen);
  }

  closeUserPaneltransitionEnd(): void {
    if (this.showPanelSettings()) {
      this.displyPanel.set(false);
    } else {
      this.displyPanel.set(true);
    }
  }
}
