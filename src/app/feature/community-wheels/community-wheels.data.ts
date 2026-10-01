/**
 * Community wheels: themed wheels made for a specific community.
 *
 * Unlike the templates, these are not copied into the visitor's own wheels —
 * their look *is* the point. Frame artwork, background and palette are fixed
 * here and nothing in the UI can change them; the visitor only edits the
 * entries, which are kept per wheel in localStorage (see `CommunityWheelPage`).
 *
 * Adding one: an entry below, its frame under `public/community-art/<slug>/`
 * (black-background artwork goes through `tools/community-frame.mjs`), and the
 * translations for its `community.<slug>.*` ids. The route, the list page, the
 * prerender and the sitemap all read this array.
 */
import type { CommunityText } from './community-text';

/**
 * The artwork drawn around the wheel. The wheel is placed inside it by
 * fractions of the image, so the frame can be shown at any size.
 */
export interface CommunityWheelFrame {
  /** Absolute path under `public/`. */
  src: string;
  /** Intrinsic size of the image, for its aspect ratio. */
  width: number;
  height: number;
  /** Centre of the wheel, as a fraction of the image width / height. */
  wheelCenterX: number;
  wheelCenterY: number;
  /** Diameter of the wheel, as a fraction of the image width. */
  wheelDiameter: number;
  /**
   * Where the artwork's pointer points, in degrees clockwise from 12 o'clock
   * seen from the wheel's centre. The winner is the slice under it. Defaults
   * to 0 (straight up); a drawn arrow is rarely exactly vertical.
   */
  pointerAngleDeg?: number;
}

/** A place where the community can be found, shown in the page's info popup. */
export type CommunityLinkKind =
  | 'website'
  | 'discord'
  | 'x'
  | 'telegram'
  | 'youtube'
  | 'twitch'
  | 'instagram'
  | 'tiktok';

export interface CommunityLink {
  kind: CommunityLinkKind;
  /** Full https URL, supplied by the community — never guessed. */
  url: string;
  /** Overrides the default label for the kind (e.g. a server or channel name). */
  label?: string;
}

export interface CommunityWheel {
  slug: string;
  emoji: string;
  name: string;
  /** Who the wheel is made for, shown as the kicker above the name. */
  community: string;
  tagline: string;
  description: string;
  /**
   * The info popup: the community's own text and where to find it. Without
   * `about` the popup falls back to a generic line; without links the links
   * block is left out. Both must come from the community itself.
   *
   * `about` is free text written by hand — paragraphs, `## headings`, `- lists`
   * and `**bold**` (see `community-text.ts`) — either one string for everyone
   * or one per language (`{ en: …, it: … }`, falling back to English).
   */
  info: {
    about?: CommunityText;
    links: readonly CommunityLink[];
  };
  /** Locked: the slice colours and, optionally, their rim colours (see ColorPalette.gradientTo). */
  palette: {
    colors: readonly string[];
    gradientTo?: readonly string[];
  };
  frame: CommunityWheelFrame;
  background: {
    /** Fallback and base colour of the page. */
    color: string;
    /** CSS gradient layered over the colour — used until/unless there is an image. */
    gradient?: string;
    /** Full-page background artwork, absolute path under `public/`. */
    image?: string;
  };
  /** UI accent (buttons, hub glow, winner card). */
  accent: string;
  /** CSS gradients for the page title and the winner card's main button. */
  titleGradient: string;
  buttonGradient: string;
  hub: {
    color: string;
    borderColor: string;
    textColor: string;
    /**
     * Artwork shown in the hub instead of the "Spin" label, cropped to a circle
     * (absolute path under `public/`). Square, centred on the subject.
     */
    image?: string;
  };
  fontFamily: string;
  defaultEntries: readonly string[];
  spinDurationMs: number;
}

export const COMMUNITY_WHEELS: readonly CommunityWheel[] = [
  {
    slug: 'fox-spirit',
    emoji: '',
    name: 'Fox Spirit',
    community: $localize`:@@community.fox-spirit.community:Fox Spirit community`,
    tagline: $localize`:@@community.fox-spirit.tagline:Spirit fire, amethyst and gold`,
    info: { 
      about: {
        it: `
          Fox Spirits è uno spazio inclusivo e dinamico pensato per streamer, gamer, appassionati di anime, crypto-enthusiast, fotografi e creativi. Gli obiettivi principali del gruppo sono:

          - Socializzare e giocare: Trovare compagni di gioco e fare nuove amicizie.
          - Crescere insieme: Condividere contenuti, fare networking e scambiarsi idee.
          - Vibrare e rilassarsi: Godersi le chat vocali e chiacchierare delle proprie passioni.
          - Partecipare attivamente: Contribuire con idee e feedback per plasmare il futuro della community.
        `,
        en: `
          Fox Spirits is an inclusive and dynamic space designed for streamers, gamers, anime enthusiasts, crypto-enthusiasts, photographers, and creatives. The main goals of the group are:

          - Socialize and play: Find gaming companions and make new friends.
          - Grow together: Share content, network, and exchange ideas.
          - Vibe and relax: Enjoy voice chats and discuss your passions.
          - Participate actively: Contribute ideas and feedback to shape the community's future.
        `,
      },
      links: [
      {
        kind: 'x',
        url: 'https://x.com/DofferLive',
        label: `Doffer`,
      },
      {
        kind: 'website',
        url: 'https://blaze.stream/dofferlive',
        label: `Blaze`,
      },

    ] },
    description: $localize`:@@community.fox-spirit.description:A wheel wrapped in the flaming tail of the spirit fox. Purple, gold and red slices that stay exactly as the community designed them — you only choose the entries.`,
    // Purple, gold and red, alternating so no two neighbours share a hue. Each
    // slice deepens towards the rim, like embers.
    palette: {
      colors: ['#8B3FE0', '#F2B632', '#D62839', '#6D28D9', '#E0A526', '#B91C3C'],
      gradientTo: ['#3B0A78', '#9A6206', '#6E0A1A', '#2E0A63', '#8A5A04', '#5C0718'],
    },
    // Generated with `tools/community-frame.mjs <art> frame.webp --crop 40,110,848,900
    // --hole 423,600`. The wheel fills the round ring and is centred in it; the
    // fox's head overlaps its top (made opaque by --hole) and the snout points
    // down the vertical radius at the winning slice, so wheelCenterX must stay
    // under the snout.
    frame: {
      src: '/community-art/fox-spirit/frame.webp',
      width: 848,
      height: 900,
      wheelCenterX: 0.4988,
      wheelCenterY: 0.5567,
      wheelDiameter: 0.8396,
    },
    background: {
      color: '#0b0512',
      // The community's artwork (1024², re-encoded lossy); the gradient below
      // only shows while it loads.
      image: '/community-art/fox-spirit/background.webp',
      gradient:
        'radial-gradient(circle at 50% 38%, rgba(214, 40, 57, 0.28), transparent 55%), radial-gradient(circle at 20% 85%, rgba(139, 63, 224, 0.32), transparent 50%), radial-gradient(circle at 85% 80%, rgba(242, 182, 50, 0.18), transparent 45%)',
    },
    accent: '#F2B632',
    titleGradient: 'linear-gradient(180deg, #fff7d6 0%, #F2B632 55%, #d62839 100%)',
    buttonGradient: 'linear-gradient(180deg, #ffe08a 0%, #F2B632 60%, #c2410c 100%)',
    hub: {
      color: '#1a0b2e',
      borderColor: '#F2B632',
      textColor: '#FDE68A',
      // The community's logo, cropped round the fox's face and shrunk to 384px.
      image: '/community-art/fox-spirit/hub-logo.webp',
    },
    fontFamily: '"Inter", sans-serif',
    defaultEntries: [
      $localize`:@@community.fox-spirit.entry1:Ember`,
      $localize`:@@community.fox-spirit.entry2:Amethyst`,
      $localize`:@@community.fox-spirit.entry3:Kitsune`,
      $localize`:@@community.fox-spirit.entry4:Golden Tail`,
      $localize`:@@community.fox-spirit.entry5:Spirit Flame`,
      $localize`:@@community.fox-spirit.entry6:Moon Fox`,
    ],
    spinDurationMs: 5000,
  },
  {
    slug: 'supercycle',
    emoji: '🟢',
    name: 'Supercycle (real)',
    community: $localize`:@@community.supercycle.community:Supercycle (real) community`,
    tagline: $localize`:@@community.supercycle.tagline:Neon green, white, steel and black`,
    // Waiting for the community's own text and links.
    info: { 
      about: {
        it: `
          Supercycle è lo spazio esclusivo e vibrante che riunisce tutte le persone appassionate e i sostenitori del token $Super. Questa non è una semplice community, ma un vero e proprio ecosistema guidato dalla visione del fondatore, il quale ha sviluppato una vasta gamma di strumenti innovativi e meccanismi strategici pensati appositamente per generare valore reale e sostenibile attorno al token.
        `,
        en: `
          Supercycle is the exclusive, vibrant space that brings together all the enthusiasts and supporters of the $Super token. This is not merely a community, but a genuine ecosystem driven by the founder's vision—a vision that has led to the development of a wide range of innovative tools and strategic mechanisms specifically designed to generate real, sustainable value around the token.
        `,
      },
      links: [
      {
        kind: 'x',
        url: 'https://x.com/supercyclereal_',
        label: `Supercycle`,
      },
      {
        kind: 'website',
        url: 'https://blaze.stream/supercyclereal',
        label: `Blaze`,
      },
      {
        kind: 'website',
        url: 'https://supercyclereal.tech/',
        label: `Website`,
      },

    ]},
    description: $localize`:@@community.supercycle.description:A wheel inside the neon ring of the Supercycle (real) community, with its arrow as the pointer. Green, white, grey and black slices that stay exactly as the community designed them — you only choose the entries.`,
    // Green, white, grey and black from the artwork, in that order so that no
    // two neighbours share a colour; each deepens towards the rim.
    palette: {
      colors: ['#39E75F', '#F2F4F3', '#6B7280', '#15181C'],
      gradientTo: ['#0E7A2C', '#B9C2BD', '#2F343B', '#050607'],
    },
    // Generated with `tools/community-frame.mjs <art> frame.webp --crop 110,110,800,780`
    // (no --hole: the glitter inside the ring stops the flood fill and would
    // turn into an opaque band over the wheel). The wheel fills the neon ring;
    // the logo's arrow tip lands on the rim 4.2° right of vertical.
    frame: {
      src: '/community-art/supercycle/frame.webp',
      width: 800,
      height: 780,
      wheelCenterX: 0.4992,
      wheelCenterY: 0.5322,
      wheelDiameter: 0.735,
      pointerAngleDeg: 4.2,
    },
    background: {
      color: '#040705',
      // The community's artwork (1024², re-encoded lossy); the gradient below
      // only shows while it loads.
      image: '/community-art/supercycle/background.webp',
      gradient:
        'radial-gradient(circle at 50% 45%, rgba(57, 231, 95, 0.16), transparent 55%), radial-gradient(circle at 15% 90%, rgba(107, 114, 128, 0.22), transparent 50%), radial-gradient(circle at 88% 12%, rgba(242, 244, 243, 0.08), transparent 40%)',
    },
    accent: '#39E75F',
    titleGradient: 'linear-gradient(180deg, #ffffff 0%, #c9f7d3 40%, #39E75F 75%, #178a3a 100%)',
    buttonGradient: 'linear-gradient(180deg, #d9ffe2 0%, #39E75F 60%, #16803a 100%)',
    hub: {
      color: '#0b0f0c',
      borderColor: '#39E75F',
      textColor: '#D9FFE2',
      // The community's logo cropped to its arrow symbol (the wordmark would be
      // unreadable at hub size), 384px.
      image: '/community-art/supercycle/hub-logo.webp',
    },
    fontFamily: '"Inter", sans-serif',
    // Market slang is the same in every language, so these are not translated.
    defaultEntries: ['Bull Run', 'HODL', 'To the Moon', 'Diamond Hands', 'Green Candle', 'New ATH'],
    spinDurationMs: 5000,
  },
];

/** Where the wheel sits inside its frame, as CSS percentages of the frame box. */
export interface CommunityFrameLayout {
  left: string;
  top: string;
  width: string;
  centerX: string;
  centerY: string;
  /** The hub: a fifth of the wheel's diameter. */
  hubWidth: string;
  aspectRatio: string;
}

export function frameLayout(frame: CommunityWheelFrame): CommunityFrameLayout {
  // The diameter is a fraction of the width; the vertical offset needs it as a
  // fraction of the height.
  const radiusOfHeight = (frame.wheelDiameter / 2) * (frame.width / frame.height);

  return {
    left: `${(frame.wheelCenterX - frame.wheelDiameter / 2) * 100}%`,
    top: `${(frame.wheelCenterY - radiusOfHeight) * 100}%`,
    width: `${frame.wheelDiameter * 100}%`,
    centerX: `${frame.wheelCenterX * 100}%`,
    centerY: `${frame.wheelCenterY * 100}%`,
    hubWidth: `${frame.wheelDiameter * 20}%`,
    aspectRatio: `${frame.width} / ${frame.height}`,
  };
}

/**
 * The wheel's background as a CSS `background` value: the artwork when there
 * is one, over the gradient, over the colour. Shared by the wheel page and the
 * cards of the list, so both show the same thing.
 */
export function backgroundCss(background: CommunityWheel['background']): string {
  return [
    ...(background.image ? [`url("${background.image}") center / cover no-repeat`] : []),
    ...(background.gradient ? [background.gradient] : []),
    background.color,
  ].join(', ');
}

export function findCommunityWheel(slug: string): CommunityWheel | null {
  return COMMUNITY_WHEELS.find((wheel) => wheel.slug === slug) ?? null;
}
