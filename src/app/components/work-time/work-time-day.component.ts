import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorkTimeService } from '../../services/work-time.service';
import { ManualDayRequest, WorkTimeConfig, WorkTimeDayResponse, WorkTimeType } from '../../models/work-time.models';
import { WorkTimeAdjustmentsService, WorkTimeAdjustmentType } from '../../services/work-time-adjustments.service';

@Component({
  selector: 'app-work-time-day',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './work-time-day.component.html',
  styleUrls: ['./work-time-day.component.css']
})
export class WorkTimeDayComponent implements OnInit {
  date = signal<string>('');
  day = signal<WorkTimeDayResponse | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // Config
  config = signal<WorkTimeConfig | null>(null);

  // Punch
  timeIn = signal<string>('');
  timeOut = signal<string>('');
  actionLoading = signal(false);

  // Manual form
  manual: ManualDayRequest = { workDate: '', standardHours: 0, overtimeHours: 0, note: '' };

  // Adjustments form
  adjustmentType = signal<WorkTimeAdjustmentType>('OVERTIME');
  adjustmentHours = signal<number>(0);
  adjustmentTitle = signal<string>('');
  adjustmentReason = signal<string>('');
  adjLoading = signal(false);

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private service: WorkTimeService,
    private adjustments: WorkTimeAdjustmentsService
  ) {}

  ngOnInit(): void {
    const date = this.route.snapshot.paramMap.get('date');
    if (!date) { this.error.set('Brak daty'); return; }
    this.date.set(date);
    this.manual.workDate = date;
    this.fetchConfig();
    this.load();
  }

  fetchConfig(): void {
    this.service.getActiveConfig().subscribe({
      next: (cfg) => this.config.set(cfg),
      error: () => this.config.set(null)
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.getDay(this.date()).subscribe({
      next: (d) => { this.day.set(d); this.loading.set(false); },
      error: (e) => { console.error(e); this.error.set('Nie udało się pobrać dnia'); this.loading.set(false);} 
    });
  }

  // Helpers
  workTimeType(): WorkTimeType | null { return this.config()?.workTimeType ?? null; }
  isFuture(): boolean { return new Date(this.date()) > new Date(); }

  canPunchIn(): boolean {
    const d = this.day();
    if (!d || !d.editable) return false;
    if (this.workTimeType() && this.workTimeType() !== 'PUNCH_IN_OUT') return false;
    return !d.punchInTime; // no punch in yet
  }
  canPunchOut(): boolean {
    const d = this.day();
    if (!d || !d.editable) return false;
    if (this.workTimeType() && this.workTimeType() !== 'PUNCH_IN_OUT') return false;
    return !!d.punchInTime && !d.punchOutTime;
  }

  canManualEdit(): boolean {
    const d = this.day();
    if (!d || !d.editable) return false;
    if (this.workTimeType() && this.workTimeType() !== 'MANUAL_ENTRY') return false;
    if (this.isFuture()) return false;
    return true;
  }

  punchIn(): void {
    if (!this.canPunchIn()) return;
    this.actionLoading.set(true);
    this.service.punchIn({ workDate: this.date(), time: this.timeIn() || undefined }).subscribe({
      next: () => { this.load(); this.actionLoading.set(false); },
      error: () => { this.actionLoading.set(false); }
    });
  }

  punchOut(): void {
    if (!this.canPunchOut()) return;
    this.actionLoading.set(true);
    this.service.punchOut({ workDate: this.date(), time: this.timeOut() || undefined }).subscribe({
      next: () => { this.load(); this.actionLoading.set(false); },
      error: () => { this.actionLoading.set(false); }
    });
  }

  saveManual(): void {
    if (!this.canManualEdit()) return;
    const payload: ManualDayRequest = { ...this.manual, workDate: this.date(), note: this.manual.note?.trim() || undefined };
    this.actionLoading.set(true);
    this.service.updateManualDay(payload).subscribe({
      next: () => { this.load(); this.actionLoading.set(false); },
      error: () => { this.actionLoading.set(false); }
    });
  }

  mapError(err: any, fallback: string): string {
    if (err?.status === 400) return 'Błędne dane lub naruszenie reguł (np. limity / kolejność punch)';
    if (err?.status === 403) return 'Brak uprawnień do tej operacji';
    if (err?.status === 404) return 'Nie znaleziono wpisu dla tego dnia';
    if (err?.status === 409) return 'Konflikt stanu (np. ponowny punch-in tego samego dnia)';
    return fallback;
  }

  canCreateAdjustment(): boolean {
    const cfg = this.config();
    if (!cfg?.allowCorrections) return false;
    // optional: block for future dates
    return true;
  }

  submitAdjustment(): void {
    if (!this.canCreateAdjustment()) return;
    const type = this.adjustmentType();
    const hours = this.adjustmentHours();
    const title = (this.adjustmentTitle() || '').trim();
    const reason = (this.adjustmentReason() || '').trim();
    if (hours <= 0 || !title) return;
    if (type === 'UNDERTIME' && reason.length < 3) return; // UI sugestia: poproś o powód
    this.adjLoading.set(true);
    this.adjustments.create({ workDate: this.date(), adjustmentType: type, hours, title, reason: reason || undefined }).subscribe({
      next: (res) => {
        // autood razu submit draft
        this.adjustments.submit(res.id).subscribe({
          next: () => { this.adjLoading.set(false); this.adjustmentHours.set(0); this.adjustmentTitle.set(''); this.adjustmentReason.set(''); },
          error: () => { this.adjLoading.set(false); }
        });
      },
      error: () => { this.adjLoading.set(false); }
    });
  }
}
