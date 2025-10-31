import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BackButtonComponent } from '../shared/back-button.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-schedules-hub',
  standalone: true,
  imports: [CommonModule, RouterModule, BackButtonComponent],
  template: `
    <div class="container">
      <app-back-button></app-back-button>
      <h1>📅 Grafiki pracy</h1>
      <p class="subtitle">Szybki dostęp do najważniejszych akcji</p>

      <div class="grid">
        <a class="card" routerLink="/schedules">
          <div class="icon">📋</div>
          <h3>Wszystkie grafiki</h3>
          <p>Przeglądaj i zarządzaj planami pracy</p>
        </a>

        <a class="card" routerLink="/schedules/published">
          <div class="icon">✅</div>
          <h3>Opublikowane</h3>
          <p>Gotowe do użytku grafiki</p>
        </a>

        <a class="card" *ngIf="canCreate()" routerLink="/schedules/create">
          <div class="icon">➕</div>
          <h3>Nowy grafik</h3>
          <p>Utwórz nowy plan pracy</p>
        </a>
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
  `]
})
export class SchedulesHubComponent {
  constructor(private auth: AuthService) {}
  canCreate(): boolean {
    return this.auth.hasAnyRole(['ADMIN', 'HR', 'MANAGER']);
  }
}
