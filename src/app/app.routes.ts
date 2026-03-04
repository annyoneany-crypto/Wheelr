import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./feature/wheel-page/wheel-page').then((x) => x.WheelPage),
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
            }
        ]
    },
    {
        path: 'info',
        loadComponent: () => import('./feature/info/info').then((x) => x.Info)
    },
    {
        path: '**',
        redirectTo: ''
    }
];
