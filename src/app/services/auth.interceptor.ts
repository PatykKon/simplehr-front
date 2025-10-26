import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    
    console.log('🚨 === AuthInterceptor Debug ===');
    console.log('🚨 URL:', req.url);
    console.log('🚨 Method:', req.method);
    console.log('🚨 Token exists:', !!token);
    console.log('🚨 Token length:', token ? token.length : 0);
    console.log('🚨 Token from localStorage directly:', localStorage.getItem('jwt_token'));
    console.log('🚨 Token preview:', token ? token.substring(0, 50) + '...' : 'BRAK TOKENA!');
    console.log('🚨 AuthService available:', !!this.authService);
    
    let modifiedReq = req;
    
    if (token) {
      console.log('🚨 ADDING Authorization header to request!');
      modifiedReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('🚨 ✅ Authorization header ADDED!');
      console.log('🚨 All headers after modification:', modifiedReq.headers.keys());
      console.log('🚨 Authorization header value:', modifiedReq.headers.get('Authorization')?.substring(0, 50) + '...');
      console.log('🚨 Final request headers check:');
      modifiedReq.headers.keys().forEach(key => {
        console.log(`🚨   ${key}: ${modifiedReq.headers.get(key)}`);
      });
    } else {
      console.log('🚨 ❌ NO TOKEN FOUND - request will be sent WITHOUT Authorization header!');
      console.log('🚨 ❌ This means either:');
      console.log('🚨     1. User is not logged in');
      console.log('🚨     2. Token expired');  
      console.log('🚨     3. localStorage is empty');
      console.log('🚨     4. AuthService.getToken() is broken');
    }
    
    console.log('=== End AuthInterceptor Debug ===');
    
    return next.handle(modifiedReq).pipe(
      tap({
        next: (event) => {
          if (event.type === 4) { // HttpEventType.Response
            console.log('✅ Successful response for:', req.url);
          }
        },
        error: (error) => {
          console.log('❌ HTTP Error for:', req.url);
          console.log('Error status:', error.status);
          console.log('Error message:', error.message);
          
          if (error.status === 403 || error.status === 401) {
            console.log('🔍 Auth Error - Checking headers sent:');
            console.log('Request headers keys:', modifiedReq.headers.keys());
            console.log('Authorization header sent:', modifiedReq.headers.get('Authorization') ? 'YES' : 'NO');
            console.log('Authorization header value:', modifiedReq.headers.get('Authorization')?.substring(0, 30) + '...');
          }
        }
      })
    );
  }
}