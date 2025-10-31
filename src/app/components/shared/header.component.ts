import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/auth.models';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="app-header" *ngIf="showHeader">
      <!-- Top Bar -->
      <div class="header-top">
        <div class="header-container">
          <!-- Logo and Title -->
          <div class="header-brand">
            <div class="brand-logo">🏢</div>
            <div class="brand-info">
              <h1 class="brand-title">SimpleHR</h1>
              <span class="brand-subtitle">System zarządzania zasobami ludzkimi</span>
            </div>
          </div>

          <!-- User Info and Actions -->
          <div class="header-user" *ngIf="currentUser">
            <div class="user-info">
              <div class="user-avatar">{{ getUserInitials() }}</div>
              <div class="user-details">
                <span class="user-name">{{ getUserDisplayName() }}</span>
                <span class="user-role">{{ getUserRoleLabel() }}</span>
                <span class="user-company" *ngIf="currentUser.companyName">{{ currentUser.companyName }}</span>
              </div>
            </div>
            <button class="logout-btn" (click)="logout()" title="Wyloguj się">
              🚪 Wyloguj
            </button>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="header-nav">
        <div class="header-container">
          <div class="nav-links">
            <!-- Main Navigation -->
            <a routerLink="/dashboard" 
               routerLinkActive="active" 
               class="nav-link">
              📊 Dashboard
            </a>

            <a routerLink="/leave-requests" 
               routerLinkActive="active" 
               class="nav-link">
              🏖️ Moje wnioski
            </a>

            <a routerLink="/schedules" 
               routerLinkActive="active" 
               class="nav-link">
              📅 Harmonogram
            </a>

            <a routerLink="/work-time-records" 
               routerLinkActive="active" 
               class="nav-link">
              🕒 Ewidencja czasu pracy
            </a>

            <a routerLink="/work-time" 
               routerLinkActive="active" 
               class="nav-link">
              📆 Ewidencja (miesiąc)
            </a>

            <!-- Admin/HR Navigation -->
            <div class="nav-dropdown" *ngIf="canAccessAdmin()">
              <button class="nav-link dropdown-toggle" 
                      [class.active]="isAdminRoute()"
                      (click)="toggleAdminDropdown()">
                ⚙️ Administracja
                <span class="dropdown-arrow" [class.open]="adminDropdownOpen">▼</span>
              </button>
              
              <div class="dropdown-menu" *ngIf="adminDropdownOpen">
                <a routerLink="/admin" class="dropdown-item">
                  🏠 Panel główny
                </a>
                <a routerLink="/admin/employees/list" class="dropdown-item">
                  👥 Pracownicy
                </a>
                <a routerLink="/admin/employees/add" class="dropdown-item">
                  👤➕ Dodaj pracownika
                </a>
                <a routerLink="/admin/employees/import" class="dropdown-item">
                  📁⬆️ Import pracowników
                </a>
                <a routerLink="/admin/leave-configuration" class="dropdown-item">
                  🏖️⚙️ Konfiguracja urlopów
                </a>
                <a routerLink="/hr/leave-management" class="dropdown-item">
                  📋 Panel HR - Zarządzanie wnioskami
                </a>
                <a routerLink="/admin/emails" class="dropdown-item">
                  ✉️ Rejestr e-maili
                </a>
              </div>
            </div>

            <!-- Quick Actions -->
            <a routerLink="/leave-requests/create" 
               class="nav-link nav-cta">
              ➕ Nowy wniosek
            </a>
          </div>

          <!-- Mobile Menu Toggle -->
          <button class="mobile-menu-toggle" (click)="toggleMobileMenu()">
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
          </button>
        </div>
      </nav>

      <!-- Mobile Navigation -->
      <div class="mobile-nav" *ngIf="mobileMenuOpen">
        <div class="mobile-nav-content">
          <a routerLink="/dashboard" 
             class="mobile-nav-link" 
             (click)="closeMobileMenu()">
            📊 Dashboard
          </a>
          <a routerLink="/leave-requests" 
             class="mobile-nav-link" 
             (click)="closeMobileMenu()">
            🏖️ Moje wnioski
          </a>
          <a routerLink="/schedules" 
             class="mobile-nav-link" 
             (click)="closeMobileMenu()">
            📅 Harmonogram
          </a>
          <a routerLink="/work-time-records" 
             class="mobile-nav-link" 
             (click)="closeMobileMenu()">
            🕒 Ewidencja czasu pracy
          </a>
          <a routerLink="/work-time" 
             class="mobile-nav-link" 
             (click)="closeMobileMenu()">
            📆 Ewidencja (miesiąc)
          </a>
          <a routerLink="/leave-requests/create" 
             class="mobile-nav-link mobile-nav-cta" 
             (click)="closeMobileMenu()">
            ➕ Nowy wniosek
          </a>
          
          <div class="mobile-nav-section" *ngIf="canAccessAdmin()">
            <div class="mobile-nav-title">Administracja</div>
            <a routerLink="/admin" 
               class="mobile-nav-link" 
               (click)="closeMobileMenu()">
              🏠 Panel główny
            </a>
            <a routerLink="/admin/employees/list" 
               class="mobile-nav-link" 
               (click)="closeMobileMenu()">
              👥 Pracownicy
            </a>
            <a routerLink="/admin/employees/add" 
               class="mobile-nav-link" 
               (click)="closeMobileMenu()">
              👤➕ Dodaj pracownika
            </a>
            <a routerLink="/admin/leave-configuration" 
               class="mobile-nav-link" 
               (click)="closeMobileMenu()">
              🏖️⚙️ Konfiguracja urlopów
            </a>
            <a routerLink="/hr/leave-management" 
               class="mobile-nav-link" 
               (click)="closeMobileMenu()">
              📋 Panel HR - Zarządzanie wnioskami
            </a>
          </div>
        </div>
      </div>
    </header>
  `,
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  currentUser: User | null = null;
  showHeader = false;
  adminDropdownOpen = false;
  mobileMenuOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Sprawdź czy użytkownik jest zalogowany
    this.currentUser = this.authService.getCurrentUser();
    
    // Nasłuchuj zmian w routingu żeby pokazywać/ukrywać header
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateHeaderVisibility(event.url);
        this.closeMobileMenu();
        this.adminDropdownOpen = false;
      });

    // Sprawdź początkową widoczność headera
    this.updateHeaderVisibility(this.router.url);

    // Nasłuchuj zmian w stanie autoryzacji
    this.authService.currentUser$.subscribe((user: User | null) => {
      this.currentUser = user;
      this.updateHeaderVisibility(this.router.url);
    });
  }

  private updateHeaderVisibility(url: string): void {
    // Ukryj header na stronach logowania i rejestracji
    const hideHeaderRoutes = ['/login', '/register'];
    this.showHeader = !hideHeaderRoutes.some(route => url.startsWith(route)) && !!this.currentUser;
  }

  getUserInitials(): string {
    if (!this.currentUser) return '';
    const firstName = this.currentUser.firstName || '';
    const lastName = this.currentUser.lastName || '';
    const username = this.currentUser.username || '';
    
    if (firstName && lastName) {
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  }

  getUserDisplayName(): string {
    if (!this.currentUser) return '';
    const firstName = this.currentUser.firstName || '';
    const lastName = this.currentUser.lastName || '';
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return this.currentUser.username;
  }

  getUserRoleLabel(): string {
    if (!this.currentUser?.roles) return '';

    const roleLabels: { [key: string]: string } = {
      'ADMIN': 'Administrator',
      'HR': 'HR',
      'MANAGER': 'Menedżer',
      'USER': 'Pracownik'
    };

    // Pokaż najwyższą rolę
    if (this.authService.hasAnyRole(['ROLE_ADMIN'])) return roleLabels['ADMIN'];
    if (this.authService.hasAnyRole(['ROLE_HR'])) return roleLabels['HR'];
    if (this.authService.hasAnyRole(['ROLE_MANAGER'])) return roleLabels['MANAGER'];
    return roleLabels['USER'];
  }

  canAccessAdmin(): boolean {
    return this.authService.hasAnyRole(['ROLE_ADMIN', 'ROLE_HR']);
  }

  isAdminRoute(): boolean {
    return this.router.url.startsWith('/admin');
  }

  toggleAdminDropdown(): void {
    this.adminDropdownOpen = !this.adminDropdownOpen;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}