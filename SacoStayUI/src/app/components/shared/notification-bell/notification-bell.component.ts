import { Component, HostListener, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationCenterService } from '../../../services/notification-center.service';
import { navigateFromNotification } from '../../../utils/notification-navigation';
import type { AppNotification } from '../../../models/notification.models';
import { parseChatNotificationMessage } from '../../../utils/vietnam-districts';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.component.html'
})
export class NotificationBellComponent {
  @Input() variant: 'light' | 'dark' = 'light';
  @Input() isLandlord = false;
  /** Sidebar chủ trọ hẹp — mở panel sang vùng nội dung chính. */
  @Input() panelPlacement: 'below' | 'beside-right' = 'below';

  private readonly center = inject(NotificationCenterService);
  private readonly router = inject(Router);

  readonly unread = this.center.unreadCount;
  readonly items = this.center.items;
  readonly loading = this.center.loading;
  readonly open = this.center.panelOpen;

  private ignoreNextDocumentClick = false;

  toggle(): void {
    if (this.open()) {
      this.center.closePanel();
      return;
    }
    this.ignoreNextDocumentClick = true;
    this.center.openPanel();
  }

  markAllRead(event: Event): void {
    event.stopPropagation();
    this.center.markAllRead();
  }

  onItemClick(n: AppNotification, event: Event): void {
    event.stopPropagation();
    this.center.onNotificationClick(n, () => navigateFromNotification(this.router, n, this.isLandlord));
  }

  notificationBody(n: AppNotification): string {
    if (n.type === 'chat') {
      const { senderName, preview } = parseChatNotificationMessage(n.message);
      if (senderName && preview) {
        return `${senderName}\n${preview}`;
      }
      return preview || n.message;
    }
    return n.message;
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60_000) return 'Vừa xong';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ`;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.ignoreNextDocumentClick) {
      this.ignoreNextDocumentClick = false;
      return;
    }
    if (this.open()) {
      this.center.closePanel();
    }
  }
}
