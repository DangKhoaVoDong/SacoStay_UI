import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { displayNameFromUser, normalizeAuthUser } from '../../utils/user-display';

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
    user: any = null;
    userRole = 'tenant';
    isPending = false;

    navLinks: NavLink[] = [
        { name: 'Tìm bạn', href: '/discovery', icon: 'search', roles: ['tenant'] },
        { name: 'Phòng trọ', href: '/rooms', icon: 'home', roles: ['tenant', 'landlord'] },
        { name: 'Bản đồ', href: '/map', icon: 'map', roles: ['tenant', 'landlord'] },
        { name: 'Tin nhắn', href: '/chat', icon: 'message', roles: ['tenant'] },
        { name: 'Bảng giá', href: '/tenant-pricing', icon: 'shield', roles: ['tenant'] },
    ];

    get visibleNavLinks(): NavLink[] {
        return this.navLinks.filter((link) => link.roles.includes(this.userRole));
    }

    constructor(private authService: AuthService, private router: Router) { }

    ngOnInit(): void {
        this.isLoggedIn = this.authService.isLoggedIn;
        const userStr = localStorage.getItem('user');
        if (userStr) {
            this.user = normalizeAuthUser(JSON.parse(userStr));
            localStorage.setItem('user', JSON.stringify(this.user));
        } else {
            this.user = null;
        }
        this.userRole = localStorage.getItem('user_role') || 'tenant';
        this.isPending = localStorage.getItem('landlord_upgrade_status') === 'pending';
    }

    get displayName(): string {
        return displayNameFromUser(this.user);
    }

    toggleMenu(): void {
        this.isOpen = !this.isOpen;
    }

    logout(): void {
        localStorage.removeItem('user');
        localStorage.removeItem('user_role');
        localStorage.removeItem('identity_verification_status');
        this.authService.logout();
        this.router.navigate(['/']);
    }

    isActive(path: string): boolean {
        return this.router.url === path;
    }
}
