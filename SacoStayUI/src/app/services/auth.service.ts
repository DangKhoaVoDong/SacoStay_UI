import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import type { LoginRequest, LoginResponse, UserProfile, RegisterRequest, RegisterResponse, ForgotPasswordRequest, VerifyResetOtpRequest, ResetPasswordRequest, UserProfileUpdateDTO } from '../models/auth.models';

const TOKEN_KEY = 'saco_stay_token';

/** Backend often returns plain text or empty body on 2xx; default JSON parse would fail and surface as false errors. */
export function getApiErrorMessage(err: unknown): string {
  const e = err as { error?: unknown; message?: string };
  const body = e?.error;
  if (typeof body === 'string') {
    const t = body.trim();
    if (t.startsWith('{') || t.startsWith('[')) {
      try {
        const j = JSON.parse(t) as { message?: string; title?: string; detail?: string };
        return j?.detail || j?.message || j?.title || t;
      } catch {
        return t || e?.message || '';
      }
    }
    return t || e?.message || '';
  }
  if (body && typeof body === 'object') {
    const o = body as { message?: string; title?: string; detail?: string };
    return o.detail || o.message || o.title || '';
  }
  return e?.message || '';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  login(body: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, body).pipe(
      tap((res) => {
        if (res?.token) {
          localStorage.setItem(TOKEN_KEY, res.token);
        }
      })
    );
  }

  verifyEmailOtp(email: string, otp: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/auth/verify-email-otp?email=${email}&otp=${otp}`,
      {},
      {
        responseType: 'text'
      }
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('user');
    window.location.reload();
  }

  register(body: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/auth/register`, body);
  }

  getProfile(): Observable<UserProfile | null> {
    return this.http.get<UserProfile>(`${this.apiUrl}/auth/profile`).pipe(
      catchError(() => of(null))
    );
  }

  updateProfile(body: UserProfileUpdateDTO): Observable<string> {
    return this.http.put(`${this.apiUrl}/Auth/update-profile`, body, {
      responseType: 'text'
    });
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
