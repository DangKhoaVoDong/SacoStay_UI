export interface ReportRow {
  id: string;
  reporterName: string;
  reportedUserName?: string;
  reportedRoomName?: string;
  reason: string;
  description: string;
  status: string;
  createdAt: string;
  images: string[];
}

export interface SubmitReportPayload {
  reporterId: string;
  reportedUserId?: string;
  reportedRoomId?: string;
  reasons: string[];
  description: string;
  imageFiles: File[];
}
