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
}

export interface CommunityWheel {
  slug: string;
  emoji: string;
  name: string;
  /** Who the wheel is made for, shown as the kicker above the name. */
  community: string;
  tagline: string;
  description: string;
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
  hub: {
    color: string;
    borderColor: string;
    textColor: string;
  };
  fontFamily: string;
  defaultEntries: readonly string[];
  spinDurationMs: number;
}

export const COMMUNITY_WHEELS: readonly CommunityWheel[] = [
  {
    slug: 'fox-spirit',
    emoji: '🦊',
    name: 'Fox Spirit',
    community: $localize`:@@community.fox-spirit.community:Fox Spirit community`,
    tagline: $localize`:@@community.fox-spirit.tagline:Spirit fire, amethyst and gold`,
    description: $localize`:@@community.fox-spirit.description:A wheel wrapped in the flaming tail of the spirit fox. Purple, gold and red slices that stay exactly as the community designed them — you only choose the entries.`,
    // Purple, gold and red, alternating so no two neighbours share a hue. Each
    // slice deepens towards the rim, like embers.
    palette: {
      colors: ['#8B3FE0', '#F2B632', '#D62839', '#6D28D9', '#E0A526', '#B91C3C'],
      gradientTo: ['#3B0A78', '#9A6206', '#6E0A1A', '#2E0A63', '#8A5A04', '#5C0718'],
    },
    // The artwork is narrowed to 85% of its width (tools/community-frame.mjs
    // --scale-x 0.85) so the elliptical ring comes out round and the wheel can
    // fill it. The wheel's top touches the fox's snout, which is the pointer:
    // keep wheelCenterX on the snout, or the winner no longer matches it.
    frame: {
      src: '/community-art/fox-spirit/frame.webp',
      width: 755,
      height: 950,
      wheelCenterX: 0.4999,
      wheelCenterY: 0.6232,
      wheelDiameter: 0.6993,
    },
    background: {
      color: '#0b0512',
      // Placeholder until the community's own background artwork arrives:
      // drop it in public/community-art/fox-spirit/ and set `image`.
      gradient:
        'radial-gradient(circle at 50% 38%, rgba(214, 40, 57, 0.28), transparent 55%), radial-gradient(circle at 20% 85%, rgba(139, 63, 224, 0.32), transparent 50%), radial-gradient(circle at 85% 80%, rgba(242, 182, 50, 0.18), transparent 45%)',
    },
    accent: '#F2B632',
    hub: {
      color: '#1a0b2e',
      borderColor: '#F2B632',
      textColor: '#FDE68A',
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
];

/** Where the wheel sits inside its frame, as CSS percentages of the frame box. */
export interface CommunityFrameLayout {
  left: string;
  top: string;
  width: string;
  centerX: string;
  centerY: string;
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
    aspectRatio: `${frame.width} / ${frame.height}`,
  };
}

export function findCommunityWheel(slug: string): CommunityWheel | null {
  return COMMUNITY_WHEELS.find((wheel) => wheel.slug === slug) ?? null;
}
