import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipEditedEvent } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

import {
  FirestoreBatchDeleteItem,
  FirestoreBatchWriteItem,
  FirestoreService,
  Operations,
  VoteTypes
} from '../../../core';
import { filterPredicate } from '../../../utils';
import { Criteria, CriteriaFirestore } from '../../core';
import { PrivateService } from '../../private.service';

@Component({
  selector: 'app-criterias-modal',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './criterias-modal.component.html',
  styleUrl: './criterias-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PrivateService]
})
export class CriteriasModalComponent {
  readonly #privateService = inject(PrivateService);
  readonly #firestoreService = inject(FirestoreService);
  readonly #snackBar = inject(MatSnackBar);

  protected criterias = signal<Criteria[] | CriteriaFirestore[]>([]);
  readonly #deletedCriterias = signal<CriteriaFirestore[]>([]);

  protected type = VoteTypes.teams;

  protected addCriteria(newCriteria: Criteria): void {
    if (newCriteria) {
      this.criterias.update(criterias => [...criterias, newCriteria]);
    }
  }

  protected removeCriteria(criteria: CriteriaFirestore | Criteria): void {
    this.criterias.update(criterias => {
      const index = criterias.findIndex(c => c.name === criteria.name);
      if (index < 0) {
        return criterias;
      }

      criterias.splice(index, 1);

      if (filterPredicate<CriteriaFirestore>(criteria)) {
        this.#deletedCriterias.update(deleted => [...deleted, criteria]);
      }
      return [...criterias];
    });
  }

  protected editCriteria(
    criteria: Criteria | CriteriaFirestore,
    event: MatChipEditedEvent
  ) {
    const value = event.value.trim();

    // Remove criteria if it no longer has a name
    if (!value) {
      this.removeCriteria(criteria);
      return;
    }

    // Edit existing criteria
    this.criterias.update(criterias => {
      const index = criterias.findIndex(c => c.name === criteria.name);
      if (index >= 0) {
        criterias[index].name = value;
        return [...criterias];
      }
      return criterias;
    });
  }

  protected fetchCriterias(): void {
    this.#firestoreService
      .getList<CriteriaFirestore>(
        this.#privateService.mapTypeToCriteriaCollection(this.type)
      )
      .subscribe(data => {
        this.criterias.set(data);
      });
  }

  protected onSaveCriterias(): void {
    const items: FirestoreBatchWriteItem<Partial<CriteriaFirestore>>[] =
      this.criterias().map(item => ({
        operation: (item as CriteriaFirestore)['id']
          ? Operations.update
          : Operations.create,
        docId:
          ((item as CriteriaFirestore)['id'] as string) ||
          this.#generateId(this.type),
        collectionName: this.#privateService.mapTypeToCriteriaCollection(
          this.type
        ),
        data: { ...item }
      }));
    const deleteItems: FirestoreBatchDeleteItem[] =
      this.#deletedCriterias().map(item => ({
        operation: Operations.delete,
        docId: item.id,
        collectionName: this.#privateService.mapTypeToCriteriaCollection(
          this.type
        )
      }));
    const deleteReqs = this.#firestoreService.batchSave(deleteItems);
    const batchReqs = this.#firestoreService.batchSave(items);

    forkJoin([batchReqs, deleteReqs]).subscribe(() => {
      this.criterias.set([]);
      this.#snackBar.open('Criteria updated!', 'Ok', { duration: 3000 });
    });
  }

  #generateId(type: VoteTypes): string {
    return this.#firestoreService.autoId(
      this.#privateService.mapTypeToCollection(type)
    );
  }
}
