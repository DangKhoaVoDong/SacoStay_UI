import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export type PaymentContext = 'landlord' | 'tenant';

const RETURN_URL_KEY = 'saco_payment_return_url';
const CONTEXT_KEY = 'saco_payment_context';
const ROOM_POST_KEY = 'saco_payment_room_post_id';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  buyLandlordPackage(roomPostId: string, packageName: string, returnPath: string): Observable<string> {
    const params = new HttpParams()
      .set('roomPostId', roomPostId)
      .set('packageName', packageName.toUpperCase())
      .set('returnContext', 'landlord');

    return this.http
      .post<{ paymentUrl?: string }>(`${this.apiUrl}/Payment/buy-package`, {}, { params })
      .pipe(map((res) => res.paymentUrl || ''));
  }

  buyTenantPremium(returnPath: string): Observable<string> {
    const params = new HttpParams().set('returnContext', 'tenant');
    return this.http
      .post<{ paymentUrl?: string }>(`${this.apiUrl}/Payment/buy-tenant-premium`, {}, { params })
      .pipe(map((res) => res.paymentUrl || ''));
  }

  /** Mở VNPay tab mới; lưu đường quay lại sau khi BE redirect về /payment/result */
  openPaymentInNewTab(paymentUrl: string, returnPath: string, context: PaymentContext): void {
    if (!paymentUrl) return;
    sessionStorage.setItem(RETURN_URL_KEY, returnPath);
    sessionStorage.setItem(CONTEXT_KEY, context);
    window.open(paymentUrl, '_blank', 'noopener,noreferrer');
  }

  static saveRoomPostIdForPayment(id: string): void {
    if (id) sessionStorage.setItem(ROOM_POST_KEY, id);
  }

  static getRoomPostIdForPayment(): string {
    return sessionStorage.getItem(ROOM_POST_KEY) || '';
  }

  static consumeReturnPath(): string {
    const path = sessionStorage.getItem(RETURN_URL_KEY) || '/';
    sessionStorage.removeItem(RETURN_URL_KEY);
    return path;
  }

  static consumeContext(): PaymentContext {
    const c = sessionStorage.getItem(CONTEXT_KEY);
    sessionStorage.removeItem(CONTEXT_KEY);
    return c === 'tenant' ? 'tenant' : 'landlord';
  }
}
