export type FilterChip = { value: string; label: string };

export const HANOI_DISTRICTS: string[] = [
  'Ba Đình',
  'Hoàn Kiếm',
  'Tây Hồ',
  'Long Biên',
  'Cầu Giấy',
  'Đống Đa',
  'Hai Bà Trưng',
  'Hoàng Mai',
  'Thanh Xuân',
  'Hà Đông',
  'Nam Từ Liêm',
  'Bắc Từ Liêm',
  'Đông Anh',
  'Gia Lâm',
  'Sóc Sơn',
  'Thanh Trì',
  'Hoài Đức',
  'Thường Tín',
  'Sơn Tây'
];

export const HCM_DISTRICTS: string[] = [
  'Quận 1',
  'Quận 3',
  'Quận 4',
  'Quận 5',
  'Quận 6',
  'Quận 7',
  'Quận 8',
  'Quận 10',
  'Quận 11',
  'Quận 12',
  'Bình Thạnh',
  'Phú Nhuận',
  'Tân Bình',
  'Tân Phú',
  'Gò Vấp',
  'Bình Tân',
  'Thủ Đức',
  'Hóc Môn',
  'Củ Chi',
  'Bình Chánh',
  'Nhà Bè'
];

export const FILTER_CITY_OPTIONS: FilterChip[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'Hà Nội', label: 'Hà Nội' },
  { value: 'TP.HCM', label: 'TP.HCM' }
];

const GUID_PREFIX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Quận/huyện cho bộ lọc rooms & map theo thành phố đã chọn. */
export function districtFilterOptions(city: string): FilterChip[] {
  const all: FilterChip = { value: 'all', label: 'Tất cả' };
  if (city === 'Hà Nội') {
    return [all, ...HANOI_DISTRICTS.map((d) => ({ value: d, label: d }))];
  }
  if (city === 'TP.HCM') {
    return [all, ...HCM_DISTRICTS.map((d) => ({ value: d, label: d }))];
  }
  return [
    all,
    ...HANOI_DISTRICTS.map((d) => ({ value: d, label: d })),
    ...HCM_DISTRICTS.map((d) => ({ value: d, label: d }))
  ];
}

/** Dùng form đăng tin — nhãn Thủ Đức đầy đủ. */
export const DISTRICT_OPTIONS_BY_CITY: Record<string, FilterChip[]> = {
  'Hà Nội': HANOI_DISTRICTS.map((d) => ({ value: d, label: d })),
  'TP.HCM': HCM_DISTRICTS.map((d) =>
    d === 'Thủ Đức' ? { value: d, label: 'Thủ Đức (TP. Thủ Đức)' } : { value: d, label: d }
  )
};

export interface ChatNotificationParts {
  senderName: string;
  preview: string;
}

/** Tách tên người gửi / nội dung tin — ẩn GUID cũ từ BE. */
export function parseChatNotificationMessage(message: string): ChatNotificationParts {
  const raw = (message ?? '').trim();
  const idx = raw.indexOf(':');
  if (idx < 0) {
    return { senderName: '', preview: raw };
  }
  const prefix = raw.slice(0, idx).trim();
  const preview = raw.slice(idx + 1).trim();
  if (GUID_PREFIX.test(prefix)) {
    return { senderName: '', preview };
  }
  return { senderName: prefix, preview };
}
