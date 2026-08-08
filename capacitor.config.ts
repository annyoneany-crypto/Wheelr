import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'xyz.wheelr.app',
  appName: 'Wheelr',
  webDir: 'dist/wheelr/browser',
  android: {
    // The wheel canvas and the winner effects are the whole point of the app:
    // keep the WebView opaque so there is no compositing cost behind it.
    backgroundColor: '#111113'
  },
  plugins: {
    FirebaseAuthentication: {
      // The rest of the app (AuthService, Firestore sync) runs on the Firebase JS
      // SDK. skipNativeAuth makes the plugin hand back a credential instead of
      // opening its own native session, so we can feed it to signInWithCredential
      // and keep a single source of truth for the user.
      skipNativeAuth: true,
      providers: ['google.com']
    },
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#111113',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#111113',
      overlaysWebView: false
    },
    Keyboard: {
      resize: 'body'
    }
  }
};

export default config;
