import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export type ChatIncomingHandler = (senderId: string, message: string) => void;

function resolveChatHubUrl(): string {
  const api = environment.apiUrl.replace(/\/+$/, '');
  const base = api.replace(/\/api$/i, '');
  return environment.chatHubUrl?.trim() || `${base}/chatHub`;
}

@Injectable({ providedIn: 'root' })
export class ChatHubService {
  private readonly auth = inject(AuthService);
  private connection: signalR.HubConnection | null = null;
  private startPromise: Promise<signalR.HubConnection> | null = null;
  private readonly incomingHandlers = new Set<ChatIncomingHandler>();

  onIncomingMessage(handler: ChatIncomingHandler): () => void {
    this.incomingHandlers.add(handler);
    return () => this.incomingHandlers.delete(handler);
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

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(resolveChatHubUrl(), {
        accessTokenFactory: () => this.auth.token || '',
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
