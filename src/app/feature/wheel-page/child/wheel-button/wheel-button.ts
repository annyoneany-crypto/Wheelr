import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';

export type WheelPanelPath = 'users' | 'color-settings' | 'sound' | 'wheel-manager';

@Component({
  selector: 'wl-wheel-button',
  imports: [RouterModule],
  templateUrl: './wheel-button.html',
  styleUrl: './wheel-button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WheelButton {
  uiChromeHidden = input(false);
  showPanelSettings = input(false);
  activePanel = input('');
  displyPanel = input(true);
  panelTitle = input('Settings');
  uiChromeToggleAriaLabel = input('Hide header, footer and controls');
  canShowQrButton = input(false);
  qrModalOpen = input(false);

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
}