import { inject } from '@angular/core';
import {
  CanMatchFn,
  Route,
  Router,
  UrlSegment,
  UrlTree
} from '@angular/router';
import { map, Observable } from 'rxjs';

import { queryParamKeys } from '../constants';
import { RouterLinks } from '../interfaces';
import { AuthService } from '../services';

export const authGuard: CanMatchFn = (
  _route: Route,
  segments: UrlSegment[]
): Observable<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const path = segments.map(segment => segment.path).join('/');
  const queryParams = window.location.search ? window.location.search : '';
  const redirectLink = `${path}${queryParams}`;

  return auth.isAuthenticated$.pipe(
    map(isAuthenticated => {
      if (isAuthenticated) {
        return true;
      }
      return router.createUrlTree([`/${RouterLinks.login}`], {
        queryParams: { [queryParamKeys.redirectLink]: redirectLink }
      });
    })
  );
};
