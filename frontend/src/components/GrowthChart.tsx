import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Pressable, ActivityIndicator, LayoutChangeEvent, GestureResponderEvent } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { GrowthData, GrowthSeries, Metric, Sex } from '../api/growth';

// Colores de tailwind.config.js (las props de SVG no aceptan className)
const COLORS = {
  blue: '#6d83a1',
  red: '#cc7a66',
  green: '#65a882',
  muted: '#808080',
  text: '#3a3a3a',
  card: '#ece6d9',
};

const CHART_HEIGHT = 220;
const PAD = { top: 10, right: 30, bottom: 24, left: 34 };
const DAYS_PER_MONTH = 30.4375;
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const INSIGHT_STYLE = {
  ok: { icon: 'trending-up', color: COLORS.green },
  warning: { icon: 'alert-circle-outline', color: '#d39b4a' },
  alert: { icon: 'warning-outline', color: COLORS.red },
} as const;

interface GrowthChartProps {
  data: GrowthData | null;
  loading?: boolean;
  error?: string | null;
  onSelectSex: (sex: Sex) => void;
  onAddMeasurement: (metric: Metric) => void;
}

// Con menos de 2 mediciones no hay línea que trazar
const MIN_POINTS = 2;

export default function GrowthChart({ data, loading, error, onSelectSex, onAddMeasurement }: GrowthChartProps) {
  const [metric, setMetric] = useState<Metric>('weight');
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  // Al cambiar de menor o de métrica se quita la selección
  useEffect(() => setSelected(null), [data, metric]);

  const series = data?.[metric] ?? null;

  return (
    <View className="bg-nanny-card p-4 rounded-2xl min-h-[250px] flex-col mb-6">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="font-semibold text-lg text-nanny-text">Curva de crecimiento</Text>
        <View className="flex-row bg-white rounded-full overflow-hidden">
          {(['weight', 'height'] as Metric[]).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMetric(m)}
              className={`px-3 py-1 ${metric === m ? 'bg-nanny-blue' : ''}`}
            >
              <Text className={`font-medium text-xs ${metric === m ? 'text-white' : 'text-nanny-muted'}`}>
                {m === 'weight' ? 'Peso' : 'Altura'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && !data ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={COLORS.blue} />
        </View>
      ) : error && !data ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-nanny-muted text-center">{error}</Text>
        </View>
      ) : !data ? (
        <View className="flex-1 border-2 border-dashed border-nanny-muted/30 rounded-xl items-center justify-center">
          <Text className="text-nanny-muted text-center">Selecciona un usuario para ver la curva</Text>
        </View>
      ) : !data.child.sex ? (
        <SexPrompt name={data.child.name} onSelectSex={onSelectSex} />
      ) : series && series.points.length < MIN_POINTS ? (
        <EmptyState metric={metric} count={series.points.length} onAdd={() => onAddMeasurement(metric)} />
      ) : series ? (
        <>
          <Legend />
          <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
            {width > 0 && (
              <Chart
                series={series}
                width={width}
                birthDate={data.child.birthDate}
                currentAge={data.child.ageMonths}
                selected={selected}
                onSelect={setSelected}
              />
            )}
          </View>
          <Details series={series} selected={selected} />
        </>
      ) : null}
    </View>
  );
}

function SexPrompt({ name, onSelectSex }: { name: string; onSelectSex: (sex: Sex) => void }) {
  return (
    <View className="flex-1 items-center justify-center py-4">
      <Ionicons name="body-outline" size={28} color={COLORS.blue} />
      <Text className="text-nanny-text text-center font-medium mt-2 mb-1">
        ¿{name} es niño o niña?
      </Text>
      <Text className="text-nanny-muted text-center text-sm mb-4 px-4">
        Las curvas de la OMS son distintas para cada sexo. Solo hace falta indicarlo una vez.
      </Text>
      <View className="flex-row gap-3">
        <TouchableOpacity onPress={() => onSelectSex('MALE')} className="bg-nanny-blue px-5 py-2 rounded-full">
          <Text className="text-white font-semibold">Niño</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onSelectSex('FEMALE')} className="bg-nanny-red px-5 py-2 rounded-full">
          <Text className="text-white font-semibold">Niña</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmptyState({ metric, count, onAdd }: { metric: Metric; count: number; onAdd: () => void }) {
  const name = metric === 'weight' ? 'peso' : 'altura';
  return (
    <View className="flex-1 items-center justify-center py-4">
      <Ionicons name="analytics-outline" size={28} color={COLORS.blue} />
      <Text className="text-nanny-text text-center font-medium mt-2 mb-1">
        {count === 0 ? `Aún no hay registros de ${name}` : `Solo hay un registro de ${name}`}
      </Text>
      <Text className="text-nanny-muted text-center text-sm mb-4 px-4">
        Se necesitan al menos dos registros de medidas para mostrar la gráfica de evolución.
      </Text>
      <TouchableOpacity onPress={onAdd} className="flex-row items-center gap-1 bg-nanny-blue px-5 py-2 rounded-full">
        <Ionicons name="add" size={16} color="white" />
        <Text className="text-white font-semibold">Añadir {name}</Text>
      </TouchableOpacity>
    </View>
  );
}

function Legend() {
  return (
    <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1 mb-2">
      <View className="flex-row items-center gap-1">
        <View className="w-4 h-0.5 bg-nanny-blue" />
        <Text className="text-nanny-blue text-xs font-medium">Registrado</Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Text className="text-nanny-red text-xs font-bold">---</Text>
        <Text className="text-nanny-red text-xs font-medium">Proyección</Text>
      </View>
      <View className="flex-row items-center gap-1">
        <View className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.green, opacity: 0.35 }} />
        <Text className="text-nanny-muted text-xs font-medium">Percentiles OMS</Text>
      </View>
    </View>
  );
}

interface ChartProps {
  series: GrowthSeries;
  width: number;
  birthDate: string;
  currentAge: number;
  selected: number | null;
  onSelect: (index: number | null) => void;
}

function Chart({ series, width, birthDate, currentAge, selected, onSelect }: ChartProps) {
  const { curves, points, projection } = series;
  if (curves.length < 2) return null;

  const plotW = width - PAD.left - PAD.right;
  const plotH = CHART_HEIGHT - PAD.top - PAD.bottom;

  // Dominio de los ejes
  const minAge = curves[0].month;
  const maxAge = curves[curves.length - 1].month;
  const values = [
    ...curves.flatMap((c) => [c.p3, c.p97]),
    ...points.map((p) => p.value),
    ...projection.map((p) => p.value),
  ];
  const yStep = niceStep(Math.max(...values) - Math.min(...values), 4);
  const minY = Math.floor(Math.min(...values) / yStep) * yStep;
  const maxY = Math.ceil(Math.max(...values) / yStep) * yStep;

  const x = (age: number) => PAD.left + ((age - minAge) / (maxAge - minAge)) * plotW;
  const y = (value: number) => PAD.top + (1 - (value - minY) / (maxY - minY)) * plotH;

  const line = (pts: { age: number; value: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.age).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');

  const band = (upper: 'p97' | 'p85', lower: 'p3' | 'p15') =>
    line(curves.map((c) => ({ age: c.month, value: c[upper] }))) +
    ' ' +
    [...curves].reverse().map((c) => `L${x(c.month).toFixed(1)},${y(c[lower]).toFixed(1)}`).join(' ') +
    ' Z';

  const visiblePoints = points.filter((p) => p.ageMonths >= minAge && p.ageMonths <= maxAge);
  const lastPoint = points[points.length - 1];
  const projectionPath = lastPoint && projection.length > 0
    ? line([{ age: lastPoint.ageMonths, value: lastPoint.value }, ...projection.map((p) => ({ age: p.ageMonths, value: p.value }))])
    : null;

  const yTicks: number[] = [];
  for (let v = minY; v <= maxY + 1e-9; v += yStep) yTicks.push(Number(v.toFixed(2)));

  const xStep = [1, 2, 3, 6, 12, 24, 36].find((s) => (maxAge - minAge) / s <= 4) ?? 48;
  const xTicks: number[] = [];
  for (let m = Math.ceil(minAge / xStep) * xStep; m <= maxAge; m += xStep) xTicks.push(m);

  const last = curves[curves.length - 1];

  // Al tocar el gráfico se selecciona la medición más cercana en el eje X
  const handlePress = (e: GestureResponderEvent) => {
    if (points.length === 0) return;
    const tapX = e.nativeEvent.locationX;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.ageMonths) - tapX) < Math.abs(x(points[best].ageMonths) - tapX)) best = i;
    });
    onSelect(best === selected ? null : best);
  };

  return (
    <Pressable onPress={handlePress}>
      <Svg width={width} height={CHART_HEIGHT}>
        {/* Rejilla y eje Y */}
        {yTicks.map((v) => (
          <React.Fragment key={`y${v}`}>
            <Line x1={PAD.left} x2={PAD.left + plotW} y1={y(v)} y2={y(v)} stroke={COLORS.muted} strokeOpacity={0.15} />
            <SvgText x={PAD.left - 6} y={y(v) + 3} fontSize={10} fill={COLORS.muted} textAnchor="end">
              {v}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Eje X con fechas */}
        {xTicks.map((m) => (
          <SvgText key={`x${m}`} x={x(m)} y={CHART_HEIGHT - 6} fontSize={10} fill={COLORS.muted} textAnchor="middle">
            {formatMonthYear(dateAtAge(birthDate, m))}
          </SvgText>
        ))}

        {/* Bandas de percentiles OMS: P3-P97 y P15-P85 */}
        <Path d={band('p97', 'p3')} fill={COLORS.green} fillOpacity={0.12} />
        <Path d={band('p85', 'p15')} fill={COLORS.green} fillOpacity={0.18} />
        <Path
          d={line(curves.map((c) => ({ age: c.month, value: c.p50 })))}
          stroke={COLORS.green}
          strokeWidth={1}
          strokeDasharray="3,3"
          fill="none"
        />
        {(['p97', 'p50', 'p3'] as const).map((p) => (
          <SvgText key={p} x={PAD.left + plotW + 4} y={y(last[p]) + 3} fontSize={9} fill={COLORS.green}>
            {p.toUpperCase()}
          </SvgText>
        ))}

        {/* Hoy */}
        {currentAge >= minAge && currentAge <= maxAge && (
          <Line
            x1={x(currentAge)}
            x2={x(currentAge)}
            y1={PAD.top}
            y2={PAD.top + plotH}
            stroke={COLORS.muted}
            strokeOpacity={0.4}
            strokeDasharray="4,4"
          />
        )}

        {/* Proyección */}
        {projectionPath && (
          <Path d={projectionPath} stroke={COLORS.red} strokeWidth={2} strokeDasharray="5,4" fill="none" />
        )}
        {projection.map((p) => (
          <Circle key={`pr${p.ageMonths}`} cx={x(p.ageMonths)} cy={y(p.value)} r={3} fill={COLORS.red} />
        ))}

        {/* Mediciones del menor */}
        {visiblePoints.length > 1 && (
          <Path
            d={line(visiblePoints.map((p) => ({ age: p.ageMonths, value: p.value })))}
            stroke={COLORS.blue}
            strokeWidth={2.5}
            fill="none"
          />
        )}
        {points.map((p, i) => (
          <Circle
            key={p.id}
            cx={x(p.ageMonths)}
            cy={y(p.value)}
            r={i === selected ? 6 : 4}
            fill={COLORS.blue}
            stroke={i === selected ? 'white' : 'none'}
            strokeWidth={2}
          />
        ))}
      </Svg>
    </Pressable>
  );
}

function Details({ series, selected }: { series: GrowthSeries; selected: number | null }) {
  const point = selected != null ? series.points[selected] : null;
  const insight = series.insight;

  return (
    <View className="mt-2">
      {point ? (
        <View className="bg-white rounded-xl px-3 py-2 flex-row justify-between items-center">
          <Text className="text-nanny-muted text-sm">{formatDate(point.date)}</Text>
          <Text className="text-nanny-text font-semibold">{point.value} {series.unit}</Text>
          <Text className="text-nanny-blue font-semibold text-sm">
            {point.percentile != null ? `Percentil ${Math.round(point.percentile)}` : 'Fuera de tabla OMS'}
          </Text>
        </View>
      ) : (
        <Text className="text-nanny-muted text-xs text-center">Toca un punto para ver su percentil</Text>
      )}

      {insight && (
        <View className="flex-row items-start gap-3 mt-4">
          <Ionicons name={INSIGHT_STYLE[insight.level].icon} size={22} color={INSIGHT_STYLE[insight.level].color} />
          <View className="flex-1">
            <Text className="text-nanny-text font-semibold">{insight.title}</Text>
            <Text className="text-nanny-muted text-sm">{insight.message}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// Paso "bonito" (1, 2, 5, 10...) para que el eje Y tenga unas `count` divisiones
function niceStep(range: number, count: number) {
  const raw = Math.max(range, 1) / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / magnitude;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * magnitude;
}

function dateAtAge(birthDate: string, ageMonths: number) {
  return new Date(new Date(birthDate).getTime() + ageMonths * DAYS_PER_MONTH * 24 * 60 * 60 * 1000);
}

export function formatMonthYear(date: Date | string) {
  const d = new Date(date);
  return `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

// Para textos fuera del gráfico: "abril 2027" no se confunde con un día del mes
export function formatMonthYearLong(date: Date | string) {
  const d = new Date(date);
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDate(date: string) {
  const d = new Date(date);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
