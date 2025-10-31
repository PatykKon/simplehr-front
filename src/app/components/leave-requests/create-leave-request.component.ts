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
  LEAVE_TYPE_LABELS,
  EmployeeLeavesResponse,
  EmployeeLeaveInfo
} from '../../models/leave-proposal.models';
import { EmployeeSummaryResponse } from '../../models/employee.models';
import { BehaviorSubject } from 'rxjs';

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
  leaves?: CalendarLeaveEntry[];
}

interface CalendarLeaveEntry {
  date: string;
  leaveType: LeaveType;
  employeeId: number;
  userName: string;
}

@Component({
  selector: 'app-create-leave-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  styleUrls: ['./create-leave-request.component.css'],
  templateUrl: './create-leave-request.component.html'
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
  leavesLoading = false;
  leavesError: string | null = null;
  private readonly currentLeavesSubject = new BehaviorSubject<CalendarLeaveEntry[]>([]);
  readonly currentLeaves$ = this.currentLeavesSubject.asObservable();
  private readonly monthLeavesCache = new Map<string, CalendarLeaveEntry[]>();
  private currentMonthLeaveIndex = new Map<string, CalendarLeaveEntry[]>();
  
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
    this.loadLeavesForCurrentMonth();
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
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() - 1,
      1
    );
    this.currentMonthLeaveIndex = new Map();
    this.generateCalendar();
    this.loadLeavesForCurrentMonth();
  }

  nextMonth(): void {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() + 1,
      1
    );
    this.currentMonthLeaveIndex = new Map();
    this.generateCalendar();
    this.loadLeavesForCurrentMonth();
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
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    const key = this.getDateKey(date);
    return this.currentMonthLeaveIndex.has(key);
  }

  private getLeavesForDate(date: Date): CalendarLeaveEntry[] {
    const key = this.getDateKey(date);
    return this.currentMonthLeaveIndex.get(key) || [];
  }

  private loadLeavesForCurrentMonth(): void {
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth() + 1;
    const cacheKey = `${year}-${month.toString().padStart(2, '0')}`;

    const cached = this.monthLeavesCache.get(cacheKey);
    if (cached) {
      this.leavesLoading = false;
      this.leavesError = null;
      this.setCurrentMonthLeaves(cached);
      return;
    }

    this.leavesLoading = true;
    this.leavesError = null;

    this.leaveProposalService.getEmployeesLeavesByMonth(year, month).subscribe({
      next: (response) => {
        const leaves = this.flattenLeavesResponse(response);
        this.monthLeavesCache.set(cacheKey, leaves);
        this.leavesLoading = false;
        this.leavesError = null;
        this.setCurrentMonthLeaves(leaves);
      },
      error: (error) => {
        console.error('Failed to load leaves for month', error);
        this.leavesLoading = false;
        this.leavesError = 'Nie udało się załadować urlopów dla wybranego miesiąca.';
        this.setCurrentMonthLeaves([]);
      }
    });
  }

  private setCurrentMonthLeaves(leaves: CalendarLeaveEntry[]): void {
  this.currentLeavesSubject.next(leaves);
    this.currentMonthLeaveIndex = new Map();

    leaves.forEach(leave => {
      const key = this.normalizeDateString(leave.date);
      const existing = this.currentMonthLeaveIndex.get(key);
      if (existing) {
        existing.push(leave);
      } else {
        this.currentMonthLeaveIndex.set(key, [leave]);
      }
    });

    this.generateCalendar();
  }

  private flattenLeavesResponse(response: EmployeeLeavesResponse): CalendarLeaveEntry[] {
    if (!response || !response.employees?.length) {
      return [];
    }

    const entries: CalendarLeaveEntry[] = [];
    response.employees.forEach((employee: EmployeeLeaveInfo) => {
      const displayName = this.buildEmployeeName(employee);
      (employee.leaveDays || []).forEach(leaveDay => {
        if (!leaveDay?.date) {
          return;
        }
        entries.push({
          date: this.normalizeDateString(leaveDay.date),
          leaveType: leaveDay.leaveType,
          employeeId: employee.employeeId,
          userName: displayName
        });
      });
    });

    return entries;
  }

  private buildEmployeeName(employee: EmployeeLeaveInfo): string {
    const first = (employee.firstName || '').trim();
    const last = (employee.lastName || '').trim();
    const fullName = `${first} ${last}`.trim();
    if (fullName) {
      return fullName;
    }
    return employee.email || `#${employee.employeeId}`;
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
    if (!startDate || !endDate) {
      return '';
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString('pl-PL')} - ${end.toLocaleDateString('pl-PL')}`;
  }

  selectedSubstituteName(): string {
    const controlValue = this.leaveForm.get('substituteUserId')?.value;
    if (!controlValue) {
      return 'Brak';
    }

    const id = Number(controlValue);
    if (!id) {
      return 'Brak';
    }

    const employee = this.employees.find(emp => emp.id === id);
    if (!employee) {
      return `#${id}`;
    }

    const fullName = `${(employee.firstName || '').trim()} ${(employee.lastName || '').trim()}`.trim();
    return fullName || employee.username || `#${id}`;
  }

  private getDateKey(date: Date): string {
    return this.normalizeDateString(this.formatDateForInput(date));
  }

  private normalizeDateString(date: string): string {
    if (!date) {
      return '';
    }
    const plainDate = date.split('T')[0];
    const [year, month, day] = plainDate.split('-');
    if (year && month && day) {
      return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return plainDate;
  }

  getCurrentStep(): number {
    if (!this.isStepCompleted(1)) {
      return 1;
    }
    if (!this.isStepCompleted(2)) {
      return 2;
    }
    return 3;
  }

  isStepCompleted(step: number): boolean {
    switch (step) {
      case 1:
        return !!(this.leaveForm.get('leaveType')?.valid);
      case 2:
        return !!(this.leaveForm.get('startDate')?.valid && this.leaveForm.get('endDate')?.valid);
      case 3:
        return this.leaveForm.valid;
      default:
        return false;
    }
  }

  isStepActive(step: number): boolean {
    return this.getCurrentStep() === step;
  }

  goBack(): void {
    this.router.navigate(['/leave-requests']);
  }
}