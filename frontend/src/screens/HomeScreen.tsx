import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, FlatList, ActivityIndicator, TextInput, KeyboardAvoidingView, Image, Linking, type ScrollViewInstance } from 'react-native';
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

//Ejemplo de datos para el libro del mes y el artículo semanal, que se muestran en la sección de Recomendaciones
const MOCK_LIBRO_DEL_MES = {
  titulo: 'El cerebro del niño explicado a los padres',
  autores: 'Álvaro Bilbao',
  sinopsis:
    'Durante los seis primeros años de vida el cerebro infantil tiene un potencial que no volverá a tener. Este libro ayuda a padres y educadores a entender el fascinante desarrollo cerebral y emocional del niño para educar con serenidad, potenciar su inteligencia y fortalecer su autoestima sin recurrir a castigos ni métodos autoritarios.',
  imagenUrl: 'https://imagessl1.casadellibro.com/a/l/t5/61/9788416429561.jpg',
};

const MOCK_ARTICULO_SEMANAL = {
  titular: 'Rutinas de sueño respetuosas en los primeros meses',
  descripcion:
    'Aprende a reconocer las ventanas de vigilia y a establecer rituales de descanso que ayuden a tu bebé a dormir tranquilo durante la noche.',
  enlace: 'https://enfamilia.aeped.es',
  fuente: 'EnFamilia (AEP)',
};

const MOCK_RECETAS = [
  {
    id: 1,
    nombre: 'Puré suave de calabaza, zanahoria y pollo',
    tiempo: '25 min',
    dificultad: 'Fácil',
    raciones: 'Para 2 raciones',
    imagenUrl:
      'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?auto=format&fit=crop&w=400&q=80',
    ingredientes: [
      '150g de calabaza pelada y troceada',
      '1 zanahoria mediana limpia',
      '1/2 patata pequeña',
      '50g de pechuga de pollo',
      '1 cucharadita de aceite de oliva virgen extra',
    ],
    pasos: [
      'Pela y corta en dados pequeños la calabaza, la zanahoria y la patata.',
      'Pon las verduras en una olla con agua justa para cubrirlas y cocina a fuego medio durante 15 minutos.',
      'Añade el pollo limpio y deja cocinar 5 minutos más hasta que esté tierno.',
      'Tritura todo con la batidora hasta lograr una textura homogénea y cremosa. Añade el aceite de oliva en crudo antes de servir.',
    ],
  },
  {
    id: 2,
    nombre: 'Tortitas de avena y plátano',
    tiempo: '15 min',
    dificultad: 'Fácil',
    raciones: 'Para 2 raciones (4 tortitas)',
    imagenUrl:
      'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=400&q=80',
    ingredientes: [
      '1 plátano maduro',
      '1 huevo (o 3 cucharadas de leche)',
      '4 cucharadas de copos de avena triturados',
      '1 pizca de canela de Ceylán (opcional)',
      'Unas gotas de aceite de oliva para engrasar la sartén',
    ],
    pasos: [
      'Chafa el plátano con un tenedor en un bol hasta formar un puré suave.',
      'Añade el huevo y bate bien. Incorpora la avena y la canela mezclando hasta obtener una masa uniforme.',
      'Pincela una sartén antiadherente con unas gotas de aceite de oliva y calienta a fuego medio-bajo.',
      'Vierte pequeñas porciones de masa, cocina 2 minutos por cada lado hasta que doren y retira con cuidado.',
    ],
  },
];

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
  const [recomendacionesTab, setRecomendacionesTab] = useState<'articulos' | 'comidas'>('articulos');
  const [showLibroSinopsis, setShowLibroSinopsis] = useState(false);
  const [expandedRecipeId, setExpandedRecipeId] = useState<number | null>(null);
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

            {/* Checklist */}
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
            {/* Recomendaciones */}
            <View className="bg-nanny-card rounded-2xl mb-6 overflow-hidden">
              <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
                <Text className="font-semibold text-lg text-nanny-text">Recomendaciones</Text>
                {activeUser?.role !== 'PRO' && (
                  <View className="flex-row items-center rounded-full bg-[#b87427]/15 px-2.5 py-1">
                    <Ionicons name="sparkles" size={13} color="#b87427" />
                    <Text className="ml-1 text-xs font-bold text-[#b87427]">PRO</Text>
                  </View>
                )}
              </View>

              {/* Selector de pestañas siempre visible, para elegir seccion de articulos/libros y comidas */}
              <View className="mx-4 mb-3 flex-row rounded-2xl bg-[#ded6ca] p-1">
                <TouchableOpacity
                  onPress={() => setRecomendacionesTab('articulos')}
                  className={`flex-1 items-center rounded-xl py-2 ${recomendacionesTab === 'articulos' ? 'bg-[#f7f3ec]' : ''}`}
                >
                  <Ionicons
                    name="book-outline"
                    size={22}
                    color={recomendacionesTab === 'articulos' ? '#b87427' : '#968e84'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setRecomendacionesTab('comidas')}
                  className={`flex-1 items-center rounded-xl py-2 ${recomendacionesTab === 'comidas' ? 'bg-[#f7f3ec]' : ''}`}
                >
                  <Ionicons
                    name="nutrition-outline"
                    size={22}
                    color={recomendacionesTab === 'comidas' ? '#b87427' : '#968e84'}
                  />
                </TouchableOpacity>
              </View>

              {/* Contenido condicionado al rol PRO / Admin */}
              {activeUser?.role === 'PRO' || isAdmin ? (
                recomendacionesTab === 'articulos' ? (
                  <View className="mx-4 mb-4 gap-4">
                    {/* Sección Libro del Mes */}
                    <View>
                      <View className="mb-2 flex-row items-center gap-1.5">
                        <Ionicons name="book" size={17} color="#b87427" />
                        <Text className="text-sm font-bold text-nanny-text">Libro del mes</Text>
                      </View>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => setShowLibroSinopsis((prev) => !prev)}
                        className="rounded-2xl border border-[#ded6ca] bg-[#f7f3ec] p-4"
                      >
                        {/* Cabecera: Portada del libro + Título + Autores + Botón desplegable */}
                        <View className="flex-row gap-3.5">
                          <Image
                            source={{ uri: MOCK_LIBRO_DEL_MES.imagenUrl }}
                            className="h-36 w-24 rounded-lg bg-[#e5dfd4]"
                            resizeMode="cover"
                          />
                          <View className="flex-1 justify-between py-1">
                            <View>
                              <Text className="text-base font-bold text-nanny-text leading-snug">
                                {MOCK_LIBRO_DEL_MES.titulo}
                              </Text>
                              <Text className="mt-1 text-xs font-semibold text-nanny-muted">
                                Por {MOCK_LIBRO_DEL_MES.autores}
                              </Text>
                            </View>

                            {/* Botón interactivo sin fondo, alineado a la derecha y con ancho fijo */}
                            <View className="mt-3 w-36 flex-row items-center justify-end self-end">
                              <Text className="mr-1 text-xs font-semibold text-[#b87427]">
                                {showLibroSinopsis ? 'Ocultar sinopsis' : 'Ver sinopsis'}
                              </Text>
                              <Ionicons
                                name={showLibroSinopsis ? 'chevron-up' : 'chevron-down'}
                                size={14}
                                color="#b87427"
                              />
                            </View>
                          </View>
                        </View>

                        {/* Sinopsis completa y justificada que se despliega al clicar */}
                        {showLibroSinopsis && (
                          <View className="mt-3.5 border-t border-[#ded6ca]/70 pt-3">
                            <Text className="mb-1 text-xs font-bold uppercase tracking-wider text-nanny-muted">
                              Sinopsis
                            </Text>
                            <Text
                              style={{ textAlign: 'justify', width: '100%', alignSelf: 'stretch' }}
                              className="w-full text-xs leading-relaxed text-nanny-text"
                            >
                              {MOCK_LIBRO_DEL_MES.sinopsis}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Sección Artículos Semanales */}
                    <View>
                      <View className="mb-2 flex-row items-center gap-1.5">
                        <Ionicons name="newspaper" size={17} color="#6d83a1" />
                        <Text className="text-sm font-bold text-nanny-text">Artículos semanales</Text>
                      </View>
                      <View className="rounded-2xl border border-[#ded6ca] bg-[#f7f3ec] p-4">
                        <Text className="text-base font-bold text-nanny-text leading-snug">
                          {MOCK_ARTICULO_SEMANAL.titular}
                        </Text>
                        <Text
                          style={{ textAlign: 'justify', width: '100%', alignSelf: 'stretch' }}
                          className="mt-2 w-full text-xs leading-relaxed text-nanny-text"
                        >
                          {MOCK_ARTICULO_SEMANAL.descripcion}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            Linking.openURL(MOCK_ARTICULO_SEMANAL.enlace).catch((err) =>
                              console.error('Error abriendo enlace:', err),
                            )
                          }
                          className="mt-3 flex-row items-center self-start rounded-xl bg-[#6d83a1]/15 px-3 py-1.5 active:opacity-70"
                        >
                          <Text className="mr-1.5 text-xs font-semibold text-[#6d83a1]">
                            Leer artículo ({MOCK_ARTICULO_SEMANAL.fuente})
                          </Text>
                          <Ionicons name="open-outline" size={13} color="#6d83a1" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  //Sección de recetas recomendadas
                  <View className="mx-4 mb-4 gap-4">
                    <View className="mb-1 flex-row items-center gap-1.5">
                      <Ionicons name="restaurant" size={17} color="#b87427" />
                      <Text className="text-sm font-bold text-nanny-text">Recetas de la semana</Text>
                    </View>

                    {MOCK_RECETAS.map((receta) => {
                      const isExpanded = expandedRecipeId === receta.id;
                      return (
                        <TouchableOpacity
                          key={receta.id}
                          activeOpacity={0.85}
                          onPress={() => setExpandedRecipeId(isExpanded ? null : receta.id)}
                          className="rounded-2xl border border-[#ded6ca] bg-[#f7f3ec] p-4"
                        >
                          {/* Cabecera de la receta */}
                          <View className="flex-row gap-3.5">
                            <Image
                              source={{ uri: receta.imagenUrl }}
                              className="h-24 w-24 rounded-xl bg-[#e5dfd4]"
                              resizeMode="cover"
                            />
                            <View className="flex-1 justify-between py-0.5">
                              <View>
                                <Text className="text-base font-bold text-nanny-text leading-snug">
                                  {receta.nombre}
                                </Text>
                                <View className="mt-2 flex-row flex-wrap items-center gap-3">
                                  <View className="flex-row items-center">
                                    <Ionicons name="time-outline" size={14} color="#808080" />
                                    <Text className="ml-1 text-xs text-nanny-muted">{receta.tiempo}</Text>
                                  </View>
                                  <View className="flex-row items-center">
                                    <Ionicons name="speedometer-outline" size={14} color="#808080" />
                                    <Text className="ml-1 text-xs text-nanny-muted">{receta.dificultad}</Text>
                                  </View>
                                </View>
                              </View>

                              {/* Botón ver receta a la derecha, tamaño fijo y sin fondo */}
                              <View className="mt-2 w-32 flex-row items-center justify-end self-end">
                                <Text className="mr-1 text-xs font-semibold text-[#b87427]">
                                  {isExpanded ? 'Ocultar receta' : 'Ver receta'}
                                </Text>
                                <Ionicons
                                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                  size={14}
                                  color="#b87427"
                                />
                              </View>
                            </View>
                          </View>

                          {/* Instrucciones desplegables: Ingredientes y Pasos */}
                          {isExpanded && (
                            <View className="mt-3.5 border-t border-[#ded6ca]/70 pt-3">
                              {/* Raciones */}
                              <View className="mb-3 flex-row items-center gap-1.5 self-start rounded-lg bg-[#ded6ca]/50 px-2.5 py-1">
                                <Ionicons name="people-outline" size={14} color="#6d83a1" />
                                <Text className="text-xs font-semibold text-nanny-text">
                                  {receta.raciones}
                                </Text>
                              </View>

                              {/* Ingredientes */}
                              <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-nanny-muted">
                                Ingredientes
                              </Text>
                              <View className="mb-3.5 gap-1.5">
                                {receta.ingredientes.map((ingrediente, idx) => (
                                  <View key={idx} className="flex-row items-start">
                                    <Text className="mr-2 text-xs font-bold text-[#b87427]">•</Text>
                                    <Text className="flex-1 text-xs text-nanny-text leading-relaxed">
                                      {ingrediente}
                                    </Text>
                                  </View>
                                ))}
                              </View>

                              {/* Pasos de preparación */}
                              <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-nanny-muted">
                                Preparación paso a paso
                              </Text>
                              <View className="gap-2.5">
                                {receta.pasos.map((paso, idx) => (
                                  <View key={idx} className="flex-row items-start gap-2">
                                    <View className="h-5 w-5 items-center justify-center rounded-full bg-[#ded6ca] mt-0.5">
                                      <Text className="text-[10px] font-bold text-nanny-text">{idx + 1}</Text>
                                    </View>
                                    <Text
                                      style={{ textAlign: 'justify', width: '100%', alignSelf: 'stretch' }}
                                      className="flex-1 text-xs leading-relaxed text-nanny-text"
                                    >
                                      {paso}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )
              ) : (
                /* Aviso para usuarios que no son PRO */
                <View className="mx-4 mb-4 items-center justify-center rounded-2xl border border-[#ded6ca] bg-[#f7f3ec] p-5">
                  <View className="mb-2.5 h-12 w-12 items-center justify-center rounded-full bg-[#ded6ca]/70">
                    <Ionicons name="lock-closed" size={24} color="#b87427" />
                  </View>
                  <Text className="text-base font-semibold text-nanny-text text-center">
                    Función exclusiva para usuarios PRO
                  </Text>
                  <Text className="mt-1 text-center text-xs text-nanny-muted px-2">
                    {recomendacionesTab === 'articulos'
                      ? 'Accede a artículos, guías y lecturas recomendadas según la edad y desarrollo de tu hijo.'
                      : 'Descubre recetas saludables y recomendaciones de alimentación adaptadas a su etapa.'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      // Acción futura: abrir modal de suscripción
                    }}
                    className="mt-4 flex-row items-center rounded-xl bg-[#b87427] px-5 py-2.5 shadow-sm active:opacity-80"
                  >
                    <Ionicons name="star" size={16} color="white" />
                    <Text className="ml-2 text-sm font-semibold text-white">Hazte PRO</Text>
                  </TouchableOpacity>
                </View>
              )}
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
