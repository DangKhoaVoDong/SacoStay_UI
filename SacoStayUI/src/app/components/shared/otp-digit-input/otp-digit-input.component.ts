import {
  Component,
  ElementRef,
  forwardRef,
  Input,
  QueryList,
  ViewChildren
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-otp-digit-input',
  standalone: true,
  template: `
    <div class="otp-digit-row" role="group" [attr.aria-label]="ariaLabel">
      @for (i of indices; track i) {
        <input
          #digitBox
          type="text"
          inputmode="numeric"
          maxlength="1"
          class="otp-digit-box"
          [class.otp-digit-box--filled]="digits[i]"
          [disabled]="isDisabled"
          [value]="digits[i]"
          (input)="onDigitInput(i, $event)"
          (keydown)="onDigitKeydown(i, $event)"
          (paste)="onPaste($event)"
          autocomplete="one-time-code"
        />
      }
    </div>
  `,
  styleUrl: './otp-digit-input.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => OtpDigitInputComponent),
      multi: true
    }
  ]
})
export class OtpDigitInputComponent implements ControlValueAccessor {
  @Input() ariaLabel = 'Mã OTP 6 chữ số';

  @Input() set disabled(value: boolean | string) {
    this.setDisabledState(value === true || value === '' || value === 'true');
  }

  readonly indices = [0, 1, 2, 3, 4, 5];
  digits: string[] = ['', '', '', '', '', ''];
  isDisabled = false;

  @ViewChildren('digitBox') digitBoxes!: QueryList<ElementRef<HTMLInputElement>>;

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    const sanitized = (value ?? '').replace(/\D/g, '').slice(0, 6);
    this.digits = Array.from({ length: 6 }, (_, i) => sanitized[i] ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  onDigitInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const digit = input.value.replace(/\D/g, '').slice(-1);
    this.digits[index] = digit;
    input.value = digit;
    this.emitValue();

    if (digit && index < 5) {
      this.focusBox(index + 1);
    }
  }

  onDigitKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      this.digits[index - 1] = '';
      this.emitValue();
      this.focusBox(index - 1);
      event.preventDefault();
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      this.focusBox(index - 1);
      event.preventDefault();
      return;
    }

    if (event.key === 'ArrowRight' && index < 5) {
      this.focusBox(index + 1);
      event.preventDefault();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    this.digits = Array.from({ length: 6 }, (_, i) => pasted[i] ?? '');
    this.emitValue();
    this.syncDomValues();
    this.focusBox(Math.min(pasted.length, 5));
  }

  focusFirstEmpty(): void {
    const idx = this.digits.findIndex((d) => !d);
    this.focusBox(idx === -1 ? 5 : idx);
  }

  private emitValue(): void {
    this.onChange(this.digits.join(''));
    this.onTouched();
  }

  private focusBox(index: number): void {
    const box = this.digitBoxes?.get(index)?.nativeElement;
    box?.focus();
    box?.select();
  }

  private syncDomValues(): void {
    this.digitBoxes?.forEach((ref, i) => {
      ref.nativeElement.value = this.digits[i] ?? '';
    });
  }
}
