import { afterNextRender, computed, Injectable, inject, signal } from '@angular/core';
import type { Auth, User } from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  FirebaseAuthBundle,
  hasPersistedFirebaseSession,
  isFirebaseConfigured,
  loadFirebaseAuth,
} from './firebase-lazy';
import { NativePlatformService } from './native-platform.service';

export type SignInProvider = 'google' | 'password' | 'unknown';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly nativePlatform = inject(NativePlatformService);

  /** Set once the SDK has been downloaded; null until then. */
  private bundle: FirebaseAuthBundle | null = null;
  private bundleLoad: Promise<FirebaseAuthBundle | null> | null = null;
  private watchingAuthState = false;

  private readonly userSignal = signal<User | null>(null);
  private readonly loadingSignal = signal(true);

  readonly user = this.userSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.userSignal() !== null);
  readonly email = computed(() => this.userSignal()?.email ?? '');
  readonly isConfigured = computed(() => isFirebaseConfigured());

  /**
   * Which credential the current session was created with. Account deletion has
   * to re-verify the user, and how that is done differs per provider.
   */
  readonly signInProvider = computed<SignInProvider>(() => {
    const providerId = this.userSignal()?.providerData[0]?.providerId ?? '';

    if (providerId === 'google.com') {
      return 'google';
    }

    return providerId === 'password' ? 'password' : 'unknown';
  });

  constructor() {
    // Restoring the session needs the SDK, but nothing on screen does — so the
    // download waits until after the first paint instead of competing with it,
    // and is skipped entirely for the visitors who have no session to restore.
    afterNextRender(() => void this.restoreSession());
  }

  /**
   * Startup path: only reaches for the SDK when this browser might actually hold
   * a session. `loading` is what the header disables its button on, so it has to
   * be cleared on every branch that decides not to load.
   */
  private async restoreSession(): Promise<void> {
    if (!isFirebaseConfigured() || !(await hasPersistedFirebaseSession())) {
      this.loadingSignal.set(false);
      return;
    }

    await this.ensureAuth();
  }

  async loginWithGoogle(): Promise<void> {
    const firebase = await this.ensureAuth();
    if (!firebase) {
      return;
    }

    if (this.nativePlatform.isNative) {
      await this.loginWithGoogleNatively(firebase);
      return;
    }

    await firebase.api.signInWithPopup(firebase.auth, new firebase.api.GoogleAuthProvider());
  }

  /**
   * signInWithPopup needs a browser popup, which the Android WebView has no way to
   * open. The Capacitor plugin runs Google's native sign-in sheet instead and hands
   * back an ID token; feeding that to the JS SDK keeps `user` and every Firestore
   * call on the same session the web build uses.
   */
  private async loginWithGoogleNatively({ auth, api }: FirebaseAuthBundle): Promise<void> {
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result.credential?.idToken;

    if (!idToken) {
      throw new Error('Google sign-in returned no ID token.');
    }

    await api.signInWithCredential(auth, api.GoogleAuthProvider.credential(idToken));
  }

  async loginWithEmailAndPassword(email: string, password: string): Promise<void> {
    const firebase = await this.ensureAuth();
    if (!firebase) {
      return;
    }

    await firebase.api.signInWithEmailAndPassword(firebase.auth, email, password);
  }

  async registerWithEmailAndPassword(email: string, password: string): Promise<void> {
    const firebase = await this.ensureAuth();
    if (!firebase) {
      return;
    }

    await firebase.api.createUserWithEmailAndPassword(firebase.auth, email, password);
  }

  async logout(): Promise<void> {
    if (this.nativePlatform.isNative) {
      // Clears the cached Google account as well, so the next login shows the
      // account picker instead of silently reusing the previous one.
      await FirebaseAuthentication.signOut().catch(() => undefined);
    }

    // Never loaded means never signed in: there is no session to end.
    if (!this.bundle) {
      return;
    }

    await this.bundle.api.signOut(this.bundle.auth);
  }

  /**
   * Re-verifies the signed-in user before a destructive action.
   *
   * Firebase refuses to delete an account whose credential is more than a few
   * minutes old, so this is called up front rather than as error recovery — that
   * way the Firestore data is never wiped by a delete that then fails halfway.
   *
   * `password` is only required for email/password accounts.
   */
  async reauthenticate(password?: string): Promise<void> {
    const firebase = this.bundle;
    const user = this.userSignal();

    if (!firebase || !user) {
      throw new Error('AUTH_REQUIRED');
    }

    const { api } = firebase;

    if (this.signInProvider() === 'password') {
      const email = user.email ?? '';
      if (!email || !password) {
        throw new Error('PASSWORD_REQUIRED');
      }

      await api.reauthenticateWithCredential(user, api.EmailAuthProvider.credential(email, password));
      return;
    }

    if (this.nativePlatform.isNative) {
      // Same reason as login: the WebView cannot open the popup Firebase wants.
      const result = await FirebaseAuthentication.signInWithGoogle();
      const idToken = result.credential?.idToken;

      if (!idToken) {
        throw new Error('Google re-authentication returned no ID token.');
      }

      await api.reauthenticateWithCredential(user, api.GoogleAuthProvider.credential(idToken));
      return;
    }

    await api.reauthenticateWithPopup(user, new api.GoogleAuthProvider());
  }

  /**
   * Deletes the Firebase Auth user. Cloud content must already be gone — once the
   * account is deleted the security rules reject any further write.
   */
  async deleteAccount(): Promise<void> {
    const firebase = this.bundle;
    const user = this.userSignal();

    if (!firebase || !user) {
      throw new Error('AUTH_REQUIRED');
    }

    await firebase.api.deleteUser(user);

    if (this.nativePlatform.isNative) {
      // Drops the cached Google account so a later sign-in shows the picker.
      await FirebaseAuthentication.signOut().catch(() => undefined);
    }
  }

  /**
   * Downloads and initialises Auth on first use, then hands back the same bundle.
   * Resolves to null when Firebase is not configured or the chunk failed to load,
   * which every caller treats as "cloud features unavailable" rather than an error.
   */
  private ensureAuth(): Promise<FirebaseAuthBundle | null> {
    if (this.bundle) {
      return Promise.resolve(this.bundle);
    }

    if (!isFirebaseConfigured()) {
      console.warn('Firebase Auth is not configured. Fill firebase-auth.config.ts first.');
      this.loadingSignal.set(false);
      return Promise.resolve(null);
    }

    this.bundleLoad ??= loadFirebaseAuth()
      .then((bundle) => {
        this.bundle = bundle;
        this.watchAuthState(bundle);
        return bundle;
      })
      .catch((error: unknown) => {
        console.error('Could not load Firebase Auth:', error);
        this.loadingSignal.set(false);
        // Dropped so a later sign-in attempt retries instead of failing forever.
        this.bundleLoad = null;
        return null;
      });

    return this.bundleLoad;
  }

  private watchAuthState({ auth, api }: FirebaseAuthBundle): void {
    if (this.watchingAuthState) {
      return;
    }

    this.watchingAuthState = true;

    api.onAuthStateChanged(
      auth,
      (user: User | null) => {
        this.userSignal.set(user);
        this.loadingSignal.set(false);
      },
      () => {
        this.userSignal.set(null);
        this.loadingSignal.set(false);
      }
    );
  }
}

/** Re-exported so callers can keep typing against the SDK without importing it. */
export type { Auth, User };
