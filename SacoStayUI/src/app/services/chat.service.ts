import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import type { ChatConversationSummary, ChatMessage } from '../models/chat.models';

function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function pickStr(o: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = str(o[k]);
    if (v) return v;
  }
  return '';
}

function unwrapList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;
  const nested = o['data'] ?? o['items'] ?? o['result'] ?? o['messages'] ?? o['history'];
  return Array.isArray(nested) ? nested : [];
}

function formatMessageTime(isoOrDate: string): string {
  if (!isoOrDate) return '';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Chat FE theo OpenAPI: chỉ `GET /api/Chat/history/{otherUserId}` + SignalR hub.
 * Tên/avatar người chat: `ChatPeerProfileService` → `GET /api/Auth/user/{userId}`.
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** GET /api/Chat/conversations — hội thoại từ DB (mọi thiết bị đều thấy). */
  getConversations(): Observable<ChatConversationSummary[]> {
    return this.http.get<unknown>(`${this.apiUrl}/Chat/conversations`).pipe(
      map((raw) => this.normalizeConversations(raw)),
      catchError(() => of([]))
    );
  }

  /** GET /api/Chat/history/{otherUserId} — BE trả senderId, message, sentAt. */
  getHistory(otherUserId: string, currentUserId: string): Observable<ChatMessage[]> {
    return this.http.get<unknown>(`${this.apiUrl}/Chat/history/${encodeURIComponent(otherUserId)}`).pipe(
      map((raw) => this.normalizeMessages(raw, currentUserId, otherUserId)),
      catchError(() => of([]))
    );
  }

  avatarFallback(name: string): string {
    return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name || 'U') + '&background=FF9F43&color=fff';
  }

  isLandlordRole(roles: string[] | undefined): boolean {
    return (roles ?? []).some((r) => String(r).toLowerCase().includes('landlord'));
  }

  private normalizeConversations(raw: unknown): ChatConversationSummary[] {
    const result: ChatConversationSummary[] = [];
    for (const item of unwrapList(raw)) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const otherUserId = pickStr(o, 'otherUserId', 'OtherUserId', 'userId', 'UserId');
      if (!otherUserId) continue;
      const lastMessageText = pickStr(o, 'lastMessage', 'LastMessage', 'message', 'Message', 'text', 'Text');
      const lastMessageAt = pickStr(o, 'lastSentAt', 'LastSentAt', 'sentAt', 'SentAt');
      result.push({
        otherUserId,
        lastMessageText: lastMessageText || '—',
        lastMessageAt: lastMessageAt || undefined
      });
    }
    return result;
  }

  private normalizeMessages(raw: unknown, currentUserId: string, otherUserId: string): ChatMessage[] {
    const me = currentUserId.toLowerCase();
    const result: ChatMessage[] = [];
    for (const [index, item] of unwrapList(raw).entries()) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const senderId =
        pickStr(o, 'senderId', 'SenderId', 'fromUserId', 'FromUserId', 'userId', 'UserId') || otherUserId;
      const text = pickStr(o, 'message', 'Message', 'text', 'Text', 'content', 'Content', 'body', 'Body');
      if (!text) continue;
      const sentAtRaw = pickStr(o, 'sentAt', 'SentAt', 'createdAt', 'CreatedAt', 'timestamp', 'Timestamp', 'time', 'Time');
      const sid = senderId.toLowerCase();
      const isMine =
        sid === me ||
        o['isMine'] === true ||
        o['IsMine'] === true ||
        o['isSentByMe'] === true ||
        o['IsSentByMe'] === true;
      result.push({
        id: pickStr(o, 'id', 'Id') || `msg-${index}`,
        senderId,
        text,
        sentAt: sentAtRaw ? formatMessageTime(sentAtRaw) : undefined,
        isMine
      });
    }
    return result;
  }
}
