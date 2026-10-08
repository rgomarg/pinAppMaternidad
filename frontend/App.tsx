import './global.css';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';

// Creamos el Stack Navigator
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: 'Inicio' }} // Título de la cabecera
        />
        <Stack.Screen 
            name="Calendar" 
            component={CalendarScreen} 
          />
        {/* Aquí abajo añadiremos en el futuro la pantalla de MeasurementsHistoryScreen */}
        </Stack.Navigator>
    </NavigationContainer>
  );
}