import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Category, WhatsAppGroup } from '../../../models/category.model';
import { SelectGroupDialogComponent } from '../select-group-dialog/select-group-dialog.component';

@Component({
  selector: 'app-category-dialog',
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="vertical-align:middle;margin-right:8px;color:#00897b">
        {{ isEdit ? 'edit' : 'add_circle' }}
      </mat-icon>
      {{ isEdit ? 'Editar Categoría' : 'Nueva Categoría' }}
    </h2>

    <mat-dialog-content style="min-width:400px;padding-top:8px">
      <form [formGroup]="form" (ngSubmit)="submit()">

        <mat-form-field appearance="outline" style="width:100%;margin-bottom:4px">
          <mat-label>Categoría *</mat-label>
          <input matInput formControlName="categoria" placeholder="Ej: Juvenil" />
          <mat-error *ngIf="form.get('categoria')?.hasError('required')">
            Este campo es obligatorio
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" style="width:100%;margin-bottom:4px">
          <mat-label>División</mat-label>
          <input matInput formControlName="division" placeholder="Ej: A" />
        </mat-form-field>

        <mat-form-field appearance="outline" style="width:100%;margin-bottom:4px">
          <mat-label>Género</mat-label>
          <mat-select formControlName="genero">
            <mat-option value="">— Sin especificar —</mat-option>
            <mat-option value="Masculino">Masculino</mat-option>
            <mat-option value="Femenino">Femenino</mat-option>
            <mat-option value="Mixto">Mixto</mat-option>
          </mat-select>
        </mat-form-field>

        <div style="margin-bottom:16px">
          <label style="font-size:0.85rem;color:#546e7a;display:block;margin-bottom:8px">
            Grupo WhatsApp
          </label>
          <div style="display:flex;align-items:center;gap:12px">
            <div *ngIf="selectedGroup; else noGroup" class="group-chip">
              <mat-icon>groups</mat-icon>
              <span>{{ selectedGroup.name }}</span>
              <button mat-icon-button type="button" (click)="clearGroup()"
                style="width:20px;height:20px;line-height:20px" matTooltip="Quitar grupo">
                <mat-icon style="font-size:14px;width:14px;height:14px">close</mat-icon>
              </button>
            </div>
            <ng-template #noGroup>
              <span style="color:#9e9e9e;font-size:0.88rem;font-style:italic">Sin grupo asignado</span>
            </ng-template>
            <button mat-stroked-button color="primary" type="button" (click)="openGroupSelector()">
              <mat-icon>open_in_new</mat-icon>
              Seleccionar
            </button>
          </div>
        </div>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" style="padding:16px">
      <button mat-button (click)="dialogRef.close()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="submit()" [disabled]="form.invalid">
        <mat-icon>{{ isEdit ? 'save' : 'add' }}</mat-icon>
        {{ isEdit ? 'Guardar cambios' : 'Crear categoría' }}
      </button>
    </mat-dialog-actions>
  `
})
export class CategoryDialogComponent implements OnInit {
  form!: FormGroup;
  selectedGroup: WhatsAppGroup | null = null;
  isEdit = false;

  constructor(
    public dialogRef: MatDialogRef<CategoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { category?: Category },
    private fb: FormBuilder,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const cat = this.data?.category;
    this.isEdit = !!cat;
    this.selectedGroup = cat?.grupoWhatsapp || null;

    this.form = this.fb.group({
      categoria: [cat?.categoria || '', Validators.required],
      division:  [cat?.division  || ''],
      genero:    [cat?.genero    || '']
    });
  }

  openGroupSelector(): void {
    this.dialog.open(SelectGroupDialogComponent, {
      width: '480px',
      data: { current: this.selectedGroup }
    }).afterClosed().subscribe(result => {
      if (result !== undefined) this.selectedGroup = result;
    });
  }

  clearGroup(): void {
    this.selectedGroup = null;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.dialogRef.close({ ...this.form.value, grupoWhatsapp: this.selectedGroup });
  }
}
