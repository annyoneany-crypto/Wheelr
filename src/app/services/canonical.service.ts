import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class CanonicalService {
  constructor(@Inject(DOCUMENT) private dom: any) {}

  setCanonicalURL(url?: string) {
    // Se non passi un URL, usa quello attuale del browser
    const canPath = url ? url : this.dom.URL;
    
    // Rimuove eventuali canonical esistenti per evitare duplicati
    const head = this.dom.getElementsByTagName('head')[0];
    let element: HTMLLinkElement = this.dom.querySelector(`link[rel='canonical']`) || null;
    
    if (element === null) {
      element = this.dom.createElement('link');
      element.setAttribute('rel', 'canonical');
      head.appendChild(element);
    }
    
    element.setAttribute('href', canPath);
  }
}