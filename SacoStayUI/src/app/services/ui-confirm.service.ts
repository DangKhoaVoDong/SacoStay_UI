import { Injectable, signal } from '@angular/core';

export interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

@Injectable({ providedIn: 'root' })
export class UiConfirmService {
  readonly dialog = signal<ConfirmState | null>(null);
  private resolver: ((value: boolean) => void) | null = null;

  confirm(
    message: string,
    options?: { title?: string; confirmLabel?: string; cancelLabel?: string }
  ): Promise<boolean> {
    if (this.resolver) {
      this.resolver(false);
    }
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
      this.dialog.set({
        title: options?.title ?? 'Xác nhận',
        message,
        confirmLabel: options?.confirmLabel ?? 'Đồng ý',
        cancelLabel: options?.cancelLabel ?? 'Hủy'
      });
    });
  }

  accept(): void {
    this.finish(true);
  }

  cancel(): void {
    this.finish(false);
  }

  private finish(result: boolean): void {
    this.dialog.set(null);
    const r = this.resolver;
    this.resolver = null;
    r?.(result);
  }
}
