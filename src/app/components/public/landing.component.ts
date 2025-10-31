import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit {
  year = new Date().getFullYear();
  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Jeśli użytkownik jest zalogowany, przekieruj na dashboard
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  goToRegister(plan?: string): void {
    const extras = plan ? { queryParams: { plan } } : undefined;
    this.router.navigate(['/register'], extras);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
