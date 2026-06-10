import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { RoomPostSummary } from '../../models/room-post.models';
import {
  getVipTierCardArticleClass,
  getVipTierPriceBadgeClass,
  getVipTierTitleClass
} from '../../utils/vip-tier-styles';

@Component({
  selector: 'app-room-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './room-card.component.html'
})
export class RoomCardComponent {
  @Input({ required: true }) room!: RoomPostSummary;
  /** Nguồn điều hướng — dùng cho nút quay lại ở chi tiết phòng. */
  @Input() fromPage: 'rooms' | 'my-listings' | null = 'rooms';

  get detailQueryParams(): Record<string, string> | null {
    if (!this.fromPage) return null;
    return { from: this.fromPage };
  }

  get articleClass(): string {
    return getVipTierCardArticleClass(this.room.vipTier);
  }

  get titleClass(): string {
    return getVipTierTitleClass(this.room.vipTier, true) + ' line-clamp-2';
  }

  get priceBadgeClass(): string {
    return getVipTierPriceBadgeClass(this.room.vipTier);
  }

  formatPrice(price?: number): string {
    if (!price) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ/tháng';
  }

  get displayAddress(): string {
    return this.room.address || [this.room.district, this.room.city].filter(Boolean).join(', ') || '—';
  }
}
