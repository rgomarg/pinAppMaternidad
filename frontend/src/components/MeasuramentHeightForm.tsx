import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { API_URL } from '../api/config';
import { SHADOWS } from '../theme';

// Configuración de idioma español para el calendario
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

if (!LocaleConfig.locales['es']) {
  LocaleConfig.locales['es'] = {
    monthNames: MONTHS,
    monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    dayNames: DAYS,
    dayNamesShort: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'],
    today: 'Hoy',
  };
}
LocaleConfig.defaultLocale = 'es';

const MIN_HEIGHT = 20; // 20 cm mínimo
const MAX_HEIGHT = 180; // 180 cm máximo

interface ActualizarAlturaModalProps {
  visible: boolean;  
  childId?: number | null;
  childName?: string;
  alturaAnterior?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ActualizarAlturaModal({ 
  visible,  
  childId,
  childName = 'Menor',
  alturaAnterior,
  onClose,
  onSuccess,
}: ActualizarAlturaModalProps) {
  
  const [nuevaAltura, setNuevaAltura] = useState('');
  const [fecha, setFecha] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (visible) {
      setNuevaAltura('');
      setFecha(new Date());
      setShowDatePicker(false);
    }
  }, [visible]);

  const formatDate = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const toYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseHeight = (val: string): number | null => {
    const trimmed = val.trim().replace(',', '.');
    if (!trimmed) return null;
    const num = parseFloat(trimmed);
    return isNaN(num) ? null : num;
  };

  const heightNum = parseHeight(nuevaAltura);
  const isTooHigh = heightNum !== null && heightNum > MAX_HEIGHT;
  const isTooLow = heightNum !== null && heightNum < MIN_HEIGHT;
  const isInvalid = heightNum !== null && (isTooHigh || isTooLow);
  const isValid = heightNum !== null && heightNum >= MIN_HEIGHT && heightNum <= MAX_HEIGHT;

  const getValidationMessage = () => {
    if (isTooHigh) return `La altura no puede superar los ${MAX_HEIGHT} cm`;
    if (isTooLow) return `La altura debe ser de al menos ${MIN_HEIGHT} cm`;
    return null;
  };

  const handleIncrement = () => {
    const current = heightNum ?? (alturaAnterior ?? 100);
    const next = Math.min(MAX_HEIGHT, Math.round((current + 0.5) * 10) / 10);
    setNuevaAltura(next.toString());
  };

  const handleDecrement = () => {
    const current = heightNum ?? (alturaAnterior ?? 100);
    const next = Math.max(MIN_HEIGHT, Math.round((current - 0.5) * 10) / 10);
    setNuevaAltura(next.toString());
  };

  const handleDayPress = (day: { dateString: string }) => {
    const [y, m, d] = day.dateString.split('-').map(Number);
    // Usamos las 12:00 para evitar desajustes de zona horaria al convertir a ISO string
    const nuevaFecha = new Date(y, m - 1, d, 12, 0, 0);
    setFecha(nuevaFecha);
    setShowDatePicker(false);
  };
  
  const handleGuardar = async () => {
    if (!childId) {
      Alert.alert('Error', 'No hay ningún menor seleccionado.');
      return;
    }
    const num = parseHeight(nuevaAltura);
    if (num === null) {
      Alert.alert('Valor requerido', 'Por favor, introduce un valor de altura.');
      return;
    }
    if (num < MIN_HEIGHT || num > MAX_HEIGHT) {
      Alert.alert(
        'Valor no válido',
        `La altura debe estar entre ${MIN_HEIGHT} cm y ${MAX_HEIGHT} cm.`
      );
      return;
    }

    setGuardando(true);
    try {
      const response = await fetch(`${API_URL}/measurements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          childId: childId,   
          date: fecha.toISOString(),
          height: num,        
        }),
      });

      if (response.ok) {
        setNuevaAltura('');
        onClose();
        onSuccess?.();
      } else {
        const errorData = await response.json();
        console.error('El backend rechazó los datos:', errorData);
        const msg = Array.isArray(errorData?.message) ? errorData.message.join('\n') : errorData?.message;
        Alert.alert('Error al guardar', msg || 'Error al guardar la medición');
      }
    } catch (error) {
      console.error('Error de red o conexión:', error);
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="bg-white rounded-t-[32px] pt-6 pb-8 px-6 max-h-[92%]"
        >
          {/* Cabecera */}
          <View className="flex-row justify-between items-center pb-4 border-b border-nanny-border mb-4">
            <TouchableOpacity onPress={onClose} disabled={guardando}>
              <Text className="text-nanny-muted text-body font-medium">Cancelar</Text>
            </TouchableOpacity>
            
            <Text className="text-subtitle font-semibold text-nanny-text">Actualizar altura</Text>
            
            <TouchableOpacity
              onPress={handleGuardar}
              disabled={guardando || !isValid}
            >
              <Text className={`text-body font-semibold ${isValid && !guardando ? 'text-nanny-blue' : 'text-nanny-subtle'}`}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Tarjeta de perfil (Niño) */}
            <View className="flex-row items-center bg-nanny-card p-4 rounded-3xl mb-5" style={SHADOWS.card}>
              <View className="w-12 h-12 bg-nanny-soft rounded-full mr-4 overflow-hidden items-center justify-center">
                <Ionicons name="person" size={24} color="#5A5A5E" />
              </View>
              <View>
                <Text className="font-semibold text-nanny-text text-body">{childName}</Text>
                <Text className="text-nanny-muted text-body mt-0.5">
                  Altura anterior: {alturaAnterior != null ? `${alturaAnterior} cm` : 'Sin registro previo'}
                </Text>
              </View>
            </View>

            {/* Input: Nuevo valor */}
            <View className="mb-5">
              <Text className="text-nanny-muted text-body mb-2 ml-1">Nuevo valor de altura *</Text>
              <View 
                className={`flex-row items-center bg-nanny-card rounded-2xl px-4 py-3 h-14 ${
                  isInvalid ? 'border border-red-400 bg-red-50/20' : ''
                }`}
              >
                <TextInput
                  className="flex-1 text-body text-nanny-text font-medium"
                  placeholder="Ej. 118.5"
                  placeholderTextColor="#9E9EA3"
                  keyboardType="decimal-pad"
                  value={nuevaAltura}
                  onChangeText={setNuevaAltura}
                />
                {/* Botones de flechas (estilo spinner funcional) */}
                <View className="flex-col bg-white rounded px-1.5 py-1 ml-2 mr-3 justify-center items-center shadow-sm">
                  <TouchableOpacity onPress={handleIncrement} hitSlop={{ top: 5, bottom: 2, left: 5, right: 5 }}>
                    <Ionicons name="caret-up" size={12} color="#46424A" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDecrement} hitSlop={{ top: 2, bottom: 5, left: 5, right: 5 }}>
                    <Ionicons name="caret-down" size={12} color="#46424A" />
                  </TouchableOpacity>
                </View>
                <Text className="text-nanny-text font-semibold text-body">cm</Text>
              </View>

              {getValidationMessage() ? (
                <Text className="text-red-500 text-caption mt-1.5 ml-1 font-medium">
                  {getValidationMessage()}
                </Text>
              ) : (
                <Text className="text-nanny-muted text-caption mt-1.5 ml-1">
                  Valores válidos: entre {MIN_HEIGHT} cm y {MAX_HEIGHT} cm.
                </Text>
              )}
            </View>

            {/* Input: Fecha */}
            <View className="mb-5">
              <Text className="text-nanny-muted text-body mb-2 ml-1">Fecha de la medición *</Text>
              <TouchableOpacity 
                onPress={() => setShowDatePicker(!showDatePicker)}
                activeOpacity={0.7}
                className="flex-row items-center bg-nanny-card rounded-2xl px-4 py-3 h-14"
              >
                <Text className="flex-1 text-body text-nanny-text font-medium">
                  {formatDate(fecha)}
                </Text>
                <Ionicons 
                  name={showDatePicker ? "chevron-up" : "calendar-outline"} 
                  size={20} 
                  color="#1C1C1E" 
                />
              </TouchableOpacity>

              {showDatePicker && (
                <View className="mt-2 bg-white rounded-2xl p-3 border border-nanny-border shadow-sm">
                  <View className="flex-row justify-between items-center pb-2 mb-2 border-b border-nanny-border">
                    <Text className="text-caption font-semibold text-nanny-muted uppercase">
                      Seleccionar fecha
                    </Text>
                    <TouchableOpacity 
                      onPress={() => setShowDatePicker(false)}
                      className="px-2 py-1 bg-nanny-soft rounded-lg"
                    >
                      <Text className="text-caption font-medium text-nanny-text">Cerrar</Text>
                    </TouchableOpacity>
                  </View>
                  <Calendar
                    firstDay={1}
                    maxDate={toYMD(new Date())}
                    current={toYMD(fecha)}
                    onDayPress={handleDayPress}
                    theme={{
                      calendarBackground: 'transparent',
                      textSectionTitleColor: '#46424A',
                      selectedDayBackgroundColor: '#46424A',
                      selectedDayTextColor: '#ffffff',
                      todayTextColor: '#46424A',
                      dayTextColor: '#1C1C1E',
                      textDisabledColor: '#9E9EA3',
                      arrowColor: '#46424A',
                      monthTextColor: '#1C1C1E',
                      textDayFontSize: 14,
                      textMonthFontSize: 16,
                      textDayHeaderFontSize: 12,
                    }}
                    renderArrow={(direction: 'left' | 'right') => (
                      <Ionicons 
                        name={direction === 'left' ? 'chevron-back' : 'chevron-forward'} 
                        size={20} 
                        color="#46424A" 
                      />
                    )}
                    markedDates={{
                      [toYMD(fecha)]: { selected: true, selectedColor: '#46424A' },
                    }}
                  />
                </View>
              )}
            </View>

            {/* Mensaje de Info inferior */}
            <View className="flex-row bg-nanny-soft border border-nanny-border-strong rounded-xl p-4 mt-2 mb-6">
              <Ionicons name="information-circle-outline" size={22} color="#46424A" style={{ marginTop: -1 }} />
              <Text className="text-nanny-blue text-body ml-3 flex-1 leading-5 font-medium">
                La nueva medición se añadirá a la curva de crecimiento y actualizará el valor actual de altura.
              </Text>
            </View>
          </ScrollView>

        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}