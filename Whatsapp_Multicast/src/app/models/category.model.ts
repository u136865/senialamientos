export interface WhatsAppGroup {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  categoria: string;
  division: string;
  genero: string;
  grupoWhatsapp: WhatsAppGroup | null;
}

export type WaStatus = 'initializing' | 'qr' | 'authenticated' | 'ready' | 'disconnected';
