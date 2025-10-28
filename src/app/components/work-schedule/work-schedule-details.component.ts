import { Component, OnInit, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { WorkScheduleService } from '../../services/work-schedule.service';
import { WorkScheduleDetailsResponse, WorkScheduleEntryResponse, WorkScheduleStatus } from '../../models/work-schedule.models';
import { AuthService } from '../../services/auth.service';
import { WorkScheduleHistoryResponse } from '../../models/work-schedule.models';
import { EmployeeService } from '../../services/employee.service';
import { LeaveProposalService } from '../../services/leave-proposal.service';
import { LeaveDay, LEAVE_TYPE_LABELS } from '../../models/leave-proposal.models';
// FullCalendar (read-only view)
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import plLocale from '@fullcalendar/core/locales/pl';

@Component({
  selector: 'app-work-schedule-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FullCalendarModule],
  templateUrl: './work-schedule-details.component.html',
  styleUrls: ['./work-schedule-details.component.css']
})
export class WorkScheduleDetailsComponent implements OnInit {
  loading = signal(false);
  error = signal<string | null>(null);
  schedule = signal<WorkScheduleDetailsResponse | null>(null);
  history = signal<WorkScheduleHistoryResponse[]>([]);
  // View toggle: CALENDAR or TABLE (matrix)
  viewMode = signal<'CALENDAR' | 'TABLE'>('CALENDAR');
  // History filtering
  hideMinorHistory = signal<boolean>(true);
  filteredHistory = computed(() => {
    const items = this.history() || [];
    if (!this.hideMinorHistory()) return items;
    const minor = new Set(['ENTRY_ADDED', 'ENTRY_UPDATED', 'ENTRY_REMOVED']);
    return items.filter(h => !minor.has(h.changeType));
  });
  showCalendar = signal(true);
  calendarOptions = signal<CalendarOptions | null>(null);
  calendarEvents = signal<EventInput[]>([]);
  mergeRanges = signal<boolean>(true);
  expandedEmployees = signal<Set<number>>(new Set());
  creatorName = signal<string>('');
  employeeNames = signal<Map<number, string>>(new Map());
  // Leaves
  employeeLeaves = signal<Record<number, LeaveDay[]>>({});
  leavesLoading = signal(false);
  // Employees present in this schedule (for TABLE view)
  employeesInSchedule = computed(() => {
    const s = this.schedule();
    const map = new Map<number, string>();
    for (const e of (s?.entries ?? [])) {
      const displayName = (e.userName ?? this.employeeName(e.userId) ?? `#${e.userId}`).trim();
      if (!map.has(e.userId)) map.set(e.userId, displayName);
    }
    return Array.from(map.entries())
      .map(([userId, userName]) => ({ userId, userName }))
      .sort((a, b) => (a.userName || '').localeCompare(b.userName || '', 'pl'));
  });
  // Reject modal state
  showRejectModal = signal(false);
  rejectReason = signal('');
  rejectError = signal<string | null>(null);
  // Quick filter by employee name
  nameFilter = signal<string>('');
  // Flat table state
  tableFilter = signal<string>('');
  tableSortBy = signal<'date' | 'employee' | 'start' | 'end'>('date');
  tableSortDir = signal<'asc' | 'desc'>('asc');
  flatEntries = computed(() => {
    const s = this.schedule();
    const list = (s?.entries ?? []).map((e, idx) => {
      const name = (e.userName ?? this.employeeName(e.userId) ?? `#${e.userId}`).trim();
      const startHM = this.formatHM(e.startTime);
      const endHM = this.formatHM(e.endTime);
      const hours = this.getEntryHours(e);
      return {
        key: `${e.userId}-${e.workDate}-${startHM}-${endHM}-${idx}`,
        userId: e.userId,
        employee: name,
        date: e.workDate,
        start: startHM,
        end: endHM,
        hours,
        overtime: !!e.isOvertime
      };
    });
    // filter
    const term = (this.tableFilter() || '').toLowerCase().trim();
    let filtered = term
      ? list.filter(r => r.employee.toLowerCase().includes(term))
      : list;
    // sort
    const by = this.tableSortBy();
    const dir = this.tableSortDir();
    filtered = filtered.sort((a, b) => {
      let cmp = 0;
      switch (by) {
        case 'date':
          cmp = a.date.localeCompare(b.date);
          if (cmp === 0) cmp = (a.start || '').localeCompare(b.start || '');
          break;
        case 'employee':
          cmp = a.employee.localeCompare(b.employee, 'pl');
          break;
        case 'start':
          cmp = (a.start || '').localeCompare(b.start || '');
          break;
        case 'end':
          cmp = (a.end || '').localeCompare(b.end || '');
          break;
      }
      return dir === 'asc' ? cmp : -cmp;
    });
    return filtered;
  });
  @ViewChild('calendar') calendarRef?: FullCalendarComponent;

  // Legend of users with colors
  legend = computed(() => {
    const s = this.schedule();
    if (!s || !s.entries) return [] as Array<{userId:number; userName:string; color:string}>;
    const map = new Map<number, {userId:number; userName:string; color:string}>();
    for (const e of s.entries) {
      if (!map.has(e.userId)) {
        const displayName = (e.userName ?? '').trim() || this.employeeName(e.userId) || `#${e.userId}`;
        map.set(e.userId, { userId: e.userId, userName: displayName, color: this.colorForUser(e.userId) });
      }
    }
    const term = this.nameFilter().toLowerCase().trim();
    let arr = Array.from(map.values());
    if (term) {
      arr = arr.filter(x => (x.userName || '').toLowerCase().includes(term));
    }
    return arr.sort((a,b)=> (a.userName || '').localeCompare(b.userName || '','pl'));
  });

  groupedEntries = computed(() => {
    const s = this.schedule();
    const groups = new Map<number, { userId: number; userName: string; entries: WorkScheduleEntryResponse[]; totalHours: number; overtimeHours: number; overtimeDays: number }>();
    if (!s || !s.entries) return [] as Array<{ userId: number; userName: string; entries: WorkScheduleEntryResponse[]; totalHours: number; overtimeHours: number; overtimeDays: number }>;
    for (const e of s.entries) {
      if (!groups.has(e.userId)) {
        const displayName = (e.userName ?? '').trim() || this.employeeName(e.userId) || `#${e.userId}`;
        groups.set(e.userId, { userId: e.userId, userName: displayName, entries: [], totalHours: 0, overtimeHours: 0, overtimeDays: 0 });
      }
      const g = groups.get(e.userId)!;
      g.entries.push(e);
      const hours = this.getEntryHours(e);
      g.totalHours += hours;
      if (e.isOvertime) {
        g.overtimeHours += hours;
      }
    }
    // compute overtime days per user
    for (const g of groups.values()) {
      const days = new Set<string>();
      for (const e of g.entries) if (e.isOvertime) days.add(e.workDate);
      g.overtimeDays = days.size;
    }
    // filter by name
    const term = this.nameFilter().toLowerCase().trim();
    let list = Array.from(groups.values());
    if (term) {
      list = list.filter(g => (g.userName || '').toLowerCase().includes(term));
    }
    // sort by userName
    return list.sort((a, b) => (a.userName || '').localeCompare(b.userName || '', 'pl'))
      .map(g => ({
        ...g,
        totalHours: Number(g.totalHours.toFixed(2)),
        overtimeHours: Number(g.overtimeHours.toFixed(2))
      }));
  });

  WorkScheduleStatus = WorkScheduleStatus;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workScheduleService: WorkScheduleService,
    private authService: AuthService,
    private employeeService: EmployeeService,
    private leaveProposalService: LeaveProposalService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!Number.isFinite(id)) {
      this.error.set('Niepoprawny identyfikator grafiku');
      return;
    }
    this.fetchSchedule(id);
  }

  private fetchSchedule(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.workScheduleService.getSchedule(id).subscribe({
      next: (s) => {
        this.schedule.set(s);
        this.loading.set(false);
        this.fetchHistory(s.id);
        this.setupCalendar(s);
        this.loadCreatorName(s.createdByUserId);
        this.loadEmployeeNames();
        this.loadLeavesForMonth(s.startDate, s.endDate);
      },
      error: (err) => {
        console.error('Błąd podczas ładowania grafiku', err);
        this.error.set('Nie udało się pobrać szczegółów grafiku');
        this.loading.set(false);
      }
    });
  }

  private fetchHistory(id: number): void {
    this.workScheduleService.getScheduleHistory(id).subscribe({
      next: (h) => this.history.set(h || []),
      error: () => this.history.set([])
    });
  }

  private loadEmployeeNames(): void {
    this.employeeService.getAllEmployees().subscribe({
      next: (list) => {
        const map = new Map<number, string>();
        for (const e of list) {
          const name = `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.username || `#${e.id}`;
          map.set(e.id, name);
        }
        this.employeeNames.set(map);
        // If calendar is visible, re-render events to pick up names
        const api = this.calendarRef?.getApi();
        if (api) {
          const evs = api.getEvents();
          for (const ev of evs) {
            const p: any = ev.extendedProps || {};
            const uid = p.userId;
            if (typeof uid === 'number') {
              const display = this.employeeNames().get(uid) || p.userName || '';
              // update extended prop and poke title to force rerender
              (ev as any).setExtendedProp?.('userName', display);
              ev.setProp('title', ev.title);
            }
          }
        }
      },
      error: () => this.employeeNames.set(new Map())
    });
  }

  private employeeName(userId: number): string {
    return this.employeeNames().get(userId) || '';
  }

  private loadCreatorName(userId: number): void {
    if (!userId) { this.creatorName.set(''); return; }
    this.employeeService.getEmployeeDetails(userId).subscribe({
      next: (emp) => {
        const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || emp.username || `#${userId}`;
        this.creatorName.set(name);
      },
      error: () => this.creatorName.set('')
    });
  }

  private setupCalendar(s: WorkScheduleDetailsResponse): void {
    // Build events (merged ranges or per-day)
    const events = this.buildCalendarEvents(s);
    this.calendarEvents.set(events);
    // validRange end is exclusive
    const endExclusive = new Date(s.endDate + 'T00:00:00');
    if (!Number.isNaN(endExclusive.getTime())) endExclusive.setDate(endExclusive.getDate() + 1);
    this.calendarOptions.set({
      plugins: [dayGridPlugin],
      locales: [plLocale],
      locale: 'pl',
      initialView: 'dayGridMonth',
      headerToolbar: { left: 'prev,next today', center: 'title', right: '' },
      height: 'auto',
      expandRows: true,
      fixedWeekCount: false,
      showNonCurrentDates: false,
      firstDay: 1,
      dayMaxEvents: 3,
      moreLinkContent: (args) => `+${args.num} więcej`,
      eventDisplay: 'block',
      eventContent: (arg) => {
        const p: any = arg.event.extendedProps || {};
        const name = (p.userName && String(p.userName).trim()) || this.employeeName(p.userId) || '';
        let timeText = '';
        const start = this.formatHM((p.startTime || (arg.event.startStr?.substring(11,16) ?? '')).trim());
        const end = this.formatHM((p.endTime || (arg.event.endStr?.substring(11,16) ?? '')).trim());
        if (start && end) {
          timeText = `${start}-${end}`;
        } else if (typeof p.workingHours === 'number' && !Number.isNaN(p.workingHours)) {
          timeText = `${p.workingHours}h`;
        }
        const html = `<div class="ws-event vertical"><div class="name">${name}</div>${timeText ? `<div class=\"time\">${timeText}</div>` : ''}</div>`;
        return { html };
      },
      editable: false,
      selectable: false,
  validRange: { start: s.startDate, end: this.formatLocalDate(endExclusive) },
      initialDate: s.startDate,
      events
    } as CalendarOptions);
  }

  setTableSortBy(field: 'date' | 'employee' | 'start' | 'end'): void {
    if (this.tableSortBy() === field) {
      this.tableSortDir.set(this.tableSortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.tableSortBy.set(field);
      this.tableSortDir.set('asc');
    }
  }

  getTableSortIcon(field: 'date' | 'employee' | 'start' | 'end'): string {
    if (this.tableSortBy() !== field) return 'sort';
    return this.tableSortDir() === 'asc' ? 'sort-up' : 'sort-down';
  }

  // Build list of dates within current schedule range for TABLE view
  getScheduleDates(): Array<{ date: string; day: number }> {
    const s = this.schedule();
    if (!s) return [];
    const start = new Date(s.startDate + 'T00:00:00');
    const end = new Date(s.endDate + 'T00:00:00');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    const out: Array<{ date: string; day: number }> = [];
    const cur = new Date(start);
    while (cur <= end) {
      const iso = this.formatLocalDate(cur);
      out.push({ date: iso, day: cur.getDate() });
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }

  // Get entry for employee and date (if any) for TABLE view
  getEntryFor(userId: number, date: string): WorkScheduleEntryResponse | undefined {
    const s = this.schedule();
    if (!s) return undefined;
    for (const e of s.entries ?? []) {
      if (e.userId === userId && e.workDate === date) return e;
    }
    return undefined;
  }

  // Weekend helpers for TABLE view styling
  isSaturdayDate(date: string): boolean {
    const d = new Date(date + 'T00:00:00');
    return d.getDay() === 6;
  }
  isSundayDate(date: string): boolean {
    const d = new Date(date + 'T00:00:00');
    return d.getDay() === 0;
  }

  private buildCalendarEvents(s: WorkScheduleDetailsResponse): EventInput[] {
    const entries = s.entries || [];
    if (this.mergeRanges()) {
      // Build multi-day allDay events per compressed range
      const byUser = new Map<number, WorkScheduleEntryResponse[]>();
      for (const e of entries) {
        if (!byUser.has(e.userId)) byUser.set(e.userId, []);
        byUser.get(e.userId)!.push(e);
      }
      const events: EventInput[] = [];
      for (const [userId, list] of byUser.entries()) {
        const name = (list[0]?.userName ?? this.employeeName(userId) ?? `#${userId}`).trim();
        const ranges = this.compressEntries(list);
        for (const r of ranges) {
          const endExclusive = new Date(r.endDate + 'T00:00:00');
          if (!Number.isNaN(endExclusive.getTime())) endExclusive.setDate(endExclusive.getDate() + 1);
          events.push({
            title: name,
            start: r.startDate,
            end: this.formatLocalDate(endExclusive), // exclusive
            allDay: true,
            backgroundColor: this.colorForUser(userId),
            borderColor: this.colorForUser(userId),
            extendedProps: {
              userId,
              userName: name,
              startTime: r.startTime,
              endTime: r.endTime,
              isRange: true
            }
          } as EventInput);
        }
      }
      return events;
    }
    // Per-day timed events
    return entries.map(e => {
      const name = (e.userName ?? this.employeeName(e.userId) ?? '').trim();
      const initials = this.getInitials(name);
      const hasTimes = !!(
        e.startTime && e.endTime && (
          /^\d{2}:\d{2}$/.test(e.startTime) || /^\d{2}:\d{2}:\d{2}$/.test(e.startTime)
        ) && (
          /^\d{2}:\d{2}$/.test(e.endTime) || /^\d{2}:\d{2}:\d{2}$/.test(e.endTime)
        )
      );
      const startHM = this.formatHM(e.startTime);
      const endHM = this.formatHM(e.endTime);
      const base: EventInput = {
        title: name,
        backgroundColor: this.colorForUser(e.userId),
        borderColor: this.colorForUser(e.userId),
        extendedProps: {
          userId: e.userId,
          userName: name,
          initials,
          startTime: startHM,
          endTime: endHM,
          workingHours: e.workingHours,
          hasTimes
        } as any
      };
      if (hasTimes) {
        base.start = `${e.workDate}T${startHM}:00`;
        base.end = `${e.workDate}T${endHM}:00`;
        base.allDay = false;
      } else {
        base.start = e.workDate;
        base.allDay = true;
      }
      return base;
    });
  }

  refreshCalendarEvents(): void {
    const s = this.schedule();
    if (!s) return;
    const events = this.buildCalendarEvents(s);
    this.calendarEvents.set(events);
    const api = this.calendarRef?.getApi();
    if (api) {
      api.removeAllEvents();
      for (const ev of events) api.addEvent(ev);
    } else if (this.calendarOptions()) {
      this.calendarOptions.set({ ...(this.calendarOptions() as CalendarOptions), events });
    }
  }

  goBack(): void {
    this.router.navigate(['/schedules']);
  }

  edit(): void {
    const s = this.schedule();
    if (!s) return;
    this.router.navigate(['/schedules', s.id, 'edit']);
  }

  toggleCalendar(): void {
    const next = !this.showCalendar();
    this.showCalendar.set(next);
    if (next) {
      setTimeout(() => {
        const api = this.calendarRef?.getApi();
        if (api) {
          const s = this.schedule();
          if (s) api.gotoDate(s.startDate);
          api.updateSize();
        }
      }, 0);
    }
  }

  onFilterChange(value: string): void {
    this.nameFilter.set(value);
  }

  toggleExpand(userId: number): void {
    const set = new Set(this.expandedEmployees());
    if (set.has(userId)) set.delete(userId); else set.add(userId);
    this.expandedEmployees.set(set);
  }

  // Workflow actions
  canManage(): boolean { return this.authService.hasAnyRole(['ADMIN', 'HR', 'MANAGER']); }
  canApprove(): boolean { return this.authService.hasAnyRole(['ADMIN', 'HR']); }

  submit(): void {
    const s = this.schedule(); if (!s) return;
    this.workScheduleService.submitSchedule(s.id).subscribe({
      next: () => { alert('Wysłano do akceptacji'); this.fetchSchedule(s.id); },
      error: (e) => { console.error(e); alert('Nie udało się wysłać'); }
    });
  }

  private getEntryHours(entry: WorkScheduleEntryResponse): number {
    if (typeof entry.workingHours === 'number' && !Number.isNaN(entry.workingHours)) return entry.workingHours;
    const [sh, sm] = entry.startTime.split(':').map(Number);
    const [eh, em] = entry.endTime.split(':').map(Number);
    const start = sh * 60 + sm, end = eh * 60 + em;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
    return Number(((end - start) / 60).toFixed(2));
  }
  approve(): void {
    const s = this.schedule(); if (!s) return;
    this.workScheduleService.approveSchedule(s.id).subscribe({
      next: () => { alert('Zatwierdzono'); this.fetchSchedule(s.id); },
      error: (e) => { console.error(e); alert('Nie udało się zatwierdzić'); }
    });
  }
  openRejectModal(): void {
    this.rejectReason.set('');
    this.rejectError.set(null);
    this.showRejectModal.set(true);
    document.body.classList.add('modal-open');
  }
  cancelReject(): void {
    this.showRejectModal.set(false);
    document.body.classList.remove('modal-open');
  }
  confirmReject(): void {
    const s = this.schedule(); if (!s) return;
    const reason = this.rejectReason().trim();
    if (!reason) { this.rejectError.set('Podaj powód odrzucenia'); return; }
    this.workScheduleService.rejectSchedule(s.id, { rejectionReason: reason }).subscribe({
      next: () => {
        this.showRejectModal.set(false);
        document.body.classList.remove('modal-open');
        alert('Odrzucono');
        this.fetchSchedule(s.id);
      },
      error: (e) => { console.error(e); this.rejectError.set('Nie udało się odrzucić'); }
    });
  }
  publish(): void {
    const s = this.schedule(); if (!s) return;
    this.workScheduleService.publishSchedule(s.id).subscribe({
      next: () => { alert('Opublikowano'); this.fetchSchedule(s.id); },
      error: (e) => { console.error(e); alert('Nie udało się opublikować'); }
    });
  }

  getStatusText(status: WorkScheduleStatus): string {
    switch (status) {
      case WorkScheduleStatus.DRAFT:
        return 'Szkic';
      case WorkScheduleStatus.SUBMITTED:
        return 'Przesłany';
      case WorkScheduleStatus.APPROVED:
        return 'Zatwierdzony';
      case WorkScheduleStatus.REJECTED:
        return 'Odrzucony';
      case WorkScheduleStatus.PUBLISHED:
        return 'Opublikowany';
      default:
        return status;
    }
  }

  // Format YYYY-MM-DD to DD/MM/YYYY without timezone conversions
  formatYMD(dateStr: string | undefined | null): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }

  // Deterministic pastel color based on userId
  private colorForUser(userId: number): string {
    // Simple hash to HSL pastel
    let h = (userId * 57) % 360; // spread around the hue circle
    const s = 70; // saturation
    const l = 80; // lightness
    return `hsl(${h} ${s}% ${l}%)`;
  }

  private getInitials(name: string): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    const initials = parts.slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('');
    return initials || name.substring(0, 2).toUpperCase();
  }

  private formatLocalDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Load leaves for schedule month, filter within range
  private loadLeavesForMonth(startDate: string, endDate: string): void {
    const start = new Date(startDate + 'T00:00:00');
    if (Number.isNaN(start.getTime())) { this.employeeLeaves.set({}); return; }
    const year = start.getFullYear();
    const month = start.getMonth() + 1;
    this.leavesLoading.set(true);
    this.leaveProposalService.getEmployeesLeavesByMonth(year, month).subscribe({
      next: (resp) => {
        const map: Record<number, LeaveDay[]> = {};
        for (const emp of resp.employees) {
          const filtered = emp.leaveDays.filter(d => d.date >= startDate && d.date <= endDate);
          if (filtered.length) map[emp.employeeId] = filtered;
        }
        this.employeeLeaves.set(map);
        this.leavesLoading.set(false);
      },
      error: () => { this.employeeLeaves.set({}); this.leavesLoading.set(false); }
    });
  }

  formatDateList(dates: string[]): string {
    return dates.map(iso => this.formatYMD(iso)).join(', ');
  }

  formatLeaveList(leaves: LeaveDay[]): string {
    return leaves
      .slice()
      .sort((a,b)=> a.date.localeCompare(b.date))
      .map(l => `${this.formatYMD(l.date)} (${LEAVE_TYPE_LABELS[l.leaveType] || l.leaveType})`)
      .join(', ');
  }

  // Build ranged rows for an employee: merge consecutive days with same hours/overtime
  compressEntries(entries: WorkScheduleEntryResponse[]): Array<{ startDate: string; endDate: string; startTime: string; endTime: string; isOvertime: boolean; days: number }> {
    if (!entries || entries.length === 0) return [];
    const sorted = [...entries].sort((a, b) => (a.workDate || '').localeCompare(b.workDate || ''));
    const ranges: Array<{ startDate: string; endDate: string; startTime: string; endTime: string; isOvertime: boolean; days: number }> = [];
    const sameSignature = (a: WorkScheduleEntryResponse, b: WorkScheduleEntryResponse) =>
      a.startTime === b.startTime && a.endTime === b.endTime && !!a.isOvertime === !!b.isOvertime;
    const isNextDay = (prev: string, curr: string) => {
      const pd = new Date(prev + 'T00:00:00');
      const cd = new Date(curr + 'T00:00:00');
      if (Number.isNaN(pd.getTime()) || Number.isNaN(cd.getTime())) return false;
      const diff = (cd.getTime() - pd.getTime()) / (1000 * 60 * 60 * 24);
      return Math.round(diff) === 1;
    };
    let blockStart = sorted[0];
    let blockEnd = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const cur = sorted[i];
      if (sameSignature(blockStart, cur) && isNextDay(blockEnd.workDate, cur.workDate)) {
        blockEnd = cur; // extend
      } else {
        // finalize previous block
        ranges.push({
          startDate: blockStart.workDate,
          endDate: blockEnd.workDate,
          startTime: this.formatHM(blockStart.startTime),
          endTime: this.formatHM(blockStart.endTime),
          isOvertime: !!blockStart.isOvertime,
          days: this.countDays(blockStart.workDate, blockEnd.workDate)
        });
        // start new block
        blockStart = cur;
        blockEnd = cur;
      }
    }
    // push last block
    ranges.push({
      startDate: blockStart.workDate,
      endDate: blockEnd.workDate,
      startTime: this.formatHM(blockStart.startTime),
      endTime: this.formatHM(blockStart.endTime),
      isOvertime: !!blockStart.isOvertime,
      days: this.countDays(blockStart.workDate, blockEnd.workDate)
    });
    return ranges;
  }

  private countDays(start: string, end: string): number {
    const sd = new Date(start + 'T00:00:00');
    const ed = new Date(end + 'T00:00:00');
    if (Number.isNaN(sd.getTime()) || Number.isNaN(ed.getTime())) return 1;
    const diff = (ed.getTime() - sd.getTime()) / (1000 * 60 * 60 * 24);
    return Math.abs(Math.round(diff)) + 1; // inclusive
  }

  // Normalize time strings to HH:mm (accept HH:mm or HH:mm:ss)
  public formatHM(value: string | undefined | null): string {
    if (!value) return '';
    const v = String(value).trim();
    const m1 = v.match(/^(\d{2}):(\d{2})$/);
    if (m1) return `${m1[1]}:${m1[2]}`;
    const m2 = v.match(/^(\d{2}):(\d{2}):(\d{2})$/);
    if (m2) return `${m2[1]}:${m2[2]}`;
    // Fallback: attempt first 5 chars if looks like HH:mm:..
    if (/^\d{2}:\d{2}:/.test(v)) return v.substring(0,5);
    return v;
  }
}
