import { CommonVoteItem } from '../common-vote-item.interface';

export interface Cosplay extends CommonVoteItem {
  fandom: string;
  fandomType: string;
  costumeType: string;
  characterDescription: string;
}
