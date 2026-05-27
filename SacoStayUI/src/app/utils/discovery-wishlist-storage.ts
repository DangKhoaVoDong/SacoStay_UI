/** Snapshot tối thiểu để hiển thị sidebar wishlist sau khi tải lại trang. */
export interface DiscoveryWishlistItem {
  userId: string;
  displayName: string;
  avatarUrl: string;
  matchingScore: number;
}

function wishlistKey(userId: string): string {
  return `saco_discovery_wishlist_${userId}`;
}

export function loadDiscoveryWishlist(userId: string): DiscoveryWishlistItem[] {
  if (!userId) return [];
  const raw = localStorage.getItem(wishlistKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as DiscoveryWishlistItem[];
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed.filter((item) => {
      if (!item?.userId || seen.has(item.userId)) return false;
      seen.add(item.userId);
      return true;
    });
  } catch {
    return [];
  }
}

export function saveDiscoveryWishlist(userId: string, items: DiscoveryWishlistItem[]): void {
  if (!userId) return;
  const seen = new Set<string>();
  const unique = items.filter((item) => {
    if (!item.userId || seen.has(item.userId)) return false;
    seen.add(item.userId);
    return true;
  });
  localStorage.setItem(wishlistKey(userId), JSON.stringify(unique));
}

export function clearDiscoveryWishlist(userId: string): void {
  if (!userId) return;
  localStorage.removeItem(wishlistKey(userId));
}
