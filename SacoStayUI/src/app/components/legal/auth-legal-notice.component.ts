import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-legal-notice',
  standalone: true,
  imports: [RouterLink],
  styles: [
    `
      .auth-legal-notice {
        margin-top: 0;
        padding-top: 1.75rem;
        border-top: 1px solid #f3f4f6;
        text-align: center;
        font-size: 0.75rem;
        line-height: 1.55;
        color: #9ca3af;
      }

      .auth-legal-link {
        color: #ff9f43;
        font-weight: 600;
        text-decoration: none;
      }

      .auth-legal-link:hover {
        text-decoration: underline;
        color: #ff8c2a;
      }
    `
  ],
  template: `
    <p class="auth-legal-notice">
      Bằng việc tiếp tục, bạn đồng ý với
      <a routerLink="/terms" class="auth-legal-link">Điều khoản sử dụng và Chính sách bảo mật</a>
      của SacoStay.
    </p>
  `
})
export class AuthLegalNoticeComponent {}
