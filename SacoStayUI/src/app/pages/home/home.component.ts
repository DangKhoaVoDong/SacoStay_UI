import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { displayNameFromUser, normalizeAuthUser } from '../../utils/user-display';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { FooterComponent } from '../../components/layout/footer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  user: any = null;
  userEmail = '';
  currentDate: string = '';
  isLoggedIn = false;

  constructor(private router: Router, private authService: AuthService) { }

  ngOnInit(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.user = normalizeAuthUser(JSON.parse(userStr));
      localStorage.setItem('user', JSON.stringify(this.user));
    } else {
      this.user = null;
    }
    this.userEmail = this.user?.email || this.user?.name || 'user@example.com';
    this.currentDate = new Date().toLocaleDateString('vi-VN');
    this.isLoggedIn = this.authService.isLoggedIn;
  }

  get displayName(): string {
    return displayNameFromUser(this.user);
  }

  /** Họ tên hiển thị phụ (không thay userName làm lời chào chính). */
  get fullNameLabel(): string {
    if (!this.user || typeof this.user !== 'object') return '';
    const u = this.user as Record<string, unknown>;
    const fn = String(u['firstName'] ?? '').trim();
    const ln = String(u['lastName'] ?? '').trim();
    return [fn, ln].filter(Boolean).join(' ').trim();
  }

  get avatarFallbackUrl(): string {
    return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(this.displayName);
  }

  logout(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('identity_verification_status');
    this.authService.logout();
  }

  navigateToProfileSetup(): void {
    this.router.navigate(['/profile-setup']);
  }
}
