import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../components/layout/navbar.component';
import { FooterComponent } from '../../../components/layout/footer.component';
import { FAQ_ITEMS } from '../../../data/faq.data';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './faq.component.html'
})
export class FaqComponent {
  readonly faqItems = FAQ_ITEMS;
  expandedId: string | null = null;

  toggle(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
  }
}
