import type { ParamMap } from '@angular/router';

export type PaymentResultStatus = 'success' | 'failed' | 'cancelled' | 'unknown';
export type PaymentResultContext = 'tenant' | 'landlord';

const CONTEXT_KEY = 'saco_payment_context';

/** Lưu trước khi chuyển sang PayOS — dùng khi callback thiếu `context`. */
export function savePaymentContext(context: PaymentResultContext): void {
  sessionStorage.setItem(CONTEXT_KEY, context);
}

export function readPaymentContext(): PaymentResultContext | null {
  const v = sessionStorage.getItem(CONTEXT_KEY);
  return v === 'tenant' || v === 'landlord' ? v : null;
}

export function clearPaymentContext(): void {
  sessionStorage.removeItem(CONTEXT_KEY);
}

/**
 * Parse query từ BE redirect hoặc PayOS:
 * `/payment/result?status=success|failed|cancelled&context=tenant|landlord&orderId=...`
 * PayOS có thể thêm: `orderCode`, `cancel=true`, `status=CANCELLED|PAID`.
 */
export function parsePaymentReturnParams(qp: ParamMap): {
  status: PaymentResultStatus;
  context: PaymentResultContext;
  orderId: string;
} {
  const cancelFlag = (qp.get('cancel') || '').toLowerCase() === 'true';
  const statusRaw = (qp.get('status') || '').toLowerCase();

  let status: PaymentResultStatus = 'unknown';
  if (cancelFlag || statusRaw === 'cancelled' || statusRaw === 'cancel') {
    status = 'cancelled';
  } else if (statusRaw === 'success' || statusRaw === 'paid') {
    status = 'success';
  } else if (statusRaw === 'failed') {
    status = 'failed';
  }

  const ctxParam = (qp.get('context') || '').toLowerCase();
  const context: PaymentResultContext =
    ctxParam === 'tenant' ? 'tenant' : ctxParam === 'landlord' ? 'landlord' : readPaymentContext() ?? 'landlord';

  const orderId = (qp.get('orderId') || qp.get('orderCode') || '').trim();

  return { status, context, orderId };
}

export function paymentReturnPath(context: PaymentResultContext, status: PaymentResultStatus): string {
  if (context === 'tenant') {
    return status === 'success' ? '/discovery' : '/tenant-pricing';
  }
  return status === 'success' ? '/my-listings' : '/landlord-pricing';
}
