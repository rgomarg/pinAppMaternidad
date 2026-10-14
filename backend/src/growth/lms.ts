import { LmsRow } from './who-lms.data';

// Método LMS de la OMS: con los parámetros L (asimetría), M (mediana) y S (dispersión)
// de cada edad se pasa de una medida a su z-score y viceversa.
// Referencia: WHO Child Growth Standards, Methods and development (2006), cap. 7.

export const DAYS_PER_MONTH = 30.4375;

// z-scores de las curvas que se dibujan (P3, P15, P50, P85, P97)
export const PERCENTILE_Z = {
  p3: -1.880794,
  p15: -1.036433,
  p50: 0,
  p85: 1.036433,
  p97: 1.880794,
};

// Interpola linealmente L, M y S para una edad en meses no entera.
// Devuelve null si la edad queda fuera de la tabla.
export function lmsAt(table: LmsRow[], ageMonths: number): { L: number; M: number; S: number } | null {
  const first = table[0][0];
  const last = table[table.length - 1][0];
  if (ageMonths < first || ageMonths > last) return null;

  const i = Math.min(Math.floor(ageMonths) - first, table.length - 2);
  const [m0, L0, M0, S0] = table[i];
  const [, L1, M1, S1] = table[i + 1];
  const t = ageMonths - m0;
  return {
    L: L0 + (L1 - L0) * t,
    M: M0 + (M1 - M0) * t,
    S: S0 + (S1 - S0) * t,
  };
}

// Medida que corresponde a un z-score
export function valueFromZ(L: number, M: number, S: number, z: number): number {
  if (L === 0) return M * Math.exp(S * z);
  return M * Math.pow(1 + L * S * z, 1 / L);
}

// z-score de una medida. Por encima de |z| = 3 se aplica el ajuste "restringido"
// que recomienda la OMS para que la cola de la distribución no se dispare.
export function zFromValue(L: number, M: number, S: number, value: number): number {
  const z = L === 0 ? Math.log(value / M) / S : (Math.pow(value / M, L) - 1) / (L * S);

  if (z > 3) {
    const sd3 = valueFromZ(L, M, S, 3);
    const sd23 = sd3 - valueFromZ(L, M, S, 2);
    return 3 + (value - sd3) / sd23;
  }
  if (z < -3) {
    const sd3 = valueFromZ(L, M, S, -3);
    const sd23 = valueFromZ(L, M, S, -2) - sd3;
    return -3 + (value - sd3) / sd23;
  }
  return z;
}

// Percentil (0-100) a partir del z-score: función de distribución normal estándar.
// Aproximación de Abramowitz y Stegun 7.1.26 (error < 1.5e-7).
export function percentileFromZ(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) *
      Math.exp(-x * x);
  const cdf = z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
  return cdf * 100;
}
