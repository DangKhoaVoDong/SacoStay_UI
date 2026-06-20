import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, SESSION_AUTH_RETURN_URL_KEY, SESSION_PENDING_ROLE_KEY } from '../../services/auth.service';
import { sanitizeReturnUrl } from '../../utils/auth-navigation';
import { shouldSyncGuestAfterRegister } from '../../utils/guest-discovery.storage';
import { clearTempRegisterProfile } from '../../utils/user-display';
import { UiToastService } from '../../services/ui-toast.service';
import { OtpDigitInputComponent } from '../../components/shared/otp-digit-input/otp-digit-input.component';

@Component({
  selector: 'app-otp-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, OtpDigitInputComponent],
  templateUrl: './otp-verification.component.html'
})
export class OtpVerificationComponent implements OnInit, OnDestroy {
  otpValue = '';
  isLoading = false;
  countdown = 60;
  email = '';
  private countdownTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly toast = inject(UiToastService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  constructor() {
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

  handleVerify(): void {
    if (this.otpValue.length !== 6) {
      this.toast.error('Vui lòng nhập đủ 6 chữ số.');
      return;
    }

    this.isLoading = true;
    const tempPassword = localStorage.getItem('temp_password');
    const userRole = sessionStorage.getItem(SESSION_PENDING_ROLE_KEY) || 'tenant';

    this.authService.verifyEmailOtp(this.email, this.otpValue).subscribe({
      next: () => {
        if (tempPassword) {
          this.authService.login({ emailPhoneorUsername: this.email, password: tempPassword }).subscribe({
            next: () => {
              this.authService.finalizeNewUserSession().subscribe({
                next: () => {
                  this.isLoading = false;
                  this.navigateAfterRegistration(userRole);
                },
                error: () => {
                  this.isLoading = false;
                  this.toast.info('Đã đăng nhập nhưng đồng bộ hồ sơ thất bại. Bạn có thể cập nhật hồ sơ sau trong phần cài đặt.');
                  this.navigateAfterRegistration(userRole);
                }
              });
            },
            error: () => {
              this.isLoading = false;
              this.toast.info('Xác thực thành công nhưng tự động đăng nhập thất bại. Vui lòng đăng nhập lại.');
              this.router.navigate(['/login']);
            }
          });
        } else {
          this.isLoading = false;
          clearTempRegisterProfile();
          this.toast.success('Xác thực thành công. Vui lòng đăng nhập lại.');
          this.router.navigate(['/login']);
        }
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Mã OTP không đúng hoặc đã hết hạn. Vui lòng thử lại.');
      }
    });
  }

  handleResend(): void {
    this.countdown = 60;
    this.startCountdown();
  }

  get isOtpComplete(): boolean {
    return this.otpValue.length === 6;
  }

  private navigateAfterRegistration(userRole: string): void {
    const storedReturnUrl = sanitizeReturnUrl(sessionStorage.getItem(SESSION_AUTH_RETURN_URL_KEY));
    let returnUrl = storedReturnUrl || '/profile-setup';
    if (!storedReturnUrl) {
      if (shouldSyncGuestAfterRegister()) {
        returnUrl = '/discovery';
      } else if (userRole === 'landlord') {
        returnUrl = '/landlord-profile';
      }
    }
    void this.router.navigate(['/identity-verification'], { queryParams: { returnUrl } });
  }
}
