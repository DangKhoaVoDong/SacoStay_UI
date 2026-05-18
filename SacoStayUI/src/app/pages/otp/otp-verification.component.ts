import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, SESSION_PENDING_ROLE_KEY } from '../../services/auth.service';
import { clearTempRegisterProfile } from '../../utils/user-display';

@Component({
  selector: 'app-otp-verification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './otp-verification.component.html',
  styleUrls: ['./otp-verification.component.css']
})
export class OtpVerificationComponent implements OnInit, OnDestroy {
  otpValue: string = '';
  isLoading = false;
  countdown = 60;
  email = '';
  private countdownTimer: any;

  constructor(private router: Router, private authService: AuthService) {
    this.email = localStorage.getItem('temp_email') || 'your-email@example.com';
  }

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnDestroy(): void {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
    }
  }

  startCountdown(): void {
    if (this.countdown > 0) {
      this.countdownTimer = setTimeout(() => {
        this.countdown--;
        this.startCountdown();
      }, 1000);
    }
  }

  sanitizeOtp(value: string): string {
    return value.replace(/[^\d]/g, '').slice(0, 6);
  }

  handleVerify(): void {
    if (this.otpValue.length !== 6) {
      alert('Vui lòng nhập đủ 6 chữ số.');
      return;
    }

    this.isLoading = true;
    const tempPassword = localStorage.getItem('temp_password');
    const userRole = sessionStorage.getItem(SESSION_PENDING_ROLE_KEY) || 'tenant';

    console.log('Verifying OTP:', this.otpValue);
    console.log('Email:', this.email);
    console.log('TempPassword:', tempPassword ? '[SET]' : '[EMPTY]');

    this.authService.verifyEmailOtp(this.email, this.otpValue).subscribe({
      next: () => {
        if (tempPassword) {
          this.authService.login({ emailPhoneorUsername: this.email, password: tempPassword }).subscribe({
            next: () => {
              this.authService.finalizeNewUserSession().subscribe({
                next: () => {
                  this.isLoading = false;
                  this.router.navigate(['/']);
                },
                error: (e) => {
                  this.isLoading = false;
                  console.error('Finalize session after OTP failed', e);
                  alert('Đã đăng nhập nhưng đồng bộ hồ sơ thất bại. Bạn có thể cập nhật hồ sơ sau trong phần cài đặt.');
                  this.router.navigate(['/']);
                }
              });
            },
            error: (err) => {
              this.isLoading = false;
              console.error('Auto-login after OTP failed', err);
              alert('Xác thực thành công nhưng tự động đăng nhập thất bại. Vui lòng đăng nhập lại.');
              this.router.navigate(['/login']);
            }
          });
        } else {
          this.isLoading = false;
          clearTempRegisterProfile();
          alert('Xác thực thành công. Vui lòng đăng nhập lại.');
          this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('OTP verification failed', err);
        console.error('Error status:', err?.status);
        console.error('Error body:', err?.error);
        console.error('Error message:', err?.error?.message || err?.message);
        alert('Mã OTP không đúng hoặc đã hết hạn. Vui lòng thử lại.');
      }
    });
  }

  handleResend(): void {
    this.countdown = 60;
    this.startCountdown();
    // Mock resend logic
  }

  get isOtpComplete(): boolean {
    return this.otpValue.length === 6;
  }

  get canResend(): boolean {
    return this.countdown === 0;
  }
}
