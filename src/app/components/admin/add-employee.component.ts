import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { EmployeeService } from '../../services/employee.service';
import { AuthService } from '../../services/auth.service';
import { AddEmployeeRequest, LeaveType, Role } from '../../models/employee.models';

@Component({
  selector: 'app-add-employee',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="add-employee">
      <div class="header">
        <h1>Dodaj Nowego Pracownika</h1>
        <button class="btn-back" (click)="goBack()">← Powrót</button>
      </div>

      <form [formGroup]="employeeForm" (ngSubmit)="onSubmit()" class="employee-form">
        <!-- Dane osobowe -->
        <div class="form-section">
          <h2>Dane Osobowe</h2>
          
          <div class="form-row">
            <div class="form-group">
              <label for="firstName">Imię *</label>
              <input 
                id="firstName" 
                type="text" 
                formControlName="firstName" 
                class="form-control"
                [class.error]="employeeForm.get('firstName')?.invalid && employeeForm.get('firstName')?.touched">
              <div class="error-message" *ngIf="employeeForm.get('firstName')?.invalid && employeeForm.get('firstName')?.touched">
                Imię jest wymagane
              </div>
            </div>

            <div class="form-group">
              <label for="lastName">Nazwisko *</label>
              <input 
                id="lastName" 
                type="text" 
                formControlName="lastName" 
                class="form-control"
                [class.error]="employeeForm.get('lastName')?.invalid && employeeForm.get('lastName')?.touched">
              <div class="error-message" *ngIf="employeeForm.get('lastName')?.invalid && employeeForm.get('lastName')?.touched">
                Nazwisko jest wymagane
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="username">Nazwa użytkownika *</label>
              <input 
                id="username" 
                type="text" 
                formControlName="username" 
                class="form-control"
                [class.error]="employeeForm.get('username')?.invalid && employeeForm.get('username')?.touched">
              <div class="error-message" *ngIf="employeeForm.get('username')?.invalid && employeeForm.get('username')?.touched">
                <span *ngIf="employeeForm.get('username')?.errors?.['required']">Nazwa użytkownika jest wymagana</span>
                <span *ngIf="employeeForm.get('username')?.errors?.['minlength']">Nazwa użytkownika musi mieć co najmniej 3 znaki</span>
              </div>
            </div>

            <div class="form-group">
              <label for="email">Email *</label>
              <input 
                id="email" 
                type="email" 
                formControlName="email" 
                class="form-control"
                [class.error]="employeeForm.get('email')?.invalid && employeeForm.get('email')?.touched">
              <div class="error-message" *ngIf="employeeForm.get('email')?.invalid && employeeForm.get('email')?.touched">
                <span *ngIf="employeeForm.get('email')?.errors?.['required']">Email jest wymagany</span>
                <span *ngIf="employeeForm.get('email')?.errors?.['email']">Email musi być prawidłowy</span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="password">Hasło *</label>
            <input 
              id="password" 
              type="password" 
              formControlName="password" 
              class="form-control"
              [class.error]="employeeForm.get('password')?.invalid && employeeForm.get('password')?.touched">
            <div class="error-message" *ngIf="employeeForm.get('password')?.invalid && employeeForm.get('password')?.touched">
              <span *ngIf="employeeForm.get('password')?.errors?.['required']">Hasło jest wymagane</span>
              <span *ngIf="employeeForm.get('password')?.errors?.['minlength']">Hasło musi mieć co najmniej 8 znaków</span>
            </div>
          </div>
        </div>

        <!-- Role -->
        <div class="form-section">
          <h2>Role</h2>
          <div class="roles-grid">
            <div *ngFor="let role of availableRoles" class="role-checkbox">
              <label>
                <input 
                  type="checkbox" 
                  [value]="role" 
                  (change)="onRoleChange(role, $event)">
                <span class="checkmark"></span>
                {{ getRoleDisplayName(role) }}
              </label>
            </div>
          </div>
        </div>

        <!-- Salda urlopowe -->
        <div class="form-section">
          <h2>Salda Urlopowe</h2>
          <div class="leave-balances">
            <div *ngFor="let leaveType of availableLeaveTypes" class="leave-balance-row">
              <div class="leave-type-label">
                {{ getLeaveTypeDisplayName(leaveType) }}
              </div>
              <div class="leave-inputs">
                <div class="form-group">
                  <label>Przydzielone dni</label>
                  <input 
                    type="number" 
                    min="0" 
                    [value]="getLeaveBalance(leaveType).allocatedDays || 0"
                    (input)="updateLeaveBalance(leaveType, 'allocatedDays', $event)"
                    class="form-control small">
                </div>
                <div class="form-group">
                  <label>Wykorzystane dni</label>
                  <input 
                    type="number" 
                    min="0" 
                    [value]="getLeaveBalance(leaveType).usedDays || 0"
                    (input)="updateLeaveBalance(leaveType, 'usedDays', $event)"
                    class="form-control small">
                </div>
                <div class="remaining-days">
                  Pozostało: {{ getRemainingDays(leaveType) }} dni
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Przyciski -->
        <div class="form-actions">
          <button type="button" class="btn-secondary" (click)="goBack()">Anuluj</button>
          <button 
            type="submit" 
            class="btn-primary" 
            [disabled]="employeeForm.invalid || submitting">
            <span *ngIf="submitting">Dodawanie...</span>
            <span *ngIf="!submitting">Dodaj Pracownika</span>
          </button>
        </div>
      </form>

      <!-- Komunikaty -->
      <div *ngIf="error" class="alert alert-error">
        {{ error }}
      </div>

      <div *ngIf="success" class="alert alert-success">
        {{ success }}
      </div>
    </div>
  `,
  styles: [`
    .add-employee {
      padding: 2rem;
      max-width: 800px;
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

    .btn-back {
      background: #6b7280;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      text-decoration: none;
    }

    .btn-back:hover {
      background: #4b5563;
    }

    .employee-form {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .form-section {
      padding: 2rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .form-section:last-child {
      border-bottom: none;
    }

    .form-section h2 {
      color: #1f2937;
      font-size: 1.25rem;
      margin-bottom: 1.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #2563eb;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      font-weight: 500;
      color: #374151;
      margin-bottom: 0.5rem;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 1rem;
    }

    .form-control:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .form-control.error {
      border-color: #dc2626;
    }

    .form-control.small {
      width: 100px;
    }

    .error-message {
      color: #dc2626;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .roles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }

    .role-checkbox label {
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 6px;
      transition: background-color 0.2s;
    }

    .role-checkbox label:hover {
      background: #f3f4f6;
    }

    .role-checkbox input[type="checkbox"] {
      margin-right: 0.5rem;
    }

    .leave-balances {
      space-y: 1rem;
    }

    .leave-balance-row {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 1rem;
      align-items: center;
      padding: 1rem;
      background: #f9fafb;
      border-radius: 6px;
      margin-bottom: 1rem;
    }

    .leave-type-label {
      font-weight: 500;
      color: #374151;
    }

    .leave-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: 1rem;
      align-items: end;
    }

    .remaining-days {
      font-weight: 500;
      color: #059669;
      white-space: nowrap;
    }

    .form-actions {
      padding: 2rem;
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      background: #f9fafb;
    }

    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: #2563eb;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .btn-primary:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #6b7280;
      color: white;
    }

    .btn-secondary:hover {
      background: #4b5563;
    }

    .alert {
      margin-top: 1rem;
      padding: 1rem;
      border-radius: 6px;
      font-weight: 500;
    }

    .alert-error {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    .alert-success {
      background: #f0fdf4;
      color: #059669;
      border: 1px solid #bbf7d0;
    }

    @media (max-width: 768px) {
      .add-employee {
        padding: 1rem;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .leave-balance-row {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }

      .leave-inputs {
        grid-template-columns: 1fr 1fr;
      }

      .form-actions {
        flex-direction: column;
      }

      .header {
        flex-direction: column;
        gap: 1rem;
      }
    }
  `]
})
export class AddEmployeeComponent implements OnInit {
  employeeForm!: FormGroup;
  availableRoles = Object.values(Role);
  availableLeaveTypes = Object.values(LeaveType);
  selectedRoles: string[] = ['ROLE_USER']; // Domyślnie USER
  leaveBalances: { [key: string]: { allocatedDays: number; usedDays: number } } = {};
  
  submitting = false;
  error = '';
  success = '';

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.initializeLeaveBalances();
  }

  initializeForm(): void {
    this.employeeForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  initializeLeaveBalances(): void {
    // Ustaw domyślne salda urlopowe
    this.leaveBalances = {
      [LeaveType.ANNUAL]: { allocatedDays: 26, usedDays: 0 },
      [LeaveType.SICK]: { allocatedDays: 10, usedDays: 0 },
      [LeaveType.MATERNITY]: { allocatedDays: 0, usedDays: 0 },
      [LeaveType.PATERNITY]: { allocatedDays: 0, usedDays: 0 },
      [LeaveType.COMPASSIONATE]: { allocatedDays: 3, usedDays: 0 },
      [LeaveType.UNPAID]: { allocatedDays: 0, usedDays: 0 }
    };
  }

  onRoleChange(role: string, event: any): void {
    if (event.target.checked) {
      if (!this.selectedRoles.includes(role)) {
        this.selectedRoles.push(role);
      }
    } else {
      this.selectedRoles = this.selectedRoles.filter(r => r !== role);
    }
  }

  updateLeaveBalance(leaveType: LeaveType, field: 'allocatedDays' | 'usedDays', event: any): void {
    const value = parseInt(event.target.value) || 0;
    if (!this.leaveBalances[leaveType]) {
      this.leaveBalances[leaveType] = { allocatedDays: 0, usedDays: 0 };
    }
    this.leaveBalances[leaveType][field] = value;
  }

  getLeaveBalance(leaveType: LeaveType) {
    return this.leaveBalances[leaveType];
  }

  getRemainingDays(leaveType: LeaveType): number {
    const balance = this.leaveBalances[leaveType];
    if (!balance) return 0;
    return Math.max(0, balance.allocatedDays - balance.usedDays);
  }

  getRoleDisplayName(role: string): string {
    const roleNames: { [key: string]: string } = {
      'ROLE_ADMIN': 'Administrator',
      'ROLE_HR': 'HR',
      'ROLE_MANAGER': 'Menedżer',
      'ROLE_USER': 'Pracownik'
    };
    return roleNames[role] || role;
  }

  getLeaveTypeDisplayName(leaveType: LeaveType): string {
    const typeNames: { [key: string]: string } = {
      'ANNUAL': 'Urlop wypoczynkowy',
      'SICK': 'Zwolnienie lekarskie',
      'MATERNITY': 'Urlop macierzyński',
      'PATERNITY': 'Urlop ojcowski',
      'COMPASSIONATE': 'Urlop okolicznościowy',
      'UNPAID': 'Urlop bezpłatny'
    };
    return typeNames[leaveType] || leaveType;
  }

  onSubmit(): void {
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }

    if (this.selectedRoles.length === 0) {
      this.error = 'Wybierz co najmniej jedną rolę dla pracownika.';
      return;
    }

    this.submitting = true;
    this.error = '';
    this.success = '';

    const formValue = this.employeeForm.value;
    const request: AddEmployeeRequest = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      username: formValue.username,
      email: formValue.email,
      password: formValue.password,
      roles: this.selectedRoles,
      leaveBalances: this.leaveBalances
    };

    console.log('Sending add employee request:', request);

    this.employeeService.addEmployee(request).subscribe({
      next: (response) => {
        console.log('Employee added successfully:', response);
        this.success = response.message;
        this.submitting = false;
        
        // Przekieruj do listy pracowników po 2 sekundach
        setTimeout(() => {
          this.router.navigate(['/admin/employees/list']);
        }, 2000);
      },
      error: (error) => {
        console.error('Error adding employee:', error);
        this.error = error.error?.message || 'Nie udało się dodać pracownika. Spróbuj ponownie.';
        this.submitting = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}