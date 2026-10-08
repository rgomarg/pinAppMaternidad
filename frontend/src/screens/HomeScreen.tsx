// frontend/src/screens/HomeScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const navigation = useNavigation<any>();

  return (
    <View className="flex-1 items-center justify-center bg-gray-50">
      <Text className="text-4xl font-extrabold text-blue-600 tracking-tight">
        Bienvenido a Nanny
      </Text>
      <Text className="text-base text-gray-500 mt-2">
        Tu asistente de maternidad
      </Text>
      <TouchableOpacity
        className="mt-6 px-4 py-2 bg-blue-600 rounded-lg"
        onPress={() => navigation.navigate('Calendar')}>

        <Text className="text-lg">Ir al Calendario</Text>
      </TouchableOpacity>
    </View>
  );
}