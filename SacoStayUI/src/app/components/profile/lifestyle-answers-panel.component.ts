import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { UserLifestyleAnswer } from '../../models/lifestyle.models';
import { lifestyleAnswerLabel } from '../../utils/lifestyle-display';

@Component({
  selector: 'app-lifestyle-answers-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 gap-3">
      @for (answer of answers; track answer.questionId) {
        <div class="rounded-xl border border-orange-100 bg-[#FFFBF7] px-3 py-2.5">
          <p class="text-xs font-semibold text-[#FF9F43] mb-1">{{ labelFor(answer) }}</p>
          <p class="text-sm text-gray-800 leading-snug">{{ answer.optionContent }}</p>
        </div>
      }
    </div>
  `
})
export class LifestyleAnswersPanelComponent {
  @Input({ required: true }) answers: UserLifestyleAnswer[] = [];
  labelFor(answer: UserLifestyleAnswer): string {
    return lifestyleAnswerLabel(answer);
  }
}
