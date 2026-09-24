import { Component, inject, ChangeDetectionStrategy, effect, signal, untracked } from '@angular/core';
import { WheelConfigurator } from '../../../services/wheel-configurator.service';
import { PremiumService } from '../../../services/premium.service';
import type { effectType, pointerType, wheelViewType } from '../../../modules/classes/custom-type';

@Component({
  selector: 'app-effects',
  imports: [],
  templateUrl: './effects.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './effects.css',
})
export class Effects {
  wheelConfigurator = inject(WheelConfigurator);
  protected readonly premium = inject(PremiumService);

  /** The 3D wheel was asked for while locked: switch to it as soon as premium turns on. */
  private readonly pending3dView = signal(false);

  constructor() {
    effect(() => {
      if (this.pending3dView() && this.premium.hasPremium()) {
        this.pending3dView.set(false);
        untracked(() => this.setView('wheel3d'));
      }
    });
  }

  setView(view: wheelViewType): void {
    this.pending3dView.set(false);
    this.wheelConfigurator.resetWinnerEffect();
    this.wheelConfigurator.isSpinning.set(false);
    this.wheelConfigurator.wheelView.set(view);
  }

  /** Premium-only: opens the login (web) or the rewarded-ad prompt (app) when locked. */
  select3dView(): void {
    if (this.premium.requestUnlock()) {
      this.setView('wheel3d');
      return;
    }

    this.pending3dView.set(true);
  }

  setWinnerEffect(effect: effectType): void {
    this.wheelConfigurator.resetWinnerEffect();
    this.wheelConfigurator.winnerEffect.set(effect);
  }

  setPointerType(pointer: pointerType): void {
    this.wheelConfigurator.pointerType.set(pointer);
  }
}
