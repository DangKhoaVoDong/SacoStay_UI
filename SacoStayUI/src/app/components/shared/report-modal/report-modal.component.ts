import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { ReportService, reportApiErrorMessage } from '../../../services/report.service';
import { userIdFromUser } from '../../../utils/user-display';

const ROOM_REASONS = [
  'Nhà không đúng trong hình',
  'Giá không minh bạch',
  'Thông tin sai lệch',
  'Địa chỉ không chính xác',
  'Lừa đảo / Scam',
  'Nội dung không phù hợp'
];

const USER_REASONS = [
  'Hồ sơ giả mạo',
  'Hành vi quấy rối',
  'Thông tin sai lệch',
  'Lừa đảo / Scam',
  'Nội dung không phù hợp',
  'Spam / Quảng cáo'
];

const MAX_IMAGES = 3;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface EvidencePreview {
  file: File;
  previewUrl: string;
}

@Component({
  selector: 'app-report-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-modal.component.html'
})
export class ReportModalComponent {
  private readonly reports = inject(ReportService);
  private readonly auth = inject(AuthService);

  @Input() isOpen = false;
  @Input() targetName = '';
  @Input() type: 'room' | 'user' = 'room';
  @Input() reportedRoomId = '';
  @Input() reportedUserId = '';
  @Output() closed = new EventEmitter<void>();

  selectedReasons: string[] = [];
  details = '';
  evidence: EvidencePreview[] = [];

  /** Signals — app zoneless: HTTP callback phải cập nhật signal để UI đổi. */
  readonly isSubmitting = signal(false);
  readonly submitted = signal(false);
  readonly errorMessage = signal('');

  get reasons(): string[] {
    return this.type === 'room' ? ROOM_REASONS : USER_REASONS;
  }

  get canAddImage(): boolean {
    return this.evidence.length < MAX_IMAGES;
  }

  toggleReason(reason: string): void {
    if (this.selectedReasons.includes(reason)) {
      this.selectedReasons = this.selectedReasons.filter((r) => r !== reason);
    } else {
      this.selectedReasons = [...this.selectedReasons, reason];
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.canAddImage) return;

    const okType = /^image\/(jpeg|jpg|png)$/i.test(file.type);
    if (!okType) {
      this.errorMessage.set('Chỉ chấp nhận ảnh JPG hoặc PNG.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      this.errorMessage.set('Ảnh phải nhỏ hơn 5MB.');
      return;
    }

    this.errorMessage.set('');
    this.evidence = [...this.evidence, { file, previewUrl: URL.createObjectURL(file) }];
  }

  removeImage(index: number): void {
    const item = this.evidence[index];
    if (item) URL.revokeObjectURL(item.previewUrl);
    this.evidence = this.evidence.filter((_, i) => i !== index);
  }

  submit(): void {
    if (this.selectedReasons.length === 0 || this.isSubmitting()) return;

    if (!this.auth.isLoggedIn) {
      this.errorMessage.set('Vui lòng đăng nhập để gửi báo cáo.');
      return;
    }

    const reporterId = userIdFromUser(this.auth.getCurrentUser());
    if (!reporterId) {
      this.errorMessage.set('Không xác định được tài khoản. Vui lòng đăng nhập lại.');
      return;
    }

    if (this.type === 'room' && !this.reportedRoomId.trim()) {
      this.errorMessage.set('Không xác định được tin đăng cần báo cáo.');
      return;
    }
    if (this.type === 'user' && !this.reportedUserId.trim()) {
      this.errorMessage.set('Không xác định được người dùng cần báo cáo.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.reports
      .submit({
        reporterId,
        reportedRoomId: this.type === 'room' ? this.reportedRoomId.trim() : undefined,
        reportedUserId: this.type === 'user' ? this.reportedUserId.trim() : undefined,
        reasons: this.selectedReasons,
        description: this.details,
        imageFiles: this.evidence.map((e) => e.file)
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => this.submitted.set(true),
        error: (err) =>
          this.errorMessage.set(reportApiErrorMessage(err, 'Gửi báo cáo thất bại. Vui lòng thử lại.'))
      });
  }

  close(): void {
    this.revokePreviews();
    this.selectedReasons = [];
    this.details = '';
    this.evidence = [];
    this.submitted.set(false);
    this.isSubmitting.set(false);
    this.errorMessage.set('');
    this.closed.emit();
  }

  private revokePreviews(): void {
    this.evidence.forEach((e) => URL.revokeObjectURL(e.previewUrl));
  }
}
