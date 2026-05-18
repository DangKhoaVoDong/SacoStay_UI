import { environment } from '../../environments/environment';

/** URL tuyệt đối cho ảnh static từ API (avatar, ảnh phòng…). */
export function resolveMediaUrl(url: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const base = environment.apiUrl.replace(/\/api\/?$/, '');
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}
