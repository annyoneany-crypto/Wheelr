import { Injectable, inject, signal } from '@angular/core';
import {
  AdMob,
  AdmobConsentStatus,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
} from '@capacitor-community/admob';
import type { PluginListenerHandle } from '@capacitor/core';
import { ADMOB_CONFIG, SPINS_PER_INTERSTITIAL } from './admob.config';
import { NativePlatformService } from './native-platform.service';

/**
 * Outcome of a rewarded ad request.
 *
 * `unavailable` is deliberately distinct from `skipped`: the caller is expected
 * to let the user through when no ad could be loaded (offline, no fill, ads
 * disabled) but to hold the gate when an ad played and the user walked out of
 * it. Blocking on `unavailable` would make the feature unusable offline, which
 * this app otherwise supports.
 */
export type RewardedAdOutcome = 'rewarded' | 'skipped' | 'unavailable';

/**
 * All AdMob interaction lives here. On the web `isNative` is false, every public
 * method short-circuits, and the plugin is never touched — the browser build
 * keeps behaving exactly as it did before ads existed.
 */
@Injectable({ providedIn: 'root' })
export class AdsService {
  private readonly nativePlatform = inject(NativePlatformService);

  /** Ads only exist in the Android shell. */
  readonly isEnabled = this.nativePlatform.isNative;

  /** True while a fullscreen ad is on screen, so we never stack two. */
  readonly adInProgress = signal(false);

  private initialized = false;
  private initializing: Promise<void> | null = null;

  /** Set once consent resolves; ads must not be requested before that. */
  private canRequestAds = false;
  /**
   * False while the UMP round-trip has never succeeded. The consent request hits
   * Google's servers, so a flaky connection at launch would otherwise disable
   * ads for the entire session — instead every ad request retries it.
   */
  private consentResolved = false;

  private completedSpins = 0;
  private interstitialReady = false;

  async initialize(): Promise<void> {
    if (!this.isEnabled || this.initialized) {
      return;
    }

    // ngOnInit and the first template tap can race; share the same promise.
    this.initializing ??= this.runInitialize();
    await this.initializing;
  }

  private async runInitialize(): Promise<void> {
    try {
      await AdMob.initialize({
        initializeForTesting: ADMOB_CONFIG.useTestAds,
      });

      this.initialized = true;
      await this.resolveConsent();

      // Warm one up so the first interstitial does not stall the UI.
      void this.prepareInterstitial();
    } catch (error) {
      // A broken AdMob setup must never take the app down with it.
      console.warn('[Ads] initialization failed', error);
      this.initialized = true;
      this.canRequestAds = false;
    }
  }

  /**
   * Ensures the SDK is up and consent has been answered, retrying the consent
   * round-trip if an earlier attempt never got through. Returns whether an ad
   * may be requested right now.
   */
  private async ensureAdsAllowed(): Promise<boolean> {
    await this.initialize();

    if (!this.consentResolved) {
      await this.resolveConsent();
    }

    return this.canRequestAds;
  }

  /**
   * Runs the UMP consent flow and records whether ads may be requested at all.
   * A user in the EEA who refuses gets no personalized ads; `canRequestAds`
   * carries that decision straight from the SDK.
   */
  private async resolveConsent(): Promise<void> {
    try {
      let info = await AdMob.requestConsentInfo();

      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
        info = await AdMob.showConsentForm();
      }

      this.consentResolved = true;
      this.canRequestAds = info.canRequestAds;
    } catch (error) {
      // Leave `consentResolved` false so the next ad request tries again.
      console.warn('[Ads] consent flow failed, ads stay off for now', error);
      this.canRequestAds = false;
    }
  }

  /**
   * Plays a rewarded ad and reports whether the user actually earned the reward.
   *
   * The plugin's `showRewardVideoAd()` promise only settles when the reward is
   * granted — a user who closes the ad early leaves it pending forever. So the
   * result is driven by the `Dismissed` event instead, with `Rewarded` flipping
   * the flag that decides the outcome.
   */
  async showRewardedAd(): Promise<RewardedAdOutcome> {
    if (!this.isEnabled) {
      return 'unavailable';
    }

    if (!(await this.ensureAdsAllowed()) || this.adInProgress()) {
      console.warn('[Ads] rewarded ad requested but ads are not available');
      return 'unavailable';
    }

    this.adInProgress.set(true);
    const listeners: PluginListenerHandle[] = [];

    try {
      await AdMob.prepareRewardVideoAd({
        adId: ADMOB_CONFIG.rewardedAdId,
        isTesting: ADMOB_CONFIG.useTestAds,
      });

      return await new Promise<RewardedAdOutcome>((resolve) => {
        let earned = false;
        let settled = false;

        const settle = (outcome: RewardedAdOutcome) => {
          if (settled) {
            return;
          }
          settled = true;
          resolve(outcome);
        };

        void AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          earned = true;
        }).then((handle) => listeners.push(handle));

        void AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          settle(earned ? 'rewarded' : 'skipped');
        }).then((handle) => listeners.push(handle));

        void AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
          settle('unavailable');
        }).then((handle) => listeners.push(handle));

        AdMob.showRewardVideoAd().catch(() => settle('unavailable'));
      });
    } catch (error) {
      // Failing to load is not the user's fault — the caller lets them through.
      console.warn('[Ads] rewarded ad unavailable', error);
      return 'unavailable';
    } finally {
      await Promise.all(listeners.map((handle) => handle.remove()));
      this.adInProgress.set(false);
    }
  }

  /**
   * Records a finished spin and shows an interstitial on every
   * `SPINS_PER_INTERSTITIAL`-th one. The counter advances on web too so the
   * behaviour is identical to reason about; only the ad itself is native-only.
   */
  async registerCompletedSpin(): Promise<void> {
    this.completedSpins += 1;

    if (this.completedSpins % SPINS_PER_INTERSTITIAL !== 0) {
      return;
    }

    await this.showInterstitial();
  }

  private async showInterstitial(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    console.info(`[Ads] interstitial due after ${this.completedSpins} spins`);

    if (!(await this.ensureAdsAllowed()) || this.adInProgress()) {
      console.warn('[Ads] interstitial skipped, ads are not available');
      return;
    }

    this.adInProgress.set(true);
    const listeners: PluginListenerHandle[] = [];

    try {
      if (!this.interstitialReady) {
        await this.prepareInterstitial();
      }

      if (!this.interstitialReady) {
        return;
      }

      await new Promise<void>((resolve) => {
        let settled = false;
        const settle = () => {
          if (settled) {
            return;
          }
          settled = true;
          resolve();
        };

        void AdMob.addListener(InterstitialAdPluginEvents.Dismissed, settle).then((handle) =>
          listeners.push(handle),
        );
        void AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, settle).then((handle) =>
          listeners.push(handle),
        );

        AdMob.showInterstitial().catch(settle);
      });

      this.interstitialReady = false;
    } catch (error) {
      console.warn('[Ads] interstitial failed', error);
    } finally {
      await Promise.all(listeners.map((handle) => handle.remove()));
      this.adInProgress.set(false);
      // Load the next one now so the following break is instant.
      void this.prepareInterstitial();
    }
  }

  private async prepareInterstitial(): Promise<void> {
    if (!this.isEnabled || !this.canRequestAds || this.interstitialReady) {
      return;
    }

    try {
      await AdMob.prepareInterstitial({
        adId: ADMOB_CONFIG.interstitialAdId,
        isTesting: ADMOB_CONFIG.useTestAds,
      });
      this.interstitialReady = true;
    } catch (error) {
      console.warn('[Ads] could not preload interstitial', error);
      this.interstitialReady = false;
    }
  }
}
