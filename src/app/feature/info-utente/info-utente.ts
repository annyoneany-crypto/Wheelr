import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'wl-user-info',
  templateUrl: './info-utente.html',
  styleUrl: './info-utente.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WlInfoUtente {
  readonly isOpen = input(false);
  readonly email = input('');

  readonly closeRequested = output<void>();
  readonly logoutRequested = output<void>();

  closePanel(): void {
    this.closeRequested.emit();
  }

  requestLogout(): void {
    this.logoutRequested.emit();
  }
}
