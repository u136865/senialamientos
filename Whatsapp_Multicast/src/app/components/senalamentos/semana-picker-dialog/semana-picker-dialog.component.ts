import { Component, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { MatCalendar, MatCalendarCellClassFunction } from '@angular/material/datepicker';
import { MatDialogRef } from '@angular/material/dialog';
import { Semana } from '../../../models/senalamento.model';

@Component({
  selector: 'app-semana-picker-dialog',
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="vertical-align:middle;margin-right:8px;color:#00897b">calendar_month</mat-icon>
      Seleccionar semana
    </h2>

    <mat-dialog-content style="padding:0 8px 8px">
      <p style="font-size:0.85rem;color:#546e7a;margin-bottom:12px;text-align:center">
        Haz clic en cualquier día de la semana que quieras añadir
      </p>

      <mat-calendar
        #calendar
        [dateClass]="dateClass"
        (selectedChange)="onDateSelected($event)">
      </mat-calendar>

      <!-- Semana seleccionada -->
      <div *ngIf="weekLabel" class="week-result-bar">
        <mat-icon>event</mat-icon>
        <span>{{ weekLabel }}</span>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" style="padding:12px 16px">
      <button mat-button (click)="dialogRef.close()">Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="!weekStart" (click)="confirm()">
        <mat-icon>add</mat-icon>
        Añadir semana
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    ::ng-deep .week-highlight .mat-calendar-body-cell-content {
      background: rgba(0, 137, 123, 0.18) !important;
      border-radius: 0 !important;
      width: 100% !important;
      height: 100% !important;
      color: #004d40 !important;
      font-weight: 500;
    }
    ::ng-deep .week-highlight-start .mat-calendar-body-cell-content {
      background: rgba(0, 137, 123, 0.18) !important;
      border-radius: 50% 0 0 50% !important;
      width: 100% !important;
      height: 100% !important;
      color: #004d40 !important;
      font-weight: 600;
    }
    ::ng-deep .week-highlight-end .mat-calendar-body-cell-content {
      background: rgba(0, 137, 123, 0.18) !important;
      border-radius: 0 50% 50% 0 !important;
      width: 100% !important;
      height: 100% !important;
      color: #004d40 !important;
      font-weight: 600;
    }
    .week-result-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding: 10px 16px;
      background: #e0f2f1;
      border-radius: 8px;
      color: #00695c;
      font-weight: 500;
      font-size: 0.92rem;
    }
  `]
})
export class SemanaPickerDialogComponent implements AfterViewInit {
  @ViewChild('calendar') calendar!: MatCalendar<Date>;

  weekStart: Date | null = null;
  weekEnd: Date | null = null;
  weekLabel = '';

  constructor(
    public dialogRef: MatDialogRef<SemanaPickerDialogComponent>,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {}

  dateClass: MatCalendarCellClassFunction<Date> = (date: Date) => {
    if (!this.weekStart || !this.weekEnd) return '';
    const d = new Date(date); d.setHours(12, 0, 0, 0);
    const s = new Date(this.weekStart); s.setHours(12, 0, 0, 0);
    const e = new Date(this.weekEnd);   e.setHours(12, 0, 0, 0);
    if (d.getTime() === s.getTime()) return 'week-highlight-start';
    if (d.getTime() === e.getTime()) return 'week-highlight-end';
    if (d > s && d < e) return 'week-highlight';
    return '';
  };

  onDateSelected(date: Date | null): void {
    if (!date) return;

    // Calcular lunes de la semana
    const day = date.getDay(); // 0=Dom, 1=Lun...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    this.weekStart = monday;
    this.weekEnd = sunday;
    this.weekLabel = this.formatWeekLabel(monday, sunday);

    // Forzar re-render del calendario para aplicar los estilos
    this.cdr.detectChanges();
    this.calendar.updateTodaysDate();
  }

  confirm(): void {
    if (!this.weekStart || !this.weekEnd) return;
    const result: Omit<Semana, 'id'> = {
      fechaInicio: this.toIsoDate(this.weekStart),
      fechaFin:    this.toIsoDate(this.weekEnd),
      label:       this.weekLabel
    };
    this.dialogRef.close(result);
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatWeekLabel(start: Date, end: Date): string {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const locale = 'es-ES';
    const s = start.toLocaleDateString(locale, opts);
    const e = end.toLocaleDateString(locale, { ...opts, year: 'numeric' });
    return `Semana del ${s} al ${e}`;
  }
}
