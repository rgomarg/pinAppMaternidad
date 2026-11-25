import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Modal, FlatList, ActivityIndicator, TextInput, KeyboardAvoidingView, type ScrollViewInstance, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 
import { API_URL } from '../api/config';
import { setNotificationPreferences } from '../services/notificationService';
import { useNavigation, useRoute, CommonActions, useFocusEffect } from '@react-navigation/native';

import ActualizarAlturaModal from '../components/MeasuramentHeightForm';
import ActualizarPesoModal from '../components/MeasuramentWeightForm';
import GrowthChart, { formatMonthYear } from '../components/GrowthChart';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useFamilySelection } from '../context/FamilySelectionContext';
import AdminHome from '../components/admin/AdminHome';
import type { Role } from '../api/forum';
import { useGrowth } from '../hooks/useGrowth';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import ScreenBackground from '../components/ScreenBackground';
import HeroHeader from '../components/HeroHeader';
import Penguin from '../components/Penguin';
import { COLORS, SHADOWS } from '../theme';



function BookCoverImage({ uri }: { uri?: string | null }) {
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!uri || hasError) {
    return (
      <View
        style={{ width: 96, height: 144 }}
        className="items-center justify-center rounded-xl bg-nanny-surface"
      >
        <Ionicons name="book-outline" size={36} color={COLORS.muted} />
      </View>
    );
  }

  return (
    <View style={{ width: 96, height: 144 }} className="relative overflow-hidden rounded-xl bg-nanny-surface">
      {loading && (
        <View
          style={{ width: 96, height: 144 }}
          className="absolute inset-0 items-center justify-center bg-nanny-surface"
        >
          <ActivityIndicator size="small" color={COLORS.primary} />
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
        className="rounded-xl"
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

// ------------------------------
// Piezas visuales de la Home (solo presentación)
// ------------------------------

const DAYS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS_LONG_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// "Martes, 24 de noviembre"
function formatToday(date: Date) {
  return `${DAYS_LONG[date.getDay()]}, ${date.getDate()} de ${MONTHS_LONG_ES[date.getMonth()]}`;
}

// "Noviembre 2026"
function formatMonthChip(date: Date) {
  const month = MONTHS_LONG_ES[date.getMonth()];
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getFullYear()}`;
}

// Redondea a un decimal y quita el ".0" (2.0 -> "2", 0.5 -> "0.5")
function formatNumber(value: number) {
  return String(Number(value.toFixed(1)));
}

// Variación respecto a la medición de hace al menos 3 meses (las mediciones llegan ordenadas
// de más reciente a más antigua). Si no hay ninguna tan antigua, se compara con la anterior.
function changeLabel(measurements: any[], key: 'weight' | 'height', unit: string) {
  const latest = measurements[0];
  if (!latest) return null;
  const cutoff = new Date(latest.date);
  cutoff.setMonth(cutoff.getMonth() - 3);
  const threeMonthsAgo = measurements.find((m) => new Date(m.date) <= cutoff);
  const reference = threeMonthsAgo ?? measurements[1];
  if (!reference) return null;
  const diff = latest[key] - reference[key];
  const sign = diff > 0 ? '+' : '';
  return `${sign}${formatNumber(diff)} ${unit} ${threeMonthsAgo ? 'ult. 3m' : 'vs. anterior'}`;
}

// Minigráfica decorativa de la tendencia (últimas mediciones)
function Sparkline({ values }: { values: number[] }) {
  const W = 92;
  const H = 62;
  const left = 16;
  const right = 7;
  const top = 7;
  const bottom = 14;
  // Sin datos suficientes se dibuja una tendencia de ejemplo más tenue
  const hasData = values.length >= 2;
  const data = hasData ? values : [1, 1.8, 2.3, 3.4];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: left + (i * (W - left - right)) / (data.length - 1),
    y: H - bottom - ((v - min) / range) * (H - bottom - top),
  }));
  const path = pts.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pts[i - 1];
    const midX = (prev.x + p.x) / 2;
    return `${d} C ${midX} ${prev.y} ${midX} ${p.y} ${p.x} ${p.y}`;
  }, '');

  return (
    <Svg width={W} height={H} style={{ opacity: hasData ? 1 : 0.5 }}>
      <Line x1={2} y1={2} x2={2} y2={H - 4} stroke={COLORS.muted} strokeOpacity={0.45} strokeWidth={2} strokeLinecap="round" />
      <Line x1={2} y1={H - 4} x2={W - 1} y2={H - 4} stroke={COLORS.muted} strokeOpacity={0.45} strokeWidth={2} strokeLinecap="round" />
      <Path d={path} stroke={COLORS.primary} strokeWidth={4} fill="none" strokeLinecap="round" />
      {pts.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={4.5} fill="white" stroke={COLORS.primary} strokeWidth={2.5} />
      ))}
    </Svg>
  );
}

// Tarjeta de Peso / Altura
function StatCard({ label, value, unit, change, projection, onAdd }: {
  label: string;
  value: number | null | undefined;
  unit: string;
  change: string | null;
  projection: string | null;
  onAdd: () => void;
}) {
  return (
    <View className="flex-1 rounded-[26px] bg-nanny-card p-4" style={SHADOWS.card}>
      <View className="flex-row items-center justify-between">
        <Text className="font-figtree-medium text-[14px] text-nanny-text">{label}</Text>
        <TouchableOpacity onPress={onAdd} className="h-8 w-8 items-center justify-center rounded-full bg-nanny-soft">
          <Ionicons name="add" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      <View className="mt-2 flex-row items-baseline">
        <Text className="font-figtree-medium text-nanny-text" style={{ fontSize: 34, lineHeight: 42 }}>
          {value ?? '--'}
        </Text>
        <Text className="ml-2 font-figtree-medium text-[15px] text-nanny-text">{unit}</Text>
      </View>
      <Text className="mt-1 font-figtree text-[13px] text-nanny-green-muted">
        {change ?? 'Sin registros anteriores'}
      </Text>
      {projection && (
        <View className="mt-1.5 flex-row items-center">
          <Ionicons name="arrow-up" size={13} color={COLORS.primary} style={{ transform: [{ rotate: '45deg' }] }} />
          <Text className="ml-1 font-figtree-medium text-[13px] text-nanny-blue">{projection}</Text>
        </View>
      )}
    </View>
  );
}

// Selector en píldora (Pendientes/Completadas, Lectura/Recetas)
function SegmentedTabs<T extends string>({ options, value, onChange, activeClassName = 'bg-nanny-blue' }: {
  options: { key: T; label: string; icon?: React.ComponentProps<typeof Ionicons>['name'] }[];
  value: T;
  onChange: (key: T) => void;
  activeClassName?: string;
}) {
  return (
    <View className="mb-3 flex-row rounded-full bg-white p-1" style={SHADOWS.field}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <TouchableOpacity
            key={option.key}
            onPress={() => onChange(option.key)}
            className={`flex-1 flex-row items-center justify-center rounded-full py-2.5 ${active ? activeClassName : ''}`}
          >
            {option.icon && (
              <Ionicons name={option.icon} size={16} color={active ? 'white' : COLORS.muted} style={{ marginRight: 6 }} />
            )}
            <Text className={`font-figtree-medium text-[15px] ${active ? 'text-white' : 'text-nanny-muted'}`}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Títulos de sección sobre el degradado
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text className="font-figtree-medium text-nanny-text" style={{ fontSize: 20, lineHeight: 26 }}>
      {children}
    </Text>
  );
}

function SubsectionTitle({ children }: { children: React.ReactNode }) {
  return <Text className="mb-2.5 font-figtree-medium text-[16px] text-nanny-text">{children}</Text>;
}

// Aviso dentro de Recomendaciones (sin acceso PRO o fuera de rango de edad)
function NoticeCard({ icon, title, message, children }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <View className="items-center justify-center rounded-[24px] bg-nanny-card p-5" style={SHADOWS.card}>
      <View className="mb-2.5 h-12 w-12 items-center justify-center rounded-full bg-nanny-soft">
        <Ionicons name={icon} size={24} color={COLORS.primary} />
      </View>
      <Text className="text-center font-figtree-semibold text-body text-nanny-text">{title}</Text>
      <Text className="mt-1 px-2 text-center font-figtree text-[13px] text-nanny-muted">{message}</Text>
      {children}
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
  const [showGrowthChart, setShowGrowthChart] = useState(false);
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
        lightColor: '#46424A',
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

  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // Otras pestañas (p. ej. Familia) abren el selector de usuarios navegando aquí con openUserPicker
  const openUserPickerRequest = route.params?.openUserPicker;
  useEffect(() => {
    if (!openUserPickerRequest) return;
    fetchUsers();
    setIsUserModalVisible(true);
  }, [openUserPickerRequest]);
  const activeChild = children.find(c => c.id === activeChildId);
  const activeUser = users.find(u => u.id === activeUserId);
  const activeChildAge = activeChild?.birthDate ? calculateChildAge(activeChild.birthDate) : 0;
  const growth = useGrowth(activeChild);
  const proyeccionPeso = growth.data?.weight?.projection.at(-1);
  const proyeccionAltura = growth.data?.height?.projection.at(-1);

  const medicionesPeso = activeChild?.measurements?.filter((m: any) => m.weight != null) || [];
  const pesoActual = medicionesPeso[0]?.weight;
  const cambioPeso = changeLabel(medicionesPeso, 'weight', 'kg');

  const medicionesAltura = activeChild?.measurements?.filter((m: any) => m.height != null) || [];
  const alturaActual = medicionesAltura[0]?.height;
  const cambioAltura = changeLabel(medicionesAltura, 'height', 'cm');

  // Resumen de crecimiento: si el backend dice que todo va bien se muestra el texto del prototipo;
  // en avisos y alertas se usa el título y mensaje que calcula el backend.
  const insight = growth.data?.weight?.insight ?? growth.data?.height?.insight ?? null;
  const growthTitle = !insight ? 'Crecimiento' : insight.level === 'ok' ? 'Crecimiento estable' : insight.title;
  const growthMessage = !insight
    ? 'Añade mediciones para ver su evolución.'
    : insight.level === 'ok'
      ? `¡${activeChild?.name} está creciendo correctamente!`
      : insight.message;
  const sparklineValues: number[] = (
    growth.data?.weight?.points.map((p) => p.value) ?? [...medicionesPeso].reverse().map((m: any) => m.weight)
  ).slice(-4);

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
      style={{ flex: 1, backgroundColor: COLORS.background }}
    >
      <ScreenBackground />
      <HeroHeader
        title={
          isAdmin
            ? activeUser?.name ?? 'Administración'
            : activeChild
              ? `Salud de ${activeChild.name}`
              : 'Selecciona un usuario'
        }
        subtitle={isAdmin ? 'Panel de administración' : formatToday(new Date())}
        illustration={<View style={{ marginBottom: -4 }}><Penguin variant="peek" width={110} /></View>}
        actions={
          <TouchableOpacity
            onPress={() => { fetchUsers(); setIsUserModalVisible(true); }}
            accessibilityRole="button"
            accessibilityLabel="Cambiar de usuario o editar mi perfil"
            className="h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-nanny-placeholder"
          >
            {activeUser?.avatarUrl ? (
              <Image source={{ uri: activeUser.avatarUrl }} className="h-full w-full" />
            ) : (
              <Ionicons name="person" size={18} color="white" />
            )}
          </TouchableOpacity>
        }
      />
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 260 }}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >

        {/* El administrador no tiene hijos: ve el resumen de moderación en su lugar */}
        {isAdmin && activeUserId ? (
          <AdminHome adminId={activeUserId} />
        ) : loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          <>
            {/* Child Selector */}
            {children.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-9 flex-row">
                <View className="flex-row gap-2">
                  {children.map((child) => {
                    const active = activeChildId === child.id;
                    return (
                      <TouchableOpacity
                        key={child.id}
                        onPress={() => setActiveChildId(child.id)}
                        className={`flex-row items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 ${active ? 'bg-nanny-blue' : 'bg-white'}`}
                      >
                        {/* Foto del menor (Child.avatarUrl); sin foto se muestra un icono neutro */}
                        <View className="h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-nanny-soft">
                          {child.avatarUrl ? (
                            <Image source={{ uri: child.avatarUrl }} className="h-full w-full" resizeMode="cover" />
                          ) : (
                            <Ionicons name="happy-outline" size={16} color={COLORS.primary} />
                          )}
                        </View>
                        <Text className={`font-figtree-medium text-[15px] ${active ? 'text-white' : 'text-nanny-text'}`}>
                          {child.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            {activeChild && (
              <>
                {/* Resumen de crecimiento: el chevron despliega la curva completa con percentiles OMS */}
                <View className="mb-8 flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center">
                      <Text className="font-figtree-medium text-display text-nanny-text" style={{ flexShrink: 1 }}>
                        {growthTitle}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowGrowthChart((prev) => !prev)}
                        className="ml-3 h-10 w-10 items-center justify-center rounded-full bg-nanny-blue"
                        style={SHADOWS.floating}
                      >
                        <Ionicons name={showGrowthChart ? 'chevron-up' : 'chevron-down'} size={20} color="white" />
                      </TouchableOpacity>
                    </View>
                    <Text className="mt-3 font-figtree text-[13px] text-nanny-muted">{growthMessage}</Text>
                  </View>
                  <Sparkline values={sparklineValues} />
                </View>

                {showGrowthChart && (
                  <GrowthChart
                    data={growth.data}
                    loading={growth.loading}
                    error={growth.error}
                    onSelectSex={growth.setSex}
                    onAddMeasurement={(metric) => metric === 'weight' ? setModalPesoVisible(true) : setModalAlturaVisible(true)}
                  />
                )}

                {/* Stats Cards */}
                <View className="mb-6 flex-row gap-3">
                  <StatCard
                    label="Peso actual"
                    value={pesoActual}
                    unit="kg"
                    change={cambioPeso}
                    projection={proyeccionPeso ? `${formatNumber(proyeccionPeso.value)} kg en ${formatMonthYear(proyeccionPeso.date)}` : null}
                    onAdd={() => setModalPesoVisible(true)}
                  />
                  <StatCard
                    label="Altura actual"
                    value={alturaActual}
                    unit="cm"
                    change={cambioAltura}
                    projection={proyeccionAltura ? `${formatNumber(proyeccionAltura.value)} cm en ${formatMonthYear(proyeccionAltura.date)}` : null}
                    onAdd={() => setModalAlturaVisible(true)}
                  />
                </View>
              </>
            )}

            {/* Lista de tareas */}
            <View className="mb-3">
              <SectionTitle>Lista de Tareas</SectionTitle>
            </View>
            <SegmentedTabs
              options={[
                { key: 'pending', label: 'Pendientes', icon: 'time-outline' },
                { key: 'completed', label: 'Completadas', icon: 'checkmark-circle-outline' },
              ]}
              value={checklistTab}
              onChange={setChecklistTab}
            />
            <View className="mb-3 flex-row items-center gap-3">
              <TextInput
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                placeholder="Añadir una tarea..."
                placeholderTextColor={COLORS.subtle}
                className="min-w-0 flex-1 rounded-full bg-nanny-card px-6 font-figtree text-[16px] text-nanny-text"
                style={[{ height: 52 }, SHADOWS.field]}
                onSubmitEditing={addChecklistItem}
                onFocus={focusChecklistInput}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={addChecklistItem}
                disabled={!newTaskTitle.trim() || !activeChildId}
                className="h-[52px] w-[52px] items-center justify-center rounded-2xl bg-nanny-card"
                style={[SHADOWS.field, { opacity: newTaskTitle.trim() && activeChildId ? 1 : 0.5 }]}
                accessibilityRole="button"
                accessibilityLabel="Añadir tarea"
              >
                <Ionicons name="add" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {visibleChecklist.map((item) => (
              <View key={item.id} className="mb-3 flex-row items-center rounded-[24px] bg-nanny-card px-5 py-4" style={SHADOWS.card}>
                <TouchableOpacity
                  onPress={() => toggleChecklistItem(item)}
                  className={`mr-3.5 h-6 w-6 items-center justify-center rounded-md ${
                    item.isCompleted ? 'bg-nanny-blue' : 'bg-nanny-card'
                  }`}
                  style={{ borderWidth: 1.5, borderColor: item.isCompleted ? COLORS.primary : COLORS.borderStrong }}
                >
                  {item.isCompleted && <Ionicons name="checkmark" size={16} color="white" />}
                </TouchableOpacity>
                {editingTaskId === item.id ? (
                  <TextInput
                    value={editingTaskTitle}
                    onChangeText={setEditingTaskTitle}
                    autoFocus
                    onFocus={focusChecklistInput}
                    className="flex-1 rounded-lg border border-nanny-border-strong bg-nanny-bg px-2 py-1.5 font-figtree text-body text-nanny-text"
                  />
                ) : (
                  <Text className={`flex-1 font-figtree text-body ${item.isCompleted ? 'text-nanny-muted line-through' : 'text-nanny-text'}`}>
                    {item.title}
                  </Text>
                )}
                {editingTaskId === item.id ? (
                  <>
                    <TouchableOpacity onPress={() => saveChecklistEdit(item)} className="ml-3">
                      <Ionicons name="checkmark" size={22} color={COLORS.green} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingTaskId(null)} className="ml-3">
                      <Ionicons name="close" size={22} color={COLORS.muted} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity onPress={() => { setEditingTaskId(item.id); setEditingTaskTitle(item.title); }} className="ml-3">
                      <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteChecklistItem(item.id)} className="ml-4">
                      <Ionicons name="trash-outline" size={19} color={COLORS.danger} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ))}

            {/* Recomendaciones */}
            <View className="mb-3 mt-5 flex-row items-center">
              <SectionTitle>Recomendaciones</SectionTitle>
              <View className="ml-2.5 rounded-full bg-nanny-card px-2 py-0.5">
                <Text className="font-figtree-bold text-[11px] tracking-wider text-nanny-blue">PRO</Text>
              </View>
            </View>

            {/* Selector de pestañas siempre visible, para elegir sección de lectura (libro y artículos) o recetas */}
            <SegmentedTabs
              options={[
                { key: 'articulos', label: 'Lectura' },
                { key: 'comidas', label: 'Recetas' },
              ]}
              value={recomendacionesTab}
              onChange={setRecomendacionesTab}
              activeClassName="bg-nanny-primary-dark"
            />

            {/* Contenido condicionado al rol PRO / Admin */}
            <View className="mt-2">
              {activeUser?.role === 'PRO' || isAdmin ? (
                activeChildAge > 6 ? (
                  <NoticeCard
                    icon="information-circle-outline"
                    title="No hay información para niños de esta edad"
                    message="Las recomendaciones actuales están disponibles para niños de hasta 6 años."
                  />
                ) : recomendacionesTab === 'articulos' ? (
                  <View className="gap-5">
                    {/* Sección Libro del Mes */}
                    <View>
                      <SubsectionTitle>Libro del mes</SubsectionTitle>
                      {books.length > 0 ? (
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => setShowLibroSinopsis((prev) => !prev)}
                          className="rounded-[24px] bg-nanny-card p-3.5"
                          style={SHADOWS.card}
                        >
                          <View className="flex-row gap-4">
                            <BookCoverImage uri={books[0].imageUrl} />
                            <View className="flex-1 py-1">
                              <View className="self-start rounded-full bg-nanny-soft px-2.5 py-0.5">
                                <Text className="font-figtree-medium text-[12px] text-nanny-primary-dark">
                                  {formatMonthChip(new Date())}
                                </Text>
                              </View>
                              <Text className="mt-2.5 font-figtree-semibold text-[15px] leading-[21px] text-nanny-text">
                                {books[0].title}
                              </Text>
                              <Text className="mt-1 font-figtree text-[13px] text-nanny-muted">
                                {books[0].authors?.join(', ')}
                              </Text>
                              <View className="mt-3 flex-row items-center">
                                <Text className="mr-1 font-figtree-medium text-[13px] text-nanny-blue">
                                  {showLibroSinopsis ? 'Ocultar sinopsis' : 'Ver sinopsis'}
                                </Text>
                                <Ionicons
                                  name={showLibroSinopsis ? 'chevron-up' : 'chevron-down'}
                                  size={14}
                                  color={COLORS.primary}
                                />
                              </View>
                            </View>
                          </View>
                          {showLibroSinopsis && (
                            <View className="mt-3.5 border-t border-nanny-border pt-3">
                              <Text className="mb-1 font-figtree-semibold text-[11px] uppercase tracking-wider text-nanny-muted">
                                Sinopsis
                              </Text>
                              <Text className="font-figtree text-[13px] leading-[19px] text-nanny-text">
                                {books[0].synopsis}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <View className="rounded-[24px] bg-nanny-card p-4" style={SHADOWS.card}>
                          <Text className="font-figtree text-[13px] text-nanny-muted">Cargando libro recomendado...</Text>
                        </View>
                      )}
                    </View>

                    {/* Sección Artículos de la semana */}
                    <View>
                      <SubsectionTitle>Artículos de la semana</SubsectionTitle>
                      {recLoading ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : articles.length > 0 ? (
                        <View className="gap-3">
                          {articles.map((art) => (
                            <View key={art.id} className="rounded-[24px] bg-nanny-card p-4" style={SHADOWS.card}>
                              {art.source ? (
                                <Text className="mb-1.5 font-figtree-medium text-[11px] uppercase tracking-wide text-nanny-muted">
                                  {art.source}
                                </Text>
                              ) : null}
                              <Text className="font-figtree-semibold text-[16px] leading-[22px] text-nanny-text">
                                {art.title}
                              </Text>
                              <Text className="mt-2 font-figtree text-[13px] leading-[19px] text-nanny-muted">
                                {art.description}
                              </Text>
                              <TouchableOpacity
                                onPress={() =>
                                  Linking.openURL(art.url).catch((err) =>
                                    console.error('Error abriendo enlace:', err),
                                  )
                                }
                                className="mt-3.5 flex-row items-center self-start rounded-full bg-nanny-soft/70 px-3.5 py-2 active:opacity-70"
                              >
                                <Text className="mr-1.5 font-figtree-medium text-[13px] text-nanny-primary-dark">
                                  Leer artículo
                                </Text>
                                <Ionicons name="open-outline" size={14} color={COLORS.primaryDark} />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text className="font-figtree text-[13px] text-nanny-muted">No hay artículos para mostrar.</Text>
                      )}
                    </View>
                  </View>
                ) : (
                  // Sección de recetas recomendadas
                  <View>
                    <SubsectionTitle>Recetas de la semana</SubsectionTitle>

                    {recLoading ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : recipes.length > 0 ? (
                      <View className="gap-3">
                        {recipes.map((receta) => {
                          const isExpanded = expandedRecipeId === receta.id;
                          return (
                            <TouchableOpacity
                              key={receta.id}
                              activeOpacity={0.85}
                              onPress={() => setExpandedRecipeId(isExpanded ? null : receta.id)}
                              className="rounded-[24px] bg-nanny-card p-3.5"
                              style={SHADOWS.card}
                            >
                              {/* Cabecera de la receta */}
                              <View className="flex-row gap-4">
                                <Image
                                  source={{ uri: receta.imageUrl }}
                                  style={{ width: 96, height: 96 }}
                                  className="rounded-xl bg-nanny-surface"
                                  resizeMode="cover"
                                />
                                <View className="flex-1 py-1">
                                  <Text className="font-figtree-semibold text-[15px] leading-[21px] text-nanny-text">
                                    {receta.name}
                                  </Text>
                                  <View className="mt-2 flex-row flex-wrap items-center gap-3">
                                    <View className="flex-row items-center">
                                      <Ionicons name="time-outline" size={14} color={COLORS.muted} />
                                      <Text className="ml-1 font-figtree text-[13px] text-nanny-muted">{receta.time}</Text>
                                    </View>
                                    <View className="flex-row items-center">
                                      <Ionicons name="speedometer-outline" size={14} color={COLORS.muted} />
                                      <Text className="ml-1 font-figtree text-[13px] text-nanny-muted">{receta.difficulty}</Text>
                                    </View>
                                  </View>
                                  <View className="mt-3 flex-row items-center">
                                    <Text className="mr-1 font-figtree-medium text-[13px] text-nanny-blue">
                                      {isExpanded ? 'Ocultar receta' : 'Ver receta'}
                                    </Text>
                                    <Ionicons
                                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                      size={14}
                                      color={COLORS.primary}
                                    />
                                  </View>
                                </View>
                              </View>

                              {/* Instrucciones desplegables: Ingredientes y Pasos */}
                              {isExpanded && (
                                <View className="mt-3.5 border-t border-nanny-border pt-3">
                                  {/* Raciones */}
                                  <View className="mb-3 flex-row items-center gap-1.5 self-start rounded-full bg-nanny-soft px-2.5 py-1">
                                    <Ionicons name="people-outline" size={14} color={COLORS.primary} />
                                    <Text className="font-figtree-semibold text-[12px] text-nanny-text">
                                      {receta.servings}
                                    </Text>
                                  </View>

                                  {/* Ingredientes */}
                                  <Text className="mb-1.5 font-figtree-semibold text-[11px] uppercase tracking-wider text-nanny-muted">
                                    Ingredientes
                                  </Text>
                                  <View className="mb-3.5 gap-1.5">
                                    {receta.ingredients.map((ingrediente: string, idx: number) => (
                                      <View key={idx} className="flex-row items-start">
                                        <Text className="mr-2 font-figtree-semibold text-[13px] text-nanny-blue">•</Text>
                                        <Text className="flex-1 font-figtree text-[13px] leading-[19px] text-nanny-text">
                                          {ingrediente}
                                        </Text>
                                      </View>
                                    ))}
                                  </View>

                                  {/* Pasos de preparación */}
                                  <Text className="mb-1.5 font-figtree-semibold text-[11px] uppercase tracking-wider text-nanny-muted">
                                    Preparación paso a paso
                                  </Text>
                                  <View className="gap-2.5">
                                    {receta.steps.map((paso: string, idx: number) => (
                                      <View key={idx} className="flex-row items-start gap-2">
                                        <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-nanny-soft">
                                          <Text className="font-figtree-bold text-[10px] text-nanny-text">{idx + 1}</Text>
                                        </View>
                                        <Text className="flex-1 font-figtree text-[13px] leading-[19px] text-nanny-text">
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
                    ) : (
                      <Text className="font-figtree text-[13px] text-nanny-muted">No hay recetas para mostrar.</Text>
                    )}
                  </View>
                )
              ) : (
                /* Aviso para usuarios que no son PRO */
                <NoticeCard
                  icon="lock-closed"
                  title="Función exclusiva para usuarios PRO"
                  message={recomendacionesTab === 'articulos'
                    ? 'Accede a artículos, guías y lecturas recomendadas según la edad y desarrollo de tu hijo.'
                    : 'Descubre recetas saludables y recomendaciones de alimentación adaptadas a su etapa.'}
                >
                  <TouchableOpacity
                    onPress={() => {
                      // Acción futura: abrir modal de suscripción
                    }}
                    className="mt-4 flex-row items-center rounded-full bg-nanny-blue px-5 py-2.5 active:opacity-80"
                  >
                    <Ionicons name="star" size={16} color="white" />
                    <Text className="ml-2 font-figtree-semibold text-body text-white">Hazte PRO</Text>
                  </TouchableOpacity>
                </NoticeCard>
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
              <Text className="font-figtree-semibold text-subtitle text-nanny-text">Elegir Usuario</Text>
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
                className="mb-4 flex-row items-center rounded-2xl bg-nanny-bg px-4 py-3"
              >
                <Ionicons name="person-circle-outline" size={24} color="#46424A" />
                <Text className="ml-3 font-figtree-semibold text-body text-nanny-text">Editar mi perfil</Text>
                <Ionicons name="chevron-forward" size={20} color="#5A5A5E" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            )}
            {usersLoading ? (
              <ActivityIndicator size="large" color="#46424A" />
            ) : usersError ? (
              <View>
                <Text className="mb-4 text-center font-figtree text-body text-red-400">{usersError}</Text>
                <TouchableOpacity onPress={fetchUsers} className="self-center rounded-xl bg-nanny-blue px-5 py-3">
                  <Text className="font-figtree-semibold text-white">Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : users.length === 0 ? (
              <Text className="text-center font-figtree text-body text-nanny-muted">No hay usuarios disponibles.</Text>
            ) : (
              <FlatList
                data={users}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSelectUser(item.id, item.role)}
                    className="flex-row items-center justify-between border-b border-nanny-border p-4"
                  >
                    <View className="flex-row items-center">
                      <Text className="font-figtree text-body text-nanny-text">{[item.name, item.surname].filter(Boolean).join(' ')}</Text>
                      {item.role === 'ADMIN' && (
                        <Text className="ml-2 rounded-full bg-nanny-blue/15 px-2 py-0.5 font-figtree-semibold text-caption text-nanny-blue">
                          Admin
                        </Text>
                      )}
                      {item.isPediatrician && (
                        <Text className="ml-2 rounded-full bg-nanny-green/15 px-2 py-0.5 font-figtree-semibold text-caption text-nanny-green">
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
