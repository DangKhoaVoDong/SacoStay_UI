import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { LifestyleService } from './lifestyle.service';
import { AuthService } from './auth.service';
import { setLifestyleQuizCompleted } from '../utils/lifestyle-storage';
import {
  clearGuestDiscoverySession,
  consumeGuestRegisterReturnUrl,
  getGuestDiscoverySession,
  shouldSyncGuestAfterRegister
} from '../utils/guest-discovery.storage';
import { userIdFromUser } from '../utils/user-display';
import { resolvePostLoginUrl } from '../utils/auth-navigation';

@Injectable({ providedIn: 'root' })
export class GuestDiscoverySyncService {
  private readonly lifestyle = inject(LifestyleService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Sau đăng ký + OTP: đẩy quiz/swipe tạm lên DB rồi quay lại discovery (hoặc returnUrl). */
  syncAfterRegisterAndNavigate(fallbackReturnUrl = '/discovery'): void {
    if (!shouldSyncGuestAfterRegister()) {
      void this.router.navigateByUrl(resolvePostLoginUrl(fallbackReturnUrl, '/'));
      return;
    }

    const returnUrl = consumeGuestRegisterReturnUrl();
    const session = getGuestDiscoverySession();
    const uid = userIdFromUser(this.auth.getCurrentUser());

    const submit$ =
      session.quizCompleted && session.selectedOptionIds.length
        ? this.lifestyle.submitAnswers(session.selectedOptionIds).pipe(catchError(() => of(null)))
        : of(null);

    submit$.pipe(
      switchMap(() => {
        if (!session.swipes.length) return of(null);
        return forkJoin(
          session.swipes.map((s) =>
            this.lifestyle.swipeUser(s.userId, s.isLike).pipe(catchError(() => of(null)))
          )
        ).pipe(map(() => null));
      })
    ).subscribe({
      next: () => {
        if (uid) setLifestyleQuizCompleted(uid);
        clearGuestDiscoverySession();

        void this.router.navigateByUrl(resolvePostLoginUrl(returnUrl, '/discovery'));
      },
      error: () => {
        clearGuestDiscoverySession();
        void this.router.navigateByUrl(resolvePostLoginUrl(returnUrl, '/discovery'));
      }
    });
  }
}
