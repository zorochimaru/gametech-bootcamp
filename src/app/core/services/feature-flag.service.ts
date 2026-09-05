import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';

import { RemoteConfigParams } from '../interfaces';
import { RemoteConfigService } from './remote-config.service';

export type FeatureFlags = RemoteConfigParams | RemoteConfigParams[] | null;

@Injectable({
  providedIn: 'root'
})
export class FeatureFlagService {
  readonly #rcService = inject(RemoteConfigService);

  public isEnabled(keyRaw: FeatureFlags): Observable<boolean> {
    if (!keyRaw) {
      return of(true);
    }

    const requiredKeys = Array.isArray(keyRaw) ? keyRaw : [keyRaw];

    if (!requiredKeys.length) {
      return of(true);
    }

    return this.#rcService
      .getBooleans(requiredKeys)
      .pipe(map(config => requiredKeys.some(key => config[key])));
  }

  public isEnabledGroup(keys: RemoteConfigParams[]): Observable<{
    [K in RemoteConfigParams]?: boolean;
  }> {
    return this.#rcService.getBooleans(keys);
  }
}
