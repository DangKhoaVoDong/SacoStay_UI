import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { LifestyleService } from '../../services/lifestyle.service';
import { AuthService, getApiErrorMessage } from '../../services/auth.service';
import { setLifestyleQuizCompleted } from '../../utils/lifestyle-storage';
import { userIdFromUser } from '../../utils/user-display';
import type { LifestyleQuestion } from '../../models/lifestyle.models';

@Component({
  selector: 'app-lifestyle-quiz',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './lifestyle-quiz.component.html'
})
export class LifestyleQuizComponent implements OnInit {
  questions: LifestyleQuestion[] = [];
  currentIndex = 0;
  /** questionId -> optionId */
  answers = new Map<number, number>();
  loading = true;
  submitting = false;
  errorMessage = '';

  private readonly lifestyle = inject(LifestyleService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.lifestyle
      .getQuestions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.questions = list;
          this.loading = false;
          if (!list.length) {
            this.errorMessage = 'Chưa có câu hỏi trắc nghiệm trên server. Vui lòng thử lại sau.';
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Không tải được câu hỏi.';
          this.cdr.detectChanges();
        }
      });
  }

  get currentQuestion(): LifestyleQuestion | null {
    return this.questions[this.currentIndex] ?? null;
  }

  get progress(): number {
    if (!this.questions.length) return 0;
    return ((this.currentIndex + 1) / this.questions.length) * 100;
  }

  get isLastQuestion(): boolean {
    return this.currentIndex >= this.questions.length - 1;
  }

  selectedOptionId(questionId: number): number | undefined {
    return this.answers.get(questionId);
  }

  selectOption(optionId: number): void {
    const q = this.currentQuestion;
    if (!q) return;
    this.answers.set(q.id, optionId);
    setTimeout(() => {
      if (this.isLastQuestion) {
        this.finishQuiz();
      } else {
        this.currentIndex += 1;
        this.cdr.detectChanges();
      }
    }, 280);
  }

  goBack(): void {
    if (this.currentIndex > 0) {
      this.currentIndex -= 1;
    }
  }

  goNext(): void {
    const q = this.currentQuestion;
    if (!q || !this.answers.has(q.id)) return;
    if (this.isLastQuestion) {
      this.finishQuiz();
    } else {
      this.currentIndex += 1;
    }
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  finishQuiz(): void {
    const ids = this.questions.map((q) => this.answers.get(q.id)).filter((id): id is number => !!id);
    if (ids.length < this.questions.length) {
      this.errorMessage = 'Vui lòng trả lời đủ tất cả câu hỏi.';
      return;
    }
    this.submitting = true;
    this.errorMessage = '';
    this.lifestyle
      .submitAnswers(ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const uid = userIdFromUser(this.auth.getCurrentUser());
          if (uid) setLifestyleQuizCompleted(uid);
          this.auth.refreshProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.submitting = false;
            this.router.navigate(['/discovery']);
          });
        },
        error: (err) => {
          this.submitting = false;
          this.errorMessage = getApiErrorMessage(err) || 'Lưu trắc nghiệm thất bại.';
          this.cdr.detectChanges();
        }
      });
  }
}
