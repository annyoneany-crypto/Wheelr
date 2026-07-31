import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { WheelConfigurator } from '../../services/wheel-configurator.service';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { WheelCloudRepository } from '../../services/wheel-cloud-repository.service';
import { WlAuth } from '../auth/auth';
import { WlInfoUtente } from '../info-utente/info-utente';

type CloudSaveState = 'idle' | 'saving' | 'success' | 'error';

@Component({
  selector: 'wl-header',
  imports: [RouterLink, NgOptimizedImage, WlAuth, WlInfoUtente],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly wheelCloudRepository = inject(WheelCloudRepository);
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

  cloudSaveState = signal<CloudSaveState>('idle');
  cloudSaveMessage = signal('');
  canSaveWheel = computed(() => this.isWheelRoute() && !!this.wheelConfigurator.activeWheelId());

  private pendingCloudSave = false;
  private authSucceededInModal = false;
  private feedbackTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // The user signal is populated asynchronously by onAuthStateChanged, so a save
    // requested before login has to wait for the session rather than for the modal.
    effect(() => {
      if (!this.authService.isLoggedIn() || !this.pendingCloudSave) {
        return;
      }

      this.pendingCloudSave = false;
      untracked(() => void this.saveActiveWheelToCloud());
    });

    this.destroyRef.onDestroy(() => this.clearFeedbackTimeout());

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
    this.authSucceededInModal = false;
    this.isAuthModalOpen.set(true);
  }

  closeAuthModal(): void {
    this.isAuthModalOpen.set(false);

    // Modal dismissed without signing in: drop the queued save instead of firing it
    // on some later, unrelated login.
    if (!this.authSucceededInModal && !this.authService.isLoggedIn()) {
      this.pendingCloudSave = false;
    }

    this.authSucceededInModal = false;
  }

  onAuthenticated(): void {
    this.authSucceededInModal = true;
  }

  saveButtonAriaLabel(): string {
    switch (this.cloudSaveState()) {
      case 'saving':
        return 'Saving wheel to cloud';
      case 'success':
        return 'Wheel saved to cloud';
      case 'error':
        return 'Wheel save failed, retry';
      default:
        return this.wheelConfigurator.activeWheel()?.cloudConfigId
          ? 'Update saved wheel in cloud'
          : 'Save wheel to cloud';
    }
  }

  onSaveWheelClick(): void {
    if (this.cloudSaveState() === 'saving') {
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.pendingCloudSave = true;
      this.openAuthModal();
      return;
    }

    void this.saveActiveWheelToCloud();
  }

  private async saveActiveWheelToCloud(): Promise<void> {
    const workspace = this.wheelConfigurator.activeWheel();
    if (!workspace) {
      this.setSaveFeedback('error', 'No wheel selected to save.');
      return;
    }

    this.clearFeedbackTimeout();
    this.cloudSaveState.set('saving');
    this.cloudSaveMessage.set('');

    try {
      const rootWorkspaceId = this.wheelConfigurator.getWorkspaceRootId(workspace.id);
      const displayConfigs = await this.wheelConfigurator.loadWheelGroupDisplayConfigs(rootWorkspaceId);
      if (!displayConfigs.length) {
        this.setSaveFeedback('error', 'Wheel configuration not found. Try again.');
        return;
      }

      const isUpdate = !!workspace.cloudConfigId;
      const cloudConfigId = await this.wheelCloudRepository.upsertWheel({
        workspace,
        displayConfigs,
        cloudConfigId: workspace.cloudConfigId,
      });

      this.wheelConfigurator.setGroupCloudConfigId(rootWorkspaceId, cloudConfigId);
      this.setSaveFeedback('success', isUpdate ? 'Wheel updated in cloud.' : 'Wheel saved to cloud.');
    } catch (error) {
      const message =
        error instanceof Error && error.message === 'AUTH_REQUIRED'
          ? 'Sign in to save the wheel to cloud.'
          : 'Cloud save failed. Try again.';
      this.setSaveFeedback('error', message);
    }
  }

  private setSaveFeedback(state: 'success' | 'error', message: string): void {
    this.clearFeedbackTimeout();
    this.cloudSaveState.set(state);
    this.cloudSaveMessage.set(message);

    this.feedbackTimeout = setTimeout(
      () => {
        this.feedbackTimeout = null;
        this.cloudSaveState.set('idle');
        this.cloudSaveMessage.set('');
      },
      state === 'error' ? 5000 : 2500
    );
  }

  private clearFeedbackTimeout(): void {
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = null;
    }
  }
}
