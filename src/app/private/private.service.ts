import { Injectable } from '@angular/core';

import { FirestoreCollections, VoteTypes } from '../core';

@Injectable()
export class PrivateService {
  public mapTypeToResultsCollection(type: VoteTypes): FirestoreCollections {
    switch (type) {
      case VoteTypes.teams:
        return FirestoreCollections.results;
    }
  }

  public mapTypeToCollection(type: VoteTypes): FirestoreCollections {
    switch (type) {
      case VoteTypes.teams:
        return FirestoreCollections.teams;
    }
  }

  public mapTypeToCriteriaCollection(type: VoteTypes): FirestoreCollections {
    switch (type) {
      case VoteTypes.teams:
        return FirestoreCollections.criteria;
    }
  }
}
