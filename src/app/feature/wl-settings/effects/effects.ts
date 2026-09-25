import { Component, inject, ChangeDetectionStrategy, effect, signal, untracked } from '@angular/core';
import { WheelConfigurator } from '../../../services/wheel-configurator.service';
import { PremiumFeature, PremiumService } from '../../../services/premium.service';
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

  /** A premium option picked while locked: applied as soon as that option unlocks. */
  private readonly pendingPremiumChoice = signal<{ feature: PremiumFeature; apply: () => void } | null>(null);

  constructor() {
    effect(() => {
      const pending = this.pendingPremiumChoice();
      if (pending && this.premium.isUnlocked(pending.feature)) {
        this.pendingPremiumChoice.set(null);
        untracked(pending.apply);
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
    this.choosePremium('wheel3d', () => this.setView('wheel3d'));
  }

  /** Premium-only, like the 3D wheel: its own ad in the app, a login on the web. */
  selectPumpkinView(): void {
    this.choosePremium('pumpkin', () => this.setView('pumpkin'));
  }

  setWinnerEffect(effect: effectType): void {
    if (effect === 'chest') {
      this.choosePremium('chest', () => this.applyWinnerEffect('chest'));
      return;
    }

    this.pendingPremiumChoice.set(null);
    this.applyWinnerEffect(effect);
  }

  private applyWinnerEffect(effect: effectType): void {
    this.wheelConfigurator.resetWinnerEffect();
    this.wheelConfigurator.winnerEffect.set(effect);
  }

  /**
   * Applies `apply` now if `feature` is unlocked; otherwise asks for its own ad
   * (app) or a login (web) and applies it once that succeeds.
   */
  private choosePremium(feature: PremiumFeature, apply: () => void): void {
    // Already the option in use: it stays in use after its timer, so no new ad.
    // Only switching away and coming back asks again.
    if (this.isInUse(feature) || this.premium.requestUnlock(feature)) {
      apply();
      return;
    }

    this.pendingPremiumChoice.set({ feature, apply });
  }

  /** Whether `feature` is the option currently on screen. */
  protected isInUse(feature: PremiumFeature): boolean {
    switch (feature) {
      case 'wheel3d':
      case 'pumpkin':
        return this.premium.renderedWheelView() === feature;
      case 'chest':
        return this.premium.renderedWinnerEffect() === 'chest';
      default:
        return this.premium.renderedPointerType() === feature;
    }
  }

  protected readonly premiumPointers: { id: PremiumFeature & pointerType; label: string }[] = [
    { id: 'crown', label: $localize`:@@effects.pointer.crown:Crown` },
    { id: 'crystal', label: $localize`:@@effects.pointer.crystal:Crystal` },
  ];

  setPointerType(pointer: pointerType): void {
    if (pointer === 'crown' || pointer === 'crystal') {
      this.choosePremium(pointer, () => this.wheelConfigurator.pointerType.set(pointer));
      return;
    }

    this.pendingPremiumChoice.set(null);
    this.wheelConfigurator.pointerType.set(pointer);
  }
}
