import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorkTimeRecordService } from '../../services/work-time-record.service';
import { AuthService } from '../../services/auth.service';
import { CreateWorkTimeRecordAnnexRequest, RejectWorkTimeRecordRequest, WorkTimeRecordDetailsResponse, WorkTimeRecordStatus } from '../../models/work-time-record.models';
import { WorkTimeService } from '../../services/work-time.service';
import { WorkTimeDayResponse } from '../../models/work-time.models';

@Component({
  selector: 'app-work-time-record-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './work-time-record-details.component.html',
  styleUrls: ['./work-time-record-details.component.css']
})
export class WorkTimeRecordDetailsComponent implements OnInit {
  record = signal<WorkTimeRecordDetailsResponse | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  days = signal<WorkTimeDayResponse[] | null>(null);
  daysLoading = signal(false);
  // Fast lookup: workDate (YYYY-MM-DD) -> day
  daysByDate = computed(() => {
    const list = this.days() || [];
    const map = new Map<string, WorkTimeDayResponse>();
    for (const d of list) {
      const key = (d.workDate || '').slice(0, 10); // normalize in case of ISO string
      if (key) map.set(key, d);
    }
    return map;
  });

  // Actions state
  rejectReason = signal('');
  showAnnexForm = signal(false);
  annex: CreateWorkTimeRecordAnnexRequest = { correctionDate: '', correctedHours: 0, reason: '' };
  actionLoading = signal(false);
  showRejectModal = signal(false);

  WorkTimeRecordStatus = WorkTimeRecordStatus;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private service: WorkTimeRecordService,
    private auth: AuthService,
    private workTime: WorkTimeService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('Nieprawidłowy identyfikator ewidencji');
      return;
    }
    this.load(id);
  }

  canManage(): boolean { return this.auth.hasAnyRole(['HR']); }
  canSeeOthers(): boolean { return this.auth.hasAnyRole(['ADMIN', 'HR', 'MANAGER']); }
  private isOwner(rec: WorkTimeRecordDetailsResponse | null): boolean {
    const uid = this.auth.getCurrentUser()?.id;
    return !!rec && uid != null && rec.userId === uid;
  }
  canSubmitForApproval(): boolean {
    const rec = this.record();
    if (!rec) return false;
    // Treat unknown string 'WAITING' as waiting state
    return this.isOwner(rec) && (rec.status === ("WAITING" as any) || (rec as any).status === 'WAITING');
  }
  canHrDecide(): boolean {
    const rec = this.record();
    if (!rec) return false;
    return this.canManage() && rec.status === WorkTimeRecordStatus.USER_ACCEPTED;
  }

  load(id: number): void {
    this.loading.set(true);
    this.service.getRecord(id).subscribe({
      next: (rec) => {
        this.record.set(rec);
        this.loading.set(false);
        // After record loads, fetch month days for that user/period
        if (rec && rec.periodYear && rec.periodMonth && rec.userId != null) {
          const month = String(rec.periodMonth).padStart(2, '0');
          const period = `${rec.periodYear}-${month}`;
          const currentUserId = this.auth.getCurrentUser()?.id;
          const isOwn = currentUserId != null && currentUserId === rec.userId;
          const uidParam = isOwn ? undefined : (this.canSeeOthers() ? rec.userId : undefined);
          this.fetchDays(period, uidParam as any);
        }
      },
      error: (err) => { console.error(err); this.error.set('Nie udało się pobrać ewidencji'); this.loading.set(false);} 
    });
  }

  fetchDays(period: string, userId?: number): void {
    this.daysLoading.set(true);
    this.workTime.getDays(period, userId).subscribe({
      next: (list) => { this.days.set(list || []); this.daysLoading.set(false); },
      error: () => { this.days.set([]); this.daysLoading.set(false); }
    });
  }

  // Helpers for calendar display
  monthMatrix = computed(() => {
    const rec = this.record();
    if (!rec) return [] as Array<Array<string | null>>;
    const year = rec.periodYear;
    const month = rec.periodMonth; // 1-12
    const first = new Date(Date.UTC(year, month - 1, 1));
    const last = new Date(Date.UTC(year, month, 0));
    const firstDow = (first.getUTCDay() + 6) % 7; // Mon=0..Sun=6
    const daysInMonth = last.getUTCDate();
    const cells: Array<string | null> = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      cells.push(ds);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: Array<Array<string | null>> = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  });

  // Flat list of dates (YYYY-MM-DD) for the month – for table view
  monthDates = computed(() => {
    const rec = this.record();
    if (!rec) return [] as string[];
    const year = rec.periodYear;
    const month = rec.periodMonth; // 1-12
    const last = new Date(Date.UTC(year, month, 0));
    const daysInMonth = last.getUTCDate();
    const res: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      res.push(`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    }
    return res;
  });

  isWeekend(dateStr: string | null): boolean {
    if (!dateStr) return false;
    const d = new Date(dateStr + 'T00:00:00Z');
    const dow = d.getUTCDay(); // 0=Sun..6=Sat
    return dow === 0 || dow === 6;
  }

  dayInfo(dateStr: string): { hours: number | null; isLeave: boolean; note?: string | null } {
    const key = (dateStr || '').slice(0, 10);
    const x = this.daysByDate().get(key);
    if (!x) return { hours: null, isLeave: false };
    let hours: number | null = null;
    if (x.roundedHours != null) hours = x.roundedHours;
    else if (x.standardHours != null || x.overtimeHours != null) {
      hours = (x.standardHours || 0) + (x.overtimeHours || 0);
    } else if (x.punchInTime && x.punchOutTime) {
      // crude diff in hours
      const [si, ei] = [x.punchInTime.split(':'), x.punchOutTime.split(':')];
      const start = Number(si[0]) + Number(si[1]) / 60;
      const end = Number(ei[0]) + Number(ei[1]) / 60;
      hours = Math.max(0, end - start);
    }
    return { hours, isLeave: !!x.leaveDay, note: x.note };
  }

  dayTooltip(dateStr: string): string {
    const info = this.dayInfo(dateStr);
    const parts: string[] = [];
    parts.push(dateStr);
    if (info.hours !== null) parts.push(`Godziny: ${info.hours.toFixed(1)}`);
    if (info.isLeave) parts.push('Urlop');
    if (info.note) parts.push(`Notatka: ${info.note}`);
    return parts.join(' | ');
  }

  acceptByUser(): void {
    const r = this.record(); if (!r) return;
    this.actionLoading.set(true);
    this.service.acceptByUser(r.id).subscribe({
      next: () => { this.load(r.id); this.actionLoading.set(false); },
      error: (e) => { console.error(e); alert('Błąd podczas akceptacji przez pracownika'); this.actionLoading.set(false);} 
    });
  }

  acceptBySupervisor(): void {
    const r = this.record(); if (!r) return;
    this.actionLoading.set(true);
    this.service.acceptBySupervisor(r.id).subscribe({
      next: () => { this.load(r.id); this.actionLoading.set(false); },
      error: (e) => { console.error(e); alert('Błąd podczas akceptacji przez przełożonego'); this.actionLoading.set(false);} 
    });
  }

  reject(): void {
    const r = this.record(); if (!r) return;
    if (!this.rejectReason() || this.rejectReason().trim().length < 10) {
      alert('Podaj powód odrzucenia (min. 10 znaków)');
      return;
    }
    const payload: RejectWorkTimeRecordRequest = { reason: this.rejectReason().trim() };
    this.actionLoading.set(true);
    this.service.reject(r.id, payload).subscribe({
      next: () => { this.rejectReason.set(''); this.showRejectModal.set(false); this.load(r.id); this.actionLoading.set(false); },
      error: (e) => { console.error(e); alert('Błąd podczas odrzucania'); this.actionLoading.set(false);} 
    });
  }

  toggleAnnexForm(): void { this.showAnnexForm.set(!this.showAnnexForm()); }

  submitAnnex(): void {
    const r = this.record(); if (!r) return;
    if (!this.annex.correctionDate || !this.annex.reason || this.annex.reason.trim().length < 10) {
      alert('Uzupełnij datę i powód (min. 10 znaków)');
      return;
    }
    if (this.annex.correctedHours < 0 || this.annex.correctedHours > 24) {
      alert('Liczba godzin musi być w zakresie 0-24');
      return;
    }
    this.actionLoading.set(true);
    this.service.createAnnex(r.id, { ...this.annex, reason: this.annex.reason.trim() }).subscribe({
      next: () => { this.showAnnexForm.set(false); this.annex = { correctionDate: '', correctedHours: 0, reason: ''}; this.load(r.id); this.actionLoading.set(false); },
      error: (e) => { console.error(e); alert('Błąd podczas dodawania aneksu'); this.actionLoading.set(false);} 
    });
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
}
