import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionGroup,
  type CollectionReference,
  deleteDoc,
  doc,
  type DocumentChange,
  type DocumentChangeType,
  documentId,
  type DocumentReference,
  type DocumentSnapshot,
  type FieldPath,
  getCountFromServer,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  type OrderByDirection,
  query,
  type QueryConstraint,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  type WhereFilterOp,
  writeBatch
} from 'firebase/firestore';
import chunk from 'lodash-es/chunk';
import {
  filter,
  forkJoin,
  from,
  map,
  Observable,
  of,
  switchMap,
  take,
  throwError
} from 'rxjs';

import { exhaustiveCheck, filterPredicate } from '../../utils';
import { FirebaseProvider } from '../firebase-provider';
import {
  CommonFirestore,
  FirestoreBatchDeleteItem,
  FirestoreBatchWriteItem,
  FirestoreCollections,
  Operations,
  PartialSubtype
} from '../interfaces';
import { AuthService } from './auth.service';

export type FirestoreRecord = Partial<CommonFirestore>;
export type CustomQuery = [string | FieldPath, WhereFilterOp, unknown];
export interface GetListOptions {
  customQuery?: CustomQuery[];
  orderBy?: string;
  limit?: number;
  startAfter?: DocumentReference | Timestamp | string | null;
  orderDirection?: OrderByDirection;
  withParentId?: boolean;
}
export interface LiveChangesResponse<T> {
  data: T;
  operation: DocumentChangeType;
}

export interface CustomListWithPagination<T> {
  items: T[];
  last: DocumentReference<T> | null;
}

export const MAX_BATCH_SIZE = 500;
export const MAX_IN_QUERY_SIZE = 30;

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  // Need to auth to update/create/delete
  readonly #authService = inject(AuthService);
  readonly #fbFirestore = inject(FirebaseProvider).firestore;

  readonly #signedUser$ = this.#authService.currentUser$;

  public static getIdChunks<T>(items: T[], idKey: keyof T): string[][] {
    // Get unique non empty ids
    const ids = Array.from(
      new Set(items.map(wg => wg[idKey] as string))
    ).filter(filterPredicate);
    return chunk(ids, MAX_IN_QUERY_SIZE);
  }

  public autoId(collectionName: FirestoreCollections): string {
    return doc(this.#getCollectionRef(collectionName)).id;
  }

  public getDocRef(
    collectionName: FirestoreCollections,
    id: string
  ): DocumentReference {
    return doc(this.#fbFirestore, collectionName, id);
  }

  public get<T extends FirestoreRecord>(
    collectionName: FirestoreCollections,
    docId: string
  ): Observable<T | null> {
    const docRef = doc(this.#getCollectionRef<T>(collectionName), docId);
    return from(getDoc(docRef)).pipe(map(this.#mapDocSnapshot));
  }

  /**
   * Count number of documents without downloading them, very efficient
   * Use it when you need to know if records exist or to count them
   */
  public count(
    collectionName: string,
    options?: GetListOptions
  ): Observable<number> {
    const queryConstraints = this.#getQueryConstraints(options);
    const collectionQuery = query(
      this.#getCollectionRef(collectionName),
      ...queryConstraints
    );
    return from(getCountFromServer(collectionQuery)).pipe(
      map(snapshot => snapshot.data().count)
    );
  }

  public getList<T extends FirestoreRecord>(
    collectionName: string,
    options?: GetListOptions
  ): Observable<T[]> {
    const queryConstraints = this.#getQueryConstraints(options);
    const collectionQuery = query(
      this.#getCollectionRef<T>(collectionName),
      ...queryConstraints
    );
    return from(getDocs(collectionQuery)).pipe(
      map(
        snapshot =>
          snapshot.docs.map(docSnapshot =>
            this.#mapDocSnapshot<T>(docSnapshot)
          ) as T[]
      )
    );
  }

  public getListWithPagination<T extends FirestoreRecord>(
    collectionName: FirestoreCollections,
    queryOptions: GetListOptions
  ): Observable<{
    items: T[];
    last: DocumentReference | null;
  }> {
    const queryConstraints = this.#getQueryConstraints(queryOptions);
    const collectionQuery = query(
      this.#getCollectionRef<T>(collectionName),
      ...queryConstraints
    );
    return from(getDocs(collectionQuery)).pipe(
      map(snapshot => ({
        items: snapshot.docs.map(docSnapshot =>
          this.#mapDocSnapshot<T>(docSnapshot)
        ) as T[],
        last: !snapshot.empty
          ? this.getDocRef(collectionName, snapshot.docs.at(-1)!.id)
          : null
      }))
    );
  }

  public getListByIds<T extends FirestoreRecord>(
    collectionName: FirestoreCollections,
    ids: string[],
    idFieldName?: Extract<keyof T, string>
  ): Observable<T[]> {
    const idChunks = chunk(ids, MAX_IN_QUERY_SIZE);
    if (!idChunks.length) {
      return of([]);
    }
    return forkJoin(
      idChunks.map(idChunk =>
        this.getList<T>(collectionName, {
          customQuery: [[idFieldName || documentId(), 'in', idChunk]]
        })
      )
    ).pipe(map(res => res.flat()));
  }

  /**
   * Emit individual document change for specified query
   */
  public getLiveListChanges<T extends FirestoreRecord>(
    collectionName: FirestoreCollections,
    options?: GetListOptions
  ): Observable<LiveChangesResponse<T>[]> {
    const queryConstraints = this.#getQueryConstraints(options);

    const collectionQuery = query(
      options?.withParentId
        ? this.#getGroupCollectionRef<T>(collectionName)
        : this.#getCollectionRef<T>(collectionName),
      ...queryConstraints
    );

    const obs = new Observable<DocumentChange<T>[]>(subscriber =>
      onSnapshot(
        collectionQuery,
        snapshot => subscriber.next(snapshot.docChanges()),
        error => subscriber.error(error),
        () => subscriber.complete()
      )
    );

    return obs.pipe(
      map(documentChanges => {
        return documentChanges.map(documentChange => {
          return {
            data: (options?.withParentId
              ? this.#mapDocSnapshotWithParentId(documentChange.doc)
              : this.#mapDocSnapshot(documentChange.doc)) as T,
            operation: documentChange.type
          };
        });
      })
    );
  }

  public create<T extends FirestoreRecord>(
    collectionName: string,
    data: PartialSubtype<T, FirestoreRecord>,
    customId?: string
  ): Observable<string> {
    return this.#signedUser$.pipe(
      take(1),
      switchMap(currUser => {
        const { id, ...rest } = data;
        const copy: Record<string, unknown> = {
          ...rest,
          createdAt: serverTimestamp(),
          createdBy: currUser?.uid || 'customer',
          updatedAt: serverTimestamp(),
          updatedBy: currUser?.uid || 'customer'
        };

        try {
          if (customId) {
            const docRef = doc(
              this.#getCollectionRef<T>(collectionName),
              customId
            );
            return from(setDoc(docRef, copy)).pipe(map(() => customId));
          }
          return from(
            addDoc(this.#getCollectionRef<T>(collectionName), copy)
          ).pipe(map(ref => ref.id));
        } catch (e) {
          return throwError(() => e);
        }
      })
    );
  }

  public update<T extends FirestoreRecord>(
    collectionName: string,
    docId: string,
    data: Partial<T>,
    merge = true
  ): Observable<void> {
    return this.#signedUser$.pipe(
      filter(Boolean),
      take(1),
      switchMap(currUser => {
        const { id, ...rest } = data;
        const copy: Record<string, unknown> = {
          ...rest,
          updatedAt: serverTimestamp(),
          updatedBy: currUser.uid
        };

        try {
          const docRef = doc(this.#getCollectionRef<T>(collectionName), docId);
          return from(setDoc(docRef, copy, { merge }));
        } catch (e) {
          return throwError(() => e);
        }
      })
    );
  }

  public delete(
    collectionName: FirestoreCollections,
    docId: string
  ): Observable<void> {
    return this.#signedUser$.pipe(
      filter(Boolean),
      take(1),
      switchMap(() =>
        from(deleteDoc(doc(this.#getCollectionRef(collectionName), docId)))
      )
    );
  }

  public batchSave<T extends FirestoreRecord>(
    items: readonly (FirestoreBatchWriteItem<T> | FirestoreBatchDeleteItem)[]
  ): Observable<void> {
    return this.#signedUser$.pipe(
      filter(Boolean),
      take(1),
      switchMap(currUser => {
        if (items.length > MAX_BATCH_SIZE) {
          throw new Error(
            `Max batch size limit is ${MAX_BATCH_SIZE} operations`
          );
        }

        const batch = writeBatch(this.#fbFirestore);

        items.forEach(item => {
          const docRef = doc(
            this.#getCollectionRef<T>(item.collectionName),
            item.docId
          );
          switch (item.operation) {
            case Operations.create: {
              const { id, ...rest } = item.data;
              const copy: Record<string, unknown> = {
                ...rest,
                createdAt: serverTimestamp(),
                createdBy: currUser.uid,
                updatedAt: serverTimestamp(),
                updatedBy: currUser.uid
              };
              batch.set(docRef, copy);
              break;
            }
            case Operations.update: {
              const { id, ...rest } = item.data;
              const copy: Record<string, unknown> = {
                ...rest,
                updatedAt: serverTimestamp(),
                updatedBy: currUser.uid
              };
              batch.set(docRef, copy, { merge: true });
              break;
            }
            case Operations.delete: {
              batch.delete(docRef);
              break;
            }
            default:
              exhaustiveCheck(item);
          }
        });

        return from(batch.commit());
      })
    );
  }

  public incrementField<T extends FirestoreRecord>(
    collectionName: FirestoreCollections,
    docId: string,
    field: keyof T
  ): Observable<void> {
    return this.#signedUser$.pipe(
      filter(Boolean),
      take(1),
      switchMap(() => {
        const docRef = doc(this.#getCollectionRef<T>(collectionName), docId);
        return from(updateDoc(docRef, { [field]: increment(1) }));
      })
    );
  }

  public decrementField<T extends FirestoreRecord>(
    collectionName: FirestoreCollections,
    docId: string,
    field: string
  ): Observable<void> {
    return this.#signedUser$.pipe(
      filter(Boolean),
      take(1),
      switchMap(() => {
        const docRef = doc(this.#getCollectionRef<T>(collectionName), docId);
        return from(updateDoc(docRef, { [field]: increment(-1) }));
      })
    );
  }

  #getQueryConstraints(options?: GetListOptions): QueryConstraint[] {
    const queryConstraints: QueryConstraint[] = (
      options?.customQuery || []
    ).map(([field, operation, value]) => where(field, operation, value));

    if (options?.orderBy) {
      queryConstraints.push(orderBy(options.orderBy, options.orderDirection));
    }

    if (options?.limit) {
      queryConstraints.push(limit(options.limit));
    }

    if (options?.startAfter) {
      if (!options?.orderBy) {
        queryConstraints.push(
          orderBy('updatedAt', options?.orderDirection || 'asc')
        );
      }

      queryConstraints.push(startAfter(options.startAfter));
    }

    return queryConstraints;
  }

  #mapDocSnapshotWithParentId<
    T extends FirestoreRecord & { parentId?: string }
  >(docSnapshot: DocumentSnapshot<T>): T | null {
    const result = this.#mapDocSnapshot(docSnapshot);

    if (result === null) {
      return null;
    }

    if (docSnapshot.ref.parent?.parent?.id) {
      result.parentId = docSnapshot.ref.parent.parent.id;
    }

    return result;
  }

  #mapDocSnapshot<T extends FirestoreRecord>(
    docSnapshot: DocumentSnapshot<T>
  ): T | null {
    if (!docSnapshot.exists()) {
      return null;
    }

    const doc = docSnapshot.data();
    Object.keys(doc).forEach(key => {
      const field = key as keyof T;

      // Convert Timestamp to Date (non-recursive)
      if (doc[field] instanceof Timestamp) {
        doc[field] = (
          doc[field] as unknown as Timestamp
        ).toDate() as unknown as T[keyof T];
      }
    });

    return {
      id: docSnapshot.id,
      ...doc
    };
  }

  #getGroupCollectionRef<T extends FirestoreRecord>(
    collectionName: string
  ): CollectionReference<T> {
    return collectionGroup(
      this.#fbFirestore,
      collectionName
    ) as unknown as CollectionReference<T>;
  }

  #getCollectionRef<T extends FirestoreRecord>(
    collectionName: string
  ): CollectionReference<T> {
    return collection(
      this.#fbFirestore,
      collectionName
    ) as unknown as CollectionReference<T>;
  }
}
