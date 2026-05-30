import * as L from 'leaflet';
import { getVipTierMarkerColor, type VipTier } from './vip-tier-styles';

/** Icon nhà tùy chỉnh (MagicPattern). */
export function createHouseMarkerIcon(selected: boolean, tier?: VipTier | string): L.DivIcon {
  const color = getVipTierMarkerColor(tier, selected);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="42" viewBox="0 0 36 42">
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
      </filter>
      <g filter="url(#shadow)">
        <path d="M18 2L2 14v20h10V24h12v10h10V14L18 2z" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="18" cy="36" r="4" fill="${color}" stroke="white" stroke-width="2"/>
        <line x1="18" y1="32" x2="18" y2="40" stroke="${color}" stroke-width="2"/>
      </g>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [36, 42],
    iconAnchor: [18, 42],
    popupAnchor: [0, -42]
  });
}

export const MAP_CITY_CENTERS: Record<string, [number, number]> = {
  'Hà Nội': [21.0285, 105.8542],
  'TP.HCM': [10.7769, 106.7009]
};

export const DEFAULT_MAP_CENTER: [number, number] = MAP_CITY_CENTERS['TP.HCM'];
