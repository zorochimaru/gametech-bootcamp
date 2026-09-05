import { inject } from '@angular/core';
import { CanMatchFn, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

import { RemoteConfigParams } from '../interfaces';
import { FeatureFlagService } from '../services';

export const remoteConfigGuard: CanMatchFn = (
  route: Route
): Observable<boolean> => {
  const key: RemoteConfigParams | undefined = route.data?.['rcKey'];
  if (!key) {
    return of(true);
  }
  const ffService = inject(FeatureFlagService);
  return ffService.isEnabled(key);
};
