import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { WorkScheduleService } from '../../services/work-schedule.service';
import { EmployeeService } from '../../services/employee.service';
import { EmployeeSummaryResponse } from '../../models/employee.models';
import { WorkScheduleResponse, WorkScheduleStatus } from '../../models/work-schedule.models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-work-schedule-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './work-schedule-list.component.html',
  styleUrls: ['./work-schedule-list.component.css']
})
export class WorkScheduleListComponent implements OnInit {
  schedules = signal<WorkScheduleResponse[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  selectedStatus = signal<string>('');
  presetStatus = signal<string | null>(null);
  title = signal<string>('Grafiki pracy');
  showStatusFilter = computed(() => !this.presetStatus());
  // Map employeeId -> display name for createdBy info
  creators = signal<Map<number, string>>(new Map());

  // Enums dla template
  WorkScheduleStatus = WorkScheduleStatus;

  constructor(
    private workScheduleService: WorkScheduleService,
    private employeeService: EmployeeService,
    private authService: AuthService,
    public router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadCreators();
    const preset = this.route.snapshot.data?.['presetStatus'] as string | undefined;
    if (preset) {
      this.presetStatus.set(preset);
      this.selectedStatus.set(preset);
    }
    const routeTitle = this.route.snapshot.data?.['title'] as string | undefined;
    if (routeTitle) this.title.set(routeTitle);
    this.loadSchedules();
  }

  private loadCreators(): void {
    this.employeeService.getAllEmployees().subscribe({
      next: (employees: EmployeeSummaryResponse[]) => {
        const map = new Map<number, string>();
        for (const e of employees) {
          const name = `${e.firstName} ${e.lastName}`.trim() || e.username;
          map.set(e.id, name);
        }
        this.creators.set(map);
      },
      error: () => {
        // Ignore errors; we'll fall back to showing IDs
        this.creators.set(new Map());
      }
    });
  }

  getCreatorName(userId: number): string {
    const name = this.creators().get(userId);
    return name ? name : `#${userId}`;
  }

  loadSchedules(): void {
    this.loading.set(true);
    this.error.set(null);

    const status = this.selectedStatus() || undefined;
    
    this.workScheduleService.getAllSchedules(status).subscribe({
      next: (schedules) => {
        this.schedules.set(schedules);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading schedules:', error);
        this.error.set('Błąd podczas ładowania grafików');
        this.loading.set(false);
      }
    });
  }

  onStatusChange(event: Event): void {
    if (this.presetStatus()) return; // ignore changes when preset is active
    const select = event.target as HTMLSelectElement;
    this.selectedStatus.set(select.value);
    this.loadSchedules();
  }

  viewSchedule(id: number): void {
    this.router.navigate(['/schedules', id]);
  }

  editSchedule(id: number): void {
    this.router.navigate(['/schedules', id, 'edit']);
  }

  submitSchedule(schedule: WorkScheduleResponse): void {
    if (schedule.status === WorkScheduleStatus.DRAFT) {
      this.workScheduleService.submitSchedule(schedule.id).subscribe({
        next: () => {
          this.loadSchedules(); // Przeładuj listę
        },
        error: (error) => {
          console.error('Error submitting schedule:', error);
          alert('Błąd podczas przesyłania grafiku');
        }
      });
    }
  }

  approveSchedule(schedule: WorkScheduleResponse): void {
    if (schedule.status === WorkScheduleStatus.SUBMITTED) {
      this.workScheduleService.approveSchedule(schedule.id).subscribe({
        next: () => {
          this.loadSchedules(); // Przeładuj listę
        },
        error: (error) => {
          console.error('Error approving schedule:', error);
          alert('Błąd podczas zatwierdzania grafiku');
        }
      });
    }
  }

  publishSchedule(schedule: WorkScheduleResponse): void {
    if (schedule.status === WorkScheduleStatus.APPROVED) {
      this.workScheduleService.publishSchedule(schedule.id).subscribe({
        next: () => {
          this.loadSchedules(); // Przeładuj listę
        },
        error: (error) => {
          console.error('Error publishing schedule:', error);
          alert('Błąd podczas publikowania grafiku');
        }
      });
    }
  }

  canManageSchedules(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'HR', 'MANAGER']);
  }

  canApproveSchedules(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'HR']);
  }

  getStatusClass(status: WorkScheduleStatus): string {
    switch (status) {
      case WorkScheduleStatus.DRAFT:
        return 'status-draft';
      case WorkScheduleStatus.SUBMITTED:
        return 'status-submitted';
      case WorkScheduleStatus.APPROVED:
        return 'status-approved';
      case WorkScheduleStatus.REJECTED:
        return 'status-rejected';
      case WorkScheduleStatus.PUBLISHED:
        return 'status-published';
      default:
        return '';
    }
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

  // Format YYYY-MM-DD to DD/MM/YYYY without timezone shifts
  formatYMD(dateStr: string | undefined | null): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
}