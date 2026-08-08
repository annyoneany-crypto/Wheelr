/**
 * AdMob identifiers for the Android build.
 *
 * These are the live units for the Wheelr AdMob account and `useTestAds` is off,
 * so every build made from this file serves billable ads.
 *
 * Set `useTestAds: true` while developing. Clicking or even repeatedly loading
 * real ads on your own device is invalid traffic and can get an AdMob account
 * suspended — the flag forces the SDK into test mode regardless of the unit IDs.
 *
 * The app ID also has to be mirrored in
 * `android/app/src/main/res/values/strings.xml` (`admob_app_id`) — the Google
 * Mobile Ads SDK reads it from the manifest at startup and crashes the app if it
 * is missing or malformed.
 *
 * @see https://developers.google.com/admob/android/test-ads
 */
export const ADMOB_CONFIG = {
  /** Mirror of `admob_app_id` in strings.xml; kept here only for reference. */
  appId: 'ca-app-pub-4183353813239805~8318556834',

  /** Watched in full before a template can be copied. */
  rewardedAdId: 'ca-app-pub-4183353813239805/1830718268',

  /** Shown every `SPINS_PER_INTERSTITIAL` spins. */
  interstitialAdId: 'ca-app-pub-4183353813239805/3804596756',

  /**
   * Forces the SDK into test mode regardless of the ad unit used. Turn this on
   * for any local testing so real impressions are never generated.
   */
  useTestAds: false,
} as const;

/** How many completed spins trigger an interstitial. */
export const SPINS_PER_INTERSTITIAL = 3;
