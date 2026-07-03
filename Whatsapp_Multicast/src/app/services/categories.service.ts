import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Category, WhatsAppGroup } from '../models/category.model';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<Category[]> {
    return this.http.get<Category[]>(`${API}/categories`);
  }

  create(data: Omit<Category, 'id'>): Observable<Category> {
    return this.http.post<Category>(`${API}/categories`, data);
  }

  update(id: string, data: Partial<Omit<Category, 'id'>>): Observable<Category> {
    return this.http.put<Category>(`${API}/categories/${id}`, data);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${API}/categories/${id}`);
  }

  getGroups(): Observable<WhatsAppGroup[]> {
    return this.http.get<WhatsAppGroup[]>(`${API}/whatsapp/groups`);
  }
}
