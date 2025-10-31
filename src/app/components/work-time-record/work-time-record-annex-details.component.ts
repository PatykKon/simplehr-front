import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BackButtonComponent } from '../shared/back-button.component';
import { WorkTimeRecordService } from '../../services/work-time-record.service';
import {
  WorkTimeRecordAnnexResponse,
  WorkTimeRecordAnnexStatus,
  WorkTimeRecordDetailsResponse,
  WorkTimeRecordStatus
} from '../../models/work-time-record.models';
import { EmployeeService } from '../../services/employee.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-work-time-record-annex-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BackButtonComponent],
  templateUrl: './work-time-record-annex-details.component.html',
  styleUrls: ['./work-time-record-annex-details.component.css']
})
export class WorkTimeRecordAnnexDetailsComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  annex = signal<WorkTimeRecordAnnexResponse | null>(null);
  record = signal<WorkTimeRecordDetailsResponse | null>(null);
  canModerate = signal(false);
  actionLoading = signal(false);
  showRejectForm = signal(false);
  rejectReason = signal('');
  actionError = signal<string | null>(null);
  actionSuccess = signal<string | null>(null);

  private employeeNames = new Map<number, string>();
  private currentRecordId = 0;
  private currentAnnexId = 0;

  WorkTimeRecordAnnexStatus = WorkTimeRecordAnnexStatus;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: WorkTimeRecordService,
    private employees: EmployeeService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.auth.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.canModerate.set(this.auth.hasAnyRole(['ADMIN', 'HR', 'MANAGER'])));

    this.route.paramMap.subscribe(params => {
      const recordId = Number(params.get('id'));
      const annexId = Number(params.get('annexId'));
      if (!recordId || !annexId) {
        this.error.set('Niepoprawny adres strony');
        this.loading.set(false);
        return;
      }
      this.load(recordId, annexId);
    });
  }

  private load(recordId: number, annexId: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.currentRecordId = recordId;
    this.currentAnnexId = annexId;

    forkJoin({
      record: this.service.getRecord(recordId).pipe(catchError(err => {
        console.error('Failed to load work time record context', err);
        return of(null as WorkTimeRecordDetailsResponse | null);
      })),
      annex: this.service.getAnnex(recordId, annexId).pipe(catchError(err => {
        console.error('Failed to load work time record annex', err);
        return of(null as WorkTimeRecordAnnexResponse | null);
      })),
      employees: this.employees.getAllEmployees().pipe(catchError(() => of([])))
    }).subscribe(({ record, annex, employees }) => {
      if (!record || !annex) {
        this.error.set('Nie znaleziono wskazanego aneksu');
        this.loading.set(false);
        this.actionLoading.set(false);
        return;
      }

      this.employeeNames.clear();
      (employees || []).forEach(emp => {
        const name = `${(emp.firstName || '').trim()} ${(emp.lastName || '').trim()}`.trim();
        this.employeeNames.set(emp.id, name || emp.username || `#${emp.id}`);
      });

      this.record.set(record);
      this.annex.set(annex);
      this.showRejectForm.set(false);
      this.rejectReason.set('');
      this.actionError.set(null);
      this.loading.set(false);
      this.actionLoading.set(false);
    });
  }

  statusLabel(status: WorkTimeRecordAnnexStatus): string {
    switch (status) {
      case WorkTimeRecordAnnexStatus.ANNEX_CREATED: return 'Aneks utworzony';
      case WorkTimeRecordAnnexStatus.SUPERVISOR_ACCEPTED: return 'Zaakceptowany przez przełożonego';
      case WorkTimeRecordAnnexStatus.WAITING: return 'Oczekuje na akceptację';
      case WorkTimeRecordAnnexStatus.USER_ACCEPTED: return 'Zaakceptowany przez zgłaszającego';
      case WorkTimeRecordAnnexStatus.CLOSED: return 'Zamknięty';
      default: return WorkTimeRecordAnnexStatus[status] ?? 'Nieznany status';
    }
  }

  statusClass(status: WorkTimeRecordAnnexStatus): string {
    switch (status) {
      case WorkTimeRecordAnnexStatus.ANNEX_CREATED: return 'status status-annex-created';
      case WorkTimeRecordAnnexStatus.SUPERVISOR_ACCEPTED: return 'status status-supervisor-accepted';
      case WorkTimeRecordAnnexStatus.WAITING: return 'status status-waiting';
      case WorkTimeRecordAnnexStatus.USER_ACCEPTED: return 'status status-user-accepted';
      case WorkTimeRecordAnnexStatus.CLOSED: return 'status status-closed';
      default: return 'status';
    }
  }

  recordStatusLabel(status: WorkTimeRecordStatus | null): string {
    if (status == null) return '-';
    switch (status) {
      case WorkTimeRecordStatus.WAITING: return 'Oczekuje na akcję pracownika';
      case WorkTimeRecordStatus.USER_ACCEPTED: return 'Zaakceptowane przez pracownika';
      case WorkTimeRecordStatus.SUPERVISOR_ACCEPTED: return 'Zaakceptowane przez przełożonego';
      case WorkTimeRecordStatus.REJECTED: return 'Odrzucone';
      case WorkTimeRecordStatus.ANNEX_CREATED: return 'Utworzono aneks';
      case WorkTimeRecordStatus.CLOSED: return 'Zamknięte';
      default: return WorkTimeRecordStatus[status] ?? 'Nieznany status';
    }
  }

  employeeName(userId?: number | null): string {
    if (userId == null) return '-';
    return this.employeeNames.get(userId) || `#${userId}`;
  }

  openRecord(): void {
    const record = this.record();
    if (!record) return;
    this.router.navigate(['/work-time-records', record.id]);
  }

  toggleRejectForm(): void {
    this.actionError.set(null);
    this.actionSuccess.set(null);
    this.showRejectForm.set(!this.showRejectForm());
  }

  onRejectReasonChange(value: string): void {
    this.rejectReason.set(value);
  }

  approveAnnex(): void {
    if (this.actionLoading()) return;
    const recordId = this.currentRecordId;
    const annexId = this.currentAnnexId;
    if (!recordId || !annexId) return;

    this.actionError.set(null);
    this.actionSuccess.set(null);
    this.actionLoading.set(true);
    this.service.approveAnnex(recordId, annexId).subscribe({
      next: () => {
        this.actionSuccess.set('Aneks został zatwierdzony.');
        this.load(recordId, annexId);
      },
      error: (err) => {
        console.error('Failed to approve annex', err);
        this.actionError.set('Nie udało się zatwierdzić aneksu. Spróbuj ponownie.');
        this.actionLoading.set(false);
      }
    });
  }

  submitRejection(): void {
    if (this.actionLoading()) return;
    const recordId = this.currentRecordId;
    const annexId = this.currentAnnexId;
    if (!recordId || !annexId) return;

    const reason = this.rejectReason().trim();
    if (reason.length < 10) {
      this.actionError.set('Powód odrzucenia musi mieć co najmniej 10 znaków.');
      return;
    }

    this.actionError.set(null);
    this.actionSuccess.set(null);
    this.actionLoading.set(true);
    this.service.rejectAnnex(recordId, annexId, { reason }).subscribe({
      next: () => {
        this.actionSuccess.set('Aneks został odrzucony.');
        this.load(recordId, annexId);
      },
      error: (err) => {
        console.error('Failed to reject annex', err);
        this.actionError.set('Nie udało się odrzucić aneksu. Spróbuj ponownie.');
        this.actionLoading.set(false);
      }
    });
  }
}
