import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { UiToastService } from '../../services/ui-toast.service';
import { landlordPostListingQueryParams, sanitizeReturnUrl } from '../../utils/auth-navigation';
import { isLandlordUser } from '../../utils/user-display';
import { isVerifiedUser } from '../../utils/lifestyle-display';

const DEFAULT_LANDLORD_RETURN = '/landlord-profile';

/** Kênh chủ trọ: yêu cầu vai trò landlord + eKYC (isVerified) khi đã đăng nhập. */
export const landlordGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(UiToastService);

  if (!auth.isLoggedIn) {
    return router.createUrlTree(['/login'], { queryParams: landlordPostListingQueryParams() });
  }

  if (!isLandlordUser(auth.getCurrentUser())) {
    toast.error('Chỉ có thể đăng tin với vai trò chủ trọ.');
    return router.createUrlTree(['/']);
  }

  const returnUrl = sanitizeReturnUrl(state.url) ?? DEFAULT_LANDLORD_RETURN;
  const user = auth.getCurrentUser();

  if (isVerifiedUser(user as unknown as Record<string, unknown>)) {
    return true;
  }

  return auth.refreshProfile().pipe(
    map((profile) => {
      if (isVerifiedUser(profile as unknown as Record<string, unknown>)) {
        return true;
      }
      return router.createUrlTree(['/identity-verification'], {
        queryParams: { returnUrl }
      });
    }),
    catchError(() =>
      of(
        router.createUrlTree(['/identity-verification'], {
          queryParams: { returnUrl }
        })
      )
    )
  );
};
