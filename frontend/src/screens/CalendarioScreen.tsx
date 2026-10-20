import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../api/config';

//Configuración del calendario en español
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

LocaleConfig.locales['es'] = {
  monthNames: MONTHS,
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  dayNames: DAYS,
  dayNamesShort: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

type RootTabParamList = {
  Calendario: { userId?: number | null } | undefined;
};

type Child = {
  id: number;
  name: string;
};

type CalendarEvent = {
  id: number | string;
  title: string;
  description?: string | null;
  date: string;
  type?: 'GENERAL' | 'MEDICAL_APPOINTMENT' | 'VACCINE' | 'MEDICINE';
  child: Child;
};

const getToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatLongDate = (iso: string): string => {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return `${DAYS[date.getDay()]}, ${day} de ${MONTHS[month - 1].toLowerCase()} de ${year}`;
};

const formatEventTime = (isoString?: string): string => {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '--:--';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const getEventVisuals = (type?: string) => {
  switch (type) {
    case 'MEDICAL_APPOINTMENT':
      return {
        icon: 'pulse-outline' as const,
        bg: 'bg-[#FBEBE8]',
        border: 'border-[#F1CDC6]',
        color: '#C0705A',
        badge: 'Cita médica',
      };
    case 'MEDICINE':
      return {
        icon: 'medkit-outline' as const,
        bg: 'bg-[#EBF3ED]',
        border: 'border-[#CCE3D2]',
        color: '#4B8862',
        badge: 'Medicamento',
      };
    case 'VACCINE':
      return {
        icon: 'shield-outline' as const,
        bg: 'bg-[#FFF6E6]',
        border: 'border-[#FFE3B3]',
        color: '#C4831D',
        badge: 'Vacuna',
      };
    default:
      return {
        icon: 'calendar-outline' as const,
        bg: 'bg-[#F0ECF8]',
        border: 'border-[#D9D0EC]',
        color: '#7C5BB0',
        badge: 'General',
      };
  }
};

export default function CalendarioScreen() {
  const navigation = useNavigation<any>();
  // Obtener el userId de los parámetros de la ruta
  const route = useRoute<RouteProp<RootTabParamList, 'Calendario'>>();
  //Para probar un usuario cambia su Id y si se pasa entre navegacion quitar comentarios
  const userId = route.params?.userId; 

  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState(getToday);
  const [children, setChildren] = useState<Child[]>([]);
  const [guardianName, setGuardianName] = useState('');
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [childrenError, setChildrenError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
  
    if (!userId) {
      setChildren([]);
      setGuardianName('');
      setSelectedChildId(null);
      setChildrenError(null);
      setEvents([]);
      setEventsError(null);
      setLoadingChildren(false);
      setLoadingEvents(false);
      return;
    }

    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_URL}/user`);
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    const loadGuardian = async () => {
      setLoadingChildren(true);
      setChildrenError(null);
      setChildren([]);
      setGuardianName('');
      setSelectedChildId(null);

      try {
        const response = await fetch(`${API_URL}/user/${userId}`);
        if (!response.ok) {
          throw new Error(`Error al cargar los hijos (${response.status})`);
        }

        const data: { name?: string; children?: Child[] } = await response.json();
        if (!cancelled) {
          setGuardianName(data.name ?? '');
          setChildren(Array.isArray(data.children) ? data.children : []);
        }
      } catch (error) {
        if (!cancelled) {
          setChildrenError(error instanceof Error ? error.message : 'No se pudieron cargar los hijos');
        }
      } finally {
        if (!cancelled) setLoadingChildren(false);
      }
    };

    void loadGuardian();
    return () => {
      cancelled = true;
    };
  }, [userId]);

   useFocusEffect(
    useCallback(() => {
    let cancelled = false;

    if (!userId) return;

    const loadEvents = async () => {
      setLoadingEvents(true);
      setEventsError(null);

      try {
        // Lanzamos las tres llamadas en paralelo (Eventos, Medicinas y Vacunas)
        const [responseEvents, responseMedicine, responseVaccine] = await Promise.all([
          fetch(`${API_URL}/event/guardian/${userId}?date=${encodeURIComponent(selectedDate)}`),
          fetch(`${API_URL}/medicine/guardian/${userId}?date=${encodeURIComponent(selectedDate)}`),
          fetch(`${API_URL}/vaccine/guardian/${userId}?date=${encodeURIComponent(selectedDate)}`),
        ]);

        const dataEvents: CalendarEvent[] = responseEvents.ok ? await responseEvents.json() : [];
        const dataMedicines: CalendarEvent[] = responseMedicine.ok ? await responseMedicine.json() : [];
        const dataVaccines: CalendarEvent[] = responseVaccine.ok ? await responseVaccine.json() : [];

        const medicineKeys = new Set(
          dataMedicines.map((medicine) =>
            `${medicine.child.id}:${medicine.title.trim().toLocaleLowerCase()}:${medicine.date.slice(0, 10)}`,
          ),
        );

        // El medicamento es la fuente completa (dosis, intervalo e instrucciones).
        // Si también existe como evento antiguo, conservamos solo la tarjeta del medicamento.
        const uniqueEvents = dataEvents.filter((event) => {
          if (event.type !== 'MEDICINE') return true;
          const key = `${event.child?.id}:${event.title.trim().toLocaleLowerCase()}:${event.date.slice(0, 10)}`;
          return !medicineKeys.has(key);
        });

        // Unificamos los resultados y usamos IDs con prefijo por tipo de origen para
        // evitar colisiones entre eventos, medicamentos y vacunas.
        const combined = [...uniqueEvents, ...dataMedicines, ...dataVaccines]
        // Ordenamos cronológicamente por hora
        combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (!cancelled) setEvents(combined);
      } catch (error) {
        if (!cancelled) {
          setEvents([]);
          setEventsError(error instanceof Error ? error.message : 'No se pudieron cargar los eventos');
        }
      } finally {
        if (!cancelled) setLoadingEvents(false);
      }
    };

    void loadEvents();
    return () => {
      cancelled = true;
    };
  }, [userId, selectedDate]));

  const eventsForSelectedChild = useMemo(() => {
    const list = selectedChildId === null ? events : events.filter(event => event.child?.id === selectedChildId);
    return [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, selectedChildId]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f3ec'}}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }} style={{ flex: 1 }}>

        <View className="flex-row justify-between items-start mb-6">
          <View>
            <Text className="text-sm font-medium text-nanny-muted mb-1">Calendario de salud</Text>
            <Text className="text-xl font-semibold text-nanny-text italic">
              {guardianName || (userId ? 'Tu calendario' : 'Selecciona un usuario')}
            </Text>
            {/* Lista de hijos */}

            {loadingChildren ? (
            <ActivityIndicator
              className="mt-7 self-start"
              color="#7385A3"
            />
          ) : childrenError ? (
            <Text className="mt-5 text-sm text-[#C0705A]">
              {childrenError}
            </Text>
          ) : children.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-7">

              <View className="flex-row">
                {[{ id: null, name: 'Todos' }, ...children].map((child) => {
                  const active = selectedChildId === child.id;

                  return (
                    <Pressable
                      key={child.id ?? 'all'}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setSelectedChildId(child.id)}
                      className={`mr-2 flex-row items-center rounded-full border px-3 py-1 ${
                        active
                          ? 'border-[#7385A3] bg-[#7385A3]'
                          : 'border-[#DDD5C6] bg-[#EFEAE0]'
                      }`}
                    >
                      <View
                        className={`mr-1.5 h-7 w-7 items-center justify-center overflow-hidden rounded-full ${
                          active ? 'bg-white/20' : 'bg-[#D8CDBD]'
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            active ? 'text-white' : 'text-[#5B5149]'
                          }`}
                        >
                          {child.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text
                        className={`text-sm font-semibold ${
                          active ? 'text-white' : 'text-[#2B2B2B]'
                        }`}
                      >
                        {child.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
              ) : userId ? (
                <Text className="mt-3 text-sm text-[#8A7F75]">Este usuario no tiene hijos registrados.</Text>
              ) : (
                <Text className="mt-3 text-sm text-[#8A7F75]">Elige un usuario para cargar sus hijos y eventos.</Text>
              )}
          </View>
          {/* Botón para abrir el modal de selección de usuario*/}
          {/*<TouchableOpacity 
            onPress={() => { fetchUsers(); setIsUserModalVisible(true); }}
            className="w-12 h-12 bg-nanny-blue rounded-full items-center justify-center relative"
          >
            <Text className="text-white font-semibold text-lg">
              {userId ? userId.toString() : "?"}
            </Text>
            <View className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
              <View className="bg-nanny-blue rounded-full w-4 h-4 items-center justify-center">
                <Ionicons name="person" size={10} color="white" />
              </View>
            </View>
          </TouchableOpacity>*/}
          
        </View>

        <Calendar
          firstDay={1}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          current={selectedDate}
          style={{ backgroundColor: 'transparent'}}
          theme={{ 
            calendarBackground: 'transparent', 
            textMonthFontSize: 18, 
            textDayFontSize: 18,
            textDayHeaderFontSize: 15 }}
          renderHeader={(date) => (
            <Text className="text-2xl font-semibold text-[#2B2B2B]">
              {MONTHS[date.getMonth()]} {date.getFullYear()}
            </Text>
          )}
          renderArrow={(direction: 'left' | 'right') => (
            <Ionicons name={direction === 'left' ? 'chevron-back' : 'chevron-forward'} size={22} color="#7385A3" />
          )}
          markedDates={{ [selectedDate]: { selected: true, selectedColor: '#77a2ff' } }}
        />

        <View className="h-px bg-[#E6E0D8] mt-2" />

        <View className="px-6 mt-6">
          <Text className="text-base text-[#8A7F75]">{formatLongDate(selectedDate)}</Text>
          {loadingEvents ? (
            <ActivityIndicator className="mt-6" color="#7385A3" />
          ) : eventsError ? (
            <Text className="mt-5 text-center text-[#8A7F75]">{eventsError}</Text>
          ) : eventsForSelectedChild.length === 0 ? (
            <Text className="mt-6 text-center italic text-[#8A7F75]">
              {userId ? 'No hay eventos para este día.' : 'Selecciona un usuario para consultar sus eventos.'}
            </Text>
          ) : (
            eventsForSelectedChild.map((event) => {
              const visuals = getEventVisuals(event.type);
              const timeStr = formatEventTime(event.date);

              return (
                <View
                  key={event.id}
                  className={`mt-4 rounded-2xl border ${visuals.border} ${visuals.bg} px-5 py-4`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons name={visuals.icon} size={18} color={visuals.color} />
                      <Text style={{ color: visuals.color }} className="ml-2 text-sm font-semibold">
                        {event.child?.name ?? 'Hijo'} • {visuals.badge}
                      </Text>
                    </View>
                    <View className="flex-row items-center rounded-full bg-white/70 px-2.5 py-0.5 shadow-sm">
                      <Ionicons name="time-outline" size={13} color={visuals.color} style={{ marginRight: 4 }} />
                      <Text style={{ color: visuals.color }} className="text-xs font-bold">
                        {timeStr}
                      </Text>
                    </View>
                  </View>
                  <Text className="mt-2 text-lg font-semibold text-[#2B2B2B]">{event.title}</Text>
                  {!!event.description && (
                    <Text className="mt-1 text-base text-[#7A726A]">{event.description}</Text>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CrearEvento', { userId, selectedDate })}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#6d83a1',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 4.65,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={32} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
