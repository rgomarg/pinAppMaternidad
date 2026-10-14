import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { API_URL } from '../api/config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

// Definición de tipos
interface Vaccine {
  id: number;
  name: string;
  appliedAt: string | null;
  scheduledFor: string | null;
}

interface Condition {
  id: number;
  tag: string[];
  description: string | null;
  timestamp: string;
}

interface Medicine {
  id: number;
  name: string;
  dosage: string;
  intervalHours: number | null;
  endDate: string | null;
}

interface ChildDashboard {
  id: number;
  name: string;
  birthDate: string;
  bloodGroup: string | null;
  allergies: string | null;
  vaccines: Vaccine[];
  conditions: Condition[];
  medicine: Medicine[];
}

export default function FamiliaScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  
  const childId: number | null = route.params?.childId ?? null;
  
  const [data, setData] = useState<ChildDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados para el modal de nueva vacuna
  const [modalVisible, setModalVisible] = useState(false);
  const [newVaccineName, setNewVaccineName] = useState('');
  const [newVaccineDate, setNewVaccineDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Función para obtener los datos del niño
  const fetchDashboardData = useCallback(async () => {
    if (childId === null) {
      setData(null);
      setErrorMessage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_URL}/child/${childId}/dashboard`);
      if (!res.ok) {
        throw new Error(`Error del servidor: ${res.status}`);
      }
      const json: ChildDashboard = await res.json();
      setData(json);
    } catch (err: any) {
      setErrorMessage(err.message || 'No se pudo conectar con el servidor');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  // Manejar el guardado de una nueva vacuna
  const handleAddVaccine = async () => {
    if (!newVaccineName.trim()) {
      return Alert.alert('Error', 'Introduce un nombre para la vacuna');
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/vaccine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newVaccineName,
          appliedAt: newVaccineDate.toISOString(),
          childId: data?.id || childId,
        }),
      });

      if (!response.ok) {
        throw new Error('No se pudo guardar la vacuna');
      }

      setModalVisible(false);
      setNewVaccineName('');
      setNewVaccineDate(new Date());
      await fetchDashboardData(); 
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Hubo un problema al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAllergy = () => {
    Alert.alert('Próximamente', 'La función para añadir alergias estará disponible pronto.');//oopsie
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f7f3ec', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6d83a1" />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f7f3ec', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <Text className="text-base font-semibold text-red-400 text-center mb-4">
          {errorMessage}
        </Text>
        <TouchableOpacity onPress={fetchDashboardData} className="bg-gray-800 px-5 py-2.5 rounded-xl">
          <Text className="text-white font-medium">Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (childId === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f7f3ec', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <Text className="text-base font-semibold text-gray-500 text-center">
          Selecciona un usuario con al menos un niño para ver sus datos.
        </Text>
      </View>
    );
  }

  const isSevereAllergy = data?.allergies?.toLowerCase().includes('severa');

  return (
    <View style={{ flex: 1, backgroundColor: '#f7f3ec', paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} style={{ flex: 1 }}>
        
        {/* Cabecera del niño */}
        <View className="flex-row items-center mb-6">
          <View className="w-[68px] h-[68px] rounded-full bg-[#ece6d9] items-center justify-center mr-4 border-2 border-white shadow-sm">
            <Text className="text-2xl font-bold text-[#6d83a1]">
              {data?.name?.charAt(0) || '?'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-[22px] font-bold text-gray-800">{data?.name}</Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              {data?.birthDate
                ? new Date(data.birthDate).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : ''}
            </Text>
            {data?.bloodGroup && (
              <View className="self-start bg-[#faebe8] px-2.5 py-0.5 rounded-full mt-1.5">
                <Text className="text-[11px] font-bold text-[#cc7a66]">
                  {`Sangre ${data.bloodGroup}`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Sección de Alergias */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-xs font-bold tracking-wider text-gray-500 uppercase">
              Alergias
            </Text>
            <TouchableOpacity onPress={handleAddAllergy}>
              <Text className="text-xs font-semibold text-[#65a882]">+ Añadir</Text>
            </TouchableOpacity>
          </View>

          {!data?.allergies || data.allergies === 'Ninguna conocida' ? (
            <View className="bg-[#ece6d9] p-3.5 rounded-2xl">
              <Text className="text-[13px] text-gray-500">Sin alergias registradas</Text>
            </View>
          ) : (
            <View
              className={`p-4 rounded-2xl flex-row items-center ${
                isSevereAllergy ? 'bg-[#faebe8] border border-[#cc7a66]' : 'bg-[#ece6d9]'
              }`}
            >
              {isSevereAllergy && (
                <View className="bg-[#cc7a66] px-2 py-0.5 rounded-md mr-3 flex-row items-center">
                  <Ionicons name="warning" size={10} color="white" style={{ marginRight: 4 }} />
                  <Text className="text-white text-[10px] font-bold">SEVERA</Text>
                </View>
              )}
              <Text className="text-sm font-semibold text-gray-800">{data.allergies}</Text>
            </View>
          )}
        </View>

        {/* Sección de Vacunas */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-xs font-bold tracking-wider text-gray-500 uppercase">
              Vacunas{' '}
              {data?.vaccines?.length
                ? `· ${data.vaccines.filter((v) => v.appliedAt).length}/${data.vaccines.length} Aplicadas`
                : ''}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Text className="text-xs font-semibold text-[#65a882]">+ Añadir</Text>
            </TouchableOpacity>
          </View>

          {!data?.vaccines || data.vaccines.length === 0 ? (
            <View className="bg-[#ece6d9] p-3.5 rounded-2xl">
              <Text className="text-[13px] text-gray-500">No hay vacunas registradas</Text>
            </View>
          ) : (
            data.vaccines.map((vac) => {
              const isApplied = Boolean(vac.appliedAt);
              return (
                <View key={vac.id} className="bg-[#ece6d9] p-3.5 rounded-2xl flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center flex-1 pr-2">
                    <View
                      className={`w-[26px] h-[26px] rounded-full items-center justify-center mr-3 ${
                        isApplied ? 'bg-[#e2f0e8]' : 'bg-[#fceed6]'
                      }`}
                    >
                      <Ionicons name={isApplied ? "checkmark" : "time-outline"} size={14} color={isApplied ? "#65a882" : "#c8823b"} />
                    </View>
                    <View>
                      <Text className="text-[14px] font-semibold text-gray-800">{vac.name}</Text>
                      <Text className="text-[11px] text-gray-500 mt-0.5">
                        {isApplied
                          ? `Aplicada: ${new Date(vac.appliedAt!).toLocaleDateString('es-ES')}`
                          : `Próxima: ${vac.scheduledFor ? new Date(vac.scheduledFor).toLocaleDateString('es-ES') : 'Pendiente'}`}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Modal para nueva vacuna */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-[#f7f3ec] p-6 rounded-t-3xl min-h-[300px]">
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-xl font-bold text-gray-800">Nueva vacuna</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="black" />
                </TouchableOpacity>
              </View>

              <Text className="text-[12px] font-semibold text-gray-500 mb-1.5">Nombre *</Text>
              <TextInput
                value={newVaccineName}
                onChangeText={setNewVaccineName}
                placeholder="Ej. Triple vírica"
                className="bg-[#ece6d9] p-4 rounded-xl mb-4 text-gray-800"
              />

              <Text className="text-[12px] font-semibold text-gray-500 mb-1.5">
                Fecha de aplicación
              </Text>
              <TouchableOpacity 
                onPress={() => setShowDatePicker(true)}
                className="bg-[#ece6d9] p-4 rounded-xl mb-6"
              >
                <Text className="text-gray-800">
                  {newVaccineDate.toLocaleDateString('es-ES')}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={newVaccineDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setNewVaccineDate(selectedDate);
                    }
                  }}
                />
              )}

              <View className="flex-row justify-end space-x-3 gap-3">
                <TouchableOpacity onPress={() => setModalVisible(false)} className="px-5 py-3 rounded-xl bg-[#ece6d9]">
                  <Text className="font-semibold text-gray-600">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddVaccine}
                  disabled={submitting}
                  className="px-5 py-3 rounded-xl bg-gray-800"
                >
                  {submitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="font-semibold text-white">Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}