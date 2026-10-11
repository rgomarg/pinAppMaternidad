import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
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
  id: number;
  title: string;
  description?: string | null;
  date: string;
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

export default function CalendarioScreen() {
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

  useEffect(() => {
    let cancelled = false;

    if (!userId) return;

    const loadEvents = async () => {
      setLoadingEvents(true);
      setEventsError(null);

      try {
        const response = await fetch(
          `${API_URL}/event/guardian/${userId}?date=${encodeURIComponent(selectedDate)}`,
        );
        if (!response.ok) {
          throw new Error(`Error al cargar los eventos (${response.status})`);
        }

        const data: CalendarEvent[] = await response.json();
        if (!cancelled) setEvents(Array.isArray(data) ? data : []);
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
  }, [userId, selectedDate]);

  const eventsForSelectedChild = useMemo(
    () => selectedChildId === null ? events : events.filter(event => event.child?.id === selectedChildId),
    [events, selectedChildId],
  );

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
          <TouchableOpacity 
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
          </TouchableOpacity>
          
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
            eventsForSelectedChild.map((event) => (
              <View key={event.id} className="mt-4 rounded-2xl border border-[#D9D0EC] bg-[#F0ECF8] px-5 py-4">
                <View className="flex-row items-center">
                  <Ionicons name="calendar-outline" size={18} color="#7C5BB0" />
                  <Text className="ml-2 text-sm font-semibold text-[#7C5BB0]">
                    {event.child?.name ?? 'Hijo'}
                  </Text>
                </View>
                <Text className="mt-3 text-lg font-semibold text-[#2B2B2B]">{event.title}</Text>
                {!!event.description && (
                  <Text className="mt-2 text-base text-[#7A726A]">{event.description}</Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
