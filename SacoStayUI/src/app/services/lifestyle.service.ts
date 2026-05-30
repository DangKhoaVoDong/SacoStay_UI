import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { resolveMediaUrl } from '../utils/media-url';
import type {
  CreateQuestionPayload,
  LifestyleQuestion,
  SwipeDeckCard,
  SwipeQuota,
  UpdateOptionPayload,
  UpdateQuestionPayload,
  UserLifestyleAnswer,
  WishlistItem
} from '../models/lifestyle.models';

export interface LifestyleMatchResult {
  targetUserId: string;
  matchingScore: number;
  totalQuestions: number;
  matchedAnswers: number;
}

function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function unwrapList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;
  const nested = o['data'] ?? o['items'] ?? o['value'] ?? o['$values'];
  return Array.isArray(nested) ? nested : [];
}

@Injectable({ providedIn: 'root' })
export class LifestyleService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getQuestions(): Observable<LifestyleQuestion[]> {
    return this.http.get<unknown>(`${this.apiUrl}/Lifestyle/questions`).pipe(
      map((raw) => {
        return unwrapList(raw)
          .map((item) => this.normalizeQuestion(item))
          .filter((q): q is LifestyleQuestion => !!q)
          .sort((a, b) => a.id - b.id);
      }),
      catchError(() => of([]))
    );
  }

  submitAnswers(selectedOptionIds: number[]): Observable<string> {
    return this.http
      .post<unknown>(`${this.apiUrl}/Lifestyle/submit`, {
        selectedOptionIds,
        SelectedOptionIds: selectedOptionIds
      })
      .pipe(
        map((raw) => {
          if (typeof raw === 'string') return raw;
          if (raw && typeof raw === 'object') {
            const m = str((raw as Record<string, unknown>)['message'] ?? (raw as Record<string, unknown>)['Message']);
            if (m) return m;
          }
          return 'Lưu trắc nghiệm thành công.';
        }),
        catchError((err) => {
          throw err;
        })
      );
  }

  getSwipeDeck(limit = 10, includeSwiped = false): Observable<SwipeDeckCard[]> {
    let params = new HttpParams().set('limit', String(limit));
    if (includeSwiped) {
      params = params.set('includeSwiped', 'true');
    }
    return this.http.get<unknown>(`${this.apiUrl}/Lifestyle/swipe-deck`, { params }).pipe(
      map((raw) =>
        unwrapList(raw)
          .map((item) => this.normalizeSwipeCard(item))
          .filter((c): c is SwipeDeckCard => !!c)
      ),
      catchError(() => of([]))
    );
  }

  swipeUser(targetUserId: string, isLike: boolean): Observable<void> {
    const params = new HttpParams().set('targetUserId', targetUserId).set('isLike', String(isLike));
    return this.http.post<unknown>(`${this.apiUrl}/Lifestyle/swipe`, null, { params }).pipe(
      map(() => undefined),
      catchError(() => of(undefined))
    );
  }

  /** Admin CMS: POST /api/Lifestyle/question */
  createQuestion(payload: CreateQuestionPayload): Observable<string> {
    const options = payload.options.map((o) => o.trim()).filter(Boolean);
    const body = {
      content: payload.content.trim(),
      Content: payload.content.trim(),
      options,
      Options: options
    };
    return this.http.post<unknown>(`${this.apiUrl}/Lifestyle/question`, body).pipe(
      map((raw) => this.messageFromResponse(raw, 'Tạo câu hỏi thành công.'))
    );
  }

  /** Admin CMS: PUT /api/Lifestyle/question */
  updateQuestion(payload: UpdateQuestionPayload): Observable<string> {
    const body = {
      id: payload.id,
      Id: payload.id,
      content: payload.content.trim(),
      Content: payload.content.trim()
    };
    return this.http.put<unknown>(`${this.apiUrl}/Lifestyle/question`, body).pipe(
      map((raw) => this.messageFromResponse(raw, 'Cập nhật câu hỏi thành công.'))
    );
  }

  /** Admin CMS: PUT /api/Lifestyle/options?questionId= */
  updateQuestionOptions(questionId: number, options: UpdateOptionPayload[]): Observable<string> {
    const body = options
      .map((o) => ({
        optionId: o.optionId && o.optionId > 0 ? o.optionId : null,
        OptionId: o.optionId && o.optionId > 0 ? o.optionId : null,
        content: o.content.trim(),
        Content: o.content.trim()
      }))
      .filter((o) => o.content.length > 0);

    const params = new HttpParams().set('questionId', String(questionId));
    return this.http.put<unknown>(`${this.apiUrl}/Lifestyle/options`, body, { params }).pipe(
      map((raw) => this.messageFromResponse(raw, 'Cập nhật đáp án thành công.'))
    );
  }

  private messageFromResponse(raw: unknown, fallback: string): string {
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    if (raw && typeof raw === 'object') {
      const m = str((raw as Record<string, unknown>)['message'] ?? (raw as Record<string, unknown>)['Message']);
      if (m) return m;
    }
    return fallback;
  }

  getMyAnswers(): Observable<UserLifestyleAnswer[]> {
    return this.http.get<unknown>(`${this.apiUrl}/Lifestyle/my-answers`).pipe(
      map((raw) => this.normalizeAnswers(raw)),
      catchError(() => of([]))
    );
  }

  getUserAnswers(userId: string): Observable<UserLifestyleAnswer[]> {
    return this.http
      .get<unknown>(`${this.apiUrl}/Lifestyle/answers/${encodeURIComponent(userId)}`)
      .pipe(
        map((raw) => this.normalizeAnswers(raw)),
        catchError(() => of([]))
      );
  }

  getMatchingScore(targetUserId: string): Observable<LifestyleMatchResult> {
    return this.http
      .get<unknown>(`${this.apiUrl}/Lifestyle/match/${encodeURIComponent(targetUserId)}`)
      .pipe(
        map((raw) => {
          const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
          return {
            targetUserId: String(o['targetUserId'] ?? o['TargetUserId'] ?? targetUserId),
            matchingScore: Number(o['matchingScore'] ?? o['MatchingScore'] ?? 0),
            totalQuestions: Number(o['totalQuestions'] ?? o['TotalQuestions'] ?? 0),
            matchedAnswers: Number(o['matchedAnswers'] ?? o['MatchedAnswers'] ?? 0)
          };
        }),
        catchError(() =>
          of({
            targetUserId,
            matchingScore: 0,
            totalQuestions: 0,
            matchedAnswers: 0
          })
        )
      );
  }

  getMyLikes(): Observable<WishlistItem[]> {
    return this.http.get<unknown>(`${this.apiUrl}/Lifestyle/my-likes`).pipe(
      map((raw) => this.normalizeWishlist(raw)),
      catchError(() => of([]))
    );
  }

  removeLike(targetUserId: string): Observable<void> {
    return this.http
      .delete<unknown>(`${this.apiUrl}/Lifestyle/my-likes/${encodeURIComponent(targetUserId)}`)
      .pipe(map(() => undefined), catchError(() => of(undefined)));
  }

  getSwipeQuota(): Observable<SwipeQuota> {
    return this.http.get<unknown>(`${this.apiUrl}/Lifestyle/swipe-quota`).pipe(
      map((raw) => this.normalizeSwipeQuota(raw)),
      catchError(() =>
        of({
          isPremium: false,
          weeklyLimit: 5,
          usedThisWeek: 0,
          remaining: 5,
          weekResetAt: new Date().toISOString()
        })
      )
    );
  }

  private normalizeWishlist(raw: unknown): WishlistItem[] {
    const byUser = new Map<string, WishlistItem>();
    for (const item of unwrapList(raw)) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const userId = str(o['userId'] ?? o['UserId']);
      if (!userId) continue;
      const avatarRaw = str(o['avatarUrl'] ?? o['AvatarUrl']);
      const likedAt = str(o['likedAt'] ?? o['LikedAt']) || undefined;
      const entry: WishlistItem = {
        userId,
        displayName: str(o['displayName'] ?? o['DisplayName']) || userId,
        avatarUrl: avatarRaw
          ? resolveMediaUrl(avatarRaw)
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(str(o['displayName'] ?? o['DisplayName']) || userId)}&background=FF9F43&color=fff`,
        matchingScore: Number(o['matchingScore'] ?? o['MatchingScore'] ?? 0),
        likedAt
      };
      const prev = byUser.get(userId);
      if (!prev) {
        byUser.set(userId, entry);
        continue;
      }
      const prevTime = prev.likedAt ? Date.parse(prev.likedAt) : 0;
      const nextTime = likedAt ? Date.parse(likedAt) : 0;
      if (nextTime >= prevTime) byUser.set(userId, entry);
    }
    return [...byUser.values()].sort((a, b) => {
      const ta = a.likedAt ? Date.parse(a.likedAt) : 0;
      const tb = b.likedAt ? Date.parse(b.likedAt) : 0;
      return tb - ta;
    });
  }

  private normalizeSwipeQuota(raw: unknown): SwipeQuota {
    const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const isPremium = o['isPremium'] === true || o['IsPremium'] === true;
    const weeklyLimitRaw = o['weeklyLimit'] ?? o['WeeklyLimit'];
    const remainingRaw = o['remaining'] ?? o['Remaining'];
    return {
      isPremium,
      weeklyLimit: weeklyLimitRaw == null ? null : Number(weeklyLimitRaw),
      usedThisWeek: Number(o['usedThisWeek'] ?? o['UsedThisWeek'] ?? 0),
      remaining: remainingRaw == null ? null : Number(remainingRaw),
      weekResetAt: str(o['weekResetAt'] ?? o['WeekResetAt']) || new Date().toISOString()
    };
  }

  private normalizeQuestion(item: unknown): LifestyleQuestion | null {
    if (!item || typeof item !== 'object') return null;
    const o = item as Record<string, unknown>;
    const id = Number(o['id'] ?? o['Id']);
    const content = str(o['content'] ?? o['Content']);
    if (!Number.isFinite(id) || !content) return null;
    const optionsRaw = o['options'] ?? o['Options'];
    const options = unwrapList(optionsRaw)
      .map((opt) => {
        if (!opt || typeof opt !== 'object') return null;
        const oo = opt as Record<string, unknown>;
        const oid = Number(oo['id'] ?? oo['Id']);
        const oc = str(oo['content'] ?? oo['Content']);
        if (!Number.isFinite(oid) || !oc) return null;
        return { id: oid, content: oc };
      })
      .filter((x): x is { id: number; content: string } => !!x);
    return { id, content, options };
  }

  private normalizeAnswers(raw: unknown): UserLifestyleAnswer[] {
    return unwrapList(raw)
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const o = item as Record<string, unknown>;
        const questionId = Number(o['questionId'] ?? o['QuestionId']);
        const optionId = Number(o['optionId'] ?? o['OptionId']);
        const questionContent = str(o['questionContent'] ?? o['QuestionContent']);
        const optionContent = str(o['optionContent'] ?? o['OptionContent']);
        if (!Number.isFinite(questionId) || !Number.isFinite(optionId) || !optionContent) return null;
        return {
          questionId,
          questionContent,
          optionId,
          optionContent
        } satisfies UserLifestyleAnswer;
      })
      .filter((x): x is UserLifestyleAnswer => !!x);
  }

  private normalizeSwipeCard(item: unknown): SwipeDeckCard | null {
    if (!item || typeof item !== 'object') return null;
    const o = item as Record<string, unknown>;
    const userId = str(o['userId'] ?? o['UserId']);
    if (!userId) return null;
    return {
      userId,
      matchingScore: Number(o['matchingScore'] ?? o['MatchingScore'] ?? 0)
    };
  }
}
