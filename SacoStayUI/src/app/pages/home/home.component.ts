import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { isAdminUser } from '../../utils/user-display';
import { landlordPostListingQueryParams } from '../../utils/auth-navigation';
import { FAQ_ITEMS } from '../../data/faq.data';
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
  isLoggedIn = false;
  readonly landlordCtaQueryParams = landlordPostListingQueryParams();
  readonly faqItems = FAQ_ITEMS;
  expandedFaqId: string | null = null;

  get landlordCtaLink(): string {
    return this.isLoggedIn ? '/landlord-profile' : '/login';
  }

  toggleFaq(id: string): void {
    this.expandedFaqId = this.expandedFaqId === id ? null : id;
  }

  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.has('logout')) {
      void this.router.navigate(['/'], { replaceUrl: true });
    }

    this.isLoggedIn = this.authService.isLoggedIn;

    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isLoggedIn = this.authService.isLoggedIn;
      });

    if (!this.isLoggedIn) return;

    if (isAdminUser(this.authService.getCurrentUser())) {
      void this.router.navigateByUrl('/admin');
      return;
    }

    this.authService.refreshProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((profile) => {
      if (isAdminUser(profile)) {
        void this.router.navigateByUrl('/admin');
      }
    });
  }
}
