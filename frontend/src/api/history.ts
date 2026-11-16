import { API_URL } from './config';

// Tipos de la respuesta de GET /child/:id/historial (ver backend/src/child/child-historial.service.ts)

export type HistoryKind = 'DISEASE' | 'MEDICINE' | 'APPOINTMENT' | 'VACCINE' | 'SYMPTOM';

export interface HistoryItem {
  id: string;            // con prefijo de tabla, p. ej. "medicine-5"
  kind: HistoryKind;
  title: string;
  subtitle?: string;
  date: string;          // ISO
  endDate?: string;
  status?: 'ACTIVE' | 'FINISHED' | 'PENDING' | 'APPLIED';
  refId: number;
}

export interface HistoryPage {
  items: HistoryItem[];
  nextCursor: string | null;
}

export interface HistoryFilters {
  kinds?: HistoryKind[];
  from?: Date | null;    // se envía desde el inicio de ese día
  to?: Date | null;      // se envía hasta el final de ese día
  cursor?: string | null;
  limit?: number;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

// `proId`: id del usuario que consulta; el backend (ProGuard) comprueba que sea PRO o ADMIN.
export async function fetchHistory(
  childId: number,
  proId: number,
  filters: HistoryFilters = {},
): Promise<HistoryPage> {
  const params = new URLSearchParams({ proId: String(proId) });
  if (filters.kinds && filters.kinds.length > 0) params.set('kinds', filters.kinds.join(','));
  if (filters.from) params.set('from', startOfDay(filters.from).toISOString());
  if (filters.to) params.set('to', endOfDay(filters.to).toISOString());
  if (filters.cursor) params.set('cursor', filters.cursor);
  if (filters.limit) params.set('limit', String(filters.limit));

  const query = params.toString();
  const response = await fetch(`${API_URL}/child/${childId}/historial${query ? `?${query}` : ''}`);
  if (!response.ok) throw new Error(`Error ${response.status} al cargar el historial médico`);
  return response.json();
}
