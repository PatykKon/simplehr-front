import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-panel">
      <div class="admin-header">
        <h1>Panel Administratora</h1>
        <p>Zarządzanie pracownikami i urlopami</p>
      </div>

      <div class="admin-cards">
        <div class="admin-card" routerLink="/admin/employees/add">
          <div class="card-icon">👤➕</div>
          <h3>Dodaj Pracownika</h3>
          <p>Dodaj nowego pracownika do systemu</p>
        </div>

        <div class="admin-card" routerLink="/admin/employees/import">
          <div class="card-icon">📁⬆️</div>
          <h3>Import Pracowników</h3>
          <p>Importuj pracowników z pliku CSV</p>
        </div>

        <div class="admin-card" routerLink="/admin/employees/list">
          <div class="card-icon">👥</div>
          <h3>Lista Pracowników</h3>
          <p>Zobacz i zarządzaj wszystkimi pracownikami</p>
        </div>

        <div class="admin-card" routerLink="/admin/leave-balances">
          <div class="card-icon">🏖️⚖️</div>
          <h3>Salda Urlopowe</h3>
          <p>Zarządzaj saldami urlopowymi pracowników</p>
        </div>

        <div class="admin-card" routerLink="/admin/reports">
          <div class="card-icon">📊</div>
          <h3>Raporty</h3>
          <p>Raporty i statystyki urlopowe</p>
        </div>

        <div class="admin-card" routerLink="/admin/leave-configuration">
          <div class="card-icon">🏖️⚙️</div>
          <h3>Konfiguracja Urlopów</h3>
          <p>Zarządzaj typami i regułami urlopów</p>
        </div>

        <div class="admin-card" routerLink="/admin/settings">
          <div class="card-icon">⚙️</div>
          <h3>Ustawienia</h3>
          <p>Konfiguracja systemu</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-panel {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .admin-header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .admin-header h1 {
      color: #2563eb;
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    .admin-header p {
      color: #6b7280;
      font-size: 1.1rem;
    }

    .admin-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
    }

    .admin-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border: 1px solid #e5e7eb;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      color: inherit;
    }

    .admin-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
      border-color: #2563eb;
    }

    .card-icon {
      font-size: 3rem;
      text-align: center;
      margin-bottom: 1rem;
    }

    .admin-card h3 {
      color: #1f2937;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      text-align: center;
    }

    .admin-card p {
      color: #6b7280;
      text-align: center;
      line-height: 1.5;
    }

    @media (max-width: 768px) {
      .admin-panel {
        padding: 1rem;
      }

      .admin-cards {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .admin-card {
        padding: 1.5rem;
      }

      .admin-header h1 {
        font-size: 2rem;
      }
    }
  `]
})
export class AdminPanelComponent {
  constructor(public authService: AuthService) {}
}