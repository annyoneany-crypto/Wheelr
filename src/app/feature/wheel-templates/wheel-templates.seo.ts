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
  'random-name-picker': {
    slug: 'random-name-picker',
    title: 'Random Name Picker | Free Name Wheel Spinner',
    description:
      'A free random name picker for classrooms, meetings and calls. Paste your list, spin the wheel, and the name is chosen in front of everyone.',
    heading: 'Random Name Picker',
    intro:
      'Calling on someone is the moment a room decides whether you are fair. A wheel takes the choice out of your hands: the name is drawn in front of everybody, so nobody is picked on and nobody is skipped.',
    sections: [
      {
        heading: 'Paste the register and go',
        body: 'Add the whole list in one go rather than typing names one at a time, shuffle it, and start spinning. A teacher can set this up between two lessons, and the same wheel stays saved for the rest of the term.',
      },
      {
        heading: 'Nobody twice, or everybody eventually',
        body: 'Remove each name after it is drawn and the wheel works through the class without repeats — which is how you make sure the quiet students get their turn too. Leave the names in and it stays a lottery, better for handing out a single prize.',
      },
    ],
    faq: [
      {
        question: 'How many names can the picker hold?',
        answer:
          'A full class fits comfortably. Past roughly thirty entries the labels on the wheel get thin, so very long lists are easier to read split across a few wheels.',
      },
      {
        question: 'Can I stop a name from being picked twice?',
        answer:
          'Yes. Turn on removing the winner after each spin and each name is drawn at most once, so consecutive spins work through the whole list.',
      },
    ],
  },

  'would-you-rather': {
    slug: 'would-you-rather-wheel',
    title: 'Would You Rather Wheel | Free Question Spinner',
    description:
      'A free would you rather wheel: spin for an impossible choice and make everyone defend their answer. Add your own questions in seconds.',
    heading: 'Would You Rather Wheel',
    intro:
      'The hard part of would you rather is thinking of a question that nobody has heard before. Let the wheel hold the questions, and the game runs itself — spin, read it out, go round the group.',
    sections: [
      {
        heading: 'Good for a queue, a car or a classroom',
        body: 'It needs no setup and no props, which is why it works in the places where a game normally cannot start: waiting somewhere, a long drive, the last ten minutes of a lesson. One phone passed around is enough.',
      },
      {
        heading: 'Write the questions for your group',
        body: 'Copy the wheel and replace the entries with dilemmas aimed at the people playing — in-jokes, work scenarios, questions only your friends would find funny. A wheel written by the group is always better than a generic list.',
      },
    ],
    faq: [
      {
        question: 'Can I add my own would you rather questions?',
        answer:
          'Yes. Copy the wheel, replace the entries with your own, and your version is saved on your device for the next time you play.',
      },
      {
        question: 'How do I keep it suitable for kids?',
        answer:
          'Write the wheel in advance with the questions you are happy with. Because the wheel only ever offers what is written on it, there are no surprises mid-game.',
      },
    ],
  },

  'never-have-i-ever': {
    slug: 'never-have-i-ever-wheel',
    title: 'Never Have I Ever Wheel | Free Party Game Spinner',
    description:
      'A free never have I ever wheel for game nights. Spin for the prompt, see who owns up, and add your own statements whenever you like.',
    heading: 'Never Have I Ever Wheel',
    intro:
      'Never have I ever stalls the moment somebody has to invent the next statement. Put them on a wheel and the game keeps its rhythm: spin, read it out, watch who gives themselves away.',
    sections: [
      {
        heading: 'The wheel is the host',
        body: 'Nobody has to run the game, which also means nobody can aim a statement at one person in particular. The wheel picking at random is what keeps it light — everyone is exposed by chance rather than by the person whose turn it was.',
      },
      {
        heading: 'Build your own set',
        body: 'The default statements are mild on purpose. Copy the wheel and write your own for the group you are playing with, and keep more than one version — a work-party wheel and a close-friends wheel are not the same list.',
      },
    ],
    faq: [
      {
        question: 'How many players does it work with?',
        answer:
          'Any number. The wheel only picks the statement; how you score it — fingers down, points, forfeits — is up to the group.',
      },
      {
        question: 'Can everyone see the wheel at once?',
        answer:
          'Share it as a read-only public link and everyone opens the same wheel in their own browser, or put one screen in the middle of the table.',
      },
    ],
  },

  'chore-wheel': {
    slug: 'chore-wheel',
    title: 'Chore Wheel | Free Chore Chart Spinner',
    description:
      'A free chore wheel for housemates and families. Spin to assign the washing up, the bins and everything nobody volunteers for — without the argument.',
    heading: 'Chore Wheel',
    intro:
      'Every shared house has the same argument, and it is never really about the dishes. A wheel settles it without anyone having to be the one who decided: spin, read the result, it is done.',
    sections: [
      {
        heading: 'Chores or people — pick a side',
        body: 'Put the chores on the wheel and spin once per person, or put the housemates on it and spin once per chore. The second version is better when one job is far worse than the others, because everybody watches that particular spin.',
      },
      {
        heading: 'Make it weekly',
        body: 'Add a "day off" slice so there is something to hope for, and remove each chore once it is assigned so the wheel shares out the whole list. Keep the wheel saved and re-spin it every Sunday — the routine is what stops the argument coming back.',
      },
    ],
    faq: [
      {
        question: 'Can I add or remove chores?',
        answer:
          'Yes. Copy the wheel and edit the entries to match your household — the version you make is saved on your device.',
      },
      {
        question: 'Can I make one chore rarer than the others?',
        answer:
          'The odds are just the slices. Repeat the chores you want to come up more often and leave the worst one as a single slice.',
      },
    ],
  },

  'secret-santa': {
    slug: 'secret-santa-wheel',
    title: 'Secret Santa Wheel | Free Gift Exchange Name Draw',
    description:
      'Draw Secret Santa names with a wheel instead of a hat. Free, works for an office or a family, and everyone sees the draw happen.',
    heading: 'Secret Santa Wheel',
    intro:
      'A hat full of folded paper only works when everyone is in the same room. A wheel draws the names in front of whoever is watching — in the office, on a call, or in a group chat with the screen shared.',
    sections: [
      {
        heading: 'How to run the draw',
        body: 'Put every participant on the wheel and spin once for each giver, removing each name as it comes out so nobody is assigned twice. The winners list keeps the order the names were drawn in, which is the record you check when somebody forgets who they had.',
      },
      {
        heading: 'Keeping it secret',
        body: 'The catch with a public draw is that it is public. For a genuinely secret exchange, spin privately for each person and tell them their name individually — the wheel is doing the randomising, not the announcing.',
      },
    ],
    faq: [
      {
        question: 'Can the wheel avoid pairing someone with themselves?',
        answer:
          'Remove the giver’s own name from the wheel before their spin, and remove each drawn name afterwards. That is the whole trick, and it takes a second per person.',
      },
      {
        question: 'Does everyone need an account?',
        answer:
          'No. The wheel runs in any browser with no signup, and a read-only public link lets everyone watch the same one without signing in.',
      },
    ],
  },

  'random-letter': {
    slug: 'random-letter-generator',
    title: 'Random Letter Generator | Free A–Z Wheel',
    description:
      'A free random letter generator: spin the A to Z wheel for word games, categories, spelling practice and writing prompts.',
    heading: 'Random Letter Generator',
    intro:
      'Twenty-six letters, one spin. It is the starting gun for half the word games ever invented — categories, Scattergories-style rounds, spelling practice, a writing prompt when the page is blank.',
    sections: [
      {
        heading: 'For the games that need a letter',
        body: 'Name a country, an animal and a food starting with the letter it lands on; give a class a letter to spell words from; start a story with it. The wheel is doing something a generator also does, with the difference that everyone playing watched it land.',
      },
      {
        heading: 'Drop the awkward letters',
        body: 'Copy the wheel and remove Q, X and Z if the game keeps grinding to a halt on them — or keep them and make them worth double. Vowels only, consonants only and a shortened alphabet for younger children are all a few edits away.',
      },
    ],
    faq: [
      {
        question: 'Are all 26 letters equally likely?',
        answer:
          'Yes, every letter is one slice of the same size, and the spin uses a cryptographic random source. No letter is weighted unless you add it twice.',
      },
      {
        question: 'The letters look small — can I make them bigger?',
        answer:
          'Twenty-six slices is a lot for one wheel. Removing letters you do not need makes the rest larger, and the linear and card views show the same wheel with more room for each label.',
      },
    ],
  },

  'random-country': {
    slug: 'random-country-wheel',
    title: 'Random Country Wheel | Free Country Picker',
    description:
      'A free random country picker: spin the wheel for geography lessons, quiz rounds, travel ideas and language practice.',
    heading: 'Random Country Wheel',
    intro:
      'A random country is a lesson plan, a quiz round and a travel daydream in one spin. Put the ones you want on the wheel and let it choose where the conversation goes.',
    sections: [
      {
        heading: 'In a classroom or a pub quiz',
        body: 'Spin for the country a student has to present, the flag the table has to name, or the capital city nobody can remember. Narrow the wheel to one continent when the topic is narrower — a wheel of twelve African countries teaches more than a wheel of the whole world.',
      },
      {
        heading: 'Or for deciding where to go',
        body: 'The same wheel works as a travel shortlist when a group cannot agree. Put the countries you would actually visit on it, spin, and the discussion moves on from "where" to "when".',
      },
    ],
    faq: [
      {
        question: 'Can I choose which countries are on the wheel?',
        answer:
          'Yes. Copy the wheel and replace the entries with any list you like — a continent, the countries in a syllabus, or the five places on your shortlist.',
      },
      {
        question: 'Can I show flags instead of names?',
        answer:
          'Flag emoji work as entries, and each slice can also take its own image if you want the wheel to be pictures rather than words.',
      },
    ],
  },

  'random-animal': {
    slug: 'random-animal-wheel',
    title: 'Random Animal Wheel | Free Animal Picker Spinner',
    description:
      'A free random animal generator for charades, drawing games and classrooms. Spin the wheel and act out, draw or describe whatever it lands on.',
    heading: 'Random Animal Wheel',
    intro:
      'Give a child a random animal and you have a game: act it out, draw it, make its noise, say three facts about it. The wheel is the part that keeps it fair and stops anyone choosing the easy one.',
    sections: [
      {
        heading: 'Charades, drawing and guessing games',
        body: 'The wheel hands out the animal so the person whose turn it is does not get to pick something easy. It works the same for a class of thirty and for two children at a kitchen table, and needs nothing but a screen.',
      },
      {
        heading: 'Match it to what you are teaching',
        body: 'Copy the wheel and swap in the animals from the topic you are on — habitats, farm animals, minibeasts, the ones in the book you are reading. A wheel built around a lesson is worth more than a generic one.',
      },
    ],
    faq: [
      {
        question: 'Can I use pictures instead of names?',
        answer:
          'Yes. Each slice can carry its own image, which is what you want for children who are not reading yet.',
      },
      {
        question: 'Can I make the wheel easier for younger children?',
        answer:
          'Fewer entries means bigger slices and simpler choices. A six-animal wheel is easier to play with than a twenty-animal one.',
      },
    ],
  },

  'date-night': {
    slug: 'date-night-ideas-wheel',
    title: 'Date Night Ideas Wheel | Free Date Night Spinner',
    description:
      'Out of date night ideas? Spin the wheel and let it plan the evening. Free, no signup, and you can fill it with the things you both actually want to do.',
    heading: 'Date Night Ideas Wheel',
    intro:
      '"What do you want to do?" "I don’t mind." Two people who both do not mind will get to the end of the evening having done nothing. A wheel picks, and the evening starts on time.',
    sections: [
      {
        heading: 'Put your own ideas on it',
        body: 'The stock ideas are a starting point; the wheel becomes useful when it holds the things you keep saying you should do and never book. Add the restaurant you walked past, the film neither of you has watched, the walk you meant to take.',
      },
      {
        heading: 'Keep a cheap wheel and an expensive one',
        body: 'One wheel for a free Tuesday and one for a proper night out is the split most couples land on. Both stay saved, so the choice is which wheel to spin rather than what to do.',
      },
    ],
    faq: [
      {
        question: 'Can we both see the same wheel?',
        answer:
          'Publish it as a read-only public link and it opens in any browser, on either phone, with no account needed.',
      },
      {
        question: 'Can I add ideas over time?',
        answer:
          'Yes — the wheel is editable whenever you like, so it grows as you think of things. It stays on your device, and signing in syncs it across your devices.',
      },
    ],
  },

  'where-to-travel': {
    slug: 'where-to-travel-wheel',
    title: 'Where to Travel Wheel | Random Destination Picker',
    description:
      'A free random destination picker: put your travel shortlist on the wheel, spin, and stop rereading the same three tabs.',
    heading: 'Where to Travel Wheel',
    intro:
      'A travel shortlist that never gets shorter is not a shortlist. Put the places on a wheel, agree in advance that the spin decides, and the trip stops being a discussion and becomes a date in a calendar.',
    sections: [
      {
        heading: 'Shortlist first, spin second',
        body: 'The wheel is not there to pick from every city on earth — it is there to close a list you have already agreed on. Six to ten places everyone would genuinely be happy with is the version that works; anything longer and somebody will want to re-spin.',
      },
      {
        heading: 'For groups who never decide',
        body: 'Group trips die in the planning. Spinning in front of everybody makes the decision collective without a vote, and nobody ends up responsible for the choice — which is usually the real reason nobody wants to make it.',
      },
    ],
    faq: [
      {
        question: 'Can I weight the wheel towards cheaper destinations?',
        answer:
          'Add a place more than once and it takes more slices, so it comes up more often. That is all weighting is here.',
      },
      {
        question: 'Can I share the wheel with the people I am travelling with?',
        answer:
          'Yes. A read-only public link opens in any browser with no account, so everyone can see the shortlist and the spin.',
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
