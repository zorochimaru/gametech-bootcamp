import { Routes } from '@angular/router';

import { authGuard, AuthService, loginGuard, RouterLinks } from './core';

export const routes: Routes = [
  {
    path: RouterLinks.login,
    providers: [AuthService],
    canMatch: [loginGuard],
    loadComponent: () =>
      import('./login/login.component').then(c => c.LoginComponent)
  },
  {
    path: '',
    providers: [AuthService],
    canMatch: [authGuard],
    loadChildren: () =>
      import('./private/private.routes').then(c => c.privateRoutes)
  },
  { path: '**', redirectTo: '/', pathMatch: 'full' }
];
