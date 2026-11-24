import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, type DimensionValue, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fetchHistory, type HistoryItem, type HistoryKind } from '../api/history';
import { useFamilySelection } from '../context/FamilySelectionContext';
import { COLORS, SHADOWS } from '../theme';

// Historial médico cronológico de un niño (solo usuarios PRO).
// Línea de tiempo con tarjetas por tipo, filtros por tipo y fecha, y paginación por cursor.

const PAGE_SIZE = 20;

const palette = {
  text: COLORS.text,
  muted: COLORS.muted,
  blue: COLORS.primary,
  line: '#D9CCE3',
  chip: COLORS.surface,
  chipBorder: COLORS.border,
};

type KindStyle = { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string; border: string };

// Colores e iconos de cada tipo (tarjeta tintada + punto en la línea de tiempo)
const KIND_STYLES: Record<HistoryKind, KindStyle> = {
  DISEASE: { label: 'Enfermedad', icon: 'document-text-outline', color: '#7A5BB5', bg: '#EFE8F8', border: '#DCCFF0' },
  MEDICINE: { label: 'Medicamento', icon: 'medkit-outline', color: '#4E8A64', bg: '#E8F3EB', border: '#CBE3D3' },
  APPOINTMENT: { label: 'Cita médica', icon: 'pulse-outline', color: '#B5654A', bg: '#F8EAE5', border: '#EED3C9' },
  SYMPTOM: { label: 'Síntoma', icon: 'happy-outline', color: '#5E6BB5', bg: '#ECEEF9', border: '#D3D8F0' },
  VACCINE: { label: 'Vacuna', icon: 'eyedrop-outline', color: '#C2577A', bg: '#F9E8EF', border: '#EFCEDB' },
};

const KIND_ORDER: HistoryKind[] = ['SYMPTOM', 'MEDICINE', 'APPOINTMENT', 'VACCINE', 'DISEASE'];

// El backend devuelve los síntomas como los valores del enum TagCondition ("FEVER, COUGH").
const SYMPTOM_LABELS: Record<string, string> = {
  HEADACHE: 'Dolor de cabeza',
  FEVER: 'Fiebre',
  COUGH: 'Tos',
  SORE_THROAT: 'Dolor de garganta',
  RUNNY_NOSE: 'Mocos',
  NASAL_CONGESTION: 'Congestión nasal',
  SNEEZING: 'Estornudos',
  STOMACHACHE: 'Dolor de barriga',
  CRAMPS: 'Calambres',
  NAUSEA: 'Náuseas',
  VOMITING: 'Vómitos',
  DIARRHEA: 'Diarrea',
  CONSTIPATION: 'Estreñimiento',
  DIZZINESS: 'Mareo',
  FATIGUE: 'Cansancio',
  EARACHE: 'Dolor de oído',
  TOOTHACHE: 'Dolor de muelas',
  RASH: 'Sarpullido',
  ITCHING: 'Picor',
  WATERY_EYES: 'Ojos llorosos',
  RED_EYES: 'Ojos rojos',
  LOSS_OF_APPETITE: 'Falta de apetito',
  MUSCLE_PAIN: 'Dolor muscular',
  JOINT_PAIN: 'Dolor articular',
  CHILLS: 'Escalofríos',
  SHORTNESS_OF_BREATH: 'Falta de aire',
  WHEEZING: 'Pitos al respirar',
  SWOLLEN_GLANDS: 'Ganglios inflamados',
  TROUBLE_SLEEPING: 'Problemas para dormir',
  IRRITABILITY: 'Irritabilidad',
};

const itemTitle = (item: HistoryItem) =>
  item.kind === 'SYMPTOM'
    ? item.title.split(', ').map((tag) => SYMPTOM_LABELS[tag] ?? tag).join(', ')
    : item.title;

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

// "24 nov 2026"
const formatDate = (value: string | Date) => {
  const d = new Date(value);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};

// "24 nov 2026 · 17:00" (sin hora si el registro no la tiene)
const formatDateTime = (value: string | Date) => {
  const d = new Date(value);
  if (d.getHours() === 0 && d.getMinutes() === 0) return formatDate(d);
  return `${formatDate(d)} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function TimelineDot({ color }: { color: string }) {
  return (
    <View className="w-3 items-center">
      <View style={{ backgroundColor: color }} className="mt-[26px] h-2 w-2 rounded-full" />
    </View>
  );
}

function HistoryCard({ item }: { item: HistoryItem }) {
  const style = KIND_STYLES[item.kind];
  return (
    <View className="flex-row">
      <TimelineDot color={style.color} />
      <View
        style={{ backgroundColor: style.bg, borderColor: style.border }}
        className="mb-3 ml-4 flex-1 rounded-[22px] border px-4 py-3.5"
        accessibilityLabel={`${style.label}, ${itemTitle(item)}, ${formatDate(item.date)}`}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name={style.icon} size={15} color={style.color} />
            <Text style={{ color: style.color }} className="ml-1.5 font-figtree-medium text-[14px]">{style.label}</Text>
          </View>
          <Text style={{ color: palette.muted }} className="font-figtree text-[14px]">{formatDateTime(item.date)}</Text>
        </View>
        <Text style={{ color: palette.text }} className="mt-2 font-figtree-semibold text-[16px]">{itemTitle(item)}</Text>
        {item.subtitle ? (
          <Text style={{ color: palette.muted }} className="mt-1 font-figtree text-[14px]">{item.subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

function Chip({
  label,
  icon,
  selected,
  onPress,
  selectedStyle,
  onClear,
}: {
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  selected: boolean;
  onPress: () => void;
  selectedStyle?: { bg: string; border: string; color: string };
  onClear?: () => void;
}) {
  const bg = selected ? selectedStyle?.bg ?? COLORS.primarySoft : palette.chip;
  const border = selected ? selectedStyle?.border ?? palette.blue : palette.chipBorder;
  const color = selected ? selectedStyle?.color ?? palette.blue : palette.muted;
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{ backgroundColor: bg, borderColor: border }}
      className="mr-2 flex-row items-center rounded-full border px-4 py-2"
    >
      {icon && <Ionicons name={icon} size={15} color={color} style={{ marginRight: 6 }} />}
      <Text style={{ color }} className="font-figtree text-[15px]">{label}</Text>
      {onClear && (
        <TouchableOpacity onPress={onClear} hitSlop={8} accessibilityLabel={`Quitar ${label}`} className="ml-2">
          <Ionicons name="close" size={14} color={color} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// Título "Historial médico · 18"
function HistoryTitle({ count, pro = false }: { count?: number; pro?: boolean }) {
  return (
    <View className="mb-3 flex-row items-baseline">
      <Text style={{ color: palette.text }} className="font-figtree-medium text-[20px]">Historial médico</Text>
      {count !== undefined && (
        <Text style={{ color: palette.text }} className="ml-1.5 font-figtree text-[14px]">· {count}</Text>
      )}
      {pro && (
        <View className="ml-2 self-center rounded-full bg-nanny-card px-2 py-0.5">
          <Text className="font-figtree-bold text-[11px] tracking-wider text-nanny-blue">PRO</Text>
        </View>
      )}
    </View>
  );
}

// Vista previa bloqueada para usuarios que no son PRO.
// No pide nada al backend: muestra tarjetas de ejemplo "difuminadas" (texto sustituido por barras
// y opacidad baja) con un aviso encima para mejorar el plan.
const PREVIEW_KINDS: HistoryKind[] = ['DISEASE', 'MEDICINE', 'APPOINTMENT', 'SYMPTOM'];

function BlurredCard({ kind, titleWidth, subtitleWidth }: { kind: HistoryKind; titleWidth: DimensionValue; subtitleWidth: DimensionValue }) {
  const style = KIND_STYLES[kind];
  return (
    <View className="flex-row">
      <TimelineDot color={style.color} />
      <View style={{ backgroundColor: style.bg, borderColor: style.border }} className="mb-3 ml-4 flex-1 rounded-[22px] border px-4 py-3.5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name={style.icon} size={15} color={style.color} />
            <Text style={{ color: style.color }} className="ml-1.5 font-figtree-medium text-[14px]">{style.label}</Text>
          </View>
          <View style={{ backgroundColor: style.border }} className="h-3 w-16 rounded-full" />
        </View>
        {/* Texto "difuminado": barras en lugar de contenido */}
        <View style={{ backgroundColor: style.border, width: titleWidth }} className="mt-3 h-4 rounded-full" />
        <View style={{ backgroundColor: style.border, width: subtitleWidth }} className="mt-2 h-3 rounded-full opacity-70" />
      </View>
    </View>
  );
}

export function HealthHistoryLocked({ onUpgrade }: { onUpgrade?: () => void }) {
  return (
    <View className="mb-8">
      <HistoryTitle pro />

      <View className="overflow-hidden rounded-2xl">
        {/* Vista previa de ejemplo, muy atenuada */}
        <View style={{ opacity: 0.35 }} pointerEvents="none" importantForAccessibility="no-hide-descendants">
          <View style={{ backgroundColor: palette.line }} className="absolute bottom-0 left-[5px] top-0 w-[1.5px]" />
          {PREVIEW_KINDS.map((kind, i) => (
            <BlurredCard key={kind} kind={kind} titleWidth={(['60%', '75%', '50%', '65%'] as const)[i]} subtitleWidth={(['85%', '55%', '70%', '80%'] as const)[i]} />
          ))}
        </View>

        {/* Aviso encima de la vista previa */}
        <View
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.35)' }}
          className="absolute inset-0 items-center justify-center px-6"
        >
          <View className="items-center rounded-[28px] bg-nanny-card px-6 py-6" style={SHADOWS.card}>
            <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-nanny-soft">
              <Ionicons name="lock-closed" size={22} color={COLORS.primary} />
            </View>
            <Text style={{ color: palette.text }} className="text-center text-subtitle font-figtree-semibold">
              Función exclusiva para usuarios PRO
            </Text>
            <Text style={{ color: palette.muted }} className="font-figtree mt-2 text-center text-body">
              Actualiza a PRO para ver el historial médico completo: visitas, diagnósticos y tratamientos, con filtros por tipo y fecha.
            </Text>
            <TouchableOpacity
              onPress={onUpgrade}
              accessibilityRole="button"
              accessibilityLabel="Mejorar mi plan a PRO"
              className="mt-4 flex-row items-center rounded-full bg-nanny-blue px-5 py-3"
            >
              <Ionicons name="star" size={16} color="#ffffff" />
              <Text className="ml-2 text-body font-figtree-semibold text-white">Mejorar a PRO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function HealthHistory({ childId }: { childId: number }) {
  // Usuario que consulta: el backend comprueba que sea PRO.
  const { selectedUserId } = useFamilySelection();
  const [kinds, setKinds] = useState<HistoryKind[]>([]);
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  // Evita que una respuesta antigua pise a la de unos filtros más nuevos.
  const requestId = useRef(0);

  const loadFirstPage = useCallback(async () => {
    const id = ++requestId.current;
    if (selectedUserId == null) {
      setItems([]);
      setNextCursor(null);
      setError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const page = await fetchHistory(childId, selectedUserId, { kinds, from, to, limit: PAGE_SIZE });
      if (id !== requestId.current) return;
      setItems(page.items);
      setNextCursor(page.nextCursor);
    } catch {
      if (id === requestId.current) setError(true);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [childId, selectedUserId, kinds, from, to]);

  useEffect(() => { loadFirstPage(); }, [loadFirstPage]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore || selectedUserId == null) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const page = await fetchHistory(childId, selectedUserId, { kinds, from, to, cursor: nextCursor, limit: PAGE_SIZE });
      if (id !== requestId.current) return;
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch {
      if (id === requestId.current) setError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleKind = (kind: HistoryKind) =>
    setKinds((current) => (current.includes(kind) ? current.filter((k) => k !== kind) : [...current, kind]));

  const onPickDate = (selected: Date) => {
    if (picker === 'from') {
      setFrom(selected);
      if (to && selected > to) setTo(null);       // rango imposible: se quita el final
    } else if (picker === 'to') {
      setTo(selected);
      if (from && selected < from) setFrom(null);
    }
  };

  return (
    <View className="mb-8">
      <HistoryTitle count={loading ? undefined : items.length} />

      {/* Filtro por tipo: ninguno marcado = todos */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3" style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {KIND_ORDER.map((kind) => {
          const style = KIND_STYLES[kind];
          return (
            <Chip
              key={kind}
              label={style.label}
              icon={style.icon}
              selected={kinds.includes(kind)}
              onPress={() => toggleKind(kind)}
              selectedStyle={{ bg: style.bg, border: style.color, color: style.color }}
            />
          );
        })}
      </ScrollView>

      {/* Filtro por fecha */}
      <View className="mb-5 flex-row">
        <Chip
          label={from ? `Desde ${formatDate(from)}` : 'Desde'}
          selected={!!from}
          onPress={() => setPicker('from')}
          onClear={from ? () => setFrom(null) : undefined}
        />
        <Chip
          label={to ? `Hasta ${formatDate(to)}` : 'Hasta'}
          selected={!!to}
          onPress={() => setPicker('to')}
          onClear={to ? () => setTo(null) : undefined}
        />
      </View>
      {picker && (
        <DateTimePicker
          value={(picker === 'from' ? from : to) || new Date()}
          mode="date"
          onValueChange={(_, selected) => { if (selected) onPickDate(selected); }}
          onDismiss={() => setPicker(null)}
        />
      )}

      {loading ? (
        <ActivityIndicator size="large" color={palette.blue} className="my-6" />
      ) : error && items.length === 0 ? (
        <View className="items-center rounded-[22px] bg-nanny-card p-6">
          <Text style={{ color: palette.muted }} className="font-figtree text-body">No se pudo cargar el historial.</Text>
          <TouchableOpacity onPress={loadFirstPage} className="mt-3">
            <Text style={{ color: palette.blue }} className="text-body font-figtree-semibold">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View className="items-center rounded-[22px] bg-nanny-card p-6">
          <Text style={{ color: palette.muted }} className="font-figtree text-body">No hay registros con estos filtros.</Text>
        </View>
      ) : (
        <View>
          {/* Línea vertical de la línea de tiempo, detrás de los puntos */}
          <View
            style={{ backgroundColor: palette.line }}
            className="absolute bottom-0 left-[5px] top-0 w-[1.5px]"
          />
          {items.map((item) => <HistoryCard key={item.id} item={item} />)}

          {nextCursor && (
            <TouchableOpacity
              onPress={loadMore}
              disabled={loadingMore}
              className="ml-7 items-center rounded-full bg-nanny-card py-3"
            >
              {loadingMore
                ? <ActivityIndicator color={palette.blue} />
                : <Text style={{ color: palette.blue }} className="text-body font-figtree-semibold">Cargar más</Text>}
            </TouchableOpacity>
          )}
          {error && items.length > 0 && (
            <Text style={{ color: palette.muted }} className="font-figtree mt-2 text-center text-body">
              No se pudieron cargar más registros.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
