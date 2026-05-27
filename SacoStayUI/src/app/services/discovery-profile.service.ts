import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LifestyleService } from './lifestyle.service';
import {
  ageFromDateOfBirth,
  discoveryHighlightTags,
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
  profileLivingAreaSeed
} from '../utils/user-display';
import { resolveMediaUrl } from '../utils/media-url';
import { profileGenderFromRaw, type ProfileGender } from '../utils/discovery-filters';
import type { SwipeDeckCard, UserLifestyleAnswer } from '../models/lifestyle.models';

export interface DiscoveryCard extends SwipeDeckCard {
  displayName: string;
  avatarUrl: string;
  age: number | null;
  gender: ProfileGender;
  location: string;
  jobLabel: string;
  bio: string;
  hasRoom: boolean;
  roomStatusLabel: string;
  roomPriceLabel: string;
  highlights: string[];
  lifestyleAnswers: UserLifestyleAnswer[];
}

@Injectable({ providedIn: 'root' })
export class DiscoveryProfileService {
  private readonly http = inject(HttpClient);
  private readonly lifestyle = inject(LifestyleService);
  private readonly apiUrl = environment.apiUrl;

  enrichDeck(cards: SwipeDeckCard[], myAnswers: UserLifestyleAnswer[]): Observable<DiscoveryCard[]> {
    if (!cards.length) return of([]);
    return forkJoin(cards.map((c) => this.enrichCard(c, myAnswers)));
  }

  enrichCard(card: SwipeDeckCard, myAnswers: UserLifestyleAnswer[]): Observable<DiscoveryCard> {
    return forkJoin({
      profileRaw: this.http.get<unknown>(`${this.apiUrl}/Auth/user/${encodeURIComponent(card.userId)}`).pipe(
        catchError(() => of(null))
      ),
      answers: this.lifestyle.getUserAnswers(card.userId)
    }).pipe(
      map(({ profileRaw, answers }) => {
        const profile = profileRaw ? normalizeAuthUser(profileRaw) : {};
        const displayName = navProfileLabel(profile) || 'Người dùng';
        const age = ageFromDateOfBirth(profileDateOfBirthSeed(profile));
        const location = profileLivingAreaSeed(profile);
        const jobLabel = jobLabelVi(String(profile['job'] ?? ''));
        const bio = String(profile['bio'] ?? '').trim();
        const av = profileAvatarFromRaw(profile);
        const avatarUrl = av
          ? resolveMediaUrl(av)
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=FF9F43&color=fff&size=512`;

        const room = roomStatusFromAnswers(answers);
        const highlights = discoveryHighlightTags(myAnswers, answers, 2);

        return {
          ...card,
          displayName,
          avatarUrl,
          age,
          gender: profileGenderFromRaw(profile['gender']),
          location,
          jobLabel,
          bio,
          hasRoom: room.hasRoom,
          roomStatusLabel: roomStatusBadge(room.hasRoom),
          roomPriceLabel: room.priceLabel ?? '',
          highlights,
          lifestyleAnswers: lifestyleAnswersForDisplay(answers)
        } satisfies DiscoveryCard;
      })
    );
  }
}
