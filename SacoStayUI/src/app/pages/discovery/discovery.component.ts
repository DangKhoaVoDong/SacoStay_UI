import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, switchMap, take } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { LifestyleTagComponent } from '../../components/profile/lifestyle-tag.component';
import { DiscoveryFilterPanelComponent } from '../../components/discovery/discovery-filter-panel.component';
import { AuthService } from '../../services/auth.service';
import { LifestyleService } from '../../services/lifestyle.service';
import { DiscoveryProfileService, type DiscoveryCard } from '../../services/discovery-profile.service';
import { isTenantPremium, userIdFromUser } from '../../utils/user-display';
import {
  hasCompletedLifestyleQuiz,
  loadSwipeData,
  saveSwipeData,
  type SwipeData
} from '../../utils/lifestyle-storage';
import {
  loadDiscoveryWishlist,
  saveDiscoveryWishlist,
  type DiscoveryWishlistItem
} from '../../utils/discovery-wishlist-storage';
import {
  DEFAULT_DISCOVERY_FILTERS,
  FREE_WEEKLY_SWIPE_LIMIT,
  matchesDiscoveryFilters,
  type DiscoveryFilters
} from '../../utils/discovery-filters';
import type { UserLifestyleAnswer } from '../../models/lifestyle.models';

@Component({
  selector: 'app-discovery',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, LifestyleTagComponent, DiscoveryFilterPanelComponent],
  templateUrl: './discovery.component.html'
})
export class DiscoveryComponent implements OnInit {
  needsQuiz = false;
  deckEmpty = false;
  loading = true;
  allCards: DiscoveryCard[] = [];
  deck: DiscoveryCard[] = [];
  currentIndex = 0;
  likedUsers: DiscoveryWishlistItem[] = [];
  swipeData: SwipeData = { count: 0, resetDate: new Date().toISOString() };
  showUpgradePrompt = false;
  showFilterPanel = false;
  activeFilters: DiscoveryFilters = { ...DEFAULT_DISCOVERY_FILTERS };
  draftFilters: DiscoveryFilters = { ...DEFAULT_DISCOVERY_FILTERS };

  /** Animation khi thả: like = vuốt phải→trái (thẻ bay sang trái); pass = ngược lại */
  swipeAnim: 'like' | 'pass' | null = null;
  dragX = 0;
  private dragging = false;
  private dragStartX = 0;
  private pointerId: number | null = null;

  private userId = '';
  private myAnswers: UserLifestyleAnswer[] = [];

  readonly isPremium = isTenantPremium();
  readonly freeSwipeLimit = FREE_WEEKLY_SWIPE_LIMIT;

  private readonly lifestyle = inject(LifestyleService);
  private readonly discoveryProfiles = inject(DiscoveryProfileService);
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
    this.likedUsers = loadDiscoveryWishlist(userId);
    if (!hasCompletedLifestyleQuiz(userId)) {
      this.needsQuiz = true;
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }
    this.loadDeck(false);
  }

  get currentCard(): DiscoveryCard | null {
    return this.deck[this.currentIndex] ?? null;
  }

  get hasMoreCards(): boolean {
    return this.currentIndex < this.deck.length;
  }

  get remainingSwipes(): number {
    return this.isPremium ? 999 : Math.max(0, this.freeSwipeLimit - this.swipeData.count);
  }

  get remainingSwipesLabel(): string {
    return this.isPremium ? '∞' : String(this.remainingSwipes);
  }

  get daysUntilReset(): number {
    const resetDate = new Date(this.swipeData.resetDate);
    const days = Math.floor((Date.now() - resetDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 7 - days);
  }

  get cardTitleLine(): string {
    const c = this.currentCard;
    if (!c) return '';
    return c.age != null ? `${c.displayName} ${c.age}` : c.displayName;
  }

  get cardMetaLine(): string {
    const c = this.currentCard;
    if (!c) return '';
    const parts: string[] = [];
    if (c.location) parts.push(c.location);
    if (c.roomPriceLabel) parts.push(c.roomPriceLabel);
    return parts.join(' | ');
  }

  get cardDragStyle(): Record<string, string> {
    if (this.swipeAnim === 'like') {
      return { transform: 'translateX(-120%) rotate(-18deg)', opacity: '0' };
    }
    if (this.swipeAnim === 'pass') {
      return { transform: 'translateX(120%) rotate(18deg)', opacity: '0' };
    }
    if (this.dragging || this.dragX !== 0) {
      const rot = Math.max(-18, Math.min(18, this.dragX * 0.06));
      return { transform: `translateX(${this.dragX}px) rotate(${rot}deg)` };
    }
    return {};
  }

  get likeOverlayOpacity(): number {
    return Math.min(1, Math.max(0, -this.dragX / 100));
  }

  get passOverlayOpacity(): number {
    return Math.min(1, Math.max(0, this.dragX / 100));
  }

  startQuiz(): void {
    void this.router.navigate(['/lifestyle-quiz'], { queryParams: { returnUrl: '/discovery' } });
  }

  toggleFilterPanel(): void {
    this.showFilterPanel = !this.showFilterPanel;
    if (this.showFilterPanel) {
      this.draftFilters = { ...this.activeFilters };
    }
  }

  onApplyFilters(filters: DiscoveryFilters): void {
    this.activeFilters = { ...filters };
    this.applyFiltersToDeck(true);
    this.showFilterPanel = false;
    this.cdr.detectChanges();
  }

  private applyFiltersToDeck(resetIndex: boolean): void {
    this.deck = this.allCards.filter((c) => matchesDiscoveryFilters(c, this.activeFilters));
    if (resetIndex) {
      this.currentIndex = 0;
    } else if (this.currentIndex >= this.deck.length) {
      this.currentIndex = Math.max(0, this.deck.length - 1);
    }
    this.deckEmpty = this.deck.length === 0;
  }

  loadDeck(includeSwiped: boolean): void {
    this.loading = true;
    const limit = this.isPremium ? 100 : 50;
    forkJoin({
      deck: this.lifestyle.getSwipeDeck(limit, includeSwiped),
      myAnswers: this.lifestyle.getMyAnswers()
    })
      .pipe(
        switchMap(({ deck, myAnswers }) => {
          this.myAnswers = myAnswers;
          if (!deck.length) return of([] as DiscoveryCard[]);
          return this.discoveryProfiles.enrichDeck(deck, myAnswers);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (cards) => {
          this.allCards = cards;
          this.syncWishlistWithDeck(cards);
          this.applyFiltersToDeck(true);
          this.loading = false;
          this.needsQuiz = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  reloadDeck(): void {
    this.loadDeck(true);
  }

  onCardPointerDown(event: PointerEvent): void {
    if (!this.hasMoreCards || this.swipeAnim) return;
    this.dragging = true;
    this.dragStartX = event.clientX;
    this.pointerId = event.pointerId;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onCardPointerMove(event: PointerEvent): void {
    if (!this.dragging || event.pointerId !== this.pointerId) return;
    this.dragX = event.clientX - this.dragStartX;
    this.cdr.detectChanges();
  }

  onCardPointerUp(event: PointerEvent): void {
    if (!this.dragging || event.pointerId !== this.pointerId) return;
    this.dragging = false;
    this.pointerId = null;

    const threshold = 80;
    if (this.dragX < -threshold) {
      this.commitSwipe(true);
    } else if (this.dragX > threshold) {
      this.commitSwipe(false);
    } else {
      this.dragX = 0;
      this.cdr.detectChanges();
    }
  }

  /** Vuốt phải→trái = thích; trái→phải = bỏ qua */
  handleLikeButton(): void {
    this.commitSwipe(true);
  }

  handlePassButton(): void {
    this.commitSwipe(false);
  }

  private commitSwipe(isLike: boolean): void {
    if (!this.isPremium && this.swipeData.count >= this.freeSwipeLimit) {
      this.showUpgradePrompt = true;
      this.dragX = 0;
      return;
    }
    const card = this.currentCard;
    if (!card) return;

    this.swipeAnim = isLike ? 'like' : 'pass';
    this.dragX = 0;
    this.cdr.detectChanges();

    setTimeout(() => {
      if (!this.isPremium) {
        const next = { ...this.swipeData, count: this.swipeData.count + 1 };
        this.swipeData = next;
        saveSwipeData(this.userId, next);
      }

      this.lifestyle
        .swipeUser(card.userId, isLike)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();

      if (isLike) {
        this.addToWishlist(card);
      }

      this.swipeAnim = null;
      this.currentIndex += 1;
      this.cdr.detectChanges();
    }, 280);
  }

  /** Thêm vào wishlist — không trùng userId (kể cả sau tải lại trang). */
  private addToWishlist(card: DiscoveryCard): void {
    if (this.likedUsers.some((u) => u.userId === card.userId)) return;
    const item: DiscoveryWishlistItem = {
      userId: card.userId,
      displayName: card.displayName,
      avatarUrl: card.avatarUrl,
      matchingScore: card.matchingScore
    };
    this.likedUsers = [item, ...this.likedUsers];
    saveDiscoveryWishlist(this.userId, this.likedUsers);
  }

  removeFromWishlist(userId: string, event?: Event): void {
    event?.stopPropagation();
    this.likedUsers = this.likedUsers.filter((u) => u.userId !== userId);
    saveDiscoveryWishlist(this.userId, this.likedUsers);
    this.cdr.detectChanges();
  }

  focusWishlistCard(userId: string): void {
    let idx = this.deck.findIndex((c) => c.userId === userId);
    if (idx === -1) {
      const card = this.allCards.find((c) => c.userId === userId);
      if (!card) return;
      this.deck = [...this.deck.slice(0, this.currentIndex), card, ...this.deck.slice(this.currentIndex)];
      idx = this.currentIndex;
    }
    this.swipeAnim = null;
    this.dragX = 0;
    this.dragging = false;
    this.currentIndex = idx;
    this.cdr.detectChanges();
  }

  isWishlistCardActive(userId: string): boolean {
    return this.currentCard?.userId === userId;
  }

  /** Cập nhật snapshot wishlist từ deck mới tải (giữ thứ tự, bỏ trùng). */
  private syncWishlistWithDeck(cards: DiscoveryCard[]): void {
    if (!this.likedUsers.length) return;
    const byId = new Map(cards.map((c) => [c.userId, c]));
    this.likedUsers = this.likedUsers.map((item) => {
      const fresh = byId.get(item.userId);
      if (!fresh) return item;
      return {
        userId: fresh.userId,
        displayName: fresh.displayName,
        avatarUrl: fresh.avatarUrl,
        matchingScore: fresh.matchingScore
      };
    });
    saveDiscoveryWishlist(this.userId, this.likedUsers);
  }

  scoreColor(score: number): string {
    if (score >= 80) return '#2ECC71';
    if (score >= 60) return '#F1C40F';
    return '#E74C3C';
  }

  scoreRingStyle(score: number): Record<string, string> {
    const color = this.scoreColor(score);
    return {
      background: `conic-gradient(${color} ${score * 3.6}deg, rgba(255,255,255,0.15) 0deg)`,
      borderColor: color
    };
  }
}
