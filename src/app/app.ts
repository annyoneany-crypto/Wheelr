import { Component, PLATFORM_ID, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Header } from './feature/header/header';
import { RouterOutlet } from '@angular/router';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { AdsService } from './services/ads.service';
import { SeoService } from './services/seo.service';
import { NativePlatformService } from './services/native-platform.service';
import { WlAppDownloadBanner } from './shared/app-download-banner/app-download-banner';

@Component({
  selector: 'app-root',
  imports: [Header, RouterOutlet, WlAppDownloadBanner],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    display: 'block',
  },
})
export class App implements OnInit {
  private readonly seo = inject(SeoService);
  nativePlatform = inject(NativePlatformService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  ads = inject(AdsService);

  constructor() {
    // Subscribed in the constructor so the very first NavigationEnd is caught.
    this.seo.watchNavigation();
  }

  ngOnInit() {
    // Status bar, tasto indietro Android e chiusura dello splash: no-op sul web.
    void this.nativePlatform.initialize();

    // Consenso GDPR + preload del primo interstitial: anche questo no-op sul web.
    void this.ads.initialize();

    // ngOnInit also runs while prerendering, where Speed Insights has no
    // window to attach to — and a build-time pageview would be meaningless.
    if (this.isBrowser && !this.nativePlatform.isNative) {
      // Inizializza il monitoraggio
      injectSpeedInsights();
    }
  }
}
