import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LeaveProposalService } from '../../services/leave-proposal.service';
import { AuthService } from '../../services/auth.service';
import {
  EmployeeLeaveProposalResponse,
  LeaveProposalStatus,
  AcceptLeaveProposalRequest,
  RejectLeaveProposalRequest,
  ProposalHistoryResponse,
  LeaveStatsResponse,
  LeaveCalendarUser,
  LEAVE_TYPE_LABELS,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_OPTIONS
} from '../../models/leave-proposal.models';

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isInRange: boolean;
  isStartDate: boolean;
  isEndDate: boolean;
  employeesOnLeave: LeaveCalendarUser[];
  hasLeaves: boolean;
}

@Component({
  selector: 'app-leave-proposal-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './leave-proposal-details.component.html',
  styleUrl: './leave-proposal-details.component.css'
})
export class LeaveProposalDetailsComponent implements OnInit {
  proposalId!: number;
  proposal: EmployeeLeaveProposalResponse | null = null;
  proposalHistory: ProposalHistoryResponse[] = [];
  leaveStats: LeaveStatsResponse | null = null;

  loading = false;
  historyLoading = false;
  error = '';
  successMessage = '';

  // Calendar
  currentDate = new Date();
  calendarDays: CalendarDay[] = [];
  weekdays = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie'];
  // View toggle for right panel
  viewMode: 'CALENDAR' | 'TABLE' = 'CALENDAR';

  // Forms
  approvalForm: FormGroup;
  rejectionForm: FormGroup;
  showApprovalForm = false;
  showRejectionForm = false;
  approvingProposal = false;
  rejectingProposal = false;

  // User permissions
  canApprove = false;
  showDebugInfo = true; // Set to false in production

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private leaveProposalService: LeaveProposalService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.approvalForm = this.fb.group({
      approverComments: ['']
    });

    this.rejectionForm = this.fb.group({
      rejectionReason: ['', [Validators.required]],
      approverComments: ['']
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const idParam = params['id'];
      this.proposalId = +idParam;

      // Walidacja parametru ID
      if (!idParam || isNaN(this.proposalId) || this.proposalId <= 0) {
        console.error('Invalid proposal ID parameter:', idParam);
        this.error = 'Nieprawidłowe ID wniosku';
        this.router.navigate(['/leave-requests']);
        return;
      }

      this.loadProposalDetails();
    });

    this.checkUserPermissions();
  }

  checkUserPermissions(): void {
    const currentUser = this.authService.getCurrentUser();
    console.log('🔍 Checking user permissions - Current user:', currentUser);
    console.log('🔍 User authenticated:', this.authService.isAuthenticated());

    if (currentUser) {
      console.log('🔍 User roles:', currentUser.roles);
      const hasRequiredRole = currentUser.roles?.some(role => ['ROLE_ADMIN', 'ROLE_HR', 'ROLE_MANAGER'].includes(role)) || false;
      console.log('🔍 Has required role (ADMIN/HR/MANAGER):', hasRequiredRole);
      this.canApprove = hasRequiredRole;
    } else {
      console.log('🔍 No current user found');
      this.canApprove = false;
    }

    console.log('🔍 Final canApprove value:', this.canApprove);
  }

  loadProposalDetails(): void {
    this.loading = true;
    this.error = '';

    console.log('📋 Loading proposal details for ID:', this.proposalId);

    this.leaveProposalService.getLeaveProposal(this.proposalId).subscribe({
      next: (proposal) => {
        console.log('📋 Proposal loaded successfully:', proposal);
        this.proposal = proposal;
        this.loading = false;

        // Load additional data
        this.loadProposalHistory();
        this.loadLeaveStats();
        this.generateCalendar();
      },
      error: (error) => {
        console.error('❌ Error loading proposal:', error);
        this.error = error.error?.message || 'Nie udało się pobrać szczegółów wniosku.';
        this.loading = false;
      }
    });
  }

  loadProposalHistory(): void {
    this.historyLoading = true;

    this.leaveProposalService.getProposalHistory(this.proposalId).subscribe({
      next: (history) => {
        this.proposalHistory = history;
        this.historyLoading = false;
      },
      error: (error) => {
        console.error('Error loading history:', error);
        this.historyLoading = false;
        // Don't show error for history - it's not critical
      }
    });
  }

  loadLeaveStats(): void {
    if (!this.proposal) return;

    this.leaveProposalService.getLeaveStats(this.proposal.startDate, this.proposal.endDate).subscribe({
      next: (stats) => {
        this.leaveStats = stats;
      },
      error: (error) => {
        console.error('Error loading leave stats:', error);
        // Don't show error for stats - it's not critical
      }
    });
  }

  // Calendar methods
  generateCalendar(): void {
    if (!this.proposal) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);

    // Start from Monday
    const dayOfWeek = (firstDay.getDay() + 6) % 7;
    startDate.setDate(startDate.getDate() - dayOfWeek);

    this.calendarDays = [];
    const proposalStart = new Date(this.proposal.startDate);
    const proposalEnd = new Date(this.proposal.endDate);

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const isCurrentMonth = date.getMonth() === month;
      const isToday = this.isSameDate(date, new Date());
      const isInRange = this.isDateInRange(date, proposalStart, proposalEnd);
      const isStartDate = this.isSameDate(date, proposalStart);
      const isEndDate = this.isSameDate(date, proposalEnd);

      this.calendarDays.push({
        date: new Date(date),
        day: date.getDate(),
        isCurrentMonth,
        isToday,
        isSelected: false,
        isInRange,
        isStartDate,
        isEndDate,
        employeesOnLeave: [], // Will be populated by leave calendar data
        hasLeaves: false
      });
    }

    // Load calendar data for this month
    this.loadCalendarData();
  }

  loadCalendarData(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth() + 1;

    this.leaveProposalService.getLeaveCalendar(year, month).subscribe({
      next: (calendarData) => {
        // Update calendar days with leave data
        this.calendarDays.forEach(day => {
          const dateStr = day.date.toISOString().split('T')[0];
          const dayData = calendarData.find(d => d.date === dateStr);
          if (dayData) {
            day.employeesOnLeave = dayData.users || [];
            day.hasLeaves = day.employeesOnLeave.length > 0;
          }
        });
      },
      error: (error) => {
        console.error('Error loading calendar data:', error);
      }
    });
  }

  previousMonth(): void {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.generateCalendar();
  }

  getMonthYearDisplay(): string {
    return this.currentDate.toLocaleDateString('pl-PL', {
      month: 'long',
      year: 'numeric'
    });
  }

  // Helpers for TABLE view
  formatDayLabel(d: Date): string {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
  }
  weekdayLabel(d: Date): string {
    // 0=Sun..6=Sat -> map to PL short names with Mon first
    const map = ['Nie', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
    const idx = d.getDay();
    return map[idx] || '';
  }

  // Days to render in TABLE view: only current month, preserving order
  tableDays(): CalendarDay[] {
    return (this.calendarDays || []).filter(d => d.isCurrentMonth);
  }

  // Approval methods
  approveProposal(): void {
    if (!this.proposal || this.approvingProposal) return;

    this.approvingProposal = true;
    const request: AcceptLeaveProposalRequest = {
      approverComments: this.approvalForm.get('approverComments')?.value || undefined
    };

    this.leaveProposalService.acceptLeaveProposal(this.proposal.id, request).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.showApprovalForm = false;
        this.approvingProposal = false;
        this.approvalForm.reset();

        // Reload proposal details
        setTimeout(() => {
          this.loadProposalDetails();
          this.successMessage = '';
        }, 2000);
      },
      error: (error) => {
        console.error('Error approving proposal:', error);
        this.error = error.error?.message || 'Nie udało się zatwierdzić wniosku.';
        this.approvingProposal = false;
      }
    });
  }

  rejectProposal(): void {
    if (!this.proposal || this.rejectingProposal || this.rejectionForm.invalid) return;

    this.rejectingProposal = true;
    const formValue = this.rejectionForm.value;
    const request: RejectLeaveProposalRequest = {
      rejectionReason: formValue.rejectionReason,
      approverComments: formValue.approverComments || undefined
    };

    this.leaveProposalService.rejectLeaveProposal(this.proposal.id, request).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.showRejectionForm = false;
        this.rejectingProposal = false;
        this.rejectionForm.reset();

        // Reload proposal details
        setTimeout(() => {
          this.loadProposalDetails();
          this.successMessage = '';
        }, 2000);
      },
      error: (error) => {
        console.error('Error rejecting proposal:', error);
        this.error = error.error?.message || 'Nie udało się odrzucić wniosku.';
        this.rejectingProposal = false;
      }
    });
  }

  closeApprovalForm(event?: Event): void {
    if (event && (event.target as HTMLElement).classList.contains('modal-content')) {
      return;
    }
    this.showApprovalForm = false;
    this.approvalForm.reset();
  }

  closeRejectionForm(event?: Event): void {
    if (event && (event.target as HTMLElement).classList.contains('modal-content')) {
      return;
    }
    this.showRejectionForm = false;
    this.rejectionForm.reset();
  }

  // Helper methods
  getOverlapDaysCount(): number {
    return this.leaveStats?.overlappingRequests?.length || 0;
  }

  getStatusClass(status: LeaveProposalStatus): string {
    return status.toLowerCase();
  }

  getStatusLabel(status: LeaveProposalStatus): string {
    return LEAVE_STATUS_LABELS[status] || status;
  }

  getStatusIcon(status: LeaveProposalStatus): string {
    const icons: Record<LeaveProposalStatus, string> = {
      SUBMITTED: '⏳',
      IN_REVIEW: '🔎',
      APPROVED: '✅',
      REJECTED: '❌',
      CANCELLED: '🚫',
      WITHDRAWN: '↩️',
      DRAFT: '📝'
    };
    return icons[status] || '❓';
  }

  getLeaveTypeLabel(type: string): string {
    return LEAVE_TYPE_LABELS[type as keyof typeof LEAVE_TYPE_LABELS] || type;
  }

  getLeaveTypeIcon(type: string): string {
    const option = LEAVE_TYPE_OPTIONS.find(opt => opt.value === type);
    return option?.icon || '📝';
  }

  getLeaveTypeColor(type: string): string {
    const option = LEAVE_TYPE_OPTIONS.find(opt => opt.value === type);
    return option?.color || '#64748b';
  }

  getChangeTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      CREATED: '📝',
      UPDATED: '✏️',
      STATUS_CHANGED: '🔄',
      APPROVED: '✅',
      REJECTED: '❌',
      CANCELLED: '🚫',
      WITHDRAWN: '↩️',
      COMMENT_ADDED: '💬'
    };
    return icons[type] || '📋';
  }

  getChangeTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      CREATED: 'Utworzono',
      UPDATED: 'Zaktualizowano',
      STATUS_CHANGED: 'Zmieniono status',
      APPROVED: 'Zatwierdzono',
      REJECTED: 'Odrzucono',
      CANCELLED: 'Anulowano',
      WITHDRAWN: 'Wycofano',
      COMMENT_ADDED: 'Dodano komentarz'
    };
    return labels[type] || type;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    // Zamiana '-' na '/' dla lepszej kompatybilności
    const safeDateString = dateString.replace(/-/g, '/');
    const date = new Date(safeDateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pl-PL');
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return '';
    const safeDateString = dateString.replace(/-/g, '/');
    const date = new Date(safeDateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pl-PL') + ' ' +
           date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  }

  isSameDate(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  isDateInRange(date: Date, start: Date, end: Date): boolean {
    return date >= start && date <= end;
  }

  // User actions
  canEditOwnProposal(): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !this.proposal) return false;

    // User can edit their own proposal if it's SUBMITTED
    const isOwnProposal = currentUser.id === this.proposal.userId;
    const isSubmitted = this.proposal.status === LeaveProposalStatus.SUBMITTED;

    console.log('🔍 Can edit own proposal:', {
      isOwnProposal,
      isSubmitted,
      currentUserId: currentUser.id,
      proposalUserId: this.proposal.userId,
      proposalStatus: this.proposal.status
    });

    return isOwnProposal && isSubmitted;
  }

  editProposal(): void {
    if (this.proposal) {
      this.router.navigate(['/leave-requests', this.proposal.id, 'edit']);
    }
  }

  withdrawProposal(): void {
    if (!this.proposal) return;

    const confirmed = confirm('Czy na pewno chcesz wycofać ten wniosek urlopowy?');
    if (confirmed) {
      // TODO: Implement withdraw functionality
      // For now, we'll use reject with a special reason
      const request = {
        rejectionReason: 'Wniosek wycofany przez użytkownika',
        approverComments: 'Automatyczne wycofanie wniosku przez właściciela'
      };

      this.leaveProposalService.rejectLeaveProposal(this.proposal.id, request).subscribe({
        next: (response) => {
          this.successMessage = 'Wniosek został pomyślnie wycofany.';
          setTimeout(() => {
            this.loadProposalDetails();
            this.successMessage = '';
          }, 2000);
        },
        error: (error) => {
          console.error('Error withdrawing proposal:', error);
          this.error = error.error?.message || 'Nie udało się wycofać wniosku.';
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/leave-requests']);
  }
}
