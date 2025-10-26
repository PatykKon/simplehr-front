import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LeaveProposalService } from '../../services/leave-proposal.service';
import { AuthService } from '../../services/auth.service';
import {
  EmployeeLeaveProposalResponse,
  LeaveProposalStatus,
  AcceptLeaveProposalRequest,
  RejectLeaveProposalRequest,
  ProposalHistoryResponse,
  LeaveStatsResponse,
  LeaveCalendarUser,
  LEAVE_TYPE_LABELS,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_OPTIONS
} from '../../models/leave-proposal.models';

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isInRange: boolean;
  isStartDate: boolean;
  isEndDate: boolean;
  employeesOnLeave: LeaveCalendarUser[];
  hasLeaves: boolean;
}

@Component({
  selector: 'app-leave-proposal-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="proposal-details">
      <!-- Header -->
      <div class="header">
        <div class="header-info">
          <button class="btn-back" (click)="goBack()">
            ← Powrót
          </button>
          <h1>
            <span class="icon">📋</span>
            Szczegóły wniosku urlopowego #{{ proposalId }}
          </h1>
        </div>
        <div class="header-actions">
          <!-- Admin/HR/Manager actions -->
          <div *ngIf="canApprove" class="approval-actions">
            <button 
              class="btn btn-success"
              (click)="showApprovalForm = true"
              [disabled]="proposal?.status !== 'SUBMITTED'"
            >
              ✅ Zatwierdź
            </button>
            <button 
              class="btn btn-danger"
              (click)="showRejectionForm = true"
              [disabled]="proposal?.status !== 'SUBMITTED'"
            >
              ❌ Odrzuć
            </button>
          </div>

          <!-- User actions for own proposals -->
          <div *ngIf="canEditOwnProposal()" class="user-actions">
            <button 
              class="btn btn-primary"
              (click)="editProposal()"
              [disabled]="proposal?.status !== 'SUBMITTED'"
            >
              ✏️ Edytuj wniosek
            </button>
            <button 
              class="btn btn-secondary"
              (click)="withdrawProposal()"
              [disabled]="proposal?.status !== 'SUBMITTED'"
              title="Wycofaj wniosek"
            >
              ↩️ Wycofaj
            </button>
          </div>

          <!-- Debug info -->
          <div *ngIf="showDebugInfo" class="debug-info">
            <small>Debug: canApprove={{ canApprove }}, canEdit={{ canEditOwnProposal() }}</small>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        <p>Ładowanie szczegółów wniosku...</p>
      </div>

      <!-- Error -->
      <div *ngIf="error" class="alert alert-error">
        <strong>❌ Błąd:</strong><br>
        {{ error }}
      </div>

      <!-- Main Content -->
      <div *ngIf="!loading && !error && proposal" class="main-content">
        <!-- Left Panel - Proposal Details -->
        <div class="left-panel">
          <!-- Proposal Info Card -->
          <div class="card proposal-info">
            <div class="card-header">
              <h2>📄 Informacje o wniosku</h2>
              <span class="status-badge" [class]="getStatusClass(proposal.status)">
                {{ getStatusIcon(proposal.status) }} {{ getStatusLabel(proposal.status) }}
              </span>
            </div>
            <div class="card-content">
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Pracownik:</span>
                  <span class="value">{{ proposal.userFirstName }} {{ proposal.userLastName }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Typ urlopu:</span>
                  <span class="value leave-type" [style.color]="getLeaveTypeColor(proposal.leaveType)">
                    {{ getLeaveTypeIcon(proposal.leaveType) }} {{ getLeaveTypeLabel(proposal.leaveType) }}
                  </span>
                </div>
                <div class="info-item">
                  <span class="label">Okres:</span>
                  <span class="value">
                    {{ formatDate(proposal.startDate) }} - {{ formatDate(proposal.endDate) }}
                  </span>
                </div>
                <div class="info-item">
                  <span class="label">Liczba dni:</span>
                  <span class="value days-count">{{ proposal.requestedDays }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Złożono:</span>
                  <span class="value">{{ formatDateTime(proposal.submittedAt) }}</span>
                </div>
                <div class="info-item" *ngIf="proposal.processedAt">
                  <span class="label">Rozpatrzono:</span>
                  <span class="value">{{ formatDateTime(proposal.processedAt) }}</span>
                </div>
                <div class="info-item" *ngIf="proposal.processedByUserName">
                  <span class="label">Rozpatrzył:</span>
                  <span class="value">{{ proposal.processedByUserName }}</span>
                </div>
              </div>
              <div class="description" *ngIf="proposal.description">
                <h3>📝 Opis wniosku</h3>
                <p>{{ proposal.description }}</p>
              </div>
              <div class="handover-notes" *ngIf="proposal.handoverNotes">
                <h3>📋 Uwagi do przekazania</h3>
                <p>{{ proposal.handoverNotes }}</p>
              </div>
              <div class="substitute" *ngIf="proposal.substituteUserName">
                <h3>👤 Zastępstwo</h3>
                <p>{{ proposal.substituteUserName }}</p>
              </div>
              <div class="rejection-reason" *ngIf="proposal.rejectionReason">
                <h3>❌ Powód odrzucenia</h3>
                <p>{{ proposal.rejectionReason }}</p>
              </div>
              <div class="approver-comments" *ngIf="proposal.approverComments">
                <h3>💬 Komentarz przełożonego</h3>
                <p>{{ proposal.approverComments }}</p>
              </div>
            </div>
          </div>
          <!-- Leave Statistics -->
          <div class="card stats-card" *ngIf="leaveStats">
            <div class="card-header">
              <h2>📊 Statystyki urlopowe</h2>
            </div>
            <div class="card-content">
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-value">{{ leaveStats.totalEmployees }}</span>
                  <span class="stat-label">Wszyscy pracownicy</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ leaveStats.employeesOnLeave }}</span>
                  <span class="stat-label">Na urlopie w tym okresie</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ getOverlapDaysCount() }}</span>
                  <span class="stat-label">Dni z nakładaniem</span>
                </div>
              </div>
              <div class="overlapping-details">
                <h4>⚠️ Pracownicy na urlopie w tym samym czasie</h4>
                <div *ngIf="(leaveStats?.overlappingRequests && leaveStats.overlappingRequests.length > 0); else noOverlap">
                  <div class="overlap-list">
                    <div class="overlap-item" *ngFor="let overlap of leaveStats.overlappingRequests">
                      <span class="overlap-date">{{ formatDate(overlap.date) }}</span>
                      <div class="overlap-employees">
                        <span class="employee-chip" *ngFor="let emp of overlap.employees">
                          {{ emp.userFirstName }} {{ emp.userLastName }} ({{ getLeaveTypeLabel(emp.leaveType) }})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <ng-template #noOverlap>
                  <p>Brak</p>
                </ng-template>
              </div>
            </div>
          </div>
          <!-- History -->
          <div class="card history-card">
            <div class="card-header">
              <h2>📈 Historia zmian</h2>
            </div>
            <div class="card-content">
              <div class="history-loading" *ngIf="historyLoading">
                <div class="spinner-small"></div>
                <span>Ładowanie historii...</span>
              </div>
              <div class="history-list" *ngIf="!historyLoading">
                <div class="history-item" *ngFor="let item of proposalHistory">
                  <div class="history-icon">
                    {{ getChangeTypeIcon(item.changeType) }}
                  </div>
                  <div class="history-content">
                    <div class="history-header">
                      <span class="change-type">{{ getChangeTypeLabel(item.changeType) }}</span>
                      <span class="change-date">{{ formatDateTime(item.changedAt) }}</span>
                    </div>
                    <div class="history-details">
                      <span class="changed-by">{{ item.changedBy }}</span>
                      <span class="change-description" *ngIf="item.changeDescription">
                        {{ item.changeDescription }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="no-history" *ngIf="proposalHistory.length === 0">
                  <p>Brak historii zmian</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel - Calendar -->
        <div class="right-panel">
          <div class="card calendar-card">
            <div class="card-header">
              <h2>📅 Kalendarz urlopowy</h2>
              <div class="calendar-nav">
                <button class="btn-nav" (click)="previousMonth()">‹</button>
                <span class="month-year">{{ getMonthYearDisplay() }}</span>
                <button class="btn-nav" (click)="nextMonth()">›</button>
              </div>
            </div>
            
            <div class="calendar-container">
              <div class="calendar-weekdays">
                <div class="weekday" *ngFor="let day of weekdays">{{ day }}</div>
              </div>
              
              <div class="calendar-days">
                <div 
                  class="calendar-day" 
                  *ngFor="let day of calendarDays"
                  [class.other-month]="!day.isCurrentMonth"
                  [class.today]="day.isToday"
                  [class.in-range]="day.isInRange"
                  [class.start-date]="day.isStartDate"
                  [class.end-date]="day.isEndDate"
                  [class.has-leaves]="day.hasLeaves"
                >
                  <span class="day-number">{{ day.day }}</span>
                  
                  <div class="day-employees" *ngIf="day.employeesOnLeave.length > 0">
                    <div class="employee-tooltip">
                      <span class="employee-count">{{ day.employeesOnLeave.length }}</span>
                      <div class="tooltip-content">
                        <div class="tooltip-employee" *ngFor="let emp of day.employeesOnLeave">
                          <strong>{{ emp.userFirstName }} {{ emp.userLastName }}</strong>
                          <span class="emp-leave-type">{{ getLeaveTypeLabel(emp.leaveType) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="calendar-legend">
              <div class="legend-item">
                <div class="legend-color current-proposal"></div>
                <span>Obecny wniosek</span>
              </div>
              <div class="legend-item">
                <div class="legend-color has-leaves"></div>
                <span>Inne urlopy</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Approval Form Modal -->
      <div class="modal" *ngIf="showApprovalForm" (click)="closeApprovalForm($event)">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>✅ Zatwierdź wniosek urlopowy</h3>
            <button class="btn-close" (click)="closeApprovalForm()">&times;</button>
          </div>
          
          <form [formGroup]="approvalForm" (ngSubmit)="approveProposal()" class="modal-body">
            <div class="form-group">
              <label for="approverComments">💬 Komentarz (opcjonalnie):</label>
              <textarea
                id="approverComments"
                formControlName="approverComments"
                rows="4"
                placeholder="Dodaj komentarz do zatwierdzenia..."
              ></textarea>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="closeApprovalForm()">
                Anuluj
              </button>
              <button type="submit" class="btn btn-success" [disabled]="approvingProposal">
                <span *ngIf="approvingProposal" class="spinner-small"></span>
                ✅ Zatwierdź wniosek
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Rejection Form Modal -->
      <div class="modal" *ngIf="showRejectionForm" (click)="closeRejectionForm($event)">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>❌ Odrzuć wniosek urlopowy</h3>
            <button class="btn-close" (click)="closeRejectionForm()">&times;</button>
          </div>
          
          <form [formGroup]="rejectionForm" (ngSubmit)="rejectProposal()" class="modal-body">
            <div class="form-group">
              <label for="rejectionReason">❌ Powód odrzucenia *:</label>
              <textarea
                id="rejectionReason"
                formControlName="rejectionReason"
                rows="4"
                placeholder="Wyjaśnij powód odrzucenia wniosku..."
                required
              ></textarea>
              <div class="form-error" *ngIf="rejectionForm.get('rejectionReason')?.invalid && rejectionForm.get('rejectionReason')?.touched">
                Powód odrzucenia jest wymagany
              </div>
            </div>
            
            <div class="form-group">
              <label for="rejectionComments">💬 Dodatkowy komentarz (opcjonalnie):</label>
              <textarea
                id="rejectionComments"
                formControlName="approverComments"
                rows="3"
                placeholder="Dodatkowe uwagi lub sugestie..."
              ></textarea>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="closeRejectionForm()">
                Anuluj
              </button>
              <button type="submit" class="btn btn-danger" [disabled]="rejectingProposal || rejectionForm.invalid">
                <span *ngIf="rejectingProposal" class="spinner-small"></span>
                ❌ Odrzuć wniosek
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Success Message -->
      <div class="alert alert-success" *ngIf="successMessage">
        <strong>✅ Sukces:</strong><br>
        {{ successMessage }}
      </div>
    </div>
  `,
  styles: [`
    .proposal-details {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      gap: 20px;
    }

    .header-info h1 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 10px 0;
      font-size: 28px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .header-info h1 .icon {
      font-size: 28px;
    }

    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 8px 16px;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      color: #374151;
      text-decoration: none;
      font-size: 14px;
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .btn-back:hover {
      background: #e5e7eb;
      color: #1f2937;
    }

    .header-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .approval-actions, .user-actions {
      display: flex;
      gap: 10px;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
    }

    .btn-success {
      background: #10b981;
      color: white;
    }

    .btn-success:hover:not(:disabled) {
      background: #059669;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      background: #dc2626;
    }

    .btn-secondary {
      background: #6b7280;
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #4b5563;
    }

    /* Main Content Layout */
    .main-content {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 30px;
    }

    /* Cards */
    .card {
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      margin-bottom: 20px;
      overflow: hidden;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }

    .card-header h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .card-content {
      padding: 20px;
    }

    /* Status Badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-badge.pending {
      background: #fef3c7;
      color: #92400e;
    }

    .status-badge.approved {
      background: #d1fae5;
      color: #065f46;
    }

    .status-badge.rejected {
      background: #fee2e2;
      color: #991b1b;
    }

    .status-badge.cancelled {
      background: #f3f4f6;
      color: #374151;
    }

    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .info-item .label {
      font-size: 14px;
      font-weight: 500;
      color: #6b7280;
    }

    .info-item .value {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .leave-type {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .days-count {
      color: #3b82f6;
    }

    /* Description sections */
    .description, .handover-notes, .substitute, .rejection-reason, .approver-comments {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }

    .description h3, .handover-notes h3, .substitute h3, .rejection-reason h3, .approver-comments h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 10px 0;
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .description p, .handover-notes p, .substitute p, .rejection-reason p, .approver-comments p {
      margin: 0;
      color: #374151;
      line-height: 1.6;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }

    .stat-item {
      text-align: center;
      padding: 15px;
      background: #f9fafb;
      border-radius: 8px;
    }

    .stat-value {
      display: block;
      font-size: 24px;
      font-weight: 700;
      color: #3b82f6;
      margin-bottom: 5px;
    }

    .stat-label {
      font-size: 14px;
      color: #6b7280;
    }

    /* Calendar */
    .calendar-card {
      position: sticky;
      top: 20px;
    }

    .calendar-nav {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .btn-nav {
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-nav:hover {
      background: #e5e7eb;
    }

    .month-year {
      font-weight: 600;
      color: #1a1a1a;
      text-transform: capitalize;
    }

    .calendar-container {
      margin-top: 15px;
    }

    .calendar-weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 1px;
      margin-bottom: 1px;
    }

    .weekday {
      padding: 8px;
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      background: #f9fafb;
    }

    .calendar-days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 1px;
    }

    .calendar-day {
      position: relative;
      min-height: 40px;
      padding: 4px;
      background: white;
      border: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
    }

    .calendar-day.other-month {
      background: #f9fafb;
      color: #9ca3af;
    }

    .calendar-day.today {
      background: #dbeafe;
      border-color: #3b82f6;
    }

    .calendar-day.in-range {
      background: #fee2e2;
      border-color: #ef4444;
    }

    .calendar-day.start-date, .calendar-day.end-date {
      background: #dc2626;
      color: white;
    }

    .calendar-day.has-leaves {
      background: #fef3c7;
      border-color: #f59e0b;
    }

    .day-number {
      font-size: 12px;
      font-weight: 500;
    }

    .day-employees {
      position: relative;
      margin-top: 2px;
    }

    .employee-count {
      display: inline-block;
      background: #3b82f6;
      color: white;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 4px;
      border-radius: 8px;
      min-width: 16px;
      text-align: center;
    }

    .employee-tooltip {
      position: relative;
    }

    .tooltip-content {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: #1a1a1a;
      color: white;
      padding: 8px;
      border-radius: 6px;
      font-size: 11px;
      white-space: nowrap;
      z-index: 10;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s ease;
      margin-bottom: 5px;
    }

    .employee-tooltip:hover .tooltip-content {
      opacity: 1;
      visibility: visible;
    }

    .tooltip-employee {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .emp-leave-type {
      color: #9ca3af;
      font-size: 10px;
    }

    .calendar-legend {
      display: flex;
      gap: 15px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #6b7280;
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }

    .legend-color.current-proposal {
      background: #dc2626;
    }

    .legend-color.has-leaves {
      background: #f59e0b;
    }

    /* Loading & Alert States */
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
      padding: 60px 20px;
      text-align: center;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e5e7eb;
      border-top: 4px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .spinner-small {
      width: 16px;
      height: 16px;
      border: 2px solid #e5e7eb;
      border-top: 2px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      display: inline-block;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .alert {
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
    }

    .alert-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }

    .alert-success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }

    /* Modal */
    .modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e5e7eb;
    }

    .modal-header h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #6b7280;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.2s ease;
    }

    .btn-close:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .modal-body {
      padding: 20px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
    }

    .form-group textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
      transition: border-color 0.2s ease;
    }

    .form-group textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-error {
      color: #ef4444;
      font-size: 12px;
      margin-top: 5px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }

    /* Debug Info */
    .debug-info {
      margin-top: 10px;
    }

    .debug-info small {
      color: #6b7280;
      font-size: 12px;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .main-content {
        grid-template-columns: 1fr;
      }

      .calendar-card {
        position: static;
      }
    }

    @media (max-width: 768px) {
      .proposal-details {
        padding: 15px;
      }

      .header {
        flex-direction: column;
        align-items: flex-start;
        gap: 15px;
      }

      .header-actions {
        width: 100%;
      }

      .approval-actions, .user-actions {
        flex-wrap: wrap;
        width: 100%;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .stats-grid {
        grid-template-columns: repeat(3, 1fr);
      }

      .calendar-days {
        font-size: 12px;
      }

      .calendar-day {
        min-height: 35px;
      }
    }

    @media (max-width: 480px) {
      .header-info h1 {
        font-size: 24px;
      }

      .btn {
        padding: 8px 12px;
        font-size: 13px;
      }

      .stats-grid {
        grid-template-columns: 1fr 1fr;
      }

      .calendar-weekdays, .calendar-days {
        gap: 0;
      }

      .calendar-day {
        min-height: 30px;
        padding: 2px;
      }

      .day-number {
        font-size: 11px;
      }
    }
  `]
})
export class LeaveProposalDetailsComponent implements OnInit {
  proposalId!: number;
  proposal: EmployeeLeaveProposalResponse | null = null;
  proposalHistory: ProposalHistoryResponse[] = [];
  leaveStats: LeaveStatsResponse | null = null;
  
  loading = false;
  historyLoading = false;
  error = '';
  successMessage = '';
  
  // Calendar
  currentDate = new Date();
  calendarDays: CalendarDay[] = [];
  weekdays = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie'];
  
  // Forms
  approvalForm: FormGroup;
  rejectionForm: FormGroup;
  showApprovalForm = false;
  showRejectionForm = false;
  approvingProposal = false;
  rejectingProposal = false;
  
  // User permissions
  canApprove = false;
  showDebugInfo = true; // Set to false in production

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private leaveProposalService: LeaveProposalService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.approvalForm = this.fb.group({
      approverComments: ['']
    });

    this.rejectionForm = this.fb.group({
      rejectionReason: ['', [Validators.required]],
      approverComments: ['']
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const idParam = params['id'];
      this.proposalId = +idParam;
      
      // Walidacja parametru ID
      if (!idParam || isNaN(this.proposalId) || this.proposalId <= 0) {
        console.error('Invalid proposal ID parameter:', idParam);
        this.error = 'Nieprawidłowe ID wniosku';
        this.router.navigate(['/leave-requests']);
        return;
      }
      
      this.loadProposalDetails();
    });
    
    this.checkUserPermissions();
  }

  checkUserPermissions(): void {
    const currentUser = this.authService.getCurrentUser();
    console.log('🔍 Checking user permissions - Current user:', currentUser);
    console.log('🔍 User authenticated:', this.authService.isAuthenticated());
    
    if (currentUser) {
      console.log('🔍 User roles:', currentUser.roles);
      const hasRequiredRole = currentUser.roles?.some(role => ['ROLE_ADMIN', 'ROLE_HR', 'ROLE_MANAGER'].includes(role)) || false;
      console.log('🔍 Has required role (ADMIN/HR/MANAGER):', hasRequiredRole);
      this.canApprove = hasRequiredRole;
    } else {
      console.log('🔍 No current user found');
      this.canApprove = false;
    }
    
    console.log('🔍 Final canApprove value:', this.canApprove);
  }

  loadProposalDetails(): void {
    this.loading = true;
    this.error = '';
    
    console.log('📋 Loading proposal details for ID:', this.proposalId);

    this.leaveProposalService.getLeaveProposal(this.proposalId).subscribe({
      next: (proposal) => {
        console.log('📋 Proposal loaded successfully:', proposal);
        this.proposal = proposal;
        this.loading = false;
        
        // Load additional data
        this.loadProposalHistory();
        this.loadLeaveStats();
        this.generateCalendar();
      },
      error: (error) => {
        console.error('❌ Error loading proposal:', error);
        this.error = error.error?.message || 'Nie udało się pobrać szczegółów wniosku.';
        this.loading = false;
      }
    });
  }

  loadProposalHistory(): void {
    this.historyLoading = true;
    
    this.leaveProposalService.getProposalHistory(this.proposalId).subscribe({
      next: (history) => {
        this.proposalHistory = history;
        this.historyLoading = false;
      },
      error: (error) => {
        console.error('Error loading history:', error);
        this.historyLoading = false;
        // Don't show error for history - it's not critical
      }
    });
  }

  loadLeaveStats(): void {
    if (!this.proposal) return;

    this.leaveProposalService.getLeaveStats(this.proposal.startDate, this.proposal.endDate).subscribe({
      next: (stats) => {
        this.leaveStats = stats;
      },
      error: (error) => {
        console.error('Error loading leave stats:', error);
        // Don't show error for stats - it's not critical
      }
    });
  }

  // Calendar methods
  generateCalendar(): void {
    if (!this.proposal) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    
    // Start from Monday
    const dayOfWeek = (firstDay.getDay() + 6) % 7;
    startDate.setDate(startDate.getDate() - dayOfWeek);

    this.calendarDays = [];
    const proposalStart = new Date(this.proposal.startDate);
    const proposalEnd = new Date(this.proposal.endDate);

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === month;
      const isToday = this.isSameDate(date, new Date());
      const isInRange = this.isDateInRange(date, proposalStart, proposalEnd);
      const isStartDate = this.isSameDate(date, proposalStart);
      const isEndDate = this.isSameDate(date, proposalEnd);

      this.calendarDays.push({
        date: new Date(date),
        day: date.getDate(),
        isCurrentMonth,
        isToday,
        isSelected: false,
        isInRange,
        isStartDate,
        isEndDate,
        employeesOnLeave: [], // Will be populated by leave calendar data
        hasLeaves: false
      });
    }

    // Load calendar data for this month
    this.loadCalendarData();
  }

  loadCalendarData(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth() + 1;

    this.leaveProposalService.getLeaveCalendar(year, month).subscribe({
      next: (calendarData) => {
        // Update calendar days with leave data
        this.calendarDays.forEach(day => {
          const dateStr = day.date.toISOString().split('T')[0];
          const dayData = calendarData.find(d => d.date === dateStr);
          if (dayData) {
            day.employeesOnLeave = dayData.users || [];
            day.hasLeaves = day.employeesOnLeave.length > 0;
          }
        });
      },
      error: (error) => {
        console.error('Error loading calendar data:', error);
      }
    });
  }

  previousMonth(): void {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.generateCalendar();
  }

  getMonthYearDisplay(): string {
    return this.currentDate.toLocaleDateString('pl-PL', { 
      month: 'long', 
      year: 'numeric' 
    });
  }

  // Approval methods
  approveProposal(): void {
    if (!this.proposal || this.approvingProposal) return;

    this.approvingProposal = true;
    const request: AcceptLeaveProposalRequest = {
      approverComments: this.approvalForm.get('approverComments')?.value || undefined
    };

    this.leaveProposalService.acceptLeaveProposal(this.proposal.id, request).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.showApprovalForm = false;
        this.approvingProposal = false;
        this.approvalForm.reset();
        
        // Reload proposal details
        setTimeout(() => {
          this.loadProposalDetails();
          this.successMessage = '';
        }, 2000);
      },
      error: (error) => {
        console.error('Error approving proposal:', error);
        this.error = error.error?.message || 'Nie udało się zatwierdzić wniosku.';
        this.approvingProposal = false;
      }
    });
  }

  rejectProposal(): void {
    if (!this.proposal || this.rejectingProposal || this.rejectionForm.invalid) return;

    this.rejectingProposal = true;
    const formValue = this.rejectionForm.value;
    const request: RejectLeaveProposalRequest = {
      rejectionReason: formValue.rejectionReason,
      approverComments: formValue.approverComments || undefined
    };

    this.leaveProposalService.rejectLeaveProposal(this.proposal.id, request).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.showRejectionForm = false;
        this.rejectingProposal = false;
        this.rejectionForm.reset();
        
        // Reload proposal details
        setTimeout(() => {
          this.loadProposalDetails();
          this.successMessage = '';
        }, 2000);
      },
      error: (error) => {
        console.error('Error rejecting proposal:', error);
        this.error = error.error?.message || 'Nie udało się odrzucić wniosku.';
        this.rejectingProposal = false;
      }
    });
  }

  closeApprovalForm(event?: Event): void {
    if (event && (event.target as HTMLElement).classList.contains('modal-content')) {
      return;
    }
    this.showApprovalForm = false;
    this.approvalForm.reset();
  }

  closeRejectionForm(event?: Event): void {
    if (event && (event.target as HTMLElement).classList.contains('modal-content')) {
      return;
    }
    this.showRejectionForm = false;
    this.rejectionForm.reset();
  }

  // Helper methods
  getOverlapDaysCount(): number {
    return this.leaveStats?.overlappingRequests?.length || 0;
  }

  getStatusClass(status: LeaveProposalStatus): string {
    return status.toLowerCase();
  }

  getStatusLabel(status: LeaveProposalStatus): string {
    return LEAVE_STATUS_LABELS[status] || status;
  }

  getStatusIcon(status: LeaveProposalStatus): string {
    const icons: Record<LeaveProposalStatus, string> = {
      SUBMITTED: '⏳',
      IN_REVIEW: '🔎',
      APPROVED: '✅',
      REJECTED: '❌',
      CANCELLED: '🚫',
      WITHDRAWN: '↩️',
      DRAFT: '📝'
    };
    return icons[status] || '❓';
  }

  getLeaveTypeLabel(type: string): string {
    return LEAVE_TYPE_LABELS[type as keyof typeof LEAVE_TYPE_LABELS] || type;
  }

  getLeaveTypeIcon(type: string): string {
    const option = LEAVE_TYPE_OPTIONS.find(opt => opt.value === type);
    return option?.icon || '📝';
  }

  getLeaveTypeColor(type: string): string {
    const option = LEAVE_TYPE_OPTIONS.find(opt => opt.value === type);
    return option?.color || '#64748b';
  }

  getChangeTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      CREATED: '📝',
      UPDATED: '✏️',
      STATUS_CHANGED: '🔄',
      APPROVED: '✅',
      REJECTED: '❌',
      CANCELLED: '🚫',
      WITHDRAWN: '↩️',
      COMMENT_ADDED: '💬'
    };
    return icons[type] || '📋';
  }

  getChangeTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      CREATED: 'Utworzono',
      UPDATED: 'Zaktualizowano',
      STATUS_CHANGED: 'Zmieniono status',
      APPROVED: 'Zatwierdzono',
      REJECTED: 'Odrzucono',
      CANCELLED: 'Anulowano',
      WITHDRAWN: 'Wycofano',
      COMMENT_ADDED: 'Dodano komentarz'
    };
    return labels[type] || type;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    // Zamiana '-' na '/' dla lepszej kompatybilności
    const safeDateString = dateString.replace(/-/g, '/');
    const date = new Date(safeDateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pl-PL');
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return '';
    const safeDateString = dateString.replace(/-/g, '/');
    const date = new Date(safeDateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pl-PL') + ' ' + 
           date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  }

  isSameDate(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  isDateInRange(date: Date, start: Date, end: Date): boolean {
    return date >= start && date <= end;
  }

  // User actions
  canEditOwnProposal(): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !this.proposal) return false;
    
    // User can edit their own proposal if it's SUBMITTED
    const isOwnProposal = currentUser.id === this.proposal.userId;
    const isSubmitted = this.proposal.status === LeaveProposalStatus.SUBMITTED;
    
    console.log('🔍 Can edit own proposal:', {
      isOwnProposal, 
      isSubmitted, 
      currentUserId: currentUser.id, 
      proposalUserId: this.proposal.userId,
      proposalStatus: this.proposal.status
    });
    
    return isOwnProposal && isSubmitted;
  }

  editProposal(): void {
    if (this.proposal) {
      this.router.navigate(['/leave-requests', this.proposal.id, 'edit']);
    }
  }

  withdrawProposal(): void {
    if (!this.proposal) return;
    
    const confirmed = confirm('Czy na pewno chcesz wycofać ten wniosek urlopowy?');
    if (confirmed) {
      // TODO: Implement withdraw functionality
      // For now, we'll use reject with a special reason
      const request = {
        rejectionReason: 'Wniosek wycofany przez użytkownika',
        approverComments: 'Automatyczne wycofanie wniosku przez właściciela'
      };
      
      this.leaveProposalService.rejectLeaveProposal(this.proposal.id, request).subscribe({
        next: (response) => {
          this.successMessage = 'Wniosek został pomyślnie wycofany.';
          setTimeout(() => {
            this.loadProposalDetails();
            this.successMessage = '';
          }, 2000);
        },
        error: (error) => {
          console.error('Error withdrawing proposal:', error);
          this.error = error.error?.message || 'Nie udało się wycofać wniosku.';
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/leave-requests']);
  }
}