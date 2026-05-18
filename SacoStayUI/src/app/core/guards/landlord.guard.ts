import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { isLandlordUser } from '../../utils/user-display';

export const landlordGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn && isLandlordUser(auth.getCurrentUser())) {
    return true;
  }
  return router.createUrlTree(['/']);
};
