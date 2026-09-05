import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { filter, switchMap } from 'rxjs';

import {
  AuthService,
  AuthUser,
  FirestoreCollections,
  FirestoreService
} from '../core';
import { HeaderComponent } from '../shared';

@Component({
  selector: 'app-private',
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './private.component.html',
  styleUrl: './private.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrivateComponent implements OnInit {
  #firestoreService = inject(FirestoreService);
  #authService = inject(AuthService);
  #dr = inject(DestroyRef);

  public ngOnInit(): void {
    this.#authService.currentUser$
      .pipe(
        filter(Boolean),
        switchMap(user =>
          this.#firestoreService.get<AuthUser>(
            FirestoreCollections.authUsers,
            user.uid
          )
        ),
        filter(Boolean),
        takeUntilDestroyed(this.#dr)
      )
      .subscribe(authUser => this.#authService.setCurrentUser(authUser));
  }
}
