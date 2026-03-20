import { computed, Injectable, signal } from '@angular/core';
import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  User,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { firebaseAuthConfig } from './firebase-auth.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth | null = null;
  private readonly provider = new GoogleAuthProvider();
  private readonly firebaseConfig: FirebaseOptions = firebaseAuthConfig;

  private readonly userSignal = signal<User | null>(null);
  private readonly loadingSignal = signal(true);

  readonly user = this.userSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.userSignal() !== null);
  readonly email = computed(() => this.userSignal()?.email ?? '');
  readonly isConfigured = computed(() => this.hasValidConfig());

  constructor() {
    this.initializeAuth();
  }

  async loginWithGoogle(): Promise<void> {
    if (!this.auth) {
      this.initializeAuth();
    }

    if (!this.auth) {
      console.warn('Firebase Auth is not configured. Fill firebase-auth.config.ts first.');
      return;
    }

    await signInWithPopup(this.auth, this.provider);
  }

  async loginWithEmailAndPassword(email: string, password: string): Promise<void> {
    if (!this.auth) {
      this.initializeAuth();
    }

    if (!this.auth) {
      console.warn('Firebase Auth is not configured. Fill firebase-auth.config.ts first.');
      return;
    }

    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async registerWithEmailAndPassword(email: string, password: string): Promise<void> {
    if (!this.auth) {
      this.initializeAuth();
    }

    if (!this.auth) {
      console.warn('Firebase Auth is not configured. Fill firebase-auth.config.ts first.');
      return;
    }

    await createUserWithEmailAndPassword(this.auth, email, password);
  }

  async logout(): Promise<void> {
    if (!this.auth) {
      return;
    }

    await signOut(this.auth);
  }

  private initializeAuth(): void {
    if (!this.hasValidConfig()) {
      this.loadingSignal.set(false);
      return;
    }

    if (this.auth) {
      return;
    }

    const app = this.resolveApp();
    this.auth = getAuth(app);

    onAuthStateChanged(
      this.auth,
      (user) => {
        this.userSignal.set(user);
        this.loadingSignal.set(false);
      },
      () => {
        this.userSignal.set(null);
        this.loadingSignal.set(false);
      }
    );
  }

  private resolveApp(): FirebaseApp {
    return getApps().length ? getApp() : initializeApp(this.firebaseConfig);
  }

  private hasValidConfig(): boolean {
    return Boolean(
      this.firebaseConfig.apiKey &&
      this.firebaseConfig.authDomain &&
      this.firebaseConfig.projectId &&
      this.firebaseConfig.appId
    );
  }
}
