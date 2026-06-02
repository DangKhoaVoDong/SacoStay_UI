import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith } from 'rxjs';
import { AuthService } from './auth.service';
import { ChatHubService, type NotificationIncomingHandler } from './chat-hub.service';
import { NotificationService } from './notification.service';
import type { AppNotification } from '../models/notification.models';
import { userIdFromUser } from '../utils/user-display';

@Injectable({ providedIn: 'root' })
export class NotificationCenterService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(NotificationService);
  private readonly hub = inject(ChatHubService);
  private readonly destroyRef = inject(DestroyRef);

  readonly unreadCount = signal(0);
  readonly items = signal<AppNotification[]>([]);
  readonly loading = signal(false);
  readonly panelOpen = signal(false);

  private ownerId = '';
  private hubUnsub: (() => void) | null = null;
  private pollStarted = false;

  bindFromSession(): void {
    const id = userIdFromUser(this.auth.getCurrentUser());
    if (!this.auth.isLoggedIn || !id) {
      this.reset();
      return;
    }

    const changed = id !== this.ownerId;
    this.ownerId = id;
    if (changed) {
      this.teardownHub();
      this.ensureHubListener();
    }
    this.refreshUnread();
    this.startPolling();
  }

  reset(): void {
    this.ownerId = '';
    this.pollStarted = false;
    this.teardownHub();
    this.unreadCount.set(0);
    this.items.set([]);
    this.panelOpen.set(false);
    this.loading.set(false);
  }

  openPanel(): void {
    this.panelOpen.set(true);
    this.loadList();
  }

  closePanel(): void {
    this.panelOpen.set(false);
  }

  togglePanel(): void {
    if (this.panelOpen()) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  refreshUnread(): void {
    if (!this.ownerId) return;
    this.api
      .getUnreadCount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((n) => this.unreadCount.set(n));
  }

  loadList(): void {
    if (!this.ownerId) return;
    this.loading.set(true);
    this.api
      .getList(1, 40)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.items.set(list);
          this.loading.set(false);
          this.refreshUnread();
        },
        error: () => this.loading.set(false)
      });
  }

  markAllRead(): void {
    this.api
      .markAllRead()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.items.update((list) => list.map((n) => ({ ...n, isRead: true })));
        this.unreadCount.set(0);
      });
  }

  onNotificationClick(n: AppNotification, navigate: () => void): void {
    if (!n.isRead) {
      this.api.markRead(n.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.items.update((list) =>
          list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x))
        );
        this.unreadCount.update((c) => Math.max(0, c - 1));
      });
    }
    this.closePanel();
    navigate();
  }

  private onRealtimeNotification(n: AppNotification): void {
    this.items.update((list) => {
      const filtered = list.filter((x) => x.id !== n.id);
      return [n, ...filtered].slice(0, 50);
    });
    if (!n.isRead) {
      this.unreadCount.update((c) => c + 1);
    }
  }

  private ensureHubListener(): void {
    if (this.hubUnsub || !this.ownerId) return;
    const handler: NotificationIncomingHandler = (dto) => this.onRealtimeNotification(dto);
    this.hubUnsub = this.hub.onReceiveNotification(handler);
    void this.hub.ensureConnected().catch(() => undefined);
  }

  private teardownHub(): void {
    this.hubUnsub?.();
    this.hubUnsub = null;
  }

  private startPolling(): void {
    if (this.pollStarted || !this.ownerId) return;
    this.pollStarted = true;
    interval(45_000)
      .pipe(startWith(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.ownerId) this.refreshUnread();
      });
  }
}
