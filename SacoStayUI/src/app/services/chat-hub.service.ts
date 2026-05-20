import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ChatHubService {
  private readonly auth = inject(AuthService);
  private connection: signalR.HubConnection | null = null;
  private startPromise: Promise<signalR.HubConnection> | null = null;

  async sendPrivateMessage(receiverId: string, message: string): Promise<void> {
    const conn = await this.getConnection();
    await conn.invoke('SendPrivateMessage', receiverId, message);
  }

  private getConnection(): Promise<signalR.HubConnection> {
    const token = this.auth.token;
    if (!token) {
      return Promise.reject(new Error('Chưa đăng nhập'));
    }

    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return Promise.resolve(this.connection);
    }

    if (this.startPromise) {
      return this.startPromise;
    }

    const hubUrl = `${environment.chatHubUrl}?access_token=${encodeURIComponent(token)}`;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => this.auth.token || '',
        withCredentials: true
      })
      .withAutomaticReconnect()
      .build();

    this.startPromise = this.connection.start().then(() => {
      if (!this.connection) {
        throw new Error('Không kết nối được chat hub');
      }
      return this.connection;
    });

    return this.startPromise;
  }
}
