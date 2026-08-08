import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { FirebaseError } from 'firebase/app';

@Component({
  selector: 'wl-auth',
  imports: [ReactiveFormsModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WlAuth {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly authService = inject(AuthService);

  readonly isOpen = input(false);
  readonly closeRequested = output<void>();
  readonly authenticated = output<void>();

  isRegisterMode = signal(false);
  isAuthSubmitLoading = signal(false);
  authError = signal('');

  authForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: [''],
  });

  closeModal(): void {
    this.isRegisterMode.set(false);
    this.isAuthSubmitLoading.set(false);
    this.authError.set('');
    this.authForm.reset({ email: '', password: '', confirmPassword: '' });
    this.closeRequested.emit();
  }

  toggleAuthMode(): void {
    this.isRegisterMode.update((value) => !value);
    this.authError.set('');
  }

  async submitWithEmailAndPassword(): Promise<void> {
    if (this.authForm.invalid || this.isAuthSubmitLoading()) {
      this.authForm.markAllAsTouched();
      if (!this.isAuthSubmitLoading()) {
        this.authError.set(
          this.isRegisterMode()
            ? 'Fill in email, password, and confirm password to sign up.'
            : 'Fill in email and password to sign in.'
        );
      }
      return;
    }

    if (!this.authService.isConfigured()) {
      this.authError.set('Configure NG_APP_FIREBASE_* variables in the .env file to enable sign-in.');
      return;
    }

    this.isAuthSubmitLoading.set(true);
    this.authError.set('');

    try {
      const { email, password, confirmPassword } = this.authForm.getRawValue();

      if (this.isRegisterMode()) {
        if (!confirmPassword) {
          this.authError.set('Confirm your password to create your profile.');
          this.isAuthSubmitLoading.set(false);
          return;
        }

        if (password !== confirmPassword) {
          this.authError.set('Passwords do not match.');
          this.isAuthSubmitLoading.set(false);
          return;
        }
      }

      if (this.isRegisterMode()) {
        await this.authService.registerWithEmailAndPassword(email, password);
      } else {
        await this.authService.loginWithEmailAndPassword(email, password);
      }
      this.authenticated.emit();
      this.closeModal();
    } catch (error) {
      this.authError.set(this.mapAuthErrorToMessage(error));
      this.isAuthSubmitLoading.set(false);
    }
  }

  async loginWithGoogle(): Promise<void> {
    if (this.isAuthSubmitLoading()) {
      return;
    }

    if (!this.authService.isConfigured()) {
      this.authError.set('Configure Firebase in firebase-auth.config.ts to enable sign-in.');
      return;
    }

    this.isAuthSubmitLoading.set(true);
    this.authError.set('');

    try {
      await this.authService.loginWithGoogle();
      this.authenticated.emit();
      this.closeModal();
    } catch (error) {
      this.authError.set(this.mapAuthErrorToMessage(error));
      this.isAuthSubmitLoading.set(false);
    }
  }

  private mapAuthErrorToMessage(error: unknown): string {
    if (!(error instanceof FirebaseError)) {
      const nativeMessage = this.mapNativeGoogleErrorToMessage(error);
      if (nativeMessage) {
        return nativeMessage;
      }

      return this.isRegisterMode()
        ? 'Registration failed. Please try again shortly.'
        : 'Authentication failed. Please try again shortly.';
    }

    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'This email is already registered.';
      case 'auth/invalid-email':
        return 'Invalid email.';
      case 'auth/weak-password':
        return 'Password is too weak. Use at least 6 characters.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password.';
      case 'auth/popup-closed-by-user':
        return 'Google sign-in was canceled.';
      case 'auth/popup-blocked':
        return 'Popup blocked by browser. Enable popups and try again.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Try again in a few minutes.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.';
      default:
        return this.isRegisterMode()
          ? 'Registration failed. Check your details and try again.'
          : 'Authentication failed. Check your details and try again.';
    }
  }

  /**
   * The Android sign-in sheet reports through Credential Manager, not Firebase, so
   * these arrive as plain Errors and used to collapse into a generic "try again"
   * that hid the two things the user can actually fix.
   * Returns null when the error is not one of them.
   */
  private mapNativeGoogleErrorToMessage(error: unknown): string | null {
    const message = error instanceof Error ? error.message : '';

    if (message.includes('NoCredentialException') || message.includes('No credentials available')) {
      return 'No Google account on this device. Add one in Android settings, then try again.';
    }

    if (message.includes('GetCredentialCancellationException') || message.includes('activity is cancelled')) {
      return 'Google sign-in was canceled.';
    }

    // 10 is Play Services' DEVELOPER_ERROR: the app signature is not registered
    // against the Firebase project, so no ID token is ever issued.
    if (message.includes('10:') || message.includes('DEVELOPER_ERROR')) {
      return 'This app build is not authorized for Google sign-in. Register its signing fingerprint in Firebase.';
    }

    return null;
  }
}
