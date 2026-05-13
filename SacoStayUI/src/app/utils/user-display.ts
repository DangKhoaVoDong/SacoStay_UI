/** Hiển thị: ưu tiên userName (API có thể trả UserName). */
export function displayNameFromUser(user: unknown): string {
  if (!user || typeof user !== 'object') return 'Người dùng';
  const u = user as Record<string, unknown>;
  const un = String(u['userName'] ?? u['UserName'] ?? u['username'] ?? '').trim();
  if (un) return un;
  const em = String(u['email'] ?? '').trim();
  if (em) {
    const local = em.split('@')[0];
    if (local) return local;
  }
  return 'Người dùng';
}

/** Ghi localStorage: gộp userName (mọi biến thể từ API) + name hiển thị = userName. */
export function normalizeAuthUser(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const o = { ...(raw as Record<string, unknown>) };
  const altLogin = o['UserName'] ?? o['username'];
  if (!String(o['userName'] ?? '').trim() && altLogin != null && String(altLogin).trim()) {
    o['userName'] = String(altLogin).trim();
  }
  o['name'] = displayNameFromUser(o);
  return o;
}

/** Chỉ lấy firstName / lastName từ object user — không tách từ `name` (tránh nhầm với email/display). */
export function profileFirstLastSeed(user: unknown): { firstName: string; lastName: string } {
  if (!user || typeof user !== 'object') return { firstName: '', lastName: '' };
  const u = user as Record<string, unknown>;
  return {
    firstName: String(u['firstName'] ?? '').trim(),
    lastName: String(u['lastName'] ?? '').trim()
  };
}

/** Snapshot form đăng ký (trước OTP) — merge vào user sau auto-login nếu API thiếu field. */
export function readTempRegisterProfile(): {
  userName: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
} {
  return {
    userName: (localStorage.getItem('temp_userName') || '').trim(),
    firstName: (localStorage.getItem('temp_firstName') || '').trim(),
    lastName: (localStorage.getItem('temp_lastName') || '').trim(),
    phoneNumber: (localStorage.getItem('temp_phone') || '').trim(),
    email: (localStorage.getItem('temp_email') || '').trim()
  };
}

export function applyTempRegisterProfileToUser(
  user: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const base: Record<string, unknown> =
    user && typeof user === 'object' ? { ...user } : {};
  const t = readTempRegisterProfile();

  const hasUn = !!String(base['userName'] ?? base['UserName'] ?? '').trim();
  if (!hasUn && t.userName) {
    base['userName'] = t.userName;
  }
  if (!String(base['firstName'] ?? '').trim() && t.firstName) {
    base['firstName'] = t.firstName;
  }
  if (!String(base['lastName'] ?? '').trim() && t.lastName) {
    base['lastName'] = t.lastName;
  }
  if (!String(base['phoneNumber'] ?? '').trim() && t.phoneNumber) {
    base['phoneNumber'] = t.phoneNumber;
  }
  if (!String(base['email'] ?? '').trim() && t.email) {
    base['email'] = t.email;
  }
  return base;
}

export function clearTempRegisterProfile(): void {
  localStorage.removeItem('temp_email');
  localStorage.removeItem('temp_password');
  localStorage.removeItem('temp_name');
  localStorage.removeItem('temp_userName');
  localStorage.removeItem('temp_firstName');
  localStorage.removeItem('temp_lastName');
  localStorage.removeItem('temp_phone');
}

export function genderToFormValue(g: unknown): 'male' | 'female' | 'other' {
  if (g === true || g === 'male') return 'male';
  if (g === false || g === 'female') return 'female';
  return 'other';
}

/** Chuỗi yyyy-MM-dd cho input type=date; hỗ trợ migrate từ `age` cũ. */
export function profileDateOfBirthSeed(user: unknown): string {
  if (!user || typeof user !== 'object') return '';
  const u = user as Record<string, unknown>;
  const d = String(u['dateOfBirth'] ?? '').trim();
  if (d) return d.slice(0, 10);
  const age = Number(u['age']);
  if (!Number.isNaN(age) && age > 0 && age < 120) {
    const y = new Date().getFullYear() - age;
    return `${y}-01-01`;
  }
  return '';
}
