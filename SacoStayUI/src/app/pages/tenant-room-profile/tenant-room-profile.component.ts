import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { TenantRoomDetailsFormComponent } from '../../components/tenant-room/tenant-room-details-form.component';
import { AuthService, getApiErrorMessage } from '../../services/auth.service';
import { TenantRoomProfileService } from '../../services/tenant-room-profile.service';
import { LifestyleService } from '../../services/lifestyle.service';
import { UiToastService } from '../../services/ui-toast.service';
import {
  emptyTenantRoomProfileForm,
  formatTenantRoomPriceInput,
  isTenantRoomProfileComplete,
  parseTenantRoomPriceInput,
  type TenantRoomProfileForm
} from '../../utils/tenant-room-filters';
import {
  getGuestTenantRoomProfile,
  saveGuestTenantRoomProfile
} from '../../utils/guest-discovery.storage';
import { roomStatusFromAnswers } from '../../utils/lifestyle-display';
import { resolvePostLoginUrl } from '../../utils/auth-navigation';
import { resolveMediaUrl } from '../../utils/media-url';

@Component({
  selector: 'app-tenant-room-profile',
  standalone: true,
  imports: [CommonModule, NavbarComponent, TenantRoomDetailsFormComponent, RouterLink],
  templateUrl: './tenant-room-profile.component.html',
  styleUrl: './tenant-room-profile.component.css'
})
export class TenantRoomProfileComponent implements OnInit {
  loading = true;
  saving = false;
  deletingImageUrl: string | null = null;
  notEligible = false;
  form: TenantRoomProfileForm = emptyTenantRoomProfileForm();
  existingImages: string[] = [];
  pendingImageFiles: File[] = [];
  pendingImagePreviews: string[] = [];
  guestMode = false;
  returnUrl = '/profile/me';
  readonly maxImages = 10;

  private readonly auth = inject(AuthService);
  private readonly tenantRoomProfiles = inject(TenantRoomProfileService);
  private readonly lifestyle = inject(LifestyleService);
  private readonly toast = inject(UiToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.guestMode = this.route.snapshot.queryParamMap.get('guest') === '1' || !this.auth.isLoggedIn;
    this.returnUrl = resolvePostLoginUrl(
      this.route.snapshot.queryParamMap.get('returnUrl'),
      this.guestMode ? '/discovery' : '/profile/me'
    );

    if (this.guestMode) {
      this.form = getGuestTenantRoomProfile() ?? emptyTenantRoomProfileForm();
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    if (!this.auth.isLoggedIn) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    this.lifestyle
      .getMyAnswers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (answers) => {
          const room = roomStatusFromAnswers(answers);
          if (!room.hasRoom) {
            this.notEligible = true;
            this.loading = false;
            this.cdr.detectChanges();
            return;
          }
          this.loadMyProfile();
        },
        error: () => {
          this.notEligible = true;
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  get totalImageCount(): number {
    return this.existingImages.length + this.pendingImageFiles.length;
  }

  get canAddMoreImages(): boolean {
    return this.totalImageCount < this.maxImages;
  }

  imageSrc(url: string): string {
    return resolveMediaUrl(url);
  }

  private loadMyProfile(): void {
    this.tenantRoomProfiles
      .getMyProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          if (profile) {
            this.form = {
              city: profile.city ?? 'all',
              district: profile.district ?? 'all',
              maxPeople: profile.maxPeople ?? 2,
              priceInput: formatTenantRoomPriceInput(profile.price),
              amenities: profile.amenities ?? [],
              extraNotes: profile.extraNotes ?? ''
            };
            this.existingImages = profile.images ?? [];
          }
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  onFormChange(form: TenantRoomProfileForm): void {
    this.form = form;
    this.cdr.detectChanges();
  }

  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;

    const slots = this.maxImages - this.totalImageCount;
    if (slots <= 0) {
      this.toast.error(`Tối đa ${this.maxImages} ảnh.`);
      return;
    }

    const accepted = files.slice(0, slots);
    if (accepted.length < files.length) {
      this.toast.error(`Chỉ thêm được tối đa ${slots} ảnh nữa.`);
    }

    for (const file of accepted) {
      this.pendingImageFiles.push(file);
      this.pendingImagePreviews.push(URL.createObjectURL(file));
    }
    this.cdr.detectChanges();
  }

  removePendingImage(index: number): void {
    const preview = this.pendingImagePreviews[index];
    if (preview) URL.revokeObjectURL(preview);
    this.pendingImageFiles.splice(index, 1);
    this.pendingImagePreviews.splice(index, 1);
    this.cdr.detectChanges();
  }

  deleteExistingImage(imageUrl: string): void {
    if (this.deletingImageUrl || this.guestMode) return;
    this.deletingImageUrl = imageUrl;
    this.tenantRoomProfiles
      .deleteImage(imageUrl)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.existingImages = result.profile?.images ?? this.existingImages.filter((u) => u !== imageUrl);
          this.deletingImageUrl = null;
          this.toast.success(result.message);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.deletingImageUrl = null;
          this.toast.error(getApiErrorMessage(err) || 'Không thể xóa ảnh.');
          this.cdr.detectChanges();
        }
      });
  }

  skipForNow(): void {
    void this.router.navigateByUrl(this.returnUrl);
  }

  save(): void {
    if (!isTenantRoomProfileComplete(this.form)) {
      this.toast.error('Vui lòng chọn địa điểm và số người tối đa.');
      return;
    }

    const priceInput = this.form.priceInput.trim();
    const price = parseTenantRoomPriceInput(priceInput);
    if (priceInput && price == null) {
      this.toast.error('Giá thuê không hợp lệ. Vui lòng nhập số VND (VD: 3000000).');
      return;
    }

    const payload = {
      city: this.form.city,
      district: this.form.district,
      maxPeople: this.form.maxPeople,
      price: price ?? undefined,
      amenities: this.form.amenities,
      extraNotes: this.form.extraNotes.trim() || undefined
    };

    if (this.guestMode) {
      saveGuestTenantRoomProfile(this.form);
      this.toast.success('Đã lưu thông tin phòng (phiên dùng thử).');
      void this.router.navigateByUrl(this.returnUrl);
      return;
    }

    this.saving = true;
    this.tenantRoomProfiles
      .save({ payload, imageFiles: this.pendingImageFiles })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.saving = false;
          this.pendingImagePreviews.forEach((p) => URL.revokeObjectURL(p));
          this.pendingImageFiles = [];
          this.pendingImagePreviews = [];
          if (result.profile?.images) {
            this.existingImages = result.profile.images;
          }
          this.toast.success(result.message);
          void this.router.navigateByUrl(this.returnUrl);
        },
        error: (err) => {
          this.saving = false;
          this.toast.error(getApiErrorMessage(err) || 'Không thể lưu thông tin phòng trọ.');
          this.cdr.detectChanges();
        }
      });
  }
}
