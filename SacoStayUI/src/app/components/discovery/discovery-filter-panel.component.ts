import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DEFAULT_DISCOVERY_FILTERS,
  type DiscoveryFilters,
  type DiscoveryGenderFilter,
  type DiscoveryHasRoomFilter,
  type DiscoveryRoomDistrictFilter,
  type DiscoveryRoomPriceFilter
} from '../../utils/discovery-filters';

@Component({
  selector: 'app-discovery-filter-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './discovery-filter-panel.component.html'
})
export class DiscoveryFilterPanelComponent {
  @Input() filters: DiscoveryFilters = { ...DEFAULT_DISCOVERY_FILTERS };
  @Output() filtersChange = new EventEmitter<DiscoveryFilters>();
  @Output() apply = new EventEmitter<DiscoveryFilters>();

  readonly genderOptions: { val: DiscoveryGenderFilter; label: string }[] = [
    { val: 'all', label: 'Tất cả' },
    { val: 'male', label: 'Nam' },
    { val: 'female', label: 'Nữ' }
  ];

  readonly hasRoomOptions: { val: DiscoveryHasRoomFilter; label: string }[] = [
    { val: 'all', label: 'Tất cả' },
    { val: 'yes', label: 'Đã có' },
    { val: 'no', label: 'Chưa có' }
  ];

  readonly districtOptions: { val: DiscoveryRoomDistrictFilter; label: string }[] = [
    { val: 'all', label: 'Tất cả' },
    { val: 'Cầu Giấy', label: 'Cầu Giấy' },
    { val: 'Đống Đa', label: 'Đống Đa' },
    { val: 'Hai Bà Trưng', label: 'Hai Bà Trưng' },
    { val: 'Bình Thạnh', label: 'Bình Thạnh' },
    { val: 'Quận 7', label: 'Quận 7' }
  ];

  readonly roomPriceOptions: { value: DiscoveryRoomPriceFilter; label: string }[] = [
    { value: 'all', label: 'Tất cả mức giá' },
    { value: 'under2m', label: 'Dưới 2 triệu' },
    { value: '2to3m', label: '2-3 triệu' },
    { value: '3to5m', label: '3-5 triệu' },
    { value: 'over5m', label: 'Trên 5 triệu' }
  ];

  patch(partial: Partial<DiscoveryFilters>): void {
    this.filters = { ...this.filters, ...partial };
    this.filtersChange.emit(this.filters);
  }

  setGender(g: DiscoveryGenderFilter): void {
    this.patch({ gender: g });
  }

  setHasRoom(val: DiscoveryHasRoomFilter): void {
    this.patch({
      hasRoom: val,
      roomPrice: val === 'yes' ? this.filters.roomPrice : 'all',
      roomDistrict: val === 'yes' ? this.filters.roomDistrict : 'all'
    });
  }

  setDistrict(val: DiscoveryRoomDistrictFilter): void {
    this.patch({ roomDistrict: val });
  }

  reset(): void {
    this.filters = { ...DEFAULT_DISCOVERY_FILTERS };
    this.filtersChange.emit(this.filters);
  }

  applyFilters(): void {
    this.apply.emit({ ...this.filters });
  }
}
