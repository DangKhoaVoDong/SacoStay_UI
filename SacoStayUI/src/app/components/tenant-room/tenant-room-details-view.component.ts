import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  tenantRoomLocationLabel,
  tenantRoomMaxPeopleLabel,
  tenantRoomPriceLabel,
  TENANT_ROOM_AMENITY_OPTIONS
} from '../../utils/tenant-room-filters';
import { resolveMediaUrl } from '../../utils/media-url';
import type { TenantRoomProfile } from '../../models/tenant-room-profile.models';

@Component({
  selector: 'app-tenant-room-details-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4 text-sm text-gray-700">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Địa điểm</p>
        <p class="font-medium text-gray-900">{{ locationLabel }}</p>
      </div>
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Số người tối đa</p>
        <p class="font-medium text-gray-900">{{ maxPeopleLabel }}</p>
      </div>
      @if (displayPrice) {
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Giá tiền trọ</p>
          <p class="font-medium text-[#FF9F43]">{{ displayPrice }}</p>
        </div>
      }
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Tiện nghi</p>
        @if (amenities.length) {
          <div class="flex flex-wrap gap-2">
            @for (item of amenities; track item.value) {
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF8F0] border border-orange-100 text-xs font-medium text-[#9a3412]">
                <span aria-hidden="true">{{ item.icon }}</span>
                {{ item.value }}
              </span>
            }
          </div>
        } @else {
          <p class="text-gray-500">Chưa ghi nhận tiện nghi</p>
        }
      </div>
      @if (imageUrls.length) {
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Ảnh phòng</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            @for (url of imageUrls; track url) {
              <img [src]="url" alt="Ảnh phòng trọ" class="w-full h-24 object-cover rounded-lg border border-gray-100" />
            }
          </div>
        </div>
      }
      @if (profile?.extraNotes) {
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Thông tin thêm</p>
          <p class="whitespace-pre-line leading-relaxed">{{ profile?.extraNotes }}</p>
        </div>
      }
    </div>
  `
})
export class TenantRoomDetailsViewComponent {
  @Input() profile: TenantRoomProfile | null = null;
  @Input() priceLabel = '';

  get displayPrice(): string {
    return tenantRoomPriceLabel(this.profile) || this.priceLabel.trim();
  }

  get locationLabel(): string {
    if (!this.profile) return 'Chưa cập nhật';
    return tenantRoomLocationLabel({
      city: this.profile.city ?? 'all',
      district: this.profile.district ?? 'all'
    });
  }

  get maxPeopleLabel(): string {
    return tenantRoomMaxPeopleLabel(this.profile?.maxPeople);
  }

  get amenities(): { value: string; icon: string }[] {
    const selected = new Set((this.profile?.amenities ?? []).map((a) => a.trim()));
    return TENANT_ROOM_AMENITY_OPTIONS.filter((o) => selected.has(o.value));
  }

  get imageUrls(): string[] {
    return (this.profile?.images ?? []).map((u) => resolveMediaUrl(u)).filter(Boolean);
  }
}
