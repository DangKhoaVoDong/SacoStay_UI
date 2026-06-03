import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiToastService } from '../../../services/ui-toast.service';

@Component({
  selector: 'app-ui-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (toast.toast(); as t) {
      <div class="ui-toast-host" role="status" aria-live="polite">
        <div class="ui-toast" [class]="'ui-toast--' + t.kind">
          <p class="ui-toast__text">{{ t.message }}</p>
          <button type="button" class="ui-toast__close" (click)="toast.dismiss()" aria-label="Đóng">×</button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .ui-toast-host {
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 10000;
        max-width: min(24rem, calc(100vw - 2rem));
      }
      .ui-toast {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
        border-radius: 0.75rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
        border: 1px solid transparent;
        animation: ui-toast-in 0.2s ease-out;
      }
      .ui-toast--success {
        background: #ecfdf5;
        border-color: #a7f3d0;
        color: #065f46;
      }
      .ui-toast--error {
        background: #fef2f2;
        border-color: #fecaca;
        color: #991b1b;
      }
      .ui-toast--info {
        background: #fff7ed;
        border-color: #fed7aa;
        color: #9a3412;
      }
      .ui-toast__text {
        margin: 0;
        flex: 1;
        font-size: 0.875rem;
        line-height: 1.45;
      }
      .ui-toast__close {
        border: none;
        background: transparent;
        font-size: 1.25rem;
        line-height: 1;
        cursor: pointer;
        opacity: 0.6;
        padding: 0;
      }
      .ui-toast__close:hover {
        opacity: 1;
      }
      @keyframes ui-toast-in {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `
  ]
})
export class UiToastComponent {
  readonly toast = inject(UiToastService);
}
