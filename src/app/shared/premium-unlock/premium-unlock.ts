import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NativePlatformService } from '../../services/native-platform.service';
import { PremiumService } from '../../services/premium.service';

/**
 * The app's "watch an ad to unlock premium" prompt. It lives in `App` rather
 * than in the settings drawer that triggers it: the drawer is its own stacking
 * context and would keep the backdrop from covering the header.
 *
 * AdMob requires the reward to be announced before a rewarded ad starts, which
 * is why the ad never plays straight from the button that asked for premium.
 */
@Component({
  selector: 'wl-premium-unlock',
  templateUrl: './premium-unlock.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PremiumUnlock {
  protected readonly premium = inject(PremiumService);
  protected readonly adPlaying = signal(false);
  /** Shown when the user closed the ad early and premium stayed locked. */
  protected readonly lockedNotice = signal<string | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(
      inject(NativePlatformService).registerBackHandler(() => this.dismiss()),
    );
  }

  protected async watchAd(): Promise<void> {
    if (this.adPlaying()) {
      return;
    }

    const feature = this.premium.adPromptFeature();
    if (!feature) {
      return;
    }

    this.adPlaying.set(true);
    this.lockedNotice.set(null);
    try {
      // Unlocks this feature only: every premium option has its own ad.
      const outcome = await this.premium.unlockWithRewardedAd(feature);
      if (outcome === 'skipped') {
        this.lockedNotice.set(
          $localize`:@@premium.feature.skipped:The ad has to play all the way through to unlock it. Give it another go.`,
        );
        return;
      }

      this.premium.adPromptFeature.set(null);
    } finally {
      this.adPlaying.set(false);
    }
  }

  /** Returns true when the prompt was open and got closed. */
  protected dismiss(): boolean {
    // Closing mid-ad would desync the prompt from the fullscreen ad on top of it.
    if (!this.premium.adPromptFeature() || this.adPlaying()) {
      return false;
    }

    this.premium.adPromptFeature.set(null);
    this.lockedNotice.set(null);
    return true;
  }
}
