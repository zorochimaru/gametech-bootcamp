import { Dialog } from '@angular/cdk/dialog';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter, forkJoin, switchMap } from 'rxjs';
import { read, utils } from 'xlsx';

import {
  AuthService,
  AuthUser,
  FirestoreBatchDeleteItem,
  FirestoreBatchWriteItem,
  FirestoreCollections,
  FirestoreService,
  Operations,
  VoteTypes
} from '../../core';
import {
  Criteria,
  CriteriaFirestore,
  ExcelFileFields,
  Team,
  TeamFirestore
} from '../core';
import { PrivateService } from '../private.service';
import { ConfirmDialogComponent } from '../shared';

@Component({
  selector: 'app-admin-panel',
  imports: [
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
    MatButtonToggleModule,
    MatTableModule,
    TitleCasePipe,
    MatChipsModule,
    MatFormFieldModule,
    MatTooltipModule
  ],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminPanelComponent implements OnInit {
  readonly #firestoreService = inject(FirestoreService);
  readonly #authService = inject(AuthService);
  readonly #dr = inject(DestroyRef);
  readonly #snackBar = inject(MatSnackBar);
  readonly #privateService = inject(PrivateService);
  readonly #dialog = inject(Dialog);

  protected criteria = signal<Criteria[] | CriteriaFirestore[]>([]);
  protected rows = signal<Team[] | TeamFirestore[]>([]);
  protected displayedColumns = signal<string[]>(['name']);
  protected criteriaColumns = signal<string[]>([
    'name',
    'description',
    'weight'
  ]);
  protected type = VoteTypes.teams;

  readonly addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  public ngOnInit(): void {
    this.#fetchData();
    this.#fetchCriteria();
  }

  protected onFileChange(event: Event, type: 'teams' | 'criteria'): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;

    if (fileList?.length) {
      const file = fileList[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const workbook = read(e.target.result, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = utils.sheet_to_json<ExcelFileFields | Criteria>(
          worksheet,
          {
            raw: true
          }
        );
        const columns = Object.keys(rows[0]);
        const identical =
          JSON.stringify(
            type === 'teams' ? this.displayedColumns() : this.criteriaColumns()
          ) === JSON.stringify(columns);

        if (!identical) {
          alert(
            `The columns in the Excel file do not match the expected columns. Waiting for the ${this.displayedColumns().join(', ')}`
          );
        }

        const orderedRows = rows.map((x, i) => ({
          ...x,
          order: i + 1
        }));
        if (type === 'teams') {
          this.rows.set(orderedRows as Team[]);
        } else {
          this.criteria.set(orderedRows as Criteria[]);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }

  protected deleteResults(): void {
    this.#dialog.open(ConfirmDialogComponent).closed.subscribe(res => {
      if (res) {
        this.#deleteAllResults();
      }
    });
  }

  protected deleteAllData(type: 'teams' | 'criteria'): void {
    this.#dialog.open(ConfirmDialogComponent).closed.subscribe(res => {
      if (res) {
        this.#deleteAllDataInCollection(type);
      }
    });
  }

  protected onSaveTeams(): void {
    const items: FirestoreBatchWriteItem<Partial<TeamFirestore>>[] =
      this.rows().map(item => ({
        operation:
          'id' in item && item.id ? Operations.update : Operations.create,
        docId: ('id' in item && item.id) || this.#generateId(this.type),
        collectionName: FirestoreCollections.teams,
        data: { ...item }
      }));
    this.#firestoreService
      .batchSave(items)
      .pipe(takeUntilDestroyed(this.#dr))
      .subscribe(() => {
        this.#snackBar.open('Data updated!', 'Ok', { duration: 3000 });
        this.#fetchData();
      });
  }

  protected onSaveCriteria(): void {
    const items: FirestoreBatchWriteItem<Partial<CriteriaFirestore>>[] =
      this.criteria().map(item => ({
        operation:
          'id' in item && item.id ? Operations.update : Operations.create,
        docId: ('id' in item && item.id) || this.#generateId(this.type),
        collectionName: FirestoreCollections.criteria,
        data: { ...item }
      }));
    this.#firestoreService
      .batchSave(items)
      .pipe(takeUntilDestroyed(this.#dr))
      .subscribe(() => {
        this.#snackBar.open('Data updated!', 'Ok', { duration: 3000 });
        this.#fetchCriteria();
      });
  }

  #fetchCriteria(): void {
    this.#firestoreService
      .getList<CriteriaFirestore>(
        this.#privateService.mapTypeToCriteriaCollection(this.type)
      )
      .subscribe(data => {
        this.criteria.set(data);
      });
  }

  #fetchData(): void {
    const collection = this.#privateService.mapTypeToCollection(this.type);
    this.#firestoreService
      .getList<TeamFirestore>(collection, {
        orderBy: 'order'
      })
      .subscribe(data => {
        this.rows.set(data);
      });
  }

  #generateId(type: 'teams' | 'criteria'): string {
    return this.#firestoreService.autoId(
      type === 'teams'
        ? FirestoreCollections.teams
        : FirestoreCollections.criteria
    );
  }

  #deleteAllDataInCollection(type: 'teams' | 'criteria'): void {
    this.#firestoreService
      .getList(
        type === 'teams'
          ? FirestoreCollections.teams
          : FirestoreCollections.criteria
      )
      .pipe(
        filter(Boolean),
        switchMap(res => {
          const items: FirestoreBatchDeleteItem[] = res.map(item => ({
            docId: item.id || '',
            collectionName:
              type === 'teams'
                ? FirestoreCollections.teams
                : FirestoreCollections.criteria,
            operation: Operations.delete
          }));
          const batchReqs = this.#firestoreService.batchSave(items);
          return batchReqs;
        })
      )
      .subscribe(() => {
        if (type === 'teams') {
          this.rows.set([]);
        } else {
          this.criteria.set([]);
        }
        this.#snackBar.open('Data deleted!', 'Ok', { duration: 3000 });
      });
  }

  #deleteAllResults(): void {
    const collections = Object.values(VoteTypes).map(type =>
      this.#privateService.mapTypeToResultsCollection(type)
    );

    const personsCollections = Object.values(VoteTypes).map(type =>
      this.#privateService.mapTypeToCollection(type)
    );

    const personsUpdateRequests = personsCollections.map(collection => {
      return this.#firestoreService.getList(collection).pipe(
        switchMap(list => {
          const items: FirestoreBatchWriteItem<Partial<TeamFirestore>>[] =
            list.map(item => ({
              docId: item.id!,
              collectionName: collection,
              operation: Operations.update,
              data: { ...item }
            }));
          return this.#firestoreService.batchSave(items);
        })
      );
    });

    const requests = collections.map(collection =>
      this.#firestoreService.getList(collection).pipe(
        switchMap(list => {
          const items: FirestoreBatchDeleteItem[] = list.map(item => ({
            docId: item.id || '',
            collectionName: collection,
            operation: Operations.delete
          }));
          return this.#firestoreService.batchSave(items);
        })
      )
    );

    const clearAuthFlagsRequest = this.#firestoreService
      .getList<AuthUser>(FirestoreCollections.authUsers)
      .pipe(
        switchMap(list => {
          const items: FirestoreBatchWriteItem<Partial<AuthUser>>[] = list.map(
            item => ({
              docId: item.id,
              collectionName: FirestoreCollections.authUsers,
              operation: Operations.update,
              data: { votedTypes: [] }
            })
          );
          return this.#firestoreService.batchSave(items);
        })
      );

    forkJoin([...requests, ...personsUpdateRequests, clearAuthFlagsRequest])
      .pipe(
        switchMap(() =>
          this.#firestoreService.get<AuthUser>(
            FirestoreCollections.authUsers,
            this.#authService.authUser()!.id
          )
        ),
        filter(Boolean)
      )
      .subscribe(updatedUser => {
        this.#authService.setCurrentUser(updatedUser);
        this.#snackBar.open('Results deleted!', 'Ok', { duration: 3000 });
      });
  }
}
