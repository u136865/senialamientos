import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CategoriesService } from '../../../services/categories.service';
import { WhatsAppGroup } from '../../../models/category.model';

@Component({
  selector: 'app-select-group-dialog',
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="vertical-align:middle;margin-right:8px;color:#00897b">group</mat-icon>
      Seleccionar Grupo WhatsApp
    </h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" style="width:100%;margin-bottom:8px">
        <mat-label>Buscar grupo</mat-label>
        <input matInput [(ngModel)]="searchText" placeholder="Nombre del grupo..." />
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>

      <div *ngIf="loading" style="text-align:center;padding:24px">
        <mat-spinner diameter="40" style="margin:0 auto"></mat-spinner>
        <p style="margin-top:12px;color:#546e7a">Cargando grupos...</p>
      </div>

      <div *ngIf="error" style="text-align:center;padding:24px;color:#f44336">
        <mat-icon style="font-size:40px;width:40px;height:40px">error_outline</mat-icon>
        <p style="margin-top:8px">{{ error }}</p>
      </div>

      <mat-list class="groups-list" *ngIf="!loading && !error">
        <mat-list-item
          *ngIf="data.current"
          class="group-item"
          (click)="select(null)"
          [class.selected]="!data.current">
          <mat-icon matListItemIcon style="color:#9e9e9e">remove_circle_outline</mat-icon>
          <span matListItemTitle style="color:#9e9e9e;font-style:italic">Sin grupo asignado</span>
        </mat-list-item>

        <mat-list-item
          *ngFor="let group of filtered"
          class="group-item"
          (click)="select(group)"
          [class.selected]="data.current?.id === group.id">
          <mat-icon matListItemIcon>groups</mat-icon>
          <span matListItemTitle>{{ group.name }}</span>
          <mat-icon matListItemMeta *ngIf="data.current?.id === group.id" style="color:#4caf50">check_circle</mat-icon>
        </mat-list-item>

        <p *ngIf="filtered.length === 0 && !loading" style="text-align:center;color:#9e9e9e;padding:24px">
          No se encontraron grupos
        </p>
      </mat-list>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancelar</button>
    </mat-dialog-actions>
  `
})
export class SelectGroupDialogComponent implements OnInit {
  groups: WhatsAppGroup[] = [];
  searchText = '';
  loading = true;
  error = '';

  get filtered(): WhatsAppGroup[] {
    const s = this.searchText.toLowerCase();
    return this.groups.filter(g => g.name.toLowerCase().includes(s));
  }

  constructor(
    public dialogRef: MatDialogRef<SelectGroupDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { current: WhatsAppGroup | null },
    private categoriesService: CategoriesService
  ) {}

  ngOnInit(): void {
    this.categoriesService.getGroups().subscribe({
      next: groups => { this.groups = groups; this.loading = false; },
      error: err => {
        this.error = err.error?.error || 'No se pudieron cargar los grupos. ¿Está WhatsApp conectado?';
        this.loading = false;
      }
    });
  }

  select(group: WhatsAppGroup | null): void {
    this.dialogRef.close(group);
  }
}
