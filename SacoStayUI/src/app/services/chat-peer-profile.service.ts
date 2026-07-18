import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { navProfileLabel, normalizeAuthUser, profileAvatarFromRaw } from '../utils/user-display';
import { resolveMediaUrl } from '../utils/media-url';
import { isOnlineFromLastSeen } from '../utils/presence';
import type { ChatParticipant } from '../models/chat.models';

const CACHE_KEY = 'saco_peer_profiles_v1';

function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

/** Nhãn placeholder từ FE cũ — không dùng làm tên hiển thị nếu có thể gọi API. */
export function isGenericChatLabel(name: string): boolean {
  const n = name.trim();
  if (!n) return true;
  if (n === 'Chủ trọ' || n === 'Người dùng' || n === 'Người tìm trọ' || n === 'Người thuê') return true;
  return /^Khách\s*#/i.test(n);
}

@Injectable({ providedIn: 'root' })
export class ChatPeerProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly memory = new Map<string, ChatParticipant>();

  /** Ghi cache từ profile đăng nhập (`GET /api/Auth/profile`). */
  cacheFromAuthUser(user: unknown): void {
    const normalized = normalizeAuthUser(user);
    const id = str(normalized['id'] ?? normalized['Id']);
    if (!id) return;
    const roles = normalized['roles'] ?? normalized['Roles'];
    const participant: ChatParticipant = {
      id,
      displayName: navProfileLabel(normalized),
      avatarUrl: resolveMediaUrl(profileAvatarFromRaw(normalized)) || undefined,
      roles: Array.isArray(roles) ? roles.map((r) => String(r)) : undefined
    };
    this.writeCache(participant);
  }

  seedFromHints(
    userId: string,
    hints?: { displayName?: string; avatarUrl?: string; role?: string }
  ): void {
    if (!userId) return;
    const name = str(hints?.displayName);
    const avatar = str(hints?.avatarUrl);
    const role = str(hints?.role);
    if (!name && !avatar && !role) return;

    const existing = this.readCache(userId);
    const useName = name && !isGenericChatLabel(name) ? name : existing?.displayName;
    const useAvatar = avatar || existing?.avatarUrl;
    const roles = role ? [role] : existing?.roles;

    if (!useName && !useAvatar) return;

    this.writeCache({
      id: userId,
      displayName: useName || existing?.displayName || this.shortLabel(userId),
      avatarUrl: useAvatar,
      roles
    });
  }

  getCached(userId: string): ChatParticipant | null {
    return this.readCache(userId);
  }

  /**
   * BE (khuyến nghị): `GET /api/Auth/user/{userId}` — FirstName, LastName, UserName, ProfileImage, Roles.
   * Landlord: thêm PhoneNumber. Nếu 404, dùng cache / gợi ý query.
   * @param forceRefresh bỏ qua cache (dùng khi cần SĐT liên hệ).
   */
  fetchPeer(
    userId: string,
    hints?: { displayName?: string; avatarUrl?: string; role?: string; forceRefresh?: boolean }
  ): Observable<ChatParticipant> {
    if (!userId) {
      return of({ id: '', displayName: 'Người dùng' });
    }

    this.seedFromHints(userId, hints);

    const cached = this.readCache(userId);
    const needPhone = hints?.role === 'landlord' && !cached?.phoneNumber;
    if (
      !hints?.forceRefresh &&
      !needPhone &&
      cached?.displayName &&
      !isGenericChatLabel(cached.displayName) &&
      cached.avatarUrl
    ) {
      return of(cached);
    }

    return this.http.get<unknown>(`${this.apiUrl}/Auth/user/${encodeURIComponent(userId)}`).pipe(
      map((raw) => this.fromApi(raw, userId)),
      tap((p) => this.writeCache(p)),
      catchError(() => of(this.resolveFallback(userId, hints))),
      map((p) => {
        if (cached?.avatarUrl && !p.avatarUrl) {
          return { ...p, avatarUrl: cached.avatarUrl };
        }
        if (cached?.phoneNumber && !p.phoneNumber) {
          return { ...p, phoneNumber: cached.phoneNumber };
        }
        return p;
      })
    );
  }

  fetchMany(
    userIds: string[],
    hintsById?: Record<string, { displayName?: string; avatarUrl?: string; role?: string }>
  ): Observable<ChatParticipant[]> {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (!unique.length) return of([]);
    return new Observable((subscriber) => {
      const results: ChatParticipant[] = [];
      let done = 0;
      for (const id of unique) {
        this.fetchPeer(id, hintsById?.[id]).subscribe({
          next: (p) => results.push(p),
          error: () => results.push(this.resolveFallback(id, hintsById?.[id])),
          complete: () => {
            done += 1;
            if (done === unique.length) {
              subscriber.next(results);
              subscriber.complete();
            }
          }
        });
      }
    });
  }

  private fromApi(raw: unknown, fallbackId: string): ChatParticipant {
    const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const normalized = normalizeAuthUser(raw);
    const id = str(normalized['id'] ?? normalized['Id']) || fallbackId;
    const roles = normalized['roles'] ?? normalized['Roles'];
    const lastSeenAt = str(o['lastSeenAt'] ?? o['LastSeenAt']) || undefined;
    const isOnlineRaw = o['isOnline'] ?? o['IsOnline'];
    const isOnline =
      typeof isOnlineRaw === 'boolean' ? isOnlineRaw : isOnlineFromLastSeen(lastSeenAt);
    return {
      id,
      displayName: navProfileLabel(normalized),
      avatarUrl: resolveMediaUrl(profileAvatarFromRaw(normalized)) || undefined,
      roles: Array.isArray(roles) ? roles.map((r) => String(r)) : undefined,
      phoneNumber: str(normalized['phoneNumber'] ?? normalized['PhoneNumber']) || undefined,
      lastSeenAt,
      isOnline
    };
  }

  private resolveFallback(
    userId: string,
    hints?: { displayName?: string; avatarUrl?: string; role?: string }
  ): ChatParticipant {
    const cached = this.readCache(userId);
    const hintName = str(hints?.displayName);
    const name =
      (hintName && !isGenericChatLabel(hintName) ? hintName : '') ||
      (cached?.displayName && !isGenericChatLabel(cached.displayName) ? cached.displayName : '') ||
      this.shortLabel(userId);
    return {
      id: userId,
      displayName: name,
      avatarUrl: str(hints?.avatarUrl) || cached?.avatarUrl,
      roles: hints?.role ? [hints.role] : cached?.roles
    };
  }

  shortLabel(userId: string): string {
    const short = userId.replace(/-/g, '').slice(0, 8).toUpperCase();
    return short ? `Người dùng · ${short}` : 'Người dùng';
  }

  private readCache(userId: string): ChatParticipant | null {
    if (this.memory.has(userId)) {
      return this.memory.get(userId) ?? null;
    }
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const map = JSON.parse(raw) as Record<string, ChatParticipant>;
      const p = map[userId];
      if (p?.id) {
        this.memory.set(userId, p);
        return p;
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  private writeCache(participant: ChatParticipant): void {
    if (!participant.id) return;
    this.memory.set(participant.id, participant);
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      const map = raw ? (JSON.parse(raw) as Record<string, ChatParticipant>) : {};
      map[participant.id] = participant;
      localStorage.setItem(CACHE_KEY, JSON.stringify(map));
    } catch {
      /* ignore */
    }
  }
}
