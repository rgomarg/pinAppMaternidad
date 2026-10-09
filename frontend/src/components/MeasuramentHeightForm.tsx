import React, { useState } from 'react';
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

interface ActualizarAlturaModalProps {
  visible: boolean;
  onClose: () => void;
  childName?: string;
  alturaAnterior?: number;
}

export default function ActualizarAlturaModal({ 
  visible, 
  onClose, 
  childName = 'Sofía Ramírez',
  alturaAnterior = 116 
}: ActualizarAlturaModalProps) {
  
  const [nuevaAltura, setNuevaAltura] = useState('');
  const [fecha, setFecha] = useState('30/09/2026'); 

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
            
            <TouchableOpacity>
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
            <View className="flex-row items-center bg-nanny-card rounded-2xl px-4 py-3 h-14">
              <TextInput
                className="flex-1 text-base text-nanny-text font-medium"
                value={fecha}
                onChangeText={setFecha}
              />
              <TouchableOpacity>
                <Ionicons name="calendar-outline" size={20} color="#3a3a3a" />
              </TouchableOpacity>
            </View>
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