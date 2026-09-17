/**
 * Loads the Firebase SDK on demand instead of at bootstrap.
 *
 * Firestore and Auth together are roughly 365 kB of the bundle, and `Header`
 * injects the services that need them on every page — so before this module the
 * whole SDK was downloaded and parsed by every visitor, including the majority
 * who never sign in. Nothing here is imported statically: the `import()` calls
 * below are what split those two chunks out of the initial payload.
 *
 * Each loader is memoised on its promise rather than on its result, so parallel
 * callers share one download and one `initializeApp`.
 */
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { firebaseAuthConfig } from './firebase-auth.config';

export type FirebaseAuthApi = typeof import('firebase/auth');
export type FirestoreApi = typeof import('firebase/firestore');

/** The SDK namespace travels with the instance: callers need both to do anything. */
export interface FirebaseAuthBundle {
  auth: Auth;
  api: FirebaseAuthApi;
}

export interface FirestoreBundle {
  db: Firestore;
  api: FirestoreApi;
}

let appPromise: Promise<FirebaseApp> | null = null;
let authPromise: Promise<FirebaseAuthBundle> | null = null;
let firestorePromise: Promise<FirestoreBundle> | null = null;

/** False when `firebase-auth.config.ts` was never filled in; nothing cloud-backed works then. */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseAuthConfig.apiKey &&
    firebaseAuthConfig.authDomain &&
    firebaseAuthConfig.projectId &&
    firebaseAuthConfig.appId
  );
}

/**
 * Whether this browser could be holding a signed-in session.
 *
 * Restoring a session is the only reason to download Auth on a page the user is
 * just visiting, and most visitors never sign in — so the persistence the SDK
 * would read is checked *before* the SDK is fetched. The SDK keeps it in the
 * `firebaseLocalStorageDb` IndexedDB database, falling back to localStorage
 * where IndexedDB is unavailable.
 *
 * Every uncertain case answers true: a needless 30 kB download is a far smaller
 * problem than showing a signed-in user as signed out.
 */
export async function hasPersistedFirebaseSession(): Promise<boolean> {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      if (localStorage.key(i)?.startsWith('firebase:authUser:')) {
        return true;
      }
    }

    // Not in Firefox before 126, and absent in some WebViews.
    if (typeof indexedDB === 'undefined' || typeof indexedDB.databases !== 'function') {
      return true;
    }

    const databases = await indexedDB.databases();
    return databases.some((database) => database.name === 'firebaseLocalStorageDb');
  } catch {
    return true;
  }
}

function loadApp(): Promise<FirebaseApp> {
  appPromise ??= (async () => {
    const { getApp, getApps, initializeApp } = await import('firebase/app');

    // Auth and Firestore both reach for the app, and whichever gets there first
    // creates it — `getApps()` keeps the second one from initialising it twice.
    return getApps().length ? getApp() : initializeApp(firebaseAuthConfig);
  })();

  return appPromise;
}

export function loadFirebaseAuth(): Promise<FirebaseAuthBundle> {
  authPromise ??= (async () => {
    const [app, api] = await Promise.all([loadApp(), import('firebase/auth')]);

    return { auth: api.getAuth(app), api };
  })().catch((error: unknown) => {
    // A failed download must not poison every later attempt.
    authPromise = null;
    throw error;
  });

  return authPromise;
}

export function loadFirestore(): Promise<FirestoreBundle> {
  firestorePromise ??= (async () => {
    const [app, api] = await Promise.all([loadApp(), import('firebase/firestore')]);

    return { db: api.getFirestore(app), api };
  })().catch((error: unknown) => {
    firestorePromise = null;
    throw error;
  });

  return firestorePromise;
}
