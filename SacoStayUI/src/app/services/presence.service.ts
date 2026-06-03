import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { isOnlineFromLastSeen } from '../utils/presence';

export interface UserPresence {
  userId: string;
  lastSeenAt?: string;
  isOnline: boolean;
}

function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

@Injectable({ providedIn: 'root' })
export class PresenceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly cache = new Map<string, UserPresence>();

  getCached(userId: string): UserPresence | undefined {
    return this.cache.get(userId);
  }

  /** POST /api/Activity/presence — batch (BE). Fallback: GET /api/Auth/user/{id}. */
  fetchPresence(userIds: string[]): Observable<UserPresence[]> {
    const ids = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
    if (!ids.length) return of([]);

    return this.http
      .post<unknown>(`${this.apiUrl}/Activity/presence`, { userIds: ids })
      .pipe(
        map((raw) => this.normalizeBatch(raw, ids)),
        catchError(() => this.fetchPresenceFallback(ids))
      );
  }

  applyToCache(items: UserPresence[]): void {
    for (const p of items) {
      if (p.userId) this.cache.set(p.userId, p);
    }
  }

  private normalizeBatch(raw: unknown, requestedIds: string[]): UserPresence[] {
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as Record<string, unknown>)?.['items'])
        ? ((raw as Record<string, unknown>)['items'] as unknown[])
        : Array.isArray((raw as Record<string, unknown>)?.['$values'])
          ? ((raw as Record<string, unknown>)['$values'] as unknown[])
          : [];

    const byId = new Map<string, UserPresence>();
    for (const item of list) {
      const p = this.normalizeOne(item);
      if (p.userId) byId.set(p.userId.toLowerCase(), p);
    }

    return requestedIds.map((id) => {
      const hit = byId.get(id.toLowerCase());
      if (hit) {
        this.cache.set(id, hit);
        return hit;
      }
      const cached = this.cache.get(id);
      if (cached) return cached;
      return { userId: id, isOnline: false };
    });
  }

  private normalizeOne(item: unknown): UserPresence {
    const o = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const userId = str(o['userId'] ?? o['UserId'] ?? o['id'] ?? o['Id']);
    const lastSeenAt = str(o['lastSeenAt'] ?? o['LastSeenAt']) || undefined;
    const isOnlineRaw = o['isOnline'] ?? o['IsOnline'];
    const isOnline =
      typeof isOnlineRaw === 'boolean'
        ? isOnlineRaw
        : isOnlineFromLastSeen(lastSeenAt);
    return { userId, lastSeenAt, isOnline };
  }

  private fetchPresenceFallback(ids: string[]): Observable<UserPresence[]> {
    return new Observable((subscriber) => {
      const results: UserPresence[] = [];
      let done = 0;
      if (!ids.length) {
        subscriber.next([]);
        subscriber.complete();
        return;
      }
      for (const id of ids) {
        this.http.get<unknown>(`${this.apiUrl}/Auth/user/${encodeURIComponent(id)}`).subscribe({
          next: (raw) => {
            const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
            const lastSeenAt = str(o['lastSeenAt'] ?? o['LastSeenAt']) || undefined;
            const isOnlineRaw = o['isOnline'] ?? o['IsOnline'];
            const p: UserPresence = {
              userId: id,
              lastSeenAt,
              isOnline:
                typeof isOnlineRaw === 'boolean' ? isOnlineRaw : isOnlineFromLastSeen(lastSeenAt)
            };
            this.cache.set(id, p);
            results.push(p);
          },
          error: () => results.push({ userId: id, isOnline: false }),
          complete: () => {
            done += 1;
            if (done === ids.length) {
              subscriber.next(results);
              subscriber.complete();
            }
          }
        });
      }
    });
  }
}
