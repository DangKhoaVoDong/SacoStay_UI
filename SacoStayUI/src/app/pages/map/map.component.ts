import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { FooterComponent } from '../../components/layout/footer.component';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [RouterLink, NavbarComponent, FooterComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-[#FFF8F0]">
      <app-navbar />
      <div class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-3xl font-bold text-[#1A1A2E] mb-2">Bản đồ phòng trọ</h1>
        <p class="text-gray-500 mb-8">Xem vị trí các phòng trọ trên bản đồ (đang hoàn thiện).</p>
        <div
          class="rounded-2xl border border-orange-100 bg-white h-[min(60vh,520px)] flex flex-col items-center justify-center text-gray-500 shadow-sm"
        >
          <svg class="w-16 h-16 text-[#FF9F43] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m0 13V7m0 0L9 4"
            />
          </svg>
          <p class="mb-4">Bản đồ tương tác sẽ sớm có mặt.</p>
          <a
            routerLink="/rooms"
            class="px-4 py-2 rounded-lg bg-[#FF9F43] text-white text-sm font-medium hover:bg-[#FF8C2A]"
          >
            Xem danh sách phòng
          </a>
        </div>
      </div>
      <app-footer />
    </div>
  `
})
export class MapComponent {}
