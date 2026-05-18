/** Chuẩn hóa chuỗi để so khớp thành phố/quận (bỏ dấu, khoảng trắng). */
export function normalizeLocationKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cityMatches(roomCity: string | undefined, roomAddress: string | undefined, filterCity: string): boolean {
  if (filterCity === 'all') return true;
  const key = normalizeLocationKey(filterCity);
  const cityKey = normalizeLocationKey(roomCity ?? '');
  const addrKey = normalizeLocationKey(roomAddress ?? '');
  if (cityKey && (cityKey === key || cityKey.includes(key) || key.includes(cityKey))) return true;
  if (addrKey.includes(key)) return true;
  if (key === 'tp hcm' && (addrKey.includes('ho chi minh') || addrKey.includes('hcm'))) return true;
  if (key === 'ha noi' && addrKey.includes('ha noi')) return true;
  return false;
}

export function districtMatches(roomDistrict: string | undefined, roomAddress: string | undefined, filterDistrict: string): boolean {
  if (filterDistrict === 'all') return true;
  const key = normalizeLocationKey(filterDistrict);
  const dKey = normalizeLocationKey(roomDistrict ?? '');
  const addrKey = normalizeLocationKey(roomAddress ?? '');
  return (dKey && dKey.includes(key)) || addrKey.includes(key);
}

export function priceInRange(price: number | undefined, min: number, max: number): boolean {
  if (price == null || price <= 0) return true;
  return price >= min && price <= max;
}
