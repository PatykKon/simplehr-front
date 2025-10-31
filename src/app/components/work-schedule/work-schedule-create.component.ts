import { Component, OnInit, OnDestroy, AfterViewInit, computed, signal, ViewChild, HostListener, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { EmployeeService } from '../../services/employee.service';
import { WorkScheduleService } from '../../services/work-schedule.service';
import { LeaveProposalService } from '../../services/leave-proposal.service';
import { ScheduleConfigService } from '../../services/schedule-config.service';
import { ScheduleConfig, CycleWorkOffConfig, WeeklyRotationConfig } from '../../models/schedule-config.models';
import { EmployeeSummaryResponse } from '../../models/employee.models';
import { LeaveDay, LeaveType, LEAVE_TYPE_LABELS } from '../../models/leave-proposal.models';
import {
  AddWorkScheduleEntryRequest,
  CreateWorkScheduleRequest,
  WorkScheduleDetailsResponse,
  WorkScheduleEntryResponse,
  WorkScheduleEntryStatus
} from '../../models/work-schedule.models';

// FullCalendar
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { CalendarOptions, EventInput, EventContentArg, EventClickArg } from '@fullcalendar/core';
import plLocale from '@fullcalendar/core/locales/pl';

// Register plugins
const plugins = [dayGridPlugin, timeGridPlugin, interactionPlugin];

const LEAVE_TYPE_SHORT_LABELS: Record<LeaveType, string> = {
  [LeaveType.ANNUAL]: 'UP',
  [LeaveType.SICK]: 'L4',
  [LeaveType.UNPAID]: 'UB',
  [LeaveType.PARENTAL]: 'UR',
  [LeaveType.MATERNITY]: 'UM',
  [LeaveType.PATERNITY]: 'UO',
  [LeaveType.COMPASSIONATE]: 'OK',
  [LeaveType.STUDY]: 'SZ',
  [LeaveType.SABBATICAL]: 'SB',
  [LeaveType.OTHER]: 'IN'
};

const computeDefaultYearMonth = () => {
  const now = new Date();
  const currentMonth = now.getMonth();
  if (currentMonth === 11) {
    return { year: now.getFullYear() + 1, month: 1 };
  }
  return { year: now.getFullYear(), month: currentMonth + 2 };
};

interface EmployeeSidebarStats {
  plannedDays: number;
  plannedDates: string[];
  plannedHours: number;
  hoursRemaining: number | null;
  leaveDays: number;
  leaveDates: string[];
}

@Component({
  selector: 'app-work-schedule-create',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, FullCalendarModule],
  templateUrl: './work-schedule-create.component.html',
  styleUrls: ['./work-schedule-create.component.css']
})
export class WorkScheduleCreateComponent implements OnInit, OnDestroy, AfterViewInit {
  // Step 1: basic schedule creation
  creating = signal(false);
  createError = signal<string | null>(null);
  scheduleForm!: ReturnType<FormBuilder['group']>;
  autoName = signal(true);

  // Step 2: editor state
  schedule = signal<WorkScheduleDetailsResponse | null>(null);
  scheduleEntries = signal<WorkScheduleEntryResponse[]>([]);
  // All events stored for filtering; visible ones are rendered to calendar
  calendarAllEvents = signal<EventInput[]>([]);
  calendarEvents = signal<EventInput[]>([]);

  // Employees
  employees = signal<EmployeeSummaryResponse[]>([]);
  employeesLoading = signal(false);
  employeeSearch = signal('');
  selectedEmployeeId = signal<number | null>(null);
  selectedEmployeeName = signal<string>('');
  // Free-text filter for calendar by employee name
  employeeCalendarFilter = signal<string>('');
  filteredEmployees = computed(() => {
    const q = this.employeeSearch().toLowerCase().trim();
    if (!q) return this.employees();
    return this.employees().filter(e =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      e.username.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q)
    );
  });

  // Calendar view options
  mergeRanges = signal<boolean>(true);
  // Switchable view: CALENDAR (FullCalendar), TABLE (matrix)
  viewMode = signal<'CALENDAR' | 'TABLE'>('TABLE');

  // Holidays cache for current schedule month (YYYY-MM-DD strings)
  holidayDates = signal<Set<string>>(new Set());

  // Responsive: detect mobile to limit table view to 7 days window
  isMobile = signal<boolean>(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  tableWeekStart = signal<number>(0); // index into dates array for TABLE mobile view
  showTableTopScrollbar = signal(false);
  tableScrollWidth = signal(0);
  tableTopHasShadow = signal(false);


  // Quick add hours modal state
  showAddModal = signal(false);
  addDate = signal<string>(''); // YYYY-MM-DD
  addStartTime = signal<string>('08:00');
  addEndTime = signal<string>('16:00');
  addOvertime = signal<boolean>(false);
  addError = signal<string | null>(null);
  showLargeDatePicker = signal(false);

  // Summary & leave tracking
  monthlyHoursTarget = signal<number>(0);
  hoursTargetManuallySet = signal(false);
  employeeLeaves = signal<Record<number, LeaveDay[]>>({});
  leavesLoading = signal(false);
  employeeStats = computed(() => this.buildEmployeeStats());

  // Month UI (replace native month picker with larger selects)
  months = [
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
  private readonly defaultYearMonth = computeDefaultYearMonth();
  uiYear = signal<number>(this.defaultYearMonth.year);
  uiMonth = signal<number>(this.defaultYearMonth.month);
  years = computed<number[]>(() => {
    const cy = new Date().getFullYear();
    const arr: number[] = [];
    for (let y = cy - 2; y <= cy + 3; y++) arr.push(y);
    return arr;
  });

  get monthSelectorValue(): number {
    return this.uiMonth();
  }

  set monthSelectorValue(value: number) {
    this.setUiMonth(value);
  }

  get yearSelectorValue(): number {
    return this.uiYear();
  }

  set yearSelectorValue(value: number) {
    this.setUiYear(value);
  }

  // Calendar options
  calendarOptions = signal<CalendarOptions>({
    plugins,
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    height: 'auto',
    expandRows: true,
    fixedWeekCount: false,
    showNonCurrentDates: false,
    eventDisplay: 'block',
    dayMaxEvents: 3,
    moreLinkContent: (args) => `+${args.num} więcej`,
    eventContent: (arg) => this.renderEvent(arg),
    slotDuration: '00:30:00',
    selectable: true,
    editable: false,
    locales: [plLocale],
    locale: 'pl',
    firstDay: 1,
    dateClick: (arg) => this.onDateClick(arg),
    eventClick: (arg) => this.onCalendarEventClick(arg),
    dayCellDidMount: (info) => this.onDayCellDidMount(info)
    // validRange will be set after schedule is created
  });

  @ViewChild('calendar') calendarRef?: FullCalendarComponent;
  @ViewChild('tableMainScroll') tableMainScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('tableTopScroll') tableTopScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('scheduleTable') scheduleTable?: ElementRef<HTMLTableElement>;

  // Templates (schedule configs)
  configs = signal<ScheduleConfig[]>([]);
  showTemplateModal = signal(false);
  templateEmployeeId = signal<number | null>(null);
  templateEmployeeName = signal<string>('');
  selectedConfigId = signal<string>('');
  templateStartDay = signal<number>(1);
  templateStartPosition = signal<number>(1);
  templateMaxPositions = signal<number>(1);

  private tableResizeObserver?: ResizeObserver;
  private tableContainerResizeObserver?: ResizeObserver;
  private syncingTableScroll = false;

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private workScheduleService: WorkScheduleService,
    private leaveProposalService: LeaveProposalService,
    private scheduleConfigService: ScheduleConfigService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngAfterViewInit(): void {
    this.setupTableScrollEffect();
  }

  ngOnInit(): void {
    // Use type="month" UX: store chosen month as YYYY-MM and derive start/end
    this.scheduleForm = this.fb.group({
      month: [this.currentYearMonth(), Validators.required],
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required]
    });
    this.applyMonthToDatesAndName();
    // Sync UI month/year from form
    const initMonthStr = this.scheduleForm.get('month')!.value as string;
    if (initMonthStr) {
      const [yStr, mStr] = initMonthStr.split('-');
      this.uiYear.set(Number(yStr));
      this.uiMonth.set(Number(mStr));
    }
    this.loadEmployees();
  this.loadConfigs();

    // Edit mode: react to route changes (component may be reused)
    this.route.paramMap.subscribe((pm) => {
      const idParam = pm.get('id');
      const id = idParam ? Number(idParam) : NaN;
      if (Number.isFinite(id)) {
        this.loadScheduleForEdit(id);
      }
    });
  }

  // Update isMobile flag on resize
  @HostListener('window:resize')
  onResize() {
    const mobile = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
    const prev = this.isMobile();
    this.isMobile.set(mobile);
    if (mobile !== prev) {
      // reset or clamp week start when breakpoint changes
      this.clampTableWeekStart();
    }
    this.updateTableScrollMetrics();
  }

  private loadConfigs(): void {
    this.scheduleConfigService.refresh().subscribe({
      next: list => this.configs.set(list),
      error: () => this.configs.set(this.scheduleConfigService.getAll())
    });
  }

  openTemplateModalForEmployee(emp: EmployeeSummaryResponse): void {
    if (!this.schedule()) {
      alert('Utwórz najpierw grafik, aby użyć szablonu.');
      return;
    }
    this.templateEmployeeId.set(emp.id);
    this.templateEmployeeName.set(`${emp.firstName} ${emp.lastName}`.trim() || emp.username);
    const cfgs = this.configs();
    this.selectedConfigId.set(cfgs.length ? cfgs[0].id : '');
    this.templateStartDay.set(1);
    this.onTemplateConfigChange();
    this.showTemplateModal.set(true);
    this.setBodyScrollLocked(true);
  }

  closeTemplateModal(): void {
    this.showTemplateModal.set(false);
    this.setBodyScrollLocked(false);
  }

  onTemplateConfigChange(): void {
    const cfg = this.configs().find(c => c.id === this.selectedConfigId());
    if (!cfg) { this.templateMaxPositions.set(1); this.templateStartPosition.set(1); return; }
    if (cfg.type === 'CYCLE_WORK_OFF') {
      const blocks = (cfg as CycleWorkOffConfig).blocks || [];
      this.templateMaxPositions.set(Math.max(1, blocks.length));
    } else if (cfg.type === 'WEEKLY_ROTATION') {
      const rot = (cfg as WeeklyRotationConfig).rotation || [];
      this.templateMaxPositions.set(Math.max(1, rot.length));
    } else {
      this.templateMaxPositions.set(1);
    }
    this.templateStartPosition.set(1);
  }

  applyTemplateToEmployee(): void {
    const sched = this.schedule();
    const userId = this.templateEmployeeId();
    const userName = this.templateEmployeeName();
    if (!sched || !userId) return;
    const cfg = this.configs().find(c => c.id === this.selectedConfigId());
    if (!cfg) return;

    const start = new Date(sched.startDate + 'T00:00:00');
    const monthStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    const anchorDay = Math.max(1, Math.min(31, this.templateStartDay()));
    const anchorDate = `${monthStr}-${String(anchorDay).padStart(2, '0')}`;

    let workCfg: ScheduleConfig = JSON.parse(JSON.stringify(cfg));
    if (workCfg.type === 'CYCLE_WORK_OFF') {
      (workCfg as any).cycleMode = 'BLOCKS';
      (workCfg as any).cycleStartDate = anchorDate;
      const pos = Math.max(1, Math.min(this.templateMaxPositions(), this.templateStartPosition()));
      const blocks = (workCfg as CycleWorkOffConfig).blocks || [];
      if (blocks.length > 1 && pos > 1) {
        (workCfg as CycleWorkOffConfig).blocks = this.rotateArray(blocks, pos - 1);
      }
    } else if (workCfg.type === 'WEEKLY_ROTATION') {
      (workCfg as WeeklyRotationConfig).rotationStartDate = anchorDate;
      const pos = Math.max(1, Math.min(this.templateMaxPositions(), this.templateStartPosition()));
      const shifts = (workCfg as WeeklyRotationConfig).rotation || [];
      if (shifts.length > 1 && pos > 1) {
        (workCfg as WeeklyRotationConfig).rotation = this.rotateArray(shifts, pos - 1);
      }
      (workCfg as WeeklyRotationConfig).rotationMode = 'BY_WEEKS';
    }

    const previews = this.scheduleConfigService.generatePreview(workCfg, monthStr);
    const inRange = previews.filter(d => d.date >= sched.startDate && d.date <= sched.endDate && d.isWork && d.startTime && d.endTime);

    if (inRange.length === 0) {
      alert('Brak dni roboczych do przypisania na podstawie wybranego szablonu i zakresu grafiku.');
      return;
    }

    const toAdd = [...inRange];
    const addNext = () => {
      const d = toAdd.shift();
      if (!d) {
        const current = this.schedule();
        const allEvents = this.buildCalendarEvents(current?.entries ?? []);
        this.calendarAllEvents.set(allEvents);
        this.applyCalendarFilter();
        this.closeTemplateModal();
        return;
      }
      const payload: AddWorkScheduleEntryRequest = { userId, workDate: d.date, startTime: d.startTime!, endTime: d.endTime!, isOvertime: false };
      this.workScheduleService.addEntry(sched.id, payload).subscribe({
        next: () => {
          const newEntry: WorkScheduleEntryResponse = {
            id: Date.now() + Math.floor(Math.random()*1000),
            userId,
            userName,
            workDate: d.date,
            startTime: d.startTime!,
            endTime: d.endTime!,
            workingHours: this.calculateDurationHours(d.startTime!, d.endTime!),
            shiftType: undefined,
            position: undefined,
            location: undefined,
            notes: undefined,
            status: WorkScheduleEntryStatus.ACTIVE,
            isOvertime: false,
            conflictingLeaveProposalId: undefined
          };
          this.scheduleEntries.set([...this.scheduleEntries(), newEntry]);
          const current = this.schedule();
          if (current) this.schedule.set({ ...current, entries: [...current.entries, newEntry] });
          addNext();
        },
        error: () => addNext()
      });
    };
    addNext();
  }

  private rotateArray<T>(arr: T[], offset: number): T[] {
    const n = arr.length;
    if (n === 0) return arr;
    const k = ((offset % n) + n) % n;
    return [...arr.slice(k), ...arr.slice(0, k)];
  }

  ngOnDestroy(): void {
    this.setBodyScrollLocked(false);
    this.disconnectTableResizeObservers();
  }

  // Utils for month handling
  private currentYearMonth(): string {
    const { year, month } = this.defaultYearMonth;
    const m = String(month).padStart(2, '0');
    return `${year}-${m}`;
  }

  onMonthChange(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.scheduleForm.patchValue({ month: input.value });
    this.applyMonthToDatesAndName();
  }

  setUiMonth(value: number | string): void {
    const m = Number(value);
    if (!Number.isFinite(m) || m < 1 || m > 12) return;
    this.uiMonth.set(m);
    const y = this.uiYear();
    const monthStr = `${y}-${String(m).padStart(2, '0')}`;
    this.scheduleForm.patchValue({ month: monthStr });
    this.applyMonthToDatesAndName();
  }

  setUiYear(value: number | string): void {
    const y = Number(value);
    if (!Number.isFinite(y) || y < 2000 || y > 2100) return;
    this.uiYear.set(y);
    const m = this.uiMonth();
    const monthStr = `${y}-${String(m).padStart(2, '0')}`;
    this.scheduleForm.patchValue({ month: monthStr });
    this.applyMonthToDatesAndName();
  }

  onNameInput(): void {
    // User edited the name manually; stop auto-renaming
    this.autoName.set(false);
  }

  private applyMonthToDatesAndName(): void {
    const monthStr = this.scheduleForm.get('month')!.value as string;
    if (!monthStr) return;
    const [yearStr, monthNumStr] = monthStr.split('-');
    const year = Number(yearStr);
    const month = Number(monthNumStr);
    // keep UI in sync
    if (Number.isFinite(year)) this.uiYear.set(year);
    if (Number.isFinite(month)) this.uiMonth.set(month);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // last day of month
    // Use local date parts to avoid UTC timezone shifts (which could cause previous month)
    const startIso = this.formatLocalDate(startDate);
    const endIso = this.formatLocalDate(endDate);
    this.scheduleForm.patchValue({ startDate: startIso, endDate: endIso }, { emitEvent: false });

    if (this.autoName()) {
      const name = `Grafik ${this.polishMonthName(month)} ${year}`;
      this.scheduleForm.patchValue({ name }, { emitEvent: false });
    }

    if (!this.hoursTargetManuallySet()) {
      this.monthlyHoursTarget.set(this.calculateDefaultMonthlyHours(startIso, endIso));
    }
  }

  private setupTableScrollEffect(): void {
    effect(() => {
      const mode = this.viewMode();
      const sched = this.schedule();
      const entries = this.scheduleEntries();
      const weekStart = this.tableWeekStart();
      const mobile = this.isMobile();
      void entries.length;
      void weekStart;
      void mobile;
      if (mode === 'TABLE' && sched) {
        queueMicrotask(() => this.connectTableResizeObservers());
      } else {
        this.resetTableScrollState();
        this.disconnectTableResizeObservers();
      }
    });
  }

  private connectTableResizeObservers(): void {
    const table = this.scheduleTable?.nativeElement;
    const main = this.tableMainScroll?.nativeElement;
    if (!table || !main) {
      this.resetTableScrollState();
      return;
    }
    if (typeof ResizeObserver !== 'undefined') {
      if (!this.tableResizeObserver) {
        this.tableResizeObserver = new ResizeObserver(() => this.updateTableScrollMetrics());
      }
      this.tableResizeObserver.disconnect();
      this.tableResizeObserver.observe(table);

      if (!this.tableContainerResizeObserver) {
        this.tableContainerResizeObserver = new ResizeObserver(() => this.updateTableScrollMetrics());
      }
      this.tableContainerResizeObserver.disconnect();
      this.tableContainerResizeObserver.observe(main);
    }
    this.updateTableScrollMetrics();
  }

  private disconnectTableResizeObservers(): void {
    this.tableResizeObserver?.disconnect();
    this.tableContainerResizeObserver?.disconnect();
  }

  private resetTableScrollState(): void {
    this.showTableTopScrollbar.set(false);
    this.tableScrollWidth.set(0);
    this.tableTopHasShadow.set(false);
  }

  private updateTableScrollMetrics(): void {
    const table = this.scheduleTable?.nativeElement;
    const main = this.tableMainScroll?.nativeElement;
    const top = this.tableTopScroll?.nativeElement;
    if (!table || !main) {
      this.resetTableScrollState();
      return;
    }
    const viewportWidth = main.clientWidth;
    const scrollWidth = table.scrollWidth;
    const showTop = scrollWidth > viewportWidth + 1;
    this.tableScrollWidth.set(Math.max(scrollWidth, viewportWidth));
    this.showTableTopScrollbar.set(showTop);
    this.tableTopHasShadow.set(main.scrollTop > 0);
    if (showTop && !top) {
      setTimeout(() => this.updateTableScrollMetrics(), 0);
      return;
    }
    if (showTop && top && Math.abs(top.scrollLeft - main.scrollLeft) > 1) {
      this.syncingTableScroll = true;
      top.scrollLeft = main.scrollLeft;
      this.syncingTableScroll = false;
    }
  }

  onTableScroll(event: Event, origin: 'TOP' | 'MAIN'): void {
    if (this.syncingTableScroll) {
      return;
    }
    const top = this.tableTopScroll?.nativeElement;
    const main = this.tableMainScroll?.nativeElement;
    if (!top || !main) {
      return;
    }
    const target = event.target as HTMLElement;
    this.syncingTableScroll = true;
    if (origin === 'TOP') {
      main.scrollLeft = target.scrollLeft;
    } else {
      top.scrollLeft = target.scrollLeft;
      this.tableTopHasShadow.set(main.scrollTop > 0);
    }
    this.syncingTableScroll = false;
  }

  private formatLocalDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private polishMonthName(m: number): string {
    const names = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
    return names[m - 1] || '';
  }

  // Load list of employees
  private loadEmployees(): void {
    this.employeesLoading.set(true);
    this.employeeService.getAllEmployees().subscribe({
      next: (list) => {
        this.employees.set(list);
        this.employeesLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load employees', err);
        this.employeesLoading.set(false);
      }
    });
  }

  // Create schedule
  createSchedule(): void {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }

    const { name, description, startDate, endDate } = this.scheduleForm.value;
    const payload: CreateWorkScheduleRequest = {
      name: name!,
      description: description || undefined,
      startDate: startDate!,
      endDate: endDate!
    };

    this.creating.set(true);
    this.createError.set(null);

    this.workScheduleService.createSchedule(payload).subscribe({
      next: (res) => {
        // Load full schedule details to get entries
        this.workScheduleService.getSchedule(res.id).subscribe({
          next: (details) => {
            this.initScheduleEditor(details);
            this.creating.set(false);
          },
          error: (err) => {
            console.error('Failed to load schedule details', err);
            this.creating.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Failed to create schedule', err);
        this.createError.set('Nie udało się utworzyć grafiku');
        this.creating.set(false);
      }
    });
  }

  private loadScheduleForEdit(id: number): void {
    this.creating.set(true);
    this.workScheduleService.getSchedule(id).subscribe({
      next: (details) => {
        this.initScheduleEditor(details);
        // Default to table view in edit mode to keep layout stable on wide schedules
        this.viewMode.set('TABLE');
        // Update month and form fields based on loaded schedule
        const start = new Date(details.startDate + 'T00:00:00');
        const month = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
        this.scheduleForm.patchValue({
          month,
          name: details.name,
          description: details.description ?? '',
          startDate: details.startDate,
          endDate: details.endDate
        }, { emitEvent: false });
        // sync UI selectors
        this.uiYear.set(start.getFullYear());
        this.uiMonth.set(start.getMonth() + 1);
        this.creating.set(false);
      },
      error: (err) => {
        console.error('Failed to load schedule for edit', err);
        this.creating.set(false);
      }
    });
  }

  private initScheduleEditor(details: WorkScheduleDetailsResponse): void {
    this.schedule.set(details);
    this.scheduleEntries.set(details.entries ?? []);
    this.hoursTargetManuallySet.set(false);
    this.monthlyHoursTarget.set(
      this.calculateDefaultMonthlyHours(details.startDate, details.endDate)
    );
    this.employeeLeaves.set({});
    this.loadLeavesForMonth(details.startDate, details.endDate);
    // Configure calendar validRange and initialDate
    // FullCalendar expects validRange.end to be exclusive, so add +1 day
    const endExclusive = new Date(details.endDate + 'T00:00:00');
    if (!Number.isNaN(endExclusive.getTime())) {
      endExclusive.setDate(endExclusive.getDate() + 1);
    }
    const allEvents = this.buildCalendarEvents(details.entries ?? []);
    const opts: CalendarOptions = {
      ...this.calendarOptions(),
      validRange: { start: details.startDate, end: this.formatLocalDate(endExclusive) },
      initialDate: details.startDate,
      events: allEvents,
      dayCellDidMount: (info) => this.onDayCellDidMount(info)
    };
    this.calendarOptions.set(opts);
    // Compute holidays for current schedule month
    this.computeHolidaysForSchedule(details.startDate, details.endDate);
    // keep local list
    this.calendarAllEvents.set(allEvents);
    this.calendarEvents.set(allEvents);
    queueMicrotask(() => this.calendarRef?.getApi().gotoDate(details.startDate));
    // Reset table week window at schedule init
    this.tableWeekStart.set(0);
    this.clampTableWeekStart();
    queueMicrotask(() => this.updateTableScrollMetrics());
  }

  // (list view removed per request)

  // Build list of dates within current schedule range for TABLE view
  getScheduleDates(): Array<{ date: string; day: number }> {
    const sched = this.schedule();
    if (!sched) return [];
    const start = new Date(sched.startDate + 'T00:00:00');
    const end = new Date(sched.endDate + 'T00:00:00');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    const out: Array<{ date: string; day: number }> = [];
    const cur = new Date(start);
    while (cur <= end) {
      const date = this.formatLocalDate(cur);
      out.push({ date, day: cur.getDate() });
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }

  // Visible dates for TABLE view, respecting mobile 7-day window
  getVisibleDates(): Array<{ date: string; day: number }> {
    const all = this.getScheduleDates();
    if (!this.isMobile() || this.viewMode() !== 'TABLE') return all;
    const start = this.tableWeekStart();
    return all.slice(start, Math.min(start + 7, all.length));
  }

  private clampTableWeekStart(): void {
    const all = this.getScheduleDates();
    if (all.length === 0) { this.tableWeekStart.set(0); return; }
    let start = this.tableWeekStart();
    const maxStart = Math.max(0, all.length - 7);
    if (start > maxStart) start = maxStart;
    if (start < 0) start = 0;
    this.tableWeekStart.set(start);
  }

  prevTableWeek(): void {
    const start = this.tableWeekStart();
    const next = Math.max(0, start - 7);
    this.tableWeekStart.set(next);
  }

  nextTableWeek(): void {
    const all = this.getScheduleDates();
    const start = this.tableWeekStart();
    const maxStart = Math.max(0, all.length - 7);
    const next = Math.min(maxStart, start + 7);
    this.tableWeekStart.set(next);
  }

  getTableWeekLabel(): string {
    const all = this.getScheduleDates();
    if (all.length === 0) return '';
    const start = this.tableWeekStart();
    const end = Math.min(start + 6, all.length - 1);
    const s = all[start]?.date;
    const e = all[end]?.date;
    if (!s || !e) return '';
    const fmt = (iso: string) => {
      const d = new Date(iso + 'T00:00:00');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}.${month}`;
    };
    return `${fmt(s)} – ${fmt(e)}`;
  }

  // Get entry for employee and date (if any) for TABLE view
  getEntryFor(userId: number, date: string): WorkScheduleEntryResponse | undefined {
    const entries = this.scheduleEntries();
    for (const e of entries) {
      if (e.userId === userId && e.workDate === date) return e;
    }
    return undefined;
  }

  getTableEmployees(): EmployeeSummaryResponse[] {
    const list = this.filteredEmployees();
    const term = this.employeeCalendarFilter().toLowerCase().trim();
    if (!term) return list;
    return list.filter(emp => {
      const fullName = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.toLowerCase().trim();
      const username = emp.username?.toLowerCase() ?? '';
      const email = emp.email?.toLowerCase() ?? '';
      return fullName.includes(term) || username.includes(term) || email.includes(term);
    });
  }

  getLeavesFor(userId: number, date: string): LeaveDay[] {
    const leaves = this.employeeLeaves()[userId] ?? [];
    if (!leaves.length) {
      return [];
    }
    return leaves.filter((leave) => leave.date === date);
  }

  formatLeaveTypes(leaves: LeaveDay[]): string {
    if (!leaves || leaves.length === 0) {
      return '';
    }
  const labels = leaves.map((leave) => this.leaveShortLabel(leave.leaveType));
  return Array.from(new Set(labels)).join(' ');
  }

  leaveTooltip(leaves: LeaveDay[]): string {
    if (!leaves || leaves.length === 0) {
      return '';
    }
    const longLabels = Array.from(new Set(leaves.map((l) => this.leaveTypeLabel(l.leaveType)))).join(', ');
    const shortLabels = this.formatLeaveTypes(leaves);
    const label = longLabels && shortLabels
      ? `${shortLabels} – ${longLabels}`
      : longLabels || shortLabels;
    const range = this.formatLeaveRange(leaves.map((l) => l.date));
    return range ? `Urlop: ${label} (${range})` : `Urlop: ${label}`;
  }

  hasAnyLeaves(): boolean {
    const record = this.employeeLeaves();
    return Object.keys(record).length > 0;
  }

  // Table cell click: select employee and open add modal prefilled for date
  onTableCellClick(userId: number, userName: string, date: string): void {
    if (!this.schedule()) return;
    this.selectedEmployeeId.set(userId);
    this.selectedEmployeeName.set(userName);
    this.addDate.set(date);
    this.addStartTime.set('08:00');
    this.addEndTime.set('16:00');
    this.addOvertime.set(false);
    this.addError.set(null);
    this.showAddModal.set(true);
    this.setBodyScrollLocked(true);
  }

  // FullCalendar cell decoration for weekends and Polish holidays
  private onDayCellDidMount(info: any): void {
    const dateStr = this.formatLocalDate(info.date);
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay();
    const isSaturday = day === 6;
    const isSunday = day === 0;
    const isHoliday = this.holidayDates().has(dateStr);
    if (isSaturday) info.el.classList.add('ws-sat');
    if (isSunday) info.el.classList.add('ws-sun');
    if (isHoliday) info.el.classList.add('ws-holiday');
  }

  // Helpers to mark weekends/holidays in TABLE view
  isWeekendDate(date: string): boolean {
    const d = new Date(date + 'T00:00:00');
    const day = d.getDay();
    return day === 0 || day === 6;
  }
  isHolidayDate(date: string): boolean {
    return this.holidayDates().has(date);
  }
  isSaturdayDate(date: string): boolean {
    const d = new Date(date + 'T00:00:00');
    return d.getDay() === 6;
  }
  isSundayDate(date: string): boolean {
    const d = new Date(date + 'T00:00:00');
    return d.getDay() === 0;
  }

  // Compute Polish public holidays for the schedule range and store as set of YYYY-MM-DD
  private computeHolidaysForSchedule(startDate: string, endDate: string): void {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) { this.holidayDates.set(new Set()); return; }
    const years = new Set<number>();
    for (let y = start.getFullYear(); y <= end.getFullYear(); y++) years.add(y);
    const all: Set<string> = new Set();
    for (const y of years) {
      for (const d of this.computePolishHolidaysForYear(y)) all.add(d);
    }
    // keep only those within range
    const res = new Set<string>();
    const cur = new Date(start);
    while (cur <= end) {
      const iso = this.formatLocalDate(cur);
      if (all.has(iso)) res.add(iso);
      cur.setDate(cur.getDate() + 1);
    }
    this.holidayDates.set(res);
  }

  private computePolishHolidaysForYear(year: number): string[] {
    const list: string[] = [];
    const push = (m: number, d: number) => list.push(`${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    // Fixed
    push(1,1);   // Nowy Rok
    push(1,6);   // Trzech Króli
    push(5,1);   // Święto Pracy
    push(5,3);   // Święto Konstytucji 3 Maja
    push(8,15);  // Wniebowzięcie NMP
    push(11,1);  // Wszystkich Świętych
    push(11,11); // Narodowe Święto Niepodległości
    push(12,25); // Boże Narodzenie
    push(12,26); // Drugi dzień BN
    // Movable: based on Easter Sunday
    const easter = this.computeEasterDate(year); // Date object local
    const addDays = (date: Date, days: number) => {
      const nd = new Date(date);
      nd.setDate(nd.getDate() + days);
      return nd;
    };
    const toIso = (d: Date) => this.formatLocalDate(d);
    // Wielkanoc (niedziela) — zwykle już niedziela, ale zaznaczamy jako święto
    list.push(toIso(easter));
    // Poniedziałek Wielkanocny (+1)
    list.push(toIso(addDays(easter, 1)));
    // Zesłanie Ducha Świętego (Zielone Świątki) (+49)
    list.push(toIso(addDays(easter, 49)));
    // Boże Ciało (+60)
    list.push(toIso(addDays(easter, 60)));
    return list;
  }

  // Large date picker helpers (modal)
  toggleLargePicker(): void { this.showLargeDatePicker.set(!this.showLargeDatePicker()); }
  selectPickerDate(date: string): void { this.addDate.set(date); }
  isPickerSelected(date: string): boolean { return this.addDate() === date; }
  pickerWeeks = computed(() => {
    const sched = this.schedule();
    if (!sched) return [] as Array<Array<string | null>>;
    const start = new Date(sched.startDate + 'T00:00:00');
    const year = start.getFullYear();
    const month = start.getMonth() + 1; // 1-12
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    const firstDow = (first.getDay() + 6) % 7; // Mon=0..Sun=6
    const daysInMonth = last.getDate();
    const cells: Array<string | null> = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = this.formatLocalDate(new Date(year, month - 1, d));
      cells.push(iso);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: Array<Array<string | null>> = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  });

  // Computus: Meeus/Jones/Butcher algorithm for Gregorian Easter
  private computeEasterDate(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=Mar, 4=Apr
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  // Date click handler
  onDateClick(arg: DateClickArg): void {
    if (!this.schedule()) return; // must create schedule first
    if (!this.selectedEmployeeId()) {
      alert('Najpierw wybierz pracownika z listy po prawej.');
      return;
    }
    // Ensure clicked date in valid range
    const d = arg.dateStr;
    this.addDate.set(d);
    this.addStartTime.set('08:00');
    this.addEndTime.set('16:00');
    this.addOvertime.set(false);
    this.addError.set(null);
    this.showAddModal.set(true);
    this.setBodyScrollLocked(true);
  }

  // Clicking on an event selects that employee and enables filter
  onCalendarEventClick(arg: EventClickArg): void {
    const p: any = arg.event.extendedProps || {};
    const userId: number | undefined = p.userId;
    const userName: string | undefined = p.userName;
    if (userId && userName) {
      // Set selection
      this.selectedEmployeeId.set(userId);
      this.selectedEmployeeName.set(userName);
      // Set filter text to this user and apply
      this.employeeCalendarFilter.set(userName);
      this.applyCalendarFilter();
    }
  }

  // Confirm add entry
  confirmAddEntry(): void {
    const sched = this.schedule();
    const userId = this.selectedEmployeeId();
    const userName = this.selectedEmployeeName();
    if (!sched || !userId) return;

    const startTime = this.addStartTime();
    const endTime = this.addEndTime();
    if (!this.isValidTimeRange(startTime, endTime)) {
      this.addError.set('Nieprawidłowy zakres godzin (format HH:MM, koniec po początku).');
      return;
    }

    const payload: AddWorkScheduleEntryRequest = {
      userId,
      workDate: this.addDate(),
      startTime,
      endTime,
      isOvertime: this.addOvertime()
    };

    this.workScheduleService.addEntry(sched.id, payload).subscribe({
      next: () => {
        const newEntry: WorkScheduleEntryResponse = {
          id: Date.now(),
          userId,
          userName,
          workDate: payload.workDate,
          startTime: payload.startTime,
          endTime: payload.endTime,
          workingHours: this.calculateDurationHours(payload.startTime, payload.endTime),
          shiftType: undefined,
          position: undefined,
          location: undefined,
          notes: undefined,
          status: WorkScheduleEntryStatus.ACTIVE,
          isOvertime: payload.isOvertime,
          conflictingLeaveProposalId: undefined
        };
        this.scheduleEntries.set([...this.scheduleEntries(), newEntry]);
        const currentSchedule = this.schedule();
        if (currentSchedule) {
          this.schedule.set({ ...currentSchedule, entries: [...currentSchedule.entries, newEntry] });
        }
        // Add on calendar immediately
        // Rebuild events (respects mergeRanges)
        const current = this.schedule();
        const allEvents = this.buildCalendarEvents(current?.entries ?? []);
        this.calendarAllEvents.set(allEvents);
        this.applyCalendarFilter();
        this.showAddModal.set(false);
        this.setBodyScrollLocked(false);
      },
      error: (err) => {
        console.error('Failed to add entry', err);
        this.addError.set('Nie udało się dodać wpisu do grafiku');
      }
    });
  }

  cancelAddEntry(): void {
    this.showAddModal.set(false);
    this.setBodyScrollLocked(false);
  }

  selectEmployee(emp: EmployeeSummaryResponse): void {
    this.selectedEmployeeId.set(emp.id);
    this.selectedEmployeeName.set(`${emp.firstName} ${emp.lastName}`.trim() || emp.username);
    // Do NOT auto-filter calendar when selecting from the list.
    // Filtering should apply only when selecting from the calendar event click.
  }

  getEmployeeStats(employeeId: number): EmployeeSidebarStats | undefined {
    return this.employeeStats().get(employeeId);
  }

  // Filter input change
  onFilterInputChange(value: string): void {
    this.employeeCalendarFilter.set(value);
    this.applyCalendarFilter();
  }

  // Clear filter and show all
  clearCalendarFilter(): void {
    this.employeeCalendarFilter.set('');
    this.applyCalendarFilter();
  }

  // Apply calendar filter based on onlySelectedVisible and selectedEmployeeId
  private applyCalendarFilter(): void {
    const term = this.employeeCalendarFilter().toLowerCase().trim();
    let events = this.calendarAllEvents();
    if (term) {
      events = events.filter((e: any) => {
        const name = (e.extendedProps?.userName || '').toLowerCase();
        const initials = (e.extendedProps?.initials || '').toLowerCase();
        return name.includes(term) || initials.includes(term);
      });
    }
    this.calendarEvents.set(events);
    const api = this.calendarRef?.getApi();
    if (api) {
      api.removeAllEvents();
      for (const ev of events) api.addEvent(ev);
    } else {
      const opts = { ...this.calendarOptions(), events } as CalendarOptions;
      this.calendarOptions.set(opts);
    }
  }

  updateMonthlyHoursTarget(value: string | number): void {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(parsed)) {
      return;
    }
    this.hoursTargetManuallySet.set(true);
    this.monthlyHoursTarget.set(parsed < 0 ? 0 : parsed);
  }

  resetMonthlyHoursTarget(): void {
    const current = this.schedule();
    if (!current) {
      return;
    }
    this.hoursTargetManuallySet.set(false);
    this.monthlyHoursTarget.set(
      this.calculateDefaultMonthlyHours(current.startDate, current.endDate)
    );
  }

  getCurrentMonthLabel(): string {
    const current = this.schedule();
    if (!current) {
      return '';
    }
    const d = new Date(current.startDate + 'T00:00:00');
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    return `${this.polishMonthName(d.getMonth() + 1)} ${d.getFullYear()}`;
  }

  formatDateList(dates: string[]): string {
    if (!dates || dates.length === 0) {
      return '';
    }
    return [...dates]
      .sort()
      .map((date) => this.formatShortDate(date))
      .join(', ');
  }

  // Helpers
  private isValidTimeRange(start: string, end: string): boolean {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if ([sh, sm, eh, em].some((v) => Number.isNaN(v))) return false;
    if (sh < 0 || sh > 23 || eh < 0 || eh > 23 || sm < 0 || sm > 59 || em < 0 || em > 59) return false;
    if (eh < sh) return false;
    if (eh === sh && em <= sm) return false;
    return true;
  }

  private entryToEvent(userId: number, userName: string, date: string, start: string, end: string): EventInput {
    const initials = this.getInitials(userName);
    const startHM = this.formatHM(start);
    const endHM = this.formatHM(end);
    return {
      title: userName,
      start: `${date}T${startHM}:00`,
      end: `${date}T${endHM}:00`,
      allDay: false,
      backgroundColor: this.colorForUser(userId),
      borderColor: this.colorForUser(userId),
      extendedProps: { userId, userName, initials, startTime: startHM, endTime: endHM }
    };
  }

  // Build calendar events with optional merging of ranges
  private buildCalendarEvents(entries: WorkScheduleEntryResponse[]): EventInput[] {
    const list = entries || [];
    let scheduleEvents: EventInput[] = [];
    if (this.mergeRanges()) {
      const byUser = new Map<number, WorkScheduleEntryResponse[]>();
      for (const e of list) {
        if (!byUser.has(e.userId)) byUser.set(e.userId, []);
        byUser.get(e.userId)!.push(e);
      }
      const events: EventInput[] = [];
      for (const [userId, es] of byUser.entries()) {
        const name = (es[0]?.userName || '').trim();
        const ranges = this.compressEntries(es);
        for (const r of ranges) {
          const endExclusive = new Date(r.endDate + 'T00:00:00');
          if (!Number.isNaN(endExclusive.getTime())) endExclusive.setDate(endExclusive.getDate() + 1);
          events.push({
            title: name,
            start: r.startDate,
            end: this.formatLocalDate(endExclusive),
            allDay: true,
            backgroundColor: this.colorForUser(userId),
            borderColor: this.colorForUser(userId),
            extendedProps: {
              userId,
              userName: name,
              startTime: this.formatHM(r.startTime),
              endTime: this.formatHM(r.endTime),
              isRange: true
            }
          } as EventInput);
        }
      }
      scheduleEvents = events;
    } else {
      // Per-day timed events
      scheduleEvents = list.map(e => this.entryToEvent(e.userId, e.userName, e.workDate, e.startTime, e.endTime));
    }

    const leaveEvents = this.buildLeaveEventInputs();
    return [...scheduleEvents, ...leaveEvents];
  }

  // Compress consecutive days with same time window per employee
  private compressEntries(entries: WorkScheduleEntryResponse[]): Array<{ startDate: string; endDate: string; startTime: string; endTime: string }> {
    if (!entries || entries.length === 0) return [];
    const sorted = [...entries].sort((a, b) => (a.workDate || '').localeCompare(b.workDate || ''));
    const sameSignature = (a: WorkScheduleEntryResponse, b: WorkScheduleEntryResponse) => a.startTime === b.startTime && a.endTime === b.endTime;
    const isNextDay = (prev: string, curr: string) => {
      const pd = new Date(prev + 'T00:00:00');
      const cd = new Date(curr + 'T00:00:00');
      if (Number.isNaN(pd.getTime()) || Number.isNaN(cd.getTime())) return false;
      const diff = (cd.getTime() - pd.getTime()) / (1000 * 60 * 60 * 24);
      return Math.round(diff) === 1;
    };
    const res: Array<{ startDate: string; endDate: string; startTime: string; endTime: string }> = [];
    let start = sorted[0];
    let end = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const cur = sorted[i];
      if (sameSignature(start, cur) && isNextDay(end.workDate, cur.workDate)) {
        end = cur;
      } else {
        res.push({ startDate: start.workDate, endDate: end.workDate, startTime: start.startTime, endTime: start.endTime });
        start = cur;
        end = cur;
      }
    }
    res.push({ startDate: start.workDate, endDate: end.workDate, startTime: start.startTime, endTime: start.endTime });
    return res;
  }

  private buildLeaveEventInputs(): EventInput[] {
    const record = this.employeeLeaves();
    if (!record || Object.keys(record).length === 0) {
      return [];
    }

    const nameMap = new Map<number, string>();
    for (const emp of this.employees()) {
      const fullName = `${emp.firstName} ${emp.lastName}`.trim() || emp.username;
      nameMap.set(emp.id, fullName);
    }

    const events: EventInput[] = [];
    for (const [key, days] of Object.entries(record)) {
      const userId = Number(key);
      if (!Number.isFinite(userId) || !Array.isArray(days) || days.length === 0) {
        continue;
      }
      const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
      const segments = this.compressLeaveDays(sorted);
      const name = nameMap.get(userId) ?? `Pracownik ${userId}`;
      const initials = this.getInitials(name);

      for (const segment of segments) {
        const longLabel = this.leaveTypeLabel(segment.leaveType);
        const shortLabel = this.leaveShortLabel(segment.leaveType);
        const endExclusive = new Date(segment.endDate + 'T00:00:00');
        if (!Number.isNaN(endExclusive.getTime())) {
          endExclusive.setDate(endExclusive.getDate() + 1);
        }
        events.push({
          title: shortLabel || longLabel || `Urlop`,
          start: segment.startDate,
          end: this.formatLocalDate(endExclusive),
          allDay: true,
          backgroundColor: 'rgba(254, 205, 211, 0.75)',
          borderColor: '#f87171',
          textColor: '#9f1239',
          classNames: ['leave-event', 'leave-code-event'],
          extendedProps: {
            userId,
            userName: name,
            initials,
            isLeave: true,
            leaveType: segment.leaveType,
            leaveLabel: longLabel,
            leaveShortLabel: shortLabel,
            leaveDates: segment.dates,
            leaveTooltip: `Urlop ${longLabel || shortLabel || ''}`.trim() + (name ? ` – ${name}` : '')
          }
        } as EventInput);
      }
    }

    return events;
  }

  private compressLeaveDays(days: LeaveDay[]): Array<{ startDate: string; endDate: string; leaveType: LeaveDay['leaveType']; dates: string[] }> {
    if (!days || days.length === 0) {
      return [];
    }
    const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
    const groups: Array<{ startDate: string; endDate: string; leaveType: LeaveDay['leaveType']; dates: string[] }> = [];

    const isNextDay = (prev: string, curr: string) => {
      const prevDate = new Date(prev + 'T00:00:00');
      const currDate = new Date(curr + 'T00:00:00');
      if (Number.isNaN(prevDate.getTime()) || Number.isNaN(currDate.getTime())) {
        return false;
      }
      const diff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      return Math.round(diff) === 1;
    };

    let current = {
      startDate: sorted[0].date,
      endDate: sorted[0].date,
      leaveType: sorted[0].leaveType,
      dates: [sorted[0].date]
    };

    for (let i = 1; i < sorted.length; i++) {
      const day = sorted[i];
      if (day.leaveType === current.leaveType && isNextDay(current.endDate, day.date)) {
        current.endDate = day.date;
        current.dates.push(day.date);
      } else {
        groups.push({ ...current });
        current = {
          startDate: day.date,
          endDate: day.date,
          leaveType: day.leaveType,
          dates: [day.date]
        };
      }
    }

    groups.push({ ...current });
    return groups;
  }

  // Recompute and render events according to mergeRanges and filter
  refreshCalendarEvents(): void {
    const current = this.schedule();
    const allEvents = this.buildCalendarEvents(current?.entries ?? []);
    this.calendarAllEvents.set(allEvents);
    this.applyCalendarFilter();
  }

  private getInitials(name: string): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    const initials = parts.slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('');
    return initials || name.substring(0, 2).toUpperCase();
  }

  private renderEvent(arg: EventContentArg) {
    const p: any = arg.event.extendedProps || {};
    const name = (p.userName && String(p.userName).trim()) || '';
    // Split name: last token as last name, rest as first
    let firstPart = name;
    let lastPart = '';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      lastPart = parts.pop() as string;
      firstPart = parts.join(' ');
    }
    if (p.isLeave) {
      const shortLabel = p.leaveShortLabel || (p.leaveType ? this.leaveShortLabel(p.leaveType) : 'UP');
      const longLabel = p.leaveLabel || (p.leaveType ? this.leaveTypeLabel(p.leaveType) : '');
      const tooltip = p.leaveTooltip || `${longLabel ? `Urlop ${longLabel}` : 'Urlop'}${name ? ` – ${name}` : ''}`;
      const displayCode = shortLabel || 'UP';
      const html = `<div class="ws-event leave code-only" title="${tooltip.replace(/"/g, '&quot;')}"><span class="code">${displayCode}</span></div>`;
      return { html };
    }
    const start = this.formatDisplayHM(p.startTime || (arg.event.startStr?.substring(11, 19) ?? ''));
    const end = this.formatDisplayHM(p.endTime || (arg.event.endStr?.substring(11, 19) ?? ''));
    let timeText = '';
    if (start && end) {
      timeText = `${start}-${end}`;
    } else if (typeof p.workingHours === 'number' && !Number.isNaN(p.workingHours)) {
      timeText = `${p.workingHours}h`;
    }
    const html = `<div class="ws-event vertical"><div class="name"><div class=\"first\">${firstPart}</div>${lastPart ? `<div class=\"last\">${lastPart}</div>` : ''}</div>${timeText ? `<div class=\"time\">${timeText}</div>` : ''}</div>`;
    return { html };
  }

  private getEntryHours(entry: WorkScheduleEntryResponse): number {
    if (typeof entry.workingHours === 'number' && !Number.isNaN(entry.workingHours)) {
      return entry.workingHours;
    }
    return this.calculateDurationHours(entry.startTime, entry.endTime);
  }

  private calculateDurationHours(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if ([sh, sm, eh, em].some((v) => Number.isNaN(v))) {
      return 0;
    }
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    if (endMinutes <= startMinutes) {
      return 0;
    }
    return +( (endMinutes - startMinutes) / 60 ).toFixed(2);
  }

  private calculateDefaultMonthlyHours(startDate: string, endDate: string): number {
    if (!startDate || !endDate) {
      return 0;
    }
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 0;
    }
    let hours = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) {
        hours += 8;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return hours;
  }

  private buildEmployeeStats(): Map<number, EmployeeSidebarStats> {
    const plannedDatesByEmployee = new Map<number, Set<string>>();
    const plannedHoursByEmployee = new Map<number, number>();
    for (const entry of this.scheduleEntries()) {
      if (!plannedDatesByEmployee.has(entry.userId)) {
        plannedDatesByEmployee.set(entry.userId, new Set());
      }
      plannedDatesByEmployee.get(entry.userId)!.add(entry.workDate);
      const currentHours = plannedHoursByEmployee.get(entry.userId) ?? 0;
      plannedHoursByEmployee.set(entry.userId, currentHours + this.getEntryHours(entry));
    }

    const leaveRecord = this.employeeLeaves();
    const target = this.monthlyHoursTarget();
    const result = new Map<number, EmployeeSidebarStats>();
    for (const emp of this.employees()) {
      const plannedDates = Array.from(plannedDatesByEmployee.get(emp.id) ?? []).sort();
      const leaveDates = (leaveRecord[emp.id] ?? []).map((day) => day.date).sort();
      const plannedHoursRaw = plannedHoursByEmployee.get(emp.id) ?? 0;
      const plannedHours = Number.isFinite(plannedHoursRaw)
        ? Number(plannedHoursRaw.toFixed(2))
        : 0;
      let hoursRemaining: number | null = null;
      if (target > 0) {
        const diff = target - plannedHours;
        hoursRemaining = Number(diff.toFixed(2));
      }
      result.set(emp.id, {
        plannedDays: plannedDates.length,
        plannedDates,
        plannedHours,
        hoursRemaining,
        leaveDays: leaveDates.length,
        leaveDates
      });
    }
    return result;
  }

  private loadLeavesForMonth(startDate: string, endDate: string): void {
    const start = new Date(startDate + 'T00:00:00');
    if (Number.isNaN(start.getTime())) {
      return;
    }
    const year = start.getFullYear();
    const month = start.getMonth() + 1;
    this.leavesLoading.set(true);
    this.leaveProposalService.getEmployeesLeavesByMonth(year, month).subscribe({
      next: (response) => {
        const map: Record<number, LeaveDay[]> = {};
        for (const emp of response.employees) {
          const filtered = emp.leaveDays.filter(
            (day) => day.date >= startDate && day.date <= endDate
          );
          if (filtered.length > 0) {
            map[emp.employeeId] = filtered;
          }
        }
        this.employeeLeaves.set(map);
        this.leavesLoading.set(false);
        this.refreshCalendarEvents();
      },
      error: (err) => {
        console.error('Nie udało się pobrać informacji o urlopach', err);
        this.employeeLeaves.set({});
        this.leavesLoading.set(false);
        this.refreshCalendarEvents();
      }
    });
  }

  // Navigation
  goBackToList(): void {
    this.router.navigate(['/schedules']);
  }

  // Submit schedule for approval
  submitCurrentSchedule(): void {
    const sched = this.schedule();
    if (!sched) return;
    this.workScheduleService.submitSchedule(sched.id).subscribe({
      next: () => {
        alert('Grafik został przesłany do akceptacji');
        this.goBackToList();
      },
      error: (err) => {
        console.error('Nie udało się przesłać grafiku', err);
        alert('Nie udało się przesłać grafiku');
      }
    });
  }

  // Scroll lock for modal
  private setBodyScrollLocked(lock: boolean): void {
    const cls = 'modal-open';
    if (lock) {
      document.body.classList.add(cls);
    } else {
      document.body.classList.remove(cls);
    }
  }

  private leaveTypeLabel(type: LeaveDay['leaveType']): string {
    const key = type as keyof typeof LEAVE_TYPE_LABELS;
    return LEAVE_TYPE_LABELS[key] ?? String(type);
  }

  private leaveShortLabel(type: LeaveDay['leaveType']): string {
    const key = type as keyof typeof LEAVE_TYPE_SHORT_LABELS;
    return LEAVE_TYPE_SHORT_LABELS[key] ?? this.leaveTypeLabel(type).slice(0, 2).toUpperCase();
  }

  private formatShortDate(iso: string): string {
    const date = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
  }

  private formatLeaveRange(dates?: string[]): string {
    if (!dates || dates.length === 0) {
      return '';
    }
    const sorted = [...dates].sort();
    const start = this.formatShortDate(sorted[0]);
    const end = this.formatShortDate(sorted[sorted.length - 1]);
    return start === end ? start : `${start} – ${end}`;
  }

  // Normalize time strings to HH:mm (accept HH:mm or HH:mm:ss)
  private formatHM(value: string | undefined | null): string {
    if (!value) return '';
    const v = String(value).trim();
    const m1 = v.match(/^(\d{2}):(\d{2})$/);
    if (m1) return `${m1[1]}:${m1[2]}`;
    const m2 = v.match(/^(\d{2}):(\d{2}):(\d{2})$/);
    if (m2) return `${m2[1]}:${m2[2]}`;
    if (/^\d{2}:\d{2}:/.test(v)) return v.substring(0,5);
    return v;
  }

  // Display time as H:mm (no leading zero on hour), accept HH:mm or HH:mm:ss
  formatDisplayHM(value: string | undefined | null): string {
    const hm = this.formatHM(value);
    const m = hm.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return hm;
    const hour = String(Number(m[1])); // remove leading zero
    return `${hour}:${m[2]}`;
  }

  // Deterministic pastel color based on userId (consistent per user)
  private colorForUser(userId: number): string {
    let h = (userId * 57) % 360;
    const s = 70;
    const l = 80;
    return `hsl(${h} ${s}% ${l}%)`;
  }
}
