import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandlordSidebarComponent } from './landlord-sidebar.component';
import { NotificationBellComponent } from '../../shared/notification-bell/notification-bell.component';

@Component({
  selector: 'app-landlord-layout',
  standalone: true,
  imports: [CommonModule, LandlordSidebarComponent, NotificationBellComponent],
  templateUrl: './landlord-layout.component.html'
})
export class LandlordLayoutComponent {
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
