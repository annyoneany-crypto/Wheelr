import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';
import { NativePlatformService } from './native-platform.service';
import { WheelConfigurator } from './wheel-configurator.service';
import type { effectType, pointerType, wheelViewType } from '../modules/classes/custom-type';

/** Everything premium. */
export type PremiumFeature = 'wheel3d' | 'pumpkin' | 'chest' | 'crown' | 'crystal';

/** Wheel views only shown with premium. Each one is also a `PremiumFeature` of the same name. */
export const PREMIUM_VIEWS: ReadonlySet<wheelViewType> = new Set<wheelViewType>(['wheel3d', 'pumpkin']);

/** Pointers only shown with premium. */
export const PREMIUM_POINTERS: ReadonlySet<pointerType> = new Set<pointerType>(['crown', 'crystal']);

/** Storage of the per-feature ad unlocks the app used to have; only cleaned up now. */
const LEGACY_AD_UNLOCK_STORAGE_KEYS = [
  'giveawayWheel.premiumAdUnlocks.v2',
  'giveawayWheel.premiumAdUnlockUntil.v1',
];

/**
 * Decides who gets the premium features.
 *
 * There is no purchase flow, so "premium" means something different per platform:
 * - **web**: being signed in unlocks every feature. The account is what we ask in exchange.
 * - **app**: every feature is free.
 *
 * On the web, signing out does take the options away — without rewriting the
 * user's settings: a stored `wheelView` of `wheel3d` stays as is and the page
 * renders the classic wheel until they sign back in (the `rendered*` signals).
 */
@Injectable({ providedIn: 'root' })
export class PremiumService {
  private readonly auth = inject(AuthService);
  private readonly wheelConfigurator = inject(WheelConfigurator);
  private readonly isNative = inject(NativePlatformService).isNative;

  /** Whether premium options may be chosen and shown: always in the app, signed in on the web. */
  private readonly hasPremium = computed(() => this.isNative || this.auth.isLoggedIn());

  /**
   * The wheel view actually on screen. On the web a stored premium view (`wheel3d`,
   * `pumpkin`) is left alone after signing out so it comes back on its own; until
   * then the classic wheel stands in for it.
   */
  readonly renderedWheelView = computed<wheelViewType>(() => {
    const view = this.wheelConfigurator.wheelView();
    return PREMIUM_VIEWS.has(view) && !this.hasPremium() ? 'wheel' : view;
  });

  /** And for the pointer: the premium ones stand down to the default drop. */
  readonly renderedPointerType = computed<pointerType>(() => {
    const pointer = this.wheelConfigurator.pointerType();
    return PREMIUM_POINTERS.has(pointer) && !this.hasPremium() ? 'drop' : pointer;
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
    if (this.isNative && isPlatformBrowser(inject(PLATFORM_ID))) {
      try {
        LEGACY_AD_UNLOCK_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
      } catch {
        // Storage unavailable: nothing to clean up.
      }
    }
  }

  /** Whether `feature` may be *selected* right now without asking. Reads signals, so it is reactive. */
  isUnlocked(_feature: PremiumFeature): boolean {
    return this.hasPremium();
  }

  /**
   * Opens the login modal when `feature` is locked (web, signed out). Returns
   * true when it is already unlocked and there is nothing to ask.
   */
  requestUnlock(feature: PremiumFeature): boolean {
    if (this.isUnlocked(feature)) {
      return true;
    }

    this.loginRequestToken.update((token) => token + 1);
    return false;
  }
}
