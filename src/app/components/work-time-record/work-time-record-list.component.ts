import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { BackButtonComponent } from '../shared/back-button.component';
import { FormsModule } from '@angular/forms';
import { WorkTimeRecordService } from '../../services/work-time-record.service';
import { WorkTimeRecordResponse, WorkTimeRecordStatus } from '../../models/work-time-record.models';
import { AuthService } from '../../services/auth.service';
import { EmployeeService } from '../../services/employee.service';

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
  // Sorting
  sortKey = signal<'period' | 'employee' | 'scheduled' | 'leave' | 'total' | 'status'>('period');
  sortDir = signal<'asc' | 'desc'>('desc');

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

  onOnlyMineChange(): void { this.load(); }

  onPeriodChange(): void { this.load(); }
  onNameChange(): void { /* local filter only */ }
  setSort(key: 'period' | 'employee' | 'scheduled' | 'leave' | 'total' | 'status'): void {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
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
    const mine = this.onlyMine();
    const obs = mine
      ? this.service.getMyRecords(undefined, year, month)
      : this.service.getCompanyRecords(undefined, year, month);

    obs.subscribe({
      next: (data) => { this.records.set(data); this.loading.set(false); },
      error: (err) => { console.error(err); this.error.set('Błąd podczas ładowania ewidencji'); this.loading.set(false);} 
    });
  }

  view(record: WorkTimeRecordResponse): void {
    this.router.navigate(['/work-time-records', record.id]);
  }

  employeeName(userId: number): string {
    const map: Map<number, string> = (this as any)._empMap || new Map<number, string>();
    return map.get(userId) || `#${userId}`;
  }

  getStatusClass(status: WorkTimeRecordStatus): string {
    switch (status) {
      case WorkTimeRecordStatus.DRAFT: return 'status-draft';
      case WorkTimeRecordStatus.USER_ACCEPTED: return 'status-user-accepted';
      case WorkTimeRecordStatus.SUPERVISOR_ACCEPTED: return 'status-supervisor-accepted';
      case WorkTimeRecordStatus.REJECTED: return 'status-rejected';
      default: return '';
    }
  }

  statusLabel(status: WorkTimeRecordStatus): string {
    switch (status) {
      case WorkTimeRecordStatus.DRAFT: return 'Szkic';
      case WorkTimeRecordStatus.USER_ACCEPTED: return 'Zaakceptowane przez pracownika';
      case WorkTimeRecordStatus.SUPERVISOR_ACCEPTED: return 'Zaakceptowane przez przełożonego';
      case WorkTimeRecordStatus.REJECTED: return 'Odrzucone';
      default: return status;
    }
  }

  filteredSortedRecords = computed(() => {
    const list = [...this.records()];
    const nf = (this.nameFilter() || '').trim().toLowerCase();
    const map: Map<number, string> = (this as any)._empMap || new Map<number, string>();
    let out = list;
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
}
