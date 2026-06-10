import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import type { KycStatusResponse } from '../models/kyc.models';
import { normalizeKycStatus } from '../utils/kyc-display';

@Injectable({ providedIn: 'root' })
export class KycService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getMyStatus(): Observable<KycStatusResponse> {
    return this.http.get<unknown>(`${this.apiUrl}/Kyc/my-status`).pipe(map((raw) => normalizeKycStatus(raw)));
  }

  submit(front: File, back: File, selfieVideo: File, vneid?: File | null): Observable<string> {
    const fd = new FormData();
    const frontNorm = this.normalizeUploadImage(front);
    const backNorm = this.normalizeUploadImage(back);
    const video = this.normalizeUploadVideo(selfieVideo);
    fd.append('FrontIdImage', frontNorm, frontNorm.name);
    fd.append('BackIdImage', backNorm, backNorm.name);
    fd.append('SelfieVideo', video, video.name);
    if (vneid) {
      fd.append('VneidScreenshot', vneid, vneid.name);
    }
    return this.http.post(`${this.apiUrl}/Kyc/submit`, fd, { responseType: 'text' }).pipe(
      map((text) => this.parseSubmitMessage(text))
    );
  }

  private parseSubmitMessage(text: string): string {
    const t = (text ?? '').trim();
    if (!t.startsWith('{')) return t || 'Xác minh danh tính thành công.';
    try {
      const j = JSON.parse(t) as { message?: string; Message?: string };
      return (j.message ?? j.Message ?? '').trim() || 'Xác minh danh tính thành công.';
    } catch {
      return t;
    }
  }

  /** Bỏ `;codecs=...` — BE/.NET MediaTypeHeaderValue không parse được khi forward sang FPT.AI. */
  private normalizeUploadImage(file: File): File {
    const baseType = (file.type.split(';')[0] || 'image/jpeg').trim().toLowerCase();
    if (baseType !== 'image/jpeg' && baseType !== 'image/jpg' && baseType !== 'image/png') {
      return file;
    }
    const ext = baseType === 'image/png' ? 'png' : 'jpg';
    const safeName = file.name.replace(/\.[^.]+$/, '') + `.${ext}`;
    if (file.type === baseType) return file;
    return new File([file], safeName, { type: baseType });
  }

  /** Bỏ `;codecs=...` — BE/.NET không parse được khi forward sang FPT.AI. */
  private normalizeUploadVideo(file: File): File {
    const baseType = (file.type.split(';')[0] || 'video/webm').trim();
    const ext = baseType.includes('mp4') ? 'mp4' : 'webm';
    const safeName = file.name.replace(/\.[^.]+$/, '') + `.${ext}`;
    if (file.type === baseType) return file;
    return new File([file], safeName, { type: baseType });
  }
}
