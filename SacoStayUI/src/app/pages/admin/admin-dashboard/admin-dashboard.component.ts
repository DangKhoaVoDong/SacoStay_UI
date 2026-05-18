import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { NavbarComponent } from '../../../components/layout/navbar.component';
import { AdminService } from '../../../services/admin.service';
import { getApiErrorMessage } from '../../../services/auth.service';
import type { AdminDashboardStats, AdminRoomPostRow, AdminUserRow } from '../../../models/admin.models';
import { resolveMediaUrl } from '../../../utils/media-url';

type AdminTab = 'overview' | 'pending' | 'users' | 'user-reports' | 'room-reports';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './admin-dashboard.component.html'
})
export class AdminDashboardComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  activeTab: AdminTab = 'overview';
  loading = true;
  errorMessage = '';
  actionPostId: string | null = null;

  stats: AdminDashboardStats = {
    totalUsers: 0,
    totalRoomPosts: 0,
    pendingRoomPosts: 0,
    activeRoomPosts: 0,
    hiddenRoomPosts: 0
  };

  users: AdminUserRow[] = [];
  roomPosts: AdminRoomPostRow[] = [];

  ngOnInit(): void {
    this.loadData();
  }

  get pendingPosts(): AdminRoomPostRow[] {
    return this.roomPosts.filter((p) => this.isPendingStatus(p.status));
  }

  setTab(tab: AdminTab): void {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';
    forkJoin({
      stats: this.admin.getDashboard(),
      users: this.admin.getUsers(100),
      posts: this.admin.getRoomPosts()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ stats, users, posts }) => {
          this.stats = stats;
          this.users = users;
          this.roomPosts = posts;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          const msg = getApiErrorMessage(err) || '';
          this.errorMessage =
            msg.includes('404')
              ? 'API Admin chưa có trên server (404). Hãy rebuild & restart SacoStayAPI (có file AdminController.cs), rồi đăng nhập lại bằng tài khoản admin.'
              : msg || 'Không tải được dữ liệu admin. Đăng nhập bằng tài khoản role admin.';
          this.cdr.detectChanges();
        }
      });
  }

  approvePost(post: AdminRoomPostRow): void {
    if (!confirm(`Duyệt tin "${post.title}"?`)) return;
    this.actionPostId = post.id;
    this.admin
      .approveRoomPost(post.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.actionPostId = null;
          post.status = res.status || 'Active';
          this.refreshStats();
          this.cdr.detectChanges();
          alert(res.message || 'Đã duyệt tin.');
        },
        error: (err) => {
          this.actionPostId = null;
          this.cdr.detectChanges();
          alert(getApiErrorMessage(err) || 'Duyệt tin thất bại.');
        }
      });
  }

  rejectPost(post: AdminRoomPostRow): void {
    if (!confirm(`Từ chối / ẩn tin "${post.title}"?`)) return;
    this.actionPostId = post.id;
    this.admin
      .rejectRoomPost(post.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.actionPostId = null;
          post.status = res.status || 'Hidden';
          this.refreshStats();
          this.cdr.detectChanges();
          alert(res.message || 'Đã từ chối tin.');
        },
        error: (err) => {
          this.actionPostId = null;
          this.cdr.detectChanges();
          alert(getApiErrorMessage(err) || 'Từ chối tin thất bại.');
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

  private refreshStats(): void {
    this.stats = {
      ...this.stats,
      pendingRoomPosts: this.pendingPosts.length,
      activeRoomPosts: this.roomPosts.filter((p) => p.status?.toLowerCase() === 'active').length,
      hiddenRoomPosts: this.roomPosts.filter((p) => p.status?.toLowerCase() === 'hidden').length
    };
  }
}
