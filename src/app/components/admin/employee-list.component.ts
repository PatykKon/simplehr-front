import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { EmployeeService } from '../../services/employee.service';
import { AuthService } from '../../services/auth.service';
import { EmployeeSummaryResponse } from '../../models/employee.models';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="employee-list">
      <div class="header">
        <h1>Lista Pracowników</h1>
        <div class="header-actions">
          <button class="btn-back" (click)="goBack()">← Powrót</button>
          <button class="btn-primary" (click)="addEmployee()">+ Dodaj Pracownika</button>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        <p>Ładowanie pracowników...</p>
      </div>

      <!-- Error -->
      <div *ngIf="error" class="alert alert-error">
        {{ error }}
      </div>

      <!-- Employee List -->
      <div *ngIf="!loading && !error" class="employees-container">
        <div class="employees-stats">
          <div class="stat-card">
            <h3>{{ employees.length }}</h3>
            <p>Łącznie pracowników</p>
          </div>
          <div class="stat-card">
            <h3>{{ getActiveEmployeesCount() }}</h3>
            <p>Aktywnych</p>
          </div>
          <div class="stat-card">
            <h3>{{ getAdminCount() }}</h3>
            <p>Administratorów</p>
          </div>
        </div>

        <div class="employees-table-container">
          <table class="employees-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Imię i Nazwisko</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let employee of employees; trackBy: trackByEmployeeId" 
                  [class.inactive]="!employee.enabled">
                <td>{{ employee.id }}</td>
                <td>
                  <div class="employee-name">
                    <div class="employee-avatar">
                      {{ getInitials(employee) }}
                    </div>
                    <div>
                      <div class="name">{{ getFullName(employee) }}</div>
                      <div class="username">@{{ employee.username }}</div>
                    </div>
                  </div>
                </td>
                <td>{{ employee.username }}</td>
                <td>{{ employee.email || 'Brak' }}</td>
                <td>
                  <div class="roles">
                    <span *ngFor="let role of employee.roles" 
                          class="role-badge" 
                          [class.admin]="role.includes('ADMIN')"
                          [class.hr]="role.includes('HR')"
                          [class.manager]="role.includes('MANAGER')"
                          [class.user]="role.includes('USER')">
                      {{ formatRole(role) }}
                    </span>
                  </div>
                </td>
                <td>
                  <span class="status-badge" 
                        [class.active]="employee.enabled"
                        [class.inactive]="!employee.enabled">
                    {{ employee.enabled ? 'Aktywny' : 'Nieaktywny' }}
                  </span>
                </td>
                <td>
                  <div class="actions">
                    <button class="btn-icon" 
                            (click)="viewEmployee(employee.id)"
                            title="Zobacz szczegóły">
                      👁️
                    </button>
                    <button class="btn-icon" 
                            (click)="editEmployee(employee.id)"
                            title="Edytuj">
                      ✏️
                    </button>
                    <button class="btn-icon danger" 
                            (click)="deleteEmployee(employee.id)"
                            title="Usuń"
                            [disabled]="employee.id === currentUserId">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div *ngIf="employees.length === 0" class="empty-state">
            <div class="empty-icon">👥</div>
            <h3>Brak pracowników</h3>
            <p>Nie znaleziono żadnych pracowników w firmie.</p>
            <button class="btn-primary" (click)="addEmployee()">
              Dodaj pierwszego pracownika
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .employee-list {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .header h1 {
      color: #1f2937;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
    }

    .btn-back, .btn-primary, .btn-icon {
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

    .btn-icon {
      padding: 0.5rem;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      min-width: 36px;
      justify-content: center;
    }

    .btn-icon:hover {
      background: #e5e7eb;
    }

    .btn-icon.danger {
      background: #fef2f2;
      border-color: #fecaca;
      color: #dc2626;
    }

    .btn-icon.danger:hover:not(:disabled) {
      background: #fee2e2;
    }

    .btn-icon:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .loading {
      text-align: center;
      padding: 3rem;
    }

    .spinner {
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
      margin-bottom: 1rem;
    }

    .alert-error {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    .employees-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      text-align: center;
    }

    .stat-card h3 {
      font-size: 2rem;
      color: #2563eb;
      margin: 0 0 0.5rem 0;
    }

    .stat-card p {
      color: #6b7280;
      margin: 0;
    }

    .employees-table-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .employees-table {
      width: 100%;
      border-collapse: collapse;
    }

    .employees-table th {
      background: #f9fafb;
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 1px solid #e5e7eb;
    }

    .employees-table td {
      padding: 1rem;
      border-bottom: 1px solid #f3f4f6;
    }

    .employees-table tr:hover {
      background: #f9fafb;
    }

    .employees-table tr.inactive {
      opacity: 0.6;
    }

    .employee-name {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .employee-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #2563eb;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .name {
      font-weight: 500;
      color: #1f2937;
    }

    .username {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .roles {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    .role-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .role-badge.admin {
      background: #dc2626;
      color: white;
    }

    .role-badge.hr {
      background: #7c3aed;
      color: white;
    }

    .role-badge.manager {
      background: #059669;
      color: white;
    }

    .role-badge.user {
      background: #6b7280;
      color: white;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.875rem;
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

    .actions {
      display: flex;
      gap: 0.5rem;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      color: #1f2937;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: #6b7280;
      margin-bottom: 2rem;
    }

    @media (max-width: 768px) {
      .employee-list {
        padding: 1rem;
      }

      .header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .header-actions {
        justify-content: space-between;
      }

      .employees-stats {
        grid-template-columns: 1fr;
      }

      .employees-table-container {
        overflow-x: auto;
      }

      .employees-table {
        min-width: 800px;
      }
    }
  `]
})
export class EmployeeListComponent implements OnInit {
  employees: EmployeeSummaryResponse[] = [];
  loading = false;
  error = '';
  currentUserId: number | null = null;

  constructor(
    private employeeService: EmployeeService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUser()?.id || null;
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.loading = true;
    this.error = '';

    this.employeeService.getAllEmployees().subscribe({
      next: (employees) => {
        this.employees = employees;
        this.loading = false;
        console.log('Loaded employees:', employees);
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        this.error = error.error?.message || 'Nie udało się pobrać listy pracowników.';
        this.loading = false;
      }
    });
  }

  getActiveEmployeesCount(): number {
    return this.employees.filter(emp => emp.enabled).length;
  }

  getAdminCount(): number {
    return this.employees.filter(emp => 
      emp.roles.some(role => role.includes('ADMIN'))
    ).length;
  }

  getInitials(employee: EmployeeSummaryResponse): string {
    const first = employee.firstName?.charAt(0) || '';
    const last = employee.lastName?.charAt(0) || '';
    return (first + last) || employee.username.charAt(0).toUpperCase();
  }

  getFullName(employee: EmployeeSummaryResponse): string {
    if (employee.firstName && employee.lastName) {
      return `${employee.firstName} ${employee.lastName}`;
    }
    return employee.username;
  }

  formatRole(role: string): string {
    return role.replace('ROLE_', '');
  }

  trackByEmployeeId(index: number, employee: EmployeeSummaryResponse): number {
    return employee.id;
  }

  viewEmployee(employeeId: number): void {
    this.router.navigate(['/admin/employees', employeeId]);
  }

  editEmployee(employeeId: number): void {
    this.router.navigate(['/admin/employees/edit', employeeId]);
  }

  deleteEmployee(employeeId: number): void {
    if (employeeId === this.currentUserId) {
      alert('Nie możesz usunąć swojego własnego konta.');
      return;
    }

    if (confirm('Czy na pewno chcesz usunąć tego pracownika? Ta operacja jest nieodwracalna.')) {
      // TODO: Zaimplementuj usuwanie pracownika gdy backend API będzie gotowe
      console.log('Delete employee:', employeeId);
      alert('Funkcja usuwania będzie dostępna w następnej wersji.');
    }
  }

  addEmployee(): void {
    this.router.navigate(['/admin/employees/add']);
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}