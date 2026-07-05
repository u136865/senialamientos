import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export type RenotifyDecision = 'yes' | 'no' | 'all' | 'none';

export interface RenotifyConfirmDialogData {
  title?: string;
  message: string;
  detail?: string;
  allowAll?: boolean;
}

@Component({
  selector: 'app-renotify-confirm-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.title || 'Confirmar notificación' }}</h2>

    <mat-dialog-content>
      <p style="margin:0 0 8px 0">{{ data.message }}</p>
      <p *ngIf="data.detail" style="margin:0;color:#607d8b;font-size:0.88rem">{{ data.detail }}</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-stroked-button color="warn" (click)="close('no')">No</button>
      <button
        *ngIf="data.allowAll"
        mat-stroked-button
        color="warn"
        (click)="close('none')">
        No a todos
      </button>
      <button
        *ngIf="data.allowAll"
        mat-stroked-button
        color="primary"
        (click)="close('all')">
        Sí a todos
      </button>
      <button mat-flat-button color="primary" (click)="close('yes')">Sí</button>
    </mat-dialog-actions>
  `
})
export class RenotifyConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<RenotifyConfirmDialogComponent, RenotifyDecision>,
    @Inject(MAT_DIALOG_DATA) public data: RenotifyConfirmDialogData
  ) {}

  close(value: RenotifyDecision): void {
    this.dialogRef.close(value);
  }
}
