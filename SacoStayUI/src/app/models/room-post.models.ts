import type { VipTier } from '../utils/vip-tier-styles';

export interface RoomPostSummary {
  id: string;
  /** Id chủ trọ (RoomPost.UserId từ API). */
  landlordUserId?: string;
  title: string;
  price?: number;
  address?: string;
  city?: string;
  district?: string;
  area?: number;
  maxPeople?: number;
  currentPeople?: number;
  imageUrl?: string;
  status?: string;
  viewCount?: number;
  vipTier?: VipTier;
  amenities?: string[];
  /** Có trên tin đầy đủ (my-posts); search-nearby thường không trả. */
  description?: string;
  /** Vị trí ghim từ tin đăng (search-nearby → Location / Latitude). */
  latitude?: number;
  longitude?: number;
}

export interface RoomPostDetail extends RoomPostSummary {
  description?: string;
  images?: string[];
  nearbyLandmarks?: string[];
  landlordPhone?: string;
  landlordUserId?: string;
  occupants?: RoomOccupant[];
}

export interface RoomOccupant {
  id: string;
  name: string;
  avatar?: string;
  age?: number;
  occupation?: string;
}

export interface RoomPostAnalytics {
  postId: string;
  totalViews?: number;
  monthlyViews?: number;
}

export interface RoomPostViewerRow {
  tenantId: string;
  viewedAt: string;
  roomPostId: string;
  roomTitle: string;
}

/** GET /api/RoomPost/{id}/analytics */
export interface RoomPostViewAnalytics {
  postId: string;
  roomTitle: string;
  currentPackage: string;
  isLimitedView: boolean;
  totalViewsIn24H: number;
  viewers: RoomPostViewerRow[];
}

export interface RoomListFilters {
  city: string;
  district: string;
  priceMin: number;
  priceMax: number;
  maxOccupants: string;
}

/** Payload đăng tin — gửi multipart PascalCase theo OpenAPI POST /RoomPost/create */
/** PUT /api/RoomPost/{id}/status */
export interface UpdateRoomPostStatusPayload {
  status: 'active' | 'inactive';
  /** Số người đang ở (0 … maxPeople). */
  currentPeople?: number;
}

export interface CreateRoomPostPayload {
  title: string;
  description: string;
  detailedAddress: string;
  city: string;
  district: string;
  area: number;
  maxPeople: number;
  price: number;
  amenities: string[];
  latitude: number;
  longitude: number;
}
