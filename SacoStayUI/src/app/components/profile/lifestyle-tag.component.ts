import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lifestyle-tag',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center rounded-full border border-orange-200 bg-[#FFF8F0] px-3 py-1 text-sm text-[#1A1A2E] shadow-sm"
    >
      {{ optionContent }}
    </span>
  `
})
export class LifestyleTagComponent {
  @Input({ required: true }) optionContent = '';
}
