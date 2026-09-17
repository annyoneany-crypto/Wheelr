import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, PRIMARY_OUTLET, Router } from '@angular/router';
import { filter } from 'rxjs';

/** Per-route metadata, declared in `app.routes.ts` under `data.seo`. */
export interface PageSeo {
  title: string;
  description: string;
  /**
   * `<meta name="robots">`. Defaults to indexable; set `noindex, follow` on
   * routes that are not pages of this site in their own right.
   */
  robots?: string;
  /** Label of this page in the breadcrumb trail. Omit to emit no breadcrumbs. */
  breadcrumb?: string;
  /** Section this page sits under, for a three-level trail (Home → section → page). */
  breadcrumbParent?: { name: string; path: string };
  /** Extra JSON-LD nodes describing *this page's* content (see seo-structured-data.ts). */
  jsonLd?: readonly object[];
}

const ORIGIN = 'https://www.wheelr.xyz';

const INDEXABLE = 'index, follow';

/**
 * A `googlebot` directive overrides the generic `robots` one for Google, so the
 * two always move together — leaving the rich indexable default in place next to
 * a `noindex` robots tag would simply keep the page in the index.
 */
const GOOGLEBOT_INDEXABLE =
  'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';

/** Mirrors the tags baked into `index.html`, used for any route without its own. */
const DEFAULT_SEO: PageSeo = {
  title: 'Free Wheel Online | Spin the Wheel & Random Picker - Wheelr',
  description:
    'Wheelr is a free wheel spinner for raffles, classrooms, live streams and events. Customize colors, sounds and effects. Spin the wheel now — no signup needed!',
  robots: INDEXABLE,
};

/** Marks the JSON-LD block this service owns, so it can be replaced wholesale. */
const ROUTE_JSON_LD_ATTR = 'data-wl-route-seo';

/**
 * Keeps title, description, canonical, robots, the social tags and the
 * page-level JSON-LD in sync with the active route.
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
    const robots = seo.robots ?? INDEXABLE;

    this.titleService.setTitle(seo.title);
    this.meta.updateTag({ name: 'description', content: seo.description });
    this.meta.updateTag({ name: 'robots', content: robots });
    this.meta.updateTag({
      name: 'googlebot',
      content: robots === INDEXABLE ? GOOGLEBOT_INDEXABLE : robots,
    });
    this.meta.updateTag({ property: 'og:title', content: seo.title });
    this.meta.updateTag({ property: 'og:description', content: seo.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ name: 'twitter:title', content: seo.title });
    this.meta.updateTag({ name: 'twitter:description', content: seo.description });
    this.setCanonical(url);
    this.setRouteJsonLd(seo, url);
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

  /**
   * Replaces the page-level JSON-LD block. The site-wide entities stay in
   * `index.html` untouched; only what describes *this* page is rewritten, so a
   * FAQ never follows the reader onto the privacy policy.
   */
  private setRouteJsonLd(seo: PageSeo, url: string): void {
    this.document
      .querySelectorAll(`script[${ROUTE_JSON_LD_ATTR}]`)
      .forEach((script) => script.remove());

    const graph = [...this.breadcrumbNodes(seo, url), ...(seo.jsonLd ?? [])];
    if (!graph.length) {
      return;
    }

    const script = this.document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute(ROUTE_JSON_LD_ATTR, '');
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
    this.document.head.appendChild(script);
  }

  /**
   * Home → this page. A single-item trail says nothing, so the homepage and any
   * route without a `breadcrumb` label emit none at all.
   */
  private breadcrumbNodes(seo: PageSeo, url: string): object[] {
    if (!seo.breadcrumb) {
      return [];
    }

    const trail = [
      { name: 'Home', item: `${ORIGIN}/` },
      ...(seo.breadcrumbParent
        ? [{ name: seo.breadcrumbParent.name, item: `${ORIGIN}${seo.breadcrumbParent.path}` }]
        : []),
      { name: seo.breadcrumb, item: url },
    ];

    return [
      {
        '@type': 'BreadcrumbList',
        itemListElement: trail.map((entry, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: entry.name,
          item: entry.item,
        })),
      },
    ];
  }
}
