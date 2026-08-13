# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Wheelr — a free web app for creating and spinning customizable wheels (raffles, contests, promos). Angular 21 (standalone, zoneless, signals) + TypeScript, styled with Tailwind CSS v4, persisted locally (localStorage + IndexedDB) with optional Firebase cloud sync.

## Commands

```bash
npm start          # ng serve — dev server (development config) at http://localhost:4200
npm run build      # ng build — production build; THIS IS THE CORRECTNESS GATE (see Testing)
npm run watch      # ng build --watch (development config)
npm test           # ng test — vitest + jsdom, zoneless

npm run android:sync    # ng build + cap sync android — run after ANY web change
npm run android:build   # android:sync + gradlew assembleDebug -> app-debug.apk
npm run android:run     # android:sync + cap run android (device picker)
npm run android:open    # open the project in Android Studio
npm run android:assets  # regenerate launcher icons + splash from public/Logo.webp
npm run android:bundle  # ng build + cap sync + gradlew bundleRelease -> app-release.aab
```

Run a single test file: `npx ng test --include src/app/path/to/file.spec.ts` (or use vitest filtering). Specs live next to the code as `*.spec.ts`.

## Testing

`ng test` (vitest + jsdom) has **pre-existing, environmental** failures that are NOT regressions:
- Canvas components (e.g. `linear-wheel.spec`, `wheel.spec`): jsdom returns `null` from `canvas.getContext('2d')`, so canvas init throws.
- `app.spec`, `header.spec`, `users.spec`: fail on DI/router/Firebase test-bed setup.

**Use `ng build` as the reliable gate** — it type-checks the whole app under `strict` + `strictTemplates` and passes clean. Don't treat the ~6 known test failures as something you broke.

## Architecture

### Central state: `WheelConfigurator` service
`src/app/services/wheel-configurator.service.ts` is the heart of the app — a `providedIn: 'root'` singleton holding **all** wheel state as Angular signals (names, palette, colors, center logo/text, fonts, sounds, countdown, rotation, winner, pointer/effect types, multi-wheel layout). Components inject it rather than passing data around. Key patterns:

- **Persistence is reactive**: `setupPersistence()` registers `effect()`s that auto-write each signal to storage on change. Most setters also write through immediately. An `isHydratingWorkspace` guard prevents these effects from clobbering storage while loading a workspace.
- **Spin logic**: `spinWheel()` → optional `runCountdown()` → `performSpin()`. Winner is computed from final rotation angle after `spinDurationMs`. Spin uses crypto-backed `secureRandomInt` for the extra degrees. A captured `spinWorkspaceId` guards against declaring a winner if the user switched wheels mid-spin.
- **Idle rotation**: a `requestAnimationFrame` loop slowly rotates the wheel when not spinning / no winner.

### Workspaces ("wheels") and groups
A user can have multiple named wheels (workspaces), each with independent settings. Workspaces can be **grouped**: a root workspace plus up to `MAX_WHEELS_PER_GROUP` (4) children linked via `parentWheelId`. Multi-wheel preview (`visibleWheelCount`, 1–4) shows several wheels of a group at once on the page.
- `WheelWorkspaceMeta` is the registry entry; `getWorkspaceRootId` / `getWorkspaceGroupIds` resolve group membership.
- `loadWheelWorkspace(id)` switches the active wheel and calls `hydrateFromStorage()`.

### Storage layers (`global_function.ts` + `wheel-configurator-storage.ts`)
- **localStorage** (`readJson`/`writeJson`) for JSON settings, keyed `STORAGE_KEYS.<x>.<workspaceId>` (see `storageKey()`). Background color is shared across a group, not per-workspace.
- **IndexedDB** (`writeImage`/`readImage`, store `giveawayWheel`/`images`) for large blobs: background/center/wheel/slice images and audio data URLs.
- A **unified snapshot** (`giveawayWheel.settingsSnapshot.v1`, `WheelSettingsSnapshot`) mirrors all wheels' settings in one localStorage object.
- Multiple one-time **migrations** run on init (legacy flat keys → workspace-scoped keys → unified snapshot), each gated by a `*.v1` flag key. Be careful changing these.

### Cloud sync (`wheel-cloud-repository.service.ts` + `auth.service.ts`)
Optional Firebase (Firestore + Auth). Config in `firebase-auth.config.ts` (client-side keys, intentionally public). Wheels are stored under `users/{uid}/wheels/{cloudConfigId}` with a `WheelDisplayConfig[]` (one per group member). `getWheelDisplayConfigById` uses a `collectionGroup` query so public wheels are resolvable by `cloudConfigId` (or legacy `workspaceId`). Images are compressed to WebP before upload (`compressDisplayConfig`). `AuthService` exposes `user`/`isLoggedIn`/`email` signals.

### Account deletion (`info-utente`)
Play requires apps with sign-up to offer in-app account deletion, so the account panel owns that flow rather than the header.

Order is load-bearing: `reauthenticate()` → `deleteAllCurrentUserWheels()` → `deleteAccount()`. Firebase rejects `deleteUser` on a credential more than a few minutes old, so re-verification happens **up front** — doing it as error recovery would wipe the Firestore data and then fail, leaving an account with nothing in it. Deleting the auth user first is equally wrong: the security rules key off the caller's uid, so the wheels would be orphaned and unreachable. Re-auth branches per provider (`AuthService.signInProvider`) and, on native, uses the Capacitor plugin because the WebView cannot open Firebase's popup.

### Rendering
`shared/extraction-effect/wheel-renderer.ts` (`drawWheelCanvas`) is the single canvas drawing implementation shared by: the interactive `Wheel`, the multi-wheel previews on `WheelPage`, and the read-only `PublicWheel`. Three view modes exist: `'wheel'` | `'linear'` | `'cards'`. Winner effects (`fire`, `cartoon-fire`, `confetti`, `fireworks`, `applause`) live under `shared/winner-effect/`. Pointer/effect string unions are in `modules/classes/custom-type.ts`.

### Android app (Capacitor)
The same Angular bundle ships as a native Android app; `android/` is a checked-in Capacitor project (`appId` `xyz.wheelr.app`, `webDir` `dist/wheelr/browser`). There is **no separate mobile codebase** — the web build *is* the app, so `npm run android:sync` after every web change or the APK keeps serving stale assets.

- `NativePlatformService` (`services/native-platform.service.ts`) holds everything native: status bar styling, splash dismissal, and the Android back button. `isNative` is false on web and `initialize()` no-ops there.
- **Back button**: modals in this app are signals, not routes, so nothing would stop a back press from exiting. Components with an overlay register a handler via `registerBackHandler(() => boolean)` (returns an unregister fn — pass it to `destroyRef.onDestroy`); handlers are consulted newest-first, then `panel` outlet routes, then history, then exit. **Any new modal must register one.**
- **Offline**: FontAwesome and Inter are bundled through `src/styles.css` instead of CDNs. Icons must exist in FontAwesome *Free* (the old kit was Pro). The wheel fonts in the font-settings panel are still fetched from Google Fonts at runtime and stay online-only.
- The SEO footer in `index.html` is removed before first paint when `window.Capacitor.isNativePlatform()` — it exists only for crawlers.
- Native theming lives in `android/app/src/main/res/values/styles.xml`; `postSplashScreenTheme` must point at the dark `AppTheme.NoActionBar` or the status bar reverts to white.
- Icons/splash are generated from `public/Logo.webp` by `tools/generate-app-assets.mjs` into `assets/`, then rendered by `capacitor-assets`. Edit the logo, not the generated files.
- **Google sign-in** cannot use `signInWithPopup` in a WebView. `AuthService.loginWithGoogle()` branches on `isNative` and uses `@capacitor-firebase/authentication` with `skipNativeAuth: true`, feeding the returned ID token to `signInWithCredential` so the JS SDK stays the single session source. It needs `android/app/google-services.json` (Firebase console → Android app for `xyz.wheelr.app` + the signing SHA-1); the Gradle build stays green without it, but the plugin fails to load at runtime and Google login is unavailable.

### Ads (`ads.service.ts`, app only)
`@capacitor-community/admob` monetises the Android build; `AdsService.isEnabled` is false on web and every method short-circuits there, so the browser app is unchanged.

- **IDs** live in `services/admob.config.ts` and default to Google's *sample* units with `useTestAds: true`. The app ID is duplicated in `android/app/src/main/res/values/strings.xml` (`admob_app_id`) because the SDK reads it from the manifest at process start and **crashes the app if it is missing**. Swap both together before publishing.
- **Two placements**: a rewarded ad gates each template copy (`wheel-templates.ts`), and an interstitial fires every `SPINS_PER_INTERSTITIAL` (5) completed spins, counted in `performSpin` and delayed by `INTERSTITIAL_DELAY_AFTER_WINNER_MS` so it doesn't cover the winner reveal.
- **`showRewardVideoAd()` never settles when the user skips** — the plugin resolves it from `OnUserEarnedReward` only. So `showRewardedAd()` drives its result off the `Dismissed` event and treats `Rewarded` as the flag. Never plain-`await` that call.
- **Fail-open vs fail-closed**: a *skipped* ad keeps the template locked; an ad that could not *load* (`unavailable`) lets the user through, because the app is otherwise fully usable offline.
- **Consent (UMP) is retried, not latched.** A failed `requestConsentInfo` leaves `consentResolved` false so the next ad request tries again instead of killing ads for the whole session.
- Google's ad and consent endpoints must be reachable over untampered TLS. Behind an HTTPS-intercepting antivirus (see the truststore note in the build environment) the emulator gets `CertPathValidatorException`, consent fails, and **no ad will ever show** — test ad rendering on a real device off that network.

### Release build (Play Store)
`npm run android:bundle` produces `android/app/build/outputs/bundle/release/app-release.aab`.

- Signing reads `android/keystore.properties` (gitignored; see `keystore.properties.example`). Paths in it need **forward slashes**: `.properties` treats `\` as an escape.
- If that file is missing, `bundleRelease`/`assembleRelease` **fail at configuration time** with an explanatory message. Without that guard Gradle silently emits a valid but *unsigned* bundle, and the only feedback is Play rejecting the upload ("Tutti i bundle caricati devono essere firmati"). Debug builds are unaffected.
- Generate the upload keystore with `keytool -genkeypair -v -keystore <path>.jks -keyalg RSA -keysize 2048 -validity 10000 -alias wheelr-upload` (keytool ships in Android Studio's JBR).
- The keystore and `keystore.properties` must never be committed — `android/.gitignore` covers `*.jks`, `*.keystore` and `keystore.properties`. Losing the upload key means permanently losing the ability to ship updates.
- **The release build is signed with a different key than debug**, so its SHA-1 differs. Google sign-in silently breaks in production until the release SHA-1 *and* the Play App Signing SHA-1 (Play Console → Setup → App signing) are both added to the Firebase Android app and `google-services.json` is re-downloaded.
- Bump `versionCode` (integer, must increase every upload) and `versionName` in `android/app/build.gradle` before each release.
- **R8 is on** (`minifyEnabled` + `shrinkResources`, with `proguard-android-optimize.txt`); it cuts the build by roughly a quarter. The keep rules the Capacitor bridge needs ship as *consumer* rules inside `@capacitor/android`, so `android/app/proguard-rules.pro` only carries the app-specific remainder — read its header before changing anything there. `@capacitor-firebase/authentication` references the Facebook SDK for a provider we don't enable, hence the `-dontwarn com.facebook.**` block.
- A plugin stripped by R8 fails **at runtime, not at build time**. After touching R8 config or adding a plugin, smoke-test on a device and confirm logcat still shows `Registering plugin instance:` for all of them. Quickest way without a release keystore: temporarily copy the release `minifyEnabled`/`proguardFiles` lines into a `debug { }` block, `assembleDebug`, test, then remove them again.
- Before publishing, swap the AdMob sample IDs in `admob.config.ts` + `strings.xml` and set `useTestAds: false`, otherwise the store build serves test ads and earns nothing.

### Routing (`app.routes.ts`)
All routes lazy-load standalone components. The root `WheelPage` hosts named-outlet child routes (`outlet: 'panel'`) for the settings panels (`users`, `color-settings`, `effects`, `sound`, `wheel-manager`). `/:id` resolves a public shared wheel via `PublicWheel`; `/info`, `/donation`, `/templates` and `/privacy` are static pages.

**`:id` swallows any single-segment path**, so every new static route must be declared *above* it in `app.routes.ts` or it will render as a (missing) public wheel. `/privacy` is also the Play Store's required privacy-policy URL — see `docs/play-store-listing.md`.

### Layout (`src/app/feature/`)
`wheel-page/` is the main app shell; `wl-settings/` holds the settings panels (each a lazy child route); `header/`, `auth/`, `public-wheel/`, `info/`, `donation/` are top-level features. Shared/presentational pieces are under `shared/`.

## Conventions (from `.github/copilot-instructions.md`)

This is an Angular v21 standalone + signals codebase. Follow these:
- **Do NOT** set `standalone: true` in decorators (it's the default).
- Use `input()`/`output()` functions, not decorators. Use `inject()`, not constructor injection.
- Use `signal()` for state, `computed()` for derived state; never `mutate` — use `set`/`update`.
- `ChangeDetectionStrategy.OnPush` on components.
- Native control flow (`@if`/`@for`/`@switch`), not `*ngIf`/`*ngFor`. No arrow functions in templates.
- Host bindings go in the `host` object, not `@HostBinding`/`@HostListener`.
- Use `class`/`style` bindings, not `ngClass`/`ngStyle`. Prefer Reactive forms.
- Avoid `any` (use `unknown`); rely on type inference where obvious.
- Prettier: 100 print width, single quotes (HTML uses the `angular` parser).

## Gotchas

- Spinning, countdown, and winner state interact — check `isSpinning` / `countdownInProgress` guards before adding new entry points to spin.
- Per-workspace vs. group-shared vs. global storage keys differ (background color & bg image are group/shared; most else is per-workspace). Use the existing `storageKey()` / `backgroundStorageKey()` helpers.
- When adding a new persisted setting: add it to `STORAGE_KEYS`, the hydrate path in `hydrateFromStorage()`, a persistence `effect()` in `setupPersistence()`, and the snapshot shape (`WheelSnapshotEntry` / `buildSnapshotEntryFromState`) — otherwise it won't survive reload or sync to cloud.
