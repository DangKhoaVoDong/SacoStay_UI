export interface AdminDashboardStats {
  totalUsers: number;
  totalRoomPosts: number;
  pendingRoomPosts: number;
  activeRoomPosts: number;
  hiddenRoomPosts: number;
}

export interface AdminUserRow {
  id: string;
  userName: string;
  email: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  createdAt: string;
  roles: string[];
  avatar?: string;
  totalSiteSeconds?: number;
  lastSeenAt?: string;
}

export interface AdminRoomPostRow {
  id: string;
  title: string;
  price: number;
  city: string;
  district: string;
  detailedAddress?: string;
  status: string;
  packageTier?: string;
  createdAt: string;
  images?: string[];
  userId: string;
  landlordName?: string;
  landlordEmail?: string;
}
