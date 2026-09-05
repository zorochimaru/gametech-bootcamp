import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatRippleModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { AuthService, Roles, RouterLinks } from '../../core';
import { dashboardCards } from '../core/constants';

@Component({
  selector: 'app-dashboard',
  imports: [MatCardModule, MatIconModule, RouterLink, MatRippleModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  #authService = inject(AuthService);

  protected readonly cardLinks = computed(() => {
    const authUser = this.#authService.authUser();
    if (!authUser) {
      return [];
    }
    return dashboardCards[authUser.role].filter(
      card => !authUser.votedTypes.includes(card.type)
    );
  });

  protected readonly showResultsLink = computed(() => {
    const authUser = this.#authService.authUser();
    if (!authUser) {
      return [];
    }
    return dashboardCards[authUser.role].some(card =>
      authUser?.votedTypes.includes(card.type)
    );
  });

  protected readonly votePanelRouterLink = computed(() => {
    const authUser = this.#authService.authUser();
    return authUser?.role === Roles.user
      ? RouterLinks.starsVotePanel
      : RouterLinks.votePanel;
  });

  protected resultsRouterLink = RouterLinks.results;
}
