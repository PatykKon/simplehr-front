import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LeaveProposalService } from '../../services/leave-proposal.service';
import { AuthService } from '../../services/auth.service';
import {
  EmployeeLeaveProposalResponse,
  LeaveProposalStatus,
  LeaveType,
  LEAVE_TYPE_LABELS,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_OPTIONS,
  LEAVE_STATUS_OPTIONS
} from '../../models/leave-proposal.models';

@Component({
  selector: 'app-leave-requests-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="leave-requests-container">
      <!-- Header -->
      <div class="header-section">
        <div class="header-content">
          <h2 class="title">
            <span class="icon">🏖️</span>
            Moje wnioski urlopowe
          </h2>
          <button class="btn btn-primary" (click)="createNewRequest()">
            <span class="icon">➕</span>
            Nowy wniosek
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-section">
        <div class="stats-grid">
          <div class="stat-card pending">
            <div class="stat-icon">⏳</div>
            <div class="stat-content">
              <div class="stat-value">{{ getStatCount('PENDING') }}</div>
              <div class="stat-label">Oczekujące</div>
            </div>
          </div>
          <div class="stat-card approved">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
              <div class="stat-value">{{ getStatCount('APPROVED') }}</div>
              <div class="stat-label">Zatwierdzone</div>
            </div>
          </div>
          <div class="stat-card rejected">
            <div class="stat-icon">❌</div>
            <div class="stat-content">
              <div class="stat-value">{{ getStatCount('REJECTED') }}</div>
              <div class="stat-label">Odrzucone</div>
            </div>
          </div>
          <div class="stat-card total">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
              <div class="stat-value">{{ leaveRequests.length }}</div>
              <div class="stat-label">Wszystkie</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filters-header">
          <h3>Filtry i wyszukiwanie</h3>
          <button 
            *ngIf="hasActiveFilters()" 
            class="btn btn-ghost btn-sm" 
            (click)="clearFilters()">
            <span class="icon">🗑️</span>
            Wyczyść filtry
          </button>
        </div>
        
        <div class="filters-grid">
          <!-- Search -->
          <div class="filter-group">
            <label>Wyszukaj</label>
            <input 
              type="text" 
              class="form-control" 
              placeholder="Szukaj w tytule, opisie..."
              [(ngModel)]="filters.search"
              (input)="applyFilters()">
          </div>

          <!-- Status filter -->
          <div class="filter-group">
            <label>Status</label>
            <select 
              class="form-control" 
              [(ngModel)]="filters.status"
              (change)="applyFilters()">
              <option value="">Wszystkie statusy</option>
              <option *ngFor="let option of statusOptions" [value]="option.value">
                {{ option.icon }} {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Leave type filter -->
          <div class="filter-group">
            <label>Typ urlopu</label>
            <select 
              class="form-control" 
              [(ngModel)]="filters.leaveType"
              (change)="applyFilters()">
              <option value="">Wszystkie typy</option>
              <option *ngFor="let option of leaveTypeOptions" [value]="option.value">
                {{ option.icon }} {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Year filter -->
          <div class="filter-group" *ngIf="availableYears.length > 0">
            <label>Rok</label>
            <select 
              class="form-control" 
              [(ngModel)]="filters.year"
              (change)="applyFilters()">
              <option value="">Wszystkie lata</option>
              <option *ngFor="let year of availableYears" [value]="year">
                {{ year }}
              </option>
            </select>
          </div>

          <!-- Sort options -->
          <div class="filter-group">
            <label>Sortuj według</label>
            <div class="sort-controls">
              <select 
                class="form-control" 
                [(ngModel)]="sortBy"
                (change)="applySort()">
                <option value="submittedAt">Data złożenia</option>
                <option value="startDate">Data rozpoczęcia</option>
                <option value="status">Status</option>
                <option value="leaveType">Typ urlopu</option>
              </select>
              <button 
                class="btn btn-ghost btn-sm sort-order-btn"
                (click)="toggleSortOrder()"
                [title]="sortOrder === 'asc' ? 'Sortuj malejąco' : 'Sortuj rosnąco'">
                {{ sortOrder === 'asc' ? '⬆️' : '⬇️' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Results Info -->
      <div class="results-info" *ngIf="!loading">
        <span class="results-count">
          Znaleziono {{ filteredRequests.length }} z {{ leaveRequests.length }} wniosków
        </span>
        <span *ngIf="hasActiveFilters()" class="active-filters-info">
          (z filtrami)
        </span>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Ładowanie wniosków urlopowych...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Wystąpił błąd</h3>
        <p>{{ error }}</p>
        <button class="btn btn-primary" (click)="loadLeaveRequests()">
          <span class="icon">🔄</span>
          Spróbuj ponownie
        </button>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && !error && filteredRequests.length === 0 && leaveRequests.length === 0" class="empty-state">
        <div class="empty-icon">🏖️</div>
        <h3>Brak wniosków urlopowych</h3>
        <p>Nie masz jeszcze żadnych wniosków urlopowych.</p>
        <button class="btn btn-primary" (click)="createNewRequest()">
          <span class="icon">➕</span>
          Złóż pierwszy wniosek
        </button>
      </div>

      <!-- No Results State -->
      <div *ngIf="!loading && !error && filteredRequests.length === 0 && leaveRequests.length > 0" class="no-results-state">
        <div class="no-results-icon">🔍</div>
        <h3>Brak wyników</h3>
        <p>Nie znaleziono wniosków pasujących do kryteriów wyszukiwania.</p>
        <button class="btn btn-ghost" (click)="clearFilters()">
          <span class="icon">🗑️</span>
          Wyczyść filtry
        </button>
      </div>

      <!-- Leave Requests List -->
      <div class="requests-list" *ngIf="!loading && !error && filteredRequests.length > 0">
        <div 
          class="request-card"
          *ngFor="let request of filteredRequests; trackBy: trackByRequestId"
          [class.editable]="canEditRequest(request)">
          
          <!-- Request Header -->
          <div class="request-header">
            <div class="request-title">
              <span class="leave-type-icon" [style.color]="getLeaveTypeColor(request.leaveType)">
                {{ getLeaveTypeIcon(request.leaveType) }}
              </span>
              <div class="title-content">
                <h4>{{ request.title || 'Wniosek urlopowy' }}</h4>
                <span class="leave-type-label">{{ getLeaveTypeLabel(request.leaveType) }}</span>
              </div>
            </div>
            <div class="request-status">
              <span class="status-badge" [class]="getStatusClass(request.status)">
                <span class="status-icon">{{ getStatusIcon(request.status) }}</span>
                {{ getStatusLabel(request.status) }}
              </span>
            </div>
          </div>

          <!-- Request Details -->
          <div class="request-details">
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">📅 Okres:</span>
                <span class="detail-value">
                  {{ formatDate(request.startDate) }} - {{ formatDate(request.endDate) }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">📊 Dni robocze:</span>
                <span class="detail-value">{{ request.requestedDays }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">📝 Złożony:</span>
                <span class="detail-value">{{ formatDateTime(request.submittedAt) }}</span>
              </div>
              <div class="detail-item" *ngIf="request.substituteUserName">
                <span class="detail-label">👤 Zastępstwo:</span>
                <span class="detail-value">{{ request.substituteUserName }}</span>
              </div>
            </div>
            
            <div class="request-description" *ngIf="request.description">
              <span class="detail-label">📋 Opis:</span>
              <p>{{ request.description }}</p>
            </div>

            <div class="handover-notes" *ngIf="request.handoverNotes">
              <span class="detail-label">📝 Uwagi do przekazania:</span>
              <p>{{ request.handoverNotes }}</p>
            </div>
          </div>

          <!-- Request Actions -->
          <div class="request-actions">
            <button 
              class="btn btn-ghost btn-sm" 
              (click)="viewRequest(request.id)"
              title="Zobacz szczegóły">
              <span class="icon">👁️</span>
              Szczegóły
            </button>
            
            <button 
              *ngIf="canEditRequest(request)"
              class="btn btn-primary btn-sm" 
              (click)="editRequest(request.id)"
              title="Edytuj wniosek">
              <span class="icon">✏️</span>
              Edytuj
            </button>
            
            <button 
              *ngIf="canCancelRequest(request)"
              class="btn btn-danger btn-sm" 
              (click)="cancelRequest(request.id)"
              title="Anuluj wniosek">
              <span class="icon">❌</span>
              Anuluj
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .leave-requests-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Header */
    .header-section {
      margin-bottom: 30px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 15px;
    }

    .title {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .title .icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    /* Stats Cards */
    .stats-section {
      margin-bottom: 30px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      border-radius: 12px;
      background: white;
      border: 2px solid #e5e7eb;
      transition: all 0.2s ease;
      min-height: 70px;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .stat-card.pending {
      border-color: #f59e0b;
      background: linear-gradient(135deg, #fef3c7 0%, #ffffff 100%);
    }

    .stat-card.approved {
      border-color: #10b981;
      background: linear-gradient(135deg, #d1fae5 0%, #ffffff 100%);
    }

    .stat-card.rejected {
      border-color: #ef4444;
      background: linear-gradient(135deg, #fee2e2 0%, #ffffff 100%);
    }

    .stat-card.total {
      border-color: #6366f1;
      background: linear-gradient(135deg, #e0e7ff 0%, #ffffff 100%);
    }

    .stat-icon {
      font-size: 28px;
      opacity: 0.8;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
    }

    .stat-label {
      font-size: 14px;
      color: #6b7280;
      font-weight: 500;
    }

    /* Filters */
    .filters-section {
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .filters-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .filters-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .filter-group label {
      font-size: 14px;
      font-weight: 500;
      color: #374151;
    }

    .form-control {
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .sort-controls {
      display: flex;
      gap: 10px;
      align-items: stretch;
    }

    .sort-controls .form-control {
      flex: 1;
    }

    .sort-order-btn {
      min-width: 40px;
      font-size: 16px;
    }

    /* Results Info */
    .results-info {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      font-size: 14px;
      color: #6b7280;
    }

    .results-count {
      font-weight: 500;
    }

    .active-filters-info {
      color: #3b82f6;
      font-weight: 500;
    }

    /* States */
    .loading-state, .error-state, .empty-state, .no-results-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e5e7eb;
      border-top: 4px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-icon, .empty-icon, .no-results-icon {
      font-size: 40px;
      margin-bottom: 15px;
      opacity: 0.6;
    }

    .error-state h3, .empty-state h3, .no-results-state h3 {
      margin: 0 0 10px 0;
      font-size: 20px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .error-state p, .empty-state p, .no-results-state p {
      margin: 0 0 20px 0;
      color: #6b7280;
    }

    /* Requests List */
    .requests-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .request-card {
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s ease;
    }

    .request-card:hover {
      border-color: #d1d5db;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .request-card.editable {
      border-left: 4px solid #3b82f6;
    }

    .request-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
    }

    .request-title {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      flex: 1;
    }

    .leave-type-icon {
      font-size: 20px;
      margin-top: 2px;
      width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .title-content h4 {
      margin: 0 0 5px 0;
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .leave-type-label {
      font-size: 14px;
      color: #6b7280;
      font-weight: 500;
    }

    .status-badge {
      display: flex;
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

    .request-details {
      margin-bottom: 20px;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
      margin-bottom: 15px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .detail-label {
      color: #6b7280;
      font-weight: 500;
      min-width: fit-content;
    }

    .detail-value {
      color: #1a1a1a;
      font-weight: 500;
    }

    .request-description, .handover-notes {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
    }

    .request-description .detail-label,
    .handover-notes .detail-label {
      display: block;
      margin-bottom: 5px;
    }

    .request-description p,
    .handover-notes p {
      margin: 0;
      color: #374151;
      line-height: 1.5;
    }

    .request-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
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
      transform: translateY(-1px);
    }

    .btn-danger {
      background: #ef4444;
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      background: #dc2626;
      transform: translateY(-1px);
    }

    .btn-ghost {
      background: transparent;
      color: #6b7280;
      border: 1px solid #e5e7eb;
    }

    .btn-ghost:hover:not(:disabled) {
      background: #f9fafb;
      color: #374151;
      border-color: #d1d5db;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    .btn .icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .btn-sm .icon {
      font-size: 11px;
      width: 11px;
      height: 11px;
    }

    /* Detail labels icons */
    .detail-label {
      font-size: 13px !important;
    }

    /* Status badge icons */
    .status-badge .status-icon {
      font-size: 11px;
      width: 11px;
      height: 11px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .leave-requests-container {
        padding: 15px;
      }

      .header-content {
        flex-direction: column;
        align-items: flex-start;
      }

      .title {
        font-size: 24px;
      }

      .stats-grid {
        grid-template-columns: 1fr 1fr;
      }

      .filters-grid {
        grid-template-columns: 1fr;
      }

      .details-grid {
        grid-template-columns: 1fr;
      }

      .request-header {
        flex-direction: column;
        gap: 10px;
      }

      .request-actions {
        justify-content: flex-start;
      }
    }

    @media (max-width: 480px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }

      .stat-card {
        padding: 12px 16px;
        gap: 10px;
        min-height: 60px;
      }

      .stat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      .stat-value {
        font-size: 20px;
      }

      .title .icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      .btn {
        font-size: 12px;
        padding: 6px 10px;
      }

      .btn .icon {
        font-size: 11px;
        width: 11px;
        height: 11px;
      }
    }
  `]
})
export class LeaveRequestsListComponent implements OnInit {
  leaveRequests: EmployeeLeaveProposalResponse[] = [];
  filteredRequests: EmployeeLeaveProposalResponse[] = [];
  loading = false;
  error = '';

  // Filtr opcje
  leaveTypeOptions = LEAVE_TYPE_OPTIONS;
  statusOptions = LEAVE_STATUS_OPTIONS;
  availableYears: number[] = [];

  // Filtry
  filters = {
    status: '',
    leaveType: '',
    year: '',
    search: ''
  };

  // Sortowanie
  sortBy = 'submittedAt';
  sortOrder: 'asc' | 'desc' = 'desc';

  constructor(
    private leaveProposalService: LeaveProposalService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadLeaveRequests();
  }

  loadLeaveRequests(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.error = 'Nie udało się pobrać danych użytkownika.';
      return;
    }

    this.loading = true;
    this.error = '';

    this.leaveProposalService.getUserLeaveProposals(currentUser.id).subscribe({
      next: (requests) => {
        console.log('Leave requests loaded:', requests);
        this.leaveRequests = requests;
        this.filteredRequests = [...requests];
        this.extractAvailableYears();
        this.applySort();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading leave requests:', error);
        this.error = error.error?.message || 'Nie udało się pobrać wniosków urlopowych.';
        this.loading = false;
      }
    });
  }

  extractAvailableYears(): void {
    const years = new Set<number>();
    this.leaveRequests.forEach(request => {
      const year = new Date(request.startDate).getFullYear();
      years.add(year);
    });
    this.availableYears = Array.from(years).sort((a, b) => b - a);
  }

  applyFilters(): void {
    this.filteredRequests = this.leaveRequests.filter(request => {
      // Status filter
      if (this.filters.status && request.status !== this.filters.status) {
        return false;
      }

      // Leave type filter
      if (this.filters.leaveType && request.leaveType !== this.filters.leaveType) {
        return false;
      }

      // Year filter
      if (this.filters.year) {
        const requestYear = new Date(request.startDate).getFullYear();
        if (requestYear.toString() !== this.filters.year) {
          return false;
        }
      }

      // Search filter
      if (this.filters.search) {
        const searchTerm = this.filters.search.toLowerCase();
        const searchFields = [
          request.title || '',
          request.description || '',
          this.getLeaveTypeLabel(request.leaveType),
          this.getStatusLabel(request.status)
        ].join(' ').toLowerCase();
        
        if (!searchFields.includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });

    this.applySort();
  }

  applySort(): void {
    this.filteredRequests.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortBy) {
        case 'submittedAt':
          aValue = new Date(a.submittedAt);
          bValue = new Date(b.submittedAt);
          break;
        case 'startDate':
          aValue = new Date(a.startDate);
          bValue = new Date(b.startDate);
          break;
        case 'status':
          aValue = this.getStatusLabel(a.status);
          bValue = this.getStatusLabel(b.status);
          break;
        case 'leaveType':
          aValue = this.getLeaveTypeLabel(a.leaveType);
          bValue = this.getLeaveTypeLabel(b.leaveType);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.applySort();
  }

  clearFilters(): void {
    this.filters = {
      status: '',
      leaveType: '',
      year: '',
      search: ''
    };
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(this.filters.status || this.filters.leaveType || this.filters.year || this.filters.search);
  }

  getStatCount(status: string): number {
    return this.leaveRequests.filter(request => request.status === status).length;
  }

  // Helper methods
  getLeaveTypeLabel(type: LeaveType): string {
    return LEAVE_TYPE_LABELS[type] || type;
  }

  getLeaveTypeIcon(type: LeaveType): string {
    const option = this.leaveTypeOptions.find(opt => opt.value === type);
    return option?.icon || '📝';
  }

  getLeaveTypeColor(type: LeaveType): string {
    const option = this.leaveTypeOptions.find(opt => opt.value === type);
    return option?.color || '#64748b';
  }

  getStatusLabel(status: LeaveProposalStatus): string {
    return LEAVE_STATUS_LABELS[status] || status;
  }

  getStatusIcon(status: LeaveProposalStatus): string {
    const option = this.statusOptions.find(opt => opt.value === status);
    return option?.icon || '❓';
  }

  getStatusClass(status: LeaveProposalStatus): string {
    return status.toLowerCase();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pl-PL');
  }

  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL') + ' ' + date.toLocaleTimeString('pl-PL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  trackByRequestId(index: number, request: EmployeeLeaveProposalResponse): number {
    return request.id;
  }

  // Actions
  createNewRequest(): void {
    this.router.navigate(['/leave-requests/create']);
  }

  viewRequest(id: number): void {
    this.router.navigate(['/leave-requests', id]);
  }

  editRequest(id: number): void {
    this.router.navigate(['/leave-requests', id, 'edit']);
  }

  cancelRequest(id: number): void {
    if (confirm('Czy na pewno chcesz anulować ten wniosek urlopowy?')) {
      // Implementacja anulowania wniosku przez odrzucenie z odpowiednim komentarzem
      const request = {
        rejectionReason: 'Wniosek anulowany przez użytkownika',
        approverComments: 'Automatyczne anulowanie wniosku przez właściciela'
      };
      
      this.leaveProposalService.rejectLeaveProposal(id, request).subscribe({
        next: (response) => {
          console.log('Request cancelled successfully:', response);
          // Odśwież listę wniosków
          this.loadLeaveRequests();
        },
        error: (error) => {
          console.error('Error cancelling request:', error);
          this.error = error.error?.message || 'Nie udało się anulować wniosku.';
        }
      });
    }
  }

  canEditRequest(request: EmployeeLeaveProposalResponse): boolean {
    const currentUser = this.authService.getCurrentUser();
  const canEdit = request.status === LeaveProposalStatus.SUBMITTED &&
                   !!currentUser && 
                   currentUser.id === request.userId;
    
    console.log('🔍 Can edit request:', {
      canEdit,
      requestStatus: request.status,
      currentUserId: currentUser?.id,
      requestUserId: request.userId,
  isPending: request.status === LeaveProposalStatus.SUBMITTED
    });
    
    return canEdit;
  }

  canCancelRequest(request: EmployeeLeaveProposalResponse): boolean {
    const currentUser = this.authService.getCurrentUser();
  const canCancel = (request.status === LeaveProposalStatus.SUBMITTED ||
                      request.status === LeaveProposalStatus.APPROVED) &&
                     !!currentUser && 
                     currentUser.id === request.userId;
    
    console.log('🔍 Can cancel request:', {
      canCancel,
      requestStatus: request.status,
      currentUserId: currentUser?.id,
      requestUserId: request.userId,
  isValidStatus: request.status === LeaveProposalStatus.SUBMITTED || request.status === LeaveProposalStatus.APPROVED
    });
    
    return canCancel;
  }
}