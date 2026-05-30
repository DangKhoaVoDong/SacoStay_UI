import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ChatPeerProfileService } from '../../../services/chat-peer-profile.service';
import { ChatService } from '../../../services/chat.service';
import { LandlordLayoutComponent } from '../../../components/layout/landlord/landlord-layout.component';
import { CompatibilityBadgeComponent } from '../../../components/profile/compatibility-badge.component';
import { AuthService } from '../../../services/auth.service';
import { LifestyleService } from '../../../services/lifestyle.service';
import { RoomPostService } from '../../../services/room-post.service';
import { getApiErrorMessage } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';
import type { RoomPostSummary, RoomPostViewerRow } from '../../../models/room-post.models';
import type { UserLifestyleAnswer } from '../../../models/lifestyle.models';
import { formatRelativeTimeVi } from '../../../utils/relative-time';
import {
  ageFromDateOfBirth,
  genderLabelVi,
  isVerifiedUser,
  jobLabelVi,
  lifestyleAnswerLabel,
  lifestyleAnswersForDisplay,
  roomStatusBadge,
  roomStatusFromAnswers
} from '../../../utils/lifestyle-display';
import {
  navProfileLabel,
  normalizeAuthUser,
  profileAvatarFromRaw,
  profileDateOfBirthSeed,
  profileLivingAreaSeed,
  resolveVipTier,
  type VipTier
} from '../../../utils/user-display';
import { resolveMediaUrl } from '../../../utils/media-url';

export interface ViewerDisplayRow extends RoomPostViewerRow {
  displayName: string;
  avatarUrl: string;
  viewTimeLabel: string;
}

@Component({
  selector: 'app-listing-viewers',
  standalone: true,
  imports: [CommonModule, RouterLink, LandlordLayoutComponent, CompatibilityBadgeComponent],
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
  viewerProfileLoading = false;
  viewerProfileError = '';

  viewerAge: number | null = null;
  viewerGenderLabel = '';
  viewerJobLabel = '';
  viewerLocation = '';
  viewerBio = '';
  viewerVerified = false;
  viewerRoomHasRoom = false;
  viewerRoomPriceLabel = '';
  viewerRoomStatusLabel = '';
  viewerLifestyleAnswers: UserLifestyleAnswer[] = [];
  landlordLifestyleAnswers: UserLifestyleAnswer[] = [];
  matchScore: number | null = null;

  private readonly roomPosts = inject(RoomPostService);
  private readonly auth = inject(AuthService);
  private readonly peerProfiles = inject(ChatPeerProfileService);
  private readonly chatService = inject(ChatService);
  private readonly lifestyle = inject(LifestyleService);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly apiUrl = environment.apiUrl;

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
          this.hydrateViewerProfiles();
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
    this.resetViewerProfile();
    this.loadViewerProfile(row);
  }

  get viewerDisplayAnswers(): UserLifestyleAnswer[] {
    return lifestyleAnswersForDisplay(this.viewerLifestyleAnswers);
  }

  categoryLabel(answer: UserLifestyleAnswer): string {
    return lifestyleAnswerLabel(answer);
  }

  isAnswerMatch(answer: UserLifestyleAnswer): boolean {
    if (!this.landlordLifestyleAnswers.length) return false;
    return this.landlordLifestyleAnswers.some(
      (m) => m.questionId === answer.questionId && m.optionId === answer.optionId
    );
  }

  chatQueryForViewer(viewer: ViewerDisplayRow): Record<string, string> {
    const q: Record<string, string> = {
      with: viewer.tenantId,
      name: viewer.displayName,
      role: 'tenants'
    };
    if (viewer.avatarUrl) q['avatar'] = viewer.avatarUrl;
    return q;
  }

  private loadViewerProfile(row: ViewerDisplayRow): void {
    this.viewerProfileLoading = true;
    this.viewerProfileError = '';

    forkJoin({
      userRaw: this.http
        .get<unknown>(`${this.apiUrl}/Auth/user/${encodeURIComponent(row.tenantId)}`)
        .pipe(catchError(() => of(null))),
      answers: this.lifestyle.getUserAnswers(row.tenantId),
      match: this.lifestyle.getMatchingScore(row.tenantId),
      myAnswers: this.lifestyle.getMyAnswers().pipe(catchError(() => of([] as UserLifestyleAnswer[])))
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ userRaw, answers, match, myAnswers }) => {
          if (!userRaw) {
            this.viewerProfileError = 'Không tải được hồ sơ người xem.';
            this.viewerProfileLoading = false;
            this.cdr.detectChanges();
            return;
          }

          const user = normalizeAuthUser(userRaw);
          const displayName = navProfileLabel(user);
          const av = profileAvatarFromRaw(user);
          row.displayName = displayName;
          row.avatarUrl = av
            ? resolveMediaUrl(av)
            : this.chatService.avatarFallback(displayName);

          this.viewerAge = ageFromDateOfBirth(profileDateOfBirthSeed(user));
          this.viewerGenderLabel = genderLabelVi(user['gender']);
          this.viewerJobLabel = jobLabelVi(String(user['job'] ?? ''));
          this.viewerLocation = profileLivingAreaSeed(user);
          this.viewerBio = String(user['bio'] ?? '').trim();
          this.viewerVerified = isVerifiedUser(user);
          this.viewerLifestyleAnswers = answers;
          this.landlordLifestyleAnswers = myAnswers;
          this.matchScore = match.matchingScore;

          const room = roomStatusFromAnswers(answers);
          this.viewerRoomHasRoom = room.hasRoom;
          this.viewerRoomPriceLabel = room.priceLabel ?? '';
          this.viewerRoomStatusLabel = roomStatusBadge(room.hasRoom);

          this.peerProfiles.seedFromHints(row.tenantId, {
            displayName,
            avatarUrl: row.avatarUrl,
            role: 'tenant'
          });

          this.viewerProfileLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.viewerProfileError = 'Không tải được hồ sơ người xem.';
          this.viewerProfileLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private resetViewerProfile(): void {
    this.viewerProfileLoading = false;
    this.viewerProfileError = '';
    this.viewerAge = null;
    this.viewerGenderLabel = '';
    this.viewerJobLabel = '';
    this.viewerLocation = '';
    this.viewerBio = '';
    this.viewerVerified = false;
    this.viewerRoomHasRoom = false;
    this.viewerRoomPriceLabel = '';
    this.viewerRoomStatusLabel = '';
    this.viewerLifestyleAnswers = [];
    this.landlordLifestyleAnswers = [];
    this.matchScore = null;
  }

  private hydrateViewerProfiles(): void {
    const ids = [...new Set(this.viewers.map((v) => v.tenantId).filter(Boolean))];
    if (!ids.length) return;
    forkJoin(ids.map((id) => this.peerProfiles.fetchPeer(id, { role: 'tenants' })))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((peers) => {
        for (const p of peers) {
          const row = this.viewers.find((v) => v.tenantId === p.id);
          if (!row) continue;
          row.displayName = p.displayName;
          row.avatarUrl = p.avatarUrl || this.chatService.avatarFallback(p.displayName);
        }
        this.cdr.detectChanges();
      });
  }

  closeViewer(): void {
    this.selectedViewer = null;
    this.resetViewerProfile();
  }

  getViewerLimitLabel(): string {
    if (this.isLimitedView) return 'Gói hiện tại: tối đa 5 người xem gần nhất trong 24h';
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
    const label = this.peerProfiles.shortLabel(v.tenantId);
    return {
      ...v,
      displayName: label,
      avatarUrl: this.chatService.avatarFallback(label),
      viewTimeLabel: formatRelativeTimeVi(v.viewedAt)
    };
  }
}
