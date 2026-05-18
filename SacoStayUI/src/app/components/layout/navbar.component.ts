import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService, SESSION_PENDING_ROLE_KEY } from '../../services/auth.service';
import { isAdminUser, navProfileLabel, profileAvatarFromRaw } from '../../utils/user-display';
import { resolveMediaUrl } from '../../utils/media-url';
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
    imports: [CommonModule, RouterLink],
    templateUrl: './navbar.component.html'
})
export class NavbarComponent implements OnInit {
    isOpen = false;
    isLoggedIn = false;
    user: UserProfile | null = null;
    userRole = 'tenant';
    isPending = false;

    private readonly destroyRef = inject(DestroyRef);
    private readonly cdr = inject(ChangeDetectorRef);

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
            this.authService.refreshProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
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

    toggleMenu(): void {
        this.isOpen = !this.isOpen;
    }

    logout(): void {
        this.authService.logout();
    }

    isActive(path: string): boolean {
        return this.router.url === path;
    }
}
