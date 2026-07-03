import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { WhatsappService } from './services/whatsapp.service';
import { QrDialogComponent } from './components/qr-dialog/qr-dialog.component';
import { WaStatus } from './models/category.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  waStatus: WaStatus = 'initializing';
  isReady = false;

  private dialogRef: MatDialogRef<QrDialogComponent> | null = null;
  private statusSub!: Subscription;

  readonly statusLabels: Record<WaStatus, string> = {
    initializing: 'Iniciando...',
    qr: 'Escanear QR',
    authenticated: 'Autenticando...',
    ready: 'Conectado',
    disconnected: 'Desconectado'
  };

  constructor(
    public waService: WhatsappService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.statusSub = this.waService.status$.subscribe(s => {
      this.waStatus = s;
      this.isReady = s === 'ready';

      if (s !== 'ready' && !this.dialogRef) {
        // Abrir modal bloqueante si no está conectado
        this.dialogRef = this.dialog.open(QrDialogComponent, {
          width: '420px',
          disableClose: true,
          panelClass: 'qr-modal-panel'
        });
        this.dialogRef.afterClosed().subscribe(() => {
          this.dialogRef = null;
        });
      } else if (s === 'ready' && this.dialogRef) {
        // Cerrar automáticamente al conectar
        setTimeout(() => {
          this.dialogRef?.close();
          this.dialogRef = null;
        }, 1500);
      }
    });
  }

  ngOnDestroy(): void {
    this.statusSub?.unsubscribe();
  }
}
