import { Component, OnInit } from '@angular/core';
import {
  normalizeAuthUser,
  profileFirstLastSeed,
  profileDateOfBirthSeed,
  genderToFormValue
} from '../../utils/user-display';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService, getApiErrorMessage } from '../../services/auth.service';
import type { UserProfileUpdateDTO } from '../../models/auth.models';

@Component({
  selector: 'app-profile-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-setup.component.html',
  styleUrls: ['./profile-setup.component.css']
})
export class ProfileSetupComponent implements OnInit {
  profileForm!: FormGroup;
  existingUser: Record<string, unknown> = {};
  verificationStatus = 'not_started';
  maxBioLength = 300;
  submitLoading = false;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.existingUser = normalizeAuthUser(JSON.parse(userStr)) as Record<string, unknown>;
      localStorage.setItem('user', JSON.stringify(this.existingUser));
    } else {
      this.existingUser = {};
    }

    this.verificationStatus = localStorage.getItem('identity_verification_status') || 'not_started';

    const { firstName: fnSeed, lastName: lnSeed } = profileFirstLastSeed(this.existingUser);
    const dobSeed = profileDateOfBirthSeed(this.existingUser);
    const phoneSeed = String(this.existingUser['phoneNumber'] ?? '').trim();
    const jobSeed = String(this.existingUser['job'] ?? this.existingUser['occupation'] ?? '').trim() || 'student';
    const livingSeed = String(this.existingUser['livingArea'] ?? this.existingUser['location'] ?? '').trim();

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
    return this.profileForm.get('firstName');
  }
  get lastName() {
    return this.profileForm.get('lastName');
  }
  get dateOfBirth() {
    return this.profileForm.get('dateOfBirth');
  }
  get gender() {
    return this.profileForm.get('gender');
  }
  get job() {
    return this.profileForm.get('job');
  }
  get phoneNumber() {
    return this.profileForm.get('phoneNumber');
  }
  get livingArea() {
    return this.profileForm.get('livingArea');
  }
  get bio() {
    return this.profileForm.get('bio');
  }

  get bioLength(): number {
    return this.profileForm.value.bio?.length || 0;
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

  onSubmit(): void {
    if (this.profileForm.invalid) {
      Object.values(this.profileForm.controls).forEach((c) => {
        c.markAsDirty();
        c.updateValueAndValidity();
      });
      return;
    }

    const v = this.profileForm.value;
    const fn = (v.firstName || '').trim();
    const ln = (v.lastName || '').trim();
    const dob = (v.dateOfBirth || '').trim();
    const genderUi = v.gender as 'male' | 'female' | 'other';
    const genderBool: boolean | null =
      genderUi === 'male' ? true : genderUi === 'female' ? false : null;

    const body: UserProfileUpdateDTO = {
      firstName: fn || null,
      lastName: ln || null,
      gender: genderBool,
      dateOfBirth: dob ? dob.slice(0, 10) : null,
      phoneNumber: (v.phoneNumber || '').trim() || null,
      job: (v.job || '').trim() || null,
      livingArea: (v.livingArea || '').trim() || null,
      bio: (v.bio || '').trim() || null
    };

    this.submitLoading = true;
    this.authService.updateProfile(body).subscribe({
      next: () => {
        this.submitLoading = false;
        const merged: Record<string, unknown> = {
          ...this.existingUser,
          firstName: fn,
          lastName: ln,
          gender: genderBool,
          dateOfBirth: body.dateOfBirth,
          phoneNumber: (v.phoneNumber || '').trim() || this.existingUser['phoneNumber'],
          job: body.job,
          livingArea: body.livingArea,
          bio: body.bio
        };
        delete merged['occupation'];
        delete merged['location'];
        delete merged['age'];
        localStorage.setItem('user', JSON.stringify(normalizeAuthUser(merged)));
        this.router.navigateByUrl('/');
      },
      error: (err: unknown) => {
        this.submitLoading = false;
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
}
