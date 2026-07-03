import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Category } from '../../../models/category.model';
import { Semana, Senalamento } from '../../../models/senalamento.model';
import { CategoriesService } from '../../../services/categories.service';

export interface SenalamantoDialogData {
  semana: Semana;
  senalamento?: Senalamento;
}

@Component({
  selector: 'app-senalamento-dialog',
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="vertical-align:middle;margin-right:8px;color:#00897b">
        {{ isEdit ? 'edit' : 'sports_soccer' }}
      </mat-icon>
      {{ isEdit ? 'Editar señalamiento' : 'Nuevo señalamiento' }}
    </h2>
    <p style="margin:-8px 24px 12px;font-size:0.82rem;color:#78909c">
      <mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle">event</mat-icon>
      {{ data.semana.label }}
    </p>

    <mat-dialog-content style="min-width:460px;padding-top:4px">
      <form [formGroup]="form">

        <!-- Fila: Fecha + Hora -->
        <div style="display:flex;gap:12px">
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Fecha *</mat-label>
            <input matInput [matDatepicker]="picker"
              formControlName="fecha"
              [min]="minDate" [max]="maxDate"
              placeholder="dd/mm/aaaa">
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker [startAt]="minDate"></mat-datepicker>
            <mat-error *ngIf="form.get('fecha')?.hasError('required')">Obligatorio</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Hora partido *</mat-label>
            <input matInput type="time" formControlName="hora">
            <mat-icon matSuffix>schedule</mat-icon>
            <mat-error *ngIf="form.get('hora')?.hasError('required')">Obligatorio</mat-error>
          </mat-form-field>
        </div>

        <!-- Hora concentración -->
        <mat-form-field appearance="outline" style="width:100%;margin-bottom:4px">
          <mat-label>Hora concentración</mat-label>
          <input matInput type="time" formControlName="horaConcentracion">
          <mat-icon matSuffix>alarm</mat-icon>
          <mat-hint>Hora a la que deben concentrarse los equipos</mat-hint>
        </mat-form-field>

        <!-- Sede -->
        <mat-form-field appearance="outline" style="width:100%;margin-bottom:4px;margin-top:8px">
          <mat-label>Sede *</mat-label>
          <input matInput formControlName="sede" placeholder="Ej: Campo Municipal de Deportes">
          <mat-icon matSuffix>stadium</mat-icon>
          <mat-error *ngIf="form.get('sede')?.hasError('required')">Obligatorio</mat-error>
        </mat-form-field>

        <!-- Rival -->
        <mat-form-field appearance="outline" style="width:100%;margin-bottom:4px;margin-top:8px">
          <mat-label>Rival/Equipo</mat-label>
          <input matInput formControlName="rival" placeholder="Ej: Deportivo Local">
          <mat-icon matSuffix>groups</mat-icon>
          <mat-hint>Nombre del equipo rival o contrincante</mat-hint>
        </mat-form-field>

        <!-- Categoría -->
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Categoría</mat-label>
          <mat-select formControlName="categoriaId">
            <mat-option [value]="null">— Sin categoría —</mat-option>
            <mat-option *ngFor="let cat of categories" [value]="cat.id">
              <span style="font-weight:500">{{ cat.categoria }}</span>
              <span *ngIf="cat.division" style="color:#78909c;font-size:0.85rem">
                · {{ cat.division }}
              </span>
              <span *ngIf="cat.genero" style="color:#78909c;font-size:0.85rem">
                · {{ cat.genero }}
              </span>
            </mat-option>
          </mat-select>
          <mat-icon matSuffix>category</mat-icon>
        </mat-form-field>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" style="padding:16px">
      <button mat-button (click)="dialogRef.close()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="submit()" [disabled]="form.invalid">
        <mat-icon>{{ isEdit ? 'save' : 'add' }}</mat-icon>
        {{ isEdit ? 'Guardar' : 'Crear señalamiento' }}
      </button>
    </mat-dialog-actions>
  `
})
export class SenalamantoDialogComponent implements OnInit {
  form!: FormGroup;
  categories: Category[] = [];
  isEdit = false;
  minDate!: Date;
  maxDate!: Date;

  constructor(
    public dialogRef: MatDialogRef<SenalamantoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SenalamantoDialogData,
    private fb: FormBuilder,
    private categoriesService: CategoriesService
  ) {}

  ngOnInit(): void {
    this.minDate = new Date(this.data.semana.fechaInicio + 'T12:00:00');
    this.maxDate = new Date(this.data.semana.fechaFin + 'T12:00:00');

    const s = this.data.senalamento;
    this.isEdit = !!s;

    const fechaVal = s?.fecha ? new Date(s.fecha + 'T12:00:00') : null;

    this.form = this.fb.group({
      fecha:              [fechaVal, Validators.required],
      hora:               [s?.hora || '', Validators.required],
      horaConcentracion:  [s?.horaConcentracion || ''],
      sede:               [s?.sede || '', Validators.required],
      rival:              [s?.rival || ''],
      categoriaId:        [s?.categoria?.id || null]
    });

    this.categoriesService.getAll().subscribe(cats => this.categories = cats);
  }

  submit(): void {
    if (this.form.invalid) return;
    const { fecha, hora, horaConcentracion, sede, rival, categoriaId } = this.form.value;
    const categoria = this.categories.find(c => c.id === categoriaId) || null;
    const isoFecha = fecha instanceof Date
      ? fecha.toISOString().split('T')[0]
      : fecha;

    this.dialogRef.close({ fecha: isoFecha, hora, horaConcentracion, sede, rival, categoria });
  }
}
