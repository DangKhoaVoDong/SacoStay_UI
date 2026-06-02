/** Số tin chưa đọc theo từng hội thoại (theo user đăng nhập). */
export function unreadStorageKey(ownerUserId: string): string {
  return `saco_chat_unread_${ownerUserId}`;
}

export function lastSeenStorageKey(ownerUserId: string): string {
  return `saco_chat_lastseen_${ownerUserId}`;
}

export function loadUnreadCounts(ownerUserId: string): Record<string, number> {
  if (!ownerUserId) return {};
  try {
    const raw = localStorage.getItem(unreadStorageKey(ownerUserId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const n = Number(v);
      if (k && Number.isFinite(n) && n > 0) out[k.toLowerCase()] = Math.floor(n);
    }
    return out;
  } catch {
    return {};
  }
}

export function saveUnreadCounts(ownerUserId: string, counts: Record<string, number>): void {
  if (!ownerUserId) return;
  const cleaned: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts)) {
    if (v > 0) cleaned[k.toLowerCase()] = v;
  }
  if (Object.keys(cleaned).length === 0) {
    localStorage.removeItem(unreadStorageKey(ownerUserId));
  } else {
    localStorage.setItem(unreadStorageKey(ownerUserId), JSON.stringify(cleaned));
  }
}

export function loadLastSeenMap(ownerUserId: string): Record<string, string> {
  if (!ownerUserId) return {};
  try {
    const raw = localStorage.getItem(lastSeenStorageKey(ownerUserId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (k && v) out[k.toLowerCase()] = String(v);
    }
    return out;
  } catch {
    return {};
  }
}

export function markLastSeen(ownerUserId: string, peerId: string, at?: string): void {
  if (!ownerUserId || !peerId) return;
  const map = loadLastSeenMap(ownerUserId);
  map[peerId.toLowerCase()] = at ?? new Date().toISOString();
  localStorage.setItem(lastSeenStorageKey(ownerUserId), JSON.stringify(map));
}
