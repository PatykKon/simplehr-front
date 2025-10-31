import { Component, OnInit, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BackButtonComponent } from '../shared/back-button.component';
import { AdminUserSearchService, UserSearchParams } from '../../services/admin-user-search.service';
import { EmployeeService } from '../../services/employee.service';
import { EmployeeSummaryResponse } from '../../models/employee.models';
import { UserPageResponse, UserSearchItem } from '../../models/user-search.models';

@Component({
  selector: 'app-admin-employee-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BackButtonComponent],
  templateUrl: './admin-employee-search.component.html',
  styleUrls: ['./admin-employee-search.component.css']
})
export class AdminEmployeeSearchComponent implements OnInit {
  loading = signal(false);
  error = signal<string | null>(null);
  data = signal<UserPageResponse | null>(null);
  private initialized = false;

  // Filters
  firstName = signal<string>('');
  lastName = signal<string>('');
  email = signal<string>('');
  role = signal<string>('');
  enabled = signal<string>(''); // '', 'true', 'false' for UI simplicity

  // Pagination/sort
  page = signal<number>(0);
  size = signal<number>(20);
  sort = signal<string>('createdAt,DESC');

  readonly roles = ['ROLE_ADMIN','ROLE_HR','ROLE_MANAGER','ROLE_USER'];

  constructor(
    private searchService: AdminUserSearchService,
    private employeeService: EmployeeService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    effect(() => {
      if (!this.initialized) return;
      const qp: Params = {
        page: this.page(),
        size: this.size(),
        sort: this.sort(),
      };
      if (this.firstName().trim()) qp['first_name'] = this.firstName().trim();
      if (this.lastName().trim()) qp['last_name'] = this.lastName().trim();
      if (this.email().trim()) qp['email'] = this.email().trim();
      if (this.role().trim()) qp['role'] = this.role().trim();
      if (this.enabled().trim()) qp['enabled'] = this.enabled().trim();
      this.router.navigate([], { relativeTo: this.route, queryParams: qp, replaceUrl: true });
    });
  }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const num = (v: string | null, d: number) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
    if (qp.has('first_name')) this.firstName.set(qp.get('first_name') || '');
    if (qp.has('last_name')) this.lastName.set(qp.get('last_name') || '');
    if (qp.has('email')) this.email.set(qp.get('email') || '');
    if (qp.has('role')) this.role.set(qp.get('role') || '');
    if (qp.has('enabled')) this.enabled.set(qp.get('enabled') || '');
    if (qp.has('page')) this.page.set(num(qp.get('page'), 0));
    if (qp.has('size')) this.size.set(num(qp.get('size'), 20));
    if (qp.has('sort')) {
      const raw = qp.get('sort') || 'createdAt,DESC';
      const [field, dir] = raw.split(',');
      const alias: Record<string, string> = {
        created_at: 'createdAt', created: 'createdAt',
        first_name: 'firstName', last_name: 'lastName'
      };
      const f = alias[(field || '').toLowerCase()] || field || 'createdAt';
      const d = (dir || 'DESC').toUpperCase();
      this.sort.set(`${f},${d}`);
    }
    this.initialized = true;
    this.load();
    this.loadStats();
  }

  // Filter handlers
  onFirstNameChange(v: string) { this.firstName.set(v); this.page.set(0); }
  onLastNameChange(v: string) { this.lastName.set(v); this.page.set(0); }
  onEmailChange(v: string) { this.email.set(v); this.page.set(0); }
  onRoleChange(v: string) { this.role.set(v); this.page.set(0); this.load(); }
  onEnabledChange(v: string) { this.enabled.set(v); this.page.set(0); this.load(); }

  clearFilters(): void {
    this.firstName.set('');
    this.lastName.set('');
    this.email.set('');
    this.role.set('');
    this.enabled.set('');
    this.page.set(0);
    this.sort.set('createdAt,DESC');
    this.load();
  }

  load(useFallback = false): void {
    this.loading.set(true);
    this.error.set(null);

    const params: UserSearchParams = {
      first_name: this.firstName().trim() || undefined,
      last_name: this.lastName().trim() || undefined,
      email: this.email().trim() || undefined,
      role: this.role().trim() || undefined,
      enabled: this.enabled().trim() ? this.enabled().trim() === 'true' : undefined,
      page: this.page(),
      size: this.size(),
      sort: this.sort()
    };

    this.searchService.search(params, useFallback).pipe(
      catchError(err => {
        if (!useFallback) {
          // Retry with fallback endpoint if alias isn't available
          this.searchService.search(params, true).pipe(
            catchError(() => of(null))
          ).subscribe(res => { if (res) this.data.set(res); this.loading.set(false); });
          return of(null);
        }
        this.error.set('Błąd podczas wyszukiwania pracowników');
        this.loading.set(false);
        return of(null);
      })
    ).subscribe(res => { if (res) this.data.set(res); this.loading.set(false); });
  }

  items = computed<UserSearchItem[]>(() => this.data()?.items ?? []);

  formatDate(value?: string | null): string { if (!value) return '-'; const [y,m,d] = (value.split('T')[0] || '').split('-'); if (!y||!m||!d) return value; return `${d}.${m}.${y}`; }

  goToPage(p: number): void { if (p < 0) return; const total = this.data()?.total_pages ?? 0; if (p >= total) return; this.page.set(p); this.load(); }
  changeSize(sz: number): void { this.size.set(sz); this.page.set(0); this.load(); }

  toggleSort(field: 'createdAt' | 'firstName' | 'lastName' | 'email' | 'enabled'): void {
    const [curField, curDir] = (this.sort() || '').split(',');
    let nextDir: 'ASC' | 'DESC' = 'DESC';
    if (curField === field) nextDir = (curDir === 'DESC' ? 'ASC' : 'DESC') as any;
    this.sort.set(`${field},${nextDir}`);
    this.page.set(0);
    this.load();
  }

  sortField = computed<string>(() => (this.sort() || 'createdAt,DESC').split(',')[0] || 'createdAt');
  sortDir = computed<'ASC' | 'DESC'>(() => ((this.sort() || 'createdAt,DESC').split(',')[1] || 'DESC').toUpperCase() as 'ASC' | 'DESC');

  // Stats: total vs active employees (global, not affected by filters)
  totalEmployees = signal<number | null>(null);
  activeEmployees = signal<number | null>(null);

  private loadStats(): void {
    this.employeeService.getAllEmployees().subscribe({
      next: (list: EmployeeSummaryResponse[]) => {
        const total = list?.length ?? 0;
        const active = list?.filter(e => e.enabled)?.length ?? 0;
        this.totalEmployees.set(total);
        this.activeEmployees.set(active);
      },
      error: () => {
        this.totalEmployees.set(null);
        this.activeEmployees.set(null);
      }
    });
  }
}
