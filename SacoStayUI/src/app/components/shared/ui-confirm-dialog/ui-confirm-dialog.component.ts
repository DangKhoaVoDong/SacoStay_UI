import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiConfirmService } from '../../../services/ui-confirm.service';

@Component({
  selector: 'app-ui-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (confirm.dialog(); as d) {
      <div class="ui-confirm-backdrop" role="dialog" aria-modal="true">
        <div class="ui-confirm-panel">
          <h2 class="ui-confirm-title">{{ d.title }}</h2>
          <p class="ui-confirm-message">{{ d.message }}</p>
          <div class="ui-confirm-actions">
            <button type="button" class="ui-confirm-btn ui-confirm-btn--ghost" (click)="confirm.cancel()">
              {{ d.cancelLabel }}
            </button>
            <button type="button" class="ui-confirm-btn ui-confirm-btn--primary" (click)="confirm.accept()">
              {{ d.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .ui-confirm-backdrop {
        position: fixed;
        inset: 0;
        z-index: 10001;
        background: rgba(15, 23, 42, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }
      .ui-confirm-panel {
        background: #fff;
        border-radius: 1rem;
        padding: 1.5rem;
        max-width: 28rem;
        width: 100%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
      }
      .ui-confirm-title {
        margin: 0 0 0.5rem;
        font-size: 1.125rem;
        font-weight: 700;
        color: #111827;
      }
      .ui-confirm-message {
        margin: 0 0 1.25rem;
        font-size: 0.875rem;
        line-height: 1.5;
        color: #4b5563;
        white-space: pre-wrap;
      }
      .ui-confirm-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }
      .ui-confirm-btn {
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        border: none;
      }
      .ui-confirm-btn--ghost {
        background: #f3f4f6;
        color: #374151;
      }
      .ui-confirm-btn--primary {
        background: #ff9f43;
        color: #fff;
      }
    `
  ]
})
export class UiConfirmDialogComponent {
  readonly confirm = inject(UiConfirmService);
}
