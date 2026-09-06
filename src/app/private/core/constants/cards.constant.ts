import { Roles, VoteTypes } from '../../../core';
import { CardLink } from '../interfaces';

const allCards: Record<Roles.jury, CardLink[]> = {
  jury: [{ type: VoteTypes.teams, title: 'Vote Panel', icon: '' }]
};

export const dashboardCards: Record<Roles, CardLink[]> = {
  [Roles.administrator]: allCards.jury,
  [Roles.jury]: allCards.jury
};
