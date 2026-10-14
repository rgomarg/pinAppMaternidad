import { WHO_LMS } from './who-lms.data';
import { PERCENTILE_Z, lmsAt, percentileFromZ, valueFromZ, zFromValue } from './lms';

describe('LMS OMS', () => {
  it('reproduce los percentiles publicados por la OMS (peso niños, 12 meses)', () => {
    // Tabla oficial wfa boys: 12 meses -> P3 = 7.8 kg, P50 = 9.6 kg, P97 = 11.8 kg
    const { L, M, S } = lmsAt(WHO_LMS.MALE.weight, 12)!;
    expect(valueFromZ(L, M, S, PERCENTILE_Z.p3)).toBeCloseTo(7.8, 1);
    expect(valueFromZ(L, M, S, PERCENTILE_Z.p50)).toBeCloseTo(9.6, 1);
    expect(valueFromZ(L, M, S, PERCENTILE_Z.p97)).toBeCloseTo(11.8, 1);
  });

  it('reproduce la talla mediana de niñas a los 5 años', () => {
    const { L, M, S } = lmsAt(WHO_LMS.FEMALE.height, 60)!;
    expect(valueFromZ(L, M, S, 0)).toBeCloseTo(109.4, 1);
  });

  it('zFromValue es la inversa de valueFromZ', () => {
    const { L, M, S } = lmsAt(WHO_LMS.FEMALE.weight, 30.5)!;
    for (const z of [-2.5, -1, 0, 1.2, 2.8]) {
      expect(zFromValue(L, M, S, valueFromZ(L, M, S, z))).toBeCloseTo(z, 6);
    }
  });

  it('interpola entre meses y devuelve null fuera de la tabla', () => {
    const a = lmsAt(WHO_LMS.MALE.height, 10)!;
    const b = lmsAt(WHO_LMS.MALE.height, 11)!;
    expect(lmsAt(WHO_LMS.MALE.height, 10.5)!.M).toBeCloseTo((a.M + b.M) / 2, 6);
    expect(lmsAt(WHO_LMS.MALE.weight, 121)).toBeNull();
    expect(lmsAt(WHO_LMS.MALE.weight, -1)).toBeNull();
  });

  it('convierte z-score a percentil', () => {
    expect(percentileFromZ(0)).toBeCloseTo(50, 4);
    expect(percentileFromZ(PERCENTILE_Z.p3)).toBeCloseTo(3, 2);
    expect(percentileFromZ(PERCENTILE_Z.p97)).toBeCloseTo(97, 2);
  });
});
