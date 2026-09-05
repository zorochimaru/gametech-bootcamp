import { CommonFirestore } from './firestore';
import { Roles } from './roles.enum';
import { VoteTypes } from './vote-types.enum';

export interface AuthUser extends CommonFirestore {
  email: string;
  role: Roles;
  votedTypes: VoteTypes[];
  stars?: {
    [VoteTypes.cosplay]: number;
    [VoteTypes.kpop]: number;
    [VoteTypes.cosplayTeam]: number;
  };
}
