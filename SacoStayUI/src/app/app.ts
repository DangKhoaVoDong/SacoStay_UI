import { Component, OnInit, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { ActivityService } from './services/activity.service';
import { ChatUnreadService } from './services/chat-unread.service';
import { NotificationCenterService } from './services/notification-center.service';
import { UiToastComponent } from './components/shared/ui-toast/ui-toast.component';
import { UiConfirmDialogComponent } from './components/shared/ui-confirm-dialog/ui-confirm-dialog.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UiToastComponent, UiConfirmDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly activity = inject(ActivityService);
  private readonly chatUnread = inject(ChatUnreadService);
  private readonly notifications = inject(NotificationCenterService);
  private readonly title = inject(Title);

  ngOnInit(): void {
    this.title.setTitle('SacoStay — Tìm bạn ở ghép hợp gu');
    this.activity.start();
    this.chatUnread.bindOwnerFromSession();
    this.notifications.bindFromSession();
  }
}
