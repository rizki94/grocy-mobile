import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../hooks/use-connection';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Participant {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  isAdmin: boolean;
  joinedAt: string;
  lastReadAt: string | null;
}

export interface LastMessage {
  id: string;
  content: string | null;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'event_share';
  senderId: string;
  createdAt: string;
  isDeleted: boolean;
  mediaUrl: string | null;
}

export interface Conversation {
  id: string;
  type: 'private' | 'group';
  name: string | null;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
  participants: Participant[];
  lastMessage: LastMessage | null;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName?: string | null;
  senderAvatar?: string | null;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'event_share';
  content: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  mediaSize: number | null;
  mediaName: string | null;
  eventType: string | null;
  eventId: string | null;
  replyToId: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── API helpers ─────────────────────────────────────────────────────────────

/** Get the base URL from storage — needed to build full media URLs */
export const getBaseUrl = async (): Promise<string> => {
  const url = await AsyncStorage.getItem('@url');
  return url ?? '';
};

/** Build a full URL for a server-relative media path */
export const buildMediaUrl = (baseUrl: string, path: string): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${baseUrl}${path}`;
};

// ─── Chat API calls ───────────────────────────────────────────────────────────

export const getConversations = async (): Promise<Conversation[]> => {
  const res = await apiClient.get('api/chat/conversations');
  return res.data;
};

export const getMessages = async (
  conversationId: string,
  limit = 50,
  offset = 0,
): Promise<Message[]> => {
  const res = await apiClient.get(
    `api/chat/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`,
  );
  return res.data;
};

export interface SendMessagePayload {
  content?: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  mediaType?: string;
  mediaSize?: number;
  mediaName?: string;
  replyToId?: string;
}

export const sendMessage = async (
  conversationId: string,
  payload: SendMessagePayload,
): Promise<Message> => {
  const res = await apiClient.post(
    `api/chat/conversations/${conversationId}/messages`,
    payload,
  );
  return res.data;
};

export const markConversationRead = async (
  conversationId: string,
): Promise<void> => {
  await apiClient.post(`api/chat/conversations/${conversationId}/read`);
};

export const deleteMessage = async (
  conversationId: string,
  messageId: string,
): Promise<void> => {
  await apiClient.delete(
    `api/chat/conversations/${conversationId}/messages/${messageId}`,
  );
};

export const editMessage = async (
  conversationId: string,
  messageId: string,
  content: string,
): Promise<Message> => {
  const res = await apiClient.put(
    `api/chat/conversations/${conversationId}/messages/${messageId}`,
    { content },
  );
  return res.data;
};
