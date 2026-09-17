import { WHEEL_TEMPLATES, WheelTemplateItem } from './wheel-templates.data';

/**
 * Landing-page copy for each template, keyed by template id.
 *
 * Every ready-made wheel answers a query somebody actually types ("yes or no
 * wheel", "random team generator", "what should I eat wheel"). Behind the single
 * `/templates` page none of them could rank, so each one also gets its own URL
 * with copy written for that intent.
 *
 * Two rules when editing:
 * - `slug` is the URL and must never change once indexed — a renamed slug is a
 *   new page that starts from zero, and the old one 404s.
 * - `faq` is rendered on the page *and* emitted as FAQPage JSON-LD. Google only
 *   honours FAQ markup whose answers are visible, so the two cannot diverge.
 */
export interface WheelTemplateSeo {
  slug: string;
  /** `<title>`: keep the head term first, the brand last. */
  title: string;
  description: string;
  heading: string;
  intro: string;
  sections: readonly { heading: string; body: string }[];
  faq: readonly { question: string; answer: string }[];
}

export const TEMPLATE_SEO: Readonly<Record<string, WheelTemplateSeo>> = {
  'yes-or-no': {
    slug: 'yes-or-no-wheel',
    title: 'Yes or No Wheel | Free Random Yes/No Spinner',
    description:
      'Spin the yes or no wheel and get an answer in three seconds. A free random decision maker for the questions you keep going back and forth on. No signup.',
    heading: 'Yes or No Wheel',
    intro:
      'Some questions do not deserve another twenty minutes of thinking. Spin the wheel, read the answer, move on. The result comes from your browser’s cryptographic random source, so it is genuinely unpredictable — nothing here is weighted or seeded.',
    sections: [
      {
        heading: 'When a wheel beats a coin flip',
        body: 'A coin gives you a private answer you can quietly ignore. A wheel spun in front of a group is a decision everyone watched happen, which is why it settles arguments that a coin does not. It is also slower on purpose: the three seconds of spinning are what make the answer feel earned rather than arbitrary.',
      },
      {
        heading: 'Change the odds, or the answers',
        body: 'Copy the wheel and it becomes yours. Add more Yes slices than No ones if you already know which way you are leaning. Replace the two options entirely — "do it" and "not today", the names of two restaurants, two people who could take the task. The wheel does not care what is written on it.',
      },
    ],
    faq: [
      {
        question: 'Is the yes or no wheel really random?',
        answer:
          'Yes. The spin uses your browser’s cryptographic random number generator, the same source used for security keys. There is no seed, no pattern and no way to predict where it stops.',
      },
      {
        question: 'Can I add a third option like "maybe"?',
        answer:
          'Copy the wheel and add as many entries as you like. A third slice reading "ask again tomorrow" is a popular addition for questions that are not urgent.',
      },
    ],
  },

  'prize-giveaway': {
    slug: 'prize-wheel',
    title: 'Prize Wheel | Free Spin-to-Win Giveaway Picker',
    description:
      'A free prize wheel for giveaways, live streams and events. Add your prizes, spin in front of your audience, and everyone sees the winner drawn fairly.',
    heading: 'Prize Wheel for Giveaways',
    intro:
      'A giveaway is only as good as the moment the winner is announced. This prize wheel puts that moment on screen: the prizes are visible before the spin, the wheel slows down in front of everybody, and the result is impossible to quietly edit afterwards.',
    sections: [
      {
        heading: 'Built for an audience',
        body: 'The wheel is designed to be shown, not just used: a countdown before the spin, a fireworks effect on the winner, and sounds you can swap for your own. Hide the interface chrome and the wheel fills the screen, which is what you want when it is sitting in a stream layout or on a projector at an event.',
      },
      {
        heading: 'Prizes, not just names',
        body: 'Put the prizes on the wheel and spin once per winner, or put the entrants on it and spin once per prize — both work. Winners can be removed automatically after each spin so nobody wins twice, and the winners list keeps the record of who drew what.',
      },
    ],
    faq: [
      {
        question: 'Is the prize wheel fair?',
        answer:
          'Every slice of the same size has exactly the same chance, and the outcome comes from a cryptographic random source rather than a seeded sequence. Nothing about the result can be set in advance.',
      },
      {
        question: 'Can my audience see the wheel without installing anything?',
        answer:
          'Yes. Publish the wheel as a read-only public link and anyone can open it in a browser, with no account. It is also what you share after the draw as a record of the entries.',
      },
    ],
  },

  'whats-for-dinner': {
    slug: 'what-to-eat-wheel',
    title: 'What to Eat Wheel | Random Food Picker',
    description:
      'Nobody can decide where to eat? Spin the food wheel and dinner is settled. A free random meal picker you can fill with your own restaurants and dishes.',
    heading: 'What to Eat Wheel',
    intro:
      '"I don’t mind, you choose" is how a group loses half an hour. Put the options on a wheel, spin it once, and the question is closed — including for the person who said they did not mind.',
    sections: [
      {
        heading: 'Fill it with your actual options',
        body: 'The default wheel has the usual suspects, but it gets useful when you replace them with the eight places that actually deliver to you, or the meals you have ingredients for. Keep one wheel for weeknights and another for takeaway and switch between them — both stay saved on your device.',
      },
      {
        heading: 'Works for the whole table',
        body: 'Spinning in front of everyone is the point: nobody has to be the one who decided, so nobody gets blamed for the choice. Add a "someone else picks" slice if you want an escape hatch, and remove options that got vetoed before you spin.',
      },
    ],
    faq: [
      {
        question: 'Can I save my own list of restaurants?',
        answer:
          'Yes. Copy the wheel, replace the entries with your own, and it stays on your device for next time. Signing in is optional and only needed to reach the same wheel from another device.',
      },
      {
        question: 'How many options can the food wheel hold?',
        answer:
          'Far more than a dinner decision needs. Past roughly a dozen the labels get tight, so a wheel of eight to ten options is the sweet spot for readability.',
      },
    ],
  },

  'team-picker': {
    slug: 'random-team-generator',
    title: 'Random Team Generator | Free Group & Name Picker',
    description:
      'Split a group into teams or pick a random person without the arguing. A free random team generator for classrooms, standups, workshops and game nights.',
    heading: 'Random Team Generator',
    intro:
      'Picking teams by hand always ends with someone chosen last. A wheel removes the judgement from it: spin, read the name, move on to the next pick — and nobody can argue with a result nobody controlled.',
    sections: [
      {
        heading: 'Teams, turns and who goes first',
        body: 'The same wheel covers most group decisions: split a class into groups, choose who presents first in a standup, pick the volunteer nobody wants to be, or decide the order of a tournament. Remove each name as it comes up and the wheel works through the whole group without repeats.',
      },
      {
        heading: 'Fast enough to use live',
        body: 'Paste a list of names in one go rather than typing them one by one, shuffle before you start, and spin. In a classroom or a workshop the whole thing takes less time than reading the names out loud, and the visible spin is what keeps a room of people watching.',
      },
    ],
    faq: [
      {
        question: 'Can I stop the same person being picked twice?',
        answer:
          'Yes. Turn on removing the winner after each spin and every name is drawn at most once, so consecutive spins work through the group instead of repeating.',
      },
      {
        question: 'Can I run more than one team wheel at a time?',
        answer:
          'Up to four wheels can be shown side by side, each with its own entries — useful when you are drawing from separate pools, such as one wheel per team.',
      },
    ],
  },

  'truth-or-dare': {
    slug: 'truth-or-dare-wheel',
    title: 'Truth or Dare Wheel | Free Party Game Spinner',
    description:
      'A free truth or dare wheel for parties and game nights. Spin to decide, or fill it with your own truths and dares and let the wheel run the game.',
    heading: 'Truth or Dare Wheel',
    intro:
      'The wheel does the part of truth or dare that nobody wants to do: choosing. Nobody picks on anybody, nobody goes easy on their friends, and the game keeps moving because there is nothing to negotiate.',
    sections: [
      {
        heading: 'Two ways to play it',
        body: 'Keep the wheel simple — truth or dare, spin per player — or write the actual challenges on the slices so the wheel hands out the dare itself. The second version is better for larger groups, where thinking of a new dare every turn is what slows the game down.',
      },
      {
        heading: 'Set the tone before you spin',
        body: 'Copy the wheel and write your own entries, which is also how you keep the game appropriate for who is playing. A wheel written in advance by the whole group avoids the moment where one person invents a dare that goes too far.',
      },
    ],
    faq: [
      {
        question: 'Can I write my own truths and dares?',
        answer:
          'Yes — copy the wheel and replace the entries with anything you like. Your version is saved on your device, so the same wheel is ready for the next game night.',
      },
      {
        question: 'Does it work on a phone passed around the group?',
        answer:
          'It does. The wheel is designed for touch, fills the screen on a phone, and the interface can be hidden so only the wheel is visible while you play.',
      },
    ],
  },

  'discount-wheel': {
    slug: 'discount-wheel',
    title: 'Discount Wheel | Free Spin-to-Win Promo Wheel',
    description:
      'A free spin-to-win discount wheel for shops, market stalls and promos. Put your offers on the wheel and let customers spin for their own discount.',
    heading: 'Spin-to-Win Discount Wheel',
    intro:
      'A discount someone won feels different from a discount they were given. Put your offers on the wheel, let the customer spin it themselves, and a routine promotion turns into thirty seconds of attention.',
    sections: [
      {
        heading: 'For a counter, a stall or a stand',
        body: 'Run it on a tablet at the till, on a laptop at a trade stand, or on a screen behind a market stall. Everything lives in the browser and the Android app works offline, which matters at an event where the venue wi-fi does not.',
      },
      {
        heading: 'Control what you are giving away',
        body: 'The odds are the slices: make the deep discount one slice out of twelve and the small ones repeat. Adding a "next time" or "free shipping" slice keeps the wheel honest while capping what a single spin can cost you.',
      },
    ],
    faq: [
      {
        question: 'Can I control how often the big discount comes up?',
        answer:
          'Yes, through the slices themselves. Every slice of equal size has an equal chance, so repeating the smaller offers and leaving one slice for the big one sets the odds exactly.',
      },
      {
        question: 'Can I brand the wheel for my shop?',
        answer:
          'Colours, background, fonts, a centre logo and the sounds are all replaceable, so the wheel can be made to match your shop rather than looking like a generic tool.',
      },
    ],
  },

  'movie-night': {
    slug: 'what-to-watch-wheel',
    title: 'What to Watch Wheel | Random Movie Picker',
    description:
      'Stop scrolling and start watching. A free random movie picker: put the shortlist on the wheel, spin once, and the film is chosen for the night.',
    heading: 'What to Watch Wheel',
    intro:
      'The half hour spent scrolling for something to watch is longer than the argument it was meant to avoid. Put the shortlist on a wheel, spin it, and the evening starts.',
    sections: [
      {
        heading: 'A shortlist beats a catalogue',
        body: 'The wheel works best with the six or eight films everyone has already agreed they would accept. That is the real trick: the wheel is not choosing from everything, it is closing a list you have already narrowed down, which is the part a group cannot finish on its own.',
      },
      {
        heading: 'Genres, not just titles',
        body: 'Put genres on the wheel when nobody can even agree on a direction — spin once for the genre, then pick within it. The same wheel covers series nights, rewatches and the "something we have never seen" pile.',
      },
    ],
    faq: [
      {
        question: 'Can I keep a list of films for next time?',
        answer:
          'Yes. Copy the wheel, edit the entries, and it is saved on your device. You can keep several wheels — one for films, one for series, one for the list nobody has watched yet.',
      },
      {
        question: 'Can everyone watching see the wheel?',
        answer:
          'Share it as a read-only public link and anyone can open the same wheel in their browser with no account, which is handy when the group is not in the same room.',
      },
    ],
  },

  'workout-spinner': {
    slug: 'random-workout-generator',
    title: 'Random Workout Generator | Free Exercise Wheel',
    description:
      'A free random workout generator: spin the wheel for your next exercise. Fill it with your own moves and let the wheel decide the order and the mix.',
    heading: 'Random Workout Generator',
    intro:
      'Training goes stale when you always pick the exercises you like. A wheel picks the ones you do not, keeps the session unpredictable, and removes the deciding from a moment when you would rather be resting.',
    sections: [
      {
        heading: 'Spin between sets',
        body: 'Put the movements on the wheel and spin for the next one, or put durations and rep counts on a second wheel and spin both. Two wheels side by side — one for the exercise, one for the intensity — gives you a different session every time from the same list.',
      },
      {
        heading: 'Build it around what you have',
        body: 'Write your own entries so the wheel only offers exercises you can actually do in the space and with the kit you own. A bodyweight wheel for travelling and a gym wheel for everything else is the usual split, and both stay saved.',
      },
    ],
    faq: [
      {
        question: 'Can I use it for HIIT or circuit training?',
        answer:
          'Yes. The countdown before each spin doubles as a rest timer, and removing each exercise after it comes up turns the wheel into a circuit that works through the whole list without repeats.',
      },
      {
        question: 'Does it work at the gym without a connection?',
        answer:
          'The Android app works fully offline, so a saved wheel keeps spinning in a basement gym with no signal.',
      },
    ],
  },

  'lucky-numbers': {
    slug: 'random-number-wheel',
    title: 'Random Number Wheel | Free Number Picker Spinner',
    description:
      'A free random number wheel: spin to draw a number in front of everyone. Set your own range for raffles, bingo, classroom picks and lotteries.',
    heading: 'Random Number Wheel',
    intro:
      'A number generator gives you a number. A wheel gives a room full of people a number they watched being drawn — which is what you need when the draw has to convince somebody other than you.',
    sections: [
      {
        heading: 'When the draw needs witnesses',
        body: 'Raffle tickets, bingo calls, lottery-style draws, picking a seat or a locker: any time the number decides who gets something, being able to see it drawn matters more than the speed. The wheel slows the moment down deliberately, and the winners list keeps the order the numbers came out in.',
      },
      {
        heading: 'Set your own range',
        body: 'Copy the wheel and replace the entries with whatever range you need — 1 to 20, ticket numbers, the numbers still in play. Remove each number after it is drawn and the wheel works through the range without repeating, which is exactly how a bingo caller uses it.',
      },
    ],
    faq: [
      {
        question: 'How is this different from a random number generator?',
        answer:
          'The randomness is the same cryptographic source. The difference is that the draw is visible: everyone watching sees the same spin land on the same number, which a generator that prints a number cannot offer.',
      },
      {
        question: 'Can I draw several numbers without repeats?',
        answer:
          'Yes. Turn on removing the winner after each spin and each number is drawn at most once, so repeated spins work through the whole range.',
      },
    ],
  },

  'icebreaker-questions': {
    slug: 'icebreaker-questions-wheel',
    title: 'Icebreaker Questions Wheel | Free Team Spinner',
    description:
      'A free icebreaker wheel for meetings, workshops and first days. Spin for a question, go round the room, and get a quiet group talking in two minutes.',
    heading: 'Icebreaker Questions Wheel',
    intro:
      'Icebreakers fail when the facilitator picks the question and everyone can tell it was picked. A wheel takes that away: the question arrives by chance, the room reacts to the wheel instead of to you, and the first answer comes faster.',
    sections: [
      {
        heading: 'For meetings, onboarding and workshops',
        body: 'Spin once at the top of a recurring meeting and go round the room, or spin per person so everybody gets a different question. It works the same on a projector in a room and shared on a call, and two minutes is usually all it needs to take.',
      },
      {
        heading: 'Write questions your team would answer',
        body: 'The stock questions are a starting point; the good version of this wheel is the one a team wrote themselves. Keep the questions light and answerable in a sentence — anything that needs a considered answer stops being an icebreaker and becomes a meeting.',
      },
    ],
    faq: [
      {
        question: 'Does it work for remote teams?',
        answer:
          'Yes. Share your screen and spin, or publish the wheel as a public link so everyone on the call opens the same one in their own browser.',
      },
      {
        question: 'Can I use my own icebreaker questions?',
        answer:
          'Copy the wheel and replace the entries with your own. The wheel is saved on your device, so the same set is ready for every following meeting.',
      },
    ],
  },
};

export interface TemplateLandingPage {
  template: WheelTemplateItem;
  seo: WheelTemplateSeo;
}

/** Every template that has landing copy, in the order the templates are listed. */
export const TEMPLATE_LANDING_PAGES: readonly TemplateLandingPage[] = WHEEL_TEMPLATES.flatMap(
  (template) => {
    const seo = TEMPLATE_SEO[template.id];
    return seo ? [{ template, seo }] : [];
  }
);

export function findTemplateLandingPage(slug: string): TemplateLandingPage | null {
  const normalized = slug?.trim().toLowerCase() ?? '';

  return TEMPLATE_LANDING_PAGES.find((page) => page.seo.slug === normalized) ?? null;
}

/** `/templates/what-to-eat-wheel` for a given template, or null if it has no page. */
export function templateLandingPath(templateId: string): string | null {
  const seo = TEMPLATE_SEO[templateId];
  return seo ? `/templates/${seo.slug}` : null;
}
