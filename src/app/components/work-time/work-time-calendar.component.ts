import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { WorkTimeService } from '../../services/work-time.service';
import { WorkTimeConfig, WorkTimeDayResponse, WorkTimeType } from '../../models/work-time.models';
import { EmployeeService } from '../../services/employee.service';
import { EmployeeSummaryResponse } from '../../models/employee.models';
import { AuthService } from '../../services/auth.service';

function formatPeriod(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${y}-${m}`;
}

function addMonths(date: Date, delta: number): Date {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + delta);
  return d;
}

@Component({
  selector: 'app-work-time-calendar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './work-time-calendar.component.html',
  styleUrls: ['./work-time-calendar.component.css']
})
export class WorkTimeCalendarComponent implements OnInit {
  periodDate = signal<Date>(new Date());
  period = computed(() => formatPeriod(this.periodDate()));

  days = signal<WorkTimeDayResponse[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Config and mode
  config = signal<WorkTimeConfig | null>(null);
  mode = computed<WorkTimeType | null>(() => this.config()?.workTimeType ?? null);

  // For elevated roles
  userIdFilter = signal<number | ''>('');

  constructor(
    private service: WorkTimeService,
    private auth: AuthService,
    private router: Router,
    private employeesApi: EmployeeService
  ) {}

  ngOnInit(): void {
    this.fetchConfig();
    this.loadEmployeesIfAllowed();
    this.load();
  }

  canSeeOthers(): boolean { return this.auth.hasAnyRole(['ADMIN', 'HR', 'MANAGER']); }

  prevMonth(): void { this.periodDate.set(addMonths(this.periodDate(), -1)); this.load(); }
  nextMonth(): void { this.periodDate.set(addMonths(this.periodDate(), +1)); this.load(); }
  today(): void { this.periodDate.set(new Date()); this.load(); }

  onUserFilterChange(): void { this.load(); }

  employees = signal<EmployeeSummaryResponse[]>([]);
  employeeLabel(u: EmployeeSummaryResponse): string { return `${u.firstName || ''} ${u.lastName || ''} (${u.username}) [${u.id}]`.trim(); }
  loadEmployeesIfAllowed(): void {
    if (!this.canSeeOthers()) return;
    this.employeesApi.getAllEmployees().subscribe({
      next: list => this.employees.set(list || []),
      error: () => this.employees.set([])
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const uid = this.canSeeOthers() && this.userIdFilter() !== '' ? Number(this.userIdFilter()) : undefined;
    this.service.getDays(this.period(), uid).subscribe({
      next: (list) => { this.days.set(list || []); this.loading.set(false); },
      error: (err) => { console.error(err); this.error.set('Nie udało się pobrać listy dni'); this.loading.set(false);} 
    });
  }

  fetchConfig(): void {
    this.service.getActiveConfig().subscribe({
      next: (cfg) => this.config.set(cfg),
      error: () => this.config.set(null)
    });
  }

  // UI helpers
  totalHours(d: WorkTimeDayResponse): number | null {
    const base = (d.standardHours ?? 0) + (d.overtimeHours ?? 0);
    if (d.roundedHours != null) return d.roundedHours;
    if (base > 0) return base;
    // If punch-only data without computed hours, fall back to null
    return null;
  }

  openDay(d: WorkTimeDayResponse): void {
    this.router.navigate(['/work-time/day', d.workDate]);
  }

  // Month totals (effective)
  monthTotals(): { effective: number; standard: number; overtime: number } {
    const ds = this.days();
    let effective = 0, standard = 0, overtime = 0;
    for (const d of ds) {
      const st = d.standardHours ?? 0; const ot = d.overtimeHours ?? 0;
      standard += st; overtime += ot;
      const eff = d.roundedHours != null ? d.roundedHours : (st + ot);
      if (!isNaN(eff)) effective += eff;
    }
    return { effective, standard, overtime };
  }

  // Inline quick punch for today
  isToday(dateStr: string): boolean {
    const today = new Date();
    const s = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2,'0')}-${today.getDate().toString().padStart(2,'0')}`;
    return s === dateStr;
  }

  canPunchInRow(d: WorkTimeDayResponse): boolean {
    if (!d.editable) return false;
    if (this.mode() && this.mode() !== 'PUNCH_IN_OUT') return false;
    return this.isToday(d.workDate) && !d.punchInTime;
  }

  canPunchOutRow(d: WorkTimeDayResponse): boolean {
    if (!d.editable) return false;
    if (this.mode() && this.mode() !== 'PUNCH_IN_OUT') return false;
    return this.isToday(d.workDate) && !!d.punchInTime && !d.punchOutTime;
  }

  rowPunchIn(d: WorkTimeDayResponse): void {
    this.service.punchIn({ workDate: d.workDate }).subscribe({
      next: () => this.load(),
      error: () => {}
    });
  }

  rowPunchOut(d: WorkTimeDayResponse): void {
    this.service.punchOut({ workDate: d.workDate }).subscribe({
      next: () => this.load(),
      error: () => {}
    });
  }

}
