import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; 
import { API_URL } from '../api/config';

export default function HomeScreen() {
  const [activeChildId, setActiveChildId] = useState<number | null>(null);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/user`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchChildren = async (userId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/user/${userId}`);
      const data = await response.json();
      if (data && data.children) {
        setChildren(data.children);
        if (data.children.length > 0) {
          setActiveChildId(data.children[0].id);
        } else {
          setActiveChildId(null);
        }
      }
    } catch (error) {
      console.error("Error fetching children:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (userId: number) => {
    setActiveUserId(userId);
    setIsUserModalVisible(false);
    fetchChildren(userId);
  };

  const insets = useSafeAreaInsets();
  const activeChild = children.find(c => c.id === activeChildId);

  return (
    <View style={{ flex: 1, backgroundColor: '#f7f3ec', paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }} style={{ flex: 1 }}>
        
        {/* Header */}
        <View className="flex-row justify-between items-start mb-6">
          <View>
            <Text className="text-sm font-medium text-nanny-muted mb-1">Predicciones e insights</Text>
            {activeChild ? (
              <Text className="text-3xl font-semibold text-nanny-text">{activeChild.name}</Text>
            ) : (
              <Text className="text-xl font-semibold text-nanny-text italic">Selecciona un usuario</Text>
            )}
          </View>
          
          <TouchableOpacity 
            onPress={() => { fetchUsers(); setIsUserModalVisible(true); }}
            className="w-12 h-12 bg-nanny-blue rounded-full items-center justify-center relative"
          >
            <Text className="text-white font-semibold text-lg">
              {activeUserId ? activeUserId.toString() : "?"}
            </Text>
            <View className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
              <View className="bg-nanny-blue rounded-full w-4 h-4 items-center justify-center">
                <Ionicons name="person" size={10} color="white" />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#6d83a1" />
        ) : (
          <>
            {/* Child Selector */}
            {children.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-6">
                <View className="flex-row gap-3">
                  {children.map((child) => (
                    <TouchableOpacity
                      key={child.id}
                      onPress={() => setActiveChildId(child.id)}
                      className={`flex-row items-center gap-2 px-4 py-2 rounded-full font-medium ${
                        activeChildId === child.id ? 'bg-nanny-blue' : 'bg-nanny-card'
                      }`}
                    >
                      <View className="w-6 h-6 rounded-full bg-orange-200 items-center justify-center overflow-hidden">
                        <Text className="text-xs font-bold text-black">{child?.name?.charAt(0) || '?'}</Text>
                      </View>
                      <Text className={`font-semibold ${activeChildId === child.id ? 'text-white' : 'text-nanny-text'}`}>
                        {child.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            {/* Stats Cards */}
            {activeChild && (
              <View className="flex-row gap-4 mb-6">
                {/* Peso */}
                <View className="flex-1 bg-nanny-card p-4 rounded-2xl relative">
                  <TouchableOpacity className="absolute top-4 right-4 w-6 h-6 bg-blue-100 rounded-full items-center justify-center">
                    <Ionicons name="add" size={16} color="#6d83a1" />
                  </TouchableOpacity>
                  <Text className="text-nanny-muted text-sm font-medium mb-2">Peso actual</Text>
                  <View className="flex-row items-baseline gap-1 mb-1">
                    <Text className="text-3xl font-bold text-nanny-text">
                      {activeChild.measurements?.[0]?.weight ?? '--'}
                    </Text>
                    <Text className="text-nanny-text font-medium text-base">kg</Text>
                  </View>
                  <Text className="text-nanny-green text-xs font-medium mb-1">+0.5 kg ult. 3m</Text>
                </View>

                {/* Altura */}
                <View className="flex-1 bg-nanny-card p-4 rounded-2xl relative">
                  <TouchableOpacity className="absolute top-4 right-4 w-6 h-6 bg-blue-100 rounded-full items-center justify-center">
                    <Ionicons name="add" size={16} color="#6d83a1" />
                  </TouchableOpacity>
                  <Text className="text-nanny-muted text-sm font-medium mb-2">Altura actual</Text>
                  <View className="flex-row items-baseline gap-1 mb-1">
                    <Text className="text-3xl font-bold text-nanny-text">
                      {activeChild.measurements?.[0]?.height ?? '--'}
                    </Text>
                    <Text className="text-nanny-text font-medium text-base">cm</Text>
                  </View>
                  <Text className="text-nanny-green text-xs font-medium mb-1">+2 cm ult. 3m</Text>
                </View>
              </View>
            )}

            {/* Curva de crecimiento (Placeholder) */}
            <View className="bg-nanny-card p-4 rounded-2xl min-h-[250px] flex-col mb-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="font-semibold text-lg text-nanny-text">Curva de crecimiento</Text>
                <View className="flex-row bg-white rounded-full overflow-hidden">
                  <View className="bg-nanny-blue px-3 py-1">
                    <Text className="text-white font-medium text-xs">Peso</Text>
                  </View>
                  <View className="px-3 py-1">
                    <Text className="text-nanny-muted font-medium text-xs">Altura</Text>
                  </View>
                </View>
              </View>
              <View className="flex-1 border-2 border-dashed border-nanny-muted/30 rounded-xl items-center justify-center">
                <Text className="text-nanny-muted text-center">[Gráfico de {activeChild?.name || '...'}]</Text>
              </View>
            </View>

            {/* Frecuencia de enfermedades (Placeholder) */}
            <View className="bg-nanny-card p-4 rounded-2xl min-h-[250px] flex-col">
              <Text className="font-semibold text-lg text-nanny-text">Frecuencia de enfermedades</Text>
              <Text className="text-nanny-muted text-sm mb-4">Episodios registrados por mes</Text>
              <View className="flex-1 border-2 border-dashed border-nanny-muted/30 rounded-xl items-center justify-center">
                <Text className="text-nanny-muted text-center">[Gráfico de {activeChild?.name || '...'}]</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal para elegir usuario */}
      <Modal visible={isUserModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 min-h-[300px]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold">Elegir Usuario</Text>
              <TouchableOpacity onPress={() => setIsUserModalVisible(false)}>
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={users}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectUser(item.id)}
                  className="p-4 border-b border-gray-100 flex-row items-center justify-between"
                >
                  <Text className="text-lg">{item.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color="gray" />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

    </View>
  );
}