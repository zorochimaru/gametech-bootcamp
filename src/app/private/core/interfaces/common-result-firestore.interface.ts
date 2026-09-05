import { CommonFirestore } from '../../../core';
import { CommonResult } from './common-result.interface';

export interface CommonResultFirestore extends CommonFirestore {
  results: CommonResult[];
}
