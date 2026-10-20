import { BadRequestException } from '@nestjs/common';

export type DateRange = {
  start: Date;
  end: Date;
};

const parseDate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (parsed.toISOString().slice(0, 10) !== value) return null;
  return parsed;
};

/** `to` is exclusive; when only `date` is supplied, returns that UTC day. */
export const getDateRange = (
  date?: string,
  from?: string,
  to?: string,
): DateRange => {
  if (from || to) {
    const start = from ? parseDate(from) : null;
    const end = to ? parseDate(to) : null;

    if (!start || !end || end <= start) {
      throw new BadRequestException('El rango debe usar fechas YYYY-MM-DD y una fecha final posterior a la inicial');
    }

    return { start, end };
  }

  const start = date ? parseDate(date) : null;
  if (!start) {
    throw new BadRequestException('La fecha debe tener el formato YYYY-MM-DD');
  }

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};
