import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AccountService } from '../../services/account.service';
import { AccountOverview } from '../../models/account.models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-account-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './account-overview.component.html',
  styleUrls: ['./account-overview.component.css']
})
export class AccountOverviewComponent implements OnInit {
  loading = signal(false);
  error = signal<string | null>(null);
  data = signal<AccountOverview | null>(null);

  // From user context
  currentUser = signal<any>(null);
  roles = computed(() => this.currentUser()?.roles || []);
  enabled = computed(() => true); // Not provided directly; can be mapped if available

  constructor(private api: AccountService, private auth: AuthService) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(null);
    // Refresh current user on init
    this.currentUser.set(this.auth.getCurrentUser());
    this.api.getOverview().subscribe({
      next: (res) => { this.data.set(res); this.loading.set(false); },
      error: () => { this.error.set('Nie udało się pobrać danych konta. Spróbuj ponownie.'); this.loading.set(false); }
    });
  }

  planLabel(plan?: string | null): string {
    switch ((plan || '').toUpperCase()) {
      case 'FREE': return 'Free';
      case 'TRIAL': return 'Trial';
      case 'PRO': return 'Pro';
      case 'PREMIUM': return 'Premium';
      case 'ENTERPRISE': return 'Enterprise';
      default: return plan || '—';
    }
  }

  formatDate(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }
}
