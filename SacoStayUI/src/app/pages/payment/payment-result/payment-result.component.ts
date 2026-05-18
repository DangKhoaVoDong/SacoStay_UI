import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from '../../../components/layout/navbar.component';
import { PaymentService } from '../../../services/payment.service';
import { setTenantPremium } from '../../../utils/user-display';

@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './payment-result.component.html'
})
export class PaymentResultComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  status: 'success' | 'failed' | 'unknown' = 'unknown';
  context: 'landlord' | 'tenant' = 'landlord';
  orderId = '';
  returnPath = '/';

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const s = (qp.get('status') || '').toLowerCase();
    this.status = s === 'success' ? 'success' : s === 'failed' ? 'failed' : 'unknown';
    this.context = qp.get('context') === 'tenant' ? 'tenant' : 'landlord';
    this.orderId = qp.get('orderId') || '';
    this.returnPath = PaymentService.consumeReturnPath();

    if (this.status === 'success' && this.context === 'tenant') {
      setTenantPremium(true);
    }

    this.cdr.detectChanges();
  }

  get title(): string {
    if (this.status === 'success') return 'Thanh toán thành công';
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
    if (this.status === 'failed') {
      return 'Giao dịch không thành công hoặc đã bị hủy. Bạn có thể thử lại.';
    }
    return 'Không xác định được trạng thái giao dịch.';
  }

  goBack(): void {
    const target = this.returnPath || (this.context === 'landlord' ? '/landlord-profile' : '/');
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.location.href = target;
        window.close();
        return;
      } catch {
        /* cross-origin — fallback navigate */
      }
    }
    void this.router.navigateByUrl(target);
  }
}
