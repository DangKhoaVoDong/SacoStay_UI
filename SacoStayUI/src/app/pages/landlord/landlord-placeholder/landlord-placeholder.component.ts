import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LandlordLayoutComponent } from '../../../components/layout/landlord/landlord-layout.component';

@Component({
  selector: 'app-landlord-placeholder',
  standalone: true,
  imports: [CommonModule, RouterLink, LandlordLayoutComponent],
  template: `
    <app-landlord-layout>
      <div class="max-w-2xl mx-auto text-center py-16">
        <h1 class="text-2xl font-bold text-[#1A1A2E] mb-3">{{ title }}</h1>
        <p class="text-gray-600 mb-8">{{ description }}</p>
        <a
          routerLink="/landlord-profile"
          class="inline-block px-6 py-3 rounded-lg bg-[#FF9F43] text-white font-medium hover:bg-[#FF8C2A] transition-colors"
        >
          Về Hồ sơ Chủ trọ
        </a>
      </div>
    </app-landlord-layout>
  `
})
export class LandlordPlaceholderComponent implements OnInit {
  title = 'Đang phát triển';
  description = 'Tính năng này sẽ được cập nhật trong phiên bản tiếp theo.';

  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    const data = this.route.snapshot.data;
    if (data['title']) this.title = String(data['title']);
    if (data['description']) this.description = String(data['description']);
  }
}
