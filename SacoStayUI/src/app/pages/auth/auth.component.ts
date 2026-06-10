import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import {
  AuthService,
  getApiErrorMessage,
  loginErrorFromApi,
  SESSION_AUTH_RETURN_URL_KEY,
  SESSION_PENDING_ROLE_KEY
} from '../../services/auth.service';
import { UiToastService } from '../../services/ui-toast.service';
import {
  isCreateListingReturnUrl,
  resolvePostLoginUrl,
  sanitizeReturnUrl
} from '../../utils/auth-navigation';
import { clearGuestDiscoverySession, markGuestRegisterSync } from '../../utils/guest-discovery.storage';
import { clearTempRegisterProfile, isAdminUser, isLandlordUser } from '../../utils/user-display';
import { AuthLegalNoticeComponent } from '../../components/legal/auth-legal-notice.component';
import { SACOSTAY_LOGO_CLASS, SACOSTAY_LOGO_URL } from '../../utils/brand-assets';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthLegalNoticeComponent],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent implements OnInit {
  readonly logoUrl = SACOSTAY_LOGO_URL;
  readonly logoClass = SACOSTAY_LOGO_CLASS;
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  currentMode: 'login' | 'register' = 'login';

  loginForm!: FormGroup;
  registerForm!: FormGroup;

  loginLoading = false;
  registerLoading = false;
  loginError = '';
  loginBanned = false;
  registerError = '';

  selectedRole: 'tenant' | 'landlord' = 'tenant';

  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(UiToastService);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.initForms();
    this.syncModeFromRoute();
    this.syncRoleFromRoute();
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.syncModeFromRoute();
        this.syncRoleFromRoute();
      });
  }

  private syncModeFromRoute(): void {
    const path = this.router.url.split('?')[0];
    this.currentMode = path.includes('/register') ? 'register' : 'login';
    this.cdr.detectChanges();
  }

  get requiresLandlordAuth(): boolean {
    return this.route.snapshot.queryParamMap.get('role') === 'landlord';
  }

  get authQueryParams(): Record<string, string> {
    const params: Record<string, string> = {};
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const role = this.route.snapshot.queryParamMap.get('role');
    const intent = this.route.snapshot.queryParamMap.get('intent');
    if (returnUrl) params['returnUrl'] = returnUrl;
    if (role) params['role'] = role;
    if (intent) params['intent'] = intent;
    return params;
  }

  private syncRoleFromRoute(): void {
    const role = this.route.snapshot.queryParamMap.get('role');
    if (role === 'landlord') {
      this.selectedRole = 'landlord';
      this.cdr.detectChanges();
    }
  }

  private navigateAfterAuth(): void {
    if (isAdminUser(this.authService.getCurrentUser())) {
      void this.router.navigateByUrl('/admin');
      return;
    }
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const target = resolvePostLoginUrl(returnUrl);
    if (isCreateListingReturnUrl(target) && !isLandlordUser(this.authService.getCurrentUser())) {
      this.toast.error('Chỉ có thể đăng tin với vai trò chủ trọ.');
      void this.router.navigateByUrl('/');
      return;
    }
    sessionStorage.removeItem(SESSION_AUTH_RETURN_URL_KEY);
    void this.router.navigateByUrl(target);
  }

  private initForms(): void {
    this.loginForm = this.fb.group({
      identifier: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required]]
    });

    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      username: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10,11}$')]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  selectRole(role: 'tenant' | 'landlord'): void {
    this.selectedRole = role;
  }

  submitLogin(): void {
    if (this.loginForm.invalid) {
      Object.values(this.loginForm.controls).forEach(control => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }

    this.loginLoading = true;
    this.loginError = '';
    this.loginBanned = false;

    const loginData = {
      emailPhoneorUsername: String(this.loginForm.value.identifier ?? '').trim(),
      password: this.loginForm.value.password
    };

    this.authService.login(loginData).subscribe({
      next: () => {
        this.loginLoading = false;
        clearGuestDiscoverySession();
        clearTempRegisterProfile();
        this.authService.refreshProfile().subscribe({
          next: () => {
            this.toast.success('Đăng nhập thành công');
            this.navigateAfterAuth();
          },
          error: () => {
            this.toast.info('Đăng nhập thành công nhưng không tải được hồ sơ từ máy chủ.');
            this.navigateAfterAuth();
          }
        });
      },
      error: (err: unknown) => {
        this.loginLoading = false;
        const { message, isBanned } = loginErrorFromApi(err);
        this.loginError = message;
        this.loginBanned = isBanned;
        this.cdr.markForCheck();
        if (!isBanned) {
          this.toast.error(message);
        }
      }
    });
  }

  submitRegister(): void {
    if (this.registerForm.invalid) {
      Object.values(this.registerForm.controls).forEach(control => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }

    this.registerLoading = true;
    this.registerError = '';

    const firstName = (this.registerForm.value.firstName || '').trim();
    const lastName = (this.registerForm.value.lastName || '').trim();

    if (!this.registerForm.value.username?.trim()) {
      this.registerError = 'Tên đăng nhập không được để trống.';
      this.registerLoading = false;
      this.toast.error(this.registerError);
      return;
    }

    if (!this.registerForm.value.email?.trim()) {
      this.registerError = 'Email không được để trống.';
      this.registerLoading = false;
      this.toast.error(this.registerError);
      return;
    }

    if (!this.registerForm.value.password?.trim()) {
      this.registerError = 'Mật khẩu không được để trống.';
      this.registerLoading = false;
      this.toast.error(this.registerError);
      return;
    }

    const registerData = {
      userName: this.registerForm.value.username.trim(),
      email: this.registerForm.value.email,
      password: this.registerForm.value.password,
      confirmPassword: this.registerForm.value.confirmPassword,
      firstName,
      lastName,
      phoneNumber: this.registerForm.value.phone,
      role: this.selectedRole
    };

    console.log('Registration data being sent:', JSON.stringify(registerData, null, 2));

    this.authService.register(registerData).subscribe({
      next: (response: any) => {
        this.registerLoading = false;

        // Store temp data for OTP verification and auto-login after verification
        localStorage.setItem('temp_email', registerData.email);
        localStorage.setItem('temp_password', registerData.password);
        localStorage.setItem('temp_userName', registerData.userName);
        localStorage.setItem('temp_firstName', registerData.firstName);
        localStorage.setItem('temp_lastName', registerData.lastName);
        localStorage.setItem('temp_phone', registerData.phoneNumber || '');
        localStorage.setItem('temp_name', `${registerData.firstName} ${registerData.lastName}`.trim());
        sessionStorage.setItem(SESSION_PENDING_ROLE_KEY, registerData.role);

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const intent = this.route.snapshot.queryParamMap.get('intent');
        if (intent === 'guest-discovery' && returnUrl) {
          markGuestRegisterSync(returnUrl);
        }
        const safeReturnUrl = sanitizeReturnUrl(returnUrl);
        if (safeReturnUrl) {
          sessionStorage.setItem(SESSION_AUTH_RETURN_URL_KEY, safeReturnUrl);
        }

        // Navigate to OTP verification
        this.router.navigate(['/otp-verification']);
      },
      error: (err: unknown) => {
        this.registerLoading = false;
        let message = getApiErrorMessage(err);
        const body = (err as { error?: unknown })?.error;
        if (Array.isArray(body)) {
          message = body
            .map((e: { description?: string; message?: string }) => e.description || e.message || '')
            .filter(Boolean)
            .join(', ');
        }
        if (!message) {
          message = 'Đăng ký thất bại. Thử lại sau.';
        }
        this.registerError = message;
        this.cdr.markForCheck();
        this.toast.error(message);
      }
    });
  }
}
