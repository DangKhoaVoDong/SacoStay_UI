import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { getApiErrorMessage } from './auth.service';
import { isAvatarMediaUrl, profileImageUrlsFromApiList } from '../utils/user-display';

export const MAX_PROFILE_PHOTOS = 5;

function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function safeFileName(name: string): string {
  const base = name.replace(/[^\w.\-() ]+/g, '_').trim() || 'photo.jpg';
  return base.length > 120 ? base.slice(-120) : base;
}

export function profileImagesApiErrorMessage(err: unknown, fallback: string): string {
  return getApiErrorMessage(err) || fallback;
}

@Injectable({ providedIn: 'root' })
export class UserProfileImagesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** GET /api/User/profile-images */
  getMyImages(): Observable<string[]> {
    return this.http.get<unknown>(`${this.apiUrl}/User/profile-images`).pipe(
      map((raw) =>
        profileImageUrlsFromApiList(raw).filter((url) => !isAvatarMediaUrl(url))
      )
    );
  }

  /** POST /api/User/profile-images — multipart Files[] */
  upload(files: File[]): Observable<string[]> {
    const fd = new FormData();
    files.forEach((f) => fd.append('Files', f, safeFileName(f.name)));
    return this.http.post<unknown>(`${this.apiUrl}/User/profile-images`, fd).pipe(
      map((raw) => {
        if (!raw || typeof raw !== 'object') return [];
        const o = raw as Record<string, unknown>;
        const imgs = o['images'] ?? o['Images'];
        if (Array.isArray(imgs)) {
          return imgs.map((x) => str(x)).filter(Boolean);
        }
        return profileImageUrlsFromApiList(raw);
      })
    );
  }

  /** DELETE /api/User/profile-images?imageUrl= */
  delete(imageUrl: string): Observable<void> {
    const q = encodeURIComponent(imageUrl);
    return this.http.delete<void>(`${this.apiUrl}/User/profile-images?imageUrl=${q}`);
  }
}
