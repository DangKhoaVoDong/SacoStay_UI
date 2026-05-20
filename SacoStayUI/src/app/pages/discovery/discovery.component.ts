import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs/operators';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { AuthService } from '../../services/auth.service';
import { LifestyleService } from '../../services/lifestyle.service';
import { isTenantPremium, userIdFromUser } from '../../utils/user-display';
import {
  hasCompletedLifestyleQuiz,
  loadSwipeData,
  saveSwipeData,
  type SwipeData
} from '../../utils/lifestyle-storage';
import type { SwipeDeckCard } from '../../models/lifestyle.models';

export interface DiscoveryCard extends SwipeDeckCard {
  displayName: string;
  avatarUrl: string;
}

@Component({
  selector: 'app-discovery',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  templateUrl: './discovery.component.html'
})
export class DiscoveryComponent implements OnInit {
  needsQuiz = false;
  deckEmpty = false;
  loading = true;
  deck: DiscoveryCard[] = [];
  currentIndex = 0;
  likedUsers: DiscoveryCard[] = [];
  swipeData: SwipeData = { count: 0, resetDate: new Date().toISOString() };
  showUpgradePrompt = false;
  swipeAnim: 'left' | 'right' | null = null;
  private userId = '';

  readonly isPremium = isTenantPremium();

  private readonly lifestyle = inject(LifestyleService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    const id = userIdFromUser(this.auth.getCurrentUser());
    if (id) {
      this.bootstrapForUser(id);
      return;
    }
    this.auth.currentUser$
      .pipe(
        filter((u) => !!userIdFromUser(u)),
        take(1),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((u) => this.bootstrapForUser(userIdFromUser(u)));
  }

  private bootstrapForUser(userId: string): void {
    this.userId = userId;
    this.swipeData = loadSwipeData(userId);
    if (!hasCompletedLifestyleQuiz(userId)) {
      this.needsQuiz = true;
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }
    this.loadDeck();
  }

  get currentCard(): DiscoveryCard | null {
    return this.deck[this.currentIndex] ?? null;
  }

  get hasMoreCards(): boolean {
    return this.currentIndex < this.deck.length;
  }

  get remainingSwipes(): number {
    return this.isPremium ? 999 : Math.max(0, 5 - this.swipeData.count);
  }

  get remainingSwipesLabel(): string {
    return this.isPremium ? '∞' : String(this.remainingSwipes);
  }

  get daysUntilReset(): number {
    const resetDate = new Date(this.swipeData.resetDate);
    const days = Math.floor((Date.now() - resetDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 7 - days);
  }

  startQuiz(): void {
    this.router.navigate(['/lifestyle-quiz']);
  }

  loadDeck(): void {
    this.loading = true;
    const limit = this.isPremium ? 20 : 10;
    this.lifestyle
      .getSwipeDeck(limit)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cards) => {
          this.deck = cards.map((c) => this.toDiscoveryCard(c));
          this.currentIndex = 0;
          this.loading = false;
          this.deckEmpty = this.deck.length === 0;
          this.needsQuiz = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  handleSwipe(direction: 'left' | 'right'): void {
    if (!this.isPremium && this.swipeData.count >= 5) {
      this.showUpgradePrompt = true;
      return;
    }
    const card = this.currentCard;
    if (!card) return;

    this.swipeAnim = direction;
    this.cdr.detectChanges();

    setTimeout(() => {
      if (!this.isPremium) {
        const next = { ...this.swipeData, count: this.swipeData.count + 1 };
        this.swipeData = next;
        saveSwipeData(this.userId, next);
      }

      this.lifestyle
        .swipeUser(card.userId, direction === 'right')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();

      if (direction === 'right') {
        this.likedUsers = [card, ...this.likedUsers];
      }

      this.swipeAnim = null;
      this.currentIndex += 1;
      this.cdr.detectChanges();
    }, 280);
  }

  scoreColor(score: number): string {
    if (score >= 80) return '#2ECC71';
    if (score >= 60) return '#F1C40F';
    return '#E74C3C';
  }

  private toDiscoveryCard(c: SwipeDeckCard): DiscoveryCard {
    const short = c.userId.replace(/-/g, '').slice(0, 6).toUpperCase();
    const displayName = `Bạn #${short}`;
    return {
      ...c,
      displayName,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=FF9F43&color=fff&size=256`
    };
  }
}
