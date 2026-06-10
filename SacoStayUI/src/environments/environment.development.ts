/**
 * Chỉ dùng khi chạy `npm run start` / `npm run start:local` (ng serve, cổng 4200).
 * Deploy web thật dùng environment.production.ts — không đụng file này.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5219/api',
  appUrl: 'http://localhost:4200',
  chatHubUrl: 'http://localhost:5219/chatHub'
};
