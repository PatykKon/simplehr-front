import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/auth.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  currentUser = signal<User | null>(null);
  
  // Computed properties dla ról - obsługuje role z prefiksem ROLE_
  isAdmin = computed(() => {
    const roles = this.currentUser()?.roles ?? [];
    return roles.includes('ADMIN') || roles.includes('ROLE_ADMIN');
  });
  isHR = computed(() => {
    const roles = this.currentUser()?.roles ?? [];
    return roles.includes('HR') || roles.includes('ROLE_HR');
  });
  isManager = computed(() => {
    const roles = this.currentUser()?.roles ?? [];
    return roles.includes('MANAGER') || roles.includes('ROLE_MANAGER');
  });
  
  // Sprawdza czy użytkownik może zarządzać systemem (admin/HR)
  canManageSystem = computed(() => this.isAdmin() || this.isHR());
  
  // Sprawdza czy użytkownik może zarządzać grafikami (admin/HR/manager)
  canManageSchedules = computed(() => this.isAdmin() || this.isHR() || this.isManager());

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Pobierz aktualnego użytkownika
    this.authService.currentUser$.subscribe(user => {
      this.currentUser.set(user);
      console.log('=== DASHBOARD DEBUG ===');
      console.log('Current user:', user);
      console.log('User roles:', user?.roles);
      console.log('Is Admin:', this.isAdmin());
      console.log('Is HR:', this.isHR());
      console.log('Can manage system:', this.canManageSystem());
      console.log('=== END DEBUG ===');
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}