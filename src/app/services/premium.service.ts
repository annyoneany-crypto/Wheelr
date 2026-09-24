import { computed, DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AdsService, RewardedAdOutcome } from './ads.service';
import { AuthService } from './auth.service';
import { readJson, writeJson } from './global_function';
import { WheelConfigurator } from './wheel-configurator.service';
import type { effectType, wheelViewType } from '../modules/classes/custom-type';

const AD_UNLOCK_STORAGE_KEY = 'giveawayWheel.premiumAdUnlockUntil.v1';

/** How long one rewarded ad keeps the premium features open in the app (the prompt says 24 hours). */
export const PREMIUM_AD_UNLOCK_MS = 24 * 60 * 60 * 1000;

/**
 * Decides who gets the premium features (today: the 3D wheel).
 *
 * There is no purchase flow, so "premium" means something different per platform:
 * - **web**: being signed in. The account is what we ask in exchange.
 * - **app**: having watched a rewarded ad in the last `PREMIUM_AD_UNLOCK_MS`.
 *   The unlock is stored so it survives an app restart within that window.
 *
 * Losing premium never rewrites the user's settings: the stored `wheelView` stays
 * `wheel3d` and the page just renders the classic wheel until premium is back.
 */
@Injectable({ providedIn: 'root' })
export class PremiumService {
  private readonly ads = inject(AdsService);
  private readonly auth = inject(AuthService);
  private readonly wheelConfigurator = inject(WheelConfigurator);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** True in the Android app, where premium is paid for with an ad instead of a login. */
  readonly unlocksWithAd = this.ads.isEnabled;

  private readonly adUnlockedUntil = signal<number>(0);
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly hasPremium = computed(() =>
    this.unlocksWithAd ? this.adUnlockedUntil() > 0 : this.auth.isLoggedIn(),
  );

  /**
   * The wheel view actually on screen. A stored `wheel3d` is left alone when
   * premium lapses (logout, expired ad unlock) so it comes back on its own;
   * until then the classic wheel stands in for it.
   */
  readonly renderedWheelView = computed<wheelViewType>(() => {
    const view = this.wheelConfigurator.wheelView();
    return view === 'wheel3d' && !this.hasPremium() ? 'wheel' : view;
  });

  /** Same rule for the winner effect: the `chest` reveal stands down to confetti. */
  readonly renderedWinnerEffect = computed<effectType>(() => {
    const effect = this.wheelConfigurator.winnerEffect();
    return effect === 'chest' && !this.hasPremium() ? 'confetti' : effect;
  });

  /**
   * Bumped to ask the header to open its login modal, which it owns. A token
   * rather than a boolean so asking twice in a row still reaches it.
   */
  readonly loginRequestToken = signal(0);

  constructor() {
    if (this.isBrowser && this.unlocksWithAd) {
      this.applyAdUnlock(readJson<number>(AD_UNLOCK_STORAGE_KEY) ?? 0);
    }

    inject(DestroyRef).onDestroy(() => this.clearExpiryTimer());
  }

  /** Open while the app's "watch an ad to unlock" prompt is on screen (`PremiumUnlock`). */
  readonly adPromptOpen = signal(false);

  /**
   * Starts whatever unlocks premium on this platform: the rewarded-ad prompt in
   * the app, the login modal on the web. Returns true when premium is already on
   * and there is nothing to ask.
   */
  requestUnlock(): boolean {
    if (this.hasPremium()) {
      return true;
    }

    if (this.unlocksWithAd) {
      this.adPromptOpen.set(true);
    } else {
      this.loginRequestToken.update((token) => token + 1);
    }

    return false;
  }

  /**
   * Plays a rewarded ad and unlocks premium on a reward. Like the templates, an
   * ad that could not even load lets the user through: the app has to stay
   * usable offline, and a skipped ad is the only outcome that keeps it locked.
   */
  async unlockWithRewardedAd(): Promise<RewardedAdOutcome> {
    const outcome = await this.ads.showRewardedAd();

    if (outcome !== 'skipped') {
      const until = Date.now() + PREMIUM_AD_UNLOCK_MS;
      writeJson(AD_UNLOCK_STORAGE_KEY, until);
      this.applyAdUnlock(until);
    }

    return outcome;
  }

  /** Stores the unlock and schedules its expiry, so `hasPremium` flips on its own. */
  private applyAdUnlock(until: number): void {
    this.clearExpiryTimer();

    const remaining = until - Date.now();
    if (remaining <= 0) {
      this.adUnlockedUntil.set(0);
      return;
    }

    this.adUnlockedUntil.set(until);
    this.expiryTimer = setTimeout(() => {
      this.expiryTimer = null;
      this.adUnlockedUntil.set(0);
    }, remaining);
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimer !== null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }
}
