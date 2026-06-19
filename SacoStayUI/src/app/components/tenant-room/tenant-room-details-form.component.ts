import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  FILTER_CITY_OPTIONS,
  TENANT_ROOM_AMENITY_OPTIONS,
  TENANT_ROOM_MAX_PEOPLE_OPTIONS,
  districtFilterOptions,
  parseTenantRoomPriceInput,
  tenantRoomPriceLabel,
  type TenantRoomProfileForm
} from '../../utils/tenant-room-filters';

@Component({
  selector: 'app-tenant-room-details-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tenant-room-details-form.component.html',
  styleUrl: './tenant-room-details-form.component.css'
})
export class TenantRoomDetailsFormComponent {
  @Input({ required: true }) form!: TenantRoomProfileForm;
  @Input() compact = false;
  @Output() formChange = new EventEmitter<TenantRoomProfileForm>();

  readonly cityOptions = FILTER_CITY_OPTIONS;
  readonly amenityOptions = TENANT_ROOM_AMENITY_OPTIONS;
  readonly maxPeopleOptions = TENANT_ROOM_MAX_PEOPLE_OPTIONS;

  get districtOptions() {
    return districtFilterOptions(this.form.city);
  }

  get pricePreview(): string {
    const price = parseTenantRoomPriceInput(this.form.priceInput);
    return price ? tenantRoomPriceLabel({ price }) : '';
  }

  onCityChange(city: string): void {
    this.patch({ city, district: 'all' });
  }

  onDistrictChange(district: string): void {
    this.patch({ district });
  }

  onMaxPeopleChange(maxPeople: number): void {
    this.patch({ maxPeople });
  }

  onPriceInputChange(priceInput: string): void {
    this.patch({ priceInput });
  }

  toggleAmenity(value: string): void {
    const set = new Set(this.form.amenities);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    this.patch({ amenities: [...set] });
  }

  isAmenitySelected(value: string): boolean {
    return this.form.amenities.includes(value);
  }

  onExtraNotesChange(extraNotes: string): void {
    this.patch({ extraNotes });
  }

  chipBtn(active: boolean): string {
    return active
      ? 'px-3 py-1.5 rounded-full text-xs font-semibold bg-[#FF9F43] text-white border border-[#FF9F43]'
      : 'px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200 hover:border-[#FF9F43]/50';
  }

  private patch(partial: Partial<TenantRoomProfileForm>): void {
    this.formChange.emit({ ...this.form, ...partial });
  }
}
