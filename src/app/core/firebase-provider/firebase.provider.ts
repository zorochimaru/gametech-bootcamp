import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { getRemoteConfig } from 'firebase/remote-config';
import { getStorage } from 'firebase/storage';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseProvider {
  readonly #app = initializeApp(environment.firebase);

  public readonly auth = getAuth(this.#app);
  public readonly firestore = initializeFirestore(this.#app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  public readonly remoteConfig = getRemoteConfig(this.#app);
  public readonly storage = getStorage(this.#app);
}
