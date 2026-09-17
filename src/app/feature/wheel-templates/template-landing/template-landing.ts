import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AdsService } from '../../../services/ads.service';
import { SeoService } from '../../../services/seo.service';
import { WheelConfigurator } from '../../../services/wheel-configurator.service';
import { drawWheelCanvas } from '../../../shared/extraction-effect/wheel-renderer';
import {
  TEMPLATE_LANDING_PAGES,
  TemplateLandingPage,
  findTemplateLandingPage,
} from '../wheel-templates.seo';

/** Full turns before the wheel settles, matching the feel of the real spin. */
const FULL_TURNS = 5;
const SPIN_DURATION_MS = 4000;

/**
 * One ready-made wheel on its own indexable URL (`/templates/<slug>`).
 *
 * The point is search: each template answers a query of its own ("yes or no
 * wheel", "random team generator"), which it could never rank for while it was
 * one card inside `/templates`. So the page carries real copy and a working
 * wheel rather than a screenshot — the visitor can spin before deciding whether
 * to copy it.
 *
 * The spin here is deliberately self-contained: it animates a CSS rotation and
 * picks the slice under the pointer with the same angle formula as
 * `WheelConfigurator.performSpin`, without touching workspace state. Landing
 * visitors get to try the wheel without it being saved to their wheel list.
 */
@Component({
  selector: 'app-template-landing',
  imports: [RouterLink],
  templateUrl: './template-landing.html',
  styleUrl: './template-landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateLanding {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly wheelConfigurator = inject(WheelConfigurator);
  private readonly ads = inject(AdsService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('wheelCanvas');

  protected readonly page = signal<TemplateLandingPage | null>(null);
  protected readonly rotationDeg = signal(0);
  protected readonly spinning = signal(false);
  protected readonly winner = signal('');
  protected readonly copying = signal(false);

  protected readonly template = computed(() => this.page()?.template ?? null);
  protected readonly spinDurationMs = SPIN_DURATION_MS;

  /** The other landing pages, so each one links to every other (and is crawlable from it). */
  protected readonly otherPages = computed(() => {
    const current = this.page()?.seo.slug;
    return TEMPLATE_LANDING_PAGES.filter((entry) => entry.seo.slug !== current);
  });

  /** In the Android app a template is unlocked by a rewarded ad (see WheelTemplates). */
  protected readonly adsRequired = this.ads.isEnabled;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const page = findTemplateLandingPage(params.get('slug') ?? '');

      if (!page) {
        // An unknown slug is not a wheel that exists; send the visitor to the list
        // rather than leaving a dead URL that would be indexed as a soft 404.
        void this.router.navigate(['/templates'], { replaceUrl: true });
        return;
      }

      this.page.set(page);
      this.resetSpin();
      this.applySeo(page);
      requestAnimationFrame(() => this.drawWheel());
    });

    // paramMap emits while the navigation is still in flight, and SeoService
    // re-applies the route's static `data.seo` on the NavigationEnd that follows
    // — which would overwrite the per-template tags with the generic fallback.
    // Applying them again afterwards is what makes them stick.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        const page = this.page();
        if (page) {
          this.applySeo(page);
        }
      });
  }

  protected spin(): void {
    const template = this.template();
    if (!template || this.spinning()) {
      return;
    }

    this.spinning.set(true);
    this.winner.set('');

    const extraDegrees = this.secureRandomInt(360);
    const total = this.rotationDeg() + 360 * FULL_TURNS + extraDegrees;
    this.rotationDeg.set(total);

    const timer = setTimeout(() => {
      this.winner.set(this.winnerAt(total, template.names));
      this.spinning.set(false);
    }, SPIN_DURATION_MS);

    this.destroyRef.onDestroy(() => clearTimeout(timer));
  }

  /**
   * Copies the wheel into the visitor's own wheels and opens it — the same thing
   * the templates list does. On the app that copy is gated behind a rewarded ad,
   * and AdMob requires the offer to be made before the ad starts; that prompt
   * lives on `/templates`, so native visitors are sent there to complete it.
   */
  protected async useTemplate(): Promise<void> {
    const template = this.template();
    if (!template || this.copying()) {
      return;
    }

    if (this.adsRequired) {
      await this.router.navigate(['/templates']);
      return;
    }

    this.copying.set(true);
    try {
      await this.wheelConfigurator.createWheelWorkspaceFromTemplate(template);
      await this.router.navigate(['/']);
    } finally {
      this.copying.set(false);
    }
  }

  private applySeo({ template, seo }: TemplateLandingPage): void {
    this.seo.setPage({
      title: seo.title,
      description: seo.description,
      breadcrumb: template.name,
      breadcrumbParent: { name: 'Templates', path: '/templates' },
      // Mirrors the FAQ rendered further down the page — Google ignores (and
      // penalises) FAQ markup whose answers are not visible.
      jsonLd: [
        {
          '@type': 'FAQPage',
          mainEntity: seo.faq.map((entry) => ({
            '@type': 'Question',
            name: entry.question,
            acceptedAnswer: { '@type': 'Answer', text: entry.answer },
          })),
        },
      ],
    });
  }

  private resetSpin(): void {
    this.rotationDeg.set(0);
    this.winner.set('');
    this.spinning.set(false);
  }

  private drawWheel(): void {
    const template = this.template();
    const canvas = this.canvasRef()?.nativeElement;
    const ctx = canvas?.getContext('2d');

    if (!template || !canvas || !ctx) {
      return;
    }

    drawWheelCanvas(canvas, ctx, {
      names: template.names,
      colors: template.palette.colors,
      fontFamily: '"Inter", sans-serif',
      radiusInset: 8,
    });
  }

  /** Same geometry as the real wheel: the pointer sits at the top. */
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
}
