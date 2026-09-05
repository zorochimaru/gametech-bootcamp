import { Dialog } from '@angular/cdk/dialog';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  viewChild
} from '@angular/core';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { forkJoin, map } from 'rxjs';

import { AuthService, FirestoreService, Roles, VoteTypes } from '../../core';
import { CommonResultFirestore } from '../core';
import { PrivateService } from '../private.service';
import { ImageDialogComponent } from '../shared';

interface PersonScore {
  personName: string;
  personImg: string;
  totalScores: { [criteriaName: string]: number };
}

@Component({
  selector: 'app-results',
  imports: [MatTabsModule, MatTableModule, MatSortModule],
  templateUrl: './results.component.html',
  styleUrl: './results.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultsComponent implements OnInit, AfterViewInit {
  readonly #fireStoreService = inject(FirestoreService);
  readonly #privateService = inject(PrivateService);
  readonly #dialog = inject(Dialog);
  readonly #authService = inject(AuthService);

  protected sort = viewChild<MatSort>(MatSort);

  protected readonly tabs = computed(() => {
    return Array.from(this.#allTabsData().entries())
      .filter(
        ([type, personScores]) =>
          (this.#authService.authUser()!.role === Roles.administrator ||
            this.#authService.authUser()!.votedTypes.includes(type)) &&
          personScores.length > 0
      )
      .map(([voteType, _]) => voteType);
  });

  protected dataSource = computed(
    () =>
      new MatTableDataSource<Record<string, string | number>>(
        this.#activeScore()
      )
  );

  protected displayedColumns = computed(() =>
    [...Object.keys(this.#activeScore()?.[0] || {})].filter(
      col => col !== 'personImg'
    )
  );

  readonly #activeScore = computed(() => {
    return this.#mapPersonScoresToArray(
      this.#allTabsData().get(this.tabs()[this.#activeTabIndex()]) || []
    );
  });

  readonly #activeTabIndex = signal(0);
  readonly #allTabsData = signal<Map<VoteTypes, PersonScore[]>>(new Map());

  public ngOnInit(): void {
    const resultsReqs = Object.values(VoteTypes).map(voteType => {
      return this.#fireStoreService
        .getList<CommonResultFirestore>(
          this.#privateService.mapTypeToResultsCollection(voteType)
        )
        .pipe(map(res => ({ voteType, juryResults: res })));
    });

    forkJoin(resultsReqs)
      .pipe(map(res => this.mapResultsToPersonScoresByVoteType(res)))
      .subscribe(res => {
        this.#allTabsData.set(new Map(res));
      });
  }

  public ngAfterViewInit() {
    this.dataSource().sort = this.sort() || null;
  }

  protected sortChange(sort: Sort): void {
    if (sort.direction === '') {
      this.dataSource().data = this.#activeScore();
      return;
    }
    this.dataSource().data = this.#activeScore().toSorted((a, b) => {
      const isAsc = sort.direction === 'asc';
      return this.#compare(a[sort.active], b[sort.active], isAsc);
    });
  }

  protected tabChanged(index: number): void {
    this.#activeTabIndex.set(index);
  }

  private mapResultsToPersonScoresByVoteType(
    results: {
      voteType: VoteTypes;
      juryResults: CommonResultFirestore[];
    }[]
  ): Map<VoteTypes, PersonScore[]> {
    const resultsMap = new Map<VoteTypes, PersonScore[]>();

    results.forEach(result => {
      if (result.juryResults) {
        const personScores = this.mapResultsToPersonScores(result.juryResults);
        resultsMap.set(result.voteType, personScores);
      }
    });

    return resultsMap;
  }

  private mapResultsToPersonScores(
    juryResults: CommonResultFirestore[]
  ): PersonScore[] {
    const personScoresMap: { [personId: string]: PersonScore } = {};

    juryResults.forEach(juryResult => {
      juryResult.results.forEach(personResult => {
        const personId = personResult.personId;
        const personName = personResult.personName;
        const personImg = personResult.personImg;

        if (!personScoresMap[personId]) {
          personScoresMap[personId] = {
            personName,
            personImg,
            totalScores: {}
          };
        }

        personResult.results.forEach(score => {
          const criteriaName = score.criteriaName;
          if (!personScoresMap[personId].totalScores[criteriaName]) {
            personScoresMap[personId].totalScores[criteriaName] = 0;
          }
          personScoresMap[personId].totalScores[criteriaName] += score.score;
        });
      });
    });

    return Object.values(personScoresMap);
  }

  protected openDetails(row: any): void {
    if (!row.personImg) {
      return;
    }
    this.#dialog.open(ImageDialogComponent, {
      data: row.personImg,
      autoFocus: '__non_existing_element__'
    });
  }

  #mapPersonScoresToArray(
    personScores: PersonScore[]
  ): Record<string, string | number>[] {
    return personScores.map(personScore => {
      const { personName, personImg, totalScores } = personScore;
      const totalScore = Object.values(totalScores).reduce((a, b) => a + b, 0);
      return { personName, personImg, totalScore, ...totalScores };
    });
  }

  #compare(a: number | string, b: number | string, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }
}
