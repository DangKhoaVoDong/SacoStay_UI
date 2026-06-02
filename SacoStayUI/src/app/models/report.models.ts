export interface ReportRow {
  id: string;
  reporterName: string;
  reportedUserId?: string;
  reportedUserName?: string;
  reportedRoomId?: string;
  reportedRoomName?: string;
  reason: string;
  description: string;
  status: string;
  createdAt: string;
  images: string[];
}

export interface ProcessReportPayload {
  isValid: boolean;
  adminNote?: string;
}

export interface SubmitReportPayload {
  reporterId: string;
  reportedUserId?: string;
  reportedRoomId?: string;
  reasons: string[];
  description: string;
  imageFiles: File[];
}
