import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { RoomPostSummary } from '../../models/room-post.models';
import { getVipTierTitleClass } from '../../utils/vip-tier-styles';

@Component({
  selector: 'app-room-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './room-card.component.html'
})
export class RoomCardComponent {
  @Input({ required: true }) room!: RoomPostSummary;

  get titleClass(): string {
    return getVipTierTitleClass(this.room.vipTier) + ' text-sm leading-snug line-clamp-2';
  }

  formatPrice(price?: number): string {
    if (!price) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ/tháng';
  }

  get displayAddress(): string {
    return this.room.address || [this.room.district, this.room.city].filter(Boolean).join(', ') || '—';
  }

  get peopleLabel(): string {
    const cur = this.room.currentPeople ?? 0;
    const max = this.room.maxPeople;
    if (!max) return '';
    return `${cur || 0}/${max} người`;
  }
}
