# Google Play listing — Wheelr

Copy-paste source for the Play Console store listing. Character limits are Google's;
the counts in brackets are what the text below actually uses.

---

## App name (max 30)

```
Wheelr – Spin the Wheel
```
[25]

## Short description (max 80)

```
Create custom wheels and spin them for raffles, giveaways, and quick decisions.
```
[79]

## Full description (max 4000)

```
Wheelr turns any decision into a moment. Type in your names, hit spin, and let the
wheel pick the winner — with the colours, sounds and celebration effects you choose.

Perfect for giveaways and raffles, classrooms, live streams, team stand-ups, prize
draws at events, or just settling what's for dinner.

MAKE IT YOURS
• Add entries by typing, pasting a list, or duplicating names to weight the odds
• Pick from ready-made colour palettes or set every slice yourself
• Put your own logo or image in the centre of the wheel
• Add a background image and custom fonts
• Choose your sounds for the spin, the countdown and the win

THREE WAYS TO DRAW
• Classic wheel — the full spinning wheel experience
• Linear — a smooth sliding picker
• Cards — flip to reveal the winner

CELEBRATE THE WINNER
Finish every draw with confetti, fireworks, applause, or flames. Turn effects off
when you want something quieter.

READY-MADE WHEELS
Don't feel like starting from scratch? Copy a ready-made wheel — yes/no decisions,
prize giveaways, food roulette, team picks and more — then customise it freely.

MULTIPLE WHEELS, SIDE BY SIDE
Save as many wheels as you like and switch between them instantly. Group up to four
wheels together and show them on screen at once for multi-prize draws.

FAIR AND RANDOM
Every spin uses your device's cryptographic random number generator. No hidden
weighting, no rigged results.

SHARE A WHEEL
Share any wheel with a link or a QR code. Anyone can open it and spin it — ideal for
audiences at an event or viewers on a stream.

WORKS OFFLINE
Wheelr runs without a connection. Sign in with your email or Google account if you
want your wheels backed up and synced across your devices — but you never have to.

FREE
Wheelr is free. Ads keep it that way: watch a short video to unlock a ready-made
wheel, and expect an occasional full-screen ad between spins.

Questions or ideas? We'd love to hear them.
```
[1,955]

---

## Store settings

| Field | Value |
| --- | --- |
| Category | Tools *(alternative: Entertainment)* |
| Tags | Random picker, Raffle, Giveaway, Decision maker, Spinner |
| Contains ads | **Yes** |
| In-app purchases | No |
| Privacy policy URL | `https://www.wheelr.xyz/privacy` |
| Website | `https://www.wheelr.xyz` |
| Content rating | Everyone / PEGI 3 — declare ads in the questionnaire |

## Graphic assets still needed

- **App icon** 512×512 PNG — export from `public/Logo.webp`
- **Feature graphic** 1024×500 PNG/JPG — required, no transparency
- **Phone screenshots** — at least 2, 16:9 or 9:16, min 320px on the short side.
  Good set: the wheel mid-spin, a winner with confetti, the colour panel, the
  ready-made wheels page, multi-wheel view.

---

## Data safety form

Answer it to match the privacy policy — a mismatch is a common rejection reason.

**Does your app collect or share any of the required user data types?** Yes.
**Is all user data encrypted in transit?** Yes.
**Do you provide a way for users to request data deletion?** Yes — see the blocker below.

| Data type | Collected | Shared | Optional? | Purpose |
| --- | --- | --- | --- | --- |
| Email address | Yes | No | Optional (only if the user signs in) | Account management |
| Name (Google profile) | Yes | No | Optional (Google sign-in only) | Account management |
| Photos / images | Yes | No | Optional (only if added to a wheel and synced) | App functionality |
| Other user-generated content (wheel entries) | Yes | No | Optional (only if synced) | App functionality |
| Device or other IDs (advertising ID) | Yes | **Yes** | No | Advertising, analytics |
| App interactions | Yes | **Yes** | No | Advertising |

The last two rows are AdMob's, not ours — Google's SDK collects and shares them.

---

## Before you upload

1. Add the **release SHA-1** and the **Play App Signing SHA-1** to Firebase and
   re-download `google-services.json`, or Google sign-in fails in production only.
2. Confirm `useTestAds: false` and the live ad unit IDs in `admob.config.ts`.
3. Bump `versionCode` in `android/app/build.gradle` for every upload.
4. Link the app in the AdMob console once it is published, and host
   `app-ads.txt` at `https://www.wheelr.xyz/app-ads.txt`.
5. Upload to **internal testing** first and install from Play — that build is
   signed by Google, so it is the only way to test the real production signing.
