import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import type { AdminDashboardStats, AdminRoomPostRow, AdminUserRow } from '../models/admin.models';
import type { ProcessReportPayload } from '../models/report.models';

function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function unwrapList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;
  const nested = o['data'] ?? o['items'] ?? o['result'] ?? o['value'] ?? o['$values'];
  return Array.isArray(nested) ? nested : [];
}

function normalizeActionResult(raw: unknown): { message?: string; status?: string } {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    message: str(o['message'] ?? o['Message']),
    status: str(o['status'] ?? o['Status'])
  };
}

/** Map lỗi HTTP admin (theo OpenAPI Backend_Json.md — role admin + Bearer). */
export function adminApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { status?: number; error?: unknown; message?: string };
  const status = e?.status;
  if (status === 401) return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) {
    return 'Tài khoản không có quyền admin (403). Đăng xuất, đăng nhập lại bằng admin / Admin@123 sau khi BE đã build lại với MapInboundClaims = false.';
  }
  if (status === 404) {
    return 'API Admin không tìm thấy (404). Dừng SacoStayAPI, dotnet build, chạy lại — và đảm bảo AdminController không dùng [Authorize] ở cả class (chỉ từng action).';
  }
  const body = e?.error;
  if (typeof body === 'object' && body && 'message' in (body as object)) {
    return str((body as Record<string, unknown>)['message']) || fallback;
  }
  if (typeof body === 'string' && body.trim()) return body.trim();
  return e?.message || fallback;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getDashboard(): Observable<AdminDashboardStats> {
    return this.http.get<unknown>(`${this.apiUrl}/Admin/dashboard`).pipe(
      map((raw) => {
        const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
        return {
          totalUsers: Number(o['totalUsers'] ?? o['TotalUsers'] ?? 0),
          totalRoomPosts: Number(o['totalRoomPosts'] ?? o['TotalRoomPosts'] ?? 0),
          pendingRoomPosts: Number(o['pendingRoomPosts'] ?? o['PendingRoomPosts'] ?? 0),
          activeRoomPosts: Number(o['activeRoomPosts'] ?? o['ActiveRoomPosts'] ?? 0),
          hiddenRoomPosts: Number(o['hiddenRoomPosts'] ?? o['HiddenRoomPosts'] ?? 0)
        };
      })
    );
  }

  getUsers(limit = 100): Observable<AdminUserRow[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<unknown>(`${this.apiUrl}/Admin/users`, { params }).pipe(
      map((raw) => unwrapList(raw).map((item, i) => this.normalizeUser(item, i)))
    );
  }

  getRoomPosts(status?: string): Observable<AdminRoomPostRow[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<unknown>(`${this.apiUrl}/Admin/room-posts`, { params }).pipe(
      map((raw) => unwrapList(raw).map((item, i) => this.normalizeRoomPost(item, i)))
    );
  }

  approveRoomPost(id: string): Observable<{ message?: string; status?: string }> {
    return this.http
      .post<unknown>(`${this.apiUrl}/Admin/room-posts/${encodeURIComponent(id)}/approve`, {})
      .pipe(map((raw) => normalizeActionResult(raw)));
  }

  rejectRoomPost(id: string): Observable<{ message?: string; status?: string }> {
    return this.http
      .post<unknown>(`${this.apiUrl}/Admin/room-posts/${encodeURIComponent(id)}/reject`, {})
      .pipe(map((raw) => normalizeActionResult(raw)));
  }

  /** POST /api/Admin/reports/{id}/process — isValid: true = chấp nhận báo cáo, false = từ chối. */
  processReport(id: string, body: ProcessReportPayload): Observable<{ message?: string; status?: string }> {
    return this.http
      .post<unknown>(`${this.apiUrl}/Admin/reports/${encodeURIComponent(id)}/process`, {
        isValid: body.isValid,
        adminNote: body.adminNote ?? null
      })
      .pipe(map((raw) => normalizeActionResult(raw)));
  }

  /** Tin chờ xử lý: PendingApproval + PendingPayment (dashboard BE đếm cả hai). */
  getPendingRoomPosts(): Observable<AdminRoomPostRow[]> {
    return this.getRoomPosts().pipe(
      map((posts) =>
        posts.filter((p) => {
          const s = (p.status || '').toLowerCase();
          return s === 'pendingapproval' || s === 'pendingpayment';
        })
      )
    );
  }

  private normalizeUser(item: unknown, index: number): AdminUserRow {
    const o = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const rolesRaw = o['roles'] ?? o['Roles'];
    const roles = Array.isArray(rolesRaw) ? rolesRaw.map((r) => str(r)) : [];
    const fn = str(o['firstName'] ?? o['FirstName']);
    const ln = str(o['lastName'] ?? o['LastName']);
    const display = str(o['displayName'] ?? o['DisplayName']) || [fn, ln].filter(Boolean).join(' ') || str(o['userName'] ?? o['UserName']);
    return {
      id: str(o['id'] ?? o['Id']) || `user-${index}`,
      userName: str(o['userName'] ?? o['UserName']),
      email: str(o['email'] ?? o['Email']),
      phoneNumber: str(o['phoneNumber'] ?? o['PhoneNumber']) || undefined,
      firstName: fn || undefined,
      lastName: ln || undefined,
      displayName: display,
      createdAt: str(o['createdAt'] ?? o['CreatedAt']),
      roles,
      avatar: str(o['avatar'] ?? o['Avatar']) || undefined,
      totalSiteSeconds: Number(o['totalSiteSeconds'] ?? o['TotalSiteSeconds'] ?? 0) || 0,
      lastSeenAt: str(o['lastSeenAt'] ?? o['LastSeenAt']) || undefined
    };
  }

  private normalizeRoomPost(item: unknown, index: number): AdminRoomPostRow {
    const o = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const imagesRaw = o['images'] ?? o['Images'];
    const images = Array.isArray(imagesRaw) ? imagesRaw.map((x) => str(x)).filter(Boolean) : [];
    return {
      id: str(o['id'] ?? o['Id']) || `post-${index}`,
      title: str(o['title'] ?? o['Title']) || `Tin #${index + 1}`,
      price: Number(o['price'] ?? o['Price'] ?? 0),
      city: str(o['city'] ?? o['City']),
      district: str(o['district'] ?? o['District']),
      detailedAddress: str(o['detailedAddress'] ?? o['DetailedAddress']) || undefined,
      status: str(o['status'] ?? o['Status']) || 'PendingPayment',
      packageTier: str(o['packageTier'] ?? o['PackageTier']) || undefined,
      createdAt: str(o['createdAt'] ?? o['CreatedAt']),
      images,
      userId: str(o['userId'] ?? o['UserId']),
      landlordName: str(o['landlordName'] ?? o['LandlordName']) || undefined,
      landlordEmail: str(o['landlordEmail'] ?? o['LandlordEmail']) || undefined
    };
  }
}
