import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, getApiErrorMessage } from '../../services/auth.service';
import { UiToastService } from '../../services/ui-toast.service';

@Component({
  selector: 'app-verify-reset-otp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './verify-reset-otp.component.html',
  styleUrls: ['./verify-reset-otp.component.css']
})
export class VerifyResetOtpComponent {
  otpForm!: FormGroup;
  loading = false;
  error = '';
  email = '';
  private readonly toast = inject(UiToastService);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.initForm();
    this.email = localStorage.getItem('reset_email') || '';
    if (!this.email) {
      this.router.navigate(['/forgot-password']);
    }
  }

  private initForm(): void {
    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  submit(): void {
    if (this.otpForm.invalid) {
      Object.values(this.otpForm.controls).forEach(control => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }

    this.loading = true;
    this.error = '';

    const otp = this.otpForm.value.otp;

    this.authService.verifyResetOtp({ email: this.email, otp }).subscribe({
      next: () => {
        this.loading = false;
        // Navigate to reset password page
        this.router.navigate(['/reset-password']);
      },
      error: (err: unknown) => {
        this.loading = false;
        this.error = getApiErrorMessage(err) || 'OTP không hợp lệ. Thử lại sau.';
        this.toast.error(this.error);
      }
    });
  }

  resendOtp(): void {
    this.loading = true;
    this.authService.forgotPassword({ email: this.email }).subscribe({
      next: () => {
        this.loading = false;
        this.toast.success('OTP mới đã được gửi đến email của bạn!');
      },
      error: (err: unknown) => {
        this.loading = false;
        this.error = getApiErrorMessage(err) || 'Gửi OTP thất bại. Thử lại sau.';
        this.toast.error(this.error);
      }
    });
  }

  backToForgot(): void {
    this.router.navigate(['/forgot-password']);
  }
}
