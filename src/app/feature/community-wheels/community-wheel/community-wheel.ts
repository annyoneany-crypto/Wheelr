import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { SeoService } from '../../../services/seo.service';
import { drawWheelCanvas } from '../../../shared/extraction-effect/wheel-renderer';
import { CommunityWheel, findCommunityWheel, frameLayout } from '../community-wheels.data';

/** Full turns before the wheel settles. */
const FULL_TURNS = 6;
/** More than this and the labels stop being readable on a wheel this size. */
const MAX_ENTRIES = 100;

/**
 * One community wheel on its own page (`/community/<slug>`).
 *
 * The frame, background and palette come from `COMMUNITY_WHEELS` and are not
 * editable: this page deliberately never touches `WheelConfigurator`, so none
 * of the settings panels can reach it. The only thing the visitor changes is
 * the list of entries, stored per wheel under `ENTRIES_KEY_PREFIX + slug`.
 *
 * The spin is the same self-contained CSS rotation as `TemplateLanding`, with
 * the winner read under the pointer at the top.
 */
@Component({
  selector: 'app-community-wheel',
  imports: [RouterLink],
  templateUrl: './community-wheel.html',
  styleUrl: './community-wheel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityWheelPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);
  /** False while prerendering, where there is no storage, canvas or animation frame. */
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('wheelCanvas');
  private spinTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly wheel = signal<CommunityWheel | null>(null);
  /** The textarea as typed; `entries` is what the wheel actually shows. */
  protected readonly draft = signal('');
  protected readonly entries = computed(() => parseEntries(this.draft()));
  protected readonly rotationDeg = signal(0);
  protected readonly spinning = signal(false);
  protected readonly winner = signal('');

  protected readonly maxEntries = MAX_ENTRIES;

  /** Page background: the artwork when there is one, over the gradient, over the colour. */
  protected readonly pageBackground = computed(() => {
    const background = this.wheel()?.background;
    if (!background) {
      return '';
    }

    const layers = [
      ...(background.image ? [`url("${background.image}") center / cover no-repeat`] : []),
      ...(background.gradient ? [background.gradient] : []),
    ];
    return [...layers, background.color].join(', ');
  });

  /** Where the wheel, the pointer and the hub sit inside the frame. */
  protected readonly wheelBox = computed(() => {
    const frame = this.wheel()?.frame;
    return frame
      ? { ...frameLayout(frame), hubWidth: `${frame.wheelDiameter * 20}%` }
      : null;
  });

  protected readonly labels = {
    wheel: (name: string) => $localize`:@@community.page.wheelAria:The ${name}:NAME: community wheel`,
    spin: (name: string) => $localize`:@@community.page.spinAria:Spin the ${name}:NAME: wheel`,
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

    this.destroyRef.onDestroy(() => this.clearSpinTimer());
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

    this.spinning.set(true);
    this.winner.set('');

    const total = this.rotationDeg() + 360 * FULL_TURNS + this.secureRandomInt(360);
    this.rotationDeg.set(total);

    this.clearSpinTimer();
    this.spinTimer = setTimeout(() => {
      this.spinTimer = null;
      this.winner.set(this.winnerAt(total, names));
      this.spinning.set(false);
    }, wheel.spinDurationMs);
  }

  protected onEntriesInput(event: Event): void {
    const wheel = this.wheel();
    if (!wheel || this.spinning()) {
      return;
    }

    this.draft.set((event.target as HTMLTextAreaElement).value);
    this.winner.set('');
    this.writeEntries(wheel.slug, this.entries());
  }

  protected resetEntries(): void {
    const wheel = this.wheel();
    if (!wheel || this.spinning()) {
      return;
    }

    this.draft.set(wheel.defaultEntries.join('\n'));
    this.winner.set('');
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
    this.clearSpinTimer();
    this.rotationDeg.set(0);
    this.winner.set('');
    this.spinning.set(false);
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

  /** Same geometry as the main wheel: the pointer sits at the top. */
  private winnerAt(totalRotation: number, names: string[]): string {
    const normalized = (360 - (totalRotation % 360)) % 360;
    const adjusted = (normalized - 90 + 360) % 360;
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
