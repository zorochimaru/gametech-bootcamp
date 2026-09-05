import { DIALOG_DATA, DialogModule, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-message-dialog',
  imports: [MatButton, DialogModule],
  templateUrl: './message-dialog.component.html',
  styleUrl: './message-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageDialogComponent {
  #dialogRef = inject(DialogRef);
  protected readonly data = inject<{ message: string }>(DIALOG_DATA);

  protected onClose(): void {
    this.#dialogRef.close();
  }
}
