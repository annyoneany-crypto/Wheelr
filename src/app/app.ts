import { Component, inject, OnInit } from '@angular/core';
import { Header } from './feature/header/header';
import { RouterOutlet } from '@angular/router';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { AdsService } from './services/ads.service';
import { SeoService } from './services/seo.service';
import { NativePlatformService } from './services/native-platform.service';

@Component({
  selector: 'app-root',
  imports: [
    Header,
    RouterOutlet
],
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: {
    'display': 'block'
  }
})
export class App implements OnInit {
  private readonly seo = inject(SeoService);
  nativePlatform = inject(NativePlatformService);
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

    if (!this.nativePlatform.isNative) {
      // Inizializza il monitoraggio
      injectSpeedInsights();
    }
  }
  
}
