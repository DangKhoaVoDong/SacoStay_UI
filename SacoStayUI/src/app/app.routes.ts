import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { landlordGuard } from './core/guards/landlord.guard';
import { adminGuard } from './core/guards/admin.guard';
import { tenantGuard } from './core/guards/tenant.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/auth.component').then((m) => m.AuthComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/auth/auth.component').then((m) => m.AuthComponent)
  },
  {
    path: 'auth',
    loadComponent: () => import('./pages/auth/auth.component').then((m) => m.AuthComponent)
  },
  {
    path: 'otp-verification',
    loadComponent: () => import('./pages/otp/otp-verification.component').then((m) => m.OtpVerificationComponent)
  },
  {
    path: 'identity-verification',
    loadComponent: () =>
      import('./pages/identity-verification/identity-verification.component').then(
        (m) => m.IdentityVerificationComponent
      ),
    canActivate: [authGuard]
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent)
  },
  {
    path: 'verify-reset-otp',
    loadComponent: () =>
      import('./pages/verify-reset-otp/verify-reset-otp.component').then((m) => m.VerifyResetOtpComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent)
  },
  {
    path: 'profile-setup',
    loadComponent: () =>
      import('./pages/profile-setup/profile-setup.component').then((m) => m.ProfileSetupComponent),
    canActivate: [authGuard]
  },
  {
    path: 'profile/:id',
    loadComponent: () =>
      import('./pages/user-profile/user-profile.component').then((m) => m.UserProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin/admin-dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'chat',
    loadComponent: () => import('./pages/chat/chat.component').then((m) => m.ChatComponent),
    canActivate: [authGuard]
  },
  {
    path: 'lifestyle-quiz',
    loadComponent: () =>
      import('./pages/lifestyle-quiz/lifestyle-quiz.component').then((m) => m.LifestyleQuizComponent)
  },
  {
    path: 'tenant-room-profile',
    loadComponent: () =>
      import('./pages/tenant-room-profile/tenant-room-profile.component').then((m) => m.TenantRoomProfileComponent)
  },
  {
    path: 'discovery',
    loadComponent: () => import('./pages/discovery/discovery.component').then((m) => m.DiscoveryComponent),
    canActivate: [tenantGuard]
  },
  {
    path: 'shared-space',
    loadComponent: () =>
      import('./pages/shared-space/shared-space.component').then((m) => m.SharedSpaceComponent),
    canActivate: [authGuard, tenantGuard]
  },
  {
    path: 'rooms',
    loadComponent: () => import('./pages/rooms/rooms.component').then((m) => m.RoomsComponent)
  },
  {
    path: 'rooms/:id',
    loadComponent: () =>
      import('./pages/rooms/room-detail/room-detail.component').then((m) => m.RoomDetailComponent)
  },
  {
    path: 'map',
    loadComponent: () => import('./pages/map/map.component').then((m) => m.MapComponent)
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./pages/legal/terms-of-use/terms-of-use.component').then((m) => m.TermsOfUseComponent)
  },
  {
    path: 'faq',
    loadComponent: () => import('./pages/legal/faq/faq.component').then((m) => m.FaqComponent)
  },
  {
    path: 'pricing',
    loadComponent: () =>
      import('./pages/legal/faq-detail/faq-detail.component').then((m) => m.FaqDetailComponent),
    data: { faqId: 'pricing' }
  },
  {
    path: 'roommate-matching',
    loadComponent: () =>
      import('./pages/legal/faq-detail/faq-detail.component').then((m) => m.FaqDetailComponent),
    data: { faqId: 'roommate-matching' }
  },
  {
    path: 'verified-listings',
    loadComponent: () =>
      import('./pages/legal/faq-detail/faq-detail.component').then((m) => m.FaqDetailComponent),
    data: { faqId: 'verified-listings' }
  },
  {
    path: 'help/contact-landlord',
    loadComponent: () =>
      import('./pages/legal/faq-detail/faq-detail.component').then((m) => m.FaqDetailComponent),
    data: { faqId: 'contact-landlord' }
  },
  {
    path: 'help/roommate-support',
    loadComponent: () =>
      import('./pages/legal/faq-detail/faq-detail.component').then((m) => m.FaqDetailComponent),
    data: { faqId: 'roommate-support' }
  },
  { path: 'privacy', redirectTo: 'terms', pathMatch: 'full' },
  {
    path: 'landlord-profile',
    loadComponent: () =>
      import('./pages/landlord/landlord-profile/landlord-profile.component').then((m) => m.LandlordProfileComponent),
    canActivate: [authGuard, landlordGuard]
  },
  {
    path: 'my-listings',
    loadComponent: () =>
      import('./pages/landlord/my-listings/my-listings.component').then((m) => m.MyListingsComponent),
    canActivate: [authGuard, landlordGuard]
  },
  /** BE gốc redirect sau VNPay: /owner/my-posts?payment=completed */
  {
    path: 'owner/my-posts',
    loadComponent: () =>
      import('./pages/landlord/my-listings/my-listings.component').then((m) => m.MyListingsComponent),
    canActivate: [authGuard, landlordGuard]
  },
  {
    path: 'create-listing',
    loadComponent: () =>
      import('./pages/landlord/create-listing/create-listing.component').then((m) => m.CreateListingComponent),
    canActivate: [authGuard, landlordGuard]
  },
  {
    path: 'landlord-pricing',
    loadComponent: () =>
      import('./pages/landlord/landlord-pricing/landlord-pricing.component').then((m) => m.LandlordPricingComponent),
    canActivate: [authGuard, landlordGuard]
  },
  { path: 'listing-pricing', redirectTo: 'landlord-pricing', pathMatch: 'full' },
  {
    path: 'tenant-pricing',
    loadComponent: () =>
      import('./pages/tenant-pricing/tenant-pricing.component').then((m) => m.TenantPricingComponent)
  },
  {
    path: 'payment/result',
    loadComponent: () =>
      import('./pages/payment/payment-result/payment-result.component').then((m) => m.PaymentResultComponent)
  },
  {
    path: 'landlord-chat',
    loadComponent: () => import('./pages/chat/chat.component').then((m) => m.ChatComponent),
    canActivate: [authGuard, landlordGuard],
    data: { shell: 'landlord' }
  },
  {
    path: 'listing-viewers',
    loadComponent: () =>
      import('./pages/landlord/listing-viewers/listing-viewers.component').then((m) => m.ListingViewersComponent),
    canActivate: [authGuard, landlordGuard]
  },
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent)
  },
  { path: '**', redirectTo: '' }
];
