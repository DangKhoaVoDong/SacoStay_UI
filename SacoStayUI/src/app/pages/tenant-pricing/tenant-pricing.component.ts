import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { FooterComponent } from '../../components/layout/footer.component';
import {
  clearLegacyTenantPremiumKey,
  isTenantPremium,
  setTenantPremium,
  userIdFromUser
} from '../../utils/user-display';
import { AuthService, getApiErrorMessage } from '../../services/auth.service';
import { LifestyleService } from '../../services/lifestyle.service';
import { PaymentService } from '../../services/payment.service';

type FeatureRow = {
  name: string;
  freemium: boolean | string;
  premium: boolean | string;
};

@Component({
  selector: 'app-tenant-pricing',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './tenant-pricing.component.html'
})
export class TenantPricingComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly lifestyle = inject(LifestyleService);
  private readonly payment = inject(PaymentService);
  private readonly destroyRef = inject(DestroyRef);

  isLoggedIn = false;
  isPremium = false;
  loadingPremium = true;
  paying = false;
  payError = '';

  readonly features: FeatureRow[] = [
    { name: 'Lượt matching', freemium: 'Free 5 lượt/tuần', premium: 'Không giới hạn' },
    { name: 'Xem danh sách phòng trọ', freemium: true, premium: true },
    { name: 'Bộ lọc cơ bản', freemium: true, premium: true },
    { name: 'Xem điểm tương thích tổng quát', freemium: true, premium: true },
    { name: 'Xem điểm tương thích chi tiết', freemium: false, premium: true },
    { name: 'Hiển thị chi tiết hồ sơ', freemium: false, premium: true },
    { name: 'Nhắn tin trực tiếp với người thuê trọ khác', freemium: false, premium: true }
  ];

  readonly benefits = [
    { icon: '🎯', title: 'Tìm nhanh hơn', desc: 'Ưu tiên hiển thị người phù hợp nhất' },
    { icon: '💡', title: 'Hiểu rõ hơn', desc: 'Xem chi tiết lối sống và tính cách' },
    { icon: '⚡', title: 'Không giới hạn', desc: 'Swipe không giới hạn mỗi tuần' }
  ];

  ngOnInit(): void {
    clearLegacyTenantPremiumKey();
    this.isLoggedIn = this.auth.isLoggedIn;
    this.auth.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isLoggedIn = this.auth.isLoggedIn;
        this.loadPremiumStatus();
      });

    if (this.auth.isLoggedIn) {
      this.auth
        .refreshProfile()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.loadPremiumStatus());
    } else {
      this.loadPremiumStatus();
    }
  }

  private loadPremiumStatus(): void {
    const userId = userIdFromUser(this.auth.getCurrentUser());
    if (!this.auth.isLoggedIn || !userId) {
      this.isPremium = false;
      this.loadingPremium = false;
      this.cdr.detectChanges();
      return;
    }

    this.isPremium = isTenantPremium(userId);
    this.loadingPremium = true;
    this.cdr.detectChanges();

    this.lifestyle
      .getSwipeQuota()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (quota) => {
          this.isPremium = quota.isPremium;
          setTenantPremium(quota.isPremium, userId);
          this.loadingPremium = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingPremium = false;
          this.cdr.detectChanges();
        }
      });
  }

  handleUpgrade(): void {
    if (!this.auth.isLoggedIn) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/tenant-pricing' } });
      return;
    }

    this.payError = '';
    this.paying = true;
    this.payment
      .buyTenantPremium()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (url) => {
          this.paying = false;
          if (!url) {
            this.payError = 'Không nhận được link VNPay.';
            this.cdr.detectChanges();
            return;
          }
          this.payment.goToVnPay(url);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.paying = false;
          const msg = getApiErrorMessage(err) || (err instanceof Error ? err.message : '');
          this.payError =
            msg ||
            'Không tạo được link thanh toán. Backend hiện chỉ hỗ trợ POST /api/Payment/buy-package (gói chủ trọ).';
          this.cdr.detectChanges();
        }
      });
  }

  isBool(v: boolean | string): v is boolean {
    return typeof v === 'boolean';
  }
}
