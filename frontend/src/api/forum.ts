import { API_URL } from './config';

// Tipos de las respuestas de /thread, /message y /tag (ver backend/src/thread, message y tag)

export type Role = 'USER' | 'PRO' | 'ADMIN';

export interface Author {
  id: number;
  name: string;
  avatarUrl: string | null;
  role: Role;
}

export interface Tag {
  id: number;
  name: string;
}

export interface ThreadSummary {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  owner: Author;
  tags: Tag[];
  messageCount: number;
}

export interface ThreadPage {
  items: ThreadSummary[];
  page: number;
  limit: number;
  total: number;
}

export interface MessageNode {
  id: number;
  content: string;
  createdAt: string;
  likesCount: number;
  likedByMe: boolean;
  parentId: number | null;
  author: Author;
  replies: MessageNode[];
}

export interface ThreadDetail extends ThreadSummary {
  messages: MessageNode[];
}

export interface LikeState {
  likesCount: number;
  likedByMe: boolean;
}

// Lanza un Error con el mensaje del backend (NestJS devuelve { message } o { message: [] })
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join('\n') : body?.message;
    throw new Error(message ?? `Error del servidor: ${response.status}`);
  }

  // 204 No Content (DELETE)
  if (response.status === 204) return undefined as T;
  return response.json();
}

function query(params: Record<string, number | null | undefined>) {
  const entries = Object.entries(params).filter(([, value]) => value != null);
  return entries.length ? `?${entries.map(([key, value]) => `${key}=${value}`).join('&')}` : '';
}

export const forumApi = {
  getTags: () => request<Tag[]>('/tag'),

  getThreads: (params: { tagId?: number | null; page?: number; limit?: number } = {}) =>
    request<ThreadPage>(`/thread${query(params)}`),

  getThread: (id: number, userId?: number | null) => request<ThreadDetail>(`/thread/${id}${query({ userId })}`),

  createThread: (data: { title: string; content: string; ownerId: number; tagIds: number[] }) =>
    request<ThreadSummary>('/thread', { method: 'POST', body: JSON.stringify(data) }),

  deleteThread: (id: number, userId: number) =>
    request<void>(`/thread/${id}${query({ userId })}`, { method: 'DELETE' }),

  createMessage: (data: { content: string; authorId: number; threadId: number; parentId?: number }) =>
    request<MessageNode>('/message', { method: 'POST', body: JSON.stringify(data) }),

  deleteMessage: (id: number, userId: number) =>
    request<void>(`/message/${id}${query({ userId })}`, { method: 'DELETE' }),

  likeMessage: (id: number, userId: number) =>
    request<LikeState>(`/message/${id}/like`, { method: 'POST', body: JSON.stringify({ userId }) }),

  unlikeMessage: (id: number, userId: number) =>
    request<LikeState>(`/message/${id}/like${query({ userId })}`, { method: 'DELETE' }),
};
