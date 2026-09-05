import { FormControl, FormGroup } from '@angular/forms';

export type TypedForm<T, N = never> = FormGroup<{
  [p in keyof T]: FormControl<T[p] | (N extends null ? N : never)>;
}>;
