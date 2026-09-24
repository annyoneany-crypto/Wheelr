/**
 * The locales the site is built in, and where each one lives.
 *
 * Mirrors the `i18n` block of `angular.json`: every locale there gets a
 * `subPath`, which Angular uses as both the `<base href>` and the output
 * directory. This file is what the SEO layer reads to build canonicals and the
 * `hreflang` alternates, so the two must be kept in step — a locale added to the
 * build but not here would be published with no alternates pointing at it, and
 * effectively invisible.
 */
export interface SiteLocale {
  /** `LOCALE_ID` as Angular reports it inside that build. */
  id: string;
  /** URL segment; empty for the source locale, which lives at the root. */
  subPath: string;
  /** Value for the `hreflang` attribute. */
  hreflang: string;
  /** Shown in the language switcher. */
  label: string;
  /** `og:locale`, which Facebook and friends want as `language_TERRITORY`. */
  ogLocale: string;
}

export const SITE_LOCALES: readonly SiteLocale[] = [
  { id: 'en-US', subPath: '', hreflang: 'en', label: 'English', ogLocale: 'en_US' },
  { id: 'it', subPath: 'it', hreflang: 'it', label: 'Italiano', ogLocale: 'it_IT' },
  { id: 'de', subPath: 'de', hreflang: 'de', label: 'Deutsch', ogLocale: 'de_DE' },
  { id: 'fr', subPath: 'fr', hreflang: 'fr', label: 'Français', ogLocale: 'fr_FR' },
  { id: 'es', subPath: 'es', hreflang: 'es', label: 'Español', ogLocale: 'es_ES' },
  { id: 'zh', subPath: 'zh', hreflang: 'zh', label: '中文', ogLocale: 'zh_CN' },
];

/** The locale search engines are sent to when no language matches the user. */
export const DEFAULT_LOCALE = SITE_LOCALES[0];

/**
 * Angular reports the source locale as `en-US`, but a build can also report a
 * bare `en`; anything unknown falls back to the source locale rather than
 * producing URLs for a language that is not published.
 */
export function resolveLocale(localeId: string): SiteLocale {
  const normalized = localeId?.toLowerCase() ?? '';

  return (
    SITE_LOCALES.find((locale) => locale.id.toLowerCase() === normalized) ??
    SITE_LOCALES.find((locale) => normalized.startsWith(locale.hreflang)) ??
    DEFAULT_LOCALE
  );
}

/**
 * localStorage key holding the base path (`/it/`, `/` …) of the language picked
 * in the Android app. Read by the inline script in `index.html`, which cannot
 * import this file: keep the two in step.
 */
export const NATIVE_LOCALE_STORAGE_KEY = 'wheelr.appLocale';

/**
 * Where the language switcher points inside the Android app.
 *
 * Capacitor's local server answers every path whose last segment has no dot
 * with the *root* `index.html` — the English bundle — so `/it/stream` would
 * boot English Angular, whose router then takes `it` for a shared wheel's id.
 * Naming the file makes the server hand out that locale's own `index.html`; the
 * route travels in `wl-route` and the inline script in `index.html` puts it back
 * into the URL before Angular reads it.
 */
export function nativeLocaleEntry(locale: SiteLocale, path: string): string {
  const prefix = locale.subPath ? `/${locale.subPath}` : '';
  const route = path.replace(/^\/+/, '');

  return `${prefix}/index.html${route ? `?wl-route=${encodeURIComponent(route)}` : ''}`;
}

/** `/it/templates/prize-wheel` — the path a given locale serves `path` at. */
export function localizedPath(locale: SiteLocale, path: string): string {
  const clean = path.replace(/^\/+/, '');
  const prefix = locale.subPath ? `/${locale.subPath}` : '';

  return clean ? `${prefix}/${clean}` : `${prefix}/`;
}
