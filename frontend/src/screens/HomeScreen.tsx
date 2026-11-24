import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Modal, FlatList, ActivityIndicator, TextInput, KeyboardAvoidingView, type ScrollViewInstance, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; 
import { API_URL } from '../api/config';
import { setNotificationPreferences } from '../services/notificationService';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';

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



function BookCoverImage({ uri }: { uri?: string | null }) {
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!uri || hasError) {
    return (
      <View
        style={{ width: 96, height: 144 }}
        className="items-center justify-center rounded-lg bg-nanny-surface border border-nanny-border"
      >
        <Ionicons name="book-outline" size={36} color="#6E5D78" />
      </View>
    );
  }

  return (
    <View style={{ width: 96, height: 144 }} className="relative overflow-hidden rounded-lg bg-nanny-surface">
      {loading && (
        <View
          style={{ width: 96, height: 144 }}
          className="absolute inset-0 items-center justify-center bg-nanny-surface"
        >
          <ActivityIndicator size="small" color="#b87427" />
        </View>
      )}
      <Image
        source={{
          uri,
          headers: {
            Accept: 'image/webp,image/apng,image/jpeg,image/*,*/*;q=0.8',
          },
          cache: 'force-cache',
        }}
        style={{ width: 96, height: 144 }}
        className="rounded-lg"
        resizeMode="cover"
        onLoadStart={() => setLoading(true)}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setHasError(true);
        }}
      />
    </View>
  );
}

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

  // ------------------------------
  // RECOMENDACIONES — estados
  // ------------------------------
  const [articles, setArticles] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [recLoading, setRecLoading] = useState(false);

  // Calcula la edad del hijo en años
  const calculateChildAge = (birthDateString: string): number => {
    const birth = new Date(birthDateString);
    const now = new Date();
    const diffMs = now.getTime() - birth.getTime();
    return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
  };

  // FETCH 1 – Libro del mes (mes y año actuales)
  const fetchBooks = async () => {
    try {
      const now = new Date();
      const month = now.getMonth() + 1; // 1-12
      const year = now.getFullYear();
      const res = await fetch(`${API_URL}/recommendation/books?month=${month}&year=${year}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setBooks(data);
      } else if (data && typeof data === 'object' && (data as any).id) {
        setBooks([data]);
      } else {
        setBooks([]);
      }
    } catch (err) {
      console.error('Error fetching books:', err);
      setBooks([]);
    }
  };

  // FETCH 2 – Artículos semanales (sin parámetro, el backend rota por día)
  const fetchArticles = async () => {
    setRecLoading(true);
    try {
      const res = await fetch(`${API_URL}/recommendation/articles`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setArticles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching articles:', err);
      setArticles([]);
    } finally {
      setRecLoading(false);
    }
  };

  // FETCH 3 – Recetas semanales (filtradas por edad del hijo)
  const fetchRecipes = async (age: number) => {
    setRecLoading(true);
    try {
      const res = await fetch(`${API_URL}/recommendation/recipes?childAge=${age}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setRecipes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching recipes:', err);
      setRecipes([]);
    } finally {
      setRecLoading(false);
    }
  };

  // useEffect 1 – Libro del mes: se carga al entrar a la sección de artículos
  useEffect(() => {
    const child = children.find((c: any) => c.id === activeChildId);
    if (child?.birthDate && calculateChildAge(child.birthDate) > 6) {
      setBooks([]);
      return;
    }
    if (recomendacionesTab === 'articulos') {
      fetchBooks();
    }
  }, [recomendacionesTab, activeChildId, children]);

  // useEffect 2 – Artículos: se recarga cuando cambia el hijo activo O cuando el tab es 'articulos'
  useEffect(() => {
    const child = children.find((c: any) => c.id === activeChildId);
    if (!child?.birthDate) return;
    if (calculateChildAge(child.birthDate) > 6) {
      setArticles([]);
      return;
    }
    if (recomendacionesTab !== 'articulos') return;
    fetchArticles();
  }, [activeChildId, children, recomendacionesTab]);

  // useEffect 3 – Recetas: se recarga cuando cambia el hijo activo O cuando el tab es 'comidas'
  useEffect(() => {
    const child = children.find((c: any) => c.id === activeChildId);
    if (!child?.birthDate) return;
    const age = calculateChildAge(child.birthDate);
    if (age > 6) {
      setRecipes([]);
      return;
    }
    if (recomendacionesTab !== 'comidas') return;
    fetchRecipes(Math.max(1, age));
  }, [activeChildId, children, recomendacionesTab]);

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

  useFocusEffect(
    React.useCallback(() => {
      if (activeUserId) fetchUsers();
    }, [activeUserId]),
  );

  // keepChildId: tras guardar una medición se mantiene el hijo que estaba seleccionado
  const fetchChildren = async (userId: number, keepChildId: number | null = null, silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`${API_URL}/user/${userId}`);
      const data = await response.json();
      // Preferencias de notificación del perfil: se aplican al programar nuevas alertas locales
      if (data && typeof data.notifyMedicine === 'boolean') {
        setNotificationPreferences({
          notifyMedicine: data.notifyMedicine,
          notifyAppointments: data.notifyAppointments,
          notifyForum: data.notifyForum,
        });
      }
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
      if (!silent) setLoading(false);
    }
  };

  // Al volver a la pantalla Home (o ganar el foco), refrescamos los hijos del usuario activo
  useFocusEffect(
    useCallback(() => {
      if (activeUserId) {
        fetchChildren(activeUserId, activeChildId, true);
      }
    }, [activeUserId, activeChildId])
  );


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
        lightColor: '#654875',
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
  const activeChildAge = activeChild?.birthDate ? calculateChildAge(activeChild.birthDate) : 0;
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
      style={{ flex: 1, backgroundColor: '#F8EFF5', paddingTop: insets.top }}
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
            <Text className="text-body font-medium text-nanny-muted mb-1">
              {isAdmin ? 'Panel de administración' : 'Predicciones e insights'}
            </Text>
            {isAdmin ? (
              <Text className="text-title font-bold text-nanny-text">{activeUser?.name ?? 'Administración'}</Text>
            ) : activeChild ? (
              <Text className="text-title font-bold text-nanny-text">{activeChild.name}</Text>
            ) : (
              <Text className="text-subtitle font-semibold text-nanny-text italic">Selecciona un usuario</Text>
            )}
          </View>
          
          <TouchableOpacity 
            onPress={() => { fetchUsers(); setIsUserModalVisible(true); }}
            className="relative h-12 w-12 items-center justify-center"
          >
            <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-nanny-blue">
              {activeUser?.avatarUrl ? (
                <Image source={{ uri: activeUser.avatarUrl }} className="h-full w-full" />
              ) : (
                <Text className="text-white font-semibold text-subtitle">{activeUserId ? activeUserId.toString() : "?"}</Text>
              )}
            </View>
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
          <ActivityIndicator size="large" color="#654875" />
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
                        <Text className="text-caption font-semibold text-black">{child?.name?.charAt(0) || '?'}</Text>
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
                    <Ionicons name="add" size={16} color="#654875" />
                  </TouchableOpacity>
                  <Text className="text-nanny-muted text-body font-medium mb-2">Peso actual</Text>
                  <View className="flex-row items-baseline gap-1 mb-1">
                    <Text className="text-title font-bold text-nanny-text">
                      {pesoActual ?? '--'}
                    </Text>
                    <Text className="text-nanny-text font-medium text-body">kg</Text>
                  </View>
                  <Text className="text-nanny-green text-caption font-medium mb-1">
                    {difPeso != null
                      ? `${Number(difPeso) > 0 ? `+${difPeso}` : difPeso} kg respecto al anterior`
                      : 'No hay registros anteriores'}
                  </Text>

                  {proyeccionPeso && (
                    <Text className="text-nanny-red text-caption font-medium mb-1">
                      Previsión {formatMonthYearLong(proyeccionPeso.date)}: {proyeccionPeso.value} kg
                    </Text>
                  )}
                </View>

                {/* Altura */}
                <View className="flex-1 bg-nanny-card p-4 rounded-2xl relative">
                  <TouchableOpacity 
                    onPress={() => setModalAlturaVisible(true)}
                    className="absolute top-4 right-4 w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                    <Ionicons name="add" size={16} color="#654875" />
                  </TouchableOpacity>
                  <Text className="text-nanny-muted text-body font-medium mb-2">Altura actual</Text>
                  <View className="flex-row items-baseline gap-1 mb-1">
                    <Text className="text-title font-bold text-nanny-text">
                      {alturaActual ?? '--'}
                    </Text>
                    <Text className="text-nanny-text font-medium text-body">cm</Text>
                  </View>
                  <Text className="text-nanny-green text-caption font-medium mb-1">
                    {difAltura != null
                      ? `${Number(difAltura) > 0 ? `+${difAltura}` : difAltura} cm respecto al anterior`
                      : 'No hay registro anterior'}
                  </Text>

                  {proyeccionAltura && (
                    <Text className="text-nanny-red text-caption font-medium mb-1">
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
              <Text className="font-semibold text-subtitle text-nanny-text px-4 pt-4 pb-3">ToDoList</Text>
              <View className="mx-4 mb-3 flex-row rounded-2xl bg-nanny-soft p-1">
                <TouchableOpacity
                  onPress={() => setChecklistTab('pending')}
                  className={`flex-1 items-center rounded-xl py-2 ${checklistTab === 'pending' ? 'bg-nanny-bg' : ''}`}
                >
                  <Ionicons name="time-outline" size={22} color={checklistTab === 'pending' ? '#b87427' : '#6E5D78'} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setChecklistTab('completed')}
                  className={`flex-1 items-center rounded-xl py-2 ${checklistTab === 'completed' ? 'bg-nanny-bg' : ''}`}
                >
                  <Ionicons name="checkmark-circle-outline" size={22} color={checklistTab === 'completed' ? '#4e8c67' : '#6E5D78'} />
                </TouchableOpacity>
              </View>
                <View className="mx-4 mb-3 flex-row items-center gap-3">
                <TextInput
                  value={newTaskTitle}
                  onChangeText={setNewTaskTitle}
                  placeholder="Añadir una tarea..."
                  placeholderTextColor="#8F8296"
                  className="flex-1 rounded-2xl border border-nanny-border bg-nanny-bg px-4 py-2 text-body text-nanny-text"
                  onSubmitEditing={addChecklistItem}
                  onFocus={focusChecklistInput}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  onPress={addChecklistItem}
                  disabled={!newTaskTitle.trim() || !activeChildId}
                  className={`h-12 w-12 items-center justify-center rounded-2xl ${
                    newTaskTitle.trim() && activeChildId ? 'bg-nanny-blue' : 'bg-nanny-soft'
                  }`}
                >
                  <Ionicons name="add" size={30} color="white" />
                </TouchableOpacity>
              </View>
              {visibleChecklist.map((item) => (
                <View key={item.id} className="flex-row items-center border-t border-nanny-border px-4 py-4">
                  <TouchableOpacity onPress={() => toggleChecklistItem(item)} className={`mr-4 h-10 w-10 items-center justify-center rounded-xl border-2 ${item.isCompleted ? 'border-nanny-blue bg-nanny-blue' : 'border-nanny-border-strong bg-nanny-bg'}`}>
                    {item.isCompleted && <Ionicons name="checkmark" size={24} color="white" />}
                  </TouchableOpacity>
                  {editingTaskId === item.id ? (
                    <TextInput
                      value={editingTaskTitle}
                      onChangeText={setEditingTaskTitle}
                      autoFocus
                      onFocus={focusChecklistInput}
                      className="flex-1 rounded-lg border border-nanny-border-strong bg-nanny-bg px-2 py-2 text-body text-nanny-text"
                    />
                  ) : (
                    <Text className={`flex-1 text-body text-nanny-text ${item.isCompleted ? 'line-through text-nanny-muted' : ''}`}>{item.title}</Text>
                  )}
                  {editingTaskId === item.id ? (
                    <>
                      <TouchableOpacity onPress={() => saveChecklistEdit(item)} className="ml-3">
                        <Ionicons name="checkmark" size={24} color="#4e8c67" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditingTaskId(null)} className="ml-3">
                        <Ionicons name="close" size={24} color="#6E5D78" />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity onPress={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); }} className="ml-3">
                        <Ionicons name="pencil-outline" size={23} color="#654875" />
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
                <Text className="font-semibold text-subtitle text-nanny-text">Recomendaciones</Text>
                {activeUser?.role !== 'PRO' && (
                  <View className="flex-row items-center rounded-full bg-[#b87427]/15 px-2.5 py-1">
                    <Ionicons name="sparkles" size={13} color="#b87427" />
                    <Text className="ml-1 text-caption font-semibold text-[#b87427]">PRO</Text>
                  </View>
                )}
              </View>

              {/* Selector de pestañas siempre visible, para elegir seccion de articulos/libros y comidas */}
              <View className="mx-4 mb-3 flex-row rounded-2xl bg-nanny-soft p-1">
                <TouchableOpacity
                  onPress={() => setRecomendacionesTab('articulos')}
                  className={`flex-1 items-center rounded-xl py-2 ${recomendacionesTab === 'articulos' ? 'bg-nanny-bg' : ''}`}
                >
                  <Ionicons
                    name="book-outline"
                    size={22}
                    color={recomendacionesTab === 'articulos' ? '#b87427' : '#6E5D78'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setRecomendacionesTab('comidas')}
                  className={`flex-1 items-center rounded-xl py-2 ${recomendacionesTab === 'comidas' ? 'bg-nanny-bg' : ''}`}
                >
                  <Ionicons
                    name="nutrition-outline"
                    size={22}
                    color={recomendacionesTab === 'comidas' ? '#b87427' : '#6E5D78'}
                  />
                </TouchableOpacity>
              </View>

              {/* Contenido condicionado al rol PRO / Admin */}
              {activeUser?.role === 'PRO' || isAdmin ? (
                activeChildAge > 6 ? (
                  <View className="mx-4 mb-4 items-center justify-center rounded-2xl border border-nanny-border bg-nanny-bg p-5">
                    <View className="mb-2.5 h-12 w-12 items-center justify-center rounded-full bg-nanny-soft/70">
                      <Ionicons name="information-circle-outline" size={26} color="#654875" />
                    </View>
                    <Text className="text-body font-semibold text-nanny-text text-center">
                      No hay información para niños de esta edad
                    </Text>
                    <Text className="mt-1 text-center text-caption text-nanny-muted px-2">
                      Las recomendaciones actuales están disponibles para niños de hasta 6 años.
                    </Text>
                  </View>
                ) : recomendacionesTab === 'articulos' ? (
                  <View className="mx-4 mb-4 gap-4">
                    {/* Sección Libro del Mes */}
                    <View>
                      <View className="mb-2 flex-row items-center gap-1.5">
                        <Ionicons name="book" size={17} color="#b87427" />
                        <Text className="text-body font-semibold text-nanny-text">Libro del mes</Text>
                      </View>
                      {books.length > 0 ? (
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => setShowLibroSinopsis((prev) => !prev)}
                          className="rounded-2xl border border-nanny-border bg-nanny-bg p-4"
                        >
                          <View className="flex-row gap-3.5">
                            <BookCoverImage uri={books[0].imageUrl} />
                            <View className="flex-1 justify-between py-1">
                              <View>
                                <Text className="text-body font-semibold text-nanny-text leading-snug">
                                  {books[0].title}
                                </Text>
                                <Text className="mt-1 text-caption font-semibold text-nanny-muted">
                                  Por {books[0].authors?.join(', ')}
                                </Text>
                              </View>
                              <View className="mt-3 w-36 flex-row items-center justify-end self-end">
                                <Text className="mr-1 text-caption font-semibold text-[#b87427]">
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
                          {showLibroSinopsis && (
                            <View className="mt-3.5 border-t border-nanny-border/70 pt-3">
                              <Text className="mb-1 text-caption font-semibold uppercase tracking-wider text-nanny-muted">
                                Sinopsis
                              </Text>
                              <Text
                                style={{ textAlign: 'justify', width: '100%', alignSelf: 'stretch' }}
                                className="w-full text-caption leading-relaxed text-nanny-text"
                              >
                                {books[0].synopsis}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <View className="rounded-2xl border border-nanny-border bg-nanny-bg p-4">
                          <Text className="text-caption text-nanny-muted">Cargando libro recomendado...</Text>
                        </View>
                      )}
                    </View>

                    {/* Sección Artículos Semanales */}
                    <View>
                      <View className="mb-2 flex-row items-center gap-1.5">
                        <Ionicons name="newspaper" size={17} color="#654875" />
                        <Text className="text-body font-semibold text-nanny-text">Artículos semanales</Text>
                      </View>
                      {recLoading ? (
                        <ActivityIndicator size="small" color="#654875" />
                      ) : articles.length > 0 ? (
                        <View className="gap-3">
                          {articles.map((art) => (
                            <View key={art.id} className="rounded-2xl border border-nanny-border bg-nanny-bg p-4">
                              <Text className="text-body font-semibold text-nanny-text leading-snug">
                                {art.title}
                              </Text>
                              <Text
                                style={{ textAlign: 'justify', width: '100%', alignSelf: 'stretch' }}
                                className="mt-2 w-full text-caption leading-relaxed text-nanny-text"
                              >
                                {art.description}
                              </Text>
                              <TouchableOpacity
                                onPress={() =>
                                  Linking.openURL(art.url).catch((err) =>
                                    console.error('Error abriendo enlace:', err),
                                  )
                                }
                                className="mt-3 flex-row items-center self-start rounded-xl bg-nanny-blue/15 px-3 py-1.5 active:opacity-70"
                              >
                                <Text className="mr-1.5 text-caption font-semibold text-nanny-blue">
                                  Leer artículo {art.source ? `(${art.source})` : ''}
                                </Text>
                                <Ionicons name="open-outline" size={13} color="#654875" />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text className="text-caption text-nanny-muted">No hay artículos para mostrar.</Text>
                      )}
                    </View>
                  </View>
                ) : (
                  //Sección de recetas recomendadas
                  <View className="mx-4 mb-4 gap-4">
                    <View className="mb-1 flex-row items-center gap-1.5">
                      <Ionicons name="restaurant" size={17} color="#b87427" />
                      <Text className="text-body font-semibold text-nanny-text">Recetas de la semana</Text>
                    </View>

                    {recLoading ? (
                      <ActivityIndicator size="small" color="#b87427" />
                    ) : recipes.length > 0 ? (
                      recipes.map((receta) => {
                        const isExpanded = expandedRecipeId === receta.id;
                        return (
                          <TouchableOpacity
                            key={receta.id}
                            activeOpacity={0.85}
                            onPress={() => setExpandedRecipeId(isExpanded ? null : receta.id)}
                            className="rounded-2xl border border-nanny-border bg-nanny-bg p-4"
                          >
                          {/* Cabecera de la receta */}
                          <View className="flex-row gap-3.5">
                            <Image
                              source={{ uri: receta.imageUrl }}
                              style={{ width: 96, height: 96 }}
                              className="h-24 w-24 rounded-xl bg-nanny-surface"
                              resizeMode="cover"
                            />
                            <View className="flex-1 justify-between py-0.5">
                              <View>
                                <Text className="text-body font-semibold text-nanny-text leading-snug">
                                  {receta.name}
                                </Text>
                                <View className="mt-2 flex-row flex-wrap items-center gap-3">
                                  <View className="flex-row items-center">
                                    <Ionicons name="time-outline" size={14} color="#6E5D78" />
                                    <Text className="ml-1 text-caption text-nanny-muted">{receta.time}</Text>
                                  </View>
                                  <View className="flex-row items-center">
                                    <Ionicons name="speedometer-outline" size={14} color="#6E5D78" />
                                    <Text className="ml-1 text-caption text-nanny-muted">{receta.difficulty}</Text>
                                  </View>
                                </View>
                              </View>

                              {/* Botón ver receta a la derecha, tamaño fijo y sin fondo */}
                              <View className="mt-2 w-32 flex-row items-center justify-end self-end">
                                <Text className="mr-1 text-caption font-semibold text-[#b87427]">
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
                            <View className="mt-3.5 border-t border-nanny-border/70 pt-3">
                              {/* Raciones */}
                              <View className="mb-3 flex-row items-center gap-1.5 self-start rounded-lg bg-nanny-soft/50 px-2.5 py-1">
                                <Ionicons name="people-outline" size={14} color="#654875" />
                                <Text className="text-caption font-semibold text-nanny-text">
                                  {receta.servings}
                                </Text>
                              </View>

                              {/* Ingredientes */}
                              <Text className="mb-1.5 text-caption font-semibold uppercase tracking-wider text-nanny-muted">
                                Ingredientes
                              </Text>
                              <View className="mb-3.5 gap-1.5">
                                {receta.ingredients.map((ingrediente: string, idx: number) => (
                                  <View key={idx} className="flex-row items-start">
                                    <Text className="mr-2 text-caption font-semibold text-[#b87427]">•</Text>
                                    <Text className="flex-1 text-caption text-nanny-text leading-relaxed">
                                      {ingrediente}
                                    </Text>
                                  </View>
                                ))}
                              </View>

                              {/* Pasos de preparación */}
                              <Text className="mb-1.5 text-caption font-semibold uppercase tracking-wider text-nanny-muted">
                                Preparación paso a paso
                              </Text>
                              <View className="gap-2.5">
                                {receta.steps.map((paso: string, idx: number) => (
                                  <View key={idx} className="flex-row items-start gap-2">
                                    <View className="h-5 w-5 items-center justify-center rounded-full bg-nanny-soft mt-0.5">
                                      <Text className="text-[10px] font-bold text-nanny-text">{idx + 1}</Text>
                                    </View>
                                    <Text
                                      style={{ textAlign: 'justify', width: '100%', alignSelf: 'stretch' }}
                                      className="flex-1 text-caption leading-relaxed text-nanny-text"
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
                      })
                    ) : (
                      <Text className="text-caption text-nanny-muted">No hay recetas para mostrar.</Text>
                    )}
                  </View>
                )
              ) : (
                /* Aviso para usuarios que no son PRO */
                <View className="mx-4 mb-4 items-center justify-center rounded-2xl border border-nanny-border bg-nanny-bg p-5">
                  <View className="mb-2.5 h-12 w-12 items-center justify-center rounded-full bg-nanny-soft/70">
                    <Ionicons name="lock-closed" size={24} color="#b87427" />
                  </View>
                  <Text className="text-body font-semibold text-nanny-text text-center">
                    Función exclusiva para usuarios PRO
                  </Text>
                  <Text className="mt-1 text-center text-caption text-nanny-muted px-2">
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
                    <Text className="ml-2 text-body font-semibold text-white">Hazte PRO</Text>
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
              <Text className="text-subtitle font-semibold">Elegir Usuario</Text>
              <TouchableOpacity onPress={() => setIsUserModalVisible(false)}>
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>
            {activeUserId && (
              <TouchableOpacity
                onPress={() => {
                  setIsUserModalVisible(false);
                  navigation.navigate('MiPerfil', { userId: activeUserId });
                }}
                className="mb-4 flex-row items-center rounded-2xl bg-nanny-card px-4 py-3"
              >
                <Ionicons name="person-circle-outline" size={24} color="#654875" />
                <Text className="ml-3 text-body font-semibold text-nanny-text">Editar mi perfil</Text>
                <Ionicons name="chevron-forward" size={20} color="#6E5D78" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            )}
            {usersLoading ? (
              <ActivityIndicator size="large" color="#654875" />
            ) : usersError ? (
              <View>
                <Text className="mb-4 text-center text-body text-red-400">{usersError}</Text>
                <TouchableOpacity onPress={fetchUsers} className="self-center rounded-xl bg-nanny-blue px-5 py-3">
                  <Text className="font-semibold text-white">Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : users.length === 0 ? (
              <Text className="text-center text-body text-gray-500">No hay usuarios disponibles.</Text>
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
                      <Text className="text-body">{[item.name, item.surname].filter(Boolean).join(' ')}</Text>
                      {item.role === 'ADMIN' && (
                        <Text className="ml-2 rounded-full bg-nanny-blue/15 px-2 py-0.5 text-caption font-semibold text-nanny-blue">
                          Admin
                        </Text>
                      )}
                      {item.isPediatrician && (
                        <Text className="ml-2 rounded-full bg-nanny-green/15 px-2 py-0.5 text-caption font-semibold text-nanny-green">
                          Pediatra
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
