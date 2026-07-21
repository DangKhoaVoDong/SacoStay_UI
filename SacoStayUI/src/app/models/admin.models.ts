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

export interface AdminPaymentBuyerSlice {
  buyerType: string;
  count: number;
  amount: number;
}

export interface AdminPaymentStatusSlice {
  status: string;
  count: number;
  amount: number;
}

export interface AdminDailyRevenue {
  date: string;
  label: string;
  amount: number;
  count: number;
}

export interface AdminPaymentStats {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueGrowthPercent: number | null;
  totalTransactions: number;
  successCount: number;
  pendingCount: number;
  failedCount: number;
  cancelledCount: number;
  byBuyerType: AdminPaymentBuyerSlice[];
  byStatus: AdminPaymentStatusSlice[];
  dailyRevenue: AdminDailyRevenue[];
}

export interface AdminTransactionRow {
  id: number;
  orderId: string;
  amount: number;
  status: string;
  paymentMethod: string;
  transactionNo?: string;
  createdAt: string;
  roomPostId?: string;
  roomTitle?: string;
  packageName?: string;
  buyerType: string;
  userId?: string;
  buyerName?: string;
  buyerEmail?: string;
}
