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
import {
  checkNotificationPermissions,
  scheduleLocalEventNotification,
  registerBackendNotification,
  NOTIFICATION_PERMISSION_REQUIRED_TITLE,
  NOTIFICATION_PERMISSION_REQUIRED_MESSAGE,
} from '../services/notificationService';

type Child = {
  id: number;
  name: string;
};

type EventTypeOption = 'GENERAL' | 'MEDICAL_APPOINTMENT' | 'VACCINE' | 'MEDICINE' | 'CONDITION';

const EVENT_TYPES: { id: EventTypeOption; label: string; icon: string; emoji: string }[] = [
  { id: 'GENERAL', label: 'General', icon: 'document-text-outline', emoji: '📋' },
  { id: 'MEDICINE', label: 'Medicamento', icon: 'medkit-outline', emoji: '💊' },
  { id: 'MEDICAL_APPOINTMENT', label: 'Cita médica', icon: 'pulse-outline', emoji: '🩺' },
  { id: 'VACCINE', label: 'Vacuna', icon: 'shield-outline', emoji: '💉' },
  { id: 'CONDITION', label: 'Síntoma', icon: 'bandage-outline', emoji: '🤒' },
];

export const SYMPTOMS_LIST: { id: string; label: string; emoji: string }[] = [
  { id: 'FEVER', label: 'Fiebre', emoji: '🌡️' },
  { id: 'COUGH', label: 'Tos', emoji: '🗣️' },
  { id: 'HEADACHE', label: 'Dolor de cabeza', emoji: '🤕' },
  { id: 'SORE_THROAT', label: 'Dolor de garganta', emoji: '🧣' },
  { id: 'VOMITING', label: 'Vómitos', emoji: '🤮' },
  { id: 'NAUSEA', label: 'Náuseas', emoji: '🤢' },
  { id: 'DIARRHEA', label: 'Diarrea', emoji: '💩' },
  { id: 'STOMACHACHE', label: 'Dolor de barriga', emoji: '😣' },
  { id: 'RUNNY_NOSE', label: 'Mocos', emoji: '🤧' },
  { id: 'NASAL_CONGESTION', label: 'Congestión nasal', emoji: '👃' },
  { id: 'SNEEZING', label: 'Estornudos', emoji: '🤧' },
  { id: 'EARACHE', label: 'Dolor de oído', emoji: '👂' },
  { id: 'FATIGUE', label: 'Cansancio', emoji: '🥱' },
  { id: 'IRRITABILITY', label: 'Irritabilidad', emoji: '😭' },
  { id: 'LOSS_OF_APPETITE', label: 'Falta de apetito', emoji: '🥣' },
  { id: 'TROUBLE_SLEEPING', label: 'Problemas para dormir', emoji: '😴' },
  { id: 'RASH', label: 'Erupción cutánea', emoji: '🩹' },
  { id: 'ITCHING', label: 'Picor', emoji: '🐜' },
  { id: 'CHILLS', label: 'Escalofríos', emoji: '🥶' },
  { id: 'DIZZINESS', label: 'Mareos', emoji: '💫' },
  { id: 'SHORTNESS_OF_BREATH', label: 'Dificultad al respirar', emoji: '🫁' },
  { id: 'WHEEZING', label: 'Pitidos al respirar', emoji: '🌬️' },
  { id: 'MUSCLE_PAIN', label: 'Dolor muscular', emoji: '💪' },
  { id: 'JOINT_PAIN', label: 'Dolor en articulaciones', emoji: '🦴' },
  { id: 'SWOLLEN_GLANDS', label: 'Ganglios inflamados', emoji: '🫧' },
  { id: 'RED_EYES', label: 'Ojos rojos', emoji: '👁️' },
  { id: 'WATERY_EYES', label: 'Ojos llorosos', emoji: '💧' },
  { id: 'CONSTIPATION', label: 'Estreñimiento', emoji: '🚽' },
  { id: 'CRAMPS', label: 'Calambres', emoji: '⚡' },
  { id: 'TOOTHACHE', label: 'Dolor de muelas', emoji: '🦷' },
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

  // Campos Síntomas (Condition)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [isSymptomsDropdownOpen, setIsSymptomsDropdownOpen] = useState(false);
  const [symptomSearch, setSymptomSearch] = useState('');

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId)
        ? prev.filter((id) => id !== symptomId)
        : [...prev, symptomId]
    );
  };

  const removeSymptom = (symptomId: string) => {
    setSelectedSymptoms((prev) => prev.filter((id) => id !== symptomId));
  };

  const handleSelectEventType = (type: EventTypeOption) => {
    setEventType(type);
    if (type === 'CONDITION') {
      setEnableNotification(false);
      const today = new Date();
      const selectedDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (selectedDay > todayDay) {
        setDate(today);
      }
    }
  };

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
    maximumDate?: Date,
  ) => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: currentValue,
        mode,
        is24Hour: true,
        maximumDate,
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
    const now = new Date();
    if (eventType === 'CONDITION') {
      const selectedDay = new Date(updated.getFullYear(), updated.getMonth(), updated.getDate());
      const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (selectedDay > todayDay) {
        setDate(now);
        return;
      }
    }
    if (eventType === 'VACCINE' && vaccineApplied && updated.getTime() > now.getTime()) {
      const isFutureDay = new Date(newDate).setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0);
      if (isFutureDay) {
        Alert.alert('Fecha no válida', 'La fecha de una vacuna ya aplicada no puede ser posterior a hoy.');
      } else {
        Alert.alert('Hora no válida', 'La hora no puede ser posterior a la actual para una vacuna ya aplicada.');
      }
      setDate(now);
      return;
    }
    setDate(updated);
  };

  const handleTimeChange = (newTime: Date) => {
    const updated = new Date(date);
    updated.setHours(newTime.getHours(), newTime.getMinutes(), 0, 0);
    const now = new Date();
    if (eventType === 'VACCINE' && vaccineApplied && updated.getTime() > now.getTime()) {
      Alert.alert('Hora no válida', 'No puedes seleccionar una hora posterior a la actual para una vacuna ya aplicada.');
      setDate(now);
      return;
    }
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

  // Manejo de activación de alerta desde el switch
  const handleToggleNotification = async (value: boolean) => {
    if (value) {
      const hasPermission = await checkNotificationPermissions();
      if (!hasPermission) {
        Alert.alert(
          NOTIFICATION_PERMISSION_REQUIRED_TITLE,
          NOTIFICATION_PERMISSION_REQUIRED_MESSAGE,
          [{ text: 'Entendido' }],
        );
        setEnableNotification(false);
        return;
      }
    }
    setEnableNotification(value);
  };

  // Validaciones y Guardado
  const handleSave = async () => {
    if (!selectedChildId) {
      return Alert.alert('Falta el hijo/a', 'Debes seleccionar a qué hijo se asigna este evento.');
    }

    if (eventType === 'CONDITION') {
      if (selectedSymptoms.length === 0) {
        return Alert.alert('Síntoma obligatorio', 'Por favor selecciona al menos un síntoma de la lista.');
      }
    } else {
      if (!title.trim()) {
        return Alert.alert('Campo obligatorio', 'Por favor introduce el nombre o título del registro.');
      }
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

    if (eventType === 'VACCINE' && vaccineApplied) {
      const now = new Date();
      if (date.getTime() > now.getTime()) {
        return Alert.alert('Fecha u hora no válida', 'No puedes registrar una vacuna ya aplicada con una fecha u hora posterior a la actual.');
      }
    }

    setSaving(true);

    try {
      if (eventType === 'CONDITION') {
        const res = await fetch(`${API_URL}/condition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tag: selectedSymptoms,
            timestamp: date.toISOString(),
            notes: notes.trim() || undefined,
            childId: selectedChildId,
          }),
        });
        if (!res.ok) throw new Error('Error al registrar el síntoma');
        navigation.goBack();
        return;
      }

      // Si el usuario intentó configurar alerta, comprobamos permisos a nivel de sistema del móvil
      let notificationAllowed = false;
      let permissionRestricted = false;

      if (enableNotification) {
        const hasPermissions = await checkNotificationPermissions();
        if (hasPermissions) {
          notificationAllowed = true;
        } else {
          // El sistema detecta la restricción del dispositivo
          permissionRestricted = true;
          notificationAllowed = false;
        }
      }

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
            notification: notificationAllowed,
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
            notification: notificationAllowed,
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
            notification: notificationAllowed,
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

      // Si los permisos están concedidos y se activó la notificación
      if (notificationAllowed && createdId && scheduledNotifTime) {
        try {
          const uniqueId = notifType === 'EVENT' ? createdId : `${notifType.toLowerCase()}-${createdId}`;
          const parsedInterval = parseInt(intervalHours, 10);
          await scheduleLocalEventNotification({
            eventId: uniqueId,
            itemType: notifType,
            title: notifTitle,
            body: notifBody,
            targetDate: scheduledNotifTime,
            advanceMinutes: 0,
            intervalHours: notifType === 'MEDICINE' && !isNaN(parsedInterval) ? parsedInterval : undefined,
            endDate: notifType === 'MEDICINE' ? endDate : undefined,
          });

          // Registrar también en el backend
          if (userId) {
            await registerBackendNotification({
              userId,
              eventId: notifType === 'EVENT' ? createdId : undefined,
              vaccineId: notifType === 'VACCINE' ? createdId : undefined,
              medicineId: notifType === 'MEDICINE' ? createdId : undefined,
              type: notifType,
              title: notifTitle,
              body: notifBody,
              scheduledAt: scheduledNotifTime.toISOString(),
            });
          }
        } catch (notifErr) {
          console.warn('Error al programar alerta en el dispositivo:', notifErr);
        }
      }

      // Si el dispositivo tenía las notificaciones desactivadas a nivel de sistema:
      // Se despliega el mensaje informativo indicado y se garantiza que el evento
      // se mantiene guardado en la agenda sin bloquear el uso del calendario.
      if (permissionRestricted) {
        Alert.alert(
          NOTIFICATION_PERMISSION_REQUIRED_TITLE,
          `${NOTIFICATION_PERMISSION_REQUIRED_MESSAGE}\n\nEl evento se ha guardado correctamente en tu calendario sin la alerta vinculada.`,
          [
            {
              text: 'Entendido',
              onPress: () => navigation.goBack(),
            },
          ],
          { cancelable: false },
        );
        return;
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
                onPress={() => handleSelectEventType(t.id)}
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

        {/* Selector Desplegable de Síntomas (Solo cuando es CONDITION) */}
        {eventType === 'CONDITION' && (
          <View className="mb-6">
            <Text className="mb-2 text-sm font-semibold text-[#8A7F75]">
              Síntomas del niño/a *
            </Text>

            {/* Botón que despliega la lista */}
            <TouchableOpacity
              onPress={() => setIsSymptomsDropdownOpen((prev) => !prev)}
              className="flex-row items-center justify-between rounded-2xl border border-[#e0d9c9] bg-[#ece6d9] px-4 py-3.5"
            >
              <View className="flex-row items-center flex-1 pr-2">
                <Text className="text-xl mr-2.5">🤒</Text>
                <Text
                  numberOfLines={1}
                  className={`text-base ${
                    selectedSymptoms.length > 0
                      ? 'font-semibold text-[#2B2B2B]'
                      : 'text-[#9a928b]'
                  }`}
                >
                  {selectedSymptoms.length > 0
                    ? `${selectedSymptoms.length} síntoma${
                        selectedSymptoms.length === 1 ? '' : 's'
                      } seleccionado${selectedSymptoms.length === 1 ? '' : 's'}`
                    : 'Toca para abrir la lista de síntomas...'}
                </Text>
              </View>
              <Ionicons
                name={isSymptomsDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={22}
                color="#5B5149"
              />
            </TouchableOpacity>

            {/* Menú desplegable con lista scrolleable y buscador */}
            {isSymptomsDropdownOpen && (
              <View className="mt-2 rounded-2xl border border-[#ded5c5] bg-[#fbf8f3] p-3 shadow-sm">
                {/* Buscador rápido de síntomas */}
                <View className="mb-2.5 flex-row items-center rounded-xl border border-[#e0d9c9] bg-[#ece6d9] px-3 py-2">
                  <Ionicons name="search" size={16} color="#8A7F75" style={{ marginRight: 6 }} />
                  <TextInput
                    value={symptomSearch}
                    onChangeText={setSymptomSearch}
                    placeholder="Buscar síntoma (ej. fiebre, tos...)"
                    placeholderTextColor="#9a928b"
                    className="flex-1 text-sm text-[#2B2B2B] p-0"
                  />
                  {symptomSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setSymptomSearch('')}>
                      <Ionicons name="close-circle" size={16} color="#8A7F75" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Lista scrolleable con altura fija */}
                <ScrollView
                  nestedScrollEnabled
                  style={{ maxHeight: 220 }}
                  showsVerticalScrollIndicator
                >
                  {SYMPTOMS_LIST.filter((s) =>
                    s.label.toLowerCase().includes(symptomSearch.toLowerCase())
                  ).map((s) => {
                    const isSel = selectedSymptoms.includes(s.id);
                    return (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => toggleSymptom(s.id)}
                        className={`flex-row items-center justify-between rounded-xl px-3 py-2.5 mb-1 ${
                          isSel ? 'bg-[#faece7]' : 'bg-transparent'
                        }`}
                      >
                        <View className="flex-row items-center flex-1 pr-2">
                          <Text className="mr-2 text-lg">{s.emoji}</Text>
                          <Text
                            className={`text-sm ${
                              isSel ? 'font-bold text-[#cc7a66]' : 'text-[#2B2B2B]'
                            }`}
                          >
                            {s.label}
                          </Text>
                        </View>
                        {isSel ? (
                          <Ionicons name="checkmark-circle" size={20} color="#cc7a66" />
                        ) : (
                          <Ionicons name="add-circle-outline" size={20} color="#b4a99a" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* SECCIÓN ABAJO: Síntomas seleccionados */}
            <View className="mt-4">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-xs font-semibold uppercase tracking-wider text-[#8A7F75]">
                  Síntomas seleccionados ({selectedSymptoms.length})
                </Text>
                {selectedSymptoms.length > 0 && (
                  <TouchableOpacity onPress={() => setSelectedSymptoms([])}>
                    <Text className="text-xs font-medium text-[#cc7a66]">
                      Borrar todos
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {selectedSymptoms.length === 0 ? (
                <View className="rounded-2xl border border-dashed border-[#d8cfbe] bg-[#f2ecdf]/50 p-4 items-center">
                  <Text className="text-xs text-[#8A7F75] text-center">
                    Ningún síntoma seleccionado todavía. Toca la lista desplegable de arriba para elegir.
                  </Text>
                </View>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {selectedSymptoms.map((symptomId) => {
                    const item = SYMPTOMS_LIST.find((s) => s.id === symptomId);
                    if (!item) return null;
                    return (
                      <View
                        key={item.id}
                        className="flex-row items-center rounded-2xl border border-[#cc7a66] bg-[#faece7] pl-3 pr-2 py-1.5"
                      >
                        <Text className="mr-1.5 text-base">{item.emoji}</Text>
                        <Text className="mr-2 text-sm font-bold text-[#cc7a66]">
                          {item.label}
                        </Text>
                        <TouchableOpacity
                          onPress={() => removeSymptom(item.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close-circle" size={18} color="#cc7a66" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Campo Título / Nombre (No necesario en Síntoma porque se eligen de la lista) */}
        {eventType !== 'CONDITION' && (
          <>
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
          </>
        )}

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
                    onPress={() => {
                      setVaccineApplied(applied);
                      if (applied) {
                        const now = new Date();
                        if (date.getTime() > now.getTime()) {
                          setDate(now);
                        }
                      }
                    }}
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
                : eventType === 'CONDITION'
                ? 'Fecha en que se detectó *'
                : 'Fecha *'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const maxDate =
                  eventType === 'CONDITION' || (eventType === 'VACCINE' && vaccineApplied)
                    ? new Date()
                    : undefined;
                openDateModal(date, 'date', handleDateChange, setShowDatePicker, maxDate);
              }}
              className="flex-row items-center justify-between rounded-2xl border border-[#e0d9c9] bg-[#ece6d9] px-4 py-3.5"
            >
              <Text className="text-base text-[#2B2B2B]">{formatDateStr(date)}</Text>
              <Ionicons name="calendar-outline" size={20} color="#2B2B2B" />
            </TouchableOpacity>
          </View>

          <View className="flex-1">
            <Text className="mb-2 text-sm font-semibold text-[#8A7F75]">Hora</Text>
            <TouchableOpacity
              onPress={() => {
                const maxDate = eventType === 'VACCINE' && vaccineApplied ? new Date() : undefined;
                openDateModal(date, 'time', handleTimeChange, setShowTimePicker, maxDate);
              }}
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
            maximumDate={
              eventType === 'CONDITION' || (eventType === 'VACCINE' && vaccineApplied)
                ? new Date()
                : undefined
            }
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
            maximumDate={eventType === 'VACCINE' && vaccineApplied ? new Date() : undefined}
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

        {/* Notas para Evento / Instrucciones para Medicamento / Notas para Síntoma */}
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
        ) : eventType === 'CONDITION' ? (
          <View className="mb-6">
            <Text className="mb-2 text-sm font-semibold text-[#8A7F75]">Notas sobre los síntomas</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Describe lo que quieras: intensidad, temperatura, comportamiento, indicaciones..."
              placeholderTextColor="#9a928b"
              multiline
              numberOfLines={4}
              style={{ minHeight: 100, textAlignVertical: 'top' }}
              className="rounded-2xl border border-[#e0d9c9] bg-[#ece6d9] px-4 py-3 text-base text-[#2B2B2B]"
            />
          </View>
        ) : eventType !== 'VACCINE' ? (
          <View className="mb-6">
            <Text className="mb-2 text-sm font-semibold text-[#8A7F75]">Notas</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Añade indicaciones o información relevante"
              placeholderTextColor="#9a928b"
              multiline
              numberOfLines={4}
              style={{ minHeight: 100, textAlignVertical: 'top' }}
              className="rounded-2xl border border-[#e0d9c9] bg-[#ece6d9] px-4 py-3 text-base text-[#2B2B2B]"
            />
          </View>
        ) : null}

        {/* Control de Notificaciones (No disponible para Síntomas) */}
        {eventType !== 'CONDITION' && (
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
                onValueChange={handleToggleNotification}
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
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
