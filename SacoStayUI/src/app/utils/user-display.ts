function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function isMeaningful(v: unknown): boolean {
  return str(v).length > 0;
}

/** Hiển thị: ưu tiên userName (API .NET thường trả UserName / PascalCase). */
export function displayNameFromUser(user: unknown): string {
  if (!user || typeof user !== 'object') return 'Người dùng';
  const u = user as Record<string, unknown>;
  const un = str(u['userName'] ?? u['UserName'] ?? u['username']);
  if (un) return un;
  const em = str(u['email'] ?? u['Email']);
  if (em) {
    const local = em.split('@')[0];
    if (local) return local;
  }
  const ph = str(u['phoneNumber'] ?? u['PhoneNumber']);
  if (ph) return ph;
  return 'Người dùng';
}

/** Tên hiển thị trên navbar: ưu tiên họ + tên, không có thì userName / email. */
export function navProfileLabel(user: unknown): string {
  if (!user || typeof user !== 'object') return 'Người dùng';
  const u = user as Record<string, unknown>;
  const fn = str(u['firstName'] ?? u['FirstName']);
  const ln = str(u['lastName'] ?? u['LastName']);
  const full = [fn, ln].filter(Boolean).join(' ').trim();
  if (full) return full;
  return displayNameFromUser(user);
}

/**
 * Chuẩn hóa object user từ API (ASP.NET thường PascalCase) sang field camelCase dùng trong UI.
 * Giữ nguyên các key gốc để không mất dữ liệu.
 */
export function normalizeAuthUser(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  let base = raw as Record<string, unknown>;
  if (base['data'] && typeof base['data'] === 'object') {
    base = { ...(base['data'] as Record<string, unknown>) };
  } else {
    base = { ...base };
  }

  const o = base;

  const copyScalar = (camel: string, ...pascalOrSnake: string[]) => {
    if (isMeaningful(o[camel])) return;
    for (const key of pascalOrSnake) {
      const v = o[key];
      if (!isMeaningful(v)) continue;
      if (camel === 'phoneNumber') {
        o[camel] = typeof v === 'number' ? String(v) : str(v);
      } else {
        o[camel] = v;
      }
      return;
    }
  };

  copyScalar('firstName', 'FirstName', 'first_name');
  copyScalar('lastName', 'LastName', 'last_name');
  copyScalar('phoneNumber', 'PhoneNumber', 'phone_number', 'Phone');
  copyScalar('email', 'Email');
  copyScalar('userName', 'UserName', 'username', 'user_name');
  copyScalar('id', 'Id', 'ID');
  copyScalar('dateOfBirth', 'DateOfBirth');
  copyScalar('job', 'Job');
  copyScalar('livingArea', 'LivingArea', 'living_area', 'Location', 'location', 'ResidentialArea', 'residentialArea', 'Address', 'address');
  copyScalar('bio', 'Bio');
  copyScalar('avatar', 'Avatar', 'AvatarUrl', 'avatarUrl');

  const avatarFromList = profileAvatarFromRaw(o);
  if (avatarFromList) {
    o['avatar'] = avatarFromList;
  }
  const imgs = profileImagesListFromRaw(o);
  if (imgs.length) {
    o['profileImages'] = imgs;
  }

  const rolesCamel = o['roles'];
  const rolesPascal = o['Roles'];
  if (Array.isArray(rolesPascal) && (!Array.isArray(rolesCamel) || rolesCamel.length === 0)) {
    o['roles'] = rolesPascal;
  }

  if (o['Gender'] !== undefined && o['Gender'] !== null && o['gender'] === undefined) {
    o['gender'] = o['Gender'];
  }
  if (o['LifestyleProfile'] !== undefined && o['lifestyleProfile'] === undefined) {
    o['lifestyleProfile'] = o['LifestyleProfile'];
  }

  o['name'] = displayNameFromUser(o);
  return o;
}

/** Giá trị khu vực sống từ profile API (nhiều backend map cột khác tên: Location, Address…). */
export function profileLivingAreaSeed(user: unknown): string {
  if (!user || typeof user !== 'object') return '';
  const u = user as Record<string, unknown>;
  return str(
    u['livingArea'] ??
      u['LivingArea'] ??
      u['living_area'] ??
      u['location'] ??
      u['Location'] ??
      u['ResidentialArea'] ??
      u['residentialArea'] ??
      u['Address'] ??
      u['address']
  );
}

/** Chỉ lấy firstName / lastName từ object user — không tách từ `name` (tránh nhầm với email/display). */
export function profileFirstLastSeed(user: unknown): { firstName: string; lastName: string } {
  if (!user || typeof user !== 'object') return { firstName: '', lastName: '' };
  const u = user as Record<string, unknown>;
  return {
    firstName: str(u['firstName'] ?? u['FirstName']),
    lastName: str(u['lastName'] ?? u['LastName'])
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

  const hasUn = !!str(base['userName'] ?? base['UserName']);
  if (!hasUn && t.userName) {
    base['userName'] = t.userName;
  }
  if (!str(base['firstName'] ?? base['FirstName']) && t.firstName) {
    base['firstName'] = t.firstName;
  }
  if (!str(base['lastName'] ?? base['LastName']) && t.lastName) {
    base['lastName'] = t.lastName;
  }
  if (!str(base['phoneNumber'] ?? base['PhoneNumber']) && t.phoneNumber) {
    base['phoneNumber'] = t.phoneNumber;
  }
  if (!str(base['email'] ?? base['Email']) && t.email) {
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

/** URL ảnh đại diện — API trả ProfileImage (mảng) hoặc avatar. */
export function profileAvatarFromRaw(user: unknown): string {
  if (!user || typeof user !== 'object') return '';
  const u = user as Record<string, unknown>;
  const direct = str(u['avatar'] ?? u['Avatar'] ?? u['AvatarUrl'] ?? u['avatarUrl']);
  if (direct) return direct;
  const list = profileImagesListFromRaw(u);
  return list[0] ?? '';
}

export function profileImagesListFromRaw(user: unknown): string[] {
  if (!user || typeof user !== 'object') return [];
  const u = user as Record<string, unknown>;
  const raw = u['profileImages'] ?? u['ProfileImages'] ?? u['profileImage'] ?? u['ProfileImage'];
  if (Array.isArray(raw)) {
    return raw.map((x) => str(x)).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()];
  return [];
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
  const d = str(u['dateOfBirth'] ?? u['DateOfBirth']);
  if (d) return d.slice(0, 10);
  const age = Number(u['age'] ?? u['Age']);
  if (!Number.isNaN(age) && age > 0 && age < 120) {
    const y = new Date().getFullYear() - age;
    return `${y}-01-01`;
  }
  return '';
}

export function isAdminUser(user: unknown): boolean {
  if (!user || typeof user !== 'object') return false;
  const u = user as Record<string, unknown>;
  const roles = u['roles'] ?? u['Roles'];
  if (!Array.isArray(roles)) return false;
  return roles.some((r) => {
    const s = String(r).toLowerCase();
    return s === 'admin' || s.includes('admin');
  });
}

export function isLandlordUser(user: unknown): boolean {
  if (!user || typeof user !== 'object') return false;
  const u = user as Record<string, unknown>;
  const roles = u['roles'] ?? u['Roles'];
  if (!Array.isArray(roles)) return false;
  return roles.some((r) => String(r).toLowerCase().includes('landlord'));
}

/** Id user từ profile JWT / Auth (dùng cho cache theo tài khoản). */
export function userIdFromUser(user: unknown): string {
  if (!user || typeof user !== 'object') return '';
  const u = user as Record<string, unknown>;
  return str(u['id'] ?? u['Id'] ?? u['userId'] ?? u['UserId'] ?? u['sub'] ?? u['Sub']);
}

export type VipTier = 'free' | 'vip1' | 'vip2' | 'vip3';

const LANDLORD_PACKAGE_KEY = 'saco_landlord_package';

/** Gói VIP chủ trọ mock (elite/pro/lite/basic) — dùng đến khi có API thanh toán. */
export function setMockLandlordPackage(tierId: string): void {
  sessionStorage.setItem(LANDLORD_PACKAGE_KEY, tierId.toLowerCase());
}

export function resolveVipTier(user: unknown): VipTier {
  const mock = sessionStorage.getItem(LANDLORD_PACKAGE_KEY)?.toLowerCase();
  if (mock === 'elite') return 'vip3';
  if (mock === 'pro') return 'vip2';
  if (mock === 'lite') return 'vip1';
  if (mock === 'basic') return 'free';

  if (!user || typeof user !== 'object') return 'free';
  const u = user as Record<string, unknown>;
  const raw = str(u['vipTier'] ?? u['VipTier'] ?? u['vipLevel'] ?? u['VipLevel'] ?? u['packageTier'] ?? u['PackageTier']).toLowerCase();
  if (raw === 'vip3' || raw === '3' || raw === 'elite') return 'vip3';
  if (raw === 'vip2' || raw === '2' || raw === 'pro') return 'vip2';
  if (raw === 'vip1' || raw === '1' || raw === 'lite') return 'vip1';
  return 'free';
}

const TENANT_PREMIUM_KEY = 'saco_tenant_premium';

export function isTenantPremium(): boolean {
  return sessionStorage.getItem(TENANT_PREMIUM_KEY) === 'premium';
}

export function setTenantPremium(enabled: boolean): void {
  if (enabled) sessionStorage.setItem(TENANT_PREMIUM_KEY, 'premium');
  else sessionStorage.removeItem(TENANT_PREMIUM_KEY);
}
