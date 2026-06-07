import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { resolvePostLoginUrl } from '../../utils/auth-navigation';
import { isAdminUser, isLandlordUser } from '../../utils/user-display';

/** Discovery chỉ dành cho người thuê trọ — không phải admin / chủ trọ. */
export const tenantGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn) {
    const returnUrl = resolvePostLoginUrl(router.url, '/discovery');
    return router.createUrlTree(['/login'], { queryParams: { returnUrl } });
  }
  const user = auth.getCurrentUser();
  if (isAdminUser(user)) {
    return router.createUrlTree(['/admin']);
  }
  if (isLandlordUser(user)) {
    return router.createUrlTree(['/landlord-profile']);
  }
  return true;
};
