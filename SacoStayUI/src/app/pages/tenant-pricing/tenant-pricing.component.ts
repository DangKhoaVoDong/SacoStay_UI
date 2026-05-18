import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { FooterComponent } from '../../components/layout/footer.component';
import { isTenantPremium } from '../../utils/user-display';
import { PaymentService } from '../../services/payment.service';
import { getApiErrorMessage } from '../../services/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly payment = inject(PaymentService);
  private readonly destroyRef = inject(DestroyRef);

  isPremium = false;
  paying = false;
  payError = '';

  readonly features: FeatureRow[] = [
    { name: 'Lượt matching', freemium: 'Free 5 lượt/tuần', premium: 'Không giới hạn' },
    { name: 'Xem danh sách phòng trọ', freemium: true, premium: true },
    { name: 'Bộ lọc cơ bản', freemium: true, premium: true },
    { name: 'Xem điểm tương thích tổng quát', freemium: true, premium: true },
    { name: 'Xem điểm tương thích chi tiết', freemium: false, premium: true },
    { name: 'Ưu tiên hiển thị hồ sơ', freemium: false, premium: true },
    { name: 'Ưu tiên hiển thị phòng phù hợp', freemium: false, premium: true }
  ];

  readonly benefits = [
    { icon: '🎯', title: 'Tìm nhanh hơn', desc: 'Ưu tiên hiển thị người phù hợp nhất' },
    { icon: '💡', title: 'Hiểu rõ hơn', desc: 'Xem chi tiết lối sống và tính cách' },
    { icon: '⚡', title: 'Không giới hạn', desc: 'Swipe không giới hạn mỗi tuần' }
  ];

  ngOnInit(): void {
    this.isPremium = isTenantPremium();
    this.cdr.detectChanges();
  }

  handleUpgrade(): void {
    this.payError = '';
    this.paying = true;
    this.payment
      .buyTenantPremium('/tenant-pricing')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (url) => {
          this.paying = false;
          if (!url) {
            this.payError = 'Không nhận được link VNPay.';
            this.cdr.detectChanges();
            return;
          }
          this.payment.openPaymentInNewTab(url, '/tenant-pricing', 'tenant');
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.paying = false;
          this.payError = getApiErrorMessage(err) || 'Không tạo được link thanh toán.';
          this.cdr.detectChanges();
        }
      });
  }

  isBool(v: boolean | string): v is boolean {
    return typeof v === 'boolean';
  }
}
