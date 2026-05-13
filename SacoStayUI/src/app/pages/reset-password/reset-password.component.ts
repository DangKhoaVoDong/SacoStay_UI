import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, getApiErrorMessage } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent {
  resetPasswordForm!: FormGroup;
  loading = false;
  error = '';
  email = '';

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
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
    const password = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  submit(): void {
    if (this.resetPasswordForm.invalid) {
      Object.values(this.resetPasswordForm.controls).forEach(control => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }

    this.loading = true;
    this.error = '';

    const resetData = {
      email: this.email,
      newPassword: this.resetPasswordForm.value.newPassword,
      confirmPassword: this.resetPasswordForm.value.confirmPassword
    };

    this.authService.resetPassword(resetData).subscribe({
      next: () => {
        this.loading = false;
        // Clear the stored email
        localStorage.removeItem('reset_email');
        alert('Đặt lại mật khẩu thành công!');
        this.router.navigate(['/login']);
      },
      error: (err: unknown) => {
        this.loading = false;
        this.error = getApiErrorMessage(err) || 'Đặt lại mật khẩu thất bại. Thử lại sau.';
        alert(this.error);
      }
    });
  }

  backToLogin(): void {
    this.router.navigate(['/login']);
  }
}
