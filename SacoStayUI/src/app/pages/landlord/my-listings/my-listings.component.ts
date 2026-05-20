import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LandlordLayoutComponent } from '../../../components/layout/landlord/landlord-layout.component';
import { RoomPostService } from '../../../services/room-post.service';
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

  private readonly roomPosts = inject(RoomPostService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('payment') === 'completed') {
      this.paymentBanner =
        'Thanh toán VNPay thành công. Tin đăng chuyển sang chờ admin duyệt (nếu là tin mới).';
    }

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
}
