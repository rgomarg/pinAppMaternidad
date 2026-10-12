import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../api/config';

// types defined
interface Vaccine {
  id: number;
  name: string;
  appliedAt: string | null;
  scheduledFor: string | null;
}
interface Condition {
  id: number;
  tag: string[];
  desciption: string | null;
  timestamp: string;
}
interface Medicine {
  id: number;
  name: string;
  dosage: string;
  intervalHours: number | null;
  endDate: string | null;
}
interface ChildDashboard {
  id: number;
  name: string;
  birthDate: string;
  bloodGroup: string | null;
  allergies: string | null;
  vaccines: Vaccine[];
  conditions: Condition[];
  medicine: Medicine[];
}

export const FamiliaScreen = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Placeholder</Text>
    </View>
  );
};

export default FamiliaScreen;