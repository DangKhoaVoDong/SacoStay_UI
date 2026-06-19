import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { AuthService } from '../../services/auth.service';
import { SharedSpaceService } from '../../services/shared-space.service';
import { UiToastService } from '../../services/ui-toast.service';
import {
  hasSeenFinalizeCelebration,
  markFinalizeCelebrationSeen
} from '../../utils/shared-space-celebration.storage';
import type { SharedSpaceCurrent, SharedSpaceShortlistItem } from '../../models/shared-space.models';

@Component({
  selector: 'app-shared-space',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  templateUrl: './shared-space.component.html',
  styleUrl: './shared-space.component.css'
})
export class SharedSpaceComponent implements OnInit {
  private readonly sharedSpace = inject(SharedSpaceService);
  private readonly toast = inject(UiToastService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = true;
  space: SharedSpaceCurrent | null = null;
  notFound = false;
  showCelebration = false;
  actionLoading = false;
  private spaceIdQuery = '';

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.spaceIdQuery = (params.get('spaceId') ?? '').trim();
      this.loadSpace();
    });
  }

  loadSpace(): void {
    this.loading = true;
    const request = this.spaceIdQuery
      ? this.sharedSpace.getSpaceById(this.spaceIdQuery)
      : this.sharedSpace.getCurrentSpace();
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (space) => {
        this.space = space;
        this.notFound = !space;
        this.loading = false;
        if (space?.status === 'Finalized') {
          this.applyCelebrationOnLoad(space);
        } else {
          this.showCelebration = false;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.notFound = true;
        this.cdr.detectChanges();
      }
    });
  }

  get isActive(): boolean {
    return this.space?.status === 'Active';
  }

  get isPendingFinalize(): boolean {
    return this.space?.status === 'PendingFinalize';
  }

  get isFinalized(): boolean {
    return this.space?.status === 'Finalized';
  }

  get isProposer(): boolean {
    if (!this.space?.finalizeRequestedByUserId) return false;
    return this.space.finalizeRequestedByUserId === this.space.myId;
  }

  get isApprover(): boolean {
    return this.isPendingFinalize && !this.isProposer;
  }

  get proposedRoom(): SharedSpaceShortlistItem | null {
    if (!this.space?.finalizedRoomId) return null;
    return this.space.shortlist.find((s) => s.roomId === this.space!.finalizedRoomId) ?? null;
  }

  bothLiked(item: SharedSpaceShortlistItem): boolean {
    return item.myVote === 'Like' && item.partnerVote === 'Like';
  }

  formatPrice(price: number): string {
    if (!price) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }

  voteLabel(vote: string): string {
    if (vote === 'Like') return 'Thích';
    if (vote === 'Dislike') return 'Không thích';
    return 'Chưa bình chọn';
  }

  voteClass(vote: string, mine: boolean): string {
    if (vote === 'Like') return mine ? 'shared-vote shared-vote--like-mine' : 'shared-vote shared-vote--like';
    if (vote === 'Dislike') return mine ? 'shared-vote shared-vote--dislike-mine' : 'shared-vote shared-vote--dislike';
    return 'shared-vote shared-vote--none';
  }

  onVote(item: SharedSpaceShortlistItem, voteStatus: 'Like' | 'Dislike'): void {
    if (!this.isActive || this.actionLoading) return;
    this.actionLoading = true;
    this.sharedSpace
      .voteRoom(item.id, voteStatus)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (msg) => {
          this.toast.success(msg);
          this.actionLoading = false;
          this.loadSpace();
        },
        error: (err) => {
          this.actionLoading = false;
          this.toast.error(err?.error?.message ?? 'Không thể cập nhật biểu quyết.');
          this.cdr.detectChanges();
        }
      });
  }

  onProposeFinalize(item: SharedSpaceShortlistItem): void {
    if (!this.space || !this.bothLiked(item) || this.actionLoading) return;
    this.actionLoading = true;
    this.sharedSpace
      .proposeFinalize(this.space.id, item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (msg) => {
          this.toast.success(msg);
          this.actionLoading = false;
          this.loadSpace();
        },
        error: (err) => {
          this.actionLoading = false;
          this.toast.error(err?.error?.message ?? 'Không thể gửi đề xuất chốt phòng.');
          this.cdr.detectChanges();
        }
      });
  }

  onAcceptFinalize(): void {
    if (!this.space || this.actionLoading) return;
    this.actionLoading = true;
    this.sharedSpace
      .acceptFinalize(this.space.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (msg) => {
          this.toast.success(msg);
          this.actionLoading = false;
          this.loadSpace();
        },
        error: (err) => {
          this.actionLoading = false;
          this.toast.error(err?.error?.message ?? 'Không thể xác nhận chốt phòng.');
          this.cdr.detectChanges();
        }
      });
  }

  onRejectFinalize(): void {
    if (!this.space || this.actionLoading) return;
    this.actionLoading = true;
    this.sharedSpace
      .rejectFinalize(this.space.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (msg) => {
          this.toast.info(msg);
          this.actionLoading = false;
          this.loadSpace();
        },
        error: (err) => {
          this.actionLoading = false;
          this.toast.error(err?.error?.message ?? 'Không thể hủy đề xuất.');
          this.cdr.detectChanges();
        }
      });
  }

  dismissCelebration(): void {
    const userId = this.auth.getCurrentUser()?.id ?? '';
    const spaceId = this.space?.id ?? '';
    if (userId && spaceId) {
      markFinalizeCelebrationSeen(userId, spaceId);
    }
    this.showCelebration = false;
  }

  private applyCelebrationOnLoad(space: SharedSpaceCurrent): void {
    const userId = this.auth.getCurrentUser()?.id ?? '';
    if (!userId || space.status !== 'Finalized') {
      this.showCelebration = false;
      return;
    }
    this.showCelebration = !hasSeenFinalizeCelebration(userId, space.id);
  }

  goFindRooms(): void {
    if (!this.space?.id || this.space.status !== 'Active') return;
    void this.router.navigate(['/rooms']);
  }

  goBack(): void {
    if (this.space?.partnerId) {
      void this.router.navigate(['/chat'], {
        queryParams: {
          with: this.space.partnerId,
          name: this.space.partnerName,
          role: 'tenant'
        }
      });
      return;
    }
    void this.router.navigate(['/chat']);
  }
}
