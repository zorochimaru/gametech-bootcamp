import { CommonFirestore } from '../../../core';
import { CommonVoteItem } from './common-vote-item.interface';

export interface CommonVoteItemFirestore
  extends CommonVoteItem,
    CommonFirestore {}
