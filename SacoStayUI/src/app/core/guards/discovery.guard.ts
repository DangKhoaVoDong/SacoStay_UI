import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { isAdminUser, isLandlordUser } from '../../utils/user-display';
import { isVerifiedUser } from '../../utils/lifestyle-display';

const DISCOVERY_RETURN = '/discovery';

/** Discovery: guest demo; tenant đã đăng nhập bắt buộc eKYC (isVerified) trước khi tìm bạn. */
export const discoveryGuard: CanActivateFn = () => {
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

  if (isVerifiedUser(user as unknown as Record<string, unknown>)) {
    return true;
  }

  return auth.refreshProfile().pipe(
    map((profile) => {
      if (isVerifiedUser(profile as unknown as Record<string, unknown>)) {
        return true;
      }
      return router.createUrlTree(['/identity-verification'], {
        queryParams: { returnUrl: DISCOVERY_RETURN }
      });
    }),
    catchError(() =>
      of(
        router.createUrlTree(['/identity-verification'], {
          queryParams: { returnUrl: DISCOVERY_RETURN }
        })
      )
    )
  );
};
