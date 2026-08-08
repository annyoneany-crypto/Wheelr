import { bootstrapApplication } from '@angular/platform-browser';
import { Capacitor } from '@capacitor/core';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { inject } from '@vercel/analytics';

// Vercel Analytics measures wheelr.xyz traffic. Inside the Android shell the page
// is served from the local WebView, so the beacons would only burn the user's
// data on requests that never resolve to a real pageview.
if (!Capacitor.isNativePlatform()) {
  inject();
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
