import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService, SESSION_PENDING_ROLE_KEY } from '../../services/auth.service';
import { ChatUnreadService } from '../../services/chat-unread.service';
import { NotificationCenterService } from '../../services/notification-center.service';
import { NotificationBellComponent } from '../shared/notification-bell/notification-bell.component';
import {
    hasBasicProfileFilled,
    isAdminUser,
    navProfileLabel,
    profileAvatarFromRaw
} from '../../utils/user-display';
import { landlordPostListingQueryParams, isTenantAuthPath } from '../../utils/auth-navigation';
import { resolveMediaUrl } from '../../utils/media-url';
import { SACOSTAY_LOGO_CLASS, SACOSTAY_LOGO_URL } from '../../utils/brand-assets';
import type { UserProfile } from '../../models/auth.models';

interface NavLink {
    name: string;
    href: string;
    roles: string[];
    icon: string;
}

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [CommonModule, RouterLink, NotificationBellComponent],
    templateUrl: './navbar.component.html'
})
export class NavbarComponent implements OnInit {
    readonly logoUrl = SACOSTAY_LOGO_URL;
    readonly logoClass = SACOSTAY_LOGO_CLASS;
    isOpen = false;
    isLoggedIn = false;
    user: UserProfile | null = null;
    userRole = 'tenant';
    isPending = false;

    private readonly destroyRef = inject(DestroyRef);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly chatUnreadSvc = inject(ChatUnreadService);
    private readonly notificationCenter = inject(NotificationCenterService);
    readonly chatUnread = this.chatUnreadSvc.totalUnread;

    navLinks: NavLink[] = [
        { name: 'Tìm bạn', href: '/discovery', icon: 'search', roles: ['tenant'] },
        { name: 'Phòng trọ', href: '/rooms', icon: 'home', roles: ['tenant', 'landlord'] },
        { name: 'Bản đồ', href: '/map', icon: 'map', roles: ['tenant', 'landlord'] },
        { name: 'Tin nhắn', href: '/chat', icon: 'message', roles: ['tenant'] },
        { name: 'Bảng giá', href: '/tenant-pricing', icon: 'shield', roles: ['tenant'] },
        { name: 'Quản trị', href: '/admin', icon: 'shield', roles: ['admin'] },
    ];

    get visibleNavLinks(): NavLink[] {
        return this.navLinks.filter((link) => link.roles.includes(this.userRole));
    }

    constructor(private authService: AuthService, private router: Router) { }

    ngOnInit(): void {
        this.authService.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((u) => {
            this.user = u;
            this.isLoggedIn = this.authService.isLoggedIn;
            this.userRole = this.resolveUserRole(u);
            this.cdr.detectChanges();
        });
        if (this.authService.isLoggedIn) {
            this.chatUnreadSvc.bindOwnerFromSession();
            this.notificationCenter.bindFromSession();
            this.authService.refreshProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
                this.chatUnreadSvc.bindOwnerFromSession();
                this.notificationCenter.bindFromSession();
                this.cdr.detectChanges();
            });
        }
        this.isPending = localStorage.getItem('landlord_upgrade_status') === 'pending';
    }

    private resolveUserRole(u: UserProfile | null): string {
        if (isAdminUser(u)) return 'admin';
        const roles = u?.roles;
        if (Array.isArray(roles) && roles.length) {
            const lower = roles.map((r) => String(r).toLowerCase());
            if (lower.some((r) => r.includes('landlord'))) {
                return 'landlord';
            }
            return 'tenant';
        }
        return sessionStorage.getItem(SESSION_PENDING_ROLE_KEY) || 'tenant';
    }

    get isAdmin(): boolean {
        return this.userRole === 'admin';
    }

    get profileLabel(): string {
        return navProfileLabel(this.user);
    }

    get avatarFallbackUrl(): string {
        return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(this.profileLabel);
    }

    get avatarUrl(): string {
        const raw = profileAvatarFromRaw(this.user);
        return raw ? resolveMediaUrl(raw) : this.avatarFallbackUrl;
    }

    /** Admin: profile-setup → profile. Quiz chỉ khi user tự chọn "Thay đổi lối sống" trong profile. */
    get profileLink(): string[] {
        if (!hasBasicProfileFilled(this.user)) {
            return ['/profile-setup'];
        }
        return ['/profile', 'me'];
    }

    get profileLinkQueryParams(): Record<string, string> {
        return {};
    }

    toggleMenu(): void {
        this.isOpen = !this.isOpen;
    }

    logout(): void {
        this.authService.logout();
    }

    isActive(path: string): boolean {
        return this.router.url === path;
    }

    navHref(link: NavLink): string {
        if (!this.isLoggedIn && isTenantAuthPath(link.href)) {
            return '/login';
        }
        return link.href;
    }

    navQueryParams(link: NavLink): Record<string, string> | null {
        if (!this.isLoggedIn && isTenantAuthPath(link.href)) {
            return { returnUrl: link.href };
        }
        return null;
    }

    readonly postListingAuthParams = landlordPostListingQueryParams();

    /** Guest: chỉ trang chủ. Chủ trọ: giao diện ngoài (navbar). Ẩn với người thuê trọ. */
    get showPostListingBtn(): boolean {
        if (this.isAdmin) return false;
        if (this.isLoggedIn && this.userRole === 'tenant') return false;
        if (!this.isLoggedIn) {
            const path = this.router.url.split('?')[0];
            return path === '/';
        }
        return this.userRole === 'landlord';
    }

    onPostListingClick(): void {
        if (!this.showPostListingBtn) return;

        if (!this.isLoggedIn) {
            void this.router.navigate(['/login'], { queryParams: this.postListingAuthParams });
            return;
        }

        void this.router.navigateByUrl('/landlord-profile');
    }
}
