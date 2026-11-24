import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, type DimensionValue, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fetchHistory, type HistoryItem, type HistoryKind } from '../api/history';
import { useFamilySelection } from '../context/FamilySelectionContext';
import { COLORS } from '../theme';

// Historial médico cronológico de un niño (solo usuarios PRO).
// Línea de tiempo con tarjetas por tipo, filtros por tipo y fecha, y paginación por cursor.

const PAGE_SIZE = 20;

const palette = {
  text: COLORS.text,
  muted: COLORS.muted,
  blue: COLORS.primary,
  line: COLORS.border,
  chip: COLORS.surfaceAlt,
  chipBorder: COLORS.border,
};

type KindStyle = { label: string; emoji: string; color: string; bg: string; border: string };

const KIND_STYLES: Record<HistoryKind, KindStyle> = {
  DISEASE: { label: 'Enfermedad', emoji: '😷', color: '#cc7a66', bg: '#fdeee8', border: '#f1cfc4' },
  MEDICINE: { label: 'Medicamento', emoji: '💊', color: '#4f6b8f', bg: '#e8eef5', border: '#c9d6e5' },
  APPOINTMENT: { label: 'Cita médica', emoji: '🩺', color: '#3f8a5c', bg: '#e8f3ea', border: '#c6dfcd' },
  SYMPTOM: { label: 'Síntoma', emoji: '📋', color: '#8a6cc4', bg: '#efeaf8', border: '#d8cdef' },
  VACCINE: { label: 'Vacuna', emoji: '💉', color: '#b07a1e', bg: '#fbf2e1', border: '#ecd9b4' },
};

const KIND_ORDER: HistoryKind[] = ['DISEASE', 'MEDICINE', 'APPOINTMENT', 'SYMPTOM', 'VACCINE'];

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

const formatDate = (value: string | Date) =>
  new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

function HistoryCard({ item }: { item: HistoryItem }) {
  const style = KIND_STYLES[item.kind];
  return (
    <View className="flex-row">
      {/* Punto de la línea de tiempo */}
      <View className="w-3 items-center">
        <View style={{ backgroundColor: style.color }} className="mt-4 h-2.5 w-2.5 rounded-full" />
      </View>
      <View
        style={{ backgroundColor: style.bg, borderColor: style.border }}
        className="mb-4 ml-4 flex-1 rounded-2xl border p-4"
        accessibilityLabel={`${style.label}, ${itemTitle(item)}, ${formatDate(item.date)}`}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="mr-2 text-body">{style.emoji}</Text>
            <Text style={{ color: style.color }} className="text-body font-semibold">{style.label}</Text>
          </View>
          <Text style={{ color: palette.muted }} className="text-body">{formatDate(item.date)}</Text>
        </View>
        <Text style={{ color: palette.text }} className="mt-2 text-subtitle font-semibold">{itemTitle(item)}</Text>
        {item.subtitle ? (
          <Text style={{ color: palette.muted }} className="mt-1 text-body">{item.subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
  selectedStyle,
  onClear,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  selectedStyle?: { bg: string; border: string; color: string };
  onClear?: () => void;
}) {
  const bg = selected ? selectedStyle?.bg ?? palette.blue : palette.chip;
  const border = selected ? selectedStyle?.border ?? palette.blue : palette.chipBorder;
  const color = selected ? selectedStyle?.color ?? '#ffffff' : palette.muted;
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{ backgroundColor: bg, borderColor: border }}
      className="mr-2 flex-row items-center rounded-full border px-4 py-2"
    >
      <Text style={{ color }} className="text-body font-semibold">{label}</Text>
      {onClear && (
        <TouchableOpacity onPress={onClear} hitSlop={8} accessibilityLabel={`Quitar ${label}`} className="ml-2">
          <Ionicons name="close" size={14} color={color} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
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
      <View className="w-3 items-center">
        <View style={{ backgroundColor: style.color }} className="mt-4 h-2.5 w-2.5 rounded-full" />
      </View>
      <View style={{ backgroundColor: style.bg, borderColor: style.border }} className="mb-4 ml-4 flex-1 rounded-2xl border p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="mr-2 text-body">{style.emoji}</Text>
            <Text style={{ color: style.color }} className="text-body font-semibold">{style.label}</Text>
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
      <View className="mb-3 flex-row items-center">
        <Text style={{ color: palette.muted }} className="text-body font-semibold uppercase tracking-wider">
          Historial médico
        </Text>
        <View className="ml-2 flex-row items-center rounded-full bg-[#efeaf8] px-2 py-0.5">
          <Ionicons name="star" size={11} color="#8a6cc4" />
          <Text style={{ color: '#8a6cc4' }} className="ml-1 text-caption font-semibold">PRO</Text>
        </View>
      </View>

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
          style={{ backgroundColor: 'rgba(247, 243, 236, 0.55)' }}
          className="absolute inset-0 items-center justify-center px-6"
        >
          <View className="items-center rounded-3xl border border-nanny-border bg-nanny-bg px-6 py-6">
            <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-[#efeaf8]">
              <Ionicons name="lock-closed" size={22} color="#8a6cc4" />
            </View>
            <Text style={{ color: palette.text }} className="text-center text-subtitle font-semibold">
              Función exclusiva para usuarios PRO
            </Text>
            <Text style={{ color: palette.muted }} className="mt-2 text-center text-body">
              Actualiza a PRO para ver el historial médico completo: visitas, diagnósticos y tratamientos, con filtros por tipo y fecha.
            </Text>
            <TouchableOpacity
              onPress={onUpgrade}
              accessibilityRole="button"
              accessibilityLabel="Mejorar mi plan a PRO"
              className="mt-4 flex-row items-center rounded-full bg-[#8a6cc4] px-5 py-3"
            >
              <Ionicons name="star" size={16} color="#ffffff" />
              <Text className="ml-2 text-body font-semibold text-white">Mejorar a PRO</Text>
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
      <Text style={{ color: palette.muted }} className="mb-3 text-body font-semibold uppercase tracking-wider">
        Historial médico
      </Text>

      {/* Filtro por tipo: ninguno marcado = todos */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        <Chip label="Todos" selected={kinds.length === 0} onPress={() => setKinds([])} />
        {KIND_ORDER.map((kind) => {
          const style = KIND_STYLES[kind];
          return (
            <Chip
              key={kind}
              label={`${style.emoji} ${style.label}`}
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
        <View className="items-center rounded-2xl bg-nanny-surface p-6">
          <Text style={{ color: palette.muted }} className="text-body">No se pudo cargar el historial.</Text>
          <TouchableOpacity onPress={loadFirstPage} className="mt-3">
            <Text style={{ color: palette.blue }} className="text-body font-semibold">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View className="items-center rounded-2xl bg-nanny-surface p-6">
          <Text style={{ color: palette.muted }} className="text-body">No hay registros con estos filtros.</Text>
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
              className="ml-7 items-center rounded-2xl border border-nanny-border bg-nanny-bg py-3"
            >
              {loadingMore
                ? <ActivityIndicator color={palette.blue} />
                : <Text style={{ color: palette.blue }} className="text-body font-semibold">Cargar más</Text>}
            </TouchableOpacity>
          )}
          {error && items.length > 0 && (
            <Text style={{ color: palette.muted }} className="mt-2 text-center text-body">
              No se pudieron cargar más registros.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
