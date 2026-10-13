import { Injectable, NotFoundException } from '@nestjs/common';
import { Measurement, Sex } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { LmsRow, WHO_LMS } from './who-lms.data';
import { DAYS_PER_MONTH, PERCENTILE_Z, lmsAt, percentileFromZ, valueFromZ, zFromValue } from './lms';
import { UpdateSexDto } from './dto/update-sex.dto';

type Metric = 'weight' | 'height';

const UNITS: Record<Metric, string> = { weight: 'kg', height: 'cm' };
const PROJECTION_MONTHS = 6;
// Margen de meses que se muestra antes de la primera medición
const CHART_MARGIN_MONTHS = 2;
// Variación de z-score equivalente a cruzar una línea de percentil principal
const CROSSING_Z = 0.67;

@Injectable()
export class GrowthService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(childId: number) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      include: { measurements: { orderBy: { date: 'asc' } } },
    });
    if (!child) throw new NotFoundException(`No existe el menor con id ${childId}`);

    const ageMonths = this.ageInMonths(child.birthDate, new Date());
    const base = {
      child: { id: child.id, name: child.name, sex: child.sex, birthDate: child.birthDate, ageMonths: round(ageMonths, 1) },
    };

    // Sin sexo no se puede elegir la tabla de la OMS: el front pedirá que se indique
    if (!child.sex) return { ...base, weight: null, height: null };

    return {
      ...base,
      weight: this.buildSeries('weight', child.sex, child.birthDate, child.measurements, ageMonths),
      height: this.buildSeries('height', child.sex, child.birthDate, child.measurements, ageMonths),
    };
  }

  async updateSex(childId: number, updateSexDto: UpdateSexDto) {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new NotFoundException(`No existe el menor con id ${childId}`);

    await this.prisma.child.update({
      where: { id: childId },
      data: { sex: updateSexDto.sex },
    });
    return this.findOne(childId);
  }

  private buildSeries(metric: Metric, sex: Sex, birthDate: Date, measurements: Measurement[], currentAge: number) {
    const table = WHO_LMS[sex][metric];
    const maxMonth = table[table.length - 1][0];

    const points = measurements
      .filter((m) => m[metric] != null)
      .map((m) => {
        const value = m[metric] as number;
        const ageMonths = this.ageInMonths(birthDate, m.date);
        const lms = lmsAt(table, ageMonths);
        const z = lms ? zFromValue(lms.L, lms.M, lms.S, value) : null;
        return {
          id: m.id,
          date: m.date,
          ageMonths: round(ageMonths, 2),
          value,
          z: z != null ? round(z, 2) : null,
          percentile: z != null ? round(percentileFromZ(z), 1) : null,
        };
      });

    const projection = this.buildProjection(table, birthDate, points);

    // Rango de edad del gráfico: desde un poco antes de la primera medición hasta el final de la proyección
    const firstAge = points.length > 0 ? points[0].ageMonths : currentAge;
    const lastAge = Math.max(currentAge, projection.length > 0 ? projection[projection.length - 1].ageMonths : 0);
    const fromMonth = clamp(Math.floor(firstAge) - CHART_MARGIN_MONTHS, 0, maxMonth);
    const toMonth = clamp(Math.ceil(lastAge), fromMonth + 1, maxMonth);

    const curves: { month: number; p3: number; p15: number; p50: number; p85: number; p97: number }[] = [];
    for (let month = fromMonth; month <= toMonth; month++) {
      const { L, M, S } = lmsAt(table, month)!;
      curves.push({
        month,
        p3: round(valueFromZ(L, M, S, PERCENTILE_Z.p3), 2),
        p15: round(valueFromZ(L, M, S, PERCENTILE_Z.p15), 2),
        p50: round(valueFromZ(L, M, S, PERCENTILE_Z.p50), 2),
        p85: round(valueFromZ(L, M, S, PERCENTILE_Z.p85), 2),
        p97: round(valueFromZ(L, M, S, PERCENTILE_Z.p97), 2),
      });
    }

    return {
      unit: UNITS[metric],
      points,
      curves,
      projection,
      insight: this.buildInsight(metric, points),
    };
  }

  // Proyección: se asume que el menor mantiene el z-score de su última medición
  // y se lee el valor que tendría sobre la curva de la OMS en los próximos meses.
  private buildProjection(
    table: LmsRow[],
    birthDate: Date,
    points: { ageMonths: number; z: number | null }[],
  ) {
    const last = points[points.length - 1];
    if (!last || last.z == null) return [];

    const projection: { date: Date; ageMonths: number; value: number }[] = [];
    for (let i = 1; i <= PROJECTION_MONTHS; i++) {
      const ageMonths = last.ageMonths + i;
      const lms = lmsAt(table, ageMonths);
      if (!lms) break;
      projection.push({
        date: this.dateAtAge(birthDate, ageMonths),
        ageMonths: round(ageMonths, 2),
        value: round(valueFromZ(lms.L, lms.M, lms.S, last.z), 1),
      });
    }
    return projection;
  }

  private buildInsight(metric: Metric, points: { ageMonths: number; z: number | null; percentile: number | null }[]) {
    const valid = points.filter((p) => p.z != null);
    const last = valid[valid.length - 1];
    if (!last) return null;

    const name = metric === 'weight' ? 'peso' : 'altura';
    const percentile = Math.round(last.percentile!);

    if (last.z! < PERCENTILE_Z.p3) {
      return {
        level: 'alert',
        title: `${capitalize(name)} por debajo del percentil 3`,
        message: 'Está por debajo de lo habitual para su edad. Coméntalo con su pediatra.',
      };
    }
    if (last.z! > PERCENTILE_Z.p97) {
      return {
        level: 'alert',
        title: `${capitalize(name)} por encima del percentil 97`,
        message: 'Está por encima de lo habitual para su edad. Coméntalo con su pediatra.',
      };
    }

    // Comparamos con una medición de hace al menos 3 meses para ver si ha cambiado de carril
    const previous = [...valid].reverse().find((p) => last.ageMonths - p.ageMonths >= 3);
    if (previous) {
      const delta = last.z! - previous.z!;
      if (Math.abs(delta) >= CROSSING_Z) {
        return {
          level: 'warning',
          title: delta < 0 ? `El ${name} ha bajado de percentil` : `El ${name} ha subido de percentil`,
          message: `Ha pasado del percentil ${Math.round(previous.percentile!)} al ${percentile}. Si se mantiene, consúltalo en la próxima revisión.`,
        };
      }
    }

    return {
      level: 'ok',
      title: 'Crecimiento saludable',
      message: `Su ${name} está en el percentil ${percentile} y sigue una evolución estable.`,
    };
  }

  private ageInMonths(birthDate: Date, date: Date) {
    return (date.getTime() - birthDate.getTime()) / (DAYS_PER_MONTH * 24 * 60 * 60 * 1000);
  }

  private dateAtAge(birthDate: Date, ageMonths: number) {
    return new Date(birthDate.getTime() + ageMonths * DAYS_PER_MONTH * 24 * 60 * 60 * 1000);
  }
}

function round(value: number, decimals: number) {
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
