import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { filter, forkJoin, of, switchMap } from 'rxjs';

import {
  AuthService,
  AuthUser,
  FirestoreCollections,
  FirestoreService,
  Roles,
  VoteTypes
} from '../core';

@Component({
  selector: 'app-google-login',
  imports: [MatButtonModule],
  templateUrl: './google-login.component.html',
  styleUrl: './google-login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoogleLoginComponent {
  readonly #firestoreService = inject(FirestoreService);
  readonly #authService = inject(AuthService);
  readonly #dr = inject(DestroyRef);
  readonly #router = inject(Router);

  protected signInWithGoogle(): void {
    this.#authService
      .signInWithGoogle()
      .pipe(
        filter(res => !!res.user),
        switchMap(res => {
          return forkJoin([
            of(res),
            this.#firestoreService.get<AuthUser>(
              FirestoreCollections.authUsers,
              res.user!.uid
            )
          ]);
        }),
        switchMap(([googleUser, authUser]) => {
          if (authUser) {
            this.#authService.setCurrentUser(authUser);
            return of(authUser);
          } else {
            return this.#firestoreService
              .create<AuthUser>(
                FirestoreCollections.authUsers,
                {
                  email: googleUser?.user?.email || '',
                  role: Roles.user,
                  votedTypes: [],
                  stars: {
                    [VoteTypes.cosplay]: 10,
                    [VoteTypes.kpop]: 10,
                    [VoteTypes.cosplayTeam]: 5
                  }
                },
                googleUser?.user?.uid
              )
              .pipe(
                switchMap(id => {
                  return this.#firestoreService.get<AuthUser>(
                    FirestoreCollections.authUsers,
                    id
                  );
                })
              );
          }
        }),
        takeUntilDestroyed(this.#dr)
      )
      .subscribe(user => {
        if (user) {
          this.#authService.setCurrentUser(user);
          this.#router.navigate(['/']);
        } else {
          alert('Login failed, please try again.');
        }
      });
  }
}
