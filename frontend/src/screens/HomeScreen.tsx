// frontend/src/screens/HomeScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50">
      <Text className="text-4xl font-extrabold text-blue-600 tracking-tight">
        Bienvenido a Nanny
      </Text>
      <Text className="text-base text-gray-500 mt-2">
        Tu asistente de maternidad
      </Text>
    </View>
  );
}