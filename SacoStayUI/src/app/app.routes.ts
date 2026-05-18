import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { landlordGuard } from './core/guards/landlord.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/auth').then(m => m.AuthComponent) },
  { path: 'register', loadComponent: () => import('./pages/auth').then(m => m.AuthComponent) },
  { path: 'auth', loadComponent: () => import('./pages/auth').then(m => m.AuthComponent) },
  { path: 'otp-verification', loadComponent: () => import('./pages/otp').then(m => m.OtpVerificationComponent) },
  { path: 'forgot-password', loadComponent: () => import('./pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  { path: 'verify-reset-otp', loadComponent: () => import('./pages/verify-reset-otp/verify-reset-otp.component').then(m => m.VerifyResetOtpComponent) },
  { path: 'reset-password', loadComponent: () => import('./pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
  { path: 'profile-setup', loadComponent: () => import('./pages/profile-setup').then(m => m.ProfileSetupComponent), canActivate: [authGuard] },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin-dashboard').then(m => m.AdminDashboardComponent),
    canActivate: [authGuard, adminGuard]
  },
  { path: 'chat', loadComponent: () => import('./pages/chat').then(m => m.ChatComponent), canActivate: [authGuard] },
  {
    path: 'lifestyle-quiz',
    loadComponent: () => import('./pages/lifestyle-quiz').then(m => m.LifestyleQuizComponent),
    canActivate: [authGuard]
  },
  {
    path: 'discovery',
    loadComponent: () => import('./pages/discovery').then(m => m.DiscoveryComponent),
    canActivate: [authGuard]
  },
  { path: 'rooms', loadComponent: () => import('./pages/rooms').then(m => m.RoomsComponent) },
  { path: 'rooms/:id', loadComponent: () => import('./pages/rooms/room-detail').then(m => m.RoomDetailComponent) },
  { path: 'map', loadComponent: () => import('./pages/map').then(m => m.MapComponent) },
  {
    path: 'landlord-profile',
    loadComponent: () => import('./pages/landlord/landlord-profile').then(m => m.LandlordProfileComponent),
    canActivate: [authGuard, landlordGuard]
  },
  {
    path: 'my-listings',
    loadComponent: () => import('./pages/landlord/my-listings/my-listings.component').then(m => m.MyListingsComponent),
    canActivate: [authGuard, landlordGuard]
  },
  {
    path: 'create-listing',
    loadComponent: () => import('./pages/landlord/create-listing/create-listing.component').then(m => m.CreateListingComponent),
    canActivate: [authGuard, landlordGuard]
  },
  {
    path: 'landlord-pricing',
    loadComponent: () => import('./pages/landlord/landlord-pricing').then(m => m.LandlordPricingComponent),
    canActivate: [authGuard, landlordGuard]
  },
  { path: 'listing-pricing', redirectTo: 'landlord-pricing', pathMatch: 'full' },
  {
    path: 'tenant-pricing',
    loadComponent: () => import('./pages/tenant-pricing').then(m => m.TenantPricingComponent),
    canActivate: [authGuard]
  },
  {
    path: 'payment/result',
    loadComponent: () => import('./pages/payment/payment-result').then(m => m.PaymentResultComponent)
  },
  {
    path: 'landlord-chat',
    loadComponent: () => import('./pages/landlord/landlord-placeholder/landlord-placeholder.component').then(m => m.LandlordPlaceholderComponent),
    canActivate: [authGuard, landlordGuard],
    data: { title: 'Tin nhắn', description: 'Kênh tin nhắn chủ trọ sẽ được cập nhật sớm.' }
  },
  {
    path: 'listing-viewers',
    loadComponent: () => import('./pages/landlord/listing-viewers').then(m => m.ListingViewersComponent),
    canActivate: [authGuard, landlordGuard]
  },
  { path: '', loadComponent: () => import('./pages/home').then(m => m.HomeComponent) },
  { path: '**', redirectTo: '' }
];
