import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LeaveConfigurationRequest, LeaveConfigurationResponse } from '../models/leave-configuration.models';

@Injectable({
  providedIn: 'root'
})
export class LeaveConfigurationService {
  private readonly API_URL = `${environment.apiUrl}/api/leave-configurations`;

  constructor(private http: HttpClient) {}

  /**
   * Pobiera wszystkie konfiguracje urlopów dla firmy
   */
  getAllConfigurations(): Observable<LeaveConfigurationResponse[]> {
    return this.http.get<LeaveConfigurationResponse[]>(this.API_URL);
  }

  /**
   * Pobiera konkretną konfigurację po ID
   */
  getConfiguration(id: number): Observable<LeaveConfigurationResponse> {
    return this.http.get<LeaveConfigurationResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Tworzy nową konfigurację typu urlopu
   */
  createConfiguration(request: LeaveConfigurationRequest): Observable<LeaveConfigurationResponse> {
    return this.http.post<LeaveConfigurationResponse>(this.API_URL, request);
  }

  /**
   * Aktualizuje istniejącą konfigurację
   */
  updateConfiguration(id: number, request: LeaveConfigurationRequest): Observable<LeaveConfigurationResponse> {
    return this.http.put<LeaveConfigurationResponse>(`${this.API_URL}/${id}`, request);
  }

  /**
   * Usuwa konfigurację (deaktywuje)
   */
  deleteConfiguration(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}