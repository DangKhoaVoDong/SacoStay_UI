import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { KycService } from '../../services/kyc.service';
import { AuthService, getApiErrorMessage } from '../../services/auth.service';
import { GuestDiscoverySyncService } from '../../services/guest-discovery-sync.service';
import { UiToastService } from '../../services/ui-toast.service';
import { shouldSyncGuestAfterRegister } from '../../utils/guest-discovery.storage';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** FPT.AI Liveness V3 yêu cầu video 5–6 giây, ≥720p, ≥25fps. */
const VIDEO_RECORD_SECONDS = 6;
const VIDEO_RECORD_MS = VIDEO_RECORD_SECONDS * 1000;

type CameraState = 'idle' | 'preview' | 'recording' | 'submitting' | 'success' | 'error';

interface VideoRecordFormat {
  recorderMime: string;
  uploadMime: string;
  ext: string;
}

@Component({
  selector: 'app-identity-verification',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './identity-verification.component.html'
})
export class IdentityVerificationComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl') videoRef?: ElementRef<HTMLVideoElement>;

  readonly videoRecordSeconds = VIDEO_RECORD_SECONDS;
  step: 1 | 2 = 1;
  statusLoading = true;
  submitLoading = false;
  cameraState: CameraState = 'idle';
  scanProgress = 0;
  recordingCountdown = 0;
  errorMessage = '';
  previousKycNote = '';
  successMessage = '';

  frontFile: File | null = null;
  backFile: File | null = null;
  frontPreviewUrl = '';
  backPreviewUrl = '';
  capturedVideo: File | null = null;
  capturedVideoUrl = '';

  returnUrl = '/profile-setup';

  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private progressTimer: ReturnType<typeof setInterval> | null = null;
  private recordStopTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly kyc = inject(KycService);
  private readonly auth = inject(AuthService);
  private readonly guestSync = inject(GuestDiscoverySyncService);
  private readonly toast = inject(UiToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    if (!this.auth.isLoggedIn) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/identity-verification' } });
      return;
    }

    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl')?.trim() || '/profile-setup';

    this.kyc
      .getMyStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (status) => {
          this.statusLoading = false;
          if (status.status === 'Approved') {
            this.continueAfterVerification();
            return;
          }
          if (status.status === 'Pending') {
            this.toast.info('Hồ sơ xác thực đang được xử lý. Vui lòng thử lại sau.');
            void this.router.navigateByUrl(this.returnUrl);
            return;
          }
          if (status.status === 'NeedReupload' || status.status === 'Rejected') {
            this.previousKycNote = status.adminNote?.trim() || '';
            if (this.previousKycNote) {
              this.toast.info('Lần xác thực trước chưa đạt. Vui lòng nộp lại hồ sơ.');
            }
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.statusLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.clearRecordTimers();
    this.revokePreview(this.frontPreviewUrl);
    this.revokePreview(this.backPreviewUrl);
    this.revokePreview(this.capturedVideoUrl);
    this.clearProgressTimer();
  }

  onFrontSelected(event: Event): void {
    this.pickIdImage(event, 'front');
  }

  onBackSelected(event: Event): void {
    this.pickIdImage(event, 'back');
  }

  clearFront(): void {
    this.frontFile = null;
    this.revokePreview(this.frontPreviewUrl);
    this.frontPreviewUrl = '';
    this.cdr.detectChanges();
  }

  clearBack(): void {
    this.backFile = null;
    this.revokePreview(this.backPreviewUrl);
    this.backPreviewUrl = '';
    this.cdr.detectChanges();
  }

  goToStep2(): void {
    if (!this.frontFile || !this.backFile) {
      this.toast.error('Vui lòng tải đủ ảnh mặt trước và mặt sau CCCD.');
      return;
    }
    this.step = 2;
    this.cameraState = 'idle';
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  backToStep1(): void {
    this.stopCamera();
    this.clearCapturedVideo();
    this.step = 1;
    this.cameraState = 'idle';
    this.scanProgress = 0;
    this.recordingCountdown = 0;
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  async startCamera(): Promise<void> {
    this.errorMessage = '';
    if (!navigator.mediaDevices?.getUserMedia) {
      this.toast.error('Trình duyệt không hỗ trợ camera. Hãy dùng Chrome hoặc Edge trên HTTPS/localhost.');
      return;
    }

    try {
      this.stopCamera();
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });
      this.cameraState = 'preview';
      this.cdr.detectChanges();

      const video = this.videoRef?.nativeElement;
      if (video) {
        video.srcObject = this.mediaStream;
        await video.play();
      }
    } catch {
      this.cameraState = 'error';
      this.errorMessage = 'Không mở được camera. Kiểm tra quyền truy cập và thử lại.';
      this.cdr.detectChanges();
    }
  }

  async recordAndSubmit(): Promise<void> {
    if (!this.frontFile || !this.backFile) {
      this.toast.error('Thiếu ảnh CCCD. Quay lại bước 1.');
      return;
    }

    if (!this.mediaStream) {
      this.toast.error('Camera chưa sẵn sàng. Nhấn "Bắt đầu quét khuôn mặt" trước.');
      return;
    }

    const format = this.pickRecorderFormat();
    if (!format) {
      this.toast.error('Trình duyệt không hỗ trợ quay video. Thử Chrome hoặc Edge.');
      return;
    }

    try {
      const videoFile = await this.recordVideoFromStream(this.mediaStream, format);
      if (!videoFile) {
        this.toast.error(`Không quay được video ${VIDEO_RECORD_SECONDS} giây. Thử lại.`);
        this.cameraState = 'preview';
        this.cdr.detectChanges();
        return;
      }

      this.capturedVideo = videoFile;
      this.revokePreview(this.capturedVideoUrl);
      this.capturedVideoUrl = URL.createObjectURL(videoFile);
      this.stopCamera();
      this.submitKyc(videoFile);
    } catch {
      this.cameraState = 'error';
      this.errorMessage = 'Lỗi khi quay video. Vui lòng thử lại.';
      this.cdr.detectChanges();
    }
  }

  retryScan(): void {
    this.clearCapturedVideo();
    this.cameraState = 'idle';
    this.scanProgress = 0;
    this.recordingCountdown = 0;
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  completeVerification(): void {
    this.continueAfterVerification();
  }

  private submitKyc(video: File): void {
    if (!this.frontFile || !this.backFile) return;

    this.cameraState = 'submitting';
    this.scanProgress = 0;
    this.startProgressAnimation();
    this.submitLoading = true;
    this.cdr.detectChanges();

    this.kyc
      .submit(this.frontFile, this.backFile, video)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (message) => {
          this.clearProgressTimer();
          this.scanProgress = 100;
          this.submitLoading = false;
          this.cameraState = 'success';
          this.successMessage = message;
          this.previousKycNote = '';
          this.toast.success(message);
          this.auth.refreshProfile().subscribe();
          this.cdr.detectChanges();
        },
        error: (err: unknown) => {
          this.clearProgressTimer();
          this.submitLoading = false;
          this.cameraState = 'error';
          this.errorMessage = getApiErrorMessage(err) || 'Xác thực thất bại. Vui lòng thử lại.';
          this.cdr.detectChanges();
        }
      });
  }

  private recordVideoFromStream(stream: MediaStream, format: VideoRecordFormat): Promise<File | null> {
    return new Promise((resolve, reject) => {
      this.clearRecordTimers();
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, { mimeType: format.recorderMime });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onerror = () => reject(new Error('MediaRecorder error'));

      recorder.onstop = () => {
        this.clearRecordTimers();
        this.mediaRecorder = null;
        if (!chunks.length) {
          resolve(null);
          return;
        }
        const blob = new Blob(chunks, { type: format.uploadMime });
        resolve(
          new File([blob], `selfie-video-${Date.now()}.${format.ext}`, { type: format.uploadMime })
        );
      };

      this.mediaRecorder = recorder;
      this.cameraState = 'recording';
      this.recordingCountdown = VIDEO_RECORD_SECONDS;
      this.cdr.detectChanges();

      this.countdownTimer = setInterval(() => {
        if (this.recordingCountdown > 1) {
          this.recordingCountdown--;
          this.cdr.detectChanges();
        }
      }, 1000);

      recorder.start(200);
      this.recordStopTimer = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, VIDEO_RECORD_MS);
    });
  }

  /**
   * MediaRecorder cần mime có codecs; upload lên API chỉ dùng base type (video/webm | video/mp4)
   * vì .NET MediaTypeHeaderValue không nhận `video/webm;codecs=vp9`.
   */
  private pickRecorderFormat(): VideoRecordFormat | null {
    const candidates: VideoRecordFormat[] = [
      { recorderMime: 'video/mp4', uploadMime: 'video/mp4', ext: 'mp4' },
      { recorderMime: 'video/webm;codecs=vp8', uploadMime: 'video/webm', ext: 'webm' },
      { recorderMime: 'video/webm;codecs=vp9', uploadMime: 'video/webm', ext: 'webm' },
      { recorderMime: 'video/webm', uploadMime: 'video/webm', ext: 'webm' }
    ];
    return candidates.find((c) => MediaRecorder.isTypeSupported(c.recorderMime)) ?? null;
  }

  private continueAfterVerification(): void {
    if (shouldSyncGuestAfterRegister()) {
      this.guestSync.syncAfterRegisterAndNavigate(this.returnUrl);
      return;
    }
    void this.router.navigateByUrl(this.returnUrl);
  }

  private pickIdImage(event: Event, side: 'front' | 'back'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toast.error('Vui lòng chọn file ảnh (JPG, PNG).');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.toast.error('Ảnh tối đa 5MB.');
      return;
    }

    if (side === 'front') {
      this.frontFile = file;
      this.revokePreview(this.frontPreviewUrl);
      this.frontPreviewUrl = URL.createObjectURL(file);
    } else {
      this.backFile = file;
      this.revokePreview(this.backPreviewUrl);
      this.backPreviewUrl = URL.createObjectURL(file);
    }
    this.cdr.detectChanges();
  }

  private stopCamera(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
    this.clearRecordTimers();
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;
    const video = this.videoRef?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
  }

  private clearRecordTimers(): void {
    if (this.recordStopTimer) {
      clearTimeout(this.recordStopTimer);
      this.recordStopTimer = null;
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private clearCapturedVideo(): void {
    this.capturedVideo = null;
    this.revokePreview(this.capturedVideoUrl);
    this.capturedVideoUrl = '';
  }

  private revokePreview(url: string): void {
    if (url) URL.revokeObjectURL(url);
  }

  private startProgressAnimation(): void {
    this.clearProgressTimer();
    this.progressTimer = setInterval(() => {
      if (this.scanProgress < 90) {
        this.scanProgress += 2;
        this.cdr.detectChanges();
      }
    }, 80);
  }

  private clearProgressTimer(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }
}
