import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ThreadListScreen from './foro/ThreadListScreen';
import ThreadDetailScreen from './foro/ThreadDetailScreen';
import NewThreadScreen from './foro/NewThreadScreen';
import AdminPanelScreen from './foro/AdminPanelScreen';
import { useFamilySelection } from '../context/FamilySelectionContext';

// Stack propio dentro de la pestaña (como FamiliaScreen) para que las pantallas
// del foro sigan dentro de FamilySelectionProvider y vean el usuario seleccionado
const Stack = createNativeStackNavigator();

export default function ForoScreen() {
  const { isAdmin } = useFamilySelection();
  return (
    <Stack.Navigator initialRouteName="ThreadList" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ThreadList" component={ThreadListScreen} />
      <Stack.Screen name="ThreadDetail" component={ThreadDetailScreen} />
      <Stack.Screen name="NewThread" component={NewThreadScreen} options={{ presentation: 'modal' }} />
      {/* Solo existe para admins: si se cambia a un usuario regular con el panel abierto,
          React Navigation lo saca del stack y vuelve al listado del foro */}
      {isAdmin && <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />}
    </Stack.Navigator>
  );
}
