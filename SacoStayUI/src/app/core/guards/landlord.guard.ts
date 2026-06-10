import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UiToastService } from '../../services/ui-toast.service';
import { landlordPostListingQueryParams } from '../../utils/auth-navigation';
import { isLandlordUser } from '../../utils/user-display';

export const landlordGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(UiToastService);
  if (auth.isLoggedIn && isLandlordUser(auth.getCurrentUser())) {
    return true;
  }
  if (auth.isLoggedIn) {
    toast.error('Chỉ có thể đăng tin với vai trò chủ trọ.');
    return router.createUrlTree(['/']);
  }
  return router.createUrlTree(['/login'], { queryParams: landlordPostListingQueryParams() });
};
