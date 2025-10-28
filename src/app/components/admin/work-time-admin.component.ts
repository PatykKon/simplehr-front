import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorkTimeAdminService } from '../../services/work-time-admin.service';
import { BackButtonComponent } from '../shared/back-button.component';

@Component({
  selector: 'app-work-time-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BackButtonComponent],
  template: `
    <div class="container">
      <app-back-button></app-back-button>
      <h1>🕒 Ewidencja godzin — Administracja</h1>
      <p class="subtitle">Przelicz dni i sprawdź historię uruchomień</p>

      <div class="grid">
        <div class="card">
          <div class="icon">🗓️</div>
          <h3>Przelicz dni (miesięczne ewidencje)</h3>
          <p>Wyzwól utworzenie ewidencji miesięcznych dla wskazanego okresu.</p>
          <form class="inline-form" (ngSubmit)="triggerCreateRecords()">
            <label>
              Rok
              <input type="number" [(ngModel)]="year" name="year" min="2000" max="2100" required />
            </label>
            <label>
              Miesiąc
              <input type="number" [(ngModel)]="month" name="month" min="1" max="12" required />
            </label>
            <button class="secondary" type="submit" [disabled]="loading">Wyzwól</button>
          </form>
          <div class="muted" *ngIf="info">{{ info }}</div>
        </div>

        <div class="card">
          <div class="icon">📜</div>
          <h3>Historia przeliczeń</h3>
          <p>Ostatnie wywołania zadania i stan.</p>
          <button class="primary" type="button" (click)="loadHistory()">Odśwież</button>
          <div class="muted" *ngIf="historyLoading">Ładowanie…</div>
          <table class="history" *ngIf="!historyLoading && history.length">
            <thead>
              <tr><th>Data</th><th>Okres</th><th>Status</th><th>Kto</th><th>Info</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let h of history">
                <td>{{ h.triggeredAt | date:'yyyy-LL-dd HH:mm' }}</td>
                <td>{{ h.year }}-{{ h.month | number: '2.0-0' }}</td>
                <td>{{ h.status || 'unknown' }}</td>
                <td>{{ h.triggeredBy || '—' }}</td>
                <td class="muted">{{ h.message || '—' }}</td>
              </tr>
            </tbody>
          </table>
          <div class="muted" *ngIf="!historyLoading && !history.length">Brak wpisów</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container { max-width: 960px; margin: 0 auto; padding: 2rem; }
    h1 { font-size: 2rem; margin: 0 0 0.5rem; color: #111827; }
    .subtitle { color: #6b7280; margin-bottom: 1.5rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: transform .2s, box-shadow .2s; cursor: pointer; }
    .card:hover { transform: translateY(-3px); box-shadow: 0 10px 20px -5px rgba(0,0,0,0.1); }
    .icon { font-size: 2rem; margin-bottom: .5rem; }
    h3 { margin: .25rem 0 .5rem; }
    p { color: #4b5563; margin: 0 0 1rem; }
    .primary { background: #2563eb; color: white; padding: .5rem .75rem; border: none; border-radius: 8px; }
    .secondary { background: #111827; color: white; padding: .5rem .75rem; border: none; border-radius: 8px; }
    .inline-form { display: grid; grid-template-columns: 1fr 1fr auto; gap: .5rem; align-items: end; }
    label { display: grid; gap: .25rem; color: #374151; font-size: .9rem; }
    input[type=number] { padding: .5rem; border: 1px solid #d1d5db; border-radius: 8px; }
    .muted { color: #6b7280; margin-top: .5rem; font-size: .9rem; }
    table.history { width: 100%; border-collapse: collapse; margin-top: .75rem; }
    table.history th, table.history td { border-bottom: 1px solid #eee; padding: .5rem; text-align: left; }
  `]
})
export class WorkTimeAdminComponent {
  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;
  loading = false;
  info: string | null = null;
  historyLoading = false;
  history: Array<{ id?: number; year: number; month: number; triggeredAt: string; triggeredBy?: string; status?: string; message?: string }> = [];

  constructor(private router: Router, private wtAdmin: WorkTimeAdminService) {}

  ngOnInit(): void { this.loadHistory(); }

  triggerCreateRecords(): void {
    this.info = null; this.loading = true;
    this.wtAdmin.createMonthlyRecords(this.year, this.month).subscribe({
      next: () => { this.loading = false; this.info = 'Żądanie przyjęte (202 Accepted). Sprawdź historię poniżej.'; this.loadHistory(); },
      error: (e) => { console.error(e); this.loading = false; this.info = this.mapError(e); }
    });
  }

  loadHistory(): void {
    this.historyLoading = true;
    this.wtAdmin.getHistory().subscribe({
      next: list => { this.history = list || []; this.historyLoading = false; },
      error: () => { this.history = []; this.historyLoading = false; }
    });
  }

  private mapError(e: any): string {
    if (e?.status === 400) return 'Błędne parametry (rok/miesiąc)';
    if (e?.status === 403) return 'Brak uprawnień do wykonania operacji';
    return 'Wystąpił błąd podczas wyzwalania zadania';
  }
}
