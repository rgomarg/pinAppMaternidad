import './global.css';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import CalendarioScreen from './src/screens/CalendarioScreen';
import FamiliaScreen from './src/screens/FamiliaScreen';
import ForoScreen from './src/screens/ForoScreen';
import ChildRegistrationScreen from './src/screens/ChildRegistrationScreen';
import CrearEventoScreen from './src/screens/CrearEventoScreen';
import * as Notifications from 'expo-notifications';
import { FamilySelectionProvider } from './src/context/FamilySelectionContext';


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Configurar cómo reacciona la app cuando llega una notificación (incluso con la app abierta)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function TabNavigator() {
  return (
    <FamilySelectionProvider>
        <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false, // We hide the default header to use our custom one in HomeScreen
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Datos') {
              iconName = focused ? 'analytics' : 'analytics-outline';
            } else if (route.name === 'Calendario') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            } else if (route.name === 'Familia') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Foro') {
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
            }

            return <Ionicons name={iconName as any} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#6d83a1', // nanny-blue
          tabBarInactiveTintColor: '#808080', // nanny-muted
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopColor: '#e0d9c9',
            borderTopWidth: 1,
            height: 70,
            paddingBottom: 10,
            paddingTop: 10,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          }
        })}
        >
          <Tab.Screen name="Datos" component={HomeScreen} />
          <Tab.Screen name="Calendario" component={CalendarioScreen} />
          <Tab.Screen name="Familia" component={FamiliaScreen} />
          <Tab.Screen name="Foro" component={ForoScreen} />
        </Tab.Navigator>
    </FamilySelectionProvider>
  );
}

export default function App() {
  useEffect(() => {
    async function configureNotifications() {
      // 1. Canal predeterminado para Android con máxima importancia y sonido
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6d83a1',
          sound: 'default',
        }).catch(() => {});
      }
      // 2. Solicitar permisos de notificación al iniciar (compatible con iOS y Android)
      await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
    }
    configureNotifications();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Pestañas principales */}
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        {/* Pantalla para añadir un hijo */}
        <Stack.Screen name="RegistroHijo" component={ChildRegistrationScreen} />
        {/* Pantalla para crear evento */}
        <Stack.Screen 
          name="CrearEvento" 
          component={CrearEventoScreen} 
          options={{ presentation: 'modal' }} // Se abre como modal nativo deslizable
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
