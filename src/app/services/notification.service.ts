import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'info' | 'warning' | 'error';
export interface Toast {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
  correlationId?: string | null;
  details?: any;
  timeoutMs?: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private counter = 0;
  toasts = signal<Toast[]>([]);

  private push(t: Omit<Toast, 'id'>): void {
    const id = ++this.counter;
    const toast: Toast = { id, timeoutMs: 5000, ...t };
    this.toasts.update(arr => [...arr, toast]);
    // auto-dismiss
    const timeout = toast.timeoutMs ?? 5000;
    if (timeout > 0) setTimeout(() => this.dismiss(id), timeout);
  }

  dismiss(id: number): void {
    this.toasts.update(arr => arr.filter(t => t.id !== id));
  }

  success(message: string, title = 'Sukces', extras: Partial<Toast> = {}): void {
    this.push({ type: 'success', message, title, ...extras });
  }
  info(message: string, title = 'Informacja', extras: Partial<Toast> = {}): void {
    this.push({ type: 'info', message, title, ...extras });
  }
  warning(message: string, title = 'Ostrzeżenie', extras: Partial<Toast> = {}): void {
    this.push({ type: 'warning', message, title, ...extras });
  }
  error(message: string, title = 'Błąd', extras: Partial<Toast> = {}): void {
    this.push({ type: 'error', message, title, ...extras });
  }
}
