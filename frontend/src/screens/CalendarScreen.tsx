import {View, Text, ScrollView} from 'react-native';
import React, { useState } from 'react';
import {Calendar, LocaleConfig} from 'react-native-calendars';

//For translate the calendar to Spanish
LocaleConfig.locales['es'] = {
  monthNames: [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ],
  monthNamesShort: [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ],
  dayNames: [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
  ],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es'; 

const MOCK_EVENTS = [
  { id: '1', date: '2026-10-09', title: 'Cita Pediatra', time: '10:00 AM' },
  { id: '2', date: '2026-10-09', title: 'Vacuna', time: '11:30 AM' },
  { id: '3', date: '2026-10-10', title: 'Comida Especial', time: '13:00 PM' },
];

export default function CalendarScreen() {
    
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);

    const eventsForSelectedDate = MOCK_EVENTS.filter(
    (event) => event.date === selectedDate
  );
  
    return (
        <View className="flex-1 bg-gray-50">
            <Calendar 
            onDayPress={(day) => { setSelectedDate(day.dateString);}}
            firstDay={1}
            markedDates={{
            [selectedDate]: { selected: true, selectedColor: '#77a2ff' }}}
            >
                
            </Calendar>
        
        <ScrollView className="flex-1 px-4 mt-6">
            <Text className="text-xl font-bold text-gray-800 mb-4">
            Eventos ({selectedDate})
            </Text>
            {eventsForSelectedDate.length === 0 ? (
            <Text className="text-gray-500 italic text-center mt-4">
                No hay eventos para este día.
            </Text>
            ) : (
            eventsForSelectedDate.map((event) => (
                <View 
                key={event.id}
                className="bg-white p-4 rounded-xl mb-3 shadow-sm border border-gray-100 flex-row"
                >
                <View className="w-1.5 bg-blue-500 rounded-full mr-3" />
                <View>
                    <Text className="text-lg font-semibold text-gray-800">
                    {event.title}
                    </Text>
                    <Text className="text-gray-500 mt-1">
                    {event.time}
                    </Text>
                </View>
                </View>
            ))
            )}
        </ScrollView>
        </View>
    );
}