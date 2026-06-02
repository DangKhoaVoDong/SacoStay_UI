import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService, loginErrorFromApi, SESSION_PENDING_ROLE_KEY } from '../../services/auth.service';
import { clearTempRegisterProfile, isAdminUser } from '../../utils/user-display';
import { AuthLegalNoticeComponent } from '../../components/legal/auth-legal-notice.component';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthLegalNoticeComponent],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent implements OnInit {
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

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.initForms();
    this.syncModeFromRoute();
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.syncModeFromRoute());
  }

  private syncModeFromRoute(): void {
    const path = this.router.url.split('?')[0];
    this.currentMode = path.includes('/register') ? 'register' : 'login';
    this.cdr.detectChanges();
  }

  private navigateAfterAuth(): void {
    if (isAdminUser(this.authService.getCurrentUser())) {
      void this.router.navigateByUrl('/admin');
      return;
    }
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const target =
      returnUrl && !returnUrl.startsWith('/login') && !returnUrl.startsWith('/register')
        ? returnUrl
        : '/';
    void this.router.navigateByUrl(target);
  }

  private initForms(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
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
      emailPhoneorUsername: this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    this.authService.login(loginData).subscribe({
      next: () => {
        this.loginLoading = false;
        clearTempRegisterProfile();
        this.authService.refreshProfile().subscribe({
          next: () => {
            alert('Đăng nhập thành công');
            this.navigateAfterAuth();
          },
          error: () => {
            alert('Đăng nhập thành công nhưng không tải được hồ sơ từ máy chủ.');
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
          alert(message);
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
      alert(this.registerError);
      return;
    }

    if (!this.registerForm.value.email?.trim()) {
      this.registerError = 'Email không được để trống.';
      this.registerLoading = false;
      alert(this.registerError);
      return;
    }

    if (!this.registerForm.value.password?.trim()) {
      this.registerError = 'Mật khẩu không được để trống.';
      this.registerLoading = false;
      alert(this.registerError);
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

        // Navigate to OTP verification
        this.router.navigate(['/otp-verification']);
      },
      error: (err: any) => {
        this.registerLoading = false;
        console.log('Registration error:', err);
        console.log('Error status:', err?.status);
        console.log('Error body:', err?.error);
        console.log('Error body JSON:', JSON.stringify(err?.error, null, 2));

        // Handle array of validation errors
        if (Array.isArray(err?.error)) {
          const errorMessages = err.error.map((e: any) => e.description || e.message || JSON.stringify(e)).join(', ');
          this.registerError = errorMessages || 'Đăng ký thất bại. Thử lại sau.';
        } else if (typeof err?.error === 'object') {
          // Handle object error responses
          const errorMessages = Object.values(err?.error || {}).flat().join(', ');
          this.registerError = errorMessages || err?.error?.message || err?.error?.title || 'Đăng ký thất bại. Thử lại sau.';
        } else {
          this.registerError = err?.error?.message || err?.error?.title || 'Đăng ký thất bại. Thử lại sau.';
        }

        alert(this.registerError);
      }
    });
  }
}
