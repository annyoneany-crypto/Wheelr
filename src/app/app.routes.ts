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
        path: '**',
        redirectTo: 'users'
    }
];
