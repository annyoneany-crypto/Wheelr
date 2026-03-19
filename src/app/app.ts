import { Component, inject, OnInit } from '@angular/core';
import { Header } from './feature/header/header';
import { Router, RouterOutlet } from '@angular/router';
import { injectSpeedInsights } from '@vercel/speed-insights';

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
  
  ngOnInit() {
    // Inizializza il monitoraggio
    injectSpeedInsights();
  }
  
}
