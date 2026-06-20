import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, getApiErrorMessage } from '../../services/auth.service';
import { UiToastService } from '../../services/ui-toast.service';
import { OtpDigitInputComponent } from '../../components/shared/otp-digit-input/otp-digit-input.component';

@Component({
  selector: 'app-verify-reset-otp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OtpDigitInputComponent],
  templateUrl: './verify-reset-otp.component.html'
})
export class VerifyResetOtpComponent implements OnInit, OnDestroy {
  otpForm!: FormGroup;
  loading = false;
  email = '';
  countdown = 60;
  private countdownTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly toast = inject(UiToastService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  constructor() {
    this.initForm();
    this.email = localStorage.getItem('reset_email') || '';
    if (!this.email) {
      void this.router.navigate(['/forgot-password']);
    }
  }

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnDestroy(): void {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
    }
  }

  private initForm(): void {
    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  private startCountdown(): void {
    if (this.countdown > 0) {
      this.countdownTimer = setTimeout(() => {
        this.countdown--;
        this.startCountdown();
      }, 1000);
    }
  }

  submit(): void {
    if (this.otpForm.invalid) {
      Object.values(this.otpForm.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }

    this.loading = true;
    const otp = this.otpForm.value.otp;

    this.authService.verifyResetOtp({ email: this.email, otp }).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigate(['/reset-password']);
      },
      error: (err: unknown) => {
        this.loading = false;
        this.toast.error(getApiErrorMessage(err) || 'OTP không hợp lệ. Thử lại sau.');
      }
    });
  }

  resendOtp(): void {
    if (this.loading) return;
    this.loading = true;
    this.authService.forgotPassword({ email: this.email }).subscribe({
      next: () => {
        this.loading = false;
        this.countdown = 60;
        this.startCountdown();
        this.toast.success('OTP mới đã được gửi đến email của bạn!');
      },
      error: (err: unknown) => {
        this.loading = false;
        this.toast.error(getApiErrorMessage(err) || 'Gửi OTP thất bại. Thử lại sau.');
      }
    });
  }

  backToForgot(): void {
    void this.router.navigate(['/forgot-password']);
  }
}
