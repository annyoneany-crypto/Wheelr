import { Routes } from '@angular/router';
import { INFO_FAQ_JSON_LD, STREAM_FAQ_JSON_LD } from './services/seo-structured-data';

// `data.seo` feeds SeoService: title, description, canonical, robots, the social
// tags and the page-level JSON-LD are re-applied on every navigation. A route
// without it falls back to the homepage values baked into index.html.
export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./feature/wheel-page/wheel-page').then((x) => x.WheelPage),
        data: {
            seo: {
                title: $localize`:@@seo.home.title:Free Wheel Online | Spin the Wheel & Random Picker - Wheelr`,
                description:
                    $localize`:@@seo.home.description:Wheelr is a free wheel spinner for raffles, classrooms, live streams and events. Customize colors, sounds and effects. Spin the wheel now — no signup needed!`
            }
        },
        children: [
            {
                path: 'users',
                outlet: 'panel',
                loadComponent: () => import('./feature/wl-settings/users/users').then((x) => x.Users)
            },
            {
                path: 'color-settings',
                outlet: 'panel',
                loadComponent: () => import('./feature/wl-settings/color-settings/color-settings').then((x) => x.ColorSettings)
            },
            {
                path: 'effects',
                outlet: 'panel',
                loadComponent: () => import('./feature/wl-settings/effects/effects').then((x) => x.Effects)
            },
            {
                path: 'sound',
                outlet: 'panel',
                loadComponent: () => import('./feature/wl-settings/sound/sound').then((x) => x.Sound)
            },
            {
                path: 'wheel-manager',
                outlet: 'panel',
                loadComponent: () => import('./feature/wl-settings/wheel-manager/wheel-manager').then((x) => x.WheelManager)
            }
        ]
    },
    {
        path: 'info',
        loadComponent: () => import('./feature/info/info').then((x) => x.Info),
        data: {
            seo: {
                title: $localize`:@@seo.info.title:How to Use Wheelr | Spin Wheel Guide, Examples & FAQ`,
                description:
                    $localize`:@@seo.info.description:Step-by-step guide to the Wheelr spin wheel: add participants, customize colors and sounds, run giveaways, classroom picks and live stream draws. With FAQ.`,
                breadcrumb: $localize`:@@seo.info.breadcrumb:Guide`,
                jsonLd: [INFO_FAQ_JSON_LD]
            }
        }
    },
    {
        path: 'donation',
        loadComponent: () => import('./feature/donation/donation').then((x) => x.Donation),
        data: {
            seo: {
                title: $localize`:@@seo.donation.title:Support Wheelr | Keep the Free Wheel Spinner Free`,
                description:
                    $localize`:@@seo.donation.description:Wheelr is free and always will be. If it saves your team time or makes your events more fun, a donation keeps the project running.`,
                breadcrumb: $localize`:@@seo.donation.breadcrumb:Support`
            }
        }
    },
    {
        path: 'templates',
        loadComponent: () => import('./feature/wheel-templates/wheel-templates').then((x) => x.WheelTemplates),
        data: {
            seo: {
                title: $localize`:@@seo.templates.title:Wheel Templates | Ready-Made Spin Wheels - Wheelr`,
                description:
                    $localize`:@@seo.templates.description:Ready-made wheels you can load in one click: Yes or No, Prize Giveaway, Team Picker, Truth or Dare, Discount Wheel, Movie Night and more. Free, no signup.`,
                breadcrumb: $localize`:@@seo.templates.breadcrumb:Templates`
            }
        }
    },
    {
        // One indexable page per ready-made wheel. Two segments, so it never
        // collides with the single-segment ':id' shared-wheel route below.
        path: 'templates/:slug',
        loadComponent: () =>
            import('./feature/wheel-templates/template-landing/template-landing').then((x) => x.TemplateLanding),
        data: {
            seo: {
                // Replaced per template by TemplateLanding.applySeo once the slug resolves.
                title: $localize`:@@seo.landing.title:Ready-Made Spin Wheel - Wheelr`,
                description:
                    $localize`:@@seo.landing.description:A ready-made wheel you can spin straight away and copy to your own wheels. Free, no signup.`
            }
        }
    },
    {
        path: 'stream',
        loadComponent: () => import('./feature/stream/stream').then((x) => x.Stream),
        data: {
            seo: {
                title: $localize`:@@seo.stream.title:Spin Wheel for Streams | OBS Giveaway Wheel Overlay`,
                description:
                    $localize`:@@seo.stream.description:Put a spin wheel on your stream: hide the interface, capture the window in OBS or Streamlabs, and draw a winner live. Free, no plugin, no signup for viewers.`,
                breadcrumb: $localize`:@@seo.stream.breadcrumb:For streamers`,
                jsonLd: [STREAM_FAQ_JSON_LD]
            }
        }
    },
    {
        path: 'privacy',
        loadComponent: () => import('./feature/privacy/privacy').then((x) => x.Privacy),
        data: {
            seo: {
                title: $localize`:@@seo.privacy.title:Privacy Policy - Wheelr`,
                description:
                    $localize`:@@seo.privacy.description:What Wheelr collects on the web and in the Android app, why, the GDPR basis for it, and how to export or delete your data at any time.`,
                breadcrumb: $localize`:@@seo.privacy.breadcrumb:Privacy`
            }
        }
    },
    // Keep every static page above this: ':id' swallows any single-segment path.
    //
    // Shared wheels are user content, not pages of this site: they are thin, they
    // all share one title, they are never linked from the sitemap, and ':id' also
    // catches every mistyped URL — which would otherwise enter the index as a
    // soft 404. 'follow' still passes their links on, and the og: tags are
    // untouched, so link previews keep working.
    {
        path: ':id',
        loadComponent: () => import('./feature/public-wheel/public-wheel').then((x) => x.PublicWheel),
        data: {
            seo: {
                title: $localize`:@@seo.shared.title:Shared Wheel - Wheelr`,
                description:
                    $localize`:@@seo.shared.description:A wheel shared with Wheelr, the free online wheel spinner. Open the link to see the entries and spin it — no account needed.`,
                robots: 'noindex, follow'
            }
        }
    },
    {
        path: '**',
        redirectTo: ''
    }
];
