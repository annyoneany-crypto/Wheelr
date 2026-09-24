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

    this.adPlaying.set(true);
    this.lockedNotice.set(null);
    try {
      const outcome = await this.premium.unlockWithRewardedAd();
      if (outcome === 'skipped') {
        this.lockedNotice.set(
          $localize`:@@premium.unlock.skipped:The ad has to play all the way through to unlock Premium. Give it another go.`,
        );
        return;
      }

      this.premium.adPromptOpen.set(false);
    } finally {
      this.adPlaying.set(false);
    }
  }

  /** Returns true when the prompt was open and got closed. */
  protected dismiss(): boolean {
    // Closing mid-ad would desync the prompt from the fullscreen ad on top of it.
    if (!this.premium.adPromptOpen() || this.adPlaying()) {
      return false;
    }

    this.premium.adPromptOpen.set(false);
    this.lockedNotice.set(null);
    return true;
  }
}
