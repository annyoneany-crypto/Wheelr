import { Component, inject, OnInit } from '@angular/core';
import { Header } from './feature/header/header';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { CanonicalService } from './services/canonical.service';
import { NativePlatformService } from './services/native-platform.service';
import { filter } from 'rxjs';

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
  router = inject(Router);
  canonical = inject(CanonicalService);
  nativePlatform = inject(NativePlatformService);

constructor() {
  this.router.events.pipe(
    filter(event => event instanceof NavigationEnd)
  ).subscribe(() => {
    // Questo prenderà l'URL corrente automaticamente ad ogni cambio pagina
    this.canonical.setCanonicalURL(); 
  }); 
}

  ngOnInit() {
    // Status bar, tasto indietro Android e chiusura dello splash: no-op sul web.
    void this.nativePlatform.initialize();

    if (!this.nativePlatform.isNative) {
      // Inizializza il monitoraggio
      injectSpeedInsights();
    }
  }
  
}
