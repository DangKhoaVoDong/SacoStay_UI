export type DiscoveryGenderFilter = 'all' | 'male' | 'female';
export type DiscoveryHasRoomFilter = 'all' | 'yes' | 'no';
export type DiscoveryRoomPriceFilter = 'all' | 'under2m' | '2to3m' | '3to5m' | 'over5m';
export type DiscoveryRoomDistrictFilter =
  | 'all'
  | 'Cầu Giấy'
  | 'Đống Đa'
  | 'Hai Bà Trưng'
  | 'Bình Thạnh'
  | 'Quận 7';

export interface DiscoveryFilters {
  gender: DiscoveryGenderFilter;
  minAge: number;
  maxAge: number;
  minCompatibility: number;
  hasRoom: DiscoveryHasRoomFilter;
  roomPrice: DiscoveryRoomPriceFilter;
  roomDistrict: DiscoveryRoomDistrictFilter;
}

export const DEFAULT_DISCOVERY_FILTERS: DiscoveryFilters = {
  gender: 'all',
  minAge: 18,
  maxAge: 30,
  minCompatibility: 0,
  hasRoom: 'all',
  roomPrice: 'all',
  roomDistrict: 'all'
};

export type ProfileGender = 'male' | 'female' | 'other';

export interface DiscoveryFilterableCard {
  matchingScore: number;
  age: number | null;
  gender: ProfileGender;
  hasRoom: boolean;
  location: string;
  roomPriceLabel: string;
}

/** Số lượt swipe miễn phí / tuần (Premium = không giới hạn). */
export const FREE_WEEKLY_SWIPE_LIMIT = 10;

export function profileGenderFromRaw(gender: unknown): ProfileGender {
  if (gender === true || gender === 'male') return 'male';
  if (gender === false || gender === 'female') return 'female';
  return 'other';
}

function priceBucketFromLabel(label: string): DiscoveryRoomPriceFilter | null {
  const t = label.toLowerCase();
  const nums = [...t.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr|m|k)?/gi)].map((m) => {
    let n = parseFloat(m[1].replace(',', '.'));
    if (/triệu|tr\b|m\b/.test(m[0].toLowerCase()) || (n < 100 && n > 0)) {
      if (n < 100) n *= 1_000_000;
    } else if (/k\b/.test(m[0].toLowerCase())) {
      n *= 1_000;
    }
    return n;
  });

  const value = nums.length ? Math.max(...nums) : 0;
  if (!value) {
    if (t.includes('dưới 2') || t.includes('under2')) return 'under2m';
    if (t.includes('2-3') || t.includes('2 – 3')) return '2to3m';
    if (t.includes('3-5') || t.includes('3 – 5')) return '3to5m';
    if (t.includes('trên 5') || t.includes('over5')) return 'over5m';
    return null;
  }

  if (value < 2_000_000) return 'under2m';
  if (value <= 3_000_000) return '2to3m';
  if (value <= 5_000_000) return '3to5m';
  return 'over5m';
}

export function roomPriceMatchesFilter(priceLabel: string, filter: DiscoveryRoomPriceFilter): boolean {
  if (filter === 'all') return true;
  const bucket = priceBucketFromLabel(priceLabel);
  return bucket === filter;
}

export function matchesDiscoveryFilters(card: DiscoveryFilterableCard, filters: DiscoveryFilters): boolean {
  if (card.matchingScore < filters.minCompatibility) return false;

  if (filters.gender !== 'all' && card.gender !== filters.gender) return false;

  if (card.age != null) {
    if (card.age < filters.minAge || card.age > filters.maxAge) return false;
  }

  if (filters.hasRoom === 'yes' && !card.hasRoom) return false;
  if (filters.hasRoom === 'no' && card.hasRoom) return false;

  if (filters.hasRoom === 'yes') {
    if (filters.roomDistrict !== 'all') {
      const loc = card.location.toLowerCase();
      if (!loc.includes(filters.roomDistrict.toLowerCase())) return false;
    }
    if (!roomPriceMatchesFilter(card.roomPriceLabel, filters.roomPrice)) return false;
  }

  return true;
}
