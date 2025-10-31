import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BackButtonComponent } from '../shared/back-button.component';
import { AuthService } from '../../services/auth.service';
import { LeaveProposalService } from '../../services/leave-proposal.service';
import { EmployeeLeaveProposalResponse, LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS } from '../../models/leave-proposal.models';

@Component({
  selector: 'app-leave-hub',
  standalone: true,
  imports: [CommonModule, RouterModule, BackButtonComponent],
  template: `
    <div class="container">
      <app-back-button></app-back-button>
      <h1>🏖️ Urlopy</h1>
      <p class="subtitle">Wszystko w jednym miejscu: wnioski, tworzenie, zarządzanie</p>

      <div class="grid">
        <a class="card" routerLink="/leave-requests">
          <div class="icon">📝</div>
          <h3>Moje wnioski</h3>
          <p>Przeglądaj i śledź status swoich wniosków</p>
        </a>

        <a class="card" routerLink="/leave-requests/create">
          <div class="icon">➕</div>
          <h3>Nowy wniosek</h3>
          <p>Złóż wniosek urlopowy w kilku krokach</p>
        </a>

        <a class="card" routerLink="/leave-requests/search">
          <div class="icon">🔎</div>
          <h3>Wyszukiwarka wniosków</h3>
          <p>Filtruj i sortuj wnioski z paginacją</p>
        </a>

        <a class="card" *ngIf="canManageLeaves()" routerLink="/hr/leave-management">
          <div class="icon">⚙️</div>
          <h3>Zarządzanie wnioskami</h3>
          <p>Przegląd i decyzje HR/Menedżera</p>
        </a>
      </div>

      <div class="recent" *ngIf="recent().length > 0">
        <div class="recent-header">
          <h2>Moje ostatnie wnioski</h2>
          <a class="btn-link" routerLink="/leave-requests">Zobacz wszystkie →</a>
        </div>
        <div class="recent-list">
          <div class="recent-item" *ngFor="let r of recent() | slice:0:5">
            <div class="left">
              <div class="title">{{ r.title || (leaveTypeLabel(r.leaveType) + ' • ' + formatRange(r.startDate, r.endDate)) }}</div>
              <div class="meta">
                <span class="type">{{ leaveTypeLabel(r.leaveType) }}</span>
                <span class="dot">•</span>
                <span class="range">{{ formatRange(r.startDate, r.endDate) }}</span>
              </div>
            </div>
            <div class="right">
              <span class="status-chip" [class]="statusClass(r.status)">{{ statusLabel(r.status) }}</span>
              <a class="btn-link" [routerLink]="['/leave-requests', r.id]">Szczegóły</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
  .container { max-width: var(--page-max-width, 1200px); margin: 0 auto; padding: 2rem; }
    h1 { font-size: 2rem; margin: 0 0 .5rem; color: #111827; }
    .subtitle { color: #6b7280; margin-bottom: 1.5rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; }
    .card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.5rem; text-decoration: none; color: inherit; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: transform .2s, box-shadow .2s; display: block; }
    .card:hover { transform: translateY(-3px); box-shadow: 0 10px 20px -5px rgba(0,0,0,0.1); }
    .icon { font-size: 2rem; margin-bottom: .5rem; }
    h3 { margin: .25rem 0 .5rem; font-size: 1.1rem; }
    p { color: #4b5563; margin: 0; }

    .recent { margin-top: 2rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; }
    .recent-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid #e5e7eb; }
    .recent-header h2 { margin: 0; font-size: 1.1rem; color: #111827; }
    .btn-link { color: #2563eb; text-decoration: none; font-weight: 600; }
    .btn-link:hover { text-decoration: underline; }
    .recent-list { display: flex; flex-direction: column; }
    .recent-item { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: .85rem 1.25rem; }
    .recent-item + .recent-item { border-top: 1px solid #f1f5f9; }
    .recent-item .left { min-width: 0; }
    .recent-item .title { font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .recent-item .meta { color: #64748b; font-size: .9rem; display: flex; align-items: center; gap: .5rem; }
    .recent-item .dot { opacity: .6; }
    .status-chip { display: inline-flex; align-items: center; padding: .2rem .55rem; border-radius: 999px; font-size: .75rem; font-weight: 700; }
    .status-chip.approved { background: #dcfce7; color: #166534; }
    .status-chip.rejected { background: #fee2e2; color: #991b1b; }
    .status-chip.submitted, .status-chip.in_review { background: #fef3c7; color: #92400e; }
  `]
})
export class LeaveHubComponent implements OnInit {
  recent = signal<EmployeeLeaveProposalResponse[]>([]);

  constructor(private auth: AuthService, private leaveService: LeaveProposalService) {}

  ngOnInit(): void {
    this.leaveService.getMyLeaveProposals().subscribe({
      next: (list) => {
        this.recent.set((list ?? []).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || '')));
      },
      error: () => {
        this.recent.set([]);
      }
    });
  }
  canManageLeaves(): boolean {
    return this.auth.hasAnyRole(['ADMIN', 'HR', 'MANAGER']);
  }
  statusLabel(status: keyof typeof LEAVE_STATUS_LABELS | string): string {
    const key = status as keyof typeof LEAVE_STATUS_LABELS;
    return LEAVE_STATUS_LABELS[key] ?? String(status);
  }
  statusClass(status: any): string { return String(status || '').toLowerCase(); }
  leaveTypeLabel(type: any): string { return LEAVE_TYPE_LABELS[type as keyof typeof LEAVE_TYPE_LABELS] ?? String(type); }
  private d(v?: string | null) { if (!v) return null; const dt = new Date(v); return Number.isNaN(dt.getTime()) ? null : dt; }
  formatRange(start?: string | null, end?: string | null): string {
    const s = this.d(start ?? undefined); const e = this.d(end ?? undefined); if (!s || !e) return '';
    const pl = (d: Date) => d.toLocaleDateString('pl-PL');
    return `${pl(s)} – ${pl(e)}`;
  }
}
