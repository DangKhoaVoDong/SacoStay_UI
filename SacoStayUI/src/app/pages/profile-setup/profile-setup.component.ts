import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import {
  normalizeAuthUser,
  profileFirstLastSeed,
  profileDateOfBirthSeed,
  profileLivingAreaSeed,
  genderToFormValue,
  profileAvatarFromRaw
} from '../../utils/user-display';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService, getApiErrorMessage } from '../../services/auth.service';
import type { UserProfileUpdateDTO, UserProfile } from '../../models/auth.models';
import { resolveMediaUrl } from '../../utils/media-url';
import { navProfileLabel } from '../../utils/user-display';

@Component({
  selector: 'app-profile-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-setup.component.html',
  styleUrls: ['./profile-setup.component.css']
})
export class ProfileSetupComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);

  profileForm: FormGroup | null = null;
  existingUser: Record<string, unknown> = {};
  verificationStatus = 'not_started';
  maxBioLength = 300;
  submitLoading = false;
  profileLoading = true;
  avatarUploading = false;
  avatarDeleting = false;
  private avatarObjectUrl: string | null = null;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.verificationStatus = localStorage.getItem('identity_verification_status') || 'not_started';
    if (!this.authService.isLoggedIn) {
      this.profileLoading = false;
      this.cdr.detectChanges();
      void this.router.navigate(['/login']);
      return;
    }
    this.authService.refreshProfile().subscribe({
      next: (p) => {
        try {
          this.initFormFromProfile(p);
        } catch (e) {
          console.error('initFormFromProfile', e);
          alert('Không khởi tạo được form hồ sơ. Thử tải lại trang.');
        }
        this.profileLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.profileLoading = false;
        this.cdr.detectChanges();
        alert('Không tải được hồ sơ. Kiểm tra đăng nhập hoặc kết nối API.');
        void this.router.navigateByUrl('/');
      }
    });
  }

  private initFormFromProfile(p: UserProfile | null): void {
    this.existingUser = p
      ? (normalizeAuthUser(p as unknown as Record<string, unknown>) as Record<string, unknown>)
      : {};

    const { firstName: fnSeed, lastName: lnSeed } = profileFirstLastSeed(this.existingUser);
    const dobSeed = profileDateOfBirthSeed(this.existingUser);
    const phoneSeed = String(this.existingUser['phoneNumber'] ?? '').trim();
    const jobSeed = String(this.existingUser['job'] ?? this.existingUser['occupation'] ?? this.existingUser['Job'] ?? '').trim() || 'student';
    const livingSeed = profileLivingAreaSeed(this.existingUser);

    this.profileForm = this.fb.group({
      firstName: [fnSeed, Validators.required],
      lastName: [lnSeed, Validators.required],
      dateOfBirth: [dobSeed, Validators.required],
      gender: [genderToFormValue(this.existingUser['gender']), Validators.required],
      job: [jobSeed, Validators.required],
      phoneNumber: [phoneSeed, [Validators.pattern('^$|^[0-9]{10,11}$')]],
      livingArea: [livingSeed],
      bio: [String(this.existingUser['bio'] ?? '')]
    });
  }

  get firstName() {
    return this.profileForm?.get('firstName');
  }
  get lastName() {
    return this.profileForm?.get('lastName');
  }
  get dateOfBirth() {
    return this.profileForm?.get('dateOfBirth');
  }
  get gender() {
    return this.profileForm?.get('gender');
  }
  get job() {
    return this.profileForm?.get('job');
  }
  get phoneNumber() {
    return this.profileForm?.get('phoneNumber');
  }
  get livingArea() {
    return this.profileForm?.get('livingArea');
  }
  get bio() {
    return this.profileForm?.get('bio');
  }

  get bioLength(): number {
    return this.profileForm?.value?.bio?.length || 0;
  }

  get avatarDisplayUrl(): string {
    if (this.avatarObjectUrl) return this.avatarObjectUrl;
    const raw = profileAvatarFromRaw(this.existingUser);
    return raw ? resolveMediaUrl(raw) : '';
  }

  get avatarFallbackUrl(): string {
    return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(navProfileLabel(this.existingUser));
  }

  get hasServerAvatar(): boolean {
    return !!profileAvatarFromRaw(this.existingUser);
  }

  get avatarDeleteUrl(): string {
    return profileAvatarFromRaw(this.existingUser);
  }

  get pageTitle(): string {
    const hasBio = !!(this.existingUser['bio'] && String(this.existingUser['bio']).trim());
    const hasDob = !!String(this.existingUser['dateOfBirth'] ?? '').trim();
    const hasJob = !!String(this.existingUser['job'] ?? '').trim();
    return hasBio || hasDob || hasJob ? 'Chỉnh sửa hồ sơ' : 'Tạo hồ sơ của bạn';
  }

  jobOptions = [
    { value: 'student', label: 'Sinh viên' },
    { value: 'fresher', label: 'Mới đi làm (Fresher)' },
    { value: 'working', label: 'Đã đi làm' }
  ];

  genderOptions = [
    { value: 'male', label: 'Nam' },
    { value: 'female', label: 'Nữ' },
    { value: 'other', label: 'Khác' }
  ];

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh (JPG, PNG, WebP…).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Ảnh đại diện tối đa 5MB.');
      return;
    }
    if (this.avatarObjectUrl) URL.revokeObjectURL(this.avatarObjectUrl);
    this.avatarObjectUrl = URL.createObjectURL(file);
    this.cdr.detectChanges();

    this.avatarUploading = true;
    this.authService.updateProfile(this.buildProfileBody(), file).subscribe({
      next: () => {
        this.authService.refreshProfile().subscribe({
          next: (p) => {
            if (p) {
              this.existingUser = normalizeAuthUser(p as unknown as Record<string, unknown>) as Record<string, unknown>;
            }
            if (this.avatarObjectUrl) {
              URL.revokeObjectURL(this.avatarObjectUrl);
              this.avatarObjectUrl = null;
            }
            this.avatarUploading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.avatarUploading = false;
            this.cdr.detectChanges();
            alert('Đã tải ảnh lên nhưng không làm mới được hồ sơ. Tải lại trang.');
          }
        });
      },
      error: (err: unknown) => {
        this.avatarUploading = false;
        this.cdr.detectChanges();
        alert(getApiErrorMessage(err) || 'Tải ảnh đại diện thất bại.');
      }
    });
  }

  onAvatarDelete(): void {
    const imageUrl = this.avatarDeleteUrl;
    if (!imageUrl) return;
    if (!confirm('Xóa ảnh đại diện hiện tại?')) return;

    this.avatarDeleting = true;
    this.authService.deleteProfileImage(imageUrl).subscribe({
      next: () => {
        if (this.avatarObjectUrl) {
          URL.revokeObjectURL(this.avatarObjectUrl);
          this.avatarObjectUrl = null;
        }
        this.authService.refreshProfile().subscribe({
          next: (p) => {
            if (p) {
              this.existingUser = normalizeAuthUser(p as unknown as Record<string, unknown>) as Record<string, unknown>;
            }
            this.avatarDeleting = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.avatarDeleting = false;
            this.cdr.detectChanges();
            alert('Đã xóa ảnh nhưng không tải lại được hồ sơ. Tải lại trang.');
          }
        });
      },
      error: (err: unknown) => {
        this.avatarDeleting = false;
        this.cdr.detectChanges();
        alert(getApiErrorMessage(err) || 'Xóa ảnh đại diện thất bại.');
      }
    });
  }

  onSubmit(): void {
    if (!this.profileForm || this.profileForm.invalid) {
      if (this.profileForm) {
        Object.values(this.profileForm.controls).forEach((c) => {
          c.markAsDirty();
          c.updateValueAndValidity();
        });
      }
      return;
    }

    this.submitLoading = true;
    this.authService.updateProfile(this.buildProfileBody()).subscribe({
      next: () => {
        this.authService.refreshProfile().subscribe({
          next: () => {
            this.submitLoading = false;
            this.cdr.detectChanges();
            this.router.navigateByUrl('/');
          },
          error: () => {
            this.submitLoading = false;
            this.cdr.detectChanges();
            alert('Đã lưu hồ sơ nhưng không tải lại được dữ liệu mới. Vui lòng mở lại trang hồ sơ.');
            this.router.navigateByUrl('/');
          }
        });
      },
      error: (err: unknown) => {
        this.submitLoading = false;
        this.cdr.detectChanges();
        alert(getApiErrorMessage(err) || 'Cập nhật hồ sơ thất bại. Thử lại sau.');
      }
    });
  }

  navigateToIdentityVerification(): void {
    this.router.navigate(['/identity-verification']);
  }

  navigateBack(): void {
    this.router.navigateByUrl('/');
  }

  private buildProfileBody(): UserProfileUpdateDTO {
    const v = this.profileForm?.value ?? {};
    const fn = (v.firstName || '').trim();
    const ln = (v.lastName || '').trim();
    const dob = (v.dateOfBirth || '').trim();
    const genderUi = v.gender as 'male' | 'female' | 'other';
    const genderBool: boolean | null =
      genderUi === 'male' ? true : genderUi === 'female' ? false : null;

    return {
      firstName: fn || null,
      lastName: ln || null,
      gender: genderBool,
      dateOfBirth: dob ? dob.slice(0, 10) : null,
      phoneNumber: (v.phoneNumber || '').trim() || null,
      job: (v.job || '').trim() || null,
      livingArea: (v.livingArea || '').trim() || null,
      bio: (v.bio || '').trim() || null
    };
  }
}
