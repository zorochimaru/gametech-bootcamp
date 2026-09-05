import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-image-dialog',
  imports: [MatIcon],
  templateUrl: './image-dialog.component.html',
  styleUrl: './image-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageDialogComponent {
  #dialogRef = inject(DialogRef);

  protected readonly src = inject<string>(DIALOG_DATA);
  protected readonly isImgLoaded = signal(false);
  protected close(): void {
    this.#dialogRef.close();
  }
}
