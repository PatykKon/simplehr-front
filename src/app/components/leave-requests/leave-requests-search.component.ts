import { Component, OnInit, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { LeaveProposalSearchService } from '../../services/leave-proposal-search.service';
import { LeaveProposalPageResponse, LeaveProposalSearchItem } from '../../models/leave-proposal-search.models';
import { LeaveType, LeaveProposalStatus, LEAVE_TYPE_LABELS, LEAVE_TYPE_OPTIONS } from '../../models/leave-proposal.models';
import { BackButtonComponent } from '../shared/back-button.component';

@Component({
  selector: 'app-leave-requests-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BackButtonComponent],
  templateUrl: './leave-requests-search.component.html',
  styleUrls: ['./leave-requests-search.component.css']
})
export class LeaveRequestsSearchComponent implements OnInit {
  loading = signal(false);
  error = signal<string | null>(null);
  data = signal<LeaveProposalPageResponse | null>(null);
  private initialized = false; // avoid overwriting incoming query params before init

  // filters
  myOnly = signal<boolean>(true);
  year = signal<number>(new Date().getFullYear());
  month = signal<number>(0); // 0 = all months
  status = signal<'ALL' | LeaveProposalStatus | 'PENDING'>('ALL');
  leaveType = signal<'ALL' | LeaveType | string>('ALL');
  firstName = signal<string>('');
  lastName = signal<string>('');

  // pagination/sort
  page = signal<number>(0);
  size = signal<number>(20);
  sort = signal<string>('createdAt,DESC');

  readonly months = [
    { value: 0, label: 'Wszystkie miesiące' },
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
    { value: 12, label: 'Grudzień' }
  ];

  leaveTypeOptions = LEAVE_TYPE_OPTIONS;

  constructor(
    private searchService: LeaveProposalSearchService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    if (!this.canSeeCompany()) this.myOnly.set(true);

    effect(() => {
      // Don't sync URL until initial state is hydrated from existing query params
      if (!this.initialized) return;
      const qp: Params = {
        year: this.year(),
        month: this.month(),
        page: this.page(),
        size: this.size(),
        sort: this.sort(),
      };
      const st = this.status();
      if (st !== 'ALL') qp['status'] = st as string;
      if (this.leaveType() !== 'ALL') qp['leave_type'] = this.leaveType() as string;
      if (this.canSeeCompany()) qp['my_only'] = this.myOnly();
      if (this.firstName().trim()) qp['first_name'] = this.firstName().trim();
      if (this.lastName().trim()) qp['last_name'] = this.lastName().trim();
      this.router.navigate([], { relativeTo: this.route, queryParams: qp, replaceUrl: true });
    });
  }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const num = (v: string | null, d: number) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };
    if (qp.has('year')) this.year.set(num(qp.get('year'), this.year()));
    if (qp.has('month')) this.month.set(num(qp.get('month'), this.month()));
    if (qp.has('page')) this.page.set(num(qp.get('page'), 0));
    if (qp.has('size')) this.size.set(num(qp.get('size'), 20));
    if (qp.has('sort')) {
      const raw = qp.get('sort') || 'createdAt,DESC';
      // normalize submittedAt/submitted_at -> createdAt while preserving direction
      const [field, dir] = raw.split(',');
      // Canonicalize known aliases to UI field names
      const canonicalMap: Record<string, string> = {
        submittedAt: 'createdAt',
        submitted_at: 'createdAt',
        created: 'createdAt',
        created_at: 'createdAt',
        start: 'startDate',
        start_date: 'startDate',
        leave_type: 'leaveType'
      };
      const f = canonicalMap[field] || field || 'createdAt';
      const d = (dir || 'DESC').toUpperCase();
      this.sort.set(`${f},${d}`);
    }
    const st = qp.get('status');
    if (st) this.status.set(st as any);
    const lt = qp.get('leave_type');
    if (lt) this.leaveType.set(lt as any);
    if (qp.has('first_name')) this.firstName.set(qp.get('first_name') || '');
    if (qp.has('last_name')) this.lastName.set(qp.get('last_name') || '');
    if (this.canSeeCompany() && qp.has('my_only')) this.myOnly.set((qp.get('my_only') || 'true') === 'true');
    // Mark initialized to allow effects to sync URL from now on
    this.initialized = true;
    this.load();
  }

  canSeeCompany(): boolean {
    return this.auth.hasAnyRole(['ADMIN', 'HR', 'MANAGER', 'ROLE_ADMIN', 'ROLE_HR', 'ROLE_MANAGER']);
  }

  // filter handlers
  onMyOnlyToggle(v: boolean) { if (this.canSeeCompany()) { this.myOnly.set(v); this.page.set(0); this.load(); } }
  onYearChange(v: string | number) { const n = Number(v); this.year.set(Number.isFinite(n) && n > 2000 ? n : new Date().getFullYear()); this.page.set(0); this.load(); }
  onMonthChange(v: string | number) { const n = Number(v); this.month.set(Number.isFinite(n) ? n : 0); this.page.set(0); this.load(); }
  onStatusChange(v: 'ALL' | LeaveProposalStatus | 'PENDING') { this.status.set(v); this.page.set(0); this.load(); }
  onLeaveTypeChange(v: 'ALL' | LeaveType | string) { this.leaveType.set(v); this.page.set(0); this.load(); }
  onFirstNameChange(v: string) { this.firstName.set(v); this.page.set(0); }
  onLastNameChange(v: string) { this.lastName.set(v); this.page.set(0); }

  clearFilters(): void {
    const now = new Date();
    this.year.set(now.getFullYear());
    this.month.set(0);
    this.status.set('ALL');
    this.leaveType.set('ALL');
    this.firstName.set('');
    this.lastName.set('');
    this.myOnly.set(true);
    this.page.set(0);
    this.sort.set('createdAt,DESC');
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    const st = this.status();
    const lt = this.leaveType();
    const fn = this.firstName().trim();
    const ln = this.lastName().trim();

    // Ensure sort uses JPA entity property names (camelCase) expected by Spring Pageable
    const sortParam = (() => {
      const raw = this.sort() || 'createdAt,DESC';
      const [fieldRaw, dirRaw] = raw.split(',');
      // Accept some aliases and normalize to entity props
      const aliasMap: Record<string, string> = {
        submittedAt: 'createdAt',
        submitted_at: 'createdAt',
        created: 'createdAt',
        created_at: 'createdAt',
        start: 'startDate',
        start_date: 'startDate',
        end: 'endDate',
        end_date: 'endDate',
        leave_type: 'leaveType'
      };
      const allowed = new Set(['createdAt', 'status', 'startDate', 'endDate', 'leaveType']);
      const normalized = aliasMap[fieldRaw] || fieldRaw || 'createdAt';
      const key = allowed.has(normalized) ? normalized : 'createdAt';
      const dir = (dirRaw || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      return `${key},${dir}`;
    })();

    const params = {
      year: this.year(),
      month: this.month() || undefined,
      status: st === 'ALL' ? undefined : st,
      leave_type: lt === 'ALL' ? undefined : lt,
      my_only: this.canSeeCompany() ? this.myOnly() : undefined,
      first_name: fn || undefined,
      last_name: ln || undefined,
      page: this.page(),
      size: this.size(),
      sort: sortParam
    };

    this.searchService.search(params).pipe(
      catchError(err => {
        console.error('Failed to load leave proposals search', err);
        this.error.set('Błąd podczas ładowania wniosków');
        this.loading.set(false);
        return of(null);
      })
    ).subscribe(res => {
      if (res) this.data.set(res);
      this.loading.set(false);
    });
  }

  items = computed<LeaveProposalSearchItem[]>(() => this.data()?.items ?? []);

  periodLabel(item: LeaveProposalSearchItem): string {
    return `${this.formatDate(item.start_date)} – ${this.formatDate(item.end_date)}`;
  }

  formatDate(value?: string | null): string { if (!value) return '-'; const [y,m,d] = (value.split('T')[0] || '').split('-'); if (!y||!m||!d) return value; return `${d}.${m}.${y}`; }

  statusLabel(status: LeaveProposalStatus | string | null): string {
    switch (status) {
      case 'SUBMITTED': return 'Złożony';
      case 'IN_REVIEW': return 'W przeglądzie';
      case 'APPROVED': return 'Zatwierdzony';
      case 'REJECTED': return 'Odrzucony';
      case 'CANCELLED': return 'Anulowany';
      case 'WITHDRAWN': return 'Wycofany';
      case 'PENDING': return 'Oczekuje';
      default: return '-';
    }
  }

  statusClass(status: LeaveProposalStatus | string | null): string {
    switch (status) {
      case 'APPROVED': return 'status status-approved';
      case 'REJECTED': return 'status status-rejected';
      case 'CANCELLED': return 'status status-cancelled';
      case 'SUBMITTED':
      case 'IN_REVIEW':
      case 'PENDING': return 'status status-pending';
      default: return 'status';
    }
  }

  goToPage(p: number): void {
    if (p < 0) return; const total = this.data()?.total_pages ?? 0; if (p >= total) return; this.page.set(p); this.load();
  }

  changeSize(sz: number): void { this.size.set(sz); this.page.set(0); this.load(); }

  toggleSort(field: string): void {
    const [curField, curDir] = (this.sort() || '').split(',');
    let nextDir: 'ASC' | 'DESC' = 'DESC';
    if (curField === field) nextDir = (curDir === 'DESC' ? 'ASC' : 'DESC') as any;
    this.sort.set(`${field},${nextDir}`);
    this.page.set(0);
    this.load();
  }

  // sort helpers for UI
  sortField = computed<string>(() => (this.sort() || 'createdAt,DESC').split(',')[0] || 'createdAt');
  sortDir = computed<'ASC' | 'DESC'>(() => ((this.sort() || 'createdAt,DESC').split(',')[1] || 'DESC').toUpperCase() as 'ASC' | 'DESC');

  viewDetails(item: LeaveProposalSearchItem): void {
    if (item.proposal_id != null) this.router.navigate(['/leave-requests', item.proposal_id]);
  }
}
