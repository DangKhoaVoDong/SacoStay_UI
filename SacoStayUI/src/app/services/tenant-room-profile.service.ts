import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import type {
  TenantRoomProfile,
  TenantRoomProfilePayload,
  TenantRoomProfileSaveOptions,
  TenantRoomProfileSaveResult
} from '../models/tenant-room-profile.models';

function normalizeProfile(raw: unknown): TenantRoomProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const amenitiesRaw = o['amenities'] ?? o['Amenities'];
  const amenities = Array.isArray(amenitiesRaw)
    ? amenitiesRaw.map((v) => String(v).trim()).filter(Boolean)
    : [];
  const imagesRaw = o['images'] ?? o['Images'];
  const images = Array.isArray(imagesRaw)
    ? imagesRaw.map((v) => String(v).trim()).filter(Boolean)
    : [];

  const userIdRaw = o['userId'] ?? o['UserId'];
  const updatedAtRaw = o['updatedAt'] ?? o['UpdatedAt'];
  const priceRaw = o['price'] ?? o['Price'];
  const priceNum = priceRaw != null && priceRaw !== '' ? Number(priceRaw) : NaN;
  const price = Number.isFinite(priceNum) && priceNum > 0 ? priceNum : null;

  return {
    userId: userIdRaw != null ? String(userIdRaw) : null,
    city: String(o['city'] ?? o['City'] ?? '').trim() || null,
    district: String(o['district'] ?? o['District'] ?? '').trim() || null,
    maxPeople: Number(o['maxPeople'] ?? o['MaxPeople']) || null,
    price,
    amenities,
    extraNotes: String(o['extraNotes'] ?? o['ExtraNotes'] ?? '').trim() || null,
    images,
    updatedAt: updatedAtRaw != null ? String(updatedAtRaw) : null
  };
}

function unwrapProfileResponse(raw: unknown): TenantRoomProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o['data'] != null) return normalizeProfile(o['data']);
  return normalizeProfile(raw);
}

function extractMessage(raw: unknown, fallback: string): string {
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (!raw || typeof raw !== 'object') return fallback;
  const msg = (raw as Record<string, unknown>)['message'] ?? (raw as Record<string, unknown>)['Message'];
  return String(msg ?? fallback);
}

@Injectable({ providedIn: 'root' })
export class TenantRoomProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  /** Khớp controller BE: api/TenantRoomProfile */
  private readonly basePath = `${this.apiUrl}/TenantRoomProfile`;

  getMyProfile(): Observable<TenantRoomProfile | null> {
    return this.http.get<unknown>(`${this.basePath}/me`).pipe(
      map((raw) => normalizeProfile(raw)),
      catchError((err) => (err?.status === 404 ? of(null) : throwError(() => err)))
    );
  }

  /** Lấy thông tin phòng theo userId — GET /TenantRoomProfile/{userId} (AllowAnonymous). */
  getByUserId(userId: string): Observable<TenantRoomProfile | null> {
    const id = (userId ?? '').trim();
    if (!id) return of(null);
    return this.http.get<unknown>(`${this.basePath}/${encodeURIComponent(id)}`).pipe(
      map((raw) => normalizeProfile(raw)),
      catchError((err) => (err?.status === 404 ? of(null) : throwError(() => err)))
    );
  }

  create(payload: TenantRoomProfilePayload): Observable<TenantRoomProfileSaveResult> {
    return this.http.post<unknown>(this.basePath, payload).pipe(
      map((raw) => ({
        message: extractMessage(raw, 'Tạo thông tin phòng thành công!'),
        profile: unwrapProfileResponse(raw)
      }))
    );
  }

  update(payload: TenantRoomProfilePayload): Observable<TenantRoomProfileSaveResult> {
    return this.http.put<unknown>(this.basePath, payload).pipe(
      map((raw) => ({
        message: extractMessage(raw, 'Cập nhật thông tin phòng thành công!'),
        profile: unwrapProfileResponse(raw)
      }))
    );
  }

  uploadImages(files: File[]): Observable<TenantRoomProfileSaveResult> {
    const form = new FormData();
    for (const file of files) {
      form.append('files', file, file.name);
    }
    return this.http.post<unknown>(`${this.basePath}/images`, form).pipe(
      map((raw) => ({
        message: extractMessage(raw, 'Upload ảnh thành công!'),
        profile: unwrapProfileResponse(raw)
      }))
    );
  }

  deleteImage(imageUrl: string): Observable<TenantRoomProfileSaveResult> {
    return this.http
      .delete<unknown>(`${this.basePath}/images`, {
        params: { imageUrl }
      })
      .pipe(
        map((raw) => ({
          message: extractMessage(raw, 'Xóa ảnh thành công!'),
          profile: unwrapProfileResponse(raw)
        }))
      );
  }

  save(options: TenantRoomProfileSaveOptions): Observable<TenantRoomProfileSaveResult> {
    return this.getMyProfile().pipe(
      switchMap((existing) => (existing ? this.update(options.payload) : this.create(options.payload))),
      switchMap((result) => {
        const pending = options.imageFiles ?? [];
        if (!pending.length) return of(result);
        return this.uploadImages(pending).pipe(
          map((uploaded) => ({
            message: uploaded.message || result.message,
            profile: uploaded.profile ?? result.profile
          }))
        );
      })
    );
  }
}
