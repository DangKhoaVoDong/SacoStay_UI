import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { LifestyleService } from '../../services/lifestyle.service';
import { AuthService, getApiErrorMessage } from '../../services/auth.service';
import { setLifestyleQuizCompleted } from '../../utils/lifestyle-storage';
import { userIdFromUser } from '../../utils/user-display';
import {
  isHasRoomYesOption,
  resolveRoomQuestionPair
} from '../../utils/lifestyle-display';
import type { LifestyleQuestion } from '../../models/lifestyle.models';

@Component({
  selector: 'app-lifestyle-quiz',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './lifestyle-quiz.component.html'
})
export class LifestyleQuizComponent implements OnInit {
  questions: LifestyleQuestion[] = [];
  activeQuestions: LifestyleQuestion[] = [];
  currentIndex = 0;
  /** questionId -> optionId */
  answers = new Map<number, number>();
  loading = true;
  submitting = false;
  errorMessage = '';

  private roomStatusQuestion: LifestyleQuestion | null = null;
  private roomPriceQuestion: LifestyleQuestion | null = null;

  private readonly lifestyle = inject(LifestyleService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  retakeMode = false;
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.retakeMode = this.route.snapshot.queryParamMap.get('retake') === '1';
    this.lifestyle
      .getQuestions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.questions = list;
          this.applyRoomPartition(list);
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

  /** Luôn coi 2 câu cuối (id 22, 23) là phòng trọ + giá phòng. */
  private applyRoomPartition(list: LifestyleQuestion[]): void {
    const pair = resolveRoomQuestionPair(list);
    this.roomStatusQuestion = pair.roomStatus;
    this.roomPriceQuestion = pair.roomPrice;
  }

  private userHasRoomSelected(): boolean {
    if (!this.roomStatusQuestion) return false;
    const optionId = this.answers.get(this.roomStatusQuestion.id);
    if (optionId == null) return false;
    const opt = this.roomStatusQuestion.options.find((o) => o.id === optionId);
    return opt ? isHasRoomYesOption(opt.content) : false;
  }

  private rebuildActiveQuestions(): void {
    const pair = resolveRoomQuestionPair(this.questions);
    const flow: LifestyleQuestion[] = [...pair.lifestyle];
    if (pair.roomStatus) flow.push(pair.roomStatus);
    if (pair.roomPrice && this.userHasRoomSelected()) flow.push(pair.roomPrice);
    this.activeQuestions = flow;
    if (this.currentIndex >= this.activeQuestions.length) {
      this.currentIndex = Math.max(0, this.activeQuestions.length - 1);
    }
  }

  /** Danh sách optionId gửi lên BE — bỏ câu giá khi chọn "Chưa có". */
  private collectSubmitOptionIds(): number[] {
    const pair = resolveRoomQuestionPair(this.questions);
    const includePrice = this.userHasRoomSelected();
    const required = [...pair.lifestyle];
    if (pair.roomStatus) required.push(pair.roomStatus);
    if (includePrice && pair.roomPrice) required.push(pair.roomPrice);

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
    if (!this.activeQuestions.length) return 0;
    return ((this.currentIndex + 1) / this.activeQuestions.length) * 100;
  }

  get isLastQuestion(): boolean {
    return this.currentIndex >= this.activeQuestions.length - 1;
  }

  selectedOptionId(questionId: number): number | undefined {
    return this.answers.get(questionId);
  }

  selectOption(optionId: number): void {
    const q = this.currentQuestion;
    if (!q) return;
    this.answers.set(q.id, optionId);

    if (this.roomStatusQuestion && q.id === this.roomStatusQuestion.id) {
      const opt = q.options.find((o) => o.id === optionId);
      if (opt && !isHasRoomYesOption(opt.content) && this.roomPriceQuestion) {
        this.answers.delete(this.roomPriceQuestion.id);
      }
      this.rebuildActiveQuestions();
    }

    this.cdr.detectChanges();

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
      this.cdr.detectChanges();
    }
  }

  goNext(): void {
    const q = this.currentQuestion;
    if (!q || !this.answers.has(q.id)) return;
    if (this.roomStatusQuestion && q.id === this.roomStatusQuestion.id) {
      this.rebuildActiveQuestions();
    }
    if (this.isLastQuestion) {
      this.finishQuiz();
    } else {
      this.currentIndex += 1;
      this.cdr.detectChanges();
    }
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  finishQuiz(): void {
    this.rebuildActiveQuestions();
    const ids = this.collectSubmitOptionIds();
    const pair = resolveRoomQuestionPair(this.questions);
    const expectedCount =
      pair.lifestyle.length + (pair.roomStatus ? 1 : 0) + (this.userHasRoomSelected() && pair.roomPrice ? 1 : 0);

    if (!ids.length || ids.length < expectedCount) {
      this.errorMessage = 'Vui lòng trả lời đủ tất cả câu hỏi.';
      this.cdr.detectChanges();
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
            const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
            const target =
              returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')
                ? returnUrl
                : '/profile/me';
            void this.router.navigateByUrl(target);
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
