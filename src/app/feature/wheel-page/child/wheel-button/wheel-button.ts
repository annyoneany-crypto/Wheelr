import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';

export type WheelPanelPath = 'users' | 'color-settings' | 'effects' | 'sound' | 'wheel-manager';

export interface WheelPanelAction {
  path: WheelPanelPath;
  icon: string;
  ariaLabel: string;
  /** Short caption, shown under the icon in the mobile bottom bar only. */
  caption: string;
}

@Component({
  selector: 'wl-wheel-button',
  imports: [RouterModule],
  templateUrl: './wheel-button.html',
  styleUrl: './wheel-button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WheelButton {
  private readonly mobileBreakpoint = 1024;

  /**
   * Single source for both layouts: the desktop rail stacks these vertically,
   * the mobile bar lays them out horizontally after Home. Order is the tab order
   * the design calls for — Home, users, colors, sound, effects, wheels.
   */
  readonly panelActions: readonly WheelPanelAction[] = [
    { path: 'users', icon: 'fa-user-plus', ariaLabel: 'Open users panel', caption: 'Names' },
    { path: 'color-settings', icon: 'fa-swatchbook', ariaLabel: 'Open color settings panel', caption: 'Colors' },
    { path: 'sound', icon: 'fa-volume-high', ariaLabel: 'Open sound panel', caption: 'Sound' },
    { path: 'effects', icon: 'fa-wand-magic-sparkles', ariaLabel: 'Open effects panel', caption: 'Effects' },
    { path: 'wheel-manager', icon: 'fa-layer-group', ariaLabel: 'Open wheel manager panel', caption: 'Wheels' }
  ];

  uiChromeHidden = input(false);
  showPanelSettings = input(false);
  activePanel = input('');
  displyPanel = input(true);
  panelTitle = input('Settings');
  uiChromeToggleAriaLabel = input('Hide header, footer and controls');
  canShowQrButton = input(false);
  qrModalOpen = input(false);

  /** With no panel open the wheel itself is what you are looking at, so Home is the current tab. */
  readonly isHomeActive = computed(() => !this.showPanelSettings());

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

  isPanelActive(path: WheelPanelPath): boolean {
    return this.showPanelSettings() && this.activePanel() === path;
  }

  /**
   * The drawer's show/hide is timed off the users button's own CSS transition,
   * so only that button forwards the event.
   */
  onActionTransitionEnd(action: WheelPanelAction): void {
    if (action.path !== 'users') {
      return;
    }

    this.requestUsersButtonTransitionEnd();
  }

  /**
   * Vertical position of a rail button, in rem. The rail is a 4rem grid starting
   * below the header; the UI-chrome toggle and the QR button continue the same
   * stack, hence `panelActions.length` and `+ 1` below.
   */
  desktopTopRem(index: number): number {
    return 7 + index * 4;
  }

  get uiChromeToggleTopRem(): number {
    return this.desktopTopRem(this.panelActions.length);
  }

  get qrButtonTopRem(): number {
    return this.desktopTopRem(this.panelActions.length + 1);
  }
}