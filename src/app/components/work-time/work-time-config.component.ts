import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorkTimeService } from '../../services/work-time.service';
import { WorkTimeConfig, WorkTimeType } from '../../models/work-time.models';
import { AuthService } from '../../services/auth.service';
import { EmployeeService } from '../../services/employee.service';
import { EmployeeSummaryResponse } from '../../models/employee.models';

@Component({
  selector: 'app-work-time-config',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './work-time-config.component.html',
  styleUrls: ['./work-time-config.component.css']
})
export class WorkTimeConfigComponent implements OnInit {
  loading = signal<boolean>(true);
  config = signal<WorkTimeConfig | null>(null);
  configs = signal<WorkTimeConfig[]>([]);
  configsLoading = signal<boolean>(false);
  showExamples = signal<boolean>(false);
  // Create form (admin/hr)
  creating = signal<boolean>(false);
  approversText = signal<string>(''); // fallback (kept for compatibility, not shown in UI)
  // Approvers (UI selection)
  employees = signal<EmployeeSummaryResponse[]>([]);
  approverPick = signal<string>('');
  selectedApproverIds = signal<number[]>([]);
  eligibleApprovers = computed(() => {
    const list = this.employees();
    const rolesAllowed = new Set(['ROLE_ADMIN','ROLE_HR','ROLE_MANAGER','ADMIN','HR','MANAGER']);
    return list.filter(u => u.enabled && u.roles?.some(r => rolesAllowed.has(r)));
  });
  newConfig = signal<WorkTimeConfig>({
    name: '',
    description: '',
    workTimeType: 'PUNCH_IN_OUT',
    active: true,
    autoMarkLeaveDays: false,
    allowCorrections: true,
    correctionDaysLimit: 7,
    approverUserIds: [],
    // Punch defaults
    autoRoundEnabled: true,
    roundingMinutes: 15,
    // Manual defaults
    maxDailyHours: 8,
    maxDailyOvertimeHours: 2
  });

  modeLabel = computed(() => {
    const t = this.config()?.workTimeType as WorkTimeType | undefined;
    switch (t) {
      case 'SCHEDULE_WORK': return 'Plan pracy (SCHEDULE_WORK)';
      case 'PUNCH_IN_OUT': return 'Rejestrator wejść/wyjść (PUNCH_IN_OUT)';
      case 'MANUAL_ENTRY': return 'Ręczne wpisy (MANUAL_ENTRY)';
      default: return '—';
    }
  });

  constructor(
    private workTime: WorkTimeService,
    public auth: AuthService,
    private employeesApi: EmployeeService
  ) {}

  ngOnInit(): void {
    this.workTime.getActiveConfig().subscribe(cfg => {
      this.config.set(cfg);
      this.loading.set(false);
    });
    this.refreshConfigs();
    // Load potential approvers for picker if user has permissions
    if (this.auth.hasAnyRole(['ADMIN','HR','MANAGER','ROLE_ADMIN','ROLE_HR','ROLE_MANAGER'])) {
      this.employeesApi.getAllEmployees().subscribe({
        next: list => this.employees.set(list || []),
        error: () => this.employees.set([])
      });
    }
  }

  refreshConfigs(): void {
    this.configsLoading.set(true);
    this.workTime.getConfigs().subscribe({
      next: list => { this.configs.set(list || []); this.configsLoading.set(false); },
      error: () => { this.configs.set([]); this.configsLoading.set(false); }
    });
  }

  isPunch(): boolean { return this.config()?.workTimeType === 'PUNCH_IN_OUT'; }
  isManual(): boolean { return this.config()?.workTimeType === 'MANUAL_ENTRY'; }
  isSchedule(): boolean { return this.config()?.workTimeType === 'SCHEDULE_WORK'; }

  onTypeChange(type: WorkTimeType): void {
    const cfg = { ...this.newConfig() };
    cfg.workTimeType = type;
    this.newConfig.set(cfg);
  }

  updateNewConfig(patch: Partial<WorkTimeConfig>): void {
    this.newConfig.set({ ...this.newConfig(), ...patch });
  }

  submitNewConfig(): void {
    const raw = this.newConfig();
    // Collect approvers from selected chips (fallback to CSV if none)
    let approvers = [...this.selectedApproverIds()];
    if (approvers.length === 0) {
      approvers = (this.approversText() || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(n => Number(n))
        .filter(n => !Number.isNaN(n));
    }

    const payload: WorkTimeConfig = {
      ...raw,
      approverUserIds: approvers
    };

    // Basic FE validation
    if (!payload.name?.trim()) return;
    if (!payload.workTimeType) return;
    if (payload.workTimeType === 'PUNCH_IN_OUT') {
      if ((payload.roundingMinutes ?? 0) <= 0 || (payload.roundingMinutes ?? 0) > 60) return;
    }
    if (payload.workTimeType === 'MANUAL_ENTRY') {
      const std = payload.maxDailyHours ?? 0;
      const ot = payload.maxDailyOvertimeHours ?? 0;
      if (std < 0 || std > 24) return;
      if (ot < 0 || ot > 24) return;
    }

    this.creating.set(true);
    this.workTime.createConfig(payload).subscribe({
      next: () => {
        // Reload active config after create
        this.workTime.getActiveConfig().subscribe(cfg => {
          this.config.set(cfg);
          this.creating.set(false);
          this.selectedApproverIds.set([]);
          this.approverPick.set('');
          this.approversText.set('');
          this.refreshConfigs();
        });
      },
      error: () => this.creating.set(false)
    });
  }

  // Approver picker helpers
  approverLabel(u: EmployeeSummaryResponse): string {
    const full = `${u.firstName || ''} ${u.lastName || ''}`.trim();
    return `${full || u.username} [${u.id}]`;
  }

  approverLabelById(id: number): string {
    const u = this.eligibleApprovers().find(x => x.id === id);
    if (u) return this.approverLabel(u);
    return `#${id}`;
  }

  onApproverPickChange(val: string): void {
    const id = Number(val);
    if (!Number.isNaN(id)) {
      this.addApprover(id);
      this.approverPick.set('');
    }
  }

  addApprover(id: number): void {
    const list = new Set(this.selectedApproverIds());
    list.add(id);
    this.selectedApproverIds.set(Array.from(list));
  }

  removeApprover(id: number): void {
    const list = this.selectedApproverIds().filter(x => x !== id);
    this.selectedApproverIds.set(list);
  }
}
