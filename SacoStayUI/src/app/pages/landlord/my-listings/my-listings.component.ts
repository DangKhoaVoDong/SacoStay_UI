import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LandlordLayoutComponent } from '../../../components/layout/landlord/landlord-layout.component';
import { RoomPostService } from '../../../services/room-post.service';
import { PaymentService } from '../../../services/payment.service';
import { getApiErrorMessage } from '../../../services/auth.service';
import type { RoomPostSummary } from '../../../models/room-post.models';
import { getVipTierInlineBadgeClass, vipTierPackageLabel } from '../../../utils/vip-tier-styles';

@Component({
  selector: 'app-my-listings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LandlordLayoutComponent],
  templateUrl: './my-listings.component.html'
})
export class MyListingsComponent implements OnInit {
  posts: RoomPostSummary[] = [];
  highlightPostId = '';
  loading = true;
  paymentBanner = '';
  actionError = '';
  payingId = '';

  showAdjustModal = false;
  adjustTarget: RoomPostSummary | null = null;
  adjustCurrentPeople = 0;
  adjustCapacityMax = 1;
  adjustStatus: 'active' | 'inactive' = 'active';
  adjustSaving = false;

  deletingId = '';

  private readonly roomPosts = inject(RoomPostService);
  private readonly payment = inject(PaymentService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    if (q.get('payment') === 'completed') {
      this.paymentBanner =
        'Thanh toán thành công. Tin đăng chuyển sang chờ admin duyệt (nếu là tin mới).';
    }
    this.highlightPostId = q.get('roomPostId') ?? '';
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

  isActive(status?: string): boolean {
    return (status || '').toLowerCase() === 'active';
  }

  isHidden(status?: string): boolean {
    return (status || '').toLowerCase() === 'hidden';
  }

  isPendingPayment(status?: string): boolean {
    return (status || '').toLowerCase() === 'pendingpayment';
  }

  packageBadgeClass(post: RoomPostSummary): string {
    return getVipTierInlineBadgeClass(post.vipTier);
  }

  packageLabel(post: RoomPostSummary): string {
    return vipTierPackageLabel(post.vipTier);
  }

  occupancyLabel(post: RoomPostSummary): string {
    const max = post.maxPeople ?? 0;
    if (!max) return '—';
    const cur = post.currentPeople ?? 0;
    return `${cur}/${max} người`;
  }

  openAdjust(post: RoomPostSummary, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.actionError = '';
    this.adjustTarget = post;
    this.adjustCapacityMax = Math.max(1, post.maxPeople ?? 1);
    const cur = post.currentPeople ?? 0;
    this.adjustCurrentPeople = Math.min(Math.max(0, cur), this.adjustCapacityMax);
    this.adjustStatus = this.isActive(post.status) ? 'active' : 'inactive';
    this.showAdjustModal = true;
    this.cdr.detectChanges();
  }

  stepCurrentPeople(delta: number): void {
    const next = this.adjustCurrentPeople + delta;
    this.adjustCurrentPeople = Math.min(this.adjustCapacityMax, Math.max(0, next));
  }

  closeAdjustModal(): void {
    this.showAdjustModal = false;
    this.adjustTarget = null;
    this.adjustSaving = false;
  }

  saveAdjust(): void {
    const post = this.adjustTarget;
    if (!post) return;
    const currentPeople = Math.round(Number(this.adjustCurrentPeople));
    if (!Number.isFinite(currentPeople) || currentPeople < 0) {
      this.actionError = 'Số người đang ở không hợp lệ.';
      return;
    }
    if (currentPeople > this.adjustCapacityMax) {
      this.actionError = `Số người đang ở không được vượt quá ${this.adjustCapacityMax}.`;
      return;
    }

    this.adjustSaving = true;
    this.actionError = '';
    this.roomPosts
      .updatePostStatus(post.id, { status: this.adjustStatus, currentPeople })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.closeAdjustModal();
          this.loadPosts();
        },
        error: (err) => {
          this.adjustSaving = false;
          this.actionError = getApiErrorMessage(err) || 'Không cập nhật được tin đăng.';
          this.cdr.detectChanges();
        }
      });
  }

  confirmDelete(post: RoomPostSummary, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isHidden(post.status)) return;
    const ok = window.confirm(
      `Xóa vĩnh viễn tin "${post.title}"? Hành động này không thể hoàn tác.`
    );
    if (!ok) return;

    this.actionError = '';
    this.deletingId = post.id;
    this.roomPosts
      .deletePost(post.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingId = '';
          this.posts = this.posts.filter((p) => p.id !== post.id);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.deletingId = '';
          this.actionError = getApiErrorMessage(err) || 'Không xóa được tin đăng.';
          this.cdr.detectChanges();
        }
      });
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
