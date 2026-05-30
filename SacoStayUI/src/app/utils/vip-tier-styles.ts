import type { RoomPostSummary } from '../models/room-post.models';

/**
 * vip3=ELITE (đỏ, rất lớn) · vip2=PRO (cam, lớn) · vip1=LITE (xanh, trung bình) · free=BASIC (mặc định, nhỏ)
 * PRO và LITE khác màu — không dùng chung cam cho tiêu đề/nhãn tin.
 */
export type VipTier = 'free' | 'vip1' | 'vip2' | 'vip3';

const VIP_RANK: Record<VipTier, number> = {
  vip3: 0,
  vip2: 1,
  vip1: 2,
  free: 3
};

/** Chuẩn hóa BASIC | LITE | PRO | ELITE (bỏ tiền tố landlord_ từ DB cũ). */
export function normalizeLandlordPackageCode(raw: unknown): string {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/^landlord_/, '');
  if (s === 'elite' || s === 'vip3' || s === '3') return 'ELITE';
  if (s === 'pro' || s === 'vip2' || s === '2') return 'PRO';
  if (s === 'lite' || s === 'vip1' || s === '1') return 'LITE';
  if (s === 'basic' || s === 'free' || s === '0') return 'BASIC';
  return 'BASIC';
}

export function parseRoomVipTier(raw: unknown): VipTier {
  const code = normalizeLandlordPackageCode(raw);
  if (code === 'ELITE') return 'vip3';
  if (code === 'PRO') return 'vip2';
  if (code === 'LITE') return 'vip1';
  return 'free';
}

export function vipTierPackageLabel(tier?: VipTier | string): string {
  const t = typeof tier === 'string' ? parseRoomVipTier(tier) : tier ?? 'free';
  switch (t) {
    case 'vip3':
      return 'ELITE';
    case 'vip2':
      return 'PRO';
    case 'vip1':
      return 'LITE';
    default:
      return 'BASIC';
  }
}

export function sortRoomsByVipTier<T extends RoomPostSummary>(rooms: T[]): T[] {
  return [...rooms].sort((a, b) => {
    const ra = VIP_RANK[a.vipTier ?? 'free'];
    const rb = VIP_RANK[b.vipTier ?? 'free'];
    if (ra !== rb) return ra - rb;
    return (b.price ?? 0) - (a.price ?? 0);
  });
}

function resolveTier(tier?: VipTier | string): VipTier {
  return typeof tier === 'string' ? parseRoomVipTier(tier) : tier ?? 'free';
}

/** Thẻ tin — cùng kích thước mọi gói (chỉ tiêu đề khác cỡ). */
export function getVipTierCardArticleClass(_tier?: VipTier | string): string {
  return 'bg-white rounded-2xl overflow-hidden shadow-sm border border-orange-50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300';
}

/** Nhãn gói — chỉ trang landlord (my-listings). */
export function getVipTierInlineBadgeClass(tier?: VipTier | string): string {
  const t = resolveTier(tier);
  const base = 'inline-flex shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md';
  switch (t) {
    case 'vip3':
      return `${base} uppercase bg-red-50 text-[#EF4444] border border-red-200`;
    case 'vip2':
      return `${base} uppercase bg-orange-50 text-[#F59E0B] border border-orange-200`;
    case 'vip1':
      return `${base} uppercase bg-blue-50 text-[#2563EB] border border-blue-200`;
    default:
      return `${base} normal-case bg-gray-100 text-gray-600 border border-gray-200`;
  }
}

export function getVipTierPriceBadgeClass(tier?: VipTier | string): string {
  const t = resolveTier(tier);
  const base = 'absolute bottom-3 left-3 text-white text-sm font-bold px-3 py-1 rounded-lg shadow';
  switch (t) {
    case 'vip3':
      return `${base} bg-[#EF4444]`;
    case 'vip2':
      return `${base} bg-[#F59E0B]`;
    case 'vip1':
      return `${base} bg-[#2563EB]`;
    default:
      return `${base} bg-[#FF9F43]`;
  }
}

/** Sidebar map — cùng thứ bậc cỡ chữ như thẻ /rooms. */
export function getVipTierSidebarTitleClass(tier?: VipTier | string, selected = false): string {
  if (selected) return 'text-[#FF9F43] font-bold text-sm';
  return getVipTierTitleClass(tier, true);
}

/**
 * Tiêu đề tin — gói càng cao chữ càng to, đậm, IN HOA (trừ BASIC).
 * compact=true: thẻ danh sách /rooms (thẻ cùng kích thước, chỉ font title khác).
 */
export function getVipTierTitleClass(tier?: VipTier | string, compact = false): string {
  const t = resolveTier(tier);
  if (compact) {
    switch (t) {
      case 'vip3':
        return 'text-2xl sm:text-3xl font-black uppercase leading-tight text-[#EF4444] tracking-tight';
      case 'vip2':
        return 'text-xl sm:text-2xl font-bold uppercase leading-tight text-[#F59E0B]';
      case 'vip1':
        return 'text-base sm:text-lg font-bold uppercase leading-tight text-[#2563EB]';
      default:
        return 'text-xs sm:text-sm font-medium leading-snug text-gray-700 normal-case';
    }
  }
  switch (t) {
    case 'vip3':
      return 'text-2xl md:text-4xl font-black uppercase leading-snug text-[#EF4444]';
    case 'vip2':
      return 'text-2xl md:text-3xl font-bold uppercase leading-snug text-[#F59E0B]';
    case 'vip1':
      return 'text-lg md:text-xl font-bold uppercase leading-snug text-[#2563EB]';
    default:
      return 'text-sm md:text-base font-medium leading-snug text-gray-700 normal-case';
  }
}

export function getVipTierMarkerColor(tier?: VipTier | string, selected = false): string {
  if (selected) return '#FF6B6B';
  const t = resolveTier(tier);
  switch (t) {
    case 'vip3':
      return '#EF4444';
    case 'vip2':
      return '#F59E0B';
    case 'vip1':
      return '#2563EB';
    default:
      return '#FF9F43';
  }
}
