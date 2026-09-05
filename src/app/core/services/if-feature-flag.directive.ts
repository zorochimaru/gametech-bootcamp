import {
  ChangeDetectorRef,
  DestroyRef,
  Directive,
  EmbeddedViewRef,
  inject,
  input,
  TemplateRef,
  ViewContainerRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FeatureFlags, FeatureFlagService } from './feature-flag.service';

@Directive({
  selector: '[appIfFeatureFlag]',
  standalone: true
})
export class IfFeatureFlagDirective {
  readonly #cdr = inject(ChangeDetectorRef);
  readonly #dr = inject(DestroyRef);
  readonly #ffService = inject(FeatureFlagService);
  readonly #templateRef = inject(TemplateRef<unknown>);
  readonly #viewContainer = inject(ViewContainerRef);

  public appIfFeatureFlag = input<FeatureFlags, FeatureFlags>(null, {
    transform: val => {
      this.#updateView(val);
      return val;
    }
  });
  public appIfFeatureFlagElse = input<
    TemplateRef<unknown> | null,
    TemplateRef<unknown> | null
  >(null, {
    transform: elseTemplateRef => {
      this.#elseRef = elseTemplateRef;
      return null;
    }
  });

  #viewRef: EmbeddedViewRef<unknown> | null = null;
  #elseRef: TemplateRef<unknown> | null = null;

  #updateView(value: FeatureFlags): void {
    this.#ffService
      .isEnabled(value)
      .pipe(takeUntilDestroyed(this.#dr))
      .subscribe(available => {
        if (available && !this.#viewRef) {
          this.#viewContainer.clear();
          if (this.#templateRef) {
            this.#viewRef = this.#viewContainer.createEmbeddedView(
              this.#templateRef
            );
          }
        }

        if (!available && this.#elseRef) {
          this.#viewContainer.clear();
          this.#viewRef = this.#viewContainer.createEmbeddedView(this.#elseRef);
        }

        this.#cdr.detectChanges();
      });
  }
}
