import type { KycApiStatus, KycStatusResponse, KycUiStatus } from '../models/kyc.models';

function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

export function normalizeKycStatus(raw: unknown): KycStatusResponse {
  if (!raw || typeof raw !== 'object') {
    return { status: 'NotSubmitted' };
  }
  const o = raw as Record<string, unknown>;
  const statusRaw = str(o['status'] ?? o['Status']) || 'NotSubmitted';
  const allowed: KycApiStatus[] = ['NotSubmitted', 'Pending', 'Approved', 'Rejected', 'NeedReupload'];
  const status = (allowed.includes(statusRaw as KycApiStatus) ? statusRaw : 'NotSubmitted') as KycApiStatus;
  return {
    status,
    adminNote: str(o['adminNote'] ?? o['AdminNote']) || null,
    submittedAt: str(o['submittedAt'] ?? o['SubmittedAt']) || null
  };
}

export function kycUiStatusFromApi(status: KycApiStatus): KycUiStatus {
  switch (status) {
    case 'Approved':
      return 'approved';
    case 'Pending':
      return 'pending';
    case 'Rejected':
    case 'NeedReupload':
      return 'rejected';
    default:
      return 'not_started';
  }
}

export function kycUiStatusLabel(ui: KycUiStatus): string {
  switch (ui) {
    case 'approved':
      return 'Đã xác thực danh tính';
    case 'pending':
      return 'Đang chờ duyệt';
    case 'rejected':
      return 'Cần xác thực lại';
    default:
      return 'Chưa xác thực danh tính';
  }
}
