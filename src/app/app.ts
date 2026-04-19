import { Component, inject, OnInit } from '@angular/core';
import { Header } from './feature/header/header';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { CanonicalService } from './services/canonical.service';
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

constructor() {
  this.router.events.pipe(
    filter(event => event instanceof NavigationEnd)
  ).subscribe(() => {
    // Questo prenderà l'URL corrente automaticamente ad ogni cambio pagina
    this.canonical.setCanonicalURL(); 
  }); 
}

  ngOnInit() {
    // Inizializza il monitoraggio
    injectSpeedInsights();
  }
  
}
