import './global.css';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
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
import ProfileScreen from './src/screens/ProfileScreen';
import * as Notifications from 'expo-notifications';
import { FamilySelectionProvider, useFamilySelection } from './src/context/FamilySelectionContext';
import { COLORS, FONTS } from './src/theme';
import { useFonts, Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Configurar cómo reacciona la app cuando llega una notificación (incluso con la app abierta)
Notifications.setNotificationHandler({
  handleNotification: async () => ({

    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function TabNavigator() {
  return (
    <FamilySelectionProvider>
      <MainTabs />
    </FamilySelectionProvider>
  );
}

// El administrador no gestiona hijos: se le ocultan Calendario y Familia y solo ve
// su inicio (resumen de moderación) y el foro con las funciones de moderación
function MainTabs() {
  const { isAdmin } = useFamilySelection();
  return (
        <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false, // We hide the default header to use our custom one in HomeScreen
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            // Iconos de línea también cuando la pestaña está activa (como en el prototipo)
            if (route.name === 'Datos') {
              iconName = 'pulse-outline';
            } else if (route.name === 'Calendario') {
              iconName = 'calendar-clear-outline';
            } else if (route.name === 'Familia') {
              iconName = 'people-outline';
            } else if (route.name === 'Foro') {
              iconName = 'chatbox-outline';
            }

            return <TabIcon name={iconName as any} focused={focused} size={size} color={color} />;
          },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.tabInactive,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopWidth: 0,
            height: 76,
            paddingBottom: 14,
            paddingTop: 12,
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 12,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontFamily: FONTS.semibold,
            marginTop: 2,
          }
        })}
        >
          <Tab.Screen
            name="Datos"
            component={HomeScreen}
            options={isAdmin ? { title: 'Inicio', tabBarIcon: adminHomeIcon } : { tabBarLabel: 'Inicio' }}
          />
          {!isAdmin && <Tab.Screen name="Familia" component={FamiliaScreen} />}
          {!isAdmin && <Tab.Screen name="Calendario" component={CalendarioScreen} />}
          <Tab.Screen name="Foro" component={ForoScreen} options={{ tabBarLabel: 'Comunidad' }} />
        </Tab.Navigator>
  );
}

const adminHomeIcon = ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
  <TabIcon name="shield-checkmark-outline" focused={focused} size={size} color={color} />
);

// Icono de pestaña con una pequeña barra encima cuando está activa (solo estético)
function TabIcon({ name, focused, size, color }: { name: React.ComponentProps<typeof Ionicons>['name']; focused: boolean; size: number; color: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      {focused && (
        <View
          style={{ position: 'absolute', top: -12, width: 28, height: 3, borderRadius: 2, backgroundColor: COLORS.primary }}
        />
      )}
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold });

  useEffect(() => {
    async function configureNotifications() {
      // 1. Canal predeterminado para Android con máxima importancia y sonido
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: COLORS.primary,
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

  // Hasta que Figtree esté cargada se muestra solo el fondo, para no pintar con la fuente del sistema
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;
  }

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
        <Stack.Screen name="MiPerfil" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
