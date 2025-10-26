import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LeaveProposalService } from '../../../services/leave-proposal.service';
import { AuthService } from '../../../services/auth.service';
import { EmployeeLeaveProposalResponse, LeaveType } from '../../../models/leave-proposal.models';

interface FilterOptions {
  status: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  searchTerm: string;
}

interface BulkAction {
  proposalIds: number[];
  action: 'approve' | 'reject';
  comment: string;
}

interface ProposalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  draft: number;
}

@Component({
  selector: 'app-hr-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './hr-management.component.html',
  styles: [`
    /* Compact statistics grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .stat-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      flex-shrink: 0;
    }

    .stat-icon i {
      font-size: 18px;
      color: white;
    }

    .stat-icon.total {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    }

    .stat-icon.pending {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }

    .stat-icon.approved {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }

    .stat-icon.rejected {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }

    .stat-content {
      flex: 1;
      min-width: 0;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
      line-height: 1.2;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 13px;
      color: #6b7280;
      font-weight: 500;
      line-height: 1.3;
    }

    /* Page header */
    .page-header {
      margin-bottom: 24px;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 15px;
    }

    .page-title {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .page-title i {
      font-size: 24px;
      color: #3b82f6;
    }

    .header-actions {
      display: flex;
      gap: 10px;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }

    .btn-primary:hover {
      background: #2563eb;
      transform: translateY(-1px);
    }

    .btn-outline {
      background: transparent;
      color: #6b7280;
      border: 1px solid #d1d5db;
    }

    .btn-outline:hover {
      background: #f9fafb;
      color: #374151;
      border-color: #9ca3af;
    }

    .btn i {
      font-size: 14px;
    }

    /* Alert */
    .alert {
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .alert-error {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }

    .alert-close {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      padding: 4px;
      margin-left: auto;
      border-radius: 4px;
      transition: background 0.2s ease;
    }

    .alert-close:hover {
      background: rgba(0, 0, 0, 0.1);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .stat-card {
        padding: 12px;
        gap: 10px;
      }

      .stat-icon {
        width: 36px;
        height: 36px;
      }

      .stat-icon i {
        font-size: 16px;
      }

      .stat-value {
        font-size: 20px;
      }

      .stat-label {
        font-size: 12px;
      }

      .page-title {
        font-size: 20px;
      }

      .header-content {
        flex-direction: column;
        align-items: flex-start;
      }
    }

    @media (max-width: 480px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }

      .stat-card {
        padding: 14px;
      }

      .page-header {
        padding: 16px;
      }
    }

    /* Additional components styles */
    
    /* Filters panel */
    .filters-panel {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 20px;
      overflow: hidden;
      transition: all 0.3s ease;
      max-height: 0;
      opacity: 0;
    }

    .filters-panel.show {
      max-height: 500px;
      opacity: 1;
      padding: 20px;
    }

    .filters-form {
      display: grid;
      gap: 20px;
    }

    .filter-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      align-items: end;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .filter-group label {
      font-size: 13px;
      font-weight: 500;
      color: #374151;
    }

    .form-control {
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.2s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .filter-actions {
      display: flex;
      gap: 10px;
    }

    /* Bulk Actions Bar */
    .bulk-actions-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 6px;
      margin-bottom: 16px;
    }

    .bulk-info {
      font-size: 14px;
      color: #92400e;
      font-weight: 500;
    }

    .bulk-buttons {
      display: flex;
      gap: 8px;
    }

    .btn-success {
      background: #10b981;
      color: white;
    }

    .btn-success:hover {
      background: #059669;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
    }

    .btn-danger:hover {
      background: #dc2626;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    .btn-sm i {
      font-size: 12px;
    }

    /* Table styles */
    .table-container {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }

    .table-header {
      padding: 16px 20px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }

    .table-title {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .proposals-table {
      width: 100%;
      border-collapse: collapse;
    }

    .proposals-table th,
    .proposals-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid #f3f4f6;
      font-size: 14px;
    }

    .proposals-table th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .proposals-table th.sortable {
      cursor: pointer;
      user-select: none;
      transition: background 0.2s ease;
    }

    .proposals-table th.sortable:hover {
      background: #f3f4f6;
    }

    .proposals-table th.sortable i {
      margin-left: 6px;
      font-size: 10px;
      opacity: 0.6;
    }

    .proposals-table tbody tr:hover {
      background: #f9fafb;
    }

    .checkbox-col {
      width: 40px;
    }

    .actions-col {
      width: 140px;
    }

    .employee-cell {
      min-width: 160px;
    }

    .employee-name {
      font-weight: 500;
      color: #1a1a1a;
    }

    .employee-username {
      font-size: 12px;
      color: #6b7280;
      margin-top: 2px;
    }

    .leave-type-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .leave-type-badge[data-type="ANNUAL"] {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .leave-type-badge[data-type="SICK"] {
      background: #fee2e2;
      color: #991b1b;
    }

    .leave-type-badge[data-type="MATERNITY"] {
      background: #fce7f3;
      color: #be185d;
    }

    .period-cell {
      min-width: 120px;
    }

    .date-range {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .date-from, .date-to {
      font-size: 13px;
    }

    .date-separator {
      color: #6b7280;
      font-size: 12px;
      text-align: center;
    }

    .days-count {
      font-weight: 600;
      color: #3b82f6;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .status-badge.status-pending {
      background: #fef3c7;
      color: #92400e;
    }

    .status-badge.status-approved {
      background: #d1fae5;
      color: #065f46;
    }

    .status-badge.status-rejected {
      background: #fee2e2;
      color: #991b1b;
    }

    .submitted-cell {
      min-width: 100px;
    }

    .date-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .date {
      font-size: 13px;
      color: #1a1a1a;
    }

    .time {
      font-size: 11px;
      color: #6b7280;
    }

    .action-buttons {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .quick-actions {
      display: flex;
      gap: 4px;
    }

    .loading-row td,
    .empty-row td {
      text-align: center;
      padding: 40px 20px;
    }

    .loading-spinner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: #6b7280;
    }

    .empty-state {
      color: #6b7280;
    }

    .empty-state i {
      font-size: 32px;
      margin-bottom: 8px;
      display: block;
    }

    /* Responsive table */
    @media (max-width: 768px) {
      .filter-row {
        grid-template-columns: 1fr;
      }

      .bulk-actions-bar {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
      }

      .table-wrapper {
        font-size: 12px;
      }

      .proposals-table th,
      .proposals-table td {
        padding: 8px 10px;
      }

      .action-buttons {
        flex-direction: column;
        gap: 4px;
      }

      .btn-sm {
        padding: 4px 8px;
        font-size: 11px;
      }
    }
  `]
})
export class HrManagementComponent implements OnInit {
  private fb = inject(FormBuilder);
  private leaveProposalService = inject(LeaveProposalService);
  private authService = inject(AuthService);

  // Dane
  proposals: EmployeeLeaveProposalResponse[] = [];
  filteredProposals: EmployeeLeaveProposalResponse[] = [];
  stats: ProposalStats = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    draft: 0
  };

  // Stan UI
  loading = false;
  error: string | null = null;
  showBulkModal = false;
  showFilters = false;
  selectedProposals: Set<number> = new Set();

  // Filtrowanie i sortowanie
  filterForm: FormGroup;
  sortBy: 'startDate' | 'endDate' | 'submittedAt' | 'employeeName' = 'submittedAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Bulk operations
  bulkActionForm: FormGroup;
  bulkActionType: 'approve' | 'reject' = 'approve';

  // Enums do templates
  LeaveType = LeaveType;

  // Opcje filtrów
  statusOptions = [
    { value: '', label: 'Wszystkie statusy' },
    { value: 'PENDING', label: 'Oczekujące' },
    { value: 'APPROVED', label: 'Zatwierdzone' },
    { value: 'REJECTED', label: 'Odrzucone' },
    { value: 'CANCELLED', label: 'Anulowane' }
  ];

  leaveTypeOptions = [
    { value: '', label: 'Wszystkie typy' },
    { value: 'ANNUAL', label: 'Wypoczynkowy' },
    { value: 'SICK', label: 'Chorobowy' },
    { value: 'MATERNITY', label: 'Macierzyński' },
    { value: 'PATERNITY', label: 'Ojcowski' },
    { value: 'PARENTAL', label: 'Rodzicielski' },
    { value: 'UNPAID', label: 'Bezpłatny' },
    { value: 'STUDY', label: 'Szkoleniowy' },
    { value: 'COMPASSIONATE', label: 'Okolicznościowy' },
    { value: 'SABBATICAL', label: 'Sabbatical' },
    { value: 'OTHER', label: 'Inny' }
  ];

  constructor() {
    this.filterForm = this.fb.group({
      status: [''],
      leaveType: [''],
      startDate: [''],
      endDate: [''],
      searchTerm: ['']
    });

    this.bulkActionForm = this.fb.group({
      comment: ['']
    });

    // Apply additional icon styles
    this.addIconStyles();
  }

  ngOnInit(): void {
    this.loadProposals();
    this.setupFilters();
  }

  private setupFilters(): void {
    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  loadProposals(): void {
    this.loading = true;
    this.error = null;

    const filters = this.filterForm.value;
    
    this.leaveProposalService.getCompanyLeaveProposals(
      filters.status || undefined,
      filters.leaveType || undefined,
      filters.startDate || undefined,
      filters.endDate || undefined
    ).subscribe({
      next: (proposals) => {
        this.proposals = proposals;
        this.calculateStats();
        this.applyFilters();
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Błąd podczas ładowania wniosków:', error);
        this.error = error.message || 'Nie udało się załadować wniosków';
        this.loading = false;
      }
    });
  }

  private calculateStats(): void {
    this.stats = {
      total: this.proposals.length,
  pending: this.proposals.filter(p => p.status === 'SUBMITTED').length,
      approved: this.proposals.filter(p => p.status === 'APPROVED').length,
      rejected: this.proposals.filter(p => p.status === 'REJECTED').length,
  draft: this.proposals.filter(p => p.status === 'SUBMITTED').length // Backend nie ma DRAFT, używamy SUBMITTED
    };
  }

  private applyFilters(): void {
    let filtered = [...this.proposals];
    const filters = this.filterForm.value;

    // Filtrowanie po tekście (nazwa użytkownika, tytuł)
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(proposal => 
        proposal.userName.toLowerCase().includes(searchLower) ||
        (proposal.title && proposal.title.toLowerCase().includes(searchLower)) ||
        (proposal.description && proposal.description.toLowerCase().includes(searchLower))
      );
    }

    // Sortowanie
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortBy) {
        case 'startDate':
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          break;
        case 'endDate':
          comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
          break;
        case 'submittedAt':
          comparison = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
          break;
        case 'employeeName':
          comparison = a.userName.localeCompare(b.userName);
          break;
      }

      return this.sortDirection === 'desc' ? -comparison : comparison;
    });

    this.filteredProposals = filtered;
  }

  // Sortowanie
  setSortBy(field: 'startDate' | 'endDate' | 'submittedAt' | 'employeeName'): void {
    if (this.sortBy === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortDirection = 'desc';
    }
    this.applyFilters();
  }

  getSortIcon(field: string): string {
    if (this.sortBy !== field) return 'sort';
    return this.sortDirection === 'asc' ? 'sort-up' : 'sort-down';
  }

  // Selekcja
  toggleSelection(proposalId: number): void {
    if (this.selectedProposals.has(proposalId)) {
      this.selectedProposals.delete(proposalId);
    } else {
      this.selectedProposals.add(proposalId);
    }
  }

  toggleAllSelection(): void {
    if (this.isAllSelected()) {
      this.selectedProposals.clear();
    } else {
      this.filteredProposals.forEach(proposal => {
  if (proposal.status === 'SUBMITTED') {
          this.selectedProposals.add(proposal.id);
        }
      });
    }
  }

  isAllSelected(): boolean {
  const pendingProposals = this.filteredProposals.filter(p => p.status === 'SUBMITTED');
    return pendingProposals.length > 0 && 
           pendingProposals.every(p => this.selectedProposals.has(p.id));
  }

  isIndeterminate(): boolean {
  const pendingProposals = this.filteredProposals.filter(p => p.status === 'SUBMITTED');
    const selectedPending = pendingProposals.filter(p => this.selectedProposals.has(p.id));
    return selectedPending.length > 0 && selectedPending.length < pendingProposals.length;
  }

  // Bulk operations
  openBulkAction(action: 'approve' | 'reject'): void {
    if (this.selectedProposals.size === 0) return;
    
    this.bulkActionType = action;
    this.bulkActionForm.patchValue({ comment: '' });
    this.showBulkModal = true;
  }

  executeBulkAction(): void {
    if (this.selectedProposals.size === 0) return;

    this.loading = true;
    const comment = this.bulkActionForm.get('comment')?.value || '';
    
    const validProposalIds = Array.from(this.selectedProposals).filter(id => id && !isNaN(id));
    
    if (validProposalIds.length === 0) {
      this.error = 'Brak prawidłowych ID wniosków do przetworzenia';
      this.loading = false;
      return;
    }

    const observables = validProposalIds.map(proposalId => {
      if (this.bulkActionType === 'approve') {
        return this.leaveProposalService.approveLeaveProposalSimple(proposalId, comment);
      } else {
        return this.leaveProposalService.rejectLeaveProposalSimple(proposalId, comment);
      }
    });

    // Use forkJoin to execute all observables in parallel
    forkJoin(observables).subscribe({
      next: (results) => {
        this.selectedProposals.clear();
        this.showBulkModal = false;
        this.loadProposals();
      },
      error: (error: any) => {
        console.error('Błąd podczas operacji masowej:', error);
        this.error = error.message || 'Nie udało się wykonać operacji';
        this.loading = false;
      }
    });
  }

  // Pojedyncze akcje
  approveProposal(proposalId: number, comment: string = ''): void {
    if (!proposalId || isNaN(proposalId)) {
      console.error('Invalid proposal ID:', proposalId);
      this.error = 'Nieprawidłowe ID wniosku';
      return;
    }

    this.loading = true;
    
    this.leaveProposalService.approveLeaveProposalSimple(proposalId, comment).subscribe({
      next: (result) => {
        this.loadProposals();
      },
      error: (error: any) => {
        console.error('Błąd podczas zatwierdzania:', error);
        this.error = error.message || 'Nie udało się zatwierdzić wniosku';
        this.loading = false;
      }
    });
  }

  rejectProposal(proposalId: number, reason: string): void {
    if (!proposalId || isNaN(proposalId)) {
      console.error('Invalid proposal ID:', proposalId);
      this.error = 'Nieprawidłowe ID wniosku';
      return;
    }

    this.loading = true;
    
    this.leaveProposalService.rejectLeaveProposalSimple(proposalId, reason).subscribe({
      next: (result) => {
        this.loadProposals();
      },
      error: (error: any) => {
        console.error('Błąd podczas odrzucania:', error);
        this.error = error.message || 'Nie udało się odrzucić wniosku';
        this.loading = false;
      }
    });
  }

  // Helpers
  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'DRAFT': 'status-draft',
      'PENDING': 'status-pending',
      'APPROVED': 'status-approved',
      'REJECTED': 'status-rejected'
    };
    return classes[status] || '';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'PENDING': 'Oczekujące',
      'APPROVED': 'Zatwierdzone',
      'REJECTED': 'Odrzucone',
      'CANCELLED': 'Anulowane'
    };
    return labels[status] || status;
  }

  getLeaveTypeLabel(leaveType: LeaveType): string {
    const labels: { [key in LeaveType]: string } = {
      [LeaveType.ANNUAL]: 'Wypoczynkowy',
      [LeaveType.SICK]: 'Chorobowy',
      [LeaveType.MATERNITY]: 'Macierzyński',
      [LeaveType.PATERNITY]: 'Ojcowski',
      [LeaveType.PARENTAL]: 'Rodzicielski',
      [LeaveType.UNPAID]: 'Bezpłatny',
      [LeaveType.STUDY]: 'Szkoleniowy',
      [LeaveType.COMPASSIONATE]: 'Okolicznościowy',
      [LeaveType.SABBATICAL]: 'Sabbatical',
      [LeaveType.OTHER]: 'Inny'
    };
    return labels[leaveType] || leaveType;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pl-PL');
  }

  calculateDuration(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  closeBulkModal(): void {
    this.showBulkModal = false;
    this.bulkActionForm.reset();
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.loadProposals();
  }

  refreshData(): void {
    this.loadProposals();
  }

  // Additional icon sizing overrides
  private addIconStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .hr-management-component .btn i,
      .hr-management-component .filters-toggle i,
      .hr-management-component .quick-actions .btn i,
      .hr-management-component .bulk-buttons .btn i,
      .hr-management-component .action-buttons .btn i {
        font-size: 13px !important;
        width: 13px;
        height: 13px;
        line-height: 1;
        vertical-align: middle;
      }

      .hr-management-component .btn-sm i {
        font-size: 11px !important;
        width: 11px;
        height: 11px;
      }

      .hr-management-component .stat-card i {
        font-size: 32px !important;
        width: 32px;
        height: 32px;
      }
    `;
    document.head.appendChild(style);
  }
}