import { inject, Injectable } from '@angular/core';
import { fetchAndActivate, getAll, Value } from 'firebase/remote-config';
import {
  from,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  take,
  tap
} from 'rxjs';

import { FirebaseProvider } from '../firebase-provider';
import { RemoteConfigParams } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class RemoteConfigService {
  readonly #ffService = inject(FirebaseProvider).remoteConfig;
  readonly #configReady$: Observable<boolean>;
  constructor() {
    this.#configReady$ = from(fetchAndActivate(this.#ffService)).pipe(
      tap(
        () => (this.#ffService.settings.minimumFetchIntervalMillis = 3600000)
      ),
      shareReplay(1)
    );
  }

  public getString(key: RemoteConfigParams): Observable<string> {
    return this.#getConfig().pipe(map(config => config[key]?.asString() || ''));
  }

  public getNumber(key: RemoteConfigParams): Observable<number> {
    return this.#getConfig().pipe(map(config => config[key]?.asNumber() || 0));
  }

  public getBoolean(key: RemoteConfigParams): Observable<boolean> {
    return this.#getConfig().pipe(
      map(config => config[key]?.asBoolean() ?? false)
    );
  }

  public getStrings(keys: RemoteConfigParams[]): Observable<{
    [K in RemoteConfigParams]: string;
  }> {
    if (!keys.length) {
      return of(
        {} as {
          [K in RemoteConfigParams]: string;
        }
      );
    }
    return this.#getConfig().pipe(
      map(config => {
        return keys.reduce(
          (res, key) => {
            res[key] = config[key]?.asString() || '';
            return res;
          },
          {} as {
            [K in RemoteConfigParams]: string;
          }
        );
      })
    );
  }

  public getNumbers(keys: RemoteConfigParams[]): Observable<{
    [K in RemoteConfigParams]: number;
  }> {
    if (!keys.length) {
      return of(
        {} as {
          [K in RemoteConfigParams]: number;
        }
      );
    }
    return this.#getConfig().pipe(
      map(config => {
        return keys.reduce(
          (res, key) => {
            res[key] = config[key]?.asNumber() || 0;
            return res;
          },
          {} as {
            [K in RemoteConfigParams]: number;
          }
        );
      })
    );
  }

  public getBooleans(keys: RemoteConfigParams[]): Observable<{
    [K in RemoteConfigParams]: boolean;
  }> {
    if (!keys.length) {
      return of(
        {} as {
          [K in RemoteConfigParams]: boolean;
        }
      );
    }
    return this.#getConfig().pipe(
      map(config => {
        return keys.reduce(
          (res, key) => {
            res[key] = config[key]?.asBoolean() ?? false;
            return res;
          },
          {} as {
            [K in RemoteConfigParams]: boolean;
          }
        );
      })
    );
  }

  #getConfig(): Observable<Record<RemoteConfigParams, Value>> {
    return this.#configReady$.pipe(
      map(() => getAll(this.#ffService) as Record<RemoteConfigParams, Value>),
      take(1)
    );
  }
}
