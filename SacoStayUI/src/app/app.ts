import { Component, OnInit, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { ChatUnreadService } from './services/chat-unread.service';
import { NotificationCenterService } from './services/notification-center.service';
import { UiToastComponent } from './components/shared/ui-toast/ui-toast.component';
import { UiConfirmDialogComponent } from './components/shared/ui-confirm-dialog/ui-confirm-dialog.component';
import { ApkDownloadBannerComponent } from './components/shared/apk-download-banner/apk-download-banner.component';
import { routeFadeAnimation } from './animations/route.animations';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UiToastComponent, UiConfirmDialogComponent, ApkDownloadBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  animations: [routeFadeAnimation]
})
export class App implements OnInit {
  private readonly chatUnread = inject(ChatUnreadService);
  private readonly notifications = inject(NotificationCenterService);
  private readonly title = inject(Title);

  ngOnInit(): void {
    this.title.setTitle('SacoStay — Tìm bạn ở ghép hợp gu');
    this.chatUnread.bindOwnerFromSession();
    this.notifications.bindFromSession();
  }

  routeState(outlet: RouterOutlet): string {
    if (!outlet.isActivated) return 'root';
    return outlet.activatedRoute.snapshot.url.map((s) => s.path).join('/') || 'root';
  }
}
