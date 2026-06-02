import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, interval, startWith } from 'rxjs';
import { AuthService } from './auth.service';
import { ChatHubService } from './chat-hub.service';
import { ChatService } from './chat.service';
import {
  loadLastSeenMap,
  loadUnreadCounts,
  markLastSeen,
  saveUnreadCounts
} from '../utils/chat-unread-storage';
import { userIdFromUser } from '../utils/user-display';

function normId(id: string): string {
  return id.trim().toLowerCase();
}

@Injectable({ providedIn: 'root' })
export class ChatUnreadService {
  private readonly auth = inject(AuthService);
  private readonly hub = inject(ChatHubService);
  private readonly chat = inject(ChatService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly totalUnread = signal(0);

  private ownerId = '';
  private counts: Record<string, number> = {};
  private lastSeen: Record<string, string> = {};
  private activePeerId: string | null = null;
  private hubUnsub: (() => void) | null = null;
  private pollStarted = false;

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.syncChatRouteContext();
    });
    this.auth.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.bindOwnerFromSession());
    if (this.auth.isLoggedIn) {
      this.bindOwnerFromSession();
    }
  }

  bindOwnerFromSession(): void {
    const id = userIdFromUser(this.auth.getCurrentUser());
    if (!this.auth.isLoggedIn || !id) {
      this.ownerId = '';
      this.teardownHubListener();
      this.hub.disconnect();
      this.totalUnread.set(0);
      return;
    }

    const ownerChanged = id !== this.ownerId;
    this.ownerId = id;
    this.counts = loadUnreadCounts(this.ownerId);
    this.lastSeen = loadLastSeenMap(this.ownerId);
    this.publishTotal();

    if (ownerChanged) {
      this.teardownHubListener();
    }
    this.ensureHubListener();
    this.startPolling();
  }

  setActivePeer(otherUserId: string | null): void {
    this.activePeerId = otherUserId ? normId(otherUserId) : null;
    if (this.activePeerId && this.ownerId) {
      markLastSeen(this.ownerId, this.activePeerId);
      this.lastSeen[this.activePeerId] = new Date().toISOString();
      this.markConversationRead(this.activePeerId);
    }
  }

  notifyIncomingMessage(senderId: string): void {
    if (!this.ownerId) this.bindOwnerFromSession();
    if (!this.ownerId) return;

    const sid = normId(senderId);
    if (!sid || sid === normId(this.ownerId)) return;

    const onChatWithSender =
      this.isOnChatRoute() && this.activePeerId !== null && this.activePeerId === sid;
    if (onChatWithSender) return;

    this.counts[sid] = (this.counts[sid] ?? 0) + 1;
    this.persist();
  }

  markConversationRead(otherUserId: string): void {
    if (!this.ownerId || !otherUserId) return;
    const key = normId(otherUserId);
    if (!this.counts[key]) return;
    delete this.counts[key];
    this.persist();
  }

  private startPolling(): void {
    if (this.pollStarted || !this.ownerId) return;
    this.pollStarted = true;

    interval(15_000)
      .pipe(startWith(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.ownerId || !this.auth.isLoggedIn) return;
        this.chat.getConversations().subscribe({
          next: (list) => this.syncUnreadFromConversations(list),
          error: () => undefined
        });
      });
  }

  private syncUnreadFromConversations(
    list: { otherUserId: string; lastMessageAt?: string; lastSenderId?: string }[]
  ): void {
    if (!this.ownerId) return;
    const me = normId(this.ownerId);
    let changed = false;

    for (const c of list) {
      const peer = normId(c.otherUserId);
      const sender = c.lastSenderId ? normId(c.lastSenderId) : '';
      if (!peer || !sender || sender === me) continue;

      const onChatWithSender =
        this.isOnChatRoute() && this.activePeerId !== null && this.activePeerId === peer;
      if (onChatWithSender) continue;

      const lastAt = c.lastMessageAt ? Date.parse(c.lastMessageAt) : 0;
      const seenAt = this.lastSeen[peer] ? Date.parse(this.lastSeen[peer]) : 0;
      if (lastAt && (!seenAt || lastAt > seenAt)) {
        if ((this.counts[peer] ?? 0) < 1) {
          this.counts[peer] = 1;
          changed = true;
        }
      }
    }

    if (changed) this.persist();
    else this.publishTotal();
  }

  private ensureHubListener(): void {
    if (!this.ownerId) return;
    void this.hub.reconnect().catch(() => undefined);
    if (!this.hubUnsub) {
      this.hubUnsub = this.hub.onIncomingMessage((senderId) => this.notifyIncomingMessage(senderId));
    }
  }

  private teardownHubListener(): void {
    this.hubUnsub?.();
    this.hubUnsub = null;
  }

  private isOnChatRoute(): boolean {
    const url = this.router.url.split('?')[0];
    return url === '/chat' || url.startsWith('/chat/') || url === '/landlord-chat' || url.startsWith('/landlord-chat/');
  }

  private syncChatRouteContext(): void {
    if (!this.isOnChatRoute()) {
      this.activePeerId = null;
    }
  }

  private persist(): void {
    saveUnreadCounts(this.ownerId, this.counts);
    this.publishTotal();
  }

  private publishTotal(): void {
    const total = Object.values(this.counts).reduce((sum, n) => sum + n, 0);
    this.totalUnread.set(total);
  }
}
