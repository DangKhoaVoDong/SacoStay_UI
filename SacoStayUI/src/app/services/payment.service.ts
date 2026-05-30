import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

function paymentUrlFromResponse(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw !== 'object') return '';
  const o = raw as Record<string, unknown>;
  const nested = o['data'] && typeof o['data'] === 'object' ? (o['data'] as Record<string, unknown>) : o;
  return String(
    nested['paymentUrl'] ?? nested['PaymentUrl'] ?? nested['url'] ?? nested['Url'] ?? ''
  ).trim();
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** Chủ trọ: POST /api/Payment/buy-landlord-package */
  buyLandlordPackage(roomPostId: string, packageName: string): Observable<string> {
    const body = {
      roomPostId,
      RoomPostId: roomPostId,
      packageName: packageName.toUpperCase(),
      PackageName: packageName.toUpperCase()
    };
    return this.http
      .post<unknown>(`${this.apiUrl}/Payment/buy-landlord-package`, body)
      .pipe(map((res) => paymentUrlFromResponse(res)));
  }

  /** Người thuê: POST /api/Payment/buy-tenant-package — gói PREMIUM */
  buyTenantPremium(packageName = 'PREMIUM'): Observable<string> {
    const body = {
      packageName: packageName.toUpperCase(),
      PackageName: packageName.toUpperCase()
    };
    return this.http
      .post<unknown>(`${this.apiUrl}/Payment/buy-tenant-package`, body)
      .pipe(map((res) => paymentUrlFromResponse(res)));
  }

  goToPayOS(paymentUrl: string): void {
    if (!paymentUrl) return;
    window.location.href = paymentUrl;
  }

  /** @deprecated dùng goToPayOS */
  goToVnPay(paymentUrl: string): void {
    this.goToPayOS(paymentUrl);
  }

  static saveRoomPostIdForPayment(id: string): void {
    if (id) sessionStorage.setItem('saco_payment_room_post_id', id);
  }

  static getRoomPostIdForPayment(): string {
    return sessionStorage.getItem('saco_payment_room_post_id') || '';
  }
}
