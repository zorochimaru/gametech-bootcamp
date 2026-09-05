import { CommonFirestore } from '../../../../core';
import { CosplayResult } from './cosplay-result.interface';

export interface CosplayResultFirestore
  extends CommonFirestore,
    CosplayResult {}
