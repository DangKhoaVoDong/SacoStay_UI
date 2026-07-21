import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import { AdminLifestyleQuizComponent } from '../admin-lifestyle-quiz/admin-lifestyle-quiz.component';
import { AdminService, adminApiErrorMessage } from '../../../services/admin.service';
import { ReportService, reportApiErrorMessage } from '../../../services/report.service';
import { AuthService } from '../../../services/auth.service';
import type {
  AdminDashboardStats,
  AdminPaymentStats,
  AdminRoomPostRow,
  AdminTransactionRow,
  AdminUserRow
} from '../../../models/admin.models';
import type { ReportRow } from '../../../models/report.models';
import { resolveMediaUrl } from '../../../utils/media-url';
import { navProfileLabel, profileAvatarFromRaw } from '../../../utils/user-display';
import { UiToastService } from '../../../services/ui-toast.service';
import { UiConfirmService } from '../../../services/ui-confirm.service';
import {
  countByMonth,
  formatTrend,
  growthTrendPercent,
  maxBucketCount,
  type MonthBucket,
  type StatusSlice
} from '../../../utils/admin-growth-charts';
import { SACOSTAY_APK_DOWNLOAD_URL } from '../../../components/shared/apk-download-banner/apk-download-banner.component';
import { SACOSTAY_LOGO_URL } from '../../../utils/brand-assets';

type AdminTab =
  | 'overview'
  | 'pending'
  | 'users'
  | 'transactions'
  | 'lifestyle'
  | 'user-reports'
  | 'room-reports';

interface AdminNavItem {
  id: AdminTab;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, AdminLifestyleQuizComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly reportsApi = inject(ReportService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(UiToastService);
  private readonly uiConfirm = inject(UiConfirmService);

  readonly logoUrl = SACOSTAY_LOGO_URL;
  readonly apkUrl = SACOSTAY_APK_DOWNLOAD_URL;

  readonly navItems: AdminNavItem[] = [
    { id: 'overview', label: 'Tổng quan', icon: 'overview' },
    { id: 'pending', label: 'Kiểm duyệt tin', icon: 'pending' },
    { id: 'users', label: 'Người dùng', icon: 'users' },
    { id: 'transactions', label: 'Giao dịch & doanh thu', icon: 'payments' },
    { id: 'lifestyle', label: 'Quiz lối sống', icon: 'quiz' },
    { id: 'user-reports', label: 'Báo cáo người dùng', icon: 'user-reports' },
    { id: 'room-reports', label: 'Báo cáo phòng trọ', icon: 'room-reports' }
  ];

  activeTab: AdminTab = 'overview';
  sidebarOpen = false;
  loading = true;
  paymentsLoading = false;
  reportsLoading = false;
  errorMessage = '';
  paymentsError = '';
  reportsError = '';
  actionPostId: string | null = null;
  processingReportId: string | null = null;
  detailReport: ReportRow | null = null;
  txStatusFilter = '';

  stats: AdminDashboardStats = {
    totalUsers: 0,
    totalRoomPosts: 0,
    pendingRoomPosts: 0,
    activeRoomPosts: 0,
    hiddenRoomPosts: 0
  };

  paymentStats: AdminPaymentStats = {
    totalRevenue: 0,
    revenueThisMonth: 0,
    revenueLastMonth: 0,
    revenueGrowthPercent: null,
    totalTransactions: 0,
    successCount: 0,
    pendingCount: 0,
    failedCount: 0,
    cancelledCount: 0,
    byBuyerType: [],
    byStatus: [],
    dailyRevenue: []
  };

  users: AdminUserRow[] = [];
  roomPosts: AdminRoomPostRow[] = [];
  transactions: AdminTransactionRow[] = [];
  allReports: ReportRow[] = [];

  ngOnInit(): void {
    this.loadData();
  }

  get pageTitle(): string {
    return this.navItems.find((n) => n.id === this.activeTab)?.label || 'Admin Dashboard';
  }

  get adminName(): string {
    return navProfileLabel(this.auth.getCurrentUser()) || 'Quản trị viên';
  }

  get adminEmail(): string {
    return this.auth.getCurrentUser()?.email || '';
  }

  get adminAvatar(): string {
    const raw = profileAvatarFromRaw(this.auth.getCurrentUser());
    return raw
      ? resolveMediaUrl(raw)
      : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(this.adminName);
  }

  get pendingPosts(): AdminRoomPostRow[] {
    return this.roomPosts.filter((p) => this.isPendingStatus(p.status));
  }

  get filteredTransactions(): AdminTransactionRow[] {
    if (!this.txStatusFilter) return this.transactions;
    return this.transactions.filter(
      (t) => (t.status || '').toLowerCase() === this.txStatusFilter.toLowerCase()
    );
  }

  get revenueBarMax(): number {
    const amounts = this.paymentStats.dailyRevenue.map((d) => d.amount);
    return Math.max(1, ...amounts, 0);
  }

  get paymentStatusSlices(): StatusSlice[] {
    const mapColor: Record<string, string> = {
      success: '#22c55e',
      pending: '#0f766e',
      failed: '#ef4444',
      cancelled: '#86efac'
    };
    const mapLabel: Record<string, string> = {
      success: 'Đã thanh toán',
      pending: 'Chờ thanh toán',
      failed: 'Thất bại',
      cancelled: 'Hủy'
    };
    return this.paymentStats.byStatus.map((s) => {
      const key = (s.status || '').toLowerCase();
      return {
        key,
        label: mapLabel[key] || s.status,
        count: s.count,
        color: mapColor[key] || '#94a3b8'
      };
    });
  }

  get paymentStatusTotal(): number {
    return this.paymentStats.totalTransactions || 1;
  }

  get paymentDonutStyle(): string {
    const slices = this.paymentStatusSlices.filter((s) => s.count > 0);
    if (!slices.length) return 'conic-gradient(#e5e7eb 0deg 360deg)';
    const total = slices.reduce((sum, s) => sum + s.count, 0) || 1;
    let acc = 0;
    const parts: string[] = [];
    for (const s of slices) {
      const deg = (s.count / total) * 360;
      const start = acc;
      acc += deg;
      parts.push(`${s.color} ${start}deg ${acc}deg`);
    }
    return `conic-gradient(${parts.join(', ')})`;
  }

  setTab(tab: AdminTab): void {
    this.activeTab = tab;
    this.sidebarOpen = false;
    if (tab === 'user-reports' || tab === 'room-reports') {
      this.loadReports();
    }
    if (tab === 'transactions') {
      this.loadPayments();
    }
    this.cdr.detectChanges();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  logout(): void {
    this.auth.logout();
  }

  navBadge(tab: AdminTab): number | null {
    if (tab === 'pending') return this.pendingPosts.length || null;
    if (tab === 'user-reports') return this.userReports.filter((r) => this.isReportPending(r)).length || null;
    if (tab === 'room-reports') return this.roomReports.filter((r) => this.isReportPending(r)).length || null;
    return null;
  }

  /** Báo cáo trực tiếp hồ sơ user (không kèm tin phòng). */
  get userReports(): ReportRow[] {
    return this.allReports.filter((r) => !r.reportedRoomId);
  }

  /** Báo cáo tin phòng (có ReportedRoomId — kể cả khi BE đã điền ReportedUserId chủ trọ). */
  get roomReports(): ReportRow[] {
    return this.allReports.filter((r) => !!r.reportedRoomId);
  }

  get isRoomReportsTab(): boolean {
    return this.activeTab === 'room-reports';
  }

  get activeReports(): ReportRow[] {
    return this.activeTab === 'room-reports' ? this.roomReports : this.userReports;
  }

  get pendingReportsCount(): number {
    return this.allReports.filter((r) => (r.status || '').toLowerCase() === 'pending').length;
  }

  get userGrowthBuckets(): MonthBucket[] {
    return countByMonth(this.users.map((u) => u.createdAt));
  }

  get postGrowthBuckets(): MonthBucket[] {
    return countByMonth(this.roomPosts.map((p) => p.createdAt));
  }

  get reportGrowthBuckets(): MonthBucket[] {
    return countByMonth(this.allReports.map((r) => r.createdAt));
  }

  get userGrowthMax(): number {
    return maxBucketCount(this.userGrowthBuckets);
  }

  get postGrowthMax(): number {
    return maxBucketCount(this.postGrowthBuckets);
  }

  get reportGrowthMax(): number {
    return maxBucketCount(this.reportGrowthBuckets);
  }

  get userTrend(): number | null {
    return growthTrendPercent(this.users.map((u) => u.createdAt));
  }

  get postTrend(): number | null {
    return growthTrendPercent(this.roomPosts.map((p) => p.createdAt));
  }

  get roomStatusSlices(): StatusSlice[] {
    const counts: Record<string, number> = {};
    for (const p of this.roomPosts) {
      const k = (p.status || 'unknown').toLowerCase();
      counts[k] = (counts[k] || 0) + 1;
    }
    return [
      { key: 'active', label: 'Đang hiển thị', count: counts['active'] || 0, color: '#22c55e' },
      {
        key: 'pending',
        label: 'Chờ duyệt / thanh toán',
        count: (counts['pendingapproval'] || 0) + (counts['pendingpayment'] || 0),
        color: '#f97316'
      },
      { key: 'hidden', label: 'Đã ẩn', count: counts['hidden'] || 0, color: '#9ca3af' }
    ];
  }

  get roomStatusTotal(): number {
    return this.roomPosts.length || 1;
  }

  get donutStyle(): string {
    const slices = this.roomStatusSlices.filter((s) => s.count > 0);
    if (!slices.length) return 'conic-gradient(#e5e7eb 0deg 360deg)';
    const total = slices.reduce((sum, s) => sum + s.count, 0) || 1;
    let acc = 0;
    const parts: string[] = [];
    for (const s of slices) {
      const deg = (s.count / total) * 360;
      const start = acc;
      acc += deg;
      parts.push(`${s.color} ${start}deg ${acc}deg`);
    }
    return `conic-gradient(${parts.join(', ')})`;
  }

  trendLabel(trend: number | null): string {
    return formatTrend(trend);
  }

  trendClass(trend: number | null): string {
    if (trend === null) return 'text-gray-400';
    if (trend > 0) return 'text-emerald-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-500';
  }

  barHeight(count: number, max: number): number {
    if (max <= 0) return 0;
    return Math.max(6, Math.round((count / max) * 100));
  }

  revenueBarHeight(amount: number): number {
    return this.barHeight(amount, this.revenueBarMax);
  }

  statusBarWidth(count: number): number {
    return Math.round((count / this.roomStatusTotal) * 100);
  }

  paymentStatusBarWidth(count: number): number {
    return Math.round((count / this.paymentStatusTotal) * 100);
  }

  loadPayments(): void {
    this.paymentsLoading = true;
    this.paymentsError = '';
    forkJoin({
      stats: this.admin.getPaymentStats().pipe(catchError(() => of(null))),
      txs: this.admin.getTransactions({ limit: 300 }).pipe(catchError(() => of<AdminTransactionRow[]>([])))
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ stats, txs }) => {
          if (stats) this.paymentStats = stats;
          else this.paymentsError = 'Không tải được thống kê doanh thu.';
          this.transactions = txs;
          this.paymentsLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.paymentsLoading = false;
          this.paymentsError = adminApiErrorMessage(err, 'Không tải được giao dịch.');
          this.cdr.detectChanges();
        }
      });
  }

  loadReports(): void {
    if (this.reportsLoading) return;
    this.reportsLoading = true;
    this.reportsError = '';
    const users$ =
      this.users.length > 0 ? of(this.users) : this.admin.getUsers(500).pipe(catchError(() => of<AdminUserRow[]>([])));
    const posts$ =
      this.roomPosts.length > 0
        ? of(this.roomPosts)
        : this.admin.getRoomPosts().pipe(catchError(() => of<AdminRoomPostRow[]>([])));

    forkJoin({
      reports: this.reportsApi.getReports().pipe(catchError(() => of<ReportRow[]>([]))),
      users: users$,
      posts: posts$
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ reports, users, posts }) => {
          if (users.length) this.users = users;
          if (posts.length) this.roomPosts = posts;
          this.allReports = reports;
          this.reportsLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.reportsLoading = false;
          this.reportsError = reportApiErrorMessage(err, 'Không tải được danh sách báo cáo.');
          this.cdr.detectChanges();
        }
      });
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';
    forkJoin({
      stats: this.admin.getDashboard(),
      users: this.admin.getUsers(100),
      posts: this.admin.getRoomPosts(),
      reports: this.reportsApi.getReports().pipe(catchError(() => of<ReportRow[]>([]))),
      paymentStats: this.admin.getPaymentStats().pipe(catchError(() => of(null))),
      transactions: this.admin.getTransactions({ limit: 300 }).pipe(catchError(() => of<AdminTransactionRow[]>([])))
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ stats, users, posts, reports, paymentStats, transactions }) => {
          this.stats = stats;
          this.users = users;
          this.roomPosts = posts;
          this.allReports = reports;
          if (paymentStats) this.paymentStats = paymentStats;
          this.transactions = transactions;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = adminApiErrorMessage(err, 'Không tải được dữ liệu admin.');
          this.cdr.detectChanges();
        }
      });
  }

  buyerTypeLabel(type: string): string {
    const t = (type || '').toLowerCase();
    if (t === 'landlord') return 'Chủ trọ';
    if (t === 'tenant') return 'Người thuê';
    return type || '—';
  }

  paymentStatusLabel(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'success') return 'Thành công';
    if (s === 'pending') return 'Chờ thanh toán';
    if (s === 'failed') return 'Thất bại';
    if (s === 'cancelled') return 'Đã hủy';
    return status || '—';
  }

  paymentStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'success') return 'bg-emerald-100 text-emerald-800';
    if (s === 'pending') return 'bg-amber-100 text-amber-800';
    if (s === 'failed') return 'bg-red-100 text-red-800';
    if (s === 'cancelled') return 'bg-gray-200 text-gray-700';
    return 'bg-gray-100 text-gray-600';
  }

  async approvePost(post: AdminRoomPostRow): Promise<void> {
    if (!(await this.uiConfirm.confirm(`Duyệt tin "${post.title}"?`))) return;
    this.actionPostId = post.id;
    this.admin
      .approveRoomPost(post.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.actionPostId = null;
          this.toast.success(res.message || 'Đã duyệt tin.');
          this.loadData();
        },
        error: (err) => {
          this.actionPostId = null;
          this.cdr.detectChanges();
          this.toast.error(adminApiErrorMessage(err, 'Duyệt tin thất bại.'));
        }
      });
  }

  async rejectPost(post: AdminRoomPostRow): Promise<void> {
    if (!(await this.uiConfirm.confirm(`Từ chối / ẩn tin "${post.title}"?`))) return;
    this.actionPostId = post.id;
    this.admin
      .rejectRoomPost(post.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.actionPostId = null;
          this.toast.success(res.message || 'Đã từ chối tin.');
          this.loadData();
        },
        error: (err) => {
          this.actionPostId = null;
          this.cdr.detectChanges();
          this.toast.error(adminApiErrorMessage(err, 'Từ chối tin thất bại.'));
        }
      });
  }

  userAvatar(u: AdminUserRow): string {
    const raw = u.avatar || '';
    return raw ? resolveMediaUrl(raw) : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.displayName || u.userName);
  }

  roomThumb(post: AdminRoomPostRow): string {
    const img = post.images?.[0];
    return img ? resolveMediaUrl(img) : 'https://placehold.co/120x80/f3f4f6/9ca3af?text=Phòng';
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('vi-VN');
  }

  formatSiteTime(seconds?: number): string {
    const s = Math.max(0, Math.floor(seconds ?? 0));
    if (s < 60) return `${s} giây`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} phút`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    if (h < 24) return rm > 0 ? `${h} giờ ${rm} phút` : `${h} giờ`;
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return rh > 0 ? `${d} ngày ${rh} giờ` : `${d} ngày`;
  }

  formatDateTime(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('vi-VN');
  }

  statusLabel(status: string): string {
    const s = status?.toLowerCase();
    if (s === 'active') return 'Đang hiển thị';
    if (s === 'pendingapproval') return 'Chờ duyệt';
    if (s === 'pendingpayment') return 'Chờ thanh toán';
    if (s === 'hidden') return 'Đã ẩn';
    return status || '—';
  }

  statusClass(status: string): string {
    const s = status?.toLowerCase();
    if (s === 'active') return 'bg-green-100 text-green-800';
    if (s === 'pendingapproval' || s === 'pendingpayment') return 'bg-orange-100 text-orange-800';
    if (s === 'hidden') return 'bg-gray-200 text-gray-700';
    return 'bg-gray-100 text-gray-600';
  }

  roleLabel(roles: string[]): string {
    if (!roles.length) return '—';
    return roles.join(', ');
  }

  isPendingStatus(status: string): boolean {
    const s = status?.toLowerCase();
    return s === 'pendingapproval' || s === 'pendingpayment';
  }

  isActionLoading(id: string): boolean {
    return this.actionPostId === id;
  }

  reportStatusLabel(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'pending') return 'Chờ xử lý';
    if (s === 'approved') return 'Đã chấp nhận';
    if (s === 'rejected') return 'Báo cáo bị từ chối';
    if (s === 'reviewed') return 'Đang xem xét';
    if (s === 'resolved') return 'Đã xử lý';
    return status || '—';
  }

  reportStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'pending') return 'bg-orange-100 text-orange-800';
    if (s === 'approved') return 'bg-green-100 text-green-800';
    if (s === 'rejected') return 'bg-gray-200 text-gray-700';
    if (s === 'resolved') return 'bg-green-100 text-green-800';
    return 'bg-blue-100 text-blue-800';
  }

  isReportPending(r: ReportRow): boolean {
    return (r.status || '').toLowerCase() === 'pending';
  }

  isReportProcessing(id: string): boolean {
    return this.processingReportId === id;
  }

  openReportDetail(r: ReportRow): void {
    this.detailReport = r;
    this.cdr.detectChanges();
  }

  closeReportDetail(): void {
    this.detailReport = null;
    this.cdr.detectChanges();
  }

  async acceptReport(r: ReportRow): Promise<void> {
    if (!this.isReportPending(r)) return;
    const room = this.reportRoomLabel(r);
    const person = this.reportPersonLabel(r);
    const violatorId = this.reportViolatorUserId(r);
    const prior = violatorId ? this.countApprovedViolations(violatorId) : 0;

    let msg = `Chấp nhận báo cáo?\n\n`;
    if (room !== '—') msg += `Tin phòng: ${room}\n`;
    msg += `Người bị báo cáo: ${person}\n\n`;
    msg += `Tin phòng (nếu có) sẽ bị ẩn. Chủ trọ nhận email + thông báo không tái phạm.\n`;
    if (prior >= 1) {
      msg += `\n⚠ Đã có ${prior} báo cáo được chấp nhận trước đó. Lần này tài khoản sẽ bị KHÓA VĨNH VIỄN (không đăng nhập được — theo Auth/login).`;
    } else if (violatorId) {
      msg += `\nLần chấp nhận đầu: cảnh báo. Nếu bị chấp nhận lần 2 → khóa vĩnh viễn.`;
    }
    if (!(await this.uiConfirm.confirm(msg))) return;
    this.processReport(r, true);
  }

  async rejectReport(r: ReportRow): Promise<void> {
    if (!this.isReportPending(r)) return;
    if (
      !(await this.uiConfirm.confirm(
        'Từ chối báo cáo này?\n\nKhông ẩn tin, không gửi cảnh báo cho chủ trọ / người bị báo cáo.'
      ))
    ) {
      return;
    }
    this.processReport(r, false);
  }

  private processReport(r: ReportRow, isValid: boolean): void {
    this.processingReportId = r.id;
    this.admin
      .processReport(r.id, { isValid })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.processingReportId = null;
          this.detailReport = null;
          this.toast.success(res.message || (isValid ? 'Đã chấp nhận báo cáo.' : 'Đã từ chối báo cáo.'));
          this.loadReports();
          if (isValid) {
            this.loadData();
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.processingReportId = null;
          this.cdr.detectChanges();
          this.toast.error(adminApiErrorMessage(err, 'Xử lý báo cáo thất bại.'));
        }
      });
  }

  /** Họ + tên từ GET /api/Admin/users (không dùng username trên UI). */
  userFullName(user: AdminUserRow): string {
    const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return full || user.displayName?.trim() || user.userName || '—';
  }

  reportPersonLabel(r: ReportRow): string {
    const id = this.reportViolatorUserId(r);
    if (id) {
      const u = this.users.find((x) => x.id === id);
      if (u) return this.userFullName(u);
    }
    return '—';
  }

  /** Người báo cáo: map username API → họ tên từ danh sách admin users. */
  reporterLabel(r: ReportRow): string {
    const key = (r.reporterName || '').trim().toLowerCase();
    if (!key) return '—';
    const u = this.users.find(
      (x) =>
        (x.userName || '').trim().toLowerCase() === key ||
        (x.email || '').trim().toLowerCase() === key
    );
    return u ? this.userFullName(u) : r.reporterName;
  }

  truncateText(text: string, maxLen = 36): string {
    const t = (text || '').trim().replace(/\s+/g, ' ');
    if (!t) return '—';
    if (t.length <= maxLen) return t;
    return t.slice(0, maxLen).trimEnd() + '…';
  }

  reportRoomLabel(r: ReportRow): string {
    return r.reportedRoomName?.trim() || '—';
  }

  reportViolatorUserId(r: ReportRow): string | undefined {
    if (r.reportedUserId) return r.reportedUserId;
    if (r.reportedRoomId) {
      const post = this.roomPosts.find((p) => p.id === r.reportedRoomId);
      return post?.userId;
    }
    return undefined;
  }

  /** Số báo cáo đã chấp nhận (Approved) trước đó — khớp logic BE ProcessReport. */
  countApprovedViolations(userId: string): number {
    return this.allReports.filter((r) => {
      if ((r.status || '').toLowerCase() !== 'approved') return false;
      const target = this.reportViolatorUserId(r);
      return target === userId;
    }).length;
  }

  violationBadge(userId: string): { label: string; class: string } | null {
    const n = this.countApprovedViolations(userId);
    if (n >= 2) return { label: 'Đã khóa (≥2 báo cáo)', class: 'bg-red-100 text-red-800' };
    if (n === 1) return { label: 'Cảnh báo (1 lần)', class: 'bg-orange-100 text-orange-800' };
    return null;
  }

  willLockOnAccept(r: ReportRow): boolean {
    const id = this.reportViolatorUserId(r);
    return !!id && this.countApprovedViolations(id) >= 1;
  }

  reportImageUrl(url: string): string {
    return resolveMediaUrl(url);
  }

}
