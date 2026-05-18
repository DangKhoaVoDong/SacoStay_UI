import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { interval, switchMap, of } from 'rxjs';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { FooterComponent } from '../../components/layout/footer.component';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';
import type { ChatConversation, ChatMessage, ChatParticipant } from '../../models/chat.models';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatService);
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

  ngOnInit(): void {
    const profile = this.authService.getCurrentUser();
    this.currentUserId = profile?.id ?? '';
    if (!this.authService.isLoggedIn) {
      return;
    }

    if (!this.currentUserId) {
      this.authService.refreshProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
        this.currentUserId = p?.id ?? '';
        this.loadConversations();
        this.cdr.detectChanges();
      });
    } else {
      this.loadConversations();
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

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const withId = params.get('with');
      if (withId) {
        this.ensureConversationForUser(withId, params.get('name') ?? undefined);
        this.selectConversation(withId);
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
    return this.chatService.isLandlordRole(user) ? 'Chủ trọ' : 'Người tìm trọ';
  }

  roleBadgeClass(user: ChatParticipant | null): string {
    if (!user) return 'bg-blue-100 text-blue-700';
    return this.chatService.isLandlordRole(user)
      ? 'bg-orange-100 text-orange-700'
      : 'bg-blue-100 text-blue-700';
  }

  loadConversations(): void {
    this.listLoading = true;
    this.listError = '';
    this.chatService
      .getConversations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.conversations = list;
          this.listLoading = false;
          if (!this.activeOtherUserId && list.length > 0) {
            this.selectConversation(list[0].otherUser.id);
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.listLoading = false;
          this.listError = 'Không tải được danh sách hội thoại.';
          this.cdr.detectChanges();
        }
      });
  }

  selectConversation(otherUserId: string): void {
    if (!otherUserId || !this.currentUserId) return;
    this.activeOtherUserId = otherUserId;
    this.messages = [];
    this.messagesError = '';
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
    this.chatService
      .sendMessage({ otherUserId: this.activeOtherUserId, content: text })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messageText = '';
          this.sendLoading = false;
          this.sendError = '';
          this.loadMessages();
          this.loadConversations();
          this.cdr.detectChanges();
        },
        error: (err: { status?: number }) => {
          this.sendLoading = false;
          this.sendError =
            err?.status === 404
              ? 'API gửi tin chưa khả dụng trên server (POST /api/Chat/send).'
              : 'Gửi tin nhắn thất bại.';
          this.cdr.detectChanges();
        }
      });
  }

  private ensureConversationForUser(userId: string, displayName?: string): void {
    if (this.conversations.some((c) => c.otherUser.id === userId)) return;
    this.conversations = [
      {
        id: userId,
        otherUser: { id: userId, displayName: displayName || 'Người dùng' },
        lastMessageText: '—',
        unreadCount: 0
      },
      ...this.conversations
    ];
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
