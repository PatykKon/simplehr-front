import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LeaveProposalService } from '../../services/leave-proposal.service';
import { CreateLeaveProposalRequest, EmployeeLeavesResponse } from '../../models/leave-proposal.models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-leave-request-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './leave-request-create.component.html',
  styleUrls: ['./leave-request-create.component.css']
})
export class LeaveRequestCreateComponent implements OnInit {
  leaveForm: FormGroup;
  submitting = false;
  error: string | null = null;
  // Kalendarz
  currentMonth = new Date();
  selectedStartDate: Date | null = null;
  selectedEndDate: Date | null = null;
  selectingRange = false;
  
  // Osoby na urlopie z API
  peopleOnLeave: { [key: string]: string[] } = {};

  // Typy urlopów dostępne w select
  leaveTypes = [
    { value: 'ANNUAL', label: 'Urlop wypoczynkowy' },
    { value: 'SICK', label: 'Urlop chorobowy' },
    { value: 'MATERNITY', label: 'Urlop macierzyński' },
    { value: 'PATERNITY', label: 'Urlop ojcowski' },
    { value: 'PARENTAL', label: 'Urlop rodzicielski' },
    { value: 'UNPAID', label: 'Urlop bezpłatny' },
    { value: 'OTHER', label: 'Inny' }
  ];

  constructor(
    private fb: FormBuilder,
    private leaveProposalService: LeaveProposalService,
    private authService: AuthService,
    public router: Router
  ) {
    console.log('=== Services Injection Check ===');
    console.log('FormBuilder:', !!this.fb);
    console.log('LeaveProposalService:', !!this.leaveProposalService);
    console.log('AuthService:', !!this.authService);
    console.log('Router:', !!this.router);
    console.log('AuthService methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.authService)));
    console.log('=== End Services Check ===');
    this.leaveForm = this.fb.group({
      leaveType: ['', [Validators.required]],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      requestedDays: [1, [Validators.required, Validators.min(1)]],
      reason: ['', [Validators.minLength(10)]],
      urgentRequest: [false]
    });

    // Nasłuchiwanie zmian dat w formularzu
    this.leaveForm.get('startDate')?.valueChanges.subscribe(() => {
      this.onFormDateChange();
    });
    
    this.leaveForm.get('endDate')?.valueChanges.subscribe(() => {
      this.onFormDateChange();
    });
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      console.warn('User is not authenticated, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    
    this.loadLeaveCalendar();
  }

  onSubmit(): void {
    if (this.leaveForm.valid && !this.submitting) {
      this.submitting = true;
      this.error = null;

      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        this.error = 'Nie można określić użytkownika';
        this.submitting = false;
        return;
      }

      const token = this.authService.getToken();
      
      if (!token) {
        this.error = 'Brak tokena autoryzacji. Zaloguj się ponownie.';
        this.submitting = false;
        this.router.navigate(['/login']);
        return;
      }
      
      // Sprawdź czy token nie wygasł
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (tokenPayload.exp <= currentTime) {
          this.error = 'Token wygasł. Zaloguj się ponownie.';
          this.submitting = false;
          this.router.navigate(['/login']);
          return;
        }
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    

      const formValue = this.leaveForm.value;
      const request: CreateLeaveProposalRequest = {
        leaveType: formValue.leaveType,
        startDate: formValue.startDate,
        endDate: formValue.endDate,
        title: formValue.title,
        description: formValue.description,
        handoverNotes: formValue.handoverNotes,
        substituteUserId: formValue.substituteUserId
      };

      console.log('Sending leave proposal request:', request);

      // Sprawdź czy backend jest dostępny
      if (!this.isBackendAvailable()) {
        this.handleOfflineSubmission(request);
        return;
      }

      this.leaveProposalService.createLeaveProposal(request).subscribe({
        next: () => {
          this.router.navigate(['/leave-requests']);
        },
        error: (error) => {
          console.error('Error creating leave request:', error);
          
          if (error.status === 403) {
            this.error = 'Brak uprawnień do tworzenia wniosków. Skontaktuj się z administratorem.';
          } else if (error.status === 401) {
            this.error = 'Sesja wygasła. Zaloguj się ponownie.';
            this.router.navigate(['/login']);
          } else if (error.status === 0) {
            this.error = 'Backend nie jest dostępny. Sprawdź czy serwer działa.';
          } else {
            this.error = `Błąd podczas tworzenia wniosku (${error.status}). Spróbuj ponownie.`;
          }
          
          this.submitting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/leave-requests']);
  }

  getFieldError(fieldName: string): string | null {
    const field = this.leaveForm.get(fieldName);
    if (field && field.invalid && (field.dirty || field.touched)) {
      if (field.errors?.['required']) {
        return 'To pole jest wymagane';
      }
      if (field.errors?.['minlength']) {
        return `Minimum ${field.errors['minlength'].requiredLength} znaków`;
      }
    }
    return null;
  }

  // Metody kalendarza
  getCalendarDays(): Date[] {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    
    // Pierwszy dzień miesiąca
    const firstDay = new Date(year, month, 1);
    // Ostatni dzień miesiąca
    const lastDay = new Date(year, month + 1, 0);
    
    // Dni poprzedniego miesiąca do wypełnienia pierwszego tygodnia
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Poniedziałek jako pierwszy dzień
    startDate.setDate(firstDay.getDate() - mondayOffset);
    
    // Generuj 42 dni (6 tygodni x 7 dni)
    const days: Date[] = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }

  formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  formatDateDisplay(date: Date): string {
    return date.toLocaleDateString('pl-PL');
  }

  isCurrentMonth(date: Date): boolean {
    return date.getMonth() === this.currentMonth.getMonth() && 
           date.getFullYear() === this.currentMonth.getFullYear();
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  isPastDate(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  isSelected(date: Date): boolean {
    if (!this.selectedStartDate) return false;
    
    const dateStr = date.toDateString();
    const startStr = this.selectedStartDate.toDateString();
    
    if (!this.selectedEndDate) {
      return dateStr === startStr;
    }
    
    const endStr = this.selectedEndDate.toDateString();
    return dateStr === startStr || dateStr === endStr;
  }

  isInRange(date: Date): boolean {
    if (!this.selectedStartDate || !this.selectedEndDate) return false;
    
    const dateTime = date.getTime();
    const startTime = this.selectedStartDate.getTime();
    const endTime = this.selectedEndDate.getTime();
    
    return dateTime >= startTime && dateTime <= endTime;
  }

  getPeopleOnLeave(date: Date): string[] {
    const dateKey = this.formatDateKey(date);
    return this.peopleOnLeave[dateKey] || [];
  }

  onDateClick(date: Date): void {
    if (this.isPastDate(date)) return;

    if (!this.selectedStartDate || (this.selectedStartDate && this.selectedEndDate)) {
      // Rozpocznij nowy wybór
      this.selectedStartDate = new Date(date);
      this.selectedEndDate = null;
      this.selectingRange = true;
    } else if (this.selectedStartDate && !this.selectedEndDate) {
      // Zakończ wybór zakresu
      if (date >= this.selectedStartDate) {
        this.selectedEndDate = new Date(date);
      } else {
        // Jeśli wybrano wcześniejszą datę, zamień miejscami
        this.selectedEndDate = new Date(this.selectedStartDate);
        this.selectedStartDate = new Date(date);
      }
      this.selectingRange = false;
      this.updateFormDates();
    }
  }

  updateFormDates(): void {
    if (this.selectedStartDate && this.selectedEndDate) {
      const startDateStr = this.formatDateKey(this.selectedStartDate);
      const endDateStr = this.formatDateKey(this.selectedEndDate);
      
      this.leaveForm.patchValue({
        startDate: startDateStr,
        endDate: endDateStr,
        requestedDays: this.calculateDaysBetween(this.selectedStartDate, this.selectedEndDate)
      });
    }
  }

  calculateDaysBetween(startDate: Date, endDate: Date): number {
    // Ustawiamy godziny na 0 aby uniknąć problemów z strefami czasowymi
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 bo liczymy włącznie
    return Math.max(1, diffDays); // Minimum 1 dzień
  }

  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.loadLeaveCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.loadLeaveCalendar();
  }

  loadLeaveCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth() + 1; // +1 bo miesięce w JS są 0-indexed
    
    console.log(`Loading leave calendar for ${year}-${month}`);
    
    this.leaveProposalService.getEmployeesLeavesByMonth(year, month).subscribe({
      next: (response: EmployeeLeavesResponse) => {
        // Konwertuj dane z API na format używany przez komponent
        this.peopleOnLeave = {};
        
        response.employees.forEach(employee => {
          const fullName = `${employee.firstName} ${employee.lastName}`;
          employee.leaveDays.forEach(leaveDay => {
            const dateKey = leaveDay.date;
            if (!this.peopleOnLeave[dateKey]) {
              this.peopleOnLeave[dateKey] = [];
            }
            this.peopleOnLeave[dateKey].push(fullName);
          });
        });
      },
      error: (error) => {
        console.warn('API not available, using mock data for calendar:', error);
        // Fallback do mock danych jeśli API nie działa
        this.loadMockCalendarData();
      }
    });
  }

  loadMockCalendarData(): void {
    // Mock dane na wypadek problemów z API (tylko osoby, które istnieją w bazie)
    this.peopleOnLeave = {
      '2025-10-28': ['Jan Kowalski'],
      '2025-10-29': ['Jan Kowalski', 'Anna Nowak'],
      '2025-10-30': ['Anna Nowak'],
      '2025-11-01': ['Piotr Wiśniewski'],
      '2025-11-08': ['Tomasz Lewandowski'],
      '2025-11-11': ['Jan Kowalski', 'Piotr Wiśniewski'],
      '2025-11-12': ['Jan Kowalski', 'Piotr Wiśniewski'],
      '2025-11-13': ['Jan Kowalski']
    };
  }

  getMonthYearDisplay(): string {
    return this.currentMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  }

  clearSelection(): void {
    this.selectedStartDate = null;
    this.selectedEndDate = null;
    this.selectingRange = false;
    this.leaveForm.patchValue({
      startDate: '',
      endDate: '',
      requestedDays: 1
    });
  }

  onFormDateChange(): void {
    const startDateStr = this.leaveForm.get('startDate')?.value;
    const endDateStr = this.leaveForm.get('endDate')?.value;
    
    if (startDateStr && endDateStr) {
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      
      if (startDate <= endDate) {
        const days = this.calculateDaysBetween(startDate, endDate);
        this.leaveForm.patchValue({ requestedDays: days }, { emitEvent: false });
        
        // Zaktualizuj również wybór w kalendarzu
        this.selectedStartDate = startDate;
        this.selectedEndDate = endDate;
      }
    }
  }

  isBackendAvailable(): boolean {
    // Proste sprawdzenie - czy ostatnie żądanie API się powiodło
    // W rzeczywistej aplikacji można dodać bardziej zaawansowaną logikę
    return true; // Zawsze próbuj wysłać
  }

  handleOfflineSubmission(request: CreateLeaveProposalRequest): void {
    // Symulacja offline submission
    console.log('Backend not available, simulating successful submission');
    
    // Zapisz w localStorage jako pending
    const pendingRequests = JSON.parse(localStorage.getItem('pendingLeaveRequests') || '[]');
    pendingRequests.push({
      ...request,
      id: Date.now(), // Tymczasowe ID
      status: 'PENDING_SYNC',
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('pendingLeaveRequests', JSON.stringify(pendingRequests));
    
    // Pokaż komunikat sukcesu
    alert('Wniosek został zapisany i zostanie wysłany gdy serwer będzie dostępny.');
    this.submitting = false;
    this.router.navigate(['/leave-requests']);
  }
}