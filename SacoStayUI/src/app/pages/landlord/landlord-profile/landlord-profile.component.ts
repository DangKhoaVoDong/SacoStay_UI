import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LandlordLayoutComponent } from '../../../components/layout/landlord/landlord-layout.component';
import { AuthService } from '../../../services/auth.service';
import { RoomPostService } from '../../../services/room-post.service';
import { navProfileLabel, resolveVipTier, type VipTier } from '../../../utils/user-display';
import type { UserProfile } from '../../../models/auth.models';

interface VipDisplay {
  name: string;
  stars: number;
  color: string;
  border: string;
}

@Component({
  selector: 'app-landlord-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, LandlordLayoutComponent],
  templateUrl: './landlord-profile.component.html'
})
export class LandlordProfileComponent implements OnInit {
  user: UserProfile | null = null;
  vipTier: VipTier = 'free';
  activeListings = 0;
  monthlyViews = 0;
  loadingStats = true;

  private readonly auth = inject(AuthService);
  private readonly roomPosts = inject(RoomPostService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.auth.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((u) => {
      this.user = u;
      this.vipTier = resolveVipTier(u);
      this.cdr.detectChanges();
    });

    this.auth.refreshProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadStats();
    });
    this.loadStats();
  }

  get profileLabel(): string {
    return navProfileLabel(this.user);
  }

  get avatarUrl(): string {
    return this.user?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(this.profileLabel);
  }

  get vip(): VipDisplay {
    return this.vipDetails(this.vipTier);
  }

  get isVerified(): boolean {
    const s = String(this.user?.verificationStatus ?? '').toLowerCase();
    return s === 'approved' || s === 'verified' || s === '1';
  }

  formatViews(n: number): string {
    return new Intl.NumberFormat('vi-VN').format(n);
  }

  private loadStats(): void {
    this.loadingStats = true;
    this.roomPosts.getMyPosts().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((posts) => {
      const active = posts.filter((p) => {
        const status = (p.status ?? '').toLowerCase();
        return !status || status === 'active' || status === 'published' || status === 'approved';
      });
      this.activeListings = active.length;
      const ids = active.map((p) => p.id).filter(Boolean);
      if (!ids.length) {
        this.monthlyViews = 0;
        this.loadingStats = false;
        this.cdr.detectChanges();
        return;
      }
      this.roomPosts
        .getAggregatedMonthlyViews(ids)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((views) => {
          this.monthlyViews = views;
          this.loadingStats = false;
          this.cdr.detectChanges();
        });
    });
  }

  private vipDetails(tier: VipTier): VipDisplay {
    switch (tier) {
      case 'vip3':
        return { name: 'VIP 3', stars: 4, color: 'text-[#EF4444]', border: 'border-[#EF4444]' };
      case 'vip2':
        return { name: 'VIP 2', stars: 3, color: 'text-[#F59E0B]', border: 'border-[#F59E0B]' };
      case 'vip1':
        return { name: 'VIP 1', stars: 2, color: 'text-[#FF9F43]', border: 'border-[#FF9F43]' };
      default:
        return { name: 'Free', stars: 1, color: 'text-gray-400', border: 'border-gray-300' };
    }
  }
}
