import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink } from '@angular/router';
import { filter, map, switchMap } from 'rxjs';

import {
  AuthService,
  AuthUser,
  FirestoreCollections,
  FirestoreService,
  Roles,
  RouterLinks
} from '../../core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  #authService = inject(AuthService);
  #router = inject(Router);
  #firestoreService = inject(FirestoreService);

  protected isAdmin = toSignal(
    this.#authService.currentUser$.pipe(
      filter(Boolean),
      switchMap(user =>
        this.#firestoreService.get<AuthUser>(
          FirestoreCollections.authUsers,
          user.uid
        )
      ),
      filter(Boolean),
      map(authUser => authUser.role === Roles.administrator)
    )
  );

  protected adminPanelRouterLink = RouterLinks.adminPanel;

  protected logOut(): void {
    this.#authService
      .signOut()
      .subscribe(() => this.#router.navigate([RouterLinks.login]));
  }
}
