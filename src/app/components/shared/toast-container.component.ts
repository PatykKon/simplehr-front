import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div *ngFor="let t of toasts()" class="toast" [class]="'toast ' + t.type">
        <div class="toast-header">
          <span class="title">{{ t.title || label(t.type) }}</span>
          <button class="close" (click)="dismiss(t.id)">×</button>
        </div>
        <div class="toast-message">{{ t.message }}</div>
        <div class="toast-meta" *ngIf="t.correlationId">CID: {{ t.correlationId }}</div>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed; top: 16px; right: 16px; z-index: 2000; display: flex; flex-direction: column; gap: 8px;
    }
    .toast { min-width: 280px; max-width: 420px; border-radius: 8px; padding: 8px 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); background: #fff; border-left: 4px solid #ccc; }
    .toast-header { display: flex; align-items: center; justify-content: space-between; font-weight: 600; margin-bottom: 4px; }
    .toast-message { color: #333; }
    .toast-meta { color: #666; font-size: 12px; margin-top: 4px; }
    .toast.success { border-left-color: #16a34a; }
    .toast.info { border-left-color: #2563eb; }
    .toast.warning { border-left-color: #d97706; }
    .toast.error { border-left-color: #dc2626; }
    .close { background: transparent; border: none; font-size: 18px; cursor: pointer; color: #666; }
  `]
})
export class ToastContainerComponent {
  constructor(private ns: NotificationService) {}

  toasts() { return this.ns.toasts(); }
  dismiss(id: number) { this.ns.dismiss(id); }

  label(type: string) {
    switch(type) {
      case 'success': return 'Sukces';
      case 'info': return 'Informacja';
      case 'warning': return 'Ostrzeżenie';
      case 'error': return 'Błąd';
      default: return '';
    }
  }
}
