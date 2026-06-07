import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { isAdminUser } from '../../utils/user-display';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { FooterComponent } from '../../components/layout/footer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  isLoggedIn = false;
  heroDiscoveryLink = '/discovery';
  heroDiscoveryQueryParams: Record<string, string> | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn;
    if (!this.isLoggedIn) {
      this.heroDiscoveryLink = '/login';
      this.heroDiscoveryQueryParams = { returnUrl: '/discovery' };
    }
    if (!this.isLoggedIn) return;
    if (isAdminUser(this.authService.getCurrentUser())) {
      void this.router.navigateByUrl('/admin');
      return;
    }
    this.authService.refreshProfile().subscribe((profile) => {
      if (isAdminUser(profile)) {
        void this.router.navigateByUrl('/admin');
      }
    });
  }
}
