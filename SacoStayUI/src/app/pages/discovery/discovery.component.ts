import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, switchMap, take, skip } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { LifestyleAnswersPanelComponent } from '../../components/profile/lifestyle-answers-panel.component';
import { DiscoveryFilterPanelComponent } from '../../components/discovery/discovery-filter-panel.component';
import { AuthService } from '../../services/auth.service';
import { LifestyleService } from '../../services/lifestyle.service';
import { DiscoveryProfileService, type DiscoveryCard } from '../../services/discovery-profile.service';
import { setTenantPremium, userIdFromUser } from '../../utils/user-display';
import { hasCompletedLifestyleQuiz, setLifestyleQuizCompleted } from '../../utils/lifestyle-storage';
import type { WishlistItem as ApiWishlistItem, SwipeQuota } from '../../models/lifestyle.models';
import {
  DEFAULT_DISCOVERY_FILTERS,
  FREE_WEEKLY_SWIPE_LIMIT,
  matchesDiscoveryFilters,
  type DiscoveryFilters
} from '../../utils/discovery-filters';
import type { UserLifestyleAnswer } from '../../models/lifestyle.models';

/** Sidebar wishlist — đồng bộ từ GET /api/Lifestyle/my-likes */
export type DiscoveryWishlistItem = ApiWishlistItem;

@Component({
  selector: 'app-discovery',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NavbarComponent,
    LifestyleAnswersPanelComponent,
    DiscoveryFilterPanelComponent
  ],
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
  swipeQuota: SwipeQuota = {
    isPremium: false,
    weeklyLimit: FREE_WEEKLY_SWIPE_LIMIT,
    usedThisWeek: 0,
    remaining: FREE_WEEKLY_SWIPE_LIMIT,
    weekResetAt: new Date().toISOString()
  };
  showUpgradePrompt = false;
  showFilterPanel = false;
  activeFilters: DiscoveryFilters = { ...DEFAULT_DISCOVERY_FILTERS };
  draftFilters: DiscoveryFilters = { ...DEFAULT_DISCOVERY_FILTERS };

  swipeAnim: 'like' | 'pass' | null = null;
  dragX = 0;
  private dragging = false;
  private dragStartX = 0;
  private pointerId: number | null = null;

  private userId = '';
  private myAnswers: UserLifestyleAnswer[] = [];

  readonly freeSwipeLimit = FREE_WEEKLY_SWIPE_LIMIT;

  private readonly lifestyle = inject(LifestyleService);
  private readonly discoveryProfiles = inject(DiscoveryProfileService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  get isPremium(): boolean {
    return this.swipeQuota.isPremium;
  }

  /** Số người duy nhất trong wishlist (tránh đếm trùng khi DB còn bản ghi cũ). */
  get wishlistCount(): number {
    return new Set(this.likedUsers.map((u) => u.userId)).size;
  }

  ngOnInit(): void {
    this.enterDiscovery();

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        filter((e) => e.urlAfterRedirects.split('?')[0].includes('/discovery')),
        skip(1),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.enterDiscovery());
  }

  /** Mỗi lần vào /discovery: tải lại deck (gồm người đã swipe) + wishlist + quota. */
  private enterDiscovery(): void {
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
    this.currentIndex = 0;
    this.swipeAnim = null;
    this.dragX = 0;
    if (!hasCompletedLifestyleQuiz(userId)) {
      this.needsQuiz = true;
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }
    this.needsQuiz = false;
    this.loadDeck(true);
  }

  get currentCard(): DiscoveryCard | null {
    return this.deck[this.currentIndex] ?? null;
  }

  get hasMoreCards(): boolean {
    return this.currentIndex < this.deck.length;
  }

  get remainingSwipes(): number {
    if (this.isPremium) return 999;
    return this.swipeQuota.remaining ?? Math.max(0, this.freeSwipeLimit - this.swipeQuota.usedThisWeek);
  }

  get remainingSwipesLabel(): string {
    return this.isPremium ? '∞' : String(this.remainingSwipes);
  }

  get daysUntilReset(): number {
    const reset = new Date(this.swipeQuota.weekResetAt);
    if (Number.isNaN(reset.getTime())) return 7;
    const days = Math.ceil((reset.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
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
    this.deckEmpty = this.allCards.length === 0;
  }

  loadDeck(includeSwiped: boolean): void {
    this.loading = true;
    const limit = this.isPremium ? 100 : 50;
    forkJoin({
      deck: this.lifestyle.getSwipeDeck(limit, includeSwiped),
      myAnswers: this.lifestyle.getMyAnswers(),
      wishlist: this.lifestyle.getMyLikes(),
      quota: this.lifestyle.getSwipeQuota()
    })
      .pipe(
        switchMap(({ deck, myAnswers, wishlist, quota }) => {
          this.myAnswers = myAnswers;
          this.likedUsers = wishlist;
          this.swipeQuota = quota;
          if (this.swipeQuota.isPremium) setTenantPremium(true);
          if (!deck.length) return of([] as DiscoveryCard[]);
          return this.discoveryProfiles.enrichDeck(deck, myAnswers);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (cards) => {
          this.allCards = cards;
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

  private refreshQuota(): void {
    this.lifestyle
      .getSwipeQuota()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => {
        this.swipeQuota = q;
        if (q.isPremium) setTenantPremium(true);
        this.cdr.detectChanges();
      });
  }

  private refreshWishlist(): void {
    this.lifestyle
      .getMyLikes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => {
        this.likedUsers = list;
        this.cdr.detectChanges();
      });
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

  handleLikeButton(): void {
    this.commitSwipe(true);
  }

  handlePassButton(): void {
    this.commitSwipe(false);
  }

  private isInWishlist(userId: string): boolean {
    return this.likedUsers.some((u) => u.userId === userId);
  }

  /** Hiển thị ngay trên sidebar; API đồng bộ sau khi swipe thành công. */
  private addToWishlistOptimistic(card: DiscoveryCard): void {
    if (this.isInWishlist(card.userId)) return;
    const item: DiscoveryWishlistItem = {
      userId: card.userId,
      displayName: card.displayName,
      avatarUrl: card.avatarUrl,
      matchingScore: card.matchingScore,
      likedAt: new Date().toISOString()
    };
    this.likedUsers = [item, ...this.likedUsers];
    this.cdr.detectChanges();
  }

  private removeFromWishlistOptimistic(userId: string): void {
    this.likedUsers = this.likedUsers.filter((u) => u.userId !== userId);
    this.cdr.detectChanges();
  }

  genderLabel(gender: DiscoveryCard['gender']): string {
    if (gender === 'male') return 'Nam';
    if (gender === 'female') return 'Nữ';
    return 'Khác';
  }

  private commitSwipe(isLike: boolean): void {
    if (!this.isPremium && this.remainingSwipes <= 0) {
      this.showUpgradePrompt = true;
      this.dragX = 0;
      return;
    }
    const card = this.currentCard;
    if (!card) return;

    this.swipeAnim = isLike ? 'like' : 'pass';
    this.dragX = 0;
    this.cdr.detectChanges();

    if (isLike) {
      this.addToWishlistOptimistic(card);
    }

    setTimeout(() => {
      this.lifestyle
        .swipeUser(card.userId, isLike)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            if (isLike) {
              this.refreshWishlist();
            }
            this.refreshQuota();
          },
          error: () => {
            if (isLike) {
              this.removeFromWishlistOptimistic(card.userId);
            }
          }
        });

      this.swipeAnim = null;
      this.currentIndex += 1;
      this.cdr.detectChanges();
    }, 280);
  }

  removeFromWishlist(userId: string, event?: Event): void {
    event?.stopPropagation();
    this.lifestyle
      .removeLike(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.likedUsers = this.likedUsers.filter((u) => u.userId !== userId);
        this.cdr.detectChanges();
      });
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
