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
    title: $localize`:@@tpl.yes-or-no.title:Yes or No Wheel | Free Random Yes/No Spinner`,
    description:
      $localize`:@@tpl.yes-or-no.desc:Spin the yes or no wheel and get an answer in three seconds. A free random decision maker for the questions you keep going back and forth on. No signup.`,
    heading: $localize`:@@tpl.yes-or-no.heading:Yes or No Wheel`,
    intro:
      $localize`:@@tpl.yes-or-no.intro:Some questions do not deserve another twenty minutes of thinking. Spin the wheel, read the answer, move on. The result comes from your browser’s cryptographic random source, so it is genuinely unpredictable — nothing here is weighted or seeded.`,
    sections: [
      {
        heading: $localize`:@@tpl.yes-or-no.s1.heading:When a wheel beats a coin flip`,
        body: $localize`:@@tpl.yes-or-no.s1.body:A coin gives you a private answer you can quietly ignore. A wheel spun in front of a group is a decision everyone watched happen, which is why it settles arguments that a coin does not. It is also slower on purpose: the three seconds of spinning are what make the answer feel earned rather than arbitrary.`,
      },
      {
        heading: $localize`:@@tpl.yes-or-no.s2.heading:Change the odds, or the answers`,
        body: $localize`:@@tpl.yes-or-no.s2.body:Copy the wheel and it becomes yours. Add more Yes slices than No ones if you already know which way you are leaning. Replace the two options entirely — "do it" and "not today", the names of two restaurants, two people who could take the task. The wheel does not care what is written on it.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.yes-or-no.faq1.q:Is the yes or no wheel really random?`,
        answer:
          $localize`:@@tpl.yes-or-no.faq1.a:Yes. The spin uses your browser’s cryptographic random number generator, the same source used for security keys. There is no seed, no pattern and no way to predict where it stops.`,
      },
      {
        question: $localize`:@@tpl.yes-or-no.faq2.q:Can I add a third option like "maybe"?`,
        answer:
          $localize`:@@tpl.yes-or-no.faq2.a:Copy the wheel and add as many entries as you like. A third slice reading "ask again tomorrow" is a popular addition for questions that are not urgent.`,
      },
    ],
  },

  'prize-giveaway': {
    slug: 'prize-wheel',
    title: $localize`:@@tpl.prize-giveaway.title:Prize Wheel | Free Spin-to-Win Giveaway Picker`,
    description:
      $localize`:@@tpl.prize-giveaway.desc:A free prize wheel for giveaways, live streams and events. Add your prizes, spin in front of your audience, and everyone sees the winner drawn fairly.`,
    heading: $localize`:@@tpl.prize-giveaway.heading:Prize Wheel for Giveaways`,
    intro:
      $localize`:@@tpl.prize-giveaway.intro:A giveaway is only as good as the moment the winner is announced. This prize wheel puts that moment on screen: the prizes are visible before the spin, the wheel slows down in front of everybody, and the result is impossible to quietly edit afterwards.`,
    sections: [
      {
        heading: $localize`:@@tpl.prize-giveaway.s1.heading:Built for an audience`,
        body: $localize`:@@tpl.prize-giveaway.s1.body:The wheel is designed to be shown, not just used: a countdown before the spin, a fireworks effect on the winner, and sounds you can swap for your own. Hide the interface chrome and the wheel fills the screen, which is what you want when it is sitting in a stream layout or on a projector at an event.`,
      },
      {
        heading: $localize`:@@tpl.prize-giveaway.s2.heading:Prizes, not just names`,
        body: $localize`:@@tpl.prize-giveaway.s2.body:Put the prizes on the wheel and spin once per winner, or put the entrants on it and spin once per prize — both work. Winners can be removed automatically after each spin so nobody wins twice, and the winners list keeps the record of who drew what.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.prize-giveaway.faq1.q:Is the prize wheel fair?`,
        answer:
          $localize`:@@tpl.prize-giveaway.faq1.a:Every slice of the same size has exactly the same chance, and the outcome comes from a cryptographic random source rather than a seeded sequence. Nothing about the result can be set in advance.`,
      },
      {
        question: $localize`:@@tpl.prize-giveaway.faq2.q:Can my audience see the wheel without installing anything?`,
        answer:
          $localize`:@@tpl.prize-giveaway.faq2.a:Yes. Publish the wheel as a read-only public link and anyone can open it in a browser, with no account. It is also what you share after the draw as a record of the entries.`,
      },
    ],
  },

  'whats-for-dinner': {
    slug: 'what-to-eat-wheel',
    title: $localize`:@@tpl.whats-for-dinner.title:What to Eat Wheel | Random Food Picker`,
    description:
      $localize`:@@tpl.whats-for-dinner.desc:Nobody can decide where to eat? Spin the food wheel and dinner is settled. A free random meal picker you can fill with your own restaurants and dishes.`,
    heading: $localize`:@@tpl.whats-for-dinner.heading:What to Eat Wheel`,
    intro:
      $localize`:@@tpl.whats-for-dinner.intro:"I don’t mind, you choose" is how a group loses half an hour. Put the options on a wheel, spin it once, and the question is closed — including for the person who said they did not mind.`,
    sections: [
      {
        heading: $localize`:@@tpl.whats-for-dinner.s1.heading:Fill it with your actual options`,
        body: $localize`:@@tpl.whats-for-dinner.s1.body:The default wheel has the usual suspects, but it gets useful when you replace them with the eight places that actually deliver to you, or the meals you have ingredients for. Keep one wheel for weeknights and another for takeaway and switch between them — both stay saved on your device.`,
      },
      {
        heading: $localize`:@@tpl.whats-for-dinner.s2.heading:Works for the whole table`,
        body: $localize`:@@tpl.whats-for-dinner.s2.body:Spinning in front of everyone is the point: nobody has to be the one who decided, so nobody gets blamed for the choice. Add a "someone else picks" slice if you want an escape hatch, and remove options that got vetoed before you spin.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.whats-for-dinner.faq1.q:Can I save my own list of restaurants?`,
        answer:
          $localize`:@@tpl.whats-for-dinner.faq1.a:Yes. Copy the wheel, replace the entries with your own, and it stays on your device for next time. Signing in is optional and only needed to reach the same wheel from another device.`,
      },
      {
        question: $localize`:@@tpl.whats-for-dinner.faq2.q:How many options can the food wheel hold?`,
        answer:
          $localize`:@@tpl.whats-for-dinner.faq2.a:Far more than a dinner decision needs. Past roughly a dozen the labels get tight, so a wheel of eight to ten options is the sweet spot for readability.`,
      },
    ],
  },

  'team-picker': {
    slug: 'random-team-generator',
    title: $localize`:@@tpl.team-picker.title:Random Team Generator | Free Group & Name Picker`,
    description:
      $localize`:@@tpl.team-picker.desc:Split a group into teams or pick a random person without the arguing. A free random team generator for classrooms, standups, workshops and game nights.`,
    heading: $localize`:@@tpl.team-picker.heading:Random Team Generator`,
    intro:
      $localize`:@@tpl.team-picker.intro:Picking teams by hand always ends with someone chosen last. A wheel removes the judgement from it: spin, read the name, move on to the next pick — and nobody can argue with a result nobody controlled.`,
    sections: [
      {
        heading: $localize`:@@tpl.team-picker.s1.heading:Teams, turns and who goes first`,
        body: $localize`:@@tpl.team-picker.s1.body:The same wheel covers most group decisions: split a class into groups, choose who presents first in a standup, pick the volunteer nobody wants to be, or decide the order of a tournament. Remove each name as it comes up and the wheel works through the whole group without repeats.`,
      },
      {
        heading: $localize`:@@tpl.team-picker.s2.heading:Fast enough to use live`,
        body: $localize`:@@tpl.team-picker.s2.body:Paste a list of names in one go rather than typing them one by one, shuffle before you start, and spin. In a classroom or a workshop the whole thing takes less time than reading the names out loud, and the visible spin is what keeps a room of people watching.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.team-picker.faq1.q:Can I stop the same person being picked twice?`,
        answer:
          $localize`:@@tpl.team-picker.faq1.a:Yes. Turn on removing the winner after each spin and every name is drawn at most once, so consecutive spins work through the group instead of repeating.`,
      },
      {
        question: $localize`:@@tpl.team-picker.faq2.q:Can I run more than one team wheel at a time?`,
        answer:
          $localize`:@@tpl.team-picker.faq2.a:Up to four wheels can be shown side by side, each with its own entries — useful when you are drawing from separate pools, such as one wheel per team.`,
      },
    ],
  },

  'truth-or-dare': {
    slug: 'truth-or-dare-wheel',
    title: $localize`:@@tpl.truth-or-dare.title:Truth or Dare Wheel | Free Party Game Spinner`,
    description:
      $localize`:@@tpl.truth-or-dare.desc:A free truth or dare wheel for parties and game nights. Spin to decide, or fill it with your own truths and dares and let the wheel run the game.`,
    heading: $localize`:@@tpl.truth-or-dare.heading:Truth or Dare Wheel`,
    intro:
      $localize`:@@tpl.truth-or-dare.intro:The wheel does the part of truth or dare that nobody wants to do: choosing. Nobody picks on anybody, nobody goes easy on their friends, and the game keeps moving because there is nothing to negotiate.`,
    sections: [
      {
        heading: $localize`:@@tpl.truth-or-dare.s1.heading:Two ways to play it`,
        body: $localize`:@@tpl.truth-or-dare.s1.body:Keep the wheel simple — truth or dare, spin per player — or write the actual challenges on the slices so the wheel hands out the dare itself. The second version is better for larger groups, where thinking of a new dare every turn is what slows the game down.`,
      },
      {
        heading: $localize`:@@tpl.truth-or-dare.s2.heading:Set the tone before you spin`,
        body: $localize`:@@tpl.truth-or-dare.s2.body:Copy the wheel and write your own entries, which is also how you keep the game appropriate for who is playing. A wheel written in advance by the whole group avoids the moment where one person invents a dare that goes too far.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.truth-or-dare.faq1.q:Can I write my own truths and dares?`,
        answer:
          $localize`:@@tpl.truth-or-dare.faq1.a:Yes — copy the wheel and replace the entries with anything you like. Your version is saved on your device, so the same wheel is ready for the next game night.`,
      },
      {
        question: $localize`:@@tpl.truth-or-dare.faq2.q:Does it work on a phone passed around the group?`,
        answer:
          $localize`:@@tpl.truth-or-dare.faq2.a:It does. The wheel is designed for touch, fills the screen on a phone, and the interface can be hidden so only the wheel is visible while you play.`,
      },
    ],
  },

  'discount-wheel': {
    slug: 'discount-wheel',
    title: $localize`:@@tpl.discount-wheel.title:Discount Wheel | Free Spin-to-Win Promo Wheel`,
    description:
      $localize`:@@tpl.discount-wheel.desc:A free spin-to-win discount wheel for shops, market stalls and promos. Put your offers on the wheel and let customers spin for their own discount.`,
    heading: $localize`:@@tpl.discount-wheel.heading:Spin-to-Win Discount Wheel`,
    intro:
      $localize`:@@tpl.discount-wheel.intro:A discount someone won feels different from a discount they were given. Put your offers on the wheel, let the customer spin it themselves, and a routine promotion turns into thirty seconds of attention.`,
    sections: [
      {
        heading: $localize`:@@tpl.discount-wheel.s1.heading:For a counter, a stall or a stand`,
        body: $localize`:@@tpl.discount-wheel.s1.body:Run it on a tablet at the till, on a laptop at a trade stand, or on a screen behind a market stall. Everything lives in the browser and the Android app works offline, which matters at an event where the venue wi-fi does not.`,
      },
      {
        heading: $localize`:@@tpl.discount-wheel.s2.heading:Control what you are giving away`,
        body: $localize`:@@tpl.discount-wheel.s2.body:The odds are the slices: make the deep discount one slice out of twelve and the small ones repeat. Adding a "next time" or "free shipping" slice keeps the wheel honest while capping what a single spin can cost you.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.discount-wheel.faq1.q:Can I control how often the big discount comes up?`,
        answer:
          $localize`:@@tpl.discount-wheel.faq1.a:Yes, through the slices themselves. Every slice of equal size has an equal chance, so repeating the smaller offers and leaving one slice for the big one sets the odds exactly.`,
      },
      {
        question: $localize`:@@tpl.discount-wheel.faq2.q:Can I brand the wheel for my shop?`,
        answer:
          $localize`:@@tpl.discount-wheel.faq2.a:Colours, background, fonts, a centre logo and the sounds are all replaceable, so the wheel can be made to match your shop rather than looking like a generic tool.`,
      },
    ],
  },

  'movie-night': {
    slug: 'what-to-watch-wheel',
    title: $localize`:@@tpl.movie-night.title:What to Watch Wheel | Random Movie Picker`,
    description:
      $localize`:@@tpl.movie-night.desc:Stop scrolling and start watching. A free random movie picker: put the shortlist on the wheel, spin once, and the film is chosen for the night.`,
    heading: $localize`:@@tpl.movie-night.heading:What to Watch Wheel`,
    intro:
      $localize`:@@tpl.movie-night.intro:The half hour spent scrolling for something to watch is longer than the argument it was meant to avoid. Put the shortlist on a wheel, spin it, and the evening starts.`,
    sections: [
      {
        heading: $localize`:@@tpl.movie-night.s1.heading:A shortlist beats a catalogue`,
        body: $localize`:@@tpl.movie-night.s1.body:The wheel works best with the six or eight films everyone has already agreed they would accept. That is the real trick: the wheel is not choosing from everything, it is closing a list you have already narrowed down, which is the part a group cannot finish on its own.`,
      },
      {
        heading: $localize`:@@tpl.movie-night.s2.heading:Genres, not just titles`,
        body: $localize`:@@tpl.movie-night.s2.body:Put genres on the wheel when nobody can even agree on a direction — spin once for the genre, then pick within it. The same wheel covers series nights, rewatches and the "something we have never seen" pile.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.movie-night.faq1.q:Can I keep a list of films for next time?`,
        answer:
          $localize`:@@tpl.movie-night.faq1.a:Yes. Copy the wheel, edit the entries, and it is saved on your device. You can keep several wheels — one for films, one for series, one for the list nobody has watched yet.`,
      },
      {
        question: $localize`:@@tpl.movie-night.faq2.q:Can everyone watching see the wheel?`,
        answer:
          $localize`:@@tpl.movie-night.faq2.a:Share it as a read-only public link and anyone can open the same wheel in their browser with no account, which is handy when the group is not in the same room.`,
      },
    ],
  },

  'workout-spinner': {
    slug: 'random-workout-generator',
    title: $localize`:@@tpl.workout-spinner.title:Random Workout Generator | Free Exercise Wheel`,
    description:
      $localize`:@@tpl.workout-spinner.desc:A free random workout generator: spin the wheel for your next exercise. Fill it with your own moves and let the wheel decide the order and the mix.`,
    heading: $localize`:@@tpl.workout-spinner.heading:Random Workout Generator`,
    intro:
      $localize`:@@tpl.workout-spinner.intro:Training goes stale when you always pick the exercises you like. A wheel picks the ones you do not, keeps the session unpredictable, and removes the deciding from a moment when you would rather be resting.`,
    sections: [
      {
        heading: $localize`:@@tpl.workout-spinner.s1.heading:Spin between sets`,
        body: $localize`:@@tpl.workout-spinner.s1.body:Put the movements on the wheel and spin for the next one, or put durations and rep counts on a second wheel and spin both. Two wheels side by side — one for the exercise, one for the intensity — gives you a different session every time from the same list.`,
      },
      {
        heading: $localize`:@@tpl.workout-spinner.s2.heading:Build it around what you have`,
        body: $localize`:@@tpl.workout-spinner.s2.body:Write your own entries so the wheel only offers exercises you can actually do in the space and with the kit you own. A bodyweight wheel for travelling and a gym wheel for everything else is the usual split, and both stay saved.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.workout-spinner.faq1.q:Can I use it for HIIT or circuit training?`,
        answer:
          $localize`:@@tpl.workout-spinner.faq1.a:Yes. The countdown before each spin doubles as a rest timer, and removing each exercise after it comes up turns the wheel into a circuit that works through the whole list without repeats.`,
      },
      {
        question: $localize`:@@tpl.workout-spinner.faq2.q:Does it work at the gym without a connection?`,
        answer:
          $localize`:@@tpl.workout-spinner.faq2.a:The Android app works fully offline, so a saved wheel keeps spinning in a basement gym with no signal.`,
      },
    ],
  },

  'lucky-numbers': {
    slug: 'random-number-wheel',
    title: $localize`:@@tpl.lucky-numbers.title:Random Number Wheel | Free Number Picker Spinner`,
    description:
      $localize`:@@tpl.lucky-numbers.desc:A free random number wheel: spin to draw a number in front of everyone. Set your own range for raffles, bingo, classroom picks and lotteries.`,
    heading: $localize`:@@tpl.lucky-numbers.heading:Random Number Wheel`,
    intro:
      $localize`:@@tpl.lucky-numbers.intro:A number generator gives you a number. A wheel gives a room full of people a number they watched being drawn — which is what you need when the draw has to convince somebody other than you.`,
    sections: [
      {
        heading: $localize`:@@tpl.lucky-numbers.s1.heading:When the draw needs witnesses`,
        body: $localize`:@@tpl.lucky-numbers.s1.body:Raffle tickets, bingo calls, lottery-style draws, picking a seat or a locker: any time the number decides who gets something, being able to see it drawn matters more than the speed. The wheel slows the moment down deliberately, and the winners list keeps the order the numbers came out in.`,
      },
      {
        heading: $localize`:@@tpl.lucky-numbers.s2.heading:Set your own range`,
        body: $localize`:@@tpl.lucky-numbers.s2.body:Copy the wheel and replace the entries with whatever range you need — 1 to 20, ticket numbers, the numbers still in play. Remove each number after it is drawn and the wheel works through the range without repeating, which is exactly how a bingo caller uses it.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.lucky-numbers.faq1.q:How is this different from a random number generator?`,
        answer:
          $localize`:@@tpl.lucky-numbers.faq1.a:The randomness is the same cryptographic source. The difference is that the draw is visible: everyone watching sees the same spin land on the same number, which a generator that prints a number cannot offer.`,
      },
      {
        question: $localize`:@@tpl.lucky-numbers.faq2.q:Can I draw several numbers without repeats?`,
        answer:
          $localize`:@@tpl.lucky-numbers.faq2.a:Yes. Turn on removing the winner after each spin and each number is drawn at most once, so repeated spins work through the whole range.`,
      },
    ],
  },

  'icebreaker-questions': {
    slug: 'icebreaker-questions-wheel',
    title: $localize`:@@tpl.icebreaker-questions.title:Icebreaker Questions Wheel | Free Team Spinner`,
    description:
      $localize`:@@tpl.icebreaker-questions.desc:A free icebreaker wheel for meetings, workshops and first days. Spin for a question, go round the room, and get a quiet group talking in two minutes.`,
    heading: $localize`:@@tpl.icebreaker-questions.heading:Icebreaker Questions Wheel`,
    intro:
      $localize`:@@tpl.icebreaker-questions.intro:Icebreakers fail when the facilitator picks the question and everyone can tell it was picked. A wheel takes that away: the question arrives by chance, the room reacts to the wheel instead of to you, and the first answer comes faster.`,
    sections: [
      {
        heading: $localize`:@@tpl.icebreaker-questions.s1.heading:For meetings, onboarding and workshops`,
        body: $localize`:@@tpl.icebreaker-questions.s1.body:Spin once at the top of a recurring meeting and go round the room, or spin per person so everybody gets a different question. It works the same on a projector in a room and shared on a call, and two minutes is usually all it needs to take.`,
      },
      {
        heading: $localize`:@@tpl.icebreaker-questions.s2.heading:Write questions your team would answer`,
        body: $localize`:@@tpl.icebreaker-questions.s2.body:The stock questions are a starting point; the good version of this wheel is the one a team wrote themselves. Keep the questions light and answerable in a sentence — anything that needs a considered answer stops being an icebreaker and becomes a meeting.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.icebreaker-questions.faq1.q:Does it work for remote teams?`,
        answer:
          $localize`:@@tpl.icebreaker-questions.faq1.a:Yes. Share your screen and spin, or publish the wheel as a public link so everyone on the call opens the same one in their own browser.`,
      },
      {
        question: $localize`:@@tpl.icebreaker-questions.faq2.q:Can I use my own icebreaker questions?`,
        answer:
          $localize`:@@tpl.icebreaker-questions.faq2.a:Copy the wheel and replace the entries with your own. The wheel is saved on your device, so the same set is ready for every following meeting.`,
      },
    ],
  },
  'random-name-picker': {
    slug: 'random-name-picker',
    title: $localize`:@@tpl.random-name-picker.title:Random Name Picker | Free Name Wheel Spinner`,
    description:
      $localize`:@@tpl.random-name-picker.desc:A free random name picker for classrooms, meetings and calls. Paste your list, spin the wheel, and the name is chosen in front of everyone.`,
    heading: $localize`:@@tpl.random-name-picker.heading:Random Name Picker`,
    intro:
      $localize`:@@tpl.random-name-picker.intro:Calling on someone is the moment a room decides whether you are fair. A wheel takes the choice out of your hands: the name is drawn in front of everybody, so nobody is picked on and nobody is skipped.`,
    sections: [
      {
        heading: $localize`:@@tpl.random-name-picker.s1.heading:Paste the register and go`,
        body: $localize`:@@tpl.random-name-picker.s1.body:Add the whole list in one go rather than typing names one at a time, shuffle it, and start spinning. A teacher can set this up between two lessons, and the same wheel stays saved for the rest of the term.`,
      },
      {
        heading: $localize`:@@tpl.random-name-picker.s2.heading:Nobody twice, or everybody eventually`,
        body: $localize`:@@tpl.random-name-picker.s2.body:Remove each name after it is drawn and the wheel works through the class without repeats — which is how you make sure the quiet students get their turn too. Leave the names in and it stays a lottery, better for handing out a single prize.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.random-name-picker.faq1.q:How many names can the picker hold?`,
        answer:
          $localize`:@@tpl.random-name-picker.faq1.a:A full class fits comfortably. Past roughly thirty entries the labels on the wheel get thin, so very long lists are easier to read split across a few wheels.`,
      },
      {
        question: $localize`:@@tpl.random-name-picker.faq2.q:Can I stop a name from being picked twice?`,
        answer:
          $localize`:@@tpl.random-name-picker.faq2.a:Yes. Turn on removing the winner after each spin and each name is drawn at most once, so consecutive spins work through the whole list.`,
      },
    ],
  },

  'would-you-rather': {
    slug: 'would-you-rather-wheel',
    title: $localize`:@@tpl.would-you-rather.title:Would You Rather Wheel | Free Question Spinner`,
    description:
      $localize`:@@tpl.would-you-rather.desc:A free would you rather wheel: spin for an impossible choice and make everyone defend their answer. Add your own questions in seconds.`,
    heading: $localize`:@@tpl.would-you-rather.heading:Would You Rather Wheel`,
    intro:
      $localize`:@@tpl.would-you-rather.intro:The hard part of would you rather is thinking of a question that nobody has heard before. Let the wheel hold the questions, and the game runs itself — spin, read it out, go round the group.`,
    sections: [
      {
        heading: $localize`:@@tpl.would-you-rather.s1.heading:Good for a queue, a car or a classroom`,
        body: $localize`:@@tpl.would-you-rather.s1.body:It needs no setup and no props, which is why it works in the places where a game normally cannot start: waiting somewhere, a long drive, the last ten minutes of a lesson. One phone passed around is enough.`,
      },
      {
        heading: $localize`:@@tpl.would-you-rather.s2.heading:Write the questions for your group`,
        body: $localize`:@@tpl.would-you-rather.s2.body:Copy the wheel and replace the entries with dilemmas aimed at the people playing — in-jokes, work scenarios, questions only your friends would find funny. A wheel written by the group is always better than a generic list.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.would-you-rather.faq1.q:Can I add my own would you rather questions?`,
        answer:
          $localize`:@@tpl.would-you-rather.faq1.a:Yes. Copy the wheel, replace the entries with your own, and your version is saved on your device for the next time you play.`,
      },
      {
        question: $localize`:@@tpl.would-you-rather.faq2.q:How do I keep it suitable for kids?`,
        answer:
          $localize`:@@tpl.would-you-rather.faq2.a:Write the wheel in advance with the questions you are happy with. Because the wheel only ever offers what is written on it, there are no surprises mid-game.`,
      },
    ],
  },

  'never-have-i-ever': {
    slug: 'never-have-i-ever-wheel',
    title: $localize`:@@tpl.never-have-i-ever.title:Never Have I Ever Wheel | Free Party Game Spinner`,
    description:
      $localize`:@@tpl.never-have-i-ever.desc:A free never have I ever wheel for game nights. Spin for the prompt, see who owns up, and add your own statements whenever you like.`,
    heading: $localize`:@@tpl.never-have-i-ever.heading:Never Have I Ever Wheel`,
    intro:
      $localize`:@@tpl.never-have-i-ever.intro:Never have I ever stalls the moment somebody has to invent the next statement. Put them on a wheel and the game keeps its rhythm: spin, read it out, watch who gives themselves away.`,
    sections: [
      {
        heading: $localize`:@@tpl.never-have-i-ever.s1.heading:The wheel is the host`,
        body: $localize`:@@tpl.never-have-i-ever.s1.body:Nobody has to run the game, which also means nobody can aim a statement at one person in particular. The wheel picking at random is what keeps it light — everyone is exposed by chance rather than by the person whose turn it was.`,
      },
      {
        heading: $localize`:@@tpl.never-have-i-ever.s2.heading:Build your own set`,
        body: $localize`:@@tpl.never-have-i-ever.s2.body:The default statements are mild on purpose. Copy the wheel and write your own for the group you are playing with, and keep more than one version — a work-party wheel and a close-friends wheel are not the same list.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.never-have-i-ever.faq1.q:How many players does it work with?`,
        answer:
          $localize`:@@tpl.never-have-i-ever.faq1.a:Any number. The wheel only picks the statement; how you score it — fingers down, points, forfeits — is up to the group.`,
      },
      {
        question: $localize`:@@tpl.never-have-i-ever.faq2.q:Can everyone see the wheel at once?`,
        answer:
          $localize`:@@tpl.never-have-i-ever.faq2.a:Share it as a read-only public link and everyone opens the same wheel in their own browser, or put one screen in the middle of the table.`,
      },
    ],
  },

  'chore-wheel': {
    slug: 'chore-wheel',
    title: $localize`:@@tpl.chore-wheel.title:Chore Wheel | Free Chore Chart Spinner`,
    description:
      $localize`:@@tpl.chore-wheel.desc:A free chore wheel for housemates and families. Spin to assign the washing up, the bins and everything nobody volunteers for — without the argument.`,
    heading: $localize`:@@tpl.chore-wheel.heading:Chore Wheel`,
    intro:
      $localize`:@@tpl.chore-wheel.intro:Every shared house has the same argument, and it is never really about the dishes. A wheel settles it without anyone having to be the one who decided: spin, read the result, it is done.`,
    sections: [
      {
        heading: $localize`:@@tpl.chore-wheel.s1.heading:Chores or people — pick a side`,
        body: $localize`:@@tpl.chore-wheel.s1.body:Put the chores on the wheel and spin once per person, or put the housemates on it and spin once per chore. The second version is better when one job is far worse than the others, because everybody watches that particular spin.`,
      },
      {
        heading: $localize`:@@tpl.chore-wheel.s2.heading:Make it weekly`,
        body: $localize`:@@tpl.chore-wheel.s2.body:Add a "day off" slice so there is something to hope for, and remove each chore once it is assigned so the wheel shares out the whole list. Keep the wheel saved and re-spin it every Sunday — the routine is what stops the argument coming back.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.chore-wheel.faq1.q:Can I add or remove chores?`,
        answer:
          $localize`:@@tpl.chore-wheel.faq1.a:Yes. Copy the wheel and edit the entries to match your household — the version you make is saved on your device.`,
      },
      {
        question: $localize`:@@tpl.chore-wheel.faq2.q:Can I make one chore rarer than the others?`,
        answer:
          $localize`:@@tpl.chore-wheel.faq2.a:The odds are just the slices. Repeat the chores you want to come up more often and leave the worst one as a single slice.`,
      },
    ],
  },

  'secret-santa': {
    slug: 'secret-santa-wheel',
    title: $localize`:@@tpl.secret-santa.title:Secret Santa Wheel | Free Gift Exchange Name Draw`,
    description:
      $localize`:@@tpl.secret-santa.desc:Draw Secret Santa names with a wheel instead of a hat. Free, works for an office or a family, and everyone sees the draw happen.`,
    heading: $localize`:@@tpl.secret-santa.heading:Secret Santa Wheel`,
    intro:
      $localize`:@@tpl.secret-santa.intro:A hat full of folded paper only works when everyone is in the same room. A wheel draws the names in front of whoever is watching — in the office, on a call, or in a group chat with the screen shared.`,
    sections: [
      {
        heading: $localize`:@@tpl.secret-santa.s1.heading:How to run the draw`,
        body: $localize`:@@tpl.secret-santa.s1.body:Put every participant on the wheel and spin once for each giver, removing each name as it comes out so nobody is assigned twice. The winners list keeps the order the names were drawn in, which is the record you check when somebody forgets who they had.`,
      },
      {
        heading: $localize`:@@tpl.secret-santa.s2.heading:Keeping it secret`,
        body: $localize`:@@tpl.secret-santa.s2.body:The catch with a public draw is that it is public. For a genuinely secret exchange, spin privately for each person and tell them their name individually — the wheel is doing the randomising, not the announcing.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.secret-santa.faq1.q:Can the wheel avoid pairing someone with themselves?`,
        answer:
          $localize`:@@tpl.secret-santa.faq1.a:Remove the giver’s own name from the wheel before their spin, and remove each drawn name afterwards. That is the whole trick, and it takes a second per person.`,
      },
      {
        question: $localize`:@@tpl.secret-santa.faq2.q:Does everyone need an account?`,
        answer:
          $localize`:@@tpl.secret-santa.faq2.a:No. The wheel runs in any browser with no signup, and a read-only public link lets everyone watch the same one without signing in.`,
      },
    ],
  },

  'random-letter': {
    slug: 'random-letter-generator',
    title: $localize`:@@tpl.random-letter.title:Random Letter Generator | Free A–Z Wheel`,
    description:
      $localize`:@@tpl.random-letter.desc:A free random letter generator: spin the A to Z wheel for word games, categories, spelling practice and writing prompts.`,
    heading: $localize`:@@tpl.random-letter.heading:Random Letter Generator`,
    intro:
      $localize`:@@tpl.random-letter.intro:Twenty-six letters, one spin. It is the starting gun for half the word games ever invented — categories, Scattergories-style rounds, spelling practice, a writing prompt when the page is blank.`,
    sections: [
      {
        heading: $localize`:@@tpl.random-letter.s1.heading:For the games that need a letter`,
        body: $localize`:@@tpl.random-letter.s1.body:Name a country, an animal and a food starting with the letter it lands on; give a class a letter to spell words from; start a story with it. The wheel is doing something a generator also does, with the difference that everyone playing watched it land.`,
      },
      {
        heading: $localize`:@@tpl.random-letter.s2.heading:Drop the awkward letters`,
        body: $localize`:@@tpl.random-letter.s2.body:Copy the wheel and remove Q, X and Z if the game keeps grinding to a halt on them — or keep them and make them worth double. Vowels only, consonants only and a shortened alphabet for younger children are all a few edits away.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.random-letter.faq1.q:Are all 26 letters equally likely?`,
        answer:
          $localize`:@@tpl.random-letter.faq1.a:Yes, every letter is one slice of the same size, and the spin uses a cryptographic random source. No letter is weighted unless you add it twice.`,
      },
      {
        question: $localize`:@@tpl.random-letter.faq2.q:The letters look small — can I make them bigger?`,
        answer:
          $localize`:@@tpl.random-letter.faq2.a:Twenty-six slices is a lot for one wheel. Removing letters you do not need makes the rest larger, and the linear and card views show the same wheel with more room for each label.`,
      },
    ],
  },

  'random-country': {
    slug: 'random-country-wheel',
    title: $localize`:@@tpl.random-country.title:Random Country Wheel | Free Country Picker`,
    description:
      $localize`:@@tpl.random-country.desc:A free random country picker: spin the wheel for geography lessons, quiz rounds, travel ideas and language practice.`,
    heading: $localize`:@@tpl.random-country.heading:Random Country Wheel`,
    intro:
      $localize`:@@tpl.random-country.intro:A random country is a lesson plan, a quiz round and a travel daydream in one spin. Put the ones you want on the wheel and let it choose where the conversation goes.`,
    sections: [
      {
        heading: $localize`:@@tpl.random-country.s1.heading:In a classroom or a pub quiz`,
        body: $localize`:@@tpl.random-country.s1.body:Spin for the country a student has to present, the flag the table has to name, or the capital city nobody can remember. Narrow the wheel to one continent when the topic is narrower — a wheel of twelve African countries teaches more than a wheel of the whole world.`,
      },
      {
        heading: $localize`:@@tpl.random-country.s2.heading:Or for deciding where to go`,
        body: $localize`:@@tpl.random-country.s2.body:The same wheel works as a travel shortlist when a group cannot agree. Put the countries you would actually visit on it, spin, and the discussion moves on from "where" to "when".`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.random-country.faq1.q:Can I choose which countries are on the wheel?`,
        answer:
          $localize`:@@tpl.random-country.faq1.a:Yes. Copy the wheel and replace the entries with any list you like — a continent, the countries in a syllabus, or the five places on your shortlist.`,
      },
      {
        question: $localize`:@@tpl.random-country.faq2.q:Can I show flags instead of names?`,
        answer:
          $localize`:@@tpl.random-country.faq2.a:Flag emoji work as entries, and each slice can also take its own image if you want the wheel to be pictures rather than words.`,
      },
    ],
  },

  'random-animal': {
    slug: 'random-animal-wheel',
    title: $localize`:@@tpl.random-animal.title:Random Animal Wheel | Free Animal Picker Spinner`,
    description:
      $localize`:@@tpl.random-animal.desc:A free random animal generator for charades, drawing games and classrooms. Spin the wheel and act out, draw or describe whatever it lands on.`,
    heading: $localize`:@@tpl.random-animal.heading:Random Animal Wheel`,
    intro:
      $localize`:@@tpl.random-animal.intro:Give a child a random animal and you have a game: act it out, draw it, make its noise, say three facts about it. The wheel is the part that keeps it fair and stops anyone choosing the easy one.`,
    sections: [
      {
        heading: $localize`:@@tpl.random-animal.s1.heading:Charades, drawing and guessing games`,
        body: $localize`:@@tpl.random-animal.s1.body:The wheel hands out the animal so the person whose turn it is does not get to pick something easy. It works the same for a class of thirty and for two children at a kitchen table, and needs nothing but a screen.`,
      },
      {
        heading: $localize`:@@tpl.random-animal.s2.heading:Match it to what you are teaching`,
        body: $localize`:@@tpl.random-animal.s2.body:Copy the wheel and swap in the animals from the topic you are on — habitats, farm animals, minibeasts, the ones in the book you are reading. A wheel built around a lesson is worth more than a generic one.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.random-animal.faq1.q:Can I use pictures instead of names?`,
        answer:
          $localize`:@@tpl.random-animal.faq1.a:Yes. Each slice can carry its own image, which is what you want for children who are not reading yet.`,
      },
      {
        question: $localize`:@@tpl.random-animal.faq2.q:Can I make the wheel easier for younger children?`,
        answer:
          $localize`:@@tpl.random-animal.faq2.a:Fewer entries means bigger slices and simpler choices. A six-animal wheel is easier to play with than a twenty-animal one.`,
      },
    ],
  },

  'date-night': {
    slug: 'date-night-ideas-wheel',
    title: $localize`:@@tpl.date-night.title:Date Night Ideas Wheel | Free Date Night Spinner`,
    description:
      $localize`:@@tpl.date-night.desc:Out of date night ideas? Spin the wheel and let it plan the evening. Free, no signup, and you can fill it with the things you both actually want to do.`,
    heading: $localize`:@@tpl.date-night.heading:Date Night Ideas Wheel`,
    intro:
      $localize`:@@tpl.date-night.intro:"What do you want to do?" "I don’t mind." Two people who both do not mind will get to the end of the evening having done nothing. A wheel picks, and the evening starts on time.`,
    sections: [
      {
        heading: $localize`:@@tpl.date-night.s1.heading:Put your own ideas on it`,
        body: $localize`:@@tpl.date-night.s1.body:The stock ideas are a starting point; the wheel becomes useful when it holds the things you keep saying you should do and never book. Add the restaurant you walked past, the film neither of you has watched, the walk you meant to take.`,
      },
      {
        heading: $localize`:@@tpl.date-night.s2.heading:Keep a cheap wheel and an expensive one`,
        body: $localize`:@@tpl.date-night.s2.body:One wheel for a free Tuesday and one for a proper night out is the split most couples land on. Both stay saved, so the choice is which wheel to spin rather than what to do.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.date-night.faq1.q:Can we both see the same wheel?`,
        answer:
          $localize`:@@tpl.date-night.faq1.a:Publish it as a read-only public link and it opens in any browser, on either phone, with no account needed.`,
      },
      {
        question: $localize`:@@tpl.date-night.faq2.q:Can I add ideas over time?`,
        answer:
          $localize`:@@tpl.date-night.faq2.a:Yes — the wheel is editable whenever you like, so it grows as you think of things. It stays on your device, and signing in syncs it across your devices.`,
      },
    ],
  },

  'where-to-travel': {
    slug: 'where-to-travel-wheel',
    title: $localize`:@@tpl.where-to-travel.title:Where to Travel Wheel | Random Destination Picker`,
    description:
      $localize`:@@tpl.where-to-travel.desc:A free random destination picker: put your travel shortlist on the wheel, spin, and stop rereading the same three tabs.`,
    heading: $localize`:@@tpl.where-to-travel.heading:Where to Travel Wheel`,
    intro:
      $localize`:@@tpl.where-to-travel.intro:A travel shortlist that never gets shorter is not a shortlist. Put the places on a wheel, agree in advance that the spin decides, and the trip stops being a discussion and becomes a date in a calendar.`,
    sections: [
      {
        heading: $localize`:@@tpl.where-to-travel.s1.heading:Shortlist first, spin second`,
        body: $localize`:@@tpl.where-to-travel.s1.body:The wheel is not there to pick from every city on earth — it is there to close a list you have already agreed on. Six to ten places everyone would genuinely be happy with is the version that works; anything longer and somebody will want to re-spin.`,
      },
      {
        heading: $localize`:@@tpl.where-to-travel.s2.heading:For groups who never decide`,
        body: $localize`:@@tpl.where-to-travel.s2.body:Group trips die in the planning. Spinning in front of everybody makes the decision collective without a vote, and nobody ends up responsible for the choice — which is usually the real reason nobody wants to make it.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.where-to-travel.faq1.q:Can I weight the wheel towards cheaper destinations?`,
        answer:
          $localize`:@@tpl.where-to-travel.faq1.a:Add a place more than once and it takes more slices, so it comes up more often. That is all weighting is here.`,
      },
      {
        question: $localize`:@@tpl.where-to-travel.faq2.q:Can I share the wheel with the people I am travelling with?`,
        answer:
          $localize`:@@tpl.where-to-travel.faq2.a:Yes. A read-only public link opens in any browser with no account, so everyone can see the shortlist and the spin.`,
      },
    ],
  },

  'instagram-giveaway': {
    slug: 'instagram-giveaway-picker',
    title: $localize`:@@tpl.instagram-giveaway.title:Instagram Giveaway Picker | Random Comment Winner Wheel`,
    description:
      $localize`:@@tpl.instagram-giveaway.desc:Pick a random Instagram giveaway winner on camera: paste the usernames from the comments, spin the wheel, share the result. Free, no signup.`,
    heading: $localize`:@@tpl.instagram-giveaway.heading:Instagram Giveaway Picker`,
    intro:
      $localize`:@@tpl.instagram-giveaway.intro:Followers trust a draw they can see. Paste the usernames of everyone who entered, spin the wheel on a story or a live, and the winner is picked in front of the people who took part. The spin uses your browser’s cryptographic random source, so nobody — you included — can steer it.`,
    sections: [
      {
        heading: $localize`:@@tpl.instagram-giveaway.s1.heading:From comments to wheel in a minute`,
        body: $localize`:@@tpl.instagram-giveaway.s1.body:Copy the usernames of valid entries, one per line, and paste the whole list into the wheel at once. Someone who earned extra entries — a tag, a share — simply goes on the list more than once and gets that many slices. The same list works for TikTok, Facebook or YouTube giveaways.`,
      },
      {
        heading: $localize`:@@tpl.instagram-giveaway.s2.heading:Proof you can post`,
        body: $localize`:@@tpl.instagram-giveaway.s2.body:Record your screen while you spin, or let Wheelr do it: the winner card can save an image of the result or a short vertical video replaying the spin, ready for a story or a post announcing the winner.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.instagram-giveaway.faq1.q:Does Wheelr read the comments from Instagram automatically?`,
        answer:
          $localize`:@@tpl.instagram-giveaway.faq1.a:No. Wheelr never connects to your Instagram account: you paste the usernames yourself, which also lets you remove entries that broke the rules before the draw. Wheelr is not affiliated with Instagram or Meta.`,
      },
      {
        question: $localize`:@@tpl.instagram-giveaway.faq2.q:How do I pick more than one winner?`,
        answer:
          $localize`:@@tpl.instagram-giveaway.faq2.a:After each spin, remove the winner from the wheel and spin again. Every winner is added to the winners list, so the full result stays on screen.`,
      },
    ],
  },

  'who-pays': {
    slug: 'who-pays-wheel',
    title: $localize`:@@tpl.who-pays.title:Who Pays Wheel | Decide Who Pays the Bill at Random`,
    description:
      $localize`:@@tpl.who-pays.desc:Spin the who pays wheel to settle the coffee round or the dinner bill. Free, fair and fast — nobody can argue with a spin everyone watched.`,
    heading: $localize`:@@tpl.who-pays.heading:Who Pays? Wheel`,
    intro:
      $localize`:@@tpl.who-pays.intro:The coffee round, the pizza order, the bill at the end of the night: someone has to pay, and nobody wants to be the one who suggests it should be them. Put everyone’s name on the wheel, spin it at the table, and the wheel takes the blame.`,
    sections: [
      {
        heading: $localize`:@@tpl.who-pays.s1.heading:Fair because everyone watched`,
        body: $localize`:@@tpl.who-pays.s1.body:A spin on a phone in the middle of the table is a decision the whole group saw happen. There is no hidden choice and no “you always pick me”: the result comes from your browser’s cryptographic random source and nobody can steer it.`,
      },
      {
        heading: $localize`:@@tpl.who-pays.s2.heading:Turn it into a rotation`,
        body: $localize`:@@tpl.who-pays.s2.body:For the office coffee run, remove whoever paid after each spin. The wheel shrinks until everyone has had a turn, then you put the names back and start again — a random rota that nobody has to keep track of.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.who-pays.faq1.q:Can the same person lose twice in a row?`,
        answer:
          $localize`:@@tpl.who-pays.faq1.a:Yes, if they stay on the wheel — every spin is independent. If you want a rotation instead, remove the winner after each spin so nobody pays again until everyone has.`,
      },
      {
        question: $localize`:@@tpl.who-pays.faq2.q:Does it work offline, at a restaurant?`,
        answer:
          $localize`:@@tpl.who-pays.faq2.a:The Android app works without a connection. On the web, the page keeps working once it has loaded, and your wheel stays saved on the device.`,
      },
    ],
  },

  'classroom-rewards': {
    slug: 'classroom-reward-wheel',
    title: $localize`:@@tpl.classroom-rewards.title:Classroom Reward Wheel | Free Prize Spinner for Teachers`,
    description:
      $localize`:@@tpl.classroom-rewards.desc:A free classroom reward wheel for teachers: rewards that cost nothing, picked by a spin on the board. Edit the prizes and reuse the wheel all year.`,
    heading: $localize`:@@tpl.classroom-rewards.heading:Classroom Reward Wheel`,
    intro:
      $localize`:@@tpl.classroom-rewards.intro:A reward is more exciting when nobody knows which one is coming. Put the classroom’s favourite privileges on the wheel, project it on the board, and let the student who earned it spin. The whole class watches, and the prize costs nothing.`,
    sections: [
      {
        heading: $localize`:@@tpl.classroom-rewards.s1.heading:Rewards that cost nothing`,
        body: $localize`:@@tpl.classroom-rewards.s1.body:Choosing the class game, being DJ for the lesson, sitting at the teacher’s desk: privileges work as well as prizes and never run out. Swap the stock rewards for the ones your class actually asks for — the wheel is yours to edit.`,
      },
      {
        heading: $localize`:@@tpl.classroom-rewards.s2.heading:One wheel for every class`,
        body: $localize`:@@tpl.classroom-rewards.s2.body:Keep a separate wheel for each class or age group; they all stay saved in your browser, and signing in syncs them between the classroom computer and your own. Nothing is shared unless you publish a link.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.classroom-rewards.faq1.q:Do students need an account to use it?`,
        answer:
          $localize`:@@tpl.classroom-rewards.faq1.a:No. The wheel runs in the teacher’s browser with no account and no student data. To let students open it on their own devices, publish it as a read-only link.`,
      },
      {
        question: $localize`:@@tpl.classroom-rewards.faq2.q:Can I make some rewards rarer than others?`,
        answer:
          $localize`:@@tpl.classroom-rewards.faq2.a:Add the common rewards more than once and they take more slices, so they come up more often. A reward that appears only once is the rare one.`,
      },
    ],
  },

  'fantasy-draft': {
    slug: 'fantasy-draft-order-generator',
    title: $localize`:@@tpl.fantasy-draft.title:Fantasy Draft Order Generator | Random Draft Order Wheel`,
    description:
      $localize`:@@tpl.fantasy-draft.desc:Randomize your fantasy football draft order live: put every team on the wheel, spin until it is empty, and share the result with the league.`,
    heading: $localize`:@@tpl.fantasy-draft.heading:Fantasy Draft Order Generator`,
    intro:
      $localize`:@@tpl.fantasy-draft.intro:Nothing starts a league season with more suspicion than a draft order the commissioner “randomized” on their own. Put every team on the wheel, spin it on the group call, and the order is settled in front of every manager.`,
    sections: [
      {
        heading: $localize`:@@tpl.fantasy-draft.s1.heading:Spin once per pick`,
        body: $localize`:@@tpl.fantasy-draft.s1.body:Turn on removing the winner, then spin: the first team drawn gets the first pick and leaves the wheel. Keep spinning until the wheel is empty. The winners list keeps the order on screen as it builds up, ready to screenshot.`,
      },
      {
        heading: $localize`:@@tpl.fantasy-draft.s2.heading:Any league, any size`,
        body: $localize`:@@tpl.fantasy-draft.s2.body:Replace the team placeholders with your managers’ names or team names. It works the same for fantasy football, basketball, baseball or any league with a draft — and for the calling order of an auction draft too.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.fantasy-draft.faq1.q:How do I prove the draft order was random?`,
        answer:
          $localize`:@@tpl.fantasy-draft.faq1.a:Spin it live on a video call or a stream, or save a short video of each spin from the winner card and post it in the league chat. Every spin uses your browser’s cryptographic random source.`,
      },
      {
        question: $localize`:@@tpl.fantasy-draft.faq2.q:Can the whole league see the wheel?`,
        answer:
          $localize`:@@tpl.fantasy-draft.faq2.a:Publish it as a read-only public link and anyone can open it in a browser, with no account, to check the teams on it before the draw.`,
      },
    ],
  },

  'random-color': {
    slug: 'random-color-wheel',
    title: $localize`:@@tpl.random-color.title:Random Color Wheel | Spin for a Random Color`,
    description:
      $localize`:@@tpl.random-color.desc:Spin the random color wheel for art challenges, outfit games, party themes and classroom activities. Each slice is painted the color it names.`,
    heading: $localize`:@@tpl.random-color.heading:Random Color Wheel`,
    intro:
      $localize`:@@tpl.random-color.intro:Draw it in this color, wear something this color, find an object this color before the timer runs out. A color picked at random is the start of a surprising number of games, and every slice on this wheel is painted in the color it names.`,
    sections: [
      {
        heading: $localize`:@@tpl.random-color.s1.heading:Games that start with a color`,
        body: $localize`:@@tpl.random-color.s1.body:Art challenges with one color only, a scavenger hunt for something that matches, a party dress code decided on the day, a sorting game for younger children learning their colors. The wheel supplies the constraint; the fun is in what people do with it.`,
      },
      {
        heading: $localize`:@@tpl.random-color.s2.heading:Build your own palette`,
        body: $localize`:@@tpl.random-color.s2.body:Copy the wheel and change it: pastels only, the colors of a brand, the paints you actually own. You can set the color of each slice yourself, so the wheel always shows the color it will pick.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.random-color.faq1.q:Can I use hex codes instead of color names?`,
        answer:
          $localize`:@@tpl.random-color.faq1.a:Yes. An entry is just text, so “#FF5733” works as well as “Orange”; set that slice to the same color and the wheel shows exactly what it picked.`,
      },
      {
        question: $localize`:@@tpl.random-color.faq2.q:Is every color equally likely?`,
        answer:
          $localize`:@@tpl.random-color.faq2.a:Yes — all slices are the same size and the spin uses your browser’s cryptographic random source. Add a color twice to make it come up more often.`,
      },
    ],
  },

  'what-to-draw': {
    slug: 'what-to-draw-wheel',
    title: $localize`:@@tpl.what-to-draw.title:What to Draw Wheel | Random Drawing Prompt Generator`,
    description:
      $localize`:@@tpl.what-to-draw.desc:Stuck on what to draw? Spin the wheel for a random drawing prompt and start sketching. Add your own ideas and keep a wheel for every sketchbook.`,
    heading: $localize`:@@tpl.what-to-draw.heading:What to Draw Wheel`,
    intro:
      $localize`:@@tpl.what-to-draw.intro:The hardest part of drawing is often deciding what to draw. Spin the wheel, accept whatever it lands on, and the blank page stops being a choice and becomes a starting point.`,
    sections: [
      {
        heading: $localize`:@@tpl.what-to-draw.s1.heading:Make the prompts yours`,
        body: $localize`:@@tpl.what-to-draw.s1.body:The stock prompts are a warm-up. Replace them with the things you want to practise — hands, reflections, a character from your comic — or build a themed wheel for a month of daily sketches.`,
      },
      {
        heading: $localize`:@@tpl.what-to-draw.s2.heading:Combine two wheels`,
        body: $localize`:@@tpl.what-to-draw.s2.body:Show up to four wheels side by side: one for the subject, one for the style, one for the color. “A lighthouse, in ink, only blue” is a far better prompt than any single list can give you.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.what-to-draw.faq1.q:Is it good for art classes?`,
        answer:
          $localize`:@@tpl.what-to-draw.faq1.a:Yes. Project it on the board and spin once for the whole class, or publish it as a link so every student can spin their own prompt. No accounts are needed.`,
      },
      {
        question: $localize`:@@tpl.what-to-draw.faq2.q:Can I avoid getting the same prompt twice?`,
        answer:
          $localize`:@@tpl.what-to-draw.faq2.a:Remove the prompt after you draw it and the wheel only offers the ones you have not done yet.`,
      },
    ],
  },

  'spin-the-bottle': {
    slug: 'spin-the-bottle',
    title: $localize`:@@tpl.spin-the-bottle.title:Spin the Bottle Online | Free Spin the Bottle Wheel`,
    description:
      $localize`:@@tpl.spin-the-bottle.desc:Play spin the bottle online with a free wheel: add the players’ names, spin, and see who it points to. Works on any phone, no bottle and no signup.`,
    heading: $localize`:@@tpl.spin-the-bottle.heading:Spin the Bottle Online`,
    intro:
      $localize`:@@tpl.spin-the-bottle.intro:The party classic, minus the bottle rolling under the sofa. Put everyone’s name on the wheel, set the phone in the middle of the circle and spin. It stops on one name, clearly, with no arguing about which way the neck was pointing.`,
    sections: [
      {
        heading: $localize`:@@tpl.spin-the-bottle.s1.heading:Make up your own rules`,
        body: $localize`:@@tpl.spin-the-bottle.s1.body:The wheel only picks a person; what happens next is up to the group. Truth or dare, a question, a compliment, a silly challenge — pair it with another wheel of tasks and let two spins decide who does what.`,
      },
      {
        heading: $localize`:@@tpl.spin-the-bottle.s2.heading:Nobody gets picked twice in a row`,
        body: $localize`:@@tpl.spin-the-bottle.s2.body:Remove whoever was picked after each spin and everyone gets a turn before anyone goes again. Put the names back when the wheel is empty and the next round starts.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.spin-the-bottle.faq1.q:Can I play spin the bottle online with friends on a call?`,
        answer:
          $localize`:@@tpl.spin-the-bottle.faq1.a:Yes. Share your screen, or publish the wheel as a read-only link so everyone can watch the same wheel in their own browser.`,
      },
      {
        question: $localize`:@@tpl.spin-the-bottle.faq2.q:How many players can I add?`,
        answer:
          $localize`:@@tpl.spin-the-bottle.faq2.a:As many as you like — paste the whole list at once. With large groups each name just gets a thinner slice.`,
      },
    ],
  },

  'zodiac-sign': {
    slug: 'random-zodiac-sign-wheel',
    title: $localize`:@@tpl.zodiac-sign.title:Random Zodiac Sign Wheel | Spin for a Star Sign`,
    description:
      $localize`:@@tpl.zodiac-sign.desc:Spin the zodiac wheel for a random star sign: all twelve signs, from Aries to Pisces. Free for party games, writing prompts, quizzes and classrooms.`,
    heading: $localize`:@@tpl.zodiac-sign.heading:Random Zodiac Sign Wheel`,
    intro:
      $localize`:@@tpl.zodiac-sign.intro:Twelve signs, one spin. Use it to give a character a star sign, to pick the next horoscope to read aloud, or to run a quiz round where everyone has to guess the dates. Every sign has the same chance of coming up.`,
    sections: [
      {
        heading: $localize`:@@tpl.zodiac-sign.s1.heading:Games with a star sign`,
        body: $localize`:@@tpl.zodiac-sign.s1.body:Guess the dates of the sign, name a famous person born under it, or act out its symbol. For writers, a random sign is a quick way to decide how a character sees the world before you know anything else about them.`,
      },
      {
        heading: $localize`:@@tpl.zodiac-sign.s2.heading:Twelve slices, equal odds`,
        body: $localize`:@@tpl.zodiac-sign.s2.body:Each sign takes one slice of the same size, and the spin uses your browser’s cryptographic random source. Remove a sign after it comes up to go through all twelve without repeats.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.zodiac-sign.faq1.q:Is this a horoscope?`,
        answer:
          $localize`:@@tpl.zodiac-sign.faq1.a:No — the wheel picks a sign at random, it does not predict anything. What you do with the sign is up to you.`,
      },
      {
        question: $localize`:@@tpl.zodiac-sign.faq2.q:Can I add the Chinese zodiac animals instead?`,
        answer:
          $localize`:@@tpl.zodiac-sign.faq2.a:Yes. Copy the wheel and replace the entries with the twelve animals, or any other list you like.`,
      },
    ],
  },

  'baby-names': {
    slug: 'baby-name-generator-wheel',
    title: $localize`:@@tpl.baby-names.title:Baby Name Generator Wheel | Pick From Your Shortlist`,
    description:
      $localize`:@@tpl.baby-names.desc:Stuck between baby names? Put your shortlist on the wheel and spin. A free baby name picker that helps you notice which name you were hoping for.`,
    heading: $localize`:@@tpl.baby-names.heading:Baby Name Generator Wheel`,
    intro:
      $localize`:@@tpl.baby-names.intro:Choosing a name can go on for months. Put the names you both like on the wheel and spin: the useful part is often not the result, but the moment it lands and you realise whether you were hoping for that name or another one.`,
    sections: [
      {
        heading: $localize`:@@tpl.baby-names.s1.heading:Your shortlist, not ours`,
        body: $localize`:@@tpl.baby-names.s1.body:The names on the wheel are just an example. Replace them with your own shortlist — first names, middle names, or combinations of both — and keep separate wheels for different ideas.`,
      },
      {
        heading: $localize`:@@tpl.baby-names.s2.heading:Spin it with the family`,
        body: $localize`:@@tpl.baby-names.s2.body:Publish the wheel as a read-only link and grandparents or friends can spin it from their own phone. It is a gentle way to share a shortlist without asking everyone to vote.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.baby-names.faq1.q:Should we really let a wheel choose our baby’s name?`,
        answer:
          $localize`:@@tpl.baby-names.faq1.a:Only if you want to. Most parents use it to break a tie or to see how they feel when a name comes up — the decision stays yours.`,
      },
      {
        question: $localize`:@@tpl.baby-names.faq2.q:Can I give our favourite name better odds?`,
        answer:
          $localize`:@@tpl.baby-names.faq2.a:Add it more than once and it gets more slices, so it comes up more often.`,
      },
    ],
  },

  'pet-names': {
    slug: 'pet-name-generator-wheel',
    title: $localize`:@@tpl.pet-names.title:Pet Name Generator Wheel | Name Your Dog or Cat`,
    description:
      $localize`:@@tpl.pet-names.desc:A free pet name generator wheel: spin for a name for your new puppy, kitten or rabbit, or put your family’s ideas on it and let the wheel settle it.`,
    heading: $localize`:@@tpl.pet-names.heading:Pet Name Generator Wheel`,
    intro:
      $localize`:@@tpl.pet-names.intro:A new pet arrives and everybody in the house has a different favourite name. Put all the ideas on the wheel, spin it together, and the name is picked fairly — which matters when the children are the ones voting.`,
    sections: [
      {
        heading: $localize`:@@tpl.pet-names.s1.heading:Everyone adds one name`,
        body: $localize`:@@tpl.pet-names.s1.body:Let each member of the family add their favourite, then spin. Nobody wins the argument; the wheel does. If the result falls flat, remove it and spin again — it is your pet, after all.`,
      },
      {
        heading: $localize`:@@tpl.pet-names.s2.heading:Ideas to start from`,
        body: $localize`:@@tpl.pet-names.s2.body:The stock names are some of the most popular for dogs and cats. Replace them with names that suit your animal: food names, famous characters, or something to do with where you found them.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.pet-names.faq1.q:Does it work for any animal?`,
        answer:
          $localize`:@@tpl.pet-names.faq1.a:Yes. The wheel only holds names, so it works for a dog, a cat, a rabbit, a fish or a horse.`,
      },
      {
        question: $localize`:@@tpl.pet-names.faq2.q:Can the kids spin it on their own device?`,
        answer:
          $localize`:@@tpl.pet-names.faq2.a:Publish the wheel as a read-only link and it opens in any browser, with no account.`,
      },
    ],
  },

  'party-games': {
    slug: 'party-games-wheel',
    title: $localize`:@@tpl.party-games.title:Party Games Wheel | Random Party Game Picker`,
    description:
      $localize`:@@tpl.party-games.desc:Spin the party games wheel and keep the fun going: charades, musical chairs, hot potato and more. Free for birthdays, sleepovers and family parties.`,
    heading: $localize`:@@tpl.party-games.heading:Party Games Wheel`,
    intro:
      $localize`:@@tpl.party-games.intro:The party slows down every time someone asks “what shall we play now?”. Put the games on the wheel, let the birthday child spin, and the next game starts without a debate.`,
    sections: [
      {
        heading: $localize`:@@tpl.party-games.s1.heading:Games that need nothing`,
        body: $localize`:@@tpl.party-games.s1.body:Every game on the stock wheel works with what is already in the room: some music, a few chairs, a cushion to pass around. Swap in the games your guests actually know and love.`,
      },
      {
        heading: $localize`:@@tpl.party-games.s2.heading:Big screen, big moment`,
        body: $localize`:@@tpl.party-games.s2.body:Put the wheel on the TV or a projector and turn on the countdown and the winner effects. The spin itself becomes part of the entertainment, especially for younger children.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.party-games.faq1.q:Is it suitable for kids’ parties?`,
        answer:
          $localize`:@@tpl.party-games.faq1.a:Yes. Everything on the stock wheel is suitable for children, and you can replace the games with ones that fit the age of your guests.`,
      },
      {
        question: $localize`:@@tpl.party-games.faq2.q:Can I stop a game from coming up twice?`,
        answer:
          $localize`:@@tpl.party-games.faq2.a:Remove each game after it has been played and the wheel only offers the ones that are left.`,
      },
    ],
  },

  'study-subject': {
    slug: 'study-subject-picker',
    title: $localize`:@@tpl.study-subject.title:What to Study Wheel | Random Study Subject Picker`,
    description:
      $localize`:@@tpl.study-subject.desc:Can’t decide what to revise first? Spin the study wheel for your next subject and start studying instead of planning. Free, no signup.`,
    heading: $localize`:@@tpl.study-subject.heading:What to Study Wheel`,
    intro:
      $localize`:@@tpl.study-subject.intro:Planning what to revise can take longer than the revision itself. Put your subjects on the wheel, spin, and start on whatever it picks for the next study session. The decision is made; now only the work is left.`,
    sections: [
      {
        heading: $localize`:@@tpl.study-subject.s1.heading:One spin per session`,
        body: $localize`:@@tpl.study-subject.s1.body:Pair the wheel with a timer: spin, study that subject for 25 minutes, take a break, spin again. Remove a subject once it is covered for the day, so the wheel keeps pushing you through the whole list.`,
      },
      {
        heading: $localize`:@@tpl.study-subject.s2.heading:Weight the hard subjects`,
        body: $localize`:@@tpl.study-subject.s2.body:The subject you keep avoiding is usually the one that needs the most time. Add it to the wheel twice and it will come up more often.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.study-subject.faq1.q:Can I use it for study groups?`,
        answer:
          $localize`:@@tpl.study-subject.faq1.a:Yes. Share your screen or publish the wheel as a link, and the group spins to decide which topic to go through next.`,
      },
      {
        question: $localize`:@@tpl.study-subject.faq2.q:Does it save my subjects?`,
        answer:
          $localize`:@@tpl.study-subject.faq2.a:Your wheel stays saved in your browser. Signing in syncs it across your devices.`,
      },
    ],
  },

  'random-hobby': {
    slug: 'random-hobby-generator',
    title: $localize`:@@tpl.random-hobby.title:Random Hobby Generator | Spin for a New Hobby`,
    description:
      $localize`:@@tpl.random-hobby.desc:A free random hobby generator: spin the wheel for a new hobby to try this month, from baking and chess to pottery and birdwatching.`,
    heading: $localize`:@@tpl.random-hobby.heading:Random Hobby Generator`,
    intro:
      $localize`:@@tpl.random-hobby.intro:Wanting a new hobby is easy; picking one is where it stalls. Spin the wheel, commit to trying whatever it lands on for a month, and find out whether you like it by doing it rather than reading about it.`,
    sections: [
      {
        heading: $localize`:@@tpl.random-hobby.s1.heading:Try it for a month`,
        body: $localize`:@@tpl.random-hobby.s1.body:One month is long enough to get past the awkward start and short enough not to feel like a commitment. When the month is over, remove the hobby from the wheel and spin for the next one.`,
      },
      {
        heading: $localize`:@@tpl.random-hobby.s2.heading:Add the ones you keep thinking about`,
        body: $localize`:@@tpl.random-hobby.s2.body:The best hobby list is the one you already have in your head: the instrument in the cupboard, the class a friend keeps mentioning. Put those on the wheel next to the stock ideas.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.random-hobby.faq1.q:Are the hobbies expensive?`,
        answer:
          $localize`:@@tpl.random-hobby.faq1.a:Most of the stock hobbies can be started with very little. Replace any of them with ones that fit your budget and your space.`,
      },
      {
        question: $localize`:@@tpl.random-hobby.faq2.q:Can I use it with a partner or friends?`,
        answer:
          $localize`:@@tpl.random-hobby.faq2.a:Yes — spin it together and try the same hobby as a group, or keep one wheel each.`,
      },
    ],
  },

  'bored': {
    slug: 'what-to-do-when-bored-wheel',
    title: $localize`:@@tpl.bored.title:What to Do When Bored Wheel | Boredom Buster Spinner`,
    description:
      $localize`:@@tpl.bored.desc:Bored and out of ideas? Spin the boredom wheel for something to do right now, indoors or out. Free, no signup, and you can add your own ideas.`,
    heading: $localize`:@@tpl.bored.heading:What to Do When Bored Wheel`,
    intro:
      $localize`:@@tpl.bored.intro:Boredom is rarely a lack of things to do — it is not being able to pick one. Spin the wheel, do the first thing it says for ten minutes, and see where it takes you.`,
    sections: [
      {
        heading: $localize`:@@tpl.bored.s1.heading:Ten minutes, no excuses`,
        body: $localize`:@@tpl.bored.s1.body:Everything on the stock wheel can be started right now, without buying anything or going far. The rule that makes it work: whatever comes up, you do it for at least ten minutes.`,
      },
      {
        heading: $localize`:@@tpl.bored.s2.heading:A wheel for the kids`,
        body: $localize`:@@tpl.bored.s2.body:Build a version for the school holidays with activities your children can do on their own. Letting them spin it turns “I’m bored” into a game rather than a complaint.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.bored.faq1.q:Can I make an indoor and an outdoor version?`,
        answer:
          $localize`:@@tpl.bored.faq1.a:Yes. Keep two wheels and spin the one that suits the weather.`,
      },
      {
        question: $localize`:@@tpl.bored.faq2.q:Does it work offline?`,
        answer:
          $localize`:@@tpl.bored.faq2.a:The Android app works without a connection, and on the web the page keeps working once it has loaded.`,
      },
    ],
  },

  'self-care': {
    slug: 'self-care-wheel',
    title: $localize`:@@tpl.self-care.title:Self-Care Wheel | Random Self-Care Ideas Spinner`,
    description:
      $localize`:@@tpl.self-care.desc:Spin the self-care wheel for one small, kind thing to do for yourself today. Free, private, and you can fill it with the ideas that help you most.`,
    heading: $localize`:@@tpl.self-care.heading:Self-Care Wheel`,
    intro:
      $localize`:@@tpl.self-care.intro:On a hard day even choosing how to look after yourself can feel like one decision too many. Spin the wheel and let it pick one small thing — a glass of water, a walk, an early night. Small is the point.`,
    sections: [
      {
        heading: $localize`:@@tpl.self-care.s1.heading:Fill it with what works for you`,
        body: $localize`:@@tpl.self-care.s1.body:The stock ideas are simple and universal. Replace them with the things that genuinely help you: a particular song, a place you like to walk, a person you like to call.`,
      },
      {
        heading: $localize`:@@tpl.self-care.s2.heading:Private by default`,
        body: $localize`:@@tpl.self-care.s2.body:Your wheel is saved only in your own browser. Nothing leaves your device unless you choose to sign in and sync it, or publish it as a link.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.self-care.faq1.q:Is this a replacement for professional help?`,
        answer:
          $localize`:@@tpl.self-care.faq1.a:No. It is a small everyday tool. If you are struggling, please talk to someone you trust or to a health professional.`,
      },
      {
        question: $localize`:@@tpl.self-care.faq2.q:Can I use it every day?`,
        answer:
          $localize`:@@tpl.self-care.faq2.a:Yes. The wheel stays saved, so you can spin it each morning or whenever you need it.`,
      },
    ],
  },

  'what-to-cook': {
    slug: 'what-to-cook-wheel',
    title: $localize`:@@tpl.what-to-cook.title:What to Cook Wheel | Random Dinner Recipe Picker`,
    description:
      $localize`:@@tpl.what-to-cook.desc:Don’t know what to cook tonight? Spin the wheel for a dish and start cooking. Free, and you can fill it with the recipes you actually make.`,
    heading: $localize`:@@tpl.what-to-cook.heading:What to Cook Wheel`,
    intro:
      $localize`:@@tpl.what-to-cook.intro:Deciding what to cook is the part of cooking nobody enjoys. Put the dishes you know how to make on the wheel, spin it while the pan heats up, and dinner is decided.`,
    sections: [
      {
        heading: $localize`:@@tpl.what-to-cook.s1.heading:Your recipes, your wheel`,
        body: $localize`:@@tpl.what-to-cook.s1.body:The stock dishes are everyday classics. Replace them with your own repertoire, and the wheel becomes a way to stop cooking the same three meals every week.`,
      },
      {
        heading: $localize`:@@tpl.what-to-cook.s2.heading:Plan the whole week`,
        body: $localize`:@@tpl.what-to-cook.s2.body:Spin seven times, removing each dish as it comes up, and you have a week of dinners — and a shopping list to go with it.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.what-to-cook.faq1.q:Is this different from the “what to eat” wheel?`,
        answer:
          $localize`:@@tpl.what-to-cook.faq1.a:Yes. This one is for cooking at home; the what to eat wheel is for choosing a type of food or a restaurant.`,
      },
      {
        question: $localize`:@@tpl.what-to-cook.faq2.q:Can the whole family add dishes?`,
        answer:
          $localize`:@@tpl.what-to-cook.faq2.a:Share the wheel as a read-only link to show the list, and add the dishes everybody asks for.`,
      },
    ],
  },

  'superpower': {
    slug: 'random-superpower-generator',
    title: $localize`:@@tpl.superpower.title:Random Superpower Generator | Spin for a Superpower`,
    description:
      $localize`:@@tpl.superpower.desc:Spin the random superpower generator: flight, invisibility, time travel and more. Free for kids’ games, story writing, drawing and icebreakers.`,
    heading: $localize`:@@tpl.superpower.heading:Random Superpower Generator`,
    intro:
      $localize`:@@tpl.superpower.intro:Everyone has an answer to “which superpower would you pick?”. The wheel takes the choice away: spin, get your power, and then explain what you would do with it.`,
    sections: [
      {
        heading: $localize`:@@tpl.superpower.s1.heading:Games and stories`,
        body: $localize`:@@tpl.superpower.s1.body:Use it for a storytelling round where each player gets a power, a drawing challenge for a new hero, or a creative writing prompt. It is also a reliable icebreaker for classes and teams.`,
      },
      {
        heading: $localize`:@@tpl.superpower.s2.heading:Add weaknesses`,
        body: $localize`:@@tpl.superpower.s2.body:Show a second wheel next to it with a weakness for each hero. A hero who can fly but is afraid of heights makes a much better story.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.superpower.faq1.q:Is it good for classrooms?`,
        answer:
          $localize`:@@tpl.superpower.faq1.a:Yes. Project it on the board and let each student spin their power before a writing or drawing task.`,
      },
      {
        question: $localize`:@@tpl.superpower.faq2.q:Can I add my own powers?`,
        answer:
          $localize`:@@tpl.superpower.faq2.a:Copy the wheel and add as many as you like; every entry is editable.`,
      },
    ],
  },

  'charades': {
    slug: 'charades-ideas-wheel',
    title: $localize`:@@tpl.charades.title:Charades Ideas Wheel | Random Charades Generator`,
    description:
      $localize`:@@tpl.charades.desc:A free charades generator: spin the wheel for something to act out, with no words and no sounds. Great for family game nights and parties.`,
    heading: $localize`:@@tpl.charades.heading:Charades Ideas Wheel`,
    intro:
      $localize`:@@tpl.charades.intro:The hardest part of charades is thinking up what to act. Let the wheel do it: the player spins where only they can see the phone, gets their prompt, and starts acting.`,
    sections: [
      {
        heading: $localize`:@@tpl.charades.s1.heading:Keep the prompt secret`,
        body: $localize`:@@tpl.charades.s1.body:Spin on the actor’s phone rather than the big screen, so only they see the result. Remove each prompt once it has been guessed and the round never repeats.`,
      },
      {
        heading: $localize`:@@tpl.charades.s2.heading:Themed rounds`,
        body: $localize`:@@tpl.charades.s2.body:Keep a wheel for films, one for animals and one for jobs, and let the team pick the theme before the actor spins. Up to four wheels can be shown side by side.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.charades.faq1.q:Is it suitable for children?`,
        answer:
          $localize`:@@tpl.charades.faq1.a:Yes. The stock prompts are family friendly, and you can replace them with things younger children can act out easily.`,
      },
      {
        question: $localize`:@@tpl.charades.faq2.q:Can I use it with teams?`,
        answer:
          $localize`:@@tpl.charades.faq2.a:Yes. Put the team names on a second wheel to decide who goes next.`,
      },
    ],
  },

  'random-job': {
    slug: 'random-job-generator',
    title: $localize`:@@tpl.random-job.title:Random Job Generator | Spin for a Random Job`,
    description:
      $localize`:@@tpl.random-job.desc:A free random job generator wheel for role-play, writing, career days and guessing games. Spin for a job and step into the role.`,
    heading: $localize`:@@tpl.random-job.heading:Random Job Generator`,
    intro:
      $localize`:@@tpl.random-job.intro:Astronaut, detective, vet: a random job is a surprisingly good starting point. Spin for a role in a game of pretend, a character for a story, or a topic for a career-day talk.`,
    sections: [
      {
        heading: $localize`:@@tpl.random-job.s1.heading:Role-play and guessing games`,
        body: $localize`:@@tpl.random-job.s1.body:One player spins in secret and answers questions in character until the others guess the job. It works as a warm-up for classes, teams and language lessons.`,
      },
      {
        heading: $localize`:@@tpl.random-job.s2.heading:Career days`,
        body: $localize`:@@tpl.random-job.s2.body:Replace the stock jobs with the careers your class is exploring, and let each student spin the one they will research and present.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.random-job.faq1.q:Is it useful for language lessons?`,
        answer:
          $localize`:@@tpl.random-job.faq1.a:Yes. Guessing a job through questions is a classic speaking exercise, and the wheel keeps the prompts random.`,
      },
      {
        question: $localize`:@@tpl.random-job.faq2.q:Can I add more jobs?`,
        answer:
          $localize`:@@tpl.random-job.faq2.a:Copy the wheel and add as many as you like.`,
      },
    ],
  },

  'writing-prompts': {
    slug: 'writing-prompt-wheel',
    title: $localize`:@@tpl.writing-prompts.title:Writing Prompt Wheel | Random Story Prompt Generator`,
    description:
      $localize`:@@tpl.writing-prompts.desc:Spin the writing prompt wheel for a random story starter and start writing before you can overthink it. Free for writers, teachers and students.`,
    heading: $localize`:@@tpl.writing-prompts.heading:Writing Prompt Wheel`,
    intro:
      $localize`:@@tpl.writing-prompts.intro:A blank page gets easier with a constraint. Spin the wheel, take the prompt it lands on, and write the first line straight away — the prompt is a door, not a rule.`,
    sections: [
      {
        heading: $localize`:@@tpl.writing-prompts.s1.heading:For classrooms`,
        body: $localize`:@@tpl.writing-prompts.s1.body:Project the wheel and spin once for the whole class, or let each student spin their own. Removing each prompt after it is used means nobody writes the same story as their neighbour.`,
      },
      {
        heading: $localize`:@@tpl.writing-prompts.s2.heading:Combine wheels`,
        body: $localize`:@@tpl.writing-prompts.s2.body:Show a wheel of prompts next to a wheel of genres — mystery, comedy, science fiction — and a third for the setting. Three spins make a prompt no list can give you.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.writing-prompts.faq1.q:Can I add my own prompts?`,
        answer:
          $localize`:@@tpl.writing-prompts.faq1.a:Yes. Copy the wheel and replace or add prompts; the wheel stays saved for your next session.`,
      },
      {
        question: $localize`:@@tpl.writing-prompts.faq2.q:Is it free for schools?`,
        answer:
          $localize`:@@tpl.writing-prompts.faq2.a:Yes. There is no account, no subscription and no student data involved.`,
      },
    ],
  },

  'what-to-wear': {
    slug: 'what-to-wear-wheel',
    title: $localize`:@@tpl.what-to-wear.title:What to Wear Wheel | Random Outfit Challenge`,
    description:
      $localize`:@@tpl.what-to-wear.desc:Can’t decide what to wear? Spin the outfit wheel for a style challenge: a colour, a theme, a piece you never wear. Free, no signup.`,
    heading: $localize`:@@tpl.what-to-wear.heading:What to Wear Wheel`,
    intro:
      $localize`:@@tpl.what-to-wear.intro:A wardrobe full of clothes and nothing to wear. The wheel will not dress you, but it gives you a rule — all black, something red, stripes — and a rule is usually all it takes to get dressed.`,
    sections: [
      {
        heading: $localize`:@@tpl.what-to-wear.s1.heading:A challenge, not a uniform`,
        body: $localize`:@@tpl.what-to-wear.s1.body:The stock entries are prompts rather than outfits, so they work whatever is in your wardrobe. Spin in the morning, build the look around the prompt, and you have saved ten minutes.`,
      },
      {
        heading: $localize`:@@tpl.what-to-wear.s2.heading:Content for your feed`,
        body: $localize`:@@tpl.what-to-wear.s2.body:Outfit challenges are a popular format for stories and short videos. Spin on camera, then show the result — the winner card can save an image of the spin for your post.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.what-to-wear.faq1.q:Can I put my actual clothes on the wheel?`,
        answer:
          $localize`:@@tpl.what-to-wear.faq1.a:Yes. Add your tops, trousers or shoes as entries — or keep three wheels side by side, one for each.`,
      },
      {
        question: $localize`:@@tpl.what-to-wear.faq2.q:Does it work on my phone?`,
        answer:
          $localize`:@@tpl.what-to-wear.faq2.a:Yes, in any mobile browser, and as an Android app.`,
      },
    ],
  },

  'what-game-to-play': {
    slug: 'what-game-to-play-wheel',
    title: $localize`:@@tpl.what-game-to-play.title:What Game to Play Wheel | Random Video Game Picker`,
    description:
      $localize`:@@tpl.what-game-to-play.desc:Too many games in your library? Spin the wheel to pick what to play tonight — by genre or by title. Free, and a great segment on stream.`,
    heading: $localize`:@@tpl.what-game-to-play.heading:What Game to Play Wheel`,
    intro:
      $localize`:@@tpl.what-game-to-play.intro:A library of a hundred games and an evening spent scrolling through it. Put the genres — or the actual titles — on the wheel, spin once, and play whatever it picks.`,
    sections: [
      {
        heading: $localize`:@@tpl.what-game-to-play.s1.heading:Put your backlog on it`,
        body: $localize`:@@tpl.what-game-to-play.s1.body:The stock wheel uses genres; the version that really works holds the titles you own and never started. Paste the list in one go and let the wheel clear your backlog one spin at a time.`,
      },
      {
        heading: $localize`:@@tpl.what-game-to-play.s2.heading:Let chat decide on stream`,
        body: $localize`:@@tpl.what-game-to-play.s2.body:Spin live and let the wheel pick the next game in front of your viewers. The countdown, the sounds and the winner effects make the spin a small show of its own.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.what-game-to-play.faq1.q:Can I use it as a stream overlay?`,
        answer:
          $localize`:@@tpl.what-game-to-play.faq1.a:Yes. Capture the browser window in OBS or Streamlabs and spin it live.`,
      },
      {
        question: $localize`:@@tpl.what-game-to-play.faq2.q:Can viewers add games?`,
        answer:
          $localize`:@@tpl.what-game-to-play.faq2.a:Add their suggestions to the wheel before the spin — adding a title more than once gives it better odds.`,
      },
    ],
  },

  'heads-or-tails': {
    slug: 'heads-or-tails-wheel',
    title: $localize`:@@tpl.heads-or-tails.title:Heads or Tails Wheel | Online Coin Flip Spinner`,
    description:
      $localize`:@@tpl.heads-or-tails.desc:Flip a coin online with the heads or tails wheel: two sides, one spin, and a fair result everyone can watch. Free, no coin required.`,
    heading: $localize`:@@tpl.heads-or-tails.heading:Heads or Tails Wheel`,
    intro:
      $localize`:@@tpl.heads-or-tails.intro:No coin in your pocket? Spin the wheel instead. Heads and tails share the wheel equally, and the result comes from your browser’s cryptographic random source — as fair as a coin, and nobody can drop it.`,
    sections: [
      {
        heading: $localize`:@@tpl.heads-or-tails.s1.heading:Fair for both sides`,
        body: $localize`:@@tpl.heads-or-tails.s1.body:Each side is exactly half of the wheel, so the odds are exactly fifty-fifty. Unlike a real coin toss, nobody can claim it was thrown badly or landed on the edge.`,
      },
      {
        heading: $localize`:@@tpl.heads-or-tails.s2.heading:Best of three`,
        body: $localize`:@@tpl.heads-or-tails.s2.body:Keep the winners list open and every result is recorded on screen, which makes a best-of-three or best-of-five easy to follow.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.heads-or-tails.faq1.q:Is it really fifty-fifty?`,
        answer:
          $localize`:@@tpl.heads-or-tails.faq1.a:Yes. Heads and tails have the same number of slices, all the same size, and the spin uses a cryptographic random source.`,
      },
      {
        question: $localize`:@@tpl.heads-or-tails.faq2.q:Can I use it to decide who starts a game?`,
        answer:
          $localize`:@@tpl.heads-or-tails.faq2.a:Yes — that is one of the most common uses, along with choosing ends in sports matches.`,
      },
    ],
  },

  'punishment': {
    slug: 'punishment-wheel',
    title: $localize`:@@tpl.punishment.title:Punishment Wheel | Forfeit Spinner for Games & Streams`,
    description:
      $localize`:@@tpl.punishment.desc:Lost the round? Spin the punishment wheel for a harmless forfeit. Free for game nights, parties and live streams, and every forfeit is editable.`,
    heading: $localize`:@@tpl.punishment.heading:Punishment Wheel`,
    intro:
      $localize`:@@tpl.punishment.intro:A game is more fun when losing costs something. Put a few harmless forfeits on the wheel, and whoever loses the round spins for theirs — in front of everyone, with no way to negotiate.`,
    sections: [
      {
        heading: $localize`:@@tpl.punishment.s1.heading:Keep it harmless`,
        body: $localize`:@@tpl.punishment.s1.body:The best forfeits are embarrassing, not unpleasant: a song, a dance, an accent. The stock wheel sticks to those, and everything on it is safe for a family evening.`,
      },
      {
        heading: $localize`:@@tpl.punishment.s2.heading:A stream favourite`,
        body: $localize`:@@tpl.punishment.s2.body:Streamers use punishment wheels for lost matches and chat challenges. Spin live, and the fire or fireworks effect turns every loss into a moment.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.punishment.faq1.q:Can I add my own forfeits?`,
        answer:
          $localize`:@@tpl.punishment.faq1.a:Yes. Copy the wheel and replace any forfeit; keep them light enough that everybody still wants to play.`,
      },
      {
        question: $localize`:@@tpl.punishment.faq2.q:Can I give the mild ones better odds?`,
        answer:
          $localize`:@@tpl.punishment.faq2.a:Add a forfeit more than once and it takes more slices, so it comes up more often.`,
      },
    ],
  },

  'music-genre': {
    slug: 'random-music-genre-wheel',
    title: $localize`:@@tpl.music-genre.title:Random Music Genre Wheel | Spin for a Genre`,
    description:
      $localize`:@@tpl.music-genre.desc:Spin the random music genre wheel for tonight’s playlist, a party theme or something new to listen to. Free, and every genre is editable.`,
    heading: $localize`:@@tpl.music-genre.heading:Random Music Genre Wheel`,
    intro:
      $localize`:@@tpl.music-genre.intro:Your listening habits are probably stuck in the same three genres. Spin the wheel, commit to an evening of whatever it picks, and find the album you would never have chosen yourself.`,
    sections: [
      {
        heading: $localize`:@@tpl.music-genre.s1.heading:Playlists and parties`,
        body: $localize`:@@tpl.music-genre.s1.body:Spin for the theme of a party playlist, the genre of the next karaoke round, or the style a band has to play the next song in.`,
      },
      {
        heading: $localize`:@@tpl.music-genre.s2.heading:Go deeper`,
        body: $localize`:@@tpl.music-genre.s2.body:Once a genre comes up, show a second wheel of its sub-genres or decades next to it. Two spins take you from “jazz” to somewhere you have never been.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.music-genre.faq1.q:Can I add sub-genres?`,
        answer:
          $localize`:@@tpl.music-genre.faq1.a:Yes. Copy the wheel and add as many genres or sub-genres as you like.`,
      },
      {
        question: $localize`:@@tpl.music-genre.faq2.q:Can I add my own sounds to the spin?`,
        answer:
          $localize`:@@tpl.music-genre.faq2.a:Yes. You can upload your own spin and winner sounds in the sound settings.`,
      },
    ],
  },

  'halloween-costume': {
    slug: 'halloween-costume-wheel',
    title: $localize`:@@tpl.halloween-costume.title:Halloween Costume Wheel | Random Costume Generator`,
    description:
      $localize`:@@tpl.halloween-costume.desc:No Halloween costume yet? Spin the costume wheel and dress as whatever it picks: vampire, witch, zombie and more. Free, with a spooky effect.`,
    heading: $localize`:@@tpl.halloween-costume.heading:Halloween Costume Wheel`,
    intro:
      $localize`:@@tpl.halloween-costume.intro:Every October the same question: what are you going as? Spin the wheel and the costume is decided — then the only problem left is finding enough cardboard.`,
    sections: [
      {
        heading: $localize`:@@tpl.halloween-costume.s1.heading:Costumes you can make at home`,
        body: $localize`:@@tpl.halloween-costume.s1.body:Every costume on the stock wheel can be put together from things most houses already have: a sheet, some face paint, a stripy top. Swap in the characters your family loves.`,
      },
      {
        heading: $localize`:@@tpl.halloween-costume.s2.heading:Group and family costumes`,
        body: $localize`:@@tpl.halloween-costume.s2.body:Spin once for a theme the whole group follows, or let each person spin their own. Show two wheels side by side to combine a monster with a twist.`,
      },
    ],
    faq: [
      {
        question: $localize`:@@tpl.halloween-costume.faq1.q:Is it suitable for kids?`,
        answer:
          $localize`:@@tpl.halloween-costume.faq1.a:Yes. The stock costumes are classic and child friendly, and every entry can be replaced.`,
      },
      {
        question: $localize`:@@tpl.halloween-costume.faq2.q:Can I use it for a Halloween party?`,
        answer:
          $localize`:@@tpl.halloween-costume.faq2.a:Yes — spin for costumes, games or forfeits, and turn on the fire effect for the reveal.`,
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
