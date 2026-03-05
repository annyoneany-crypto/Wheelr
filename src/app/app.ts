import { Component } from '@angular/core';
import { Header } from './feature/header/header';
import { RouterOutlet } from '@angular/router';

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
export class App {

  openCreatorLink() {
    window.open('https://x.com/AnnyoneAny', '_blank', 'noopener');
  }
  
}
