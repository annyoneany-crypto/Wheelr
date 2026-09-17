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
