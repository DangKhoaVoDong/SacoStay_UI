import type { RoomPostSummary } from '../models/room-post.models';

/** vip3=ELITE, vip2=PRO, vip1=LITE, free=BASIC */
export type VipTier = 'free' | 'vip1' | 'vip2' | 'vip3';

const VIP_RANK: Record<VipTier, number> = {
  vip3: 0,
  vip2: 1,
  vip1: 2,
  free: 3
};

export function parseRoomVipTier(raw: unknown): VipTier {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (s === 'elite' || s === 'vip3' || s === '3') return 'vip3';
  if (s === 'pro' || s === 'vip2' || s === '2') return 'vip2';
  if (s === 'lite' || s === 'vip1' || s === '1') return 'vip1';
  if (s === 'basic' || s === 'free' || s === '0') return 'free';
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
      return `${base} uppercase bg-orange-50 text-[#F59E0B] border border-orange-200`;
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
      return `${base} bg-[#FF9F43]`;
    default:
      return `${base} bg-[#FF9F43]`;
  }
}

export function getVipTierSidebarTitleClass(tier?: VipTier | string, selected = false): string {
  if (selected) return 'text-[#FF9F43] font-bold text-sm';
  const t = resolveTier(tier);
  const base = 'text-sm font-bold leading-tight';
  switch (t) {
    case 'vip3':
      return `${base} uppercase text-[#EF4444]`;
    case 'vip2':
      return `${base} uppercase text-[#F59E0B]`;
    case 'vip1':
      return `${base} uppercase text-[#F59E0B]`;
    default:
      return `${base} text-[#1A1A2E] font-semibold normal-case`;
  }
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
        return 'text-xl sm:text-2xl font-black uppercase leading-tight text-[#EF4444] tracking-tight';
      case 'vip2':
        return 'text-lg sm:text-xl font-bold uppercase leading-tight text-[#F59E0B]';
      case 'vip1':
        return 'text-base sm:text-lg font-bold uppercase leading-tight text-[#F59E0B]';
      default:
        return 'text-sm font-medium leading-snug text-[#1A1A2E] normal-case';
    }
  }
  switch (t) {
    case 'vip3':
      return 'text-2xl md:text-4xl font-black uppercase leading-snug text-[#EF4444]';
    case 'vip2':
      return 'text-2xl md:text-3xl font-bold uppercase leading-snug text-[#F59E0B]';
    case 'vip1':
      return 'text-xl md:text-2xl font-bold uppercase leading-snug text-[#F59E0B]';
    default:
      return 'text-lg md:text-xl font-medium leading-snug text-[#1A1A2E] normal-case';
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
      return '#FF9F43';
    default:
      return '#FF9F43';
  }
}
