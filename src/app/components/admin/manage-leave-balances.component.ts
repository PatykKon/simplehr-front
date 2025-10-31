import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EmployeeService } from '../../services/employee.service';
import { EmployeeDetailsResponse, EmployeeLeaveBalanceResponse } from '../../models/employee.models';

@Component({
  selector: 'app-manage-leave-balances',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="manage-balances">
      <div class="header">
        <div class="header-info">
          <h1>🏖️ Zarządzanie saldami urlopowymi</h1>
          <p *ngIf="employee">
            Pracownik: <strong>{{ employee.firstName }} {{ employee.lastName }}</strong> 
            ({{ employee.username }})
          </p>
        </div>
        <button class="btn-back" (click)="goBack()">← Powrót</button>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading">
        <div class="loading-spinner"></div>
        <p>Ładowanie sald urlopowych...</p>
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

      <!-- Balances Form -->
      <div *ngIf="balancesForm && !loading" class="balances-container">
        
        <!-- Current Year Balances -->
        <div class="balances-section">
          <div class="section-header">
            <h2>📊 Salda na rok {{ currentYear }}</h2>
            <button type="button" class="btn-secondary" (click)="addNewBalance()">
              ➕ Dodaj nowy typ urlopu
            </button>
          </div>

          <form [formGroup]="balancesForm" (ngSubmit)="onSubmit()">
            <div formArrayName="balances" class="balances-grid">
              <div *ngFor="let balanceGroup of balanceControls; let i = index" 
                   [formGroupName]="i" 
                   class="balance-card">
                
                <div class="balance-header">
                  <div class="balance-type">
                    <label>Typ urlopu:</label>
                    <select formControlName="leaveType" class="form-control">
                      <option value="ANNUAL">Urlop wypoczynkowy</option>
                      <option value="SICK">Zwolnienie lekarskie</option>
                      <option value="PERSONAL">Urlop osobisty</option>
                    </select>
                  </div>
                  <button type="button" 
                          class="btn-danger-small" 
                          (click)="removeBalance(i)"
                          *ngIf="balanceControls.length > 1">
                    🗑️
                  </button>
                </div>

                <div class="balance-fields">
                  <div class="field-group">
                    <label>Przydzielone dni:</label>
                    <input type="number" 
                           formControlName="allocatedDays" 
                           class="form-control"
                           min="0"
                           max="365">
                    <div class="error-message" *ngIf="getBalanceControl(i, 'allocatedDays')?.invalid && getBalanceControl(i, 'allocatedDays')?.touched">
                      <small *ngIf="getBalanceControl(i, 'allocatedDays')?.errors?.['required']">
                        Liczba przydzielonych dni jest wymagana
                      </small>
                      <small *ngIf="getBalanceControl(i, 'allocatedDays')?.errors?.['min']">
                        Minimalna wartość to 0
                      </small>
                    </div>
                  </div>

                  <div class="field-group">
                    <label>Wykorzystane dni:</label>
                    <input type="number" 
                           formControlName="usedDays" 
                           class="form-control"
                           min="0">
                    <div class="error-message" *ngIf="getBalanceControl(i, 'usedDays')?.invalid && getBalanceControl(i, 'usedDays')?.touched">
                      <small *ngIf="getBalanceControl(i, 'usedDays')?.errors?.['required']">
                        Liczba wykorzystanych dni jest wymagana
                      </small>
                      <small *ngIf="getBalanceControl(i, 'usedDays')?.errors?.['min']">
                        Minimalna wartość to 0
                      </small>
                    </div>
                  </div>

                  <div class="field-group readonly">
                    <label>Pozostałe dni:</label>
                    <div class="remaining-days">
                      {{ getRemainingDays(i) }}
                    </div>
                  </div>
                </div>

                <div class="balance-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" 
                         [style.width.%]="getUsagePercentage(i)">
                    </div>
                  </div>
                  <span class="progress-text">
                    {{ getUsagePercentage(i) }}% wykorzystane
                  </span>
                </div>

              </div>
            </div>

            <!-- Form Actions -->
            <div class="form-actions">
              <button type="button" class="btn-secondary" (click)="resetForm()">
                🔄 Resetuj
              </button>
              <button type="button" class="btn-secondary" (click)="goBack()">
                Anuluj
              </button>
              <button 
                type="submit" 
                class="btn-primary"
                [disabled]="balancesForm.invalid || saving">
                <span *ngIf="saving">⏳ Zapisywanie...</span>
                <span *ngIf="!saving">💾 Zapisz salda</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Historical Balances -->
        <div class="history-section" *ngIf="Object.keys(historicalBalances).length > 0">
          <h2>📚 Historia sald z poprzednich lat</h2>
          <div class="history-grid">
            <div *ngFor="let yearGroup of historicalBalances | keyvalue" class="year-group">
              <h3>Rok {{ yearGroup.key }}</h3>
              <div class="year-balances">
                <div *ngFor="let balance of yearGroup.value" class="historical-balance">
                  <div class="balance-type-label">
                    {{ formatLeaveType(balance.leaveType) }}
                  </div>
                  <div class="balance-stats">
                    <span class="stat">{{ balance.allocatedDays }} przydzielone</span>
                    <span class="stat">{{ balance.usedDays }} wykorzystane</span>
                    <span class="stat remaining">{{ balance.remainingDays }} pozostałe</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .manage-balances {
      padding: 2rem;
      max-width: min(var(--page-max-width, 1200px), 1000px);
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

    .btn-back, .btn-primary, .btn-secondary, .btn-danger-small {
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

    .btn-danger-small {
      background: #dc2626;
      color: white;
      padding: 0.25rem 0.5rem;
      font-size: 0.875rem;
    }

    .btn-danger-small:hover {
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

    .balances-container {
      display: grid;
      gap: 3rem;
    }

    .balances-section {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .section-header {
      background: #f8fafc;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-header h2 {
      color: #1f2937;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .balances-grid {
      padding: 2rem;
      display: grid;
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
      margin-bottom: 1.5rem;
    }

    .balance-type {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      flex: 1;
    }

    .balance-type label {
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

    .balance-fields {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .field-group label {
      font-weight: 500;
      color: #374151;
      font-size: 0.875rem;
    }

    .field-group.readonly .remaining-days {
      padding: 0.75rem;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-weight: 600;
      color: #059669;
      text-align: center;
    }

    .error-message {
      color: #dc2626;
      font-size: 0.875rem;
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

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      padding: 2rem;
      border-top: 1px solid #e5e7eb;
      background: #f8fafc;
    }

    .history-section {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 2rem;
    }

    .history-section h2 {
      color: #1f2937;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .history-grid {
      display: grid;
      gap: 2rem;
    }

    .year-group h3 {
      color: #374151;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .year-balances {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
    }

    .historical-balance {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 1rem;
      background: #f9fafb;
    }

    .balance-type-label {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.75rem;
    }

    .balance-stats {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .balance-stats .stat {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .balance-stats .stat.remaining {
      color: #059669;
      font-weight: 500;
    }

    @media (max-width: 768px) {
      .manage-balances {
        padding: 1rem;
      }

      .header {
        flex-direction: column;
        gap: 1rem;
      }

      .balance-fields {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .form-actions {
        flex-direction: column;
      }

      .year-balances {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ManageLeaveBalancesComponent implements OnInit {
  balancesForm!: FormGroup;
  loading = true;
  saving = false;
  error = '';
  success = '';
  employeeId!: number;
  employee: EmployeeDetailsResponse | null = null;
  currentYear = new Date().getFullYear();
  historicalBalances: { [year: number]: EmployeeLeaveBalanceResponse[] } = {};
  
  // Eksponuj Object do template
  Object = Object;

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
    this.balancesForm = this.fb.group({
      balances: this.fb.array([])
    });
  }

  get balanceControls() {
    return (this.balancesForm.get('balances') as FormArray).controls as FormGroup[];
  }

  loadEmployeeData(): void {
    this.loading = true;
    this.error = '';

    this.employeeService.getEmployeeDetails(this.employeeId).subscribe({
      next: (employee) => {
        console.log('Employee data loaded:', employee);
        this.employee = employee;
        this.processBalances(employee.leaveBalances || []);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading employee:', error);
        this.error = error.error?.message || 'Nie udało się pobrać danych pracownika.';
        this.loading = false;
      }
    });
  }

  processBalances(balances: EmployeeLeaveBalanceResponse[]): void {
    const balancesArray = this.balancesForm.get('balances') as FormArray;
    
    // Wyczyść istniejące kontrolki
    while (balancesArray.length !== 0) {
      balancesArray.removeAt(0);
    }

    // Podziel na bieżące i historyczne salda
    const currentYearBalances = balances.filter(b => b.year === this.currentYear);
    const otherYearBalances = balances.filter(b => b.year !== this.currentYear);

    // Grupuj historyczne salda według roku
    this.historicalBalances = {};
    otherYearBalances.forEach(balance => {
      if (!this.historicalBalances[balance.year]) {
        this.historicalBalances[balance.year] = [];
      }
      this.historicalBalances[balance.year].push(balance);
    });

    // Dodaj kontrolki dla bieżącego roku
    if (currentYearBalances.length === 0) {
      // Dodaj domyślne salda jeśli nie ma żadnych
      this.addBalanceControl('ANNUAL', 26, 0);
      this.addBalanceControl('SICK', 10, 0);
    } else {
      currentYearBalances.forEach(balance => {
        this.addBalanceControl(balance.leaveType, balance.allocatedDays, balance.usedDays);
      });
    }
  }

  addBalanceControl(leaveType: string = 'ANNUAL', allocated: number = 0, used: number = 0): void {
    const balancesArray = this.balancesForm.get('balances') as FormArray;
    
    const balanceGroup = this.fb.group({
      leaveType: [leaveType, Validators.required],
      allocatedDays: [allocated, [Validators.required, Validators.min(0)]],
      usedDays: [used, [Validators.required, Validators.min(0)]]
    });

    balancesArray.push(balanceGroup);
  }

  addNewBalance(): void {
    this.addBalanceControl();
  }

  removeBalance(index: number): void {
    const balancesArray = this.balancesForm.get('balances') as FormArray;
    balancesArray.removeAt(index);
  }

  getBalanceControl(index: number, controlName: string) {
    const balancesArray = this.balancesForm.get('balances') as FormArray;
    return balancesArray.at(index).get(controlName);
  }

  getRemainingDays(index: number): number {
    const balanceGroup = this.balanceControls[index];
    const allocated = balanceGroup.get('allocatedDays')?.value || 0;
    const used = balanceGroup.get('usedDays')?.value || 0;
    return Math.max(0, allocated - used);
  }

  getUsagePercentage(index: number): number {
    const balanceGroup = this.balanceControls[index];
    const allocated = balanceGroup.get('allocatedDays')?.value || 0;
    const used = balanceGroup.get('usedDays')?.value || 0;
    
    if (allocated === 0) return 0;
    return Math.round((used / allocated) * 100);
  }

  formatLeaveType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'ANNUAL': 'Urlop wypoczynkowy',
      'SICK': 'Zwolnienie lekarskie',
      'PERSONAL': 'Urlop osobisty'
    };
    return typeMap[type] || type;
  }

  resetForm(): void {
    if (this.employee) {
      this.processBalances(this.employee.leaveBalances || []);
    }
    this.error = '';
    this.success = '';
  }

  onSubmit(): void {
    if (this.balancesForm.invalid) {
      this.balancesForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    const balancesData = this.balancesForm.value.balances.map((balance: any) => ({
      ...balance,
      year: this.currentYear,
      employeeId: this.employeeId
    }));

    console.log('Submitting balances:', balancesData);

    // Tutaj będzie wywołanie API do aktualizacji sald
    // Na razie symulujemy sukces
    setTimeout(() => {
      this.saving = false;
      this.success = 'Salda urlopowe zostały zaktualizowane pomyślnie.';
      
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