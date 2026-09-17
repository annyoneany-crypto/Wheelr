import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NativePlatformService } from '../../services/native-platform.service';
import { readJson, writeJson } from '../../services/global_function';

/** Play Store listing of the Android build of this very bundle. */
export const ANDROID_APP_URL = 'https://play.google.com/store/apps/details?id=xyz.wheelr.app';

const DISMISSED_KEY = 'giveawayWheel.androidAppBannerDismissed';

/**
 * Floating "get the Android app" banner, rendered by the app shell on every page.
 *
 * Inside the Capacitor shell it would advertise the app the user is already
 * running, so it never renders there. A dismissal is persisted in localStorage:
 * once closed, it must not come back on the next visit.
 */
@Component({
  selector: 'wl-app-download-banner',
  templateUrl: './app-download-banner.html',
  styleUrl: './app-download-banner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WlAppDownloadBanner {
  private readonly nativePlatform = inject(NativePlatformService);

  protected readonly storeUrl = ANDROID_APP_URL;

  private readonly dismissed = signal(
    this.nativePlatform.isNative || readJson<boolean>(DISMISSED_KEY) === true
  );

  protected readonly isVisible = computed(() => !this.dismissed());

  protected dismiss(): void {
    this.dismissed.set(true);
    writeJson(DISMISSED_KEY, true);
  }
}
