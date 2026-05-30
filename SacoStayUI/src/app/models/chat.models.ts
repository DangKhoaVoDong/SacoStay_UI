/** Người tham gia cuộc trò chuyện (chuẩn hóa từ API). */
export interface ChatParticipant {
  id: string;
  displayName: string;
  avatarUrl?: string;
  roles?: string[];
}

/** Tin nhắn trong hội thoại. */
export interface ChatMessage {
  id?: string;
  senderId: string;
  text: string;
  sentAt?: string;
  isMine: boolean;
}

/** Hội thoại / thread (danh sách bên trái). */
export interface ChatConversation {
  id: string;
  otherUser: ChatParticipant;
  lastMessageText: string;
  lastMessageAt?: string;
  unreadCount: number;
}

/** Body gửi tin — khớp các biến thể backend thường dùng. */
export interface SendChatMessageRequest {
  otherUserId: string;
  content: string;
}

/** Hội thoại từ GET /api/Chat/conversations */
export interface ChatConversationSummary {
  otherUserId: string;
  lastMessageText: string;
  lastMessageAt?: string;
}
