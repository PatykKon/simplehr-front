import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EmployeeService } from '../../services/employee.service';
import { EmployeeDetailsResponse, Role } from '../../models/employee.models';

@Component({
  selector: 'app-edit-employee',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="edit-employee">
      <div class="header">
        <h1>✏️ Edycja pracownika</h1>
        <button class="btn-back" (click)="goBack()">← Powrót</button>
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

      <!-- Success -->
      <div *ngIf="success" class="alert alert-success">
        <strong>✅ Sukces:</strong><br>
        {{ success }}
      </div>

      <!-- Edit Form -->
      <div *ngIf="editForm && !loading" class="edit-form-container">
        <form [formGroup]="editForm" (ngSubmit)="onSubmit()" class="edit-form">
          
          <!-- Basic Information -->
          <div class="form-section">
            <h2>👤 Informacje podstawowe</h2>
            <div class="form-row">
              <div class="form-group">
                <label for="username">Nazwa użytkownika *</label>
                <input 
                  type="text" 
                  id="username" 
                  formControlName="username"
                  class="form-control"
                  [class.error]="editForm.get('username')?.invalid && editForm.get('username')?.touched">
                <div class="error-message" *ngIf="editForm.get('username')?.invalid && editForm.get('username')?.touched">
                  <small *ngIf="editForm.get('username')?.errors?.['required']">
                    Nazwa użytkownika jest wymagana
                  </small>
                  <small *ngIf="editForm.get('username')?.errors?.['minlength']">
                    Nazwa użytkownika musi mieć co najmniej 3 znaki
                  </small>
                </div>
              </div>

              <div class="form-group">
                <label for="email">Email *</label>
                <input 
                  type="email" 
                  id="email" 
                  formControlName="email"
                  class="form-control"
                  [class.error]="editForm.get('email')?.invalid && editForm.get('email')?.touched">
                <div class="error-message" *ngIf="editForm.get('email')?.invalid && editForm.get('email')?.touched">
                  <small *ngIf="editForm.get('email')?.errors?.['required']">
                    Email jest wymagany
                  </small>
                  <small *ngIf="editForm.get('email')?.errors?.['email']">
                    Email musi być prawidłowy
                  </small>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="firstName">Imię *</label>
                <input 
                  type="text" 
                  id="firstName" 
                  formControlName="firstName"
                  class="form-control"
                  [class.error]="editForm.get('firstName')?.invalid && editForm.get('firstName')?.touched">
                <div class="error-message" *ngIf="editForm.get('firstName')?.invalid && editForm.get('firstName')?.touched">
                  <small *ngIf="editForm.get('firstName')?.errors?.['required']">
                    Imię jest wymagane
                  </small>
                </div>
              </div>

              <div class="form-group">
                <label for="lastName">Nazwisko *</label>
                <input 
                  type="text" 
                  id="lastName" 
                  formControlName="lastName"
                  class="form-control"
                  [class.error]="editForm.get('lastName')?.invalid && editForm.get('lastName')?.touched">
                <div class="error-message" *ngIf="editForm.get('lastName')?.invalid && editForm.get('lastName')?.touched">
                  <small *ngIf="editForm.get('lastName')?.errors?.['required']">
                    Nazwisko jest wymagane
                  </small>
                </div>
              </div>
            </div>
          </div>

          <!-- Roles Section -->
          <div class="form-section">
            <h2>👨‍💼 Role użytkownika</h2>
            <div class="roles-container">
              <div class="role-item" *ngFor="let role of availableRoles">
                <label class="role-label">
                  <input 
                    type="checkbox" 
                    [value]="role.value"
                    (change)="onRoleChange(role.value, $event)"
                    [checked]="isRoleSelected(role.value)">
                  <span class="role-checkbox"></span>
                  <div class="role-info">
                    <div class="role-name">{{ role.label }}</div>
                    <div class="role-description">{{ role.description }}</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <!-- Account Status -->
          <div class="form-section">
            <h2>🔐 Status konta</h2>
            <div class="form-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  formControlName="enabled">
                <span class="checkbox-custom"></span>
                Konto aktywne
              </label>
              <small class="help-text">
                Gdy konto jest nieaktywne, użytkownik nie może się zalogować
              </small>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="goBack()">
              Anuluj
            </button>
            <button type="button" class="btn-danger" (click)="resetForm()">
              🔄 Resetuj
            </button>
            <button 
              type="submit" 
              class="btn-primary"
              [disabled]="editForm.invalid || saving">
              <span *ngIf="saving">⏳ Zapisywanie...</span>
              <span *ngIf="!saving">💾 Zapisz zmiany</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  `,
  styles: [`
    .edit-employee {
      padding: 2rem;
      max-width: min(var(--page-max-width, 1200px), 800px);
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

    .btn-back, .btn-primary, .btn-secondary, .btn-danger {
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

    .btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .btn-primary:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    .btn-danger {
      background: #dc2626;
      color: white;
    }

    .btn-danger:hover {
      background: #b91c1c;
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

    .alert-success {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }

    .edit-form-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .edit-form {
      padding: 2rem;
    }

    .form-section {
      margin-bottom: 2rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .form-section:last-of-type {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .form-section h2 {
      color: #1f2937;
      font-size: 1.25rem;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      font-weight: 500;
      color: #374151;
      font-size: 0.875rem;
    }

    .form-control {
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .form-control.error {
      border-color: #dc2626;
    }

    .error-message {
      color: #dc2626;
      font-size: 0.875rem;
    }

    .roles-container {
      display: grid;
      gap: 1rem;
    }

    .role-item {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1rem;
      transition: border-color 0.2s;
    }

    .role-item:hover {
      border-color: #2563eb;
    }

    .role-label {
      display: flex;
      align-items: center;
      gap: 1rem;
      cursor: pointer;
    }

    .role-label input[type="checkbox"] {
      display: none;
    }

    .role-checkbox {
      width: 20px;
      height: 20px;
      border: 2px solid #d1d5db;
      border-radius: 4px;
      position: relative;
      flex-shrink: 0;
      transition: all 0.2s;
    }

    .role-label input[type="checkbox"]:checked + .role-checkbox {
      background: #2563eb;
      border-color: #2563eb;
    }

    .role-label input[type="checkbox"]:checked + .role-checkbox::after {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-weight: 600;
      font-size: 12px;
    }

    .role-info {
      flex: 1;
    }

    .role-name {
      font-weight: 500;
      color: #1f2937;
      margin-bottom: 0.25rem;
    }

    .role-description {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      margin-bottom: 0.5rem;
    }

    .checkbox-label input[type="checkbox"] {
      display: none;
    }

    .checkbox-custom {
      width: 18px;
      height: 18px;
      border: 2px solid #d1d5db;
      border-radius: 4px;
      position: relative;
      flex-shrink: 0;
      transition: all 0.2s;
    }

    .checkbox-label input[type="checkbox"]:checked + .checkbox-custom {
      background: #2563eb;
      border-color: #2563eb;
    }

    .checkbox-label input[type="checkbox"]:checked + .checkbox-custom::after {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-weight: 600;
      font-size: 11px;
    }

    .help-text {
      color: #6b7280;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      padding-top: 2rem;
      border-top: 1px solid #e5e7eb;
    }

    @media (max-width: 768px) {
      .edit-employee {
        padding: 1rem;
      }

      .header {
        flex-direction: column;
        gap: 1rem;
      }

      .form-row {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .form-actions {
        flex-direction: column;
      }
    }
  `]
})
export class EditEmployeeComponent implements OnInit {
  editForm!: FormGroup;
  loading = true;
  saving = false;
  error = '';
  success = '';
  employeeId!: number;
  employee: EmployeeDetailsResponse | null = null;

  availableRoles = [
    {
      value: Role.ROLE_ADMIN,
      label: 'Administrator',
      description: 'Pełny dostęp do wszystkich funkcji systemu'
    },
    {
      value: Role.ROLE_HR,
      label: 'HR',
      description: 'Zarządzanie pracownikami i urlopami'
    },
    {
      value: Role.ROLE_MANAGER,
      label: 'Manager',
      description: 'Zatwierdzanie wniosków urlopowych podwładnych'
    },
    {
      value: Role.ROLE_USER,
      label: 'Pracownik',
      description: 'Podstawowe funkcje - składanie wniosków urlopowych'
    }
  ];

  selectedRoles: Role[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private employeeService: EmployeeService
  ) {
    this.initForm();
  }

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
      
      this.loadEmployeeData();
    });
  }

  initForm(): void {
    this.editForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      enabled: [true]
    });
  }

  loadEmployeeData(): void {
    this.loading = true;
    this.error = '';

    this.employeeService.getEmployeeDetails(this.employeeId).subscribe({
      next: (employee) => {
        console.log('Employee data loaded:', employee);
        this.employee = employee;
        this.populateForm(employee);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading employee:', error);
        this.error = error.error?.message || 'Nie udało się pobrać danych pracownika.';
        this.loading = false;
      }
    });
  }

  populateForm(employee: EmployeeDetailsResponse): void {
    this.editForm.patchValue({
      username: employee.username,
      email: employee.email,
      firstName: employee.firstName,
      lastName: employee.lastName,
      enabled: employee.enabled
    });

    // Set selected roles
    this.selectedRoles = employee.roles as Role[];
  }

  onRoleChange(role: Role, event: any): void {
    if (event.target.checked) {
      if (!this.selectedRoles.includes(role)) {
        this.selectedRoles.push(role);
      }
    } else {
      this.selectedRoles = this.selectedRoles.filter(r => r !== role);
    }
  }

  isRoleSelected(role: Role): boolean {
    return this.selectedRoles.includes(role);
  }

  resetForm(): void {
    if (this.employee) {
      this.populateForm(this.employee);
    }
    this.error = '';
    this.success = '';
  }

  onSubmit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    // Validate at least one role selected
    if (this.selectedRoles.length === 0) {
      this.error = 'Należy wybrać co najmniej jedną rolę dla użytkownika.';
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    const formData = this.editForm.value;
    const updateRequest = {
      ...formData,
      roles: this.selectedRoles
    };

    console.log('Submitting update request:', updateRequest);

    // Tutaj będzie wywołanie API do aktualizacji pracownika
    // Na razie symulujemy sukces
    setTimeout(() => {
      this.saving = false;
      this.success = 'Dane pracownika zostały zaktualizowane pomyślnie.';
      
      // Po 2 sekundach przekieruj do szczegółów
      setTimeout(() => {
        this.router.navigate(['/admin/employees', this.employeeId]);
      }, 2000);
    }, 1000);
  }

  goBack(): void {
    this.router.navigate(['/admin/employees', this.employeeId]);
  }
}