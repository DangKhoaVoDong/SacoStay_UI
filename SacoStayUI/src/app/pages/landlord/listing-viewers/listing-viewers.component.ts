import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { LandlordLayoutComponent } from '../../../components/layout/landlord/landlord-layout.component';
import { AuthService } from '../../../services/auth.service';
import { LifestyleService } from '../../../services/lifestyle.service';
import { RoomPostService } from '../../../services/room-post.service';
import { getApiErrorMessage } from '../../../services/auth.service';
import type { RoomPostSummary, RoomPostViewerRow } from '../../../models/room-post.models';
import { formatRelativeTimeVi } from '../../../utils/relative-time';
import { resolveVipTier, type VipTier } from '../../../utils/user-display';

export interface ViewerDisplayRow extends RoomPostViewerRow {
  displayName: string;
  avatarUrl: string;
  viewTimeLabel: string;
}

@Component({
  selector: 'app-listing-viewers',
  standalone: true,
  imports: [CommonModule, RouterLink, LandlordLayoutComponent],
  templateUrl: './listing-viewers.component.html'
})
export class ListingViewersComponent implements OnInit {
  posts: RoomPostSummary[] = [];
  selectedPostId = '';
  viewers: ViewerDisplayRow[] = [];
  totalViewsIn24H = 0;
  isLimitedView = false;
  apiPackage = 'BASIC';
  vipTier: VipTier = 'free';

  loading = true;
  loadingViewers = false;
  errorMessage = '';

  selectedViewer: ViewerDisplayRow | null = null;
  matchScore: number | null = null;
  matchLoading = false;

  private readonly roomPosts = inject(RoomPostService);
  private readonly auth = inject(AuthService);
  private readonly lifestyle = inject(LifestyleService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.vipTier = resolveVipTier(this.auth.getCurrentUser());
    this.roomPosts
      .getMyPosts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.posts = list;
          this.selectedPostId = list.length > 1 ? 'all' : (list[0]?.id ?? '');
          this.loading = false;
          this.loadViewers();
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Không tải được danh sách tin đăng.';
          this.cdr.detectChanges();
        }
      });
  }

  onPostChange(postId: string): void {
    this.selectedPostId = postId;
    this.selectedViewer = null;
    this.loadViewers();
  }

  loadViewers(): void {
    if (!this.posts.length) {
      this.viewers = [];
      return;
    }
    const ids =
      this.selectedPostId === 'all' ? this.posts.map((p) => p.id).filter(Boolean) : [this.selectedPostId].filter(Boolean);
    if (!ids.length) return;

    this.loadingViewers = true;
    this.errorMessage = '';
    forkJoin(ids.map((id) => this.roomPosts.getRoomViewAnalytics(id)))
      .pipe(
        map((rows) => this.mergeAnalytics(rows)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (merged) => {
          this.viewers = merged.viewers;
          this.totalViewsIn24H = merged.totalViews;
          this.isLimitedView = merged.isLimited;
          this.apiPackage = merged.package;
          this.loadingViewers = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loadingViewers = false;
          this.errorMessage = getApiErrorMessage(err) || 'Không tải được phân tích lượt xem.';
          this.cdr.detectChanges();
        }
      });
  }

  openViewer(row: ViewerDisplayRow): void {
    this.selectedViewer = row;
    this.matchScore = null;
    this.matchLoading = true;
    this.lifestyle
      .getMatchingScore(row.tenantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.matchScore = res.matchingScore;
          this.matchLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.matchLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  closeViewer(): void {
    this.selectedViewer = null;
    this.matchScore = null;
  }

  getViewerLimitLabel(): string {
    if (this.isLimitedView) return 'Gói hiện tại: tối đa 5 người xem gần nhất trong 24h (theo API)';
    return 'Gói ELITE: xem toàn bộ lượt xem trong 24h';
  }

  getVipBadgeLabel(): string {
    return this.vipTier.toUpperCase();
  }

  private mergeAnalytics(
    rows: {
      totalViewsIn24H: number;
      isLimitedView: boolean;
      currentPackage: string;
      viewers: RoomPostViewerRow[];
    }[]
  ): { viewers: ViewerDisplayRow[]; totalViews: number; isLimited: boolean; package: string } {
    const allRows = rows.flatMap((r) => r.viewers);
    const byTenant = new Map<string, ViewerDisplayRow>();
    for (const v of allRows) {
      const existing = byTenant.get(v.tenantId);
      const next = this.toDisplayRow(v);
      if (!existing || new Date(next.viewedAt).getTime() > new Date(existing.viewedAt).getTime()) {
        byTenant.set(v.tenantId, next);
      }
    }
    const viewers = [...byTenant.values()].sort(
      (a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime()
    );
    const totalViews = rows.reduce((s, r) => s + r.totalViewsIn24H, 0);
    const isLimited = rows.some((r) => r.isLimitedView);
    const packageName = rows[0]?.currentPackage ?? 'BASIC';
    return { viewers, totalViews, isLimited, package: packageName };
  }

  private toDisplayRow(v: RoomPostViewerRow): ViewerDisplayRow {
    const shortId = v.tenantId.replace(/-/g, '').slice(0, 8).toUpperCase();
    const displayName = `Khách #${shortId}`;
    return {
      ...v,
      displayName,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=FF9F43&color=fff&size=128`,
      viewTimeLabel: formatRelativeTimeVi(v.viewedAt)
    };
  }
}
