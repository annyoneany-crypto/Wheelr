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
        de: `
          Fox Spirits ist ein offener und lebendiger Ort für Streamer, Gamer, Anime-Fans, Krypto-Begeisterte, Fotografen und Kreative. Die wichtigsten Ziele der Gruppe sind:

          - Kontakte knüpfen und spielen: Mitspieler finden und neue Freundschaften schließen.
          - Gemeinsam wachsen: Inhalte teilen, sich vernetzen und Ideen austauschen.
          - Abschalten und entspannen: Voice-Chats genießen und über die eigenen Leidenschaften plaudern.
          - Aktiv mitmachen: Mit Ideen und Feedback die Zukunft der Community mitgestalten.
        `,
        fr: `
          Fox Spirits est un espace inclusif et dynamique pensé pour les streamers, les gamers, les passionnés d'anime, les amateurs de crypto, les photographes et les créatifs. Les principaux objectifs du groupe sont :

          - Socialiser et jouer : trouver des partenaires de jeu et se faire de nouveaux amis.
          - Grandir ensemble : partager du contenu, développer son réseau et échanger des idées.
          - Se détendre et profiter de l'ambiance : savourer les chats vocaux et parler de ses passions.
          - Participer activement : proposer des idées et des retours pour façonner l'avenir de la communauté.
        `,
        es: `
          Fox Spirits es un espacio inclusivo y dinámico pensado para streamers, gamers, fans del anime, entusiastas de las criptomonedas, fotógrafos y creativos. Los principales objetivos del grupo son:

          - Socializar y jugar: encontrar compañeros de juego y hacer nuevos amigos.
          - Crecer juntos: compartir contenido, hacer networking e intercambiar ideas.
          - Desconectar y relajarse: disfrutar de los chats de voz y charlar sobre tus pasiones.
          - Participar activamente: aportar ideas y comentarios para dar forma al futuro de la comunidad.
        `,
        zh: `
          Fox Spirits 是一个包容而充满活力的空间，专为主播、游戏玩家、动漫爱好者、加密货币爱好者、摄影师和创作者打造。社群的主要目标是：

          - 社交与游戏：寻找游戏伙伴，结识新朋友。
          - 共同成长：分享内容、拓展人脉、交流想法。
          - 放松身心：享受语音聊天，畅谈各自的爱好。
          - 积极参与：贡献想法和反馈，共同塑造社群的未来。
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
        de: `
          Supercycle ist der exklusive, lebendige Ort, an dem alle Fans und Unterstützer des $Super-Tokens zusammenkommen. Das ist nicht einfach eine Community, sondern ein echtes Ökosystem, angetrieben von der Vision des Gründers, der eine breite Palette innovativer Tools und strategischer Mechanismen entwickelt hat, die gezielt darauf ausgelegt sind, echten und nachhaltigen Wert rund um den Token zu schaffen.
        `,
        fr: `
          Supercycle est l'espace exclusif et vibrant qui rassemble tous les passionnés et soutiens du token $Super. Ce n'est pas une simple communauté, mais un véritable écosystème porté par la vision de son fondateur, qui a développé une large gamme d'outils innovants et de mécanismes stratégiques conçus spécialement pour créer une valeur réelle et durable autour du token.
        `,
        es: `
          Supercycle es el espacio exclusivo y vibrante que reúne a todos los apasionados y seguidores del token $Super. No es una simple comunidad, sino un auténtico ecosistema impulsado por la visión de su fundador, que ha desarrollado una amplia gama de herramientas innovadoras y mecanismos estratégicos pensados específicamente para generar un valor real y sostenible en torno al token.
        `,
        zh: `
          Supercycle 是一个专属而充满活力的空间，汇聚了 $Super 代币的所有爱好者和支持者。这不仅仅是一个社群，更是一个由创始人愿景驱动的完整生态系统——创始人开发了一系列创新工具和战略机制，专门用于围绕该代币创造真实、可持续的价值。
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
  {
    slug: 'red',
    emoji: '🔴',
    name: 'RED',
    community: $localize`:@@community.red.community:RED community`,
    tagline: $localize`:@@community.red.tagline:Red, silver and black`,
    // Waiting for the community's own text and links.
    info: { 
      about: {
        it: `
          La comunità RED, fondata sull'ecosistema Avalanche, si impegna a creare un ambiente di supporto reciproco per i detentori dei suoi NFT. Sotto la guida esperta di vRoshi e Bronzeagle, RED punta a diventare un punto di riferimento per gli appassionati di Avalanche e NFT.
        `,
        en: `
          The RED community, built on the Avalanche ecosystem, is committed to creating an environment of mutual support for its NFT holders. Under the expert leadership of vRoshi and Bronzeagle, RED aims to become a key hub for Avalanche and NFT enthusiasts.
        `,
        de: `
          Die RED-Community, die auf dem Avalanche-Ökosystem basiert, hat sich zum Ziel gesetzt, ein Umfeld gegenseitiger Unterstützung für ihre NFT-Inhaber zu schaffen. Unter der fachkundigen Leitung von vRoshi und Bronzeagle möchte RED zu einem zentralen Anlaufpunkt für Avalanche- und NFT-Begeisterte werden.
        `,
        fr: `
          La communauté RED, bâtie sur l'écosystème Avalanche, s'engage à créer un environnement d'entraide pour ses détenteurs de NFT. Sous l'égide de vRoshi et Bronzeagle, RED ambitionne de devenir un lieu de rencontre incontournable pour les passionnés d'Avalanche et de NFT.
        `,
        es: `
          La comunidad RED, construida sobre el ecosistema Avalanche, se compromete a crear un entorno de apoyo mutuo para sus poseedores de NFT. Bajo la experta dirección de vRoshi y Bronzeagle, RED aspira a convertirse en un centro neurálgico para los entusiastas de Avalanche y los NFT.
        `,
        zh: `
          RED社区建立在Avalanche生态系统之上，致力于为NFT持有者打造互助互惠的环境。在vRoshi和Bronzeagle的专业指导下，RED的目标是成为Avalanche和NFT爱好者的聚集地。
        `,
      },
      links: [
        {
          kind: 'x',
          url: 'https://x.com/vRoshi55',
          label: `x vRoshi`,
        },
        {
          kind: 'x',
          url: 'https://x.com/BroNzEagLe23',
          label: `x BroNzEagLe23`,
        },
        {
          kind: 'x',
          url: 'https://x.com/LucidThingsNFT',
          label: `Project LUCID`,
        },
        {
          kind: 'website',
          url: 'https://salvor.io/collections/0x4160c72898bb4ebafe2612d76777008e78880478',
          label: `RED Collection`,
        },
      ] 
    },
    description: $localize`:@@community.red.description:A wheel set in the engraved silver ring of the RED community, under its red badge. Red, silver and black slices that stay exactly as the community designed them — you only choose the entries.`,
    // Red, silver, deep red and graphite from the artwork, alternating so no
    // two neighbours match; each deepens towards the rim.
    palette: {
      colors: ['#D7141E', '#E8EAED', '#8E0A12', '#3A3D43'],
      gradientTo: ['#6E070C', '#A3A8AF', '#3A0307', '#0E0F11'],
    },
    // Delivered already transparent at 500px, so it skips `tools/community-frame.mjs`;
    // upscaled ×3 (Lanczos + light sharpening, WebP q90) so it is not stretched
    // on large or high-density screens. Measured on the 500px original: the
    // opening is a circle of radius 147–150 px centred at (252, 250.5); the
    // wheel is a few pixels wider so it tucks under the metal edge. The badge
    // sits over the top of the wheel and marks the winner at 12 o'clock.
    frame: {
      src: '/community-art/red/frame.webp',
      width: 1500,
      height: 1500,
      wheelCenterX: 0.504,
      wheelCenterY: 0.501,
      wheelDiameter: 0.606,
    },
    background: {
      color: '#0a0506',
      // Placeholder until the community's own background artwork arrives:
      image: '/community-art/red/background.webp',
      gradient:
        'radial-gradient(circle at 50% 40%, rgba(215, 20, 30, 0.3), transparent 55%), radial-gradient(circle at 15% 88%, rgba(232, 234, 237, 0.08), transparent 45%), radial-gradient(circle at 88% 15%, rgba(142, 10, 18, 0.35), transparent 50%)',
    },
    accent: '#E32630',
    titleGradient: 'linear-gradient(180deg, #ffffff 0%, #e8eaed 40%, #ff4d55 72%, #a30d16 100%)',
    buttonGradient: 'linear-gradient(180deg, #ffb3b7 0%, #E32630 60%, #8E0A12 100%)',
    hub: {
      color: '#140708',
      borderColor: '#C9CDD2',
      textColor: '#FFFFFF',
      image: '/community-art/red/hub-logo.webp',
    },
    fontFamily: '"Inter", sans-serif',
    defaultEntries: [
      $localize`:@@community.red.entry1:Ruby`,
      $localize`:@@community.red.entry2:Scarlet`,
      $localize`:@@community.red.entry3:Red Star`,
      $localize`:@@community.red.entry4:Crimson`,
      $localize`:@@community.red.entry5:Lucky Red`,
      $localize`:@@community.red.entry6:Big Win`,
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
