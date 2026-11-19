import { API_URL } from './config';

export type ProfileUser = {
  id: number;
  email: string;
  name: string;
  surname: string | null;
  phone: string | null;
  avatarUrl: string | null;
  profileRole: 'MOTHER' | 'FATHER' | 'GUARDIAN';
  role: 'USER' | 'PRO' | 'ADMIN';
  notifyMedicine: boolean;
  notifyAppointments: boolean;
  notifyForum: boolean;
};

export type ProfileUpdate = Pick<
  ProfileUser,
  'name' | 'surname' | 'phone' | 'avatarUrl' | 'profileRole' | 'notifyMedicine' | 'notifyAppointments' | 'notifyForum'
>;

export async function getUser(id: number): Promise<ProfileUser> {
  const response = await fetch(`${API_URL}/user/${id}`);
  if (!response.ok) throw new Error('No se pudo cargar el perfil');
  return response.json();
}

export async function updateUser(
  id: number,
  data: ProfileUpdate,
): Promise<ProfileUser> {
  const response = await fetch(`${API_URL}/user/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(body?.message) ? body.message.join('\n') : body?.message;
    throw new Error(message ?? 'No se pudo guardar el perfil');
  }
  return body;
}
