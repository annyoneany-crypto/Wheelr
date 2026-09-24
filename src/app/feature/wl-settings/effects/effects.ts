import { Component, inject, ChangeDetectionStrategy, effect, signal, untracked } from '@angular/core';
import { WheelConfigurator } from '../../../services/wheel-configurator.service';
import { PREMIUM_POINTERS, PremiumService } from '../../../services/premium.service';
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
  private readonly pendingPremiumChoice = signal<(() => void) | null>(null);

  constructor() {
    effect(() => {
      const choice = this.pendingPremiumChoice();
      if (choice && this.premium.hasPremium()) {
        this.pendingPremiumChoice.set(null);
        untracked(choice);
      }
    });
  }

  setView(view: wheelViewType): void {
    this.pendingPremiumChoice.set(null);
    this.wheelConfigurator.resetWinnerEffect();
    this.wheelConfigurator.isSpinning.set(false);
    this.wheelConfigurator.wheelView.set(view);
  }

  /** Premium-only: opens the login (web) or the rewarded-ad prompt (app) when locked. */
  select3dView(): void {
    this.choosePremium(() => this.setView('wheel3d'));
  }

  setWinnerEffect(effect: effectType): void {
    if (effect === 'chest') {
      this.choosePremium(() => this.applyWinnerEffect('chest'));
      return;
    }

    this.pendingPremiumChoice.set(null);
    this.applyWinnerEffect(effect);
  }

  private applyWinnerEffect(effect: effectType): void {
    this.wheelConfigurator.resetWinnerEffect();
    this.wheelConfigurator.winnerEffect.set(effect);
  }

  /** Applies `choice` now if premium is on, otherwise as soon as the unlock succeeds. */
  private choosePremium(choice: () => void): void {
    if (this.premium.requestUnlock()) {
      choice();
      return;
    }

    this.pendingPremiumChoice.set(choice);
  }

  protected readonly premiumPointers: { id: pointerType; label: string }[] = [
    { id: 'crown', label: $localize`:@@effects.pointer.crown:Crown` },
    { id: 'crystal', label: $localize`:@@effects.pointer.crystal:Crystal` },
  ];

  setPointerType(pointer: pointerType): void {
    if (PREMIUM_POINTERS.has(pointer)) {
      this.choosePremium(() => this.wheelConfigurator.pointerType.set(pointer));
      return;
    }

    this.pendingPremiumChoice.set(null);
    this.wheelConfigurator.pointerType.set(pointer);
  }
}
