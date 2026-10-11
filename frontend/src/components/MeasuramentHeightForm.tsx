import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { API_URL } from '../api/config';

interface ActualizarAlturaModalProps {
  visible: boolean;  
  childId? : number | null;
  childName?: string;
  alturaAnterior?: number;
  onClose: () => void;
  onSuccess?: () => void;
}


export default function ActualizarAlturaModal({ 
  visible,  
  childId,
  childName = 'Sofía Ramírez',
  alturaAnterior = 116,
  onClose,
  onSuccess,
}: ActualizarAlturaModalProps) {
  
  const [nuevaAltura, setNuevaAltura] = useState('');
  const [fecha, setFecha] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (visible) {
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

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && selectedDate) {
        setFecha(selectedDate);
      }
    } else {
      if (selectedDate) {
        setFecha(selectedDate);
      }
    }
  };
  
  const handleGuardar = async () => {
      if (!childId || !nuevaAltura) return;
  
      setGuardando(true);
      try{
        const response = await fetch(`${API_URL}/measurements`, {
          method: 'POST',
          headers:{
            'Content-Type': 'application/json', // Le avisamos de que le mandamos un JSON
          },
          body: JSON.stringify({
            childId: childId,   
            date: fecha.toISOString(),
            height: parseFloat(nuevaAltura.replace(',', '.')), // Convertimos el texto "12,5" a número 12.5        
        }),
      });
  
      if(response.ok){
        setNuevaAltura(''); //Dejarlo limpio paral a próxima vez.
        onClose(); //cerrar el modal
        onSuccess?.();
      }else{
        const errorData = await response.json();
        console.error('El backend rechazó los datos:', errorData);
        alert('Error al guardar la medición');
      }
    }catch (error) {
      console.error('Error de red o conexión:', error);
      alert('No se pudo conectar con el servidor');
    } finally {
      setGuardando(false);
    }
  }
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      {/* Fondo oscuro semi-transparente */}
      <View className="flex-1 justify-end bg-black/40">
        
        {/* Contenedor principal blanco con esquinas redondeadas */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="bg-white rounded-t-[32px] pt-6 pb-10 px-6"
        >
          
          {/* Cabecera */}
          <View className="flex-row justify-between items-center pb-5 border-b border-gray-200 mb-6">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-nanny-muted text-base font-medium">Cancelar</Text>
            </TouchableOpacity>
            
            <Text className="text-lg font-bold text-nanny-text">Actualizar altura</Text>
            
            <TouchableOpacity
              onPress={handleGuardar}
              disabled= {guardando}
              >
              <Text className="text-nanny-muted text-base font-medium">Guardar</Text>
            </TouchableOpacity>
          </View>

          {/* Tarjeta de perfil (Niño) */}
          <View className="flex-row items-center bg-nanny-card p-4 rounded-2xl mb-6">
            <View className="w-12 h-12 bg-gray-300 rounded-full mr-4 overflow-hidden items-center justify-center">
              <Ionicons name="person" size={24} color="#808080" />
              {/* Aquí iría la <Image /> real si la tienes */}
            </View>
            <View>
              <Text className="font-bold text-nanny-text text-base">{childName}</Text>
              <Text className="text-nanny-muted text-sm mt-0.5">Altura anterior: {alturaAnterior} cm</Text>
            </View>
          </View>

          {/* Input: Nuevo valor */}
          <View className="mb-6">
            <Text className="text-nanny-muted text-sm mb-2 ml-1">Nuevo valor de altura *</Text>
            <View className="flex-row items-center bg-nanny-card rounded-2xl px-4 py-3 h-14">
              <TextInput
                className="flex-1 text-base text-nanny-text font-medium"
                placeholder="Ej. 118.5"
                placeholderTextColor="#a39d94"
                keyboardType="decimal-pad"
                value={nuevaAltura}
                onChangeText={setNuevaAltura}
              />
              {/* Botones de flechas (estilo spinner) */}
              <View className="flex-col bg-white rounded px-1 py-0.5 ml-2 mr-3 justify-center items-center">
                <Ionicons name="caret-up" size={10} color="#a39d94" />
                <Ionicons name="caret-down" size={10} color="#a39d94" />
              </View>
              <Text className="text-nanny-text font-bold text-base">cm</Text>
            </View>
          </View>

          {/* Input: Fecha */}
          <View className="mb-6">
            <Text className="text-nanny-muted text-sm mb-2 ml-1">Fecha de la medición *</Text>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
              className="flex-row items-center bg-nanny-card rounded-2xl px-4 py-3 h-14"
            >
              <Text className="flex-1 text-base text-nanny-text font-medium">
                {formatDate(fecha)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#3a3a3a" />
            </TouchableOpacity>

            {showDatePicker && (
              <View className="mt-2">
                <DateTimePicker
                  value={fecha}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  maximumDate={new Date()}
                  onChange={handleDateChange}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity 
                    onPress={() => setShowDatePicker(false)}
                    className="self-end py-1.5 px-4 bg-nanny-blue rounded-xl mt-2"
                  >
                    <Text className="text-white text-xs font-semibold">Listo</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Mensaje de Info inferior */}
          <View className="flex-row bg-[#f0f6fa] border border-[#d4e3f0] rounded-xl p-4 mt-2 mb-10">
            <Ionicons name="information-circle-outline" size={22} color="#6d83a1" style={{ marginTop: -1 }} />
            <Text className="text-nanny-blue text-sm ml-3 flex-1 leading-5 font-medium">
              La nueva medición se añadirá a la curva de crecimiento y actualizará el valor actual de altura.
            </Text>
          </View>

        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}