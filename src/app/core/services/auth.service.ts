import { inject, Injectable, signal } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  User,
  UserCredential
} from '@firebase/auth';
import { catchError, from, map, Observable, of } from 'rxjs';

import { FirebaseProvider } from '../firebase-provider';
import { AuthUser, VoteTypes } from '../interfaces';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly #afAuth = inject(FirebaseProvider).auth;
  public authUser = signal<AuthUser | null>(null);

  public currentUser$ = new Observable<User | null>(subscriber =>
    onAuthStateChanged(
      this.#afAuth,
      subscriber.next.bind(subscriber),
      subscriber.error.bind(subscriber)
    )
  );

  public isAuthenticated$ = this.currentUser$.pipe(map(Boolean));

  public signUp(email: string, password: string): Observable<UserCredential> {
    return from(createUserWithEmailAndPassword(this.#afAuth, email, password));
  }

  public setCurrentUser(user: AuthUser): void {
    this.authUser.set(user);
  }

  public decrementUserStarsLocally(type: VoteTypes): void {
    const user = this.authUser();
    if (user) {
      this.authUser.update(user => {
        if (!user) return user;
        return {
          ...user,
          stars: {
            ...user.stars!,
            [type]: (user.stars![type] ?? 0) - 1
          }
        };
      });
    }
  }

  public signIn(email: string, password: string): Observable<UserCredential> {
    return from(signInWithEmailAndPassword(this.#afAuth, email, password)).pipe(
      catchError(error => {
        var errorCode = error.code;
        var errorMessage = error.message;
        if (errorCode === 'auth/wrong-password') {
          alert('Wrong password.');
        } else {
          alert(errorMessage);
        }
        return of(error);
      })
    );
  }

  public signInWithGoogle(): Observable<UserCredential> {
    return from(signInWithPopup(this.#afAuth, new GoogleAuthProvider()));
  }

  public signOut(): Observable<void> {
    return from(this.#afAuth.signOut());
  }
}
