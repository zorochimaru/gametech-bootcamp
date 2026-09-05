import { Dialog } from '@angular/cdk/dialog';
import { IMAGE_CONFIG, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatCard } from '@angular/material/card';
import { MatRipple } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, map, Observable, of, switchMap, tap } from 'rxjs';

import {
  AuthService,
  AuthUser,
  FirestoreCollections,
  FirestoreService,
  queryParamKeys,
  VoteTypes
} from '../../core';
import { CommonVoteItemFirestore } from '../core/interfaces/common-vote-item-firestore.interface';
import { PrivateService } from '../private.service';
import { ConfirmDialogComponent, MessageDialogComponent } from '../shared';

@Component({
  selector: 'app-star-vote-panel',
  imports: [MatCard, MatRipple, MatIcon, NgOptimizedImage],
  providers: [
    {
      provide: IMAGE_CONFIG,
      useValue: {
        placeholderResolution: 40
      }
    }
  ],
  templateUrl: './star-vote-panel.component.html',
  styleUrl: './star-vote-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StarVotePanelComponent implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #dr = inject(DestroyRef);
  readonly #firestoreService = inject(FirestoreService);
  readonly #authService = inject(AuthService);
  readonly #privateService = inject(PrivateService);
  readonly #dialog = inject(Dialog);

  protected readonly type = toSignal<VoteTypes>(
    this.#route.queryParams.pipe(map(params => params[queryParamKeys.voteType]))
  );
  protected readonly personsList = signal<CommonVoteItemFirestore[]>([]);

  protected readonly starsLeft = computed(() => {
    const user = this.#authService.authUser();
    return user?.stars?.[this.type()!] || 0;
  });

  public ngOnInit(): void {
    if (!this.type()) {
      this.#router.navigate(['/']);
    }

    this.#fetchPersons();
  }

  protected fetchPersons(): Observable<CommonVoteItemFirestore[]> {
    return this.#firestoreService.getList<CommonVoteItemFirestore>(
      this.#privateService.mapTypeToCollection(this.type()!),
      { orderBy: 'order' }
    );
  }

  protected onAddStar(id: string): void {
    if (!this.#authService.authUser()?.stars?.[this.type()!]) {
      return;
    }
    this.#dialog
      .open(ConfirmDialogComponent)
      .closed.pipe(
        filter(Boolean),
        switchMap(() => {
          return this.#firestoreService.incrementField<CommonVoteItemFirestore>(
            this.#privateService.mapTypeToCollection(this.type()!),
            id,
            'stars'
          );
        }),
        switchMap(() =>
          this.#firestoreService.decrementField<AuthUser>(
            FirestoreCollections.authUsers,
            this.#authService.authUser()?.id!,
            'stars.' + this.type()!
          )
        ),
        tap(() => {
          // update on client side to avoid flickering (and big bill :D)
          this.personsList.update(persons => {
            const personIndex = persons.findIndex(p => p.id === id);
            if (personIndex !== -1) {
              persons[personIndex].stars =
                (persons[personIndex].stars || 0) + 1;
            }
            return persons;
          });
          this.#authService.decrementUserStarsLocally(this.type()!);
        }),
        switchMap(() => {
          if (!this.#authService.authUser()?.stars?.[this.type()!]) {
            return this.#dialog
              .open(MessageDialogComponent, {
                data: { message: `Thanks for voting in ${this.type()}.` }
              })
              .closed.pipe(
                tap(() => {
                  this.#router.navigate(['/']);
                })
              );
          }
          return of(void 0);
        }),
        takeUntilDestroyed(this.#dr)
      )
      .subscribe();
  }

  #fetchPersons(): void {
    this.fetchPersons()
      .pipe(takeUntilDestroyed(this.#dr))
      .subscribe(persons => {
        this.personsList.set(persons);
      });
  }
}
