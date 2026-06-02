import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ActivityService } from './services/activity.service';
import { ChatUnreadService } from './services/chat-unread.service';
import { NotificationCenterService } from './services/notification-center.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly activity = inject(ActivityService);
  private readonly chatUnread = inject(ChatUnreadService);
  private readonly notifications = inject(NotificationCenterService);

  ngOnInit(): void {
    this.activity.start();
    this.chatUnread.bindOwnerFromSession();
    this.notifications.bindFromSession();
  }
}
