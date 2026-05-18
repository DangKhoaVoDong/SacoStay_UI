import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import type { ChatConversation, ChatMessage, ChatParticipant, SendChatMessageRequest } from '../models/chat.models';
import { navProfileLabel } from '../utils/user-display';

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
  const nested = o['data'] ?? o['items'] ?? o['result'] ?? o['conversations'] ?? o['messages'] ?? o['history'];
  return Array.isArray(nested) ? nested : [];
}

function parseParticipant(raw: unknown, fallbackId = ''): ChatParticipant {
  if (!raw || typeof raw !== 'object') {
    return { id: fallbackId, displayName: 'Người dùng' };
  }
  const o = raw as Record<string, unknown>;
  const id = pickStr(o, 'id', 'Id', 'userId', 'UserId', 'otherUserId', 'OtherUserId') || fallbackId;
  const displayName =
    pickStr(o, 'displayName', 'DisplayName', 'name', 'Name', 'userName', 'UserName', 'fullName', 'FullName') ||
    navProfileLabel(o) ||
    'Người dùng';
  const avatarUrl = pickStr(o, 'avatar', 'Avatar', 'avatarUrl', 'AvatarUrl', 'profileImage', 'ProfileImage') || undefined;
  const rolesRaw = o['roles'] ?? o['Roles'];
  const roles = Array.isArray(rolesRaw) ? rolesRaw.map((r) => String(r)) : undefined;
  return { id, displayName, avatarUrl, roles };
}

function formatMessageTime(isoOrDate: string): string {
  if (!isoOrDate) return '';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** GET /api/Chat/conversations — danh sách hội thoại (nếu BE hỗ trợ). */
  getConversations(): Observable<ChatConversation[]> {
    return this.http.get<unknown>(`${this.apiUrl}/Chat/conversations`).pipe(
      map((raw) => this.normalizeConversations(raw)),
      catchError(() => of([]))
    );
  }

  /** GET /api/Chat/history/{otherUserId} — lịch sử tin nhắn với một user. */
  getHistory(otherUserId: string, currentUserId: string): Observable<ChatMessage[]> {
    return this.http.get<unknown>(`${this.apiUrl}/Chat/history/${encodeURIComponent(otherUserId)}`).pipe(
      map((raw) => this.normalizeMessages(raw, currentUserId, otherUserId)),
      catchError(() => of([]))
    );
  }

  /** POST /api/Chat/send — gửi tin (endpoint phổ biến; fallback trong component nếu 404). */
  sendMessage(body: SendChatMessageRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/Chat/send`, {
      otherUserId: body.otherUserId,
      content: body.content,
      receiverId: body.otherUserId,
      message: body.content
    });
  }

  avatarFallback(name: string): string {
    return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name || 'U') + '&background=FF9F43&color=fff';
  }

  isLandlordRole(participant: ChatParticipant): boolean {
    const roles = participant.roles ?? [];
    return roles.some((r) => String(r).toLowerCase().includes('landlord'));
  }

  private normalizeConversations(raw: unknown): ChatConversation[] {
    const result: ChatConversation[] = [];
    for (const [index, item] of unwrapList(raw).entries()) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const otherRaw =
        o['otherUser'] ??
        o['OtherUser'] ??
        o['participant'] ??
        o['Participant'] ??
        o;
      const otherId =
        pickStr(o, 'otherUserId', 'OtherUserId', 'userId', 'UserId', 'id', 'Id') ||
        pickStr(otherRaw as Record<string, unknown>, 'id', 'Id', 'userId', 'UserId');
      const otherUser = parseParticipant(otherRaw, otherId);
      if (!otherUser.id) continue;
      const lastMsg = o['lastMessage'] ?? o['LastMessage'] ?? o;
      const lastObj = lastMsg && typeof lastMsg === 'object' ? (lastMsg as Record<string, unknown>) : o;
      const lastMessageText = pickStr(
        lastObj,
        'text',
        'Text',
        'content',
        'Content',
        'message',
        'Message',
        'lastMessage',
        'LastMessage'
      );
      const lastMessageAt = pickStr(lastObj, 'sentAt', 'SentAt', 'createdAt', 'CreatedAt', 'timestamp', 'Timestamp');
      const unread = Number(o['unreadCount'] ?? o['UnreadCount'] ?? 0);
      result.push({
        id: otherUser.id || `conv-${index}`,
        otherUser,
        lastMessageText: lastMessageText || '—',
        lastMessageAt: lastMessageAt || undefined,
        unreadCount: Number.isFinite(unread) ? unread : 0
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
      const text = pickStr(o, 'text', 'Text', 'content', 'Content', 'message', 'Message', 'body', 'Body');
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
