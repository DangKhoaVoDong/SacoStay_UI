import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LifestyleService } from './lifestyle.service';
import { TenantRoomProfileService } from './tenant-room-profile.service';
import {
  ageFromDateOfBirth,
  jobLabelVi,
  lifestyleAnswersForDisplay,
  roomStatusFromAnswers,
  roomStatusBadge
} from '../utils/lifestyle-display';
import {
  navProfileLabel,
  normalizeAuthUser,
  profileAvatarFromRaw,
  profileDateOfBirthSeed,
  personalProfileImagesListFromRaw,
  profileLivingAreaSeed
} from '../utils/user-display';
import { resolveMediaUrl } from '../utils/media-url';
import { computeLifestyleMatchPercent } from '../utils/guest-match';
import { tenantRoomPriceLabel } from '../utils/tenant-room-filters';
import { profileGenderFromRaw, type ProfileGender } from '../utils/discovery-filters';
import type { SwipeDeckCard, UserLifestyleAnswer } from '../models/lifestyle.models';
import type { TenantRoomProfile } from '../models/tenant-room-profile.models';

export interface DiscoveryCard extends SwipeDeckCard {
  displayName: string;
  /** Thumbnail wishlist: ảnh cá nhân đầu hoặc avatar Auth. */
  avatarUrl: string;
  /** Ảnh cá nhân (upload qua /api/User/profile-images). */
  profileImageUrls: string[];
  /** Avatar từ profile-setup (Auth) — sidebar, không gồm ảnh cá nhân. */
  fallbackAvatarUrl: string;
  age: number | null;
  gender: ProfileGender;
  location: string;
  jobLabel: string;
  bio: string;
  hasRoom: boolean;
  roomStatusLabel: string;
  roomPriceLabel: string;
  lifestyleAnswers: UserLifestyleAnswer[];
  tenantRoomProfile: TenantRoomProfile | null;
}

@Injectable({ providedIn: 'root' })
export class DiscoveryProfileService {
  private readonly http = inject(HttpClient);
  private readonly lifestyle = inject(LifestyleService);
  private readonly tenantRoomProfiles = inject(TenantRoomProfileService);
  private readonly apiUrl = environment.apiUrl;

  enrichDeck(
    cards: SwipeDeckCard[],
    myAnswers: UserLifestyleAnswer[],
    guestMatch = false
  ): Observable<DiscoveryCard[]> {
    if (!cards.length) return of([]);
    return forkJoin(cards.map((c) => this.enrichCard(c, myAnswers, guestMatch)));
  }

  enrichCard(
    card: SwipeDeckCard,
    myAnswers: UserLifestyleAnswer[],
    guestMatch = false
  ): Observable<DiscoveryCard> {
    return forkJoin({
      profileRaw: this.http.get<unknown>(`${this.apiUrl}/Auth/user/${encodeURIComponent(card.userId)}`).pipe(
        catchError(() => of(null))
      ),
      answers: this.lifestyle.getUserAnswers(card.userId)
    }).pipe(
      switchMap(({ profileRaw, answers }) => {
        const room = roomStatusFromAnswers(answers);
        const tenantRoom$ = room.hasRoom
          ? this.tenantRoomProfiles.getByUserId(card.userId)
          : of(null as TenantRoomProfile | null);
        return tenantRoom$.pipe(map((tenantRoomProfile) => ({ profileRaw, answers, tenantRoomProfile, room })));
      }),
      map(({ profileRaw, answers, tenantRoomProfile, room }) => {
        const profile = profileRaw ? normalizeAuthUser(profileRaw) : {};
        const displayName = navProfileLabel(profile) || 'Người dùng';
        const age = ageFromDateOfBirth(profileDateOfBirthSeed(profile));
        const location = profileLivingAreaSeed(profile);
        const jobLabel = jobLabelVi(String(profile['job'] ?? ''));
        const bio = String(profile['bio'] ?? '').trim();
        const profileImageUrls = personalProfileImagesListFromRaw(profile).map((u) => resolveMediaUrl(u));
        const placeholder = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=FF9F43&color=fff&size=512`;
        const av = profileAvatarFromRaw(profile);
        const fallbackAvatarUrl = av ? resolveMediaUrl(av) : placeholder;
        const avatarUrl = profileImageUrls.length ? profileImageUrls[0] : fallbackAvatarUrl;

        const matchingScore = guestMatch
          ? computeLifestyleMatchPercent(myAnswers, answers)
          : card.matchingScore;
        return {
          ...card,
          matchingScore,
          displayName,
          avatarUrl,
          profileImageUrls,
          fallbackAvatarUrl,
          age,
          gender: profileGenderFromRaw(profile['gender']),
          location,
          jobLabel,
          bio,
          hasRoom: room.hasRoom,
          roomStatusLabel: roomStatusBadge(room.hasRoom),
          roomPriceLabel: room.hasRoom ? tenantRoomPriceLabel(tenantRoomProfile) : '',
          lifestyleAnswers: lifestyleAnswersForDisplay(answers),
          tenantRoomProfile: room.hasRoom ? tenantRoomProfile : null
        } satisfies DiscoveryCard;
      })
    );
  }
}
