import './global.css';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import CalendarioScreen from './src/screens/CalendarioScreen';
import FamiliaScreen from './src/screens/FamiliaScreen';
import ForoScreen from './src/screens/ForoScreen';
import ChildRegistrationScreen from './src/screens/ChildRegistrationScreen';


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  return (
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
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen
          name="RegistroHijo"
          component={ChildRegistrationScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}