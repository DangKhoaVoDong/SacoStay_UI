import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { isAdminUser, isLandlordUser } from '../../utils/user-display';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { FooterComponent } from '../../components/layout/footer.component';
import type { UserProfile } from '../../models/auth.models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  isLoggedIn = false;
  heroCtaLink = '/discovery';
  heroCtaLabel = 'Bắt đầu tìm bạn';

  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn;
    this.updateHeroCta(this.authService.getCurrentUser());

    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.isLoggedIn = this.authService.isLoggedIn;
        this.updateHeroCta(user);
      });

    if (!this.isLoggedIn) return;

    if (isAdminUser(this.authService.getCurrentUser())) {
      void this.router.navigateByUrl('/admin');
      return;
    }

    this.authService.refreshProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((profile) => {
      if (isAdminUser(profile)) {
        void this.router.navigateByUrl('/admin');
        return;
      }
      this.updateHeroCta(profile);
    });
  }

  private updateHeroCta(user: UserProfile | null): void {
    if (this.isLoggedIn && isLandlordUser(user)) {
      this.heroCtaLink = '/create-listing';
      this.heroCtaLabel = 'Đăng tin phòng';
      return;
    }
    this.heroCtaLink = '/discovery';
    this.heroCtaLabel = 'Bắt đầu tìm bạn';
  }
}
