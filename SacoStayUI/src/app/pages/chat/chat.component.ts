import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, interval, of, switchMap } from 'rxjs';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { FooterComponent } from '../../components/layout/footer.component';
import { LandlordLayoutComponent } from '../../components/layout/landlord/landlord-layout.component';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';
import { ChatHubService } from '../../services/chat-hub.service';
import { ChatPeerProfileService, isGenericChatLabel } from '../../services/chat-peer-profile.service';
import { loadStoredChatContacts, upsertStoredChatContact } from '../../utils/chat-contacts-storage';
import type { ChatConversation, ChatMessage, ChatParticipant } from '../../models/chat.models';

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
        this.loadContactList();
        this.cdr.detectChanges();
      });
    } else {
      this.loadContactList();
    }

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
    return this.conversations.find((c) => c.otherUser.id === this.activeOtherUserId);
  }

  get activeOtherUser(): ChatParticipant | null {
    return this.activeConversation?.otherUser ?? null;
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
        },
        error: () => {
          this.listLoading = false;
          this.tryOpenPendingChat();
          this.cdr.detectChanges();
        }
      });
  }

  selectConversation(otherUserId: string): void {
    if (!otherUserId || !this.currentUserId) return;
    this.activeOtherUserId = otherUserId;
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

    this.sendLoading = true;
    this.sendError = '';
    this.chatHub
      .sendPrivateMessage(this.activeOtherUserId, text)
      .then(() => {
        this.messageText = '';
        this.sendLoading = false;
        this.sendError = '';
        this.loadMessages();
        this.refreshActiveConversationPreview(text);
        this.cdr.detectChanges();
      })
      .catch((err: unknown) => {
        this.sendLoading = false;
        const msg = err instanceof Error ? err.message : '';
        this.sendError = msg.includes('Chưa đăng nhập')
          ? 'Vui lòng đăng nhập lại.'
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
        if (this.activeOtherUserId !== withId) {
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

    const existing = this.conversations.find((c) => c.otherUser.id === userId);
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
    const conv = this.conversations.find((c) => c.otherUser.id === this.activeOtherUserId);
    if (conv) {
      conv.lastMessageText = lastText;
      conv.lastMessageAt = sentAt || new Date().toISOString();
    }
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
