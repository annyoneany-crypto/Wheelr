import { Component, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WheelConfigurator } from '../../services/wheel-configurator.service';

@Component({
  selector: 'wl-header',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  wheelConfigurator = inject(WheelConfigurator);
  isMenuOpen = signal(false);

  toggleMenu(): void {
    this.isMenuOpen.update((current) => !current);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }
}
