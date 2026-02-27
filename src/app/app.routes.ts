import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'users',
        loadComponent: () => import('./feature/wl-settings/users/users').then((x) => x.Users)
    },
    {
        path: 'color-settings',
        loadComponent: () => import('./feature/wl-settings/color-settings/color-settings').then((x) => x.ColorSettings)
    },
    {
        path: 'effects',
        loadComponent: () => import('./feature/wl-settings/effects/effects').then((x) => x.Effects)
    },
    {
        path: 'sound',
        loadComponent: () => import('./feature/wl-settings/sound/sound').then((x) => x.Sound)
    },
    {
        path: '**',
        redirectTo: 'users'
    }
];
