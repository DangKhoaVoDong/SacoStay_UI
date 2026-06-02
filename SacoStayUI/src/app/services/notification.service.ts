import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import type { AppNotification } from '../models/notification.models';

function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function normalizeNotification(raw: unknown): AppNotification | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = str(o['id'] ?? o['Id']);
  if (!id) return null;
  return {
    id,
    title: str(o['title'] ?? o['Title']) || 'Thông báo',
    message: str(o['message'] ?? o['Message']),
    type: str(o['type'] ?? o['Type']) || 'general',
    linkUrl: str(o['linkUrl'] ?? o['LinkUrl']) || undefined,
    isRead: !!(o['isRead'] ?? o['IsRead']),
    createdAt: str(o['createdAt'] ?? o['CreatedAt']),
    readAt: str(o['readAt'] ?? o['ReadAt']) || undefined
  };
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getList(page = 1, pageSize = 30): Observable<AppNotification[]> {
    return this.http
      .get<unknown>(`${this.apiUrl}/Notification`, {
        params: { page: String(page), pageSize: String(pageSize) }
      })
      .pipe(
        map((raw) => {
          const list = Array.isArray(raw) ? raw : [];
          return list.map(normalizeNotification).filter((n): n is AppNotification => !!n);
        })
      );
  }

  getUnreadCount(): Observable<number> {
    return this.http.get<unknown>(`${this.apiUrl}/Notification/unread-count`).pipe(
      map((raw) => {
        if (!raw || typeof raw !== 'object') return 0;
        const o = raw as Record<string, unknown>;
        const n = Number(o['unreadCount'] ?? o['UnreadCount'] ?? 0);
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
      })
    );
  }

  markRead(notificationId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/Notification/${encodeURIComponent(notificationId)}/read`, {});
  }

  markAllRead(): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/Notification/read-all`, {});
  }
}
