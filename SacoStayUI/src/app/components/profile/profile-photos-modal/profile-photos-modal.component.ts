import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import {
  MAX_PROFILE_PHOTOS,
  UserProfileImagesService,
  profileImagesApiErrorMessage
} from '../../../services/user-profile-images.service';
import { resolveMediaUrl } from '../../../utils/media-url';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-profile-photos-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-photos-modal.component.html'
})
export class ProfilePhotosModalComponent implements OnChanges {
  private readonly profileImages = inject(UserProfileImagesService);

  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() imagesChanged = new EventEmitter<string[]>();

  readonly urls = signal<string[]>([]);
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly deletingUrl = signal<string | null>(null);
  readonly errorMessage = signal('');

  readonly maxPhotos = MAX_PROFILE_PHOTOS;

  get canAddMore(): boolean {
    return this.urls().length < MAX_PROFILE_PHOTOS;
  }

  get remainingSlots(): number {
    return Math.max(0, MAX_PROFILE_PHOTOS - this.urls().length);
  }

  displayUrl(url: string): string {
    return resolveMediaUrl(url);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.loadWhenOpen();
    }
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(): void {
    if (this.uploading() || this.deletingUrl()) return;
    this.close();
  }

  loadWhenOpen(): void {
    if (!this.isOpen) return;
    this.errorMessage.set('');
    this.loading.set(true);
    this.profileImages
      .getMyImages()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (list) => {
          this.urls.set(list);
          this.imagesChanged.emit(list);
        },
        error: (err) => {
          this.errorMessage.set(profileImagesApiErrorMessage(err, 'Không tải được ảnh cá nhân.'));
        }
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (!files.length || !this.canAddMore) return;

    const valid: File[] = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) {
        this.errorMessage.set('Chỉ chấp nhận file ảnh.');
        return;
      }
      if (f.size > MAX_FILE_BYTES) {
        this.errorMessage.set('Mỗi ảnh tối đa 5MB.');
        return;
      }
      valid.push(f);
    }

    const slots = this.remainingSlots;
    const toUpload = valid.slice(0, slots);
    if (!toUpload.length) {
      this.errorMessage.set(`Tối đa ${MAX_PROFILE_PHOTOS} ảnh cá nhân.`);
      return;
    }

    this.errorMessage.set('');
    this.uploading.set(true);
    this.profileImages
      .upload(toUpload)
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe({
        next: () => this.reloadAfterMutation(),
        error: (err) => {
          this.errorMessage.set(profileImagesApiErrorMessage(err, 'Upload ảnh thất bại.'));
        }
      });
  }

  deleteImage(url: string): void {
    if (this.deletingUrl() || this.uploading()) return;
    this.errorMessage.set('');
    this.deletingUrl.set(url);
    this.profileImages
      .delete(url)
      .pipe(finalize(() => this.deletingUrl.set(null)))
      .subscribe({
        next: () => this.reloadAfterMutation(),
        error: (err) => {
          this.errorMessage.set(profileImagesApiErrorMessage(err, 'Xoá ảnh thất bại.'));
        }
      });
  }

  private reloadAfterMutation(): void {
    this.profileImages.getMyImages().subscribe({
      next: (list) => {
        this.urls.set(list);
        this.imagesChanged.emit(list);
      }
    });
  }
}
