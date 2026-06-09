import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { isAdminUser, isLandlordUser } from '../../utils/user-display';

/** Discovery: guest được dùng thử; đã đăng nhập thì chặn admin / chủ trọ. */
export const tenantGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn) {
    return true;
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
