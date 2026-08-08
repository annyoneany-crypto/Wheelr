import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { NativePlatformService } from '../../services/native-platform.service';
import { WheelCloudRepository } from '../../services/wheel-cloud-repository.service';

type PanelMode = 'idle' | 'confirm-delete' | 'deleting';

@Component({
  selector: 'wl-user-info',
  templateUrl: './info-utente.html',
  styleUrl: './info-utente.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WlInfoUtente {
  // Account deletion is self-contained here rather than lifted into the header:
  // it owns several steps of state (confirm, password, in-flight, error) that the
  // header has no other reason to know about.
  private readonly authService = inject(AuthService);
  private readonly cloudRepository = inject(WheelCloudRepository);
  private readonly nativePlatform = inject(NativePlatformService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isOpen = input(false);
  readonly email = input('');

  readonly closeRequested = output<void>();
  readonly logoutRequested = output<void>();
  readonly accountDeleted = output<void>();

  protected readonly mode = signal<PanelMode>('idle');
  protected readonly password = signal('');
  protected readonly errorMessage = signal<string | null>(null);

  /** Drives the confirm step: email/password accounts must retype their password. */
  protected readonly signInProvider = this.authService.signInProvider;

  constructor() {
    // Reopening the panel should never resume a half-finished delete.
    effect(() => {
      if (!this.isOpen()) {
        this.resetDeleteState();
      }
    });

    this.destroyRef.onDestroy(
      this.nativePlatform.registerBackHandler(() => this.dismissConfirmStep()),
    );
  }

  closePanel(): void {
    this.closeRequested.emit();
  }

  requestLogout(): void {
    this.logoutRequested.emit();
  }

  protected startDelete(): void {
    this.errorMessage.set(null);
    this.password.set('');
    this.mode.set('confirm-delete');
  }

  protected cancelDelete(): void {
    this.resetDeleteState();
  }

  protected onPasswordInput(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  /**
   * Order matters: verify the user first, then wipe the cloud wheels, then drop
   * the account. Deleting the account first would leave the data orphaned and
   * unreachable, since the security rules only let its owner touch it.
   */
  protected async confirmDelete(): Promise<void> {
    if (this.mode() === 'deleting') {
      return;
    }

    this.mode.set('deleting');
    this.errorMessage.set(null);

    try {
      await this.authService.reauthenticate(this.password() || undefined);
      await this.cloudRepository.deleteAllCurrentUserWheels();
      await this.authService.deleteAccount();

      this.resetDeleteState();
      this.accountDeleted.emit();
    } catch (error) {
      this.errorMessage.set(this.mapDeleteError(error));
      this.mode.set('confirm-delete');
    }
  }

  /** Returns true when the Android back press closed the confirmation step. */
  private dismissConfirmStep(): boolean {
    // Never abandon the UI mid-delete: the account may already be gone.
    if (this.mode() !== 'confirm-delete') {
      return false;
    }

    this.resetDeleteState();
    return true;
  }

  private resetDeleteState(): void {
    this.mode.set('idle');
    this.password.set('');
    this.errorMessage.set(null);
  }

  private mapDeleteError(error: unknown): string {
    const code = this.errorCode(error);

    if (code === 'PASSWORD_REQUIRED') {
      return 'Enter your password to confirm.';
    }

    if (
      code === 'auth/wrong-password' ||
      code === 'auth/invalid-credential' ||
      code === 'auth/invalid-login-credentials'
    ) {
      return 'That password is not correct.';
    }

    if (
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/user-cancelled'
    ) {
      return 'Verification was canceled, so nothing was deleted.';
    }

    if (code === 'auth/too-many-requests') {
      return 'Too many attempts. Wait a few minutes and try again.';
    }

    if (code === 'auth/network-request-failed') {
      return 'No connection. Check your network and try again.';
    }

    return 'The account could not be deleted. Please try again.';
  }

  private errorCode(error: unknown): string {
    if (error instanceof Error && 'code' in error && typeof error.code === 'string') {
      return error.code;
    }

    return error instanceof Error ? error.message : '';
  }
}
