import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../services/auth.service';
import { ChatUnreadService } from '../../../services/chat-unread.service';
import { NotificationCenterService } from '../../../services/notification-center.service';
import { NotificationBellComponent } from '../../shared/notification-bell/notification-bell.component';
import { navProfileLabel, profileAvatarFromRaw } from '../../../utils/user-display';
import { resolveMediaUrl } from '../../../utils/media-url';
import type { UserProfile } from '../../../models/auth.models';

interface LandlordNavItem {
  name: string;
  href: string;
  icon: 'profile' | 'post' | 'list' | 'pricing' | 'chat' | 'views';
}

@Component({
  selector: 'app-landlord-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, NotificationBellComponent],
  templateUrl: './landlord-sidebar.component.html'
})
export class LandlordSidebarComponent implements OnInit {
  user: UserProfile | null = null;

  readonly navItems: LandlordNavItem[] = [
    { name: 'Hồ sơ Chủ trọ', href: '/landlord-profile', icon: 'profile' },
    { name: 'Đăng tin', href: '/create-listing', icon: 'post' },
    { name: 'Tin đã đăng', href: '/my-listings', icon: 'list' },
    { name: 'Bảng giá', href: '/landlord-pricing', icon: 'pricing' },
    { name: 'Tin nhắn', href: '/landlord-chat', icon: 'chat' },
    { name: 'Lượt xem tin', href: '/listing-viewers', icon: 'views' }
  ];

  private readonly auth = inject(AuthService);
  private readonly chatUnreadSvc = inject(ChatUnreadService);
  private readonly notificationCenter = inject(NotificationCenterService);
  readonly chatUnread = this.chatUnreadSvc.totalUnread;
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.auth.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((u) => {
      this.user = u;
      this.chatUnreadSvc.bindOwnerFromSession();
      this.notificationCenter.bindFromSession();
      this.cdr.detectChanges();
    });
    this.chatUnreadSvc.bindOwnerFromSession();
    this.notificationCenter.bindFromSession();
  }

  get profileLabel(): string {
    return navProfileLabel(this.user);
  }

  get avatarUrl(): string {
    const raw = profileAvatarFromRaw(this.user);
    if (raw) return resolveMediaUrl(raw);
    return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(this.profileLabel);
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  logout(): void {
    this.auth.logout({ exitLandlordShell: true });
  }
}
