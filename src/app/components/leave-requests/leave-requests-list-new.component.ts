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
    <div class="leave-requests-list">
      <div class="header">
        <div class="header-info">
          <h1>📋 Moje wnioski urlopowe</h1>
          <p>Zarządzaj swoimi wnioskami urlopowymi</p>
        </div>
        <button class="btn-primary" (click)="createNewRequest()">
          ➕ Nowy wniosek urlopowy
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="stats-cards">
        <div class="stat-card pending">
          <div class="stat-icon">⏳</div>
          <div class="stat-content">
            <div class="stat-number">{{ getStatCount('PENDING') }}</div>
            <div class="stat-label">Oczekujące</div>
          </div>
        </div>
        <div class="stat-card approved">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <div class="stat-number">{{ getStatCount('APPROVED') }}</div>
            <div class="stat-label">Zatwierdzone</div>
          </div>
        </div>
        <div class="stat-card rejected">
          <div class="stat-icon">❌</div>
          <div class="stat-content">
            <div class="stat-number">{{ getStatCount('REJECTED') }}</div>
            <div class="stat-label">Odrzucone</div>
          </div>
        </div>
        <div class="stat-card total">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-number">{{ leaveRequests.length }}</div>
            <div class="stat-label">Łącznie</div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filters-header">
          <h2>🔍 Filtry</h2>
          <button class="btn-clear" (click)="clearFilters()" *ngIf="hasActiveFilters()">
            🗑️ Wyczyść filtry
          </button>
        </div>
        <div class="filters-grid">
          <div class="filter-group">
            <label>Status:</label>
            <select [(ngModel)]="filters.status" (change)="applyFilters()" class="filter-select">
              <option value="">Wszystkie statusy</option>
              <option *ngFor="let option of statusOptions" [value]="option.value">
                {{ option.icon }} {{ option.label }}
              </option>
            </select>
          </div>
          <div class="filter-group">
            <label>Typ urlopu:</label>
            <select [(ngModel)]="filters.leaveType" (change)="applyFilters()" class="filter-select">
              <option value="">Wszystkie typy</option>
              <option *ngFor="let option of leaveTypeOptions" [value]="option.value">
                {{ option.icon }} {{ option.label }}
              </option>
            </select>
          </div>
          <div class="filter-group">
            <label>Rok:</label>
            <select [(ngModel)]="filters.year" (change)="applyFilters()" class="filter-select">
              <option value="">Wszystkie lata</option>
              <option *ngFor="let year of availableYears" [value]="year">
                {{ year }}
              </option>
            </select>
          </div>
          <div class="filter-group">
            <label>Szukaj:</label>
            <input 
              type="text" 
              [(ngModel)]="filters.search" 
              (input)="applyFilters()"
              placeholder="Tytuł lub opis..."
              class="filter-input">
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading">
        <div class="loading-spinner"></div>
        <p>Ładowanie wniosków urlopowych...</p>
      </div>

      <!-- Error -->
      <div *ngIf="error" class="alert alert-error">
        <strong>❌ Błąd:</strong><br>
        {{ error }}
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && filteredRequests.length === 0 && !error" class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>{{ leaveRequests.length === 0 ? 'Brak wniosków urlopowych' : 'Brak wyników' }}</h3>
        <p>
          {{ leaveRequests.length === 0 
            ? 'Nie masz jeszcze żadnych wniosków urlopowych. Złóż pierwszy wniosek!' 
            : 'Żaden wniosek nie spełnia kryteriów wyszukiwania.' }}
        </p>
        <button class="btn-primary" (click)="createNewRequest()" *ngIf="leaveRequests.length === 0">
          ➕ Złóż pierwszy wniosek
        </button>
        <button class="btn-secondary" (click)="clearFilters()" *ngIf="leaveRequests.length > 0">
          🗑️ Wyczyść filtry
        </button>
      </div>

      <!-- Requests List -->
      <div *ngIf="!loading && filteredRequests.length > 0" class="requests-list">
        <div class="list-header">
          <h2>📋 Twoje wnioski ({{ filteredRequests.length }})</h2>
          <div class="sort-options">
            <label>Sortuj:</label>
            <select [(ngModel)]="sortBy" (change)="applySort()" class="sort-select">
              <option value="submittedAt">Data złożenia</option>
              <option value="startDate">Data rozpoczęcia</option>
              <option value="status">Status</option>
              <option value="leaveType">Typ urlopu</option>
            </select>
            <button class="btn-sort" (click)="toggleSortOrder()">
              {{ sortOrder === 'asc' ? '⬆️' : '⬇️' }}
            </button>
          </div>
        </div>

        <div class="requests-grid">
          <div *ngFor="let request of filteredRequests; trackBy: trackByRequestId" class="request-card">
            
            <!-- Card Header -->
            <div class="request-header">
              <div class="request-title">
                <h3>{{ request.title || getLeaveTypeLabel(request.leaveType) }}</h3>
                <span class="request-id">#{{ request.id }}</span>
              </div>
              <div class="request-status">
                <span class="status-badge" [class]="getStatusClass(request.status)">
                  {{ getStatusIcon(request.status) }} {{ getStatusLabel(request.status) }}
                </span>
              </div>
            </div>

            <!-- Card Content -->
            <div class="request-content">
              <div class="request-details">
                <div class="detail-item">
                  <span class="detail-label">Typ:</span>
                  <span class="detail-value leave-type" [style.color]="getLeaveTypeColor(request.leaveType)">
                    {{ getLeaveTypeIcon(request.leaveType) }} {{ getLeaveTypeLabel(request.leaveType) }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Okres:</span>
                  <span class="detail-value">
                    {{ formatDate(request.startDate) }} - {{ formatDate(request.endDate) }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Liczba dni:</span>
                  <span class="detail-value days-count">{{ request.requestedDays }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Złożono:</span>
                  <span class="detail-value">{{ formatDateTime(request.submittedAt) }}</span>
                </div>
                <div class="detail-item" *ngIf="request.processedAt">
                  <span class="detail-label">Rozpatrzono:</span>
                  <span class="detail-value">
                    {{ formatDateTime(request.processedAt) }}
                    <span *ngIf="request.processedByUserName" class="processed-by">
                      przez {{ request.processedByUserName }}
                    </span>
                  </span>
                </div>
              </div>

              <!-- Description -->
              <div class="request-description" *ngIf="request.description">
                <p>{{ request.description }}</p>
              </div>

              <!-- Handover Notes -->
              <div class="handover-notes" *ngIf="request.handoverNotes">
                <strong>Przekazanie obowiązków:</strong>
                <p>{{ request.handoverNotes }}</p>
              </div>

              <!-- Substitute -->
              <div class="substitute-info" *ngIf="request.substituteUserName">
                <strong>Osoba zastępująca:</strong>
                <span>{{ request.substituteUserName }}</span>
              </div>

              <!-- Rejection Reason -->
              <div class="rejection-reason" *ngIf="request.rejectionReason">
                <strong>Powód odrzucenia:</strong>
                <p>{{ request.rejectionReason }}</p>
              </div>

              <!-- Approver Comments -->
              <div class="approver-comments" *ngIf="request.approverComments">
                <strong>Komentarz przełożonego:</strong>
                <p>{{ request.approverComments }}</p>
              </div>
            </div>

            <!-- Card Actions -->
            <div class="request-actions">
              <button class="btn-view" (click)="viewRequest(request.id)" title="Zobacz szczegóły">
                👁️ Szczegóły
              </button>
              <button 
                class="btn-edit" 
                (click)="editRequest(request.id)" 
                [disabled]="!canEditRequest(request)"
                title="Edytuj wniosek">
                ✏️ Edytuj
              </button>
              <button 
                class="btn-cancel" 
                (click)="cancelRequest(request.id)" 
                [disabled]="!canCancelRequest(request)"
                title="Anuluj wniosek">
                🚫 Anuluj
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .leave-requests-list {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
    }

    .header-info h1 {
      color: #1f2937;
      margin: 0 0 0.5rem 0;
    }

    .header-info p {
      color: #6b7280;
      margin: 0;
    }

    .btn-primary, .btn-secondary, .btn-clear, .btn-view, .btn-edit, .btn-cancel, .btn-sort {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .btn-primary {
      background: #2563eb;
      color: white;
    }

    .btn-primary:hover {
      background: #1d4ed8;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    .btn-clear {
      background: #ef4444;
      color: white;
      font-size: 0.75rem;
      padding: 0.25rem 0.75rem;
    }

    .btn-clear:hover {
      background: #dc2626;
    }

    .btn-view {
      background: #3b82f6;
      color: white;
    }

    .btn-view:hover {
      background: #2563eb;
    }

    .btn-edit {
      background: #059669;
      color: white;
    }

    .btn-edit:hover:not(:disabled) {
      background: #047857;
    }

    .btn-edit:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .btn-cancel {
      background: #dc2626;
      color: white;
    }

    .btn-cancel:hover:not(:disabled) {
      background: #b91c1c;
    }

    .btn-cancel:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .btn-sort {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
      padding: 0.25rem 0.5rem;
    }

    .btn-sort:hover {
      background: #e5e7eb;
    }

    .stats-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .stat-card.pending {
      border-left: 4px solid #f59e0b;
    }

    .stat-card.approved {
      border-left: 4px solid #10b981;
    }

    .stat-card.rejected {
      border-left: 4px solid #ef4444;
    }

    .stat-card.total {
      border-left: 4px solid #6366f1;
    }

    .stat-icon {
      font-size: 2rem;
    }

    .stat-number {
      font-size: 2rem;
      font-weight: 700;
      color: #1f2937;
    }

    .stat-label {
      color: #6b7280;
      font-size: 0.875rem;
    }

    .filters-section {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .filters-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .filters-header h2 {
      color: #1f2937;
      margin: 0;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .filter-group label {
      font-weight: 500;
      color: #374151;
      font-size: 0.875rem;
    }

    .filter-select, .filter-input, .sort-select {
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .filter-select:focus, .filter-input:focus, .sort-select:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .loading {
      text-align: center;
      padding: 3rem;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f4f6;
      border-top: 4px solid #2563eb;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .alert {
      padding: 1rem;
      border-radius: 6px;
      margin-bottom: 2rem;
    }

    .alert-error {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      color: #1f2937;
      margin-bottom: 1rem;
    }

    .empty-state p {
      color: #6b7280;
      margin-bottom: 2rem;
    }

    .requests-list {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .list-header {
      background: #f8fafc;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .list-header h2 {
      color: #1f2937;
      margin: 0;
    }

    .sort-options {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .sort-options label {
      font-weight: 500;
      color: #374151;
      font-size: 0.875rem;
    }

    .requests-grid {
      padding: 1.5rem;
      display: grid;
      gap: 1.5rem;
    }

    .request-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      transition: box-shadow 0.2s;
    }

    .request-card:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .request-header {
      background: #f8fafc;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .request-title h3 {
      color: #1f2937;
      margin: 0 0 0.25rem 0;
      font-size: 1.125rem;
    }

    .request-id {
      color: #6b7280;
      font-size: 0.875rem;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
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

    .request-content {
      padding: 1.5rem;
    }

    .request-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .detail-label {
      font-size: 0.75rem;
      color: #6b7280;
      font-weight: 500;
      text-transform: uppercase;
    }

    .detail-value {
      color: #1f2937;
      font-weight: 500;
    }

    .leave-type {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .days-count {
      font-size: 1.125rem;
      font-weight: 700;
      color: #2563eb;
    }

    .processed-by {
      display: block;
      font-size: 0.75rem;
      color: #6b7280;
      font-weight: 400;
    }

    .request-description, .handover-notes, .substitute-info, .rejection-reason, .approver-comments {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #f3f4f6;
    }

    .request-description p, .handover-notes p, .rejection-reason p, .approver-comments p {
      color: #374151;
      margin: 0.5rem 0 0 0;
      line-height: 1.5;
    }

    .substitute-info span {
      color: #059669;
      font-weight: 500;
    }

    .rejection-reason {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      padding: 1rem;
      margin: 1rem -1.5rem -1.5rem -1.5rem;
    }

    .rejection-reason strong {
      color: #dc2626;
    }

    .request-actions {
      background: #f8fafc;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    @media (max-width: 768px) {
      .leave-requests-list {
        padding: 1rem;
      }

      .header {
        flex-direction: column;
        gap: 1rem;
      }

      .stats-cards {
        grid-template-columns: repeat(2, 1fr);
      }

      .filters-grid {
        grid-template-columns: 1fr;
      }

      .list-header {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }

      .request-details {
        grid-template-columns: 1fr;
      }

      .request-actions {
        flex-direction: column;
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
      // TODO: Implementacja anulowania wniosku
      console.log('Cancelling request:', id);
    }
  }

  canEditRequest(request: EmployeeLeaveProposalResponse): boolean {
    return request.status === LeaveProposalStatus.SUBMITTED;
  }

  canCancelRequest(request: EmployeeLeaveProposalResponse): boolean {
    return request.status === LeaveProposalStatus.SUBMITTED || request.status === LeaveProposalStatus.APPROVED;
  }
}