export interface TenantRoomProfile {
  userId?: string | null;
  city?: string | null;
  district?: string | null;
  maxPeople?: number | null;
  /** Giá thuê VND/tháng — khớp BE `Price`. */
  price?: number | null;
  amenities?: string[];
  extraNotes?: string | null;
  images?: string[];
  updatedAt?: string | null;
}

export interface TenantRoomProfilePayload {
  city: string;
  district: string;
  maxPeople: number;
  price?: number;
  amenities: string[];
  extraNotes?: string;
}

export interface TenantRoomProfileSaveOptions {
  payload: TenantRoomProfilePayload;
  imageFiles?: File[];
}

export interface TenantRoomProfileSaveResult {
  message: string;
  profile: TenantRoomProfile | null;
}
