import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LandlordLayoutComponent } from '../../../components/layout/landlord/landlord-layout.component';
import { PaymentService } from '../../../services/payment.service';
import { getApiErrorMessage } from '../../../services/auth.service';
import { RoomPostService } from '../../../services/room-post.service';

type PackageId = 'elite' | 'pro' | 'lite' | 'basic';

const PACKAGE_MAP: Record<PackageId, string> = {
  elite: 'ELITE',
  pro: 'PRO',
  lite: 'LITE',
  basic: 'BASIC'
};

@Component({
  selector: 'app-landlord-pricing',
  standalone: true,
  imports: [CommonModule, LandlordLayoutComponent, RouterLink],
  templateUrl: './landlord-pricing.component.html'
})
export class LandlordPricingComponent implements OnInit {
  private readonly payment = inject(PaymentService);
  private readonly roomPosts = inject(RoomPostService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  roomPostId = '';
  payingPackage: PackageId | null = null;
  errorMessage = '';
  loadingPosts = false;

  ngOnInit(): void {
    const fromQuery = this.route.snapshot.queryParamMap.get('roomPostId');
    const fromStorage = PaymentService.getRoomPostIdForPayment();
    this.roomPostId = fromQuery || fromStorage || '';

    if (!this.roomPostId) {
      this.loadingPosts = true;
      this.roomPosts
        .getMyPosts()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (posts) => {
            const pending = posts.find((p) => {
              const s = (p.status || '').toLowerCase();
              return s === 'pendingpayment' || s === 'pendingapproval' || !s;
            });
            this.roomPostId = pending?.id || posts[0]?.id || '';
            this.loadingPosts = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.loadingPosts = false;
            this.cdr.detectChanges();
          }
        });
    }
  }

  handleSelectPackage(tierId: PackageId): void {
    this.errorMessage = '';
    if (!this.roomPostId) {
      this.errorMessage = 'Chưa có tin đăng để thanh toán. Hãy đăng tin trước hoặc chọn tin từ Tin đã đăng.';
      return;
    }

    this.payingPackage = tierId;
    const packageName = PACKAGE_MAP[tierId];
    const returnPath = '/landlord-profile';

    this.payment
      .buyLandlordPackage(this.roomPostId, packageName, returnPath)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (url) => {
          this.payingPackage = null;
          if (!url) {
            this.errorMessage = 'Không nhận được link VNPay từ server.';
            this.cdr.detectChanges();
            return;
          }
          this.payment.openPaymentInNewTab(url, returnPath, 'landlord');
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.payingPackage = null;
          this.errorMessage = getApiErrorMessage(err) || 'Không tạo được link thanh toán.';
          this.cdr.detectChanges();
        }
      });
  }

  isPaying(id: PackageId): boolean {
    return this.payingPackage === id;
  }
}
