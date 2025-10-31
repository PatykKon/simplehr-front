import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EmployeeService } from '../../services/employee.service';
import { EmployeeDetailsResponse, Role } from '../../models/employee.models';

@Component({
  selector: 'app-employee-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="employee-details">
      <div class="header">
        <button class="btn-back" (click)="goBack()">← Powrót do listy</button>
        <div class="header-actions">
          <button class="btn-secondary" (click)="editEmployee()" *ngIf="employee">
            ✏️ Edytuj dane
          </button>
          <button class="btn-primary" (click)="manageLeaveBalances()" *ngIf="employee">
            🏖️ Zarządzaj urlopami
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading">
        <div class="loading-spinner"></div>
        <p>Ładowanie danych pracownika...</p>
      </div>

      <!-- Error -->
      <div *ngIf="error" class="alert alert-error">
        <strong>❌ Błąd:</strong><br>
        {{ error }}
      </div>

      <!-- Employee Details -->
      <div *ngIf="employee && !loading" class="employee-content">
        
        <!-- Basic Info Card -->
        <div class="info-card">
          <div class="card-header">
            <h2>👤 Informacje podstawowe</h2>
          </div>
          <div class="card-content">
            <div class="info-grid">
              <div class="info-item">
                <label>ID Pracownika:</label>
                <span class="value">{{ employee.id }}</span>
              </div>
              <div class="info-item">
                <label>Nazwa użytkownika:</label>
                <span class="value">{{ employee.username }}</span>
              </div>
              <div class="info-item">
                <label>Imię i nazwisko:</label>
                <span class="value">{{ employee.firstName }} {{ employee.lastName }}</span>
              </div>
              <div class="info-item">
                <label>Email:</label>
                <span class="value">{{ employee.email }}</span>
              </div>
              <div class="info-item">
                <label>Role:</label>
                <div class="roles">
                  <span *ngFor="let role of employee.roles" class="role-badge" [class]="getRoleClass(role)">
                    {{ formatRole(role) }}
                  </span>
                </div>
              </div>
              <div class="info-item">
                <label>Status konta:</label>
                <span class="status-badge" [class.active]="employee.enabled" [class.inactive]="!employee.enabled">
                  {{ employee.enabled ? 'Aktywne' : 'Nieaktywne' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Leave Balances Card -->
        <div class="info-card">
          <div class="card-header">
            <h2>🏖️ Salda urlopowe</h2>
            <button class="btn-edit" (click)="manageLeaveBalances()">Edytuj</button>
          </div>
          <div class="card-content">
            <div *ngIf="employee.leaveBalances && employee.leaveBalances.length > 0; else noBalances">
              <div class="balances-grid">
                <div *ngFor="let balance of employee.leaveBalances" class="balance-card">
                  <div class="balance-header">
                    <h3>{{ formatLeaveType(balance.leaveType) }}</h3>
                    <span class="balance-year">{{ balance.year }}</span>
                  </div>
                  <div class="balance-stats">
                    <div class="stat">
                      <div class="stat-number">{{ balance.allocatedDays }}</div>
                      <div class="stat-label">Przydzielone</div>
                    </div>
                    <div class="stat">
                      <div class="stat-number">{{ balance.usedDays }}</div>
                      <div class="stat-label">Wykorzystane</div>
                    </div>
                    <div class="stat">
                      <div class="stat-number remaining">{{ balance.remainingDays }}</div>
                      <div class="stat-label">Pozostałe</div>
                    </div>
                  </div>
                  <div class="balance-progress">
                    <div class="progress-bar">
                      <div class="progress-fill" 
                           [style.width.%]="getUsagePercentage(balance.usedDays, balance.allocatedDays)">
                      </div>
                    </div>
                    <span class="progress-text">
                      {{ getUsagePercentage(balance.usedDays, balance.allocatedDays) }}% wykorzystane
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <ng-template #noBalances>
              <div class="no-data">
                <p>Brak skonfigurowanych sald urlopowych</p>
                <button class="btn-primary" (click)="manageLeaveBalances()">
                  Dodaj salda urlopowe
                </button>
              </div>
            </ng-template>
          </div>
        </div>

        <!-- Leave Proposals Card -->
        <div class="info-card">
          <div class="card-header">
            <h2>📋 Historia wniosków urlopowych</h2>
            <div class="card-filters">
              <select [(ngModel)]="selectedStatus" (change)="filterProposals()" class="filter-select">
                <option value="">Wszystkie statusy</option>
                <option value="PENDING">Oczekujące</option>
                <option value="APPROVED">Zatwierdzone</option>
                <option value="REJECTED">Odrzucone</option>
              </select>
              <select [(ngModel)]="selectedLeaveType" (change)="filterProposals()" class="filter-select">
                <option value="">Wszystkie typy</option>
                <option value="ANNUAL">Urlop wypoczynkowy</option>
                <option value="SICK">Zwolnienie lekarskie</option>
                <option value="PERSONAL">Urlop osobisty</option>
              </select>
            </div>
          </div>
          <div class="card-content">
            <div *ngIf="filteredProposals && filteredProposals.length > 0; else noProposals">
              <div class="proposals-table">
                <div class="table-header">
                  <div class="col-type">Typ</div>
                  <div class="col-dates">Okres</div>
                  <div class="col-days">Dni</div>
                  <div class="col-status">Status</div>
                  <div class="col-submitted">Złożono</div>
                  <div class="col-processed">Rozpatrzono</div>
                </div>
                <div *ngFor="let proposal of filteredProposals" class="table-row">
                  <div class="col-type">
                    <span class="leave-type-badge" [class]="getLeaveTypeClass(proposal.leaveType)">
                      {{ formatLeaveType(proposal.leaveType) }}
                    </span>
                  </div>
                  <div class="col-dates">
                    <div class="date-range">
                      {{ formatDate(proposal.startDate) }} - {{ formatDate(proposal.endDate) }}
                    </div>
                  </div>
                  <div class="col-days">
                    <span class="days-count">{{ proposal.requestedDays }}</span>
                  </div>
                  <div class="col-status">
                    <span class="status-badge" [class]="getStatusClass(proposal.status)">
                      {{ formatStatus(proposal.status) }}
                    </span>
                  </div>
                  <div class="col-submitted">
                    <div class="date-info">
                      {{ formatDate(proposal.submittedAt) }}
                    </div>
                  </div>
                  <div class="col-processed">
                    <div class="date-info" *ngIf="proposal.processedAt">
                      {{ formatDate(proposal.processedAt) }}
                      <div class="processed-by" *ngIf="proposal.processedByUserName">
                        przez {{ proposal.processedByUserName }}
                      </div>
                    </div>
                    <span *ngIf="!proposal.processedAt" class="pending-text">-</span>
                  </div>
                </div>
              </div>
            </div>
            <ng-template #noProposals>
              <div class="no-data">
                <p>Brak wniosków urlopowych</p>
              </div>
            </ng-template>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .employee-details {
      padding: 2rem;
      max-width: var(--page-max-width, 1200px);
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
    }

    .btn-back, .btn-primary, .btn-secondary, .btn-edit {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-back {
      background: #6b7280;
      color: white;
    }

    .btn-back:hover {
      background: #4b5563;
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

    .btn-edit {
      background: #059669;
      color: white;
      font-size: 0.875rem;
      padding: 0.25rem 0.75rem;
    }

    .btn-edit:hover {
      background: #047857;
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

    .employee-content {
      display: grid;
      gap: 2rem;
    }

    .info-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .card-header {
      background: #f8fafc;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-header h2 {
      color: #1f2937;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .card-content {
      padding: 2rem;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .info-item label {
      font-weight: 500;
      color: #6b7280;
      font-size: 0.875rem;
    }

    .info-item .value {
      color: #1f2937;
      font-weight: 500;
    }

    .roles {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .role-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .role-badge.admin {
      background: #fef3c7;
      color: #92400e;
    }

    .role-badge.hr {
      background: #dbeafe;
      color: #1e40af;
    }

    .role-badge.manager {
      background: #d1fae5;
      color: #065f46;
    }

    .role-badge.user {
      background: #f3f4f6;
      color: #374151;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-badge.active {
      background: #d1fae5;
      color: #065f46;
    }

    .status-badge.inactive {
      background: #fee2e2;
      color: #991b1b;
    }

    .balances-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .balance-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.5rem;
      background: #fafafa;
    }

    .balance-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .balance-header h3 {
      color: #1f2937;
      margin: 0;
    }

    .balance-year {
      background: #2563eb;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .balance-stats {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .stat {
      text-align: center;
    }

    .stat-number {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
    }

    .stat-number.remaining {
      color: #059669;
    }

    .stat-label {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.25rem;
    }

    .balance-progress {
      margin-top: 1rem;
    }

    .progress-bar {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #059669);
      transition: width 0.3s ease;
    }

    .progress-text {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .card-filters {
      display: flex;
      gap: 1rem;
    }

    .filter-select {
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .proposals-table {
      overflow-x: auto;
    }

    .table-header, .table-row {
      display: grid;
      grid-template-columns: 120px 180px 60px 100px 120px 150px;
      gap: 1rem;
      padding: 0.75rem;
      align-items: center;
    }

    .table-header {
      background: #f8fafc;
      border-radius: 6px;
      font-weight: 600;
      color: #374151;
      font-size: 0.875rem;
    }

    .table-row {
      border-bottom: 1px solid #f3f4f6;
    }

    .table-row:hover {
      background: #f9fafb;
    }

    .leave-type-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .leave-type-badge.annual {
      background: #dbeafe;
      color: #1e40af;
    }

    .leave-type-badge.sick {
      background: #fee2e2;
      color: #991b1b;
    }

    .leave-type-badge.personal {
      background: #f3e8ff;
      color: #7c2d12;
    }

    .date-range, .date-info {
      font-size: 0.875rem;
      color: #374151;
    }

    .days-count {
      font-weight: 600;
      color: #1f2937;
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

    .processed-by {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.25rem;
    }

    .pending-text {
      color: #9ca3af;
      font-style: italic;
    }

    .no-data {
      text-align: center;
      padding: 2rem;
      color: #6b7280;
    }

    @media (max-width: 768px) {
      .employee-details {
        padding: 1rem;
      }

      .header {
        flex-direction: column;
        gap: 1rem;
      }

      .header-actions {
        width: 100%;
        justify-content: center;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .balances-grid {
        grid-template-columns: 1fr;
      }

      .balance-stats {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }

      .card-filters {
        flex-direction: column;
        width: 100%;
      }

      .table-header, .table-row {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }

      .table-header {
        display: none;
      }

      .table-row {
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        margin-bottom: 1rem;
        padding: 1rem;
      }
    }
  `]
})
export class EmployeeDetailsComponent implements OnInit {
  employee: EmployeeDetailsResponse | null = null;
  loading = true;
  error = '';
  employeeId!: number;
  
  selectedStatus = '';
  selectedLeaveType = '';
  filteredProposals: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private employeeService: EmployeeService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const idParam = params['id'];
      this.employeeId = +idParam;
      
      // Walidacja parametru ID
      if (!idParam || isNaN(this.employeeId) || this.employeeId <= 0) {
        console.error('Invalid employee ID parameter:', idParam);
        this.error = 'Nieprawidłowe ID pracownika';
        this.router.navigate(['/admin/employees']);
        return;
      }
      
      this.loadEmployeeDetails();
    });
  }

  loadEmployeeDetails(): void {
    this.loading = true;
    this.error = '';

    this.employeeService.getEmployeeDetails(this.employeeId).subscribe({
      next: (employee) => {
        console.log('Employee details loaded:', employee);
        this.employee = employee;
        this.filteredProposals = employee.leaveProposals || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading employee details:', error);
        this.error = error.error?.message || 'Nie udało się pobrać danych pracownika.';
        this.loading = false;
      }
    });
  }

  filterProposals(): void {
    if (!this.employee?.leaveProposals) return;

    this.filteredProposals = this.employee.leaveProposals.filter(proposal => {
      const statusMatch = !this.selectedStatus || proposal.status === this.selectedStatus;
      const typeMatch = !this.selectedLeaveType || proposal.leaveType === this.selectedLeaveType;
      return statusMatch && typeMatch;
    });
  }

  getRoleClass(role: string): string {
    const roleMap: { [key: string]: string } = {
      'ROLE_ADMIN': 'admin',
      'ROLE_HR': 'hr', 
      'ROLE_MANAGER': 'manager',
      'ROLE_USER': 'user'
    };
    return roleMap[role] || 'user';
  }

  formatRole(role: string): string {
    const roleMap: { [key: string]: string } = {
      'ROLE_ADMIN': 'Administrator',
      'ROLE_HR': 'HR',
      'ROLE_MANAGER': 'Manager',
      'ROLE_USER': 'Pracownik'
    };
    return roleMap[role] || role.replace('ROLE_', '');
  }

  formatLeaveType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'ANNUAL': 'Urlop wypoczynkowy',
      'SICK': 'Zwolnienie lekarskie',
      'PERSONAL': 'Urlop osobisty'
    };
    return typeMap[type] || type;
  }

  getLeaveTypeClass(type: string): string {
    const classMap: { [key: string]: string } = {
      'ANNUAL': 'annual',
      'SICK': 'sick',
      'PERSONAL': 'personal'
    };
    return classMap[type] || 'annual';
  }

  formatStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'PENDING': 'Oczekujący',
      'APPROVED': 'Zatwierdzony',
      'REJECTED': 'Odrzucony'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'PENDING': 'pending',
      'APPROVED': 'approved',
      'REJECTED': 'rejected'
    };
    return classMap[status] || 'pending';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL');
  }

  getUsagePercentage(used: number, allocated: number): number {
    if (allocated === 0) return 0;
    return Math.round((used / allocated) * 100);
  }

  editEmployee(): void {
    this.router.navigate(['/admin/employees/edit', this.employeeId]);
  }

  manageLeaveBalances(): void {
    this.router.navigate(['/admin/employees', this.employeeId, 'leave-balances']);
  }

  goBack(): void {
    this.router.navigate(['/admin/employees/list']);
  }
}