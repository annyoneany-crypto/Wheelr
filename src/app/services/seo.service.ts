import { DOCUMENT, Injectable, LOCALE_ID, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, PRIMARY_OUTLET, Router } from '@angular/router';
import { filter } from 'rxjs';
import { SITE_LOCALES, localizedPath, resolveLocale } from './i18n.config';

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
  // Same ids as the home route: identical copy, so it is translated once.
  title: $localize`:@@seo.home.title:Free Wheel Online | Spin the Wheel & Random Picker - Wheelr`,
  description: $localize`:@@seo.home.description:Wheelr is a free wheel spinner for raffles, classrooms, live streams and events. Customize colors, sounds and effects. Spin the wheel now — no signup needed!`,
  robots: INDEXABLE,
};

/** Marks the JSON-LD block this service owns, so it can be replaced wholesale. */
const ROUTE_JSON_LD_ATTR = 'data-wl-route-seo';

/** Same idea for the hreflang links, which are rewritten on every navigation. */
const ALTERNATE_ATTR = 'data-wl-alternate';

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

  /**
   * Which build this is. Baked in at compile time: each locale is its own
   * bundle, so this never changes at runtime.
   */
  private readonly locale = resolveLocale(inject(LOCALE_ID));

  /** The site-wide block is the same on every route, so it is rewritten once. */
  private siteJsonLdLocalized = false;

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
    this.meta.updateTag({ property: 'og:locale', content: this.locale.ogLocale });
    this.setCanonical(url);
    this.setAlternates();
    this.setRouteJsonLd(seo, url);
    this.localizeSiteJsonLd();
  }

  /**
   * The site-wide JSON-LD lives in `index.html`, which is plain HTML and so has
   * no way to reach `$localize` — every locale would otherwise describe the app
   * in English and declare `inLanguage: "en"`. Rewriting the block here catches
   * it during prerendering too, which is the version a crawler actually reads.
   */
  private localizeSiteJsonLd(): void {
    if (this.siteJsonLdLocalized) {
      return;
    }
    this.siteJsonLdLocalized = true;

    const script = this.document.querySelector<HTMLScriptElement>(
      `script[type="application/ld+json"]:not([${ROUTE_JSON_LD_ATTR}])`
    );
    if (!script?.textContent) {
      return;
    }

    let data: { '@graph'?: Record<string, unknown>[] };
    try {
      data = JSON.parse(script.textContent);
    } catch {
      return;
    }

    for (const node of data['@graph'] ?? []) {
      if (typeof node['inLanguage'] === 'string') {
        node['inLanguage'] = this.locale.hreflang;
      }
      if (node['@type'] === 'WebSite' || node['@type'] === 'WebApplication') {
        node['description'] = DEFAULT_SEO.description;
        if (typeof node['headline'] === 'string') {
          node['headline'] = DEFAULT_SEO.title;
        }
      }
    }

    script.textContent = JSON.stringify(data);
  }

  /**
   * `https://www.wheelr.xyz/it/templates` — origin, locale subpath, then the
   * primary-outlet path.
   *
   * The router URL does **not** contain the locale: Angular serves each locale
   * from its own `<base href>`, so `/it/stream` is `/stream` as far as routing
   * is concerned. Leaving the prefix out here would point every translated page
   * at its English equivalent, and search engines would drop the translations.
   */
  private canonicalUrl(): string {
    return `${ORIGIN}${localizedPath(this.locale, this.routePath())}`;
  }

  /** The primary-outlet path, without locale prefix, query or fragment. */
  private routePath(): string {
    const primary = this.router.parseUrl(this.router.url).root.children[PRIMARY_OUTLET];

    return primary ? primary.segments.map((segment) => segment.path).join('/') : '';
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
   * Rewrites the `hreflang` alternates for the page currently being shown.
   *
   * Every locale must list every other one *including itself*, and the set has
   * to be reciprocal: a page that is not pointed at from its siblings is treated
   * as unrelated. `x-default` goes to the source locale, which is what a user
   * with an unmatched language gets.
   */
  private setAlternates(): void {
    this.document
      .querySelectorAll(`link[${ALTERNATE_ATTR}]`)
      .forEach((link) => link.remove());

    const path = this.routePath();

    const entries = [
      ...SITE_LOCALES.map((locale) => ({
        hreflang: locale.hreflang,
        href: `${ORIGIN}${localizedPath(locale, path)}`,
      })),
      { hreflang: 'x-default', href: `${ORIGIN}${localizedPath(SITE_LOCALES[0], path)}` },
    ];

    for (const entry of entries) {
      const link = this.document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', entry.hreflang);
      link.setAttribute('href', entry.href);
      link.setAttribute(ALTERNATE_ATTR, '');
      this.document.head.appendChild(link);
    }
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
      { name: $localize`:@@seo.breadcrumb.home:Home`, item: `${ORIGIN}${localizedPath(this.locale, '')}` },
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
