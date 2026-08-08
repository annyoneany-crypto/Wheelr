import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

/** Returns true when the press was consumed, false to let the next handler try. */
export type BackHandler = () => boolean;

/**
 * Everything that only applies when the Angular bundle is running inside the
 * Capacitor Android shell rather than a browser tab. Web builds still import
 * this service, but `isNative` is false and `initialize()` is a no-op, so the
 * plugin calls never run outside the native WebView.
 */
@Injectable({
  providedIn: 'root'
})
export class NativePlatformService {
  private readonly router = inject(Router);

  readonly isNative = Capacitor.isNativePlatform();
  readonly platform = Capacitor.getPlatform();

  /** Consulted newest-first, so the overlay opened last is the one back dismisses. */
  private readonly backHandlers: BackHandler[] = [];

  private initialized = false;

  async initialize(): Promise<void> {
    if (!this.isNative || this.initialized) {
      return;
    }

    this.initialized = true;

    // The whole app is a dark surface; matching the system bars avoids the
    // white flash between the splash screen and the first painted frame.
    await this.applySystemBarStyle();
    this.registerBackButton();

    // The splash stays up until Angular has actually rendered, not just until
    // the WebView loaded — otherwise the user sees an empty dark screen.
    await SplashScreen.hide();
  }

  /**
   * Lets a component claim the Android back press while it has an overlay open.
   * Modals here are plain signals rather than routes, so without this the press
   * falls through to "exit app" and the user loses their wheel setup.
   *
   * Call the returned function on destroy to unregister.
   */
  registerBackHandler(handler: BackHandler): () => void {
    this.backHandlers.push(handler);

    return () => {
      const index = this.backHandlers.lastIndexOf(handler);
      if (index !== -1) {
        this.backHandlers.splice(index, 1);
      }
    };
  }

  private async applySystemBarStyle(): Promise<void> {
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#111113' });
    } catch {
      // StatusBar is unavailable on some OEM skins; the app works without it.
    }
  }

  private registerBackButton(): void {
    void CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (this.dismissTopOverlay() || this.closeOpenPanel()) {
        return;
      }

      if (canGoBack) {
        window.history.back();
        return;
      }

      void CapacitorApp.exitApp();
    });
  }

  /** Returns true when a registered handler consumed the press. */
  private dismissTopOverlay(): boolean {
    for (let index = this.backHandlers.length - 1; index >= 0; index--) {
      if (this.backHandlers[index]()) {
        return true;
      }
    }

    return false;
  }

  /** Returns true when a settings panel was open on the `panel` outlet and got dismissed. */
  private closeOpenPanel(): boolean {
    const tree = this.router.parseUrl(this.router.url);

    if (!tree.root.children['panel']) {
      return false;
    }

    void this.router.navigate([{ outlets: { panel: null } }]);
    return true;
  }
}
