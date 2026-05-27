import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { compatibilityColorClass } from '../../utils/lifestyle-display';

@Component({
  selector: 'app-compatibility-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center justify-center rounded-full border font-semibold"
      [ngClass]="colorClass"
      [class.text-xs]="size === 'sm'"
      [class.px-2]="size === 'sm'"
      [class.py-0.5]="size === 'sm'"
      [class.text-sm]="size === 'md'"
      [class.px-3]="size === 'md'"
      [class.py-1]="size === 'md'"
      [class.text-lg]="size === 'lg'"
      [class.px-4]="size === 'lg'"
      [class.py-1.5]="size === 'lg'"
    >
      {{ score }}% Hợp
    </span>
  `
})
export class CompatibilityBadgeComponent {
  @Input({ required: true }) score = 0;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  get colorClass(): string {
    return compatibilityColorClass(this.score);
  }
}
