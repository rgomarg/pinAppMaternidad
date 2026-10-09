import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { API_URL } from '../api/config';

// Edad en años a partir de la fecha de nacimiento
const getAge = (birthDate: string) => {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const birthdayPassed =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!birthdayPassed) age--;
  return age;
};

export default function FamiliaScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ Familia: { userId?: number } }, 'Familia'>>();
  const userId = route.params?.userId;

  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Se ejecuta cada vez que la pestaña recibe el foco (p. ej. al volver del formulario)
  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        setChildren([]);
        return;
      }
      const fetchChildren = async () => {
        setLoading(true);
        try {
          const response = await fetch(`${API_URL}/user/${userId}`);
          const data = await response.json();
          setChildren(data?.children ?? []);
        } catch (error) {
          console.error('Error fetching children:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchChildren();
    }, [userId]),
  );

  const goToChildRegistration = () => {
    if (!userId) {
      alert('Primero debes seleccionar un usuario.');
      return;
    }
    navigation.navigate('RegistroHijo', { userId });
  };

  return (
    <SafeAreaView className="flex-1 bg-nanny-bg">
      <View className="px-6 pt-4 pb-4 border-b border-nanny-card">
        <Text className="text-sm font-medium text-nanny-muted">Registro médico</Text>
        <Text className="text-2xl font-semibold text-nanny-text">Libro de familia</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        {loading && <ActivityIndicator size="large" color="#6d83a1" />}

        {!loading && !userId && (
          <Text className="text-nanny-muted text-center">Selecciona un usuario en la pestaña Datos.</Text>
        )}

        {!loading &&
          children.map((child) => (
            <View key={child.id} className="bg-nanny-card border border-[#e0d9c9] rounded-2xl p-4">
              <View className="flex-row items-center gap-4">
                <View className="w-14 h-14 rounded-full bg-orange-200 items-center justify-center">
                  <Text className="text-lg font-bold text-nanny-text">{child.name?.charAt(0) ?? '?'}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-nanny-text">{child.name}</Text>
                  <Text className="text-nanny-muted">
                    {getAge(child.birthDate)} años{child.bloodGroup ? ` · Sangre ${child.bloodGroup}` : ''}
                  </Text>
                  {child.allergies ? (
                    <View className="self-start mt-2 px-2 py-1 rounded-full bg-red-100">
                      <Text className="text-xs text-nanny-red">{child.allergies}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          ))}

        <TouchableOpacity
          onPress={goToChildRegistration}
          className="flex-row items-center justify-center gap-2 py-4 rounded-2xl border border-dashed border-nanny-muted"
        >
          <Ionicons name="add-circle-outline" size={20} color="#808080" />
          <Text className="text-nanny-muted font-medium">Añadir niño/a</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
