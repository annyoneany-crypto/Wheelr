import {
  Component,
  DestroyRef,
  LOCALE_ID,
  computed,
  effect,
  inject,
  signal,
  untracked,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { NavigationEnd, PRIMARY_OUTLET, Router, RouterLink } from '@angular/router';
import { WheelConfigurator } from '../../services/wheel-configurator.service';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { WheelCloudRepository } from '../../services/wheel-cloud-repository.service';
import { WheelCloudSync } from '../../services/wheel-cloud-sync.service';
import { NativePlatformService } from '../../services/native-platform.service';
import { WlAuth } from '../auth/auth';
import { WlCreateWheel } from '../create-wheel/create-wheel';
import { WlInfoUtente } from '../info-utente/info-utente';
import { SITE_LOCALES, SiteLocale, localizedPath, resolveLocale } from '../../services/i18n.config';

type CloudSaveState = 'idle' | 'saving' | 'success' | 'error';

@Component({
  selector: 'wl-header',
  imports: [RouterLink, NgOptimizedImage, WlAuth, WlCreateWheel, WlInfoUtente],
  templateUrl: './header.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './header.css',
})
export class Header {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly wheelCloudRepository = inject(WheelCloudRepository);
  // Injected for its side effect: it starts the auto-sync as soon as a session exists.
  private readonly wheelCloudSync = inject(WheelCloudSync);
  private readonly nativePlatform = inject(NativePlatformService);
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
  showSelectedWheelBadge = computed(
    () => this.isWheelRoute() && !!this.wheelConfigurator.activeWheelId()
  );
  isAuthModalOpen = signal(false);
  isUserPanelOpen = signal(false);
  isCreateWheelModalOpen = signal(false);

  protected readonly locales = SITE_LOCALES;
  /** Baked in at compile time: each locale is its own bundle. */
  protected readonly currentLocale = resolveLocale(inject(LOCALE_ID));
  isLangMenuOpen = signal(false);

  cloudSaveState = signal<CloudSaveState>('idle');
  cloudSaveMessage = signal('');
  canSaveWheel = computed(() => this.isWheelRoute() && !!this.wheelConfigurator.activeWheelId());

  // A manual save takes the toast over the background sync when both have something to say.
  cloudNotice = computed(() => {
    const saveMessage = this.cloudSaveMessage();
    if (saveMessage) {
      return { text: saveMessage, isError: this.cloudSaveState() === 'error' };
    }

    const syncMessage = this.wheelCloudSync.message();
    return syncMessage
      ? { text: syncMessage, isError: this.wheelCloudSync.state() === 'error' }
      : null;
  });

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
      untracked(() => void this.saveAfterLoginSync());
    });

    this.destroyRef.onDestroy(() => this.clearFeedbackTimeout());
    this.destroyRef.onDestroy(
      this.nativePlatform.registerBackHandler(() => this.dismissTopOverlay())
    );

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.currentUrl.set(this.router.url);
      });
  }

  /**
   * Android back closes whatever the header has open, innermost first: the modals
   * are stacked over the nav menu, so they have to be checked before it.
   */
  private dismissTopOverlay(): boolean {
    if (this.isCreateWheelModalOpen()) {
      this.closeCreateWheelModal();
      return true;
    }

    if (this.isAuthModalOpen()) {
      this.closeAuthModal();
      return true;
    }

    if (this.isUserPanelOpen()) {
      this.closeUserPanel();
      return true;
    }

    if (this.isLangMenuOpen()) {
      this.closeLangMenu();
      return true;
    }

    if (this.isMenuOpen()) {
      this.closeMenu();
      return true;
    }

    return false;
  }

  toggleMenu(): void {
    this.isMenuOpen.update((current) => !current);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  toggleLangMenu(): void {
    this.isLangMenuOpen.update((current) => !current);
  }

  closeLangMenu(): void {
    this.isLangMenuOpen.set(false);
  }

  /**
   * The same page in another language — a real `href`, never a `routerLink`:
   * every locale is a separate bundle served from its own `<base href>`, so the
   * switch has to be a document load rather than an in-app navigation. The
   * router URL carries no locale prefix, so the current path transfers as is.
   */
  localeHref(locale: SiteLocale): string {
    const primary = this.router.parseUrl(this.currentUrl()).root.children[PRIMARY_OUTLET];
    const path = primary ? primary.segments.map((segment) => segment.path).join('/') : '';

    return localizedPath(locale, path);
  }

  languageAriaLabel(locale: SiteLocale): string {
    return $localize`:@@header.lang.switchTo:Switch to ${locale.label}:LANGUAGE:`;
  }

  namesCountTitle(): string {
    return $localize`:@@header.namesCount.title:${this.wheelConfigurator.namesCount()}:COUNT: names on the wheel`;
  }

  /** Shares its message ids with the wheel page, which offers the same action. */
  renameAriaLabel(): string {
    return this.showIndependentPreview()
      ? $localize`:@@wheelPage.rename.multiple:Rename visible wheels`
      : $localize`:@@wheelPage.rename.single:Rename selected wheel`;
  }

  requestRenameModal(): void {
    this.wheelConfigurator.requestRenameModalOpen();
  }

  authButtonAriaLabel(): string {
    return this.authService.isLoggedIn() ? $localize`:@@header.auth.openAccount:Open account panel` : $localize`:@@header.auth.openLogin:Open login modal`;
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

  /**
   * The panel has already deleted the account and its cloud wheels; deleteUser
   * ends the session on its own, so there is nothing left to sign out of.
   */
  onAccountDeleted(): void {
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

  openCreateWheelModal(): void {
    this.isCreateWheelModalOpen.set(true);
  }

  closeCreateWheelModal(): void {
    this.isCreateWheelModalOpen.set(false);
  }

  saveButtonAriaLabel(): string {
    switch (this.cloudSaveState()) {
      case 'saving':
        return $localize`:@@header.save.saving:Saving wheel to cloud`;
      case 'success':
        return $localize`:@@header.save.saved:Wheel saved to cloud`;
      case 'error':
        return $localize`:@@header.save.failed:Wheel save failed, retry`;
      default:
        return this.wheelConfigurator.activeWheel()?.cloudConfigId
          ? $localize`:@@header.save.update:Update saved wheel in cloud`
          : $localize`:@@header.save.toCloud:Save wheel to cloud`;
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

  /**
   * Logging in also triggers the cloud download, which rewrites workspace storage.
   * Waiting for it keeps the upload from racing a merge on the very wheel being saved.
   */
  private async saveAfterLoginSync(): Promise<void> {
    this.cloudSaveState.set('saving');

    try {
      await this.wheelCloudSync.syncFromCloud();
    } catch {
      // A failed download must not block the save the user explicitly asked for.
    }

    await this.saveActiveWheelToCloud();
  }

  private async saveActiveWheelToCloud(): Promise<void> {
    const workspace = this.wheelConfigurator.activeWheel();
    if (!workspace) {
      this.setSaveFeedback('error', $localize`:@@header.save.noWheel:No wheel selected to save.`);
      return;
    }

    this.clearFeedbackTimeout();
    this.cloudSaveState.set('saving');
    this.cloudSaveMessage.set('');

    try {
      const rootWorkspaceId = this.wheelConfigurator.getWorkspaceRootId(workspace.id);
      const displayConfigs = await this.wheelConfigurator.loadWheelGroupDisplayConfigs(
        rootWorkspaceId
      );
      if (!displayConfigs.length) {
        this.setSaveFeedback('error', $localize`:@@header.save.notFound:Wheel configuration not found. Try again.`);
        return;
      }

      const isUpdate = !!workspace.cloudConfigId;
      const cloudConfigId = await this.wheelCloudRepository.upsertWheel({
        workspace,
        displayConfigs,
        cloudConfigId: workspace.cloudConfigId,
      });

      this.wheelConfigurator.setGroupCloudConfigId(rootWorkspaceId, cloudConfigId);
      this.setSaveFeedback(
        'success',
        isUpdate ? $localize`:@@header.save.updatedMsg:Wheel updated in cloud.` : $localize`:@@header.save.savedMsg:Wheel saved to cloud.`
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message === 'AUTH_REQUIRED'
          ? $localize`:@@header.save.signIn:Sign in to save the wheel to cloud.`
          : $localize`:@@header.save.error:Cloud save failed. Try again.`;
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
