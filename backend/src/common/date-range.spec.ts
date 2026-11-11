import { BadRequestException } from '@nestjs/common';
import { getDateRange } from './date-range';

// RF-02: rango de fechas usado por el calendario diario y mensual.
describe('getDateRange', () => {
  describe('día concreto (calendario diario)', () => {
    it('devuelve el día completo en UTC: [00:00, 00:00 del día siguiente)', () => {
      const { start, end } = getDateRange('2027-03-15');
      expect(start.toISOString()).toBe('2027-03-15T00:00:00.000Z');
      expect(end.toISOString()).toBe('2027-03-16T00:00:00.000Z');
    });

    it('cruza correctamente el cambio de mes y de año', () => {
      expect(getDateRange('2027-01-31').end.toISOString()).toBe('2027-02-01T00:00:00.000Z');
      expect(getDateRange('2027-12-31').end.toISOString()).toBe('2028-01-01T00:00:00.000Z');
    });

    it('acepta el 29 de febrero en año bisiesto', () => {
      expect(getDateRange('2028-02-29').start.toISOString()).toBe('2028-02-29T00:00:00.000Z');
    });

    it.each([
      ['sin fecha', undefined],
      ['formato DD-MM-YYYY', '15-03-2027'],
      ['con hora', '2027-03-15T10:00:00Z'],
      ['texto libre', 'mañana'],
      ['mes 13', '2027-13-01'],
      ['30 de febrero', '2027-02-30'],
      ['29 de febrero en año no bisiesto', '2027-02-29'],
    ])('rechaza %s', (_caso, date) => {
      expect(() => getDateRange(date)).toThrow(BadRequestException);
    });
  });

  describe('rango from/to (calendario mensual)', () => {
    it('devuelve el rango con "to" exclusivo', () => {
      const { start, end } = getDateRange(undefined, '2027-03-01', '2027-04-01');
      expect(start.toISOString()).toBe('2027-03-01T00:00:00.000Z');
      expect(end.toISOString()).toBe('2027-04-01T00:00:00.000Z');
    });

    it('el rango tiene prioridad sobre "date" si se envían ambos', () => {
      const { start } = getDateRange('2020-01-01', '2027-03-01', '2027-04-01');
      expect(start.toISOString()).toBe('2027-03-01T00:00:00.000Z');
    });

    it.each([
      ['solo from', '2027-03-01', undefined],
      ['solo to', undefined, '2027-04-01'],
      ['rango invertido', '2027-04-01', '2027-03-01'],
      ['rango vacío (from = to)', '2027-03-01', '2027-03-01'],
      ['from con formato incorrecto', '01-03-2027', '2027-04-01'],
      ['to inexistente', '2027-03-01', '2027-02-30'],
    ])('rechaza %s', (_caso, from, to) => {
      expect(() => getDateRange(undefined, from, to)).toThrow(BadRequestException);
    });
  });
});
