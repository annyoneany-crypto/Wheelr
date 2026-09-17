/**
 * Route-scoped JSON-LD, emitted by `SeoService` on navigation.
 *
 * Only the site-wide entities (WebSite, WebApplication, MobileApplication) stay
 * baked into `index.html`. Anything that describes the content of one specific
 * page has to live here instead: structured data must match what the visitor
 * actually sees on that URL, and the SPA keeps a single `<head>` for every route.
 */

/**
 * The FAQ of `/info`, kept **verbatim** from `info.html`.
 *
 * Google only honours FAQ markup whose questions and answers are visible on the
 * page; if you edit the `<details>` blocks there, edit these strings with them.
 */
export const INFO_FAQ_JSON_LD = {
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How do I make draws fairer?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Clean your names list, remove unwanted duplicates, and use Shuffle Names before every spin.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use it in livestreams or classrooms?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Absolutely. Wheelr is perfect for public moments: everyone sees the result and engagement spikes instantly.',
      },
    },
    {
      '@type': 'Question',
      name: 'How can I make it more branded?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Customize colors, background, effects, and audio to match your team's identity or event tone.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is it also good for light and funny decisions?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '100%. From "who does the dishes" to "who picks the playlist," the wheel settles debates in three seconds.',
      },
    },
  ],
} as const;

/**
 * The FAQ of `/stream`, kept **verbatim** from `stream.html` — same rule as
 * [INFO_FAQ_JSON_LD]: edit the two together or the markup stops matching the page.
 */
export const STREAM_FAQ_JSON_LD = {
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Does it work with Streamlabs, Twitch and YouTube?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Wheelr is a web page, so anything that can capture a browser window can put it on stream — OBS Studio, Streamlabs Desktop, XSplit. The platform you broadcast to makes no difference.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do my viewers need an account?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. A shared wheel opens in any browser with no signup. An account is only needed on your side, to publish the link and to reach your wheels from another device.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I match the wheel to my channel branding?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Colours, background, fonts, the centre logo and every sound are replaceable, so the wheel can carry your channel's look instead of a stock one. The setup is saved, so it is a one-off job.",
      },
    },
    {
      '@type': 'Question',
      name: 'How do I add hundreds of viewer names quickly?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Paste the whole list in one go rather than typing entries one by one, then shuffle before the first spin. On very long lists the labels get thin, so the winner is zoomed in on when the wheel stops.',
      },
    },
  ],
} as const;
