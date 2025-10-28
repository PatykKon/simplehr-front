import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, map, tap } from 'rxjs';
import { ScheduleConfig, DayPreview, WeeklyRotationConfig, WeeklyRotationShift, CycleWorkOffConfig, FixedHoursConfig, ScheduleConfigDto, ShiftPatternDto, PatternBlockDto } from '../models/schedule-config.models';

const STORAGE_KEY = 'scheduleConfigs';

@Injectable({ providedIn: 'root' })
export class ScheduleConfigService {
  private configs: ScheduleConfig[] = [];
  private readonly API_URL = `${environment.apiUrl}/api/schedule-configs`;
  constructor(private http: HttpClient) {
    // try to load from backend initially; fallback to local storage if offline
    this.load();
  }

  getAll(): ScheduleConfig[] { return [...this.configs]; }

  refresh(): Observable<ScheduleConfig[]> {
    return this.http.get<ScheduleConfigDto[]>(this.API_URL).pipe(
      map(list => list.map(dto => this.fromBackend(dto))),
      tap(list => { this.configs = list; this.persist(); })
    );
  }

  get(id: string): ScheduleConfig | undefined { return this.configs.find(c => c.id === id); }

  save(cfg: ScheduleConfig): Observable<ScheduleConfig> {
    const dto = this.toBackend(cfg);
    return this.http.post<ScheduleConfigDto>(this.API_URL, dto).pipe(
      map(saved => this.fromBackend(saved)),
      tap(savedCfg => {
        const idx = this.configs.findIndex(c => c.id === savedCfg.id);
        if (idx >= 0) this.configs[idx] = savedCfg; else this.configs.push(savedCfg);
        this.persist();
      })
    );
  }

  delete(id: string): Observable<void> {
    const numId = Number(id);
    return this.http.delete<void>(`${this.API_URL}/${numId}`).pipe(
      tap(() => {
        this.configs = this.configs.filter(c => c.id !== id);
        this.persist();
      })
    );
  }

  private load(): void {
    // Try backend; if fails (e.g., CORS/offline), fallback to localStorage
    this.http.get<ScheduleConfigDto[]>(this.API_URL).pipe(
      map(list => list.map(dto => this.fromBackend(dto)))
    ).subscribe({
      next: list => { this.configs = list; this.persist(); },
      error: () => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) this.configs = JSON.parse(raw);
        } catch { this.configs = []; }
      }
    });
  }

  private persist(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.configs)); } catch { /* ignore */ }
  }

  // Preview generation API
  generatePreview(cfg: ScheduleConfig, month: string): DayPreview[] {
    // month as YYYY-MM
    const [y, m] = month.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    const days: DayPreview[] = [];
    const cursor = new Date(start);

    while (cursor <= end) {
      const date = this.formatLocalDate(cursor);
      const dow = cursor.getDay(); // 0 Sun .. 6 Sat
      const isSaturday = dow === 6;
      const isSunday = dow === 0;
      const isWeekend = isSaturday || isSunday;
      const isHoliday = false; // Placeholder: requires holiday calendar

      let day: DayPreview = { date, isWork: false };
      switch (cfg.type) {
        case 'FIXED_HOURS':
          day = this.previewFixed(cfg, date, { isWeekend, isSaturday, isSunday, isHoliday });
          break;
        case 'WEEKLY_ROTATION':
          day = this.previewWeeklyRotation(cfg, date, start, { isWeekend, isSaturday, isSunday, isHoliday });
          break;
        case 'CYCLE_WORK_OFF':
          day = this.previewCycle(cfg, date, { isWeekend, isSaturday, isSunday, isHoliday });
          break;
      }
      days.push(day);
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }

  private previewFixed(cfg: FixedHoursConfig, date: string, flags: any): DayPreview {
    const skipSat = !cfg.includeSaturdays && flags.isSaturday;
    const skipSun = !cfg.includeSundays && flags.isSunday;
    const skipHol = !cfg.includeHolidays && flags.isHoliday;
    if (skipSat || skipSun || skipHol) return { date, isWork: false };
    return { date, isWork: true, startTime: cfg.startTime, endTime: cfg.endTime };
  }

  private previewWeeklyRotation(cfg: WeeklyRotationConfig, date: string, _monthStart: Date, flags: any): DayPreview {
    const skipSat = !cfg.includeSaturdays && flags.isSaturday;
    const skipSun = !cfg.includeSundays && flags.isSunday;
    const skipHol = !cfg.includeHolidays && flags.isHoliday;
    if (skipSat || skipSun || skipHol) return { date, isWork: false };

    const mode = cfg.rotationMode || (cfg.segments && cfg.segments.length ? 'BY_DATES' : 'BY_WEEKS');
    if (mode === 'BY_DATES') {
      const seg = (cfg.segments || []).find(s => this.inRange(date, s.from, s.to));
      if (!seg) return { date, isWork: false };
      return { date, isWork: true, startTime: seg.startTime, endTime: seg.endTime, note: seg.label };
    }

    // BY_WEEKS
    const d = new Date(date + 'T00:00:00');
    const anchorStr = cfg.rotationStartDate || '';
    let anchor = new Date(anchorStr + 'T00:00:00');
    // Fallback: if no valid anchor provided, use first day of the month being previewed
    if (!anchorStr || isNaN(anchor.getTime())) {
      anchor = new Date(d.getFullYear(), d.getMonth(), 1);
    }

    const rotation = cfg.rotation && cfg.rotation.length ? cfg.rotation : [];
    if (rotation.length === 0) return { date, isWork: false };

    // Compute ISO week index difference
    const weekDiff = this.weeksBetween(anchor, d);
    const expanded: WeeklyRotationShift[] = [];
    for (const s of rotation) {
      const count = Math.max(1, Math.floor((s.weeks as number) || 1));
      for (let i = 0; i < count; i++) expanded.push(s);
    }
    if (expanded.length === 0) return { date, isWork: false };
    const idx = ((weekDiff % expanded.length) + expanded.length) % expanded.length;
    const shift = expanded[idx];
    if (!shift) return { date, isWork: false };
    return { date, isWork: true, startTime: shift.startTime, endTime: shift.endTime, note: shift.label };
  }

  private previewCycle(cfg: CycleWorkOffConfig, date: string, flags: any): DayPreview {
    const mode = cfg.cycleMode || (cfg.blocks && cfg.blocks.length ? 'BLOCKS' : 'STRING');
    if (mode === 'BLOCKS') {
      // Repeat blocks from anchor date forward, counting applicable days
      const d = new Date(date + 'T00:00:00');
      let anchor = new Date((cfg.cycleStartDate || '') + 'T00:00:00');
      // Fallback: if no valid anchor provided, use first day or first weekend day of the month
      if (isNaN(anchor.getTime())) {
        anchor = cfg.startOnWeekend ? this.firstWeekendAnchorOfMonth(d, cfg) : new Date(d.getFullYear(), d.getMonth(), 1);
      }

      const blocks = (cfg.blocks || []).filter(b => b && b.days && b.days > 0);
      if (blocks.length === 0) return { date, isWork: false };

      // Build a repeated window until reaching target date efficiently by modulo
      // Advance only on included days
      const applicableCount = this.applicableDaysBetween(anchor, d, cfg);
      if (applicableCount < 1) return { date, isWork: false };

      // Compute total cycle length in applicable days
      const total = blocks.reduce((acc, b) => acc + (b.days || 0), 0);
      if (total <= 0) return { date, isWork: false };
      let pos = (applicableCount - 1) % total;
      for (const b of blocks) {
        const span = b.days || 0;
        if (pos < span) {
          if (b.kind === 'WORK') {
            return { date, isWork: true, startTime: b.startTime!, endTime: b.endTime!, note: b.label };
          }
          return { date, isWork: false, note: b.label };
        }
        pos -= span;
      }
      return { date, isWork: false };
    }

    // STRING mode (legacy)
    const cycle = (cfg.cycle || '').toUpperCase().replace(/[^WO]/g, '');
    if (!cycle) return { date, isWork: false };

    const d = new Date(date + 'T00:00:00');
    let anchor = new Date((cfg.cycleStartDate || '') + 'T00:00:00');
    // Fallback: if no valid anchor provided, use first day or first weekend day of the month
    if (isNaN(anchor.getTime())) {
      anchor = cfg.startOnWeekend ? this.firstWeekendAnchorOfMonth(d, cfg) : new Date(d.getFullYear(), d.getMonth(), 1);
    }

    const applicableDays = this.applicableDaysBetween(anchor, d, cfg);
    if (applicableDays < 1) return { date, isWork: false };
    const idx = ((applicableDays - 1) % cycle.length + cycle.length) % cycle.length;
    const ch = cycle[idx];
    if (ch === 'W') return { date, isWork: true, startTime: cfg.workStartTime, endTime: cfg.workEndTime };
    return { date, isWork: false };
  }

  private weeksBetween(a: Date, b: Date): number {
    const ms = 1000 * 60 * 60 * 24 * 7;
    const ad = this.startOfWeek(a);
    const bd = this.startOfWeek(b);
    return Math.floor((bd.getTime() - ad.getTime()) / ms);
  }

  private startOfWeek(d: Date): Date {
    const x = new Date(d);
    const day = x.getDay(); // 0 Sun
    const diff = (day + 6) % 7; // make Monday start
    x.setDate(x.getDate() - diff);
    x.setHours(0,0,0,0);
    return x;
  }

  private daysBetween(a: Date, b: Date): number {
    const ad = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const bd = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    const diff = bd.getTime() - ad.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private formatLocalDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private inRange(date: string, from: string, to: string): boolean {
    return date >= from && date <= to;
  }

  private applicableDaysBetween(a: Date, b: Date, cfg: { includeSaturdays: boolean; includeSundays: boolean; includeHolidays: boolean; }): number {
    const dayDiff = this.daysBetween(a, b);
    let count = 0;
    for (let i = 0; i <= dayDiff; i++) {
      const cd = new Date(a);
      cd.setDate(cd.getDate() + i);
      const dd = cd.getDay();
      const isSat = dd === 6;
      const isSun = dd === 0;
      const isHol = false; // placeholder until holiday provider
      const skipSat = !cfg.includeSaturdays && isSat;
      const skipSun = !cfg.includeSundays && isSun;
      const skipHol = !cfg.includeHolidays && isHol;
      if (!(skipSat || skipSun || skipHol)) count++;
    }
    return count;
  }

  private firstWeekendAnchorOfMonth(ref: Date, cfg: { includeSaturdays: boolean; includeSundays: boolean; }): Date {
    const y = ref.getFullYear();
    const m = ref.getMonth();
    // Prefer included weekend day; if none included, still pick Saturday for alignment
    const preferSat = cfg.includeSaturdays || !cfg.includeSundays;
    // Search first 7-8 days should be enough, but go through whole month defensively
    for (let d = 1; d <= 31; d++) {
      const x = new Date(y, m, d);
      if (x.getMonth() !== m) break;
      const day = x.getDay();
      if (preferSat && day === 6) return x; // Saturday
      if (!preferSat && day === 0) return x; // Sunday
    }
    // Fallback to first day if not found (shouldn't happen)
    return new Date(y, m, 1);
  }

  // Mapping: UI -> Backend
  private toBackend(cfg: ScheduleConfig): ScheduleConfigDto {
    if (cfg.type === 'CYCLE_WORK_OFF') {
      const c = cfg as CycleWorkOffConfig;
      const pattern: ShiftPatternDto = {
        name: 'default',
        blocks: (c.blocks || []).map(b => {
          const pb: PatternBlockDto = {
            blockType: b.kind,
            durationDays: b.days,
          };
          if (b.kind === 'WORK') {
            pb.startTime = b.startTime || '08:00';
            pb.endTime = b.endTime || '16:00';
          }
          return pb;
        })
      };
      return {
        id: this.tryParseId(cfg.id),
        name: cfg.name,
        configType: 'ROTATIONAL',
        patterns: [pattern]
      };
    }
    if (cfg.type === 'WEEKLY_ROTATION') {
      // Minimal mapping: convert weekly shifts into a single weekly pattern as WORK blocks of 7 days with given hours
      const w = cfg as WeeklyRotationConfig;
      const blocks: PatternBlockDto[] = (w.rotation || []).map(r => ({
        blockType: 'WORK',
        durationDays: Math.max(1, Number(r.weeks || 1)) * 7,
        startTime: r.startTime,
        endTime: r.endTime
      }));
      return {
        id: this.tryParseId(cfg.id),
        name: cfg.name,
        configType: 'WEEKLY',
        patterns: [{ name: 'weekly', blocks }]
      };
    }
    // FIXED_HOURS -> FIXED
    const f = cfg as FixedHoursConfig;
    return {
      id: this.tryParseId(cfg.id),
      name: cfg.name,
      configType: 'FIXED',
      patterns: [{ name: 'fixed', blocks: [{ blockType: 'WORK', durationDays: 1, startTime: f.startTime, endTime: f.endTime }] }]
    };
  }

  private tryParseId(id?: string): number | undefined {
    if (!id) return undefined;
    const n = Number(id);
    return isNaN(n) ? undefined : n;
  }

  // Mapping: Backend -> UI
  private fromBackend(dto: ScheduleConfigDto): ScheduleConfig {
    const base = {
      id: (dto.id != null ? String(dto.id) : this.genLocalId()),
      name: dto.name,
      description: '',
      includeSaturdays: false,
      includeSundays: false,
      includeHolidays: false,
    };
    if (dto.configType === 'ROTATIONAL') {
      const blocks = (dto.patterns?.[0]?.blocks || []).map(b => ({
        kind: b.blockType as 'WORK' | 'OFF',
        days: b.durationDays,
        startTime: b.startTime || undefined,
        endTime: b.endTime || undefined,
        label: b.startTime && b.endTime ? `${b.startTime}-${b.endTime}` : undefined
      }));
      const cfg: CycleWorkOffConfig = {
        ...base,
        type: 'CYCLE_WORK_OFF',
        cycleMode: 'BLOCKS',
        cycleStartDate: '',
        blocks
      };
      return cfg;
    }
    if (dto.configType === 'WEEKLY') {
      const shifts: WeeklyRotationShift[] = (dto.patterns?.[0]?.blocks || []).filter(b => b.blockType === 'WORK').map(b => ({
        label: b.startTime && b.endTime ? `${b.startTime}-${b.endTime}` : '',
        startTime: b.startTime || '08:00',
        endTime: b.endTime || '16:00',
        weeks: Math.max(1, Math.round((b.durationDays || 7) / 7))
      }));
      const cfg: WeeklyRotationConfig = {
        ...base,
        type: 'WEEKLY_ROTATION',
        rotationMode: 'BY_WEEKS',
        rotationStartDate: '',
        rotation: shifts
      };
      return cfg;
    }
    // FIXED or others -> map to fixed hours
    const first = dto.patterns?.[0]?.blocks?.find(b => b.blockType === 'WORK');
    const fc: FixedHoursConfig = {
      ...base,
      type: 'FIXED_HOURS',
      startTime: first?.startTime || '08:00',
      endTime: first?.endTime || '16:00'
    };
    return fc;
  }

  private genLocalId(): string { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
}
