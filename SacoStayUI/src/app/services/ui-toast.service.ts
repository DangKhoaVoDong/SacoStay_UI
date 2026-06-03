import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastState {
  message: string;
  kind: ToastKind;
}

@Injectable({ providedIn: 'root' })
export class UiToastService {
  readonly toast = signal<ToastState | null>(null);
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  show(message: string, kind: ToastKind = 'info', durationMs = 4500): void {
    const text = message?.trim();
    if (!text) return;
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.toast.set({ message: text, kind });
    this.hideTimer = setTimeout(() => this.dismiss(), durationMs);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error', 6000);
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  dismiss(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.toast.set(null);
  }
}
