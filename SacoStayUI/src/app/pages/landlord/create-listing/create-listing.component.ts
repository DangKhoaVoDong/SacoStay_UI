import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LandlordLayoutComponent } from '../../../components/layout/landlord/landlord-layout.component';
import { ListingMapComponent } from '../../../components/landlord/listing-map/listing-map.component';
import { AuthService, getApiErrorMessage } from '../../../services/auth.service';
import { RoomPostService } from '../../../services/room-post.service';
import { resolveVipTier } from '../../../utils/user-display';
import type { CreateRoomPostPayload } from '../../../models/room-post.models';
import { PaymentService } from '../../../services/payment.service';
import { DISTRICT_OPTIONS_BY_CITY } from '../../../utils/vietnam-districts';
import { UiToastService } from '../../../services/ui-toast.service';

const AMENITIES_LIST = [
  'Điều hòa',
  'Nóng lạnh',
  'Máy giặt',
  'Ban công',
  'Thang máy',
  'Bếp riêng',
  'Bảo vệ 24/7',
  'Chỗ để xe',
  'WiFi',
  'Tủ lạnh'
];

@Component({
  selector: 'app-create-listing',
  standalone: true,
  imports: [CommonModule, FormsModule, LandlordLayoutComponent, ListingMapComponent],
  templateUrl: './create-listing.component.html'
})
export class CreateListingComponent implements OnInit {
  readonly amenitiesList = AMENITIES_LIST;

  readonly cityOptions = [
    { value: 'Hà Nội', label: 'Hà Nội' },
    { value: 'TP.HCM', label: 'TP.HCM' }
  ];

  readonly districtOptionsByCity = DISTRICT_OPTIONS_BY_CITY;

  get districtOptions(): { value: string; label: string }[] {
    return this.districtOptionsByCity[this.city] ?? this.districtOptionsByCity['Hà Nội'];
  }

  title = '';
  address = '';
  city = 'Hà Nội';
  district = 'Cầu Giấy';
  area = '';
  maxOccupants = '';
  price = '';
  description = '';
  amenities: string[] = [];
  lat: number | null = null;
  lng: number | null = null;

  imageFiles: File[] = [];
  imagePreviews: string[] = [];

  submitting = false;
  errorMessage = '';

  private readonly auth = inject(AuthService);

  onCityChange(): void {
    const opts = this.districtOptions;
    if (!opts.some((o) => o.value === this.district)) {
      this.district = opts[0]?.value ?? '';
    }
    this.cdr.detectChanges();
  }
  private readonly roomPosts = inject(RoomPostService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(UiToastService);

  ngOnInit(): void {
    this.auth.refreshProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cdr.detectChanges());
  }

  onMapPick(loc: { lat: number; lng: number }): void {
    this.lat = loc.lat;
    this.lng = loc.lng;
    this.cdr.detectChanges();
  }

  clearLocation(): void {
    this.lat = null;
    this.lng = null;
    this.cdr.detectChanges();
  }

  toggleAmenity(amenity: string): void {
    this.amenities = this.amenities.includes(amenity)
      ? this.amenities.filter((a) => a !== amenity)
      : [...this.amenities, amenity];
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;
    this.appendFiles(Array.from(files));
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files?.length) this.appendFiles(Array.from(files));
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  removeImage(index: number): void {
    const url = this.imagePreviews[index];
    if (url) URL.revokeObjectURL(url);
    this.imagePreviews.splice(index, 1);
    this.imageFiles.splice(index, 1);
  }

  submit(event: Event): void {
    event.preventDefault();
    this.errorMessage = '';

    if (this.lat == null || this.lng == null) {
      this.errorMessage = 'Vui lòng ghim vị trí trên bản đồ.';
      return;
    }
    if (!this.imageFiles.length) {
      this.errorMessage = 'Vui lòng tải ít nhất một ảnh phòng.';
      return;
    }
    if (this.imageFiles.length > 5) {
      this.errorMessage = 'Chỉ được tải tối đa 5 ảnh phòng (theo quy định hệ thống).';
      return;
    }
    if (!this.description.trim()) {
      this.errorMessage = 'Vui lòng nhập mô tả chi tiết.';
      return;
    }
    if (this.description.trim().length < 10) {
      this.errorMessage = 'Mô tả phải có ít nhất 10 ký tự (giờ giấc, chi phí điện nước…).';
      return;
    }
    const area = Number(this.area);
    const maxPeople = Number(this.maxOccupants);
    const price = Number(this.price);
    if (!Number.isFinite(area) || area <= 0 || !Number.isFinite(maxPeople) || maxPeople <= 0 || !Number.isFinite(price) || price <= 0) {
      this.errorMessage = 'Diện tích, số người và giá thuê phải là số hợp lệ.';
      return;
    }

    const payload: CreateRoomPostPayload = {
      title: this.title.trim(),
      detailedAddress: this.address.trim(),
      city: this.city,
      district: this.district,
      area,
      maxPeople,
      price,
      latitude: this.lat,
      longitude: this.lng,
      description: this.description.trim(),
      amenities: [...this.amenities]
    };

    this.submitting = true;
    this.roomPosts
      .create(payload, this.imageFiles)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.submitting = false;
          const postId = extractCreatedPostId(res);
          if (postId) PaymentService.saveRoomPostIdForPayment(postId);
          const vip = resolveVipTier(this.auth.getCurrentUser());
          if (vip !== 'free') {
            this.toast.success('Đăng tin thành công! Tin của bạn đã được tự động duyệt vì bạn là VIP.');
            this.router.navigate(['/my-listings']);
          } else {
            void this.router.navigate(['/landlord-pricing'], {
              queryParams: postId ? { roomPostId: postId } : undefined
            });
          }
        },
        error: (err) => {
          this.submitting = false;
          const status = (err as { status?: number })?.status;
          if (status === 403) {
            void this.router.navigate(['/identity-verification'], {
              queryParams: { returnUrl: '/create-listing' }
            });
            return;
          }
          console.error('Create listing failed', err);
          this.errorMessage =
            getApiErrorMessage(err) ||
            `Đăng tin thất bại (${(err as { status?: number })?.status ?? 'lỗi'}). Kiểm tra dữ liệu và thử lại.`;
          this.cdr.detectChanges();
        }
      });
  }

  private appendFiles(files: File[]): void {
    const images = files.filter((f) => f.type.startsWith('image/'));
    images.forEach((file) => {
      this.imageFiles.push(file);
      this.imagePreviews.push(URL.createObjectURL(file));
    });
    this.cdr.detectChanges();
  }
}

function extractCreatedPostId(res: unknown): string | null {
  if (!res || typeof res !== 'object') return null;
  const o = res as Record<string, unknown>;
  const data = o['data'] ?? o['Data'];
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    const id = String(d['id'] ?? d['Id'] ?? '').trim();
    return id || null;
  }
  return null;
}
