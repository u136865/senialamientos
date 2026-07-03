import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Semana, Senalamento } from '../models/senalamento.model';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class SenalamentosService {
  constructor(private http: HttpClient) {}

  // Semanas
  getSemanas(): Observable<Semana[]> {
    return this.http.get<Semana[]>(`${API}/semanas`);
  }

  createSemana(data: Omit<Semana, 'id'>): Observable<Semana> {
    return this.http.post<Semana>(`${API}/semanas`, data);
  }

  deleteSemana(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${API}/semanas/${id}`);
  }

  // Señalamientos
  getSenalamentos(semanaId?: string): Observable<Senalamento[]> {
    const params = semanaId ? new HttpParams().set('semanaId', semanaId) : undefined;
    return this.http.get<Senalamento[]>(`${API}/senalamentos`, { params });
  }

  createSenalamento(data: Omit<Senalamento, 'id'>): Observable<Senalamento> {
    return this.http.post<Senalamento>(`${API}/senalamentos`, data);
  }

  updateSenalamento(id: string, data: Partial<Omit<Senalamento, 'id'>>): Observable<Senalamento> {
    return this.http.put<Senalamento>(`${API}/senalamentos/${id}`, data);
  }

  deleteSenalamento(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${API}/senalamentos/${id}`);
  }

  notifySenalamentos(groupId: string, senalamentos: Senalamento[]): Observable<{ success: boolean; sentMessages: number }> {
    return this.http.post<{ success: boolean; sentMessages: number }>(`${API}/whatsapp/notify`, {
      groupId,
      senalamentos
    });
  }
}
