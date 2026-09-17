import { Routes } from '@angular/router';
import { INFO_FAQ_JSON_LD } from './services/seo-structured-data';

// `data.seo` feeds SeoService: title, description, canonical, robots, the social
// tags and the page-level JSON-LD are re-applied on every navigation. A route
// without it falls back to the homepage values baked into index.html.
export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./feature/wheel-page/wheel-page').then((x) => x.WheelPage),
        data: {
            seo: {
                title: 'Free Wheel Online | Spin the Wheel & Random Picker - Wheelr',
                description:
                    'Wheelr is a free wheel spinner for raffles, classrooms, live streams and events. Customize colors, sounds and effects. Spin the wheel now — no signup needed!'
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
                title: 'How to Use Wheelr | Spin Wheel Guide, Examples & FAQ',
                description:
                    'Step-by-step guide to the Wheelr spin wheel: add participants, customize colors and sounds, run giveaways, classroom picks and live stream draws. With FAQ.',
                breadcrumb: 'Guide',
                jsonLd: [INFO_FAQ_JSON_LD]
            }
        }
    },
    {
        path: 'donation',
        loadComponent: () => import('./feature/donation/donation').then((x) => x.Donation),
        data: {
            seo: {
                title: 'Support Wheelr | Keep the Free Wheel Spinner Free',
                description:
                    'Wheelr is free and always will be. If it saves your team time or makes your events more fun, a donation keeps the project running.',
                breadcrumb: 'Support'
            }
        }
    },
    {
        path: 'templates',
        loadComponent: () => import('./feature/wheel-templates/wheel-templates').then((x) => x.WheelTemplates),
        data: {
            seo: {
                title: 'Wheel Templates | Ready-Made Spin Wheels - Wheelr',
                description:
                    'Ready-made wheels you can load in one click: Yes or No, Prize Giveaway, Team Picker, Truth or Dare, Discount Wheel, Movie Night and more. Free, no signup.',
                breadcrumb: 'Templates'
            }
        }
    },
    {
        path: 'privacy',
        loadComponent: () => import('./feature/privacy/privacy').then((x) => x.Privacy),
        data: {
            seo: {
                title: 'Privacy Policy - Wheelr',
                description:
                    'What Wheelr collects on the web and in the Android app, why, the GDPR basis for it, and how to export or delete your data at any time.',
                breadcrumb: 'Privacy'
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
                title: 'Shared Wheel - Wheelr',
                description:
                    'A wheel shared with Wheelr, the free online wheel spinner. Open the link to see the entries and spin it — no account needed.',
                robots: 'noindex, follow'
            }
        }
    },
    {
        path: '**',
        redirectTo: ''
    }
];
