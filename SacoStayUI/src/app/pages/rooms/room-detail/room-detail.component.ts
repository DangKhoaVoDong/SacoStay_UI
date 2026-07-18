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
import { SharedSpaceService } from '../../../services/shared-space.service';
import { UiToastService } from '../../../services/ui-toast.service';
import { isLandlordUser } from '../../../utils/user-display';
import { getVipTierTitleClass } from '../../../utils/vip-tier-styles';
import type { RoomPostDetail } from '../../../models/room-post.models';
import type { SharedSpaceSummary } from '../../../models/shared-space.models';

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
  sharedSpaces: SharedSpaceSummary[] = [];
  roomInShortlist = false;
  addingToShortlist = false;
  showSpacePicker = false;
  spacePickerOptions: SharedSpaceSummary[] = [];

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly roomPosts = inject(RoomPostService);
  private readonly auth = inject(AuthService);
  private readonly sharedSpaceService = inject(SharedSpaceService);
  private readonly toast = inject(UiToastService);
  private readonly peerProfiles = inject(ChatPeerProfileService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  landlordChatName = '';
  landlordChatAvatar = '';
  landlordPhone = '';
  contactingLandlord = false;
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
            if (!isLandlordUser(this.auth.getCurrentUser())) {
              this.loadSharedSpaceState(room.id);
            }
          } else if (room?.landlordUserId) {
            this.loadLandlordChatMeta(room.landlordUserId);
          }
          this.landlordPhone = (room?.landlordPhone || '').trim();
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
        if (p.phoneNumber?.trim()) {
          this.landlordPhone = p.phoneNumber.trim();
        }
        this.cdr.detectChanges();
      });
  }

  /** Hiện thông báo kèm SĐT chủ trọ (BE trả PhoneNumber trên GET Auth/user khi là landlord). */
  contactLandlord(): void {
    if (this.isLandlord || this.contactingLandlord) return;

    const fromRoom = (this.room?.landlordPhone || this.landlordPhone || '').trim();
    if (fromRoom) {
      this.showLandlordPhoneToast(fromRoom);
      return;
    }

    const landlordId = this.room?.landlordUserId;
    if (!landlordId) {
      this.toast.info('Chưa có số điện thoại liên hệ của chủ trọ.');
      return;
    }

    this.contactingLandlord = true;
    this.peerProfiles
      .fetchPeer(landlordId, { role: 'landlord', forceRefresh: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.contactingLandlord = false;
          const phone = (p.phoneNumber || '').trim();
          if (phone) {
            this.landlordPhone = phone;
            this.showLandlordPhoneToast(phone);
          } else {
            this.toast.info('Chủ trọ chưa cập nhật số điện thoại.');
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.contactingLandlord = false;
          this.toast.error('Không lấy được thông tin liên hệ chủ trọ. Thử lại sau.');
          this.cdr.detectChanges();
        }
      });
  }

  private showLandlordPhoneToast(phone: string): void {
    this.toast.show(`Liên hệ chủ trọ: ${phone}`, 'info', 8000);
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

  get statusLabel(): string {
    const s = (this.room?.status ?? '').toLowerCase();
    if (!s || s === 'active' || s === 'published' || s === 'approved') return 'Có sẵn';
    return this.room?.status ?? 'Có sẵn';
  }

  formatPrice(price?: number): string {
    if (!price) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }

  get backLabel(): string {
    if (!this.isLandlord) return 'Quay lại danh sách phòng';
    const from = this.route.snapshot.queryParamMap.get('from');
    return from === 'rooms' ? 'Quay lại danh sách phòng' : 'Quay lại tin đăng';
  }

  goBack(): void {
    if (!this.isLandlord) {
      void this.router.navigate(['/rooms']);
      return;
    }
    const from = this.route.snapshot.queryParamMap.get('from');
    void this.router.navigate([from === 'rooms' ? '/rooms' : '/my-listings']);
  }

  openReport(): void {
    this.showReport = true;
  }

  closeReport(): void {
    this.showReport = false;
  }

  get activeSharedSpaces(): SharedSpaceSummary[] {
    return this.sharedSpaces.filter((s) => s.status === 'Active');
  }

  get addableSpaces(): SharedSpaceSummary[] {
    const roomId = this.room?.id;
    if (!roomId) return [];
    return this.activeSharedSpaces.filter((s) => !s.shortlistRoomIds.includes(roomId));
  }

  get hasSharedSpaces(): boolean {
    return this.sharedSpaces.length > 0;
  }

  get canAddToSharedShortlist(): boolean {
    return this.addableSpaces.length > 0 && !this.isLandlord;
  }

  get sharedShortlistAdded(): boolean {
    const roomId = this.room?.id;
    if (!roomId || !this.activeSharedSpaces.length) return false;
    return this.activeSharedSpaces.every((s) => s.shortlistRoomIds.includes(roomId));
  }

  private loadSharedSpaceState(roomId: string): void {
    this.sharedSpaceService
      .listSpaces()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (spaces) => {
          this.sharedSpaces = spaces;
          this.roomInShortlist = spaces
            .filter((s) => s.status === 'Active')
            .some((s) => s.shortlistRoomIds.includes(roomId));
          this.cdr.detectChanges();
        },
        error: () => {
          this.sharedSpaces = [];
          this.roomInShortlist = false;
        }
      });
  }

  addToSharedShortlist(): void {
    if (!this.room || this.addingToShortlist) return;

    const candidates = this.addableSpaces;
    if (!candidates.length) return;

    if (candidates.length === 1) {
      this.addToSpace(candidates[0].id);
      return;
    }

    this.spacePickerOptions = candidates;
    this.showSpacePicker = true;
    this.cdr.detectChanges();
  }

  closeSpacePicker(): void {
    this.showSpacePicker = false;
    this.spacePickerOptions = [];
    this.cdr.detectChanges();
  }

  addToSelectedSpace(spaceId: string): void {
    this.closeSpacePicker();
    this.addToSpace(spaceId);
  }

  private spaceLabel(spaceId: string): string {
    return this.sharedSpaces.find((s) => s.id === spaceId)?.partnerName ?? 'Bạn cùng phòng';
  }

  private addToSpace(spaceId: string): void {
    if (!this.room || this.addingToShortlist) return;
    const partnerLabel = this.spaceLabel(spaceId);
    this.addingToShortlist = true;
    this.sharedSpaceService
      .addToShortlist(spaceId, this.room.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(`Đã thêm vào không gian chung thành công\n${partnerLabel}`);
          this.addingToShortlist = false;
          if (this.room) {
            this.loadSharedSpaceState(this.room.id);
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.addingToShortlist = false;
          this.toast.error(err?.error?.message ?? 'Không thể thêm phòng vào danh sách chung.');
          this.cdr.detectChanges();
        }
      });
  }
}
