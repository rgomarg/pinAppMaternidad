import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; 
import { API_URL } from '../api/config';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';

import ActualizarAlturaModal from '../components/MeasuramentHeightForm';
import ActualizarPesoModal from '../components/MeasuramentWeightForm';
import GrowthChart, { formatMonthYear } from '../components/GrowthChart';
import { useGrowth } from '../hooks/useGrowth';


export default function HomeScreen() {
  const [activeChildId, setActiveChildId] = useState<number | null>(null);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [modalAlturaVisible, setModalAlturaVisible] = useState(false);
  const [modalPesoVisible, setModalPesoVisible] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const updateFamiliaChild = (childId: number | null) => {
    const familiaKey = navigation.getState().routes.find((r: any) => r.name === 'Familia')?.key;
    if (familiaKey) {
      navigation.dispatch({
        ...CommonActions.setParams({ childId }),
        source: familiaKey,
      });
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/user`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        console.error("Error fetching users, response was not an array:", data);
        setUsers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchChildren = async (userId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/user/${userId}`);
      const data = await response.json();
      if (data && data.children) {
        setChildren(data.children);
        if (data.children.length > 0) {
          setActiveChildId(data.children[0].id);
          updateFamiliaChild(data.children[0].id);
        } else {
          setActiveChildId(null);
          updateFamiliaChild(null);
        }
      }
    } catch (error) {
      console.error("Error fetching children:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() =>{
      if(activeUserId) {
        fetchChildren(activeUserId);
      }
    }, [activeUserId]))

  const handleSelectUser = (userId: number) => {
    setActiveUserId(userId);
    setIsUserModalVisible(false);
    fetchChildren(userId);

    // El calendario usa este usuario para cargar sus hijos y los eventos del día.
    const calendarioKey = navigation.getState().routes.find((r: any) => r.name === 'Calendario')?.key;
    if (calendarioKey) {
      navigation.dispatch({ ...CommonActions.setParams({ userId }), source: calendarioKey });
    }
  };

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const activeChild = children.find(c => c.id === activeChildId);
  const growth = useGrowth(activeChild);
  const proyeccionPeso = growth.data?.weight?.projection.at(-1);
  const proyeccionAltura = growth.data?.height?.projection.at(-1);

  const medicionesPeso = activeChild?.measurements?.filter((m: any) => m.weight != null) || [];
  const pesoActual = medicionesPeso[0]?.weight;
  const pesoAnterior = medicionesPeso[1]?.weight;
  const difPeso = (pesoActual != null && pesoAnterior != null) ? (pesoActual - pesoAnterior).toFixed(1) : null;

  const medicionesAltura = activeChild?.measurements?.filter((m: any) => m.height != null) || [];
  const alturaActual = medicionesAltura[0]?.height;
  const alturaAnterior = medicionesAltura[1]?.height;
  const difAltura = (alturaActual != null && alturaAnterior != null) ? (alturaActual - alturaAnterior).toFixed(1) : null;

  const goToCalendar = () => {
      // si ya lo ha elegido, se le pasa la informacion
      navigation.navigate('Calendario', { userId: activeUserId });
    }

  const goToChildRegistration = () => {
    if (!activeUserId) {
      alert("Primero debes seleccionar un usuario arriba a la derecha.");
      return;
    }
      // si ya lo ha elegido, se le pasa la informacion

      navigation.navigate('RegistroHijo', { userId: activeUserId });
    }

  return (
    <View style={{ flex: 1, backgroundColor: '#f7f3ec', paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }} style={{ flex: 1 }}>
        
        {/* Header */}
        <View className="flex-row justify-between items-start mb-6">
          <View>
            <Text className="text-sm font-medium text-nanny-muted mb-1">Predicciones e insights</Text>
            {activeChild ? (
              <Text className="text-3xl font-semibold text-nanny-text">{activeChild.name}</Text>
            ) : (
              <Text className="text-xl font-semibold text-nanny-text italic">Selecciona un usuario</Text>
            )}
          </View>
          
          <TouchableOpacity 
            onPress={() => { fetchUsers(); setIsUserModalVisible(true); }}
            className="w-12 h-12 bg-nanny-blue rounded-full items-center justify-center relative"
          >
            <Text className="text-white font-semibold text-lg">
              {activeUserId ? activeUserId.toString() : "?"}
            </Text>
            <View className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
              <View className="bg-nanny-blue rounded-full w-4 h-4 items-center justify-center">
                <Ionicons name="person" size={10} color="white" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color="#6d83a1" />
        ) : (
          <>
            {/* Child Selector */}
            {children.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-6">
                <View className="flex-row gap-3">
                  {children.map((child) => (
                    <TouchableOpacity
                      key={child.id}
                      onPress={() => {
                        setActiveChildId(child.id);
                        updateFamiliaChild(child.id);
                      }}
                      className={`flex-row items-center gap-2 px-4 py-2 rounded-full font-medium ${
                        activeChildId === child.id ? 'bg-nanny-blue' : 'bg-nanny-card'
                      }`}
                    >
                      <View className="w-6 h-6 rounded-full bg-orange-200 items-center justify-center overflow-hidden">
                        <Text className="text-xs font-bold text-black">{child?.name?.charAt(0) || '?'}</Text>
                      </View>
                      <Text className={`font-semibold ${activeChildId === child.id ? 'text-white' : 'text-nanny-text'}`}>
                        {child.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            {/* Stats Cards */}
            {activeChild && (
              <View className="flex-row gap-4 mb-6">
                {/* Peso */}
                <View className="flex-1 bg-nanny-card p-4 rounded-2xl relative">
                  <TouchableOpacity 
                    onPress={() => setModalPesoVisible(true)}
                    className="absolute top-4 right-4 w-10 h-10 bg-blue-100 rounded-full items-center justify-center">                    
                    <Ionicons name="add" size={16} color="#6d83a1" />
                  </TouchableOpacity>
                  <Text className="text-nanny-muted text-sm font-medium mb-2">Peso actual</Text>
                  <View className="flex-row items-baseline gap-1 mb-1">
                    <Text className="text-3xl font-bold text-nanny-text">
                      {pesoActual ?? '--'}
                    </Text>
                    <Text className="text-nanny-text font-medium text-base">kg</Text>
                  </View>
                  <Text className="text-nanny-green text-xs font-medium mb-1">
                    {difPeso != null
                      ? `${Number(difPeso) > 0 ? `+${difPeso}` : difPeso} kg respecto al anterior`
                      : 'No hay registros anteriores'}
                  </Text>

                  {proyeccionPeso && (
                    <Text className="text-nanny-red text-xs font-medium mb-1">
                      ↗ {proyeccionPeso.value} kg en {formatMonthYear(proyeccionPeso.date)}
                    </Text>
                  )}
                </View>

                {/* Altura */}
                <View className="flex-1 bg-nanny-card p-4 rounded-2xl relative">
                  <TouchableOpacity 
                    onPress={() => setModalAlturaVisible(true)}
                    className="absolute top-4 right-4 w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                    <Ionicons name="add" size={16} color="#6d83a1" />
                  </TouchableOpacity>
                  <Text className="text-nanny-muted text-sm font-medium mb-2">Altura actual</Text>
                  <View className="flex-row items-baseline gap-1 mb-1">
                    <Text className="text-3xl font-bold text-nanny-text">
                      {alturaActual ?? '--'}
                    </Text>
                    <Text className="text-nanny-text font-medium text-base">cm</Text>
                  </View>
                  <Text className="text-nanny-green text-xs font-medium mb-1">
                    {difAltura != null
                      ? `${Number(difAltura) > 0 ? `+${difAltura}` : difAltura} cm respecto al anterior`
                      : 'No hay registro anterior'}
                  </Text>

                  {proyeccionAltura && (
                    <Text className="text-nanny-red text-xs font-medium mb-1">
                      ↗ {proyeccionAltura.value} cm en {formatMonthYear(proyeccionAltura.date)}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Curva de crecimiento con percentiles OMS */}
            <GrowthChart
              data={growth.data}
              loading={growth.loading}
              error={growth.error}
              onSelectSex={growth.setSex}
              onAddMeasurement={(metric) => metric === 'weight' ? setModalPesoVisible(true) : setModalAlturaVisible(true)}
            />

            {/* Frecuencia de enfermedades (Placeholder) */}
            <View className="bg-nanny-card p-4 rounded-2xl min-h-[250px] flex-col">
              <Text className="font-semibold text-lg text-nanny-text">Frecuencia de enfermedades</Text>
              <Text className="text-nanny-muted text-sm mb-4">Episodios registrados por mes</Text>
              <View className="flex-1 border-2 border-dashed border-nanny-muted/30 rounded-xl items-center justify-center">
                <Text className="text-nanny-muted text-center">[Gráfico de {activeChild?.name || '...'}]</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal para elegir usuario */}
      <Modal visible={isUserModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 min-h-[300px]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold">Elegir Usuario</Text>
              <TouchableOpacity onPress={() => setIsUserModalVisible(false)}>
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={users}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectUser(item.id)}
                  className="p-4 border-b border-gray-100 flex-row items-center justify-between"
                >
                  <Text className="text-lg">{item.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color="gray" />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
      <ActualizarAlturaModal       
        visible={modalAlturaVisible}
        childId={activeChildId}
        childName={activeChild?.name}
        alturaAnterior={alturaActual}
        onClose={() => setModalAlturaVisible(false)} 
        onSuccess={() => {
          if(activeUserId){
            fetchChildren(activeUserId);
          }
        }}
      />

      <ActualizarPesoModal 
        visible={modalPesoVisible}
        childId={activeChildId}
        childName={activeChild?.name}
        pesoAnterior={pesoActual}
        onClose={() => setModalPesoVisible(false)} 
        onSuccess={() => { 
          if (activeUserId){
            fetchChildren(activeUserId); 
          }
        }} 
      />
      
     
    </View>

    
  );
}
