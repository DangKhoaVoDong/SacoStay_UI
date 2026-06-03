import { environment } from './environment';

const PROD_API = 'https://api.sacostay.id.vn/api';
const PROD_HUB = 'https://api.sacostay.id.vn/chatHub';

/** Khi chạy trên sacostay.id.vn / www — luôn trỏ API production (tránh bundle còn localhost). */
export function applyProductionHostIfNeeded(): void {
  if (typeof window === 'undefined') return;
  const host = window.location.hostname.toLowerCase();
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
