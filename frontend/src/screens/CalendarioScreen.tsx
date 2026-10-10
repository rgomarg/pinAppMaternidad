import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
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
  const userId = route.params?.userId;

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
    <SafeAreaView className="flex-1 bg-nanny-bg">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="flex-row items-start justify-between px-6 pt-8">
          <View>
            <Text className="text-base text-[#8A7F75]">Calendario de salud</Text>
            <Text className="mt-1 text-3xl text-[#2B2B2B]">
              {guardianName || (userId ? 'Tu calendario' : 'Selecciona un usuario')}
            </Text>
          </View>
          <View className="h-12 w-12 items-center justify-center rounded-full bg-[#7385A3]">
            <Ionicons name="person" size={20} color="white" />
          </View>
        </View>

        <View className="px-6 mt-6">
          
          {loadingChildren ? (
            <ActivityIndicator className="mt-4 self-start" color="#7385A3" />
          ) : childrenError ? (
            <Text className="mt-3 text-sm text-red-700">{childrenError}</Text>
          ) : children.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
              <View className="flex-row">
                {[{ id: null, name: 'Todos' }, ...children].map((child) => {
                  const active = selectedChildId === child.id;
                  return (
                    <Pressable
                      key={child.id ?? 'all'}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setSelectedChildId(child.id)}
                      className={`mr-2 rounded-full border px-5 py-2 ${
                        active ? 'border-[#7385A3] bg-[#7385A3]' : 'border-[#DDD5C6] bg-[#EFEAE0]'
                      }`}
                    >
                      <Text className={`font-semibold ${active ? 'text-white' : 'text-[#2B2B2B]'}`}>
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

        <Calendar
          firstDay={1}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          current={selectedDate}
          style={{ backgroundColor: 'transparent', paddingHorizontal: 16, marginTop: 8 }}
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
