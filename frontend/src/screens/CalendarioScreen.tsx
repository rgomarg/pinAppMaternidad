import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

//Configuración del calendario en español
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio','Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
LocaleConfig.locales['es'] = {
  monthNames: MONTHS,
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  dayNames: DAYS,
  dayNamesShort: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

const formatLongDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${DAYS[date.getDay()]}, ${d} de ${MONTHS[m - 1].toLowerCase()}`;
};

type EventType = 'enfermedad' | 'medicamento' | 'cita' | 'otro';
const EVENT_STYLES: Record<
  EventType,
  { label: string; emoji: string; color: string; text: string; card: string; border: string }
> = {
  enfermedad: { label: 'Enfermedad', emoji: '🤒', color: '#C0705A', text: 'text-[#C0705A]', card: 'bg-[#F8ECE8]', border: 'border-[#E8CFC7]' },
  medicamento: { label: 'Medicamento', emoji: '💊', color: '#5B6E96', text: 'text-[#5B6E96]', card: 'bg-[#E8EDF6]', border: 'border-[#CBD5E8]' },
  cita: { label: 'Cita médica', emoji: '🩺', color: '#5E8F6A', text: 'text-[#5E8F6A]', card: 'bg-[#E9F2EA]', border: 'border-[#C9DDCC]' },
  otro: { label: 'Otro', emoji: '📋', color: '#8E6FBF', text: 'text-[#7C5BB0]', card: 'bg-[#F0ECF8]', border: 'border-[#D9D0EC]' },
};

export default function CalendarioScreen() {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [eventsForDate, setEvents] = useState([]);

  useEffect(() => {
      fetch('${API_BASE_URL}/date/${selectedDate}')
        .then(response => response.json())
        .then(data => {
          // 3. Cuando la API responde, guardamos los eventos en el estado
          setEvents(data);
        })
        .catch(error => {
          console.error("Error obteniendo los eventos:", error);
        });
    }, [selectedDate]); 
    
  return (
    <SafeAreaView className="flex-1 bg-nanny-bg justify-center">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Cabecera*/}
        <View className="flex-row items-start justify-between px-6 pt-14">
          <View>
            <Text className="text-base text-[#8A7F75]">Calendario de salud</Text>
            <Text className="text-3xl text-[#2B2B2B] mt-1">
              --Nombre del guardian--
            </Text>
          </View>
          //Icono de perfil del guardian
          <View>
            <View className="absolute -right-1 -bottom-1 w-10 h-10 rounded-full bg-[#7385A3] items-center justify-center border-2 border-[#FDFAF5]">
              <Ionicons name="person" size={12} color="white" />
            </View>
          </View>
        </View>
        
        {/* Selector de perfiles */}
        <View className="flex-row px-6 mt-5">
          <Text className="text-3xl text-[#2B2B2B] mt-1">
              --Perfiles de los hijos--
          </Text>
          {/* {PROFILES.map((p) => {
            const active = p.id === activeProfile;
            return (
              <Pressable
                key={p.id}
                onPress={() => setActiveProfile(p.id)}
                className={`flex-row items-center rounded-full pr-5 pl-1 py-1 mr-3 border ${
                  active ? 'bg-[#7385A3] border-[#7385A3]' : 'bg-[#EFEAE0] border-[#DDD5C6]'
                }`}
              >
                <Image source={{ uri: p.avatar }} className="w-10 h-10 rounded-full" />
                <Text className={`ml-3 text-lg font-semibold ${active ? 'text-white' : 'text-[#2B2B2B]'}`}>
                  {p.name}
                </Text>
              </Pressable>
            );
          })}*/}
        </View>
        
        {/* Leyenda */}
        <View className="flex-row flex-wrap px-6 mt-5">
          {(Object.keys(EVENT_STYLES) as EventType[]).map((type) => {
            const s = EVENT_STYLES[type];
            return (
              <Text key={type} className={`text-base mr-4 ${s.text}`}>
                {s.emoji} {s.label}
              </Text>
            );
          })}
        </View>
        
        {/* Calendario */}
        <Calendar
          firstDay={1}
          onDayPress={(day) => { setSelectedDate(day.dateString);}}
          current={selectedDate}
          style={{ 
            backgroundColor: 'transparent', 
            paddingHorizontal: 16, 
            marginTop: 8
          }}
          renderArrow={(direction: 'left' | 'right') => (
            <Ionicons
              name={direction === 'left' ? 'chevron-back' : 'chevron-forward'}
              size={22}
              color="#7385A3"
            />
          )}
          markedDates={{
              [selectedDate]: { selected: true, selectedColor: '#77a2ff' }}}
          
        />
        {/* Separador */}
        <View className="h-px bg-[#E6E0D8] mt-2" />

        {/* Eventos del día */}
        <View className="px-6 mt-6">
          <Text className="text-base text-[#8A7F75]">{formatLongDate(selectedDate)}</Text>

          {eventsForDate.length === 0 ? (
            <Text className="text-[#8A7F75] italic text-center mt-6">No hay eventos para este día.</Text>
          ) : (
            <Text>

            </Text>
            /*eventsForDate.map((event) => {
              const s = EVENT_STYLES[event.type];
              return (
                <View
                  key={event.id}
                  className={`mt-4 rounded-2xl border px-7 py-5 ${s.card} ${s.border}`}
                >
                  <Text className={`text-base ${s.text}`}>
                    {s.emoji} {s.label}
                  </Text>
                  <Text className="text-xl text-[#2B2B2B] mt-3">{event.title}</Text>
                  {!!event.description && (
                    <Text className="text-base text-[#7A726A] mt-2">{event.description}</Text>
                  )}
                </View>
              );
            })*/
          )}

          {/* Recordatorios */}
          {/*remindersForDate.length > 0 && (
            <>
              <View className="flex-row items-center mt-6">
                <Ionicons name="notifications-outline" size={20} color="#7385A3" />
                <Text className="ml-3 text-base font-semibold text-[#7385A3]">
                  Recordatorios · {remindersForDate.length} toma{remindersForDate.length > 1 ? 's' : ''}
                </Text>
              </View>

              {remindersForDate.map((r) => (
                <View
                  key={r.id}
                  className="flex-row items-center mt-3 rounded-2xl border border-[#CBD5E8] bg-[#E8EDF6] p-3"
                >
                  <View className="bg-[#7385A3] rounded-xl w-[88px] h-[76px] items-center justify-center">
                    <Text className="text-white text-xl font-semibold">{r.time}</Text>
                  </View>
                  <View className="ml-5">
                    <Text className="text-xl text-[#2B2B2B]">{r.name}</Text>
                    <Text className="text-base text-[#7385A3] mt-1">{r.dose}</Text>
                  </View>
                </View>
              ))}
            </>
          )*/}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
