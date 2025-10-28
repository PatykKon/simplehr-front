import { Component, OnInit, HostListener, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ScheduleConfigService } from '../../../services/schedule-config.service';
import { ScheduleConfig, SchedulePatternType, WeeklyRotationShift, DayPreview, WeeklyRotationConfig, CycleWorkOffConfig } from '../../../models/schedule-config.models';

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

@Component({
  selector: 'app-schedule-configs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './schedule-configs.component.html',
  styleUrls: ['./schedule-configs.component.css']
})
export class ScheduleConfigsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(ScheduleConfigService);
  private router = inject(Router);

  configs = signal<ScheduleConfig[]>([]);
  selectedId = signal<string | null>(null);
  month = signal<string>(this.defaultMonth());
  preview = signal<DayPreview[]>([]);
  showPreviewModal = signal<boolean>(false);

  // Auto-preview when type or month changes (must be created in injection context)
  private _autoPreview = effect(() => {
    // read signals to subscribe
    void this.type();
    void this.month();
    this.updatePreview();
  });

  // Optional generators (no hardcoded auto-fill; run only on button click)
  genHours: Array<{ label: string; startTime: string; endTime: string }> = [];
  // Weekly generator
  genWeeklyWeeksPerShift = 1;
  genWeeklyCycles = 1;
  genSimpleWeeklyStartTime = '06:00';
  genSimpleWeeklyEndTime = '14:00';
  genSimpleWeeklyWeeks = 1;
  genSimpleWeeklyCycles = 1;
  // Blocks generator
  genBlocksWorkDays = 2;
  genBlocksOffDays = 2;
  genBlocksCycles = 1;
  genSimpleBlocksWorkDays = 2;
  genSimpleBlocksOffDays = 2;
  genSimpleBlocksStartTime = '06:00';
  genSimpleBlocksEndTime = '14:00';
  genSimpleBlocksCycles = 1;
  // Cycle with shift list (per working day)
  genCycleWorkDays = 2;
  genCycleOffDays = 2;
  genCycleCycles = 1;
  cycleShifts: Array<{ label: string; startTime: string; endTime: string }> = [];

  // Quick fields for immediate blocks setup
  quickWorkDays = 2;
  quickOffDays = 2;
  quickStartTime = '06:00';
  quickEndTime = '14:00';

  // Advanced toggles
  showAdvancedWeeklyGen = signal<boolean>(false);
  showAdvancedBlocksGen = signal<boolean>(false);

  form: FormGroup = this.fb.group({
    id: new FormControl<string>(''),
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    description: new FormControl<string>(''),
    type: new FormControl<SchedulePatternType>('FIXED_HOURS', { nonNullable: true }),
    includeSaturdays: new FormControl<boolean>(false, { nonNullable: true }),
    includeSundays: new FormControl<boolean>(false, { nonNullable: true }),
    includeHolidays: new FormControl<boolean>(false, { nonNullable: true }),

    // FIXED_HOURS
    startTime: new FormControl<string>('08:00'),
    endTime: new FormControl<string>('16:00'),

    // WEEKLY_ROTATION
    rotationMode: new FormControl<'BY_WEEKS' | 'BY_DATES'>('BY_WEEKS'),
  // rotationStartDate intentionally omitted from UI; kept for backward compatibility
  rotationStartDate: new FormControl<string>(''),
    rotation: this.fb.array<FormGroup<{
      label: FormControl<string>;
      startTime: FormControl<string>;
      endTime: FormControl<string>;
      weeks: FormControl<number>;
    }>>([]),
    segments: this.fb.array<FormGroup<{
      from: FormControl<string>;
      to: FormControl<string>;
      label: FormControl<string>;
      startTime: FormControl<string>;
      endTime: FormControl<string>;
    }>>([]),

    // CYCLE_WORK_OFF
    cycleMode: new FormControl<'STRING' | 'BLOCKS'>('STRING'),
    cycle: new FormControl<string>('WWOO'),
  // cycleStartDate intentionally omitted from UI; kept for backward compatibility
  cycleStartDate: new FormControl<string>(''),
  startOnWeekend: new FormControl<boolean>(false, { nonNullable: true }),
    workStartTime: new FormControl<string>('08:00'),
    workEndTime: new FormControl<string>('16:00'),
    blocks: this.fb.array<FormGroup<{
      kind: FormControl<'WORK' | 'OFF'>;
      days: FormControl<number>;
      startTime: FormControl<string | null>;
      endTime: FormControl<string | null>;
      label: FormControl<string | null>;
    }>>([]),
  });

  type = computed(() => this.form.get('type')!.value as SchedulePatternType);

  ngOnInit(): void {
    this.refreshList();
    // Initial preview
    this.updatePreview();

    // Keep preview in sync with important form changes
    this.form.get('includeSaturdays')?.valueChanges.subscribe(() => this.updatePreview());
    this.form.get('includeSundays')?.valueChanges.subscribe(() => this.updatePreview());
    this.form.get('includeHolidays')?.valueChanges.subscribe(() => this.updatePreview());
    this.form.get('startTime')?.valueChanges.subscribe(() => this.updatePreview());
    this.form.get('endTime')?.valueChanges.subscribe(() => this.updatePreview());
    this.form.get('rotationMode')?.valueChanges.subscribe(() => this.updatePreview());
    this.rotationArray.valueChanges.subscribe(() => this.updatePreview());
    this.segmentArray.valueChanges.subscribe(() => this.updatePreview());
    this.blockArray.valueChanges.subscribe(() => this.updatePreview());
  }

  get rotationArray(): FormArray { return this.form.get('rotation') as FormArray; }
  get segmentArray(): FormArray { return this.form.get('segments') as FormArray; }
  get blockArray(): FormArray { return this.form.get('blocks') as FormArray; }

  refreshList(): void {
    this.svc.refresh().subscribe({
      next: list => this.configs.set(list),
      error: () => this.configs.set(this.svc.getAll()),
    });
  }

  select(cfg: ScheduleConfig): void {
    this.selectedId.set(cfg.id);
    this.form.reset();
    // Patch base fields
    this.form.patchValue({
      id: cfg.id,
      name: cfg.name,
      description: (cfg as any).description || '',
      type: cfg.type,
      includeSaturdays: cfg.includeSaturdays,
      includeSundays: cfg.includeSundays,
      includeHolidays: cfg.includeHolidays,
    });
    // Clear rotation array
    this.rotationArray.clear();

    if (cfg.type === 'FIXED_HOURS') {
      this.form.patchValue({ startTime: cfg.startTime, endTime: cfg.endTime });
    } else if (cfg.type === 'WEEKLY_ROTATION') {
      this.form.patchValue({ rotationMode: cfg.rotationMode || (cfg.segments?.length ? 'BY_DATES' : 'BY_WEEKS'), rotationStartDate: cfg.rotationStartDate || '' });
      this.rotationArray.clear();
      this.segmentArray.clear();
      (cfg.rotation || []).forEach(s => this.rotationArray.push(this.newShiftGroup(s)));
      (cfg.segments || []).forEach(seg => this.segmentArray.push(this.newSegmentGroup(seg)));
    } else if (cfg.type === 'CYCLE_WORK_OFF') {
      this.form.patchValue({
        cycleMode: cfg.cycleMode || (cfg.blocks?.length ? 'BLOCKS' : 'STRING'),
        cycle: cfg.cycle,
        cycleStartDate: cfg.cycleStartDate,
        workStartTime: cfg.workStartTime || '08:00',
        workEndTime: cfg.workEndTime || '16:00',
      });
      this.blockArray.clear();
      (cfg.blocks || []).forEach(b => this.blockArray.push(this.newBlockGroup(b)));
    }
    this.updatePreview();
  }

  newConfig(): void {
    this.selectedId.set(null);
    this.form.reset({
      id: uuid(),
      name: '',
      description: '',
      type: 'FIXED_HOURS',
      includeSaturdays: false,
      includeSundays: false,
      includeHolidays: false,
      startTime: '08:00',
      endTime: '16:00',
      rotationMode: 'BY_WEEKS',
      rotationStartDate: '',
      cycle: 'WWOO',
      cycleMode: 'STRING',
      cycleStartDate: '',
      workStartTime: '08:00',
      workEndTime: '16:00'
    });
    this.rotationArray.clear();
    this.segmentArray.clear();
    this.blockArray.clear();
    this.updatePreview();
  }

  save(): void {
    const value = this.form.getRawValue();
    const cfg: ScheduleConfig = this.toConfig(value);
    if (!cfg.id) cfg.id = uuid();
    this.svc.save(cfg).subscribe(saved => {
      this.selectedId.set(saved.id);
      this.refreshList();
      this.updatePreview();
    });
  }

  delete(cfg: ScheduleConfig): void {
    if (!confirm(`Usunąć konfigurację "${cfg.name}"?`)) return;
    this.svc.delete(cfg.id).subscribe(() => {
      if (this.selectedId() === cfg.id) this.selectedId.set(null);
      this.refreshList();
    });
  }

  changeType(t: SchedulePatternType): void {
    this.form.get('type')!.setValue(t);
    // Reset type-specific parts
    if (t === 'FIXED_HOURS') {
      // nothing else
    } else if (t === 'WEEKLY_ROTATION') {
      this.form.get('rotationMode')?.setValue('BY_WEEKS');
      if (this.rotationArray.length === 0) this.addShiftPreset();
    } else if (t === 'CYCLE_WORK_OFF') {
      // ensure defaults present
    }
    this.updatePreview();
  }

  // Rotation helpers
  addShiftPreset(): void {
    // Dodaje standardowy zestaw 6–14 / 14–22 / 22–6 jako opcjonalną pomoc
    this.rotationArray.push(this.newShiftGroup({ label: '6-14', startTime: '06:00', endTime: '14:00', weeks: 1 }));
    this.rotationArray.push(this.newShiftGroup({ label: '14-22', startTime: '14:00', endTime: '22:00', weeks: 1 }));
    this.rotationArray.push(this.newShiftGroup({ label: '22-6', startTime: '22:00', endTime: '06:00', weeks: 1 }));
    this.updatePreview();
  }

  addShiftEmpty(): void {
    this.rotationArray.push(this.newShiftGroup({ label: '', startTime: '08:00', endTime: '16:00', weeks: 1 }));
    this.updatePreview();
  }

  removeShift(i: number): void { this.rotationArray.removeAt(i); this.updatePreview(); }

  private newShiftGroup(s?: Partial<WeeklyRotationShift>): FormGroup {
    return this.fb.group({
      label: new FormControl<string>(s?.label ?? ''),
      startTime: new FormControl<string>(s?.startTime ?? '08:00'),
      endTime: new FormControl<string>(s?.endTime ?? '16:00'),
      weeks: new FormControl<number>(s?.weeks ?? 1, { nonNullable: true })
    });
  }

  private newSegmentGroup(seg?: Partial<{ from: string; to: string; label?: string; startTime: string; endTime: string; }>): FormGroup {
    return this.fb.group({
      from: new FormControl<string>(seg?.from ?? ''),
      to: new FormControl<string>(seg?.to ?? ''),
      label: new FormControl<string>(seg?.label ?? ''),
      startTime: new FormControl<string>(seg?.startTime ?? '08:00'),
      endTime: new FormControl<string>(seg?.endTime ?? '16:00')
    });
  }

  addSegment(): void { this.segmentArray.push(this.newSegmentGroup()); this.updatePreview(); }
  removeSegment(i: number): void { this.segmentArray.removeAt(i); this.updatePreview(); }

  private newBlockGroup(b?: Partial<{ kind: 'WORK' | 'OFF'; days: number; startTime?: string; endTime?: string; label?: string; }>): FormGroup {
    return this.fb.group({
      kind: new FormControl<'WORK' | 'OFF'>(b?.kind ?? 'WORK', { nonNullable: true }),
      days: new FormControl<number>(b?.days ?? 2, { nonNullable: true }),
      startTime: new FormControl<string | null>(b?.startTime ?? '06:00'),
      endTime: new FormControl<string | null>(b?.endTime ?? '14:00'),
      label: new FormControl<string | null>(b?.label ?? '')
    });
  }

  addBlock(kind: 'WORK' | 'OFF' = 'WORK'): void { this.blockArray.push(this.newBlockGroup({ kind })); this.updatePreview(); }
  removeBlock(i: number): void { this.blockArray.removeAt(i); this.updatePreview(); }

  // Weekly quick-add helpers
  addWeeklyShiftQuick(label: string, startTime: string, endTime: string, weeks: number = 1): void {
    this.rotationArray.push(this.newShiftGroup({ label, startTime, endTime, weeks }));
    this.updatePreview();
  }

  // Hours list for generators
  addGenHour(): void {
    this.genHours.push({ label: '', startTime: '08:00', endTime: '16:00' });
  }
  removeGenHour(i: number): void {
    this.genHours.splice(i, 1);
  }

  // Cycle shift list helpers
  addCycleShift(label: string = '', startTime: string = '06:00', endTime: string = '14:00'): void {
    this.cycleShifts.push({ label, startTime, endTime });
  }
  removeCycleShift(i: number): void {
    this.cycleShifts.splice(i, 1);
  }
  addCycleShiftPreset(label: string, startTime: string, endTime: string): void {
    this.addCycleShift(label, startTime, endTime);
  }

  // Generators (explicit, user-triggered)
  generateWeeklyRotationFromHours(): void {
    if (this.genHours.length === 0 || this.genWeeklyWeeksPerShift < 1 || this.genWeeklyCycles < 1) return;
    this.rotationArray.clear();
    for (let c = 0; c < this.genWeeklyCycles; c++) {
      for (const h of this.genHours) {
        this.rotationArray.push(this.newShiftGroup({ label: h.label || `${h.startTime}-${h.endTime}`, startTime: h.startTime, endTime: h.endTime, weeks: this.genWeeklyWeeksPerShift }));
      }
    }
    this.updatePreview();
  }

  generateBlocksFromHours(): void {
    if (this.genHours.length === 0 || this.genBlocksWorkDays < 1 || this.genBlocksCycles < 1) return;
    this.blockArray.clear();
    for (let c = 0; c < this.genBlocksCycles; c++) {
      for (const h of this.genHours) {
        // Work block
        this.blockArray.push(this.newBlockGroup({ kind: 'WORK', days: this.genBlocksWorkDays, startTime: h.startTime, endTime: h.endTime, label: h.label || `${h.startTime}-${h.endTime}` }));
        // Off block (optional if off days > 0)
        if (this.genBlocksOffDays > 0) {
          this.blockArray.push(this.newBlockGroup({ kind: 'OFF', days: this.genBlocksOffDays }));
        }
      }
    }
    this.updatePreview();
  }

  generateWeeklySimple(): void {
    const weeks = Math.max(1, Number(this.genSimpleWeeklyWeeks || 0));
    const cycles = Math.max(1, Number(this.genSimpleWeeklyCycles || 0));
    const st = this.genSimpleWeeklyStartTime;
    const et = this.genSimpleWeeklyEndTime;
    if (!st || !et) return;
    this.rotationArray.clear();
    for (let c = 0; c < cycles; c++) {
      this.rotationArray.push(this.newShiftGroup({ label: `${st}-${et}` , startTime: st, endTime: et, weeks }));
    }
    this.updatePreview();
  }

  generateSimpleBlocks(): void {
    const workDays = Math.max(1, Number(this.genSimpleBlocksWorkDays || 0));
    const offDays = Math.max(0, Number(this.genSimpleBlocksOffDays || 0));
    const cycles = Math.max(1, Number(this.genSimpleBlocksCycles || 0));
    const st = this.genSimpleBlocksStartTime;
    const et = this.genSimpleBlocksEndTime;
    if (!st || !et) return;
    this.blockArray.clear();
    for (let c = 0; c < cycles; c++) {
      this.blockArray.push(this.newBlockGroup({ kind: 'WORK', days: workDays, startTime: st, endTime: et, label: `${st}-${et}` }));
      if (offDays > 0) this.blockArray.push(this.newBlockGroup({ kind: 'OFF', days: offDays }));
    }
    this.updatePreview();
  }

  // Generator: Cycle with per-day shift rotation
  generateCycleFromShiftList(): void {
    const workDays = Math.max(1, Number(this.genCycleWorkDays || 0));
    const offDays = Math.max(0, Number(this.genCycleOffDays || 0));
    const cycles = Math.max(1, Number(this.genCycleCycles || 0));
    const shifts = this.cycleShifts.filter(s => s.startTime && s.endTime);
    if (shifts.length === 0) return;
    // Force BLOCKS mode for clarity
    this.form.get('cycleMode')?.setValue('BLOCKS');
    this.blockArray.clear();
    // Expected behavior: for each shift, add workDays of that same shift, then offDays, then next shift
    for (let c = 0; c < cycles; c++) {
      for (const s of shifts) {
        const label = s.label || `${s.startTime}-${s.endTime}`;
        // One block per shift with consecutive workDays
        this.blockArray.push(this.newBlockGroup({ kind: 'WORK', days: workDays, startTime: s.startTime, endTime: s.endTime, label }));
        // Followed by OFF block (if any)
        if (offDays > 0) this.blockArray.push(this.newBlockGroup({ kind: 'OFF', days: offDays }));
      }
    }
    this.updatePreview();
  }

  // UI toggles for advanced generators
  toggleAdvancedWeeklyGen(): void { this.showAdvancedWeeklyGen.update(val => !val); }
  toggleAdvancedBlocksGen(): void { this.showAdvancedBlocksGen.update(val => !val); }

  // Smooth scroll helper
  scrollTo(id: string): void {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Preview modal controls
  openPreviewModal(): void { this.showPreviewModal.set(true); }
  closePreviewModal(): void { this.showPreviewModal.set(false); }

  @HostListener('document:keydown.escape')
  onEsc(): void { if (this.showPreviewModal()) this.closePreviewModal(); }

  // Quick actions
  clearRotation(): void { this.rotationArray.clear(); this.updatePreview(); }
  clearBlocks(): void { this.blockArray.clear(); this.updatePreview(); }

  setWeekendIncluded(val: boolean): void {
    this.form.get('includeSaturdays')?.setValue(val);
    this.form.get('includeSundays')?.setValue(val);
    this.updatePreview();
  }

  // Apply quick fields directly to blocks config
  applyQuickCycle(): void {
    // Ensure BLOCKS mode
    this.form.get('cycleMode')?.setValue('BLOCKS');
    const work = Math.max(1, Number(this.quickWorkDays || 0));
    const off = Math.max(0, Number(this.quickOffDays || 0));
    const st = this.quickStartTime;
    const et = this.quickEndTime;
    if (!st || !et) return;
    this.blockArray.clear();
    this.blockArray.push(this.newBlockGroup({ kind: 'WORK', days: work, startTime: st, endTime: et, label: `${st}-${et}` }));
    if (off > 0) this.blockArray.push(this.newBlockGroup({ kind: 'OFF', days: off }));
    this.updatePreview();
  }

  // One-click preset: 2 day (06-18), 2 night (18-06), 2 off
  applyTwoDayTwoNightTwoOff(): void {
    this.form.get('cycleMode')?.setValue('BLOCKS');
    this.blockArray.clear();
    this.blockArray.push(this.newBlockGroup({ kind: 'WORK', days: 2, startTime: '06:00', endTime: '18:00', label: '06:00-18:00' }));
    this.blockArray.push(this.newBlockGroup({ kind: 'WORK', days: 2, startTime: '18:00', endTime: '06:00', label: '18:00-06:00' }));
    this.blockArray.push(this.newBlockGroup({ kind: 'OFF', days: 2 }));
    this.updatePreview();
  }

  // Quick preset selection for cycle
  quickPreset: 'CUSTOM' | '06-14' | '14-22' | '22-06' | '06-18' | '18-06' = '06-14';
  applyQuickPreset(): void {
    switch (this.quickPreset) {
      case '06-14':
        this.quickStartTime = '06:00'; this.quickEndTime = '14:00'; break;
      case '14-22':
        this.quickStartTime = '14:00'; this.quickEndTime = '22:00'; break;
      case '22-06':
        this.quickStartTime = '22:00'; this.quickEndTime = '06:00'; break;
      case '06-18':
        this.quickStartTime = '06:00'; this.quickEndTime = '18:00'; break;
      case '18-06':
        this.quickStartTime = '18:00'; this.quickEndTime = '06:00'; break;
      default:
        // CUSTOM: do not change times
        break;
    }
    this.updatePreview();
  }

  // Preview
  updatePreview(): void {
    const cfg = this.safeConfigFromForm();
    if (!cfg) { this.preview.set([]); return; }
    this.preview.set(this.svc.generatePreview(cfg, this.month()));
  }

  private safeConfigFromForm(): ScheduleConfig | null {
    try { return this.toConfig(this.form.getRawValue()); } catch { return null; }
  }

  private toConfig(v: any): ScheduleConfig {
    const base = {
      id: v.id || uuid(),
      name: v.name,
      description: v.description || '',
      includeSaturdays: !!v.includeSaturdays,
      includeSundays: !!v.includeSundays,
      includeHolidays: !!v.includeHolidays,
    } as const;
    if (v.type === 'FIXED_HOURS') {
      return { ...base, type: 'FIXED_HOURS', startTime: v.startTime, endTime: v.endTime };
    }
    if (v.type === 'WEEKLY_ROTATION') {
      const rot: WeeklyRotationShift[] = (v.rotation || []).map((x: any) => ({
        label: (x?.label ?? '').toString(),
        startTime: x?.startTime ?? '08:00',
        endTime: x?.endTime ?? '16:00',
        weeks: Number(x?.weeks ?? 1)
      }));
      const segs = (v.segments || []).map((s: any) => ({
        from: s?.from || '',
        to: s?.to || '',
        label: (s?.label ?? '').toString(),
        startTime: s?.startTime ?? '08:00',
        endTime: s?.endTime ?? '16:00'
      }));
      const cfg: WeeklyRotationConfig = {
        ...base,
        type: 'WEEKLY_ROTATION',
        rotationMode: v.rotationMode || (segs.length ? 'BY_DATES' : 'BY_WEEKS'),
      } as WeeklyRotationConfig;
      if (cfg.rotationMode === 'BY_DATES') {
        cfg.segments = segs;
        cfg.rotation = [];
        cfg.rotationStartDate = v.rotationStartDate || '';
      } else {
        cfg.rotation = rot;
        cfg.rotationStartDate = v.rotationStartDate || '';
      }
      return cfg;
    }
    if (v.type === 'CYCLE_WORK_OFF') {
      const blocks = (v.blocks || []).map((b: any) => ({
        kind: (b?.kind === 'OFF' ? 'OFF' : 'WORK') as 'WORK' | 'OFF',
        days: Number(b?.days ?? 1),
        startTime: b?.startTime || null,
        endTime: b?.endTime || null,
        label: (b?.label ?? '') || undefined
      }));
      const cfg: CycleWorkOffConfig = {
        ...base,
        type: 'CYCLE_WORK_OFF',
        cycleMode: 'BLOCKS',
        cycleStartDate: '',
        blocks
      } as CycleWorkOffConfig;
      return cfg;
    }
    // default fallback
    return { ...base, type: 'FIXED_HOURS', startTime: '08:00', endTime: '16:00' };
  }

  // UI helpers
  goHome(): void { this.router.navigateByUrl('/dashboard'); }

  setMonth(ev: Event): void {
    const target = ev.target as HTMLInputElement;
    const value = target.value || this.defaultMonth();
    this.month.set(value);
    this.updatePreview();
  }

  formatHM(h?: string, e?: string): string {
    if (!h || !e) return '';
    return `${h}–${e}`;
  }

  // trackBy helpers to avoid template lambda parser errors
  trackByConfig = (_: number, item: ScheduleConfig) => item.id;
  trackByPreview = (_: number, item: DayPreview) => item.date;

  private defaultMonth(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  private today(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  
  // Help toggle
  showHelp = signal<boolean>(false);
  toggleHelp(): void { this.showHelp.update(v => !v); }
}
