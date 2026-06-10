export type KycApiStatus = 'NotSubmitted' | 'Pending' | 'Approved' | 'Rejected' | 'NeedReupload';

export interface KycStatusResponse {
  status: KycApiStatus;
  adminNote?: string | null;
  submittedAt?: string | null;
}

export type KycUiStatus = 'not_started' | 'pending' | 'approved' | 'rejected';
