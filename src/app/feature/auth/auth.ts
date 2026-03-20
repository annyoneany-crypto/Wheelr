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
            ? 'Compila email, password e conferma password per registrarti.'
            : 'Compila email e password per accedere.'
        );
      }
      return;
    }

    if (!this.authService.isConfigured()) {
      this.authError.set('Configura Firebase in firebase-auth.config.ts per abilitare il login.');
      return;
    }

    this.isAuthSubmitLoading.set(true);
    this.authError.set('');

    try {
      const { email, password, confirmPassword } = this.authForm.getRawValue();

      if (this.isRegisterMode()) {
        if (!confirmPassword) {
          this.authError.set('Conferma la password per creare il profilo.');
          this.isAuthSubmitLoading.set(false);
          return;
        }

        if (password !== confirmPassword) {
          this.authError.set('Le password non coincidono.');
          this.isAuthSubmitLoading.set(false);
          return;
        }
      }

      if (this.isRegisterMode()) {
        await this.authService.registerWithEmailAndPassword(email, password);
      } else {
        await this.authService.loginWithEmailAndPassword(email, password);
      }
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
      this.authError.set('Configura Firebase in firebase-auth.config.ts per abilitare il login.');
      return;
    }

    this.isAuthSubmitLoading.set(true);
    this.authError.set('');

    try {
      await this.authService.loginWithGoogle();
      this.closeModal();
    } catch (error) {
      this.authError.set(this.mapAuthErrorToMessage(error));
      this.isAuthSubmitLoading.set(false);
    }
  }

  private mapAuthErrorToMessage(error: unknown): string {
    if (!(error instanceof FirebaseError)) {
      return this.isRegisterMode()
        ? 'Registrazione non riuscita. Riprova tra poco.'
        : 'Autenticazione non riuscita. Riprova tra poco.';
    }

    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'Questa email e gia registrata.';
      case 'auth/invalid-email':
        return 'Email non valida.';
      case 'auth/weak-password':
        return 'Password troppo debole. Usa almeno 6 caratteri.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Email o password non corrette.';
      case 'auth/popup-closed-by-user':
        return 'Login Google annullato.';
      case 'auth/popup-blocked':
        return 'Popup bloccato dal browser. Abilita i popup e riprova.';
      case 'auth/too-many-requests':
        return 'Troppi tentativi. Riprova tra qualche minuto.';
      case 'auth/network-request-failed':
        return 'Errore di rete. Controlla la connessione e riprova.';
      default:
        return this.isRegisterMode()
          ? 'Registrazione non riuscita. Verifica i dati e riprova.'
          : 'Autenticazione non riuscita. Verifica i dati e riprova.';
    }
  }
}
