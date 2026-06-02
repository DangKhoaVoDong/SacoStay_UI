import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { filter, interval } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { APP_CONSTANTS } from '../utils/constants';

const PING_SECONDS = 30;

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;

    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.pingIfLoggedIn());

    interval(PING_SECONDS * 1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.pingIfLoggedIn());

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.pingIfLoggedIn();
    });

    this.auth.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.pingIfLoggedIn());
    if (this.auth.isLoggedIn) this.pingIfLoggedIn();
  }

  private pingIfLoggedIn(): void {
    if (!localStorage.getItem(APP_CONSTANTS.TOKEN_KEY)) return;
    this.http
      .post(`${environment.apiUrl}/Activity/ping`, { seconds: PING_SECONDS })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }
}
