import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { inject } from '@angular/core';

import { routes } from './app.routes';
import { AuthService } from './services/auth.service';

// Functional interceptor dla Angular 18+
export const authInterceptor = (req: any, next: any) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  
  console.log('🚨🚨🚨 FUNCTIONAL INTERCEPTOR EXECUTING!');
  console.log('🚨 URL:', req.url);
  console.log('🚨 Token exists:', !!token);
  console.log('🚨 Token length:', token ? token.length : 0);
  
  if (token) {
    console.log('🚨 ✅ CLONING REQUEST WITH TOKEN!');
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('🚨 ✅ Authorization header added:', authReq.headers.get('Authorization')?.substring(0, 30) + '...');
    return next(authReq);
  }
  
  console.log('🚨 ❌ NO TOKEN - sending without auth');
  return next(req);
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
