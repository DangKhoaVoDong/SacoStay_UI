import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import * as L from 'leaflet';

const CITY_CENTERS: Record<string, [number, number]> = {
  'Hà Nội': [21.0285, 105.8542],
  'TP.HCM': [10.7769, 106.7009]
};

@Component({
  selector: 'app-listing-map',
  standalone: true,
  template: `<div #mapHost class="w-full h-full min-h-[320px]"></div>`,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `
  ]
})
export class ListingMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() city = 'Hà Nội';
  @Input() lat: number | null = null;
  @Input() lng: number | null = null;

  @Output() readonly locationPick = new EventEmitter<{ lat: number; lng: number }>();

  @ViewChild('mapHost', { static: true }) mapHost!: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private marker?: L.Marker;
  private readonly cdr = inject(ChangeDetectorRef);

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;
    if (changes['city'] && !changes['city'].firstChange) {
      const center = CITY_CENTERS[this.city] ?? CITY_CENTERS['Hà Nội'];
      this.map.setView(center, 13);
    }
    if (changes['lat'] || changes['lng']) {
      this.syncMarker();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initMap(): void {
    const center = CITY_CENTERS[this.city] ?? CITY_CENTERS['Hà Nội'];
    this.map = L.map(this.mapHost.nativeElement, { zoomControl: true }).setView(center, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.locationPick.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    setTimeout(() => this.map?.invalidateSize(), 100);
    this.syncMarker();
    this.cdr.detectChanges();
  }

  private syncMarker(): void {
    if (!this.map) return;
    if (this.lat == null || this.lng == null) {
      if (this.marker) {
        this.map.removeLayer(this.marker);
        this.marker = undefined;
      }
      return;
    }
    const pos: L.LatLngExpression = [this.lat, this.lng];
    if (this.marker) {
      this.marker.setLatLng(pos);
    } else {
      this.marker = L.marker(pos, {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:32px;height:40px;display:flex;align-items:center;justify-content:center">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
              <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24S32 26 32 16C32 7.163 24.837 0 16 0z" fill="#FF6B6B"/>
              <circle cx="16" cy="16" r="7" fill="white"/>
              <circle cx="16" cy="16" r="4" fill="#FF6B6B"/>
            </svg>
          </div>`,
          iconSize: [32, 40],
          iconAnchor: [16, 40]
        })
      }).addTo(this.map);
    }
    this.map.panTo(pos);
  }
}
