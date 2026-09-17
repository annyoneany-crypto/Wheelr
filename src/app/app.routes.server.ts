import { RenderMode, ServerRoute } from '@angular/ssr';
import { TEMPLATE_LANDING_PAGES } from './feature/wheel-templates/wheel-templates.seo';

/**
 * How each route is produced at build time.
 *
 * Vercel serves this app as static files, so there is no server to render on
 * request: a route is either **prerendered** into its own `index.html` at build
 * time, or left to the browser. Prerendering is the whole point of the SEO work
 * — until now every URL served the same empty shell, so a crawler that does not
 * execute JavaScript read the homepage tags on all of them.
 *
 * `/:id` stays client-rendered: shared wheels are user content pulled from
 * Firestore at runtime, there is no finite list of them to prerender, and they
 * are `noindex` anyway.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'info', renderMode: RenderMode.Prerender },
  { path: 'donation', renderMode: RenderMode.Prerender },
  { path: 'privacy', renderMode: RenderMode.Prerender },
  { path: 'templates', renderMode: RenderMode.Prerender },
  {
    // One file per ready-made wheel, from the same list that feeds the sitemap
    // and the markdown mirror — add a template with landing copy and its page
    // is prerendered on the next build, with nothing else to remember.
    path: 'templates/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () =>
      TEMPLATE_LANDING_PAGES.map((page) => ({ slug: page.seo.slug })),
  },
  { path: ':id', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Client },
];
