import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../../components/layout/navbar.component';
import { AuthService } from '../../../services/auth.service';
import { setTenantPremium, userIdFromUser } from '../../../utils/user-display';
import {
  clearPaymentContext,
  parsePaymentReturnParams,
  paymentReturnPath,
  type PaymentResultContext,
  type PaymentResultStatus
} from '../../../utils/payment-return';

@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './payment-result.component.html'
})
export class PaymentResultComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  status: PaymentResultStatus = 'unknown';
  context: PaymentResultContext = 'landlord';
  orderId = '';
  returnPath = '/';

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((qp) => {
      const parsed = parsePaymentReturnParams(qp);
      this.status = parsed.status;
      this.context = parsed.context;
      this.orderId = parsed.orderId;
      this.returnPath = paymentReturnPath(parsed.context, parsed.status);
      clearPaymentContext();
      this.syncPremiumIfNeeded();
      this.cdr.detectChanges();
    });
  }

  private syncPremiumIfNeeded(): void {
    if (this.status !== 'success' || this.context !== 'tenant') return;

    this.auth
      .refreshProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((profile) => {
        const userId = userIdFromUser(profile ?? this.auth.getCurrentUser());
        if (userId) setTenantPremium(true, userId);
        this.cdr.detectChanges();
      });
  }

  get title(): string {
    if (this.status === 'success') return 'Thanh toán thành công';
    if (this.status === 'cancelled') return 'Đã hủy thanh toán';
    if (this.status === 'failed') return 'Thanh toán thất bại';
    return 'Kết quả thanh toán';
  }

  get message(): string {
    if (this.status === 'success' && this.context === 'landlord') {
      return 'Gói tin đã được kích hoạt. Tin đăng chuyển sang chờ admin duyệt (nếu là tin mới).';
    }
    if (this.status === 'success' && this.context === 'tenant') {
      return 'Bạn đã nâng cấp Premium. Tận hưởng matching không giới hạn!';
    }
    if (this.status === 'cancelled') {
      return 'Bạn đã hủy giao dịch. Không có khoản phí nào được trừ.';
    }
    if (this.status === 'failed') {
      return 'Giao dịch không thành công. Bạn có thể thử lại.';
    }
    return 'Không xác định được trạng thái giao dịch.';
  }

  goBack(): void {
    void this.router.navigateByUrl(this.returnPath);
  }
}
