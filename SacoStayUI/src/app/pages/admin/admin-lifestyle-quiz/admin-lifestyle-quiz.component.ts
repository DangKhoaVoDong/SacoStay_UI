import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LifestyleService } from '../../../services/lifestyle.service';
import { getApiErrorMessage } from '../../../services/auth.service';
import type { LifestyleQuestion } from '../../../models/lifestyle.models';

interface OptionDraft {
  optionId: number | null;
  content: string;
}

interface QuestionDraft {
  content: string;
  options: OptionDraft[];
}

@Component({
  selector: 'app-admin-lifestyle-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-lifestyle-quiz.component.html'
})
export class AdminLifestyleQuizComponent implements OnInit {
  questions: LifestyleQuestion[] = [];
  loading = true;
  errorMessage = '';

  expandedQuestionId: number | null = null;
  drafts = new Map<number, QuestionDraft>();

  savingQuestionId: number | null = null;
  savingOptionsQuestionId: number | null = null;

  showCreateForm = false;
  creating = false;
  newQuestionContent = '';
  newQuestionOptions: string[] = ['', ''];

  private readonly lifestyle = inject(LifestyleService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.loadQuestions();
  }

  loadQuestions(): void {
    this.loading = true;
    this.errorMessage = '';
    this.lifestyle
      .getQuestions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.questions = list;
          this.drafts.clear();
          for (const q of list) {
            this.drafts.set(q.id, this.draftFromQuestion(q));
          }
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = getApiErrorMessage(err) || 'Không tải được danh sách câu hỏi.';
          this.cdr.detectChanges();
        }
      });
  }

  private draftFromQuestion(q: LifestyleQuestion): QuestionDraft {
    return {
      content: q.content,
      options: q.options.map((o) => ({ optionId: o.id, content: o.content }))
    };
  }

  getDraft(questionId: number): QuestionDraft {
    return this.drafts.get(questionId) ?? { content: '', options: [] };
  }

  toggleExpand(questionId: number): void {
    this.expandedQuestionId = this.expandedQuestionId === questionId ? null : questionId;
    this.cdr.detectChanges();
  }

  isExpanded(questionId: number): boolean {
    return this.expandedQuestionId === questionId;
  }

  addOptionRow(questionId: number): void {
    const draft = this.getDraft(questionId);
    draft.options = [...draft.options, { optionId: null, content: '' }];
    this.drafts.set(questionId, draft);
    this.cdr.detectChanges();
  }

  removeOptionRow(questionId: number, index: number): void {
    const draft = this.getDraft(questionId);
    if (draft.options.length <= 1) {
      alert('Mỗi câu hỏi cần ít nhất một đáp án.');
      return;
    }
    draft.options = draft.options.filter((_, i) => i !== index);
    this.drafts.set(questionId, draft);
    this.cdr.detectChanges();
  }

  saveQuestion(questionId: number): void {
    const draft = this.getDraft(questionId);
    const content = draft.content.trim();
    if (!content) {
      alert('Nội dung câu hỏi không được để trống.');
      return;
    }

    this.savingQuestionId = questionId;
    this.lifestyle
      .updateQuestion({ id: questionId, content })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (msg) => {
          this.savingQuestionId = null;
          const q = this.questions.find((x) => x.id === questionId);
          if (q) q.content = content;
          alert(msg);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.savingQuestionId = null;
          this.cdr.detectChanges();
          alert(getApiErrorMessage(err) || 'Cập nhật câu hỏi thất bại.');
        }
      });
  }

  saveOptions(questionId: number): void {
    const draft = this.getDraft(questionId);
    const options = draft.options.map((o) => ({
      optionId: o.optionId,
      content: o.content.trim()
    })).filter((o) => o.content.length > 0);

    if (!options.length) {
      alert('Cần ít nhất một đáp án hợp lệ.');
      return;
    }

    this.savingOptionsQuestionId = questionId;
    this.lifestyle
      .updateQuestionOptions(questionId, options)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (msg) => {
          this.savingOptionsQuestionId = null;
          alert(msg);
          this.loadQuestions();
        },
        error: (err) => {
          this.savingOptionsQuestionId = null;
          this.cdr.detectChanges();
          alert(getApiErrorMessage(err) || 'Cập nhật đáp án thất bại.');
        }
      });
  }

  isSavingQuestion(id: number): boolean {
    return this.savingQuestionId === id;
  }

  isSavingOptions(id: number): boolean {
    return this.savingOptionsQuestionId === id;
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (this.showCreateForm) {
      this.resetCreateForm();
    }
    this.cdr.detectChanges();
  }

  resetCreateForm(): void {
    this.newQuestionContent = '';
    this.newQuestionOptions = ['', ''];
  }

  addNewOptionRow(): void {
    this.newQuestionOptions = [...this.newQuestionOptions, ''];
    this.cdr.detectChanges();
  }

  removeNewOptionRow(index: number): void {
    if (this.newQuestionOptions.length <= 1) {
      alert('Cần ít nhất một đáp án.');
      return;
    }
    this.newQuestionOptions = this.newQuestionOptions.filter((_, i) => i !== index);
    this.cdr.detectChanges();
  }

  createQuestion(): void {
    const content = this.newQuestionContent.trim();
    const options = this.newQuestionOptions.map((o) => o.trim()).filter(Boolean);

    if (!content) {
      alert('Nội dung câu hỏi không được để trống.');
      return;
    }
    if (!options.length) {
      alert('Cần ít nhất một đáp án.');
      return;
    }

    this.creating = true;
    this.lifestyle
      .createQuestion({ content, options })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (msg) => {
          this.creating = false;
          this.showCreateForm = false;
          this.resetCreateForm();
          alert(msg);
          this.loadQuestions();
        },
        error: (err) => {
          this.creating = false;
          this.cdr.detectChanges();
          alert(getApiErrorMessage(err) || 'Tạo câu hỏi thất bại.');
        }
      });
  }
}
