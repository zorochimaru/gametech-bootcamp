import { Operations } from '../operations.enum';

export interface FirestoreBatchWriteItem<T> {
  collectionName: string;
  data: T;
  docId: string;
  operation: Operations.create | Operations.update;
}

export interface FirestoreBatchDeleteItem {
  collectionName: string;
  docId: string;
  operation: Operations.delete;
}
