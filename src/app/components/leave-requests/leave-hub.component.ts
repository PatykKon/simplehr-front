import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BackButtonComponent } from '../shared/back-button.component';
import { AuthService } from '../../services/auth.service';

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

        <a class="card" *ngIf="canManageLeaves()" routerLink="/hr/leave-management">
          <div class="icon">⚙️</div>
          <h3>Zarządzanie wnioskami</h3>
          <p>Przegląd i decyzje HR/Menedżera</p>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
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
export class LeaveHubComponent {
  constructor(private auth: AuthService) {}
  canManageLeaves(): boolean {
    return this.auth.hasAnyRole(['ADMIN', 'HR', 'MANAGER']);
  }
}
