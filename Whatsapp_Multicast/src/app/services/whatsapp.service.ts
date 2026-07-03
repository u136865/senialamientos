import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, timer, Subscription } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { WaStatus } from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class WhatsappService implements OnDestroy {
  private socket: Socket;
  private pollingSubscription: Subscription | null = null;

  status$ = new BehaviorSubject<WaStatus>('initializing');
  qrCode$ = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient) {
    this.socket = io('/', {
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity
    });

    this.socket.on('connect', () => {
      console.log('[Socket.io] Conectado');
      // Al conectar, pedir el estado actual del servidor
      this.fetchStatus();
      // Si está en estado 'authenticated', hacer polling cada 2 segundos durante 20 segundos
      // (en caso de que la sesión esté procesándose)
      this.startPollingIfNeeded();
    });

    this.socket.on('wa:status', (status: WaStatus) => {
      console.log('[WhatsApp] Estado recibido:', status);
      this.status$.next(status);
      if (status === 'ready' || status === 'authenticated') {
        this.qrCode$.next(null);
      }
      // Si llegó a 'ready', detener polling
      if (status === 'ready') {
        this.stopPolling();
      }
    });

    this.socket.on('wa:qr', (qrDataUrl: string) => {
      console.log('[WhatsApp] QR recibido');
      this.qrCode$.next(qrDataUrl);
      this.stopPolling();
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket.io] Error de conexión:', err);
      this.status$.next('disconnected');
      this.stopPolling();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket.io] Desconectado:', reason);
      this.stopPolling();
    });
  }

  private fetchStatus(): void {
    this.http.get<{ status: WaStatus }>('/api/whatsapp/status').subscribe(
      res => {
        console.log('[WhatsApp] Estado actual del servidor:', res.status);
        this.status$.next(res.status);
      },
      err => console.error('[WhatsApp] Error al obtener estado:', err)
    );
  }

  private startPollingIfNeeded(): void {
    // Hacer polling cada 2 segundos durante 20 segundos si está en 'authenticated'
    let pollCount = 0;
    this.pollingSubscription = timer(2000, 2000).subscribe(() => {
      if (this.status$.value === 'authenticated') {
        pollCount++;
        console.log('[WhatsApp] Polling estado... intento', pollCount);
        this.fetchStatus();
        if (pollCount >= 10) {
          this.stopPolling();
        }
      } else {
        this.stopPolling();
      }
    });
  }

  private stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
      console.log('[WhatsApp] Polling detenido');
    }
  }

  get statusLabel(): Record<WaStatus, string> {
    return {
      initializing: 'Iniciando...',
      qr: 'Escanear QR',
      authenticated: 'Autenticando...',
      ready: 'Conectado',
      disconnected: 'Desconectado'
    };
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.socket.disconnect();
  }
}
