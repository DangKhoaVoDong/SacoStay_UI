import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { isAdminUser } from '../../utils/user-display';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn && isAdminUser(auth.getCurrentUser())) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
