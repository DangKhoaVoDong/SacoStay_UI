import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, interval, of, switchMap, startWith } from 'rxjs';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { FooterComponent } from '../../components/layout/footer.component';
import { LandlordLayoutComponent } from '../../components/layout/landlord/landlord-layout.component';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';
import { ChatHubService } from '../../services/chat-hub.service';
import { ChatUnreadService } from '../../services/chat-unread.service';
import { ChatPeerProfileService, isGenericChatLabel } from '../../services/chat-peer-profile.service';
import { loadStoredChatContacts, upsertStoredChatContact } from '../../utils/chat-contacts-storage';
import type {
  ChatConversation,
  ChatConversationSummary,
  ChatMessage,
  ChatParticipant
} from '../../models/chat.models';

export type ChatHostShell = 'tenant' | 'landlord';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent, LandlordLayoutComponent],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatService);
  private readonly chatHub = inject(ChatHubService);
  private readonly chatUnread = inject(ChatUnreadService);
  private readonly peerProfiles = inject(ChatPeerProfileService);
  private readonly route = inject(ActivatedRoute);

  conversations: ChatConversation[] = [];
  messages: ChatMessage[] = [];
  activeOtherUserId: string | null = null;
  messageText = '';
  listLoading = true;
  messagesLoading = false;
  sendLoading = false;
  listError = '';
  messagesError = '';
  sendError = '';
  hubReady = false;
  hubConnecting = false;

  currentUserId = '';
  hostShell: ChatHostShell = 'tenant';
  private pendingWith: string | null = null;
  private pendingName: string | null = null;
  private pendingAvatar: string | null = null;
  private pendingRole: string | null = null;

  get emptyListHint(): string {
    return this.hostShell === 'landlord'
      ? 'Mở từ Người xem tin hoặc khi người thuê nhắn cho bạn.'
      : 'Mở chat từ Tìm bạn hoặc chi tiết phòng trọ.';
  }

  get emptySelectHint(): string {
    return this.hostShell === 'landlord'
      ? 'Chọn người thuê bên trái hoặc mở từ trang Người xem tin.'
      : 'Chọn một cuộc trò chuyện để xem tin nhắn';
  }

  ngOnInit(): void {
    const shell = this.route.snapshot.data['shell'];
    this.hostShell = shell === 'landlord' ? 'landlord' : 'tenant';
    if (!this.authService.isLoggedIn) {
      return;
    }

    const profile = this.authService.getCurrentUser();
    if (profile) {
      this.peerProfiles.cacheFromAuthUser(profile);
    }

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.pendingWith = params.get('with');
      this.pendingName = params.get('name');
      this.pendingAvatar = params.get('avatar');
      this.pendingRole = params.get('role');
      if (this.pendingWith) {
        this.peerProfiles.seedFromHints(this.pendingWith, {
          displayName: this.pendingName ?? undefined,
          avatarUrl: this.pendingAvatar ?? undefined,
          role: this.pendingRole ?? undefined
        });
      }
      this.tryOpenPendingChat();
    });

    this.currentUserId = profile?.id ?? '';
    if (!this.currentUserId) {
      this.authService.refreshProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
        this.currentUserId = p?.id ?? '';
        if (p) this.peerProfiles.cacheFromAuthUser(p);
        this.chatUnread.bindOwnerFromSession();
        this.initChatSession();
      });
    } else {
      this.chatUnread.bindOwnerFromSession();
      this.initChatSession();
    }

    const unsubHub = this.chatHub.onIncomingMessage((senderId, text) =>
      this.handleIncomingMessage(senderId, text)
    );
    this.destroyRef.onDestroy(() => unsubHub());

    interval(20_000)
      .pipe(
        startWith(0),
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => (this.currentUserId ? this.chatService.getConversations() : of([])))
      )
      .subscribe((summaries) => {
        this.mergeServerConversations(summaries);
        this.cdr.detectChanges();
      });

    interval(12_000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => {
          if (!this.activeOtherUserId || !this.currentUserId) return of(null);
          return this.chatService.getHistory(this.activeOtherUserId, this.currentUserId);
        })
      )
      .subscribe({
        next: (msgs) => {
          if (msgs && this.activeOtherUserId) {
            this.messages = msgs;
            this.cdr.detectChanges();
          }
        }
      });
  }

  get activeConversation(): ChatConversation | undefined {
    if (!this.activeOtherUserId) return undefined;
    return this.conversations.find((c) => this.sameUserId(c.otherUser.id, this.activeOtherUserId!));
  }

  get activeOtherUser(): ChatParticipant | null {
    const conv = this.activeConversation;
    if (conv) return conv.otherUser;
    if (!this.activeOtherUserId) return null;
    const cached = this.peerProfiles.getCached(this.activeOtherUserId);
    if (cached) return cached;
    return {
      id: this.activeOtherUserId,
      displayName: this.peerProfiles.shortLabel(this.activeOtherUserId)
    };
  }

  get canSendMessage(): boolean {
    return !!this.activeOtherUserId && this.hubReady && !this.hubConnecting;
  }

  avatarUrl(user: ChatParticipant | null): string {
    if (!user) return this.chatService.avatarFallback('?');
    return user.avatarUrl || this.chatService.avatarFallback(user.displayName);
  }

  roleLabel(user: ChatParticipant | null): string {
    if (!user) return '';
    if (this.chatService.isLandlordRole(user.roles)) return 'Chủ trọ';
    if (this.hostShell === 'landlord') return 'Người thuê';
    return 'Người tìm trọ';
  }

  roleBadgeClass(user: ChatParticipant | null): string {
    if (!user) return 'bg-blue-100 text-blue-700';
    return this.chatService.isLandlordRole(user.roles)
      ? 'bg-orange-100 text-orange-700'
      : 'bg-blue-100 text-blue-700';
  }

  loadContactList(): void {
    this.listLoading = true;
    this.listError = '';
    this.conversations = this.buildContactsFromStorage();

    forkJoin({
      summaries: this.chatService.getConversations()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ summaries }) => {
          this.mergeServerConversations(summaries);
          const ids = this.conversations.map((c) => c.otherUser.id);
          if (!ids.length) {
            this.listLoading = false;
            this.tryOpenPendingChat();
            this.cdr.detectChanges();
            return;
          }

          forkJoin(ids.map((id) => this.peerProfiles.fetchPeer(id)))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (peers) => {
                for (const p of peers) {
                  this.applyPeerToConversation(p);
                }
                this.finishContactListLoad();
              },
              error: () => this.finishContactListLoad()
            });
        },
        error: () => {
          const ids = this.conversations.map((c) => c.otherUser.id);
          if (!ids.length) {
            this.finishContactListLoad();
            return;
          }
          forkJoin(ids.map((id) => this.peerProfiles.fetchPeer(id)))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (peers) => {
                for (const p of peers) {
                  this.applyPeerToConversation(p);
                }
                this.finishContactListLoad();
              },
              error: () => this.finishContactListLoad()
            });
        }
      });
  }

  private finishContactListLoad(): void {
    this.listLoading = false;
    if (
      !this.activeOtherUserId &&
      this.conversations.length > 0 &&
      !this.pendingWith &&
      this.hostShell !== 'landlord'
    ) {
      this.selectConversation(this.conversations[0].otherUser.id);
    }
    this.tryOpenPendingChat();
    this.cdr.detectChanges();
  }

  private mergeServerConversations(summaries: ChatConversationSummary[]): void {
    for (const s of summaries) {
      this.ensureConversationForUser(s.otherUserId);
      const conv = this.conversations.find((c) => this.sameUserId(c.otherUser.id, s.otherUserId));
      if (conv) {
        if (s.lastMessageText) conv.lastMessageText = s.lastMessageText;
        if (s.lastMessageAt) conv.lastMessageAt = s.lastMessageAt;
      }
    }
    this.conversations.sort((a, b) => {
      const ta = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
      const tb = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
      return tb - ta;
    });
  }

  private initChatSession(): void {
    this.loadContactList();
    this.connectChatHub();
  }

  private connectChatHub(): void {
    this.hubConnecting = true;
    this.hubReady = false;
    this.cdr.detectChanges();
    void this.chatHub
      .reconnect()
      .then(() => {
        this.hubReady = true;
        this.hubConnecting = false;
        this.cdr.detectChanges();
      })
      .catch(() => {
        this.hubReady = false;
        this.hubConnecting = false;
        this.cdr.detectChanges();
      });
  }

  private handleIncomingMessage(senderId: string, text: string): void {
    if (!this.currentUserId) return;

    if (this.sameUserId(senderId, this.currentUserId)) {
      if (this.activeOtherUserId) {
        this.loadMessages();
      }
      return;
    }

    this.ensureConversationForUser(senderId);
    this.refreshConversationPreview(senderId, text);

    if (this.activeOtherUserId && this.sameUserId(this.activeOtherUserId, senderId)) {
      this.messages = [
        ...this.messages,
        {
          senderId,
          text,
          sentAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          isMine: false
        }
      ];
      this.scrollMessagesToBottom();
    }
    this.cdr.detectChanges();
  }

  private refreshConversationPreview(otherUserId: string, lastText: string, sentAt?: string): void {
    const conv = this.conversations.find((c) => this.sameUserId(c.otherUser.id, otherUserId));
    if (conv) {
      conv.lastMessageText = lastText;
      conv.lastMessageAt = sentAt || new Date().toISOString();
    }
  }

  private sameUserId(a: string, b: string): boolean {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }

  selectConversation(otherUserId: string): void {
    if (!otherUserId || !this.currentUserId) return;
    this.activeOtherUserId = otherUserId.trim();
    this.chatUnread.setActivePeer(this.activeOtherUserId);
    this.messages = [];
    this.messagesError = '';

    const conv = this.conversations.find((c) => c.otherUser.id === otherUserId);
    const hints = conv
      ? {
          displayName: conv.otherUser.displayName,
          avatarUrl: conv.otherUser.avatarUrl,
          role: conv.otherUser.roles?.[0]
        }
      : undefined;

    this.peerProfiles
      .fetchPeer(otherUserId, hints)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((peer) => {
        this.applyPeerToConversation(peer);
        this.cdr.detectChanges();
      });

    this.loadMessages();
  }

  loadMessages(): void {
    if (!this.activeOtherUserId || !this.currentUserId) return;
    this.messagesLoading = true;
    this.messagesError = '';
    this.chatService
      .getHistory(this.activeOtherUserId, this.currentUserId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (msgs) => {
          this.messages = msgs;
          this.messagesLoading = false;
          if (msgs.length > 0) {
            const last = msgs[msgs.length - 1];
            this.refreshActiveConversationPreview(last.text, last.sentAt);
          }
          this.cdr.detectChanges();
          this.scrollMessagesToBottom();
        },
        error: () => {
          this.messagesLoading = false;
          this.messagesError = 'Không tải được tin nhắn. Kiểm tra kết nối API.';
          this.cdr.detectChanges();
        }
      });
  }

  handleSend(e: Event): void {
    e.preventDefault();
    const text = this.messageText.trim();
    if (!text || !this.activeOtherUserId || this.sendLoading) return;

    if (!this.canSendMessage) {
      this.sendError = this.hubConnecting
        ? 'Đang kết nối chat… Vui lòng thử lại sau vài giây.'
        : 'Chưa kết nối được máy chủ chat. Thử tải lại trang.';
      this.cdr.detectChanges();
      if (!this.hubConnecting && !this.hubReady) {
        this.connectChatHub();
      }
      return;
    }

    this.sendLoading = true;
    this.sendError = '';
    void this.chatHub
      .ensureConnected()
      .then(() => this.chatHub.sendPrivateMessage(this.activeOtherUserId!, text))
      .then(() => {
        this.messageText = '';
        this.sendLoading = false;
        this.sendError = '';
        this.hubReady = true;
        this.loadMessages();
        this.refreshActiveConversationPreview(text);
        this.cdr.detectChanges();
      })
      .catch((err: unknown) => {
        this.sendLoading = false;
        this.hubReady = false;
        const msg = err instanceof Error ? err.message : '';
        this.sendError =
          msg.includes('Chưa đăng nhập') || msg.includes('đăng nhập lại')
            ? msg || 'Vui lòng đăng nhập lại.'
            : 'Gửi tin nhắn thất bại. Kiểm tra API SignalR (/chatHub) và backend đang chạy.';
        this.cdr.detectChanges();
      });
  }

  private tryOpenPendingChat(): void {
    if (!this.pendingWith || !this.currentUserId) return;
    const withId = this.pendingWith;
    const name = this.pendingName ?? undefined;
    const avatar = this.pendingAvatar ?? undefined;
    const role = this.pendingRole ?? undefined;

    this.ensureConversationForUser(withId, name, role, avatar);

    this.peerProfiles
      .fetchPeer(withId, {
        displayName: name,
        avatarUrl: avatar,
        role
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((peer) => {
        this.applyPeerToConversation(peer);
        if (!this.activeOtherUserId || !this.sameUserId(this.activeOtherUserId, withId)) {
          this.selectConversation(withId);
        }
        this.cdr.detectChanges();
      });
  }

  private ensureConversationForUser(
    userId: string,
    displayName?: string,
    role?: string,
    avatarUrl?: string
  ): void {
    const hintName = displayName && !isGenericChatLabel(displayName) ? displayName : '';
    const name = hintName || this.peerProfiles.getCached(userId)?.displayName || this.peerProfiles.shortLabel(userId);
    const roles = role ? [role] : undefined;
    const avatar = avatarUrl || this.peerProfiles.getCached(userId)?.avatarUrl;

    if (this.currentUserId) {
      upsertStoredChatContact(this.currentUserId, {
        id: userId,
        displayName: name,
        avatarUrl: avatar,
        role
      });
    }

    const existing = this.conversations.find((c) => this.sameUserId(c.otherUser.id, userId));
    if (existing) {
      existing.otherUser.displayName = name;
      if (roles) existing.otherUser.roles = roles;
      if (avatar) existing.otherUser.avatarUrl = avatar;
      return;
    }

    this.conversations = [
      {
        id: userId,
        otherUser: { id: userId, displayName: name, avatarUrl: avatar, roles },
        lastMessageText: '—',
        unreadCount: 0
      },
      ...this.conversations
    ];
  }

  private applyPeerToConversation(peer: ChatParticipant): void {
    const conv = this.conversations.find((c) => c.otherUser.id === peer.id);
    if (conv) {
      conv.otherUser.displayName = peer.displayName;
      conv.otherUser.avatarUrl = peer.avatarUrl;
      if (peer.roles?.length) conv.otherUser.roles = peer.roles;
    }
    if (this.currentUserId) {
      upsertStoredChatContact(this.currentUserId, {
        id: peer.id,
        displayName: peer.displayName,
        avatarUrl: peer.avatarUrl,
        role: peer.roles?.[0]
      });
    }
  }

  private buildContactsFromStorage(): ChatConversation[] {
    if (!this.currentUserId) return [];
    return loadStoredChatContacts(this.currentUserId).map((c) => ({
      id: c.id,
      otherUser: {
        id: c.id,
        displayName: isGenericChatLabel(c.displayName) ? this.peerProfiles.shortLabel(c.id) : c.displayName,
        avatarUrl: c.avatarUrl,
        roles: c.role ? [c.role] : undefined
      },
      lastMessageText: '—',
      unreadCount: 0
    }));
  }

  private refreshActiveConversationPreview(lastText: string, sentAt?: string): void {
    if (!this.activeOtherUserId) return;
    this.refreshConversationPreview(this.activeOtherUserId, lastText, sentAt);
  }

  private scrollMessagesToBottom(): void {
    setTimeout(() => {
      const el = document.getElementById('chat-messages-scroll');
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }

  formatListTime(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  trackByIndex(index: number): number {
    return index;
  }
}
