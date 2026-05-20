import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import type {
  LoginRequest,
  LoginResponse,
  UserProfile,
  RegisterRequest,
  RegisterResponse,
  ForgotPasswordRequest,
  VerifyResetOtpRequest,
  ResetPasswordRequest,
  UserProfileUpdateDTO
} from '../models/auth.models';
import {
  normalizeAuthUser,
  readTempRegisterProfile,
  clearTempRegisterProfile,
  applyTempRegisterProfileToUser,
  userIdFromUser
} from '../utils/user-display';
import { clearLegacyLifestyleKeys, clearSwipeDataForUser } from '../utils/lifestyle-storage';
import { ChatPeerProfileService } from './chat-peer-profile.service';

const TOKEN_KEY = 'saco_stay_token';

/** Session: vai trò đăng ký chờ OTP (không lưu profile vào localStorage). */
export const SESSION_PENDING_ROLE_KEY = 'saco_pending_user_role';

/** Backend often returns plain text or empty body on 2xx; default JSON parse would fail and surface as false errors. */
export function getApiErrorMessage(err: unknown): string {
  const e = err as { error?: unknown; message?: string };
  const body = e?.error;
  if (typeof body === 'string') {
    const t = body.trim();
    if (t.startsWith('{') || t.startsWith('[')) {
      try {
        const j = JSON.parse(t) as ApiErrorBody;
        return formatApiErrorBody(j) || t;
      } catch {
        return t || e?.message || '';
      }
    }
    return t || e?.message || '';
  }
  if (body && typeof body === 'object') {
    return formatApiErrorBody(body as ApiErrorBody) || '';
  }
  return e?.message || '';
}

type ApiErrorBody = {
  message?: string;
  title?: string;
  detail?: string;
  errorDetail?: string;
  innerError?: string;
};

function formatApiErrorBody(o: ApiErrorBody): string {
  const main = o.detail || o.message || o.title || '';
  const extra = [o.errorDetail, o.innerError].filter((x) => x && String(x).trim()).join(' — ');
  if (main && extra) return `${main} (${extra})`;
  return main || extra || '';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;
  private readonly chatPeerProfiles = inject(ChatPeerProfileService);

  private readonly currentUser = new BehaviorSubject<UserProfile | null>(null);
  readonly currentUser$ = this.currentUser.asObservable();

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUser.value;
  }

  login(body: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/Auth/login`, body).pipe(
      tap((res) => {
        if (res?.token) {
          localStorage.setItem(TOKEN_KEY, res.token);
        }
        if (res?.user) {
          const normalized = normalizeAuthUser(res.user) as unknown as UserProfile;
          this.currentUser.next(normalized);
          this.chatPeerProfiles.cacheFromAuthUser(normalized);
        }
      })
    );
  }

  verifyEmailOtp(email: string, otp: string): Observable<string> {
    return this.http.post(`${this.apiUrl}/Auth/verify-email-otp?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`, {}, {
      responseType: 'text'
    });
  }

  /** Xóa token và state — không reload trang (dùng từ interceptor khi 401). */
  clearSession(): void {
    const userId = userIdFromUser(this.getCurrentUser());
    if (userId) {
      clearSwipeDataForUser(userId);
    }
    clearLegacyLifestyleKeys();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('user');
    sessionStorage.removeItem(SESSION_PENDING_ROLE_KEY);
    localStorage.removeItem('identity_verification_status');
    localStorage.removeItem('landlord_upgrade_status');
    this.currentUser.next(null);
  }

  /** Đăng xuất chủ động — không reload toàn trang (tránh vòng lặp với interceptor). */
  logout(): void {
    this.clearSession();
    void this.router.navigateByUrl('/');
  }

  register(body: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/Auth/register`, body);
  }

  /** GET /api/Auth/profile — dữ liệu user từ DB. */
  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/Auth/profile`);
  }

  /** Cập nhật state trong app từ API (không ghi localStorage user). */
  refreshProfile(): Observable<UserProfile | null> {
    if (!this.token) {
      this.currentUser.next(null);
      return of(null);
    }
    return this.getProfile().pipe(
      map((p) => normalizeAuthUser(p as unknown as Record<string, unknown>) as unknown as UserProfile),
      tap((normalized) => {
        this.currentUser.next(normalized);
        this.chatPeerProfiles.cacheFromAuthUser(normalized);
      }),
      catchError(() => of(this.getCurrentUser()))
    );
  }

  /**
   * PUT /api/Auth/update-profile — multipart/form-data (FirstName, LastName, …).
   * Không gửi JSON: backend chỉ bind form fields PascalCase.
   */
  updateProfile(body: UserProfileUpdateDTO, avatarFile?: File | null): Observable<string> {
    return this.http.put(`${this.apiUrl}/Auth/update-profile`, this.toProfileFormData(body, avatarFile), {
      responseType: 'text'
    });
  }

  /** DELETE /api/Auth/delete-profile-image?imageUrl=... */
  deleteProfileImage(imageUrl?: string | null): Observable<string> {
    const url = (imageUrl ?? '').trim();
    const options = { responseType: 'text' as const, params: url ? { imageUrl: url } : undefined };
    return this.http.delete(`${this.apiUrl}/Auth/delete-profile-image`, options);
  }

  private toProfileFormData(body: UserProfileUpdateDTO, avatarFile?: File | null): FormData {
    const fd = new FormData();
    const append = (key: string, value: string | null | undefined) => {
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        fd.append(key, String(value).trim());
      }
    };

    append('FirstName', body.firstName ?? undefined);
    append('LastName', body.lastName ?? undefined);
    append('PhoneNumber', body.phoneNumber ?? undefined);
    append('Job', body.job ?? undefined);
    append('LivingArea', body.livingArea ?? undefined);
    append('Bio', body.bio ?? undefined);
    append('DateOfBirth', body.dateOfBirth ?? undefined);

    if (body.gender !== null && body.gender !== undefined) {
      fd.append('Gender', body.gender ? 'true' : 'false');
    }

    if (avatarFile) {
      fd.append('AvatarFile', avatarFile, avatarFile.name);
    }

    return fd;
  }

  /**
   * Sau đăng ký + OTP: ghi họ tên/SĐT lên DB từ snapshot form (nếu backend chưa trả đủ sau GET profile).
   * Luôn gọi refreshProfile() trước (một lần) để có baseline; có body thì PUT rồi refresh lại.
   */
  finalizeNewUserSession(): Observable<void> {
    const t = readTempRegisterProfile();
    const syncBody: UserProfileUpdateDTO = {};
    const fn = t.firstName.trim();
    const ln = t.lastName.trim();
    const ph = t.phoneNumber.trim();
    if (fn) syncBody.firstName = fn;
    if (ln) syncBody.lastName = ln;
    if (ph) syncBody.phoneNumber = ph;

    const sync$ =
      fn || ln || ph
        ? this.updateProfile(syncBody).pipe(switchMap(() => this.refreshProfile()))
        : this.refreshProfile();

    return sync$.pipe(
      map((p) => {
        const merged = normalizeAuthUser(
          applyTempRegisterProfileToUser(
            (p ?? this.getCurrentUser()) as unknown as Record<string, unknown> | null
          )
        ) as unknown as UserProfile;
        this.currentUser.next(merged);
        return void 0;
      }),
      tap(() => {
        clearTempRegisterProfile();
        sessionStorage.removeItem(SESSION_PENDING_ROLE_KEY);
      })
    );
  }

  forgotPassword(body: ForgotPasswordRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/Auth/forgot-password`, body, {
      responseType: 'text'
    });
  }

  verifyResetOtp(body: VerifyResetOtpRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/Auth/verify-reset-otp`, body, {
      responseType: 'text'
    });
  }

  resetPassword(body: ResetPasswordRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/Auth/reset-password`, body, {
      responseType: 'text'
    });
  }
}
