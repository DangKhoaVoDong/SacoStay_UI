import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../components/layout/navbar.component';
import { FooterComponent } from '../../../components/layout/footer.component';
import { faqItemById, type FaqItem } from '../../../data/faq.data';

@Component({
  selector: 'app-faq-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './faq-detail.component.html'
})
export class FaqDetailComponent {
  private readonly route = inject(ActivatedRoute);

  readonly faq: FaqItem | undefined = faqItemById(this.route.snapshot.data['faqId'] as string);
}
