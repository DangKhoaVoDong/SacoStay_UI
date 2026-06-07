import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { resolvePostLoginUrl } from '../../utils/auth-navigation';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn) {
    return true;
  }
  const returnUrl = resolvePostLoginUrl(router.url, '/');
  return router.createUrlTree(['/login'], {
    queryParams: returnUrl === '/' ? {} : { returnUrl }
  });
};
