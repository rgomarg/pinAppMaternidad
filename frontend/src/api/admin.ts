import { request, type Role, type Tag } from './forum';

// Tipos de las respuestas de /admin (ver backend/src/admin)

export type UserStatus = 'ACTIVE' | 'BLOCKED';
export type ThreadStatus = 'VISIBLE' | 'DELETED' | 'AUTHOR_BLOCKED' | 'HIDDEN';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  createdAt: string;
  blockedAt: string | null;
  status: UserStatus;
  threadCount: number;
  messageCount: number;
}

export interface AdminThread {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  isHidden: boolean;
  deletedAt: string | null;
  owner: { id: number; name: string; email: string; role: Role; blockedAt: string | null };
  tags: Tag[];
  status: ThreadStatus;
  messageCount: number;
}

type Params = Record<string, string | number | null | undefined>;

// Todas las rutas de /admin exigen ?adminId= (sustituto temporal de la auth)
function adminQuery(adminId: number, params: Params = {}) {
  return (
    '?' +
    Object.entries<string | number | null | undefined>({ adminId, ...params })
      .filter(([, value]) => value != null && value !== '')
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&')
  );
}

export const adminApi = {
  getUsers: (adminId: number, params: { search?: string; status?: UserStatus | null } = {}) =>
    request<AdminUser[]>(`/admin/users${adminQuery(adminId, params)}`),

  blockUser: (adminId: number, userId: number) =>
    request<AdminUser>(`/admin/users/${userId}/block${adminQuery(adminId)}`, { method: 'PATCH' }),

  unblockUser: (adminId: number, userId: number) =>
    request<AdminUser>(`/admin/users/${userId}/unblock${adminQuery(adminId)}`, { method: 'PATCH' }),

  getThreads: (adminId: number, params: { search?: string; status?: ThreadStatus | null } = {}) =>
    request<AdminThread[]>(`/admin/threads${adminQuery(adminId, params)}`),

  deleteThread: (adminId: number, threadId: number) =>
    request<AdminThread>(`/admin/threads/${threadId}/delete${adminQuery(adminId)}`, { method: 'PATCH' }),

  restoreThread: (adminId: number, threadId: number) =>
    request<AdminThread>(`/admin/threads/${threadId}/restore${adminQuery(adminId)}`, { method: 'PATCH' }),
};
