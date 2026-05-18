import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import type { LifestyleQuestion, SwipeDeckCard } from '../models/lifestyle.models';

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
      .post(`${this.apiUrl}/Lifestyle/submit`, { SelectedOptionIds: selectedOptionIds }, { responseType: 'text' })
      .pipe(catchError((err) => {
        throw err;
      }));
  }

  getSwipeDeck(limit = 10): Observable<SwipeDeckCard[]> {
    const params = new HttpParams().set('limit', String(limit));
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
