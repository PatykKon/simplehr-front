import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/auth.models';
import { LeaveProposalService } from '../../services/leave-proposal.service';
import { WorkScheduleService } from '../../services/work-schedule.service';
import {
  EmployeeLeaveProposalResponse,
  LeaveProposalStatus,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_LABELS
} from '../../models/leave-proposal.models';
import {
  WorkScheduleEntryResponse,
  WorkScheduleResponse
} from '../../models/work-schedule.models';

interface LeaveSummaryInfo {
  totalRequests: number;
  approvedCount: number;
  approvedDays: number;
  pendingCount: number;
  upcomingCount: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  currentUser = signal<User | null>(null);
  pendingRequests = signal<EmployeeLeaveProposalResponse[]>([]);
  pendingLoading = signal<boolean>(false);
  pendingError = signal<string | null>(null);

  currentSchedule = signal<WorkScheduleResponse | null>(null);
  scheduleLoading = signal<boolean>(false);
  scheduleError = signal<string | null>(null);
  myEntriesLoading = signal<boolean>(false);
  myScheduleEntryCount = signal<number | null>(null);

  leaveSummary = signal<LeaveSummaryInfo | null>(null);
  leaveSummaryLoading = signal<boolean>(false);
  leaveSummaryError = signal<string | null>(null);
  
  // Computed properties dla ról - obsługuje role z prefiksem ROLE_
  isAdmin = computed(() => {
    const roles = this.currentUser()?.roles ?? [];
    return roles.includes('ADMIN') || roles.includes('ROLE_ADMIN');
  });
  isHR = computed(() => {
    const roles = this.currentUser()?.roles ?? [];
    return roles.includes('HR') || roles.includes('ROLE_HR');
  });
  isManager = computed(() => {
    const roles = this.currentUser()?.roles ?? [];
    return roles.includes('MANAGER') || roles.includes('ROLE_MANAGER');
  });
  
  // Sprawdza czy użytkownik może zarządzać systemem (admin/HR)
  canManageSystem = computed(() => this.isAdmin() || this.isHR());
  
  // Sprawdza czy użytkownik może zarządzać grafikami (admin/HR/manager)
  canManageSchedules = computed(() => this.isAdmin() || this.isHR() || this.isManager());
  canReviewRequests = computed(() => this.isAdmin() || this.isHR() || this.isManager());

  constructor(
    private authService: AuthService,
    private router: Router,
    private leaveProposalService: LeaveProposalService,
    private workScheduleService: WorkScheduleService
  ) {}

  ngOnInit(): void {
    // Pobierz aktualnego użytkownika
    this.authService.currentUser$.subscribe(user => {
      this.currentUser.set(user);
      console.log('=== DASHBOARD DEBUG ===');
      console.log('Current user:', user);
      console.log('User roles:', user?.roles);
      console.log('Is Admin:', this.isAdmin());
      console.log('Is HR:', this.isHR());
      console.log('Can manage system:', this.canManageSystem());
      console.log('=== END DEBUG ===');
      this.loadPendingRequests();
      this.loadCurrentSchedule();
      this.loadLeaveSummary();
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  statusLabel(status: LeaveProposalStatus): string {
    return LEAVE_STATUS_LABELS[status] ?? status;
  }

  leaveTypeLabel(type: string): string {
    const key = type as keyof typeof LEAVE_TYPE_LABELS;
    return LEAVE_TYPE_LABELS[key] ?? type;
  }

  formatDate(iso: string | undefined): string {
    if (!iso) { return ''; }
    const date = new Date(iso + 'T00:00:00');
    if (Number.isNaN(date.getTime())) { return iso; }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  requestLink(id: number): string[] {
    return ['/leave-requests', String(id)];
  }

  private readonly companyActionStatuses = new Set<LeaveProposalStatus>([
    LeaveProposalStatus.SUBMITTED,
    LeaveProposalStatus.IN_REVIEW
  ]);

  private readonly employeeActionStatuses = new Set<LeaveProposalStatus>([
    LeaveProposalStatus.DRAFT,
    LeaveProposalStatus.SUBMITTED,
    LeaveProposalStatus.IN_REVIEW
  ]);

  private loadPendingRequests(): void {
    const user = this.currentUser();
    if (!user) {
      this.pendingRequests.set([]);
      return;
    }
    this.pendingLoading.set(true);
    this.pendingError.set(null);
    const canReview = this.canReviewRequests();
    const source$ = canReview
      ? this.leaveProposalService.getCompanyLeaveProposals()
      : this.leaveProposalService.getMyLeaveProposals();
    source$.subscribe({
      next: (list) => {
        const statuses = canReview ? this.companyActionStatuses : this.employeeActionStatuses;
        const filtered = (list || [])
          .filter(item => statuses.has(item.status))
          .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
        this.pendingRequests.set(filtered);
        this.pendingLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load pending leave proposals', err);
        this.pendingRequests.set([]);
        this.pendingError.set('Nie udało się pobrać wniosków. Spróbuj ponownie później.');
        this.pendingLoading.set(false);
      }
    });
  }

  private loadCurrentSchedule(): void {
    const user = this.currentUser();
    if (!user) {
      this.currentSchedule.set(null);
      this.scheduleError.set(null);
      this.myScheduleEntryCount.set(null);
      this.myEntriesLoading.set(false);
      return;
    }
    this.scheduleLoading.set(true);
    this.scheduleError.set(null);
    this.currentSchedule.set(null);
    this.workScheduleService.getPublishedSchedules().subscribe({
      next: (list) => {
        const schedule = this.pickScheduleForCurrentMonth(list ?? []);
        this.currentSchedule.set(schedule);
        this.scheduleLoading.set(false);
        if (schedule) {
          this.loadMyScheduleEntries(schedule.id, user.id);
        } else {
          this.myScheduleEntryCount.set(null);
        }
      },
      error: (err) => {
        console.error('Failed to load current schedule', err);
        this.scheduleError.set('Nie udało się pobrać aktualnego grafiku.');
        this.scheduleLoading.set(false);
        this.currentSchedule.set(null);
        this.myScheduleEntryCount.set(null);
      }
    });
  }

  private pickScheduleForCurrentMonth(list: WorkScheduleResponse[]): WorkScheduleResponse | null {
    if (!list || list.length === 0) {
      return null;
    }
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const byStartDesc = [...list].sort((a, b) => b.startDate.localeCompare(a.startDate));
    const matching = byStartDesc.find((item) => {
      const start = new Date(item.startDate + 'T00:00:00');
      const end = new Date(item.endDate + 'T00:00:00');
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return false;
      }
      const overlapsMonth = start <= monthEnd && end >= monthStart;
      return overlapsMonth;
    });

    return matching ?? byStartDesc[0] ?? null;
  }

  private loadMyScheduleEntries(scheduleId: number, userId: number): void {
    this.myEntriesLoading.set(true);
    this.myScheduleEntryCount.set(null);
    this.workScheduleService.getUserEntries(scheduleId, userId).subscribe({
      next: (entries: WorkScheduleEntryResponse[]) => {
        this.myScheduleEntryCount.set(entries?.length ?? 0);
        this.myEntriesLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load entries for user', err);
        this.myScheduleEntryCount.set(null);
        this.myEntriesLoading.set(false);
      }
    });
  }

  private loadLeaveSummary(): void {
    const user = this.currentUser();
    if (!user) {
      this.leaveSummary.set(null);
      this.leaveSummaryLoading.set(false);
      return;
    }
    this.leaveSummaryLoading.set(true);
    this.leaveSummaryError.set(null);
    this.leaveProposalService.getMyLeaveProposals().subscribe({
      next: (list) => {
        const summary = this.buildLeaveSummary(list ?? []);
        this.leaveSummary.set(summary);
        this.leaveSummaryLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load leave summary', err);
        this.leaveSummary.set(null);
        this.leaveSummaryError.set('Nie udało się pobrać danych urlopowych.');
        this.leaveSummaryLoading.set(false);
      }
    });
  }

  private buildLeaveSummary(list: EmployeeLeaveProposalResponse[]): LeaveSummaryInfo {
    const pendingStatuses = new Set<LeaveProposalStatus>([
      LeaveProposalStatus.SUBMITTED,
      LeaveProposalStatus.IN_REVIEW
    ]);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let approvedCount = 0;
    let approvedDays = 0;
    let pendingCount = 0;
    let upcomingCount = 0;

    for (const item of list) {
      if (item.status === LeaveProposalStatus.APPROVED) {
        approvedCount += 1;
        approvedDays += item.requestedDays ?? 0;
        const start = new Date(item.startDate + 'T00:00:00');
        if (!Number.isNaN(start.getTime()) && start >= today) {
          upcomingCount += 1;
        }
      } else if (pendingStatuses.has(item.status)) {
        pendingCount += 1;
      }
    }

    return {
      totalRequests: list.length,
      approvedCount,
      approvedDays,
      pendingCount,
      upcomingCount
    };
  }

  goToCurrentSchedule(): void {
    const schedule = this.currentSchedule();
    if (schedule) {
      this.router.navigate(['/schedules', schedule.id]);
    } else {
      this.navigateTo('/schedules');
    }
  }

  goToLeaveHub(): void {
    this.navigateTo('/leave-requests');
  }

  formatDateRange(start?: string | null, end?: string | null): string {
    if (!start || !end) {
      return '';
    }
    return `${this.formatDate(start)} – ${this.formatDate(end)}`;
  }
}