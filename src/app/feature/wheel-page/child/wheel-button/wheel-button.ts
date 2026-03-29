import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

export type WheelPanelPath = 'users' | 'color-settings' | 'effects' | 'sound' | 'wheel-manager';

@Component({
  selector: 'wl-wheel-button',
  imports: [RouterModule],
  templateUrl: './wheel-button.html',
  styleUrl: './wheel-button.css',
  host: {
    '(window:resize)': 'onWindowResize()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WheelButton {
  private readonly mobileBreakpoint = 1024;

  uiChromeHidden = input(false);
  showPanelSettings = input(false);
  activePanel = input('');
  displyPanel = input(true);
  panelTitle = input('Settings');
  uiChromeToggleAriaLabel = input('Hide header, footer and controls');
  canShowQrButton = input(false);
  qrModalOpen = input(false);
  readonly mobileActionsExpanded = signal(false);
  readonly isMobileViewport = signal(this.readIsMobileViewport());
  readonly isMobileActionMenuCollapsed = computed(() => this.isMobileViewport() && !this.mobileActionsExpanded());
  readonly mobileMenuAriaLabel = computed(() => this.mobileActionsExpanded() ? 'Close quick actions menu' : 'Open quick actions menu');

  togglePanelRequested = output<WheelPanelPath>();
  closePanelRequested = output<void>();
  usersButtonTransitionEnd = output<void>();
  uiChromeToggleRequested = output<void>();
  openQrRequested = output<void>();

  requestTogglePanel(path: WheelPanelPath): void {
    this.togglePanelRequested.emit(path);
  }

  requestClosePanel(): void {
    this.closePanelRequested.emit();
  }

  requestUsersButtonTransitionEnd(): void {
    this.usersButtonTransitionEnd.emit();
  }

  requestUiChromeToggle(): void {
    this.uiChromeToggleRequested.emit();
  }

  requestOpenQr(): void {
    this.openQrRequested.emit();
  }

  toggleMobileActions(): void {
    if (!this.isMobileViewport()) {
      return;
    }
    this.mobileActionsExpanded.update((expanded) => !expanded);
  }

  onWindowResize(): void {
    const isMobileViewport = this.readIsMobileViewport();
    this.isMobileViewport.set(isMobileViewport);
    if (!isMobileViewport) {
      this.mobileActionsExpanded.set(false);
    }
  }

  isPanelActive(path: WheelPanelPath): boolean {
    return this.showPanelSettings() && this.activePanel() === path;
  }

  private readIsMobileViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < this.mobileBreakpoint;
  }
}