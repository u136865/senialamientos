import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { WhatsappService } from '../../services/whatsapp.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-qr-dialog',
  template: `
    <div class="qr-dialog-container">

      <!-- Estado: esperando QR o inicializando -->
      <ng-container *ngIf="status !== 'ready' && status !== 'authenticated'">
        <h2 class="qr-title">
          <mat-icon style="vertical-align:middle;color:#25d366;margin-right:8px">whatsapp</mat-icon>
          Conectar WhatsApp
        </h2>

        <div *ngIf="status === 'qr' && qrCode; else loadingTpl">
          <p class="qr-subtitle">
            Abre WhatsApp en tu teléfono<br>
            <strong>Dispositivos vinculados → Vincular dispositivo</strong><br>
            y escanea el código QR.
          </p>
          <div style="display:flex;justify-content:center;margin:16px 0">
            <img [src]="qrCode" class="qr-image" width="260" height="260" alt="QR WhatsApp" />
          </div>
          <p style="text-align:center;font-size:0.8rem;color:#9e9e9e;margin-top:8px">
            El código se renueva automáticamente cada 20 segundos
          </p>
        </div>

        <ng-template #loadingTpl>
          <div class="spinner-wrapper">
            <mat-spinner diameter="52" color="primary"></mat-spinner>
            <span *ngIf="status === 'initializing'">Iniciando WhatsApp...</span>
            <span *ngIf="status === 'disconnected'" style="color:#f44336">
              Desconectado. Reconectando en unos segundos...
            </span>
            <span *ngIf="status === 'qr' && !qrCode">Generando código QR...</span>
          </div>
        </ng-template>
      </ng-container>

      <!-- Estado: autenticando -->
      <ng-container *ngIf="status === 'authenticated'">
        <div class="spinner-wrapper">
          <mat-spinner diameter="52" color="accent"></mat-spinner>
          <span>Autenticando sesión...</span>
        </div>
      </ng-container>

      <!-- Estado: listo -->
      <ng-container *ngIf="status === 'ready'">
        <div style="padding:32px 16px;text-align:center">
          <mat-icon style="font-size:72px;width:72px;height:72px;color:#4caf50;display:block;margin:0 auto">
            check_circle
          </mat-icon>
          <h3 style="margin-top:16px;color:#1a1a2e;font-size:1.3rem">¡WhatsApp conectado!</h3>
          <p style="color:#546e7a;margin-top:8px">
            La sesión está activa. Cerrando en {{ countdown }}...
          </p>
          <mat-progress-bar mode="determinate" [value]="progressValue" color="primary"
            style="margin-top:16px;border-radius:4px">
          </mat-progress-bar>
        </div>
      </ng-container>

    </div>
  `
})
export class QrDialogComponent implements OnInit, OnDestroy {
  status = 'initializing';
  qrCode: string | null = null;
  countdown = 3;
  progressValue = 100;

  private subs: Subscription[] = [];
  private countdownInterval: any;

  constructor(
    public dialogRef: MatDialogRef<QrDialogComponent>,
    public waService: WhatsappService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.waService.status$.subscribe(s => {
        this.status = s;
        if (s === 'ready') this.startCountdown();
      }),
      this.waService.qrCode$.subscribe(qr => this.qrCode = qr)
    );
  }

  private startCountdown(): void {
    this.countdown = 3;
    this.progressValue = 100;
    clearInterval(this.countdownInterval);
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      this.progressValue = (this.countdown / 3) * 100;
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
        this.dialogRef.close();
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    clearInterval(this.countdownInterval);
  }
}

