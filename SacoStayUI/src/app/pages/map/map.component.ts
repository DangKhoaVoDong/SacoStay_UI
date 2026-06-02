import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, skip } from 'rxjs/operators';
import * as L from 'leaflet';
import { NavbarComponent } from '../../components/layout/navbar.component';
import { RoomPostService } from '../../services/room-post.service';
import type { RoomPostSummary } from '../../models/room-post.models';
import { cityMatches, districtMatches } from '../../utils/room-filters';
import { FILTER_CITY_OPTIONS, districtFilterOptions } from '../../utils/vietnam-districts';
import { createHouseMarkerIcon, DEFAULT_MAP_CENTER, MAP_CITY_CENTERS } from '../../utils/map-markers';
import { getVipTierSidebarTitleClass, sortRoomsByVipTier } from '../../utils/vip-tier-styles';

interface MapFilters {
  city: string;
  district: string;
  priceMax: number;
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapHost', { static: true }) mapHost!: ElementRef<HTMLDivElement>;

  allRooms: RoomPostSummary[] = [];
  filteredRooms: RoomPostSummary[] = [];
  selectedRoom: RoomPostSummary | null = null;

  loading = true;
  loadError = '';
  searchQuery = '';
  showFilters = false;

  filters: MapFilters = {
    city: 'all',
    district: 'all',
    priceMax: 50_000_000
  };

  readonly cityOptions = FILTER_CITY_OPTIONS;

  get districtOptions() {
    return districtFilterOptions(this.filters.city);
  }

  private map?: L.Map;
  private readonly markerLayer = L.layerGroup();
  private readonly roomPosts = inject(RoomPostService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly markerByRoomId = new Map<string, L.Marker>();

  get roomsOnMap(): RoomPostSummary[] {
    return this.filteredRooms.filter((r) => this.hasCoords(r));
  }

  get minPriceM(): string | null {
    const prices = this.filteredRooms.map((r) => r.price).filter((p): p is number => !!p && p > 0);
    if (!prices.length) return null;
    return (Math.min(...prices) / 1_000_000).toFixed(1);
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.loadRooms();

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        filter((e) => e.urlAfterRedirects.split('?')[0].includes('/map')),
        skip(1),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.loadRooms());
  }

  private loadRooms(): void {
    this.loading = true;
    this.loadError = '';
    this.roomPosts
      .listForBrowse()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.allRooms = list;
          this.applyFilters();
          this.loading = false;
          this.loadError = '';
          setTimeout(() => {
            this.map?.invalidateSize();
            this.syncMarkers();
          }, 150);
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.loadError = 'Không tải được danh sách phòng. Kiểm tra API và thử lại.';
          this.cdr.detectChanges();
        }
      });
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  onCityFilterChange(): void {
    this.filters = { ...this.filters, district: 'all' };
    this.onFiltersChange();
  }

  onFiltersChange(): void {
    this.applyFilters();
    this.syncMarkers();
    this.cdr.detectChanges();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.onFiltersChange();
  }

  selectRoom(room: RoomPostSummary): void {
    this.selectedRoom = room;
    this.syncMarkers();
    if (this.hasCoords(room) && this.map) {
      this.map.flyTo([room.latitude!, room.longitude!], 16, { duration: 1.2 });
      const marker = this.markerByRoomId.get(room.id);
      marker?.openPopup();
    }
    this.cdr.detectChanges();
  }

  clearSelection(): void {
    this.selectedRoom = null;
    this.syncMarkers();
    this.cdr.detectChanges();
  }

  hasCoords(room: RoomPostSummary): boolean {
    return (
      room.latitude != null &&
      room.longitude != null &&
      Number.isFinite(room.latitude) &&
      Number.isFinite(room.longitude)
    );
  }

  locationLine(room: RoomPostSummary): string {
    return [room.district, room.city].filter(Boolean).join(', ') || room.address || '—';
  }

  priceShort(price?: number): string {
    if (!price) return 'Liên hệ';
    return `${(price / 1_000_000).toFixed(1)}tr/tháng`;
  }

  formatPriceVnd(price?: number): string {
    if (!price) return 'Liên hệ';
    return (
      new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(price) +
      '/tháng'
    );
  }

  sidebarTitleClass(room: RoomPostSummary): string {
    const base = getVipTierSidebarTitleClass(room.vipTier, this.selectedRoom?.id === room.id);
    return this.selectedRoom?.id === room.id ? base : `${base} line-clamp-2`;
  }

  private initMap(): void {
    this.map = L.map(this.mapHost.nativeElement, { zoomControl: false }).setView(DEFAULT_MAP_CENTER, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    this.markerLayer.addTo(this.map);

    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  private applyFilters(): void {
    const q = this.searchQuery.trim().toLowerCase();
    const filtered = this.allRooms.filter((room) => {
      if (!cityMatches(room.city, room.address, this.filters.city)) return false;
      if (!districtMatches(room.district, room.address, this.filters.district)) return false;
      if (room.price != null && room.price > 0 && room.price > this.filters.priceMax) return false;
      if (q) {
        const title = room.title.toLowerCase();
        const district = (room.district ?? '').toLowerCase();
        const city = (room.city ?? '').toLowerCase();
        const addr = (room.address ?? '').toLowerCase();
        if (!title.includes(q) && !district.includes(q) && !city.includes(q) && !addr.includes(q)) {
          return false;
        }
      }
      return true;
    });
    this.filteredRooms = sortRoomsByVipTier(filtered);
  }

  private syncMarkers(): void {
    if (!this.map) return;
    this.markerLayer.clearLayers();
    this.markerByRoomId.clear();

    for (const room of this.roomsOnMap) {
      const selected = this.selectedRoom?.id === room.id;
      const marker = L.marker([room.latitude!, room.longitude!], {
        icon: createHouseMarkerIcon(selected, room.vipTier)
      });

      marker.bindPopup(this.buildMarkerPopupHtml(room), {
        maxWidth: 280,
        minWidth: 220,
        className: 'saco-room-popup'
      });
      marker.on('click', () => this.selectRoom(room));
      this.markerLayer.addLayer(marker);
      this.markerByRoomId.set(room.id, marker);
    }

    if (this.selectedRoom && this.hasCoords(this.selectedRoom)) {
      return;
    }

    const onMap = this.roomsOnMap;
    if (onMap.length === 1) {
      this.map.setView([onMap[0].latitude!, onMap[0].longitude!], 14);
    } else if (onMap.length > 1) {
      const bounds = L.latLngBounds(onMap.map((r) => [r.latitude!, r.longitude!] as [number, number]));
      this.map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
    } else if (this.filters.city !== 'all' && MAP_CITY_CENTERS[this.filters.city]) {
      this.map.setView(MAP_CITY_CENTERS[this.filters.city], 12);
    }
  }

  private buildMarkerPopupHtml(room: RoomPostSummary): string {
    const thumb = room.imageUrl || '';
    const detailUrl = `/rooms/${encodeURIComponent(room.id)}`;
    return `
      <div class="map-popup-card">
        ${
          thumb
            ? `<img src="${this.escapeHtml(thumb)}" alt="" class="map-popup-card__img" />`
            : '<div class="map-popup-card__img map-popup-card__img--empty">Chưa có ảnh</div>'
        }
        <div class="map-popup-card__body">
          <p class="map-popup-card__title">${this.escapeHtml(room.title)}</p>
          <p class="map-popup-card__location">${this.escapeHtml(this.locationLine(room))}</p>
          <p class="map-popup-card__price">${this.escapeHtml(this.formatPriceVnd(room.price))}</p>
          <a href="${detailUrl}" class="map-popup-card__link">Xem chi tiết →</a>
        </div>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
