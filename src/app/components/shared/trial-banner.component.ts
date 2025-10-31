import { Component, OnDestroy, OnInit, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrialService } from '../../services/trial.service';

@Component({
  selector: 'app-trial-banner',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .trial-banner { 
      position: sticky; top: 0; z-index: 1000; 
      display: flex; align-items: center; gap: 12px; 
      padding: 10px 16px; 
      background: #e6f4ff; color: #054372; 
      border-bottom: 1px solid #c3e3ff;
    }
    .trial-banner.warn { background:#fff7e6; color:#663c00; border-bottom-color:#ffe0b3; }
    .trial-banner strong { font-weight: 600; }
    .trial-banner .dot { width:8px; height:8px; border-radius:50%; background:#2b86ff; }
    .trial-banner.warn .dot { background:#ff9800; }
    .trial-banner .spacer { flex: 1; }
    .trial-banner button.cta { background:#054372; color:#fff; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; }
    .trial-banner.warn button.cta { background:#663c00; }
  `],
  template: `
    <div *ngIf="show" 
         class="trial-banner" 
         [class.warn]="warning"
         role="status" aria-live="polite">
      <span class="dot" aria-hidden="true"></span>
      <span>
        <ng-container *ngIf="remainingDays === 0; else daysTpl">
          <strong>Ostatni dzień testu</strong>
        </ng-container>
        <ng-template #daysTpl>
          Pozostało <strong>{{ remainingDays }}</strong> dni testu
        </ng-template>
      </span>
      <span class="spacer"></span>
      <button class="cta" type="button" (click)="onCtaClick()">Skontaktuj się / Kup</button>
    </div>
  `
})
export class TrialBannerComponent implements OnInit, OnDestroy {
  private trial = inject(TrialService);

  show = false;
  warning = false;
  remainingDays: number | null = null;

  private teardown = effect(() => {
    this.show = this.trial.showBanner();
    this.warning = this.trial.warningVariant();
    const st = this.trial.status();
    this.remainingDays = st?.remaining_days ?? null;
  });

  ngOnInit(): void {}
  ngOnDestroy(): void { this.teardown.destroy(); }

  onCtaClick(): void {
    // Placeholder CTA: open email or pricing page
    window.open('https://simplehr.example.com/contact', '_blank');
  }
}
