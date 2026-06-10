import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  CREATE_LISTING_PATH,
  isCreateListingReturnUrl,
  resolvePostLoginUrl
} from '../../utils/auth-navigation';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn) {
    return true;
  }
  const returnUrl = resolvePostLoginUrl(router.url, '/');
  if (returnUrl === '/') {
    return router.createUrlTree(['/login']);
  }
  const queryParams: Record<string, string> = { returnUrl };
  if (isCreateListingReturnUrl(returnUrl) || router.url.split('?')[0] === CREATE_LISTING_PATH) {
    queryParams['role'] = 'landlord';
  }
  return router.createUrlTree(['/login'], { queryParams });
};
