import { Component, OnInit, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BackButtonComponent } from '../shared/back-button.component';
import { AuthService } from '../../services/auth.service';
import { WorkTimeAnnexService } from '../../services/work-time-annex.service';
import { AnnexPageResponse, AnnexSearchItem, AnnexStatus } from '../../models/work-time-annex.models';

@Component({
  selector: 'app-work-time-record-annex-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BackButtonComponent],
  templateUrl: './work-time-record-annex-list.component.html',
  styleUrls: ['./work-time-record-annex-list.component.css']
})
export class WorkTimeRecordAnnexListComponent implements OnInit {
  loading = signal(false);
  error = signal<string | null>(null);
  data = signal<AnnexPageResponse | null>(null);

  // Filters/query params state
  myOnly = signal<boolean>(true);
  year = signal<number>(new Date().getFullYear());
  month = signal<number>(new Date().getMonth() + 1);
  status = signal<'ALL' | AnnexStatus>('ALL');
  firstName = signal<string>('');
  lastName = signal<string>('');

  // Pagination/sorting
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
    private annexes: WorkTimeAnnexService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    if (!this.canSeeCompany()) this.myOnly.set(true);

    // Keep query params in sync when state changes
    effect(() => {
      const qp: Params = {
        year: this.year(),
        month: this.month(),
        page: this.page(),
        size: this.size(),
        sort: this.sort(),
      };
      if (this.status() !== 'ALL') qp['status'] = this.status();
      if (this.canSeeCompany()) qp['my_only'] = this.myOnly();
      if (this.firstName().trim()) qp['first_name'] = this.firstName().trim();
      if (this.lastName().trim()) qp['last_name'] = this.lastName().trim();
      this.router.navigate([], { relativeTo: this.route, queryParams: qp, replaceUrl: true });
    });
  }

  ngOnInit(): void {
    // Initialize from query string
    const qp = this.route.snapshot.queryParamMap;
    const num = (v: string | null, d: number) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };
    if (qp.has('year')) this.year.set(num(qp.get('year'), this.year()));
    if (qp.has('month')) this.month.set(num(qp.get('month'), this.month()));
    if (qp.has('page')) this.page.set(num(qp.get('page'), 0));
    if (qp.has('size')) this.size.set(num(qp.get('size'), 20));
    if (qp.has('sort')) this.sort.set(qp.get('sort') || 'createdAt,DESC');
    const st = qp.get('status');
    if (st === 'PENDING' || st === 'APPROVED' || st === 'REJECTED') this.status.set(st);
    if (qp.has('first_name')) this.firstName.set(qp.get('first_name') || '');
    if (qp.has('last_name')) this.lastName.set(qp.get('last_name') || '');
    if (this.canSeeCompany() && qp.has('my_only')) this.myOnly.set((qp.get('my_only') || 'true') === 'true');
    this.load();
  }

  canSeeCompany(): boolean {
    return this.auth.hasAnyRole(['ADMIN', 'HR', 'MANAGER', 'ROLE_ADMIN', 'ROLE_HR', 'ROLE_MANAGER']);
  }

  onMyOnlyToggle(checked: boolean): void { if (this.canSeeCompany()) { this.myOnly.set(checked); this.page.set(0); this.load(); } }

  onYearChange(value: string | number): void {
    const parsed = Number(value);
    const fallback = new Date().getFullYear();
    this.year.set(!Number.isNaN(parsed) && parsed > 2000 ? parsed : fallback);
    this.page.set(0);
    this.load();
  }

  onMonthChange(value: string | number): void {
    const parsed = Number(value);
    this.month.set(Number.isNaN(parsed) ? 0 : parsed);
    this.page.set(0);
    this.load();
  }

  onStatusChange(value: 'ALL' | AnnexStatus): void { this.status.set(value); this.page.set(0); this.load(); }
  onFirstNameChange(v: string): void { this.firstName.set(v); this.page.set(0); }
  onLastNameChange(v: string): void { this.lastName.set(v); this.page.set(0); }

  clearFilters(): void {
    const now = new Date();
    this.year.set(now.getFullYear());
    this.month.set(0);
    this.status.set('ALL');
    this.firstName.set('');
    this.lastName.set('');
    this.myOnly.set(true);
    this.page.set(0);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const statusParam: AnnexStatus | undefined = this.status() === 'ALL' ? undefined : (this.status() as AnnexStatus);
    const firstNameParam = this.firstName().trim();
    const lastNameParam = this.lastName().trim();
    const params = {
      year: this.year(),
      month: this.month() || undefined,
      status: statusParam,
      my_only: this.canSeeCompany() ? this.myOnly() : undefined,
      first_name: firstNameParam ? firstNameParam : undefined,
      last_name: lastNameParam ? lastNameParam : undefined,
      page: this.page(),
      size: this.size(),
      sort: this.sort()
    };

    this.annexes.search(params).pipe(
      catchError(err => {
        console.error('Failed to load annexes', err);
        this.error.set('Błąd podczas ładowania aneksów');
        this.loading.set(false);
        return of(null);
      })
    ).subscribe(res => {
      if (res) this.data.set(res);
      this.loading.set(false);
    });
  }

  items = computed<AnnexSearchItem[]>(() => this.data()?.items ?? []);

  formatDate(value?: string | null): string {
    if (!value) return '-';
    const parts = value.split('T')[0]?.split('-');
    if (!parts || parts.length < 3) {
      return value;
    }
    const [year, month, day] = parts;
    if (!year || !month || !day) {
      return value;
    }
    return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
  }

  statusLabel(status: AnnexStatus | null): string {
    switch (status) {
      case 'PENDING': return 'Oczekuje';
      case 'APPROVED': return 'Zatwierdzony';
      case 'REJECTED': return 'Odrzucony';
      default: return '-';
    }
  }

  statusClass(status: AnnexStatus | null): string {
    switch (status) {
      case 'PENDING': return 'status status-waiting';
      case 'APPROVED': return 'status status-supervisor-accepted';
      case 'REJECTED': return 'status status-closed';
      default: return 'status';
    }
  }

  periodLabel(item: AnnexSearchItem): string {
    if (item.period_year == null || item.period_month == null) return '-';
    const m = String(item.period_month).padStart(2, '0');
    return `${item.period_year}-${m}`;
  }

  goToPage(p: number): void {
    if (p < 0) return;
    const total = this.data()?.total_pages ?? 0;
    if (p >= total) return;
    this.page.set(p);
    this.load();
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

  viewDetails(item: AnnexSearchItem): void {
    if (item.record_id != null) this.router.navigate(['/work-time-records', item.record_id, 'annexes', item.annex_id]);
  }
}
