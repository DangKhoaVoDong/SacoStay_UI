/** Amenities landlords select when creating a listing. */
export const LANDLORD_AMENITY_VALUES = [
  'Điều hòa',
  'Nóng lạnh',
  'Máy giặt',
  'Ban công',
  'Thang máy',
  'Bếp riêng',
  'Bảo vệ 24/7',
  'Chỗ để xe',
  'WiFi',
  'Tủ lạnh'
] as const;

export const FULL_FURNITURE_AMENITY = 'Full nội thất';

export const ROOM_FILTER_AMENITY_OPTIONS = [
  { value: 'Điều hòa', icon: '❄️' },
  { value: 'Nóng lạnh', icon: '🚿' },
  { value: 'Máy giặt', icon: '👕' },
  { value: 'Ban công', icon: '🌿' },
  { value: 'Thang máy', icon: '🛗' },
  { value: 'Bếp riêng', icon: '🍳' },
  { value: 'Bảo vệ 24/7', icon: '🛡️' },
  { value: 'Chỗ để xe', icon: '🏍️' },
  { value: 'WiFi', icon: '📶' },
  { value: 'Tủ lạnh', icon: '🧊' },
  { value: FULL_FURNITURE_AMENITY, icon: '🛋️' }
] as const;

export function toggleRoomFilterAmenity(current: string[], value: string, selected: boolean): string[] {
  const set = new Set(current);
  if (value === FULL_FURNITURE_AMENITY) {
    if (selected) {
      for (const a of LANDLORD_AMENITY_VALUES) set.add(a);
      set.add(FULL_FURNITURE_AMENITY);
    } else {
      set.delete(FULL_FURNITURE_AMENITY);
    }
    return [...set];
  }

  if (selected) {
    set.add(value);
  } else {
    set.delete(value);
    set.delete(FULL_FURNITURE_AMENITY);
  }
  return [...set];
}
