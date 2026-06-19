import { FILTER_CITY_OPTIONS, districtFilterOptions } from './vietnam-districts';

export const TENANT_ROOM_AMENITY_OPTIONS = [
  { value: 'Điều hòa', icon: '❄️' },
  { value: 'Ban công', icon: '🌿' },
  { value: 'WiFi', icon: '📶' },
  { value: 'Nóng lạnh', icon: '🚿' },
  { value: 'Máy giặt', icon: '👕' },
  { value: 'Bếp riêng', icon: '🍳' },
  { value: 'Thang máy', icon: '🛗' },
  { value: 'Bảo vệ 24/7', icon: '🛡️' },
  { value: 'Chỗ để xe', icon: '🏍️' },
  { value: 'Tủ lạnh', icon: '🧊' },
  { value: 'Full nội thất', icon: '🛋️' },
  { value: 'Hồ bơi chung', icon: '🏊' }
] as const;

export const TENANT_ROOM_MAX_PEOPLE_OPTIONS = [
  { value: 1, label: '1 người' },
  { value: 2, label: '2 người' },
  { value: 3, label: '3 người' },
  { value: 4, label: '4+ người' }
] as const;

export { FILTER_CITY_OPTIONS, districtFilterOptions };

export interface TenantRoomProfileForm {
  city: string;
  district: string;
  maxPeople: number;
  /** Giá thuê VND/tháng — nhập số nguyên (VD: 3000000). */
  priceInput: string;
  amenities: string[];
  extraNotes: string;
}

export function emptyTenantRoomProfileForm(): TenantRoomProfileForm {
  return {
    city: 'all',
    district: 'all',
    maxPeople: 2,
    priceInput: '',
    amenities: [],
    extraNotes: ''
  };
}

/** Parse giá VND từ ô nhập (chấp nhận 3000000 hoặc 3.000.000). */
export function parseTenantRoomPriceInput(input: string): number | null {
  const t = input.trim().replace(/\s/g, '');
  if (!t) return null;
  const normalized = t.replace(/\./g, '').replace(/,/g, '');
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

/** Giá VND đưa vào ô nhập khi load profile. */
export function formatTenantRoomPriceInput(price?: number | null): string {
  if (price == null || price <= 0) return '';
  return String(Math.round(price));
}

/** Nhãn giá thuê hiển thị (Discovery, profile, popup). */
export function tenantRoomPriceLabel(profile: { price?: number | null } | null | undefined): string {
  const amount = profile?.price;
  if (amount == null || amount <= 0) return '';
  const millions = amount / 1_000_000;
  if (millions >= 0.1 && millions < 10_000) {
    const formatted =
      millions % 1 === 0 ? String(millions) : millions.toFixed(1).replace(/\.0$/, '').replace('.', ',');
    return `${formatted} triệu/tháng`;
  }
  return `${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)}/tháng`;
}

export function tenantRoomLocationLabel(profile: Pick<TenantRoomProfileForm, 'city' | 'district'>): string {
  const parts: string[] = [];
  if (profile.district && profile.district !== 'all') parts.push(profile.district);
  if (profile.city && profile.city !== 'all') parts.push(profile.city);
  return parts.join(', ') || 'Chưa cập nhật';
}

export function tenantRoomMaxPeopleLabel(maxPeople?: number | null): string {
  if (!maxPeople || maxPeople < 1) return 'Chưa cập nhật';
  if (maxPeople >= 4) return '4+ người';
  return `${maxPeople} người`;
}

export function isTenantRoomProfileComplete(form: TenantRoomProfileForm): boolean {
  return (
    !!form.city &&
    form.city !== 'all' &&
    !!form.district &&
    form.district !== 'all' &&
    form.maxPeople >= 1
  );
}
