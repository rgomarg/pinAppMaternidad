import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForoScreen() {
  return (
    <SafeAreaView className="flex-1 bg-nanny-bg items-center justify-center">
      <Text className="text-2xl font-bold text-nanny-text mb-2">Foro</Text>
      <Text className="text-nanny-muted">Próximamente...</Text>
    </SafeAreaView>
  );
}
