import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { normalizeAuthUser, clearTempRegisterProfile } from '../../utils/user-display';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent implements OnInit {
  currentMode: 'login' | 'register' = 'login';

  loginForm!: FormGroup;
  registerForm!: FormGroup;

  loginLoading = false;
  registerLoading = false;
  loginError = '';
  registerError = '';

  selectedRole: 'tenant' | 'landlord' = 'tenant';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.initForms();
    // Lấy mode từ URL query params
    const urlParams = new URLSearchParams(window.location.search);
    this.currentMode = (urlParams.get('mode') as 'login' | 'register') || 'login';
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

  switchMode(mode: 'login' | 'register'): void {
    this.currentMode = mode;
    // Cập nhật URL mà không reload
    const url = new URL(window.location.href);
    if (mode === 'login') {
      url.searchParams.delete('mode');
    } else {
      url.searchParams.set('mode', 'register');
    }
    window.history.replaceState({}, '', url.toString());
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

    const loginData = {
      emailPhoneorUsername: this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    this.authService.login(loginData).subscribe({
      next: (response: any) => {
        this.loginLoading = false;
        const rawUser =
          response.user ??
          (response.token
            ? { email: this.loginForm.value.email?.trim() }
            : null);
        if (rawUser) {
          localStorage.setItem('user', JSON.stringify(normalizeAuthUser(rawUser)));
        }
        clearTempRegisterProfile();
        alert('Đăng nhập thành công');
        this.router.navigate(['/']);
      },
      error: (err: any) => {
        this.loginLoading = false;
        const status = err?.status;
        if (status === 401) {
          this.loginError = 'Email/số điện thoại hoặc mật khẩu không đúng.';
        } else if (status === 0 || err?.message?.includes('Http failure')) {
          this.loginError = 'Không kết nối được API hoặc sai tên đăng nhập/mật khẩu. Nếu đã bật backend, kiểm tra CORS.';
        } else {
          this.loginError = err?.error?.message || 'Đăng nhập thất bại. Thử lại sau.';
        }
        alert(this.loginError);
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
        localStorage.setItem('user_role', registerData.role);

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
