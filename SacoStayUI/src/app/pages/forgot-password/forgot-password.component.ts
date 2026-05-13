import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, getApiErrorMessage } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  forgotPasswordForm!: FormGroup;
  loading = false;
  error = '';
  success = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.initForm();
  }

  private initForm(): void {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  submit(): void {
    if (this.forgotPasswordForm.invalid) {
      Object.values(this.forgotPasswordForm.controls).forEach(control => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }

    this.loading = true;
    this.error = '';

    const email = this.forgotPasswordForm.value.email;

    this.authService.forgotPassword({ email }).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        // Store email for next steps
        localStorage.setItem('reset_email', email);
        // Navigate to verify OTP page
        setTimeout(() => {
          this.router.navigate(['/verify-reset-otp']);
        }, 1500);
      },
      error: (err: unknown) => {
        this.loading = false;
        this.error = getApiErrorMessage(err) || 'Gửi OTP thất bại. Thử lại sau.';
        alert(this.error);
      }
    });
  }

  backToLogin(): void {
    this.router.navigate(['/login']);
  }
}
