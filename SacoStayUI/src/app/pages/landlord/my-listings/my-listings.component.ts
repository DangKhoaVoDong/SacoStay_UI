import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LandlordLayoutComponent } from '../../../components/layout/landlord/landlord-layout.component';
import { RoomPostService } from '../../../services/room-post.service';
import { PaymentService } from '../../../services/payment.service';
import { getApiErrorMessage } from '../../../services/auth.service';
import type { RoomPostSummary } from '../../../models/room-post.models';

@Component({
  selector: 'app-my-listings',
  standalone: true,
  imports: [CommonModule, RouterLink, LandlordLayoutComponent],
  templateUrl: './my-listings.component.html'
})
export class MyListingsComponent implements OnInit {
  posts: RoomPostSummary[] = [];
  loading = true;
  paymentBanner = '';
  actionError = '';
  payingId = '';

  private readonly roomPosts = inject(RoomPostService);
  private readonly payment = inject(PaymentService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('payment') === 'completed') {
      this.paymentBanner =
        'Thanh toán VNPay thành công. Tin đăng chuyển sang chờ admin duyệt (nếu là tin mới).';
    }
    this.loadPosts();
  }

  loadPosts(): void {
    this.loading = true;
    this.roomPosts
      .getMyPosts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => {
        this.posts = list;
        this.loading = false;
        this.cdr.detectChanges();
      });
  }

  formatPrice(price?: number): string {
    if (!price) return '—';
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ/tháng';
  }

  statusLabel(status?: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'hidden') return 'Đã bị từ chối';
    if (s === 'pendingpayment') return 'Chờ thanh toán';
    if (s === 'pendingapproval') return 'Chờ duyệt';
    if (s === 'active') return 'Đang hiển thị';
    return status || '—';
  }

  statusClass(status?: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'hidden') return 'bg-red-50 text-red-700';
    if (s === 'pendingpayment') return 'bg-amber-50 text-amber-800';
    if (s === 'pendingapproval') return 'bg-blue-50 text-blue-700';
    if (s === 'active') return 'bg-green-50 text-green-700';
    return 'bg-gray-100 text-gray-600';
  }

  isHidden(status?: string): boolean {
    return (status || '').toLowerCase() === 'hidden';
  }

  isPendingPayment(status?: string): boolean {
    return (status || '').toLowerCase() === 'pendingpayment';
  }

  continuePayment(post: RoomPostSummary, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.actionError = '';
    this.payingId = post.id;
    PaymentService.saveRoomPostIdForPayment(post.id);
    void this.router.navigate(['/landlord-pricing'], { queryParams: { roomPostId: post.id } });
    this.payingId = '';
    this.cdr.detectChanges();
  }

}
