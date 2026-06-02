import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { getApiErrorMessage } from './auth.service';
import type { ReportRow, SubmitReportPayload } from '../models/report.models';

function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function unwrapReportList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;
  const nested = o['data'] ?? o['Data'] ?? o['items'] ?? o['result'];
  return Array.isArray(nested) ? nested : [];
}

function safeFileName(name: string): string {
  const base = name.replace(/[^\w.\-() ]+/g, '_').trim() || 'image.jpg';
  return base.length > 120 ? base.slice(-120) : base;
}

export function reportApiErrorMessage(err: unknown, fallback: string): string {
  return getApiErrorMessage(err) || fallback;
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** POST /api/Report — multipart/form-data (PascalCase). */
  submit(payload: SubmitReportPayload): Observable<{ message: string }> {
    const fd = new FormData();
    fd.append('ReporterId', payload.reporterId);
    if (payload.reportedUserId) {
      fd.append('ReportedUserId', payload.reportedUserId);
    }
    if (payload.reportedRoomId) {
      fd.append('ReportedRoomId', payload.reportedRoomId);
    }
    fd.append('Reason', payload.reasons.join('; '));
    fd.append('Description', payload.description.trim());
    payload.imageFiles.forEach((file) => fd.append('Images', file, safeFileName(file.name)));

    return this.http
      .post(`${this.apiUrl}/Report`, fd, { responseType: 'text' })
      .pipe(
        map((body) => {
          const trimmed = (body ?? '').trim();
          if (!trimmed) return { message: 'Gửi báo cáo thành công.' };
          try {
            const o = JSON.parse(trimmed) as Record<string, unknown>;
            return { message: str(o['message'] ?? o['Message']) || 'Gửi báo cáo thành công.' };
          } catch {
            return { message: trimmed };
          }
        })
      );
  }

  /** GET /api/Report — danh sách cho admin. */
  getReports(): Observable<ReportRow[]> {
    return this.http.get<unknown>(`${this.apiUrl}/Report`).pipe(
      map((raw) => unwrapReportList(raw).map((item, i) => this.normalizeReport(item, i)))
    );
  }

  private normalizeReport(item: unknown, index: number): ReportRow {
    const o = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const imagesRaw = o['images'] ?? o['Images'];
    const images = Array.isArray(imagesRaw) ? imagesRaw.map((x) => str(x)).filter(Boolean) : [];
    return {
      id: str(o['reportId'] ?? o['ReportId']) || `report-${index}`,
      reporterName: str(o['reporterName'] ?? o['ReporterName']) || '—',
      reportedUserId: str(o['reportedUserId'] ?? o['ReportedUserId']) || undefined,
      reportedUserName: str(o['reportedUserName'] ?? o['ReportedUserName']) || undefined,
      reportedRoomId: str(o['reportedRoomId'] ?? o['ReportedRoomId']) || undefined,
      reportedRoomName: str(o['reportedRoomName'] ?? o['ReportedRoomName']) || undefined,
      reason: str(o['reason'] ?? o['Reason']),
      description: str(o['description'] ?? o['Description']),
      status: str(o['status'] ?? o['Status']) || 'Pending',
      createdAt: str(o['createdAt'] ?? o['CreatedAt']),
      images
    };
  }
}
