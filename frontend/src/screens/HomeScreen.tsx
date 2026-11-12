import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, FlatList, ActivityIndicator, TextInput, KeyboardAvoidingView, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; 
import { API_URL } from '../api/config';
import { useNavigation, CommonActions } from '@react-navigation/native';

import ActualizarAlturaModal from '../components/MeasuramentHeightForm';
import ActualizarPesoModal from '../components/MeasuramentWeightForm';
import GrowthChart, { formatMonthYearLong } from '../components/GrowthChart';
import { useFamilySelection } from '../context/FamilySelectionContext';
import AdminHome from '../components/admin/AdminHome';
import type { Role } from '../api/forum';
import { useGrowth } from '../hooks/useGrowth';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';


export default function HomeScreen() {
  const { setSelectedUserId, setSelectedUserRole, isAdmin } = useFamilySelection();
  const [activeChildId, setActiveChildId] = useState<number | null>(null);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [modalAlturaVisible, setModalAlturaVisible] = useState(false);
  const [modalPesoVisible, setModalPesoVisible] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [checklistTab, setChecklistTab] = useState<'pending' | 'completed'>('pending');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const scrollViewRef = useRef<ScrollViewInstance>(null);

  const updateFamiliaChild = (childId: number | null, userId: number | null = activeUserId) => {
    const navigationState = navigation.getState();
    const familiaKey = navigationState.routes.find((r: any) => r.name === 'Familia')?.key;
    if (familiaKey) {
      navigation.dispatch({
        ...CommonActions.setParams({ childId, userId }),
        source: familiaKey,
        target: navigationState.key,
      });
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const response = await fetch(`${API_URL}/user`);
      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        throw new Error('La respuesta de usuarios no es válida');
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
      setUsersError('No se pudieron cargar los usuarios. Comprueba que el backend esté activo.');
    } finally {
      setUsersLoading(false);
    }
  };

  // keepChildId: tras guardar una medición se mantiene el hijo que estaba seleccionado
  const fetchChildren = async (userId: number, keepChildId: number | null = null) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/user/${userId}`);
      const data = await response.json();
      if (data && data.children) {
        setChildren(data.children);
        if (data.children.length > 0) {
          const nextChildId = data.children.some((c: any) => c.id === keepChildId) ? keepChildId : data.children[0].id;
          setActiveChildId(nextChildId);
          updateFamiliaChild(nextChildId, userId);
        } else {
          setActiveChildId(null);
          updateFamiliaChild(null, userId);
        }
      }
    } catch (error) {
      console.error("Error fetching children:", error);
    } finally {
      setLoading(false);
    }
  };


    const registerForPushNotifications = async (userId: number) => {
    if (!Device.isDevice) {
      console.log('Las notificaciones push solo funcionan en dispositivos físicos.');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6d83a1',
        sound: 'default',
      }).catch(() => {});
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permiso de notificaciones denegado por el usuario.');
      return;
    }

    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      if (!projectId) {
        console.log('ℹ️ [Notificaciones] Sin EAS projectId. Las notificaciones locales en el dispositivo están activas.');
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;
      console.log('Token obtenido del móvil:', token);

      await fetch(`${API_URL}/notifications/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          pushToken: token,
        }),
      });

      console.log(`✅ Token registrado con éxito en el backend para el usuario ${userId}`);
    } catch (error) {
      console.log('ℹ️ [Notificaciones] Push remoto no soportado en Expo Go Android (SDK 53+). Las notificaciones locales programadas en el móvil funcionarán al crear eventos.');
    }
  };

  const handleSelectUser = (userId: number, role: Role) => {
    setActiveUserId(userId);
    setActiveChildId(null);
    setChildren([]);
    setChecklist([]);
    setSelectedUserId(userId);
    setSelectedUserRole(role);
    setIsUserModalVisible(false);
    updateFamiliaChild(null, userId);
    fetchChildren(userId);

    // Le pasamos el userId a la pestaña Familia sin cambiar de pestaña
    const familiaKey = navigation.getState().routes.find((r: any) => r.name === 'Familia')?.key;
    if (familiaKey) {
      navigation.dispatch({ ...CommonActions.setParams({ userId }), source: familiaKey });
    }

    // El calendario usa este usuario para cargar sus hijos y los eventos del día.
    const calendarioKey = navigation.getState().routes.find((r: any) => r.name === 'Calendario')?.key;
    if (calendarioKey) {
      navigation.dispatch({ ...CommonActions.setParams({ userId }), source: calendarioKey });
    }
  };

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const activeChild = children.find(c => c.id === activeChildId);
  const activeUser = users.find(u => u.id === activeUserId);
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

  const fetchChecklist = async () => {
    if (!activeChildId || !activeUserId) {
      setChecklist([]);
      return;
    }
    try {
      const response = await fetch(
        `${API_URL}/check-list-item?childId=${activeChildId}&userId=${activeUserId}`,
      );
      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
      setChecklist(await response.json());
    } catch (error) {
      console.error('Error fetching checklist:', error);
      setChecklist([]);
    }
  };

  useEffect(() => {
    fetchChecklist();
  }, [activeChildId, activeUserId]);

  const addChecklistItem = async () => {
    const title = newTaskTitle.trim();
    if (!title || !activeChildId || !activeUserId) return;
    try {
      const response = await fetch(`${API_URL}/check-list-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, childId: activeChildId, userId: activeUserId }),
      });
      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
      const item = await response.json();
      setChecklist((current) => [...current, item]);
      setNewTaskTitle('');
    } catch (error) {
      console.error('Error creating checklist item:', error);
    }
  };

  const toggleChecklistItem = async (item: any) => {
    if (!activeUserId) return;
    try {
      const response = await fetch(`${API_URL}/check-list-item/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !item.isCompleted, userId: activeUserId }),
      });
      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
      const updated = await response.json();
      setChecklist((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
    } catch (error) {
      console.error('Error updating checklist item:', error);
    }
  };

  const saveChecklistEdit = async (item: any) => {
    const title = editingTaskTitle.trim();
    if (!title || !activeUserId) return;
    try {
      const response = await fetch(`${API_URL}/check-list-item/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, userId: activeUserId }),
      });
      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
      const updated = await response.json();
      setChecklist((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
      setEditingTaskId(null);
    } catch (error) {
      console.error('Error editing checklist item:', error);
    }
  };

  const deleteChecklistItem = async (itemId: number) => {
    if (!activeUserId) return;
    try {
      const response = await fetch(`${API_URL}/check-list-item/${itemId}?userId=${activeUserId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
      setChecklist((current) => current.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting checklist item:', error);
    }
  };

  const visibleChecklist = checklist.filter((item) =>
    checklistTab === 'completed' ? item.isCompleted : !item.isCompleted,
  );

  const focusChecklistInput = () => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#f7f3ec', paddingTop: insets.top }}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ padding: 24, paddingBottom: 260 }}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        
        {/* Header */}
        <View className="flex-row justify-between items-start mb-6">
          <View>
            <Text className="text-sm font-medium text-nanny-muted mb-1">
              {isAdmin ? 'Panel de administración' : 'Predicciones e insights'}
            </Text>
            {isAdmin ? (
              <Text className="text-3xl font-semibold text-nanny-text">{activeUser?.name ?? 'Administración'}</Text>
            ) : activeChild ? (
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
        
        {/* El administrador no tiene hijos: ve el resumen de moderación en su lugar */}
        {isAdmin && activeUserId ? (
          <AdminHome adminId={activeUserId} />
        ) : loading ? (
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
                      onPress={() => setActiveChildId(child.id)}
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
                      Previsión {formatMonthYearLong(proyeccionPeso.date)}: {proyeccionPeso.value} kg
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
                      Previsión {formatMonthYearLong(proyeccionAltura.date)}: {proyeccionAltura.value} cm
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

            <View className="bg-nanny-card rounded-2xl mb-6 overflow-hidden">
              <Text className="font-semibold text-lg text-nanny-text px-4 pt-4 pb-3">ToDoList</Text>
              <View className="mx-4 mb-3 flex-row rounded-2xl bg-[#ded6ca] p-1">
                <TouchableOpacity
                  onPress={() => setChecklistTab('pending')}
                  className={`flex-1 items-center rounded-xl py-2 ${checklistTab === 'pending' ? 'bg-[#f7f3ec]' : ''}`}
                >
                  <Ionicons name="time-outline" size={22} color={checklistTab === 'pending' ? '#b87427' : '#968e84'} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setChecklistTab('completed')}
                  className={`flex-1 items-center rounded-xl py-2 ${checklistTab === 'completed' ? 'bg-[#f7f3ec]' : ''}`}
                >
                  <Ionicons name="checkmark-circle-outline" size={22} color={checklistTab === 'completed' ? '#4e8c67' : '#968e84'} />
                </TouchableOpacity>
              </View>
               <View className="mx-4 mb-3 flex-row items-center gap-3">
                <TextInput
                  value={newTaskTitle}
                  onChangeText={setNewTaskTitle}
                  placeholder="Añadir una tarea..."
                  placeholderTextColor="#a49d95"
                  className="flex-1 rounded-2xl border border-[#ded6ca] bg-[#f7f3ec] px-4 py-2 text-base text-nanny-text"
                  onSubmitEditing={addChecklistItem}
                  onFocus={focusChecklistInput}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  onPress={addChecklistItem}
                  disabled={!newTaskTitle.trim() || !activeChildId}
                  className={`h-12 w-12 items-center justify-center rounded-2xl ${
                    newTaskTitle.trim() && activeChildId ? 'bg-[#c4baac]' : 'bg-[#e2ddd5]'
                  }`}
                >
                  <Ionicons name="add" size={30} color="white" />
                </TouchableOpacity>
              </View>
              {visibleChecklist.map((item) => (
                <View key={item.id} className="flex-row items-center border-t border-[#ded6ca] px-4 py-4">
                  <TouchableOpacity onPress={() => toggleChecklistItem(item)} className={`mr-4 h-10 w-10 items-center justify-center rounded-xl border-2 ${item.isCompleted ? 'border-[#6d83a1] bg-[#6d83a1]' : 'border-[#bdb5ab] bg-[#f7f3ec]'}`}>
                    {item.isCompleted && <Ionicons name="checkmark" size={24} color="white" />}
                  </TouchableOpacity>
                  {editingTaskId === item.id ? (
                    <TextInput
                      value={editingTaskTitle}
                      onChangeText={setEditingTaskTitle}
                      autoFocus
                      onFocus={focusChecklistInput}
                      className="flex-1 rounded-lg border border-[#bdb5ab] bg-[#f7f3ec] px-2 py-2 text-base text-nanny-text"
                    />
                  ) : (
                    <Text className={`flex-1 text-base text-nanny-text ${item.isCompleted ? 'line-through text-nanny-muted' : ''}`}>{item.title}</Text>
                  )}
                  {editingTaskId === item.id ? (
                    <>
                      <TouchableOpacity onPress={() => saveChecklistEdit(item)} className="ml-3">
                        <Ionicons name="checkmark" size={24} color="#4e8c67" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditingTaskId(null)} className="ml-3">
                        <Ionicons name="close" size={24} color="#968e84" />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity onPress={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); }} className="ml-3">
                        <Ionicons name="pencil-outline" size={23} color="#6d83a1" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteChecklistItem(item.id)} className="ml-4">
                        <Ionicons name="trash-outline" size={23} color="#c65342" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ))}
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
            {usersLoading ? (
              <ActivityIndicator size="large" color="#6d83a1" />
            ) : usersError ? (
              <View>
                <Text className="mb-4 text-center text-sm text-red-400">{usersError}</Text>
                <TouchableOpacity onPress={fetchUsers} className="self-center rounded-xl bg-[#6d83a1] px-5 py-3">
                  <Text className="font-semibold text-white">Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : users.length === 0 ? (
              <Text className="text-center text-sm text-gray-500">No hay usuarios disponibles.</Text>
            ) : (
              <FlatList
                data={users}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSelectUser(item.id, item.role)}
                    className="flex-row items-center justify-between border-b border-gray-100 p-4"
                  >
                    <View className="flex-row items-center">
                      <Text className="text-lg">{item.name}</Text>
                      {item.role === 'ADMIN' && (
                        <Text className="ml-2 rounded-full bg-nanny-blue/15 px-2 py-0.5 text-xs font-semibold text-nanny-blue">
                          Admin
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="gray" />
                  </TouchableOpacity>
                )}
              />
            )}
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
            fetchChildren(activeUserId, activeChildId);
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
            fetchChildren(activeUserId, activeChildId); 
          }
        }} 
      />
      
     
    </KeyboardAvoidingView>

    
  );
}
