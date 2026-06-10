import { Injectable, Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { resolveAppHomeUrl } from '../../environments/apply-production-host';
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
  userIdFromUser,
  clearLegacyTenantPremiumKey,
  clearMockLandlordPackage
} from '../utils/user-display';
import { clearLegacyLifestyleKeys, clearSwipeDataForUser } from '../utils/lifestyle-storage';
import { clearGuestDiscoverySession } from '../utils/guest-discovery.storage';
import { clearDiscoveryWishlist } from '../utils/discovery-wishlist-storage';
import { lastSeenStorageKey, unreadStorageKey } from '../utils/chat-unread-storage';
import { Helpers } from '../utils/helpers';
import { ChatPeerProfileService } from './chat-peer-profile.service';
import { ChatHubService } from './chat-hub.service';
import { NotificationCenterService } from './notification-center.service';

const TOKEN_KEY = 'saco_stay_token';

/** Session: vai trò đăng ký chờ OTP (không lưu profile vào localStorage). */
export const SESSION_PENDING_ROLE_KEY = 'saco_pending_user_role';

/** Session: returnUrl sau đăng ký/OTP (ví dụ đăng tin). */
export const SESSION_AUTH_RETURN_URL_KEY = 'saco_auth_return_url';

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
  Message?: string;
  title?: string;
  detail?: string;
  errorDetail?: string;
  innerError?: string;
};

function formatApiErrorBody(o: ApiErrorBody): string {
  const main = o.detail || o.message || o.Message || o.title || '';
  const extra = [o.errorDetail, o.innerError].filter((x) => x && String(x).trim()).join(' — ');
  if (main && extra) return `${main} (${extra})`;
  return main || extra || '';
}

const ACCOUNT_BANNED_MESSAGE =
  'Tài khoản của bạn đã bị khóa vĩnh viễn do vi phạm nội quy SacoStay.';

/** Đăng nhập: map lỗi API + nhận diện tài khoản bị khóa (Auth/login 400). */
export function loginErrorFromApi(err: unknown): { message: string; isBanned: boolean } {
  const e = err as { status?: number; message?: string };
  const status = e?.status;
  const apiMsg = getApiErrorMessage(err).trim();

  const looksBanned =
    status === 400 &&
    (/khóa|khoa|vi phạm|vi pham|bị ban|bi ban|locked|lockout/i.test(apiMsg) ||
      (!apiMsg && status === 400));

  if (looksBanned) {
    const message =
      apiMsg && /khóa|vi phạm/i.test(apiMsg) ? apiMsg : ACCOUNT_BANNED_MESSAGE;
    return { message, isBanned: true };
  }

  if (status === 401) {
    return {
      message: 'Email, tên đăng nhập, số điện thoại hoặc mật khẩu không đúng.',
      isBanned: false
    };
  }
  if (status === 0 || e?.message?.includes('Http failure')) {
    return {
      message: 'Không kết nối được máy chủ. Kiểm tra backend đang chạy và CORS.',
      isBanned: false
    };
  }
  if (apiMsg && !/Http failure|Unknown Error/i.test(apiMsg)) {
    return { message: apiMsg, isBanned: false };
  }
  return { message: 'Đăng nhập thất bại. Vui lòng thử lại sau.', isBanned: false };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;
  private readonly chatPeerProfiles = inject(ChatPeerProfileService);
  private readonly injector = inject(Injector);

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
    this.purgeBrowserAppState();
    this.currentUser.next(null);
    // Lazy resolve — tránh vòng phụ thuộc AuthService ↔ NotificationCenterService (màn hình trắng).
    try {
      this.injector.get(NotificationCenterService).reset();
      this.injector.get(ChatHubService).disconnect();
    } catch {
      /* optional during bootstrap */
    }
  }

  /**
   * Đăng xuất chủ động: xóa toàn bộ dữ liệu, reload cứng và về trang chủ (local + production).
   */
  logout(): void {
    try {
      this.clearSession();
    } catch (err) {
      console.error('[AuthService] logout cleanup failed', err);
      this.purgeBrowserAppState();
      this.currentUser.next(null);
    }
    this.redirectToHomeAfterLogout();
  }

  private redirectToHomeAfterLogout(): void {
    const home = resolveAppHomeUrl();
    const url = new URL(home, typeof window !== 'undefined' ? window.location.origin : undefined);
    url.searchParams.set('logout', String(Date.now()));
    window.location.replace(url.toString());
  }

  /** Dọn localStorage/sessionStorage liên quan user & app (logout / 401). */
  private purgeBrowserAppState(): void {
    const userId = userIdFromUser(this.getCurrentUser());
    if (userId) {
      clearSwipeDataForUser(userId);
      clearDiscoveryWishlist(userId);
      localStorage.removeItem(unreadStorageKey(userId));
      localStorage.removeItem(lastSeenStorageKey(userId));
      localStorage.removeItem(`saco_chat_contacts_${userId}`);
      localStorage.removeItem(`saco_lifestyle_completed_${userId}`);
      localStorage.removeItem(`saco_tenant_premium_${userId}`);
    }

    clearTempRegisterProfile();
    clearGuestDiscoverySession();
    clearLegacyLifestyleKeys();
    clearLegacyTenantPremiumKey();
    clearMockLandlordPackage();

    this.removeStorageKeys(localStorage, (key) =>
      key.startsWith('saco_') ||
      key.startsWith('temp_') ||
      key === 'user' ||
      key === 'identity_verification_status' ||
      key === 'landlord_upgrade_status' ||
      key === 'reset_email'
    );
    this.removeStorageKeys(sessionStorage, (key) => key.startsWith('saco_'));

    localStorage.removeItem(TOKEN_KEY);
    Helpers.removeToken();
    Helpers.removeUser();
    sessionStorage.clear();
  }

  private removeStorageKeys(storage: Storage, predicate: (key: string) => boolean): void {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && predicate(key)) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
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
