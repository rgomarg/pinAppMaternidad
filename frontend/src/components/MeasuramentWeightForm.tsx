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

const MIN_WEIGHT = 0.5; // 0.5 kg mínimo
const MAX_WEIGHT = 80;  // 80 kg máximo

interface ActualizarPesoModalProps {
  visible: boolean;
  childId?: number | null;
  childName?: string;
  pesoAnterior?: number;
  onClose: () => void;
  onSuccess?: () => void; 
}

export default function ActualizarPesoModal({ 
  visible,    
  childId,  
  childName = 'Menor',
  pesoAnterior,
  onClose,
  onSuccess,
}: ActualizarPesoModalProps) {
  
  const [nuevoPeso, setNuevoPeso] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [fecha, setFecha] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setNuevoPeso('');
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

  const parseWeight = (val: string): number | null => {
    const trimmed = val.trim().replace(',', '.');
    if (!trimmed) return null;
    const num = parseFloat(trimmed);
    return isNaN(num) ? null : num;
  };

  const weightNum = parseWeight(nuevoPeso);
  const isTooHigh = weightNum !== null && weightNum > MAX_WEIGHT;
  const isTooLow = weightNum !== null && weightNum < MIN_WEIGHT;
  const isInvalid = weightNum !== null && (isTooHigh || isTooLow);
  const isValid = weightNum !== null && weightNum >= MIN_WEIGHT && weightNum <= MAX_WEIGHT;

  const getValidationMessage = () => {
    if (isTooHigh) return `El peso no puede superar los ${MAX_WEIGHT} kg`;
    if (isTooLow) return `El peso debe ser de al menos ${MIN_WEIGHT} kg`;
    return null;
  };

  const handleIncrement = () => {
    const current = weightNum ?? (pesoAnterior ?? 10);
    const next = Math.min(MAX_WEIGHT, Math.round((current + 0.1) * 10) / 10);
    setNuevoPeso(next.toString());
  };

  const handleDecrement = () => {
    const current = weightNum ?? (pesoAnterior ?? 10);
    const next = Math.max(MIN_WEIGHT, Math.round((current - 0.1) * 10) / 10);
    setNuevoPeso(next.toString());
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
    const num = parseWeight(nuevoPeso);
    if (num === null) {
      Alert.alert('Valor requerido', 'Por favor, introduce un valor de peso.');
      return;
    }
    if (num < MIN_WEIGHT || num > MAX_WEIGHT) {
      Alert.alert(
        'Valor no válido',
        `El peso debe estar entre ${MIN_WEIGHT} kg y ${MAX_WEIGHT} kg.`
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
          weight: num,        
        }),
      });

      if (response.ok) {
        setNuevoPeso('');
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
          <View className="flex-row justify-between items-center pb-4 border-b border-gray-200 mb-4">
            <TouchableOpacity onPress={onClose} disabled={guardando}>
              <Text className="text-nanny-muted text-base font-medium">Cancelar</Text>
            </TouchableOpacity>
            
            <Text className="text-lg font-bold text-nanny-text">Actualizar peso</Text>
            
            <TouchableOpacity
              onPress={handleGuardar}
              disabled={guardando || !isValid}
            >
              <Text className={`text-base font-bold ${isValid && !guardando ? 'text-nanny-blue' : 'text-gray-300'}`}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Tarjeta de perfil (Niño) */}
            <View className="flex-row items-center bg-nanny-card p-4 rounded-2xl mb-5">
              <View className="w-12 h-12 bg-gray-300 rounded-full mr-4 overflow-hidden items-center justify-center">
                <Ionicons name="person" size={24} color="#808080" />
              </View>
              <View>
                <Text className="font-bold text-nanny-text text-base">{childName}</Text>
                <Text className="text-nanny-muted text-sm mt-0.5">
                  Peso anterior: {pesoAnterior != null ? `${pesoAnterior} kg` : 'Sin registro previo'}
                </Text>
              </View>
            </View>

            {/* Input: Nuevo valor */}
            <View className="mb-5">
              <Text className="text-nanny-muted text-sm mb-2 ml-1">Nuevo valor de peso *</Text>
              <View 
                className={`flex-row items-center bg-nanny-card rounded-2xl px-4 py-3 h-14 ${
                  isInvalid ? 'border border-red-400 bg-red-50/20' : ''
                }`}
              >
                <TextInput
                  className="flex-1 text-base text-nanny-text font-medium"
                  placeholder="Ej. 12.5"
                  placeholderTextColor="#a39d94"
                  keyboardType="decimal-pad"
                  value={nuevoPeso}
                  onChangeText={setNuevoPeso}
                />
                {/* Botones de flechas (estilo spinner funcional) */}
                <View className="flex-col bg-white rounded px-1.5 py-1 ml-2 mr-3 justify-center items-center shadow-sm">
                  <TouchableOpacity onPress={handleIncrement} hitSlop={{ top: 5, bottom: 2, left: 5, right: 5 }}>
                    <Ionicons name="caret-up" size={12} color="#6d83a1" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDecrement} hitSlop={{ top: 2, bottom: 5, left: 5, right: 5 }}>
                    <Ionicons name="caret-down" size={12} color="#6d83a1" />
                  </TouchableOpacity>
                </View>
                <Text className="text-nanny-text font-bold text-base">kg</Text>
              </View>

              {getValidationMessage() ? (
                <Text className="text-red-500 text-xs mt-1.5 ml-1 font-medium">
                  {getValidationMessage()}
                </Text>
              ) : (
                <Text className="text-nanny-muted text-xs mt-1.5 ml-1">
                  Valores válidos: entre {MIN_WEIGHT} kg y {MAX_WEIGHT} kg.
                </Text>
              )}
            </View>

            {/* Input: Fecha */}
            <View className="mb-5">
              <Text className="text-nanny-muted text-sm mb-2 ml-1">Fecha de la medición *</Text>
              <TouchableOpacity 
                onPress={() => setShowDatePicker(!showDatePicker)}
                activeOpacity={0.7}
                className="flex-row items-center bg-nanny-card rounded-2xl px-4 py-3 h-14"
              >
                <Text className="flex-1 text-base text-nanny-text font-medium">
                  {formatDate(fecha)}
                </Text>
                <Ionicons 
                  name={showDatePicker ? "chevron-up" : "calendar-outline"} 
                  size={20} 
                  color="#3a3a3a" 
                />
              </TouchableOpacity>

              {showDatePicker && (
                <View className="mt-2 bg-white rounded-2xl p-3 border border-gray-200 shadow-sm">
                  <View className="flex-row justify-between items-center pb-2 mb-2 border-b border-gray-100">
                    <Text className="text-xs font-semibold text-nanny-muted uppercase">
                      Seleccionar fecha
                    </Text>
                    <TouchableOpacity 
                      onPress={() => setShowDatePicker(false)}
                      className="px-2 py-1 bg-gray-100 rounded-lg"
                    >
                      <Text className="text-xs font-medium text-nanny-text">Cerrar</Text>
                    </TouchableOpacity>
                  </View>
                  <Calendar
                    firstDay={1}
                    maxDate={toYMD(new Date())}
                    current={toYMD(fecha)}
                    onDayPress={handleDayPress}
                    theme={{
                      calendarBackground: 'transparent',
                      textSectionTitleColor: '#6d83a1',
                      selectedDayBackgroundColor: '#6d83a1',
                      selectedDayTextColor: '#ffffff',
                      todayTextColor: '#6d83a1',
                      dayTextColor: '#2d3748',
                      textDisabledColor: '#cbd5e1',
                      arrowColor: '#6d83a1',
                      monthTextColor: '#2d3748',
                      textDayFontSize: 14,
                      textMonthFontSize: 16,
                      textDayHeaderFontSize: 12,
                    }}
                    renderArrow={(direction: 'left' | 'right') => (
                      <Ionicons 
                        name={direction === 'left' ? 'chevron-back' : 'chevron-forward'} 
                        size={20} 
                        color="#6d83a1" 
                      />
                    )}
                    markedDates={{
                      [toYMD(fecha)]: { selected: true, selectedColor: '#6d83a1' },
                    }}
                  />
                </View>
              )}
            </View>

            {/* Mensaje de Info inferior */}
            <View className="flex-row bg-[#f0f6fa] border border-[#d4e3f0] rounded-xl p-4 mt-2 mb-6">
              <Ionicons name="information-circle-outline" size={22} color="#6d83a1" style={{ marginTop: -1 }} />
              <Text className="text-nanny-blue text-sm ml-3 flex-1 leading-5 font-medium">
                La nueva medición se añadirá a la curva de crecimiento y actualizará el valor actual de peso.
              </Text>
            </View>
          </ScrollView>

        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}