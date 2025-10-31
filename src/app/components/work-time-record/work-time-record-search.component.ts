import { Component, OnInit, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { BackButtonComponent } from '../shared/back-button.component';
import { AdminWorkTimeRecordService } from '../../services/admin-work-time-record.service';
import { AdminWorkTimeRecordPageResponse, AdminWorkTimeRecordSearchItem } from '../../models/admin-work-time-record-search.models';

@Component({
  selector: 'app-work-time-record-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BackButtonComponent],
  templateUrl: './work-time-record-search.component.html',
  styleUrls: ['./work-time-record-search.component.css']
})
export class WorkTimeRecordSearchComponent implements OnInit {
  loading = signal(false);
  error = signal<string | null>(null);
  data = signal<AdminWorkTimeRecordPageResponse | null>(null);
  private initialized = false;

  // filters
  myOnly = signal<boolean>(true);
  year = signal<number>(new Date().getFullYear());
  month = signal<number>(0); // 0 = all months
  status = signal<string>('');
  firstName = signal<string>('');
  lastName = signal<string>('');
  employeeId = signal<number | null>(null);

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

  constructor(
    private searchService: AdminWorkTimeRecordService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    if (!this.canSeeCompany()) this.myOnly.set(true);

    effect(() => {
      if (!this.initialized) return;
      const qp: Params = {
        year: this.year(),
        month: this.month(),
        page: this.page(),
        size: this.size(),
        sort: this.sort(),
      };
      if (this.status().trim()) qp['status'] = this.status();
      if (this.canSeeCompany()) qp['my_only'] = this.myOnly();
      if (this.firstName().trim()) qp['first_name'] = this.firstName().trim();
      if (this.lastName().trim()) qp['last_name'] = this.lastName().trim();
      if (this.canSeeCompany() && this.employeeId() != null) qp['employee_id'] = this.employeeId();
      this.router.navigate([], { relativeTo: this.route, queryParams: qp, replaceUrl: true });
    });
  }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const num = (v: string | null, d: number) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
    if (qp.has('year')) this.year.set(num(qp.get('year'), this.year()));
    if (qp.has('month')) this.month.set(num(qp.get('month'), this.month()));
    if (qp.has('page')) this.page.set(num(qp.get('page'), 0));
    if (qp.has('size')) this.size.set(num(qp.get('size'), 20));
    if (qp.has('sort')) {
      const raw = qp.get('sort') || 'createdAt,DESC';
      const [field, dir] = raw.split(',');
      const canonicalMap: Record<string, string> = { created_at: 'createdAt', created: 'createdAt' };
      const f = canonicalMap[field] || field || 'createdAt';
      const d = (dir || 'DESC').toUpperCase();
      this.sort.set(`${f},${d}`);
    }
    if (qp.has('status')) this.status.set(qp.get('status') || '');
    if (this.canSeeCompany() && qp.has('my_only')) this.myOnly.set((qp.get('my_only') || 'true') === 'true');
    if (qp.has('first_name')) this.firstName.set(qp.get('first_name') || '');
    if (qp.has('last_name')) this.lastName.set(qp.get('last_name') || '');
    if (this.canSeeCompany() && qp.has('employee_id')) this.employeeId.set(num(qp.get('employee_id'), null as any));
    this.initialized = true;
    this.load();
  }

  canSeeCompany(): boolean {
    return this.auth.hasAnyRole(['ADMIN', 'HR', 'MANAGER', 'ROLE_ADMIN', 'ROLE_HR', 'ROLE_MANAGER']);
  }

  // filters
  onMyOnlyToggle(v: boolean) { if (this.canSeeCompany()) { this.myOnly.set(v); this.page.set(0); this.load(); } }
  onYearChange(v: string | number) { const n = Number(v); this.year.set(Number.isFinite(n) && n > 2000 ? n : new Date().getFullYear()); this.page.set(0); this.load(); }
  onMonthChange(v: string | number) { const n = Number(v); this.month.set(Number.isFinite(n) ? n : 0); this.page.set(0); this.load(); }
  onStatusChange(v: string) { this.status.set(v); this.page.set(0); this.load(); }
  onFirstNameChange(v: string) { this.firstName.set(v); this.page.set(0); }
  onLastNameChange(v: string) { this.lastName.set(v); this.page.set(0); }
  onEmployeeIdChange(v: string | number) { const n = Number(v); this.employeeId.set(Number.isFinite(n) ? n : null); this.page.set(0); this.load(); }

  clearFilters(): void {
    const now = new Date();
    this.year.set(now.getFullYear());
    this.month.set(0);
    this.status.set('');
    this.firstName.set('');
    this.lastName.set('');
    this.employeeId.set(null);
    this.myOnly.set(true);
    this.page.set(0);
    this.sort.set('createdAt,DESC');
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    const params = {
      year: this.year(),
      month: this.month() || undefined,
      status: this.status().trim() || undefined,
      my_only: this.canSeeCompany() ? this.myOnly() : undefined,
      first_name: this.firstName().trim() || undefined,
      last_name: this.lastName().trim() || undefined,
      employee_id: this.canSeeCompany() ? (this.employeeId() ?? undefined) : undefined,
      page: this.page(),
      size: this.size(),
      sort: this.sort()
    };

    this.searchService.search(params).pipe(
      catchError(err => { this.error.set('Błąd podczas ładowania ewidencji czasu pracy'); this.loading.set(false); return of(null); })
    ).subscribe(res => { if (res) this.data.set(res); this.loading.set(false); });
  }

  items = computed<AdminWorkTimeRecordSearchItem[]>(() => this.data()?.items ?? []);

  formatMonth(year?: number | null, month?: number | null): string {
    if (!year || !month) return '-';
    const mm = String(month).padStart(2, '0');
    return `${year}-${mm}`;
  }

  formatDate(value?: string | null): string { if (!value) return '-'; const [y,m,d] = (value.split('T')[0] || '').split('-'); if (!y||!m||!d) return value; return `${d}.${m}.${y}`; }

  goToPage(p: number): void { if (p < 0) return; const total = this.data()?.total_pages ?? 0; if (p >= total) return; this.page.set(p); this.load(); }
  changeSize(sz: number): void { this.size.set(sz); this.page.set(0); this.load(); }

  toggleSort(field: 'createdAt' | 'status'): void {
    const [curField, curDir] = (this.sort() || '').split(',');
    let nextDir: 'ASC' | 'DESC' = 'DESC';
    if (curField === field) nextDir = (curDir === 'DESC' ? 'ASC' : 'DESC') as any;
    this.sort.set(`${field},${nextDir}`);
    this.page.set(0);
    this.load();
  }

  sortField = computed<string>(() => (this.sort() || 'createdAt,DESC').split(',')[0] || 'createdAt');
  sortDir = computed<'ASC' | 'DESC'>(() => ((this.sort() || 'createdAt,DESC').split(',')[1] || 'DESC').toUpperCase() as 'ASC' | 'DESC');
}
