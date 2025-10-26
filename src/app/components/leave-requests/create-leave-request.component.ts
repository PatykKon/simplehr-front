import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LeaveProposalService } from '../../services/leave-proposal.service';
import { EmployeeService } from '../../services/employee.service';
import { AuthService } from '../../services/auth.service';
import {
  CreateLeaveProposalRequest,
  LeaveType,
  LEAVE_TYPE_OPTIONS,
  LEAVE_TYPE_LABELS
} from '../../models/leave-proposal.models';
import { EmployeeSummaryResponse } from '../../models/employee.models';

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isInRange: boolean;
  hasLeave: boolean;
  isWeekend: boolean;
  leaves?: any[];
}

@Component({
  selector: 'app-create-leave-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  styleUrl: './create-leave-request.component.css',
  template: `
    <div class="create-leave-request">
      <div class="header">
        <h1>📝 Nowy wniosek urlopowy</h1>
        <button class="btn-back" (click)="goBack()">← Powrót</button>
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

      <!-- Main Content - Two Column Layout -->
      <div class="main-content">
        <!-- Left Column - Calendar -->
        <div class="calendar-section">
          <div class="calendar-header">
            <h2>📅 Kalendarz urlopów</h2>
            <div class="calendar-controls">
              <button type="button" class="btn-nav" (click)="previousMonth()">‹</button>
              <span class="current-month">{{ getMonthYearText() }}</span>
              <button type="button" class="btn-nav" (click)="nextMonth()">›</button>
            </div>
          </div>
          
          <div class="calendar-container">
            <div class="calendar-grid">
              <!-- Week days header -->
              <div class="calendar-header-row">
                <div class="calendar-day-header" *ngFor="let day of weekDays">{{ day }}</div>
              </div>
              
              <!-- Calendar days -->
              <div class="calendar-days">
                <div *ngFor="let day of calendarDays" 
                     class="calendar-day"
                     [class.other-month]="!day.isCurrentMonth"
                     [class.today]="day.isToday"
                     [class.selected]="day.isSelected"
                     [class.range-start]="day.isRangeStart"
                     [class.range-end]="day.isRangeEnd"
                     [class.in-range]="day.isInRange"
                     [class.has-leave]="day.hasLeave"
                     [class.weekend]="day.isWeekend"
                     (click)="selectDate(day)">
                  <span class="day-number">{{ day.dayNumber }}</span>
                  <div class="day-leaves" *ngIf="day.leaves && day.leaves.length > 0">
                    <div class="leave-indicator" 
                         *ngFor="let leave of day.leaves"
                         [style.background-color]="getLeaveTypeColor(leave.leaveType)"
                         [title]="leave.userName + ' - ' + getLeaveTypeLabel(leave.leaveType)">
                      {{ leave.userName.charAt(0) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Calendar Legend -->
          <div class="calendar-legend">
            <h3>Legenda:</h3>
            <div class="legend-items">
              <div class="legend-item">
                <span class="legend-color today-color"></span>
                <span>Dziś</span>
              </div>
              <div class="legend-item">
                <span class="legend-color selected-color"></span>
                <span>Wybrane daty</span>
              </div>
              <div class="legend-item">
                <span class="legend-color has-leave-color"></span>
                <span>Urlopy innych</span>
              </div>
              <div class="legend-item">
                <span class="legend-color weekend-color"></span>
                <span>Weekend</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column - Form -->
        <div class="form-section-container">
          <form [formGroup]="leaveForm" (ngSubmit)="onSubmit()" class="leave-form">
            
            <!-- Leave Type Selection -->
            <div class="form-section">
              <h2>🏷️ Typ urlopu</h2>
              <div class="form-group">
                <select formControlName="leaveType" class="form-control large-select">
                  <option value="">Wybierz typ urlopu</option>
                  <option *ngFor="let option of leaveTypeOptions" [value]="option.value">
                    {{ option.icon }} {{ option.label }}
                  </option>
                </select>
                <div class="selected-type-info" *ngIf="leaveForm.get('leaveType')?.value">
                  <div class="type-details">
                    <span class="type-icon">{{ getSelectedTypeIcon() }}</span>
                    <div class="type-text">
                      <strong>{{ getSelectedTypeLabel() }}</strong>
                      <p>{{ getSelectedTypeDescription() }}</p>
                      
                      <!-- Leave Balance Info -->
                      <div class="balance-info" *ngIf="getSelectedTypeBalance()">
                        <div class="balance-item">
                          <span class="balance-label">📊 Dostępne dni:</span>
                          <span class="balance-value available">{{ getAvailableDays() }}</span>
                        </div>
                        <div class="balance-item">
                          <span class="balance-label">✅ Wykorzystane:</span>
                          <span class="balance-value used">{{ getUsedDays() }}</span>
                        </div>
                        <div class="balance-item">
                          <span class="balance-label">🎯 Limit roczny:</span>
                          <span class="balance-value total">{{ getTotalDays() }}</span>
                        </div>
                      </div>
                      
                      <!-- Loading balances -->
                      <div class="balance-loading" *ngIf="loadingBalances">
                        <small>⏳ Ładowanie informacji o dostępnych dniach...</small>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="error-message" *ngIf="leaveForm.get('leaveType')?.invalid && leaveForm.get('leaveType')?.touched">
                  <small *ngIf="leaveForm.get('leaveType')?.errors?.['required']">
                    Typ urlopu jest wymagany
                  </small>
                </div>
              </div>
            </div>

            <!-- Date Range -->
            <div class="form-section">
              <h2>📅 Okres urlopu</h2>
              <div class="date-range">
                <div class="form-group">
                  <label for="startDate">Data rozpoczęcia *</label>
                  <input 
                    type="date" 
                    id="startDate" 
                    formControlName="startDate"
                    class="form-control"
                    [min]="minDate"
                    [class.error]="leaveForm.get('startDate')?.invalid && leaveForm.get('startDate')?.touched">
                  <div class="error-message" *ngIf="leaveForm.get('startDate')?.invalid && leaveForm.get('startDate')?.touched">
                    <small *ngIf="leaveForm.get('startDate')?.errors?.['required']">
                      Data rozpoczęcia jest wymagana
                    </small>
                  </div>
                </div>

                <div class="form-group">
                  <label for="endDate">Data zakończenia *</label>
                  <input 
                    type="date" 
                    id="endDate" 
                    formControlName="endDate"
                    class="form-control"
                    [min]="leaveForm.get('startDate')?.value || minDate"
                    [class.error]="leaveForm.get('endDate')?.invalid && leaveForm.get('endDate')?.touched">
                  <div class="error-message" *ngIf="leaveForm.get('endDate')?.invalid && leaveForm.get('endDate')?.touched">
                    <small *ngIf="leaveForm.get('endDate')?.errors?.['required']">
                      Data zakończenia jest wymagana
                    </small>
                    <small *ngIf="leaveForm.get('endDate')?.errors?.['dateRange']">
                      Data zakończenia nie może być wcześniejsza niż data rozpoczęcia
                    </small>
                  </div>
                </div>
                
                <!-- Quick Date Selection Buttons -->
                <div class="quick-dates">
                  <div class="quick-dates-header">
                    <h4>Szybkie wybory:</h4>
                    <button type="button" class="btn-clear-dates" (click)="clearSelectedDates()" 
                            *ngIf="leaveForm.get('startDate')?.value || leaveForm.get('endDate')?.value">
                      🗑️ Wyczyść daty
                    </button>
                  </div>
                  <div class="quick-buttons">
                    <button type="button" class="btn-quick" (click)="setDatesFromToday(1)">1 dzień</button>
                    <button type="button" class="btn-quick" (click)="setDatesFromToday(3)">3 dni</button>
                    <button type="button" class="btn-quick" (click)="setDatesFromToday(7)">1 tydzień</button>
                    <button type="button" class="btn-quick" (click)="setDatesFromToday(14)">2 tygodnie</button>
                  </div>
                </div>
              </div>

              <div class="date-summary" *ngIf="leaveForm.get('startDate')?.value && leaveForm.get('endDate')?.value">
                <div class="summary-card">
                  <div class="summary-item">
                    <span class="summary-icon">📊</span>
                    <strong>Liczba dni roboczych:</strong> {{ getWorkingDays() }}
                  </div>
                  <div class="summary-item">
                    <span class="summary-icon">📅</span>
                    <strong>Uwzględnia weekendy:</strong> {{ includesWeekends() ? 'Tak' : 'Nie' }}
                  </div>
                  <div class="summary-item" *ngIf="getWorkingDays() > 0">
                    <span class="summary-icon">🗓️</span>
                    <strong>Okres:</strong> {{ formatDateRange() }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Details -->
            <div class="form-section">
              <h2>📋 Szczegóły wniosku</h2>
              
              <div class="form-group">
                <label for="title">Tytuł wniosku</label>
                <input 
                  type="text" 
                  id="title" 
                  formControlName="title"
                  class="form-control"
                  placeholder="np. Urlop wypoczynkowy - wakacje"
                  maxlength="100">
                <small class="help-text">Opcjonalny krótki tytuł opisujący wniosek</small>
              </div>

              <div class="form-group">
                <label for="description">Opis / Uzasadnienie</label>
                <textarea 
                  id="description" 
                  formControlName="description"
                  class="form-control textarea"
                  rows="4"
                  placeholder="Opcjonalny opis powodu urlopu..."
                  maxlength="500"></textarea>
                <small class="help-text">Opcjonalny opis powodu lub celu urlopu</small>
              </div>

              <div class="form-group">
                <label for="handoverNotes">Uwagi o przekazaniu obowiązków</label>
                <textarea 
                  id="handoverNotes" 
                  formControlName="handoverNotes"
                  class="form-control textarea"
                  rows="3"
                  placeholder="Informacje o przekazaniu zadań, kontaktach zastępczych..."
                  maxlength="500"></textarea>
                <small class="help-text">Informacje o tym, kto będzie wykonywał Twoje obowiązki</small>
              </div>
            </div>

            <!-- Substitute -->
            <div class="form-section" *ngIf="employees.length > 0">
              <h2>👤 Zastępstwo</h2>
              
              <div class="form-group">
                <label for="substituteUserId">Osoba zastępująca</label>
                <select 
                  id="substituteUserId" 
                  formControlName="substituteUserId"
                  class="form-control">
                  <option value="">Wybierz osobę zastępującą (opcjonalne)</option>
                  <option *ngFor="let employee of employees" 
                          [value]="employee.id"
                          [disabled]="employee.id === currentUserId">
                    {{ employee.firstName }} {{ employee.lastName }} ({{ employee.username }})
                  </option>
                </select>
                <small class="help-text">Wybierz kolegę/koleżankę, który będzie wykonywał Twoje zadania</small>
              </div>
            </div>

            <!-- Submit -->
            <div class="form-actions">
              <button type="button" class="btn-secondary" (click)="resetForm()">
                🔄 Resetuj formularz
              </button>
              <button type="button" class="btn-secondary" (click)="goBack()">
                Anuluj
              </button>
              <button 
                type="submit" 
                class="btn-primary"
                [disabled]="leaveForm.invalid || submitting">
                <span *ngIf="submitting">⏳ Wysyłanie...</span>
                <span *ngIf="!submitting">📤 Złóż wniosek urlopowy</span>
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  `
})
export class CreateLeaveRequestComponent implements OnInit {
  leaveForm!: FormGroup;
  submitting = false;
  error = '';
  success = '';
  
  leaveTypeOptions = LEAVE_TYPE_OPTIONS;
  employees: EmployeeSummaryResponse[] = [];
  currentUserId: number | null = null;
  minDate: string;

  // Calendar properties
  currentCalendarDate = new Date();
  calendarDays: CalendarDay[] = [];
  weekDays = ['Pon', 'Wto', 'Śro', 'Czw', 'Pią', 'Sob', 'Nie'];
  selectedStartDate: Date | null = null;
  selectedEndDate: Date | null = null;
  isSelectingRange = false;

  // Mock leave data - w przyszłości z API
  mockLeaves: any[] = [];
  
  // Leave balances
  leaveBalances: any = {};
  loadingBalances = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private leaveProposalService: LeaveProposalService,
    private employeeService: EmployeeService,
    private authService: AuthService
  ) {
    // Ustaw minimalną datę na dzisiaj
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
    
    this.initForm();
  }

  ngOnInit(): void {
    this.loadEmployees();
    const currentUser = this.authService.getCurrentUser();
    this.currentUserId = currentUser ? currentUser.id : null;
    this.generateCalendar();
    this.loadLeaves();
    this.loadLeaveBalances();
  }

  initForm(): void {
    this.leaveForm = this.fb.group({
      leaveType: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      title: [''],
      description: [''],
      handoverNotes: [''],
      substituteUserId: ['']
    }, { 
      validators: this.dateRangeValidator 
    });
  }

  dateRangeValidator(form: FormGroup) {
    const startDate = form.get('startDate')?.value;
    const endDate = form.get('endDate')?.value;
    
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      form.get('endDate')?.setErrors({ dateRange: true });
      return { dateRange: true };
    }
    
    return null;
  }

  loadEmployees(): void {
    this.employeeService.getAllEmployees().subscribe({
      next: (employees) => {
        this.employees = employees;
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        // Nie pokazujemy błędu - zastępstwo jest opcjonalne
      }
    });
  }

  getWorkingDays(): number {
    const startDate = new Date(this.leaveForm.get('startDate')?.value);
    const endDate = new Date(this.leaveForm.get('endDate')?.value);
    
    if (!startDate || !endDate) return 0;
    
    let workingDays = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      // Poniedziałek = 1, Piątek = 5
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workingDays;
  }

  includesWeekends(): boolean {
    const startDate = new Date(this.leaveForm.get('startDate')?.value);
    const endDate = new Date(this.leaveForm.get('endDate')?.value);
    
    if (!startDate || !endDate) return false;
    
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      // Sobota = 6, Niedziela = 0
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return true;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return false;
  }

  resetForm(): void {
    this.leaveForm.reset();
    this.error = '';
    this.success = '';
    this.clearSelectedDates();
  }

  onSubmit(): void {
    if (this.leaveForm.invalid) {
      this.leaveForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.error = '';
    this.success = '';

    const formData = this.leaveForm.value;
    
    const request: CreateLeaveProposalRequest = {
      leaveType: formData.leaveType,
      startDate: formData.startDate,
      endDate: formData.endDate,
      title: formData.title || undefined,
      description: formData.description || undefined,
      handoverNotes: formData.handoverNotes || undefined,
      substituteUserId: formData.substituteUserId || undefined
    };

    console.log('Submitting leave request:', request);

    this.leaveProposalService.createLeaveProposal(request).subscribe({
      next: (response) => {
        console.log('Leave request created:', response);
        this.submitting = false;
        this.success = response.message;
        
        // Przekieruj do listy wniosków po 2 sekundach
        setTimeout(() => {
          this.router.navigate(['/leave-requests']);
        }, 2000);
      },
      error: (error) => {
        console.error('Error creating leave request:', error);
        this.submitting = false;
        this.error = error.error?.message || 'Nie udało się złożyć wniosku urlopowego.';
      }
    });
  }

  // Calendar methods
  generateCalendar(): void {
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    
    // Pierwszy dzień miesiąca
    const firstDay = new Date(year, month, 1);
    // Ostatni dzień miesiąca
    const lastDay = new Date(year, month + 1, 0);
    
    // Pierwszy dzień tygodnia do wyświetlenia (poniedziałek)
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(firstDay.getDate() - daysFromMonday);
    
    // Ostatni dzień tygodnia do wyświetlenia (niedziela)
    const endDate = new Date(lastDay);
    const lastDayOfWeek = lastDay.getDay();
    const daysToSunday = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
    endDate.setDate(lastDay.getDate() + daysToSunday);
    
    this.calendarDays = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const day: CalendarDay = {
        date: new Date(currentDate),
        dayNumber: currentDate.getDate(),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: currentDate.getTime() === today.getTime(),
        isSelected: this.isDateSelected(currentDate),
        isRangeStart: this.isRangeStart(currentDate),
        isRangeEnd: this.isRangeEnd(currentDate),
        isInRange: this.isInRange(currentDate),
        hasLeave: this.hasLeaveOnDate(currentDate),
        isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6,
        leaves: this.getLeavesForDate(currentDate)
      };
      
      this.calendarDays.push(day);
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  previousMonth(): void {
    this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() - 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + 1);
    this.generateCalendar();
  }

  getMonthYearText(): string {
    const months = [
      'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
      'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ];
    return `${months[this.currentCalendarDate.getMonth()]} ${this.currentCalendarDate.getFullYear()}`;
  }

  selectDate(day: CalendarDay): void {
    if (!day.isCurrentMonth || day.date < new Date(this.minDate)) {
      return;
    }

    if (!this.selectedStartDate || this.isSelectingRange) {
      // Wybieranie początkowej daty
      this.selectedStartDate = new Date(day.date);
      this.selectedEndDate = null;
      this.isSelectingRange = false;
      
      // Ustaw w formularzu
      this.leaveForm.patchValue({
        startDate: this.formatDateForInput(day.date)
      });
    } else if (!this.selectedEndDate) {
      // Wybieranie końcowej daty
      if (day.date >= this.selectedStartDate) {
        this.selectedEndDate = new Date(day.date);
        
        // Ustaw w formularzu
        this.leaveForm.patchValue({
          endDate: this.formatDateForInput(day.date)
        });
      } else {
        // Jeśli wybrano wcześniejszą datę, ustaw ją jako nową początkową
        this.selectedStartDate = new Date(day.date);
        this.selectedEndDate = null;
        
        this.leaveForm.patchValue({
          startDate: this.formatDateForInput(day.date),
          endDate: ''
        });
      }
    } else {
      // Jeśli już mamy obie daty, rozpocznij wybór od nowa
      this.selectedStartDate = new Date(day.date);
      this.selectedEndDate = null;
      
      this.leaveForm.patchValue({
        startDate: this.formatDateForInput(day.date),
        endDate: ''
      });
    }
    
    this.generateCalendar();
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private isDateSelected(date: Date): boolean {
    if (this.selectedStartDate && this.isSameDate(date, this.selectedStartDate)) {
      return true;
    }
    if (this.selectedEndDate && this.isSameDate(date, this.selectedEndDate)) {
      return true;
    }
    return false;
  }

  private isRangeStart(date: Date): boolean {
    return this.selectedStartDate ? this.isSameDate(date, this.selectedStartDate) : false;
  }

  private isRangeEnd(date: Date): boolean {
    return this.selectedEndDate ? this.isSameDate(date, this.selectedEndDate) : false;
  }

  private isInRange(date: Date): boolean {
    if (!this.selectedStartDate || !this.selectedEndDate) {
      return false;
    }
    return date > this.selectedStartDate && date < this.selectedEndDate;
  }

  private isSameDate(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  private hasLeaveOnDate(date: Date): boolean {
    return this.mockLeaves.some(leave => {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      return date >= startDate && date <= endDate;
    });
  }

  private getLeavesForDate(date: Date): any[] {
    return this.mockLeaves.filter(leave => {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      return date >= startDate && date <= endDate;
    });
  }

  loadLeaves(): void {
    this.leaveProposalService.getAllLeaveProposals().subscribe({
      next: (leaves) => {
        this.mockLeaves = leaves;
      }
    });
  }

  // Quick date selection methods
  setDatesFromToday(days: number): void {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + days - 1);

    this.selectedStartDate = new Date(today);
    this.selectedEndDate = new Date(endDate);

    this.leaveForm.patchValue({
      startDate: this.formatDateForInput(today),
      endDate: this.formatDateForInput(endDate)
    });

    this.generateCalendar();
  }

  // Clear selected dates method
  clearSelectedDates(): void {
    this.selectedStartDate = null;
    this.selectedEndDate = null;
    this.isSelectingRange = false;
    
    this.leaveForm.patchValue({
      startDate: '',
      endDate: ''
    });
    
    this.generateCalendar();
  }

  // Leave balance methods
  loadLeaveBalances(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    this.loadingBalances = true;
    
    // Mock data - w przyszłości z API employeeService.getLeaveBalances(currentUser.id)
    setTimeout(() => {
      this.leaveBalances = {
        [LeaveType.ANNUAL]: { allocated: 26, used: 5, remaining: 21 },
        [LeaveType.SICK]: { allocated: 30, used: 2, remaining: 28 },
        [LeaveType.UNPAID]: { allocated: 365, used: 0, remaining: 365 },
        [LeaveType.PARENTAL]: { allocated: 365, used: 0, remaining: 365 },
        [LeaveType.MATERNITY]: { allocated: 365, used: 0, remaining: 365 },
        [LeaveType.PATERNITY]: { allocated: 10, used: 0, remaining: 10 },
        [LeaveType.COMPASSIONATE]: { allocated: 2, used: 0, remaining: 2 },
        [LeaveType.STUDY]: { allocated: 6, used: 0, remaining: 6 },
        [LeaveType.SABBATICAL]: { allocated: 365, used: 0, remaining: 365 },
        [LeaveType.OTHER]: { allocated: 5, used: 0, remaining: 5 }
      };
      this.loadingBalances = false;
    }, 1000);
  }

  getSelectedTypeBalance(): any {
    const selectedType = this.leaveForm.get('leaveType')?.value;
    if (!selectedType || !this.leaveBalances[selectedType]) return null;
    return this.leaveBalances[selectedType];
  }

  getAvailableDays(): number {
    const balance = this.getSelectedTypeBalance();
    return balance ? balance.remaining : 0;
  }

  getUsedDays(): number {
    const balance = this.getSelectedTypeBalance();
    return balance ? balance.used : 0;
  }

  getTotalDays(): number {
    const balance = this.getSelectedTypeBalance();
    return balance ? balance.allocated : 0;
  }

  // Helper methods for selected leave type
  getSelectedTypeLabel(): string {
    const selectedType = this.leaveForm.get('leaveType')?.value;
    if (!selectedType) return '';
    return LEAVE_TYPE_LABELS[selectedType as LeaveType] || '';
  }

  getSelectedTypeIcon(): string {
    const selectedType = this.leaveForm.get('leaveType')?.value;
    if (!selectedType) return '';
    const option = this.leaveTypeOptions.find(opt => opt.value === selectedType);
    return option?.icon || '';
  }

  getSelectedTypeDescription(): string {
    const selectedType = this.leaveForm.get('leaveType')?.value;
    if (!selectedType) return '';
    const option = this.leaveTypeOptions.find(opt => opt.value === selectedType);
    return option?.description || '';
  }

  getLeaveTypeLabel(type: LeaveType): string {
    return LEAVE_TYPE_LABELS[type] || type;
  }

  getLeaveTypeColor(type: LeaveType): string {
    const option = this.leaveTypeOptions.find(opt => opt.value === type);
    return option?.color || '#64748b';
  }

  formatDateRange(): string {
    const startDate = this.leaveForm.get('startDate')?.value;
    const endDate = this.leaveForm.get('endDate')?.value;
    
    if (!startDate || !endDate) return '';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return `${start.toLocaleDateString('pl-PL')} - ${end.toLocaleDateString('pl-PL')}`;
  }

  goBack(): void {
    this.router.navigate(['/leave-requests']);
  }
}