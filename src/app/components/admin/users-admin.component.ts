import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BackButtonComponent } from '../shared/back-button.component';

@Component({
  selector: 'app-users-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, BackButtonComponent],
  template: `
    <div class="container">
      <app-back-button></app-back-button>
      <h1>👥 Użytkownicy</h1>
      <p class="subtitle">Zarządzaj użytkownikami systemu</p>

      <div class="grid">
        <a class="card" routerLink="/admin/employees/add">
          <div class="icon">👤➕</div>
          <h3>Dodaj Pracownika</h3>
          <p>Dodaj nowego pracownika do systemu</p>
        </a>

        <a class="card" routerLink="/admin/employees/import">
          <div class="icon">📁⬆️</div>
          <h3>Import Pracowników</h3>
          <p>Importuj pracowników z pliku CSV</p>
        </a>

        <a class="card" routerLink="/admin/employees/list">
          <div class="icon">👥</div>
          <h3>Lista Pracowników</h3>
          <p>Zobacz i zarządzaj wszystkimi pracownikami</p>
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
export class UsersAdminComponent {}
