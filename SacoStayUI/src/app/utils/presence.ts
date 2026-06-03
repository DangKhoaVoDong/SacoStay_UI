/** Khớp BE: online nếu LastSeenAt trong vòng 2 phút (ping FE mỗi 30s). */
export const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

export function isOnlineFromLastSeen(lastSeenAt?: string | null, nowMs = Date.now()): boolean {
  if (!lastSeenAt) return false;
  const t = Date.parse(lastSeenAt);
  if (Number.isNaN(t)) return false;
  return nowMs - t <= ONLINE_THRESHOLD_MS;
}

export function presenceLabel(isOnline: boolean, lastSeenAt?: string | null): string {
  if (isOnline) return 'Đang hoạt động';
  if (!lastSeenAt) return 'Offline';
  const t = Date.parse(lastSeenAt);
  if (Number.isNaN(t)) return 'Offline';
  const diffMin = Math.floor((Date.now() - t) / 60_000);
  if (diffMin < 1) return 'Offline · vừa xong';
  if (diffMin < 60) return `Offline · ${diffMin} phút trước`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Offline · ${diffH} giờ trước`;
  return `Offline · ${new Date(t).toLocaleDateString('vi-VN')}`;
}
