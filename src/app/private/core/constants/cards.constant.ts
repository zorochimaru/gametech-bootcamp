import { Roles, VoteTypes } from '../../../core';
import { CardLink } from '../interfaces';

const allCards: Record<Roles.cosplay | Roles.kpop, CardLink[]> = {
  cosplay: [
    { type: VoteTypes.cosplay, title: 'Cosplay', icon: 'solo-cosplay.svg' },
    {
      type: VoteTypes.cosplayTeam,
      title: 'Cosplay Team',
      icon: 'team-cosplay.svg'
    }
  ],
  kpop: [{ type: VoteTypes.kpop, title: 'Kpop', icon: 'kpop.svg' }]
};

export const dashboardCards: Record<Roles, CardLink[]> = {
  [Roles.administrator]: [...allCards.cosplay, ...allCards.kpop],
  [Roles.cosplay]: allCards.cosplay,
  [Roles.kpop]: allCards.kpop,
  [Roles.user]: [...allCards.cosplay, ...allCards.kpop]
};
