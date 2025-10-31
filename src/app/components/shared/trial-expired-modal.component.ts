import { Component, ElementRef, HostListener, OnDestroy, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrialService } from '../../services/trial.service';

@Component({
  selector: 'app-trial-expired-modal',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 2000; display:flex; align-items:center; justify-content:center; }
    .modal { background: #fff; border-radius: 12px; width: 95%; max-width: 560px; box-shadow: 0 10px 30px rgba(0,0,0,.2); }
    .header { padding: 18px 20px; border-bottom: 1px solid #eee; font-size: 18px; font-weight: 600; }
    .content { padding: 20px; line-height: 1.5; }
    .footer { padding: 16px 20px; display:flex; gap: 12px; justify-content:flex-end; border-top: 1px solid #eee; }
    .btn { padding: 10px 14px; border-radius: 8px; border: 1px solid #ccc; background: #f5f5f5; cursor: pointer; }
    .btn.primary { background:#1976d2; color:#fff; border-color:#1976d2; }
  `],
  template: `
    <div *ngIf="open" class="backdrop" role="dialog" aria-modal="true" aria-labelledby="trial-expired-title">
      <div class="modal" tabindex="-1" #dialog>
        <div class="header" id="trial-expired-title">Okres testowy wygasł</div>
        <div class="content">
          <p>
            Dostęp do płatnych funkcji został zablokowany. 
            <ng-container *ngIf="expiresAt">Data wygaśnięcia: <strong>{{ expiresAt | date:'yyyy-MM-dd HH:mm' }}</strong>.</ng-container>
          </p>
          <p>Aby kontynuować korzystanie, skontaktuj się z nami lub wykup plan.</p>
        </div>
        <div class="footer">
          <button class="btn" type="button" (click)="learnMore()">Dowiedz się więcej</button>
          <button class="btn primary" type="button" (click)="cta()">Skontaktuj się / Kup</button>
        </div>
      </div>
    </div>
  `
})
export class TrialExpiredModalComponent implements OnInit, OnDestroy {
  private trial = inject(TrialService);
  private host = inject(ElementRef<HTMLElement>);

  open = false;
  expiresAt?: string;

  private teardown = effect(() => {
    this.open = this.trial.expiredModalOpen();
    this.expiresAt = this.trial.expiredAt();
    if (this.open) setTimeout(() => this.focusDialog(), 0);
  });

  ngOnInit(): void {}
  ngOnDestroy(): void { this.teardown.destroy(); }

  private focusDialog(): void {
    const el = this.host.nativeElement.querySelector('.modal') as HTMLElement | null;
    el?.focus();
  }

  // trap ESC to avoid closing via keyboard unless we decide to
  @HostListener('document:keydown', ['$event'])
  onKeyDown(ev: KeyboardEvent) {
    if (!this.open) return;
    if (ev.key === 'Escape') {
      // Keep modal open to block, do nothing
      ev.preventDefault();
      ev.stopPropagation();
    }
  }

  learnMore(): void {
    window.open('https://simplehr.example.com/pricing', '_blank');
  }

  cta(): void {
    window.open('https://simplehr.example.com/contact', '_blank');
  }
}
