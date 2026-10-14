import { API_URL } from './config';

// Tipos de la respuesta de GET /growth/:childId (ver backend/src/growth)

export type Sex = 'MALE' | 'FEMALE';
export type Metric = 'weight' | 'height';

export interface GrowthPoint {
  id: number;
  date: string;
  ageMonths: number;
  value: number;
  z: number | null;
  percentile: number | null;
}

export interface PercentileCurve {
  month: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
}

export interface ProjectionPoint {
  date: string;
  ageMonths: number;
  value: number;
}

export interface GrowthInsight {
  level: 'ok' | 'warning' | 'alert';
  title: string;
  message: string;
}

export interface GrowthSeries {
  unit: string;
  points: GrowthPoint[];
  curves: PercentileCurve[];
  projection: ProjectionPoint[];
  insight: GrowthInsight | null;
}

export interface GrowthData {
  child: { id: number; name: string; sex: Sex | null; birthDate: string; ageMonths: number };
  weight: GrowthSeries | null;
  height: GrowthSeries | null;
}

export async function fetchGrowth(childId: number): Promise<GrowthData> {
  const response = await fetch(`${API_URL}/growth/${childId}`);
  if (!response.ok) throw new Error(`Error ${response.status} al cargar la curva de crecimiento`);
  return response.json();
}

export async function updateChildSex(childId: number, sex: Sex): Promise<GrowthData> {
  const response = await fetch(`${API_URL}/growth/${childId}/sex`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sex }),
  });
  if (!response.ok) throw new Error(`Error ${response.status} al guardar el sexo`);
  return response.json();
}
