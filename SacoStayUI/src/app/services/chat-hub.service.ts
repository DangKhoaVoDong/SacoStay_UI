import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { APP_CONSTANTS } from '../utils/constants';
import type { AppNotification } from '../models/notification.models';

export type ChatIncomingHandler = (senderId: string, message: string) => void;
export type NotificationIncomingHandler = (notification: AppNotification) => void;

function normalizeHubNotification(raw: unknown): AppNotification | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = String(o['id'] ?? o['Id'] ?? '').trim();
  if (!id) return null;
  return {
    id,
    title: String(o['title'] ?? o['Title'] ?? 'Thông báo').trim(),
    message: String(o['message'] ?? o['Message'] ?? '').trim(),
    type: String(o['type'] ?? o['Type'] ?? 'general').trim(),
    linkUrl: String(o['linkUrl'] ?? o['LinkUrl'] ?? '').trim() || undefined,
    isRead: !!(o['isRead'] ?? o['IsRead']),
    createdAt: String(o['createdAt'] ?? o['CreatedAt'] ?? new Date().toISOString())
  };
}

function resolveChatHubUrl(): string {
  const api = environment.apiUrl.replace(/\/+$/, '');
  const base = api.replace(/\/api$/i, '');
  return environment.chatHubUrl?.trim() || `${base}/chatHub`;
}

function readAuthToken(): string | null {
  return localStorage.getItem(APP_CONSTANTS.TOKEN_KEY);
}

@Injectable({ providedIn: 'root' })
export class ChatHubService {
  private connection: signalR.HubConnection | null = null;
  private startPromise: Promise<signalR.HubConnection> | null = null;
  private readonly incomingHandlers = new Set<ChatIncomingHandler>();
  private readonly notificationHandlers = new Set<NotificationIncomingHandler>();

  onIncomingMessage(handler: ChatIncomingHandler): () => void {
    this.incomingHandlers.add(handler);
    return () => this.incomingHandlers.delete(handler);
  }

  onReceiveNotification(handler: NotificationIncomingHandler): () => void {
    this.notificationHandlers.add(handler);
    return () => this.notificationHandlers.delete(handler);
  }

  async ensureConnected(): Promise<signalR.HubConnection> {
    return this.getConnection();
  }

  async sendPrivateMessage(receiverId: string, message: string): Promise<void> {
    const conn = await this.getConnection();
    await conn.invoke('SendPrivateMessage', receiverId, message);
  }

  disconnect(): void {
    if (this.connection) {
      void this.connection.stop();
    }
    this.connection = null;
    this.startPromise = null;
  }

  /** Đăng nhập lại / đổi token — kết nối mới với Bearer hiện tại. */
  async reconnect(): Promise<signalR.HubConnection> {
    this.disconnect();
    return this.ensureConnected();
  }

  private getConnection(): Promise<signalR.HubConnection> {
    const token = readAuthToken();
    if (!token) {
      return Promise.reject(new Error('Chưa đăng nhập'));
    }

    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return Promise.resolve(this.connection);
    }

    if (this.startPromise) {
      return this.startPromise;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(resolveChatHubUrl(), {
        accessTokenFactory: () => readAuthToken() || '',
        transport:
          signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
        withCredentials: true
      })
      .withAutomaticReconnect()
      .build();

    this.connection.on('ReceiveMessage', (senderId: string, message: string) => {
      const sid = String(senderId ?? '').trim();
      const text = String(message ?? '').trim();
      if (!sid || !text) return;
      for (const handler of this.incomingHandlers) {
        handler(sid, text);
      }
    });

    this.connection.on('ReceiveNotification', (payload: unknown) => {
      const n = normalizeHubNotification(payload);
      if (!n) return;
      for (const handler of this.notificationHandlers) {
        handler(n);
      }
    });

    this.startPromise = this.connection
      .start()
      .then(() => {
        if (!this.connection) {
          throw new Error('Không kết nối được chat hub');
        }
        return this.connection;
      })
      .catch((err: unknown) => {
        this.resetConnection();
        throw this.mapHubError(err);
      });

    return this.startPromise;
  }

  private resetConnection(): void {
    this.connection = null;
    this.startPromise = null;
  }

  private mapHubError(err: unknown): Error {
    const raw = err instanceof Error ? err.message : String(err ?? '');
    if (/401|Unauthorized/i.test(raw)) {
      return new Error('Phiên đăng nhập hết hạn hoặc token không hợp lệ. Vui lòng đăng nhập lại.');
    }
    return err instanceof Error ? err : new Error(raw || 'Không kết nối được chat hub');
  }
}
