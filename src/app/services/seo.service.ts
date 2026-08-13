import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, PRIMARY_OUTLET, Router } from '@angular/router';
import { filter } from 'rxjs';

/** Per-route metadata, declared in `app.routes.ts` under `data.seo`. */
export interface PageSeo {
  title: string;
  description: string;
}

const ORIGIN = 'https://www.wheelr.xyz';

/** Mirrors the tags baked into `index.html`, used for any route without its own. */
const DEFAULT_SEO: PageSeo = {
  title: 'Free Wheel Online | Spin the Wheel & Random Picker - Wheelr',
  description:
    'Wheelr is a free wheel spinner for raffles, classrooms, live streams and events. Customize colors, sounds and effects. Spin the wheel now — no signup needed!',
};

/**
 * Keeps title, description, canonical and the social tags in sync with the
 * active route.
 *
 * The canonical is built from the **primary outlet segments only**, never from
 * `document.URL`: the settings panels are secondary-outlet routes, so the raw
 * URL of an open panel is `/(panel:users)` and canonicalising to that would
 * declare a modal as its own indexable page. Query strings and fragments are
 * dropped for the same reason.
 *
 * Note this only fixes what a JavaScript-executing client sees. The HTML that
 * Vercel serves for every route is the same `index.html`, so a crawler that does
 * not render still reads the homepage tags — that needs prerendering.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);

  /** Call once at bootstrap; re-applies the tags after every navigation. */
  watchNavigation(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.apply(this.routeSeo()));
  }

  /**
   * Refines the tags once a component knows its own content (a shared wheel's
   * title, for instance). Reset on the next navigation.
   */
  setPage(seo: Partial<PageSeo>): void {
    this.apply({ ...this.routeSeo(), ...seo });
  }

  private apply(seo: PageSeo): void {
    const url = this.canonicalUrl();

    this.titleService.setTitle(seo.title);
    this.meta.updateTag({ name: 'description', content: seo.description });
    this.meta.updateTag({ property: 'og:title', content: seo.title });
    this.meta.updateTag({ property: 'og:description', content: seo.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ name: 'twitter:title', content: seo.title });
    this.meta.updateTag({ name: 'twitter:description', content: seo.description });
    this.setCanonical(url);
  }

  /** `https://www.wheelr.xyz/templates` — origin plus the primary-outlet path. */
  private canonicalUrl(): string {
    const primary = this.router.parseUrl(this.router.url).root.children[PRIMARY_OUTLET];
    const path = primary ? primary.segments.map((segment) => segment.path).join('/') : '';

    return path ? `${ORIGIN}/${path}` : `${ORIGIN}/`;
  }

  /** The `seo` data of the deepest primary-outlet route, over the defaults. */
  private routeSeo(): PageSeo {
    let route: ActivatedRoute = this.router.routerState.root;

    for (;;) {
      const child = route.children.find((candidate) => candidate.outlet === PRIMARY_OUTLET);
      if (!child) {
        break;
      }
      route = child;
    }

    const seo = route.snapshot.data['seo'] as Partial<PageSeo> | undefined;

    return { ...DEFAULT_SEO, ...seo };
  }

  private setCanonical(url: string): void {
    const existing = this.document.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]');

    // Two canonicals are the same as none at all for a crawler; keep exactly one.
    for (let i = 1; i < existing.length; i += 1) {
      existing[i].remove();
    }

    let link = existing[0] ?? null;

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }

    link.setAttribute('href', url);
  }
}
