# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Wheelr — a free web app for creating and spinning customizable giveaway wheels (raffles, contests, promos). Angular 21 (standalone, zoneless, signals) + TypeScript, styled with Tailwind CSS v4, persisted locally (localStorage + IndexedDB) with optional Firebase cloud sync.

## Commands

```bash
npm start          # ng serve — dev server (development config) at http://localhost:4200
npm run build      # ng build — production build; THIS IS THE CORRECTNESS GATE (see Testing)
npm run watch      # ng build --watch (development config)
npm test           # ng test — vitest + jsdom, zoneless
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

### Rendering
`shared/extraction-effect/wheel-renderer.ts` (`drawWheelCanvas`) is the single canvas drawing implementation shared by: the interactive `Wheel`, the multi-wheel previews on `WheelPage`, and the read-only `PublicWheel`. Three view modes exist: `'wheel'` | `'linear'` | `'cards'`. Winner effects (`fire`, `cartoon-fire`, `confetti`, `fireworks`, `applause`) live under `shared/winner-effect/`. Pointer/effect string unions are in `modules/classes/custom-type.ts`.

### Routing (`app.routes.ts`)
All routes lazy-load standalone components. The root `WheelPage` hosts named-outlet child routes (`outlet: 'panel'`) for the settings panels (`users`, `color-settings`, `effects`, `sound`, `wheel-manager`). `/:id` resolves a public shared wheel via `PublicWheel`; `/info` and `/donation` are static pages.

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
