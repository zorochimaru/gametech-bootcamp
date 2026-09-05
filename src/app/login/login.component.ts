import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { filter, forkJoin, of, switchMap } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  AuthService,
  AuthUser,
  FirestoreCollections,
  FirestoreService,
  Roles
} from '../core';

@Component({
  selector: 'app-login',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonToggleModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  readonly #firestoreService = inject(FirestoreService);
  readonly #authService = inject(AuthService);
  readonly #dr = inject(DestroyRef);
  readonly #router = inject(Router);

  protected modeControl = new FormControl(true, { nonNullable: true });
  protected roleControl = new FormControl(Roles.cosplay, { nonNullable: true });

  protected form = new FormGroup({
    email: new FormControl('', {
      validators: [Validators.required, Validators.email],
      nonNullable: true
    }),
    password: new FormControl('', {
      validators: [Validators.required, Validators.minLength(6)],
      nonNullable: true
    })
  });

  protected readonly registerTypes = signal<Roles[]>([
    Roles.cosplay,
    Roles.kpop
  ]);

  protected readonly isProd = environment.production;

  protected onSubmit(): void {
    if (this.form.invalid) {
      return;
    }
    const { email, password } = this.form.getRawValue();
    if (this.modeControl.getRawValue()) {
      this.#onSignIn(email, password);
    } else {
      this.#onSignUp(email, password);
    }
  }

  protected toggleMode(): void {
    this.modeControl.patchValue(!this.modeControl.getRawValue());
  }

  #onSignUp(email: string, password: string): void {
    this.#authService
      .signUp(email, password)
      .pipe(
        switchMap(res =>
          this.#firestoreService.create<AuthUser>(
            FirestoreCollections.authUsers,
            {
              email: res.user?.email || email,
              role: this.roleControl.getRawValue(),
              votedTypes: []
            },
            res.user?.uid
          )
        ),
        takeUntilDestroyed(this.#dr)
      )
      .subscribe(() => {
        this.form.reset();
        this.form.markAsPristine();
        this.modeControl.patchValue(true);
      });
  }

  #onSignIn(email: string, password: string): void {
    this.#authService
      .signIn(email, password)
      .pipe(takeUntilDestroyed(this.#dr))
      .subscribe(() => {
        this.#router.navigate(['/']);
      });
  }
}
