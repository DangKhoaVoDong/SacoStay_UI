import { environment } from './environment';

const PROD_API = 'https://api.sacostay.id.vn/api';
const PROD_HUB = 'https://api.sacostay.id.vn/chatHub';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

/** Chỉ sacostay.id.vn / www — không áp dụng khi test localhost. */
export function applyProductionHostIfNeeded(): void {
  if (typeof window === 'undefined') return;
  const host = window.location.hostname.toLowerCase();
  if (LOCAL_HOSTS.has(host)) return;
  if (host !== 'sacostay.id.vn' && host !== 'www.sacostay.id.vn') return;

  const env = environment as {
    production: boolean;
    apiUrl: string;
    appUrl: string;
    chatHubUrl: string;
  };
  env.production = true;
  env.apiUrl = PROD_API;
  env.chatHubUrl = PROD_HUB;
  env.appUrl = `https://${host}`;
}
