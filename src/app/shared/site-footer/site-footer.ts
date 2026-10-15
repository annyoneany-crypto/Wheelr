import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { NativePlatformService } from '../../services/native-platform.service';
import { SiteFooterState } from './site-footer-state';

/**
 * The fixed footer with the expandable summary of what Wheelr does.
 *
 * It used to live in `index.html`, outside Angular, which kept it English in
 * every locale and made its links absolute — from `/it/` they led back to the
 * English site. As a component it is translated, prerendered per locale, and
 * routes through `routerLink`, so `<base href>` keeps visitors in their language.
 *
 * Inside the Android shell it is not rendered at all: nothing crawls the app,
 * and a 3rem bar would eat screen the wheel needs. On the web below lg the
 * collapsed bar has zero height for the same reason (`--wl-footer-collapsed`);
 * the content stays in the render tree and the header menu opens it. `index.html` still tags the
 * root with `capacitor-native` before first paint, which is what zeroes
 * `--wl-bottom-bar-offset` for the mobile controls.
 */
@Component({
  selector: 'wl-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WlSiteFooter {
  protected readonly isNative = inject(NativePlatformService).isNative;

  protected readonly expanded = inject(SiteFooterState).expanded;

  private readonly router = inject(Router);

  /**
   * The wheel route has no heading of its own (it is a canvas), so there the
   * summary's title is the page's `<h1>`, carrying each locale's head term
   * ("Glücksrad online kostenlos", "Ruleta online gratis"…). Every other page
   * owns its `<h1>`, and the title stays an `<h2>`.
   */
  protected readonly isHome = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => isHomeUrl(event.urlAfterRedirects))
    ),
    { initialValue: isHomeUrl(this.router.url) }
  );

  /**
   * The ready-made wheels people search for most (Search Console, impressions),
   * linked from every page. Labels reuse the landing pages' `tpl.<id>.heading`
   * ids — same text, same translation — rather than importing `TEMPLATE_SEO`,
   * which would put every landing page's copy in the initial bundle.
   */
  protected readonly popularTemplates: readonly { slug: string; label: string }[] = [
    { slug: 'random-letter-generator', label: $localize`:@@tpl.random-letter.heading:Random Letter Generator` },
    { slug: 'prize-wheel', label: $localize`:@@tpl.prize-giveaway.heading:Prize Wheel for Giveaways` },
    { slug: 'truth-or-dare-wheel', label: $localize`:@@tpl.truth-or-dare.heading:Truth or Dare Wheel` },
    { slug: 'discount-wheel', label: $localize`:@@tpl.discount-wheel.heading:Spin-to-Win Discount Wheel` },
    { slug: 'random-team-generator', label: $localize`:@@tpl.team-picker.heading:Random Team Generator` },
    { slug: 'charades-ideas-wheel', label: $localize`:@@tpl.charades.heading:Charades Ideas Wheel` },
    { slug: 'random-country-wheel', label: $localize`:@@tpl.random-country.heading:Random Country Wheel` },
    { slug: 'random-animal-wheel', label: $localize`:@@tpl.random-animal.heading:Random Animal Wheel` },
    { slug: 'punishment-wheel', label: $localize`:@@tpl.punishment.heading:Punishment Wheel` },
    { slug: 'random-job-generator', label: $localize`:@@tpl.random-job.heading:Random Job Generator` },
    { slug: 'random-zodiac-sign-wheel', label: $localize`:@@tpl.zodiac-sign.heading:Random Zodiac Sign Wheel` },
    { slug: 'heads-or-tails-wheel', label: $localize`:@@tpl.heads-or-tails.heading:Heads or Tails Wheel` },
  ];

  protected readonly toggleLabel = computed(() =>
    this.expanded()
      ? $localize`:@@footer.toggle.collapse:Collapse footer summary`
      : $localize`:@@footer.toggle.expand:Expand footer summary`
  );

  /** Search phrases people actually type, in the visitor's language. */
  protected readonly keywords = [
    $localize`:@@footer.kw.1:free wheel`,
    $localize`:@@footer.kw.2:raffle wheel free`,
    $localize`:@@footer.kw.3:spin for prizes free`,
    $localize`:@@footer.kw.4:spin the wheel online`,
    $localize`:@@footer.kw.5:wheel spinner`,
    $localize`:@@footer.kw.6:random picker wheel`,
    $localize`:@@footer.kw.7:yes or no wheel`,
    $localize`:@@footer.kw.8:raffle tool online`,
    $localize`:@@footer.kw.9:wheel of fortune online`,
    $localize`:@@footer.kw.10:random name picker`,
    $localize`:@@footer.kw.11:classroom spinner free`,
    $localize`:@@footer.kw.12:live stream giveaway`,
  ];

  protected toggle(): void {
    this.expanded.update((value) => !value);
  }
}

/** The wheel route, whatever named outlets (settings panels) are open. */
function isHomeUrl(url: string): boolean {
  const primary = url.split(/[?#(]/)[0];
  return primary === '/' || primary === '';
}
