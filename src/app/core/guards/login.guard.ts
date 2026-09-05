import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { map, Observable } from 'rxjs';

import { RouterLinks } from '../interfaces';
import { AuthService } from '../services';

export const loginGuard: CanMatchFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated$.pipe(
    map(isAuthenticated => {
      if (isAuthenticated) {
        return router.createUrlTree([`/${RouterLinks.dashboard}`]);
      } else {
        return true;
      }
    })
  );
};
