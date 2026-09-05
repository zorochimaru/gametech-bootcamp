import { CommonFirestore } from '../../../../core';
import { Cosplay } from './cosplay.interface';

export interface CosplayFirestore extends Cosplay, CommonFirestore {}
