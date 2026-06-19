import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import type {
  AddToShortlistPayload,
  CreateSharedSpacePayload,
  ProposeFinalizePayload,
  RoomVoteStatus,
  SharedSpaceCurrent,
  SharedSpaceShortlistItem,
  SharedSpaceSummary,
  VoteRoomPayload
} from '../models/shared-space.models';

function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function unwrapList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;
  const nested = o['shortlist'] ?? o['Shortlist'] ?? o['data'] ?? o['items'];
  return Array.isArray(nested) ? nested : [];
}

function messageFromResponse(raw: unknown, fallback: string): string {
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (!raw || typeof raw !== 'object') return fallback;
  return str((raw as Record<string, unknown>)['message'] ?? (raw as Record<string, unknown>)['Message']) || fallback;
}

function spaceIdFromResponse(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return '';
  return str((raw as Record<string, unknown>)['spaceId'] ?? (raw as Record<string, unknown>)['SpaceId']);
}

@Injectable({ providedIn: 'root' })
export class SharedSpaceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  createSpace(targetUserId: string): Observable<{ spaceId: string; message: string }> {
    const body: CreateSharedSpacePayload = { targetUserId };
    return this.http.post<unknown>(`${this.apiUrl}/SharedSpace/create`, body).pipe(
      map((raw) => ({
        spaceId: spaceIdFromResponse(raw),
        message: messageFromResponse(raw, 'Khởi tạo không gian chung thành công.')
      }))
    );
  }

  getCurrentSpace(): Observable<SharedSpaceCurrent | null> {
    return this.http.get<unknown>(`${this.apiUrl}/SharedSpace/current`).pipe(
      map((raw) => this.normalizeCurrent(raw)),
      catchError((err) => {
        if (err?.status === 404) return of(null);
        throw err;
      })
    );
  }

  listSpaces(): Observable<SharedSpaceSummary[]> {
    return this.http.get<unknown>(`${this.apiUrl}/SharedSpace/list`).pipe(
      map((raw) => {
        if (!Array.isArray(raw)) return [];
        return raw.map((item) => this.normalizeSummary(item)).filter((s): s is SharedSpaceSummary => !!s);
      }),
      catchError((err) => {
        if (err?.status === 404) return of([]);
        throw err;
      })
    );
  }

  getSpaceById(spaceId: string): Observable<SharedSpaceCurrent | null> {
    return this.http.get<unknown>(`${this.apiUrl}/SharedSpace/${encodeURIComponent(spaceId)}`).pipe(
      map((raw) => this.normalizeCurrent(raw)),
      catchError((err) => {
        if (err?.status === 404) return of(null);
        throw err;
      })
    );
  }

  addToShortlist(spaceId: string, roomId: string): Observable<string> {
    const body: AddToShortlistPayload = { roomId };
    return this.http
      .post<unknown>(`${this.apiUrl}/SharedSpace/${encodeURIComponent(spaceId)}/shortlist`, body)
      .pipe(map((raw) => messageFromResponse(raw, 'Đã thêm phòng vào danh sách chung.')));
  }

  voteRoom(shortlistId: string, voteStatus: 'Like' | 'Dislike'): Observable<string> {
    const body: VoteRoomPayload = { voteStatus };
    return this.http
      .post<unknown>(`${this.apiUrl}/SharedSpace/shortlist/${encodeURIComponent(shortlistId)}/vote`, body)
      .pipe(map((raw) => messageFromResponse(raw, 'Đã cập nhật biểu quyết.')));
  }

  proposeFinalize(spaceId: string, shortlistId: string): Observable<string> {
    const body: ProposeFinalizePayload = { shortlistId };
    return this.http
      .put<unknown>(`${this.apiUrl}/SharedSpace/${encodeURIComponent(spaceId)}/propose-finalize`, body)
      .pipe(map((raw) => messageFromResponse(raw, 'Đã gửi đề xuất chốt phòng.')));
  }

  acceptFinalize(spaceId: string): Observable<string> {
    return this.http
      .put<unknown>(`${this.apiUrl}/SharedSpace/${encodeURIComponent(spaceId)}/accept-finalize`, {})
      .pipe(map((raw) => messageFromResponse(raw, 'Đã chốt phòng thành công!')));
  }

  rejectFinalize(spaceId: string): Observable<string> {
    return this.http
      .put<unknown>(`${this.apiUrl}/SharedSpace/${encodeURIComponent(spaceId)}/reject-finalize`, {})
      .pipe(map((raw) => messageFromResponse(raw, 'Đã hủy đề xuất chốt phòng.')));
  }

  private normalizeSummary(raw: unknown): SharedSpaceSummary | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const id = str(o['id'] ?? o['Id']);
    if (!id) return null;

    const roomIdsRaw = o['shortlistRoomIds'] ?? o['ShortlistRoomIds'];
    const shortlistRoomIds = Array.isArray(roomIdsRaw)
      ? roomIdsRaw.map((v) => str(v)).filter(Boolean)
      : [];

    return {
      id,
      partnerId: str(o['partnerId'] ?? o['PartnerId']),
      partnerName: str(o['partnerName'] ?? o['PartnerName']) || 'Bạn cùng phòng',
      status: str(o['status'] ?? o['Status']) || 'Active',
      createdAt: str(o['createdAt'] ?? o['CreatedAt']),
      finalizedRoomId: str(o['finalizedRoomId'] ?? o['FinalizedRoomId']) || null,
      shortlistRoomIds
    };
  }

  private normalizeCurrent(raw: unknown): SharedSpaceCurrent | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const id = str(o['id'] ?? o['Id']);
    if (!id) return null;

    const shortlistRaw = o['shortlist'] ?? o['Shortlist'];
    const shortlist = unwrapList(shortlistRaw)
      .map((item) => this.normalizeShortlistItem(item))
      .filter((item): item is SharedSpaceShortlistItem => !!item);

    return {
      id,
      myId: str(o['myId'] ?? o['MyId']),
      myName: str(o['myName'] ?? o['MyName']) || 'Tôi',
      partnerId: str(o['partnerId'] ?? o['PartnerId']),
      partnerName: str(o['partnerName'] ?? o['PartnerName']) || 'Bạn cùng phòng',
      status: str(o['status'] ?? o['Status']) || 'Active',
      createdAt: str(o['createdAt'] ?? o['CreatedAt']),
      finalizedRoomId: str(o['finalizedRoomId'] ?? o['FinalizedRoomId']) || null,
      finalizeRequestedByUserId: str(o['finalizeRequestedByUserId'] ?? o['FinalizeRequestedByUserId']) || null,
      shortlist
    };
  }

  private normalizeShortlistItem(raw: unknown): SharedSpaceShortlistItem | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const id = str(o['id'] ?? o['Id']);
    const roomId = str(o['roomId'] ?? o['RoomId']);
    if (!id || !roomId) return null;

    return {
      id,
      roomId,
      roomTitle: str(o['roomTitle'] ?? o['RoomTitle']) || 'Phòng trọ',
      roomCategory: str(o['roomCategory'] ?? o['RoomCategory']),
      price: num(o['price'] ?? o['Price']),
      address: str(o['address'] ?? o['Address']),
      isAddedByMe: !!(o['isAddedByMe'] ?? o['IsAddedByMe']),
      myVote: (str(o['myVote'] ?? o['MyVote']) || 'None') as RoomVoteStatus,
      partnerVote: (str(o['partnerVote'] ?? o['PartnerVote']) || 'None') as RoomVoteStatus
    };
  }
}
