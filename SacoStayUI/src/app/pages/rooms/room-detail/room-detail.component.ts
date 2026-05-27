import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../../components/layout/navbar.component';
import { LandlordLayoutComponent } from '../../../components/layout/landlord/landlord-layout.component';
import { ReportModalComponent } from '../../../components/shared/report-modal/report-modal.component';
import { AuthService } from '../../../services/auth.service';
import { ChatPeerProfileService } from '../../../services/chat-peer-profile.service';
import { RoomPostService } from '../../../services/room-post.service';
import { isLandlordUser } from '../../../utils/user-display';
import { getVipTierTitleClass } from '../../../utils/vip-tier-styles';
import type { RoomPostDetail } from '../../../models/room-post.models';

@Component({
  selector: 'app-room-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, LandlordLayoutComponent, ReportModalComponent],
  templateUrl: './room-detail.component.html'
})
export class RoomDetailComponent implements OnInit {
  room: RoomPostDetail | null = null;
  loading = true;
  notFound = false;
  showReport = false;
  isLandlord = false;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly roomPosts = inject(RoomPostService);
  private readonly auth = inject(AuthService);
  private readonly peerProfiles = inject(ChatPeerProfileService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  landlordChatName = '';
  landlordChatAvatar = '';
  nearbyLandmarksLoading = false;

  ngOnInit(): void {
    this.auth.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((u) => {
      this.isLandlord = isLandlordUser(u);
      this.cdr.detectChanges();
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound = true;
      this.loading = false;
      return;
    }

    this.nearbyLandmarksLoading = true;
    this.roomPosts
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (room) => {
          this.room = room;
          this.notFound = !room;
          this.loading = false;
          this.nearbyLandmarksLoading = false;
          this.activeGalleryIndex = 0;
          if (room && this.auth.isLoggedIn) {
            this.roomPosts.recordView(room.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
            this.loadLandlordChatMeta(room.landlordUserId);
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.nearbyLandmarksLoading = false;
          this.notFound = true;
          this.cdr.detectChanges();
        }
      });
  }

  private loadLandlordChatMeta(landlordUserId?: string): void {
    if (!landlordUserId) {
      this.landlordChatName = '';
      this.landlordChatAvatar = '';
      return;
    }
    this.peerProfiles
      .fetchPeer(landlordUserId, { role: 'landlord' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((p) => {
        this.landlordChatName = p.displayName;
        this.landlordChatAvatar = p.avatarUrl ?? '';
        this.cdr.detectChanges();
      });
  }

  get titleClass(): string {
    return getVipTierTitleClass(this.room?.vipTier);
  }

  activeGalleryIndex = 0;

  get galleryImages(): string[] {
    if (!this.room) return [];
    if (this.room.images?.length) return this.room.images;
    return this.room.imageUrl ? [this.room.imageUrl] : [];
  }

  selectGalleryImage(index: number): void {
    if (index < 0 || index >= this.galleryImages.length) return;
    this.activeGalleryIndex = index;
  }

  get canMessageLandlord(): boolean {
    return !!this.room?.landlordUserId && !this.isLandlord;
  }

  get chatQueryParams(): Record<string, string> {
    const id = this.room?.landlordUserId || '';
    const params: Record<string, string> = { with: id, role: 'landlord' };
    if (this.landlordChatName) params['name'] = this.landlordChatName;
    if (this.landlordChatAvatar) params['avatar'] = this.landlordChatAvatar;
    return params;
  }

  get locationLine(): string {
    if (!this.room) return '';
    return this.room.address || [this.room.district, this.room.city].filter(Boolean).join(', ');
  }

  get peopleCount(): string {
    if (!this.room?.maxPeople) return '—';
    const cur = this.room.currentPeople ?? this.room.occupants?.length ?? 0;
    return `${cur}/${this.room.maxPeople}`;
  }

  get maskedPhone(): string {
    const p = this.room?.landlordPhone ?? '';
    if (!p || p.length < 6) return 'Liên hệ qua tin nhắn';
    return p.slice(0, 4) + ' *** ' + p.slice(-2);
  }

  get statusLabel(): string {
    const s = (this.room?.status ?? '').toLowerCase();
    if (!s || s === 'active' || s === 'published' || s === 'approved') return 'Có sẵn';
    return this.room?.status ?? 'Có sẵn';
  }

  formatPrice(price?: number): string {
    if (!price) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }

  goBack(): void {
    if (this.isLandlord) {
      this.router.navigate(['/my-listings']);
    } else {
      this.router.navigate(['/rooms']);
    }
  }

  openReport(): void {
    this.showReport = true;
  }

  closeReport(): void {
    this.showReport = false;
  }
}
