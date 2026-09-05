import { CommonFirestore } from '../../../../core';
import { Criteria } from './criteria.interface';

export interface CriteriaFirestore extends CommonFirestore, Criteria {}
