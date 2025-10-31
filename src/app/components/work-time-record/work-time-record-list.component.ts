import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { BackButtonComponent } from '../shared/back-button.component';
import { FormsModule } from '@angular/forms';
import { WorkTimeRecordService } from '../../services/work-time-record.service';
import { WorkTimeRecordPageResponse, WorkTimeRecordResponse, WorkTimeRecordStatus } from '../../models/work-time-record.models';
import { AuthService } from '../../services/auth.service';
import { EmployeeService } from '../../services/employee.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-work-time-record-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BackButtonComponent],
  templateUrl: './work-time-record-list.component.html',
  styleUrls: ['./work-time-record-list.component.css']
})
export class WorkTimeRecordListComponent implements OnInit {
  records = signal<WorkTimeRecordResponse[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Filters & toggles
  onlyMine = signal<boolean>(true);
  // Filters
  yearFilter = signal<number>(new Date().getFullYear());
  monthFilter = signal<number>(new Date().getMonth() + 1);
  nameFilter = signal<string>('');
  statusFilter = signal<'ALL' | WorkTimeRecordStatus>('ALL');
  // Sorting
  sortKey = signal<'period' | 'employee' | 'scheduled' | 'leave' | 'total' | 'status'>('period');
  sortDir = signal<'asc' | 'desc'>('desc');

  // Pagination (company scope only)
  page = signal(0);
  pageSize = signal(20);
  totalPages = signal(0);
  totalElements = signal(0);

  WorkTimeRecordStatus = WorkTimeRecordStatus;

  readonly months = [
    { value: 1, label: 'Styczeń' },
    { value: 2, label: 'Luty' },
    { value: 3, label: 'Marzec' },
    { value: 4, label: 'Kwiecień' },
    { value: 5, label: 'Maj' },
    { value: 6, label: 'Czerwiec' },
    { value: 7, label: 'Lipiec' },
    { value: 8, label: 'Sierpień' },
    { value: 9, label: 'Wrzesień' },
    { value: 10, label: 'Październik' },
    { value: 11, label: 'Listopad' },
    { value: 12, label: 'Grudzień' },
  ];

  readonly pageSizeOptions = [10, 20, 50];
  readonly statusOptions: Array<{ value: WorkTimeRecordStatus; label: string }> = [
    { value: WorkTimeRecordStatus.WAITING, label: 'Oczekuje na akcję pracownika' },
    { value: WorkTimeRecordStatus.USER_ACCEPTED, label: 'Zaakceptowana przez pracownika' },
    { value: WorkTimeRecordStatus.SUPERVISOR_ACCEPTED, label: 'Zaakceptowana przez przełożonego' },
    { value: WorkTimeRecordStatus.REJECTED, label: 'Odrzucona' },
    { value: WorkTimeRecordStatus.ANNEX_CREATED, label: 'Aneks utworzony' },
    { value: WorkTimeRecordStatus.CLOSED, label: 'Zamknięta' },
  ];

  readonly isCompanyView = computed(() => !this.onlyMine());

  constructor(
    private service: WorkTimeRecordService,
    private auth: AuthService,
    private router: Router,
    private employees: EmployeeService,
  ) {}

  ngOnInit(): void {
    // preload employees for name mapping
    this.employees.getAllEmployees().subscribe({
      next: (list) => {
        const map = new Map<number, string>();
        (list || []).forEach(u => map.set(u.id, `${(u.firstName || '').trim()} ${(u.lastName || '').trim()}`.trim() || u.username));
        (this as any)._empMap = map;
        this.load();
      },
      error: () => { (this as any)._empMap = new Map<number, string>(); this.load(); }
    });
  }

  canSeeCompany(): boolean { return this.auth.hasAnyRole(['ADMIN', 'HR', 'MANAGER']); }

  onPeriodChange(): void {
    this.resetPage();
    this.load();
  }
  onNameChange(value: string): void {
    const next = value ?? '';
    this.nameFilter.set(next);
    if (next.trim().length > 0 && this.onlyMine()) {
      this.toggleOnlyMine(false);
    }
    if (!this.onlyMine()) {
      this.resetPage();
    }
  }

  onStatusChange(value: WorkTimeRecordStatus | 'ALL' | string): void {
    if (value === 'ALL') {
      this.statusFilter.set('ALL');
    } else {
      const numeric = typeof value === 'number' ? value : Number(value);
      if (!Number.isNaN(numeric)) {
        this.statusFilter.set(numeric as WorkTimeRecordStatus);
      }
    }
    this.resetPage();
    this.load();
  }

  toggleOnlyMine(value: boolean): void {
    const previous = this.onlyMine();
    this.onlyMine.set(value);
    if (value) {
      this.nameFilter.set('');
      this.statusFilter.set('ALL');
    }
    if (previous !== value) {
      this.resetPage();
      this.load();
    }
  }
  setSort(key: 'period' | 'employee' | 'scheduled' | 'leave' | 'total' | 'status'): void {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
    if (!this.onlyMine()) {
      this.resetPage();
      this.load();
    }
  }

  sortIndicator(key: 'period' | 'employee' | 'scheduled' | 'leave' | 'total' | 'status'): string {
    if (this.sortKey() !== key) return '';
    return this.sortDir() === 'asc' ? '▲' : '▼';
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    const year = this.yearFilter();
    const month = this.monthFilter();
    const isMine = this.onlyMine();
    const statusValue = this.statusFilter();
    const statusParam = statusValue === 'ALL' ? undefined : statusValue;

    if (isMine) {
      const pending$ = statusParam == null
        ? this.service.getMyPendingRecords(year, month).pipe(catchError(() => of([] as WorkTimeRecordResponse[])))
        : of([] as WorkTimeRecordResponse[]);

      forkJoin({
        mine: this.service.getMyRecords(statusParam, year, month).pipe(catchError(() => of([] as WorkTimeRecordResponse[]))),
        pending: pending$
      }).pipe(
        map(({ mine, pending }) => {
          const merged = [...pending, ...mine];
          const unique = new Map<number, WorkTimeRecordResponse>();
          for (const item of merged) unique.set(item.id, item);
          return Array.from(unique.values());
        })
      ).subscribe({
        next: (data) => {
          this.records.set(data);
          this.page.set(0);
          this.totalPages.set(data.length ? 1 : 0);
          this.totalElements.set(data.length);
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.error.set('Błąd podczas ładowania ewidencji');
          this.loading.set(false);
        }
      });
      return;
    }

    this.service.getCompanyRecordsPage({
      year,
      month,
      status: statusParam,
      page: this.page(),
      size: this.pageSize(),
      sort: this.buildSortParam()
    }).subscribe({
      next: (response: WorkTimeRecordPageResponse) => {
        this.records.set(response.items || []);
        this.page.set(response.page ?? 0);
        this.pageSize.set(response.size ?? this.pageSize());
        this.totalPages.set(response.total_pages ?? 0);
        const totalElements = response.total_elements ?? (response.items ? response.items.length : 0);
        this.totalElements.set(totalElements);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('Błąd podczas ładowania ewidencji');
        this.loading.set(false);
      }
    });
  }

  view(record: WorkTimeRecordResponse): void {
    this.router.navigate(['/work-time-records', record.id]);
  }

  employeeName(userId: number): string {
    const map: Map<number, string> = (this as any)._empMap || new Map<number, string>();
    return map.get(userId) || `#${userId}`;
  }

  getStatusClass(status: WorkTimeRecordStatus | string): string {
    switch (status) {
      case WorkTimeRecordStatus.ANNEX_CREATED: return 'anex-created';
      case WorkTimeRecordStatus.WAITING: return 'status-waiting';
      case WorkTimeRecordStatus.USER_ACCEPTED: return 'status-user-accepted';
      case WorkTimeRecordStatus.SUPERVISOR_ACCEPTED: return 'status-supervisor-accepted';
      case WorkTimeRecordStatus.REJECTED: return 'status-rejected';
      case 'WAITING_FOR_USER':
      case 'WAITING':
        return 'status-waiting';
      case 'WAITING_FOR_SUPERVISOR':
      case 'PENDING_SUPERVISOR':
        return 'status-waiting-supervisor';
      default: return '';
    }
  }

  statusLabel(status: WorkTimeRecordStatus | string): string {
    switch (status) {
      case WorkTimeRecordStatus.WAITING: return 'Oczekuje na akceptację użytkownika';
      case WorkTimeRecordStatus.USER_ACCEPTED: return 'Zaakceptowane przez pracownika';
      case WorkTimeRecordStatus.SUPERVISOR_ACCEPTED: return 'Zaakceptowane przez przełożonego';
      case WorkTimeRecordStatus.REJECTED: return 'Odrzucone';
      case WorkTimeRecordStatus.ANNEX_CREATED: return 'Utworzono aneks';
      case 'WAITING_FOR_USER':
        return 'Oczekuje na akcję pracownika';
      case 'USER_ACCEPTED':
        return 'Zaakceptowane przez pracownika';
      case 'WAITING':
        return 'Oczekuje na akcję pracownika';
      case 'WAITING_FOR_SUPERVISOR':
      case 'PENDING_SUPERVISOR':
        return 'Oczekuje na akcję przełożonego';
      default: return 'Nieznany status';
    }
  }

  filteredSortedRecords = computed(() => {
    const list = [...this.records()];
    const nf = (this.nameFilter() || '').trim().toLowerCase();
    const statusValue = this.statusFilter();
    const map: Map<number, string> = (this as any)._empMap || new Map<number, string>();
    let out = list;
    if (statusValue !== 'ALL') {
      out = out.filter(r => r.status === statusValue);
    }
    if (nf) {
      out = out.filter(r => {
        const name = (map.get(r.userId) || '').toLowerCase();
        return name.includes(nf);
      });
    }
    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    out.sort((a, b) => {
      let va: number | string = 0, vb: number | string = 0;
      if (key === 'period') { va = a.periodDisplay; vb = b.periodDisplay; }
      if (key === 'employee') { va = (map.get(a.userId) || ''); vb = (map.get(b.userId) || ''); }
      if (key === 'scheduled') { va = a.scheduledHours; vb = b.scheduledHours; }
      if (key === 'leave') { va = a.leaveHours; vb = b.leaveHours; }
      if (key === 'total') { va = a.totalHours; vb = b.totalHours; }
      if (key === 'status') { va = a.status; vb = b.status; }
      if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * dir;
      return ((va as number) - (vb as number)) * dir;
    });
    return out;
  });

  goToPage(target: number): void {
    if (target < 0 || target >= this.totalPages()) {
      return;
    }
    if (target === this.page()) {
      return;
    }
    this.page.set(target);
    this.load();
  }

  nextPage(): void { this.goToPage(this.page() + 1); }
  previousPage(): void { this.goToPage(this.page() - 1); }

  changePageSize(size: number): void {
    if (size === this.pageSize()) return;
    this.pageSize.set(size);
    this.resetPage();
    if (!this.onlyMine()) {
      this.load();
    }
  }

  pageStart(): number {
    const displayed = this.filteredSortedRecords().length;
    if (!displayed) {
      return 0;
    }
    return this.page() * this.pageSize() + 1;
  }

  pageEnd(): number {
    const displayed = this.filteredSortedRecords().length;
    if (!displayed) {
      return 0;
    }
    return this.pageStart() + displayed - 1;
  }

  private resetPage(): void {
    this.page.set(0);
  }

  private buildSortParam(): string {
    const field = this.sortFieldForBackend(this.sortKey());
    const direction = this.sortDir() === 'asc' ? 'ASC' : 'DESC';
    return `${field},${direction}`;
  }

  private sortFieldForBackend(key: 'period' | 'employee' | 'scheduled' | 'leave' | 'total' | 'status'): string {
    switch (key) {
      case 'scheduled': return 'scheduledHours';
      case 'leave': return 'leaveHours';
      case 'total': return 'totalHours';
      case 'status': return 'status';
      case 'employee': return 'userId';
      case 'period':
      default:
        return 'createdAt';
    }
  }
}
