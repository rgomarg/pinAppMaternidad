import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ThreadListScreen from './foro/ThreadListScreen';
import ThreadDetailScreen from './foro/ThreadDetailScreen';

// Stack propio dentro de la pestaña (como FamiliaScreen) para que las pantallas
// del foro sigan dentro de FamilySelectionProvider y vean el usuario seleccionado
const Stack = createNativeStackNavigator();

export default function ForoScreen() {
  return (
    <Stack.Navigator initialRouteName="ThreadList" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ThreadList" component={ThreadListScreen} />
      <Stack.Screen name="ThreadDetail" component={ThreadDetailScreen} />
    </Stack.Navigator>
  );
}
