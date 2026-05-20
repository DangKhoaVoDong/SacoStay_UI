import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';

function isAuthPage(url: string): boolean {
  const path = url.split('?')[0];
  return (
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/auth') ||
    path.startsWith('/otp-verification') ||
    path.startsWith('/forgot-password') ||
    path.startsWith('/verify-reset-otp') ||
    path.startsWith('/reset-password')
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const isLoginRequest =
        req.method === 'POST' && (req.url.includes('/Auth/login') || req.url.includes('/auth/login'));

      if (err.status === 401 && !isLoginRequest && token) {
        auth.clearSession();
        if (!isAuthPage(router.url)) {
          void router.navigate(['/login'], {
            queryParams: { returnUrl: router.url }
          });
        }
      }

      return throwError(() => err);
    })
  );
};
