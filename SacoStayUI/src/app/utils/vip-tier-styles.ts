import type { RoomPostSummary } from '../models/room-post.models';

export type VipTier = 'free' | 'vip1' | 'vip2' | 'vip3';

const VIP_RANK: Record<VipTier, number> = {
  vip3: 0,
  vip2: 1,
  vip1: 2,
  free: 3
};

export function parseRoomVipTier(raw: unknown): VipTier {
  const s = String(raw ?? '').toLowerCase();
  if (s === 'vip3' || s === '3') return 'vip3';
  if (s === 'vip2' || s === '2') return 'vip2';
  if (s === 'vip1' || s === '1') return 'vip1';
  return 'free';
}

export function sortRoomsByVipTier<T extends RoomPostSummary>(rooms: T[]): T[] {
  return [...rooms].sort((a, b) => {
    const ra = VIP_RANK[a.vipTier ?? 'free'];
    const rb = VIP_RANK[b.vipTier ?? 'free'];
    if (ra !== rb) return ra - rb;
    return (b.price ?? 0) - (a.price ?? 0);
  });
}

export function getVipTierTitleClass(tier?: VipTier | string): string {
  const t = typeof tier === 'string' ? parseRoomVipTier(tier) : tier ?? 'free';
  const base = 'text-2xl md:text-3xl font-bold uppercase leading-snug';
  switch (t) {
    case 'vip3':
      return `${base} text-[#EF4444]`;
    case 'vip2':
      return `${base} text-[#F59E0B]`;
    case 'vip1':
      return `${base} text-[#FF9F43]`;
    default:
      return `${base} text-[#1A1A2E]`;
  }
}
