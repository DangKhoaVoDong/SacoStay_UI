import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { LifestyleService } from '../../services/lifestyle.service';
import { AuthService, getApiErrorMessage } from '../../services/auth.service';
import { NotificationCenterService } from '../../services/notification-center.service';
import { saveGuestQuizResult } from '../../utils/guest-discovery.storage';
import { setLifestyleQuizCompleted } from '../../utils/lifestyle-storage';
import { userIdFromUser } from '../../utils/user-display';
import { resolvePostLoginUrl } from '../../utils/auth-navigation';
import { resolveRoomQuestionPair } from '../../utils/lifestyle-display';
import type { LifestyleQuestion } from '../../models/lifestyle.models';

@Component({
  selector: 'app-lifestyle-quiz',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './lifestyle-quiz.component.html',
  styleUrl: './lifestyle-quiz.component.css'
})
export class LifestyleQuizComponent implements OnInit {
  questions: LifestyleQuestion[] = [];
  activeQuestions: LifestyleQuestion[] = [];
  currentIndex = 0;
  answers = new Map<number, number>();
  loading = true;
  submitting = false;
  errorMessage = '';

  private readonly lifestyle = inject(LifestyleService);
  private readonly auth = inject(AuthService);
  private readonly notificationCenter = inject(NotificationCenterService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  retakeMode = false;
  guestMode = false;
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.retakeMode = this.route.snapshot.queryParamMap.get('retake') === '1';
    this.guestMode =
      this.route.snapshot.queryParamMap.get('guest') === '1' || !this.auth.isLoggedIn;

    if (!this.guestMode && !this.retakeMode && this.auth.isLoggedIn) {
      const uid = userIdFromUser(this.auth.getCurrentUser());
      if (uid) {
        this.lifestyle
          .ensureQuizCompletedFlag(uid)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((completed) => {
            if (completed) {
              const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
              void this.router.navigateByUrl(resolvePostLoginUrl(returnUrl, '/discovery'));
              return;
            }
            this.loadQuestions();
          });
        return;
      }
    }

    this.loadQuestions();
  }

  private loadQuestions(): void {
    this.lifestyle
      .getQuestions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.questions = list;
          this.rebuildActiveQuestions();
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

  private rebuildActiveQuestions(): void {
    const pair = resolveRoomQuestionPair(this.questions);
    const flow: LifestyleQuestion[] = [...pair.lifestyle];
    if (pair.roomStatus) flow.push(pair.roomStatus);
    this.activeQuestions = flow;
    const maxIndex = Math.max(0, flow.length - 1);
    if (this.currentIndex > maxIndex) {
      this.currentIndex = maxIndex;
    }
  }

  get totalSteps(): number {
    return this.activeQuestions.length;
  }

  private collectSubmitOptionIds(): number[] {
    const pair = resolveRoomQuestionPair(this.questions);
    const required = [...pair.lifestyle];
    if (pair.roomStatus) required.push(pair.roomStatus);

    const ids: number[] = [];
    for (const q of required) {
      const optId = this.answers.get(q.id);
      if (optId == null) return [];
      ids.push(optId);
    }
    return ids;
  }

  get currentQuestion(): LifestyleQuestion | null {
    return this.activeQuestions[this.currentIndex] ?? null;
  }

  get progress(): number {
    if (!this.totalSteps) return 0;
    return ((this.currentIndex + 1) / this.totalSteps) * 100;
  }

  get isLastStep(): boolean {
    return this.currentIndex >= this.totalSteps - 1;
  }

  selectedOptionId(questionId: number): number | undefined {
    return this.answers.get(questionId);
  }

  selectOption(optionId: number): void {
    const q = this.currentQuestion;
    if (!q) return;
    this.answers.set(q.id, optionId);
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  goBack(): void {
    if (this.currentIndex > 0) {
      this.currentIndex -= 1;
      this.cdr.detectChanges();
    }
  }

  goNext(): void {
    const q = this.currentQuestion;
    if (!q || !this.answers.has(q.id)) return;
    if (this.isLastStep) {
      this.finishQuiz();
    } else {
      this.currentIndex += 1;
      this.cdr.detectChanges();
    }
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  private navigateAfterQuiz(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const fallback = this.guestMode ? '/discovery' : '/profile/me';
    void this.router.navigateByUrl(resolvePostLoginUrl(returnUrl, fallback));
  }

  finishQuiz(): void {
    this.rebuildActiveQuestions();
    const ids = this.collectSubmitOptionIds();
    const pair = resolveRoomQuestionPair(this.questions);
    const expectedCount = pair.lifestyle.length + (pair.roomStatus ? 1 : 0);

    if (!ids.length || ids.length < expectedCount) {
      this.errorMessage = 'Vui lòng trả lời đủ tất cả câu hỏi.';
      this.cdr.detectChanges();
      return;
    }

    if (this.guestMode) {
      saveGuestQuizResult(this.questions, this.answers, ids);
      this.submitting = false;
      this.navigateAfterQuiz();
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
          this.notificationCenter.refreshUnread();
          this.auth.refreshProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.submitting = false;
            this.navigateAfterQuiz();
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

