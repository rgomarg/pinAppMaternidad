import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { API_URL } from '../api/config';
import * as Notifications from 'expo-notifications';

type Child = {
  id: number;
  name: string;
};

type EventTypeOption = 'GENERAL' | 'MEDICAL_APPOINTMENT' | 'VACCINE' | 'MEDICINE';

const EVENT_TYPES: { id: EventTypeOption; label: string; icon: string; emoji: string }[] = [
  { id: 'GENERAL', label: 'General', icon: 'document-text-outline', emoji: '📋' },
  { id: 'MEDICINE', label: 'Medicamento', icon: 'medkit-outline', emoji: '💊' },
  { id: 'MEDICAL_APPOINTMENT', label: 'Cita médica', icon: 'pulse-outline', emoji: '🩺' },
  { id: 'VACCINE', label: 'Vacuna', icon: 'shield-outline', emoji: '💉' },
];

const NOTIFICATION_ADVANCES = [
  { label: 'En el momento', minutes: 0 },
  { label: '15 min antes', minutes: 15 },
  { label: '30 min antes', minutes: 30 },
  { label: '1 h antes', minutes: 60 },
  { label: '1 día antes', minutes: 1440 },
];

export default function CrearEventoScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const userId = route.params?.userId;
  const initialDateStr = route.params?.selectedDate;

  // Estados de datos base
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(true);

  // Tipo de evento
  const [eventType, setEventType] = useState<EventTypeOption>('GENERAL');

  // Campos comunes / Evento puntual
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState<Date>(() => {
    if (initialDateStr) {
      const [y, m, d] = initialDateStr.split('-').map(Number);
      return new Date(y, m - 1, d, 9, 0, 0);
    }
    return new Date();
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Campos Vacuna
  const [vaccineApplied, setVaccineApplied] = useState(false);

  // Campos Medicamento
  const [dosage, setDosage] = useState('');
  const [intervalHours, setIntervalHours] = useState('8');
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [instructions, setInstructions] = useState('');

  // Notificaciones
  const [enableNotification, setEnableNotification] = useState(false);
  const [advanceMinutes, setAdvanceMinutes] = useState(15);

  const [saving, setSaving] = useState(false);

  // Cargar hijos del usuario
  useEffect(() => {
    let cancelled = false;

    async function loadChildren() {
      if (!userId) {
        setLoadingChildren(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/user/${userId}`);
        if (!res.ok) throw new Error('Error al cargar datos del usuario');
        const data = await res.json();
        if (!cancelled && Array.isArray(data.children)) {
          setChildren(data.children);
          if (data.children.length > 0) {
            setSelectedChildId(data.children[0].id);
          }
        }
      } catch (err) {
        console.error('Error cargando hijos:', err);
      } finally {
        if (!cancelled) setLoadingChildren(false);
      }
    }

    void loadChildren();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const selectedChild = children.find((c) => c.id === selectedChildId);

  // Selector de fecha nativo
  const openDateModal = (
    currentValue: Date,
    mode: 'date' | 'time',
    onSelect: (selected: Date) => void,
    fallbackIosSetter: (v: boolean) => void,
  ) => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: currentValue,
        mode,
        is24Hour: true,
        onChange: (event, selected) => {
          if (event.type === 'set' && selected) {
            onSelect(selected);
          }
        },
      });
    } else {
      fallbackIosSetter(true);
    }
  };

  const handleDateChange = (newDate: Date) => {
    const updated = new Date(date);
    updated.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
    setDate(updated);
  };

  const handleTimeChange = (newTime: Date) => {
    const updated = new Date(date);
    updated.setHours(newTime.getHours(), newTime.getMinutes(), 0, 0);
    setDate(updated);
  };

  const handleEndDateChange = (newDate: Date) => {
    const base = endDate ? new Date(endDate) : new Date(date);
    base.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
    setEndDate(base);
  };

  const handleEndTimeChange = (newTime: Date) => {
    const base = endDate ? new Date(endDate) : new Date(date);
    base.setHours(newTime.getHours(), newTime.getMinutes(), 0, 0);
    setEndDate(base);
  };

  // Validaciones y Guardado
  const handleSave = async () => {
    if (!selectedChildId) {
      return Alert.alert('Falta el hijo/a', 'Debes seleccionar a qué hijo se asigna este evento.');
    }
    if (!title.trim()) {
      return Alert.alert('Campo obligatorio', 'Por favor introduce el nombre o título del registro.');
    }

    if (eventType === 'MEDICINE') {
      if (!dosage.trim()) {
        return Alert.alert('Dosis obligatoria', 'Por favor especifica la dosis (ej. 2.5 ml).');
      }
      const parsedInterval = parseInt(intervalHours, 10);
      if (intervalHours.trim() && (isNaN(parsedInterval) || parsedInterval <= 0)) {
        return Alert.alert('Intervalo no válido', 'El intervalo debe ser un número entero de horas mayor a 0.');
      }
      if (endDate && endDate <= date) {
        return Alert.alert('Fecha de fin inválida', 'La fecha y hora de fin deben ser posteriores a las de inicio.');
      }
    }

    setSaving(true);

    try {
      let createdId: number | null = null;
      let scheduledNotifTime: Date | null = null;
      let notifTitle = '';
      let notifBody = '';
      let notifType: 'EVENT' | 'VACCINE' | 'MEDICINE' = 'EVENT';

      if (eventType === 'GENERAL' || eventType === 'MEDICAL_APPOINTMENT') {
        const res = await fetch(`${API_URL}/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: notes.trim() || undefined,
            date: date.toISOString(),
            type: eventType,
            childId: selectedChildId,
            notification: enableNotification,
          }),
        });
        if (!res.ok) throw new Error('Error al crear el evento');
        const createdEvent = await res.json();
        createdId = createdEvent.id;

        scheduledNotifTime = new Date(date.getTime() - advanceMinutes * 60 * 1000);
        notifTitle = eventType === 'MEDICAL_APPOINTMENT' ? `Cita médica: ${title}` : `Recordatorio: ${title}`;
        notifBody = `Evento para ${selectedChild?.name || 'tu hijo/a'}`;
        notifType = 'EVENT';
      } else if (eventType === 'VACCINE') {
        const res = await fetch(`${API_URL}/vaccine`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: title.trim(),
            childId: selectedChildId,
            appliedAt: vaccineApplied ? date.toISOString() : null,
            scheduledFor: !vaccineApplied ? date.toISOString() : null,
          }),
        });
        if (!res.ok) throw new Error('Error al registrar la vacuna');
        const createdVaccine = await res.json();
        createdId = createdVaccine.id;

        if (!vaccineApplied) {
          scheduledNotifTime = new Date(date.getTime() - advanceMinutes * 60 * 1000);
          notifTitle = `Recordatorio de vacuna: ${title}`;
          notifBody = `Vacuna programada para ${selectedChild?.name || 'tu hijo/a'}`;
          notifType = 'VACCINE';
        }
      } else if (eventType === 'MEDICINE') {
        const parsedInterval = parseInt(intervalHours, 10);
        const res = await fetch(`${API_URL}/medicine`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: title.trim(),
            dosage: dosage.trim(),
            intervalHours: isNaN(parsedInterval) ? undefined : parsedInterval,
            startDate: date.toISOString(),
            endDate: endDate ? endDate.toISOString() : null,
            instructions: instructions.trim() || undefined,
            childId: selectedChildId,
          }),
        });
        if (!res.ok) throw new Error('Error al registrar el medicamento');
        const createdMed = await res.json();
        createdId = createdMed.id;

        scheduledNotifTime = new Date(date.getTime() - advanceMinutes * 60 * 1000);
        notifTitle = `Toma de medicación: ${title}`;
        notifBody = `Administrar ${dosage.trim()} a ${selectedChild?.name || 'tu hijo/a'}`;
        notifType = 'MEDICINE';
      }

      // Si se activó la notificación y se calculó una fecha válida      
      if (enableNotification && createdId && scheduledNotifTime) {
        // 1. Programar la alerta nativa en el reloj del móvil
        try {
          const perm = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            },
          });
          if (perm.status === 'granted') {
            if (Platform.OS === 'android') {
              await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#6d83a1',
                sound: 'default',
              }).catch(()=> {});
            }

            const now = Date.now();
            let finalTriggerDate = scheduledNotifTime;
            // Si la fecha programada ya pasó o es para hoy en breves minutos y la antelación la sitúa en el pasado,
            // la ajustamos para sonar en 3 segundos para que el usuario la reciba
            if (finalTriggerDate.getTime() <= now) {
              finalTriggerDate = new Date(now + 3000);
            }

            const notifId = await Notifications.scheduleNotificationAsync({
              content: {
                title: notifTitle,
                body: notifBody,
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.HIGH,
                data: { screen: 'Calendario', id: createdId },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: finalTriggerDate,
                channelId: 'default',
              },
            });
            console.log('✅ Alerta nativa programada con éxito [ID:', notifId, '] para:', finalTriggerDate);
          } else {
            console.warn('⚠️ Permiso de notificaciones no concedido en el dispositivo.');
          }
        } catch (notifErr) {
          console.warn('Error al programar alerta en el dispositivo:', notifErr);
        }

        // 2. Guardar también en tu backend (para base de datos y registro)
        if (userId) {
          await fetch(`${API_URL}/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: notifTitle,
              body: notifBody,
              scheduledAt: scheduledNotifTime.toISOString(),
              userId,
              type: notifType,
              eventId: notifType === 'EVENT' ? createdId : undefined,
              vaccineId: notifType === 'VACCINE' ? createdId : undefined,
              medicineId: notifType === 'MEDICINE' ? createdId : undefined,
              data: { screen: 'Calendario', id: createdId },
            }),
          }).catch((err) => console.warn('No se pudo registrar en backend:', err));
        }
      }

      navigation.goBack();
    } catch (err: any) {
      console.error('Error guardando evento:', err);
      Alert.alert('Error', err.message || 'No se pudo guardar el registro. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const formatDateStr = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

  const formatTimeStr = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f3ec' }}>
      {/* Cabecera superior idéntica al diseño */}
      <View className="flex-row items-center justify-between border-b border-[#e0d9c9] px-6 py-4">
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={saving}>
          <Text className="text-base font-medium text-[#8A7F75]">Cancelar</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-[#2B2B2B]">Añadir evento</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#6d83a1" />
          ) : (
            <Text className="text-base font-semibold text-[#6d83a1]">Guardar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        {/* Tarjeta de selección de hijo */}
        <View className="mb-6 rounded-3xl border border-[#e0d9c9] bg-[#ece6d9] p-4">
          <View className="flex-row items-center">
            <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-full bg-[#6d83a1]/20">
              <Text className="text-xl font-bold text-[#6d83a1]">
                {selectedChild?.name ? selectedChild.name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-[#2B2B2B]">
                {selectedChild?.name ?? 'Selecciona un hijo/a'}
              </Text>
              <Text className="text-xs text-[#8A7F75]">El evento se añadirá a su calendario de salud.</Text>
            </View>
          </View>

          {/* Selector de hijos si hay más de 1 */}
          {children.length > 1 && (
            <View className="mt-3 flex-row flex-wrap gap-2 border-t border-[#ded6c7] pt-3">
              {children.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setSelectedChildId(c.id)}
                  className={`rounded-full px-3 py-1 border ${
                    selectedChildId === c.id
                      ? 'border-[#6d83a1] bg-[#6d83a1]'
                      : 'border-[#ddd5c6] bg-[#f7f3ec]'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      selectedChildId === c.id ? 'text-white' : 'text-[#5B5149]'
                    }`}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Tipo de evento (Cuadrícula 2x2 como en la imagen) */}
        <Text className="mb-2.5 text-sm font-semibold text-[#8A7F75]">Tipo de evento *</Text>
        <View className="mb-6 flex-row flex-wrap justify-between gap-y-3">
          {EVENT_TYPES.map((t) => {
            const isSelected = eventType === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setEventType(t.id)}
                className={`w-[48%] flex-row items-center rounded-2xl border p-4 ${
                  isSelected
                    ? 'border-[#cc7a66] bg-[#faece7]'
                    : 'border-[#e0d9c9] bg-[#ece6d9]'
                }`}
              >
                <Text className="mr-2.5 text-xl">{t.emoji}</Text>
                <Text
                  className={`text-base ${
                    isSelected ? 'font-bold text-[#cc7a66]' : 'font-medium text-[#5B5149]'
                  }`}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Campo Título / Nombre */}
        <Text className="mb-2 text-sm font-semibold text-[#8A7F75]">
          {eventType === 'MEDICINE'
            ? 'Nombre del medicamento *'
            : eventType === 'VACCINE'
            ? 'Nombre de la vacuna *'
            : 'Título *'}
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={
            eventType === 'MEDICINE'
              ? 'Ej. Apiretal 100 mg/ml'
              : eventType === 'VACCINE'
              ? 'Ej. Meningitis B'
              : eventType === 'MEDICAL_APPOINTMENT'
              ? 'Ej. Revisión de los 6 meses'
              : 'Ej. Resfriado común'
          }
          placeholderTextColor="#9a928b"
          className="mb-6 rounded-2xl border border-[#e0d9c9] bg-[#ece6d9] px-4 py-3.5 text-base text-[#2B2B2B]"
        />

        {/* Campos adicionales para VACUNA */}
        {eventType === 'VACCINE' && (
          <View className="mb-6">
            <Text className="mb-2 text-sm font-semibold text-[#8A7F75]">Estado de la vacuna *</Text>
            <View className="flex-row gap-3">
              {[false, true].map((applied) => {
                const selected = vaccineApplied === applied;
                return (
                  <TouchableOpacity
                    key={String(applied)}
                    onPress={() => setVaccineApplied(applied)}
                    className={`flex-1 items-center rounded-2xl border py-3 ${
                      selected
                        ? 'border-[#6d83a1] bg-[#dce7f1]'
                        : 'border-[#e0d9c9] bg-[#ece6d9]'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        selected ? 'text-[#6d83a1]' : 'text-[#8A7F75]'
                      }`}
                    >
                      {applied ? 'Ya aplicada' : 'Pendiente'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Campos adicionales para MEDICAMENTO */}
        {eventType === 'MEDICINE' && (
          <>
            <View className="mb-6 flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-2 text-sm font-semibold text-[#8A7F75]">Dosis *</Text>
                <TextInput
                  value={dosage}
                  onChangeText={setDosage}
                  placeholder="Ej. 2.5 ml"
                  placeholderTextColor="#9a928b"
                  className="rounded-2xl border border-[#e0d9c9] bg-[#ece6d9] px-4 py-3.5 text-base text-[#2B2B2B]"
                />
              </View>
              <View className="flex-1">
                <Text className="mb-2 text-sm font-semibold text-[#8A7F75]">Intervalo (horas)</Text>
                <TextInput
                  value={intervalHours}
                  onChangeText={setIntervalHours}
                  keyboardType="numeric"
                  placeholder="Ej. 8"
                  placeholderTextColor="#9a928b"
                  className="rounded-2xl border border-[#e0d9c9] bg-[#ece6d9] px-4 py-3.5 text-base text-[#2B2B2B]"
                />
              </View>
            </View>
          </>
        )}

        {/* Fila Fecha y Hora (igual a la imagen) */}
        <View className="mb-6 flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-2 text-sm font-semibold text-[#8A7F75]">
              {eventType === 'MEDICINE'
                ? 'Fecha de inicio *'
                : eventType === 'VACCINE'
                ? vaccineApplied
                  ? 'Fecha de aplicación *'
                  : 'Fecha prevista *'
                : 'Fecha *'}
            </Text>
            <TouchableOpacity
              onPress={() => openDateModal(date, 'date', handleDateChange, setShowDatePicker)}
              className="flex-row items-center justify-between rounded-2xl border border-[#e0d9c9] bg-[#ece6d9] px-4 py-3.5"
            >
              <Text className="text-base text-[#2B2B2B]">{formatDateStr(date)}</Text>
              <Ionicons name="calendar-outline" size={20} color="#2B2B2B" />
            </TouchableOpacity>
          </View>

          <View className="flex-1">
            <Text className="mb-2 text-sm font-semibold text-[#8A7F75]">Hora</Text>
            <TouchableOpacity
              onPress={() => openDateModal(date, 'time', handleTimeChange, setShowTimePicker)}
              className="flex-row items-center justify-between rounded-2xl border border-[#e0d9c9] bg-[#ece6d9] px-4 py-3.5"
            >
              <Text className="text-base text-[#2B2B2B]">{formatTimeStr(date)}</Text>
              <Ionicons name="time-outline" size={20} color="#2B2B2B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* iOS Pickers */}
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(_, sel) => {
              setShowDatePicker(false);
              if (sel) handleDateChange(sel);
            }}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={date}
            mode="time"
            display="default"
            onChange={(_, sel) => {
              setShowTimePicker(false);
              if (sel) handleTimeChange(sel);
            }}
          />
        )}

        {/* Fila Fecha y Hora de FIN (Siempre visible para medicamentos, opcional, con fecha y hora) */}
        {eventType === 'MEDICINE' && (
          <View className="mb-6">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-[#8A7F75]">
                Fecha y hora de fin (opcional)
              </Text>
              
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <TouchableOpacity
                  onPress={() =>
                    openDateModal(
                      endDate || new Date(date),
                      'date',
                      handleEndDateChange,
                      setShowEndDatePicker,
                    )
                  }
                  className="flex-row items-center justify-between rounded-2xl border border-[#e0d9c9] bg-[#ece6d9] px-4 py-3.5"
                >
                  <Text
                    className={`text-base ${
                      endDate ? 'text-[#2B2B2B]' : 'text-[#9a928b]'
                    }`}
                  >
                    {endDate ? formatDateStr(endDate) : 'dd/mm/aaaa'}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={endDate ? '#2B2B2B' : '#9a928b'}
                  />
                </TouchableOpacity>
              </View>

              <View className="flex-1">
                <TouchableOpacity
                  onPress={() =>
                    openDateModal(
                      endDate || new Date(date),
                      'time',
                      handleEndTimeChange,
                      setShowEndTimePicker,
                    )
                  }
                  className="flex-row items-center justify-between rounded-2xl border border-[#e0d9c9] bg-[#ece6d9] px-4 py-3.5"
                >
                  <Text
                    className={`text-base ${
                      endDate ? 'text-[#2B2B2B]' : 'text-[#9a928b]'
                    }`}
                  >
                    {endDate ? formatTimeStr(endDate) : '--:--'}
                  </Text>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={endDate ? '#2B2B2B' : '#9a928b'}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <Text className="mt-1.5 text-xs text-[#8A7F75]">
              Déjalo en blanco si se trata de un tratamiento continuo o crónico.
            </Text>

            {/* Pickers iOS para Fin */}
            {showEndDatePicker && (
              <DateTimePicker
                value={endDate || new Date(date)}
                mode="date"
                display="default"
                onChange={(_, sel) => {
                  setShowEndDatePicker(false);
                  if (sel) handleEndDateChange(sel);
                }}
              />
            )}
            {showEndTimePicker && (
              <DateTimePicker
                value={endDate || new Date(date)}
                mode="time"
                display="default"
                onChange={(_, sel) => {
                  setShowEndTimePicker(false);
                  if (sel) handleEndTimeChange(sel);
                }}
              />
            )}
          </View>
        )}

        {/* Notas para Evento / Instrucciones para Medicamento */}
        {eventType === 'MEDICINE' ? (
          <View className="mb-6">
            <Text className="mb-2 text-sm font-semibold text-[#8A7F75]">Instrucciones</Text>
            <TextInput
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Ej. Tomar después de las comidas o con abundante agua"
              placeholderTextColor="#9a928b"
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
              className="rounded-2xl border border-[#e0d9c9] bg-[#ece6d9] px-4 py-3 text-base text-[#2B2B2B]"
            />
          </View>
        ) : eventType !== 'VACCINE' ? (
          <View className="mb-6">
            <Text className="mb-2 text-sm font-semibold text-[#8A7F75]">Notas</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Añade síntomas, indicaciones o información relevante"
              placeholderTextColor="#9a928b"
              multiline
              numberOfLines={4}
              style={{ minHeight: 100, textAlignVertical: 'top' }}
              className="rounded-2xl border border-[#e0d9c9] bg-[#ece6d9] px-4 py-3 text-base text-[#2B2B2B]"
            />
          </View>
        ) : null}

        {/* Control de Notificaciones */}
        <View className="mb-8 rounded-3xl border border-[#e0d9c9] bg-[#ece6d9] p-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-base font-bold text-[#2B2B2B]">Recordatorio</Text>
              <Text className="text-xs text-[#8A7F75]">
                {eventType === 'MEDICINE'
                  ? 'Aviso para la toma según la pauta'
                  : 'Recibe una alerta en tu dispositivo'}
              </Text>
            </View>
            <Switch
              value={enableNotification}
              onValueChange={setEnableNotification}
              trackColor={{ false: '#ded6c7', true: '#6d83a1' }}
            />
          </View>

          {enableNotification && (
            <View className="mt-4 border-t border-[#ded6c7] pt-4">
              <Text className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[#8A7F75]">
                Antelación del aviso
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {NOTIFICATION_ADVANCES.map((item) => {
                  const selected = advanceMinutes === item.minutes;
                  return (
                    <TouchableOpacity
                      key={item.minutes}
                      onPress={() => setAdvanceMinutes(item.minutes)}
                      className={`rounded-full px-3 py-1.5 border ${
                        selected
                          ? 'border-[#6d83a1] bg-[#6d83a1]'
                          : 'border-[#ddd5c6] bg-[#f7f3ec]'
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          selected ? 'text-white' : 'text-[#5B5149]'
                        }`}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {eventType === 'MEDICINE' && (
                <Text className="mt-3 text-xs italic text-[#7A726A]">
                  ℹ️ Se programará la alerta para la próxima toma. Una vez enviada, el sistema programará la siguiente automáticamente sin saturar tu calendario.
                </Text>
              )}

              <TouchableOpacity
                onPress={async () => {
                  try {
                    await Notifications.requestPermissionsAsync();
                    if (Platform.OS === 'android') {
                      await Notifications.setNotificationChannelAsync('default', {
                        name: 'default',
                        importance: Notifications.AndroidImportance.MAX,
                        vibrationPattern: [0, 250, 250, 250],
                        lightColor: '#6d83a1',
                        sound: 'default',
                      }).catch(() => {});
                    }
                    await Notifications.scheduleNotificationAsync({
                      content: {
                        title: '🔔 Alerta de prueba',
                        body: '¡Las alertas funcionan perfectamente en tu dispositivo!',
                        sound: 'default',
                        priority: Notifications.AndroidNotificationPriority.HIGH,
                      },
                      trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                        seconds: 2,
                        channelId: 'default',
                      },
                    });
                    Alert.alert('Prueba en curso', 'En 2 segundos sonará la alerta en tu dispositivo.');
                  } catch (e: any) {
                    Alert.alert('Error', e?.message || 'Error desconocido');
                  }
                }}
                className="mt-3.5 flex-row items-center justify-center rounded-xl border border-[#6d83a1] bg-[#eef3f8] py-2.5 px-4"
              >
                <Ionicons name="notifications-outline" size={16} color="#6d83a1" />
                <Text className="ml-2 text-xs font-semibold text-[#6d83a1]">
                  Probar alerta ahora (sonará en 2s)
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}