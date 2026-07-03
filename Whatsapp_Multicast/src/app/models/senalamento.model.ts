import { Category } from './category.model';

export interface Semana {
  id: string;
  fechaInicio: string; // YYYY-MM-DD (lunes)
  fechaFin: string;   // YYYY-MM-DD (domingo)
  label: string;
}

export interface Senalamento {
  id: string;
  semanaId: string;
  fecha: string;              // YYYY-MM-DD
  hora: string;               // HH:mm
  horaConcentracion: string;  // HH:mm
  sede: string;
  categoria: Category | null;
  rival: string;              // Nombre del rival/equipo
}
