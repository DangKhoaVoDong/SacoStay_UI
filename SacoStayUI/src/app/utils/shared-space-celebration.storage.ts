const KEY_PREFIX = 'sacostay.sharedSpaceCelebrationSeen';

function storageKey(userId: string): string {
  return `${KEY_PREFIX}.${userId.trim()}`;
}

export function hasSeenFinalizeCelebration(userId: string, spaceId: string): boolean {
  if (!userId?.trim() || !spaceId?.trim()) return false;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return false;
    const ids = JSON.parse(raw) as unknown;
    return Array.isArray(ids) && ids.includes(spaceId.trim());
  } catch {
    return false;
  }
}

export function markFinalizeCelebrationSeen(userId: string, spaceId: string): void {
  if (!userId?.trim() || !spaceId?.trim()) return;
  try {
    const key = storageKey(userId);
    const raw = localStorage.getItem(key);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    const next = Array.isArray(ids) ? [...ids] : [];
    const id = spaceId.trim();
    if (!next.includes(id)) next.push(id);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}
