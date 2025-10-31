import { Component, OnInit, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { BackButtonComponent } from '../shared/back-button.component';
import { WorkScheduleSearchService } from '../../services/work-schedule-search.service';
import { WorkSchedulePageResponse, WorkScheduleSearchItem } from '../../models/work-schedule-search.models';

@Component({
  selector: 'app-work-schedule-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BackButtonComponent],
  templateUrl: './work-schedule-search.component.html',
  styleUrls: ['./work-schedule-search.component.css']
})
export class WorkScheduleSearchComponent implements OnInit {
  loading = signal(false);
  error = signal<string | null>(null);
  data = signal<WorkSchedulePageResponse | null>(null);
  private initialized = false;

  // filters
  myOnly = signal<boolean>(true);
  name = signal<string>('');
  year = signal<number>(new Date().getFullYear());
  month = signal<number>(0); // 0 = all months
  status = signal<string>('');
  createdBy = signal<number | null>(null);
  createdFrom = signal<string>(''); // YYYY-MM-DD
  createdTo = signal<string>('');   // YYYY-MM-DD

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

  readonly statuses = ['DRAFT','SUBMITTED','APPROVED','REJECTED','PUBLISHED'];

  constructor(
    private searchService: WorkScheduleSearchService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    if (!this.canSeeCompany()) this.myOnly.set(true);

    effect(() => {
      if (!this.initialized) return;
      const qp: Params = {
        page: this.page(),
        size: this.size(),
        sort: this.sort(),
      };
      if (this.name().trim()) qp['name'] = this.name().trim();
      if (this.year()) qp['year'] = this.year();
      if (this.month()) qp['month'] = this.month();
      if (this.status().trim()) qp['status'] = this.status();
      if (this.canSeeCompany()) qp['my_only'] = this.myOnly();
      if (this.canSeeCompany() && this.createdBy() != null) qp['created_by'] = this.createdBy();
      if (this.createdFrom().trim()) qp['created_from'] = this.createdFrom().trim();
      if (this.createdTo().trim()) qp['created_to'] = this.createdTo().trim();
      this.router.navigate([], { relativeTo: this.route, queryParams: qp, replaceUrl: true });
    });
  }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const num = (v: string | null, d: number | null) => {
      const n = v == null ? NaN : Number(v);
      return Number.isFinite(n) ? (n as number) : (d as any);
    };
    if (qp.has('name')) this.name.set(qp.get('name') || '');
    if (qp.has('year')) this.year.set(num(qp.get('year'), this.year()));
    if (qp.has('month')) this.month.set(num(qp.get('month'), this.month()));
    if (qp.has('status')) this.status.set(qp.get('status') || '');
    if (this.canSeeCompany() && qp.has('my_only')) this.myOnly.set((qp.get('my_only') || 'true') === 'true');
    if (this.canSeeCompany() && qp.has('created_by')) this.createdBy.set(num(qp.get('created_by'), null as any));
    if (qp.has('created_from')) this.createdFrom.set(qp.get('created_from') || '');
    if (qp.has('created_to')) this.createdTo.set(qp.get('created_to') || '');
    if (qp.has('page')) this.page.set(num(qp.get('page'), 0));
    if (qp.has('size')) this.size.set(num(qp.get('size'), 20));
    if (qp.has('sort')) {
      const raw = qp.get('sort') || 'createdAt,DESC';
      const [field, dir] = raw.split(',');
      const canonicalMap: Record<string, string> = { created_at: 'createdAt', created: 'createdAt', start_date: 'startDate', end_date: 'endDate', created_by: 'createdByUserId' };
      const f = canonicalMap[(field || '').toLowerCase()] || field || 'createdAt';
      const d = (dir || 'DESC').toUpperCase();
      this.sort.set(`${f},${d}`);
    }
    this.initialized = true;
    this.load();
  }

  canSeeCompany(): boolean {
    return this.auth.hasAnyRole(['ADMIN', 'HR', 'MANAGER', 'ROLE_ADMIN', 'ROLE_HR', 'ROLE_MANAGER']);
  }

  // filters
  onMyOnlyToggle(v: boolean) { if (this.canSeeCompany()) { this.myOnly.set(v); this.page.set(0); this.load(); } }
  onNameChange(v: string) { this.name.set(v); this.page.set(0); }
  onYearChange(v: string | number) { const n = Number(v); this.year.set(Number.isFinite(n) && n > 2000 ? n : new Date().getFullYear()); this.page.set(0); this.load(); }
  onMonthChange(v: string | number) { const n = Number(v); this.month.set(Number.isFinite(n) ? n : 0); this.page.set(0); this.load(); }
  onStatusChange(v: string) { this.status.set(v); this.page.set(0); this.load(); }
  onCreatedByChange(v: string | number) { const n = Number(v); this.createdBy.set(Number.isFinite(n) ? n : null); this.page.set(0); this.load(); }
  onCreatedFromChange(v: string) { this.createdFrom.set(v); this.page.set(0); this.load(); }
  onCreatedToChange(v: string) { this.createdTo.set(v); this.page.set(0); this.load(); }

  clearFilters(): void {
    const now = new Date();
    this.name.set('');
    this.year.set(now.getFullYear());
    this.month.set(0);
    this.status.set('');
    this.createdBy.set(null);
    this.createdFrom.set('');
    this.createdTo.set('');
    this.myOnly.set(true);
    this.page.set(0);
    this.sort.set('createdAt,DESC');
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    const params = {
      name: this.name().trim() || undefined,
      year: this.year() || undefined,
      month: this.month() || undefined,
      status: this.status().trim() || undefined,
      my_only: this.canSeeCompany() ? this.myOnly() : undefined,
      created_by: this.canSeeCompany() ? (this.createdBy() ?? undefined) : undefined,
      created_from: this.createdFrom().trim() || undefined,
      created_to: this.createdTo().trim() || undefined,
      page: this.page(),
      size: this.size(),
      sort: this.sort()
    };

    this.searchService.search(params).pipe(
      catchError(err => { this.error.set('Błąd podczas ładowania grafików pracy'); this.loading.set(false); return of(null); })
    ).subscribe(res => { if (res) this.data.set(res); this.loading.set(false); });
  }

  items = computed<WorkScheduleSearchItem[]>(() => this.data()?.items ?? []);

  formatDateYMD(value?: string | null): string { if (!value) return '-'; const [y,m,d] = (value.split('T')[0] || value).split('-'); if (!y||!m||!d) return value; return `${d}.${m}.${y}`; }

  goToPage(p: number): void { if (p < 0) return; const total = this.data()?.total_pages ?? 0; if (p >= total) return; this.page.set(p); this.load(); }
  changeSize(sz: number): void { this.size.set(sz); this.page.set(0); this.load(); }

  toggleSort(field: 'createdAt' | 'name' | 'startDate' | 'endDate' | 'status'): void {
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
