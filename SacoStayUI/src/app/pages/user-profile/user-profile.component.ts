import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { ReportModalComponent } from '../../components/shared/report-modal/report-modal.component';
import { ProfilePhotosModalComponent } from '../../components/profile/profile-photos-modal/profile-photos-modal.component';
import { CompatibilityBadgeComponent } from '../../components/profile/compatibility-badge.component';
import { AuthService } from '../../services/auth.service';
import { LifestyleService } from '../../services/lifestyle.service';
import { ChatPeerProfileService } from '../../services/chat-peer-profile.service';
import { environment } from '../../../environments/environment';
import {
  ageFromDateOfBirth,
  genderLabelVi,
  isVerifiedUser,
  jobLabelVi,
  lifestyleAnswersForDisplay,
  lifestyleAnswerLabel,
  roomStatusFromAnswers
} from '../../utils/lifestyle-display';
import {
  hasBasicProfileFilled,
  isAdminUser,
  isLandlordUser,
  isTenantPremium,
  navProfileLabel,
  normalizeAuthUser,
  profileAvatarFromRaw,
  profileDateOfBirthSeed,
  profileLivingAreaSeed,
  setTenantPremium,
  userIdFromUser
} from '../../utils/user-display';
import { setLifestyleQuizCompleted } from '../../utils/lifestyle-storage';
import { resolveMediaUrl } from '../../utils/media-url';
import type { UserLifestyleAnswer } from '../../models/lifestyle.models';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NavbarComponent,
    ReportModalComponent,
    ProfilePhotosModalComponent,
    CompatibilityBadgeComponent
  ],
  templateUrl: './user-profile.component.html'
})
export class UserProfileComponent implements OnInit {
  loading = true;
  notFound = false;
  isOwnProfile = false;
  showReport = false;
  showProfilePhotos = false;

  displayName = '';
  age: number | null = null;
  genderLabel = '';
  jobLabel = '';
  location = '';
  bio = '';
  avatarUrl = '';
  verified = false;

  lifestyleAnswers: UserLifestyleAnswer[] = [];
  myAnswers: UserLifestyleAnswer[] = [];
  compatibilityScore = 0;

  roomHasRoom = false;
  roomPriceLabel = '';

  targetUserId = '';
  chatQueryParams: Record<string, string> = {};

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly lifestyle = inject(LifestyleService);
  private readonly peerProfiles = inject(ChatPeerProfileService);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly apiUrl = environment.apiUrl;

  ngOnInit(): void {
    if (!this.auth.isLoggedIn) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const idParam = this.route.snapshot.paramMap.get('id') ?? '';
    this.isOwnProfile = idParam === 'me' || !idParam;

    if (this.isOwnProfile) {
      this.loadOwnProfile();
      return;
    }

    this.targetUserId = idParam;
    this.ensurePremiumThenLoadOtherProfile(idParam);
  }

  /** Gói Free không xem hồ sơ người khác — chuyển sang trang nâng cấp. */
  private ensurePremiumThenLoadOtherProfile(userId: string): void {
    const myId = userIdFromUser(this.auth.getCurrentUser());

    const load = () => this.loadOtherProfile(userId);

    if (isTenantPremium(myId)) {
      load();
      return;
    }

    this.lifestyle
      .getSwipeQuota()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (quota) => {
          if (myId) setTenantPremium(quota.isPremium, myId);
          if (!quota.isPremium) {
            void this.router.navigate(['/tenant-pricing']);
            return;
          }
          load();
        },
        error: () => {
          void this.router.navigate(['/tenant-pricing']);
        }
      });
  }

  private loadOwnProfile(): void {
    this.auth
      .refreshProfile()
      .pipe(
        switchMap((p) => {
          const user = (p ?? this.auth.getCurrentUser()) as Record<string, unknown> | null;
          if (!user) return of({ user: null as Record<string, unknown> | null, answers: [] as UserLifestyleAnswer[] });

          const uid = userIdFromUser(user);
          if (!hasBasicProfileFilled(user)) {
            void this.router.navigate(['/profile-setup']);
            return of({ user: null, answers: [] });
          }

          return this.lifestyle.getMyAnswers().pipe(
            map((answers) => {
              const uid = userIdFromUser(user);
              if (uid && answers.length > 0) setLifestyleQuizCompleted(uid);
              return { user, answers };
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ user, answers }) => {
          if (!user) {
            this.loading = false;
            return;
          }
          this.applyUserView(user);
          this.lifestyleAnswers = answers;
          this.myAnswers = answers;
          this.applyRoomStatus(answers);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private loadOtherProfile(userId: string): void {
    forkJoin({
      userRaw: this.http
        .get<unknown>(`${this.apiUrl}/Auth/user/${encodeURIComponent(userId)}`)
        .pipe(catchError(() => of(null))),
      answers: this.lifestyle.getUserAnswers(userId),
      match: this.lifestyle.getMatchingScore(userId)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ userRaw, answers, match }) => {
          if (!userRaw) {
            this.notFound = true;
            this.loading = false;
            this.cdr.detectChanges();
            return;
          }

          const user = normalizeAuthUser(userRaw);
          this.applyUserView(user);
          this.lifestyleAnswers = answers;
          this.compatibilityScore = match.matchingScore;
          this.applyRoomStatus(answers);

          const myId = userIdFromUser(this.auth.getCurrentUser());
          if (myId) {
            this.lifestyle
              .getMyAnswers()
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe((mine) => {
                this.myAnswers = mine;
                this.cdr.detectChanges();
              });
          }

          const av = profileAvatarFromRaw(user);
          this.chatQueryParams = {
            with: userId,
            role: 'tenant',
            name: this.displayName,
            ...(av ? { avatar: resolveMediaUrl(av) } : {})
          };

          this.peerProfiles.seedFromHints(userId, {
            displayName: this.displayName,
            avatarUrl: av ? resolveMediaUrl(av) : undefined,
            role: 'tenant'
          });

          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.notFound = true;
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private applyUserView(user: Record<string, unknown>): void {
    this.displayName = navProfileLabel(user);
    this.age = ageFromDateOfBirth(profileDateOfBirthSeed(user));
    this.genderLabel = genderLabelVi(user['gender']);
    this.jobLabel = jobLabelVi(String(user['job'] ?? ''));
    this.location = profileLivingAreaSeed(user);
    this.bio = String(user['bio'] ?? '').trim();
    this.verified = isVerifiedUser(user);
    const av = profileAvatarFromRaw(user);
    this.avatarUrl = av
      ? resolveMediaUrl(av)
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(this.displayName)}&background=FF9F43&color=fff`;
  }

  private applyRoomStatus(answers: UserLifestyleAnswer[]): void {
    const room = roomStatusFromAnswers(answers);
    this.roomHasRoom = room.hasRoom;
    this.roomPriceLabel = room.priceLabel ?? '';
  }

  get displayAnswers(): UserLifestyleAnswer[] {
    return lifestyleAnswersForDisplay(this.lifestyleAnswers);
  }

  categoryLabel(answer: UserLifestyleAnswer): string {
    return lifestyleAnswerLabel(answer);
  }

  isAnswerMatch(answer: UserLifestyleAnswer): boolean {
    if (this.isOwnProfile || !this.myAnswers.length) return false;
    return this.myAnswers.some((m) => m.questionId === answer.questionId && m.optionId === answer.optionId);
  }

  goBack(): void {
    if (this.isOwnProfile) {
      const user = this.auth.getCurrentUser();
      if (isAdminUser(user)) {
        void this.router.navigate(['/admin']);
        return;
      }
      if (isLandlordUser(user)) {
        void this.router.navigate(['/landlord-profile']);
        return;
      }
      void this.router.navigate(['/']);
      return;
    }
    void this.router.navigate(['/discovery']);
  }

  openReport(): void {
    this.showReport = true;
  }

  closeReport(): void {
    this.showReport = false;
  }

  openProfilePhotos(): void {
    this.showProfilePhotos = true;
  }

  closeProfilePhotos(): void {
    this.showProfilePhotos = false;
  }
}
