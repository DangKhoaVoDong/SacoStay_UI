/** Đường dẫn tenant cần đăng nhập — sau login quay lại đúng trang. */
export const TENANT_AUTH_PATHS = ['/chat', '/tenant-pricing'] as const;

export function isTenantAuthPath(path: string): boolean {
  const base = path.split('?')[0];
  return TENANT_AUTH_PATHS.some((p) => base === p || base.startsWith(p + '/'));
}

/** Chỉ cho phép redirect nội bộ (chống open redirect). */
export function sanitizeReturnUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const url = raw.trim();
  if (!url.startsWith('/') || url.startsWith('//')) return null;
  const path = url.split('?')[0];
  if (
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/auth') ||
    path.startsWith('/otp-verification')
  ) {
    return null;
  }
  return url;
}

export function resolvePostLoginUrl(returnUrl: string | null | undefined, fallback = '/'): string {
  return sanitizeReturnUrl(returnUrl) ?? fallback;
}
