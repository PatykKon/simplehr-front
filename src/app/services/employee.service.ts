import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AddEmployeeRequest,
  AddEmployeeResponse,
  EmployeeSummaryResponse,
  EmployeeDetailsResponse,
  EmployeeLeaveBalanceResponse,
  ImportEmployeesResponse
} from '../models/employee.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private readonly API_URL = `${environment.apiUrl}/api/employees`;

  constructor(private http: HttpClient) {}

  // Pobierz listę wszystkich pracowników
  getAllEmployees(): Observable<EmployeeSummaryResponse[]> {
    return this.http.get<EmployeeSummaryResponse[]>(this.API_URL);
  }

  // Dodaj nowego pracownika
  addEmployee(request: AddEmployeeRequest): Observable<AddEmployeeResponse> {
    return this.http.post<AddEmployeeResponse>(this.API_URL, request);
  }

  // Importuj pracowników z pliku CSV
  importEmployees(file: File): Observable<ImportEmployeesResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImportEmployeesResponse>(`${this.API_URL}/import`, formData);
  }

  // Pobierz szczegóły pracownika
  getEmployeeDetails(employeeId: number): Observable<EmployeeDetailsResponse> {
    return this.http.get<EmployeeDetailsResponse>(`${this.API_URL}/${employeeId}`);
  }

  // Pobierz salda urlopowe pracownika
  getEmployeeLeaveBalances(employeeId: number): Observable<EmployeeLeaveBalanceResponse[]> {
    return this.http.get<EmployeeLeaveBalanceResponse[]>(`${this.API_URL}/${employeeId}/leave-balances`);
  }
}