import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/auth').then(m => m.AuthComponent) },
  { path: 'register', loadComponent: () => import('./pages/auth').then(m => m.AuthComponent) },
  { path: 'auth', loadComponent: () => import('./pages/auth').then(m => m.AuthComponent) },
  { path: 'otp-verification', loadComponent: () => import('./pages/otp').then(m => m.OtpVerificationComponent) },
  { path: 'forgot-password', loadComponent: () => import('./pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  { path: 'verify-reset-otp', loadComponent: () => import('./pages/verify-reset-otp/verify-reset-otp.component').then(m => m.VerifyResetOtpComponent) },
  { path: 'reset-password', loadComponent: () => import('./pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
  { path: 'profile-setup', loadComponent: () => import('./pages/profile-setup').then(m => m.ProfileSetupComponent), canActivate: [authGuard] },
  { path: '', loadComponent: () => import('./pages/home').then(m => m.HomeComponent) },
  { path: '**', redirectTo: '' }
];
