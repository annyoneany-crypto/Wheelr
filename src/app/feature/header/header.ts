import { Component, computed, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { WheelConfigurator } from '../../services/wheel-configurator.service';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { WlAuth } from '../auth/auth';
import { WlInfoUtente } from '../info-utente/info-utente';

@Component({
  selector: 'wl-header',
  imports: [RouterLink, NgOptimizedImage, WlAuth, WlInfoUtente],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly router = inject(Router);
  protected readonly wheelConfigurator = inject(WheelConfigurator);
  protected readonly authService = inject(AuthService);

  isMenuOpen = signal(false);
  currentUrl = signal(this.router.url);
  isWheelRoute = computed(() => {
    const primaryUrl = this.currentUrl().split('(')[0];
    return primaryUrl === '/' || primaryUrl === '';
  });
  showIndependentPreview = computed(() => this.wheelConfigurator.visibleWheelCount() > 1);
  selectedWheelName = computed(() => this.wheelConfigurator.activeWheel()?.name ?? 'Wheel');
  showSelectedWheelBadge = computed(() => this.isWheelRoute() && !!this.wheelConfigurator.activeWheelId());
  isAuthModalOpen = signal(false);
  isUserPanelOpen = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.currentUrl.set(this.router.url);
      });
  }

  toggleMenu(): void {
    this.isMenuOpen.update((current) => !current);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  requestRenameModal(): void {
    this.wheelConfigurator.requestRenameModalOpen();
  }

  authButtonAriaLabel(): string {
    return this.authService.isLoggedIn() ? 'Open account panel' : 'Open login modal';
  }

  onAuthButtonClick(): void {
    if (this.authService.isLoggedIn()) {
      this.openUserPanel();
      return;
    }

    this.openAuthModal();
  }

  openUserPanel(): void {
    this.isUserPanelOpen.set(true);
  }

  closeUserPanel(): void {
    this.isUserPanelOpen.set(false);
  }

  async logoutFromUserPanel(): Promise<void> {
    await this.authService.logout();
    this.closeUserPanel();
  }

  openAuthModal(): void {
    this.isAuthModalOpen.set(true);
  }

  closeAuthModal(): void {
    this.isAuthModalOpen.set(false);
  }
}
