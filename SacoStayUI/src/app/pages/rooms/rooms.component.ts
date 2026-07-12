import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { RoomCardComponent } from '../../components/rooms/room-card.component';
import { RoomPostService } from '../../services/room-post.service';
import type { RoomListFilters, RoomPostSummary } from '../../models/room-post.models';
import { sortRoomsByVipTier } from '../../utils/vip-tier-styles';
import { cityMatches, districtMatches, priceInRange } from '../../utils/room-filters';
import { FILTER_CITY_OPTIONS, districtFilterOptions } from '../../utils/vietnam-districts';
import {
  ROOM_FILTER_AMENITY_OPTIONS,
  toggleRoomFilterAmenity
} from '../../utils/room-amenities';

export const AMENITY_OPTIONS = ROOM_FILTER_AMENITY_OPTIONS;

const DEFAULT_PRICE_MIN = 0;
const DEFAULT_PRICE_MAX = 50_000_000;
/** Số chip quận/huyện hiển thị trước khi bấm "+" mở rộng. */
const DISTRICT_COLLAPSED_COUNT = 9;

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, RoomCardComponent],
  templateUrl: './rooms.component.html'
})
export class RoomsComponent implements OnInit {
  readonly amenityOptions = AMENITY_OPTIONS;
  readonly priceSliderMin = DEFAULT_PRICE_MIN;
  readonly priceSliderMax = DEFAULT_PRICE_MAX;

  allRooms: RoomPostSummary[] = [];
  loading = true;
  error = '';
  showFilterPanel = false;
  districtOptionsExpanded = false;
  selectedAmenities: string[] = [];

  filters: RoomListFilters = {
    city: 'all',
    district: 'all',
    priceMin: DEFAULT_PRICE_MIN,
    priceMax: DEFAULT_PRICE_MAX,
    maxOccupants: 'all'
  };

  readonly cityOptions = FILTER_CITY_OPTIONS;

  get districtOptions() {
    return districtFilterOptions(this.filters.city);
  }

  get visibleDistrictOptions() {
    const all = this.districtOptions;
    if (this.districtOptionsExpanded || all.length <= DISTRICT_COLLAPSED_COUNT) {
      return all;
    }
    const head = all.slice(0, DISTRICT_COLLAPSED_COUNT);
    const selected = this.filters.district;
    if (selected !== 'all' && !head.some((o) => o.value === selected)) {
      const extra = all.find((o) => o.value === selected);
      if (extra) return [...head, extra];
    }
    return head;
  }

  get hasMoreDistrictOptions(): boolean {
    return this.districtOptions.length > DISTRICT_COLLAPSED_COUNT;
  }

  get hiddenDistrictCount(): number {
    return Math.max(0, this.districtOptions.length - DISTRICT_COLLAPSED_COUNT);
  }

  readonly maxOccupantOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: '1', label: '1 người' },
    { value: '2', label: '2 người' },
    { value: '3', label: '3 người' },
    { value: '4', label: '4+ người' }
  ];

  private readonly roomPosts = inject(RoomPostService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.roomPosts
      .listForBrowse()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.allRooms = list;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Không tải được danh sách phòng. Vui lòng thử lại sau.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  get filteredRooms(): RoomPostSummary[] {
    return sortRoomsByVipTier(
      this.allRooms.filter((room) => {
        if (!cityMatches(room.city, room.address, this.filters.city)) return false;
        if (!districtMatches(room.district, room.address, this.filters.district)) return false;
        if (!priceInRange(room.price, this.filters.priceMin, this.filters.priceMax)) return false;
        if (this.filters.maxOccupants !== 'all') {
          const minOcc = parseInt(this.filters.maxOccupants, 10);
          const max = room.maxPeople ?? 0;
          if (max < minOcc) return false;
        }
        if (this.selectedAmenities.length > 0) {
          const roomAmenities = (room.amenities ?? []).map((a) => a.toLowerCase());
          const hasAll = this.selectedAmenities.every((selected) =>
            roomAmenities.some(
              (ra) => ra.includes(selected.toLowerCase()) || selected.toLowerCase().includes(ra)
            )
          );
          if (!hasAll) return false;
        }
        return true;
      })
    );
  }

  get activeFilterCount(): number {
    return (
      (this.filters.city !== 'all' ? 1 : 0) +
      (this.filters.district !== 'all' ? 1 : 0) +
      (this.filters.priceMin > 0 || this.filters.priceMax < DEFAULT_PRICE_MAX ? 1 : 0) +
      (this.filters.maxOccupants !== 'all' ? 1 : 0) +
      this.selectedAmenities.length
    );
  }

  get minPercent(): number {
    return ((this.filters.priceMin - this.priceSliderMin) / (this.priceSliderMax - this.priceSliderMin)) * 100;
  }

  get maxPercent(): number {
    return ((this.filters.priceMax - this.priceSliderMin) / (this.priceSliderMax - this.priceSliderMin)) * 100;
  }

  toggleFilterPanel(): void {
    this.showFilterPanel = !this.showFilterPanel;
  }

  toggleAmenity(amenity: string): void {
    const selected = this.selectedAmenities.includes(amenity);
    this.selectedAmenities = toggleRoomFilterAmenity(this.selectedAmenities, amenity, !selected);
  }

  clearAllFilters(): void {
    this.filters = {
      city: 'all',
      district: 'all',
      priceMin: DEFAULT_PRICE_MIN,
      priceMax: DEFAULT_PRICE_MAX,
      maxOccupants: 'all'
    };
    this.selectedAmenities = [];
    this.districtOptionsExpanded = false;
  }

  setCity(value: string): void {
    this.filters = { ...this.filters, city: value, district: 'all' };
    this.districtOptionsExpanded = false;
  }

  expandDistrictOptions(): void {
    this.districtOptionsExpanded = true;
  }

  collapseDistrictOptions(): void {
    this.districtOptionsExpanded = false;
  }

  setDistrict(value: string): void {
    this.filters = { ...this.filters, district: value };
  }

  setMaxOccupants(value: string): void {
    this.filters = { ...this.filters, maxOccupants: value };
  }

  handlePriceMinChange(val: number): void {
    this.filters = {
      ...this.filters,
      priceMin: Math.min(val, this.filters.priceMax - 500_000)
    };
  }

  handlePriceMaxChange(val: number): void {
    this.filters = {
      ...this.filters,
      priceMax: Math.max(val, this.filters.priceMin + 500_000)
    };
  }

  formatPrice(val: number): string {
    return new Intl.NumberFormat('vi-VN').format(val) + 'đ';
  }

  resetPriceFilter(): void {
    this.filters = {
      ...this.filters,
      priceMin: DEFAULT_PRICE_MIN,
      priceMax: DEFAULT_PRICE_MAX
    };
  }

  chipBtn(active: boolean): string {
    return active
      ? 'px-4 py-2 text-sm rounded-lg border transition-all font-medium bg-gray-900 text-white border-gray-900'
      : 'px-4 py-2 text-sm rounded-lg border transition-all font-medium bg-white text-gray-700 border-gray-300 hover:border-gray-400';
  }
}
