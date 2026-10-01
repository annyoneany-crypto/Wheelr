import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  LOCALE_ID,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { NativePlatformService } from '../../../services/native-platform.service';
import { SeoService } from '../../../services/seo.service';
import { drawWheelCanvas } from '../../../shared/extraction-effect/wheel-renderer';
import {
  CommunityLinkKind,
  CommunityWheel,
  backgroundCss,
  findCommunityWheel,
  frameLayout,
} from '../community-wheels.data';
import { CommunityWinner } from '../community-winner/community-winner';
import { parseCommunityText, pickCommunityText } from '../community-text';
import { resolveLocale } from '../../../services/i18n.config';

/** Full turns before the wheel settles. */
const FULL_TURNS = 6;
/** A cap on what one wheel holds, like a sanity limit on pasted lists. */
const MAX_ENTRIES = 500;
/** Idle drift while nobody is spinning, as on the main wheel. */
const IDLE_DEG_PER_SECOND = 6;
/**
 * The community wheels' own sounds, shared by all of them: one when a spin
 * starts (1.6 s, 22 KB), one when the winner is read (2 s, 36 KB). They replace
 * `DefaultSoundPlayer`'s ticks and winner jingle.
 */
const START_SOUND_SRC = '/community-art/start.mp3';
const WIN_SOUND_SRC = '/community-art/win.mp3';

/**
 * One community wheel on its own page (`/community/<slug>`).
 *
 * The frame, background and palette come from `COMMUNITY_WHEELS` and are not
 * editable: this page deliberately never touches `WheelConfigurator`, so none
 * of the settings panels can reach it. The only thing the visitor changes is
 * the list of entries, stored per wheel under `ENTRIES_KEY_PREFIX + slug`.
 *
 * It behaves like the main wheel otherwise: it drifts while idle, spins on a
 * click (wheel or hub) playing `start.mp3` — no ticks while it turns — and
 * plays `win.mp3` as it reveals the winner, with an effect whose card can
 * remove the winner from the entries. The names live in a drawer opened from
 * the right-hand rail, as on the main wheel.
 * The winner is read at the top — where the frame artwork points (the fox's
 * snout); the rotation is a CSS transition with the main wheel's easing.
 */
@Component({
  selector: 'app-community-wheel',
  imports: [RouterLink, FormsModule, NgTemplateOutlet, CommunityWinner],
  templateUrl: './community-wheel.html',
  styleUrl: './community-wheel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // On the host so the drawer and the winner card, outside the page section, see it too.
  host: {
    '[style.--wl-accent]': 'wheel()?.accent',
    '[style.--wl-title-gradient]': 'wheel()?.titleGradient',
    '[style.--wl-button-gradient]': 'wheel()?.buttonGradient',
    '(document:keydown.escape)': 'infoOpen.set(false)',
  },
})
export class CommunityWheelPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly nativePlatform = inject(NativePlatformService);
  /** False while prerendering, where there is no storage, canvas or animation frame. */
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Browser only (there is no `Audio` while prerendering); preloaded so they are not late. */
  private readonly startSound = this.isBrowser ? createSound(START_SOUND_SRC) : null;
  private readonly winSound = this.isBrowser ? createSound(WIN_SOUND_SRC) : null;

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('wheelCanvas');
  private spinTimer: ReturnType<typeof setTimeout> | null = null;
  private idleFrameId: number | null = null;

  protected readonly wheel = signal<CommunityWheel | null>(null);
  /** The textarea as typed; `entries` is what the wheel actually shows. */
  protected readonly draft = signal('');
  protected readonly entries = computed(() => parseEntries(this.draft()));
  protected readonly rotationDeg = signal(0);
  protected readonly spinning = signal(false);
  protected readonly winner = signal('');
  protected readonly panelOpen = signal(false);
  protected readonly infoOpen = signal(false);

  /** Icon and default label of each kind of community link. */
  protected readonly linkKinds: Record<CommunityLinkKind, { icon: string; label: string }> = {
    website: { icon: 'fa-solid fa-globe', label: $localize`:@@community.info.link.website:Website` },
    discord: { icon: 'fa-brands fa-discord', label: 'Discord' },
    x: { icon: 'fa-brands fa-x-twitter', label: 'X' },
    telegram: { icon: 'fa-brands fa-telegram', label: 'Telegram' },
    youtube: { icon: 'fa-brands fa-youtube', label: 'YouTube' },
    twitch: { icon: 'fa-brands fa-twitch', label: 'Twitch' },
    instagram: { icon: 'fa-brands fa-instagram', label: 'Instagram' },
    tiktok: { icon: 'fa-brands fa-tiktok', label: 'TikTok' },
  };

  /** Inputs of the names drawer, mirroring the main wheel's users panel. */
  protected readonly newName = signal('');
  protected readonly repeatCount = signal(1);
  protected readonly nameToRemove = signal('');

  protected readonly panelTitle = $localize`:@@bar.panel.users.caption:Names`;
  protected readonly panelAriaLabel = $localize`:@@bar.panel.users.aria:Open users panel`;

  /** The frame box: as wide as possible while the whole artwork fits the screen height. */
  protected readonly stageWidth = computed(() => {
    const frame = this.wheel()?.frame;
    if (!frame) {
      return '';
    }
    return `min(94vw, 46rem, calc((100dvh - 12rem) * ${frame.width / frame.height}))`;
  });

  /** Page background: the artwork when there is one, over the gradient, over the colour. */
  protected readonly pageBackground = computed(() => {
    const background = this.wheel()?.background;
    return background ? backgroundCss(background) : '';
  });

  private readonly language = resolveLocale(inject(LOCALE_ID)).hreflang;

  /** The info popup's text: the community's own, in this language if written in it, else the generic line. */
  protected readonly aboutBlocks = computed(() => {
    const wheel = this.wheel();
    if (!wheel) {
      return [];
    }
    const text = pickCommunityText(wheel.info.about, this.language);
    return text
      ? parseCommunityText(text)
      : [{ kind: 'paragraph' as const, lines: [[{ text: this.labels.about(wheel.name), bold: false }]] }];
  });

  /** Where the wheel and the hub sit inside the frame. */
  protected readonly wheelBox = computed(() => {
    const frame = this.wheel()?.frame;
    return frame ? frameLayout(frame) : null;
  });

  protected readonly labels = {
    wheel: (name: string) => $localize`:@@community.page.wheelAria:The ${name}:NAME: community wheel`,
    spin: (name: string) => $localize`:@@community.page.spinAria:Spin the ${name}:NAME: wheel`,
    info: (name: string) => $localize`:@@community.info.aria:About the ${name}:NAME: community`,
    about: (name: string) =>
      $localize`:@@community.info.generic:${name}:NAME: is the community this wheel was made for. Its frame, colours and background were designed with them, so it looks the same for everyone who spins it.`,
  };

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const wheel = findCommunityWheel(params.get('slug') ?? '');

      if (!wheel) {
        // Not a wheel that exists: back to the list rather than a soft 404.
        void this.router.navigate(['/community'], { replaceUrl: true });
        return;
      }

      this.wheel.set(wheel);
      this.draft.set(this.readEntries(wheel).join('\n'));
      this.resetSpin();
      this.applySeo(wheel);
    });

    // paramMap fires before NavigationEnd, where SeoService re-applies the
    // route's static fallback; applying again afterwards makes the tags stick.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        const wheel = this.wheel();
        if (wheel) {
          this.applySeo(wheel);
        }
      });

    // The drawer and the winner card are signals, not routes: without these
    // Android's back button would leave the page instead of closing them.
    this.destroyRef.onDestroy(
      this.nativePlatform.registerBackHandler(() => {
        if (this.infoOpen()) {
          this.infoOpen.set(false);
          return true;
        }
        if (!this.panelOpen()) {
          return false;
        }
        this.panelOpen.set(false);
        return true;
      })
    );

    this.destroyRef.onDestroy(() => {
      this.clearSpinTimer();
      this.stopIdle();
      this.startSound?.pause();
      this.winSound?.pause();
    });

    if (this.isBrowser) {
      this.startIdle();
    }
  }

  protected toggleInfo(): void {
    this.infoOpen.update((open) => !open);
  }

  protected togglePanel(): void {
    this.panelOpen.update((open) => !open);
  }

  protected spin(): void {
    const names = this.entries();
    if (this.spinning() || !names.length) {
      return;
    }

    const wheel = this.wheel();
    if (!wheel) {
      return;
    }

    this.panelOpen.set(false);
    this.spinning.set(true);
    this.winner.set('');

    const start = this.rotationDeg();
    const total = start + 360 * FULL_TURNS + this.secureRandomInt(360);
    this.rotationDeg.set(total);
    this.winSound?.pause();
    playSound(this.startSound);

    this.clearSpinTimer();
    this.spinTimer = setTimeout(() => {
      this.spinTimer = null;
      // Keep the angle small: the idle drift keeps adding to it.
      this.rotationDeg.set(total % 360);
      this.winner.set(this.winnerAt(total, names, wheel.frame.pointerAngleDeg ?? 0));
      this.spinning.set(false);
      playSound(this.winSound);
    }, wheel.spinDurationMs);
  }

  protected closeWinner(): void {
    this.winner.set('');
  }

  /** "Remove 1 entry" on the winner card: one occurrence, as on the main wheel. */
  protected removeWinnerOnce(): void {
    const winner = this.winner();
    const names = [...this.entries()];
    const index = names.indexOf(winner);
    if (index >= 0) {
      names.splice(index, 1);
      this.setEntries(names);
    }
    this.winner.set('');
  }

  /** "Remove all entries" on the winner card: every occurrence of the winner. */
  protected removeWinnerEverywhere(): void {
    const winner = this.winner();
    this.setEntries(this.entries().filter((name) => name !== winner));
    this.winner.set('');
  }

  protected onEntriesInput(value: string): void {
    const wheel = this.wheel();
    if (!wheel || this.spinning()) {
      return;
    }

    this.draft.set(value);
    this.writeEntries(wheel.slug, this.entries());
  }

  protected addRepeated(): void {
    const name = this.newName().trim();
    if (!name) {
      return;
    }

    const count = Math.max(1, Math.floor(Number(this.repeatCount()) || 1));
    this.setEntries([...this.entries(), ...Array.from({ length: count }, () => name)]);
    this.newName.set('');
    this.repeatCount.set(1);
  }

  protected removeName(): void {
    const name = this.nameToRemove().trim();
    if (!name) {
      return;
    }

    this.setEntries(this.entries().filter((entry) => entry !== name));
    this.nameToRemove.set('');
  }

  protected shuffleEntries(): void {
    const names = [...this.entries()];
    for (let i = names.length - 1; i > 0; i -= 1) {
      const j = this.secureRandomInt(i + 1);
      [names[i], names[j]] = [names[j], names[i]];
    }
    this.setEntries(names);
  }

  protected clearEntries(): void {
    this.setEntries([]);
  }

  private setEntries(names: string[]): void {
    const wheel = this.wheel();
    if (!wheel || this.spinning()) {
      return;
    }

    this.draft.set(names.join('\n'));
    this.writeEntries(wheel.slug, this.entries());
  }

  protected resetEntries(): void {
    const wheel = this.wheel();
    if (!wheel || this.spinning()) {
      return;
    }

    this.draft.set(wheel.defaultEntries.join('\n'));
    this.removeStoredEntries(wheel.slug);
  }

  private applySeo(wheel: CommunityWheel): void {
    this.seo.setPage({
      title: $localize`:@@seo.communityWheel.title:${wheel.name}:NAME: - Community Wheel | Wheelr`,
      description: wheel.description,
      breadcrumb: wheel.name,
      breadcrumbParent: {
        name: $localize`:@@seo.community.breadcrumb:Community wheels`,
        path: '/community',
      },
    });
  }

  private resetSpin(): void {
    this.infoOpen.set(false);
    this.clearSpinTimer();
    this.panelOpen.set(false);
    this.rotationDeg.set(0);
    this.winner.set('');
    this.spinning.set(false);
  }

  /** Slow drift while the wheel is not spinning and no winner is shown. */
  private startIdle(): void {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!this.spinning() && !this.winner()) {
        this.rotationDeg.update((deg) => (deg + IDLE_DEG_PER_SECOND * dt) % 360);
      }
      this.idleFrameId = requestAnimationFrame(tick);
    };
    this.idleFrameId = requestAnimationFrame(tick);
  }

  private stopIdle(): void {
    if (this.idleFrameId !== null) {
      cancelAnimationFrame(this.idleFrameId);
      this.idleFrameId = null;
    }
  }

  private clearSpinTimer(): void {
    if (this.spinTimer !== null) {
      clearTimeout(this.spinTimer);
      this.spinTimer = null;
    }
  }

  /**
   * Drawn from an effect on the viewChild signal, not a one-shot frame: on a
   * prerendered page the server markup is replaced on boot, and a deferred
   * draw could land on a canvas that is already detached.
   */
  private readonly drawEffect = effect(() => {
    const wheel = this.wheel();
    const names = this.entries();
    const canvas = this.canvasRef()?.nativeElement;

    if (!this.isBrowser || !wheel || !canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    drawWheelCanvas(canvas, ctx, {
      names,
      colors: [...wheel.palette.colors],
      gradientTo: wheel.palette.gradientTo ? [...wheel.palette.gradientTo] : undefined,
      fontFamily: wheel.fontFamily,
      radiusInset: 2,
      emptyFillStyle: wheel.hub.color,
      sliceStroke: 'rgba(255, 236, 170, 0.35)',
    });
  });

  /**
   * Same geometry as the main wheel, turned by the angle the artwork's pointer
   * makes with the vertical (Fox Spirit's snout: 0°; Supercycle's arrow: 4.2°).
   */
  private winnerAt(totalRotation: number, names: string[], pointerAngleDeg: number): string {
    const normalized = (360 - (totalRotation % 360)) % 360;
    // The pointer sits at 270° + pointerAngleDeg in canvas angles (0° = 3 o'clock).
    const adjusted = (((normalized - 90 + pointerAngleDeg) % 360) + 360) % 360;
    const index = Math.floor(adjusted / (360 / names.length));

    return names[index] ?? names[0] ?? '';
  }

  private secureRandomInt(maxExclusive: number): number {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);

    return buffer[0] % maxExclusive;
  }

  private storageKey(slug: string): string {
    return `${ENTRIES_KEY_PREFIX}${slug}`;
  }

  private readEntries(wheel: CommunityWheel): string[] {
    const defaults = [...wheel.defaultEntries];
    if (!this.isBrowser) {
      return defaults;
    }

    try {
      const raw = localStorage.getItem(this.storageKey(wheel.slug));
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
        return parsed.slice(0, MAX_ENTRIES);
      }
    } catch {
      // Unreadable or blocked storage: the wheel still works with its defaults.
    }

    return defaults;
  }

  private writeEntries(slug: string, entries: string[]): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      localStorage.setItem(this.storageKey(slug), JSON.stringify(entries));
    } catch {
      // Private mode / quota: the edit lives until the page is left.
    }
  }

  private removeStoredEntries(slug: string): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      localStorage.removeItem(this.storageKey(slug));
    } catch {
      // Nothing stored, or storage blocked: the defaults are already showing.
    }
  }
}

const ENTRIES_KEY_PREFIX = 'wheelr.communityWheel.entries.v1.';

/** One entry per non-empty line, capped so the labels stay readable. */
function parseEntries(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_ENTRIES);
}

function createSound(src: string): HTMLAudioElement {
  const audio = new Audio(src);
  audio.preload = 'auto';
  return audio;
}

/** From the start. The page has had a click by then, so autoplay rules allow it; a failure only costs the sound. */
function playSound(audio: HTMLAudioElement | null): void {
  if (!audio) {
    return;
  }
  audio.currentTime = 0;
  audio.play().catch(() => undefined);
}
