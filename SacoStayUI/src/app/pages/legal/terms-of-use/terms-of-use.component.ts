import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../components/layout/navbar.component';
import { FooterComponent } from '../../../components/layout/footer.component';

@Component({
  selector: 'app-terms-of-use',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './terms-of-use.component.html'
})
export class TermsOfUseComponent {
  readonly lastUpdated = '20/05/2026';
}
