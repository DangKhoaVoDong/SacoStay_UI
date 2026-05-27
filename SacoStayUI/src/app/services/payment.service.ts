import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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

export type PaymentContext = 'landlord' | 'tenant';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** Chủ trọ: POST /api/Payment/buy-package */
  buyLandlordPackage(roomPostId: string, packageName: string): Observable<string> {
    const params = new HttpParams()
      .set('roomPostId', roomPostId)
      .set('packageName', packageName.toUpperCase())
      .set('returnContext', 'landlord');

    return this.http
      .post<unknown>(`${this.apiUrl}/Payment/buy-package`, {}, { params })
      .pipe(map((res) => paymentUrlFromResponse(res)));
  }

  /**
   * Người thuê Premium — BE git hiện tại chỉ có `buy-package` (chủ trọ).
   * `buy-tenant-premium` chưa có → FE báo lỗi rõ thay vì 404 chung chung.
   */
  buyTenantPremium(): Observable<string> {
    const params = new HttpParams().set('returnContext', 'tenant');
    return this.http
      .post<unknown>(`${this.apiUrl}/Payment/buy-tenant-premium`, {}, { params })
      .pipe(
        map((res) => paymentUrlFromResponse(res)),
        catchError((err: { status?: number }) => {
          if (err?.status === 404) {
            return throwError(
              () =>
                new Error(
                  'API thanh toán Premium người thuê chưa có trên backend (POST /api/Payment/buy-tenant-premium). Nhờ team BE bổ sung endpoint này.'
                )
            );
          }
          return throwError(() => err);
        })
      );
  }

  goToVnPay(paymentUrl: string): void {
    if (!paymentUrl) return;
    window.location.href = paymentUrl;
  }

  static saveRoomPostIdForPayment(id: string): void {
    if (id) sessionStorage.setItem('saco_payment_room_post_id', id);
  }

  static getRoomPostIdForPayment(): string {
    return sessionStorage.getItem('saco_payment_room_post_id') || '';
  }
}
