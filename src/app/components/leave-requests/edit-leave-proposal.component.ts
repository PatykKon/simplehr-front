import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LeaveProposalService } from '../../services/leave-proposal.service';
import { AuthService } from '../../services/auth.service';
import { EmployeeService } from '../../services/employee.service';
import {
  EmployeeLeaveProposalResponse,
  UpdateLeaveProposalRequest,
  LeaveType,
  LEAVE_TYPE_OPTIONS
} from '../../models/leave-proposal.models';

@Component({
  selector: 'app-edit-leave-proposal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="edit-leave-proposal">
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="header-info">
            <button class="btn-back" (click)="goBack()">
              ← Powrót
            </button>
            <h1>
              <span class="icon">✏️</span>
              Edytuj wniosek urlopowy #{{ proposalId }}
            </h1>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>Ładowanie danych wniosku...</p>
        </div>

        <!-- Error -->
        <div *ngIf="error" class="alert alert-error">
          <strong>❌ Błąd:</strong><br>
          {{ error }}
        </div>

        <!-- Edit Form -->
        <div *ngIf="!loading && !error && proposal && editForm" class="form-container">
          <div class="form-card">
            <div class="form-header">
              <h2>📝 Edycja wniosku urlopowego</h2>
              <div class="form-info">
                <span class="info-item">
                  <strong>Pracownik:</strong> {{ proposal.userFirstName }} {{ proposal.userLastName }}
                </span>
                <span class="info-item">
                  <strong>Status:</strong> 
                  <span class="status-badge" [class]="getStatusClass(proposal.status)">
                    {{ getStatusLabel(proposal.status) }}
                  </span>
                </span>
              </div>
            </div>

            <form [formGroup]="editForm" (ngSubmit)="onSubmit()" class="edit-form">
              <!-- Typ urlopu -->
              <div class="form-group">
                <label for="leaveType">Typ urlopu *</label>
                <select id="leaveType" formControlName="leaveType" class="form-control">
                  <option value="">-- Wybierz typ urlopu --</option>
                  <option *ngFor="let option of leaveTypeOptions" [value]="option.value">
                    {{ option.icon }} {{ option.label }}
                  </option>
                </select>
                <div class="form-error" *ngIf="getFieldError('leaveType')">
                  {{ getFieldError('leaveType') }}
                </div>
              </div>

              <!-- Data rozpoczęcia -->
              <div class="form-group">
                <label for="startDate">Data rozpoczęcia *</label>
                <input 
                  type="date" 
                  id="startDate" 
                  formControlName="startDate" 
                  class="form-control"
                  [min]="getMinDate()"
                />
                <div class="form-error" *ngIf="getFieldError('startDate')">
                  {{ getFieldError('startDate') }}
                </div>
              </div>

              <!-- Data zakończenia -->
              <div class="form-group">
                <label for="endDate">Data zakończenia *</label>
                <input 
                  type="date" 
                  id="endDate" 
                  formControlName="endDate" 
                  class="form-control"
                  [min]="editForm.get('startDate')?.value || getMinDate()"
                />
                <div class="form-error" *ngIf="getFieldError('endDate')">
                  {{ getFieldError('endDate') }}
                </div>
              </div>

              <!-- Tytuł -->
              <div class="form-group">
                <label for="title">Tytuł wniosku</label>
                <input 
                  type="text" 
                  id="title" 
                  formControlName="title" 
                  class="form-control"
                  placeholder="Krótki tytuł wniosku urlopowego..."
                />
                <div class="form-error" *ngIf="getFieldError('title')">
                  {{ getFieldError('title') }}
                </div>
              </div>

              <!-- Opis -->
              <div class="form-group">
                <label for="description">Opis wniosku</label>
                <textarea 
                  id="description" 
                  formControlName="description" 
                  class="form-control"
                  rows="4"
                  placeholder="Dodatkowe informacje o wniosku urlopowym..."
                ></textarea>
                <div class="form-error" *ngIf="getFieldError('description')">
                  {{ getFieldError('description') }}
                </div>
              </div>

              <!-- Uwagi do przekazania -->
              <div class="form-group">
                <label for="handoverNotes">Uwagi do przekazania</label>
                <textarea 
                  id="handoverNotes" 
                  formControlName="handoverNotes" 
                  class="form-control"
                  rows="3"
                  placeholder="Instrukcje dla zastępstwa lub zespołu..."
                ></textarea>
                <div class="form-error" *ngIf="getFieldError('handoverNotes')">
                  {{ getFieldError('handoverNotes') }}
                </div>
              </div>

              <!-- Zastępstwo -->
              <div class="form-group">
                <label for="substituteUserId">Zastępstwo</label>
                <select id="substituteUserId" formControlName="substituteUserId" class="form-control">
                  <option value="">-- Brak zastępstwa --</option>
                  <option *ngFor="let employee of availableEmployees" [value]="employee.id">
                    {{ employee.firstName }} {{ employee.lastName }} ({{ employee.position }})
                  </option>
                </select>
                <small class="form-hint">Opcjonalnie wybierz osobę, która będzie Cię zastępować</small>
              </div>

              <!-- Informacje o zmianie -->
              <div class="info-box" *ngIf="hasChanges()">
                <div class="info-header">
                  <span class="info-icon">ℹ️</span>
                  <strong>Wykryto zmiany</strong>
                </div>
                <div class="changes-list">
                  <div class="change-item" *ngFor="let change of getChanges()">
                    <strong>{{ change.field }}:</strong> 
                    <span class="old-value">{{ change.oldValue }}</span> 
                    → 
                    <span class="new-value">{{ change.newValue }}</span>
                  </div>
                </div>
              </div>

              <!-- Uwaga o statusie -->
              <div class="warning-box" *ngIf="proposal.status !== 'SUBMITTED'">
                <div class="warning-header">
                  <span class="warning-icon">⚠️</span>
                  <strong>Uwaga</strong>
                </div>
                <p>
                  Ten wniosek ma status "{{ getStatusLabel(proposal.status) }}". 
                  Edycja może nie być możliwa w zależności od polityki firmy.
                </p>
              </div>

              <!-- Błąd formularza -->
              <div class="alert alert-error" *ngIf="formError">
                {{ formError }}
              </div>

              <!-- Przyciski -->
              <div class="form-actions">
                <button 
                  type="button" 
                  class="btn btn-secondary" 
                  (click)="goBack()"
                  [disabled]="submitting"
                >
                  Anuluj
                </button>
                
                <button 
                  type="button" 
                  class="btn btn-ghost" 
                  (click)="resetForm()"
                  [disabled]="submitting || !hasChanges()"
                >
                  Przywróć
                </button>

                <button 
                  type="submit" 
                  class="btn btn-primary"
                  [disabled]="!editForm.valid || submitting || !hasChanges()"
                >
                  <span *ngIf="submitting" class="spinner-small"></span>
                  <span *ngIf="!submitting">💾</span>
                  {{ submitting ? 'Zapisywanie...' : 'Zapisz zmiany' }}
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
    </div>
  `,
  styles: [`
    .edit-leave-proposal {
      max-width: min(var(--page-max-width, 1200px), 800px);
      margin: 0 auto;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .container {
      background: #f8fafc;
      min-height: 100vh;
      padding: 20px;
      border-radius: 12px;
    }

    /* Header */
    .header {
      margin-bottom: 30px;
    }

    .header-info h1 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 15px 0 0 0;
      font-size: 28px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: transparent;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      color: #6b7280;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 15px;
    }

    .btn-back:hover {
      background: #f9fafb;
      color: #374151;
      border-color: #d1d5db;
    }

    /* Loading & Error States */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      text-align: center;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e5e7eb;
      border-top: 4px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .spinner-small {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .alert {
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
      line-height: 1.5;
    }

    .alert-error {
      background: #fef2f2;
      border: 1px solid #fca5a5;
      color: #991b1b;
    }

    .alert-success {
      background: #f0fdf4;
      border: 1px solid #86efac;
      color: #166534;
    }

    /* Form Card */
    .form-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .form-header {
      padding: 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e5e7eb;
    }

    .form-header h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 10px 0;
      font-size: 20px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .form-info {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      font-size: 14px;
    }

    .info-item {
      color: #6b7280;
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

    /* Form Styles */
    .edit-form {
      padding: 30px;
    }

    .form-group {
      margin-bottom: 24px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #374151;
      font-size: 14px;
    }

    .form-control {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      transition: all 0.2s ease;
      background: white;
    }

    .form-control:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-control:disabled {
      background: #f9fafb;
      color: #6b7280;
      cursor: not-allowed;
    }

    textarea.form-control {
      resize: vertical;
      min-height: 80px;
    }

    .form-error {
      margin-top: 6px;
      font-size: 12px;
      color: #ef4444;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .form-hint {
      margin-top: 4px;
      font-size: 12px;
      color: #6b7280;
      display: block;
    }

    /* Info & Warning Boxes */
    .info-box, .warning-box {
      margin: 20px 0;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid;
    }

    .info-box {
      background: #eff6ff;
      border-left-color: #3b82f6;
    }

    .warning-box {
      background: #fffbeb;
      border-left-color: #f59e0b;
    }

    .info-header, .warning-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 14px;
      color: #374151;
    }

    .info-icon, .warning-icon {
      font-size: 16px;
    }

    .changes-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 13px;
    }

    .change-item {
      color: #6b7280;
    }

    .old-value {
      text-decoration: line-through;
      color: #ef4444;
    }

    .new-value {
      color: #10b981;
      font-weight: 500;
    }

    /* Form Actions */
    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 12px 20px;
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
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }

    .btn-secondary {
      background: #6b7280;
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #4b5563;
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

    /* Responsive */
    @media (max-width: 768px) {
      .edit-leave-proposal {
        padding: 15px;
      }

      .container {
        padding: 15px;
      }

      .header-info h1 {
        font-size: 24px;
      }

      .form-info {
        flex-direction: column;
        gap: 8px;
      }

      .edit-form {
        padding: 20px;
      }

      .form-actions {
        flex-direction: column-reverse;
      }

      .btn {
        justify-content: center;
      }
    }
  `]
})
export class EditLeaveProposalComponent implements OnInit {
  proposalId!: number;
  proposal: EmployeeLeaveProposalResponse | null = null;
  editForm!: FormGroup;
  originalFormValue: any = {};

  loading = false;
  submitting = false;
  error = '';
  formError = '';
  successMessage = '';

  leaveTypeOptions = LEAVE_TYPE_OPTIONS;
  availableEmployees: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private leaveProposalService: LeaveProposalService,
    private authService: AuthService,
    private employeeService: EmployeeService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const idParam = params['id'];
      this.proposalId = +idParam;
      
      if (!idParam || isNaN(this.proposalId) || this.proposalId <= 0) {
        this.error = 'Nieprawidłowe ID wniosku';
        this.router.navigate(['/leave-requests']);
        return;
      }
      
      this.loadProposalData();
    });
  }

  loadProposalData(): void {
    this.loading = true;
    this.error = '';

    this.leaveProposalService.getLeaveProposal(this.proposalId).subscribe({
      next: (proposal) => {
        this.proposal = proposal;
        this.checkEditPermissions();
        this.initializeForm();
        this.loadAvailableEmployees();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading proposal:', error);
        this.error = error.error?.message || 'Nie udało się pobrać danych wniosku.';
        this.loading = false;
      }
    });
  }

  checkEditPermissions(): void {
    if (!this.proposal) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.error = 'Nie można określić użytkownika';
      return;
    }

    // Sprawdź czy użytkownik może edytować ten wniosek
    const canEdit = 
      currentUser.id === this.proposal.userId || // Właściciel wniosku
      currentUser.roles?.some(role => ['ADMIN', 'HR'].includes(role)); // Admin/HR

    if (!canEdit) {
      this.error = 'Nie masz uprawnień do edycji tego wniosku';
      return;
    }

    // Sprawdź czy wniosek można edytować (tylko PENDING)
  if (this.proposal.status !== 'SUBMITTED') {
      this.error = `Nie można edytować wniosku o statusie "${this.getStatusLabel(this.proposal.status)}"`;
      return;
    }
  }

  initializeForm(): void {
    if (!this.proposal) return;

    this.editForm = this.fb.group({
      leaveType: [this.proposal.leaveType, [Validators.required]],
      startDate: [this.formatDateForInput(this.proposal.startDate), [Validators.required]],
      endDate: [this.formatDateForInput(this.proposal.endDate), [Validators.required]],
      title: [this.proposal.title || ''],
      description: [this.proposal.description || ''],
      handoverNotes: [this.proposal.handoverNotes || ''],
      substituteUserId: [this.proposal.substituteUserId || '']
    });

    // Zapisz oryginalne wartości
    this.originalFormValue = { ...this.editForm.value };

    // Dodaj validatory dla dat
    this.editForm.get('startDate')?.valueChanges.subscribe(() => {
      this.validateDates();
    });

    this.editForm.get('endDate')?.valueChanges.subscribe(() => {
      this.validateDates();
    });
  }

  validateDates(): void {
    const startDate = this.editForm.get('startDate')?.value;
    const endDate = this.editForm.get('endDate')?.value;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      this.editForm.get('endDate')?.setErrors({ 'dateOrder': true });
    }
  }

  loadAvailableEmployees(): void {
    // Load available employees for substitute selection
    this.employeeService.getAllEmployees().subscribe({
      next: (employees: any[]) => {
        this.availableEmployees = employees.filter((emp: any) => 
          emp.id !== this.proposal?.userId // Exclude current user
        );
      },
      error: (error: any) => {
        console.error('Error loading employees:', error);
        // Don't show error - substitute is optional
      }
    });
  }

  onSubmit(): void {
    if (!this.editForm.valid || this.submitting || !this.proposal) return;

    this.submitting = true;
    this.formError = '';

    const formValue = this.editForm.value;
    const request: UpdateLeaveProposalRequest = {
      leaveType: formValue.leaveType,
      startDate: formValue.startDate,
      endDate: formValue.endDate,
      title: formValue.title || undefined,
      description: formValue.description || undefined,
      handoverNotes: formValue.handoverNotes || undefined,
      substituteUserId: formValue.substituteUserId ? Number(formValue.substituteUserId) : undefined
    };

    this.leaveProposalService.updateLeaveProposal(this.proposal.id, request).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.submitting = false;
        
        // Redirect after success
        setTimeout(() => {
          this.router.navigate(['/leave-requests', this.proposalId]);
        }, 2000);
      },
      error: (error) => {
        console.error('Error updating proposal:', error);
        this.formError = error.error?.message || 'Nie udało się zaktualizować wniosku.';
        this.submitting = false;
      }
    });
  }

  resetForm(): void {
    if (this.editForm) {
      this.editForm.patchValue(this.originalFormValue);
      this.formError = '';
    }
  }

  hasChanges(): boolean {
    if (!this.editForm || !this.originalFormValue) return false;
    
    const currentValue = this.editForm.value;
    return JSON.stringify(currentValue) !== JSON.stringify(this.originalFormValue);
  }

  getChanges(): any[] {
    if (!this.hasChanges()) return [];

    const changes: any[] = [];
    const current = this.editForm.value;
    const original = this.originalFormValue;

    const fieldLabels: { [key: string]: string } = {
      leaveType: 'Typ urlopu',
      startDate: 'Data rozpoczęcia',
      endDate: 'Data zakończenia',
      title: 'Tytuł',
      description: 'Opis',
      handoverNotes: 'Uwagi do przekazania',
      substituteUserId: 'Zastępstwo'
    };

    Object.keys(current).forEach(key => {
      if (current[key] !== original[key]) {
        changes.push({
          field: fieldLabels[key] || key,
          oldValue: this.formatValue(key, original[key]),
          newValue: this.formatValue(key, current[key])
        });
      }
    });

    return changes;
  }

  formatValue(field: string, value: any): string {
    if (!value) return '(brak)';

    switch (field) {
      case 'leaveType':
        const option = this.leaveTypeOptions.find(opt => opt.value === value);
        return option ? option.label : value;
      case 'startDate':
      case 'endDate':
        return new Date(value).toLocaleDateString('pl-PL');
      case 'substituteUserId':
        const employee = this.availableEmployees.find(emp => emp.id === Number(value));
        return employee ? `${employee.firstName} ${employee.lastName}` : value;
      default:
        return value.toString();
    }
  }

  getFieldError(fieldName: string): string | null {
    const field = this.editForm?.get(fieldName);
    if (field && field.invalid && (field.dirty || field.touched)) {
      if (field.errors?.['required']) {
        return 'To pole jest wymagane';
      }
      if (field.errors?.['dateOrder']) {
        return 'Data zakończenia nie może być wcześniejsza niż data rozpoczęcia';
      }
    }
    return null;
  }

  getMinDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  formatDateForInput(dateString: string): string {
    return new Date(dateString).toISOString().split('T')[0];
  }

  getStatusClass(status: string): string {
    return status.toLowerCase();
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'PENDING': 'Oczekujący',
      'APPROVED': 'Zatwierdzony',
      'REJECTED': 'Odrzucony',
      'CANCELLED': 'Anulowany'
    };
    return labels[status] || status;
  }

  goBack(): void {
    this.router.navigate(['/leave-requests', this.proposalId]);
  }
}