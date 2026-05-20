import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import type {
  CreateRoomPostPayload,
  RoomOccupant,
  RoomPostAnalytics,
  RoomPostDetail,
  RoomPostSummary,
  RoomPostViewAnalytics,
  RoomPostViewerRow
} from '../models/room-post.models';
import { parseRoomVipTier } from '../utils/vip-tier-styles';

function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function unwrapList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;
  const nested =
    o['data'] ??
    o['items'] ??
    o['result'] ??
    o['posts'] ??
    o['roomPosts'] ??
    o['RoomPosts'] ??
    o['value'] ??
    o['$values'];
  if (Array.isArray(nested)) return nested;
  return [];
}

/** Số thập phân dạng chuỗi invariant (dấu chấm) cho ASP.NET. */
function formNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('en-US', { useGrouping: false, maximumFractionDigits: 10 }).format(n);
}

function safeFileName(name: string): string {
  const base = name.replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_');
  return base.length > 0 ? base : 'image.jpg';
}

function resolveMediaUrl(url: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const base = environment.apiUrl.replace(/\/api\/?$/, '');
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}

@Injectable({ providedIn: 'root' })
export class RoomPostService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getMyPosts(): Observable<RoomPostSummary[]> {
    return this.http.get<unknown>(`${this.apiUrl}/RoomPost/my-posts`).pipe(
      map((raw) => this.normalizePosts(raw)),
      catchError(() => of([]))
    );
  }

  searchNearby(userLat = 10.7769, userLng = 106.7009, radiusInKm = 25): Observable<RoomPostSummary[]> {
    const params = new HttpParams()
      .set('userLat', String(userLat))
      .set('userLng', String(userLng))
      .set('radiusInKm', String(radiusInKm));
    return this.http.get<unknown>(`${this.apiUrl}/RoomPost/search-nearby`, { params }).pipe(
      map((raw) => this.normalizePosts(raw)),
      catchError(() => of([]))
    );
  }

  /** Gộp tin từ Hà Nội + TP.HCM (API chỉ có search-nearby, không có GET danh sách). */
  listForBrowse(): Observable<RoomPostSummary[]> {
    return forkJoin([
      this.searchNearby(21.0285, 105.8542, 80),
      this.searchNearby(10.7769, 106.7009, 80)
    ]).pipe(map(([hn, hcm]) => this.dedupeById([...hn, ...hcm])));
  }

  private dedupeById(rooms: RoomPostSummary[]): RoomPostSummary[] {
    const seen = new Set<string>();
    return rooms.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }

  /**
   * OpenAPI không có GET /RoomPost/{id}.
   * Chi tiết lấy từ my-posts (chủ trọ) + search-nearby (mọi user).
   */
  getById(id: string): Observable<RoomPostDetail | null> {
    return forkJoin({
      nearby: this.searchNearby(10.7769, 106.7009, 100),
      mine: this.getMyPosts().pipe(catchError(() => of([] as RoomPostSummary[])))
    }).pipe(
      map(({ nearby, mine }) => {
        const hit = [...mine, ...nearby].find((r) => r.id === id);
        return hit ? this.summaryAsDetail(hit) : null;
      })
    );
  }

  /**
   * POST /api/RoomPost/create — multipart/form-data, PascalCase.
   * Thứ tự field khớp UI/API: Title → DetailedAddress → … → Description → Amenities → ImageFiles.
   */
  create(payload: CreateRoomPostPayload, imageFiles: File[]): Observable<unknown> {
    const fd = new FormData();
    const lat = formNumber(payload.latitude);
    const lng = formNumber(payload.longitude);

    fd.append('Title', payload.title);
    fd.append('DetailedAddress', payload.detailedAddress);
    fd.append('City', payload.city);
    fd.append('District', payload.district);
    fd.append('Area', formNumber(payload.area));
    fd.append('MaxPeople', String(Math.round(payload.maxPeople)));
    fd.append('Price', formNumber(payload.price));
    fd.append('Location.Latitude', lat);
    fd.append('Location.Longitude', lng);
    fd.append('Description', payload.description);
    payload.amenities.forEach((a) => fd.append('Amenities', a));
    imageFiles.forEach((file) => fd.append('ImageFiles', file, safeFileName(file.name)));
    return this.http.post<unknown>(`${this.apiUrl}/RoomPost/create`, fd);
  }

  recordView(postId: string): Observable<void> {
    return this.http.post<unknown>(`${this.apiUrl}/RoomPost/${encodeURIComponent(postId)}/view`, {}).pipe(
      map(() => undefined),
      catchError(() => of(undefined))
    );
  }

  getRoomViewAnalytics(postId: string): Observable<RoomPostViewAnalytics> {
    return this.http.get<unknown>(`${this.apiUrl}/RoomPost/${encodeURIComponent(postId)}/analytics`).pipe(
      map((raw) => this.normalizeViewAnalytics(postId, raw)),
      catchError(() =>
        of({
          postId,
          roomTitle: '',
          currentPackage: 'BASIC',
          isLimitedView: true,
          totalViewsIn24H: 0,
          viewers: []
        })
      )
    );
  }

  getPostAnalytics(postId: string): Observable<RoomPostAnalytics> {
    return this.getRoomViewAnalytics(postId).pipe(
      map((a) => ({
        postId: a.postId,
        totalViews: a.totalViewsIn24H,
        monthlyViews: a.totalViewsIn24H
      }))
    );
  }

  private normalizeViewAnalytics(postId: string, raw: unknown): RoomPostViewAnalytics {
    const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const id = str(o['roomId'] ?? o['RoomId'] ?? o['postId'] ?? o['PostId']) || postId;
    const roomTitle = str(o['roomTitle'] ?? o['RoomTitle'] ?? o['title'] ?? o['Title']);
    const currentPackage = str(o['currentPackage'] ?? o['CurrentPackage'] ?? 'BASIC') || 'BASIC';
    const isLimitedView = Boolean(o['isLimitedView'] ?? o['IsLimitedView'] ?? currentPackage.toUpperCase() !== 'ELITE');
    const totalViewsIn24H = Number(o['totalViewsIn24H'] ?? o['TotalViewsIn24H'] ?? 0);
    const viewersRaw = o['viewers'] ?? o['Viewers'];
    const viewers = unwrapList(viewersRaw)
      .map((item) => this.normalizeViewerRow(item, id, roomTitle))
      .filter((v): v is RoomPostViewerRow => !!v);
    return {
      postId: id,
      roomTitle,
      currentPackage,
      isLimitedView,
      totalViewsIn24H: Number.isFinite(totalViewsIn24H) ? totalViewsIn24H : viewers.length,
      viewers
    };
  }

  private normalizeViewerRow(item: unknown, postId: string, roomTitle: string): RoomPostViewerRow | null {
    if (!item || typeof item !== 'object') return null;
    const o = item as Record<string, unknown>;
    const tenantId = str(o['tenantId'] ?? o['TenantId'] ?? o['userId'] ?? o['UserId']);
    if (!tenantId) return null;
    const viewedAt =
      str(o['viewedTime'] ?? o['ViewedTime'] ?? o['viewedAt'] ?? o['ViewedAt']) || new Date().toISOString();
    return {
      tenantId,
      viewedAt,
      roomPostId: postId,
      roomTitle
    };
  }

  getAggregatedMonthlyViews(postIds: string[]): Observable<number> {
    if (!postIds.length) return of(0);
    return forkJoin(postIds.map((id) => this.getPostAnalytics(id))).pipe(
      map((rows) => rows.reduce((sum, r) => sum + (r.monthlyViews ?? r.totalViews ?? 0), 0))
    );
  }

  private summaryAsDetail(summary: RoomPostSummary): RoomPostDetail {
    return {
      ...summary,
      landlordUserId: summary.landlordUserId,
      images: summary.imageUrl ? [summary.imageUrl] : [],
      description: undefined
    };
  }

  private normalizePosts(raw: unknown): RoomPostSummary[] {
    return unwrapList(raw)
      .map((item, index) => this.normalizeSummary(this.flattenRoomItem(item), index))
      .filter((r): r is RoomPostSummary => !!r);
  }

  /** search-nearby có thể bọc trong room/Room; gộp để lấy UserId chủ trọ. */
  private flattenRoomItem(item: unknown): Record<string, unknown> {
    if (!item || typeof item !== 'object') return {};
    const o = item as Record<string, unknown>;
    const nested = o['room'] ?? o['Room'];
    if (nested && typeof nested === 'object') {
      return { ...(nested as Record<string, unknown>), ...o };
    }
    return o;
  }

  private normalizeDetail(raw: unknown): RoomPostDetail | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const base = this.normalizeSummary(o, 0);
    if (!base) return null;
    const description = str(o['description'] ?? o['Description']);
    const images = this.extractImages(o);
    const amenities = this.extractAmenities(o);
    const nearbyLandmarks = this.extractStringList(o['nearbyLandmarks'] ?? o['NearbyLandmarks'] ?? o['landmarks'] ?? o['Landmarks']);
    const landlordPhone = str(o['landlordPhone'] ?? o['LandlordPhone'] ?? o['phoneNumber'] ?? o['PhoneNumber'] ?? o['contactPhone'] ?? o['ContactPhone']);
    const landlordUserId = str(o['landlordUserId'] ?? o['LandlordUserId'] ?? o['userId'] ?? o['UserId'] ?? o['ownerId'] ?? o['OwnerId']);
    const occupants = this.normalizeOccupants(o);
    return {
      ...base,
      description: description || undefined,
      images: images.length ? images : base.imageUrl ? [base.imageUrl] : [],
      amenities: amenities.length ? amenities : base.amenities,
      nearbyLandmarks: nearbyLandmarks.length ? nearbyLandmarks : undefined,
      landlordPhone: landlordPhone || undefined,
      landlordUserId: landlordUserId || undefined,
      occupants: occupants.length ? occupants : undefined
    };
  }

  private normalizeSummary(item: unknown, index: number): RoomPostSummary | null {
    if (!item || typeof item !== 'object') return null;
    const o = item as Record<string, unknown>;
    const id = str(o['id'] ?? o['Id'] ?? o['roomPostId'] ?? o['RoomPostId']);
    const title = str(o['title'] ?? o['Title'] ?? o['name'] ?? o['Name']) || `Tin #${index + 1}`;
    const priceNum = Number(o['price'] ?? o['Price'] ?? 0);
    const images = this.extractImages(o);
    const imageUrl = images[0] || str(o['imageUrl'] ?? o['ImageUrl'] ?? o['thumbnail'] ?? o['Thumbnail']);
    const areaNum = Number(o['area'] ?? o['Area'] ?? 0);
    const maxNum = Number(o['maxPeople'] ?? o['MaxPeople'] ?? o['maxOccupants'] ?? o['MaxOccupants'] ?? 0);
    const currentNum = Number(o['currentPeople'] ?? o['CurrentPeople'] ?? o['currentOccupants'] ?? 0);
    const occupants = o['currentOccupants'] ?? o['CurrentOccupants'];
    let currentPeople = Number.isFinite(currentNum) && currentNum > 0 ? currentNum : undefined;
    if (!currentPeople && Array.isArray(occupants)) {
      currentPeople = occupants.length;
    }
    const landlordUserId = str(
      o['landlordUserId'] ?? o['LandlordUserId'] ?? o['userId'] ?? o['UserId'] ?? o['ownerId'] ?? o['OwnerId']
    );
    const city = str(o['city'] ?? o['City']);
    const district = str(o['district'] ?? o['District']);
    const addressStr = str(
      o['detailedAddress'] ?? o['DetailedAddress'] ?? o['address'] ?? o['Address']
    );
    const fullAddress = [addressStr, district, city].filter(Boolean).join(', ');
    return {
      id: id || `post-${index}`,
      landlordUserId: landlordUserId || undefined,
      title,
      price: Number.isFinite(priceNum) && priceNum > 0 ? priceNum : undefined,
      address: fullAddress || addressStr || undefined,
      city: city || undefined,
      district: district || undefined,
      area: Number.isFinite(areaNum) && areaNum > 0 ? areaNum : undefined,
      maxPeople: Number.isFinite(maxNum) && maxNum > 0 ? maxNum : undefined,
      currentPeople,
      imageUrl: imageUrl ? resolveMediaUrl(imageUrl) : undefined,
      status: str(o['status'] ?? o['Status']) || undefined,
      viewCount: Number(o['viewCount'] ?? o['ViewCount'] ?? 0) || undefined,
      vipTier: parseRoomVipTier(o['vipTier'] ?? o['VipTier'] ?? o['vipLevel'] ?? o['VipLevel']),
      amenities: this.extractAmenities(o)
    };
  }

  private extractImages(o: Record<string, unknown>): string[] {
    const images = o['images'] ?? o['Images'] ?? o['imageUrls'] ?? o['ImageUrls'] ?? o['imageFiles'] ?? o['ImageFiles'];
    if (!Array.isArray(images)) return [];
    return images.map((x) => resolveMediaUrl(str(x))).filter(Boolean);
  }

  private extractAmenities(o: Record<string, unknown>): string[] {
    const raw = o['amenities'] ?? o['Amenities'];
    if (!Array.isArray(raw)) return [];
    return raw.map((x) => str(x)).filter(Boolean);
  }

  private extractStringList(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((x) => str(x)).filter(Boolean);
  }

  private normalizeOccupants(o: Record<string, unknown>): RoomOccupant[] {
    const raw = o['occupants'] ?? o['Occupants'] ?? o['roommates'] ?? o['Roommates'] ?? o['currentOccupants'] ?? o['CurrentOccupants'];
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => {
        if (typeof item === 'string' || typeof item === 'number') {
          const id = str(item);
          return id ? { id, name: 'Thành viên' } satisfies RoomOccupant : null;
        }
        if (!item || typeof item !== 'object') return null;
        const u = item as Record<string, unknown>;
        const id = str(u['id'] ?? u['Id'] ?? u['userId'] ?? u['UserId']);
        if (!id) return null;
        const name = str(u['name'] ?? u['Name'] ?? u['userName'] ?? u['UserName']) || 'Thành viên';
        const avatar = str(u['avatar'] ?? u['Avatar']);
        const age = Number(u['age'] ?? u['Age']);
        const occupation = str(u['job'] ?? u['Job'] ?? u['occupation'] ?? u['Occupation']);
        return {
          id,
          name,
          avatar: avatar ? resolveMediaUrl(avatar) : undefined,
          age: Number.isFinite(age) && age > 0 ? age : undefined,
          occupation: occupation || undefined
        } satisfies RoomOccupant;
      })
      .filter((x): x is RoomOccupant => !!x);
  }
}
