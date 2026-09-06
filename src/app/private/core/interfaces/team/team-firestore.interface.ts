import { CommonFirestore } from '../../../../core';
import { Team } from './team.interface';

export interface TeamFirestore extends Team, CommonFirestore {}
