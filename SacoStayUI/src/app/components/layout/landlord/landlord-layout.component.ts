import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandlordSidebarComponent } from './landlord-sidebar.component';
import { NotificationBellComponent } from '../../shared/notification-bell/notification-bell.component';
import { SACOSTAY_LANDLORD_LOGO_URL, SACOSTAY_LOGO_CLASS } from '../../../utils/brand-assets';

@Component({
  selector: 'app-landlord-layout',
  standalone: true,
  imports: [CommonModule, LandlordSidebarComponent, NotificationBellComponent],
  templateUrl: './landlord-layout.component.html'
})
export class LandlordLayoutComponent {
  readonly logoUrl = SACOSTAY_LANDLORD_LOGO_URL;
  readonly logoClass = SACOSTAY_LOGO_CLASS;
  mobileMenuOpen = false;
  private readonly cdr = inject(ChangeDetectorRef);

  openMobileMenu(): void {
    this.mobileMenuOpen = true;
    this.cdr.detectChanges();
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    this.cdr.detectChanges();
  }
}
