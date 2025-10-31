import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { TrialService } from '../services/trial.service';

@Injectable({ providedIn: 'root' })
export class TrialGuard implements CanActivate {
  constructor(private trial: TrialService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    // Block only if we already know about expiration
    if (this.trial.isExpired() || this.trial.expiredModalOpen()) {
      this.trial.openExpiredModal(this.trial.expiredAt());
      return this.router.parseUrl('/login'); // allow access to public login; could be dedicated info page
    }
    return true;
  }
}
