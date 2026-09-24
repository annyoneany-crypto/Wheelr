import { computed, DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AdsService, RewardedAdOutcome } from './ads.service';
import { AuthService } from './auth.service';
import { readJson, writeJson } from './global_function';
import { WheelConfigurator } from './wheel-configurator.service';
import type { effectType, pointerType, wheelViewType } from '../modules/classes/custom-type';

/** Everything premium. In the app each one is unlocked by its own rewarded ad. */
export type PremiumFeature = 'wheel3d' | 'chest' | 'crown' | 'crystal';

/** Pointers only shown with premium. */
export const PREMIUM_POINTERS: ReadonlySet<pointerType> = new Set<pointerType>(['crown', 'crystal']);

/**
 * How long after its ad an option can be (re)selected without another ad. The
 * UI copy says "1 minute". It only gates *choosing* the option: one already in
 * use stays in use when this runs out.
 */
export const PREMIUM_AD_UNLOCK_MS = 60 * 1000;

const AD_UNLOCKS_STORAGE_KEY = 'giveawayWheel.premiumAdUnlocks.v2';
/** v1 unlocked every feature at once for 24 hours; it no longer means anything. */
const LEGACY_AD_UNLOCK_STORAGE_KEY = 'giveawayWheel.premiumAdUnlockUntil.v1';

type AdUnlocks = Partial<Record<PremiumFeature, number>>;

/**
 * Decides who gets the premium features.
 *
 * There is no purchase flow, so "premium" means something different per platform:
 * - **web**: being signed in unlocks every feature. The account is what we ask in exchange.
 * - **app**: each feature is unlocked on its own, by watching a rewarded ad for
 *   it. Watching the ad for the 3D wheel unlocks the 3D wheel only. The ad pays
 *   for *selecting* the option: it can be chosen freely for `PREMIUM_AD_UNLOCK_MS`
 *   afterwards, and an option already in use **stays in use** when that runs out.
 *   Only switching away and coming back to it asks for a new ad.
 *
 * On the web, signing out does take the options away — without rewriting the
 * user's settings: a stored `wheelView` of `wheel3d` stays as is and the page
 * renders the classic wheel until they sign back in (the `rendered*` signals).
 */
@Injectable({ providedIn: 'root' })
export class PremiumService {
  private readonly ads = inject(AdsService);
  private readonly auth = inject(AuthService);
  private readonly wheelConfigurator = inject(WheelConfigurator);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** True in the Android app, where premium is paid for with ads instead of a login. */
  readonly unlocksWithAd = this.ads.isEnabled;

  /** Expiry timestamp per feature unlocked by an ad (app only). */
  private readonly adUnlocks = signal<AdUnlocks>({});
  /** Ticks once a second while any ad unlock is running, to drive countdowns and expiry. */
  private readonly now = signal(Date.now());
  private clockTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Whether a premium option the user has already chosen may be shown. In the
   * app always: the ad paid for choosing it, and an expired timer never takes an
   * option away. On the web only while signed in.
   */
  private readonly canShowChosen = computed(() => this.unlocksWithAd || this.auth.isLoggedIn());

  /**
   * The wheel view actually on screen. On the web a stored `wheel3d` is left alone
   * after signing out so it comes back on its own; until then the classic wheel
   * stands in for it.
   */
  readonly renderedWheelView = computed<wheelViewType>(() => {
    const view = this.wheelConfigurator.wheelView();
    return view === 'wheel3d' && !this.canShowChosen() ? 'wheel' : view;
  });

  /** And for the pointer: the premium ones stand down to the default drop. */
  readonly renderedPointerType = computed<pointerType>(() => {
    const pointer = this.wheelConfigurator.pointerType();
    return PREMIUM_POINTERS.has(pointer) && !this.canShowChosen() ? 'drop' : pointer;
  });

  /** Same rule for the winner effect: the `chest` reveal stands down to confetti. */
  readonly renderedWinnerEffect = computed<effectType>(() => {
    const effect = this.wheelConfigurator.winnerEffect();
    return effect === 'chest' && !this.canShowChosen() ? 'confetti' : effect;
  });

  /**
   * Bumped to ask the header to open its login modal, which it owns. A token
   * rather than a boolean so asking twice in a row still reaches it.
   */
  readonly loginRequestToken = signal(0);

  /** The feature whose "watch an ad" prompt is on screen (`PremiumUnlock`), if any. */
  readonly adPromptFeature = signal<PremiumFeature | null>(null);

  constructor() {
    if (this.isBrowser && this.unlocksWithAd) {
      try {
        localStorage.removeItem(LEGACY_AD_UNLOCK_STORAGE_KEY);
      } catch {
        // Storage unavailable: nothing to clean up.
      }
      this.adUnlocks.set(readJson<AdUnlocks>(AD_UNLOCKS_STORAGE_KEY) ?? {});
      this.pruneExpired();
      this.syncClock();
    }

    inject(DestroyRef).onDestroy(() => this.stopClock());
  }

  /** Whether `feature` may be *selected* right now without asking. Reads signals, so it is reactive. */
  isUnlocked(feature: PremiumFeature): boolean {
    if (!this.unlocksWithAd) {
      return this.auth.isLoggedIn();
    }
    return (this.adUnlocks()[feature] ?? 0) > 0;
  }

  /** "4:32" left on an ad unlock, or '' when there is no countdown to show (web, or locked). */
  remainingLabel(feature: PremiumFeature): string {
    const until = this.adUnlocks()[feature];
    if (!this.unlocksWithAd || !until) {
      return '';
    }

    const seconds = Math.max(0, Math.ceil((until - this.now()) / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  /** Display name of a feature, for the ad prompt. Shares its ids with the Effects panel. */
  featureLabel(feature: PremiumFeature): string {
    switch (feature) {
      case 'wheel3d':
        return $localize`:@@effects.view.wheel3d:3D Wheel`;
      case 'chest':
        return $localize`:@@effects.fx.chest:3D Chests`;
      case 'crown':
        return $localize`:@@effects.pointer.crown:Crown`;
      case 'crystal':
        return $localize`:@@effects.pointer.crystal:Crystal`;
    }
  }

  /**
   * Starts whatever unlocks `feature` on this platform: its rewarded-ad prompt
   * in the app, the login modal on the web. Returns true when it is already
   * unlocked and there is nothing to ask.
   */
  requestUnlock(feature: PremiumFeature): boolean {
    if (this.isUnlocked(feature)) {
      return true;
    }

    if (this.unlocksWithAd) {
      this.adPromptFeature.set(feature);
    } else {
      this.loginRequestToken.update((token) => token + 1);
    }

    return false;
  }

  /**
   * Plays a rewarded ad and unlocks `feature` — and only it — on a reward. Like
   * the templates, an ad that could not even load lets the user through: the
   * app has to stay usable offline, and a skipped ad is the only outcome that
   * keeps it locked.
   */
  async unlockWithRewardedAd(feature: PremiumFeature): Promise<RewardedAdOutcome> {
    const outcome = await this.ads.showRewardedAd();

    if (outcome !== 'skipped') {
      this.adUnlocks.update((unlocks) => ({ ...unlocks, [feature]: Date.now() + PREMIUM_AD_UNLOCK_MS }));
      this.now.set(Date.now());
      this.persist();
      this.syncClock();
    }

    return outcome;
  }

  /** Drops expired unlocks. What is on screen does not change: they only gate selecting. */
  private pruneExpired(): void {
    const now = Date.now();
    const unlocks = this.adUnlocks();
    const live = Object.fromEntries(
      Object.entries(unlocks).filter(([, until]) => (until ?? 0) > now),
    ) as AdUnlocks;

    if (Object.keys(live).length !== Object.keys(unlocks).length) {
      this.adUnlocks.set(live);
      this.persist();
    }
  }

  private persist(): void {
    writeJson(AD_UNLOCKS_STORAGE_KEY, this.adUnlocks());
  }

  /** Runs the one-second clock only while at least one ad unlock is active. */
  private syncClock(): void {
    const active = Object.keys(this.adUnlocks()).length > 0;

    if (active && this.clockTimer === null && this.isBrowser) {
      this.clockTimer = setInterval(() => {
        this.now.set(Date.now());
        this.pruneExpired();
        this.syncClock();
      }, 1000);
    } else if (!active) {
      this.stopClock();
    }
  }

  private stopClock(): void {
    if (this.clockTimer !== null) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
  }
}
