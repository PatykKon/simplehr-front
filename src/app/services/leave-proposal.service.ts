import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import {
  CreateLeaveProposalRequest,
  CreateLeaveProposalResponse,
  UpdateLeaveProposalRequest,
  AcceptLeaveProposalRequest,
  RejectLeaveProposalRequest,
  LeaveProposalOperationResponse,
  EmployeeLeaveProposalResponse,
  EmployeeLeavesResponse,
  LeaveCalendarResponse,
  ProposalHistoryResponse,
  LeaveStatsResponse
} from '../models/leave-proposal.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LeaveProposalService {
  private readonly API_URL = `${environment.apiUrl}/api/leave-proposals`;

  constructor(private http: HttpClient) {}

  createLeaveProposal(request: CreateLeaveProposalRequest): Observable<CreateLeaveProposalResponse> {
    return this.http.post<CreateLeaveProposalResponse>(`${this.API_URL}/create`, request);
  }

  updateLeaveProposal(id: number, request: UpdateLeaveProposalRequest): Observable<LeaveProposalOperationResponse> {
    return this.http.put<LeaveProposalOperationResponse>(`${this.API_URL}/${id}`, request);
  }

  acceptLeaveProposal(id: number, request: AcceptLeaveProposalRequest): Observable<LeaveProposalOperationResponse> {
    return this.http.post<LeaveProposalOperationResponse>(`${this.API_URL}/${id}/accept`, request);
  }

  rejectLeaveProposal(id: number, request: RejectLeaveProposalRequest): Observable<LeaveProposalOperationResponse> {
    return this.http.post<LeaveProposalOperationResponse>(`${this.API_URL}/${id}/reject`, request);
  }

  getLeaveProposal(id: number): Observable<EmployeeLeaveProposalResponse> {
    return this.http.get<EmployeeLeaveProposalResponse>(`${this.API_URL}/${id}`);
  }

  getAllLeaveProposals(): Observable<EmployeeLeaveProposalResponse[]> {
    return this.http.get<EmployeeLeaveProposalResponse[]>(`/api/employees/leaves`); 
  }

  getUserLeaveProposals(userId: number): Observable<EmployeeLeaveProposalResponse[]> {
    return this.http.get<EmployeeLeaveProposalResponse[]>(`${this.API_URL}/user/${userId}`);
  }

  // Pobieranie kalendarza urlopów dla danego miesiąca
  getEmployeesLeavesByMonth(year: number, month: number): Observable<EmployeeLeavesResponse> {
    return this.http.get<EmployeeLeavesResponse>(`${environment.apiUrl}/api/employees/leaves`, {
      params: { year: year.toString(), month: month.toString() }
    });
  }

  // Pobieranie kalendarza urlopów - nowy endpoint z backendu
  getLeaveCalendar(year: number, month: number): Observable<LeaveCalendarResponse[]> {
    return this.http.get<LeaveCalendarResponse[]>(`${this.API_URL}/calendar`, {
      params: { year: year.toString(), month: month.toString() }
    });
  }

  // Pobieranie wszystkich wniosków urlopowych zalogowanego użytkownika
  getMyLeaveProposals(): Observable<EmployeeLeaveProposalResponse[]> {
    // Backend nie ma osobnego endpointu dla bieżącego użytkownika, więc użyjemy getUserLeaveProposals
    // z ID bieżącego użytkownika (można pobrać z AuthService)
    return this.http.get<EmployeeLeaveProposalResponse[]>(`${this.API_URL}/my`);
  }

  // Pobieranie historii zmian wniosku (dla HR/Admin)
  getProposalHistory(proposalId: number): Observable<ProposalHistoryResponse[]> {
    return this.http.get<ProposalHistoryResponse[]>(`${this.API_URL}/${proposalId}/history`);
  }

  // Pobieranie statystyk urlopowych dla okresu (kto jest na urlopie)
  getLeaveStats(startDate: string, endDate: string): Observable<LeaveStatsResponse> {
    return this.http.get<LeaveStatsResponse>(`${this.API_URL}/stats`, {
      params: { startDate, endDate }
    });
  }

  // Pobieranie wszystkich wniosków firmy (dla HR/Admin)
  getCompanyLeaveProposals(
    status?: string,
    leaveType?: string,
    startDate?: string,
    endDate?: string
  ): Observable<EmployeeLeaveProposalResponse[]> {
    const params: any = {};
    if (status) params.status = status;
    if (leaveType) params.leaveType = leaveType;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    return this.http.get<EmployeeLeaveProposalResponse[]>(`${this.API_URL}/company`, { params });
  }

  // Zatwierdzanie wniosku (wersja uproszczona)
  approveLeaveProposalSimple(proposalId: number, comment: string = ''): Observable<LeaveProposalOperationResponse> {
    const request: AcceptLeaveProposalRequest = {
      approverComments: comment
    };
    return this.acceptLeaveProposal(proposalId, request);
  }

  // Odrzucanie wniosku (wersja uproszczona)
  rejectLeaveProposalSimple(proposalId: number, reason: string): Observable<LeaveProposalOperationResponse> {
    const request: RejectLeaveProposalRequest = {
      rejectionReason: reason,
      approverComments: reason
    };
    return this.rejectLeaveProposal(proposalId, request);
  }
}