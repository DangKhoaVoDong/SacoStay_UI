export interface MonthBucket {
  key: string;
  label: string;
  count: number;
}

/** Gom số bản ghi theo tháng (6 tháng gần nhất) từ chuỗi ISO createdAt. */
export function countByMonth(isoDates: string[], monthsBack = 6): MonthBucket[] {
  const now = new Date();
  const buckets: MonthBucket[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({
      key,
      label: `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
      count: 0
    });
  }
  for (const iso of isoDates) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) bucket.count++;
  }
  return buckets;
}

export function maxBucketCount(buckets: MonthBucket[]): number {
  return Math.max(1, ...buckets.map((b) => b.count));
}

/** % thay đổi: 30 ngày gần nhất so với 30 ngày trước đó. null nếu không đủ dữ liệu. */
export function growthTrendPercent(isoDates: string[], daysWindow = 30): number | null {
  const now = Date.now();
  const ms = daysWindow * 86_400_000;
  let recent = 0;
  let prior = 0;
  for (const iso of isoDates) {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) continue;
    const age = now - t;
    if (age >= 0 && age <= ms) recent++;
    else if (age > ms && age <= ms * 2) prior++;
  }
  if (prior === 0) return recent > 0 ? 100 : null;
  return Math.round(((recent - prior) / prior) * 100);
}

export function formatTrend(trend: number | null): string {
  if (trend === null) return '—';
  if (trend > 0) return `+${trend}%`;
  return `${trend}%`;
}

export interface StatusSlice {
  label: string;
  count: number;
  color: string;
  key: string;
}
