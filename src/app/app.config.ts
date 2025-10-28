import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { routes } from './app.routes';
import { AuthService } from './services/auth.service';
import { NotificationService } from './services/notification.service';
import { ErrorResponse } from './models/error.models';

// Functional interceptor dla Angular 18+
export const authInterceptor = (req: any, next: any) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  // attach correlation id if not present
  const correlationId = cryptoRandomId();
  const baseHeaders: Record<string, string> = { 'X-Correlation-Id': correlationId };
  
  // console.debug('authInterceptor ->', req.url, 'token?', !!token);
  
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        ...baseHeaders,
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }
  
  const withCid = req.clone({ setHeaders: { ...baseHeaders } });
  return next(withCid);
};

// Global error interceptor - maps backend ErrorResponse into nice toasts
export const errorInterceptor = (req: any, next: any) => {
  const notifications = inject(NotificationService);
  return next(req).pipe(
    catchError((err: any) => {
      try {
        if (err instanceof HttpErrorResponse) {
          const status = err.status;
          const body = err.error as Partial<ErrorResponse> | any;
          const headerCid = err.headers?.get('X-Correlation-Id') || err.headers?.get('x-correlation-id');
          let title = 'Błąd';
          if (status === 400) title = 'Błędne dane';
          else if (status === 403) title = 'Brak uprawnień';
          else if (status === 404) title = 'Nie znaleziono';
          else if (status === 409) title = 'Konflikt';
          else if (status >= 500) title = 'Błąd serwera';

          let message = (body?.message as string) || err.message || 'Wystąpił błąd';
          if (status === 400 && body?.details && typeof body.details === 'object') {
            const entries = Object.entries(body.details as Record<string, string>);
            if (entries.length) {
              const preview = entries.slice(0, 3).map(([f, m]) => `${f}: ${m}`).join('; ');
              message += ` (Walidacja: ${preview}${entries.length > 3 ? '…' : ''})`;
            }
          }

          notifications.error(message, title, { correlationId: (body?.correlationId as string) || headerCid || undefined });
        }
      } catch {}
      return throwError(() => err);
    })
  );
};

// Simple random id generator for correlation (not a full UUID to avoid extra deps)
function cryptoRandomId(): string {
  try {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
  } catch {
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))
  ]
};
